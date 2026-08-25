package game

import "testing"

func TestValidateCampPlacementRejectsOverlap(t *testing.T) {
	occupied := []BuildingSlot{{SlotKey: "west", BuildingKey: "adventurer_hut", Level: 1, TileX: 2, TileY: 5}}
	if err := ValidateCampPlacement("warehouse", 3, 6, 0, occupied, "east"); err == nil {
		t.Fatal("esperava colisão entre footprints")
	}
}

func TestValidateCampPlacementAllowsMovingOwnBuilding(t *testing.T) {
	occupied := []BuildingSlot{{SlotKey: "west", BuildingKey: "adventurer_hut", Level: 1, TileX: 2, TileY: 5}}
	if err := ValidateCampPlacement("adventurer_hut", 2, 5, 0, occupied, "west"); err != nil {
		t.Fatalf("a própria construção não deveria colidir consigo: %v", err)
	}
}

func TestValidateCampPlacementRejectsOutOfBounds(t *testing.T) {
	if err := ValidateCampPlacement("warehouse", CampGridWidth-1, CampGridHeight-1, 0, nil, "east"); err == nil {
		t.Fatal("esperava rejeição fora do terreno")
	}
}

func TestValidateCampPlacementTreatsDiscoveredBlueprintAsOccupiedBeforeBuild(t *testing.T) {
	occupied := []BuildingSlot{{SlotKey: "north", BuildingKey: "arcane_spring", Level: 0, Discovered: true, TileX: 6, TileY: 2}}
	if err := ValidateCampPlacement("campfire", 6, 2, 0, occupied, "center"); err == nil {
		t.Fatal("projeto descoberto ainda não construído deve reservar seu footprint")
	}
}

func TestFindFirstFreeCampPlacementAvoidsDiscoveredFoundations(t *testing.T) {
	occupied := []BuildingSlot{
		{SlotKey: "center", BuildingKey: "campfire", Level: 1, TileX: 0, TileY: 0, Discovered: true},
		{SlotKey: "future", BuildingKey: "warehouse", Level: 0, TileX: 2, TileY: 0, Discovered: true},
	}
	x, y, ok := FindFirstFreeCampPlacement("adventurer_hut", 0, occupied)
	if !ok {
		t.Fatal("esperava uma posição livre")
	}
	if err := ValidateCampPlacement("adventurer_hut", x, y, 0, occupied, ""); err != nil {
		t.Fatalf("posição encontrada deveria ser válida: %v", err)
	}
}

func TestCampBuildingInstanceKeyPreservesLegacyIDs(t *testing.T) {
	if got := CampBuildingInstanceKey("warehouse"); got != "east" {
		t.Fatalf("warehouse deve preservar id legado east, obteve %q", got)
	}
	if got := CampBuildingInstanceKey("kitchen"); got != "kitchen" {
		t.Fatalf("nova construção deve usar chave estável, obteve %q", got)
	}
}

func TestKitchenFootprintRotates(t *testing.T) {
	normal := GetBuildingGridFootprint("kitchen", 0)
	rotated := GetBuildingGridFootprint("kitchen", 1)
	if normal.Width != 3 || normal.Height != 2 {
		t.Fatalf("footprint normal da cozinha = %+v; esperado 3x2", normal)
	}
	if rotated.Width != 2 || rotated.Height != 3 {
		t.Fatalf("footprint rotacionado da cozinha = %+v; esperado 2x3", rotated)
	}
}
func TestExpandedCampGridV3(t *testing.T) {
	if CampGridWidth != 24 || CampGridHeight != 18 {
		t.Fatalf("grid V3 = %dx%d; esperado 24x18", CampGridWidth, CampGridHeight)
	}
}

func TestFindFirstFreeCampPlacementPrefersCenter(t *testing.T) {
	x, y, ok := FindFirstFreeCampPlacement("kitchen", 0, nil)
	if !ok {
		t.Fatal("esperava posição livre para cozinha")
	}
	fp := GetBuildingGridFootprint("kitchen", 0)
	centerX := (CampGridWidth - fp.Width) / 2
	centerY := (CampGridHeight - fp.Height) / 2
	if x != centerX || y != centerY {
		t.Fatalf("primeira posição livre = (%d,%d); esperado centro (%d,%d)", x, y, centerX, centerY)
	}
}
