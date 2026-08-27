package game

import "testing"

func TestCompileArenaTerrainGridCombinesFlags(t *testing.T) {
	grid, err := compileArenaTerrainGrid(arenaTerrainDefinition{
		width: 4, height: 3,
		tiles: []arenaTerrainRect{
			{x: 1, y: 1, width: 2, height: 1, flags: ArenaTileWater},
			{x: 2, y: 1, width: 1, height: 1, flags: ArenaTileSolid | ArenaTileMud},
		},
	})
	if err != nil {
		t.Fatalf("não deveria falhar ao compilar terreno válido: %v", err)
	}
	if !grid.FlagsAt(1, 1).Has(ArenaTileWater) {
		t.Fatal("o tile de água deveria preservar sua flag")
	}
	overlap := grid.FlagsAt(2, 1)
	if !overlap.Has(ArenaTileWater) || !overlap.Has(ArenaTileSolid) || !overlap.Has(ArenaTileMud) {
		t.Fatalf("flags sobrepostas deveriam ser combinadas, obtido %b", overlap)
	}
	if !grid.FlagsAt(-1, 1).Has(ArenaTileSolid) {
		t.Fatal("fora da arena deve ser tratado como sólido")
	}
}

func TestCompileArenaTerrainGridRejectsInvalidRectangle(t *testing.T) {
	_, err := compileArenaTerrainGrid(arenaTerrainDefinition{
		width: 4, height: 3,
		tiles: []arenaTerrainRect{{x: 3, y: 2, width: 2, height: 1, flags: ArenaTileSolid}},
	})
	if err == nil {
		t.Fatal("um retângulo fora dos limites deveria invalidar a arena")
	}
}

func TestForestTerrainGridContainsEveryRenderedTree(t *testing.T) {
	treeTiles := [][2]int{
		{1, 3}, {3, 15}, {6, 16}, {17, 1}, {21, 4}, {22, 11},
		{20, 16}, {7, 3}, {18, 2}, {22, 8}, {12, 16}, {5, 14},
	}
	grid := arenaTerrainGridForRegion("forest")
	for _, tile := range treeTiles {
		if !grid.FlagsAt(tile[0], tile[1]).Has(ArenaTileSolid) {
			t.Fatalf("árvore visual em (%d,%d) não foi compilada como sólida", tile[0], tile[1])
		}
	}
}

func TestSherequeTerrainGridContainsSignAndHut(t *testing.T) {
	grid := arenaTerrainGridForRegion("shereque")
	for _, tile := range [][2]int{{5, 14}, {16, 4}, {20, 7}} {
		if !grid.FlagsAt(tile[0], tile[1]).Has(ArenaTileSolid) {
			t.Fatalf("objeto de Shereque em (%d,%d) deveria ser sólido", tile[0], tile[1])
		}
	}
}

func TestArenaHelpersSupportLargerRegionalDimensions(t *testing.T) {
	nextX, nextY := stepGridTowardWithin(23, 17, 35, 25, 40, 30)
	if nextX != 24 || nextY != 18 {
		t.Fatalf("movimento deveria usar os limites regionais maiores: (%d,%d)", nextX, nextY)
	}
	spawnX, spawnY := arenaSpawnPointWithin(40, 30, 0)
	if spawnX != 38 || spawnY != 1 {
		t.Fatalf("spawn deveria acompanhar a dimensão regional: (%d,%d)", spawnX, spawnY)
	}
}

func BenchmarkArenaTerrainGridLookup(b *testing.B) {
	grid := arenaTerrainGridForRegion("forest")
	b.ResetTimer()
	for index := 0; index < b.N; index++ {
		_ = grid.FlagsAt(index%grid.Width, (index/grid.Width)%grid.Height)
	}
}