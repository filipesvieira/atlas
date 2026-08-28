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

func TestEveryExpeditionMonsterHasCanonicalLootProfile(t *testing.T) {
	for _, region := range ListExpeditionRegions() {
		monsters := append([]Monster{}, region.Monsters...)
		monsters = append(monsters, region.Boss)
		for _, monster := range monsters {
			entry, exists := MonsterRegistry.Get(monster.Key)
			if !exists {
				t.Errorf("Região %s: monstro %s não está registrado no MonsterRegistry", region.ID, monster.Key)
				continue
			}
			if len(entry.Loot.Items) == 0 {
				t.Errorf("Região %s: monstro %s não possui perfil de loot canônico", region.ID, monster.Key)
			}
		}
	}
}

func TestRegionLootDoesNotLeakFutureTier(t *testing.T) {
	for _, region := range ListExpeditionRegions() {
		monsters := append([]Monster{}, region.Monsters...)
		monsters = append(monsters, region.Boss)
		for _, monster := range monsters {
			profile := getLootProfileForMonster(monster.Key)
			for _, itemName := range profile.Items {
				template := findLootTemplate(itemName)
				if template == nil {
					continue
				}
				if template.Tier > region.Tier {
					t.Errorf("Região %s (Tier %d): %s pode dropar %s de Tier %d", region.ID, region.Tier, monster.Key, itemName, template.Tier)
				}
				if template.RequiredLevel > region.MaxLevel {
					t.Errorf("Região %s (Lv <= %d): %s pode dropar %s que requer Lv %d", region.ID, region.MaxLevel, monster.Key, itemName, template.RequiredLevel)
				}
			}
		}
	}
}

func TestDropsPreviewIsActuallyObtainableInRegion(t *testing.T) {
	for _, region := range ListExpeditionRegions() {
		obtainable := make(map[string]bool)
		monsters := append([]Monster{}, region.Monsters...)
		monsters = append(monsters, region.Boss)
		for _, monster := range monsters {
			for _, itemName := range getLootProfileForMonster(monster.Key).Items {
				obtainable[itemName] = true
			}
		}
		for _, previewItem := range region.DropsPreview {
			if !obtainable[previewItem] {
				t.Errorf("Região %s anuncia %s no preview, mas nenhum monstro da região pode dropá-lo", region.ID, previewItem)
			}
		}
	}
}

func TestStarterPacksReferenceExistingTemplates(t *testing.T) {
	for _, pack := range ListStarterPacks() {
		items := []*StarterItemDefinition{pack.MainHand, pack.OffHand, pack.Ammo}
		for index := range pack.Backpack {
			items = append(items, &pack.Backpack[index])
		}
		for _, item := range items {
			if item != nil && findLootTemplate(item.TemplateName) == nil {
				t.Errorf("Starter pack %s referencia template inexistente: %s", pack.ID, item.TemplateName)
			}
		}
	}
}

func TestPhaseOneRarityDoesNotExplodePrimaryDamage(t *testing.T) {
	r := rand.New(rand.NewSource(97))
	common := GenerateItemFromTemplate("Arco Curvo", "Comum", r)
	rare := GenerateItemFromTemplate("Arco Curvo", "Raro", r)
	legendary := GenerateItemFromTemplate("Arco Curvo", "Lendário", r)
	if common == nil || rare == nil || legendary == nil {
		t.Fatal("falha ao gerar arco para auditoria de raridade")
	}
	if rare.PhysicalAttack > common.PhysicalAttack+3 {
		t.Fatalf("raro ultrapassou a janela de fase 1: comum=%d raro=%d", common.PhysicalAttack, rare.PhysicalAttack)
	}
	if legendary.PhysicalAttack > common.PhysicalAttack+8 {
		t.Fatalf("lendário ultrapassou teto seguro: comum=%d lendário=%d", common.PhysicalAttack, legendary.PhysicalAttack)
	}
}

func TestRarityDoesNotInventCombatAffixes(t *testing.T) {
	staff := GenerateItemFromTemplate("Cajado de Pirulito", "Raro", rand.New(rand.NewSource(31)))
	if staff == nil {
		t.Fatal("falha ao gerar cajado para auditoria de afixos")
	}
	if staff.CritChance != 0 || staff.Lifesteal != 0 {
		t.Fatalf("raridade criou afixos fora do template: crítico=%.1f roubo=%.1f", staff.CritChance, staff.Lifesteal)
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
		if len(releasedEquipmentLoot(prof)) == 0 {
			// O boss continua registrado para a fase futura, mas não deve gerar
			// equipamento enquanto seu catálogo estiver arquivado.
			continue
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