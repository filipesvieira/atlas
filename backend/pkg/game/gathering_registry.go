package game

import (
	"fmt"
	"sort"
)

type GatheringRewardDefinition struct {
	ResourceKey string  `json:"resource_key"`
	Chance      float64 `json:"chance"`
	MinQuantity int64   `json:"min_quantity"`
	MaxQuantity int64   `json:"max_quantity"`
}

type GatheringNodeDefinition struct {
	Key              string                      `json:"key"`
	Name             string                      `json:"name"`
	Weight           int                         `json:"weight"`
	CycleSeconds     int64                       `json:"cycle_seconds"`
	ProfessionXP     int64                       `json:"profession_xp"`
	RequiredToolTier int                         `json:"required_tool_tier"`
	Rewards          []GatheringRewardDefinition `json:"rewards"`
}

type GatheringExpeditionDefinition struct {
	Key                     string                    `json:"key"`
	DisplayName             string                    `json:"display_name"`
	AreaName                string                    `json:"area_name,omitempty"`
	Icon                    string                    `json:"icon"`
	Description             string                    `json:"description"`
	BiomeKey                string                    `json:"biome_key"`
	ProfessionKey           string                    `json:"profession_key"`
	RequiredProfessionLevel int                       `json:"required_profession_level"`
	Tier                    int                       `json:"tier"`
	AllowedDurations        []int64                   `json:"allowed_durations"`
	Nodes                   []GatheringNodeDefinition `json:"nodes"`
	ContentVersion          int                       `json:"content_version"`
	PlayerSelectable        bool                      `json:"player_selectable"`
}

// O turno de 3 minutos entrega feedback imediato no onboarding. Os turnos
// longos permanecem como opção eficiente para a progressão idle/offline.
var standardGatheringDurations = []int64{180, 900, 3600, 14400, 28800}

var legacyGatheringExpeditionRegistry = map[string]GatheringExpeditionDefinition{
	"suspicious_logs":       {Key: "suspicious_logs", DisplayName: "Bosque dos Troncos Suspeitos", Icon: "🌲", Description: "Árvores tortas, resina pegajosa e nenhum goblin fingindo ser lenhador.", BiomeKey: "forest", ProfessionKey: "lumberjack", RequiredProfessionLevel: 1, Tier: 1, AllowedDurations: standardGatheringDurations, ContentVersion: 1, Nodes: []GatheringNodeDefinition{{Key: "young_oaks", Name: "Carvalhos Jovens", Weight: 75, CycleSeconds: 75, ProfessionXP: 12, Rewards: []GatheringRewardDefinition{{ResourceKey: "wood", Chance: 1, MinQuantity: 2, MaxQuantity: 4}, {ResourceKey: "resin", Chance: .28, MinQuantity: 1, MaxQuantity: 2}}}, {Key: "seed_clearing", Name: "Clareira de Sementes", Weight: 25, CycleSeconds: 90, ProfessionXP: 15, Rewards: []GatheringRewardDefinition{{ResourceKey: "wood", Chance: 1, MinQuantity: 2, MaxQuantity: 3}, {ResourceKey: "seeds", Chance: .45, MinQuantity: 1, MaxQuantity: 2}}}}},
	"lonely_pickaxe":        {Key: "lonely_pickaxe", DisplayName: "Pedreira da Picareta Solitária", Icon: "⛏️", Description: "Pedras, cobre e a certeza de que a picareta fará hora extra.", BiomeKey: "orcruins", ProfessionKey: "miner", RequiredProfessionLevel: 1, Tier: 1, AllowedDurations: standardGatheringDurations, ContentVersion: 1, Nodes: []GatheringNodeDefinition{{Key: "surface_vein", Name: "Veio Superficial", Weight: 70, CycleSeconds: 90, ProfessionXP: 14, Rewards: []GatheringRewardDefinition{{ResourceKey: "stone", Chance: 1, MinQuantity: 2, MaxQuantity: 5}, {ResourceKey: "copper_ore", Chance: .42, MinQuantity: 1, MaxQuantity: 2}}}, {Key: "iron_crack", Name: "Fenda Ferruginosa", Weight: 30, CycleSeconds: 120, ProfessionXP: 20, Rewards: []GatheringRewardDefinition{{ResourceKey: "iron", Chance: .65, MinQuantity: 1, MaxQuantity: 2}, {ResourceKey: "coal", Chance: .55, MinQuantity: 1, MaxQuantity: 2}}}}},
	"judging_fish":          {Key: "judging_fish", DisplayName: "Lago do Peixe que Julga", Icon: "🎣", Description: "Os peixes encaram suas escolhas enquanto mordem a isca.", BiomeKey: "sea", ProfessionKey: "fisher", RequiredProfessionLevel: 1, Tier: 1, AllowedDurations: standardGatheringDurations, ContentVersion: 1, Nodes: []GatheringNodeDefinition{{Key: "calm_shore", Name: "Margem Calma", Weight: 80, CycleSeconds: 80, ProfessionXP: 13, Rewards: []GatheringRewardDefinition{{ResourceKey: "raw_fish", Chance: 1, MinQuantity: 2, MaxQuantity: 4}}}, {Key: "shimmering_water", Name: "Água Cintilante", Weight: 20, CycleSeconds: 115, ProfessionXP: 18, Rewards: []GatheringRewardDefinition{{ResourceKey: "raw_fish", Chance: 1, MinQuantity: 2, MaxQuantity: 3}, {ResourceKey: "fish_scale", Chance: .38, MinQuantity: 1, MaxQuantity: 2}}}}},
	"eternal_bills_farm":    {Key: "eternal_bills_farm", DisplayName: "Roça dos Boletos Eternos", Icon: "🚜", Description: "O trigo cresce, a fatura também, e a colheita nunca tira férias.", BiomeKey: "forest", ProfessionKey: "farmer", RequiredProfessionLevel: 1, Tier: 1, AllowedDurations: standardGatheringDurations, ContentVersion: 1, Nodes: []GatheringNodeDefinition{{Key: "wheat_field", Name: "Plantação de Trigo", Weight: 70, CycleSeconds: 85, ProfessionXP: 13, Rewards: []GatheringRewardDefinition{{ResourceKey: "wheat", Chance: 1, MinQuantity: 2, MaxQuantity: 5}, {ResourceKey: "seeds", Chance: .35, MinQuantity: 1, MaxQuantity: 2}}}, {Key: "fiber_patch", Name: "Canteiro de Fibras", Weight: 30, CycleSeconds: 95, ProfessionXP: 15, Rewards: []GatheringRewardDefinition{{ResourceKey: "fiber", Chance: 1, MinQuantity: 2, MaxQuantity: 4}, {ResourceKey: "herbs", Chance: .22, MinQuantity: 1, MaxQuantity: 1}}}}},
	"mysterious_meat_trail": {Key: "mysterious_meat_trail", DisplayName: "Trilha da Carne Misteriosa", Icon: "🐾", Description: "Rastreie animais comuns. O nome da trilha é marketing, esperamos.", BiomeKey: "forest", ProfessionKey: "tracker", RequiredProfessionLevel: 1, Tier: 1, AllowedDurations: standardGatheringDurations, ContentVersion: 1, Nodes: []GatheringNodeDefinition{{Key: "deer_tracks", Name: "Pegadas de Cervos", Weight: 75, CycleSeconds: 105, ProfessionXP: 17, Rewards: []GatheringRewardDefinition{{ResourceKey: "raw_meat", Chance: 1, MinQuantity: 2, MaxQuantity: 4}, {ResourceKey: "raw_hide", Chance: .58, MinQuantity: 1, MaxQuantity: 2}}}, {Key: "bone_clearing", Name: "Clareira dos Ossos", Weight: 25, CycleSeconds: 125, ProfessionXP: 20, Rewards: []GatheringRewardDefinition{{ResourceKey: "animal_bone", Chance: 1, MinQuantity: 2, MaxQuantity: 4}, {ResourceKey: "raw_hide", Chance: .45, MinQuantity: 1, MaxQuantity: 2}, {ResourceKey: "raw_meat", Chance: .25, MinQuantity: 1, MaxQuantity: 2}}}}},
	"whispering_herbs":      {Key: "whispering_herbs", DisplayName: "Jardim das Ervas Fofoqueiras", Icon: "🌿", Description: "Plantas raras contam segredos; nenhuma confirma a fonte.", BiomeKey: "swamp", ProfessionKey: "herbalist", RequiredProfessionLevel: 1, Tier: 1, AllowedDurations: standardGatheringDurations, ContentVersion: 1, Nodes: []GatheringNodeDefinition{{Key: "common_bed", Name: "Canteiro Comum", Weight: 80, CycleSeconds: 90, ProfessionXP: 14, Rewards: []GatheringRewardDefinition{{ResourceKey: "herbs", Chance: 1, MinQuantity: 2, MaxQuantity: 4}}}, {Key: "arcane_blossom", Name: "Flor Arcana", Weight: 20, CycleSeconds: 140, ProfessionXP: 24, Rewards: []GatheringRewardDefinition{{ResourceKey: "herbs", Chance: 1, MinQuantity: 2, MaxQuantity: 3}, {ResourceKey: "arcane_blossom", Chance: .18, MinQuantity: 1, MaxQuantity: 1}}}}},
}

// selectableGatheringRoute transforma uma frente concreta em um destino que o
// jogador pode escolher. As expedições genéricas anteriores permanecem no
// registro apenas para concluir snapshots já iniciados antes desta mudança.
// Rotas futuras podem manter vários nós para variações internas, sem voltar a
// misturar destinos de recursos diferentes na mesma escolha do jogador.
func selectableGatheringRoute(parent GatheringExpeditionDefinition, node GatheringNodeDefinition) GatheringExpeditionDefinition {
	routeNode := node
	routeNode.Weight = 1
	return GatheringExpeditionDefinition{
		Key:                     "route_" + parent.Key + "_" + node.Key,
		DisplayName:             node.Name,
		AreaName:                parent.DisplayName,
		Icon:                    parent.Icon,
		Description:             "Destino de coleta escolhido. As quantidades e recursos adicionais variam a cada ciclo.",
		BiomeKey:                parent.BiomeKey,
		ProfessionKey:           parent.ProfessionKey,
		RequiredProfessionLevel: parent.RequiredProfessionLevel,
		Tier:                    parent.Tier,
		AllowedDurations:        append([]int64(nil), parent.AllowedDurations...),
		Nodes:                   []GatheringNodeDefinition{routeNode},
		ContentVersion:          parent.ContentVersion,
		PlayerSelectable:        true,
	}
}

func buildGatheringExpeditionRegistry() map[string]GatheringExpeditionDefinition {
	registry := make(map[string]GatheringExpeditionDefinition, len(legacyGatheringExpeditionRegistry)*3)
	for key, expedition := range legacyGatheringExpeditionRegistry {
		registry[key] = expedition
		for _, node := range expedition.Nodes {
			route := selectableGatheringRoute(expedition, node)
			registry[route.Key] = route
		}
	}
	return registry
}

var GatheringExpeditionRegistry = buildGatheringExpeditionRegistry()

func GetGatheringExpedition(key string) (GatheringExpeditionDefinition, bool) {
	definition, exists := GatheringExpeditionRegistry[key]
	return definition, exists
}

func ListGatheringExpeditions() []GatheringExpeditionDefinition {
	result := make([]GatheringExpeditionDefinition, 0, len(GatheringExpeditionRegistry))
	for _, definition := range GatheringExpeditionRegistry {
		result = append(result, definition)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Key < result[j].Key })
	return result
}

func IsGatheringDurationAllowed(definition GatheringExpeditionDefinition, seconds int64) bool {
	for _, allowed := range definition.AllowedDurations {
		if allowed == seconds {
			return true
		}
	}
	return false
}

func CloneGatheringExpedition(definition GatheringExpeditionDefinition) GatheringExpeditionDefinition {
	clone := definition
	clone.AllowedDurations = append([]int64(nil), definition.AllowedDurations...)
	clone.Nodes = make([]GatheringNodeDefinition, len(definition.Nodes))
	for index, node := range definition.Nodes {
		clone.Nodes[index] = node
		clone.Nodes[index].Rewards = append([]GatheringRewardDefinition(nil), node.Rewards...)
	}
	return clone
}

func ValidateGatheringRegistry() error {
	for key, expedition := range GatheringExpeditionRegistry {
		if expedition.Key != key || expedition.DisplayName == "" || expedition.Tier < 1 || expedition.ContentVersion < 1 {
			return fmt.Errorf("expedição de coleta inválida: %s", key)
		}
		if _, exists := GetProfessionDefinition(expedition.ProfessionKey); !exists {
			return fmt.Errorf("expedição %s usa profissão inexistente %s", key, expedition.ProfessionKey)
		}
		if len(expedition.AllowedDurations) == 0 || len(expedition.Nodes) == 0 {
			return fmt.Errorf("expedição %s sem duração ou nós", key)
		}
		seenDurations := map[int64]bool{}
		for _, duration := range expedition.AllowedDurations {
			if duration <= 0 || seenDurations[duration] {
				return fmt.Errorf("expedição %s possui duração inválida ou duplicada: %d", key, duration)
			}
			seenDurations[duration] = true
		}
		weight := 0
		seenNodes := map[string]bool{}
		for _, node := range expedition.Nodes {
			weight += node.Weight
			if node.Key == "" || seenNodes[node.Key] || node.Weight <= 0 || node.CycleSeconds <= 0 || node.ProfessionXP <= 0 || node.RequiredToolTier < 0 || node.RequiredToolTier > expedition.Tier || len(node.Rewards) == 0 {
				return fmt.Errorf("nó inválido %s/%s", key, node.Key)
			}
			seenNodes[node.Key] = true
			for _, reward := range node.Rewards {
				resource, exists := GetResourceDefinition(reward.ResourceKey)
				if !exists || resource.Category != ResourceCategoryProfessionRaw {
					return fmt.Errorf("nó %s/%s referencia recurso não profissional %s", key, node.Key, reward.ResourceKey)
				}
				if reward.Chance < 0 || reward.Chance > 1 || reward.MinQuantity <= 0 || reward.MaxQuantity < reward.MinQuantity {
					return fmt.Errorf("recompensa inválida em %s/%s", key, node.Key)
				}
			}
		}
		if weight <= 0 {
			return fmt.Errorf("expedição %s sem peso de nós", key)
		}
	}
	return nil
}
