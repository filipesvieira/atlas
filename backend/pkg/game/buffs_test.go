package game

import (
	"testing"
	"time"
)

func TestMealBuffUsesWallClockInterval(t *testing.T) {
	start := time.Date(2026, 8, 20, 12, 0, 0, 0, time.UTC)
	buff := ActiveBuff{Category: BuffCategoryMeal, EffectKey: BuffEffectXPGainPercent, Magnitude: 5, StartedAt: start, ExpiresAt: start.Add(20 * time.Minute)}
	if got := ApplyXPGainBuff(100, []ActiveBuff{buff}, start.Add(10*time.Minute)); got != 105 {
		t.Fatalf("XP durante refeição = %d; esperado 105", got)
	}
	if got := ApplyXPGainBuff(100, []ActiveBuff{buff}, start.Add(21*time.Minute)); got != 100 {
		t.Fatalf("XP após expiração = %d; esperado 100", got)
	}
}

func TestMealAndPotionXPGainBuffsStack(t *testing.T) {
	start := time.Date(2026, 8, 20, 12, 0, 0, 0, time.UTC)
	buffs := []ActiveBuff{
		{Category: BuffCategoryMeal, EffectKey: BuffEffectXPGainPercent, Magnitude: 5, StartedAt: start, ExpiresAt: start.Add(time.Hour)},
		{Category: BuffCategoryPotion, EffectKey: BuffEffectXPGainPercent, Magnitude: 5, StartedAt: start, ExpiresAt: start.Add(time.Hour)},
	}
	if got := ActiveBuffMultiplier(buffs, BuffEffectXPGainPercent, start.Add(10*time.Minute)); got < 1.099 || got > 1.101 {
		t.Fatalf("multiplicador de XP refeição + poção = %.2f; esperado 1.10", got)
	}
	if got := ApplyXPGainBuff(100, buffs, start.Add(10*time.Minute)); got != 110 {
		t.Fatalf("XP com refeição + poção = %d; esperado 110", got)
	}
}

func TestAttackMealChangesDerivedAttackOnlyWhileActive(t *testing.T) {
	start := time.Date(2026, 8, 20, 12, 0, 0, 0, time.UTC)
	base := DerivedStats{TotalAttack: 100, CurrentDPS: 80, TotalDefense: 50}
	buff := ActiveBuff{Category: BuffCategoryMeal, EffectKey: BuffEffectAttackPercent, Magnitude: 10, StartedAt: start, ExpiresAt: start.Add(time.Hour)}
	active := ApplyActiveBuffsToDerivedStats(base, []ActiveBuff{buff}, start.Add(30*time.Minute))
	if active.TotalAttack != 110 || active.CurrentDPS != 88 || active.TotalDefense != 50 {
		t.Fatalf("buff ofensivo inesperado: %+v", active)
	}
	expired := ApplyActiveBuffsToDerivedStats(base, []ActiveBuff{buff}, start.Add(2*time.Hour))
	if expired != base {
		t.Fatalf("buff expirado alterou atributos: %+v", expired)
	}
}

func TestConsumableRegistryMatchesResources(t *testing.T) {
	EnsureEconomyResourcesRegistered()
	if err := ValidateConsumableRegistry(); err != nil {
		t.Fatalf("ValidateConsumableRegistry falhou: %v", err)
	}
	if len(ListConsumableDefinitions()) != 9 {
		t.Fatalf("esperados 9 consumíveis iniciais")
	}
}
