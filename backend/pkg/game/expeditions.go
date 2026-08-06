package game

import "math/rand"

type ExpeditionRegion struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Tier               int       `json:"tier"`
	Order              int       `json:"order"`
	MinLevel           int       `json:"min_level"`
	MaxLevel           int       `json:"max_level"`
	Description        string    `json:"description"`
	Icon               string    `json:"icon"`
	MaxStages          int       `json:"max_stages"`
	RequiresUnlockFrom string    `json:"requires_unlock_from,omitempty"`
	DropsPreview       []string  `json:"drops_preview"`
	Monsters           []Monster `json:"monsters"`
	Boss               Monster   `json:"boss"`
	IsSecret           bool      `json:"is_secret"`
}

var ExpeditionRegions = map[string]ExpeditionRegion{
	// ─── TIER 1 (LV. 1–5) ───────────────────────────────────────────────────
	"forest": {
		ID:                 "forest",
		Name:               "Floresta dos Aprendizes",
		Tier:               1,
		Order:              1,
		MinLevel:           1,
		MaxLevel:           5,
		Description:        "Florestas tranquilas perfeitas para novos aventureiros.",
		Icon:               "🌲",
		MaxStages:          5,
		RequiresUnlockFrom: "",
		DropsPreview:       []string{"Espada do Aprendiz", "Arco Curvo", "Varinha do Aprendiz", "Capacete de Couro", "Pequena Bolsa", "Amuleto do Lobo"},
		Monsters: []Monster{
			{Name: "Goblin Salteador", Level: 1, Health: 60, MaxHealth: 60, Attack: 7, AttackType: AttackTypeMelee},
			{Name: "Lobo Selvagem", Level: 3, Health: 90, MaxHealth: 90, Attack: 11, AttackType: AttackTypeMelee},
			{Name: "Aranha de Espinhos", Level: 4, Health: 110, MaxHealth: 110, Attack: 13, AttackType: AttackTypeRanged},
		},
		Boss: Monster{Name: "Urso Ranzinza dos Carinhosos 🐻", Level: 5, Health: 350, MaxHealth: 350, Attack: 22, AttackType: AttackTypeMelee},
	},
	"shereque": {
		ID:                 "shereque",
		Name:               "Vila do Shereque",
		Tier:               1,
		Order:              2,
		MinLevel:           1,
		MaxLevel:           5,
		Description:        "Pântano verde onde ogros e burros falantes guardam tesouros rústicos.",
		Icon:               "🍞",
		MaxStages:          5,
		RequiresUnlockFrom: "",
		DropsPreview:       []string{"Clava de Madeira", "Machadinha de Madeira", "Broquel de Madeira", "Túnica de Couro", "Sandálias Ágeis", "Tome: Golpe Giratório"},
		Monsters: []Monster{
			{Name: "Ogre Verde", Level: 2, Health: 80, MaxHealth: 80, Attack: 9, AttackType: AttackTypeMelee},
			{Name: "Burro Falante", Level: 4, Health: 100, MaxHealth: 100, Attack: 12, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Name: "Fiona Arrazadora 🐸", Level: 5, Health: 380, MaxHealth: 380, Attack: 24, AttackType: AttackTypeMelee},
	},
	"chapolin": {
		ID:                 "chapolin",
		Name:               "Vila do Chapolin",
		Tier:               1,
		Order:              3,
		MinLevel:           1,
		MaxLevel:           5,
		Description:        "Vila temática onde piratas assustam os moradores.",
		Icon:               "🎩",
		MaxStages:          5,
		RequiresUnlockFrom: "",
		DropsPreview:       []string{"Sabre de Bronze", "Coifa de Prata", "Anel de Cobre", "Flechas de Madeira", "Manual: Tiro Quádruplo"},
		Monsters: []Monster{
			{Name: "Pirata Alma Negra", Level: 3, Health: 95, MaxHealth: 95, Attack: 11, AttackType: AttackTypeMelee},
			{Name: "Tripa Seca", Level: 4, Health: 105, MaxHealth: 105, Attack: 13, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Name: "Alma Negra de Greiscu 🏴‍☠️", Level: 5, Health: 400, MaxHealth: 400, Attack: 26, AttackType: AttackTypeMelee},
	},

	// ─── TIER 2 (LV. 5–12) ──────────────────────────────────────────────────
	"orcruins": {
		ID:                 "orcruins",
		Name:               "Castelo de Greiscu",
		Tier:               2,
		Order:              4,
		MinLevel:           5,
		MaxLevel:           12,
		Description:        "Fortificação ancestral guardada pelo terrível Esquelético.",
		Icon:               "🏰",
		MaxStages:          5,
		RequiresUnlockFrom: "forest",
		DropsPreview:       []string{"Machado Orc", "Espada de Aço", "Cota de Malha", "Escudo de Madeira", "Mochila de Aventureiro"},
		Monsters: []Monster{
			{Name: "Orc Guerreiro", Level: 6, Health: 150, MaxHealth: 150, Attack: 16, AttackType: AttackTypeMelee},
			{Name: "Esqueleto Guardião", Level: 8, Health: 190, MaxHealth: 190, Attack: 21, AttackType: AttackTypeRanged},
			{Name: "Orc Berserker", Level: 11, Health: 240, MaxHealth: 240, Attack: 28, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Name: "Esquelético Pacato 💀", Level: 12, Health: 680, MaxHealth: 680, Attack: 45, AttackType: AttackTypeRanged},
	},
	"esgotos": {
		ID:                 "esgotos",
		Name:               "Esgotos Tartaruga",
		Tier:               2,
		Order:              5,
		MinLevel:           5,
		MaxLevel:           12,
		Description:        "Subterrâneo escuro dominado pelo Clã do Pé e ratos mutantes.",
		Icon:               "🥷",
		MaxStages:          5,
		RequiresUnlockFrom: "forest",
		DropsPreview:       []string{"Arco Longo", "Maça de Batalha", "Calça de Couro", "Botas de Couro", "Colar de Prata", "Virotes Perfurantes"},
		Monsters: []Monster{
			{Name: "Ninja do Clã do Pé", Level: 7, Health: 165, MaxHealth: 165, Attack: 18, AttackType: AttackTypeRanged},
			{Name: "Rato Mutante", Level: 9, Health: 200, MaxHealth: 200, Attack: 23, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Name: "Destruidor Ranzinza 🥷", Level: 12, Health: 720, MaxHealth: 720, Attack: 48, AttackType: AttackTypeMelee},
	},

	// ─── TIER 3 (LV. 12–20) ─────────────────────────────────────────────────
	"rogartes": {
		ID:                 "rogartes",
		Name:               "Escola de Rogartes",
		Tier:               3,
		Order:              6,
		MinLevel:           12,
		MaxLevel:           20,
		Description:        "Escola de magia infestada por dementadores e bruxos das sombras.",
		Icon:               "🧙‍♂️",
		MaxStages:          5,
		RequiresUnlockFrom: "orcruins",
		DropsPreview:       []string{"Cajado Rúnico", "Varinha das Relíquias", "Robe Místico", "Elmo Rúnico", "Bolsa Rúnica", "Livro: Bola de Fogo"},
		Monsters: []Monster{
			{Name: "Dementador das Sombras", Level: 13, Health: 310, MaxHealth: 310, Attack: 34, AttackType: AttackTypeRanged},
			{Name: "Trasgo das Cavernas", Level: 16, Health: 420, MaxHealth: 420, Attack: 42, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Name: "Voldemorte sem Nariz 🪄", Level: 20, Health: 1250, MaxHealth: 1250, Attack: 75, AttackType: AttackTypeRanged},
	},

	// ─── TIER 4 (LV. 20–35) ─────────────────────────────────────────────────
	"frozen": {
		ID:                 "frozen",
		Name:               "Santuário de Atenas",
		Tier:               4,
		Order:              7,
		MinLevel:           20,
		MaxLevel:           35,
		Description:        "Picos congelados guardados pelos Cavaleiros de Ouro e espectros.",
		Icon:               "🛡️",
		MaxStages:          5,
		RequiresUnlockFrom: "rogartes",
		DropsPreview:       []string{"Katana da Fúria", "Marreta Biônica", "Arco dos Ventos", "Escudo do Zodíaco", "Armadura de Ouro", "Mochila Dragônica"},
		Monsters: []Monster{
			{Name: "Lorde Espectro", Level: 21, Health: 480, MaxHealth: 480, Attack: 48, AttackType: AttackTypeRanged},
			{Name: "Golem de Gelo", Level: 26, Health: 620, MaxHealth: 620, Attack: 58, AttackType: AttackTypeMelee},
			{Name: "Quimera do Frost", Level: 32, Health: 850, MaxHealth: 850, Attack: 75, AttackType: AttackTypeRanged},
		},
		Boss: Monster{Name: "Mestre do Santuário 🌟", Level: 35, Health: 2200, MaxHealth: 2200, Attack: 110, AttackType: AttackTypeRanged},
	},

	// ─── TIER 5 (LV. 35–99) ─────────────────────────────────────────────────
	"abyss": {
		ID:                 "abyss",
		Name:               "Caverna do Dragão Perdido",
		Tier:               5,
		Order:              8,
		MinLevel:           35,
		MaxLevel:           99,
		Description:        "Abismo vulcânico lendário onde feras guardar relíquias míticas.",
		Icon:               "🌋",
		MaxStages:          5,
		RequiresUnlockFrom: "frozen",
		DropsPreview:       []string{"Espada Mítica do Vingador", "Lâmina de Greiscu", "Arco Apocalíptico", "Cajado da Eternidade", "Mochila do Zodíaco", "Flechas Divinas"},
		IsSecret:           true,
		Monsters: []Monster{
			{Name: "Dragão Cinderino", Level: 38, Health: 1100, MaxHealth: 1100, Attack: 95, AttackType: AttackTypeRanged},
			{Name: "Demônio Ancestral", Level: 45, Health: 1600, MaxHealth: 1600, Attack: 130, AttackType: AttackTypeRanged},
			{Name: "Lorde das Chamas", Level: 55, Health: 2400, MaxHealth: 2400, Attack: 170, AttackType: AttackTypeRanged},
		},
		Boss: Monster{Name: "Vingador de Chifres 🐲", Level: 60, Health: 4500, MaxHealth: 4500, Attack: 210, AttackType: AttackTypeRanged},
	},
}

func GetRandomMonsterForRegion(regionID string, playerLevel int, r *rand.Rand) Monster {
	reg, exists := ExpeditionRegions[regionID]
	if !exists {
		reg = ExpeditionRegions["forest"]
	}
	mTemplate := reg.Monsters[r.Intn(len(reg.Monsters))]

	mobLevel := playerLevel
	if reg.MaxLevel > 0 && mobLevel > reg.MaxLevel {
		mobLevel = reg.MaxLevel
	}
	if mobLevel < reg.MinLevel {
		mobLevel = reg.MinLevel
	}
	if reg.MinLevel < reg.MaxLevel {
		fuzz := r.Intn(3) - 1
		mobLevel += fuzz
		if mobLevel > reg.MaxLevel {
			mobLevel = reg.MaxLevel
		}
		if mobLevel < reg.MinLevel {
			mobLevel = reg.MinLevel
		}
	}

	healthFuzz := mTemplate.Health + (mobLevel * 8) + r.Intn(10)
	attackFuzz := mTemplate.Attack + (mobLevel * 2) + r.Intn(4)

	return Monster{
		Name:       mTemplate.Name,
		Level:      mobLevel,
		Health:     healthFuzz,
		MaxHealth:  healthFuzz,
		Attack:     attackFuzz,
		AttackType: mTemplate.AttackType,
	}
}

