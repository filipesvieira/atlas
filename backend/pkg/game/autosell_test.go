package game

import (
	"testing"
)

func TestCalculateOccupancyPercent(t *testing.T) {
	// 15 itens em 20 slots = 75%
	occ := CalculateOccupancyPercent(15, 20, 500, 1000)
	if occ != 75 {
		t.Errorf("Esperado 75%% de ocupação, obtido %d%%", occ)
	}

	// Peso mais restritivo: 850 / 1000 = 85% com 10 itens
	occ = CalculateOccupancyPercent(10, 20, 850, 1000)
	if occ != 85 {
		t.Errorf("Esperado 85%% de ocupação pelo peso, obtido %d%%", occ)
	}
}

func TestCalculateAutoSellItemPrice(t *testing.T) {
	it := Item{ValueGold: 100}
	price := CalculateAutoSellItemPrice(it)
	if price != 80 {
		t.Errorf("Esperado 80 de ouro (80%% de 100), obtido %d", price)
	}
}

func TestEvaluateAutoSell_ProtectionsAndTarget(t *testing.T) {
	settings := DefaultAutoSellSettings()
	settings.Enabled = true
	settings.TriggerPercent = 75
	settings.TargetPercent = 50
	settings.SellRarities = []string{"Comum", "Incomum"}
	settings.OnlyDuplicates = true
	settings.KeepBestPerTemplate = 1

	maxSlots := 20
	maxWeight := 1000.0

	// Cria 16 itens (80% ocupação, acima do gatilho de 75%)
	backpack := []Item{
		// Manual de Construção (PROTEÇÃO RÍGIDA)
		{ID: "manual1", Name: "Manual: Armazém", SlotType: string(SlotManual), ItemKind: ItemKindConstructionManual, Rarity: "Comum", ValueGold: 50, Weight: 5.0},
		// Raro (PROTEÇÃO DE RARIDADE)
		{ID: "rare1", Name: "Espada de Fogo", SlotType: string(SlotMainHand), Rarity: "Raro", ValueGold: 500, Weight: 20.0},
		// 3 cópias de Espada do Aprendiz (Comum)
		{ID: "sw1", Name: "Espada do Aprendiz", SlotType: string(SlotMainHand), Rarity: "Comum", ValueGold: 20, Attack: 8, Weight: 15.0},
		{ID: "sw2", Name: "Espada do Aprendiz", SlotType: string(SlotMainHand), Rarity: "Comum", ValueGold: 20, Attack: 7, Weight: 15.0},
		{ID: "sw3", Name: "Espada do Aprendiz", SlotType: string(SlotMainHand), Rarity: "Comum", ValueGold: 20, Attack: 6, Weight: 15.0},
		// 3 cópias de Capacete de Couro (Comum)
		{ID: "helm1", Name: "Capacete de Couro", SlotType: string(SlotHead), Rarity: "Comum", ValueGold: 15, Weight: 10.0},
		{ID: "helm2", Name: "Capacete de Couro", SlotType: string(SlotHead), Rarity: "Comum", ValueGold: 15, Weight: 10.0},
		{ID: "helm3", Name: "Capacete de Couro", SlotType: string(SlotHead), Rarity: "Comum", ValueGold: 15, Weight: 10.0},
	}
	// Adiciona mais 8 itens genéricos para totalizar 16
	for i := 1; i <= 8; i++ {
		backpack = append(backpack, Item{
			ID:        string(rune('a' + i)),
			Name:      "Graveto Mágico",
			SlotType:  string(SlotMainHand),
			Rarity:    "Comum",
			ValueGold: 10,
			Weight:    5.0,
		})
	}

	currentWeight := 0.0
	for _, it := range backpack {
		currentWeight += it.Weight
	}

	result := EvaluateAutoSell(settings, backpack, maxSlots, currentWeight, maxWeight)

	if !result.ShouldTrigger {
		t.Fatalf("AutoSell deveria disparar para ocupação de 80%% (trigger = 75%%)")
	}

	// Verifica se o manual e o item raro foram preservados
	for _, it := range result.ItemsToSell {
		if it.ItemKind == ItemKindConstructionManual {
			t.Errorf("VIOLAÇÃO: Manual de Construção %s foi marcado para venda automática!", it.Name)
		}
		if it.Rarity == "Raro" {
			t.Errorf("VIOLAÇÃO: Item Raro %s foi marcado para venda automática!", it.Name)
		}
	}

	// Verifica se a melhor cópia de cada template foi preservada
	bestSwordPreserved := false
	for _, it := range result.ItemsKept {
		if it.ID == "sw1" {
			bestSwordPreserved = true
		}
	}
	if !bestSwordPreserved {
		t.Errorf("Melhor cópia de Espada do Aprendiz (sw1) deveria ser preservada")
	}

	// Verifica se o resultado vendeu itens suficientes para reduzir a ocupação
	if len(result.ItemsToSell) == 0 {
		t.Errorf("Deveria haver itens vendidos para atingir a meta")
	}
}

func TestEvaluateAutoSell_DoesNotTriggerBelowThreshold(t *testing.T) {
	settings := DefaultAutoSellSettings()
	settings.Enabled = true
	settings.TriggerPercent = 75
	settings.TargetPercent = 60

	// 5 itens em 20 slots = 25% (bem abaixo de 75%)
	backpack := []Item{
		{ID: "1", Name: "Espada", SlotType: string(SlotMainHand), Rarity: "Comum", ValueGold: 10, Weight: 10},
		{ID: "2", Name: "Espada", SlotType: string(SlotMainHand), Rarity: "Comum", ValueGold: 10, Weight: 10},
	}

	result := EvaluateAutoSell(settings, backpack, 20, 20.0, 1000.0)
	if result.ShouldTrigger {
		t.Errorf("Não deveria disparar auto-venda abaixo do gatilho")
	}
	if len(result.ItemsToSell) != 0 {
		t.Errorf("Nenhum item deveria ser vendido")
	}
}