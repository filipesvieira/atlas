package game

import (
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
// As tabelas declarativas continuam separadas por domínio (expedição e loot),
// mas lookup por string não fica mais espalhado pelo código.
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
