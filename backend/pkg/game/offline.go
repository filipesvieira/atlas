package game

import (
	"crypto/sha256"
	"encoding/hex"
	"math"
	"math/rand"
	"sort"
	"strconv"
	"time"
)

const (
	MinimumOfflineMinutes        = 3
	MaximumOfflineMinutes        = 720
	MaximumOfflineItems          = 50
	MaximumOfflineRewardedBosses = 12
	offlineIncomingDamageFactor  = 0.32
	offlineCombatTickSeconds     = 0.75
	offlineRangedEngagementDelay = 1.50
	offlineMeleeEngagementDelay  = 4.50
)

type OfflineSimulationInput struct {
	Character          *CharacterData
	Inventory          *InventoryData
	IsExpeditionActive bool
	ActiveRegion       string
	ActiveStance       string
	CurrentStage       int
	IsBossStage        bool
	PeriodStart        time.Time
	PeriodEnd          time.Time
	StateRevision      int64
	Seed               int64
	AutoSellSettings   AutoSellSettings
}

type OfflineResult struct {
	ReportID             string           `json:"report_id"`
	PeriodStart          time.Time        `json:"period_start"`
	PeriodEnd            time.Time        `json:"period_end"`
	CalculatedAt         time.Time        `json:"calculated_at"`
	MinutesOffline       int              `json:"minutes_offline"`
	RegionID             string           `json:"region_id"`
	RegionName           string           `json:"region_name"`
	Stage                int              `json:"stage"`
	WasBossStage         bool             `json:"was_boss_stage"`
	FinalStage           int              `json:"final_stage"`
	IsBossStageAfter     bool             `json:"is_boss_stage_after"`
	WavesCompleted       int              `json:"waves_completed"`
	BossesDefeated       int              `json:"bosses_defeated"`
	BossesRewarded       int              `json:"bosses_rewarded"`
	ExpeditionsCompleted int              `json:"expeditions_completed"`
	RegionsUnlocked      []string         `json:"regions_unlocked,omitempty"`
	Kills                int              `json:"kills"`
	Efficiency           float64          `json:"efficiency"`
	XPGained             int64            `json:"xp_gained"`
	GoldGained           int64            `json:"gold_gained"`
	ItemsFound           []Item           `json:"items_found"`
	ItemsPending         []Item           `json:"items_pending,omitempty"`
	ItemsConverted       []Item           `json:"items_converted,omitempty"`
	ConvertedGold        int64            `json:"converted_gold,omitempty"`
	DropsAutoConverted   int              `json:"drops_auto_converted,omitempty"`
	ResourcesFound       []ResourceAmount `json:"resources_found,omitempty"`
	BossTrophies         []ResourceAmount `json:"boss_trophies,omitempty"`
	LevelBefore          int              `json:"level_before"`
	LevelAfter           int              `json:"level_after"`
	HealthAfter          int              `json:"health_after"`
	Defeated             bool             `json:"defeated,omitempty"`
	StoppedReason        string           `json:"stopped_reason,omitempty"`
	StateRevision        int64            `json:"state_revision"`
}

func deterministicReportID(charID string, start, end time.Time, revision int64) string {
	payload := charID + "|" + start.UTC().Format(time.RFC3339Nano) + "|" + end.UTC().Format(time.RFC3339Nano) + "|" + strconv.FormatInt(revision, 10)
	sum := sha256.Sum256([]byte(payload))
	return "offline_" + hex.EncodeToString(sum[:12])
}

func clamp(value, minValue, maxValue float64) float64 {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func equipmentPassives(inv *InventoryData) (lifesteal, goldBonus float64, manaRegen int) {
	if inv == nil {
		return 0, 0, 0
	}
	eq := inv.Equipment
	items := []*Item{eq.Head, eq.Chest, eq.Legs, eq.Boots, eq.MainHand, eq.OffHand, eq.Necklace, eq.Ring, eq.Ammo, eq.Bag}
	for _, item := range items {
		if item == nil {
			continue
		}
		lifesteal += item.Lifesteal
		goldBonus += item.GoldBonus
		manaRegen += item.ManaRegen
	}
	return lifesteal, goldBonus, manaRegen
}

func offlineStats(input OfflineSimulationInput) (attack, defense, maxHealth int, attackSpeed float64) {
	charCopy := *input.Character
	if input.Inventory == nil {
		input.Inventory = &InventoryData{Cap: 1500, Backpack: []Item{}}
	}
	stance := input.ActiveStance
	if stance == "" {
		stance = "balanced"
	}
	temp := &GameSession{Character: &charCopy, Inventory: input.Inventory, ActiveStance: stance}
	attack, defense = temp.CalculateStats()
	maxHealth = temp.Character.MaxHealth
	attackSpeed = 1.0
	if input.Inventory.Equipment.MainHand != nil {
		switch GetItemWeaponType(input.Inventory.Equipment.MainHand) {
		case WeaponTypeBow:
			attackSpeed = 1.40
		case WeaponTypeWand:
			attackSpeed = 1.25
		}
	}
	return attack, defense, maxHealth, attackSpeed
}

func offlineKillXP(playerLevel, monsterLevel, maxHealth int, isBoss bool) int64 {
	return CalculateKillXP(playerLevel, monsterLevel, maxHealth, isBoss)
}

func offlineCombatEfficiency(playerDefense, maxHealth int, dps, lifesteal float64, vitality int, stance string, monster Monster) float64 {
	monsterLevel := math.Max(1, float64(monster.Level))
	mitigation := float64(playerDefense) / (float64(playerDefense) + 20.0*monsterLevel)
	incomingDPS := (float64(monster.Attack) / 1.5) * (1.0 - mitigation)
	sustainDPS := dps*(lifesteal/100.0) + float64(vitality)*0.012
	reserveDPS := float64(maxHealth) / 120.0
	pressureRatio := incomingDPS / math.Max(0.1, sustainDPS+reserveDPS)
	efficiency := 1.0
	if pressureRatio > 1.0 {
		efficiency = 1.0 / pressureRatio
	}
	if stance == "defensive" {
		efficiency *= 1.08
	}
	return clamp(efficiency, 0.12, 1.0)
}

// offlineCampRecoverySeconds calcula o tempo de descanso na fogueira do acampamento
// escalonado dinamicamente pela Vida Máxima (HP), Nível e Vitalidade (VIT) do herói,
// garantindo que níveis baixos se recuperem rapidamente (30-45s) e níveis altos (1000-4000+ HP)
// tenham um tempo justo e equilibrado (60-150s), valorizando o jogo online e upgrades de base.
func offlineCampRecoverySeconds(maxHealth, level, vit int) float64 {
	hpRegenPerSec := math.Max(6.0, 6.0+float64(vit)*0.15+float64(level)*0.08)
	return math.Max(30.0, math.Min(180.0, float64(maxHealth)/hpRegenPerSec))
}

// offlineBossRewardBudget limita somente as recompensas especiais repetíveis
// de chefes (tabelas de boss, troféus e multiplicadores). O combate pode
// continuar e ainda rende recompensas comuns, mas não gera centenas de troféus
// durante uma única ausência. A regra equivale a no máximo um pacote por hora.
func offlineBossRewardBudget(minutes int) int {
	budget := minutes / 60
	if budget < 1 {
		budget = 1
	}
	if budget > MaximumOfflineRewardedBosses {
		budget = MaximumOfflineRewardedBosses
	}
	return budget
}

// offlineProjectedWaveDamage aproxima o mesmo fluxo autoritativo do combate
// online: monstros vivos contra-atacam em ticks, defesa mitiga por nível,
// melee precisa encostar e ranged entra antes em alcance. O fator de abstração
// representa movimentação, habilidades e alvos secundários que a simulação
// agregada não executa tick a tick. O objetivo é impedir imortalidade offline,
// não substituir o motor de combate online.
func offlineProjectedWaveDamage(wave []Monster, fightDurations []float64, playerDefense int, dps, lifesteal float64) float64 {
	if len(wave) == 0 || len(wave) != len(fightDurations) {
		return 0
	}

	elapsed := 0.0
	incoming := 0.0
	for i, monster := range wave {
		elapsed += fightDurations[i]
		aliveUntil := elapsed
		delay := offlineMeleeEngagementDelay
		if monster.AttackType == AttackTypeRanged {
			delay = offlineRangedEngagementDelay
		}
		activeSeconds := math.Max(0, aliveUntil-delay)
		spd := monster.AttackSpeedSeconds
		if spd <= 0 {
			spd = DefaultMonsterAttackSpeed
		}
		hits := math.Floor(activeSeconds/spd) + 1
		if activeSeconds <= 0 {
			hits = 0
		}
		monsterLevel := math.Max(1, float64(monster.Level))
		mitigation := float64(playerDefense) / (float64(playerDefense) + 20.0*monsterLevel)
		damagePerHit := math.Max(1, math.Round(float64(monster.Attack)*(1.0-mitigation)))
		incoming += hits * damagePerHit
	}

	waveSeconds := 0.0
	for _, duration := range fightDurations {
		waveSeconds += duration
	}
	lifestealHealing := dps * waveSeconds * (lifesteal / 100.0)
	continuousHealing := math.Floor(waveSeconds / offlineCombatTickSeconds)
	return math.Max(0, incoming*offlineIncomingDamageFactor-lifestealHealing-continuousHealing)
}

func buildOfflineWave(region ExpeditionRegion, stage int, bossStage bool, playerLevel int, rng *rand.Rand) []Monster {
	if bossStage || stage >= region.MaxStages {
		wave := []Monster{region.Boss}
		for i := 0; i < 2; i++ {
			wave = append(wave, GetRandomMonsterForRegion(region.ID, rng))
		}
		return wave
	}
	wave := make([]Monster, 0, stage)
	for i := 0; i < stage; i++ {
		wave = append(wave, GetRandomMonsterForRegion(region.ID, rng))
	}
	return wave
}

// unlocksFromBoss registra a regi\u00e3o atual como "boss derrotado" adicionando seu ID
// a UnlockedRegions. CheckRegionAvailability usa esta lista para validar RequiresTierComplete:
// quando todos os IDs do Tier N estiverem presentes, as regi\u00f5es do Tier N+1 s\u00e3o liberadas.
// Data-driven: funciona automaticamente para qualquer n\u00famero de Tiers e regi\u00f5es.
func unlocksFromBoss(regionID string, alreadyUnlocked []string) []string {
	for _, id := range alreadyUnlocked {
		if id == regionID {
			return []string{} // j\u00e1 registrado
		}
	}
	return []string{regionID}
}

func appendUnique(values []string, candidates ...string) []string {
	seen := make(map[string]struct{}, len(values)+len(candidates))
	for _, value := range values {
		seen[value] = struct{}{}
	}
	for _, candidate := range candidates {
		if _, exists := seen[candidate]; exists {
			continue
		}
		seen[candidate] = struct{}{}
		values = append(values, candidate)
	}
	return values
}

// CalculateOfflineProgress executa uma simulação determinística a partir de um
// snapshot persistido. Fases inteiras são atômicas: uma onda só concede ganhos
// e avança o estágio quando há tempo para concluí-la, evitando exploração por
// relog em uma horda parcialmente derrotada.
func CalculateOfflineProgress(input OfflineSimulationInput) OfflineResult {
	result := OfflineResult{ItemsFound: []Item{}, ItemsConverted: []Item{}, RegionsUnlocked: []string{}}
	isEligible := input.IsExpeditionActive || (input.Character != nil && input.Character.AutoResumeExpedition)
	if input.Character == nil || !isEligible || input.PeriodStart.IsZero() {
		return result
	}
	end := input.PeriodEnd
	if end.IsZero() {
		end = time.Now().UTC()
	}
	start := input.PeriodStart.UTC()
	end = end.UTC()
	if !end.After(start) {
		return result
	}

	minutes := int(end.Sub(start).Minutes())
	if minutes > MaximumOfflineMinutes {
		minutes = MaximumOfflineMinutes
		start = end.Add(-MaximumOfflineMinutes * time.Minute)
	}
	if minutes < MinimumOfflineMinutes {
		return result
	}

	regionID := input.ActiveRegion
	region, exists := GetExpeditionRegion(regionID)
	if !exists {
		regionID = DefaultExpeditionRegionID
		region, _ = GetExpeditionRegion(regionID)
	}
	stage := input.CurrentStage
	if stage < 1 || stage > region.MaxStages {
		stage = 1
	}
	bossStage := input.IsBossStage || stage >= region.MaxStages

	result = OfflineResult{
		ReportID:         deterministicReportID(input.Character.ID, start, end, input.StateRevision),
		PeriodStart:      start,
		PeriodEnd:        end,
		CalculatedAt:     end,
		MinutesOffline:   minutes,
		RegionID:         regionID,
		RegionName:       region.Name,
		Stage:            stage,
		WasBossStage:     bossStage,
		FinalStage:       stage,
		IsBossStageAfter: bossStage,
		ItemsFound:       []Item{},
		ItemsConverted:   []Item{},
		RegionsUnlocked:  []string{},
		LevelBefore:      input.Character.Level,
		LevelAfter:       input.Character.Level,
		StateRevision:    input.StateRevision,
	}
	if len(region.Monsters) == 0 {
		result.StoppedReason = "regiao_sem_monstros"
		return result
	}

	seed := input.Seed
	if seed == 0 {
		hash := sha256.Sum256([]byte(result.ReportID))
		for i := 0; i < 8; i++ {
			seed = seed<<8 | int64(hash[i])
		}
	}
	rng := rand.New(rand.NewSource(seed))
	playerAttack, playerDefense, maxHealth, attackSpeed := offlineStats(input)
	dps := math.Max(1, float64(playerAttack)/0.75*attackSpeed)
	currentHealth := float64(input.Character.Health)
	if currentHealth <= 0 || currentHealth > float64(maxHealth) {
		currentHealth = float64(maxHealth)
	}
	// Auto-retorno só reinicia a expedição depois da recuperação completa.
	if !input.IsExpeditionActive && input.Character.AutoResumeExpedition {
		currentHealth = float64(maxHealth)
	}
	simulatedLevel := input.Character.Level
	simulatedExperience := input.Character.Experience
	lifesteal, goldBonus, _ := equipmentPassives(input.Inventory)
	remainingSeconds := float64(minutes * 60)
	efficiencySum := 0.0
	efficiencySamples := 0
	offlineResMap := make(map[string]int64)
	offlineTrophyMap := make(map[string]int64)
	bossRewardBudget := offlineBossRewardBudget(minutes)

	for remainingSeconds > 0 {
		wave := buildOfflineWave(region, stage, bossStage, simulatedLevel, rng)
		if len(wave) == 0 {
			result.StoppedReason = "onda_sem_monstros"
			break
		}

		waveSeconds := 0.0
		waveEfficiencies := make([]float64, len(wave))
		fightDurations := make([]float64, len(wave))
		for i, monster := range wave {
			efficiency := offlineCombatEfficiency(playerDefense, maxHealth, dps, lifesteal, input.Character.VIT, input.ActiveStance, monster)
			waveEfficiencies[i] = efficiency
			monsterHP := monster.MaxHealth
			if monsterHP <= 0 {
				monsterHP = monster.Health
			}
			fightDurations[i] = math.Max(1.0, float64(monsterHP)/dps) + 1.5
			waveSeconds += fightDurations[i]
		}
		if waveSeconds <= 0 || waveSeconds > remainingSeconds {
			if result.WavesCompleted == 0 {
				result.StoppedReason = "poder_ou_tempo_insuficiente_para_concluir_fase"
			}
			for _, efficiency := range waveEfficiencies {
				efficiencySum += efficiency
				efficiencySamples++
			}
			break
		}

		projectedDamage := offlineProjectedWaveDamage(wave, fightDurations, playerDefense, dps, lifesteal)
		if projectedDamage >= currentHealth {
			campRecoverySeconds := offlineCampRecoverySeconds(maxHealth, simulatedLevel, input.Character.VIT)
			shouldAutoResume := input.Character != nil && input.Character.AutoResumeExpedition

			if shouldAutoResume && remainingSeconds > (waveSeconds+campRecoverySeconds) {
				// Herói é derrotado nesta fase específica; retorna ao acampamento,
				// descansa o tempo escalonado por seu HP/Nível/VIT para regenerar a vida ao máximo
				// e reinicia a expedição na fase 1!
				remainingSeconds -= (waveSeconds + campRecoverySeconds)
				currentHealth = float64(maxHealth)
				stage = 1
				bossStage = false
				continue
			}

			result.Defeated = true
			result.StoppedReason = "derrotado_durante_simulacao_offline"
			result.FinalStage = 1
			result.IsBossStageAfter = false
			result.HealthAfter = int(math.Max(1, math.Floor(float64(maxHealth)*0.40)))
			break
		}
		currentHealth = math.Min(float64(maxHealth), currentHealth-projectedDamage)
		// Regeneração natural de intervalo entre fases (Vitalidade + descanso breve)
		waveRestRegen := math.Max(3.0, float64(input.Character.VIT)*0.35+6.0)
		currentHealth = math.Min(float64(maxHealth), currentHealth+waveRestRegen)

		remainingSeconds -= waveSeconds
		result.WavesCompleted++
		for i, monster := range wave {
			efficiencySum += waveEfficiencies[i]
			efficiencySamples++
			result.Kills++
			mHealth := monster.MaxHealth
			if mHealth <= 0 {
				mHealth = monster.Health
			}
			rewardBoss := monster.IsBoss && result.BossesRewarded < bossRewardBudget
			bossMultiplier := monster.IsBoss && rewardBoss
			xpGained := CalculateKillXP(simulatedLevel, monster.Level, mHealth, bossMultiplier)
			result.XPGained += xpGained
			simulatedExperience += xpGained
			result.GoldGained += CalculateKillGold(bossMultiplier, goldBonus, rng)

			mKey := monster.Key
			if mKey == "" {
				mKey = monster.Name
			}

			// Após o orçamento de boss, a criatura ainda concede XP/ouro de
			// monstro comum, mas não repete itens, partes e troféus de chefe.
			allowSpecialDrop := !monster.IsBoss || rewardBoss
			offDrops := []ResourceAmount{}
			if allowSpecialDrop {
				offDrops = RollMonsterResources(mKey, rng)
			}
			for _, od := range offDrops {
				if len(od.Key) >= 7 && od.Key[:7] == "trophy_" {
					offlineTrophyMap[od.Key] += od.Quantity
				} else {
					offlineResMap[od.Key] += od.Quantity
				}
			}

			if monster.IsBoss && rewardBoss {
				result.BossesRewarded++
			}

			var directItem *Item
			if allowSpecialDrop {
				directItem = RollCombatDirectLoot(mKey, monster.Level, monster.IsBoss, rng)
			}
			if item := directItem; item != nil {
				item.CreatedAt = end
				// Se a auto-venda offline estiver ativa e atingir o gatilho, processa a higienização
				if input.AutoSellSettings.Enabled && input.AutoSellSettings.OfflineEnabled && len(result.ItemsFound) >= MaximumOfflineItems*input.AutoSellSettings.TriggerPercent/100 {
					eval := EvaluateAutoSell(input.AutoSellSettings, append(result.ItemsFound, *item), MaximumOfflineItems, 0, 10000)
					result.ItemsFound = eval.ItemsKept
					result.ConvertedGold += eval.TotalGoldEstimated
					result.DropsAutoConverted += len(eval.ItemsToSell)
				} else if len(result.ItemsFound) < MaximumOfflineItems {
					result.ItemsFound = append(result.ItemsFound, *item)
				} else {
					// O limite do relatório não destrói recompensas protegidas: elas
					// seguem para a fila persistente durante o claim.
					isProtected := IsOverflowProtectedItem(*item, input.AutoSellSettings)
					if !isProtected {
						convertedValue := item.ValueGold / 2
						if convertedValue < 1 {
							convertedValue = 1
						}
						result.ConvertedGold += convertedValue
						result.DropsAutoConverted++
					} else {
						result.ItemsPending = append(result.ItemsPending, *item)
					}
				}
			}
		}

		previousLevel := simulatedLevel
		for simulatedExperience >= GetRequiredXPForLevel(simulatedLevel) {
			simulatedExperience -= GetRequiredXPForLevel(simulatedLevel)
			simulatedLevel++
		}
		if simulatedLevel > previousLevel {
			// CalculateStats concede +10 MaxHP por nível; atributos não gastos não
			// alteram o DPS, mas a reserva defensiva cresce nas ondas seguintes.
			maxHealth += (simulatedLevel - previousLevel) * 10
			currentHealth = float64(maxHealth)
		}

		if bossStage {
			result.BossesDefeated++
			result.ExpeditionsCompleted++
			result.RegionsUnlocked = appendUnique(result.RegionsUnlocked, unlocksFromBoss(regionID, input.Character.UnlockedRegions)...)
			stage = 1
			bossStage = false
		} else {
			stage++
			bossStage = stage >= region.MaxStages
		}
	}

	for k, v := range offlineResMap {
		result.ResourcesFound = append(result.ResourcesFound, ResourceAmount{Key: k, Quantity: v})
	}
	sort.Slice(result.ResourcesFound, func(i, j int) bool {
		return result.ResourcesFound[i].Key < result.ResourcesFound[j].Key
	})
	for k, v := range offlineTrophyMap {
		result.BossTrophies = append(result.BossTrophies, ResourceAmount{Key: k, Quantity: v})
	}
	sort.Slice(result.BossTrophies, func(i, j int) bool {
		return result.BossTrophies[i].Key < result.BossTrophies[j].Key
	})

	if !result.Defeated {
		result.FinalStage = stage
		result.IsBossStageAfter = bossStage
		result.HealthAfter = int(math.Max(1, math.Round(currentHealth)))
	}
	result.LevelAfter = simulatedLevel
	if efficiencySamples > 0 {
		result.Efficiency = math.Round((efficiencySum/float64(efficiencySamples))*1000) / 1000
	}
	return result
}
