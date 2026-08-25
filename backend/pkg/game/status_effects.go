package game

// StatusEffect representa um modificador temporário (debuff ou buff) aplicado a um monstro.
type StatusEffect struct {
	Key            string  `json:"key"`             // "slow", "burn", "stun"
	RemainingTicks int     `json:"remaining_ticks"` // Quantidade de ticks restantes
	Magnitude      float64 `json:"magnitude"`       // Intensidade (ex: 0.30 para 30% de slow)
}

// AppliedStatus é o payload de aplicação retornado por uma skill.
type AppliedStatus struct {
	TargetID  string  `json:"target_id"`
	Key       string  `json:"key"`
	Ticks     int     `json:"ticks"`
	Magnitude float64 `json:"magnitude"`
}

// ApplyStatusEffect adiciona ou renova um efeito em uma lista de status de monstro.
func ApplyStatusEffect(list []StatusEffect, key string, ticks int, magnitude float64) []StatusEffect {
	for i := range list {
		if list[i].Key == key {
			if ticks > list[i].RemainingTicks {
				list[i].RemainingTicks = ticks
			}
			list[i].Magnitude = magnitude
			return list
		}
	}
	return append(list, StatusEffect{Key: key, RemainingTicks: ticks, Magnitude: magnitude})
}

// TickStatusEffects avança os status em 1 tick e remove os expirados.
func TickStatusEffects(list []StatusEffect) []StatusEffect {
	active := make([]StatusEffect, 0, len(list))
	for _, eff := range list {
		eff.RemainingTicks--
		if eff.RemainingTicks > 0 {
			active = append(active, eff)
		}
	}
	return active
}

// GetStatusSpeedModifier retorna o fator de velocidade do monstro (1.0 = normal, 0.70 = slow 30%).
func GetStatusSpeedModifier(list []StatusEffect) float64 {
	mod := 1.0
	for _, eff := range list {
		if eff.Key == "slow" {
			mod *= (1.0 - eff.Magnitude)
		}
	}
	if mod < 0.20 {
		mod = 0.20
	}
	return mod
}