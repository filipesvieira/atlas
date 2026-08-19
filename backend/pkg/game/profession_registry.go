package game

import (
	"fmt"
	"math"
	"sort"
)

const MaxProfessionLevel = 50

type ProfessionCategory string

const (
	ProfessionCategoryGathering ProfessionCategory = "gathering"
	ProfessionCategoryCrafting  ProfessionCategory = "crafting"
)

type ProfessionDefinition struct {
	Key         string             `json:"key"`
	Name        string             `json:"name"`
	Icon        string             `json:"icon"`
	Category    ProfessionCategory `json:"category"`
	Description string             `json:"description"`
	MaxLevel    int                `json:"max_level"`
}

type ProfessionProgress struct {
	ProfessionKey string `json:"profession_key"`
	Level         int    `json:"level"`
	Experience    int64  `json:"experience"`
	XPRequired    int64  `json:"xp_required"`
	Revision      int64  `json:"revision"`
}

var ProfessionRegistry = map[string]ProfessionDefinition{
	// ───────────────────────────────────────────────────────────────────────────
	// 🌲 PROFISSÕES DE COLETA (GATHERING)
	// ───────────────────────────────────────────────────────────────────────────
	"lumberjack": {
		Key:         "lumberjack",
		Name:        "Lenhador",
		Icon:        "🪓",
		Category:    ProfessionCategoryGathering,
		Description: "Coleta madeira, resina e sementes em bosques florestais.",
		MaxLevel:    MaxProfessionLevel,
	},
	"miner": {
		Key:         "miner",
		Name:        "Minerador",
		Icon:        "⛏️",
		Category:    ProfessionCategoryGathering,
		Description: "Extrai pedra, carvão, ferro e minérios preciosos.",
		MaxLevel:    MaxProfessionLevel,
	},
	"fisher": {
		Key:         "fisher",
		Name:        "Pescador",
		Icon:        "🎣",
		Category:    ProfessionCategoryGathering,
		Description: "Pesca alimentos, escamas e componentes aquáticos em rios e lagos.",
		MaxLevel:    MaxProfessionLevel,
	},
	"farmer": {
		Key:         "farmer",
		Name:        "Agricultor",
		Icon:        "🌾",
		Category:    ProfessionCategoryGathering,
		Description: "Cultiva trigo, fibras, sementes e grãos.",
		MaxLevel:    MaxProfessionLevel,
	},
	"tracker": {
		Key:         "tracker",
		Name:        "Rastreador",
		Icon:        "🐾",
		Category:    ProfessionCategoryGathering,
		Description: "Obtém carne, couro cru e materiais animais sem combate de expedição.",
		MaxLevel:    MaxProfessionLevel,
	},
	"herbalist": {
		Key:         "herbalist",
		Name:        "Herbalista",
		Icon:        "🌿",
		Category:    ProfessionCategoryGathering,
		Description: "Localiza ervas medicinais, raízes e essências naturais raras.",
		MaxLevel:    MaxProfessionLevel,
	},

	// ───────────────────────────────────────────────────────────────────────────
	// ⚒️ PROFISSÕES DE ARTESANATO E FORJA (CRAFTING)
	// ───────────────────────────────────────────────────────────────────────────
	"blacksmith": {
		Key:         "blacksmith",
		Name:        "Ferreiro",
		Icon:        "⚔️",
		Category:    ProfessionCategoryCrafting,
		Description: "Forja armas corpo a corpo (espadas, machados, clavas), escudos e fundição de metais.",
		MaxLevel:    MaxProfessionLevel,
	},
	"jeweler": {
		Key:         "jeweler",
		Name:        "Joalheiro",
		Icon:        "💎",
		Category:    ProfessionCategoryCrafting,
		Description: "Lapida e cria anéis, amuletos, colares e joias encantadas.",
		MaxLevel:    MaxProfessionLevel,
	},
	"leatherworker": {
		Key:         "leatherworker",
		Name:        "Coureiro",
		Icon:        "🧥",
		Category:    ProfessionCategoryCrafting,
		Description: "Confecciona botas, sandálias, mochilas, bolsas e curtimento de couro.",
		MaxLevel:    MaxProfessionLevel,
	},
	"tailor": {
		Key:         "tailor",
		Name:        "Alfaiate",
		Icon:        "🧵",
		Category:    ProfessionCategoryCrafting,
		Description: "Costura e confecciona armaduras, robes, túnicas, calças, capacetes e tecelagem.",
		MaxLevel:    MaxProfessionLevel,
	},
	"woodworker": {
		Key:         "woodworker",
		Name:        "Marceneiro",
		Icon:        "🪵",
		Category:    ProfessionCategoryCrafting,
		Description: "Entalha arcos, varinhas mágicas, cajados, flechas, virotes e tábuas tratadas.",
		MaxLevel:    MaxProfessionLevel,
	},
	"alchemist": {
		Key:         "alchemist",
		Name:        "Alquimista",
		Icon:        "🧪",
		Category:    ProfessionCategoryCrafting,
		Description: "Destila elixires, poções, pós e refinamentos arcanos.",
		MaxLevel:    MaxProfessionLevel,
	},
}

func GetProfessionDefinition(key string) (ProfessionDefinition, bool) {
	definition, exists := ProfessionRegistry[key]
	return definition, exists
}

func ListProfessionDefinitions() []ProfessionDefinition {
	result := make([]ProfessionDefinition, 0, len(ProfessionRegistry))
	for _, definition := range ProfessionRegistry {
		result = append(result, definition)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Key < result[j].Key })
	return result
}

func GetRequiredProfessionXP(level int) int64 {
	if level < 1 {
		level = 1
	}
	return int64(math.Round(75 * math.Pow(float64(level), 1.45)))
}

func ApplyProfessionExperience(progress ProfessionProgress, gained int64) ProfessionProgress {
	if progress.Level < 1 {
		progress.Level = 1
	}
	if gained > 0 {
		progress.Experience += gained
	}
	for progress.Level < MaxProfessionLevel && progress.Experience >= GetRequiredProfessionXP(progress.Level) {
		progress.Experience -= GetRequiredProfessionXP(progress.Level)
		progress.Level++
	}
	if progress.Level >= MaxProfessionLevel {
		progress.Level = MaxProfessionLevel
		progress.Experience = 0
	}
	progress.XPRequired = GetRequiredProfessionXP(progress.Level)
	progress.Revision++
	return progress
}

// ProfessionXPMultiplier reduz XP de nós muito abaixo da profissão sem reduzir
// os recursos coletados. Isso evita progressão infinita no conteúdo inicial.
func ProfessionXPMultiplier(professionLevel, nodeLevel int) float64 {
	difference := professionLevel - nodeLevel
	switch {
	case difference <= 5:
		return 1
	case difference <= 10:
		return .60
	case difference <= 20:
		return .25
	default:
		return .05
	}
}

func ValidateProfessionRegistry() error {
	for key, definition := range ProfessionRegistry {
		if definition.Key != key || definition.Name == "" || definition.MaxLevel < 1 {
			return fmt.Errorf("profissão inválida: %s", key)
		}
	}
	return nil
}
