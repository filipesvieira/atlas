package game

import (
	"time"
)

// BuildingBlueprintProgress define o progresso de descoberta de uma construção por manuais.
type BuildingBlueprintProgress struct {
	BuildingKey      string    `json:"building_key"`
	UnlockedMaxLevel int       `json:"unlocked_max_level"`
	SourceKey        string    `json:"source_key,omitempty"`
	DiscoveredAt     time.Time `json:"discovered_at"`
}

// BuildingSlot representa uma instância persistente de construção. SlotKey é mantido como ID legado; TileX/TileY governam o layout V2 livre.
type BuildingSlot struct {
	SlotKey            string     `json:"slot_key"`
	BuildingKey        string     `json:"building_key"`
	Level              int        `json:"level"`
	UpgradeTargetLevel int        `json:"upgrade_target_level,omitempty"`
	UpgradeStartedAt   *time.Time `json:"upgrade_started_at,omitempty"`
	UpgradeEndsAt      *time.Time `json:"upgrade_ends_at,omitempty"`
	TileX              int        `json:"tile_x"`
	TileY              int        `json:"tile_y"`
	Rotation           int        `json:"rotation"`
	Discovered         bool       `json:"-"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// CampState encapsula o estado completo do acampamento de um personagem.
type CampState struct {
	CharacterID             string                               `json:"character_id"`
	LayoutVersion           int                                  `json:"layout_version"`
	StateRevision           int64                                `json:"state_revision"`
	StorageUsed             int64                                `json:"storage_used"`
	StorageCapacity         int64                                `json:"storage_capacity"`
	Buildings               map[string]BuildingSlot              `json:"buildings"`
	Blueprints              map[string]BuildingBlueprintProgress `json:"blueprints,omitempty"`
	ActiveConstructionSlots int                                  `json:"active_construction_slots"`
	MaxConstructionSlots    int                                  `json:"max_construction_slots"`
}

// BuildingEffect representa um modificador numérico gerado por uma construção.
type BuildingEffect struct {
	Key   string  `json:"key"`
	Value float64 `json:"value"`
}

// BuildingRequirement define um pré-requisito de nível de outra construção.
type BuildingRequirement struct {
	BuildingKey string `json:"building_key"`
	MinLevel    int    `json:"min_level"`
}

// BuildingLevelDefinition especifica os requisitos e benefícios de um nível de construção.
type BuildingLevelDefinition struct {
	Level                   int                   `json:"level"`
	RequiredSettlementStage string                `json:"required_settlement_stage,omitempty"`
	GoldCost                int64                 `json:"gold_cost"`
	Costs                   []ResourceAmount      `json:"costs"`
	BuildDuration           time.Duration         `json:"build_duration"`
	BuildDurationSeconds    int64                 `json:"build_duration_seconds"`
	Effects                 []BuildingEffect      `json:"effects"`
	RequiredTrophies        []ResourceAmount      `json:"required_trophies,omitempty"`
	RequiredBuildings       []BuildingRequirement `json:"required_buildings,omitempty"`
}

// BuildingDefinition define os metadados de um tipo de construção.
const (
	BuildingPlacementFree      = "free"
	BuildingPlacementPerimeter = "perimeter"
)

// BuildingDefinition define os metadados de um tipo de construção.
type BuildingDefinition struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	// SlotType é mantido no catálogo para compatibilidade com clientes antigos.
	// No layout V2 a posição física vem de BuildingSlot.TileX/TileY.
	SlotType        string                    `json:"slot_type"`
	PlacementMode   string                    `json:"placement_mode,omitempty"`
	UnlockStage     string                    `json:"unlock_stage,omitempty"`
	DefaultUnlocked bool                      `json:"default_unlocked"`
	MaxLevel        int                       `json:"max_level"`
	Levels          []BuildingLevelDefinition `json:"levels"`
}
