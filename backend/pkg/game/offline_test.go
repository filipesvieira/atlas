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
	// Fixture deliberadamente forte: os testes de progressão abaixo validam
	// o caminho de vitória; a derrota é coberta por um cenário dedicado.
	sword.PhysicalAttack = 120
	sword.Attack = 120
	sword.Lifesteal = 20
	shield.Defense = 120
	start := time.Date(2026, 8, 6, 8, 0, 0, 0, time.UTC)
	return OfflineSimulationInput{
		Character:          &CharacterData{ID: "char_test", Level: 12, STR: 20, DEX: 8, INT: 6, VIT: 80, ActiveRegion: "orcruins", ActiveStance: "balanced"},
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

func TestShieldMasteryRequiresDamageAndShield(t *testing.T) {
	shield := &Item{WeaponType: WeaponTypeShield}
	withShield := &InventoryData{Equipment: EquipmentSlots{OffHand: shield}}
	withoutShield := &InventoryData{Equipment: EquipmentSlots{}}

	if got := shieldMasteryTriesForDamage(withShield, 0); got != 0 {
		t.Fatalf("ataque sem dano não deveria conceder maestria de escudo: %d", got)
	}
	if got := shieldMasteryTriesForDamage(withoutShield, 10); got != 0 {
		t.Fatalf("dano sem escudo não deveria conceder maestria de escudo: %d", got)
	}
	if got := shieldMasteryTriesForDamage(withShield, 10); got != 1 {
		t.Fatalf("dano com escudo deveria conceder exatamente uma tentativa: %d", got)
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
	// Nova semântica: RegionsUnlocked contém o ID da própria região derrotada
	// (marcador "boss derrotado"), não as próximas regiões.
	// O fixture usa ActiveRegion = "orcruins", então após derrotar o boss de orcruins
	// esperamos "orcruins" em RegionsUnlocked.
	foundOrcruins := false
	for _, regionID := range result.RegionsUnlocked {
		if regionID == "orcruins" {
			foundOrcruins = true
			break
		}
	}
	if !foundOrcruins {
		t.Fatalf("boss de orcruins não foi registrado como derrotado: %+v", result.RegionsUnlocked)
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
	// Personagem sem nenhum boss derrotado ainda
	input.Character.UnlockedRegions = []string{}
	input.CurrentStage = 5
	input.IsBossStage = true
	input.PeriodEnd = input.PeriodStart.Add(30 * time.Minute)
	first := CalculateOfflineProgress(input)
	second := CalculateOfflineProgress(input)
	if !reflect.DeepEqual(first.RegionsUnlocked, second.RegionsUnlocked) {
		t.Fatalf("ordem de desbloqueios não determinística: %v / %v", first.RegionsUnlocked, second.RegionsUnlocked)
	}
	// Nova semântica: apenas "forest" é registrado (boss da floresta derrotado),
	// não mais as próximas regiões. Rogartes/Esgotos/Planalto são desbloqueados implicitamente
	// via CheckRegionAvailability quando todos os chefes do Tier 1 estiverem em UnlockedRegions.
	if len(first.RegionsUnlocked) != 1 || first.RegionsUnlocked[0] != "forest" {
		t.Fatalf("desbloqueios inesperados: %v (esperado [forest])", first.RegionsUnlocked)
	}
}

func TestOfflineSimulationStopsOnDefeatWithoutGrantingIncompleteBoss(t *testing.T) {
	rng := rand.New(rand.NewSource(19))
	starter := GenerateItemFromTemplate("Espada do Aprendiz", "Comum", rng)
	start := time.Date(2026, 8, 14, 10, 0, 0, 0, time.UTC)
	input := OfflineSimulationInput{
		Character:          &CharacterData{ID: "weak_char", Level: 5, Health: 345, STR: 5, DEX: 5, INT: 5, VIT: 5, ActiveRegion: "frozen", ActiveStance: "balanced"},
		Inventory:          &InventoryData{Equipment: EquipmentSlots{MainHand: starter}, Backpack: []Item{}, Cap: 1500},
		IsExpeditionActive: true,
		ActiveRegion:       "frozen",
		ActiveStance:       "balanced",
		CurrentStage:       5,
		IsBossStage:        true,
		PeriodStart:        start,
		PeriodEnd:          start.Add(30 * time.Minute),
		StateRevision:      1,
		Seed:               91,
	}

	result := CalculateOfflineProgress(input)
	if !result.Defeated || result.StoppedReason != "derrotado_durante_simulacao_offline" {
		t.Fatalf("herói fraco deveria ser derrotado: %+v", result)
	}
	if result.BossesDefeated != 0 || result.BossesRewarded != 0 || len(result.BossTrophies) != 0 {
		t.Fatalf("onda de chefe incompleta concedeu recompensa: %+v", result)
	}
	if result.FinalStage != 1 || result.IsBossStageAfter {
		t.Fatalf("derrota não resetou a expedição: %+v", result)
	}
	if result.FailureStage != 5 {
		t.Fatalf("fase da derrota não foi preservada: %d", result.FailureStage)
	}
	if result.HealthAfter <= 0 {
		t.Fatalf("vida de retorno inválida: %d", result.HealthAfter)
	}
}

func TestOfflineAutoResumeRespectsPersistedRecoveryWindow(t *testing.T) {
	input := offlineFixture()
	input.IsExpeditionActive = false
	input.Character.AutoResumeExpedition = true
	input.Character.ExpeditionRecoveryUntil = input.PeriodStart.Add(60 * time.Minute)

	beforeRecovery := input
	beforeRecovery.PeriodEnd = input.PeriodStart.Add(30 * time.Minute)
	if result := CalculateOfflineProgress(beforeRecovery); result.MinutesOffline != 0 || result.XPGained != 0 {
		t.Fatalf("simulação começou antes do fim da recuperação: %+v", result)
	}

	afterRecovery := input
	afterRecovery.PeriodEnd = input.PeriodStart.Add(90 * time.Minute)
	result := CalculateOfflineProgress(afterRecovery)
	if result.MinutesOffline != 30 || result.PeriodStart != input.Character.ExpeditionRecoveryUntil {
		t.Fatalf("janela offline não começou após a recuperação: %+v", result)
	}
}

func TestOfflineBossSpecialRewardsAreCappedPerAbsence(t *testing.T) {
	input := offlineFixture()
	input.ActiveRegion = "forest"
	input.Character.ActiveRegion = "forest"
	input.CurrentStage = 5
	input.IsBossStage = true
	input.PeriodEnd = input.PeriodStart.Add(MaximumOfflineMinutes * time.Minute)
	input.Inventory.Equipment.MainHand.PhysicalAttack = 5000
	input.Inventory.Equipment.MainHand.Attack = 5000
	input.Inventory.Equipment.MainHand.Lifesteal = 100
	input.Inventory.Equipment.OffHand.Defense = 5000

	result := CalculateOfflineProgress(input)
	if result.BossesRewarded > MaximumOfflineRewardedBosses {
		t.Fatalf("limite de recompensa de chefe excedido: %d", result.BossesRewarded)
	}
	var trophies int64
	for _, trophy := range result.BossTrophies {
		trophies += trophy.Quantity
	}
	if trophies > int64(MaximumOfflineRewardedBosses) {
		t.Fatalf("troféus excederam o limite de chefes premiados: %d", trophies)
	}
}

func TestOfflineSimulationAutoResumesAndFarmsOverFullDuration(t *testing.T) {
	rng := rand.New(rand.NewSource(42))
	sword := GenerateItemFromTemplate("Sabre de Bronze", "Raro", rng)
	sword.PhysicalAttack = 45
	sword.Attack = 45
	sword.Lifesteal = 8
	shield := GenerateItemFromTemplate("Escudo de Madeira", "Raro", rng)
	shield.Defense = 35
	start := time.Date(2026, 8, 17, 18, 41, 47, 0, time.UTC)
	input := OfflineSimulationInput{
		Character: &CharacterData{
			ID:                   "player_13",
			Level:                13,
			Health:               417,
			STR:                  25,
			DEX:                  15,
			INT:                  5,
			VIT:                  35,
			ActiveRegion:         "sewers",
			ActiveStance:         "balanced",
			AutoResumeExpedition: true, // Auto-retorno ativo
		},
		Inventory:          &InventoryData{Equipment: EquipmentSlots{MainHand: sword, OffHand: shield}, Backpack: []Item{}, Cap: 1500},
		IsExpeditionActive: true,
		ActiveRegion:       "sewers",
		ActiveStance:       "balanced",
		CurrentStage:       1,
		IsBossStage:        false,
		PeriodStart:        start,
		PeriodEnd:          start.Add(174 * time.Minute), // 174 minutos como na imagem do usuário
		StateRevision:      1,
		Seed:               777,
	}

	result := CalculateOfflineProgress(input)
	if result.MinutesOffline != 174 {
		t.Fatalf("tempo offline incorreto: %d", result.MinutesOffline)
	}
	if result.WavesCompleted < 20 {
		t.Fatalf("esperava dezenas de ondas completadas em 174min com auto-retorno, mas obteve %d", result.WavesCompleted)
	}
	if result.Kills < 25 {
		t.Fatalf("esperava muitos abates em 174min, obteve %d", result.Kills)
	}
	if result.XPGained < 5000 {
		t.Fatalf("esperava muito XP acumulado em 174min, obteve %d", result.XPGained)
	}
}