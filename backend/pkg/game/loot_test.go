package game

import (
	"math/rand"
	"testing"
)

func TestAllMonsterLootProfilesResolveInTemplates(t *testing.T) {
	for key, profile := range MonsterLootProfileMap {
		if len(profile.Items) == 0 {
			t.Errorf("Monstro %s não possui itens de loot cadastrados", key)
		}
		for _, itemName := range profile.Items {
			tmpl := findLootTemplate(itemName)
			if tmpl == nil {
				t.Errorf("Monstro %s referencia item inexistente nas lootTemplates: %s", key, itemName)
			}
		}
	}
}

func TestRegionDropsPreviewBelongToRegion(t *testing.T) {
	for regionID, reg := range ExpeditionRegions {
		for _, previewItem := range reg.DropsPreview {
			tmpl := findLootTemplate(previewItem)
			if tmpl == nil {
				t.Errorf("Região %s: item de preview %s não existe no catálogo lootTemplates", regionID, previewItem)
				continue
			}

			// O nível do item não deve exceder o nível máximo da região (salvo exceção justificada)
			if tmpl.RequiredLevel > reg.MaxLevel {
				t.Errorf("Região %s (MaxLevel %d): item de preview %s requer nível %d, que excede a região!",
					regionID, reg.MaxLevel, previewItem, tmpl.RequiredLevel)
			}
		}
	}
}

func TestBossLootGuaranteesMinRarity(t *testing.T) {
	r := rand.New(rand.NewSource(999))
	for _, reg := range ExpeditionRegions {
		bossKey := reg.Boss.Key
		if bossKey == "" {
			bossKey = reg.Boss.Name
		}
		prof := getLootProfileForMonster(bossKey)
		if prof.MinRarity == "" || prof.MinRarity == "Comum" {
			t.Errorf("Boss %s deve ter MinRarity >= Raro, mas possui: %s", bossKey, prof.MinRarity)
		}

		// Testa a rolagem 50 vezes para o boss
		for i := 0; i < 50; i++ {
			item := GenerateLootForMonsterWithRand(bossKey, reg.Boss.Level, r)
			if item == nil {
				t.Fatalf("Boss %s retornou item nil no roll de loot!", bossKey)
			}
			if rarityRank(item.Rarity) < rarityRank(prof.MinRarity) {
				t.Errorf("Boss %s gerou raridade %s abaixo do mínimo %s", bossKey, item.Rarity, prof.MinRarity)
			}
		}
	}
}
