package game

import (
	"testing"
)

func TestBuildingRegistryValidation(t *testing.T) {
	if err := ValidateBuildingRegistry(); err != nil {
		t.Fatalf("ValidateBuildingRegistry falhou: %v", err)
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
}
