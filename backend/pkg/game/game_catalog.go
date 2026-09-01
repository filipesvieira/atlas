package game

const GameCatalogVersion = "2026.08-m5b1-territory-v5"

type ExpeditionCatalogEntry struct {
	ID                   string   `json:"id"`
	BiomeKey             string   `json:"biome_key"`
	Name                 string   `json:"name"`
	Tier                 int      `json:"tier"`
	Order                int      `json:"order"`
	MinLevel             int      `json:"min_level"`
	MaxLevel             int      `json:"max_level"`
	Description          string   `json:"description"`
	Icon                 string   `json:"icon"`
	MaxStages            int      `json:"max_stages"`
	RequiresUnlockFrom   string   `json:"requires_unlock_from,omitempty"`
	RequiresTierComplete bool     `json:"requires_tier_complete,omitempty"`
	DropsPreview         []string `json:"drops_preview"`
	BossName             string   `json:"boss_name"`
	IsSecret             bool     `json:"is_secret"`
}

type GameCatalog struct {
	Version              string                          `json:"version"`
	Regions              []ExpeditionCatalogEntry        `json:"regions"`
	StarterPacks         []StarterPackDefinition         `json:"starter_packs"`
	Skills               []SkillDefinition               `json:"skills"`
	Resources            []ResourceDefinition            `json:"resources"`
	CampBuildings        []BuildingDefinition            `json:"camp_buildings"`
	CampLayout           map[string]string               `json:"camp_layout"`
	Professions          []ProfessionDefinition          `json:"professions"`
	GatheringExpeditions []GatheringExpeditionDefinition `json:"gathering_expeditions"`
	Recipes              []RecipeDefinition              `json:"recipes"`
	Consumables          []ConsumableDefinition          `json:"consumables"`
	EquipmentSets        []EquipmentSetDefinition        `json:"equipment_sets"`
	EconomyPolicy        EconomyPolicy                   `json:"economy_policy"`
	SettlementTerritory  SettlementTerritoryContract     `json:"settlement_territory"`
}

func BuildGameCatalog() GameCatalog {
	EnsureEconomyResourcesRegistered()
	EnsureEconomyMonsterProfilesApplied()
	regions := ListExpeditionRegions()
	entries := make([]ExpeditionCatalogEntry, 0, len(regions))
	for _, region := range regions {
		entries = append(entries, ExpeditionCatalogEntry{
			ID: region.ID, BiomeKey: region.BiomeKey, Name: region.Name,
			Tier: region.Tier, Order: region.Order, MinLevel: region.MinLevel, MaxLevel: region.MaxLevel,
			Description: region.Description, Icon: region.Icon, MaxStages: region.MaxStages,
			RequiresUnlockFrom: region.RequiresUnlockFrom, RequiresTierComplete: region.RequiresTierComplete,
			DropsPreview: filterReleasedItemNames(region.DropsPreview),
			BossName:     region.Boss.Name, IsSecret: region.IsSecret,
		})
	}

	return GameCatalog{
		Version:              GameCatalogVersion,
		Regions:              entries,
		StarterPacks:         ListStarterPacks(),
		Skills:               ListAllSkills(),
		Resources:            ListResourceDefinitions(),
		CampBuildings:        ListBuildingDefinitions(),
		CampLayout:           SlotToBuildingMap,
		Professions:          ListProfessionDefinitions(),
		GatheringExpeditions: ListGatheringExpeditions(),
		Recipes:              ListRecipeDefinitions(),
		Consumables:          ListConsumableDefinitions(),
		EquipmentSets:        ListReleasedEquipmentSetDefinitions(),
		EconomyPolicy:        CurrentEconomyPolicy(),
		SettlementTerritory:  CurrentSettlementTerritoryContract(),
	}
}
