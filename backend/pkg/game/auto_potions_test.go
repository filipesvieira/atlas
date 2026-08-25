package game

import (
	"testing"
	"time"
)

func TestAutoPotionBudgetAndCooldown(t *testing.T) {
	now := time.Date(2026, 8, 23, 12, 0, 0, 0, time.UTC)
	settings := AutoPotionSettings{
		Enabled:                true,
		HealthThresholdPercent: 30,
		ManaThresholdPercent:   25,
		MaxGoldPerExpedition:   25,
	}
	state := DefaultAutoPotionState()
	if reason := CanSpendAutoPotion(settings, state, AutoPotionKindHealth, 100, now); reason != "" {
		t.Fatalf("frasco de vida deveria poder ser comprado: %s", reason)
	}
	state = ApplyAutoPotionSpend(state, AutoPotionKindHealth, now)
	if state.GoldSpent != AutoPotionHealthCost {
		t.Fatalf("ouro gasto incorreto: %d", state.GoldSpent)
	}
	if reason := CanSpendAutoPotion(settings, state, AutoPotionKindHealth, 100, now.Add(time.Second)); reason != "cooldown" {
		t.Fatalf("esperava cooldown, obtido %q", reason)
	}
	if reason := CanSpendAutoPotion(settings, state, AutoPotionKindMana, 100, now.Add(time.Second)); reason != "budget_exhausted" {
		t.Fatalf("orçamento restante não deveria pagar mana, obtido %q", reason)
	}
}

func TestAutoPotionHealthIsAppliedBeforeDefeatInMemory(t *testing.T) {
	character := &CharacterData{ID: "auto-potion-test", Health: 20, MaxHealth: 100, GoldBank: 60}
	session := NewGameSession(character, &InventoryData{Backpack: []Item{}}, nil, nil, nil, nil)
	session.AutoPotionSettings = AutoPotionSettings{
		Enabled:                true,
		HealthThresholdPercent: 30,
		ManaThresholdPercent:   25,
		MaxGoldPerExpedition:   50,
	}
	used, budgetNotice := session.tryAutoHealthPotion(time.Now().UTC())
	if !used || budgetNotice {
		t.Fatalf("frasco de vida deveria ser aplicado sem encerrar orçamento: used=%v notice=%v", used, budgetNotice)
	}
	if character.Health != 55 {
		t.Fatalf("vida após frasco esperada 55, obtida %d", character.Health)
	}
	if character.GoldBank != 45 {
		t.Fatalf("ouro após frasco esperado 45, obtido %d", character.GoldBank)
	}
}

func TestAutoPotionManaIgnoresSkillCooldownWhenBelowThreshold(t *testing.T) {
	character := &CharacterData{ID: "auto-mana-test", Level: 20, Mana: 0, MaxMana: 100, GoldBank: 60}
	session := NewGameSession(character, &InventoryData{Backpack: []Item{}}, nil, nil, nil, nil)
	session.AutoPotionSettings = AutoPotionSettings{
		Enabled:                true,
		HealthThresholdPercent: 30,
		ManaThresholdPercent:   25,
		MaxGoldPerExpedition:   50,
	}
	session.SkillCooldowns = map[string]int{"fireball": 3}

	used, budgetNotice := session.tryAutoManaPotion(time.Now().UTC(), []string{"fireball"})
	if !used || budgetNotice {
		t.Fatalf("frasco de mana deveria ser aplicado mesmo com a magia em cooldown: used=%v notice=%v", used, budgetNotice)
	}
	if character.Mana != 45 {
		t.Fatalf("mana após frasco esperada 45, obtida %d", character.Mana)
	}
	if character.GoldBank != 48 {
		t.Fatalf("ouro após frasco esperado 48, obtido %d", character.GoldBank)
	}
}
