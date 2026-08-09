package game

import (
	"testing"
)

func TestCalculateDerivedStats_DEXCurveAndCritCap(t *testing.T) {
	// 1. Testar DEX 392 sem equipamento -> ~19.16%
	char := &CharacterData{
		Level: 105,
		STR:   83,
		DEX:   392,
		INT:   36,
		VIT:   5,
	}
	inv := &InventoryData{Equipment: EquipmentSlots{}}
	stats := CalculateDerivedStats(char, inv, "balanced")

	if stats.CritChance < 19.0 || stats.CritChance > 19.3 {
		t.Fatalf("CritChance esperada para 392 DEX ~= 19.16%%, obtido: %.2f%%", stats.CritChance)
	}

	// 2. Testar que com DEX extrema (ex: 5000) e múltiplos itens o crítico NUNCA excede o Hard Cap de 50.0%
	charExtreme := &CharacterData{
		Level: 100,
		DEX:   5000,
	}
	invOverkill := &InventoryData{
		Equipment: EquipmentSlots{
			MainHand: &Item{CritChance: 40.0},
			Ammo:     &Item{CritChance: 30.0},
		},
	}
	extremeStats := CalculateDerivedStats(charExtreme, invOverkill, "balanced")
	if extremeStats.CritChance > 50.0 {
		t.Fatalf("CritChance excedeu o Hard Cap de 50%%: %.2f%%", extremeStats.CritChance)
	}
}

func TestCalculateDerivedStats_AttributeBrackets(t *testing.T) {
	brackets := []int{5, 25, 50, 100, 200, 392, 500}
	for _, val := range brackets {
		char := &CharacterData{
			Level: 50,
			STR:   val,
			DEX:   val,
			INT:   val,
			VIT:   val,
		}
		inv := &InventoryData{Equipment: EquipmentSlots{}}
		stats := CalculateDerivedStats(char, inv, "balanced")

		if stats.EffectiveDEX != val {
			t.Errorf("EffectiveDEX incorreto para %d: %d", val, stats.EffectiveDEX)
		}
		if stats.CritChance > 50.0 {
			t.Errorf("CritChance excedeu 50%% para %d DEX: %.2f%%", val, stats.CritChance)
		}
		if stats.ManaRegenPerSecond <= 0 {
			t.Errorf("ManaRegenPerSecond inválido para %d INT: %.2f", val, stats.ManaRegenPerSecond)
		}
	}
}
