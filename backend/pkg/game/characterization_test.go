package game

import (
	"testing"
)

// TestCharacterization_StatsAndCapacity congela o contrato S1: nível, equipamento
// e maestrias governam os derivados; atributos primários legados são ignorados.
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

	// 1. MaxHealth: base 225 + nível 10 * 35 = 575.
	if stats.MaxHealth != 575 {
		t.Errorf("MaxHealth esperado 575, obtido %d", stats.MaxHealth)
	}

	// 2. MaxMana: base 90 + nível 10 * 12 = 210.
	if stats.MaxMana != 210 {
		t.Errorf("MaxMana esperado 210, obtido %d", stats.MaxMana)
	}

	// 3. Capacidade: base 1100 + nível 10 * 20 + mochila rara 500 = 1800.
	if stats.TotalCapacity != 1800 {
		t.Errorf("TotalCapacity esperado 1800, obtido %d", stats.TotalCapacity)
	}

	// 4. Slots Totais: 20 base + 8 (Raro) = 28
	if stats.MaxSlots != 28 {
		t.Errorf("MaxSlots esperado 28, obtido %d", stats.MaxSlots)
	}

	// 5. Ataque vem da arma/maestria, sem multiplicador de STR.
	if stats.TotalAttack != 12 {
		t.Errorf("TotalAttack esperado 12, obtido %d", stats.TotalAttack)
	}

	// 6. Defesa: base 5 + nível/4 (2) + armadura 8 = 15.
	if stats.TotalDefense != 15 {
		t.Errorf("TotalDefense esperado 15, obtido %d", stats.TotalDefense)
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
