package game

import (
	"fmt"
	"math"
	"time"
)

const (
	PvPBalanceScenarioMechanicsEqualCP = "mechanics_equal_cp"
	PvPBalanceScenarioStarterBaseline  = "starter_baseline"
	PvPBalanceScenarioStarterArchetype = "starter_archetype"
	PvPBalanceMaxPowerGapPercent       = 2.0
	PvPBalanceTargetMaxWinShare        = 0.60
	PvPBalanceDefaultSeeds             = 100
	PvPBalanceMaxTicks                 = 1200
)

type PvPBalanceProfile struct {
	Key         string                 `json:"key"`
	Archetype   string                 `json:"archetype"`
	Participant PvPParticipantSnapshot `json:"participant"`
}

type PvPBalanceMatchupResult struct {
	Scenario          string  `json:"scenario"`
	ProfileA          string  `json:"profile_a"`
	ProfileB          string  `json:"profile_b"`
	CombatPowerA      int     `json:"combat_power_a"`
	CombatPowerB      int     `json:"combat_power_b"`
	PowerGapPercent   float64 `json:"power_gap_percent"`
	Eligible          bool    `json:"eligible"`
	ExclusionReason   string  `json:"exclusion_reason,omitempty"`
	WinsA             int     `json:"wins_a"`
	WinsB             int     `json:"wins_b"`
	Draws             int     `json:"draws"`
	Timeouts          int     `json:"timeouts"`
	Seeds             int     `json:"seeds"`
	AverageTicks      float64 `json:"average_ticks"`
	DominantWinShare  float64 `json:"dominant_win_share"`
	WithinBalanceGate bool    `json:"within_balance_gate"`
}

type PvPBalanceMatrixReport struct {
	Scenario string                    `json:"scenario"`
	Seeds    int                       `json:"seeds"`
	Results  []PvPBalanceMatchupResult `json:"results"`
}

func PvPPowerGapPercent(a, b int) float64 {
	if a <= 0 && b <= 0 {
		return 0
	}
	denominator := math.Max(float64(a), float64(b))
	return math.Abs(float64(a-b)) * 100 / denominator
}

func pvpBalanceItem(templateKey string) *Item {
	template, ok := ItemRegistry.Get(templateKey)
	if !ok {
		return nil
	}
	return &Item{
		ID: template.Key, Name: template.Name, TemplateKey: template.Key,
		SlotType: string(template.Slot), WeaponType: template.WeaponType,
		RequiredLevel: template.RequiredLevel, Tier: template.Tier, Rarity: "Comum",
		PhysicalAttack: template.BaseAtk, MagicAttack: template.BaseMagic,
		Attack: max(template.BaseAtk, template.BaseMagic), Defense: template.BaseDef,
		Weight: template.BaseWeight, Hands: template.Hands,
		BonusSTR: template.BaseSTR, BonusDEX: template.BaseDEX, BonusINT: template.BaseINT,
		BonusHP: template.BaseHP, BonusMP: template.BaseMP, CritChance: template.CritChance,
		ManaRegen: template.ManaRegen, MovementSpeedBonus: template.BaseMovementSpeedBonus,
	}
}

func starterPvPBalanceProfile(key string, primaryBonus int) (PvPBalanceProfile, error) {
	char := &CharacterData{ID: key, Name: key, Level: 20, STR: 100, DEX: 100, INT: 100, VIT: 100, ActiveStance: "balanced"}
	inventory := &InventoryData{}
	archetype := ""
	skills := []string{}

	switch key {
	case "melee_shield":
		archetype = "melee"
		char.STR += primaryBonus
		inventory.Equipment.MainHand = pvpBalanceItem("espada_do_aprendiz")
		inventory.Equipment.OffHand = pvpBalanceItem("broquel_de_madeira")
		skills = []string{"whirlwind", "brutal_strike"}
	case "melee_2h":
		archetype = "melee"
		char.STR += primaryBonus
		inventory.Equipment.MainHand = pvpBalanceItem("montante_de_madeira")
		skills = []string{"whirlwind", "brutal_strike"}
	case "distance":
		archetype = "distance"
		char.DEX += primaryBonus
		inventory.Equipment.MainHand = pvpBalanceItem("arco_curvo")
		inventory.Equipment.Ammo = pvpBalanceItem("flechas_de_madeira")
		skills = []string{"multishot", "sniper_shot"}
	case "magic":
		archetype = "magic"
		char.INT += primaryBonus
		inventory.Equipment.MainHand = pvpBalanceItem("varinha_do_aprendiz")
		skills = []string{"fireball", "ice_shard"}
	default:
		return PvPBalanceProfile{}, fmt.Errorf("perfil QA PvP desconhecido: %s", key)
	}
	if inventory.Equipment.MainHand == nil {
		return PvPBalanceProfile{}, fmt.Errorf("equipamento QA ausente para %s", key)
	}

	derived := CalculateDerivedStats(char, inventory, char.ActiveStance)
	if derived.PrimaryArchetype != archetype {
		return PvPBalanceProfile{}, fmt.Errorf("perfil QA %s derivou arquétipo %s, esperado %s", key, derived.PrimaryArchetype, archetype)
	}
	participant := PvPParticipantSnapshot{
		CharacterID: key, Name: key, Level: char.Level, Stance: char.ActiveStance,
		Health: derived.MaxHealth, MaxHealth: derived.MaxHealth, Mana: derived.MaxMana, MaxMana: derived.MaxMana,
		DerivedStats: derived, Equipment: inventory.Equipment, ActiveSkills: skills,
		TacticalStrategy: PvPStrategyBalanced, StrategyVersion: PvPTacticalStrategyVersion,
	}
	participant.CombatPower = PvPCombatPower(participant)
	return PvPBalanceProfile{Key: key, Archetype: archetype, Participant: participant}, nil
}

func mechanicsEqualCPPvPBalanceProfile(archetype string) PvPBalanceProfile {
	derived := DerivedStats{
		TotalAttack: 40, TotalDefense: 30, CurrentDPS: 20, AttackSpeedSeconds: 2,
		CritChance: 12, MovementSpeedMultiplier: 1.5, PrimaryArchetype: archetype,
	}
	skills := map[string][]string{
		"melee":    {"whirlwind", "brutal_strike"},
		"distance": {"multishot", "sniper_shot"},
		"magic":    {"fireball", "ice_shard"},
	}[archetype]
	participant := PvPParticipantSnapshot{
		CharacterID: archetype, Name: archetype, Level: 20,
		Health: 2000, MaxHealth: 2000, Mana: 600, MaxMana: 600,
		DerivedStats: derived, ActiveSkills: skills,
		TacticalStrategy: PvPStrategyBalanced, StrategyVersion: PvPTacticalStrategyVersion,
	}
	participant.CombatPower = PvPCombatPower(participant)
	return PvPBalanceProfile{Key: archetype, Archetype: archetype, Participant: participant}
}

func PvPBalanceProfiles(scenario string) ([]PvPBalanceProfile, error) {
	switch scenario {
	case PvPBalanceScenarioMechanicsEqualCP:
		return []PvPBalanceProfile{
			mechanicsEqualCPPvPBalanceProfile("melee"),
			mechanicsEqualCPPvPBalanceProfile("distance"),
			mechanicsEqualCPPvPBalanceProfile("magic"),
		}, nil
	case PvPBalanceScenarioStarterBaseline, PvPBalanceScenarioStarterArchetype:
		bonus := 0
		if scenario == PvPBalanceScenarioStarterArchetype {
			bonus = 100
		}
		keys := []string{"melee_shield", "melee_2h", "distance", "magic"}
		profiles := make([]PvPBalanceProfile, 0, len(keys))
		for _, key := range keys {
			profile, err := starterPvPBalanceProfile(key, bonus)
			if err != nil {
				return nil, err
			}
			profiles = append(profiles, profile)
		}
		return profiles, nil
	default:
		return nil, fmt.Errorf("cenário QA PvP desconhecido: %s", scenario)
	}
}

func RunPvPBalanceMatchup(scenario string, a, b PvPBalanceProfile, seeds int) (PvPBalanceMatchupResult, error) {
	if seeds <= 0 {
		seeds = PvPBalanceDefaultSeeds
	}
	result := PvPBalanceMatchupResult{
		Scenario: scenario, ProfileA: a.Key, ProfileB: b.Key,
		CombatPowerA: a.Participant.CombatPower, CombatPowerB: b.Participant.CombatPower,
		Seeds: seeds,
	}
	result.PowerGapPercent = PvPPowerGapPercent(result.CombatPowerA, result.CombatPowerB)
	result.Eligible = scenario == PvPBalanceScenarioMechanicsEqualCP && result.PowerGapPercent <= PvPBalanceMaxPowerGapPercent
	if !result.Eligible {
		if scenario != PvPBalanceScenarioMechanicsEqualCP {
			result.ExclusionReason = "diagnostic_loadout_not_mechanics_gate"
		} else {
			result.ExclusionReason = "combat_power_gap_above_2_percent"
		}
	}

	var totalTicks uint64
	for seed := 1; seed <= seeds; seed++ {
		pa := a.Participant
		pb := b.Participant
		pa.Team = CombatTeamA
		pb.Team = CombatTeamB
		started := time.Unix(0, 0).UTC()
		match := PvPMatch{
			ID: fmt.Sprintf("qa-%s-%s-%d", a.Key, b.Key, seed), Mode: CombatModeDuel, ArenaKey: "duel_arena",
			Status: PvPMatchActive, RulesVersion: PvPCombatRulesVersion, Seed: int64(seed),
			CreatedAt: started, StartedAt: &started, Participants: []PvPParticipantSnapshot{pa, pb},
		}
		instance, err := NewPvPCombatInstance(match)
		if err != nil {
			return result, err
		}
		var snapshot PvPCombatSnapshot
		for tick := 0; tick < PvPBalanceMaxTicks; tick++ {
			snapshot = instance.Tick(started.Add(time.Duration(tick+1) * PvPCombatTickInterval))
			if snapshot.Status != PvPMatchActive {
				break
			}
		}
		totalTicks += snapshot.Tick
		if snapshot.Status == PvPMatchActive {
			result.Timeouts++
			result.Draws++
			continue
		}
		switch snapshot.WinnerID {
		case pa.CharacterID:
			result.WinsA++
		case pb.CharacterID:
			result.WinsB++
		default:
			result.Draws++
		}
	}
	result.AverageTicks = float64(totalTicks) / float64(seeds)
	decisive := result.WinsA + result.WinsB
	if decisive > 0 {
		result.DominantWinShare = float64(max(result.WinsA, result.WinsB)) / float64(decisive)
	}
	result.WithinBalanceGate = result.Eligible && result.Timeouts == 0 && result.DominantWinShare <= PvPBalanceTargetMaxWinShare
	return result, nil
}

func RunPvPBalanceMatrix(scenario string, seeds int) (PvPBalanceMatrixReport, error) {
	profiles, err := PvPBalanceProfiles(scenario)
	if err != nil {
		return PvPBalanceMatrixReport{}, err
	}
	report := PvPBalanceMatrixReport{Scenario: scenario, Seeds: seeds, Results: []PvPBalanceMatchupResult{}}
	for i := 0; i < len(profiles); i++ {
		for j := i + 1; j < len(profiles); j++ {
			// Starter 1H e 2H são duas leituras do mesmo arquétipo; não há valor
			// em tratá-las como matchup de classe entre si.
			if profiles[i].Archetype == profiles[j].Archetype {
				continue
			}
			result, err := RunPvPBalanceMatchup(scenario, profiles[i], profiles[j], seeds)
			if err != nil {
				return report, err
			}
			report.Results = append(report.Results, result)
		}
	}
	return report, nil
}
