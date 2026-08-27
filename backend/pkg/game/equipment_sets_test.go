package game

import "testing"

func TestThemedEquipmentSetsReferenceExistingTemplates(t *testing.T) {
	byKey := map[string]LootTemplate{}
	for _, tpl := range ListLootTemplates() {
		byKey[tpl.Key] = tpl
	}
	for _, set := range ListEquipmentSetDefinitions() {
		if len(set.PieceKeys) == 0 {
			t.Fatalf("set %s sem peças", set.Key)
		}
		for _, key := range set.PieceKeys {
			tpl, ok := byKey[key]
			if !ok {
				t.Fatalf("set %s referencia template inexistente %s", set.Key, key)
			}
			if tpl.SetKey != set.Key {
				t.Fatalf("template %s deveria pertencer a %s, obtido %s", key, set.Key, tpl.SetKey)
			}
		}
	}
}

func TestUrsoAndFeionaSetsAreCompleteSixPieceSets(t *testing.T) {
	for _, key := range []string{"urso_ranzinza", "feiona"} {
		found := false
		for _, set := range ListEquipmentSetDefinitions() {
			if set.Key == key {
				found = true
				if len(set.PieceKeys) != 6 {
					t.Fatalf("set %s deveria possuir 6 peças, obteve %d", key, len(set.PieceKeys))
				}
			}
		}
		if !found {
			t.Fatalf("set %s não encontrado", key)
		}
	}
}
