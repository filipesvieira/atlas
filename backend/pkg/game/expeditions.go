package game

import "math/rand"

const (
	DefaultExpeditionRegionID  = "forest"
	DefaultExpeditionMaxStages = 5
)

type ExpeditionRegion struct {
	ID                 string    `json:"id"`
	BiomeKey           string    `json:"biome_key"`
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
		BiomeKey:           "forest",
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
			{Key: "forest_goblin", VisualKey: "forest_goblin", Name: "Goblin Salteador", Level: 1, Health: 60, MaxHealth: 60, Attack: 7, AttackType: AttackTypeMelee},
			{Key: "forest_wolf", VisualKey: "forest_wolf", Name: "Lobo Selvagem", Level: 3, Health: 90, MaxHealth: 90, Attack: 11, AttackType: AttackTypeMelee},
			{Key: "forest_spider", VisualKey: "forest_spider", Name: "Aranha de Espinhos", Level: 4, Health: 110, MaxHealth: 110, Attack: 13, AttackType: AttackTypeRanged},
		},
		Boss: Monster{Key: "forest_boss_bear", VisualKey: "forest_boss_bear", IsBoss: true, Name: "Urso Ranzinza dos Carinhosos 🐻", Level: 5, Health: 520, MaxHealth: 520, Attack: 28, AttackType: AttackTypeMelee},
	},
	"shereque": {
		ID:                 "shereque",
		BiomeKey:           "shereque",
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
			{Key: "shereque_ogre", VisualKey: "shereque_ogre", Name: "Ogre Verde", Level: 2, Health: 80, MaxHealth: 80, Attack: 9, AttackType: AttackTypeMelee},
			{Key: "shereque_donkey", VisualKey: "shereque_donkey", Name: "Burro Falante", Level: 4, Health: 100, MaxHealth: 100, Attack: 12, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "shereque_boss_fiona", VisualKey: "shereque_boss_fiona", IsBoss: true, Name: "Fiona Arrazadora 🐸", Level: 5, Health: 560, MaxHealth: 560, Attack: 30, AttackType: AttackTypeMelee},
	},
	"chapolin": {
		ID:                 "chapolin",
		BiomeKey:           "chapolin",
		Name:               "Vila do Chapolin",
		Tier:               1,
		Order:              3,
		MinLevel:           1,
		MaxLevel:           5,
		Description:        "Vila temática onde piratas assustam os moradores.",
		Icon:               "🎩",
		MaxStages:          5,
		RequiresUnlockFrom: "",
		DropsPreview:       []string{"Espada do Aprendiz", "Machadinha de Madeira", "Broquel de Madeira", "Anel de Cobre", "Manual: Tiro Quádruplo"},
		Monsters: []Monster{
			{Key: "chapolin_pirate", VisualKey: "chapolin_pirate", Name: "Pirata Alma Negra", Level: 3, Health: 95, MaxHealth: 95, Attack: 11, AttackType: AttackTypeMelee},
			{Key: "chapolin_tripa", VisualKey: "chapolin_tripa", Name: "Tripa Seca", Level: 4, Health: 105, MaxHealth: 105, Attack: 13, AttackType: AttackTypeMelee},
			{Key: "chapolin_bandit", VisualKey: "chapolin_bandit", Name: "Bandido dos Ermos", Level: 4, Health: 110, MaxHealth: 110, Attack: 14, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "chapolin_boss_alma", VisualKey: "chapolin_boss_alma", IsBoss: true, Name: "Alma Negra de Greiscu 🏴‍☠️", Level: 5, Health: 600, MaxHealth: 600, Attack: 32, AttackType: AttackTypeMelee},
	},

	// ─── TIER 2 (LV. 5–19) ──────────────────────────────────────────────────
	"orcruins": {
		ID:                 "orcruins",
		BiomeKey:           "orcruins",
		Name:               "Castelo de Greiscu",
		Tier:               2,
		Order:              4,
		MinLevel:           5,
		MaxLevel:           12,
		Description:        "Fortificação ancestral guardada pelo terrível Esquelético.",
		Icon:               "🏰",
		MaxStages:          5,
		RequiresUnlockFrom: "forest",
		DropsPreview:       []string{"Machado Orc", "Sabre de Bronze", "Cota de Malha", "Escudo de Madeira", "Mochila de Aventureiro", "Livro: Cura Divina"},
		Monsters: []Monster{
			{Key: "orcruins_orc", VisualKey: "orcruins_orc", Name: "Orc Guerreiro", Level: 6, Health: 140, MaxHealth: 140, Attack: 16, AttackType: AttackTypeMelee},
			{Key: "orcruins_orc_mage", VisualKey: "orcruins_orc_mage", Name: "Orc Mago", Level: 7, Health: 150, MaxHealth: 150, Attack: 18, AttackType: AttackTypeRanged},
			{Key: "orcruins_skeleton", VisualKey: "orcruins_skeleton", Name: "Esqueleto Guardião", Level: 8, Health: 170, MaxHealth: 170, Attack: 20, AttackType: AttackTypeRanged},
			{Key: "orcruins_orc_archer", VisualKey: "orcruins_orc_archer", Name: "Orc Arqueiro", Level: 9, Health: 185, MaxHealth: 185, Attack: 22, AttackType: AttackTypeRanged},
			{Key: "orcruins_berserker", VisualKey: "orcruins_berserker", Name: "Orc Berserker", Level: 10, Health: 210, MaxHealth: 210, Attack: 26, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "orcruins_boss_skeleton", VisualKey: "orcruins_boss_skeleton", IsBoss: true, Name: "Esquelético Pacato 💀", Level: 12, Health: 1100, MaxHealth: 1100, Attack: 52, AttackType: AttackTypeRanged},
	},
	"esgotos": {
		ID:                 "esgotos",
		BiomeKey:           "esgotos",
		Name:               "Esgotos Tartaruga",
		Tier:               2,
		Order:              5,
		MinLevel:           5,
		MaxLevel:           12,
		Description:        "Subterrâneo escuro dominado pelo Clã do Pé e ratos mutantes.",
		Icon:               "🥷",
		MaxStages:          5,
		RequiresUnlockFrom: "forest",
		DropsPreview:       []string{"Arco Longo", "Maça de Batalha", "Calça de Couro", "Botas de Couro", "Colar de Prata", "Virotes Perfurantes", "Manual: Tiro Preciso"},
		Monsters: []Monster{
			{Key: "esgotos_ninja", VisualKey: "esgotos_ninja", Name: "Ninja do Clã do Pé", Level: 7, Health: 150, MaxHealth: 150, Attack: 17, AttackType: AttackTypeRanged},
			{Key: "esgotos_rat", VisualKey: "esgotos_rat", Name: "Rato Mutante", Level: 10, Health: 200, MaxHealth: 200, Attack: 23, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "esgotos_boss_destroyer", VisualKey: "esgotos_boss_destroyer", IsBoss: true, Name: "Destruidor Ranzinza 🥷", Level: 12, Health: 1200, MaxHealth: 1200, Attack: 55, AttackType: AttackTypeMelee},
	},
	"planalto": {
		ID:                 "planalto",
		BiomeKey:           "planalto",
		Name:               "Planalto dos Três Poderes",
		Tier:               2,
		Order:              6,
		MinLevel:           8,
		MaxLevel:           19,
		Description:        "Cenário político místico onde militantes e guardiões da lei disputam a Suprema Caneta.",
		Icon:               "🏛️",
		MaxStages:          5,
		RequiresUnlockFrom: "forest",
		DropsPreview:       []string{"Martelo Constitucional", "Caneta Esferográfica Suprema", "Megafone do Povo", "Toga da Inviolabilidade", "Boina Tática da Puliça", "Pasta Executiva Presidencial", "Tome: Golpe Brutal"},
		Monsters: []Monster{
			{Key: "planalto_militante", VisualKey: "planalto_militante", Name: "Militante do Treze ⭐️", Level: 8, Health: 165, MaxHealth: 165, Attack: 18, AttackType: AttackTypeMelee},
			{Key: "planalto_patriota", VisualKey: "planalto_patriota", Name: "Patriota do Caminhão 🇧🇷", Level: 10, Health: 195, MaxHealth: 195, Attack: 22, AttackType: AttackTypeRanged},
			{Key: "planalto_pulica", VisualKey: "planalto_pulica", Name: "Puliça de Choque 👮", Level: 12, Health: 235, MaxHealth: 235, Attack: 26, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "planalto_boss_xandaum", VisualKey: "planalto_boss_xandaum", IsBoss: true, Name: "Xandaum, o Soberano da Toga ⚖️", Level: 16, Health: 1850, MaxHealth: 1850, Attack: 72, AttackType: AttackTypeRanged},
	},

	// ─── TIER 3 (LV. 12–20) ─────────────────────────────────────────────────
	"rogartes": {
		ID:                 "rogartes",
		BiomeKey:           "rogartes",
		Name:               "Escola de Rogartes",
		Tier:               3,
		Order:              6,
		MinLevel:           12,
		MaxLevel:           20,
		Description:        "Escola de magia infestada por dementadores e bruxos das sombras.",
		Icon:               "🧙‍♂️",
		MaxStages:          5,
		RequiresUnlockFrom: "orcruins",
		DropsPreview:       []string{"Cetro do Esquelético", "Elmo Rúnico", "Peitoral de Platina", "Bolsa Rúnica", "Livro: Bola de Fogo"},
		Monsters: []Monster{
			{Key: "rogartes_dementor", VisualKey: "rogartes_dementor", Name: "Dementador das Sombras", Level: 13, Health: 260, MaxHealth: 260, Attack: 29, AttackType: AttackTypeRanged},
			{Key: "rogartes_troll", VisualKey: "rogartes_troll", Name: "Trasgo das Cavernas", Level: 17, Health: 350, MaxHealth: 350, Attack: 36, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "rogartes_boss_darkmage", VisualKey: "rogartes_boss_darkmage", IsBoss: true, Name: "Voldemorte sem Nariz 🪄", Level: 20, Health: 2600, MaxHealth: 2600, Attack: 98, AttackType: AttackTypeRanged},
	},

	// ─── TIER 4 (LV. 20–35) ─────────────────────────────────────────────────
	"frozen": {
		ID:                 "frozen",
		BiomeKey:           "frozen",
		Name:               "Santuário de Atenas",
		Tier:               4,
		Order:              7,
		MinLevel:           20,
		MaxLevel:           35,
		Description:        "Picos congelados guardados pelos Cavaleiros de Ouro e espectros.",
		Icon:               "🛡️",
		MaxStages:          5,
		RequiresUnlockFrom: "rogartes",
		DropsPreview:       []string{"Katana da Fúria", "Marreta Biônica", "Arco dos Ventos", "Orbe Protetor", "Robe Místico", "Mochila Dragônica", "Livro: Estilhaço de Gelo"},
		Monsters: []Monster{
			{Key: "frozen_specter", VisualKey: "frozen_specter", Name: "Lorde Espectro", Level: 22, Health: 380, MaxHealth: 380, Attack: 40, AttackType: AttackTypeRanged},
			{Key: "frozen_zombie", VisualKey: "frozen_zombie", Name: "Zumbi Congelado", Level: 25, Health: 440, MaxHealth: 440, Attack: 45, AttackType: AttackTypeMelee},
			{Key: "frozen_golem", VisualKey: "frozen_golem", Name: "Golem de Gelo", Level: 28, Health: 530, MaxHealth: 530, Attack: 52, AttackType: AttackTypeMelee},
			{Key: "frozen_chimera", VisualKey: "frozen_chimera", Name: "Quimera do Frost", Level: 33, Health: 680, MaxHealth: 680, Attack: 62, AttackType: AttackTypeRanged},
		},
		Boss: Monster{Key: "frozen_boss_master", VisualKey: "frozen_boss_master", IsBoss: true, Name: "Mestre do Santuário 🌟", Level: 35, Health: 4800, MaxHealth: 4800, Attack: 155, AttackType: AttackTypeRanged},
	},

	// ─── TIER 5 (LV. 35–99) ─────────────────────────────────────────────────
	"abyss": {
		ID:                 "abyss",
		BiomeKey:           "abyss",
		Name:               "Caverna do Dragão Perdido",
		Tier:               5,
		Order:              8,
		MinLevel:           35,
		MaxLevel:           99,
		Description:        "Abismo vulcânico lendário onde feras guardam relíquias míticas.",
		Icon:               "🌋",
		MaxStages:          5,
		RequiresUnlockFrom: "frozen",
		DropsPreview:       []string{"Espada Mítica do Vingador", "Lâmina de Greiscu", "Arco Apocalíptico", "Cajado da Eternidade", "Mochila do Zodíaco", "Flechas Divinas"},
		IsSecret:           true,
		Monsters: []Monster{
			{Key: "abyss_dragon", VisualKey: "abyss_dragon", Name: "Dragão Cinderino", Level: 40, Health: 900, MaxHealth: 900, Attack: 80, AttackType: AttackTypeRanged},
			{Key: "abyss_demon", VisualKey: "abyss_demon", Name: "Demônio Ancestral", Level: 50, Health: 1250, MaxHealth: 1250, Attack: 105, AttackType: AttackTypeRanged},
			{Key: "abyss_vampire", VisualKey: "abyss_vampire", Name: "Vampiro Ancestral", Level: 60, Health: 1550, MaxHealth: 1550, Attack: 125, AttackType: AttackTypeRanged},
			{Key: "abyss_necromancer", VisualKey: "abyss_necromancer", Name: "Necromante Sombrio", Level: 65, Health: 1750, MaxHealth: 1750, Attack: 140, AttackType: AttackTypeRanged},
			{Key: "abyss_scorpion", VisualKey: "abyss_scorpion", Name: "Escorpião Infernal", Level: 70, Health: 1950, MaxHealth: 1950, Attack: 155, AttackType: AttackTypeMelee},
			{Key: "abyss_flame_lord", VisualKey: "abyss_flame_lord", Name: "Lorde das Chamas", Level: 78, Health: 2400, MaxHealth: 2400, Attack: 175, AttackType: AttackTypeRanged},
		},
		Boss: Monster{Key: "abyss_boss_avenger", VisualKey: "abyss_boss_avenger", IsBoss: true, Name: "Vingador de Chifres 🐲", Level: 85, Health: 12500, MaxHealth: 12500, Attack: 340, AttackType: AttackTypeRanged},
	},
}

// GetRandomMonsterForRegion retorna uma cópia de monstro com nível fixo do seu template.
func GetRandomMonsterForRegion(regionID string, r *rand.Rand) Monster {
	if r == nil {
		r = rand.New(rand.NewSource(1))
	}
	reg, exists := GetExpeditionRegion(regionID)
	if !exists {
		reg, _ = GetExpeditionRegion(DefaultExpeditionRegionID)
	}
	mTemplate := reg.Monsters[r.Intn(len(reg.Monsters))]

	return Monster{
		Key:        mTemplate.Key,
		VisualKey:  mTemplate.VisualKey,
		IsBoss:     mTemplate.IsBoss,
		Name:       mTemplate.Name,
		Level:      mTemplate.Level,
		Health:     mTemplate.Health,
		MaxHealth:  mTemplate.MaxHealth,
		Attack:     mTemplate.Attack,
		AttackType: mTemplate.AttackType,
	}
}
