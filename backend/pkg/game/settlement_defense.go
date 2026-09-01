package game

import (
	"math"
	"sort"
)

const SettlementDefenseSnapshotVersion = 1

// SettlementDefenseComponent explica de onde o Defense Power veio. A UI deve
// mostrar estes componentes em vez de exibir apenas um número opaco.
type SettlementDefenseComponent struct {
	Key     string   `json:"key"`
	Name    string   `json:"name"`
	Icon    string   `json:"icon"`
	Score   int      `json:"score"`
	Details []string `json:"details,omitempty"`
}

type SettlementGarrisonState struct {
	Capacity        int    `json:"capacity"`
	ActiveGuards    int    `json:"active_guards"`
	CivilianReserve int    `json:"civilian_reserve"`
	TrainingPercent int    `json:"training_percent"`
	AssignmentMode  string `json:"assignment_mode"`
}

type SettlementRecoveryState struct {
	DefenderRecoveryPercent int `json:"defender_recovery_percent"`
	InjuryReductionPercent  int `json:"injury_reduction_percent"`
}

type SettlementEngineeringState struct {
	RepairPercent int `json:"repair_percent"`
	TrapSlots     int `json:"trap_slots"`
}

type SettlementEconomicProtectionState struct {
	StoragePercent  int `json:"storage_percent"`
	TreasuryPercent int `json:"treasury_percent"`
}

type SettlementArcaneDefenseState struct {
	ShieldPercent    int `json:"shield_percent"`
	StabilityPercent int `json:"stability_percent"`
}

type SettlementDefenseEvaluation struct {
	DefensePower int                               `json:"defense_power"`
	Readiness    int                               `json:"readiness"`
	ReadinessKey string                            `json:"readiness_key"`
	Components   []SettlementDefenseComponent      `json:"components"`
	Garrison     SettlementGarrisonState           `json:"garrison"`
	Recovery     SettlementRecoveryState           `json:"recovery"`
	Engineering  SettlementEngineeringState        `json:"engineering"`
	Protection   SettlementEconomicProtectionState `json:"protection"`
	Arcane       SettlementArcaneDefenseState      `json:"arcane"`
}

func buildingEffectValue(buildingKey string, level int, effectKey string) int {
	if level <= 0 {
		return 0
	}
	definition, ok := GetBuildingDefinition(buildingKey)
	if !ok || level > len(definition.Levels) {
		return 0
	}
	for _, effect := range definition.Levels[level-1].Effects {
		if effect.Key == effectKey {
			return int(math.Round(effect.Value))
		}
	}
	return 0
}

func clampPercent(value int) int {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}

func defenseLevelTarget(stageKey string, buildingKey string) int {
	stageIndex := SettlementStageIndex(stageKey)
	switch {
	case stageIndex < SettlementStageIndex(SettlementStageVillage):
		return 0
	case stageIndex < SettlementStageIndex(SettlementStageCity):
		if buildingKey == "wall" || buildingKey == "watchtower" {
			return 1
		}
		return 0
	case stageIndex < SettlementStageIndex(SettlementStageKingdom):
		switch buildingKey {
		case "wall", "watchtower", "gate", "barracks":
			return 2
		case "vault", "infirmary", "engineer_workshop", "war_room", "resonator":
			return 1
		default:
			return 0
		}
	default:
		switch buildingKey {
		case "wall", "watchtower", "gate", "barracks", "vault", "infirmary", "engineer_workshop", "war_room", "resonator":
			return 3
		default:
			return 0
		}
	}
}

func defenseSectionCompletion(stageKey string, levels map[string]int, keys ...string) int {
	total, completed := 0.0, 0.0
	for _, key := range keys {
		target := defenseLevelTarget(stageKey, key)
		if target <= 0 {
			continue
		}
		total += 1
		ratio := float64(levels[key]) / float64(target)
		if ratio > 1 {
			ratio = 1
		}
		if ratio < 0 {
			ratio = 0
		}
		completed += ratio
	}
	if total == 0 {
		return 100
	}
	return clampPercent(int(math.Round(completed / total * 100)))
}

func readinessLabel(readiness int) string {
	switch {
	case readiness >= 90:
		return "fortified"
	case readiness >= 70:
		return "prepared"
	case readiness >= 40:
		return "forming"
	default:
		return "exposed"
	}
}

// EvaluateSettlementDefense é pura e determinística. Ela transforma os níveis
// atuais das estruturas em métricas compreensíveis; nenhuma raid é executada aqui.
func EvaluateSettlementDefense(stageKey string, levels map[string]int, strategy string, population int) SettlementDefenseEvaluation {
	if levels == nil {
		levels = map[string]int{}
	}

	wallIntegrity := buildingEffectValue("wall", levels["wall"], "wall_integrity")
	wallReduction := buildingEffectValue("wall", levels["wall"], "wall_damage_reduction_percent")
	gateIntegrity := buildingEffectValue("gate", levels["gate"], "gate_integrity")
	gateReduction := buildingEffectValue("gate", levels["gate"], "gate_breach_resistance_percent")
	detection := buildingEffectValue("watchtower", levels["watchtower"], "watchtower_detection_percent")
	warning := buildingEffectValue("watchtower", levels["watchtower"], "watchtower_warning_seconds")
	guardCapacity := buildingEffectValue("barracks", levels["barracks"], "barracks_guard_capacity")
	training := buildingEffectValue("barracks", levels["barracks"], "barracks_training_percent")
	civilianReserve := min(SettlementPioneerCount, max(0, population))
	activeGuards := min(guardCapacity, max(0, population-civilianReserve))
	command := buildingEffectValue("war_room", levels["war_room"], "war_room_command_percent")
	repair := buildingEffectValue("engineer_workshop", levels["engineer_workshop"], "fortification_repair_percent")
	trapSlots := buildingEffectValue("engineer_workshop", levels["engineer_workshop"], "defense_trap_slots")
	recovery := buildingEffectValue("infirmary", levels["infirmary"], "defender_recovery_percent")
	injuryReduction := buildingEffectValue("infirmary", levels["infirmary"], "resident_injury_reduction_percent")
	storageProtection := buildingEffectValue("vault", levels["vault"], "raid_storage_protection_percent")
	treasuryProtection := buildingEffectValue("vault", levels["vault"], "raid_treasury_protection_percent")
	shield := buildingEffectValue("resonator", levels["resonator"], "resonator_shield_percent")
	stability := buildingEffectValue("resonator", levels["resonator"], "resonator_stability_percent")

	fortification := wallIntegrity/10 + gateIntegrity/10 + wallReduction*10 + gateReduction*10
	garrison := activeGuards*60 + training*12 + command*12
	surveillance := detection*8 + warning*3
	support := repair*8 + recovery*6 + injuryReduction*6 + trapSlots*50
	arcane := shield*12 + stability*6
	protection := storageProtection*4 + treasuryProtection*4

	switch strategy {
	case "aggressive":
		garrison = int(math.Round(float64(garrison) * 1.08))
		surveillance = int(math.Round(float64(surveillance) * 1.05))
	case "defensive":
		fortification = int(math.Round(float64(fortification) * 1.08))
		support = int(math.Round(float64(support) * 1.05))
	default:
		strategy = "balanced"
	}

	components := []SettlementDefenseComponent{
		{Key: "fortification", Name: "Fortificações", Icon: "🧱", Score: fortification},
		{Key: "garrison", Name: "Guarnição", Icon: "⚔️", Score: garrison},
		{Key: "surveillance", Name: "Vigilância", Icon: "👁️", Score: surveillance},
		{Key: "support", Name: "Suporte", Icon: "🌿", Score: support},
		{Key: "arcane", Name: "Defesa Arcana", Icon: "💠", Score: arcane},
		{Key: "protection", Name: "Proteção Econômica", Icon: "🔐", Score: protection},
	}
	sort.SliceStable(components, func(i, j int) bool { return components[i].Score > components[j].Score })

	fortificationReady := defenseSectionCompletion(stageKey, levels, "wall", "gate", "watchtower")
	garrisonReady := defenseSectionCompletion(stageKey, levels, "barracks")
	if guardCapacity > 0 {
		fillPercent := clampPercent(int(math.Round(float64(activeGuards) * 100 / float64(guardCapacity))))
		garrisonReady = min(garrisonReady, fillPercent)
	}
	supportReady := defenseSectionCompletion(stageKey, levels, "infirmary", "engineer_workshop")
	commandReady := defenseSectionCompletion(stageKey, levels, "war_room")
	arcaneReady := defenseSectionCompletion(stageKey, levels, "resonator")
	readiness := clampPercent(int(math.Round(
		float64(fortificationReady)*0.40 +
			float64(garrisonReady)*0.25 +
			float64(supportReady)*0.15 +
			float64(commandReady)*0.10 +
			float64(arcaneReady)*0.10,
	)))
	if SettlementStageIndex(stageKey) < SettlementStageIndex(SettlementStageVillage) {
		readiness = 0
	}

	return SettlementDefenseEvaluation{
		DefensePower: fortification + garrison + surveillance + support + arcane + protection,
		Readiness:    readiness,
		ReadinessKey: readinessLabel(readiness),
		Components:   components,
		Garrison: SettlementGarrisonState{
			Capacity: guardCapacity, ActiveGuards: activeGuards, CivilianReserve: civilianReserve,
			TrainingPercent: training, AssignmentMode: "automatic",
		},
		Recovery:    SettlementRecoveryState{DefenderRecoveryPercent: recovery, InjuryReductionPercent: injuryReduction},
		Engineering: SettlementEngineeringState{RepairPercent: repair, TrapSlots: trapSlots},
		Protection:  SettlementEconomicProtectionState{StoragePercent: storageProtection, TreasuryPercent: treasuryProtection},
		Arcane:      SettlementArcaneDefenseState{ShieldPercent: shield, StabilityPercent: stability},
	}
}
