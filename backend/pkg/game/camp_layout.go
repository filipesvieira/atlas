package game

import (
	"fmt"
	"hash/fnv"
)

const (
	// Layout V5 amplia somente o Reino e preserva a arena de combate. O grid
	// máximo existe desde o início no save, mas somente uma região central é
	// construtível em cada estágio da comunidade.
	CampLayoutVersion = 5
	CampGridWidth     = 52
	CampGridHeight    = 38
	// V3 -> V4 centralizou o antigo terreno 24x18 no mundo 44x32.
	CampLegacyOffsetX = 10
	CampLegacyOffsetY = 7
	// V4 -> V5 centraliza o mundo 44x32 dentro do novo Reino 52x38.
	CampV4OffsetX = 4
	CampV4OffsetY = 3
)

// CampBuildBounds delimita a área desbloqueada dentro do mundo máximo V5.
// MaxX/MaxY são exclusivos para manter as validações de footprint simples.
type CampBuildBounds struct {
	MinX int `json:"min_x"`
	MinY int `json:"min_y"`
	MaxX int `json:"max_x"`
	MaxY int `json:"max_y"`
}

func (b CampBuildBounds) Width() int  { return b.MaxX - b.MinX }
func (b CampBuildBounds) Height() int { return b.MaxY - b.MinY }

type SettlementTerritoryStageContract struct {
	Key    string `json:"key"`
	Name   string `json:"name"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type SettlementTerritoryContract struct {
	LayoutVersion int                                `json:"layout_version"`
	WorldWidth    int                                `json:"world_width"`
	WorldHeight   int                                `json:"world_height"`
	Stages        []SettlementTerritoryStageContract `json:"stages"`
}

// CurrentSettlementTerritoryContract é a fonte autoritativa consumida pelo
// frontend. O cliente calcula bounds centrais a partir deste contrato e não
// mantém uma segunda tabela manual de dimensões.
func CurrentSettlementTerritoryContract() SettlementTerritoryContract {
	stages := SettlementStageDefinitions()
	out := SettlementTerritoryContract{
		LayoutVersion: CampLayoutVersion,
		WorldWidth:    CampGridWidth,
		WorldHeight:   CampGridHeight,
		Stages:        make([]SettlementTerritoryStageContract, 0, len(stages)),
	}
	for _, stage := range stages {
		out.Stages = append(out.Stages, SettlementTerritoryStageContract{
			Key: stage.Key, Name: stage.Name, Width: stage.TerritoryWidth, Height: stage.TerritoryHeight,
		})
	}
	return out
}

var settlementBuildBounds = map[string]CampBuildBounds{
	SettlementStageCamp:    {MinX: 14, MinY: 10, MaxX: 38, MaxY: 28}, // 24x18
	SettlementStageOutpost: {MinX: 12, MinY: 9, MaxX: 40, MaxY: 29},  // 28x20
	SettlementStageHamlet:  {MinX: 10, MinY: 8, MaxX: 42, MaxY: 30},  // 32x22
	SettlementStageVillage: {MinX: 8, MinY: 7, MaxX: 44, MaxY: 31},   // 36x24
	SettlementStageCity:    {MinX: 6, MinY: 5, MaxX: 46, MaxY: 33},   // 40x28
	SettlementStageKingdom: {MinX: 0, MinY: 0, MaxX: 52, MaxY: 38},   // 52x38
}

func SettlementBuildBounds(stageKey string) CampBuildBounds {
	if bounds, ok := settlementBuildBounds[stageKey]; ok {
		return bounds
	}
	return settlementBuildBounds[SettlementStageCamp]
}

// ShiftLegacyCampTile converte uma coordenada do layout V3 (24x18, origem
// local) para o mundo V4 sem alterar relações espaciais entre construções.
func ShiftLegacyCampTile(tileX, tileY int) (int, int) {
	return tileX + CampLegacyOffsetX, tileY + CampLegacyOffsetY
}

// ShiftV4CampTile converte coordenadas do mundo V4 (44x32) para V5 (52x38)
// preservando 100% das relações espaciais do layout do jogador.
func ShiftV4CampTile(tileX, tileY int) (int, int) {
	return tileX + CampV4OffsetX, tileY + CampV4OffsetY
}

// BuildingGridFootprint descreve quantos tiles isométricos uma construção ocupa.
// A rotação 90/270 graus troca largura e altura.
type BuildingGridFootprint struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

var defaultCampPlacements = map[string][2]int{
	// Mesmas posições relativas do V4, deslocadas +4/+3 para a área central V5.
	"west":   {20, 18},
	"north":  {24, 15},
	"east":   {28, 18},
	"center": {24, 18},
	"south":  {26, 20},
}

var buildingGridFootprints = map[string]BuildingGridFootprint{
	"campfire":          {Width: 2, Height: 2},
	"arcane_spring":     {Width: 2, Height: 2},
	"adventurer_hut":    {Width: 3, Height: 3},
	"warehouse":         {Width: 3, Height: 3},
	"workbench":         {Width: 2, Height: 2},
	"kitchen":           {Width: 3, Height: 2},
	"alchemy_bench":     {Width: 3, Height: 2},
	"watchtower":        {Width: 3, Height: 3},
	"barracks":          {Width: 4, Height: 3},
	"vault":             {Width: 3, Height: 3},
	"infirmary":         {Width: 3, Height: 3},
	"prison":            {Width: 3, Height: 3},
	"engineer_workshop": {Width: 4, Height: 3},
	"war_room":          {Width: 4, Height: 3},
	"resonator":         {Width: 3, Height: 3},
}

func GetDefaultCampPlacement(slotKey string) (int, int) {
	if pos, ok := defaultCampPlacements[slotKey]; ok {
		return pos[0], pos[1]
	}
	bounds := SettlementBuildBounds(SettlementStageCamp)
	return bounds.MinX, bounds.MinY
}

func GetBuildingGridFootprint(buildingKey string, rotation int) BuildingGridFootprint {
	if IsPerimeterBuilding(buildingKey) {
		return BuildingGridFootprint{}
	}
	fp, ok := buildingGridFootprints[buildingKey]
	if !ok {
		fp = BuildingGridFootprint{Width: 2, Height: 2}
	}
	if rotation%2 != 0 {
		fp.Width, fp.Height = fp.Height, fp.Width
	}
	return fp
}

// ValidateCampPlacementForStage mantém o servidor autoritativo para a área
// desbloqueada. Um cliente não pode construir na futura Cidade/Reino apenas
// enviando coordenadas válidas do grid máximo.
func ValidateCampPlacementForStage(stageKey, buildingKey string, tileX, tileY, rotation int, occupied []BuildingSlot, movingSlotKey string) error {
	if rotation < 0 || rotation > 3 {
		return fmt.Errorf("rotação inválida")
	}
	bounds := SettlementBuildBounds(stageKey)
	fp := GetBuildingGridFootprint(buildingKey, rotation)
	if tileX < bounds.MinX || tileY < bounds.MinY || tileX+fp.Width > bounds.MaxX || tileY+fp.Height > bounds.MaxY {
		return fmt.Errorf("a construção ficaria fora da área liberada do assentamento")
	}

	for _, other := range occupied {
		if other.SlotKey == movingSlotKey {
			continue
		}
		if other.Level <= 0 && other.UpgradeTargetLevel <= 0 && !other.Discovered && other.BuildingKey != "campfire" {
			continue
		}
		otherFP := GetBuildingGridFootprint(other.BuildingKey, other.Rotation)
		if rectanglesOverlap(tileX, tileY, fp.Width, fp.Height, other.TileX, other.TileY, otherFP.Width, otherFP.Height) {
			return fmt.Errorf("posição ocupada por %s", other.BuildingKey)
		}
	}
	return nil
}

// ValidateCampPlacement é mantida para utilitários/testes que trabalham com o
// mundo máximo. Fluxos de jogador devem preferir ValidateCampPlacementForStage.
func ValidateCampPlacement(buildingKey string, tileX, tileY, rotation int, occupied []BuildingSlot, movingSlotKey string) error {
	return ValidateCampPlacementForStage(SettlementStageKingdom, buildingKey, tileX, tileY, rotation, occupied, movingSlotKey)
}

func rectanglesOverlap(ax, ay, aw, ah, bx, by, bw, bh int) bool {
	return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by
}

// CampBuildingInstanceKey preserva os ids legados dos cinco prédios atuais e
// gera um id estável para qualquer construção adicionada ao catálogo no futuro.
// slot_key passa a ser tratado como identificador de instância, não posição física.
func CampBuildingInstanceKey(buildingKey string) string {
	for slotKey, mappedBuilding := range SlotToBuildingMap {
		if mappedBuilding == buildingKey {
			return slotKey
		}
	}
	if len(buildingKey) <= 40 {
		return buildingKey
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(buildingKey))
	return fmt.Sprintf("%.31s_%08x", buildingKey, h.Sum32())
}

// FindFirstFreeCampPlacementForStage encontra uma posição inicial apenas na
// área já liberada pelo estágio atual, partindo do centro para as bordas.
func FindFirstFreeCampPlacementForStage(stageKey, buildingKey string, rotation int, occupied []BuildingSlot) (int, int, bool) {
	fp := GetBuildingGridFootprint(buildingKey, rotation)
	bounds := SettlementBuildBounds(stageKey)
	if IsPerimeterBuilding(buildingKey) {
		return bounds.MinX + bounds.Width()/2, bounds.MinY + bounds.Height()/2, true
	}
	centerX := bounds.MinX + (bounds.Width()-fp.Width)/2
	centerY := bounds.MinY + (bounds.Height()-fp.Height)/2
	maxRadius := bounds.Width() + bounds.Height()

	for radius := 0; radius <= maxRadius; radius++ {
		for y := bounds.MinY; y <= bounds.MaxY-fp.Height; y++ {
			for x := bounds.MinX; x <= bounds.MaxX-fp.Width; x++ {
				distance := absInt(x-centerX) + absInt(y-centerY)
				if distance != radius {
					continue
				}
				if ValidateCampPlacementForStage(stageKey, buildingKey, x, y, rotation, occupied, "") == nil {
					return x, y, true
				}
			}
		}
	}
	return 0, 0, false
}

func FindFirstFreeCampPlacement(buildingKey string, rotation int, occupied []BuildingSlot) (int, int, bool) {
	return FindFirstFreeCampPlacementForStage(SettlementStageKingdom, buildingKey, rotation, occupied)
}

func absInt(value int) int {
	if value < 0 {
		return -value
	}
	return value
}
