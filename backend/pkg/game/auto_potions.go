package game

import "time"

const (
	// Os frascos automáticos são uma rede de segurança, não uma cura completa.
	// Os valores são centralizados para que o balanceamento não dependa da UI.
	AutoPotionHealthCost           int64 = 15
	AutoPotionManaCost             int64 = 12
	AutoPotionHealthRestorePercent       = 35
	AutoPotionManaRestorePercent         = 45
	// Frascos de emergência podem ser usados novamente durante uma luta
	// prolongada, mas não em sequência no mesmo instante. O cooldown menor
	// também aumenta o consumo de ouro, que é o recurso pago da automação.
	AutoPotionHealthCooldown time.Duration = 5 * time.Second
	AutoPotionManaCooldown   time.Duration = 4 * time.Second
)

const (
	AutoPotionKindHealth = "health"
	AutoPotionKindMana   = "mana"
)

// AutoPotionSettings guarda a preferência persistente do jogador. Ela é
// separada dos consumíveis de cozinha/alquimia: não consome recursos, compra
// um frasco de emergência com o ouro pessoal durante a expedição.
type AutoPotionSettings struct {
	Enabled                bool  `json:"enabled"`
	HealthThresholdPercent int   `json:"health_threshold_percent"`
	ManaThresholdPercent   int   `json:"mana_threshold_percent"`
	MaxGoldPerExpedition   int64 `json:"max_gold_per_expedition"`
	Revision               int64 `json:"revision"`
}

// AutoPotionState é o estado da expedição em andamento. Persisti-lo impede
// que reconectar seja uma forma de reiniciar orçamento ou cooldown.
type AutoPotionState struct {
	GoldSpent           int64     `json:"gold_spent"`
	HealthCooldownUntil time.Time `json:"health_cooldown_until,omitempty"`
	ManaCooldownUntil   time.Time `json:"mana_cooldown_until,omitempty"`
	BudgetExhausted     bool      `json:"budget_exhausted"`
	Revision            int64     `json:"revision"`
}

// AutoPotionSpendResult comunica o resultado da compra autoritativa para a
// sessão, inclusive quando o orçamento se encerra sem que um frasco seja
// aplicado.
type AutoPotionSpendResult struct {
	Applied           bool            `json:"applied"`
	Reason            string          `json:"reason,omitempty"`
	GoldBank          int64           `json:"gold_bank"`
	GoldDelta         int64           `json:"gold_delta,omitempty"`
	CharacterRevision int64           `json:"character_revision,omitempty"`
	State             AutoPotionState `json:"state"`
	PotionKey         string          `json:"potion_key"`
}

func DefaultAutoPotionSettings() AutoPotionSettings {
	return AutoPotionSettings{
		Enabled:                false,
		HealthThresholdPercent: 30,
		ManaThresholdPercent:   25,
		MaxGoldPerExpedition:   50,
		Revision:               1,
	}
}

func DefaultAutoPotionState() AutoPotionState {
	return AutoPotionState{}
}

func NormalizeAutoPotionSettings(settings AutoPotionSettings) AutoPotionSettings {
	if settings.HealthThresholdPercent < 10 || settings.HealthThresholdPercent > 70 {
		settings.HealthThresholdPercent = 30
	}
	if settings.ManaThresholdPercent < 5 || settings.ManaThresholdPercent > 70 {
		settings.ManaThresholdPercent = 25
	}
	switch settings.MaxGoldPerExpedition {
	case 25, 50, 100, 250:
	default:
		settings.MaxGoldPerExpedition = 50
	}
	return settings
}

func AutoPotionCost(kind string) int64 {
	if kind == AutoPotionKindMana {
		return AutoPotionManaCost
	}
	return AutoPotionHealthCost
}

func AutoPotionCooldown(kind string) time.Duration {
	if kind == AutoPotionKindMana {
		return AutoPotionManaCooldown
	}
	return AutoPotionHealthCooldown
}

// CanSpendAutoPotion aplica as regras que não dependem de HP/MP. O servidor
// continua responsável por confirmar o ouro e gravar o novo estado.
func CanSpendAutoPotion(settings AutoPotionSettings, state AutoPotionState, kind string, goldBank int64, now time.Time) string {
	settings = NormalizeAutoPotionSettings(settings)
	if !settings.Enabled {
		return "disabled"
	}
	if kind != AutoPotionKindHealth && kind != AutoPotionKindMana {
		return "invalid_kind"
	}
	if kind == AutoPotionKindHealth && state.HealthCooldownUntil.After(now) {
		return "cooldown"
	}
	if kind == AutoPotionKindMana && state.ManaCooldownUntil.After(now) {
		return "cooldown"
	}
	cost := AutoPotionCost(kind)
	if state.GoldSpent+cost > settings.MaxGoldPerExpedition {
		return "budget_exhausted"
	}
	if goldBank < cost {
		return "insufficient_gold"
	}
	return ""
}

func ApplyAutoPotionSpend(state AutoPotionState, kind string, now time.Time) AutoPotionState {
	state.GoldSpent += AutoPotionCost(kind)
	if kind == AutoPotionKindMana {
		state.ManaCooldownUntil = now.Add(AutoPotionCooldown(kind))
	} else {
		state.HealthCooldownUntil = now.Add(AutoPotionCooldown(kind))
	}
	state.BudgetExhausted = false
	return state
}