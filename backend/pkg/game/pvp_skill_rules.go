package game

import "math"

// PvPSkillRotationRulesVersion preserva a M3E-A para partidas já criadas.
const PvPSkillRotationRulesVersion = 2

// PvPTacticalCombatRulesVersion ativa a M3E-B: estratégia pré-duelo e
// movimentação tática autoritativa.
const PvPTacticalCombatRulesVersion = 3

// PvPCombatRulesVersion identifica a regra usada por novos duelos.
const PvPCombatRulesVersion = PvPTacticalCombatRulesVersion

// pvpSkillRule é intencionalmente separado de SkillDefinition. A mesma chave
// visual pode existir nos dois modos, mas custo, alcance, dano e efeitos de
// uma expedição não podem vazar para uma arena entre jogadores.
type pvpSkillRule struct {
	Key                string
	Archetype          string
	ManaCost           int
	CooldownSeconds    float64
	DamageMultiplier   float64
	GuaranteedCritical bool
	HealingPercent     float64
	HealAtOrBelow      float64
}

var pvpSkillRules = map[string]pvpSkillRule{
	"whirlwind": {
		Key: "whirlwind", Archetype: "melee", ManaCost: 16, CooldownSeconds: 3.00, DamageMultiplier: 0.85,
	},
	"brutal_strike": {
		Key: "brutal_strike", Archetype: "melee", ManaCost: 20, CooldownSeconds: 4.75, DamageMultiplier: 1.30,
	},
	"multishot": {
		Key: "multishot", Archetype: "distance", ManaCost: 16, CooldownSeconds: 3.25, DamageMultiplier: 1.05,
	},
	"sniper_shot": {
		Key: "sniper_shot", Archetype: "distance", ManaCost: 22, CooldownSeconds: 5.50, DamageMultiplier: 1.10, GuaranteedCritical: true,
	},
	"fireball": {
		Key: "fireball", Archetype: "magic", ManaCost: 20, CooldownSeconds: 3.50, DamageMultiplier: 1.05,
	},
	"ice_shard": {
		Key: "ice_shard", Archetype: "magic", ManaCost: 20, CooldownSeconds: 4.25, DamageMultiplier: 0.82,
	},
	"arcane_nova": {
		Key: "arcane_nova", Archetype: "magic", ManaCost: 24, CooldownSeconds: 5.00, DamageMultiplier: 0.95,
	},
	"divine_heal": {
		Key: "divine_heal", Archetype: "", ManaCost: 28, CooldownSeconds: 5.50, HealingPercent: 0.18, HealAtOrBelow: 0.50,
	},
}

func pvpSkillLoadout(activeSkills []string, archetype string, rulesVersion int) []string {
	if rulesVersion < PvPSkillRotationRulesVersion {
		return nil
	}
	loadout := make([]string, 0, 2)
	seen := make(map[string]struct{}, 2)
	for _, key := range activeSkills {
		if len(loadout) >= 2 {
			break
		}
		rule, exists := pvpSkillRules[key]
		if !exists || (rule.Archetype != "" && rule.Archetype != archetype) {
			continue
		}
		if _, duplicated := seen[key]; duplicated {
			continue
		}
		seen[key] = struct{}{}
		loadout = append(loadout, key)
	}
	return loadout
}

func normalizePvPSkillCooldowns(source map[string]float64, loadout []string) map[string]float64 {
	if len(loadout) == 0 {
		return map[string]float64{}
	}
	normalized := make(map[string]float64, len(loadout))
	for _, key := range loadout {
		cooldown := source[key]
		if math.IsNaN(cooldown) || math.IsInf(cooldown, 0) || cooldown < 0 {
			cooldown = 0
		}
		rule := pvpSkillRules[key]
		normalized[key] = math.Min(rule.CooldownSeconds, cooldown)
	}
	return normalized
}
