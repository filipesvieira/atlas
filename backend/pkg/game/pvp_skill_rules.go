package game

import "math"

// PvPSkillRotationRulesVersion preserva a M3E-A para partidas já criadas.
const PvPSkillRotationRulesVersion = 2

// PvPTacticalCombatRulesVersion ativa a M3E-B: estratégia pré-duelo e
// movimentação tática autoritativa.
const PvPTacticalCombatRulesVersion = 3

// PvPBalanceCombatRulesVersion ativa o hardening de balanceamento v1 sem
// alterar retrospectivamente partidas criadas nas regras M3E-B.
const PvPBalanceCombatRulesVersion = 4

// PvPCombatRulesVersion identifica a regra usada por novos duelos.
const PvPCombatRulesVersion = PvPBalanceCombatRulesVersion

// pvpSkillRule é intencionalmente separado de SkillDefinition. A mesma chave
// visual pode existir nos dois modos, mas custo, alcance, dano e efeitos de
// uma expedição não podem vazar para uma arena entre jogadores.
type pvpSkillRule struct {
	Key                 string
	Archetype           string
	ManaCost            int
	CooldownSeconds     float64
	DamageMultiplier    float64
	GuaranteedCritical  bool
	BonusCriticalChance float64
	HealingPercent      float64
	HealAtOrBelow       float64
	SlowMultiplier      float64
	SlowDurationSeconds float64
	KnockbackTiles      int
	CanCastWhileMoving  bool
}

var pvpSkillRules = map[string]pvpSkillRule{
	"whirlwind": {
		Key: "whirlwind", Archetype: "melee", ManaCost: 16, CooldownSeconds: 3.00, DamageMultiplier: 0.85,
	},
	"brutal_strike": {
		Key: "brutal_strike", Archetype: "melee", ManaCost: 20, CooldownSeconds: 4.75, DamageMultiplier: 1.30,
	},
	"multishot": {
		Key: "multishot", Archetype: "distance", ManaCost: 16, CooldownSeconds: 3.25, DamageMultiplier: 1.00,
	},
	"sniper_shot": {
		// Em PvP o crítico garantido em rotação automática inflava demais o
		// arqueiro. O disparo continua preciso, mas usa bônus de chance crítico.
		Key: "sniper_shot", Archetype: "distance", ManaCost: 22, CooldownSeconds: 5.75, DamageMultiplier: 1.12, BonusCriticalChance: 0.20,
	},
	"fireball": {
		// Bola de Fogo assume a identidade de burst do mago.
		Key: "fireball", Archetype: "magic", ManaCost: 22, CooldownSeconds: 4.00, DamageMultiplier: 1.12,
	},
	"ice_shard": {
		// Estilhaço causa menos dano, mas cria a janela de spacing do mago.
		Key: "ice_shard", Archetype: "magic", ManaCost: 18, CooldownSeconds: 4.25, DamageMultiplier: 0.84, SlowMultiplier: 0.72, SlowDurationSeconds: 2.00, CanCastWhileMoving: true,
	},
	"arcane_nova": {
		// Em 1x1 a identidade de área vira controle espacial: dano moderado e
		// knockback autoritativo, sem reutilizar o comportamento PvE.
		Key: "arcane_nova", Archetype: "magic", ManaCost: 24, CooldownSeconds: 5.25, DamageMultiplier: 0.92, KnockbackTiles: 2,
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
