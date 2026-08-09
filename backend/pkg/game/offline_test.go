package game

import (
	"math/rand"
	"reflect"
	"testing"
	"time"
)

func offlineFixture() OfflineSimulationInput {
	rng := rand.New(rand.NewSource(7))
	sword := GenerateItemFromTemplate("Sabre de Bronze", "Raro", rng)
	shield := GenerateItemFromTemplate("Escudo de Madeira", "Raro", rng)
	start := time.Date(2026, 8, 6, 8, 0, 0, 0, time.UTC)
	return OfflineSimulationInput{
		Character:          &CharacterData{ID: "char_test", Level: 12, STR: 20, DEX: 8, INT: 6, VIT: 18, ActiveRegion: "orcruins", ActiveStance: "balanced"},
		Inventory:          &InventoryData{Equipment: EquipmentSlots{MainHand: sword, OffHand: shield}, Backpack: []Item{}, Cap: 1500},
		IsExpeditionActive: true,
		ActiveRegion:       "orcruins",
		ActiveStance:       "balanced",
		CurrentStage:       3,
		PeriodStart:        start,
		PeriodEnd:          start.Add(90 * time.Minute),
		StateRevision:      4,
		Seed:               12345,
	}
}

func TestOfflineSimulationIsDeterministic(t *testing.T) {
	input := offlineFixture()
	first := CalculateOfflineProgress(input)
	second := CalculateOfflineProgress(input)
	if !reflect.DeepEqual(first, second) {
		t.Fatalf("simulação offline não determinística:\n%+v\n%+v", first, second)
	}
	if first.Kills <= 0 || first.XPGained <= 0 {
		t.Fatalf("resultado inválido: %+v", first)
	}
	if first.LevelAfter <= first.LevelBefore {
		t.Fatalf("simulação longa não atualizou o nível interno: %d -> %d", first.LevelBefore, first.LevelAfter)
	}
}

func TestPausedExpeditionProducesNoOfflineRewards(t *testing.T) {
	input := offlineFixture()
	input.IsExpeditionActive = false
	input.Character.AutoResumeExpedition = false
	result := CalculateOfflineProgress(input)
	if result.MinutesOffline != 0 || result.XPGained != 0 || len(result.ItemsFound) != 0 {
		t.Fatalf("expedição pausada gerou recompensa: %+v", result)
	}
}

func TestAutoResumeExpeditionProducesOfflineRewardsWhenPausedFromDefeat(t *testing.T) {
	input := offlineFixture()
	input.IsExpeditionActive = false
	input.Character.AutoResumeExpedition = true
	result := CalculateOfflineProgress(input)
	if result.MinutesOffline <= 0 || result.XPGained <= 0 {
		t.Fatalf("auto-retorno ativo pós-derrota não gerou progresso offline: %+v", result)
	}
}

func TestEquipmentChangesOfflineEfficiency(t *testing.T) {
	geared := offlineFixture()
	ungeared := offlineFixture()
	ungeared.Inventory = &InventoryData{Equipment: EquipmentSlots{}, Backpack: []Item{}, Cap: 1500}
	withGear := CalculateOfflineProgress(geared)
	withoutGear := CalculateOfflineProgress(ungeared)
	if withGear.Kills <= withoutGear.Kills {
		t.Fatalf("equipamento não aumentou a eficiência: equipado=%d sem=%d", withGear.Kills, withoutGear.Kills)
	}
}

func TestOfflineProgressAdvancesStagesAndUnlocksBossRegion(t *testing.T) {
	input := offlineFixture()
	result := CalculateOfflineProgress(input)
	if result.WavesCompleted <= 0 {
		t.Fatalf("nenhuma onda foi concluída: %+v", result)
	}
	if result.BossesDefeated <= 0 || result.ExpeditionsCompleted <= 0 {
		t.Fatalf("a simulação longa não concluiu o ciclo de boss: %+v", result)
	}
	foundRogartes := false
	for _, regionID := range result.RegionsUnlocked {
		if regionID == "rogartes" {
			foundRogartes = true
			break
		}
	}
	if !foundRogartes {
		t.Fatalf("boss de orcruins não desbloqueou rogartes: %+v", result.RegionsUnlocked)
	}
	if result.FinalStage < 1 || result.FinalStage > 5 {
		t.Fatalf("fase final inválida: %d", result.FinalStage)
	}
	if len(result.ItemsFound) > MaximumOfflineItems {
		t.Fatalf("relatório excedeu o limite de itens: %d", len(result.ItemsFound))
	}
}

func TestOfflineBossUnlockOrderIsDeterministicAndOnlyNewRegions(t *testing.T) {
	input := offlineFixture()
	input.ActiveRegion = "forest"
	input.Character.ActiveRegion = "forest"
	input.Character.UnlockedRegions = []string{"forest", "shereque", "chapolin"}
	input.CurrentStage = 5
	input.IsBossStage = true
	input.PeriodEnd = input.PeriodStart.Add(30 * time.Minute)
	first := CalculateOfflineProgress(input)
	second := CalculateOfflineProgress(input)
	if !reflect.DeepEqual(first.RegionsUnlocked, second.RegionsUnlocked) {
		t.Fatalf("ordem de desbloqueios não determinística: %v / %v", first.RegionsUnlocked, second.RegionsUnlocked)
	}
	if len(first.RegionsUnlocked) != 3 || first.RegionsUnlocked[0] != "esgotos" || first.RegionsUnlocked[1] != "orcruins" || first.RegionsUnlocked[2] != "planalto" {
		t.Fatalf("desbloqueios inesperados: %v", first.RegionsUnlocked)
	}
}
