package game

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

var (
	buildingRegistryMu sync.RWMutex
	buildingRegistry   = map[string]BuildingDefinition{
		// 1. FOGUEIRA (center)
		"campfire": {
			Key:             "campfire",
			Name:            "Fogueira do Acampamento",
			Icon:            "🔥",
			Description:     "Proporciona calor, conforto e cicatrização acelerada enquanto o herói descansa.",
			SlotType:        "center",
			DefaultUnlocked: true,
			MaxLevel:        3,
			Levels: []BuildingLevelDefinition{
				{
					Level:    1,
					GoldCost: 50,
					Costs:    []ResourceAmount{{Key: "wood", Quantity: 20}, {Key: "stone", Quantity: 10}},
					// A primeira evolução da fogueira faz parte do onboarding e
					// conclui no mesmo comando, sem remover seus custos.
					BuildDuration:        0,
					BuildDurationSeconds: 0,
					Effects:              []BuildingEffect{{Key: "camp_hp_regen_percent", Value: 25}},
				},
				{
					Level:                2,
					GoldCost:             20000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 400}, {Key: "stone", Quantity: 250}, {Key: "fiber", Quantity: 150}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_forest_bear", Quantity: 5}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 1}, {BuildingKey: "adventurer_hut", MinLevel: 1}},
					BuildDuration:        30 * time.Minute,
					BuildDurationSeconds: 1800,
					Effects:              []BuildingEffect{{Key: "camp_hp_regen_percent", Value: 50}},
				},
				{
					Level:                3,
					GoldCost:             100000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 1500}, {Key: "stone", Quantity: 900}, {Key: "iron", Quantity: 600}, {Key: "arcane_essence", Quantity: 200}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_orcruins_skeleton", Quantity: 12}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 2}, {BuildingKey: "adventurer_hut", MinLevel: 2}},
					BuildDuration:        4 * time.Hour,
					BuildDurationSeconds: 14400,
					Effects:              []BuildingEffect{{Key: "camp_hp_regen_percent", Value: 85}},
				},
			},
		},

		// 2. ARMAZÉM DE RECURSOS (east)
		"warehouse": {
			Key:         "warehouse",
			Name:        "Armazém de Recursos",
			Icon:        "📦",
			Description: "Depósito reforçado para estocar madeira, minérios, tecidos e materiais nobres sem desperdício.",
			SlotType:    "east",
			MaxLevel:    3,
			Levels: []BuildingLevelDefinition{
				{
					Level:                1,
					GoldCost:             5000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 120}, {Key: "stone", Quantity: 80}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 1}},
					BuildDuration:        15 * time.Minute,
					BuildDurationSeconds: 900,
					Effects:              []BuildingEffect{{Key: "resource_storage", Value: 30000}},
				},
				{
					Level:                2,
					GoldCost:             35000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 500}, {Key: "stone", Quantity: 350}, {Key: "iron", Quantity: 250}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_esgotos_destroyer", Quantity: 8}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 2}, {BuildingKey: "adventurer_hut", MinLevel: 1}, {BuildingKey: "workbench", MinLevel: 1}},
					BuildDuration:        30 * time.Minute,
					BuildDurationSeconds: 1800,
					Effects:              []BuildingEffect{{Key: "resource_storage", Value: 100000}},
				},
				{
					Level:                3,
					GoldCost:             180000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 1800}, {Key: "stone", Quantity: 1200}, {Key: "iron", Quantity: 1000}, {Key: "arcane_essence", Quantity: 300}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 15}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 3}, {BuildingKey: "adventurer_hut", MinLevel: 2}, {BuildingKey: "workbench", MinLevel: 2}},
					BuildDuration:        4 * time.Hour,
					BuildDurationSeconds: 14400,
					Effects:              []BuildingEffect{{Key: "resource_storage", Value: 500000}},
				},
			},
		},

		// 3. CABANA DO AVENTUREIRO (west)
		"adventurer_hut": {
			Key:         "adventurer_hut",
			Name:        "Cabana do Aventureiro",
			Icon:        "⛺",
			Description: "Abrigo confortável para planejar estratégias e recuperar corpo e mente harmoniosamente.",
			SlotType:    "west",
			MaxLevel:    3,
			Levels: []BuildingLevelDefinition{
				{
					Level:                1,
					GoldCost:             4000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 160}, {Key: "fiber", Quantity: 100}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 1}},
					BuildDuration:        15 * time.Minute,
					BuildDurationSeconds: 900,
					Effects:              []BuildingEffect{{Key: "camp_all_regen_percent", Value: 10}},
				},
				{
					Level:                2,
					GoldCost:             25000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 600}, {Key: "fiber", Quantity: 350}, {Key: "stone", Quantity: 250}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_shereque_fiona", Quantity: 8}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 1}, {BuildingKey: "campfire", MinLevel: 2}},
					BuildDuration:        30 * time.Minute,
					BuildDurationSeconds: 1800,
					Effects:              []BuildingEffect{{Key: "camp_all_regen_percent", Value: 20}},
				},
				{
					Level:                3,
					GoldCost:             130000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 2200}, {Key: "fiber", Quantity: 1200}, {Key: "iron", Quantity: 900}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 15}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 2}, {BuildingKey: "campfire", MinLevel: 3}, {BuildingKey: "arcane_spring", MinLevel: 2}},
					BuildDuration:        4 * time.Hour,
					BuildDurationSeconds: 14400,
					Effects:              []BuildingEffect{{Key: "camp_all_regen_percent", Value: 35}},
				},
			},
		},

		// 4. FONTE ARCANA (north)
		"arcane_spring": {
			Key:         "arcane_spring",
			Name:        "Fonte Arcana",
			Icon:        "⛲",
			Description: "Águas místicas infundidas com energia etérea que restauram a mana rapidamente.",
			SlotType:    "north",
			MaxLevel:    3,
			Levels: []BuildingLevelDefinition{
				{
					Level:                1,
					GoldCost:             5000,
					Costs:                []ResourceAmount{{Key: "stone", Quantity: 120}, {Key: "arcane_essence", Quantity: 40}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 1}},
					BuildDuration:        30 * time.Minute,
					BuildDurationSeconds: 1800,
					Effects:              []BuildingEffect{{Key: "camp_mana_regen_percent", Value: 25}},
				},
				{
					Level:                2,
					GoldCost:             30000,
					Costs:                []ResourceAmount{{Key: "stone", Quantity: 500}, {Key: "arcane_essence", Quantity: 250}, {Key: "fiber", Quantity: 150}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_chapolin_alma", Quantity: 8}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 2}, {BuildingKey: "campfire", MinLevel: 2}},
					BuildDuration:        30 * time.Minute,
					BuildDurationSeconds: 1800,
					Effects:              []BuildingEffect{{Key: "camp_mana_regen_percent", Value: 55}},
				},
				{
					Level:                3,
					GoldCost:             160000,
					Costs:                []ResourceAmount{{Key: "stone", Quantity: 1500}, {Key: "arcane_essence", Quantity: 800}, {Key: "glacial_crystal", Quantity: 200}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_frozen_master", Quantity: 15}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 3}, {BuildingKey: "campfire", MinLevel: 3}, {BuildingKey: "adventurer_hut", MinLevel: 3}},
					BuildDuration:        4 * time.Hour,
					BuildDurationSeconds: 14400,
					Effects:              []BuildingEffect{{Key: "camp_mana_regen_percent", Value: 100}},
				},
			},
		},

		// 5. COZINHA DE CAMPANHA (layout livre)
		"kitchen": {
			Key:             "kitchen",
			Name:            "Cozinha de Campanha",
			Icon:            "🍳",
			Description:     "Transforma pesca, caça, colheita e farinha em refeições que preparam o herói para expedições.",
			SlotType:        "free",
			DefaultUnlocked: true,
			MaxLevel:        3,
			Levels: []BuildingLevelDefinition{
				{
					// Primeira estação de onboarding: mantém a construção como
					// requisito real, mas não cria uma barreira econômica para
					// o jogador começar a cozinhar.
					Level: 1, GoldCost: 50,
					Costs:             []ResourceAmount{{Key: "wood", Quantity: 20}, {Key: "stone", Quantity: 10}},
					RequiredBuildings: []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 1}},
					// A Cozinha inicial é uma das três fundações do onboarding.
					BuildDuration: 0, BuildDurationSeconds: 0,
					Effects: []BuildingEffect{{Key: "cooking_unlock", Value: 1}},
				},
				{
					Level: 2, GoldCost: 30000,
					Costs:             []ResourceAmount{{Key: "wood", Quantity: 500}, {Key: "stone", Quantity: 300}, {Key: "iron", Quantity: 150}},
					RequiredBuildings: []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 2}, {BuildingKey: "warehouse", MinLevel: 1}},
					BuildDuration:     30 * time.Minute, BuildDurationSeconds: 1800,
					Effects: []BuildingEffect{{Key: "cooking_unlock", Value: 1}, {Key: "cooking_speed_percent", Value: 10}},
				},
				{
					Level: 3, GoldCost: 150000,
					Costs:             []ResourceAmount{{Key: "wood", Quantity: 1600}, {Key: "stone", Quantity: 1000}, {Key: "iron", Quantity: 700}, {Key: "arcane_essence", Quantity: 150}},
					RequiredBuildings: []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 3}, {BuildingKey: "warehouse", MinLevel: 2}},
					BuildDuration:     4 * time.Hour, BuildDurationSeconds: 14400,
					Effects: []BuildingEffect{{Key: "cooking_unlock", Value: 1}, {Key: "cooking_speed_percent", Value: 20}},
				},
			},
		},

		// 6. BANCADA DE ALQUIMIA (layout livre)
		"alchemy_bench": {
			Key:             "alchemy_bench",
			Name:            "Bancada de Alquimia",
			Icon:            "🧪",
			Description:     "Permite destilar poções e elixires que fortalecem o herói durante as expedições.",
			SlotType:        "free",
			DefaultUnlocked: true,
			MaxLevel:        3,
			Levels: []BuildingLevelDefinition{
				{
					// Mesmo custo de entrada da Cozinha para que as duas
					// profissões básicas possam ser habilitadas no onboarding.
					Level: 1, GoldCost: 50,
					Costs:             []ResourceAmount{{Key: "wood", Quantity: 20}, {Key: "stone", Quantity: 10}},
					RequiredBuildings: []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 1}},
					// A Bancada de Alquimia inicial segue a mesma regra da Cozinha.
					BuildDuration: 0, BuildDurationSeconds: 0,
					Effects: []BuildingEffect{{Key: "alchemy_unlock", Value: 1}},
				},
				{
					Level: 2, GoldCost: 25000,
					Costs:             []ResourceAmount{{Key: "wood", Quantity: 450}, {Key: "stone", Quantity: 250}, {Key: "iron", Quantity: 120}},
					RequiredBuildings: []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 2}, {BuildingKey: "warehouse", MinLevel: 1}},
					BuildDuration:     30 * time.Minute, BuildDurationSeconds: 1800,
					Effects: []BuildingEffect{{Key: "alchemy_unlock", Value: 1}, {Key: "alchemy_speed_percent", Value: 10}},
				},
				{
					Level: 3, GoldCost: 125000,
					Costs:             []ResourceAmount{{Key: "wood", Quantity: 1400}, {Key: "stone", Quantity: 900}, {Key: "iron", Quantity: 600}, {Key: "arcane_essence", Quantity: 120}},
					RequiredBuildings: []BuildingRequirement{{BuildingKey: "campfire", MinLevel: 3}, {BuildingKey: "warehouse", MinLevel: 2}},
					BuildDuration:     4 * time.Hour, BuildDurationSeconds: 14400,
					Effects: []BuildingEffect{{Key: "alchemy_unlock", Value: 1}, {Key: "alchemy_speed_percent", Value: 20}},
				},
			},
		},

		// 5. BANCADA DE FERREIRO (south)
		"workbench": {
			Key:         "workbench",
			Name:        "Bancada de Desmontagem",
			Icon:        "⚒️",
			Description: "Permite desmontar armas e armaduras sobressalentes para recuperar matérias-primas valiosas.",
			SlotType:    "south",
			MaxLevel:    3,
			Levels: []BuildingLevelDefinition{
				{
					Level:                1,
					GoldCost:             8000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 180}, {Key: "stone", Quantity: 100}, {Key: "iron", Quantity: 80}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 1}},
					BuildDuration:        30 * time.Minute,
					BuildDurationSeconds: 1800,
					Effects: []BuildingEffect{
						{Key: "salvage_unlock", Value: 1},
						{Key: "salvage_success_chance", Value: 65},
					},
				},
				{
					Level:                2,
					GoldCost:             45000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 600}, {Key: "stone", Quantity: 400}, {Key: "iron", Quantity: 350}, {Key: "fiber", Quantity: 100}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_chapolin_alma", Quantity: 8}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 2}, {BuildingKey: "adventurer_hut", MinLevel: 1}},
					BuildDuration:        30 * time.Minute,
					BuildDurationSeconds: 1800,
					Effects: []BuildingEffect{
						{Key: "salvage_unlock", Value: 1},
						{Key: "salvage_efficiency_percent", Value: 15},
						{Key: "salvage_batch_size", Value: 15},
						{Key: "salvage_success_chance", Value: 80},
					},
				},
				{
					Level:                3,
					GoldCost:             220000,
					Costs:                []ResourceAmount{{Key: "wood", Quantity: 2300}, {Key: "stone", Quantity: 1400}, {Key: "iron", Quantity: 1200}, {Key: "arcane_essence", Quantity: 500}, {Key: "glacial_crystal", Quantity: 200}},
					RequiredTrophies:     []ResourceAmount{{Key: "trophy_rogartes_darkmage", Quantity: 18}},
					RequiredBuildings:    []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 3}, {BuildingKey: "adventurer_hut", MinLevel: 3}},
					BuildDuration:        4 * time.Hour,
					BuildDurationSeconds: 14400,
					Effects: []BuildingEffect{
						{Key: "salvage_unlock", Value: 1},
						{Key: "salvage_efficiency_percent", Value: 30},
						{Key: "salvage_batch_size", Value: 50},
						{Key: "salvage_success_chance", Value: 92},
						{Key: "salvage_safe_mode", Value: 1},
					},
				},
			},
		},
	}

	SlotToBuildingMap = map[string]string{
		"center": "campfire",
		"north":  "arcane_spring",
		"west":   "adventurer_hut",
		"east":   "warehouse",
		"south":  "workbench",
	}
)

// GetBuildingDefinition retorna os metadados de uma construção por chave.
func GetBuildingDefinition(key string) (BuildingDefinition, bool) {
	buildingRegistryMu.RLock()
	defer buildingRegistryMu.RUnlock()
	def, ok := buildingRegistry[key]
	return def, ok
}

// ListBuildingDefinitions retorna todas as definições ordenadas por chave.
func ListBuildingDefinitions() []BuildingDefinition {
	buildingRegistryMu.RLock()
	defer buildingRegistryMu.RUnlock()
	list := make([]BuildingDefinition, 0, len(buildingRegistry))
	for _, def := range buildingRegistry {
		list = append(list, def)
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].Key < list[j].Key
	})
	return list
}

// GetBuildingLevelDefinition retorna os requisitos e bônus de um nível específico.
func GetBuildingLevelDefinition(buildingKey string, level int) (BuildingLevelDefinition, bool) {
	def, ok := GetBuildingDefinition(buildingKey)
	if !ok || level < 1 || level > len(def.Levels) {
		return BuildingLevelDefinition{}, false
	}
	return def.Levels[level-1], true
}

// ValidateBuildingRegistry valida a consistência de todas as construções cadastradas.
func ValidateBuildingRegistry() error {
	buildingRegistryMu.RLock()
	defer buildingRegistryMu.RUnlock()

	for bKey, def := range buildingRegistry {
		if def.Key != bKey {
			return fmt.Errorf("construção com chave inconsistente: %s != %s", bKey, def.Key)
		}
		if def.MaxLevel != len(def.Levels) {
			return fmt.Errorf("construção %s: MaxLevel (%d) != len(Levels) (%d)", bKey, def.MaxLevel, len(def.Levels))
		}
		for _, lvl := range def.Levels {
			for _, cost := range lvl.Costs {
				if _, ok := GetResourceDefinition(cost.Key); !ok {
					return fmt.Errorf("construção %s Nv %d referencia recurso desconhecido: %s", bKey, lvl.Level, cost.Key)
				}
			}
			for _, trophy := range lvl.RequiredTrophies {
				if _, ok := GetResourceDefinition(trophy.Key); !ok {
					return fmt.Errorf("construção %s Nv %d referencia troféu desconhecido: %s", bKey, lvl.Level, trophy.Key)
				}
			}
			for _, req := range lvl.RequiredBuildings {
				if _, ok := buildingRegistry[req.BuildingKey]; !ok {
					return fmt.Errorf("construção %s Nv %d referencia prédio desconhecido: %s", bKey, lvl.Level, req.BuildingKey)
				}
			}
		}
	}
	return nil
}

// ValidateBuildingSlotCompatibility garante que a construção pertença ao slot correto.
func ValidateBuildingSlotCompatibility(slotKey, buildingKey string) error {
	expectedBuilding, exists := SlotToBuildingMap[slotKey]
	if !exists {
		return fmt.Errorf("slot de acampamento desconhecido: %s", slotKey)
	}
	if expectedBuilding != buildingKey {
		return fmt.Errorf("construção %s incompatível com o slot %s (esperado: %s)", buildingKey, slotKey, expectedBuilding)
	}
	return nil
}
