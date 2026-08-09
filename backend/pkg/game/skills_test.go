package game

import (
	"math/rand"
	"testing"
)

func TestSkillRegistry_AllSevenSkillsRegistered(t *testing.T) {
	expected := []string{"whirlwind", "brutal_strike", "multishot", "sniper_shot", "fireball", "ice_shard", "divine_heal"}
	for _, key := range expected {
		def, exists := GetSkillDefinition(key)
		if !exists {
			t.Fatalf("Skill esperada [%s] não encontrada no SkillRegistry", key)
		}
		if def.Key != key || def.Name == "" || def.ManaCost <= 0 {
			t.Errorf("Skill [%s] possui metadados inválidos: %+v", key, def)
		}
	}
}

func TestSkillRegistry_ArchetypeFiltering(t *testing.T) {
	// Melee (Espada/Machado/Clava)
	if !IsSkillAllowedForArchetype("whirlwind", "melee") {
		t.Error("Whirlwind deveria ser permitido para Melee")
	}
	if IsSkillAllowedForArchetype("fireball", "melee") {
		t.Error("Fireball NÃO deveria ser permitido para Melee")
	}
	if IsSkillAllowedForArchetype("multishot", "melee") {
		t.Error("Multishot NÃO deveria ser permitido para Melee")
	}

	// Distance (Arco)
	if !IsSkillAllowedForArchetype("multishot", "distance") {
		t.Error("Multishot deveria ser permitido para Distance")
	}
	if !IsSkillAllowedForArchetype("sniper_shot", "distance") {
		t.Error("Sniper Shot deveria ser permitido para Distance")
	}
	if IsSkillAllowedForArchetype("whirlwind", "distance") {
		t.Error("Whirlwind NÃO deveria ser permitido para Distance")
	}

	// Magic (Wand)
	if !IsSkillAllowedForArchetype("fireball", "magic") {
		t.Error("Fireball deveria ser permitido para Magic")
	}
	if !IsSkillAllowedForArchetype("ice_shard", "magic") {
		t.Error("Ice Shard deveria ser permitido para Magic")
	}

	// Divine Heal (Universal de Suporte)
	if !IsSkillAllowedForArchetype("divine_heal", "melee") || !IsSkillAllowedForArchetype("divine_heal", "distance") || !IsSkillAllowedForArchetype("divine_heal", "magic") {
		t.Error("Divine Heal deveria ser permitido para todos os arquétipos")
	}
}

func TestSkillRegistry_SniperShotGuaranteedCrit(t *testing.T) {
	def, exists := GetSkillDefinition("sniper_shot")
	if !exists {
		t.Fatal("sniper_shot não encontrado")
	}

	mobs := []*Monster{
		{ID: "mob_1", Name: "Orc", Health: 500, MaxHealth: 500},
	}
	ctx := &SkillContext{
		Character:    &CharacterData{Level: 20},
		DerivedStats: &DerivedStats{TotalAttack: 100},
		Monsters:     mobs,
		Random:       rand.New(rand.NewSource(42)),
		WeaponType:   WeaponTypeBow,
	}

	res := def.Execute(ctx)
	if res == nil {
		t.Fatal("Resultado de Sniper Shot não deveria ser nulo")
	}
	if !res.IsCritical {
		t.Errorf("Sniper Shot deveria garantir acerto crítico, obtido IsCritical: false")
	}
	if res.DamageDealt <= 0 || mobs[0].Health >= 500 {
		t.Errorf("Dano de Sniper Shot não aplicado corretamente ao monstro: %d", res.DamageDealt)
	}
}

func TestSkillRegistry_IceShardSlowApplication(t *testing.T) {
	def, exists := GetSkillDefinition("ice_shard")
	if !exists {
		t.Fatal("ice_shard não encontrado")
	}

	mobs := []*Monster{
		{ID: "mob_ice", Name: "Golem", Health: 500, MaxHealth: 500},
	}
	ctx := &SkillContext{
		Character:    &CharacterData{Level: 30},
		DerivedStats: &DerivedStats{EffectiveINT: 50},
		Monsters:     mobs,
		Random:       rand.New(rand.NewSource(42)),
		WeaponType:   WeaponTypeWand,
	}

	res := def.Execute(ctx)
	if res == nil || len(res.AppliedStatuses) == 0 {
		t.Fatal("Ice Shard deveria retornar status de Slow")
	}
	if res.AppliedStatuses[0].Key != "slow" || res.AppliedStatuses[0].Magnitude != 0.30 {
		t.Errorf("Status de slow inválido: %+v", res.AppliedStatuses[0])
	}
}

func TestSkillRegistry_DivineHealConditionalTrigger(t *testing.T) {
	def, exists := GetSkillDefinition("divine_heal")
	if !exists {
		t.Fatal("divine_heal não encontrado")
	}

	if def.CooldownTicks != 7 {
		t.Errorf("CooldownTicks de Divine Heal esperado 7, obtido: %d", def.CooldownTicks)
	}

	// 1. HP Cheio (100%): CanExecute deve ser false
	fullHPCtx := &SkillContext{
		Character:    &CharacterData{Health: 500, MaxHealth: 500, Level: 20},
		DerivedStats: &DerivedStats{EffectiveINT: 40},
	}
	if def.CanExecute != nil && def.CanExecute(fullHPCtx) {
		t.Error("Divine Heal NÃO deveria executar quando HP está em 100%")
	}

	// 2. HP Ferido (60%): CanExecute deve ser true
	hurtCtx := &SkillContext{
		Character:    &CharacterData{Health: 300, MaxHealth: 500, Level: 20},
		DerivedStats: &DerivedStats{EffectiveINT: 40},
	}
	if def.CanExecute != nil && !def.CanExecute(hurtCtx) {
		t.Error("Divine Heal DEVERIA executar quando HP está em 60%")
	}

	res := def.Execute(hurtCtx)
	if res == nil || res.HealingDone <= 0 {
		t.Fatal("Resultado de cura de Divine Heal inválido")
	}
	if hurtCtx.Character.Health <= 300 {
		t.Errorf("Vida do personagem não foi curada: %d", hurtCtx.Character.Health)
	}
}
