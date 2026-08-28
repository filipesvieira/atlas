package game

import "testing"

func TestEquipmentReleaseKeepsOnlyTierOneActive(t *testing.T) {
	foundFutureEquipment := false
	for _, template := range ListLootTemplates() {
		if !isEquipmentTemplate(template) {
			continue
		}
		if template.Tier <= CurrentEquipmentReleaseTier && !IsEquipmentReleased(template) {
			t.Fatalf("equipamento ativo %s foi bloqueado", template.Key)
		}
		if template.Tier > CurrentEquipmentReleaseTier {
			foundFutureEquipment = true
			if IsEquipmentReleased(template) {
				t.Fatalf("equipamento futuro %s ficou ativo", template.Key)
			}
		}
	}
	if !foundFutureEquipment {
		t.Fatal("o teste precisa de ao menos um equipamento futuro preservado")
	}
}

func TestReleasedRecipeListDoesNotExposeFutureEquipment(t *testing.T) {
	for _, recipe := range ListRecipeDefinitions() {
		if recipe.Kind == RecipeKindEquipment && !IsRecipeReleased(recipe) {
			t.Fatalf("receita futura exposta no catálogo: %s", recipe.Key)
		}
	}
	legacyRecipe, exists := GetRecipeDefinition("craft_sabre_de_bronze")
	if !exists || IsRecipeReleased(legacyRecipe) {
		t.Fatal("receita futura deveria permanecer registrada, mas inativa")
	}
}

func TestGameCatalogDoesNotAdvertiseArchivedEquipment(t *testing.T) {
	catalog := BuildGameCatalog()
	for _, region := range catalog.Regions {
		for _, itemName := range region.DropsPreview {
			template := findLootTemplate(itemName)
			if template != nil && isEquipmentTemplate(*template) && !IsEquipmentReleased(*template) {
				t.Fatalf("região %s anuncia equipamento arquivado: %s", region.ID, itemName)
			}
		}
	}
	for _, set := range catalog.EquipmentSets {
		for _, key := range set.PieceKeys {
			template := findLootTemplate(key)
			if template == nil || !IsEquipmentReleased(*template) {
				t.Fatalf("conjunto %s expõe peça arquivada: %s", set.Key, key)
			}
		}
	}
}

func TestPhaseOneNamedWeaponRequiresMeaningfulIngredients(t *testing.T) {
	recipe, exists := GetRecipeDefinition("craft_cajado_de_pirulito")
	if !exists {
		t.Fatal("receita do Cajado de Pirulito ausente")
	}
	if recipe.GoldCost < 350 || recipe.CraftSeconds < 75 || recipe.RequiredProfessionLevel < 2 {
		t.Fatalf("custo do Cajado de Pirulito ficou abaixo do piso: %+v", recipe)
	}
	want := map[string]int64{"iron_ingot": 6, "treated_plank": 4, "part_cookie_crumb": 4}
	got := make(map[string]int64, len(recipe.Ingredients))
	for _, ingredient := range recipe.Ingredients {
		got[ingredient.Key] = ingredient.Quantity
	}
	for key, quantity := range want {
		if got[key] != quantity {
			t.Fatalf("ingrediente %s: esperado %d, obtido %d", key, quantity, got[key])
		}
	}
}