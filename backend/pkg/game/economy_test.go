package game

import (
	"math"
	"reflect"
	"testing"
	"time"
)

func TestProfessionAndEconomyRegistriesAreValid(t *testing.T) {
	if err := ValidateProfessionRegistry(); err != nil {
		t.Fatal(err)
	}
	if err := ValidateGatheringRegistry(); err != nil {
		t.Fatal(err)
	}
	if err := ValidateRecipeRegistry(); err != nil {
		t.Fatal(err)
	}
}

func TestLegacyItemMigrationOnlyAddsSource(t *testing.T) {
	original := Item{ID: "legacy-1", Name: "Espada Antiga", Rarity: "Épico", Attack: 77, PhysicalAttack: 77, Defense: 9, ValueGold: 4321, SpecialEffect: "efeito histórico", BalanceVersion: 0}
	migrated := RebalanceExistingItem(original)
	if migrated.Source != ItemSourceLegacyDrop {
		t.Fatalf("origem legada não marcada: %+v", migrated)
	}
	migrated.Source = ""
	if !reflect.DeepEqual(original, migrated) {
		t.Fatalf("migração alterou atributos legados\nantes=%+v\ndepois=%+v", original, migrated)
	}
}

func TestLegacyBootMigrationRestoresMovementSpeed(t *testing.T) {
	legacyByKey := Item{TemplateKey: "botas_de_couro", Rarity: "Raro"}
	migratedByKey := RebalanceExistingItem(legacyByKey)
	if migratedByKey.MovementSpeedBonus != 16.5 {
		t.Fatalf("botas legadas por chave deveriam receber +16.5%%, obtido %.1f%%", migratedByKey.MovementSpeedBonus)
	}

	legacyByName := Item{Name: "Botas Celestiais", Rarity: "Comum"}
	migratedByName := RebalanceExistingItem(legacyByName)
	if migratedByName.MovementSpeedBonus != 20.0 {
		t.Fatalf("botas legadas por nome deveriam receber +20%%, obtido %.1f%%", migratedByName.MovementSpeedBonus)
	}

	// Um valor já explícito não pode ser substituído pela compatibilidade.
	current := Item{TemplateKey: "botas_de_couro", Rarity: "Raro", MovementSpeedBonus: 12.3}
	if got := RebalanceExistingItem(current).MovementSpeedBonus; got != 12.3 {
		t.Fatalf("bônus explícito foi alterado: %.1f%%", got)
	}
}

func TestEveryGenericEquipmentHasCraftRecipe(t *testing.T) {
	if err := ValidateRecipeRegistry(); err != nil {
		t.Fatal(err)
	}
}

func TestCraftedItemsAreProtectedFromAutoSell(t *testing.T) {
	item := Item{ID: "crafted-1", Name: "Espada Produzida", TemplateKey: "espada_do_aprendiz", Rarity: "Comum", Weight: 1, ValueGold: 10, Source: ItemSourceCrafted, CreatedAt: time.Now().UTC()}
	settings := DefaultAutoSellSettings()
	settings.Enabled = true
	settings.OnlyDuplicates = false
	settings.TriggerPercent = 1
	settings.TargetPercent = 0
	result := EvaluateAutoSell(settings, []Item{item}, 1, 1, 1)
	if len(result.ItemsToSell) != 0 || result.ProtectedCraftedCount != 1 {
		t.Fatalf("item craftado recente entrou na venda automática: %+v", result)
	}
}

func TestOverflowProtectionCoversRareManualAndExplicitChoice(t *testing.T) {
	settings := DefaultAutoSellSettings()
	settings.ProtectedTemplateKeys = []string{"souvenir_unique"}
	cases := []Item{
		{ID: "rare", Name: "Artefato", Rarity: "Raro"},
		{ID: "manual", Name: "Manual", Rarity: "Comum", ItemKind: ItemKindConstructionManual},
		{ID: "explicit", Name: "Lembrança", TemplateKey: "souvenir_unique", Rarity: "Comum"},
		{ID: "crafted", Name: "Recém-forjado", Rarity: "Comum", Source: ItemSourceCrafted, CreatedAt: time.Now().UTC()},
	}
	for _, item := range cases {
		if !IsOverflowProtectedItem(item, settings) {
			t.Fatalf("item protegido não reconhecido no overflow: %+v", item)
		}
	}
	ordinary := Item{ID: "ordinary", Name: "Comum vendável", Rarity: "Comum"}
	if IsOverflowProtectedItem(ordinary, settings) {
		t.Fatalf("item comum elegível foi marcado como protegido: %+v", ordinary)
	}
}

func TestGatheringResultIsDeterministicAndProfessionOnly(t *testing.T) {
	definition, ok := GetGatheringExpedition("suspicious_logs")
	if !ok {
		t.Fatal("expedição de coleta não registrada")
	}
	start := time.Date(2026, 8, 13, 10, 0, 0, 0, time.UTC)
	activity := GatheringActivity{ID: "activity-1", ResidentID: "resident-1", ResidentName: "Tonho", ExpeditionKey: definition.Key, ProfessionKey: definition.ProfessionKey, StartedAt: start, EndsAt: start.Add(time.Hour), Snapshot: GatheringSnapshot{ProfessionLevel: 1, Seed: DeterministicSeed("char", "request"), ContentVersion: 1}}
	first := CalculateGatheringResult(activity, activity.EndsAt)
	second := CalculateGatheringResult(activity, activity.EndsAt)
	if first.ResidentID != activity.ResidentID || first.ResidentName != activity.ResidentName {
		t.Fatalf("identidade do trabalhador se perdeu no resultado: %+v", first)
	}
	if first.CompletedCycles == 0 || first.ProfessionXP == 0 {
		t.Fatalf("coleta não produziu ciclos: %+v", first)
	}
	if len(first.Rewards) != len(second.Rewards) || first.CompletedCycles != second.CompletedCycles || first.ProfessionXP != second.ProfessionXP {
		t.Fatal("simulação de coleta não é determinística")
	}
	for i, reward := range first.Rewards {
		if reward != second.Rewards[i] {
			t.Fatal("recompensas divergiram para a mesma seed")
		}
		resource, ok := GetResourceDefinition(reward.Key)
		if !ok || resource.Category != ResourceCategoryProfessionRaw {
			t.Fatalf("coleta gerou recurso fora de profissão: %s", reward.Key)
		}
	}
}

func TestProfessionXPUsesDiminishingReturnsOnOldNodes(t *testing.T) {
	if got := ProfessionXPMultiplier(6, 1); got != 1 {
		t.Fatalf("diferença de cinco níveis deveria render 100%%, recebeu %.2f", got)
	}
	if got := ProfessionXPMultiplier(11, 1); got != .60 {
		t.Fatalf("diferença de dez níveis deveria render 60%%, recebeu %.2f", got)
	}
	if got := ProfessionXPMultiplier(21, 1); got != .25 {
		t.Fatalf("diferença de vinte níveis deveria render 25%%, recebeu %.2f", got)
	}
	if got := ProfessionXPMultiplier(30, 1); got != .05 {
		t.Fatalf("nó obsoleto deveria render 5%%, recebeu %.2f", got)
	}
}

func TestGatheringUsesImmutableExpeditionSnapshot(t *testing.T) {
	definition, ok := GetGatheringExpedition("suspicious_logs")
	if !ok {
		t.Fatal("expedição de teste ausente")
	}
	start := time.Unix(1_720_000_000, 0).UTC()
	activity := GatheringActivity{ID: "snapshot-activity", ExpeditionKey: definition.Key, ProfessionKey: definition.ProfessionKey, StartedAt: start, EndsAt: start.Add(time.Hour), Snapshot: GatheringSnapshot{ProfessionLevel: 1, Seed: 42, ContentVersion: definition.ContentVersion, ExpeditionSnapshot: CloneGatheringExpedition(definition)}}
	before := CalculateGatheringResult(activity, activity.EndsAt)

	changed := CloneGatheringExpedition(definition)
	changed.Nodes[0].CycleSeconds = 900
	GatheringExpeditionRegistry[definition.Key] = changed
	defer func() { GatheringExpeditionRegistry[definition.Key] = definition }()
	after := CalculateGatheringResult(activity, activity.EndsAt)
	if before.CompletedCycles != after.CompletedCycles || before.ProfessionXP != after.ProfessionXP || !reflect.DeepEqual(before.Rewards, after.Rewards) {
		t.Fatal("alteração do catálogo modificou retroativamente uma ordem existente")
	}
}

func TestGatheringDestinationsAreSelectableAndKeepLegacyDefinitions(t *testing.T) {
	legacy, exists := GetGatheringExpedition("lonely_pickaxe")
	if !exists || legacy.PlayerSelectable {
		t.Fatalf("a expedição legada deve permanecer apenas para snapshots já iniciados")
	}

	route, exists := GetGatheringExpedition("route_lonely_pickaxe_iron_crack")
	if !exists {
		t.Fatal("rota selecionável da Fenda Ferruginosa não foi registrada")
	}
	if !route.PlayerSelectable || route.DisplayName != "Fenda Ferruginosa" || route.AreaName != "Pedreira da Picareta Solitária" {
		t.Fatalf("metadados da rota inválidos: %#v", route)
	}
	if len(route.Nodes) != 1 || route.Nodes[0].Key != "iron_crack" || route.Nodes[0].Weight != 1 {
		t.Fatalf("a rota escolhida deve conter somente a frente selecionada: %#v", route.Nodes)
	}
}

func TestTrackerRoutesHaveDistinctResourceIdentity(t *testing.T) {
	deerRoute, deerOK := GetGatheringExpedition("route_mysterious_meat_trail_deer_tracks")
	boneRoute, boneOK := GetGatheringExpedition("route_mysterious_meat_trail_bone_clearing")
	if !deerOK || !boneOK || len(deerRoute.Nodes) != 1 || len(boneRoute.Nodes) != 1 {
		t.Fatal("rotas selecionáveis do rastreador não foram registradas corretamente")
	}

	hasReward := func(node GatheringNodeDefinition, key string) bool {
		for _, reward := range node.Rewards {
			if reward.ResourceKey == key {
				return true
			}
		}
		return false
	}
	if !hasReward(deerRoute.Nodes[0], "raw_meat") || hasReward(deerRoute.Nodes[0], "animal_bone") {
		t.Fatalf("Pegadas de Cervos devem priorizar carne e não entregar ossos: %#v", deerRoute.Nodes[0].Rewards)
	}
	if !hasReward(boneRoute.Nodes[0], "animal_bone") {
		t.Fatalf("Clareira dos Ossos deve entregar Osso de Caça: %#v", boneRoute.Nodes[0].Rewards)
	}
}

func TestMonsterProfilesNeverYieldProfessionRawResources(t *testing.T) {
	for monsterKey, profile := range MonsterResourceProfileMap {
		drops := append([]ResourceDropDefinition{}, profile.Drops...)
		drops = append(drops, profile.GuaranteedDrops...)
		for _, drop := range drops {
			resource, ok := GetResourceDefinition(drop.ResourceKey)
			if !ok {
				t.Fatalf("%s referencia recurso inexistente %s", monsterKey, drop.ResourceKey)
			}
			if resource.Category == ResourceCategoryProfessionRaw {
				t.Fatalf("%s ainda derruba matéria-prima de profissão %s", monsterKey, drop.ResourceKey)
			}
		}
	}
}

func TestCraftRarityDistributionsAreNormalized(t *testing.T) {
	previousExpectedRank := -1.0
	for _, catalyst := range []string{"", "quality_dust", "prismatic_core"} {
		recipe := RecipeDefinition{MinimumRarity: "Comum", MaximumRarity: "Lendário"}
		distribution := CraftRarityDistribution(recipe, catalyst)
		total := 0.0
		expectedRank := 0.0
		for _, chance := range distribution {
			if chance < 0 || chance > 1 {
				t.Fatalf("chance inválida em %s: %f", catalyst, chance)
			}
			total += chance
		}
		for rarity, chance := range distribution {
			expectedRank += float64(rarityRank(rarity)) * chance
		}
		if math.Abs(total-1) > 0.000001 {
			t.Fatalf("distribuição %s soma %f", catalyst, total)
		}
		if expectedRank+0.000001 < previousExpectedRank {
			t.Fatalf("catalisador %s reduziu a qualidade esperada", catalyst)
		}
		previousExpectedRank = expectedRank
	}
}

func TestProgressionFieldsRemainMonotonic(t *testing.T) {
	character := &CharacterData{Level: 3, Experience: 10, HighestLevelEver: 3, LifetimeExperience: 1000, ProgressionVersion: 1}
	oldLifetime := character.LifetimeExperience
	ApplyExperienceGain(character, 5000)
	if character.Level < 3 || character.HighestLevelEver < character.Level {
		t.Fatalf("progressão regrediu: %+v", character)
	}
	if character.LifetimeExperience != oldLifetime+5000 {
		t.Fatalf("XP vitalício incorreto: %d", character.LifetimeExperience)
	}
	if character.XPRequired <= 0 || character.XPPercent < 0 || character.XPPercent > 100 {
		t.Fatalf("visão de XP inválida: %+v", character)
	}
}