package game

// CurrentEquipmentReleaseTier define o teto de equipamentos que pode entrar
// na economia ativa. Templates acima dele permanecem no catálogo para que
// inventários legados e fases ainda não lançadas continuem íntegros.
const CurrentEquipmentReleaseTier = 1

// IsEquipmentReleased informa se um template pode ser obtido ou produzido na
// versão atual do conteúdo. Não deve ser usado para ler itens já persistidos.
func IsEquipmentReleased(template LootTemplate) bool {
	if !isEquipmentTemplate(template) {
		return true
	}
	return template.Tier > 0 && template.Tier <= CurrentEquipmentReleaseTier
}

func isEquipmentTemplate(template LootTemplate) bool {
	if template.Slot == SlotSkillBook || template.Slot == SlotManual {
		return false
	}
	switch template.ItemKind {
	case ItemKindSkillBook, ItemKindConstructionManual, ItemKindQuest:
		return false
	default:
		// Templates antigos não preenchiam ItemKind; por compatibilidade eles
		// continuam sendo tratados como equipamentos quando ocupam um slot.
		return true
	}
}

// IsRecipeReleased limita somente receitas de equipamento. Processamentos e
// consumíveis mantêm sua própria progressão e não são removidos por este corte.
func IsRecipeReleased(recipe RecipeDefinition) bool {
	if recipe.Kind != RecipeKindEquipment {
		return true
	}
	template, exists := ItemRegistry.Get(recipe.OutputTemplateKey)
	return exists && IsEquipmentReleased(template)
}

func releasedEquipmentLoot(profile MonsterLootProfile) []string {
	return filterReleasedItemNames(profile.Items)
}

func filterReleasedItemNames(itemNames []string) []string {
	items := make([]string, 0, len(itemNames))
	for _, keyOrName := range itemNames {
		template := findLootTemplate(keyOrName)
		if template == nil {
			continue
		}
		if isEquipmentTemplate(*template) && !IsEquipmentReleased(*template) {
			continue
		}
		items = append(items, keyOrName)
	}
	return items
}
