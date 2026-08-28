package game

import (
	"fmt"
	"sort"
)

type RecipeKind string

const (
	RecipeKindEquipment  RecipeKind = "equipment"
	RecipeKindProcessing RecipeKind = "processing"
	RecipeKindConsumable RecipeKind = "consumable"
)

type RecipeDefinition struct {
	Key                     string           `json:"key"`
	Name                    string           `json:"name"`
	Description             string           `json:"description"`
	Kind                    RecipeKind       `json:"kind"`
	OutputTemplateKey       string           `json:"output_template_key,omitempty"`
	VisualKey               string           `json:"visual_key,omitempty"`
	SetKey                  string           `json:"set_key,omitempty"`
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
	BaseMovementSpeedBonus  float64          `json:"base_movement_speed_bonus,omitempty"`
}

var RecipeRegistry = buildRecipeRegistry()

func buildRecipeRegistry() map[string]RecipeDefinition {
	registry := map[string]RecipeDefinition{
		"process_treated_plank":  {Key: "process_treated_plank", Name: "Serrar Tábuas Tratadas", Description: "Transforma troncos e resina em tábuas para equipamentos.", Kind: RecipeKindProcessing, OutputResourceKey: "treated_plank", OutputQuantity: 2, ProfessionKey: "woodworker", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "wood", Quantity: 4}, {Key: "resin", Quantity: 1}}, GoldCost: 20, CraftSeconds: 20, DefaultUnlocked: true, ContentVersion: 1},
		"process_iron_ingot":     {Key: "process_iron_ingot", Name: "Fundir Lingotes de Ferro", Description: "Funde minério e carvão em lingotes.", Kind: RecipeKindProcessing, OutputResourceKey: "iron_ingot", OutputQuantity: 2, ProfessionKey: "blacksmith", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "iron", Quantity: 4}, {Key: "coal", Quantity: 1}}, GoldCost: 25, CraftSeconds: 25, DefaultUnlocked: true, ContentVersion: 1},
		"process_copper_ingot":   {Key: "process_copper_ingot", Name: "Fundir Lingotes de Cobre", Description: "Funde minério de cobre e carvão em metal técnico para infraestrutura.", Kind: RecipeKindProcessing, OutputResourceKey: "copper_ingot", OutputQuantity: 2, ProfessionKey: "blacksmith", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "copper_ore", Quantity: 4}, {Key: "coal", Quantity: 1}}, GoldCost: 22, CraftSeconds: 25, DefaultUnlocked: true, ContentVersion: 1},
		"process_bone_meal":      {Key: "process_bone_meal", Name: "Triturar Farinha de Osso", Description: "Limpa e tritura ossos de caça em reagente alquímico.", Kind: RecipeKindProcessing, OutputResourceKey: "bone_meal", OutputQuantity: 2, ProfessionKey: "alchemist", RequiredProfessionLevel: 1, Tier: 1, StationKey: "alchemy_bench", RequiredStationLevel: 1, Ingredients: []ResourceAmount{{Key: "animal_bone", Quantity: 4}, {Key: "herbs", Quantity: 1}}, GoldCost: 18, CraftSeconds: 20, DefaultUnlocked: true, ContentVersion: 1},
		"process_woven_cloth":    {Key: "process_woven_cloth", Name: "Trançar Tecido", Description: "Transforma fibras em tecido resistente.", Kind: RecipeKindProcessing, OutputResourceKey: "woven_cloth", OutputQuantity: 2, ProfessionKey: "tailor", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "fiber", Quantity: 5}}, GoldCost: 15, CraftSeconds: 20, DefaultUnlocked: true, ContentVersion: 1},
		"process_tanned_leather": {Key: "process_tanned_leather", Name: "Curtir Couro", Description: "Prepara couro cru com resina natural.", Kind: RecipeKindProcessing, OutputResourceKey: "tanned_leather", OutputQuantity: 2, ProfessionKey: "leatherworker", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "raw_hide", Quantity: 4}, {Key: "resin", Quantity: 1}}, GoldCost: 20, CraftSeconds: 25, DefaultUnlocked: true, ContentVersion: 1},
		"process_flour":          {Key: "process_flour", Name: "Moer Farinha", Description: "Transforma trigo em farinha.", Kind: RecipeKindProcessing, OutputResourceKey: "flour", OutputQuantity: 3, ProfessionKey: "farmer", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "wheat", Quantity: 5}}, GoldCost: 10, CraftSeconds: 15, DefaultUnlocked: true, ContentVersion: 1},
		"recycle_metal_scrap":    {Key: "recycle_metal_scrap", Name: "Reciclar Sucata Metálica", Description: "Recupera um lingote sem substituir a mineração necessária para novos crafts.", Kind: RecipeKindProcessing, OutputResourceKey: "iron_ingot", OutputQuantity: 1, ProfessionKey: "blacksmith", RequiredProfessionLevel: 3, Tier: 1, Ingredients: []ResourceAmount{{Key: "metal_scrap", Quantity: 6}, {Key: "coal", Quantity: 1}}, GoldCost: 45, CraftSeconds: 30, DefaultUnlocked: true, ContentVersion: 1},
		"recycle_cloth_scrap":    {Key: "recycle_cloth_scrap", Name: "Reaproveitar Retalhos", Description: "Recompõe tecido a partir de retalhos e uma pequena quantidade de fibra nova.", Kind: RecipeKindProcessing, OutputResourceKey: "woven_cloth", OutputQuantity: 1, ProfessionKey: "tailor", RequiredProfessionLevel: 3, Tier: 1, Ingredients: []ResourceAmount{{Key: "cloth_scrap", Quantity: 6}, {Key: "fiber", Quantity: 1}}, GoldCost: 35, CraftSeconds: 25, DefaultUnlocked: true, ContentVersion: 1},
		"refine_arcane_scrap":    {Key: "refine_arcane_scrap", Name: "Refinar Resíduo Arcano", Description: "Converte 8 Pó Arcano Residual e 2 Ervas em 1 Essência Arcana. Use a essência para evoluir construções do Acampamento, especialmente a Fonte Arcana, e alcançar melhorias de alto nível.", Kind: RecipeKindProcessing, OutputResourceKey: "arcane_essence", OutputQuantity: 1, ProfessionKey: "alchemist", RequiredProfessionLevel: 5, Tier: 2, Ingredients: []ResourceAmount{{Key: "arcane_scrap", Quantity: 8}, {Key: "herbs", Quantity: 2}}, GoldCost: 90, CraftSeconds: 45, DefaultUnlocked: true, ContentVersion: 1},
		"refine_black_soul":      {Key: "refine_black_soul", Name: "Purificar Emblema Negro", Description: "Purifica a essência do chefe pirata em pó de qualidade para catalisadores.", Kind: RecipeKindProcessing, OutputResourceKey: "quality_dust", OutputQuantity: 1, ProfessionKey: "alchemist", RequiredProfessionLevel: 1, Tier: 1, Ingredients: []ResourceAmount{{Key: "part_black_soul_emblem", Quantity: 1}, {Key: "fiber", Quantity: 2}}, GoldCost: 50, CraftSeconds: 30, DefaultUnlocked: true, ContentVersion: 1},

		// Cozinha: refeições persistentes que transformam recursos comuns de coleta
		// em preparação de combate. O custo em ouro também funciona como gold sink.
		"cook_grilled_fish":    {Key: "cook_grilled_fish", Name: "Preparar Peixe Assado", Description: "Peixe fresco com ervas, leve e rápido para expedições curtas.", Kind: RecipeKindConsumable, OutputResourceKey: "grilled_fish", OutputQuantity: 1, ProfessionKey: "cook", RequiredProfessionLevel: 1, Tier: 1, StationKey: "kitchen", RequiredStationLevel: 1, Ingredients: []ResourceAmount{{Key: "raw_fish", Quantity: 2}, {Key: "herbs", Quantity: 1}}, GoldCost: 25, CraftSeconds: 30, DefaultUnlocked: true, ContentVersion: 1},
		"cook_hunter_skewer":   {Key: "cook_hunter_skewer", Name: "Preparar Espeto do Caçador", Description: "Carne temperada para aumentar o poder ofensivo durante uma caçada curta.", Kind: RecipeKindConsumable, OutputResourceKey: "hunter_skewer", OutputQuantity: 1, ProfessionKey: "cook", RequiredProfessionLevel: 1, Tier: 1, StationKey: "kitchen", RequiredStationLevel: 1, Ingredients: []ResourceAmount{{Key: "raw_meat", Quantity: 2}, {Key: "herbs", Quantity: 1}}, GoldCost: 30, CraftSeconds: 35, DefaultUnlocked: true, ContentVersion: 1},
		"cook_explorer_stew":   {Key: "cook_explorer_stew", Name: "Cozinhar Ensopado do Explorador", Description: "Refeição robusta para longas sessões de exploração e treinamento.", Kind: RecipeKindConsumable, OutputResourceKey: "explorer_stew", OutputQuantity: 1, ProfessionKey: "cook", RequiredProfessionLevel: 8, Tier: 2, StationKey: "kitchen", RequiredStationLevel: 2, Ingredients: []ResourceAmount{{Key: "raw_meat", Quantity: 3}, {Key: "raw_fish", Quantity: 2}, {Key: "herbs", Quantity: 3}, {Key: "flour", Quantity: 2}}, GoldCost: 120, CraftSeconds: 90, DefaultUnlocked: true, ContentVersion: 1},
		"cook_tracker_pie":     {Key: "cook_tracker_pie", Name: "Assar Torta do Rastreador", Description: "Torta densa de carne e ervas para manter o herói forte por várias horas.", Kind: RecipeKindConsumable, OutputResourceKey: "tracker_pie", OutputQuantity: 1, ProfessionKey: "cook", RequiredProfessionLevel: 8, Tier: 2, StationKey: "kitchen", RequiredStationLevel: 2, Ingredients: []ResourceAmount{{Key: "raw_meat", Quantity: 4}, {Key: "flour", Quantity: 4}, {Key: "herbs", Quantity: 2}}, GoldCost: 140, CraftSeconds: 100, DefaultUnlocked: true, ContentVersion: 1},
		"cook_arcane_banquet":  {Key: "cook_arcane_banquet", Name: "Servir Banquete Arcano", Description: "Banquete raro infundido com flor arcana para uma jornada de um dia inteiro.", Kind: RecipeKindConsumable, OutputResourceKey: "arcane_banquet", OutputQuantity: 1, ProfessionKey: "cook", RequiredProfessionLevel: 18, Tier: 3, StationKey: "kitchen", RequiredStationLevel: 3, Ingredients: []ResourceAmount{{Key: "raw_fish", Quantity: 6}, {Key: "raw_meat", Quantity: 4}, {Key: "flour", Quantity: 8}, {Key: "herbs", Quantity: 8}, {Key: "arcane_blossom", Quantity: 2}}, GoldCost: 650, CraftSeconds: 300, DefaultUnlocked: true, ContentVersion: 1},
		"cook_warrior_banquet": {Key: "cook_warrior_banquet", Name: "Servir Banquete do Guerreiro", Description: "Mesa farta para preparar o herói para combates difíceis durante um dia inteiro.", Kind: RecipeKindConsumable, OutputResourceKey: "warrior_banquet", OutputQuantity: 1, ProfessionKey: "cook", RequiredProfessionLevel: 18, Tier: 3, StationKey: "kitchen", RequiredStationLevel: 3, Ingredients: []ResourceAmount{{Key: "raw_meat", Quantity: 10}, {Key: "flour", Quantity: 6}, {Key: "herbs", Quantity: 6}, {Key: "arcane_blossom", Quantity: 1}}, GoldCost: 700, CraftSeconds: 300, DefaultUnlocked: true, ContentVersion: 1},

		// Alquimia: poções iniciais usam recursos comuns e ocupam uma categoria
		// própria de buff, permitindo uma refeição e uma poção ativas ao mesmo tempo.
		"alchemy_minor_strength": {Key: "alchemy_minor_strength", Name: "Destilar Tônico de Força", Description: "Tônico simples que aumenta o poder de ataque por uma expedição curta.", Kind: RecipeKindConsumable, OutputResourceKey: "minor_strength_elixir", OutputQuantity: 1, ProfessionKey: "alchemist", RequiredProfessionLevel: 1, Tier: 1, StationKey: "alchemy_bench", RequiredStationLevel: 1, Ingredients: []ResourceAmount{{Key: "herbs", Quantity: 2}, {Key: "seeds", Quantity: 1}, {Key: "bone_meal", Quantity: 1}}, GoldCost: 25, CraftSeconds: 35, DefaultUnlocked: true, ContentVersion: 1},
		"alchemy_focus_tonic":    {Key: "alchemy_focus_tonic", Name: "Preparar Tônico de Foco", Description: "Infusão de ervas que melhora o aprendizado em combate por uma expedição curta.", Kind: RecipeKindConsumable, OutputResourceKey: "focus_tonic", OutputQuantity: 1, ProfessionKey: "alchemist", RequiredProfessionLevel: 1, Tier: 1, StationKey: "alchemy_bench", RequiredStationLevel: 1, Ingredients: []ResourceAmount{{Key: "herbs", Quantity: 2}, {Key: "raw_fish", Quantity: 1}}, GoldCost: 25, CraftSeconds: 35, DefaultUnlocked: true, ContentVersion: 1},
		"alchemy_arcane_draught": {Key: "alchemy_arcane_draught", Name: "Destilar Elixir Arcano", Description: "Elixir intermediário para expedições longas, exigindo resíduo arcano refinado.", Kind: RecipeKindConsumable, OutputResourceKey: "arcane_draught", OutputQuantity: 1, ProfessionKey: "alchemist", RequiredProfessionLevel: 8, Tier: 2, StationKey: "alchemy_bench", RequiredStationLevel: 2, Ingredients: []ResourceAmount{{Key: "herbs", Quantity: 4}, {Key: "arcane_scrap", Quantity: 2}, {Key: "seeds", Quantity: 2}}, GoldCost: 140, CraftSeconds: 100, DefaultUnlocked: true, ContentVersion: 1},
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
		balance := buildEquipmentCraftBalance(template, part)
		minRarity, maxRarity := rarityBoundsForTier(tier)
		key := "craft_" + template.Key
		registry[key] = RecipeDefinition{
			Key: key, Name: "Forjar: " + template.Name, Description: "Produz " + template.Name + " combinando recursos profissionais e partes de monstros.",
			Kind: RecipeKindEquipment, OutputTemplateKey: template.Key, VisualKey: template.VisualKey, SetKey: template.SetKey, ProfessionKey: profession,
			RequiredProfessionLevel: balance.RequiredProfessionLevel, Tier: tier, StationKey: stationForTier(tier), RequiredStationLevel: stationLevelForTier(tier),
			Ingredients: balance.Ingredients, GoldCost: balance.GoldCost, CraftSeconds: balance.CraftSeconds,
			MinimumRarity: minRarity, MaximumRarity: maxRarity, DefaultUnlocked: tier == 1,
			UnlockTrophyKey: trophyForTier(tier), ContentVersion: 1,
			SlotType:               string(template.Slot),
			WeaponType:             string(template.WeaponType),
			Hands:                  template.Hands,
			RequiredLevel:          template.RequiredLevel,
			BaseAtk:                template.BaseAtk,
			BaseMagic:              template.BaseMagic,
			BaseDef:                template.BaseDef,
			BaseWeight:             template.BaseWeight,
			BaseSTR:                template.BaseSTR,
			BaseDEX:                template.BaseDEX,
			BaseINT:                template.BaseINT,
			BaseHP:                 template.BaseHP,
			BaseMP:                 template.BaseMP,
			CritChance:             template.CritChance,
			Lifesteal:              template.Lifesteal,
			ManaRegen:              template.ManaRegen,
			BaseMovementSpeedBonus: template.BaseMovementSpeedBonus,
		}
	}
	return registry
}

type equipmentCraftBalance struct {
	Ingredients             []ResourceAmount
	GoldCost                int64
	CraftSeconds            int64
	RequiredProfessionLevel int
}

// buildEquipmentCraftBalance define custos pelo papel do equipamento, não apenas
// pelo Tier. O objetivo é que uma arma temática exija preparo de recursos,
// ouro e caçada suficientes para ter valor em um jogo idle.
func buildEquipmentCraftBalance(template LootTemplate, monsterPart string) equipmentCraftBalance {
	tier := template.Tier
	if tier < 1 {
		tier = 1
	}
	if tier > 1 {
		return equipmentCraftBalance{
			Ingredients:             ingredientsForTemplate(template, monsterPart),
			GoldCost:                int64(150 * tier * tier),
			CraftSeconds:            int64(30 * tier),
			RequiredProfessionLevel: 1 + (tier-1)*8,
		}
	}

	// O Cajado de Pirulito é a primeira arma temática de alcance: sua receita
	// não pode ser completada com uma única migalha encontrada por acaso.
	if template.Key == "cajado_de_pirulito" {
		return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "iron_ingot", Quantity: 6}, {Key: "treated_plank", Quantity: 4}, {Key: "part_cookie_crumb", Quantity: 4}}, GoldCost: 350, CraftSeconds: 75, RequiredProfessionLevel: 2}
	}

	// Recompensas temáticas de chefes: raras, mas ainda realizáveis durante a
	// primeira fase. Cada peça pede três troféus/partes do próprio encontro.
	if template.SetKey != "" {
		if template.Slot == SlotMainHand || template.Slot == SlotOffHand {
			ingredients := []ResourceAmount{{Key: "iron_ingot", Quantity: 6}, {Key: "treated_plank", Quantity: 4}, {Key: monsterPart, Quantity: 3}}
			if template.WeaponType == WeaponTypeBow || template.WeaponType == WeaponTypeWand {
				ingredients = []ResourceAmount{{Key: "treated_plank", Quantity: 6}, {Key: "woven_cloth", Quantity: 3}, {Key: monsterPart, Quantity: 3}}
			}
			return equipmentCraftBalance{Ingredients: ingredients, GoldCost: 400, CraftSeconds: 80, RequiredProfessionLevel: 3}
		}
		return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "tanned_leather", Quantity: 5}, {Key: "woven_cloth", Quantity: 4}, {Key: monsterPart, Quantity: 3}}, GoldCost: 350, CraftSeconds: 75, RequiredProfessionLevel: 3}
	}

	switch template.Slot {
	case SlotMainHand:
		switch template.WeaponType {
		case WeaponTypeBow:
			return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "treated_plank", Quantity: 5}, {Key: "woven_cloth", Quantity: 2}, {Key: monsterPart, Quantity: 2}}, GoldCost: 220, CraftSeconds: 50, RequiredProfessionLevel: 1}
		case WeaponTypeWand:
			return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "treated_plank", Quantity: 4}, {Key: "woven_cloth", Quantity: 2}, {Key: monsterPart, Quantity: 2}}, GoldCost: 220, CraftSeconds: 50, RequiredProfessionLevel: 1}
		default:
			ingots, planks, parts, gold := int64(4), int64(3), int64(2), int64(220)
			if template.Hands == 2 {
				ingots, planks, parts, gold = 6, 4, 3, 300
			}
			return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "iron_ingot", Quantity: ingots}, {Key: "treated_plank", Quantity: planks}, {Key: monsterPart, Quantity: parts}}, GoldCost: gold, CraftSeconds: 55, RequiredProfessionLevel: 1}
		}
	case SlotOffHand:
		return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "treated_plank", Quantity: 5}, {Key: "iron_ingot", Quantity: 2}, {Key: monsterPart, Quantity: 2}}, GoldCost: 200, CraftSeconds: 45, RequiredProfessionLevel: 1}
	case SlotAmmo:
		return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "treated_plank", Quantity: 3}, {Key: "woven_cloth", Quantity: 2}, {Key: monsterPart, Quantity: 2}}, GoldCost: 160, CraftSeconds: 40, RequiredProfessionLevel: 1}
	case SlotHead, SlotChest, SlotLegs, SlotBoots, SlotBag:
		return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "tanned_leather", Quantity: 4}, {Key: "woven_cloth", Quantity: 3}, {Key: monsterPart, Quantity: 2}}, GoldCost: 180, CraftSeconds: 45, RequiredProfessionLevel: 1}
	default:
		return equipmentCraftBalance{Ingredients: []ResourceAmount{{Key: "woven_cloth", Quantity: 3}, {Key: "fish_scale", Quantity: 2}, {Key: monsterPart, Quantity: 2}}, GoldCost: 180, CraftSeconds: 45, RequiredProfessionLevel: 1}
	}
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
	// O primeiro equipamento deve ser alcançável após a cadeia inicial de
	// processamento, sem aumentar drops nem remover a parte de monstro.
	// A redução é permanente e limitada ao Tier 1; tiers seguintes preservam
	// integralmente a curva original de materiais.
	if tier == 1 {
		base = 3
	}
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
		switch template.SetKey {
		case "urso_ranzinza":
			return "part_bear_claw"
		case "feiona":
			return "part_fiona_tiara_shard"
		case "biscoito_encantado":
			return "part_cookie_crumb"
		}
		switch template.Key {
		case "espada_do_aprendiz":
			return "part_goblin_ear"
		case "varinha_do_aprendiz":
			return "part_spider_silk"
		case "cajado_de_pirulito":
			return "part_cookie_crumb"
		case "arco_curvo":
			return "part_wolf_fang"
		case "capacete_de_couro":
			return "part_wolf_fang"
		case "tunica_de_couro":
			return "part_goblin_ear"
		case "calca_de_couro_pioneiro":
			return "part_wolf_fang"
		case "botas_de_couro_pioneiro":
			return "part_wolf_fang"
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
		if !IsRecipeReleased(definition) {
			continue
		}
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