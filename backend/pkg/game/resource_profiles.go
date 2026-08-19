package game

import (
	"fmt"
	"math/rand"
	"sync"
)

// MonsterResourceProfileMap começa vazio e é preenchido exclusivamente pelo
// catálogo canônico de economy_monster_profiles.go. Assim não existem duas
// tabelas concorrentes (legada e V2) para manter ou sobrescrever no startup.
var (
	monsterResourceProfileMu  sync.RWMutex
	MonsterResourceProfileMap = map[string]MonsterResourceProfile{}
)

// GetMonsterResourceProfile retorna a tabela de drops de recursos para uma chave de monstro.
func GetMonsterResourceProfile(monsterKey string) (MonsterResourceProfile, bool) {
	monsterResourceProfileMu.RLock()
	defer monsterResourceProfileMu.RUnlock()
	profile, ok := MonsterResourceProfileMap[monsterKey]
	return profile, ok
}

// RollMonsterResources executa a rolagem determinística ou aleatória de recursos para um monstro.
func RollMonsterResources(monsterKey string, rng *rand.Rand) []ResourceAmount {
	profile, exists := GetMonsterResourceProfile(monsterKey)
	if !exists || rng == nil {
		return nil
	}

	results := make([]ResourceAmount, 0)
	roll := func(drop ResourceDropDefinition) {
		if drop.Chance < 1 && rng.Float64() >= drop.Chance {
			return
		}
		quantity := drop.MinQuantity
		if drop.MaxQuantity > drop.MinQuantity {
			quantity += int64(rng.Intn(int(drop.MaxQuantity - drop.MinQuantity + 1)))
		}
		if quantity > 0 {
			results = append(results, ResourceAmount{Key: drop.ResourceKey, Quantity: quantity})
		}
	}

	for _, drop := range profile.GuaranteedDrops {
		roll(drop)
	}
	for _, drop := range profile.Drops {
		roll(drop)
	}
	return results
}

// ValidateMonsterResourceProfiles valida consistência e a origem de todos os
// perfis. Matéria-prima de profissão jamais pode surgir em combate.
func ValidateMonsterResourceProfiles() error {
	EnsureEconomyMonsterProfilesApplied()
	monsterResourceProfileMu.RLock()
	defer monsterResourceProfileMu.RUnlock()

	if len(MonsterResourceProfileMap) != len(MonsterPartByMonster) {
		return fmt.Errorf("cobertura de loot temático incompleta: %d perfis para %d monstros", len(MonsterResourceProfileMap), len(MonsterPartByMonster))
	}
	for monsterKey, profile := range MonsterResourceProfileMap {
		allDrops := append([]ResourceDropDefinition{}, profile.GuaranteedDrops...)
		allDrops = append(allDrops, profile.Drops...)
		if len(allDrops) == 0 {
			return fmt.Errorf("monstro %s não possui recompensa temática", monsterKey)
		}
		for _, drop := range allDrops {
			resource, exists := GetResourceDefinition(drop.ResourceKey)
			if !exists {
				return fmt.Errorf("monstro %s referencia recurso inexistente: %s", monsterKey, drop.ResourceKey)
			}
			if resource.Category == ResourceCategoryProfessionRaw {
				return fmt.Errorf("monstro %s viola a separação de profissões ao dropar %s", monsterKey, drop.ResourceKey)
			}
			if drop.Chance < 0 || drop.Chance > 1 {
				return fmt.Errorf("monstro %s tem chance inválida para %s: %f", monsterKey, drop.ResourceKey, drop.Chance)
			}
			if drop.MinQuantity <= 0 || drop.MaxQuantity < drop.MinQuantity {
				return fmt.Errorf("monstro %s tem quantidades inválidas para %s: min=%d, max=%d", monsterKey, drop.ResourceKey, drop.MinQuantity, drop.MaxQuantity)
			}
		}
	}
	return nil
}
