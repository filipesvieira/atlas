package game

import (
	"fmt"
	"sort"
)

type RecipeKind string

const (
	RecipeKindEquipment  RecipeKind = "equipment"
	RecipeKindProcessing RecipeKind = "processing"
)

type RecipeDefinition struct {
	Key                     string           `json:"key"`
	Name                    string           `json:"name"`
	Description             string           `json:"description"`
	Kind                    RecipeKind       `json:"kind"`
	OutputTemplateKey       string           `json:"output_template_key,omitempty"`
	OutputResourceKey       string           `json:"output_resource_key,omitempty"`
	OutputQuantity          int64            `json:"output_quantity,omitempty"`
	ProfessionKey           string           `json:"profession_key"`
	RequiredProfessionLevel int              `json:"required_profession_level"`
	Tier                    int              `json:"tier"`
	StationKey              string           `json:"station_key,omitempty"`
	RequiredStationLevel    int              `json:"required_station_level,omitempty"`
	Ingredients             []ResourceAmount `json:"ingredients"`
	GoldCost                int64            `json:"gold_cost"`
	CraftSeconds            int64            `json:"craft_seconds"`
	MinimumRarity           string           `json:"minimum_rarity,omitempty"`
	MaximumRarity           string           `json:"maximum_rarity,omitempty"`
	DefaultUnlocked         bool             `json:"default_unlocked"`
	UnlockTrophyKey         string           `json:"unlock_trophy_key,omitempty"`
	ContentVersion          int              `json:"content_version"`
	SlotType                string           `json:"slot_type,omitempty"`
	WeaponType              string           `json:"weapon_type,omitempty"`
	Hands                   int              `json:"hands,omitempty"`
	RequiredLevel           int              `json:"required_level,omitempty"`
	BaseAtk                 int              `json:"base_atk,omitempty"`
	BaseMagic               int              `json:"base_magic,omitempty"`
	BaseDef                 int              `json:"base_def,omitempty"`
	BaseWeight              float64          `json:"base_weight,omitempty"`
	BaseSTR                 int              `json:"base_str,omitempty"`
	BaseDEX                 int              `json:"base_dex,omitempty"`
	BaseINT                 int              `json:"base_int,omitempty"`
	BaseHP                  int              `json:"base_hp,omitempty"`
	BaseMP                  int              `json:"base_mp,omitempty"`
	CritChance              float64          `json:"crit_chance,omitempty"`
	Lifesteal               float64          `json:"lifesteal,omitempty"`
	ManaRegen               int              `json:"mana_regen,omitempty"`
}

var RecipeRegistry = buildRecipeRegistry()

func buildRecipeRegistry() map[string]RecipeDefinition {
	registry := map[string]RecipeDefinition{
		"process_treated_plank":  {Key: "process_treated_plank", Name: "Serrar Tábuas Tratadas", Description: "Transforma troncos e resina em tábuas para equipamentos.", Kind: RecipeKindProcessing, OutputResourceKey: "treated_plank", OutputQuantity: 2, ProfessionKey: "woodworker", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "wood", Quantity: 4}, {Key: "resin", Quantity: 1}}, GoldCost: 20, CraftSeconds: 20, DefaultUnlocked: true, ContentVersion: 1},
		"process_iron_ingot":     {Key: "process_iron_ingot", Name: "Fundir Lingotes de Ferro", Description: "Funde minério e carvão em lingotes.", Kind: RecipeKindProcessing, OutputResourceKey: "iron_ingot", OutputQuantity: 2, ProfessionKey: "blacksmith", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "iron", Quantity: 4}, {Key: "coal", Quantity: 1}}, GoldCost: 25, CraftSeconds: 25, DefaultUnlocked: true, ContentVersion: 1},
		"process_woven_cloth":    {Key: "process_woven_cloth", Name: "Trançar Tecido", Description: "Transforma fibras em tecido resistente.", Kind: RecipeKindProcessing, OutputResourceKey: "woven_cloth", OutputQuantity: 2, ProfessionKey: "tailor", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "fiber", Quantity: 5}}, GoldCost: 15, CraftSeconds: 20, DefaultUnlocked: true, ContentVersion: 1},
		"process_tanned_leather": {Key: "process_tanned_leather", Name: "Curtir Couro", Description: "Prepara couro cru com resina natural.", Kind: RecipeKindProcessing, OutputResourceKey: "tanned_leather", OutputQuantity: 2, ProfessionKey: "leatherworker", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "raw_hide", Quantity: 4}, {Key: "resin", Quantity: 1}}, GoldCost: 20, CraftSeconds: 25, DefaultUnlocked: true, ContentVersion: 1},
		"process_flour":          {Key: "process_flour", Name: "Moer Farinha", Description: "Transforma trigo em farinha.", Kind: RecipeKindProcessing, OutputResourceKey: "flour", OutputQuantity: 3, ProfessionKey: "farmer", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "wheat", Quantity: 5}}, GoldCost: 10, CraftSeconds: 15, DefaultUnlocked: true, ContentVersion: 1},
		"recycle_metal_scrap":    {Key: "recycle_metal_scrap", Name: "Reciclar Sucata Metálica", Description: "Recupera um lingote sem substituir a mineração necessária para novos crafts.", Kind: RecipeKindProcessing, OutputResourceKey: "iron_ingot", OutputQuantity: 1, ProfessionKey: "blacksmith", RequiredProfessionLevel: 3, Tier: 1, Ingredients: []ResourceAmount{{Key: "metal_scrap", Quantity: 6}, {Key: "coal", Quantity: 1}}, GoldCost: 45, CraftSeconds: 30, DefaultUnlocked: true, ContentVersion: 1},
		"recycle_cloth_scrap":    {Key: "recycle_cloth_scrap", Name: "Reaproveitar Retalhos", Description: "Recompõe tecido a partir de retalhos e uma pequena quantidade de fibra nova.", Kind: RecipeKindProcessing, OutputResourceKey: "woven_cloth", OutputQuantity: 1, ProfessionKey: "tailor", RequiredProfessionLevel: 3, Tier: 1, Ingredients: []ResourceAmount{{Key: "cloth_scrap", Quantity: 6}, {Key: "fiber", Quantity: 1}}, GoldCost: 35, CraftSeconds: 25, DefaultUnlocked: true, ContentVersion: 1},
		"refine_arcane_scrap":    {Key: "refine_arcane_scrap", Name: "Refinar Resíduo Arcano", Description: "Estabiliza resíduos mágicos em essência para construções e encantamentos.", Kind: RecipeKindProcessing, OutputResourceKey: "arcane_essence", OutputQuantity: 1, ProfessionKey: "alchemist", RequiredProfessionLevel: 5, Tier: 2, Ingredients: []ResourceAmount{{Key: "arcane_scrap", Quantity: 8}, {Key: "herbs", Quantity: 2}}, GoldCost: 90, CraftSeconds: 45, DefaultUnlocked: true, ContentVersion: 1},
		"refine_black_soul":      {Key: "refine_black_soul", Name: "Purificar Emblema Negro", Description: "Purifica a essência do chefe pirata em pó de qualidade para catalisadores.", Kind: RecipeKindProcessing, OutputResourceKey: "quality_dust", OutputQuantity: 1, ProfessionKey: "alchemist", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "part_black_soul_emblem", Quantity: 1}, {Key: "fiber", Quantity: 2}}, GoldCost: 50, CraftSeconds: 30, DefaultUnlocked: true, ContentVersion: 1},
	}

	tierPartCursor := map[int]int{}
	for _, template := range ItemRegistry.List() {
		if template.ItemKind == ItemKindSkillBook || template.ItemKind == ItemKindConstructionManual || template.ItemKind == ItemKindQuest || template.Slot == SlotSkillBook || template.Slot == SlotManual {
			continue
		}
		tier := template.Tier
		if tier < 1 {
			tier = 1
		}
		profession := professionForTemplate(template)
		part := monsterPartForTemplate(template, tierPartCursor[tier])
		tierPartCursor[tier]++
		ingredients := ingredientsForTemplate(template, part)
		minRarity, maxRarity := rarityBoundsForTier(tier)
		key := "craft_" + template.Key
		registry[key] = RecipeDefinition{
			Key: key, Name: "Forjar: " + template.Name, Description: "Produz " + template.Name + " combinando recursos profissionais e partes de monstros.",
			Kind: RecipeKindEquipment, OutputTemplateKey: template.Key, ProfessionKey: profession,
			RequiredProfessionLevel: 1 + (tier-1)*8, Tier: tier, StationKey: stationForTier(tier), RequiredStationLevel: stationLevelForTier(tier),
			Ingredients: ingredients, GoldCost: int64(150 * tier * tier), CraftSeconds: int64(30 * tier),
			MinimumRarity: minRarity, MaximumRarity: maxRarity, DefaultUnlocked: tier == 1,
			UnlockTrophyKey: trophyForTier(tier), ContentVersion: 1,
			SlotType:      string(template.Slot),
			WeaponType:    string(template.WeaponType),
			Hands:         template.Hands,
			RequiredLevel: template.RequiredLevel,
			BaseAtk:       template.BaseAtk,
			BaseMagic:     template.BaseMagic,
			BaseDef:       template.BaseDef,
			BaseWeight:    template.BaseWeight,
			BaseSTR:       template.BaseSTR,
			BaseDEX:       template.BaseDEX,
			BaseINT:       template.BaseINT,
			BaseHP:        template.BaseHP,
			BaseMP:        template.BaseMP,
			CritChance:    template.CritChance,
			Lifesteal:     template.Lifesteal,
			ManaRegen:     template.ManaRegen,
		}
	}
	return registry
}

func professionForTemplate(template LootTemplate) string {
	switch template.Slot {
	case SlotMainHand, SlotOffHand:
		if template.WeaponType == WeaponTypeBow || template.WeaponType == WeaponTypeWand {
			return "woodworker"
		}
		return "blacksmith"
	case SlotAmmo:
		return "woodworker"
	case SlotRing, SlotNecklace:
		return "jeweler"
	case SlotHead, SlotChest, SlotLegs:
		return "tailor"
	case SlotBoots, SlotBag:
		return "leatherworker"
	default:
		return "blacksmith"
	}
}

func ingredientsForTemplate(template LootTemplate, monsterPart string) []ResourceAmount {
	tier := template.Tier
	if tier < 1 {
		tier = 1
	}
	base := int64(2 + tier*2)
	switch template.Slot {
	case SlotMainHand, SlotOffHand, SlotAmmo:
		return []ResourceAmount{{Key: "iron_ingot", Quantity: base}, {Key: "treated_plank", Quantity: int64(tier + 1)}, {Key: monsterPart, Quantity: int64(tier)}}
	case SlotChest, SlotLegs, SlotBoots, SlotBag:
		return []ResourceAmount{{Key: "tanned_leather", Quantity: base}, {Key: "woven_cloth", Quantity: int64(tier + 2)}, {Key: monsterPart, Quantity: int64(tier)}}
	default:
		return []ResourceAmount{{Key: "woven_cloth", Quantity: int64(tier + 2)}, {Key: "fish_scale", Quantity: int64(tier + 1)}, {Key: monsterPart, Quantity: int64(tier)}}
	}
}

// monsterPartForTemplate garante que itens iniciais do Tier 1 utilizem materiais
// disponíveis na primeira região (Floresta dos Goblins), evitando que o jogador fique
// bloqueado por exigir drops de chefes ou regiões secretas no começo do jogo.
func monsterPartForTemplate(template LootTemplate, cursor int) string {
	tier := template.Tier
	if tier < 1 {
		tier = 1
	}
	if tier == 1 {
		switch template.Key {
		case "espada_do_aprendiz":
			return "part_goblin_ear"
		case "varinha_do_aprendiz":
			return "part_spider_silk"
		case "arco_curvo":
			return "part_wolf_fang"
		case "capacete_de_couro":
			return "part_wolf_fang"
		case "tunica_de_couro":
			return "part_goblin_ear"
		case "calca_de_tecido":
			return "part_spider_silk"
		case "sandalias_ageis":
			return "part_wolf_fang"
		case "broquel_de_madeira":
			return "part_goblin_ear"
		case "montante_de_madeira":
			return "part_bear_claw"
		case "machadinha_de_madeira":
			return "part_ogre_wart"
		case "clava_de_madeira":
			return "part_donkey_tooth"
		case "pequena_bolsa":
			return "part_fiona_tiara_shard"
		case "flechas_de_madeira":
			return "part_pirate_hook"
		case "amuleto_do_lobo":
			return "part_tripa_belt"
		case "anel_de_cobre":
			return "part_bandit_mask"
		}
	}
	parts := monsterPartsForTier(tier)
	return parts[cursor%len(parts)]
}

// monsterPartsForTier distribui todas as 39 partes temáticas entre as receitas
// do mesmo tier. Nenhum recurso de monstro existe apenas para lotar o depósito.
func monsterPartsForTier(tier int) []string {
	switch tier {
	case 1:
		return []string{"part_goblin_ear", "part_wolf_fang", "part_spider_silk", "part_bear_claw", "part_ogre_wart", "part_donkey_tooth", "part_fiona_tiara_shard", "part_pirate_hook", "part_tripa_belt", "part_bandit_mask", "part_black_soul_emblem"}
	case 2:
		return []string{"part_orc_tusk", "part_orc_rune", "part_skeleton_bone", "part_orc_bowstring", "part_berserker_buckle", "part_ninja_cloth", "part_rat_tongue", "part_destroyer_blade", "part_militant_shirt", "part_patriot_flag", "part_riot_plate", "part_xandaum_pen"}
	case 3:
		return []string{"part_dementor_cloth", "part_troll_hide", "part_dark_wand"}
	case 4:
		return []string{"part_frozen_soul", "part_zombie_frost", "part_golem_core", "part_chimera_horn", "part_sanctuary_crown"}
	default:
		return []string{"part_dragon_scale", "part_demon_horn", "part_vampire_fang", "part_necromancer_rune", "part_scorpion_stinger", "part_flame_heart", "part_avenger_horn"}
	}
}

func trophyForTier(tier int) string {
	switch tier {
	case 2:
		return "trophy_forest_bear"
	case 3:
		return "trophy_orcruins_skeleton"
	case 4:
		return "trophy_rogartes_darkmage"
	case 5:
		return "trophy_frozen_master"
	default:
		return ""
	}
}

func stationForTier(tier int) string {
	if tier <= 1 {
		return "campfire"
	}
	return "workbench"
}

func stationLevelForTier(tier int) int {
	if tier <= 1 {
		return 0
	}
	if tier >= 4 {
		return 3
	}
	return tier - 1
}

func rarityBoundsForTier(tier int) (string, string) {
	switch tier {
	case 1:
		return "Comum", "Raro"
	case 2:
		return "Comum", "Épico"
	case 3:
		return "Incomum", "Épico"
	default:
		return "Raro", "Lendário"
	}
}

func GetRecipeDefinition(key string) (RecipeDefinition, bool) {
	definition, exists := RecipeRegistry[key]
	return definition, exists
}

func ListRecipeDefinitions() []RecipeDefinition {
	result := make([]RecipeDefinition, 0, len(RecipeRegistry))
	for _, definition := range RecipeRegistry {
		result = append(result, definition)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Tier == result[j].Tier {
			return result[i].Name < result[j].Name
		}
		return result[i].Tier < result[j].Tier
	})
	return result
}

func ValidateRecipeRegistry() error {
	coveredEquipment := make(map[string]bool)
	usedMonsterParts := make(map[string]bool)
	for key, recipe := range RecipeRegistry {
		if recipe.Key != key || recipe.Name == "" || recipe.Tier < 1 || recipe.GoldCost < 0 || recipe.ContentVersion < 1 || len(recipe.Ingredients) == 0 {
			return fmt.Errorf("receita inválida: %s", key)
		}
		if _, exists := GetProfessionDefinition(recipe.ProfessionKey); !exists {
			return fmt.Errorf("receita %s usa profissão inexistente %s", key, recipe.ProfessionKey)
		}
		if recipe.Kind == RecipeKindEquipment {
			if _, exists := ItemRegistry.Get(recipe.OutputTemplateKey); !exists {
				return fmt.Errorf("receita %s produz item inexistente %s", key, recipe.OutputTemplateKey)
			}
			if rarityRank(recipe.MinimumRarity) > rarityRank(recipe.MaximumRarity) {
				return fmt.Errorf("receita %s possui limites de raridade invertidos", key)
			}
			coveredEquipment[recipe.OutputTemplateKey] = true
		} else if _, exists := GetResourceDefinition(recipe.OutputResourceKey); !exists {
			return fmt.Errorf("receita %s produz recurso inexistente %s", key, recipe.OutputResourceKey)
		}
		for _, ingredient := range recipe.Ingredients {
			if ingredient.Quantity <= 0 {
				return fmt.Errorf("receita %s possui quantidade inválida", key)
			}
			if _, exists := GetResourceDefinition(ingredient.Key); !exists {
				return fmt.Errorf("receita %s usa recurso inexistente %s", key, ingredient.Key)
			}
			if resource, _ := GetResourceDefinition(ingredient.Key); resource.Category == ResourceCategoryMonsterPart {
				usedMonsterParts[ingredient.Key] = true
			}
		}
	}
	for _, template := range ItemRegistry.List() {
		if template.ItemKind == ItemKindSkillBook || template.ItemKind == ItemKindConstructionManual || template.ItemKind == ItemKindQuest || template.Slot == SlotSkillBook || template.Slot == SlotManual {
			continue
		}
		if !coveredEquipment[template.Key] {
			return fmt.Errorf("equipamento genérico %s ficou sem receita equivalente", template.Key)
		}
	}
	for monsterKey, partKey := range MonsterPartByMonster {
		if !usedMonsterParts[partKey] {
			return fmt.Errorf("material %s do monstro %s ficou sem uso em receita", partKey, monsterKey)
		}
	}
	return nil
}
