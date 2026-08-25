package game

import (
	"testing"
)

func TestSellOverflowItem(t *testing.T) {
	char := &CharacterData{
		ID:       "char-123",
		Name:     "TestChar",
		GoldBank: 100,
	}
	inv := &InventoryData{
		Backpack: []Item{},
	}

	session := NewGameSession(char, inv, nil, nil, nil, nil)
	session.OverflowChest = []Item{
		{ID: "item-1", Name: "Pequena Bolsa", ValueGold: 9, Rarity: "Incomum"},
		{ID: "item-2", Name: "Espada Rara", ValueGold: 50, Rarity: "Raro"},
	}

	// Vende o primeiro item
	session.SellOverflowItem("item-1")

	if len(session.OverflowChest) != 1 {
		t.Fatalf("Esperado 1 item restante no baú, obtido %d", len(session.OverflowChest))
	}
	if session.OverflowChest[0].ID != "item-2" {
		t.Errorf("Item restante deveria ser item-2, obtido %s", session.OverflowChest[0].ID)
	}
	if session.Character.GoldBank != 109 {
		t.Errorf("Esperado 109 de ouro (100 + 9), obtido %d", session.Character.GoldBank)
	}
}

func TestSellAllOverflow(t *testing.T) {
	char := &CharacterData{
		ID:       "char-123",
		Name:     "TestChar",
		GoldBank: 100,
	}
	inv := &InventoryData{
		Backpack: []Item{},
	}

	session := NewGameSession(char, inv, nil, nil, nil, nil)
	session.OverflowChest = []Item{
		{ID: "item-1", Name: "Pequena Bolsa", ValueGold: 9, Rarity: "Incomum"},
		{ID: "item-2", Name: "Pequena Bolsa", ValueGold: 6, Rarity: "Incomum"},
		{ID: "item-3", Name: "Pequena Bolsa", ValueGold: 6, Rarity: "Incomum"},
	}

	// Vende todos os itens do baú
	session.SellAllOverflow()

	if len(session.OverflowChest) != 0 {
		t.Fatalf("Esperado 0 itens no baú após Vender Todos, obtido %d", len(session.OverflowChest))
	}
	if session.Character.GoldBank != 121 {
		t.Errorf("Esperado 121 de ouro (100 + 9 + 6 + 6), obtido %d", session.Character.GoldBank)
	}
}