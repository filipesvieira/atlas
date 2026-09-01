package game

import (
	"math/rand"
	"testing"
)

func TestCalculateDerivedStats_PrimaryAttributesAreLegacyOnly(t *testing.T) {
	low := &CharacterData{Level: 25, STR: 5, DEX: 5, INT: 5, VIT: 5}
	high := &CharacterData{Level: 25, STR: 5000, DEX: 5000, INT: 5000, VIT: 5000}
	inv := &InventoryData{Equipment: EquipmentSlots{MainHand: &Item{WeaponType: "sword", Hands: 1, PhysicalAttack: 30}}}

	a := CalculateDerivedStats(low, inv, "balanced")
	b := CalculateDerivedStats(high, inv, "balanced")
	if a.TotalAttack != b.TotalAttack || a.TotalDefense != b.TotalDefense || a.MaxHealth != b.MaxHealth || a.MaxMana != b.MaxMana || a.TotalCapacity != b.TotalCapacity || a.CritChance != b.CritChance || a.AttackSpeedSeconds != b.AttackSpeedSeconds {
		t.Fatalf("atributos legados ainda alteram gameplay: low=%+v high=%+v", a, b)
	}
}

func TestCalculateDerivedStats_DistanceMasteryOwnsCritAndCadence(t *testing.T) {
	inv := &InventoryData{Equipment: EquipmentSlots{MainHand: &Item{WeaponType: "bow", Hands: 2, PhysicalAttack: 30}}}
	novice := CalculateDerivedStats(&CharacterData{Level: 25}, inv, "balanced")
	veteran := CalculateDerivedStats(&CharacterData{Level: 25, Masteries: MasteriesData{DistanceMastery: 10000}}, inv, "balanced")
	if veteran.CritChance <= novice.CritChance {
		t.Fatalf("maestria de distância deveria elevar crítico: novice=%.2f veteran=%.2f", novice.CritChance, veteran.CritChance)
	}
	if veteran.AttackSpeedSeconds >= novice.AttackSpeedSeconds {
		t.Fatalf("maestria da arma deveria melhorar cadência: novice=%.2fs veteran=%.2fs", novice.AttackSpeedSeconds, veteran.AttackSpeedSeconds)
	}
	if veteran.TotalAttack <= novice.TotalAttack {
		t.Fatalf("maestria deveria elevar dano: novice=%d veteran=%d", novice.TotalAttack, veteran.TotalAttack)
	}
}

func TestCalculateDerivedStats_AttackSpeedUsesWeaponProfile(t *testing.T) {
	char := &CharacterData{Level: 1}
	unarmed := CalculateDerivedStats(char, &InventoryData{Equipment: EquipmentSlots{}}, "balanced")
	if unarmed.AttackSpeedSeconds != 2.40 {
		t.Fatalf("cadência desarmada esperada 2.40s, obtido %.2fs", unarmed.AttackSpeedSeconds)
	}
	oneHand := CalculateDerivedStats(char, &InventoryData{Equipment: EquipmentSlots{MainHand: &Item{WeaponType: "sword", Hands: 1, PhysicalAttack: 20}}}, "balanced")
	twoHand := CalculateDerivedStats(char, &InventoryData{Equipment: EquipmentSlots{MainHand: &Item{WeaponType: "sword", Hands: 2, PhysicalAttack: 45}}}, "balanced")
	if oneHand.AttackSpeedSeconds >= twoHand.AttackSpeedSeconds {
		t.Fatalf("arma 1H (%.2fs) deve ser mais rápida que 2H (%.2fs)", oneHand.AttackSpeedSeconds, twoHand.AttackSpeedSeconds)
	}
}

func TestCalculateDerivedStats_DPSUsesRealAttackInterval(t *testing.T) {
	char := &CharacterData{Level: 1}
	inv := &InventoryData{Equipment: EquipmentSlots{MainHand: &Item{WeaponType: "wand", Hands: 1, MagicAttack: 20}}}
	stats := CalculateDerivedStats(char, inv, "balanced")
	expected := int((float64(stats.TotalAttack)/stats.AttackSpeedSeconds)*(1+(stats.CritChance/100)*0.50) + 0.5)
	if stats.CurrentDPS != expected {
		t.Fatalf("DPS deve refletir ataque/cadência/crítico: esperado %d obtido %d", expected, stats.CurrentDPS)
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
