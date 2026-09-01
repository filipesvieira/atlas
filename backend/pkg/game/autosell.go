package game

import (
	"math"
	"sort"
	"strings"
	"time"
)

// AutoSellSettings define as preferências do jogador para higienização e venda automática de inventário.
type AutoSellSettings struct {
	Enabled                 bool     `json:"enabled"`
	OnlineEnabled           bool     `json:"online_enabled"`
	OfflineEnabled          bool     `json:"offline_enabled"`
	TriggerPercent          int      `json:"trigger_percent"` // ex: 75%
	TargetPercent           int      `json:"target_percent"`  // ex: 60%
	SellRarities            []string `json:"sell_rarities"`   // ex: ["Comum", "Incomum"]
	SellSlotTypes           []string `json:"sell_slot_types"` // vazio = todos os slots permitidos
	OnlyDuplicates          bool     `json:"only_duplicates"` // apenas se houver mais de N cópias
	KeepFirstDiscoveredCopy bool     `json:"keep_first_discovered_copy"`
	KeepBestPerTemplate     int      `json:"keep_best_per_template"`  // quantas melhores cópias guardar (min 1)
	ProtectedTemplateKeys   []string `json:"protected_template_keys"` // templates explicitamente protegidos
	SellCraftedItems        bool     `json:"sell_crafted_items"`      // opt-in explícito; itens novos têm carência de 24h
	Revision                int64    `json:"revision"`
}

// DefaultAutoSellSettings retorna a configuração padrão recomendada (desligada por padrão).
func DefaultAutoSellSettings() AutoSellSettings {
	return AutoSellSettings{
		Enabled:                 false,
		OnlineEnabled:           true,
		OfflineEnabled:          true,
		TriggerPercent:          75,
		TargetPercent:           60,
		SellRarities:            []string{"Comum", "Incomum"},
		SellSlotTypes:           []string{},
		OnlyDuplicates:          true,
		KeepFirstDiscoveredCopy: true,
		KeepBestPerTemplate:     1,
		ProtectedTemplateKeys:   []string{},
		Revision:                1,
	}
}

// AutoSellEvaluationResult resume a decisão autoritativa de venda automática.
type AutoSellEvaluationResult struct {
	ShouldTrigger                bool   `json:"should_trigger"`
	CurrentOccupancyPercent      int    `json:"current_occupancy_percent"`
	ItemsToSell                  []Item `json:"items_to_sell"`
	ItemsKept                    []Item `json:"items_kept"`
	TotalGoldEstimated           int64  `json:"total_gold_estimated"`
	ProtectedFirstDiscoveryCount int    `json:"protected_first_discovery_count"`
	ProtectedRarityCount         int    `json:"protected_rarity_count"`
	ProtectedSlotCount           int    `json:"protected_slot_count"`
	ProtectedCraftedCount        int    `json:"protected_crafted_count"`
}

// CalculateOccupancyPercent calcula a ocupação máxima entre slots e peso (0 a 100).
func CalculateOccupancyPercent(backpackCount, maxSlots int, currentWeight, maxWeight float64) int {
	slotOccupancy := 0.0
	if maxSlots > 0 {
		slotOccupancy = float64(backpackCount) / float64(maxSlots)
	}

	weightOccupancy := 0.0
	if maxWeight > 0 {
		weightOccupancy = currentWeight / maxWeight
	}

	maxOcc := math.Max(slotOccupancy, weightOccupancy)
	return int(math.Round(maxOcc * 100.0))
}

// CalculateAutoSellItemPrice calcula o valor de venda automática (80% do valor comercial).
func CalculateAutoSellItemPrice(item Item) int64 {
	val := float64(item.ValueGold) * 0.80
	if val < 1.0 && item.ValueGold > 0 {
		return 1
	}
	return int64(math.Round(val))
}

// IsItemRarityProtected verifica se a raridade do item está protegida pela configuração do jogador.
func IsItemRarityProtected(rarity string, sellRarities []string) bool {
	if rarity == "" {
		rarity = "Comum"
	}
	for _, r := range sellRarities {
		if r == rarity {
			return false // Está na lista de venda, logo NÃO está protegido
		}
	}
	return true // Não está na lista de venda, protegido!
}

// IsOverflowProtectedItem centraliza a política de preservação usada nos
// caminhos online e offline. A falta de espaço nunca pode transformar um item
// raro, manual, quest, mochila, item explicitamente protegido ou craft recente
// em descarte/conversão automática.
func IsOverflowProtectedItem(item Item, settings AutoSellSettings) bool {
	if item.Rarity != "" && item.Rarity != "Comum" && item.Rarity != "Incomum" {
		return true
	}
	if IsItemRarityProtected(item.Rarity, settings.SellRarities) {
		return true
	}
	if item.SlotType == string(SlotBag) || item.ItemKind == ItemKindConstructionManual || item.ItemKind == ItemKindSkillBook || item.ItemKind == ItemKindQuest {
		return true
	}
	itemKey := normalizeContentKey(item.TemplateKey)
	if itemKey == "" {
		itemKey = normalizeContentKey(item.Name)
	}
	for _, protectedKey := range settings.ProtectedTemplateKeys {
		if itemKey == normalizeContentKey(protectedKey) {
			return true
		}
	}
	if item.Source == ItemSourceCrafted && (item.CreatedAt.IsZero() || time.Since(item.CreatedAt) < 24*time.Hour) {
		return true
	}
	return false
}

// calculateItemQuality calcula a pontuação holística de qualidade do item para
// desempate determinístico da melhor cópia (considerando stats, poder e valor).
func calculateItemQuality(it Item) float64 {
	power := float64(it.ItemPower)
	if power <= 0 {
		power = float64(CalculateItemPower(&it))
	}
	statsScore := float64(it.PhysicalAttack+it.MagicAttack)*2.0 +
		float64(it.Defense)*2.2 +
		float64(it.MeleePowerBonus+it.RangedPowerBonus+it.MagicPowerBonus)*3.0 +
		float64(it.BonusHP)/8.0 + float64(it.BonusMP)/10.0 +
		it.CritChance*3.0 + it.Lifesteal*4.0 +
		float64(it.ManaRegen)*8.0
	return power*100.0 + statsScore*10.0 + float64(it.ValueGold)
}

// EvaluateAutoSell avalia a mochila contra as regras de venda automática e determina
// exatamente quais itens devem ser vendidos e preservados para atingir a meta de limpeza.
func EvaluateAutoSell(
	settings AutoSellSettings,
	backpack []Item,
	maxSlots int,
	currentWeight, maxWeight float64,
) AutoSellEvaluationResult {
	result := AutoSellEvaluationResult{
		ItemsToSell: []Item{},
		ItemsKept:   []Item{},
	}

	if maxSlots <= 0 {
		maxSlots = 20
	}
	if maxWeight <= 0 {
		maxWeight = 1000.0
	}

	occupancy := CalculateOccupancyPercent(len(backpack), maxSlots, currentWeight, maxWeight)
	result.CurrentOccupancyPercent = occupancy

	trigger := settings.TriggerPercent
	if trigger <= 0 {
		trigger = 75
	}
	target := settings.TargetPercent
	if target <= 0 || target >= trigger {
		target = 60
	}

	// Se não atingiu o gatilho, nenhum item é vendido
	if occupancy < trigger {
		result.ShouldTrigger = false
		result.ItemsKept = append(result.ItemsKept, backpack...)
		return result
	}

	result.ShouldTrigger = true

	// Mapa de templates protegidos explicitamente (por Key ou Nome)
	protectedTemplateMap := make(map[string]bool)
	for _, k := range settings.ProtectedTemplateKeys {
		protectedTemplateMap[normalizeContentKey(k)] = true
	}

	// Mapa de slots permitidos para venda (se vazio, todos os slots são permitidos)
	sellSlotMap := make(map[string]bool)
	for _, s := range settings.SellSlotTypes {
		sellSlotMap[strings.ToLower(strings.TrimSpace(s))] = true
	}

	// Agrupamento determinístico por TemplateKey (ou fallback para Name)
	type TemplateGroup struct {
		Key   string
		Items []Item
	}
	groupMap := make(map[string]*TemplateGroup)
	var groupKeys []string

	for _, it := range backpack {
		tKey := it.TemplateKey
		if tKey == "" {
			tKey = normalizeContentKey(it.Name)
		}
		if groupMap[tKey] == nil {
			groupMap[tKey] = &TemplateGroup{Key: tKey, Items: []Item{}}
			groupKeys = append(groupKeys, tKey)
		}
		groupMap[tKey].Items = append(groupMap[tKey].Items, it)
	}

	// Ordena chaves de grupos para garantir iteração 100% determinística
	sort.Strings(groupKeys)

	// Para cada grupo de template, ordena por qualidade decrescente (melhores cópias primeiro)
	for _, k := range groupKeys {
		grp := groupMap[k]
		sort.Slice(grp.Items, func(i, j int) bool {
			qI := calculateItemQuality(grp.Items[i])
			qJ := calculateItemQuality(grp.Items[j])
			if qI != qJ {
				return qI > qJ
			}
			return grp.Items[i].ID < grp.Items[j].ID
		})
	}

	keepBest := settings.KeepBestPerTemplate
	if keepBest <= 0 {
		keepBest = 1
	}

	// Determina a lista de candidatos à venda respeitando as proteções rígidas
	var eligibleCandidates []Item

	for _, k := range groupKeys {
		grp := groupMap[k]
		for idx, it := range grp.Items {
			// Proteção 1: Manuais de Construção, Livros de Habilidades e Itens de Quest NUNCA são vendidos automaticamente
			if it.ItemKind == ItemKindConstructionManual || it.ItemKind == ItemKindSkillBook || it.ItemKind == ItemKindQuest {
				result.ProtectedSlotCount++
				result.ItemsKept = append(result.ItemsKept, it)
				continue
			}

			// Proteção 2: itens produzidos nunca entram por acidente. O jogador
			// precisa habilitar o filtro explicitamente e todo craft novo mantém
			// uma carência rígida de 24 horas para evitar venda logo após produzir.
			if it.Source == ItemSourceCrafted {
				freshCraft := !it.CreatedAt.IsZero() && time.Since(it.CreatedAt) < 24*time.Hour
				if !settings.SellCraftedItems || freshCraft {
					result.ProtectedCraftedCount++
					result.ItemsKept = append(result.ItemsKept, it)
					continue
				}
			}

			// Proteção 3: Filtro de SellSlotTypes (se configurado, preserva itens cujo slot não foi marcado para venda)
			if len(sellSlotMap) > 0 && !sellSlotMap[strings.ToLower(strings.TrimSpace(it.SlotType))] {
				result.ProtectedSlotCount++
				result.ItemsKept = append(result.ItemsKept, it)
				continue
			}

			// Proteção 4: Raridade protegida (ex: Raro, Épico, Lendário)
			if IsItemRarityProtected(it.Rarity, settings.SellRarities) {
				result.ProtectedRarityCount++
				result.ItemsKept = append(result.ItemsKept, it)
				continue
			}

			// Proteção 5: Template protegido explicitamente (por TemplateKey ou Name)
			if protectedTemplateMap[normalizeContentKey(it.TemplateKey)] || protectedTemplateMap[normalizeContentKey(it.Name)] {
				result.ItemsKept = append(result.ItemsKept, it)
				continue
			}

			// Proteção 6: Preservação das Melhores Cópias / Duplicados
			if settings.OnlyDuplicates {
				if idx < keepBest {
					// As primeiras N melhores cópias são preservadas
					result.ItemsKept = append(result.ItemsKept, it)
					continue
				}
			}

			eligibleCandidates = append(eligibleCandidates, it)
		}
	}

	// Ordena candidatos à venda pela menor qualidade / menor valor primeiro (vende o pior primeiro)
	sort.Slice(eligibleCandidates, func(i, j int) bool {
		qI := calculateItemQuality(eligibleCandidates[i])
		qJ := calculateItemQuality(eligibleCandidates[j])
		if qI != qJ {
			return qI < qJ
		}
		return eligibleCandidates[i].Weight > eligibleCandidates[j].Weight
	})

	// Vende itens gradualmente até atingir a meta (target percent)
	curBackpackCount := len(backpack)
	curWeight := currentWeight

	for _, it := range eligibleCandidates {
		curOcc := CalculateOccupancyPercent(curBackpackCount, maxSlots, curWeight, maxWeight)
		if curOcc <= target {
			// Meta atingida! Preserva o restante dos candidatos
			result.ItemsKept = append(result.ItemsKept, it)
		} else {
			// Vende este item
			result.ItemsToSell = append(result.ItemsToSell, it)
			result.TotalGoldEstimated += CalculateAutoSellItemPrice(it)
			curBackpackCount--
			curWeight -= it.Weight
		}
	}

	return result
}
