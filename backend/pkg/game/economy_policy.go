package game

import (
	"os"
	"strconv"
	"strings"
)

const (
	ItemSourceLegacyDrop  = "legacy_drop"
	ItemSourceMonsterDrop = "monster_drop"
	ItemSourceBossDrop    = "boss_drop"
	ItemSourceCrafted     = "crafted"
	ItemSourceStarter     = "starter_pack"
	ItemSourceQuest       = "quest_reward"
)

// EconomyPolicy concentra os controles de rollout da Economia V2. Os valores
// padrão correspondem ao estado final crafting-first; as variáveis de ambiente
// permitem rollback sem alterar saves ou publicar outro binário.
type EconomyPolicy struct {
	Version                       int     `json:"version"`
	ProfessionsEnabled            bool    `json:"professions_enabled"`
	GatheringEnabled              bool    `json:"gathering_enabled"`
	CraftingEnabled               bool    `json:"crafting_enabled"`
	CraftingFirstLootEnabled      bool    `json:"crafting_first_loot_enabled"`
	CommonEquipmentDropMultiplier float64 `json:"common_equipment_drop_multiplier"`
	BossArtifactDropMultiplier    float64 `json:"boss_artifact_drop_multiplier"`
}

func boolEnv(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return value
}

func floatEnv(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil || value < 0 || value > 1 {
		return fallback
	}
	return value
}

func CurrentEconomyPolicy() EconomyPolicy {
	craftingFirst := boolEnv("ATLAS_CRAFTING_FIRST_LOOT", true)
	commonMultiplier := floatEnv("ATLAS_COMMON_EQUIPMENT_DROP_MULTIPLIER", 1.0)
	if !craftingFirst && strings.TrimSpace(os.Getenv("ATLAS_COMMON_EQUIPMENT_DROP_MULTIPLIER")) == "" {
		commonMultiplier = 1.0
	}
	return EconomyPolicy{
		Version:                       2,
		ProfessionsEnabled:            boolEnv("ATLAS_PROFESSIONS_ENABLED", true),
		GatheringEnabled:              boolEnv("ATLAS_GATHERING_ENABLED", true),
		CraftingEnabled:               boolEnv("ATLAS_CRAFTING_ENABLED", true),
		CraftingFirstLootEnabled:      craftingFirst,
		CommonEquipmentDropMultiplier: commonMultiplier,
		BossArtifactDropMultiplier:    floatEnv("ATLAS_BOSS_ARTIFACT_DROP_MULTIPLIER", 1.0),
	}
}
