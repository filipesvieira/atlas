package game

import (
	"math/rand"
	"testing"
)

func TestSkillRegistry_AllEightSkillsRegistered(t *testing.T) {
	expected := []string{"whirlwind", "brutal_strike", "multishot", "sniper_shot", "fireball", "ice_shard", "arcane_nova", "divine_heal"}
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
	if !IsSkillAllowedForArchetype("arcane_nova", "magic") {
		t.Error("Nova Arcana deveria ser permitida para Magic")
	}

	// Divine Heal (Universal de Suporte)
	if !IsSkillAllowedForArchetype("divine_heal", "melee") || !IsSkillAllowedForArchetype("divine_heal", "distance") || !IsSkillAllowedForArchetype("divine_heal", "magic") {
		t.Error("Divine Heal deveria ser permitido para todos os arquétipos")
	}
}

func TestInitialCombatSkillsUnlockAtLevelTenAndActivateForArchetype(t *testing.T) {
	character := &CharacterData{Level: InitialCombatSkillUnlockLevel - 1, LearnedSkills: []string{}, ActiveSkills: []string{}}
	if unlocked := UnlockInitialCombatSkills(character); len(unlocked) != 0 {
		t.Fatalf("nível abaixo do marco não deve desbloquear habilidades: %v", unlocked)
	}

	character.Level = InitialCombatSkillUnlockLevel
	unlocked := UnlockInitialCombatSkills(character)
	if len(unlocked) != len(initialCombatSkillKeys) {
		t.Fatalf("esperava %d habilidades iniciais, obteve %v", len(initialCombatSkillKeys), unlocked)
	}
	if activated := ActivateInitialSkillForArchetype(character, "magic"); activated != "arcane_nova" {
		t.Fatalf("mago deveria ativar a Nova Arcana, obteve %q", activated)
	}
	if !hasSkill(character.ActiveSkills, "arcane_nova") {
		t.Fatalf("Nova Arcana deveria estar ativa: %v", character.ActiveSkills)
	}
}

func TestArcaneNovaHitsUpToFourTargets(t *testing.T) {
	def, exists := GetSkillDefinition("arcane_nova")
	if !exists {
		t.Fatal("arcane_nova não encontrada")
	}
	monsters := []*Monster{
		{ID: "one", Health: 500, MaxHealth: 500},
		{ID: "two", Health: 500, MaxHealth: 500},
		{ID: "three", Health: 500, MaxHealth: 500},
		{ID: "four", Health: 500, MaxHealth: 500},
		{ID: "five", Health: 500, MaxHealth: 500},
	}
	result := def.Execute(&SkillContext{
		Character:       &CharacterData{Level: 10},
		DerivedStats:    &DerivedStats{TotalAttack: 20, MaxMana: 120},
		Monsters:        monsters,
		MagicMasteryLvl: 10,
	})
	if result == nil || len(result.TargetIDs) != 4 || result.DamageDealt <= 0 {
		t.Fatalf("Nova Arcana deveria acertar quatro alvos: %+v", result)
	}
	if monsters[4].Health != monsters[4].MaxHealth {
		t.Fatalf("quinto alvo não deveria ser atingido: %+v", monsters[4])
	}
}

func TestSkillBookLearningDoesNotRequireCompatibleWeapon(t *testing.T) {
	book := GenerateItemFromTemplate("Manual: Tiro Preciso", "Raro", rand.New(rand.NewSource(42)))
	if book == nil {
		t.Fatal("livro de Tiro Quádruplo não foi gerado pelo catálogo")
	}
	character := &CharacterData{
		ID:            "skill-learning-test",
		Name:          "Aprendiz Livre",
		Level:         10,
		Health:        100,
		MaxHealth:     100,
		Mana:          100,
		MaxMana:       100,
		LearnedSkills: []string{},
		ActiveSkills:  []string{},
	}
	inventory := &InventoryData{
		Equipment: EquipmentSlots{MainHand: &Item{ID: "test-sword", Name: "Espada de Teste", WeaponType: WeaponTypeSword, SlotType: string(SlotMainHand)}},
		Backpack:  []Item{*book},
		Cap:       1500,
	}
	session := NewGameSession(character, inventory, nil, nil, nil, nil)

	session.EquipItem(book.ID, string(SlotSkillBook))

	if !hasSkill(character.LearnedSkills, "sniper_shot") {
		t.Fatalf("habilidade de distância deveria ser aprendida com espada equipada: %+v", character.LearnedSkills)
	}
	if hasSkill(character.ActiveSkills, "sniper_shot") {
		t.Fatalf("habilidade incompatível pode ser aprendida, mas não deve ser autoativada: %+v", character.ActiveSkills)
	}
	if len(inventory.Backpack) != 0 {
		t.Fatalf("livro estudado deveria ser consumido; restaram %d itens", len(inventory.Backpack))
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
		DerivedStats: &DerivedStats{TotalAttack: 70, MaxMana: 300},
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
		DerivedStats: &DerivedStats{TotalAttack: 60, MaxMana: 260},
	}
	if def.CanExecute != nil && def.CanExecute(fullHPCtx) {
		t.Error("Divine Heal NÃO deveria executar quando HP está em 100%")
	}

	// 2. HP Ferido (60%): CanExecute deve ser true
	hurtCtx := &SkillContext{
		Character:    &CharacterData{Health: 300, MaxHealth: 500, Level: 20},
		DerivedStats: &DerivedStats{TotalAttack: 60, MaxMana: 260},
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
