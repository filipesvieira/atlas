package game

// EquipmentSetDefinition descreve identidade temática e orientação de classe.
// Bônus 2/4/6 peças não são aplicados nesta versão; o catálogo já fica pronto
// para adicioná-los depois sem alterar os IDs dos itens.
type EquipmentSetDefinition struct {
	Key        string   `json:"key"`
	Name       string   `json:"name"`
	Theme      string   `json:"theme"`
	ClassFocus string   `json:"class_focus"`
	PieceKeys  []string `json:"piece_keys"`
}

var equipmentSetDefinitions = []EquipmentSetDefinition{
	{
		Key: "urso_ranzinza", Name: "Set do Urso Ranzinza", Theme: "pelagem, madeira e força bruta", ClassFocus: "melee",
		PieceKeys: []string{"machadinha_do_urso_ranzinza", "elmo_do_urso_ranzinza", "peitoral_do_urso_ranzinza", "calcas_do_urso_ranzinza", "botas_do_urso_ranzinza", "broquel_do_urso_ranzinza"},
	},
	{
		Key: "feiona", Name: "Set da Feiona", Theme: "pântano régio, verde e violeta", ClassFocus: "magic",
		PieceKeys: []string{"cetro_da_feiona", "tiara_da_feiona", "vestido_da_feiona", "saia_da_feiona", "sapatilhas_da_feiona", "broquel_da_feiona"},
	},
	{
		Key: "zodiaco", Name: "Set do Zodíaco", Theme: "celestial e dourado", ClassFocus: "hybrid",
		PieceKeys: []string{"elmo_do_zodiaco", "escudo_do_zodiaco", "mochila_do_zodiaco", "amuleto_do_zodiaco"},
	},
}

func ListEquipmentSetDefinitions() []EquipmentSetDefinition {
	out := make([]EquipmentSetDefinition, len(equipmentSetDefinitions))
	for i, set := range equipmentSetDefinitions {
		out[i] = set
		out[i].PieceKeys = append([]string(nil), set.PieceKeys...)
	}
	return out
}

// ListReleasedEquipmentSetDefinitions evita apresentar conjuntos sem nenhuma
// peça disponível enquanto suas fases ainda não foram lançadas.
func ListReleasedEquipmentSetDefinitions() []EquipmentSetDefinition {
	sets := make([]EquipmentSetDefinition, 0, len(equipmentSetDefinitions))
	for _, set := range equipmentSetDefinitions {
		pieces := filterReleasedItemNames(set.PieceKeys)
		if len(pieces) == 0 {
			continue
		}
		clone := set
		clone.PieceKeys = pieces
		sets = append(sets, clone)
	}
	return sets
}
