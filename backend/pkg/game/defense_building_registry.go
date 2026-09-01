package game

import "time"

// M5-B mantém as fortificações como conteúdo do mesmo sistema autoritativo de
// obras do acampamento. Muralha e Portão são registros de construção normais
// para custo/timer/nível, mas sua apresentação física é de perímetro: eles não
// ocupam um lote arrastável no centro da cidade.
func init() {
	definitions := []BuildingDefinition{
		{
			Key: "wall", Name: "Muralha", Icon: "🧱",
			Description: "Cinturão fortificado que protege o perímetro do assentamento. O nível define robustez e resistência a futuras ações de cerco.",
			SlotType:    "perimeter", PlacementMode: BuildingPlacementPerimeter, UnlockStage: SettlementStageVillage, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageVillage, GoldCost: 180000, Costs: []ResourceAmount{{Key: "stone", Quantity: 1800}, {Key: "wood", Quantity: 600}, {Key: "iron", Quantity: 500}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_orcruins_skeleton", Quantity: 6}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 2}, {BuildingKey: "workbench", MinLevel: 1}}, BuildDuration: 2 * time.Hour, BuildDurationSeconds: 7200, Effects: []BuildingEffect{{Key: "wall_integrity", Value: 1200}, {Key: "wall_damage_reduction_percent", Value: 8}}},
				{Level: 2, RequiredSettlementStage: SettlementStageCity, GoldCost: 550000, Costs: []ResourceAmount{{Key: "stone", Quantity: 4500}, {Key: "iron", Quantity: 2200}, {Key: "wood", Quantity: 1200}, {Key: "arcane_essence", Quantity: 250}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 10}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 3}, {BuildingKey: "watchtower", MinLevel: 1}, {BuildingKey: "workbench", MinLevel: 2}}, BuildDuration: 8 * time.Hour, BuildDurationSeconds: 28800, Effects: []BuildingEffect{{Key: "wall_integrity", Value: 2600}, {Key: "wall_damage_reduction_percent", Value: 14}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 1400000, Costs: []ResourceAmount{{Key: "stone", Quantity: 9000}, {Key: "iron", Quantity: 5000}, {Key: "arcane_essence", Quantity: 900}, {Key: "glacial_crystal", Quantity: 350}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 6}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "gate", MinLevel: 2}, {BuildingKey: "barracks", MinLevel: 2}, {BuildingKey: "engineer_workshop", MinLevel: 2}}, BuildDuration: 24 * time.Hour, BuildDurationSeconds: 86400, Effects: []BuildingEffect{{Key: "wall_integrity", Value: 5000}, {Key: "wall_damage_reduction_percent", Value: 22}}},
			},
		},
		{
			Key: "watchtower", Name: "Torre de Vigia", Icon: "🗼",
			Description: "Observatório elevado para vigias, sinos de alarme e leitura antecipada de ameaças. Será uma peça central da contraespionagem em M6.",
			SlotType:    "free", PlacementMode: BuildingPlacementFree, UnlockStage: SettlementStageVillage, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageVillage, GoldCost: 140000, Costs: []ResourceAmount{{Key: "wood", Quantity: 1000}, {Key: "stone", Quantity: 900}, {Key: "iron", Quantity: 350}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_forest_bear", Quantity: 5}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "adventurer_hut", MinLevel: 2}, {BuildingKey: "warehouse", MinLevel: 2}}, BuildDuration: 90 * time.Minute, BuildDurationSeconds: 5400, Effects: []BuildingEffect{{Key: "watchtower_detection_percent", Value: 12}, {Key: "watchtower_warning_seconds", Value: 10}}},
				{Level: 2, RequiredSettlementStage: SettlementStageCity, GoldCost: 420000, Costs: []ResourceAmount{{Key: "wood", Quantity: 2200}, {Key: "stone", Quantity: 1800}, {Key: "iron", Quantity: 1000}, {Key: "arcane_essence", Quantity: 150}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "wall", MinLevel: 1}, {BuildingKey: "barracks", MinLevel: 1}}, BuildDuration: 6 * time.Hour, BuildDurationSeconds: 21600, Effects: []BuildingEffect{{Key: "watchtower_detection_percent", Value: 25}, {Key: "watchtower_warning_seconds", Value: 20}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 1000000, Costs: []ResourceAmount{{Key: "stone", Quantity: 4500}, {Key: "iron", Quantity: 2600}, {Key: "arcane_essence", Quantity: 500}, {Key: "glacial_crystal", Quantity: 200}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_frozen_master", Quantity: 10}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "wall", MinLevel: 2}, {BuildingKey: "war_room", MinLevel: 1}}, BuildDuration: 18 * time.Hour, BuildDurationSeconds: 64800, Effects: []BuildingEffect{{Key: "watchtower_detection_percent", Value: 40}, {Key: "watchtower_warning_seconds", Value: 30}}},
			},
		},
		{
			Key: "gate", Name: "Portão Fortificado", Icon: "🚪",
			Description: "Entrada reforçada integrada à muralha. Controla o acesso ao Reino e se torna o principal ponto de ruptura em cercos futuros.",
			SlotType:    "perimeter", PlacementMode: BuildingPlacementPerimeter, UnlockStage: SettlementStageCity, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageCity, GoldCost: 220000, Costs: []ResourceAmount{{Key: "stone", Quantity: 1600}, {Key: "iron", Quantity: 1100}, {Key: "wood", Quantity: 800}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_esgotos_destroyer", Quantity: 6}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "wall", MinLevel: 1}, {BuildingKey: "watchtower", MinLevel: 1}}, BuildDuration: 3 * time.Hour, BuildDurationSeconds: 10800, Effects: []BuildingEffect{{Key: "gate_integrity", Value: 1000}, {Key: "gate_breach_resistance_percent", Value: 8}}},
				{Level: 2, RequiredSettlementStage: SettlementStageCity, GoldCost: 650000, Costs: []ResourceAmount{{Key: "stone", Quantity: 4000}, {Key: "iron", Quantity: 2600}, {Key: "arcane_essence", Quantity: 250}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 10}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "wall", MinLevel: 2}, {BuildingKey: "barracks", MinLevel: 1}}, BuildDuration: 10 * time.Hour, BuildDurationSeconds: 36000, Effects: []BuildingEffect{{Key: "gate_integrity", Value: 2200}, {Key: "gate_breach_resistance_percent", Value: 15}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 1600000, Costs: []ResourceAmount{{Key: "stone", Quantity: 8500}, {Key: "iron", Quantity: 5200}, {Key: "arcane_essence", Quantity: 800}, {Key: "glacial_crystal", Quantity: 400}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "wall", MinLevel: 3}, {BuildingKey: "engineer_workshop", MinLevel: 2}}, BuildDuration: 24 * time.Hour, BuildDurationSeconds: 86400, Effects: []BuildingEffect{{Key: "gate_integrity", Value: 4200}, {Key: "gate_breach_resistance_percent", Value: 25}}},
			},
		},
		{
			Key: "barracks", Name: "Quartel", Icon: "⚔️",
			Description: "Aloja e treina a guarnição do assentamento. Seus níveis ampliam a capacidade militar disponível para a defesa futura.",
			SlotType:    "free", PlacementMode: BuildingPlacementFree, UnlockStage: SettlementStageCity, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageCity, GoldCost: 250000, Costs: []ResourceAmount{{Key: "wood", Quantity: 1800}, {Key: "stone", Quantity: 1400}, {Key: "iron", Quantity: 900}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_orcruins_skeleton", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "wall", MinLevel: 1}, {BuildingKey: "watchtower", MinLevel: 1}}, BuildDuration: 4 * time.Hour, BuildDurationSeconds: 14400, Effects: []BuildingEffect{{Key: "barracks_guard_capacity", Value: 4}, {Key: "barracks_training_percent", Value: 5}}},
				{Level: 2, RequiredSettlementStage: SettlementStageCity, GoldCost: 700000, Costs: []ResourceAmount{{Key: "wood", Quantity: 3500}, {Key: "stone", Quantity: 2800}, {Key: "iron", Quantity: 2200}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 10}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "gate", MinLevel: 1}, {BuildingKey: "wall", MinLevel: 2}}, BuildDuration: 12 * time.Hour, BuildDurationSeconds: 43200, Effects: []BuildingEffect{{Key: "barracks_guard_capacity", Value: 8}, {Key: "barracks_training_percent", Value: 12}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 1700000, Costs: []ResourceAmount{{Key: "wood", Quantity: 4000}, {Key: "stone", Quantity: 6000}, {Key: "iron", Quantity: 5000}, {Key: "glacial_crystal", Quantity: 250}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "war_room", MinLevel: 1}, {BuildingKey: "engineer_workshop", MinLevel: 2}}, BuildDuration: 24 * time.Hour, BuildDurationSeconds: 86400, Effects: []BuildingEffect{{Key: "barracks_guard_capacity", Value: 12}, {Key: "barracks_training_percent", Value: 20}}},
			},
		},
		{
			Key: "vault", Name: "Cofre do Reino", Icon: "🔐",
			Description: "Fortaleza interna para recursos sensíveis. Não torna o ouro pessoal saqueável; apenas prepara as regras de proteção da economia territorial.",
			SlotType:    "free", PlacementMode: BuildingPlacementFree, UnlockStage: SettlementStageCity, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageCity, GoldCost: 300000, Costs: []ResourceAmount{{Key: "stone", Quantity: 2200}, {Key: "iron", Quantity: 1600}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_esgotos_destroyer", Quantity: 6}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "warehouse", MinLevel: 3}, {BuildingKey: "wall", MinLevel: 1}}, BuildDuration: 5 * time.Hour, BuildDurationSeconds: 18000, Effects: []BuildingEffect{{Key: "raid_storage_protection_percent", Value: 20}, {Key: "raid_treasury_protection_percent", Value: 15}}},
				{Level: 2, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 900000, Costs: []ResourceAmount{{Key: "stone", Quantity: 5000}, {Key: "iron", Quantity: 3500}, {Key: "arcane_essence", Quantity: 300}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 12}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "gate", MinLevel: 2}, {BuildingKey: "wall", MinLevel: 2}}, BuildDuration: 14 * time.Hour, BuildDurationSeconds: 50400, Effects: []BuildingEffect{{Key: "raid_storage_protection_percent", Value: 35}, {Key: "raid_treasury_protection_percent", Value: 30}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 2000000, Costs: []ResourceAmount{{Key: "stone", Quantity: 9000}, {Key: "iron", Quantity: 6500}, {Key: "arcane_essence", Quantity: 1000}, {Key: "glacial_crystal", Quantity: 500}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 10}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "resonator", MinLevel: 2}, {BuildingKey: "war_room", MinLevel: 2}}, BuildDuration: 30 * time.Hour, BuildDurationSeconds: 108000, Effects: []BuildingEffect{{Key: "raid_storage_protection_percent", Value: 50}, {Key: "raid_treasury_protection_percent", Value: 45}}},
			},
		},
		{
			Key: "infirmary", Name: "Enfermaria", Icon: "🌿",
			Description: "Posto de tratamento para defensores e moradores. Reduz o tempo de recuperação após conflitos sem criar morte permanente de NPCs.",
			SlotType:    "free", PlacementMode: BuildingPlacementFree, UnlockStage: SettlementStageCity, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageCity, GoldCost: 180000, Costs: []ResourceAmount{{Key: "wood", Quantity: 1200}, {Key: "stone", Quantity: 900}, {Key: "fiber", Quantity: 1000}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_forest_bear", Quantity: 5}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 1}, {BuildingKey: "kitchen", MinLevel: 2}}, BuildDuration: 3 * time.Hour, BuildDurationSeconds: 10800, Effects: []BuildingEffect{{Key: "defender_recovery_percent", Value: 12}, {Key: "resident_injury_reduction_percent", Value: 8}}},
				{Level: 2, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 520000, Costs: []ResourceAmount{{Key: "wood", Quantity: 2200}, {Key: "stone", Quantity: 1800}, {Key: "fiber", Quantity: 2000}, {Key: "arcane_essence", Quantity: 180}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_frozen_master", Quantity: 7}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 2}, {BuildingKey: "alchemy_bench", MinLevel: 2}}, BuildDuration: 9 * time.Hour, BuildDurationSeconds: 32400, Effects: []BuildingEffect{{Key: "defender_recovery_percent", Value: 24}, {Key: "resident_injury_reduction_percent", Value: 16}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 1200000, Costs: []ResourceAmount{{Key: "stone", Quantity: 3500}, {Key: "fiber", Quantity: 3500}, {Key: "iron", Quantity: 1800}, {Key: "arcane_essence", Quantity: 600}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 5}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 3}, {BuildingKey: "alchemy_bench", MinLevel: 3}}, BuildDuration: 18 * time.Hour, BuildDurationSeconds: 64800, Effects: []BuildingEffect{{Key: "defender_recovery_percent", Value: 38}, {Key: "resident_injury_reduction_percent", Value: 25}}},
			},
		},
		{
			Key: "prison", Name: "Cárcere", Icon: "⛓️",
			Description: "Estrutura controlada para a futura captura temporária de combatentes ou moradores, sempre sem remoção permanente do personagem afetado.",
			SlotType:    "free", PlacementMode: BuildingPlacementFree, UnlockStage: SettlementStageCity, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageCity, GoldCost: 200000, Costs: []ResourceAmount{{Key: "stone", Quantity: 1500}, {Key: "iron", Quantity: 1200}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_esgotos_destroyer", Quantity: 6}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 1}, {BuildingKey: "gate", MinLevel: 1}}, BuildDuration: 4 * time.Hour, BuildDurationSeconds: 14400, Effects: []BuildingEffect{{Key: "prison_capacity", Value: 1}, {Key: "prison_hold_percent", Value: 5}}},
				{Level: 2, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 600000, Costs: []ResourceAmount{{Key: "stone", Quantity: 3200}, {Key: "iron", Quantity: 2600}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 2}, {BuildingKey: "wall", MinLevel: 2}}, BuildDuration: 10 * time.Hour, BuildDurationSeconds: 36000, Effects: []BuildingEffect{{Key: "prison_capacity", Value: 2}, {Key: "prison_hold_percent", Value: 12}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 1300000, Costs: []ResourceAmount{{Key: "stone", Quantity: 6000}, {Key: "iron", Quantity: 5000}, {Key: "glacial_crystal", Quantity: 180}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 5}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 3}, {BuildingKey: "war_room", MinLevel: 2}}, BuildDuration: 20 * time.Hour, BuildDurationSeconds: 72000, Effects: []BuildingEffect{{Key: "prison_capacity", Value: 3}, {Key: "prison_hold_percent", Value: 20}}},
			},
		},
		{
			Key: "engineer_workshop", Name: "Oficina do Engenheiro", Icon: "⚙️",
			Description: "Centro de manutenção militar. Prepara reparos, armadilhas e infraestrutura de cerco sem bloquear as estações básicas do onboarding.",
			SlotType:    "free", PlacementMode: BuildingPlacementFree, UnlockStage: SettlementStageCity, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageCity, GoldCost: 280000, Costs: []ResourceAmount{{Key: "wood", Quantity: 1700}, {Key: "stone", Quantity: 1300}, {Key: "iron", Quantity: 1300}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_chapolin_alma", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "workbench", MinLevel: 3}, {BuildingKey: "wall", MinLevel: 1}}, BuildDuration: 5 * time.Hour, BuildDurationSeconds: 18000, Effects: []BuildingEffect{{Key: "fortification_repair_percent", Value: 12}, {Key: "defense_trap_slots", Value: 1}}},
				{Level: 2, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 850000, Costs: []ResourceAmount{{Key: "wood", Quantity: 3000}, {Key: "stone", Quantity: 2800}, {Key: "iron", Quantity: 3000}, {Key: "arcane_essence", Quantity: 250}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 10}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "gate", MinLevel: 2}, {BuildingKey: "barracks", MinLevel: 2}}, BuildDuration: 12 * time.Hour, BuildDurationSeconds: 43200, Effects: []BuildingEffect{{Key: "fortification_repair_percent", Value: 25}, {Key: "defense_trap_slots", Value: 2}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 1900000, Costs: []ResourceAmount{{Key: "stone", Quantity: 6000}, {Key: "iron", Quantity: 6000}, {Key: "arcane_essence", Quantity: 800}, {Key: "glacial_crystal", Quantity: 300}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "war_room", MinLevel: 2}, {BuildingKey: "resonator", MinLevel: 2}}, BuildDuration: 26 * time.Hour, BuildDurationSeconds: 93600, Effects: []BuildingEffect{{Key: "fortification_repair_percent", Value: 45}, {Key: "defense_trap_slots", Value: 3}}},
			},
		},
		{
			Key: "war_room", Name: "Sala de Guerra", Icon: "🗺️",
			Description: "Centro de comando para estratégias defensivas, mobilização de guardas e planejamento de scouting e raids futuras.",
			SlotType:    "free", PlacementMode: BuildingPlacementFree, UnlockStage: SettlementStageCity, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageCity, GoldCost: 320000, Costs: []ResourceAmount{{Key: "wood", Quantity: 1800}, {Key: "stone", Quantity: 1800}, {Key: "iron", Quantity: 900}, {Key: "arcane_essence", Quantity: 120}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_planalto_xandaum", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 1}, {BuildingKey: "watchtower", MinLevel: 2}}, BuildDuration: 6 * time.Hour, BuildDurationSeconds: 21600, Effects: []BuildingEffect{{Key: "war_room_command_percent", Value: 5}, {Key: "scouting_coordination_percent", Value: 5}}},
				{Level: 2, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 950000, Costs: []ResourceAmount{{Key: "wood", Quantity: 3000}, {Key: "stone", Quantity: 3600}, {Key: "iron", Quantity: 2600}, {Key: "arcane_essence", Quantity: 350}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_frozen_master", Quantity: 9}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 2}, {BuildingKey: "gate", MinLevel: 2}}, BuildDuration: 14 * time.Hour, BuildDurationSeconds: 50400, Effects: []BuildingEffect{{Key: "war_room_command_percent", Value: 12}, {Key: "scouting_coordination_percent", Value: 12}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 2200000, Costs: []ResourceAmount{{Key: "stone", Quantity: 7000}, {Key: "iron", Quantity: 5200}, {Key: "arcane_essence", Quantity: 1100}, {Key: "glacial_crystal", Quantity: 450}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 10}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "barracks", MinLevel: 3}, {BuildingKey: "resonator", MinLevel: 2}}, BuildDuration: 30 * time.Hour, BuildDurationSeconds: 108000, Effects: []BuildingEffect{{Key: "war_room_command_percent", Value: 20}, {Key: "scouting_coordination_percent", Value: 20}}},
			},
		},
		{
			Key: "resonator", Name: "Ressonador Arcano", Icon: "💠",
			Description: "Estrutura mágica que estabiliza uma barreira territorial. Sua energia será convertida em escudo defensivo na M5-C/M7.",
			SlotType:    "free", PlacementMode: BuildingPlacementFree, UnlockStage: SettlementStageCity, MaxLevel: 3,
			Levels: []BuildingLevelDefinition{
				{Level: 1, RequiredSettlementStage: SettlementStageCity, GoldCost: 400000, Costs: []ResourceAmount{{Key: "stone", Quantity: 1500}, {Key: "iron", Quantity: 800}, {Key: "arcane_essence", Quantity: 700}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_rogartes_darkmage", Quantity: 8}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "arcane_spring", MinLevel: 3}, {BuildingKey: "wall", MinLevel: 2}}, BuildDuration: 7 * time.Hour, BuildDurationSeconds: 25200, Effects: []BuildingEffect{{Key: "resonator_shield_percent", Value: 5}, {Key: "resonator_stability_percent", Value: 8}}},
				{Level: 2, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 1100000, Costs: []ResourceAmount{{Key: "stone", Quantity: 3200}, {Key: "iron", Quantity: 2200}, {Key: "arcane_essence", Quantity: 1400}, {Key: "glacial_crystal", Quantity: 250}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_frozen_master", Quantity: 10}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "war_room", MinLevel: 1}, {BuildingKey: "engineer_workshop", MinLevel: 1}}, BuildDuration: 16 * time.Hour, BuildDurationSeconds: 57600, Effects: []BuildingEffect{{Key: "resonator_shield_percent", Value: 12}, {Key: "resonator_stability_percent", Value: 18}}},
				{Level: 3, RequiredSettlementStage: SettlementStageKingdom, GoldCost: 2500000, Costs: []ResourceAmount{{Key: "stone", Quantity: 6000}, {Key: "iron", Quantity: 4500}, {Key: "arcane_essence", Quantity: 2600}, {Key: "glacial_crystal", Quantity: 700}, {Key: "abyssal_ember", Quantity: 120}}, RequiredTrophies: []ResourceAmount{{Key: "trophy_abyss_avenger", Quantity: 12}}, RequiredBuildings: []BuildingRequirement{{BuildingKey: "war_room", MinLevel: 3}, {BuildingKey: "engineer_workshop", MinLevel: 3}}, BuildDuration: 36 * time.Hour, BuildDurationSeconds: 129600, Effects: []BuildingEffect{{Key: "resonator_shield_percent", Value: 20}, {Key: "resonator_stability_percent", Value: 30}}},
			},
		},
	}
	for _, definition := range definitions {
		if err := RegisterBuildingDefinition(definition); err != nil {
			panic(err)
		}
	}
}
