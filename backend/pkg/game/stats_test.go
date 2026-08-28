package game

import (
	"math/rand"
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

func TestCalculateDerivedStats_DPSUsesRealAttackInterval(t *testing.T) {
	char := &CharacterData{Level: 1, DEX: 5, INT: 5}
	inv := &InventoryData{Equipment: EquipmentSlots{
		MainHand: &Item{WeaponType: "wand", Hands: 1, MagicAttack: 20},
	}}

	stats := CalculateDerivedStats(char, inv, "balanced")

	// A varinha causa 21 de ataque, ataca a cada 1,99s e tem ~5,41% de
	// crítico. O DPS esperado arredonda para 11. O antigo multiplicador de
	// arquétipo produziria 14 e não correspondia ao cooldown real.
	if stats.CurrentDPS != 11 {
		t.Fatalf("DPS de varinha deveria refletir o intervalo real de ataque: esperado 11, obtido %d (stats=%+v)", stats.CurrentDPS, stats)
	}
}

func TestCalculateDerivedStats_MovementSpeedComesOnlyFromBoots(t *testing.T) {
	char := &CharacterData{Level: 1, STR: 5, DEX: 5, INT: 5, VIT: 5}

	withoutBoots := CalculateDerivedStats(char, &InventoryData{Equipment: EquipmentSlots{}}, "balanced")
	if withoutBoots.MovementSpeedMultiplier != BaseHeroMovementSpeedMultiplier {
		t.Fatalf("velocidade base esperada %.2f, obtida %.2f", BaseHeroMovementSpeedMultiplier, withoutBoots.MovementSpeedMultiplier)
	}

	// Um bônus acidental em arma não pode alterar deslocamento.
	withWeaponOnly := CalculateDerivedStats(char, &InventoryData{Equipment: EquipmentSlots{
		MainHand: &Item{MovementSpeedBonus: 50},
	}}, "balanced")
	if withWeaponOnly.MovementSpeedMultiplier != BaseHeroMovementSpeedMultiplier {
		t.Fatalf("bônus fora das botas alterou movimento: %.2f", withWeaponOnly.MovementSpeedMultiplier)
	}

	withBoots := CalculateDerivedStats(char, &InventoryData{Equipment: EquipmentSlots{
		Boots: &Item{MovementSpeedBonus: 12.5},
	}}, "balanced")
	expectedBootSpeed := BaseHeroMovementSpeedMultiplier + .125
	if withBoots.MovementSpeedMultiplier < expectedBootSpeed-.001 || withBoots.MovementSpeedMultiplier > expectedBootSpeed+.001 {
		t.Fatalf("bônus das botas deveria resultar em %.3fx, obtido %.3f", expectedBootSpeed, withBoots.MovementSpeedMultiplier)
	}

	legacyBoots := CalculateDerivedStats(char, &InventoryData{Equipment: EquipmentSlots{
		Boots: &Item{TemplateKey: "botas_de_couro", Rarity: "Raro"},
	}}, "balanced")
	expectedLegacyBootSpeed := BaseHeroMovementSpeedMultiplier + .165
	if legacyBoots.MovementSpeedMultiplier < expectedLegacyBootSpeed-.001 || legacyBoots.MovementSpeedMultiplier > expectedLegacyBootSpeed+.001 {
		t.Fatalf("bota legada deveria resultar em %.3fx, obtido %.3f", expectedLegacyBootSpeed, legacyBoots.MovementSpeedMultiplier)
	}

	generatedBoots := GenerateItemFromTemplate("Sandálias Ágeis", "Comum", rand.New(rand.NewSource(7)))
	if generatedBoots == nil || generatedBoots.MovementSpeedBonus != 8.0 {
		t.Fatalf("template das sandálias deveria gerar +8%% movimento, obtido %+v", generatedBoots)
	}
}

func TestAllBootTemplatesHaveTierScaledMovementBonus(t *testing.T) {
	expected := map[string]struct {
		tier  int
		level int
		bonus float64
	}{
		"sandalias_ageis":         {tier: 1, level: 1, bonus: 8},
		"botas_de_couro_pioneiro": {tier: 1, level: 1, bonus: 6},
		"botas_do_urso_ranzinza":  {tier: 1, level: 5, bonus: 6},
		"sapatilhas_da_feiona":    {tier: 1, level: 5, bonus: 8},
		"botas_de_couro":          {tier: 2, level: 8, bonus: 10},
		"coturno_da_lei":          {tier: 2, level: 8, bonus: 8},
		"botas_de_ferro":          {tier: 3, level: 15, bonus: 9},
		"botas_de_aco_runico":     {tier: 4, level: 25, bonus: 14},
		"botas_celestiais":        {tier: 5, level: 40, bonus: 20},
	}

	bootCount := 0
	for _, template := range ItemRegistry.List() {
		if template.Slot != SlotBoots {
			continue
		}
		bootCount++
		expectation, ok := expected[template.Key]
		if !ok {
			t.Errorf("bota %q não possui regra de progressão registrada", template.Key)
			continue
		}
		if template.Tier != expectation.tier || template.RequiredLevel != expectation.level || template.BaseMovementSpeedBonus != expectation.bonus {
			t.Errorf("bota %s: esperado tier %d nível %d bônus %.1f%%, obtido tier %d nível %d bônus %.1f%%", template.Key, expectation.tier, expectation.level, expectation.bonus, template.Tier, template.RequiredLevel, template.BaseMovementSpeedBonus)
		}
	}

	if bootCount != len(expected) {
		t.Fatalf("catálogo possui %d botas, mas eram esperadas %d", bootCount, len(expected))
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