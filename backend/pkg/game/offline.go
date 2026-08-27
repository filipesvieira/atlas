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
	offlineCombatTickSeconds     = 0.75
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
	AutoPotionSettings AutoPotionSettings
	AutoPotionState    AutoPotionState
	ActiveBuffs        []ActiveBuff
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
	AutoPotionGoldSpent  int64            `json:"auto_potion_gold_spent,omitempty"`
	AutoPotionState      AutoPotionState  `json:"auto_potion_state"`
	ShieldMasteryTries   int              `json:"shield_mastery_tries,omitempty"`
	ItemsFound           []Item           `json:"items_found"`
	ItemsPending         []Item           `json:"items_pending,omitempty"`
	ItemsConverted       []Item           `json:"items_converted,omitempty"`
	ConvertedGold        int64            `json:"converted_gold,omitempty"`
	DropsAutoConverted   int              `json:"drops_auto_converted,omitempty"`
	ResourcesFound       []ResourceAmount `json:"resources_found,omitempty"`
	BossTrophies         []ResourceAmount `json:"boss_trophies,omitempty"`
	FailureStage         int              `json:"failure_stage,omitempty"`
	LevelBefore          int              `json:"level_before"`
	LevelAfter           int              `json:"level_after"`
	HighestStageReached  int              `json:"highest_stage_reached"`
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

func offlineStats(input OfflineSimulationInput, level int, at time.Time) DerivedStats {
	charCopy := *input.Character
	if level > 0 {
		charCopy.Level = level
	}
	if input.Inventory == nil {
		input.Inventory = &InventoryData{Cap: 1500, Backpack: []Item{}}
	}
	stance := input.ActiveStance
	if stance == "" {
		stance = "balanced"
	}
	return ApplyActiveBuffsToDerivedStats(CalculateDerivedStats(&charCopy, input.Inventory, stance), input.ActiveBuffs, at)
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

type offlineWaveSimulation struct {
	completed          bool
	defeated           bool
	elapsedSeconds     float64
	healthAfter        float64
	damageTaken        int
	shieldMasteryTries int
	killTimes          []float64
}

// offlineAutoPotionRuntime mantém a mesma carteira e o mesmo orçamento da
// sessão online. A mana não é comprada offline porque o simulador não executa
// habilidades ativas (a regra já existente que favorece o jogo ao vivo).
type offlineAutoPotionRuntime struct {
	settings  AutoPotionSettings
	state     AutoPotionState
	goldBank  int64
	goldSpent int64
}

func newOfflineAutoPotionRuntime(input OfflineSimulationInput) *offlineAutoPotionRuntime {
	gold := int64(0)
	if input.Character != nil {
		gold = input.Character.GoldBank
	}
	return &offlineAutoPotionRuntime{
		settings: NormalizeAutoPotionSettings(input.AutoPotionSettings),
		state:    input.AutoPotionState,
		goldBank: gold,
	}
}

func (runtime *offlineAutoPotionRuntime) tryHealthPotion(currentHealth float64, maxHealth int, now time.Time) (float64, bool) {
	if runtime == nil || !runtime.settings.Enabled || maxHealth <= 0 {
		return currentHealth, false
	}
	if percentOfCurrent(int(math.Floor(currentHealth)), maxHealth) > runtime.settings.HealthThresholdPercent {
		return currentHealth, false
	}
	if CanSpendAutoPotion(runtime.settings, runtime.state, AutoPotionKindHealth, runtime.goldBank, now) != "" {
		if runtime.state.GoldSpent+AutoPotionHealthCost > runtime.settings.MaxGoldPerExpedition {
			runtime.state.BudgetExhausted = true
		}
		return currentHealth, false
	}
	runtime.goldBank -= AutoPotionHealthCost
	runtime.goldSpent += AutoPotionHealthCost
	runtime.state = ApplyAutoPotionSpend(runtime.state, AutoPotionKindHealth, now)
	restore := math.Ceil(float64(maxHealth) * float64(AutoPotionHealthRestorePercent) / 100.0)
	return math.Min(float64(maxHealth), currentHealth+restore), true
}

// simulateOfflineWave reproduz o relógio autoritativo da arena em baixa
// resolução: o mesmo tick, a mesma malha, alcance, perseguição, kite, fuga,
// cadência de ataque, mitigação e variação de dano usados online. A simulação
// não executa habilidades ativas (elas dependem de decisões e estado visual
// da sessão), tornando o jogo online deliberadamente mais responsivo e
// vantajoso sem conceder recompensas irreais ao modo offline.
func simulateOfflineWave(input OfflineSimulationInput, playerLevel int, wave []Monster, initialHealth, maxSeconds float64, startedAt time.Time, rng *rand.Rand, autoPotions *offlineAutoPotionRuntime) offlineWaveSimulation {
	result := offlineWaveSimulation{
		healthAfter: initialHealth,
		killTimes:   make([]float64, len(wave)),
	}
	if len(wave) == 0 || maxSeconds <= 0 {
		return result
	}

	session := &GameSession{
		ActiveRegion:    input.ActiveRegion,
		CurrentMonsters: make([]Monster, len(wave)),
		HeroGridX:       HeroGridX,
		HeroGridY:       HeroGridY,
		HeroState:       "IDLE",
		SkillCooldowns:  make(map[string]int),
	}
	copy(session.CurrentMonsters, wave)
	for i := range session.CurrentMonsters {
		mob := &session.CurrentMonsters[i]
		mob.ID = "offline_mob_" + strconv.Itoa(i)
		session.placeMonsterAtSpawn(mob, i)
		mob.State = "CHASE"
		mob.FleeResolved = false
		if mob.MovementSpeedMultiplier <= 0 {
			mob.MovementSpeedMultiplier = 1.0
		}
		if mob.AttackSpeedSeconds <= 0 {
			mob.AttackSpeedSeconds = DefaultMonsterAttackSpeed
		}
		// O spawn online acontece em um tick separado; o primeiro ataque só
		// pode ocorrer no tick seguinte, quando o cooldown inicial é reduzido.
		mob.AttackCooldownSec = 0.50
	}

	lifesteal, _, _ := equipmentPassives(input.Inventory)
	alive := len(session.CurrentMonsters)
	elapsed := 0.0
	for elapsed+offlineCombatTickSeconds <= maxSeconds && alive > 0 {
		tickAt := startedAt.Add(time.Duration(elapsed * float64(time.Second)))
		stats := offlineStats(input, playerLevel, tickAt)

		// A arena regenera um ponto de vida por tick antes de processar os
		// ataques, exatamente como o loop online.
		if result.healthAfter < float64(stats.MaxHealth) {
			result.healthAfter = math.Min(float64(stats.MaxHealth), result.healthAfter+1)
		}
		session.moveHeroWithSpeed(stats.PrimaryArchetype, stats.MovementSpeedMultiplier)
		session.moveMonsters()

		// O ataque básico mantém a cadência real derivada da arma/DEX. A
		// variância e o crítico usam a mesma distribuição do combate online.
		session.BasicAttackCooldownSec -= offlineCombatTickSeconds
		target := session.nearestLivingMonsterInRange(stats.PrimaryArchetype)
		dealt := 0
		if session.BasicAttackCooldownSec <= 0 && target != nil {
			session.BasicAttackCooldownSec = stats.AttackSpeedSeconds
			attack := int(float64(stats.TotalAttack) * (0.85 + rng.Float64()*0.30))
			if rng.Float64() <= stats.CritChance/100.0 {
				attack = int(float64(attack) * 1.50)
			}
			if attack < 1 {
				attack = 1
			}
			target.Health -= attack
			dealt = attack
		}

		// Monstros só causam dano quando a posição isométrica os coloca no
		// alcance. Isso elimina a antiga aproximação que aplicava dano por
		// duração da luta mesmo enquanto a horda ainda se deslocava.
		taken := 0
		for i := range session.CurrentMonsters {
			mob := &session.CurrentMonsters[i]
			if mob.Health <= 0 {
				continue
			}
			if mob.AttackSpeedSeconds <= 0 {
				mob.AttackSpeedSeconds = DefaultMonsterAttackSpeed
			}
			mob.AttackCooldownSec -= offlineCombatTickSeconds
			distance := gridDistance(session.HeroGridX, session.HeroGridY, mob.GridX, mob.GridY)
			inRange := distance <= 8.0
			if mob.AttackType != AttackTypeRanged {
				inRange = distance <= combatRangeForArchetype("melee")
			}
			if inRange && mob.AttackCooldownSec <= 0 {
				mob.AttackCooldownSec = mob.AttackSpeedSeconds
				mitigation := float64(stats.TotalDefense) / (float64(stats.TotalDefense) + float64(20*mob.Level))
				rawAttack := float64(mob.Attack + rng.Intn(4))
				taken += int(math.Max(1, math.Round(rawAttack*(1.0-mitigation))))
			}
		}
		result.shieldMasteryTries += shieldMasteryTriesForDamage(input.Inventory, taken)
		result.damageTaken += taken
		result.healthAfter -= float64(taken)
		if lifesteal > 0 && dealt > 0 {
			result.healthAfter = math.Min(float64(stats.MaxHealth), result.healthAfter+float64(int(float64(dealt)*(lifesteal/100.0))))
		}
		result.healthAfter, _ = autoPotions.tryHealthPotion(result.healthAfter, stats.MaxHealth, tickAt)

		for i := range session.CurrentMonsters {
			updateMonsterFleeState(&session.CurrentMonsters[i])
		}
		elapsed += offlineCombatTickSeconds
		for i := range session.CurrentMonsters {
			if session.CurrentMonsters[i].Health <= 0 && result.killTimes[i] == 0 {
				result.killTimes[i] = elapsed
				alive--
			}
		}
		if result.healthAfter <= 0 {
			result.defeated = true
			result.elapsedSeconds = elapsed
			return result
		}
	}

	result.elapsedSeconds = elapsed
	result.completed = alive == 0
	return result
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
	result := OfflineResult{ItemsFound: []Item{}, ItemsConverted: []Item{}, RegionsUnlocked: []string{}, AutoPotionState: input.AutoPotionState}
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
	if !input.IsExpeditionActive && input.Character.AutoResumeExpedition && input.Character.ExpeditionRecoveryUntil.After(start) {
		start = input.Character.ExpeditionRecoveryUntil.UTC()
	}
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
		ReportID:            deterministicReportID(input.Character.ID, start, end, input.StateRevision),
		PeriodStart:         start,
		PeriodEnd:           end,
		CalculatedAt:        end,
		MinutesOffline:      minutes,
		RegionID:            regionID,
		RegionName:          region.Name,
		Stage:               stage,
		WasBossStage:        bossStage,
		FinalStage:          stage,
		IsBossStageAfter:    bossStage,
		ItemsFound:          []Item{},
		ItemsConverted:      []Item{},
		RegionsUnlocked:     []string{},
		LevelBefore:         input.Character.Level,
		LevelAfter:          input.Character.Level,
		HighestStageReached: stage,
		StateRevision:       input.StateRevision,
		AutoPotionState:     input.AutoPotionState,
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
	initialStats := offlineStats(input, input.Character.Level, start)
	maxHealth := initialStats.MaxHealth
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
	autoPotions := newOfflineAutoPotionRuntime(input)

	for remainingSeconds > 0 {
		elapsedSeconds := float64(minutes*60) - remainingSeconds
		waveStartedAt := start.Add(time.Duration(elapsedSeconds * float64(time.Second)))
		stats := offlineStats(input, simulatedLevel, waveStartedAt)
		maxHealth = stats.MaxHealth
		if currentHealth > float64(maxHealth) {
			currentHealth = float64(maxHealth)
		}
		wave := buildOfflineWave(region, stage, bossStage, simulatedLevel, rng)
		if stage > result.HighestStageReached {
			result.HighestStageReached = stage
		}
		if len(wave) == 0 {
			result.StoppedReason = "onda_sem_monstros"
			break
		}

		waveEfficiencies := make([]float64, len(wave))
		for i, monster := range wave {
			efficiency := offlineCombatEfficiency(stats.TotalDefense, maxHealth, math.Max(1, float64(stats.CurrentDPS)), lifesteal, input.Character.VIT, input.ActiveStance, monster)
			waveEfficiencies[i] = efficiency
		}

		waveResult := simulateOfflineWave(input, simulatedLevel, wave, currentHealth, remainingSeconds, waveStartedAt, rng, autoPotions)
		result.ShieldMasteryTries += waveResult.shieldMasteryTries
		if !waveResult.completed {
			currentHealth = waveResult.healthAfter
			for _, efficiency := range waveEfficiencies {
				efficiencySum += efficiency
				efficiencySamples++
			}
			remainingSeconds -= waveResult.elapsedSeconds
			if waveResult.defeated {
				campRecoverySeconds := offlineCampRecoverySeconds(maxHealth, simulatedLevel, input.Character.VIT)
				shouldAutoResume := input.Character != nil && input.Character.AutoResumeExpedition

				if shouldAutoResume && remainingSeconds > campRecoverySeconds {
					// Herói é derrotado nesta fase específica; retorna ao acampamento,
					// descansa o tempo escalonado por seu HP/Nível/VIT para regenerar a vida ao máximo
					// e reinicia a expedição na fase 1!
					remainingSeconds -= campRecoverySeconds
					currentHealth = float64(maxHealth)
					stage = 1
					bossStage = false
					continue
				}

				result.Defeated = true
				result.FailureStage = stage
				result.StoppedReason = "derrotado_durante_simulacao_offline"
				result.FinalStage = 1
				result.IsBossStageAfter = false
				result.HealthAfter = int(math.Max(1, math.Floor(float64(maxHealth)*0.40)))
				break
			}
			result.StoppedReason = "poder_ou_tempo_insuficiente_para_concluir_fase"
			break
		}

		currentHealth = math.Min(float64(maxHealth), waveResult.healthAfter)
		remainingSeconds -= waveResult.elapsedSeconds
		result.WavesCompleted++
		for i, monster := range wave {
			killAt := waveStartedAt.Add(time.Duration(waveResult.killTimes[i] * float64(time.Second)))
			efficiencySum += waveEfficiencies[i]
			efficiencySamples++
			result.Kills++
			mHealth := monster.MaxHealth
			if mHealth <= 0 {
				mHealth = monster.Health
			}
			rewardBoss := monster.IsBoss && result.BossesRewarded < bossRewardBudget
			bossMultiplier := monster.IsBoss && rewardBoss
			xpGained := ApplyXPGainBuff(CalculateKillXP(simulatedLevel, monster.Level, mHealth, bossMultiplier), input.ActiveBuffs, killAt)
			result.XPGained += xpGained
			simulatedExperience += xpGained
			goldReward := CalculateKillGold(bossMultiplier, goldBonus, rng)
			result.GoldGained += goldReward
			autoPotions.goldBank += goldReward

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

		// O servidor online usa um tick de spawn separado entre duas ondas;
		// preservar esse intervalo evita que o modo offline transforme a troca
		// de fase em tempo de combate gratuito.
		if remainingSeconds > 0 {
			remainingSeconds -= math.Min(remainingSeconds, offlineCombatTickSeconds)
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
	result.AutoPotionGoldSpent = autoPotions.goldSpent
	result.AutoPotionState = autoPotions.state
	return result
}