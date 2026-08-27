package game

import "fmt"

// ArenaTileFlags descreve propriedades combináveis de um tile. Apenas
// ArenaTileSolid interfere no movimento nesta primeira entrega; as demais
// flags formam o contrato para terrenos dinâmicos das próximas fases.
type ArenaTileFlags uint16

const (
	ArenaTileSolid ArenaTileFlags = 1 << iota
	ArenaTileWater
	ArenaTileMud
	ArenaTileFire
	ArenaTilePoison
	ArenaTilePreferredPath
	ArenaTilePortal
)

func (flags ArenaTileFlags) Has(expected ArenaTileFlags) bool {
	return flags&expected != 0
}

// ArenaTerrainGrid é imutável depois do startup e compartilhada por todas as
// sessões da região. O índice plano y*Width+x evita slices aninhados e torna a
// consulta independente da quantidade de objetos existentes no cenário.
type ArenaTerrainGrid struct {
	Width  int
	Height int
	cells  []ArenaTileFlags
}

func (grid ArenaTerrainGrid) InBounds(x, y int) bool {
	return x >= 0 && x < grid.Width && y >= 0 && y < grid.Height
}

func (grid ArenaTerrainGrid) FlagsAt(x, y int) ArenaTileFlags {
	if !grid.InBounds(x, y) {
		return ArenaTileSolid
	}
	return grid.cells[y*grid.Width+x]
}

type arenaTerrainRect struct {
	x      int
	y      int
	width  int
	height int
	flags  ArenaTileFlags
}

type arenaTerrainDefinition struct {
	width  int
	height int
	tiles  []arenaTerrainRect
}

// O formato autoral permanece legível para quem constrói a fase. A grade
// otimizada é um detalhe compilado e nunca deve virar o formato de edição.
var arenaTerrainDefinitions = map[string]arenaTerrainDefinition{
	"forest": {
		width: GridWidth, height: GridHeight,
		tiles: []arenaTerrainRect{
			// Árvores.
			{x: 1, y: 3, width: 1, height: 1, flags: ArenaTileSolid}, {x: 3, y: 15, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 6, y: 16, width: 1, height: 1, flags: ArenaTileSolid}, {x: 17, y: 1, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 21, y: 4, width: 1, height: 1, flags: ArenaTileSolid}, {x: 22, y: 11, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 20, y: 16, width: 1, height: 1, flags: ArenaTileSolid}, {x: 7, y: 3, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 18, y: 2, width: 1, height: 1, flags: ArenaTileSolid}, {x: 22, y: 8, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 12, y: 16, width: 1, height: 1, flags: ArenaTileSolid}, {x: 5, y: 14, width: 1, height: 1, flags: ArenaTileSolid},
			// Pedras, tronco e placa.
			{x: 4, y: 5, width: 1, height: 1, flags: ArenaTileSolid}, {x: 5, y: 13, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 18, y: 4, width: 1, height: 1, flags: ArenaTileSolid}, {x: 21, y: 13, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 15, y: 3, width: 1, height: 1, flags: ArenaTileSolid}, {x: 2, y: 11, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 11, y: 4, width: 1, height: 1, flags: ArenaTileSolid}, {x: 7, y: 13, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 3, y: 9, width: 1, height: 1, flags: ArenaTileSolid}, {x: 19, y: 9, width: 1, height: 1, flags: ArenaTileSolid},
			// Fogueira central: o efeito é decorativo, a base ocupa estes tiles.
			{x: 12, y: 9, width: 2, height: 2, flags: ArenaTileSolid},
		},
	},
	"shereque": {
		width: GridWidth, height: GridHeight,
		tiles: []arenaTerrainRect{
			// Cabana, raízes grossas, letreiro e fogueira da vila.
			{x: 16, y: 4, width: 5, height: 4, flags: ArenaTileSolid},
			{x: 5, y: 4, width: 1, height: 1, flags: ArenaTileSolid}, {x: 19, y: 13, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 14, y: 15, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 5, y: 14, width: 1, height: 1, flags: ArenaTileSolid},
			{x: 11, y: 9, width: 2, height: 2, flags: ArenaTileSolid},
		},
	},
}

var arenaTerrainGrids = mustCompileArenaTerrainGrids(arenaTerrainDefinitions)
var defaultArenaTerrainGrid = ArenaTerrainGrid{
	Width: GridWidth, Height: GridHeight, cells: make([]ArenaTileFlags, GridWidth*GridHeight),
}

func compileArenaTerrainGrid(definition arenaTerrainDefinition) (ArenaTerrainGrid, error) {
	if definition.width <= 0 || definition.height <= 0 {
		return ArenaTerrainGrid{}, fmt.Errorf("dimensões inválidas da arena: %dx%d", definition.width, definition.height)
	}
	grid := ArenaTerrainGrid{
		Width:  definition.width,
		Height: definition.height,
		cells:  make([]ArenaTileFlags, definition.width*definition.height),
	}
	for index, tile := range definition.tiles {
		if tile.width <= 0 || tile.height <= 0 || tile.flags == 0 {
			return ArenaTerrainGrid{}, fmt.Errorf("retângulo de terreno %d inválido", index)
		}
		if tile.x < 0 || tile.y < 0 || tile.x+tile.width > definition.width || tile.y+tile.height > definition.height {
			return ArenaTerrainGrid{}, fmt.Errorf("retângulo de terreno %d fora da arena", index)
		}
		for y := tile.y; y < tile.y+tile.height; y++ {
			for x := tile.x; x < tile.x+tile.width; x++ {
				grid.cells[y*grid.Width+x] |= tile.flags
			}
		}
	}
	return grid, nil
}

func mustCompileArenaTerrainGrids(definitions map[string]arenaTerrainDefinition) map[string]ArenaTerrainGrid {
	grids := make(map[string]ArenaTerrainGrid, len(definitions))
	for region, definition := range definitions {
		grid, err := compileArenaTerrainGrid(definition)
		if err != nil {
			panic(fmt.Sprintf("arena %s inválida: %v", region, err))
		}
		grids[region] = grid
	}
	return grids
}

func arenaTerrainGridForRegion(region string) ArenaTerrainGrid {
	if grid, exists := arenaTerrainGrids[region]; exists {
		return grid
	}
	// Regiões ainda não convertidas mantêm a arena 24x18 livre, preservando o
	// comportamento legado até receberem uma definição própria.
	return defaultArenaTerrainGrid
}

func arenaTileFlagsAt(region string, x, y int) ArenaTileFlags {
	return arenaTerrainGridForRegion(region).FlagsAt(x, y)
}

func arenaDimensionsForRegion(region string) (int, int) {
	grid := arenaTerrainGridForRegion(region)
	return grid.Width, grid.Height
}

func (s *GameSession) arenaDimensions() (int, int) {
	if s == nil {
		return GridWidth, GridHeight
	}
	return arenaDimensionsForRegion(s.ActiveRegion)
}

func clampArenaCoordinate(value, size int) int {
	if value < 0 {
		return 0
	}
	if value >= size {
		return size - 1
	}
	return value
}

func (s *GameSession) clampArenaX(x int) int {
	width, _ := s.arenaDimensions()
	return clampArenaCoordinate(x, width)
}

func (s *GameSession) clampArenaY(y int) int {
	_, height := s.arenaDimensions()
	return clampArenaCoordinate(y, height)
}