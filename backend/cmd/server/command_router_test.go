package main

import (
	"testing"
	"time"

	"github.com/atlas/backend/pkg/game"
)

func createTestSession() *game.GameSession {
	char := &game.CharacterData{
		ID:        "char-test-1",
		Name:      "Aventureiro Teste",
		Vocation:  "warrior",
		Level:     1,
		MaxHealth: 100,
		Health:    100,
		MaxMana:   50,
		Mana:      50,
		STR:       10,
		DEX:       10,
		INT:       10,
		VIT:       10,
	}
	inv := &game.InventoryData{
		Backpack:  []game.Item{},
		Equipment: game.EquipmentSlots{},
	}
	sess := game.NewGameSession(char, inv, nil, nil, nil, nil)
	return sess
}

func TestDispatchCommand_UnknownAction(t *testing.T) {
	sess := createTestSession()
	ctx := &CommandContext{
		AccountID: "acc-1",
		CharID:    "char-test-1",
		Session:   sess,
		Action: ClientAction{
			Action: "NON_EXISTENT_ACTION",
		},
	}
	err := DispatchCommand(ctx)
	if err != nil {
		t.Errorf("Ação desconhecida não deveria retornar erro crítico, obteve %v", err)
	}
}

func TestDispatchCommand_ToggleExpedition(t *testing.T) {
	sess := createTestSession()
	ctx := &CommandContext{
		AccountID: "acc-1",
		CharID:    "char-test-1",
		Session:   sess,
		Action: ClientAction{
			Action: "TOGGLE_EXPEDITION",
		},
	}
	initialStatus := sess.IsExpeditionActive
	err := DispatchCommand(ctx)
	if err != nil {
		t.Fatalf("Erro ao despachar TOGGLE_EXPEDITION: %v", err)
	}
	if sess.IsExpeditionActive == initialStatus {
		t.Errorf("Esperado alteração em IsExpeditionActive de %v para %v", initialStatus, !initialStatus)
	}
}

func TestDispatchCommand_SetStance(t *testing.T) {
	sess := createTestSession()
	ctx := &CommandContext{
		AccountID: "acc-1",
		CharID:    "char-test-1",
		Session:   sess,
		Action: ClientAction{
			Action: "SET_STANCE",
			Stance: "offensive",
		},
	}
	err := DispatchCommand(ctx)
	if err != nil {
		t.Fatalf("Erro ao despachar SET_STANCE: %v", err)
	}
	if sess.ActiveStance != "offensive" {
		t.Errorf("Esperado ActiveStance offensive, obteve %s", sess.ActiveStance)
	}
}

func TestDispatchCommand_RequestStateSync(t *testing.T) {
	sess := createTestSession()
	ctx := &CommandContext{
		AccountID: "acc-1",
		CharID:    "char-test-1",
		Session:   sess,
		Action: ClientAction{
			Action: "REQUEST_STATE_SYNC",
		},
	}
	err := DispatchCommand(ctx)
	if err != nil {
		t.Fatalf("Erro ao despachar REQUEST_STATE_SYNC: %v", err)
	}

	select {
	case msg := <-sess.SendChannel:
		if msg.Type != "STATE_SNAPSHOT" {
			t.Errorf("Esperado mensagem do tipo STATE_SNAPSHOT, obteve %s", msg.Type)
		}
		if msg.Sequence == 0 {
			t.Errorf("Esperado sequence > 0, obteve %d", msg.Sequence)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout aguardando STATE_SNAPSHOT do servidor")
	}
}
