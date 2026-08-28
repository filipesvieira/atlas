package game

import "math"

// PvPTacticalStrategyVersion versiona apenas a intenção tática declarada pelo
// jogador. Ela é pequena de propósito: o cliente escolhe uma intenção, mas o
// servidor continua decidindo movimento, alcance, alvo, dano e resultado.
const PvPTacticalStrategyVersion = 1

type PvPTacticalStrategy string

const (
	PvPStrategyAggressive PvPTacticalStrategy = "aggressive"
	PvPStrategyBalanced   PvPTacticalStrategy = "balanced"
	PvPStrategyDefensive  PvPTacticalStrategy = "defensive"
)

func NormalizePvPTacticalStrategy(strategy string) PvPTacticalStrategy {
	switch PvPTacticalStrategy(strategy) {
	case PvPStrategyAggressive, PvPStrategyDefensive:
		return PvPTacticalStrategy(strategy)
	default:
		return PvPStrategyBalanced
	}
}

// pvpTacticalBand define a zona desejada pelo arquétipo. Ranged não foge para
// sempre: recuar é mais lento que a perseguição melee e cada passo de kite
// consome a janela ofensiva daquele pulso.
type pvpTacticalBand struct {
	MinRange float64
	MaxRange float64
}

func pvpTacticalBandFor(archetype string, strategy PvPTacticalStrategy) pvpTacticalBand {
	strategy = NormalizePvPTacticalStrategy(string(strategy))
	switch archetype {
	case "distance":
		switch strategy {
		case PvPStrategyAggressive:
			return pvpTacticalBand{MinRange: 3.5, MaxRange: 6.5}
		case PvPStrategyDefensive:
			return pvpTacticalBand{MinRange: 5.0, MaxRange: 7.75}
		default:
			return pvpTacticalBand{MinRange: 4.25, MaxRange: 7.25}
		}
	case "magic":
		switch strategy {
		case PvPStrategyAggressive:
			return pvpTacticalBand{MinRange: 3.0, MaxRange: 5.5}
		case PvPStrategyDefensive:
			return pvpTacticalBand{MinRange: 4.5, MaxRange: 6.75}
		default:
			return pvpTacticalBand{MinRange: 3.75, MaxRange: 6.25}
		}
	default:
		return pvpTacticalBand{MinRange: 0, MaxRange: combatRangeForArchetype("melee")}
	}
}

// pvpMovementSpeedFor converte a velocidade do equipamento em uma velocidade
// tática. Backpedal/kite tem teto menor que perseguição melee para impedir
// kiting infinito, preservando ainda o valor de botas e de posicionamento.
func pvpMovementSpeedFor(actor PvPCombatActor, strategy PvPTacticalStrategy, retreating bool, chasingRanged bool) float64 {
	base := actor.Derived.MovementSpeedMultiplier
	if base <= 0 || math.IsNaN(base) || math.IsInf(base, 0) {
		base = BaseHeroMovementSpeedMultiplier
	}
	base = math.Max(1, math.Min(MaxHeroMovementSpeedMultiplier, base))
	strategy = NormalizePvPTacticalStrategy(string(strategy))

	if actor.Archetype == "melee" && chasingRanged {
		multiplier := 1.18
		floor := 2.0
		if strategy == PvPStrategyAggressive {
			multiplier = 1.24
			floor = 2.10
		} else if strategy == PvPStrategyDefensive {
			multiplier = 1.12
			floor = 1.90
		}
		return math.Min(MaxHeroMovementSpeedMultiplier, math.Max(floor, base*multiplier))
	}

	if retreating && (actor.Archetype == "distance" || actor.Archetype == "magic") {
		multiplier := 0.68
		capSpeed := 1.78
		if actor.Archetype == "magic" {
			multiplier = 0.72
			capSpeed = 1.76
		}
		if strategy == PvPStrategyAggressive {
			multiplier -= 0.06
			capSpeed -= 0.10
		} else if strategy == PvPStrategyDefensive {
			multiplier += 0.06
			capSpeed += 0.10
		}
		return math.Max(1.0, math.Min(capSpeed, base*multiplier))
	}

	if strategy == PvPStrategyAggressive {
		return math.Min(MaxHeroMovementSpeedMultiplier, base*1.05)
	}
	return base
}

func pvpHealThreshold(rule pvpSkillRule, strategy PvPTacticalStrategy) float64 {
	threshold := rule.HealAtOrBelow
	switch NormalizePvPTacticalStrategy(string(strategy)) {
	case PvPStrategyDefensive:
		threshold += 0.10
	case PvPStrategyAggressive:
		threshold -= 0.05
	}
	return math.Max(0.20, math.Min(0.80, threshold))
}

// Em combate corpo a corpo, arqueiro e mago ficam pressionados. O redutor é
// deliberadamente moderado: o objetivo é recompensar o guerreiro por conseguir
// encostar, não invalidar builds distance/magic.
func pvpClosePressureMultiplier(source, target PvPCombatActor) float64 {
	if source.Archetype == "melee" || target.Archetype != "melee" {
		return 1
	}
	distance := gridDistance(source.GridX, source.GridY, target.GridX, target.GridY)
	if distance <= 2.25 {
		if source.Archetype == "magic" {
			return 0.96
		}
		return 0.97
	}
	return 1
}
