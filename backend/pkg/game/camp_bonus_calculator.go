package game

// CampBonuses consolida todos os bônus ativos derivados das construções do acampamento.
type CampBonuses struct {
	HPRegenBonusPercent      float64 `json:"hp_regen_bonus_percent"`
	ManaRegenBonusPercent    float64 `json:"mana_regen_bonus_percent"`
	StorageCapacity          int64   `json:"storage_capacity"`
	SalvageUnlocked          bool    `json:"salvage_unlock"`
	SalvageEfficiencyPercent float64 `json:"salvage_efficiency_percent"`
}

const (
	// DefaultBaseResourceStorage representa o depósito improvisado do acampamento.
	// Ele precisa acomodar pelo menos um ciclo longo de combate + coleta antes que
	// o jogador tenha acesso ao manual do armazém, evitando o soft-lock inicial.
	DefaultBaseResourceStorage int64 = 10000
)

// CalculateCampBonuses calcula a soma pura dos efeitos de todas as construções ativas.
func CalculateCampBonuses(buildings map[string]BuildingSlot) CampBonuses {
	bonuses := CampBonuses{
		StorageCapacity: DefaultBaseResourceStorage,
	}

	if buildings == nil {
		return bonuses
	}

	for _, slot := range buildings {
		if slot.Level <= 0 {
			continue
		}

		if slot.BuildingKey == "workbench" || slot.SlotKey == "south" {
			bonuses.SalvageUnlocked = true
		}

		bDef, exists := GetBuildingDefinition(slot.BuildingKey)
		if !exists {
			continue
		}

		// Percorre os efeitos de todos os níveis acumulados até o nível atual da construção
		maxLvl := slot.Level
		if maxLvl > len(bDef.Levels) {
			maxLvl = len(bDef.Levels)
		}

		for l := 0; l < maxLvl; l++ {
			lvlDef := bDef.Levels[l]
			for _, eff := range lvlDef.Effects {
				switch eff.Key {
				case "camp_hp_regen_percent":
					bonuses.HPRegenBonusPercent += eff.Value
				case "camp_mana_regen_percent":
					bonuses.ManaRegenBonusPercent += eff.Value
				case "camp_all_regen_percent":
					bonuses.HPRegenBonusPercent += eff.Value
					bonuses.ManaRegenBonusPercent += eff.Value
				case "resource_storage":
					if int64(eff.Value) > bonuses.StorageCapacity {
						bonuses.StorageCapacity = int64(eff.Value)
					}
				case "salvage_unlock":
					if eff.Value > 0 {
						bonuses.SalvageUnlocked = true
					}
				case "salvage_efficiency_percent":
					if eff.Value > bonuses.SalvageEfficiencyPercent {
						bonuses.SalvageEfficiencyPercent = eff.Value
					}
				}
			}
		}
	}

	return bonuses
}
