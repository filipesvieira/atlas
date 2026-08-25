package game

import (
	"fmt"
	"math"
	"sort"
	"time"
)

type BuffCategory string
type BuffEffectKey string

const (
	BuffCategoryMeal   BuffCategory = "meal"
	BuffCategoryPotion BuffCategory = "potion"

	BuffEffectXPGainPercent BuffEffectKey = "xp_gain_percent"
	BuffEffectAttackPercent BuffEffectKey = "attack_percent"
)

// ConsumableDefinition liga um recurso produzido na cozinha ou na alquimia a um efeito temporário.
// Cada categoria é exclusiva: consumir outra unidade substitui apenas o buff da mesma categoria.
type ConsumableDefinition struct {
	ResourceKey     string        `json:"resource_key"`
	Name            string        `json:"name"`
	Description     string        `json:"description"`
	Category        BuffCategory  `json:"category"`
	EffectKey       BuffEffectKey `json:"effect_key"`
	Magnitude       float64       `json:"magnitude"`
	DurationSeconds int64         `json:"duration_seconds"`
	ContentVersion  int           `json:"content_version"`
}

type ActiveBuff struct {
	Category          BuffCategory  `json:"category"`
	SourceResourceKey string        `json:"source_resource_key"`
	SourceName        string        `json:"source_name"`
	EffectKey         BuffEffectKey `json:"effect_key"`
	Magnitude         float64       `json:"magnitude"`
	StartedAt         time.Time     `json:"started_at"`
	ExpiresAt         time.Time     `json:"expires_at"`
	ContentVersion    int           `json:"content_version"`
}

type ConsumeResult struct {
	RequestID         string                    `json:"request_id"`
	ResourceKey       string                    `json:"resource_key"`
	ActiveBuff        ActiveBuff                `json:"active_buff"`
	ReplacedBuff      *ActiveBuff               `json:"replaced_buff,omitempty"`
	ResourceInventory ResourceInventorySnapshot `json:"resource_inventory"`
}

var ConsumableRegistry = map[string]ConsumableDefinition{
	"grilled_fish": {
		ResourceKey: "grilled_fish", Name: "Peixe Assado", Category: BuffCategoryMeal,
		EffectKey: BuffEffectXPGainPercent, Magnitude: 5, DurationSeconds: 20 * 60,
		Description: "Refeição simples para uma caçada curta. Aumenta a experiência de combate em 5% por 20 minutos.", ContentVersion: 1,
	},
	"hunter_skewer": {
		ResourceKey: "hunter_skewer", Name: "Espeto do Caçador", Category: BuffCategoryMeal,
		EffectKey: BuffEffectAttackPercent, Magnitude: 5, DurationSeconds: 20 * 60,
		Description: "Carne e ervas tostadas no fogo. Aumenta o poder de ataque em 5% por 20 minutos.", ContentVersion: 1,
	},
	"explorer_stew": {
		ResourceKey: "explorer_stew", Name: "Ensopado do Explorador", Category: BuffCategoryMeal,
		EffectKey: BuffEffectXPGainPercent, Magnitude: 8, DurationSeconds: 5 * 60 * 60,
		Description: "Ensopado demorado para jornadas longas. Aumenta a experiência de combate em 8% por 5 horas.", ContentVersion: 1,
	},
	"tracker_pie": {
		ResourceKey: "tracker_pie", Name: "Torta do Rastreador", Category: BuffCategoryMeal,
		EffectKey: BuffEffectAttackPercent, Magnitude: 7, DurationSeconds: 5 * 60 * 60,
		Description: "Torta densa de carne, farinha e ervas. Aumenta o poder de ataque em 7% por 5 horas.", ContentVersion: 1,
	},
	"arcane_banquet": {
		ResourceKey: "arcane_banquet", Name: "Banquete Arcano", Category: BuffCategoryMeal,
		EffectKey: BuffEffectXPGainPercent, Magnitude: 12, DurationSeconds: 24 * 60 * 60,
		Description: "Banquete raro temperado com Flor Arcana. Aumenta a experiência de combate em 12% por 24 horas.", ContentVersion: 1,
	},
	"warrior_banquet": {
		ResourceKey: "warrior_banquet", Name: "Banquete do Guerreiro", Category: BuffCategoryMeal,
		EffectKey: BuffEffectAttackPercent, Magnitude: 10, DurationSeconds: 24 * 60 * 60,
		Description: "Refeição de alto custo preparada para campanhas inteiras. Aumenta o poder de ataque em 10% por 24 horas.", ContentVersion: 1,
	},
	"minor_strength_elixir": {
		ResourceKey: "minor_strength_elixir", Name: "Tônico de Força", Category: BuffCategoryPotion,
		EffectKey: BuffEffectAttackPercent, Magnitude: 5, DurationSeconds: 30 * 60,
		Description: "Poção simples que aumenta o poder de ataque em 5% por 30 minutos.", ContentVersion: 1,
	},
	"focus_tonic": {
		ResourceKey: "focus_tonic", Name: "Tônico de Foco", Category: BuffCategoryPotion,
		EffectKey: BuffEffectXPGainPercent, Magnitude: 5, DurationSeconds: 30 * 60,
		Description: "Poção simples que aumenta a experiência de combate em 5% por 30 minutos.", ContentVersion: 1,
	},
	"arcane_draught": {
		ResourceKey: "arcane_draught", Name: "Elixir Arcano", Category: BuffCategoryPotion,
		EffectKey: BuffEffectAttackPercent, Magnitude: 8, DurationSeconds: 5 * 60 * 60,
		Description: "Elixir concentrado que aumenta o poder de ataque em 8% por 5 horas.", ContentVersion: 1,
	},
}

func GetConsumableDefinition(resourceKey string) (ConsumableDefinition, bool) {
	definition, exists := ConsumableRegistry[resourceKey]
	return definition, exists
}

func ListConsumableDefinitions() []ConsumableDefinition {
	definitions := make([]ConsumableDefinition, 0, len(ConsumableRegistry))
	for _, definition := range ConsumableRegistry {
		definitions = append(definitions, definition)
	}
	sort.Slice(definitions, func(i, j int) bool {
		if definitions[i].DurationSeconds == definitions[j].DurationSeconds {
			return definitions[i].Name < definitions[j].Name
		}
		return definitions[i].DurationSeconds < definitions[j].DurationSeconds
	})
	return definitions
}

func (buff ActiveBuff) IsActive(at time.Time) bool {
	if at.IsZero() {
		at = time.Now().UTC()
	}
	return buff.ExpiresAt.After(at) && !buff.StartedAt.After(at)
}

func ActiveBuffMultiplier(buffs []ActiveBuff, effect BuffEffectKey, at time.Time) float64 {
	multiplier := 1.0
	for _, buff := range buffs {
		if buff.EffectKey != effect || !buff.IsActive(at) || buff.Magnitude <= 0 {
			continue
		}
		multiplier += buff.Magnitude / 100.0
	}
	// Limite defensivo para conteúdo futuro mal configurado.
	return math.Max(1, math.Min(3, multiplier))
}

func ApplyXPGainBuff(base int64, buffs []ActiveBuff, at time.Time) int64 {
	if base <= 0 {
		return base
	}
	return int64(math.Round(float64(base) * ActiveBuffMultiplier(buffs, BuffEffectXPGainPercent, at)))
}

func ApplyActiveBuffsToDerivedStats(stats DerivedStats, buffs []ActiveBuff, at time.Time) DerivedStats {
	attackMultiplier := ActiveBuffMultiplier(buffs, BuffEffectAttackPercent, at)
	if attackMultiplier <= 1 {
		return stats
	}
	stats.TotalAttack = int(math.Round(float64(stats.TotalAttack) * attackMultiplier))
	stats.CurrentDPS = int(math.Round(float64(stats.CurrentDPS) * attackMultiplier))
	return stats
}

func ValidateConsumableRegistry() error {
	for key, definition := range ConsumableRegistry {
		if definition.ResourceKey != key || definition.Name == "" || definition.DurationSeconds <= 0 || definition.Magnitude <= 0 || definition.ContentVersion < 1 {
			return fmt.Errorf("consumível inválido: %s", key)
		}
		if definition.Category == "" || (definition.EffectKey != BuffEffectXPGainPercent && definition.EffectKey != BuffEffectAttackPercent) {
			return fmt.Errorf("consumível %s possui efeito inválido", key)
		}
		resource, exists := GetResourceDefinition(key)
		if !exists || resource.Category != ResourceCategoryConsumable {
			return fmt.Errorf("consumível %s não possui recurso consumível correspondente", key)
		}
	}
	return nil
}
