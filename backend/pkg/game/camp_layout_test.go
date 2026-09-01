package game

import "testing"

func TestValidateCampPlacementRejectsOverlap(t *testing.T) {
	occupied := []BuildingSlot{{SlotKey: "west", BuildingKey: "adventurer_hut", Level: 1, TileX: 16, TileY: 14}}
	if err := ValidateCampPlacementForStage(SettlementStageCamp, "warehouse", 17, 15, 0, occupied, "east"); err == nil {
		t.Fatal("esperava colisão entre footprints")
	}
}

func TestValidateCampPlacementAllowsMovingOwnBuilding(t *testing.T) {
	occupied := []BuildingSlot{{SlotKey: "west", BuildingKey: "adventurer_hut", Level: 1, TileX: 16, TileY: 14}}
	if err := ValidateCampPlacementForStage(SettlementStageCamp, "adventurer_hut", 16, 14, 0, occupied, "west"); err != nil {
		t.Fatalf("a própria construção não deveria colidir consigo: %v", err)
	}
}

func TestValidateCampPlacementRejectsOutsideUnlockedStage(t *testing.T) {
	// É uma coordenada válida no mundo 52x38, mas ainda bloqueada no Acampamento.
	if err := ValidateCampPlacementForStage(SettlementStageCamp, "warehouse", 2, 2, 0, nil, "east"); err == nil {
		t.Fatal("acampamento não deveria construir na futura área de Reino")
	}
	if err := ValidateCampPlacementForStage(SettlementStageKingdom, "warehouse", 2, 2, 0, nil, "east"); err != nil {
		t.Fatalf("Reino deveria liberar a mesma coordenada: %v", err)
	}
}

func TestValidateCampPlacementTreatsDiscoveredBlueprintAsOccupiedBeforeBuild(t *testing.T) {
	occupied := []BuildingSlot{{SlotKey: "north", BuildingKey: "arcane_spring", Level: 0, Discovered: true, TileX: 16, TileY: 12}}
	if err := ValidateCampPlacementForStage(SettlementStageCamp, "campfire", 16, 12, 0, occupied, "center"); err == nil {
		t.Fatal("projeto descoberto ainda não construído deve reservar seu footprint")
	}
}

func TestFindFirstFreeCampPlacementAvoidsDiscoveredFoundations(t *testing.T) {
	bounds := SettlementBuildBounds(SettlementStageCamp)
	occupied := []BuildingSlot{
		{SlotKey: "center", BuildingKey: "campfire", Level: 1, TileX: bounds.MinX, TileY: bounds.MinY, Discovered: true},
		{SlotKey: "future", BuildingKey: "warehouse", Level: 0, TileX: bounds.MinX + 2, TileY: bounds.MinY, Discovered: true},
	}
	x, y, ok := FindFirstFreeCampPlacementForStage(SettlementStageCamp, "adventurer_hut", 0, occupied)
	if !ok {
		t.Fatal("esperava uma posição livre")
	}
	if err := ValidateCampPlacementForStage(SettlementStageCamp, "adventurer_hut", x, y, 0, occupied, ""); err != nil {
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

func TestExpandedCampGridV4(t *testing.T) {
	if CampGridWidth != 52 || CampGridHeight != 38 || CampLayoutVersion != 5 {
		t.Fatalf("grid V5 = %dx%d v%d; esperado 52x38 v5", CampGridWidth, CampGridHeight, CampLayoutVersion)
	}
	camp := SettlementBuildBounds(SettlementStageCamp)
	kingdom := SettlementBuildBounds(SettlementStageKingdom)
	if camp.Width() != 24 || camp.Height() != 18 {
		t.Fatalf("Acampamento deveria preservar 24x18, recebeu %dx%d", camp.Width(), camp.Height())
	}
	if kingdom.Width() != 52 || kingdom.Height() != 38 {
		t.Fatalf("Reino deveria liberar 52x38, recebeu %dx%d", kingdom.Width(), kingdom.Height())
	}
}

func TestLegacyV3CoordinatesShiftWithoutChangingRelativeDistance(t *testing.T) {
	aX, aY := ShiftLegacyCampTile(6, 8)
	bX, bY := ShiftLegacyCampTile(14, 8)
	if aX != 16 || aY != 15 || bX != 24 || bY != 15 {
		t.Fatalf("offset V3->V4 incorreto: A=%d,%d B=%d,%d", aX, aY, bX, bY)
	}
	if (bX-aX) != 8 || (bY-aY) != 0 {
		t.Fatal("migração alterou distância relativa")
	}
}

func TestFindFirstFreeCampPlacementPrefersStageCenter(t *testing.T) {
	x, y, ok := FindFirstFreeCampPlacementForStage(SettlementStageCamp, "kitchen", 0, nil)
	if !ok {
		t.Fatal("esperava posição livre para cozinha")
	}
	fp := GetBuildingGridFootprint("kitchen", 0)
	bounds := SettlementBuildBounds(SettlementStageCamp)
	centerX := bounds.MinX + (bounds.Width()-fp.Width)/2
	centerY := bounds.MinY + (bounds.Height()-fp.Height)/2
	if x != centerX || y != centerY {
		t.Fatalf("primeira posição livre = (%d,%d); esperado centro (%d,%d)", x, y, centerX, centerY)
	}
}

func TestAlphaBuildingsAreVisibleWithoutManuals(t *testing.T) {
	for _, key := range []string{"campfire", "warehouse", "adventurer_hut", "arcane_spring", "workbench", "kitchen", "alchemy_bench"} {
		definition, ok := GetBuildingDefinition(key)
		if !ok {
			t.Fatalf("construção básica ausente: %s", key)
		}
		if !definition.DefaultUnlocked {
			t.Errorf("construção básica %s deveria estar liberada na alpha", key)
		}
	}
}
func TestM5BDefenseCatalogFitsCityAndKingdomQA(t *testing.T) {
	for _, stage := range []string{SettlementStageCity, SettlementStageKingdom} {
		occupied := []BuildingSlot{}
		placed := 0
		for _, definition := range ListBuildingDefinitions() {
			if !definition.DefaultUnlocked && !BuildingUnlocksAtStage(definition, stage) {
				continue
			}
			if BuildingMaxLevelForStage(definition, stage) <= 0 {
				continue
			}
			x, y, ok := FindFirstFreeCampPlacementForStage(stage, definition.Key, 0, occupied)
			if !ok {
				t.Fatalf("%s não encontrou espaço para %s", stage, definition.Key)
			}
			occupied = append(occupied, BuildingSlot{
				SlotKey:     CampBuildingInstanceKey(definition.Key),
				BuildingKey: definition.Key,
				Level:       BuildingMaxLevelForStage(definition, stage),
				TileX:       x,
				TileY:       y,
				Discovered:  true,
			})
			placed++
		}
		if placed < 15 {
			t.Fatalf("%s deveria materializar o catálogo M5-B; apenas %d construções foram posicionadas", stage, placed)
		}
	}
}

func TestM5BPerimeterBuildingsDoNotConsumeFreeLots(t *testing.T) {
	for _, key := range []string{"wall", "gate"} {
		if !IsPerimeterBuilding(key) {
			t.Fatalf("%s deveria ser fortificação de perímetro", key)
		}
		fp := GetBuildingGridFootprint(key, 0)
		if fp.Width != 0 || fp.Height != 0 {
			t.Fatalf("%s ocupa lote %dx%d; esperado footprint 0x0 de controle", key, fp.Width, fp.Height)
		}
	}
}

func TestShiftV4CampTilePreservesDistance(t *testing.T) {
	aX, aY := ShiftV4CampTile(6, 9)
	bX, bY := ShiftV4CampTile(18, 15)
	if aX != 10 || aY != 12 || bX != 22 || bY != 18 {
		t.Fatalf("offset V4->V5 inesperado: A=%d,%d B=%d,%d", aX, aY, bX, bY)
	}
	if (bX-aX) != 12 || (bY-aY) != 6 {
		t.Fatalf("migração V5 alterou distância relativa")
	}
}

func TestKingdomTerritoryHasMeaningfulScaleJump(t *testing.T) {
	city := SettlementBuildBounds(SettlementStageCity)
	kingdom := SettlementBuildBounds(SettlementStageKingdom)
	cityArea := city.Width() * city.Height()
	kingdomArea := kingdom.Width() * kingdom.Height()
	if float64(kingdomArea)/float64(cityArea) < 1.70 {
		t.Fatalf("salto Cidade->Reino insuficiente: city=%d kingdom=%d ratio=%.2f", cityArea, kingdomArea, float64(kingdomArea)/float64(cityArea))
	}
}

func TestSettlementTerritoryContractMatchesBounds(t *testing.T) {
	contract := CurrentSettlementTerritoryContract()
	if contract.LayoutVersion != CampLayoutVersion || contract.WorldWidth != CampGridWidth || contract.WorldHeight != CampGridHeight {
		t.Fatalf("contrato territorial divergente: %+v", contract)
	}
	for _, stage := range contract.Stages {
		bounds := SettlementBuildBounds(stage.Key)
		if bounds.Width() != stage.Width || bounds.Height() != stage.Height {
			t.Fatalf("stage %s divergiu: contract=%dx%d bounds=%dx%d", stage.Key, stage.Width, stage.Height, bounds.Width(), bounds.Height())
		}
	}
}
