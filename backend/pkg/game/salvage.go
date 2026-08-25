package game

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"
)

var (
	ErrCannotSalvageEquipped  = errors.New("não é possível desmontar um item equipado")
	ErrCannotSalvageSkillBook = errors.New("livros de habilidade não podem ser desmontados")
	ErrCannotSalvageManual    = errors.New("manuais de construção não podem ser desmontados")
	ErrItemNotFoundInBackpack = errors.New("item não encontrado na mochila")
	ErrBatchTooLarge          = errors.New("quantidade de itens excede o limite do lote para o nível atual da bancada")
	ErrSafeModeNotUnlocked    = errors.New("modo seguro exige bancada de nível 3")
)

// RollSource fornece uma interface desacoplada de geração de números aleatórios para testes determinísticos.
type RollSource interface {
	Float64() float64
}

// DefaultRollSource utiliza a biblioteca rand padrão.
type DefaultRollSource struct {
	r *rand.Rand
}

func NewDefaultRollSource() *DefaultRollSource {
	return &DefaultRollSource{
		r: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (d *DefaultRollSource) Float64() float64 {
	if d.r == nil {
		return rand.Float64()
	}
	return d.r.Float64()
}

// SalvageItemOutcome detalha o resultado individual da desmontagem de um item.
type SalvageItemOutcome struct {
	ItemID        string           `json:"item_id"`
	ItemName      string           `json:"item_name"`
	Rarity        string           `json:"rarity"`
	SlotType      string           `json:"slot_type"`
	Success       bool             `json:"success"`
	SuccessChance float64          `json:"success_chance"`
	Yield         []ResourceAmount `json:"yield,omitempty"`
}

// SalvageBatchResult encapsula o resultado completo de uma operação em lote.
type SalvageBatchResult struct {
	RequestID  string                    `json:"request_id"`
	Outcomes   []SalvageItemOutcome      `json:"outcomes"`
	TotalYield []ResourceAmount          `json:"total_yield"`
	Inventory  InventoryData             `json:"inventory"`
	Resources  ResourceInventorySnapshot `json:"resource_inventory"`
}

// GetMaxBatchSize retorna o tamanho máximo de lote permitido por nível da Bancada.
func GetMaxBatchSize(workbenchLevel int) int {
	switch workbenchLevel {
	case 1:
		return 5
	case 2:
		return 15
	case 3:
		return 50
	default:
		return 5
	}
}

// CalculateSalvageSuccessChance calcula a probabilidade matemática de sucesso (50% a 97%, ou 100% no Modo Seguro).
func CalculateSalvageSuccessChance(workbenchLevel int, item *Item, safeMode bool) float64 {
	if safeMode && workbenchLevel >= 3 {
		return 1.00
	}

	baseChance := 0.65
	switch workbenchLevel {
	case 1:
		baseChance = 0.65
	case 2:
		baseChance = 0.80
	case 3:
		baseChance = 0.92
	}

	rarityMod := 0.0
	if item != nil {
		switch item.Rarity {
		case "Comum":
			rarityMod = +0.05
		case "Incomum":
			rarityMod = +0.03
		case "Raro":
			rarityMod = 0.00
		case "Épico":
			rarityMod = -0.04
		case "Lendário", "Mítico", "Divino":
			rarityMod = -0.08
		}
	}

	total := baseChance + rarityMod
	if total < 0.50 {
		total = 0.50
	}
	if total > 0.97 {
		total = 0.97
	}
	return math.Round(total*100) / 100
}

// CalculateSalvageYield determina a quantia e os tipos de materiais obtidos ao desmontar um equipamento.
func CalculateSalvageYield(item *Item, salvageEfficiencyPercent float64) ([]ResourceAmount, error) {
	if item == nil {
		return nil, errors.New("item nulo")
	}
	if item.SlotType == string(SlotSkillBook) || item.SlotType == "skill_book" || item.ItemKind == ItemKindSkillBook {
		return nil, ErrCannotSalvageSkillBook
	}
	if item.SlotType == string(SlotManual) || item.SlotType == "manual" || item.ItemKind == ItemKindConstructionManual {
		return nil, ErrCannotSalvageManual
	}

	tier := item.Tier
	if tier < 1 {
		tier = 1
	}

	// 1. Multiplicador de Raridade
	rarityMultiplier := 1.0
	switch item.Rarity {
	case "Comum":
		rarityMultiplier = 1.0
	case "Incomum":
		rarityMultiplier = 1.2
	case "Raro":
		rarityMultiplier = 1.6
	case "Épico":
		rarityMultiplier = 2.2
	case "Lendário":
		rarityMultiplier = 3.0
	case "Mítico":
		rarityMultiplier = 4.0
	case "Divino":
		rarityMultiplier = 5.0
	}

	// 2. Base de Rendimento
	baseAmount := float64(2 + (tier * 2))
	efficiencyBonus := 1.0 + (salvageEfficiencyPercent / 100.0)
	totalYield := int64(math.Floor(baseAmount * rarityMultiplier * efficiencyBonus))
	if totalYield < 1 {
		totalYield = 1
	}

	results := make([]ResourceAmount, 0)
	primaryQty := int64(math.Ceil(float64(totalYield) * 0.6))
	secondaryQty := totalYield - primaryQty
	if secondaryQty < 1 {
		secondaryQty = 1
	}

	// 3. Composição Material por Tipo de Slot / Arma
	switch item.SlotType {
	case "mainhand":
		if item.WeaponType == WeaponTypeWand {
			results = append(results, ResourceAmount{Key: "arcane_scrap", Quantity: primaryQty})
			results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: secondaryQty})
		} else if item.WeaponType == WeaponTypeBow {
			results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: primaryQty})
			results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: secondaryQty})
		} else {
			results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: primaryQty})
			results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: secondaryQty})
		}
	case "offhand":
		if strings.Contains(strings.ToLower(item.Name), "livro") || strings.Contains(strings.ToLower(item.Name), "orbe") {
			results = append(results, ResourceAmount{Key: "arcane_scrap", Quantity: primaryQty})
			results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: secondaryQty})
		} else {
			results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: primaryQty})
			results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: secondaryQty})
		}
	case "head", "chest", "legs":
		if strings.Contains(strings.ToLower(item.Name), "robe") || strings.Contains(strings.ToLower(item.Name), "saiote") {
			results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: primaryQty})
			results = append(results, ResourceAmount{Key: "arcane_scrap", Quantity: secondaryQty})
		} else {
			results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: primaryQty})
			results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: secondaryQty})
		}
	case "boots":
		results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: primaryQty})
		results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: secondaryQty})
	case "bag":
		results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: primaryQty})
		results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: secondaryQty})
	case "necklace", "ring":
		results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: primaryQty})
		results = append(results, ResourceAmount{Key: "arcane_scrap", Quantity: secondaryQty})
	case "ammo":
		results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: primaryQty})
		results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: secondaryQty})
	default:
		results = append(results, ResourceAmount{Key: "metal_scrap", Quantity: primaryQty})
		results = append(results, ResourceAmount{Key: "cloth_scrap", Quantity: secondaryQty})
	}

	// Itens de Tiers avançados rendem um bônus especial regional
	if tier >= 4 && item.Rarity != "Comum" {
		results = append(results, ResourceAmount{Key: "glacial_crystal", Quantity: 1})
	}
	if tier >= 5 && (item.Rarity == "Épico" || item.Rarity == "Lendário") {
		results = append(results, ResourceAmount{Key: "abyssal_ember", Quantity: 1})
	}

	return results, nil
}

// SalvageBatch executa a desmontagem de múltiplos itens com cálculo de chance e suporte a RollSource determinístico.
func SalvageBatch(
	inv *InventoryData,
	itemIDs []string,
	workbenchLevel int,
	efficiencyPercent float64,
	safeMode bool,
	rng RollSource,
) ([]SalvageItemOutcome, []ResourceAmount, error) {
	if inv == nil {
		return nil, nil, errors.New("inventário inválido")
	}
	if len(itemIDs) == 0 {
		return nil, nil, errors.New("nenhum item selecionado para desmontagem")
	}

	maxBatch := GetMaxBatchSize(workbenchLevel)
	if len(itemIDs) > maxBatch {
		return nil, nil, fmt.Errorf("%w: máximo %d itens (selecionados: %d)", ErrBatchTooLarge, maxBatch, len(itemIDs))
	}
	if safeMode && workbenchLevel < 3 {
		return nil, nil, ErrSafeModeNotUnlocked
	}
	if rng == nil {
		rng = NewDefaultRollSource()
	}

	// 1. Mapeamento dos itens equipados para prevenção
	eqIDs := make(map[string]bool)
	for _, it := range []*Item{
		inv.Equipment.Head, inv.Equipment.Chest, inv.Equipment.Legs, inv.Equipment.Boots,
		inv.Equipment.MainHand, inv.Equipment.OffHand, inv.Equipment.Necklace, inv.Equipment.Ring,
		inv.Equipment.Ammo, inv.Equipment.Bag,
	} {
		if it != nil {
			eqIDs[it.ID] = true
		}
	}

	// 2. Mapeamento dos itens na mochila
	bpMap := make(map[string]int)
	for idx, it := range inv.Backpack {
		bpMap[it.ID] = idx
	}

	// 3. Validação prévia de todos os itens do lote
	itemsToProcess := make([]Item, 0, len(itemIDs))
	seenIDs := make(map[string]bool)
	for _, id := range itemIDs {
		if seenIDs[id] {
			continue // Evita duplicações no mesmo request
		}
		seenIDs[id] = true

		if eqIDs[id] {
			return nil, nil, fmt.Errorf("item %s está equipado e não pode ser desmontado", id)
		}
		idx, exists := bpMap[id]
		if !exists {
			return nil, nil, fmt.Errorf("item %s não encontrado na mochila", id)
		}
		item := inv.Backpack[idx]
		if item.SlotType == string(SlotSkillBook) || item.SlotType == "skill_book" || item.ItemKind == ItemKindSkillBook {
			return nil, nil, ErrCannotSalvageSkillBook
		}
		if item.SlotType == string(SlotManual) || item.SlotType == "manual" || item.ItemKind == ItemKindConstructionManual {
			return nil, nil, ErrCannotSalvageManual
		}
		itemsToProcess = append(itemsToProcess, item)
	}

	// 4. Processamento individual de cada item com rolagem de RNG
	outcomes := make([]SalvageItemOutcome, 0, len(itemsToProcess))
	totalYieldMap := make(map[string]int64)

	for _, item := range itemsToProcess {
		chance := CalculateSalvageSuccessChance(workbenchLevel, &item, safeMode)
		roll := rng.Float64()
		success := roll <= chance

		outcome := SalvageItemOutcome{
			ItemID:        item.ID,
			ItemName:      item.Name,
			Rarity:        item.Rarity,
			SlotType:      item.SlotType,
			Success:       success,
			SuccessChance: chance,
		}

		if success {
			yield, err := CalculateSalvageYield(&item, efficiencyPercent)
			if err == nil {
				outcome.Yield = yield
				for _, r := range yield {
					totalYieldMap[r.Key] += r.Quantity
				}
			}
		}

		outcomes = append(outcomes, outcome)
	}

	// 5. Remover todos os itens processados da mochila
	removeSet := make(map[string]bool)
	for _, it := range itemsToProcess {
		removeSet[it.ID] = true
	}
	newBackpack := make([]Item, 0, len(inv.Backpack)-len(removeSet))
	for _, it := range inv.Backpack {
		if !removeSet[it.ID] {
			newBackpack = append(newBackpack, it)
		}
	}
	inv.Backpack = newBackpack

	// 6. Consolidar totalYield
	totalYieldList := make([]ResourceAmount, 0, len(totalYieldMap))
	for k, v := range totalYieldMap {
		totalYieldList = append(totalYieldList, ResourceAmount{Key: k, Quantity: v})
	}

	return outcomes, totalYieldList, nil
}