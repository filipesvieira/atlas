package game

import (
	"strings"
	"time"
)

const (
	SettlementStageCamp       = "camp"
	SettlementStageOutpost    = "outpost"
	SettlementStageHamlet     = "hamlet"
	SettlementStageVillage    = "village"
	SettlementStageCity       = "city"
	SettlementStageKingdom    = "kingdom"
	SettlementDesireQueued    = "queued"
	SettlementDesireBlocked   = "blocked"
	SettlementDesireCrafting  = "crafting"
	SettlementDesireCompleted = "completed"
	SettlementDesireExhausted = "exhausted"
	SettlementDesireCancelled = "cancelled"
	SettlementPioneerCount    = 7
)

// SettlementStageDefinition versiona a expansão territorial. As três primeiras
// promoções dependem apenas da infraestrutura já existente; Cidade/Reino já
// declaram as fortificações da M5-B para que a progressão não salte a camada
// defensiva antes dela existir.
type SettlementStageDefinition struct {
	Key               string         `json:"key"`
	Name              string         `json:"name"`
	Icon              string         `json:"icon"`
	MinProsperity     int64          `json:"min_prosperity"`
	MinPopulation     int            `json:"min_population"`
	RequiredBuildings map[string]int `json:"required_buildings"`
	TerritoryWidth    int            `json:"territory_width"`
	TerritoryHeight   int            `json:"territory_height"`
}

type SettlementStageRequirementProgress struct {
	Kind     string `json:"kind"`
	Key      string `json:"key"`
	Required int64  `json:"required"`
	Current  int64  `json:"current"`
	Met      bool   `json:"met"`
}

type SettlementStageProgress struct {
	Current      SettlementStageDefinition            `json:"current"`
	Next         *SettlementStageDefinition           `json:"next,omitempty"`
	Requirements []SettlementStageRequirementProgress `json:"requirements"`
	Ready        bool                                 `json:"ready"`
}

type SettlementDefenseFoundation struct {
	RaidsEnabled  bool       `json:"raids_enabled"`
	Strategy      string     `json:"strategy"`
	ShieldUntil   *time.Time `json:"shield_until,omitempty"`
	Revision      int64      `json:"revision"`
	SnapshotReady bool       `json:"snapshot_ready"`
}

var settlementStageDefinitions = []SettlementStageDefinition{
	{Key: SettlementStageCamp, Name: "Acampamento", Icon: "🏕️", RequiredBuildings: map[string]int{}, TerritoryWidth: 24, TerritoryHeight: 18},
	{Key: SettlementStageOutpost, Name: "Posto", Icon: "⛺", MinProsperity: 75, MinPopulation: 9, RequiredBuildings: map[string]int{"campfire": 2, "adventurer_hut": 1, "warehouse": 1}, TerritoryWidth: 28, TerritoryHeight: 20},
	{Key: SettlementStageHamlet, Name: "Vilarejo", Icon: "🛖", MinProsperity: 250, MinPopulation: 11, RequiredBuildings: map[string]int{"campfire": 2, "adventurer_hut": 2, "warehouse": 2}, TerritoryWidth: 32, TerritoryHeight: 22},
	{Key: SettlementStageVillage, Name: "Vila", Icon: "🏘️", MinProsperity: 600, MinPopulation: 13, RequiredBuildings: map[string]int{"campfire": 3, "adventurer_hut": 2, "warehouse": 2, "workbench": 1}, TerritoryWidth: 36, TerritoryHeight: 24},
	{Key: SettlementStageCity, Name: "Cidade", Icon: "🏙️", MinProsperity: 1150, MinPopulation: 15, RequiredBuildings: map[string]int{"adventurer_hut": 3, "warehouse": 3, "wall": 1, "watchtower": 1}, TerritoryWidth: 40, TerritoryHeight: 28},
	{Key: SettlementStageKingdom, Name: "Reino", Icon: "🏰", MinProsperity: 1500, MinPopulation: 16, RequiredBuildings: map[string]int{"wall": 2, "gate": 2, "barracks": 2, "vault": 1, "war_room": 1}, TerritoryWidth: 52, TerritoryHeight: 38},
}

func SettlementStageDefinitions() []SettlementStageDefinition {
	out := make([]SettlementStageDefinition, len(settlementStageDefinitions))
	for i, definition := range settlementStageDefinitions {
		out[i] = definition
		out[i].RequiredBuildings = map[string]int{}
		for key, level := range definition.RequiredBuildings {
			out[i].RequiredBuildings[key] = level
		}
	}
	return out
}

func SettlementStageKnown(key string) bool {
	for _, definition := range settlementStageDefinitions {
		if definition.Key == key {
			return true
		}
	}
	return false
}

func SettlementStageAtLeast(currentKey, requiredKey string) bool {
	if requiredKey == "" {
		return true
	}
	if !SettlementStageKnown(currentKey) || !SettlementStageKnown(requiredKey) {
		return false
	}
	return SettlementStageIndex(currentKey) >= SettlementStageIndex(requiredKey)
}

func SettlementStageIndex(key string) int {
	for index, definition := range settlementStageDefinitions {
		if definition.Key == key {
			return index
		}
	}
	return 0
}

func settlementStageRequirementsMet(definition SettlementStageDefinition, prosperity int64, population int, buildingLevels map[string]int) bool {
	if prosperity < definition.MinProsperity || population < definition.MinPopulation {
		return false
	}
	for key, required := range definition.RequiredBuildings {
		if buildingLevels[key] < required {
			return false
		}
	}
	return true
}

// SettlementHighestEligibleStage é sequencial: não há salto direto de
// Acampamento para Reino mesmo se um save de desenvolvimento possuir recursos.
func SettlementHighestEligibleStage(prosperity int64, population int, buildingLevels map[string]int) SettlementStageDefinition {
	current := settlementStageDefinitions[0]
	for index := 1; index < len(settlementStageDefinitions); index++ {
		candidate := settlementStageDefinitions[index]
		if !settlementStageRequirementsMet(candidate, prosperity, population, buildingLevels) {
			break
		}
		current = candidate
	}
	return current
}

func SettlementStageProgressFor(currentKey string, prosperity int64, population int, buildingLevels map[string]int) SettlementStageProgress {
	index := SettlementStageIndex(currentKey)
	current := settlementStageDefinitions[index]
	progress := SettlementStageProgress{Current: current, Requirements: []SettlementStageRequirementProgress{}}
	if index+1 >= len(settlementStageDefinitions) {
		progress.Ready = true
		return progress
	}
	next := settlementStageDefinitions[index+1]
	progress.Next = &next
	progress.Requirements = append(progress.Requirements,
		SettlementStageRequirementProgress{Kind: "prosperity", Key: "prosperity", Required: next.MinProsperity, Current: prosperity, Met: prosperity >= next.MinProsperity},
		SettlementStageRequirementProgress{Kind: "population", Key: "population", Required: int64(next.MinPopulation), Current: int64(population), Met: population >= next.MinPopulation},
	)
	ready := true
	for _, requirement := range progress.Requirements {
		ready = ready && requirement.Met
	}
	for key, required := range next.RequiredBuildings {
		currentLevel := buildingLevels[key]
		met := currentLevel >= required
		progress.Requirements = append(progress.Requirements, SettlementStageRequirementProgress{Kind: "building", Key: key, Required: int64(required), Current: int64(currentLevel), Met: met})
		ready = ready && met
	}
	progress.Ready = ready
	return progress
}

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
	ID                     string                      `json:"id"`
	Name                   string                      `json:"name"`
	StageKey               string                      `json:"stage_key"`
	StageProgress          SettlementStageProgress     `json:"stage_progress"`
	Territory              CampBuildBounds             `json:"territory"`
	Defense                SettlementDefenseFoundation `json:"defense"`
	Population             int                         `json:"population"`
	PopulationCapacity     int                         `json:"population_capacity"`
	Reputation             int64                       `json:"reputation"`
	Prosperity             int64                       `json:"prosperity"`
	NextResidentProsperity int64                       `json:"next_resident_prosperity,omitempty"`
	GrowthBlockedReason    string                      `json:"growth_blocked_reason,omitempty"`
	ProsperityPermanent    bool                        `json:"prosperity_permanent"`
	Revision               int64                       `json:"revision"`
	Residents              []SettlementResident        `json:"residents"`
	Desires                []HeroDesire                `json:"hero_desires"`
	Armory                 []SettlementArmoryItem      `json:"armory"`
	Treasury               SettlementTreasuryState     `json:"treasury"`
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
