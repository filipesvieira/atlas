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
	MinimumOfflineMinutes = 3
	MaximumOfflineMinutes = 720
	MaximumOfflineItems   = 50
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
}

type OfflineResult struct {
	ReportID             string    `json:"report_id"`
	PeriodStart          time.Time `json:"period_start"`
	PeriodEnd            time.Time `json:"period_end"`
	CalculatedAt         time.Time `json:"calculated_at"`
	MinutesOffline       int       `json:"minutes_offline"`
	RegionID             string    `json:"region_id"`
	RegionName           string    `json:"region_name"`
	Stage                int       `json:"stage"`
	WasBossStage         bool      `json:"was_boss_stage"`
	FinalStage           int       `json:"final_stage"`
	IsBossStageAfter     bool      `json:"is_boss_stage_after"`
	WavesCompleted       int       `json:"waves_completed"`
	BossesDefeated       int       `json:"bosses_defeated"`
	ExpeditionsCompleted int       `json:"expeditions_completed"`
	RegionsUnlocked      []string  `json:"regions_unlocked,omitempty"`
	Kills                int       `json:"kills"`
	Efficiency           float64   `json:"efficiency"`
	XPGained             int64     `json:"xp_gained"`
	GoldGained           int64     `json:"gold_gained"`
	ItemsFound           []Item    `json:"items_found"`
	ItemsConverted       []Item    `json:"items_converted,omitempty"`
	ConvertedGold        int64     `json:"converted_gold,omitempty"`
	DropsAutoConverted   int       `json:"drops_auto_converted,omitempty"`
	LevelBefore          int       `json:"level_before"`
	LevelAfter           int       `json:"level_after"`
	StoppedReason        string    `json:"stopped_reason,omitempty"`
	StateRevision        int64     `json:"state_revision"`
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

func offlineKillXP(playerLevel, monsterLevel int) int64 {
	rawXP := float64(60 + monsterLevel*30)
	levelDiff := playerLevel - monsterLevel
	multiplier := 1.0
	if levelDiff > 3 {
		multiplier = 1.0 - (0.15 * float64(levelDiff-3))
		if multiplier < 0.10 {
			multiplier = 0.10
		}
	}
	return int64(math.Round(rawXP * multiplier))
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

func unlocksFromBoss(regionID string, alreadyUnlocked []string) []string {
	known := make(map[string]struct{}, len(alreadyUnlocked))
	for _, region := range alreadyUnlocked {
		known[region] = struct{}{}
	}
	unlocked := []string{}
	for _, candidate := range ListExpeditionRegions() {
		if candidate.RequiresUnlockFrom != regionID {
			continue
		}
		if _, exists := known[candidate.ID]; exists {
			continue
		}
		unlocked = append(unlocked, candidate.ID)
	}
	sort.Strings(unlocked)
	return unlocked
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
	if input.Character == nil || !input.IsExpeditionActive || input.PeriodStart.IsZero() {
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
	simulatedLevel := input.Character.Level
	simulatedExperience := input.Character.Experience
	lifesteal, goldBonus, _ := equipmentPassives(input.Inventory)
	remainingSeconds := float64(minutes * 60)
	efficiencySum := 0.0
	efficiencySamples := 0

	for remainingSeconds > 0 {
		wave := buildOfflineWave(region, stage, bossStage, simulatedLevel, rng)
		if len(wave) == 0 {
			result.StoppedReason = "onda_sem_monstros"
			break
		}

		waveSeconds := 0.0
		waveEfficiencies := make([]float64, len(wave))
		for i, monster := range wave {
			efficiency := offlineCombatEfficiency(playerDefense, maxHealth, dps, lifesteal, input.Character.VIT, input.ActiveStance, monster)
			waveEfficiencies[i] = efficiency
			monsterHP := monster.MaxHealth
			if monsterHP <= 0 {
				monsterHP = monster.Health
			}
			waveSeconds += (float64(monsterHP)/dps + 2.0) / efficiency
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

		remainingSeconds -= waveSeconds
		result.WavesCompleted++
		for i, monster := range wave {
			efficiencySum += waveEfficiencies[i]
			efficiencySamples++
			result.Kills++
			xpGained := offlineKillXP(simulatedLevel, monster.Level)
			result.XPGained += xpGained
			simulatedExperience += xpGained
			baseGold := float64(15 + rng.Intn(25))
			result.GoldGained += int64(math.Round(baseGold * (1.0 + goldBonus/100.0)))

			dropChance := 0.35
			if monster.IsBoss {
				dropChance = 1.0
			}
			if rng.Float64() < dropChance {
				mKey := monster.Key
				if mKey == "" {
					mKey = monster.Name
				}
				if item := GenerateLootForMonsterWithRand(mKey, monster.Level, rng); item != nil {
					if len(result.ItemsFound) < MaximumOfflineItems {
						result.ItemsFound = append(result.ItemsFound, *item)
					} else {
						convertedValue := item.ValueGold / 2
						if convertedValue < 1 {
							convertedValue = 1
						}
						result.ConvertedGold += convertedValue
						result.DropsAutoConverted++
					}
				}
			}
		}

		previousLevel := simulatedLevel
		for simulatedExperience >= GetRequiredXPForLevel(simulatedLevel) {
			simulatedLevel++
		}
		if simulatedLevel > previousLevel {
			// CalculateStats concede +10 MaxHP por nível; atributos não gastos não
			// alteram o DPS, mas a reserva defensiva cresce nas ondas seguintes.
			maxHealth += (simulatedLevel - previousLevel) * 10
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

	result.FinalStage = stage
	result.IsBossStageAfter = bossStage
	result.LevelAfter = simulatedLevel
	if efficiencySamples > 0 {
		result.Efficiency = math.Round((efficiencySum/float64(efficiencySamples))*1000) / 1000
	}
	return result
}
