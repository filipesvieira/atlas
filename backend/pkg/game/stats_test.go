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

func TestCalculateDerivedStats_AttackSpeedScaling(t *testing.T) {
	// 1. Unarmed
	char := &CharacterData{Level: 1, DEX: 5}
	inv := &InventoryData{Equipment: EquipmentSlots{}}
	stats := CalculateDerivedStats(char, inv, "balanced")
	if stats.AttackSpeedSeconds < 2.30 || stats.AttackSpeedSeconds > 2.45 {
		t.Fatalf("Velocidade esperada para desarmado ~2.40s, obtido: %.2fs", stats.AttackSpeedSeconds)
	}

	// 2. 1H Sword vs 2H Greatsword
	inv1H := &InventoryData{Equipment: EquipmentSlots{
		MainHand: &Item{WeaponType: "sword", Hands: 1, PhysicalAttack: 20},
	}}
	inv2H := &InventoryData{Equipment: EquipmentSlots{
		MainHand: &Item{WeaponType: "sword", Hands: 2, PhysicalAttack: 45},
	}}
	stats1H := CalculateDerivedStats(char, inv1H, "balanced")
	stats2H := CalculateDerivedStats(char, inv2H, "balanced")

	if stats1H.AttackSpeedSeconds >= stats2H.AttackSpeedSeconds {
		t.Fatalf("Arma de 1 mão (%.2fs) deve ser mais rápida que arma de 2 mãos (%.2fs)", stats1H.AttackSpeedSeconds, stats2H.AttackSpeedSeconds)
	}

	// 3. DEX Scaling: High DEX should reduce attack interval
	charHighDEX := &CharacterData{Level: 50, DEX: 200}
	statsHighDEX := CalculateDerivedStats(charHighDEX, inv1H, "balanced")
	if statsHighDEX.AttackSpeedSeconds >= stats1H.AttackSpeedSeconds {
		t.Fatalf("DEX 200 (%.2fs) deve atacar mais rápido que DEX 5 (%.2fs)", statsHighDEX.AttackSpeedSeconds, stats1H.AttackSpeedSeconds)
	}
}

func TestMonster_AttackSpeedInitialization(t *testing.T) {
	// 1. Testa que GetRandomMonsterForRegion retorna monstro com AttackSpeedSeconds de 2.5s
	mob := GetRandomMonsterForRegion("forest", nil)
	if mob.AttackSpeedSeconds != 2.50 {
		t.Fatalf("Esperado AttackSpeedSeconds padrão de 2.50s para o monstro, obtido: %.2f", mob.AttackSpeedSeconds)
	}

	// 2. Testa que todas as regiões têm monstros com velocidade válida
	for _, reg := range ListExpeditionRegions() {
		for _, m := range reg.Monsters {
			spd := m.AttackSpeedSeconds
			if spd <= 0 {
				spd = DefaultMonsterAttackSpeed
			}
			if spd < 1.0 || spd > 5.0 {
				t.Errorf("Monstro %s na região %s com velocidade de ataque fora dos limites: %.2f", m.Name, reg.ID, spd)
			}
		}
	}
}


