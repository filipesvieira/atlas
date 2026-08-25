package game

import (
	"fmt"
	"hash/fnv"
)

const (
	CampLayoutVersion = 3
	CampGridWidth     = 24
	CampGridHeight    = 18
)

// BuildingGridFootprint descreve quantos tiles isométricos uma construção ocupa.
// A rotação 90/270 graus troca largura e altura.
type BuildingGridFootprint struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

var defaultCampPlacements = map[string][2]int{
	"west":   {6, 8},
	"north":  {10, 5},
	"east":   {14, 8},
	"center": {10, 8},
	"south":  {12, 10},
}

var buildingGridFootprints = map[string]BuildingGridFootprint{
	"campfire":       {Width: 2, Height: 2},
	"arcane_spring":  {Width: 2, Height: 2},
	"adventurer_hut": {Width: 3, Height: 3},
	"warehouse":      {Width: 3, Height: 3},
	"workbench":      {Width: 2, Height: 2},
	"kitchen":        {Width: 3, Height: 2},
	"alchemy_bench":  {Width: 3, Height: 2},
}

func GetDefaultCampPlacement(slotKey string) (int, int) {
	if pos, ok := defaultCampPlacements[slotKey]; ok {
		return pos[0], pos[1]
	}
	return 0, 0
}

func GetBuildingGridFootprint(buildingKey string, rotation int) BuildingGridFootprint {
	fp, ok := buildingGridFootprints[buildingKey]
	if !ok {
		fp = BuildingGridFootprint{Width: 2, Height: 2}
	}
	if rotation%2 != 0 {
		fp.Width, fp.Height = fp.Height, fp.Width
	}
	return fp
}

func ValidateCampPlacement(buildingKey string, tileX, tileY, rotation int, occupied []BuildingSlot, movingSlotKey string) error {
	if rotation < 0 || rotation > 3 {
		return fmt.Errorf("rotação inválida")
	}
	fp := GetBuildingGridFootprint(buildingKey, rotation)
	if tileX < 0 || tileY < 0 || tileX+fp.Width > CampGridWidth || tileY+fp.Height > CampGridHeight {
		return fmt.Errorf("a construção ficaria fora dos limites do terreno")
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

// FindFirstFreeCampPlacement encontra uma posição inicial não sobreposta para um novo projeto.
// A posição é apenas um ponto de partida: enquanto estiver no nível 0 o jogador pode
// arrastar o projeto livremente antes de iniciar a obra.
func FindFirstFreeCampPlacement(buildingKey string, rotation int, occupied []BuildingSlot) (int, int, bool) {
	fp := GetBuildingGridFootprint(buildingKey, rotation)
	centerX := (CampGridWidth - fp.Width) / 2
	centerY := (CampGridHeight - fp.Height) / 2
	maxRadius := CampGridWidth + CampGridHeight

	// Procura do centro para as bordas para que novos projetos apareçam perto
	// da vila existente, sem obrigar o jogador a arrastá-los desde o canto 0,0.
	for radius := 0; radius <= maxRadius; radius++ {
		for y := 0; y <= CampGridHeight-fp.Height; y++ {
			for x := 0; x <= CampGridWidth-fp.Width; x++ {
				distance := absInt(x-centerX) + absInt(y-centerY)
				if distance != radius {
					continue
				}
				if ValidateCampPlacement(buildingKey, x, y, rotation, occupied, "") == nil {
					return x, y, true
				}
			}
		}
	}
	return 0, 0, false
}

func absInt(value int) int {
	if value < 0 {
		return -value
	}
	return value
}
