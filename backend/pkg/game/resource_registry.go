package game

import (
	"fmt"
	"sort"
	"sync"
)

var (
	resourceRegistryMu sync.RWMutex
	resourceRegistry   = map[string]ResourceDefinition{
		// Recursos Primários e Regionais (Materiais que ocupam espaço e podem ser descartados)
		"wood": {
			Key:                 "wood",
			Name:                "Madeira",
			Icon:                "🪵",
			Rarity:              "Comum",
			Description:         "Troncos resistentes coletados em florestas e bosques. Essencial para erguer fogueiras, cabanas e estruturas básicas.",
			MaxStack:            999999,
			Category:            ResourceCategoryProfessionRaw,
			CountsTowardStorage: true,
			Discardable:         true,
			SourceKind:          "gathering",
			ProfessionKey:       "lumberjack",
			Tier:                1,
			StorageWeight:       1,
			Tradeable:           true,
			ContentVersion:      2,
		},
		"stone": {
			Key:                 "stone",
			Name:                "Pedra",
			Icon:                "🪨",
			Rarity:              "Comum",
			Description:         "Blocos de rocha firme extraídos de ruínas e solos áridos. Usado na fundação do armazém, fontes e lareiras.",
			MaxStack:            999999,
			Category:            ResourceCategoryProfessionRaw,
			CountsTowardStorage: true,
			Discardable:         true,
			SourceKind:          "gathering",
			ProfessionKey:       "miner",
			Tier:                1,
			StorageWeight:       1,
			Tradeable:           true,
			ContentVersion:      2,
		},
		"fiber": {
			Key:                 "fiber",
			Name:                "Fibra",
			Icon:                "🌾",
			Rarity:              "Comum",
			Description:         "Fibras vegetais e teias resistentes. Crucial para cordas, telhados, estofamentos da cabana e bancadas.",
			MaxStack:            999999,
			Category:            ResourceCategoryProfessionRaw,
			CountsTowardStorage: true,
			Discardable:         true,
			SourceKind:          "gathering",
			ProfessionKey:       "farmer",
			Tier:                1,
			StorageWeight:       1,
			Tradeable:           true,
			ContentVersion:      2,
		},
		"iron": {
			Key:                 "iron",
			Name:                "Minério de Ferro",
			Icon:                "⛓️",
			Rarity:              "Incomum",
			Description:         "Minério denso forjável encontrado em masmorras e ruínas profundas. Necessário para melhorias avançadas e ferramentas de ferreiro.",
			MaxStack:            999999,
			Category:            ResourceCategoryProfessionRaw,
			CountsTowardStorage: true,
			Discardable:         true,
			SourceKind:          "gathering",
			ProfessionKey:       "miner",
			Tier:                2,
			StorageWeight:       1,
			Tradeable:           true,
			ContentVersion:      2,
		},
		"arcane_essence": {
			Key:                 "arcane_essence",
			Name:                "Essência Arcana",
			Icon:                "🔮",
			Rarity:              "Raro",
			Description:         "Concentrado puro de energia mágica emanado por criaturas místicas. Alimenta a Fonte Arcana e encantamentos.",
			MaxStack:            999999,
			Category:            ResourceCategoryMaterial,
			CountsTowardStorage: true,
			Discardable:         true,
		},
		"glacial_crystal": {
			Key:                 "glacial_crystal",
			Name:                "Cristal Glacial",
			Icon:                "❄️",
			Rarity:              "Épico",
			Description:         "Fragmento de gelo eterno das terras gélidas que nunca derrete. Usado em construções de alta tecnologia e maestria.",
			MaxStack:            999999,
			Category:            ResourceCategoryMaterial,
			CountsTowardStorage: true,
			Discardable:         true,
		},
		"abyssal_ember": {
			Key:                 "abyssal_ember",
			Name:                "Brasa Abissal",
			Icon:                "🔥",
			Rarity:              "Lendário",
			Description:         "Chama perpétua forjada nas profundezas do Abismo. Material lendário para construções e refinos supremos.",
			MaxStack:            999999,
			Category:            ResourceCategoryMaterial,
			CountsTowardStorage: true,
			Discardable:         true,
		},

		// Troféus de Chefões de Expedição (Nunca ocupam capacidade do armazém e não podem ser descartados)
		"trophy_forest_bear": {
			Key:                 "trophy_forest_bear",
			Name:                "Troféu: Garra do Urso Ranzinza",
			Icon:                "🐻",
			Rarity:              "Raro",
			Description:         "Garra imponente arrancada do Urso Ranzinza da Floresta. Prova definitiva de conquista do Tier 1.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
		"trophy_shereque_fiona": {
			Key:                 "trophy_shereque_fiona",
			Name:                "Troféu: Tiara da Fiona Arrazadora",
			Icon:                "🐸",
			Rarity:              "Raro",
			Description:         "Adorno régio resgatado do pântano de Shereque.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
		"trophy_chapolin_alma": {
			Key:                 "trophy_chapolin_alma",
			Name:                "Troféu: Brasão da Alma Negra",
			Icon:                "🏴‍☠️",
			Rarity:              "Raro",
			Description:         "Insígnia sombria do corsário dos mares de Greiscu.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
		"trophy_orcruins_skeleton": {
			Key:                 "trophy_orcruins_skeleton",
			Name:                "Troféu: Crânio do Esquelético Pacato",
			Icon:                "💀",
			Rarity:              "Épico",
			Description:         "Crânio antigo infundido com a fúria das Ruínas Orc.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
		"trophy_esgotos_destroyer": {
			Key:                 "trophy_esgotos_destroyer",
			Name:                "Troféu: Lâmina do Destruidor",
			Icon:                "🥷",
			Rarity:              "Épico",
			Description:         "Fragmento de lâmina envenenada dos esgotos profundos.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
		"trophy_planalto_xandaum": {
			Key:                 "trophy_planalto_xandaum",
			Name:                "Troféu: Martelo da Lei de Xandaum",
			Icon:                "⚖️",
			Rarity:              "Épico",
			Description:         "Símbolo da autoridade inquestionável do Soberano da Toga.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
		"trophy_rogartes_darkmage": {
			Key:                 "trophy_rogartes_darkmage",
			Name:                "Troféu: Varinha das Trevas de Voldemorte",
			Icon:                "🪄",
			Rarity:              "Épico",
			Description:         "Cajado corrompido do arquimago sem nariz da Escola de Rogartes.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
		"trophy_frozen_master": {
			Key:                 "trophy_frozen_master",
			Name:                "Troféu: Coroa do Santuário Congelado",
			Icon:                "🌟",
			Rarity:              "Lendário",
			Description:         "Diadema reluzente forjado nas neves eternas do Santuário.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
		"trophy_abyss_avenger": {
			Key:                 "trophy_abyss_avenger",
			Name:                "Troféu: Chifre do Soberano Abissal",
			Icon:                "🐲",
			Rarity:              "Lendário",
			Description:         "Chifre ardente do Dragão Soberano do Abismo Profundo. Prova suprema de heroísmo.",
			MaxStack:            99999,
			Category:            ResourceCategoryTrophy,
			CountsTowardStorage: false,
			Discardable:         false,
		},
	}
)

// GetResourceDefinition retorna a definição de um recurso por chave.
func GetResourceDefinition(key string) (ResourceDefinition, bool) {
	resourceRegistryMu.RLock()
	defer resourceRegistryMu.RUnlock()
	res, ok := resourceRegistry[key]
	return res, ok
}

// RegisterResourceDefinition permite que catálogos econômicos modulares adicionem
// conteúdo sem alterar o registry central. Chaves existentes nunca são sobrescritas.
func RegisterResourceDefinition(def ResourceDefinition) error {
	if def.Key == "" || def.Name == "" {
		return fmt.Errorf("definição de recurso sem chave ou nome")
	}
	if def.MaxStack <= 0 {
		return fmt.Errorf("recurso %s com max stack inválido", def.Key)
	}
	if def.StorageWeight <= 0 && def.CountsTowardStorage {
		def.StorageWeight = 1
	}
	if def.ContentVersion <= 0 {
		def.ContentVersion = 2
	}
	resourceRegistryMu.Lock()
	defer resourceRegistryMu.Unlock()
	if _, exists := resourceRegistry[def.Key]; exists {
		return fmt.Errorf("recurso duplicado: %s", def.Key)
	}
	resourceRegistry[def.Key] = def
	return nil
}

// GetStorageUsed calcula a ocupação efetiva do armazém considerando apenas materiais armazenáveis.
// Troféus de boss nunca contam para a capacidade do armazém.
func GetStorageUsed(resources map[string]int64) int64 {
	resourceRegistryMu.RLock()
	defer resourceRegistryMu.RUnlock()

	var total int64
	for key, qty := range resources {
		if qty <= 0 {
			continue
		}
		def, ok := resourceRegistry[key]
		if ok {
			if def.CountsTowardStorage {
				weight := def.StorageWeight
				if weight <= 0 {
					weight = 1
				}
				total += qty * weight
			}
		} else {
			// Fallback seguro: se não for troféu conhecido por prefixo, conta para o storage
			if len(key) < 7 || key[:7] != "trophy_" {
				total += qty
			}
		}
	}
	return total
}

// IsResourceDiscardable verifica se um recurso pode ser descartado voluntariamente pelo jogador.
func IsResourceDiscardable(key string) bool {
	resourceRegistryMu.RLock()
	defer resourceRegistryMu.RUnlock()

	def, ok := resourceRegistry[key]
	if !ok {
		return false
	}
	return def.Discardable
}

// ValidateResourceQuantity valida se a quantidade informada para descarte ou movimentação é válida.
func ValidateResourceQuantity(key string, quantity int64) error {
	if quantity <= 0 {
		return fmt.Errorf("a quantidade deve ser maior que zero (recebido: %d)", quantity)
	}
	resourceRegistryMu.RLock()
	defer resourceRegistryMu.RUnlock()

	def, ok := resourceRegistry[key]
	if !ok {
		return fmt.Errorf("recurso não reconhecido: %s", key)
	}
	if def.MaxStack > 0 && quantity > def.MaxStack {
		return fmt.Errorf("quantidade (%d) excede o limite máximo permitido (%d)", quantity, def.MaxStack)
	}
	return nil
}

// ListResourceDefinitions retorna todos os recursos ordenados por raridade e chave.
func ListResourceDefinitions() []ResourceDefinition {
	resourceRegistryMu.RLock()
	defer resourceRegistryMu.RUnlock()

	list := make([]ResourceDefinition, 0, len(resourceRegistry))
	for _, res := range resourceRegistry {
		list = append(list, res)
	}

	sort.Slice(list, func(i, j int) bool {
		return list[i].Key < list[j].Key
	})
	return list
}

// ValidateResourceRegistry valida consistência interna de chaves e definições.
func ValidateResourceRegistry() error {
	resourceRegistryMu.RLock()
	defer resourceRegistryMu.RUnlock()

	for key, res := range resourceRegistry {
		if res.Key != key {
			return fmt.Errorf("inconsistência na chave do recurso: %s != %s", res.Key, key)
		}
		if res.Name == "" {
			return fmt.Errorf("recurso %s sem nome definido", key)
		}
		if res.MaxStack <= 0 {
			return fmt.Errorf("recurso %s com max stack inválido: %d", key, res.MaxStack)
		}
		if res.CountsTowardStorage && res.StorageWeight < 0 {
			return fmt.Errorf("recurso %s com peso de armazenamento inválido: %d", key, res.StorageWeight)
		}
	}
	return nil
}
