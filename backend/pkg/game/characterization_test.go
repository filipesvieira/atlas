package game

import (
	"testing"
)

// TestCharacterization_StatsAndCapacity congela o comportamento base de cálculo
// de atributos derivados, capacidades e slots para garantir zero regressão.
func TestCharacterization_StatsAndCapacity(t *testing.T) {
	char := &CharacterData{
		Level: 10,
		STR:   20,
		DEX:   15,
		INT:   10,
		VIT:   12,
	}
	inv := &InventoryData{
		Equipment: EquipmentSlots{
			MainHand: &Item{Name: "Espada do Aprendiz", Attack: 12, RequiredLevel: 1},
			Chest:    &Item{Name: "Cota de Malha", Defense: 8, RequiredLevel: 5},
			Bag:      &Item{Name: "Mochila de Aventureiro", Rarity: "Raro", RequiredLevel: 8},
		},
		Backpack: []Item{
			{Name: "Poção", Weight: 2.5},
			{Name: "Pedra", Weight: 10.0},
		},
	}

	stats := CalculateDerivedStats(char, inv, "balanced")

	// 1. MaxHealth: 100 + (VIT * 25) + (Level * 10) = 100 + 300 + 100 = 500
	if stats.MaxHealth != 500 {
		t.Errorf("MaxHealth esperado 500, obtido %d", stats.MaxHealth)
	}

	// 2. MaxMana: 30 + (INT * 12) + (Level * 5) = 30 + 120 + 50 = 200
	if stats.MaxMana != 200 {
		t.Errorf("MaxMana esperado 200, obtido %d", stats.MaxMana)
	}

	// 3. Capacidade Total: 1000 + (Level*10) + (STR*15) + Bônus Raro (500) = 1000 + 100 + 300 + 500 = 1900
	if stats.TotalCapacity != 1900 {
		t.Errorf("TotalCapacity esperado 1900, obtido %d", stats.TotalCapacity)
	}

	// 4. Slots Totais: 20 base + 8 (Raro) = 28
	if stats.MaxSlots != 28 {
		t.Errorf("MaxSlots esperado 28, obtido %d", stats.MaxSlots)
	}

	// 5. TotalAttack: Base(12) * (1.0 + STR(20)/100) = 12 * 1.2 = 14
	if stats.TotalAttack != 14 {
		t.Errorf("TotalAttack esperado 14, obtido %d", stats.TotalAttack)
	}

	// 6. TotalDefense: VIT*0.5 (6) + 8 = 14
	if stats.TotalDefense != 14 {
		t.Errorf("TotalDefense esperado 14, obtido %d", stats.TotalDefense)
	}
}

// TestCharacterization_ExpeditionProgression congela a matriz canônica de regiões.
func TestCharacterization_ExpeditionProgression(t *testing.T) {
	regions := ExpeditionRegions

	// Garantir que as 9 regiões canônicas existam e possuam chefes
	expectedRegions := []string{
		"forest", "shereque", "chapolin", "orcruins", "esgotos",
		"planalto", "rogartes", "frozen", "abyss",
	}

	for _, regKey := range expectedRegions {
		reg, exists := regions[regKey]
		if !exists {
			t.Fatalf("Região canônica %s não encontrada em GetExpeditionRegions", regKey)
		}
		if reg.Boss.Key == "" {
			t.Errorf("Região %s não possui Boss configurado", regKey)
		}
		if reg.MaxStages <= 0 {
			t.Errorf("Região %s possui MaxStages inválido (%d)", regKey, reg.MaxStages)
		}
		if len(reg.Monsters) == 0 {
			t.Errorf("Região %s não possui monstros configurados", regKey)
		}
	}
}
