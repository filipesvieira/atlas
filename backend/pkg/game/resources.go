package game

// ResourceCategory define a categoria funcional de um recurso.
type ResourceCategory string

const (
	// ResourceCategoryMaterial é mantida para retrocompatibilidade com saves V1.
	ResourceCategoryMaterial      ResourceCategory = "material"
	ResourceCategoryProfessionRaw ResourceCategory = "profession_raw"
	ResourceCategoryMonsterPart   ResourceCategory = "monster_part"
	ResourceCategoryProcessed     ResourceCategory = "processed"
	ResourceCategoryCatalyst      ResourceCategory = "catalyst"
	ResourceCategoryTrophy        ResourceCategory = "trophy"
	ResourceCategoryScrap         ResourceCategory = "scrap"
)

// ResourceDefinition define os atributos canônicos de um recurso coletável no jogo.
type ResourceDefinition struct {
	Key                 string           `json:"key"`
	Name                string           `json:"name"`
	Icon                string           `json:"icon"`
	Rarity              string           `json:"rarity"` // Comum, Incomum, Raro, Épico, Lendário, Mítico
	Description         string           `json:"description"`
	MaxStack            int64            `json:"max_stack"`
	Category            ResourceCategory `json:"category"`
	CountsTowardStorage bool             `json:"counts_toward_storage"`
	Discardable         bool             `json:"discardable"`
	SourceKind          string           `json:"source_kind,omitempty"`
	ProfessionKey       string           `json:"profession_key,omitempty"`
	Tier                int              `json:"tier"`
	StorageWeight       int64            `json:"storage_weight"`
	Tradeable           bool             `json:"tradeable"`
	ContentVersion      int              `json:"content_version"`
}

// ResourceAmount representa uma quantidade específica de um recurso.
type ResourceAmount struct {
	Key      string `json:"key"`
	Quantity int64  `json:"quantity"`
}

// ResourceInventorySnapshot representa uma fotografia completa e autoritativa do inventário de recursos.
type ResourceInventorySnapshot struct {
	Items           []ResourceAmount `json:"items"`
	StorageUsed     int64            `json:"storage_used"`
	StorageCapacity int64            `json:"storage_capacity"`
	Revision        int64            `json:"revision"`
}

// ResourceMutationResult contém o resultado detalhado de uma alteração de recursos.
type ResourceMutationResult struct {
	Accepted  []ResourceAmount          `json:"accepted"`
	Overflow  []ResourceAmount          `json:"overflow"`
	Inventory ResourceInventorySnapshot `json:"inventory"`
}

// ResourceDropDefinition define a regra de probabilidade e quantidade de drop de um recurso.
type ResourceDropDefinition struct {
	ResourceKey string  `json:"resource_key"`
	Chance      float64 `json:"chance"` // 0.0 a 1.0
	MinQuantity int64   `json:"min_quantity"`
	MaxQuantity int64   `json:"max_quantity"`
}

// MonsterResourceProfile define a tabela de recursos que um monstro específico pode derrubar.
type MonsterResourceProfile struct {
	Drops           []ResourceDropDefinition `json:"drops"`
	GuaranteedDrops []ResourceDropDefinition `json:"guaranteed_drops,omitempty"`
}

// CombatReward agrega todas as recompensas concedidas após uma vitória de combate.
type CombatReward struct {
	Equipment    *Item            `json:"equipment,omitempty"`
	Resources    []ResourceAmount `json:"resources,omitempty"`
	Gold         int64            `json:"gold"`
	Experience   int64            `json:"experience"`
	BossTrophies []ResourceAmount `json:"boss_trophies,omitempty"`
}
