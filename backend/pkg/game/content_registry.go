package game

import (
	"fmt"
	"sort"
	"strings"
)

// MonsterRegistryEntry une a identidade canônica do monstro às configurações
// que outros sistemas precisam consultar. O motor passa a trabalhar com Key;
// Name é aceito apenas como alias de compatibilidade para saves antigos.
type MonsterRegistryEntry struct {
	Monster Monster
	Loot    MonsterLootProfile
}

type MonsterContentRegistry struct {
	byKey  map[string]MonsterRegistryEntry
	byName map[string]string
}

func normalizeContentKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func newMonsterContentRegistry(regions map[string]ExpeditionRegion, lootProfiles map[string]MonsterLootProfile) *MonsterContentRegistry {
	registry := &MonsterContentRegistry{
		byKey:  make(map[string]MonsterRegistryEntry),
		byName: make(map[string]string),
	}

	register := func(monster Monster) {
		key := normalizeContentKey(monster.Key)
		if key == "" {
			return
		}
		registry.byKey[key] = MonsterRegistryEntry{
			Monster: monster,
			Loot:    lootProfiles[key],
		}
		registry.byName[normalizeContentKey(monster.Name)] = key
	}

	for _, region := range regions {
		for _, monster := range region.Monsters {
			register(monster)
		}
		register(region.Boss)
	}

	return registry
}

func (r *MonsterContentRegistry) Get(keyOrLegacyName string) (MonsterRegistryEntry, bool) {
	lookup := normalizeContentKey(keyOrLegacyName)
	if entry, ok := r.byKey[lookup]; ok {
		return entry, true
	}
	if key, ok := r.byName[lookup]; ok {
		entry, found := r.byKey[key]
		return entry, found
	}
	return MonsterRegistryEntry{}, false
}

func (r *MonsterContentRegistry) List() []MonsterRegistryEntry {
	entries := make([]MonsterRegistryEntry, 0, len(r.byKey))
	for _, entry := range r.byKey {
		entries = append(entries, entry)
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Monster.Key < entries[j].Monster.Key
	})
	return entries
}

// MonsterRegistry é a única porta de consulta de conteúdo de monstros no motor.
var MonsterRegistry = newMonsterContentRegistry(ExpeditionRegions, MonsterLootProfileMap)

func GetExpeditionRegion(regionID string) (ExpeditionRegion, bool) {
	region, ok := ExpeditionRegions[normalizeContentKey(regionID)]
	return region, ok
}

func ListExpeditionRegions() []ExpeditionRegion {
	regions := make([]ExpeditionRegion, 0, len(ExpeditionRegions))
	for _, region := range ExpeditionRegions {
		regions = append(regions, region)
	}
	sort.Slice(regions, func(i, j int) bool {
		return regions[i].Order < regions[j].Order
	})
	return regions
}

// ContentRegistry consolida todos os catálogos declarativos e valida integridade no startup.
type ContentRegistry struct {
	Regions     map[string]ExpeditionRegion
	Monsters    *MonsterContentRegistry
	Items       *ItemTemplateRegistry
	Resources   []ResourceDefinition
	Buildings   []BuildingDefinition
	Skills      []SkillDefinition
	Professions []ProfessionDefinition
	Gathering   []GatheringExpeditionDefinition
	Recipes     []RecipeDefinition
	Version     string
}

// NewContentRegistry monta o registry agregado com todas as fontes declarativas.
func NewContentRegistry() *ContentRegistry {
	EnsureEconomyResourcesRegistered()
	EnsureEconomyMonsterProfilesApplied()
	return &ContentRegistry{
		Regions:     ExpeditionRegions,
		Monsters:    MonsterRegistry,
		Items:       ItemRegistry,
		Resources:   ListResourceDefinitions(),
		Buildings:   ListBuildingDefinitions(),
		Skills:      ListAllSkills(),
		Professions: ListProfessionDefinitions(),
		Gathering:   ListGatheringExpeditions(),
		Recipes:     ListRecipeDefinitions(),
		Version:     "6.0.0",
	}
}

// ValidateIntegrity executa uma auditoria completa de consistência cruzada do jogo.
// Retorna uma lista de violações (ou slice vazio se 100% íntegro).
func (c *ContentRegistry) ValidateIntegrity() []string {
	var errors []string

	// 1. Validação de Regiões, Encadeamentos e Ordem
	orderSeen := make(map[int]string)
	for regID, reg := range c.Regions {
		if reg.Name == "" {
			errors = append(errors, fmt.Sprintf("Região %s sem nome de exibição", regID))
		}
		if reg.BiomeKey == "" {
			errors = append(errors, fmt.Sprintf("Região %s sem BiomeKey", regID))
		}
		if otherID, dup := orderSeen[reg.Order]; dup {
			errors = append(errors, fmt.Sprintf("Ordem de expedição %d duplicada entre %s e %s", reg.Order, otherID, regID))
		} else {
			orderSeen[reg.Order] = regID
		}

		if reg.RequiresUnlockFrom != "" {
			if _, exists := c.Regions[reg.RequiresUnlockFrom]; !exists {
				errors = append(errors, fmt.Sprintf("Região %s requer unlock de região inexistente %s", regID, reg.RequiresUnlockFrom))
			}
			if reg.RequiresUnlockFrom == regID {
				errors = append(errors, fmt.Sprintf("Região %s cria autorreferência de unlock", regID))
			}
		}

		// Validação de Monstros da Região
		for _, mob := range reg.Monsters {
			if mob.Key == "" {
				errors = append(errors, fmt.Sprintf("Monstro na região %s sem Key", regID))
			}
			if mob.MaxHealth <= 0 {
				errors = append(errors, fmt.Sprintf("Monstro %s na região %s com MaxHealth <= 0", mob.Key, regID))
			}
			if _, hasProfile := MonsterLootProfileMap[mob.Key]; !hasProfile {
				errors = append(errors, fmt.Sprintf("Monstro %s sem MonsterLootProfile", mob.Key))
			}
			if _, hasRes := MonsterResourceProfileMap[mob.Key]; !hasRes {
				errors = append(errors, fmt.Sprintf("Monstro %s sem MonsterResourceProfile", mob.Key))
			}
		}

		// Validação do Boss
		if reg.Boss.Key == "" {
			errors = append(errors, fmt.Sprintf("Região %s sem Boss Key", regID))
		} else {
			if _, hasProfile := MonsterLootProfileMap[reg.Boss.Key]; !hasProfile {
				errors = append(errors, fmt.Sprintf("Boss %s da região %s sem MonsterLootProfile", reg.Boss.Key, regID))
			}
			if _, hasRes := MonsterResourceProfileMap[reg.Boss.Key]; !hasRes {
				errors = append(errors, fmt.Sprintf("Boss %s da região %s sem MonsterResourceProfile", reg.Boss.Key, regID))
			}
		}
	}

	// 1.1 Detecção de ciclos de desbloqueio entre regiões (DFS)
	for startID := range c.Regions {
		visited := make(map[string]bool)
		curr := startID
		for curr != "" {
			if visited[curr] {
				errors = append(errors, fmt.Sprintf("Ciclo de desbloqueio detectado envolvendo região %s", curr))
				break
			}
			visited[curr] = true
			if reg, ok := c.Regions[curr]; ok {
				curr = reg.RequiresUnlockFrom
			} else {
				break
			}
		}
	}

	// 2. Validação de Drops e Itens
	for mobKey, profile := range MonsterLootProfileMap {
		for _, dropName := range profile.Items {
			if _, exists := c.Items.Get(dropName); !exists {
				errors = append(errors, fmt.Sprintf("Drop '%s' do monstro %s não existe no ItemRegistry", dropName, mobKey))
			}
		}
	}

	// 2.1 Validação de integridade dos templates de itens
	for _, it := range c.Items.List() {
		if it.Key == "" {
			errors = append(errors, fmt.Sprintf("Item '%s' no ItemRegistry possui Key vazia", it.Name))
		}
		if it.Name == "" {
			errors = append(errors, fmt.Sprintf("Item com Key '%s' no ItemRegistry possui Name vazio", it.Key))
		}
	}

	// 3. Validação de Starter Packs
	for _, pack := range StarterPacks {
		if pack.MainHand != nil {
			if _, exists := c.Items.Get(pack.MainHand.TemplateName); !exists {
				errors = append(errors, fmt.Sprintf("Item starter pack '%s' não existe no ItemRegistry", pack.MainHand.TemplateName))
			}
		}
		if pack.OffHand != nil {
			if _, exists := c.Items.Get(pack.OffHand.TemplateName); !exists {
				errors = append(errors, fmt.Sprintf("Item starter pack '%s' não existe no ItemRegistry", pack.OffHand.TemplateName))
			}
		}
		if pack.Ammo != nil {
			if _, exists := c.Items.Get(pack.Ammo.TemplateName); !exists {
				errors = append(errors, fmt.Sprintf("Item starter pack '%s' não existe no ItemRegistry", pack.Ammo.TemplateName))
			}
		}
		for _, bItem := range pack.Backpack {
			if _, exists := c.Items.Get(bItem.TemplateName); !exists {
				errors = append(errors, fmt.Sprintf("Item starter pack '%s' não existe no ItemRegistry", bItem.TemplateName))
			}
		}
	}

	// 4. Validação de Recursos e Construções
	for _, bDef := range c.Buildings {
		for lvl := 1; lvl <= bDef.MaxLevel; lvl++ {
			if lvlDef, ok := GetBuildingLevelDefinition(bDef.Key, lvl); ok {
				for _, reqRes := range lvlDef.Costs {
					if _, exists := GetResourceDefinition(reqRes.Key); !exists {
						errors = append(errors, fmt.Sprintf("Construção %s Nv %d exige recurso inexistente %s", bDef.Key, lvl, reqRes.Key))
					}
				}
				for _, reqTrophy := range lvlDef.RequiredTrophies {
					if _, exists := GetResourceDefinition(reqTrophy.Key); !exists {
						errors = append(errors, fmt.Sprintf("Construção %s Nv %d exige troféu inexistente %s", bDef.Key, lvl, reqTrophy.Key))
					}
				}
			}
		}
	}

	// 5. Economia: catálogos devem ser autoconsistentes e recursos de profissão
	// não podem voltar a aparecer como drop de monstro.
	if err := ValidateProfessionRegistry(); err != nil {
		errors = append(errors, err.Error())
	}
	if err := ValidateResourceRegistry(); err != nil {
		errors = append(errors, err.Error())
	}
	if err := ValidateMonsterResourceProfiles(); err != nil {
		errors = append(errors, err.Error())
	}
	if err := ValidateGatheringRegistry(); err != nil {
		errors = append(errors, err.Error())
	}
	if err := ValidateRecipeRegistry(); err != nil {
		errors = append(errors, err.Error())
	}
	if err := ValidateConsumableRegistry(); err != nil {
		errors = append(errors, err.Error())
	}
	for monsterKey, profile := range MonsterResourceProfileMap {
		drops := append([]ResourceDropDefinition{}, profile.Drops...)
		drops = append(drops, profile.GuaranteedDrops...)
		for _, drop := range drops {
			if definition, ok := GetResourceDefinition(drop.ResourceKey); ok && definition.Category == ResourceCategoryProfessionRaw {
				errors = append(errors, fmt.Sprintf("Monstro %s ainda dropa recurso de profissão %s", monsterKey, drop.ResourceKey))
			}
		}
	}

	return errors
}

// GlobalContentRegistry é a instância canônica validada do jogo.
var GlobalContentRegistry = NewContentRegistry()