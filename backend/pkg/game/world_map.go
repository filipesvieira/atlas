package game

import (
	"math"
	"time"
)

const (
	DefaultWorldKey         = "reino_do_avesso_1"
	DefaultWorldName        = "Reino do Avesso — Mundo 1"
	QAWorldKey              = "reino_do_avesso_qa"
	QAWorldName             = "Reino do Avesso — QA Territorial"
	WorldMapDefaultRadius   = 12
	WorldMapMaximumRadius   = 40
	WorldMapContractVersion = 1
)

type WorldCoordinate struct {
	X int `json:"x"`
	Y int `json:"y"`
}

const (
	WorldMapQAPresetSelf   = "QA_SELF"
	WorldMapQAPresetNear   = "QA_NEAR"
	WorldMapQAPresetMedium = "QA_MEDIUM"
	WorldMapQAPresetFar    = "QA_FAR"
)

var worldMapQAPresetCoordinates = map[string]WorldCoordinate{
	WorldMapQAPresetSelf:   {X: 0, Y: 0},
	WorldMapQAPresetNear:   {X: 2, Y: 1},
	WorldMapQAPresetMedium: {X: 8, Y: -4},
	WorldMapQAPresetFar:    {X: 20, Y: 15},
}

func WorldMapQACoordinate(preset string) (WorldCoordinate, bool) {
	coordinate, ok := worldMapQAPresetCoordinates[preset]
	return coordinate, ok
}

type WorldLocation struct {
	WorldID    string    `json:"world_id"`
	WorldKey   string    `json:"world_key"`
	WorldName  string    `json:"world_name"`
	X          int       `json:"x"`
	Y          int       `json:"y"`
	AssignedAt time.Time `json:"assigned_at"`
}

type TerritorialKingdomSummary struct {
	SettlementID string  `json:"settlement_id"`
	Name         string  `json:"name"`
	StageKey     string  `json:"stage_key"`
	X            int     `json:"x"`
	Y            int     `json:"y"`
	Distance     float64 `json:"distance"`
	IsSelf       bool    `json:"is_self"`
	Protected    bool    `json:"protected"`
}

type TerritorialMapSnapshot struct {
	ContractVersion int                         `json:"contract_version"`
	WorldID         string                      `json:"world_id"`
	WorldKey        string                      `json:"world_key"`
	WorldName       string                      `json:"world_name"`
	Center          WorldCoordinate             `json:"center"`
	Radius          int                         `json:"radius"`
	Kingdoms        []TerritorialKingdomSummary `json:"kingdoms"`
	GeneratedAt     time.Time                   `json:"generated_at"`
}

// WorldCoordinateForIndex produz uma espiral quadrada determinística:
// 0=(0,0), 1=(1,0), 2=(1,1), 3=(0,1), 4=(-1,1)...
func WorldCoordinateForIndex(index int64) WorldCoordinate {
	if index <= 0 {
		return WorldCoordinate{}
	}
	layer := int64(math.Ceil((math.Sqrt(float64(index+1)) - 1.0) / 2.0))
	if layer < 1 {
		layer = 1
	}
	side := 2 * layer
	maxIndex := (2*layer+1)*(2*layer+1) - 1
	offset := maxIndex - index

	switch {
	case offset <= side:
		return WorldCoordinate{X: int(layer - offset), Y: int(-layer)}
	case offset <= 2*side:
		return WorldCoordinate{X: int(-layer), Y: int(-layer + (offset - side))}
	case offset <= 3*side:
		return WorldCoordinate{X: int(-layer + (offset - 2*side)), Y: int(layer)}
	default:
		return WorldCoordinate{X: int(layer), Y: int(layer - (offset - 3*side))}
	}
}

func WorldDistance(a, b WorldCoordinate) float64 {
	dx := float64(b.X - a.X)
	dy := float64(b.Y - a.Y)
	return math.Sqrt(dx*dx + dy*dy)
}

func NormalizeWorldMapRadius(radius int) int {
	if radius <= 0 {
		return WorldMapDefaultRadius
	}
	if radius > WorldMapMaximumRadius {
		return WorldMapMaximumRadius
	}
	return radius
}
