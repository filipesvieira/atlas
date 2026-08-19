package game

import (
	"math/rand"
	"testing"
)

func TestResourceRegistriesValidation(t *testing.T) {
	if err := ValidateResourceRegistry(); err != nil {
		t.Fatalf("ValidateResourceRegistry falhou: %v", err)
	}

	if err := ValidateMonsterResourceProfiles(); err != nil {
		t.Fatalf("ValidateMonsterResourceProfiles falhou: %v", err)
	}
}

func TestEveryExpeditionMonsterHasResourceProfile(t *testing.T) {
	for regID, reg := range ExpeditionRegions {
		for _, mob := range reg.Monsters {
			_, exists := GetMonsterResourceProfile(mob.Key)
			if !exists {
				t.Errorf("Região %s: monstro %s (%s) não possui perfil de recursos cadastrado!", regID, mob.Key, mob.Name)
			}
		}
		// Boss
		bossProfile, bossExists := GetMonsterResourceProfile(reg.Boss.Key)
		if !bossExists {
			t.Errorf("Região %s: Boss %s (%s) não possui perfil de recursos cadastrado!", regID, reg.Boss.Key, reg.Boss.Name)
		} else {
			if len(bossProfile.GuaranteedDrops) == 0 {
				t.Errorf("Região %s: Boss %s deve conter pelo menos 1 drop garantido (Troféu)!", regID, reg.Boss.Key)
			}
		}
	}
}

func TestRollMonsterResources(t *testing.T) {
	rng := rand.New(rand.NewSource(42))

	// Teste de drop do Boss da floresta
	drops := RollMonsterResources("forest_boss_bear", rng)
	if len(drops) == 0 {
		t.Fatal("Esperado pelo menos o troféu garantido no drop do Boss!")
	}

	hasTrophy := false
	for _, drop := range drops {
		if drop.Key == "trophy_forest_bear" {
			hasTrophy = true
			if drop.Quantity != 1 {
				t.Errorf("Quantidade de troféu inesperada: %d", drop.Quantity)
			}
		}
	}

	if !hasTrophy {
		t.Error("Boss forest_boss_bear não dropou o troféu garantido trophy_forest_bear")
	}
}

func TestGetStorageUsed_ExcludesTrophies(t *testing.T) {
	// Cenário do bug 209/200:
	// 9 Madeira + 7 Pedra + 184 Fibra = 200 Materiais
	// 9 Troféus do Urso (trophy_forest_bear)
	resources := map[string]int64{
		"wood":               9,
		"stone":              7,
		"fiber":              184,
		"trophy_forest_bear": 9,
	}

	storageUsed := GetStorageUsed(resources)
	if storageUsed != 200 {
		t.Fatalf("StorageUsed incorreto! Esperado: 200, Obtido: %d (troféus não devem contar no armazém)", storageUsed)
	}
}

func TestIsResourceDiscardable(t *testing.T) {
	// Materiais devem ser descartáveis
	if !IsResourceDiscardable("wood") {
		t.Errorf("Madeira (wood) deveria ser descartável")
	}
	if !IsResourceDiscardable("fiber") {
		t.Errorf("Fibra (fiber) deveria ser descartável")
	}

	// Troféus de boss NÃO podem ser descartados
	if IsResourceDiscardable("trophy_forest_bear") {
		t.Errorf("Troféu (trophy_forest_bear) NÃO deveria ser descartável")
	}
	if IsResourceDiscardable("trophy_abyss_avenger") {
		t.Errorf("Troféu (trophy_abyss_avenger) NÃO deveria ser descartável")
	}
}

func TestValidateResourceQuantity(t *testing.T) {
	if err := ValidateResourceQuantity("wood", 0); err == nil {
		t.Error("Esperado erro para quantidade 0")
	}
	if err := ValidateResourceQuantity("wood", -5); err == nil {
		t.Error("Esperado erro para quantidade negativa")
	}
	if err := ValidateResourceQuantity("invalid_resource_key", 10); err == nil {
		t.Error("Esperado erro para chave inexistente")
	}
	if err := ValidateResourceQuantity("wood", 50); err != nil {
		t.Errorf("Erro inesperado ao validar quantidade válida: %v", err)
	}
}

type fixedRollSource struct {
	val float64
}

func (f fixedRollSource) Float64() float64 {
	return f.val
}

func TestSalvageBatch_SuccessAndRisk(t *testing.T) {
	inv := &InventoryData{
		Equipment: EquipmentSlots{},
		Backpack: []Item{
			{ID: "item1", Name: "Espada do Aprendiz", SlotType: "mainhand", Rarity: "Comum", Tier: 1},
			{ID: "item2", Name: "Capacete de Couro", SlotType: "head", Rarity: "Comum", Tier: 1},
			{ID: "book1", Name: "Tome: Golpe Giratório", SlotType: "skill_book", ItemKind: ItemKindSkillBook, Rarity: "Raro", Tier: 1},
		},
	}

	// 1. Tentar desmontar livro de habilidade deve falhar
	_, _, err := SalvageBatch(inv, []string{"book1"}, 1, 0, false, fixedRollSource{val: 0.1})
	if err == nil {
		t.Error("Esperado erro ao tentar desmontar livro de habilidade")
	}

	// 2. Desmonte com sucesso garantido (roll = 0.1 <= chance 0.70)
	outcomes, yields, err := SalvageBatch(inv, []string{"item1"}, 1, 0, false, fixedRollSource{val: 0.1})
	if err != nil {
		t.Fatalf("Erro inesperado em SalvageBatch: %v", err)
	}
	if len(outcomes) != 1 || !outcomes[0].Success {
		t.Fatalf("Esperado sucesso no desmonte de item1: %+v", outcomes)
	}
	if len(yields) == 0 {
		t.Error("Esperado rendimento positivo de materiais no sucesso")
	}
	if len(inv.Backpack) != 2 {
		t.Errorf("Item desmontado deveria ter sido removido da mochila, sobram %d", len(inv.Backpack))
	}

	// 3. Desmonte com falha (roll = 0.99 > chance 0.70)
	outcomes2, yields2, err := SalvageBatch(inv, []string{"item2"}, 1, 0, false, fixedRollSource{val: 0.99})
	if err != nil {
		t.Fatalf("Erro inesperado em SalvageBatch com falha: %v", err)
	}
	if len(outcomes2) != 1 || outcomes2[0].Success {
		t.Fatalf("Esperado falha (sem rendimento) para roll alto: %+v", outcomes2)
	}
	if len(yields2) != 0 {
		t.Errorf("Esperado 0 rendimento na falha, obtido: %+v", yields2)
	}
	if len(inv.Backpack) != 1 {
		t.Errorf("Item que falhou também é destruído, sobram %d", len(inv.Backpack))
	}
}

func TestSalvageBatch_SafeMode(t *testing.T) {
	inv := &InventoryData{
		Equipment: EquipmentSlots{},
		Backpack: []Item{
			{ID: "epic1", Name: "Katana da Fúria", SlotType: "mainhand", Rarity: "Épico", Tier: 4},
		},
	}

	// Safe Mode no Nv 1 deve falhar
	_, _, err := SalvageBatch(inv, []string{"epic1"}, 1, 0, true, fixedRollSource{val: 0.99})
	if err == nil {
		t.Error("Safe mode deveria falhar no Nível 1 da Bancada")
	}

	// Safe Mode no Nv 3 concede 100% de sucesso mesmo com roll 0.99
	outcomes, yields, err := SalvageBatch(inv, []string{"epic1"}, 3, 30, true, fixedRollSource{val: 0.99})
	if err != nil {
		t.Fatalf("Safe mode no Nv 3 falhou: %v", err)
	}
	if len(outcomes) != 1 || !outcomes[0].Success {
		t.Fatalf("Safe mode no Nv 3 deveria ter garantido 100%% de sucesso: %+v", outcomes)
	}
	if len(yields) == 0 {
		t.Error("Esperado rendimento com bônus de 30% no Nv 3")
	}
}
