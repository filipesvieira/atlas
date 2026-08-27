package game

import (
	"strings"
	"time"
)

const (
	SettlementStageCamp       = "camp"
	SettlementDesireQueued    = "queued"
	SettlementDesireBlocked   = "blocked"
	SettlementDesireCrafting  = "crafting"
	SettlementDesireCompleted = "completed"
	SettlementDesireExhausted = "exhausted"
	SettlementDesireCancelled = "cancelled"
	SettlementPioneerCount    = 7
)

// SettlementProsperityMilestones define quando a comunidade atrai um novo
// morador. Prosperidade é reputação produtiva permanente, não uma moeda: ela
// desbloqueia crescimento, mas não é consumida durante a chegada.
var SettlementProsperityMilestones = []int64{25, 75, 150, 250, 400, 600, 850, 1150, 1500}

// SettlementResidentSkill representa a experiência individual de um morador.
// character_professions continua existindo como conhecimento coletivo do
// assentamento; o nível individual define quem pode assumir cada trabalho.
type SettlementResidentSkill struct {
	SkillKey   string `json:"skill_key"`
	SkillKind  string `json:"skill_kind"`
	Level      int    `json:"level"`
	Experience int64  `json:"experience"`
	XPRequired int64  `json:"xp_required"`
}

type SettlementResident struct {
	ID          string                    `json:"id"`
	ResidentKey string                    `json:"resident_key"`
	Name        string                    `json:"name"`
	Icon        string                    `json:"icon"`
	Title       string                    `json:"title"`
	Traits      []string                  `json:"traits"`
	Happiness   int                       `json:"happiness"`
	Status      string                    `json:"status"`
	Skills      []SettlementResidentSkill `json:"skills"`
}

type HeroDesire struct {
	ID                    string           `json:"id"`
	RecipeKey             string           `json:"recipe_key"`
	RecipeName            string           `json:"recipe_name"`
	TargetRarity          string           `json:"target_rarity"`
	CatalystKey           string           `json:"catalyst_key,omitempty"`
	Priority              int              `json:"priority"`
	MaxAttempts           int              `json:"max_attempts"`
	AttemptsCompleted     int              `json:"attempts_completed"`
	State                 string           `json:"state"`
	BlockedReason         string           `json:"blocked_reason,omitempty"`
	AssignedResidentID    string           `json:"assigned_resident_id,omitempty"`
	AssignedResidentName  string           `json:"assigned_resident_name,omitempty"`
	CurrentOrderStartedAt *time.Time       `json:"current_order_started_at,omitempty"`
	CurrentOrderReadyAt   *time.Time       `json:"current_order_ready_at,omitempty"`
	ReservedResources     []ResourceAmount `json:"reserved_resources,omitempty"`
	ReservedGold          int64            `json:"reserved_gold,omitempty"`
	ResultItemID          string           `json:"result_item_id,omitempty"`
	Revision              int64            `json:"revision"`
	CreatedAt             time.Time        `json:"created_at"`
	UpdatedAt             time.Time        `json:"updated_at"`
}

type SettlementArmoryItem struct {
	ID           string    `json:"id"`
	Item         Item      `json:"item"`
	SourceKind   string    `json:"source_kind"`
	ReferenceKey string    `json:"reference_key,omitempty"`
	StoredAt     time.Time `json:"stored_at"`
}

type SettlementState struct {
	ID                     string                  `json:"id"`
	Name                   string                  `json:"name"`
	StageKey               string                  `json:"stage_key"`
	Population             int                     `json:"population"`
	PopulationCapacity     int                     `json:"population_capacity"`
	Reputation             int64                   `json:"reputation"`
	Prosperity             int64                   `json:"prosperity"`
	NextResidentProsperity int64                   `json:"next_resident_prosperity,omitempty"`
	GrowthBlockedReason    string                  `json:"growth_blocked_reason,omitempty"`
	ProsperityPermanent    bool                    `json:"prosperity_permanent"`
	Revision               int64                   `json:"revision"`
	Residents              []SettlementResident    `json:"residents"`
	Desires                []HeroDesire            `json:"hero_desires"`
	Armory                 []SettlementArmoryItem  `json:"armory"`
	Treasury               SettlementTreasuryState `json:"treasury"`
}

// SettlementPopulationTarget combina os dois bloqueios de crescimento: espaço
// de moradia e prestígio produtivo. Os sete pioneiros existentes são sempre
// preservados para retrocompatibilidade com personagens já criados.
func SettlementPopulationTarget(prosperity int64, capacity int) int {
	if capacity < SettlementPioneerCount {
		capacity = SettlementPioneerCount
	}
	target := SettlementPioneerCount
	for _, threshold := range SettlementProsperityMilestones {
		if prosperity < threshold || target >= capacity {
			break
		}
		target++
	}
	return target
}

// NextSettlementResidentMilestone informa a próxima exigência de
// prosperidade com base na população atual.
func NextSettlementResidentMilestone(population int) (int64, bool) {
	index := population - SettlementPioneerCount
	if index < 0 {
		index = 0
	}
	if index >= len(SettlementProsperityMilestones) {
		return 0, false
	}
	return SettlementProsperityMilestones[index], true
}

// GatheringProsperityGain premia atividade real sem permitir que uma única
// ordem longa salte toda a progressão populacional.
func GatheringProsperityGain(completedCycles int64) int64 {
	if completedCycles <= 0 {
		return 0
	}
	gain := (completedCycles + 39) / 40
	if gain < 1 {
		gain = 1
	}
	if gain > 10 {
		gain = 10
	}
	return gain
}

type SettlementAutomationResult struct {
	Changed           bool                       `json:"changed"`
	EventType         string                     `json:"event_type,omitempty"`
	LogText           string                     `json:"log_text,omitempty"`
	Settlement        *SettlementState           `json:"settlement,omitempty"`
	ResourceInventory *ResourceInventorySnapshot `json:"resource_inventory,omitempty"`
	CraftResult       *CraftResult               `json:"craft_result,omitempty"`
	Inventory         *InventoryData             `json:"inventory,omitempty"`
	GoldBank          int64                      `json:"gold_bank"`
	// GoldDelta é a mutação aplicada pelo banco nesta operação específica.
	// Quando a sessão possui ouro ainda não checkpointado, aplicar o delta em
	// memória é mais seguro do que substituir pelo saldo absoluto lido do DB.
	GoldDelta         int64 `json:"gold_delta,omitempty"`
	CharacterRevision int64 `json:"character_revision"`
}

var settlementRarityOrder = map[string]int{
	"Comum": 0, "Incomum": 1, "Raro": 2, "Épico": 3, "Lendário": 4,
}

func NormalizeSettlementRarity(value string) (string, bool) {
	aliases := map[string]string{
		"comum": "Comum", "common": "Comum",
		"incomum": "Incomum", "uncommon": "Incomum",
		"raro": "Raro", "rare": "Raro",
		"épico": "Épico", "epico": "Épico", "epic": "Épico",
		"lendário": "Lendário", "lendario": "Lendário", "legendary": "Lendário",
	}
	normalized, exists := aliases[strings.ToLower(strings.TrimSpace(value))]
	return normalized, exists
}

func RarityMeetsTarget(actual, target string) bool {
	actual, actualOK := NormalizeSettlementRarity(actual)
	target, targetOK := NormalizeSettlementRarity(target)
	actualRank := settlementRarityOrder[actual]
	targetRank := settlementRarityOrder[target]
	return actualOK && targetOK && actualRank >= targetRank
}