package game

import (
	"testing"
	"time"
)

func TestProtocolV3HotEventsUseCharacterDelta(t *testing.T) {
	char := &CharacterData{ID: "char-v3", Name: "Teste", Level: 7, Health: 91, MaxHealth: 100, Mana: 33, MaxMana: 50, GoldBank: 777}
	inv := &InventoryData{Equipment: EquipmentSlots{}, Backpack: []Item{}, Cap: 1500}
	s := NewGameSession(char, inv, nil, nil, nil, nil)
	s.Mu.Lock()
	s.broadcastMessage(CombatMessage{Type: "TICK_UPDATE", Character: s.Character, ActiveRegion: s.ActiveRegion})
	s.Mu.Unlock()

	select {
	case msg := <-s.SendChannel:
		if msg.ProtocolVersion != 3 {
			t.Fatalf("protocolo esperado=3, obtido=%d", msg.ProtocolVersion)
		}
		if msg.Character != nil {
			t.Fatal("evento de caminho quente não deve carregar snapshot completo do personagem")
		}
		if msg.CharacterDelta == nil || msg.CharacterDelta.Health != 91 || msg.CharacterDelta.GoldBank != 777 {
			t.Fatalf("delta inválido: %+v", msg.CharacterDelta)
		}
	case <-time.After(time.Second):
		t.Fatal("evento V3 não foi enfileirado")
	}
}

func TestPersistenceQueueDrainsOutsideSessionLock(t *testing.T) {
	char := &CharacterData{ID: "char-persist", Name: "Teste", Level: 1, Health: 100, MaxHealth: 100}
	inv := &InventoryData{Equipment: EquipmentSlots{}, Backpack: []Item{}, Cap: 1500, Revision: 1}
	calls := 0
	s := NewGameSession(char, inv, func(_ string, snapshot *InventoryData) error {
		calls++
		snapshot.Revision++
		return nil
	}, nil, nil, nil)

	s.Mu.Lock()
	s.Inventory.Backpack = append(s.Inventory.Backpack, Item{ID: "loot-1", Name: "Loot"})
	s.enqueueInventoryPersistence()
	s.Mu.Unlock()

	if !s.DrainPersistence(time.Second) {
		t.Fatal("fila de persistência não drenou")
	}
	if calls != 1 {
		t.Fatalf("esperava 1 persistência, obteve %d", calls)
	}
	if s.Inventory.Revision != 2 {
		t.Fatalf("revisão da sessão não foi absorvida: %d", s.Inventory.Revision)
	}
}
