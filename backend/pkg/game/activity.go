package game

import "time"

type ActivityKind string

const (
	ActivityKindCombat    ActivityKind = "combat"
	ActivityKindGathering ActivityKind = "gathering"
)

type GatheringActivityState string

const (
	GatheringStateRunning        GatheringActivityState = "running"
	GatheringStateClaimable      GatheringActivityState = "claimable"
	GatheringStatePendingStorage GatheringActivityState = "pending_storage"
	GatheringStateClaimed        GatheringActivityState = "claimed"
	GatheringStateCancelled      GatheringActivityState = "cancelled"
)

type GatheringSnapshot struct {
	ProfessionLevel    int                           `json:"profession_level"`
	ToolTier           int                           `json:"tool_tier"`
	CampBonusPercent   float64                       `json:"camp_bonus_percent"`
	ContentVersion     int                           `json:"content_version"`
	Seed               int64                         `json:"seed"`
	ExpeditionSnapshot GatheringExpeditionDefinition `json:"expedition_snapshot"`
}

type GatheringActivity struct {
	ID                  string                 `json:"id"`
	CharacterID         string                 `json:"character_id"`
	ResidentID          string                 `json:"resident_id,omitempty"`
	ResidentName        string                 `json:"resident_name,omitempty"`
	ExpeditionKey       string                 `json:"expedition_key"`
	ProfessionKey       string                 `json:"profession_key"`
	State               GatheringActivityState `json:"state"`
	DurationSeconds     int64                  `json:"duration_seconds"`
	StartedAt           time.Time              `json:"started_at"`
	EndsAt              time.Time              `json:"ends_at"`
	Snapshot            GatheringSnapshot      `json:"snapshot"`
	Result              *GatheringResult       `json:"result,omitempty"`
	ProfessionXPApplied bool                   `json:"profession_xp_applied"`
	Revision            int64                  `json:"revision"`
	WageReserved        int64                  `json:"wage_reserved"`
	WagePaid            int64                  `json:"wage_paid"`
	WageRuleVersion     int                    `json:"wage_rule_version"`
}

type GatheringResult struct {
	ActivityID       string           `json:"activity_id"`
	ResidentID       string           `json:"resident_id,omitempty"`
	ResidentName     string           `json:"resident_name,omitempty"`
	ExpeditionKey    string           `json:"expedition_key"`
	ProfessionKey    string           `json:"profession_key"`
	CompletedCycles  int64            `json:"completed_cycles"`
	Rewards          []ResourceAmount `json:"rewards"`
	Accepted         []ResourceAmount `json:"accepted,omitempty"`
	Pending          []ResourceAmount `json:"pending,omitempty"`
	ProfessionXP     int64            `json:"profession_xp"`
	ProfessionBefore int              `json:"profession_level_before"`
	ProfessionAfter  int              `json:"profession_level_after"`
	WasCancelled     bool             `json:"was_cancelled"`
	WageReserved     int64            `json:"wage_reserved"`
	WagePaid         int64            `json:"wage_paid"`
	WageRefunded     int64            `json:"wage_refunded"`
}

// PendingResourceBatch preserva a procedência da carga segura. A lista
// agregada antiga continua no contrato por retrocompatibilidade, enquanto a UI
// nova consegue explicar se a carga veio de combate offline, coleta ou craft.
type PendingResourceBatch struct {
	SourceKind string           `json:"source_kind"`
	SourceKey  string           `json:"source_key"`
	Resources  []ResourceAmount `json:"resources"`
	Quantity   int64            `json:"quantity"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
}

type EconomyState struct {
	Professions       []ProfessionProgress   `json:"professions"`
	ActiveGathering   *GatheringActivity     `json:"active_gathering,omitempty"`
	ActiveGatherings  []GatheringActivity    `json:"active_gatherings,omitempty"`
	PendingGathering  []ResourceAmount       `json:"pending_gathering,omitempty"`
	UnlockedRecipes   []string               `json:"unlocked_recipes"`
	PendingCraftItems []Item                 `json:"pending_craft_items,omitempty"`
	PendingResources  []ResourceAmount       `json:"pending_resources,omitempty"`
	PendingBatches    []PendingResourceBatch `json:"pending_resource_batches,omitempty"`
	Settlement        *SettlementState       `json:"settlement,omitempty"`
	ActiveBuffs       []ActiveBuff           `json:"active_buffs,omitempty"`
}