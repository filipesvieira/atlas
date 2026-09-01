package game

import (
	"testing"
	"time"
)

func TestBuildingRegistryValidation(t *testing.T) {
	if err := ValidateBuildingRegistry(); err != nil {
		t.Fatalf("ValidateBuildingRegistry falhou: %v", err)
	}
}

func TestBuildingProgressionDurations(t *testing.T) {
	for _, key := range []string{"campfire", "kitchen", "alchemy_bench"} {
		level, ok := GetBuildingLevelDefinition(key, 1)
		if !ok || level.BuildDuration != 0 || level.BuildDurationSeconds != 0 {
			t.Fatalf("%s deveria concluir o nível 1 imediatamente no onboarding", key)
		}
	}

	for _, key := range []string{"campfire", "warehouse", "adventurer_hut", "arcane_spring", "kitchen", "alchemy_bench", "workbench"} {
		levelTwo, ok := GetBuildingLevelDefinition(key, 2)
		if !ok || levelTwo.BuildDuration != 30*time.Minute || levelTwo.BuildDurationSeconds != 1800 {
			t.Fatalf("%s deveria manter 30 minutos no nível 2", key)
		}
		levelThree, ok := GetBuildingLevelDefinition(key, 3)
		if !ok || levelThree.BuildDuration != 4*time.Hour || levelThree.BuildDurationSeconds != 14400 {
			t.Fatalf("%s deveria manter 4 horas no nível 3", key)
		}
	}
}

func TestCampBonusCalculator(t *testing.T) {
	// 1. Acampamento vazio (Lv 0) -> Capacidade Base 10000
	emptyBuildings := map[string]BuildingSlot{
		"center": {SlotKey: "center", BuildingKey: "campfire", Level: 0},
		"north":  {SlotKey: "north", BuildingKey: "arcane_spring", Level: 0},
	}
	bonuses := CalculateCampBonuses(emptyBuildings)
	if bonuses.StorageCapacity != 10000 {
		t.Errorf("Esperada capacidade base de 10000, recebido %d", bonuses.StorageCapacity)
	}
	if bonuses.HPRegenBonusPercent != 0 || bonuses.ManaRegenBonusPercent != 0 {
		t.Errorf("Esperado bônus 0 para nível 0, recebido HP=%.1f MP=%.1f", bonuses.HPRegenBonusPercent, bonuses.ManaRegenBonusPercent)
	}

	// 2. Fogueira Nv 1 (+25% HP) + Cabana Nv 1 (+10% All) + Armazém Nv 2 (100000 cap)
	testBuildings := map[string]BuildingSlot{
		"center": {SlotKey: "center", BuildingKey: "campfire", Level: 1},
		"west":   {SlotKey: "west", BuildingKey: "adventurer_hut", Level: 1},
		"east":   {SlotKey: "east", BuildingKey: "warehouse", Level: 2}, // 100000 cap
	}
	bonuses2 := CalculateCampBonuses(testBuildings)
	if bonuses2.HPRegenBonusPercent != 35.0 {
		t.Errorf("Esperado HPRegenBonusPercent = 35%% (25+10), recebido %.1f", bonuses2.HPRegenBonusPercent)
	}
	if bonuses2.ManaRegenBonusPercent != 10.0 {
		t.Errorf("Esperado ManaRegenBonusPercent = 10%%, recebido %.1f", bonuses2.ManaRegenBonusPercent)
	}
	if bonuses2.StorageCapacity != 100000 {
		t.Errorf("Esperado Armazém Nv 2 = 100000, recebido %d", bonuses2.StorageCapacity)
	}

	// 3. Bancada Nv 2 (Workbench) -> SalvageUnlocked deve ser TRUE
	wbBuildings := map[string]BuildingSlot{
		"south": {SlotKey: "south", BuildingKey: "workbench", Level: 2},
	}
	wbBonuses := CalculateCampBonuses(wbBuildings)
	if !wbBonuses.SalvageUnlocked {
		t.Errorf("Esperado SalvageUnlocked = true para Bancada Nv 2, recebido false")
	}
	if wbBonuses.SalvageEfficiencyPercent != 15.0 {
		t.Errorf("Esperada eficiência 15%% para Bancada Nv 2, recebido %.1f", wbBonuses.SalvageEfficiencyPercent)
	}

	// 4. Os registros são totais por nível, não incrementos acumuláveis.
	levelThree := CalculateCampBonuses(map[string]BuildingSlot{
		"center": {SlotKey: "center", BuildingKey: "campfire", Level: 3},
		"west":   {SlotKey: "west", BuildingKey: "adventurer_hut", Level: 3},
	})
	if levelThree.HPRegenBonusPercent != 120 { // 85 da fogueira + 35 da cabana
		t.Errorf("Esperado bônus total de HP 120%% no snapshot Nv 3, recebido %.1f", levelThree.HPRegenBonusPercent)
	}
	if levelThree.ManaRegenBonusPercent != 35 {
		t.Errorf("Esperado bônus total de mana 35%% no snapshot Nv 3, recebido %.1f", levelThree.ManaRegenBonusPercent)
	}
}
func TestDefenseBuildingsUnlockWithoutStageCircularity(t *testing.T) {
	wall, ok := GetBuildingDefinition("wall")
	if !ok || wall.UnlockStage != SettlementStageVillage || wall.PlacementMode != BuildingPlacementPerimeter {
		t.Fatalf("Muralha deveria desbloquear na Vila como estrutura de perímetro: %+v", wall)
	}
	watchtower, ok := GetBuildingDefinition("watchtower")
	if !ok || watchtower.UnlockStage != SettlementStageVillage {
		t.Fatalf("Torre de Vigia deveria desbloquear na Vila: %+v", watchtower)
	}
	for _, key := range []string{"gate", "barracks", "vault", "infirmary", "prison", "engineer_workshop", "war_room", "resonator"} {
		def, exists := GetBuildingDefinition(key)
		if !exists {
			t.Fatalf("estrutura defensiva ausente: %s", key)
		}
		if def.UnlockStage != SettlementStageCity {
			t.Fatalf("%s deveria desbloquear na Cidade, recebeu %s", key, def.UnlockStage)
		}
	}
}

func TestDefenseBuildingLevelStageGates(t *testing.T) {
	wallOne, _ := GetBuildingLevelDefinition("wall", 1)
	wallTwo, _ := GetBuildingLevelDefinition("wall", 2)
	wallThree, _ := GetBuildingLevelDefinition("wall", 3)
	if wallOne.RequiredSettlementStage != SettlementStageVillage || wallTwo.RequiredSettlementStage != SettlementStageCity || wallThree.RequiredSettlementStage != SettlementStageKingdom {
		t.Fatalf("gates da Muralha inválidos: %s/%s/%s", wallOne.RequiredSettlementStage, wallTwo.RequiredSettlementStage, wallThree.RequiredSettlementStage)
	}
	if !SettlementStageAtLeast(SettlementStageKingdom, SettlementStageCity) || SettlementStageAtLeast(SettlementStageVillage, SettlementStageCity) {
		t.Fatal("ordenação de estágios defensivos inválida")
	}
}
