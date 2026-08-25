package game

import (
	"fmt"
	"math"
	"math/rand"
)

type RarityChances map[string]float64

type CraftPreview struct {
	RecipeKey           string           `json:"recipe_key"`
	RecipeVersion       int              `json:"recipe_version"`
	CanCraft            bool             `json:"can_craft"`
	MissingRequirements []string         `json:"missing_requirements"`
	Costs               []ResourceAmount `json:"costs"`
	GoldCost            int64            `json:"gold_cost"`
	RarityChances       RarityChances    `json:"rarity_chances,omitempty"`
	MinimumRarity       string           `json:"minimum_rarity,omitempty"`
	MaximumRarity       string           `json:"maximum_rarity,omitempty"`
	EstimatedSeconds    int64            `json:"estimated_seconds"`
	PreviewRevision     int64            `json:"preview_revision"`
	CatalystKey         string           `json:"catalyst_key,omitempty"`
	CatalystCost        int64            `json:"catalyst_cost,omitempty"`
	ProfessionLevel     int              `json:"profession_level"`
	StationLevel        int              `json:"station_level"`
	RarityTableVersion  int              `json:"rarity_table_version"`
}

type CraftResult struct {
	TransactionID      string                    `json:"transaction_id"`
	RequestID          string                    `json:"request_id"`
	RecipeKey          string                    `json:"recipe_key"`
	Item               *Item                     `json:"item,omitempty"`
	Resources          []ResourceAmount          `json:"resources,omitempty"`
	Rarity             string                    `json:"rarity,omitempty"`
	SentToOverflow     bool                      `json:"sent_to_overflow"`
	SentToPending      bool                      `json:"sent_to_pending"`
	SentToArmory       bool                      `json:"sent_to_armory"`
	SentToBackpack     bool                      `json:"sent_to_backpack"`
	ProfessionProgress ProfessionProgress        `json:"profession_progress"`
	ResourceInventory  ResourceInventorySnapshot `json:"resource_inventory"`
}

// CraftBatchResult descreve o resultado real de uma solicitação em lote. O
// crafting manual não possui uma rolagem de "falha total": cada unidade
// concluída gera o item/recurso previsto. O lote só pode parar por requisitos
// insuficientes ou falta de espaço, enquanto a raridade continua aleatória.
type CraftBatchResult struct {
	RequestID      string         `json:"request_id"`
	RecipeKey      string         `json:"recipe_key"`
	Requested      int            `json:"requested"`
	Completed      int            `json:"completed"`
	NotCompleted   int            `json:"not_completed"`
	StopReason     string         `json:"stop_reason,omitempty"`
	RarityCounts   map[string]int `json:"rarity_counts,omitempty"`
	PendingCount   int            `json:"pending_count"`
	RandomFailures int            `json:"random_failures"`
}

func CraftRarityDistribution(recipe RecipeDefinition, catalystKey string) RarityChances {
	return CraftRarityDistributionWithModifiers(recipe, catalystKey, recipe.RequiredProfessionLevel, recipe.RequiredStationLevel)
}

// CraftRarityDistributionWithModifiers aplica, em ordem, distribuição base,
// profissão, estação e catalisador, sempre respeitando o teto da receita.
func CraftRarityDistributionWithModifiers(recipe RecipeDefinition, catalystKey string, professionLevel, stationLevel int) RarityChances {
	base := RarityChances{"Comum": .70, "Incomum": .25, "Raro": .05, "Épico": 0, "Lendário": 0}
	switch catalystKey {
	case "quality_dust":
		base = RarityChances{"Comum": .45, "Incomum": .35, "Raro": .17, "Épico": .03, "Lendário": 0}
	case "prismatic_core":
		base = RarityChances{"Comum": .15, "Incomum": .35, "Raro": .35, "Épico": .13, "Lendário": .02}
	}
	minRank := rarityRank(recipe.MinimumRarity)
	maxRank := rarityRank(recipe.MaximumRarity)
	if recipe.MinimumRarity == "" {
		minRank = rarityRank("Comum")
	}
	if recipe.MaximumRarity == "" {
		maxRank = rarityRank("Lendário")
	}
	clamped := RarityChances{"Comum": 0, "Incomum": 0, "Raro": 0, "Épico": 0, "Lendário": 0}
	for rarity, chance := range base {
		rank := rarityRank(rarity)
		if rank < minRank {
			rank = minRank
		}
		if rank > maxRank {
			rank = maxRank
		}
		clamped[rarityOrder[rank]] += chance
	}
	professionBonus := math.Min(.10, math.Max(0, float64(professionLevel-recipe.RequiredProfessionLevel)*.0025))
	stationBonus := math.Min(.05, math.Max(0, float64(stationLevel)*.015))
	promoteRarityChance(clamped, professionBonus+stationBonus, maxRank)
	return clamped
}

func promoteRarityChance(chances RarityChances, points float64, maxRank int) {
	for rank := 0; rank < maxRank && points > 0.0000001; rank++ {
		from := rarityOrder[rank]
		to := rarityOrder[rank+1]
		moved := math.Min(chances[from], points)
		chances[from] -= moved
		chances[to] += moved
		points -= moved
	}
}

func RollCraftRarity(recipe RecipeDefinition, catalystKey string, professionLevel, stationLevel int, rng *rand.Rand) string {
	chances := CraftRarityDistributionWithModifiers(recipe, catalystKey, professionLevel, stationLevel)
	roll := rng.Float64()
	cursor := 0.0
	for _, rarity := range []string{"Comum", "Incomum", "Raro", "Épico", "Lendário"} {
		cursor += chances[rarity]
		if roll <= cursor {
			return rarity
		}
	}
	return recipe.MinimumRarity
}

func GenerateCraftedItem(recipe RecipeDefinition, catalystKey string, seed int64, professionLevel, stationLevel int) (*Item, string, error) {
	if recipe.Kind != RecipeKindEquipment {
		return nil, "", fmt.Errorf("receita %s não produz equipamento", recipe.Key)
	}
	if seed == 0 {
		return nil, "", fmt.Errorf("seed do servidor ausente para a receita %s", recipe.Key)
	}
	rng := rand.New(rand.NewSource(seed))
	rarity := RollCraftRarity(recipe, catalystKey, professionLevel, stationLevel, rng)
	item := GenerateItemFromTemplate(recipe.OutputTemplateKey, rarity, rng)
	if item == nil {
		return nil, "", fmt.Errorf("template de saída inexistente: %s", recipe.OutputTemplateKey)
	}
	item.Source = ItemSourceCrafted
	item.SpecialEffect = mergeCraftOrigin(item.SpecialEffect, recipe.Key)
	return item, rarity, nil
}

func mergeCraftOrigin(current, recipeKey string) string {
	if current == "" {
		return "Origem: Craft | Receita: " + recipeKey
	}
	return current + " | Origem: Craft | Receita: " + recipeKey
}

func CatalystCost(catalystKey string) int64 {
	switch catalystKey {
	case "quality_dust", "prismatic_core":
		return 1
	default:
		return 0
	}
}
