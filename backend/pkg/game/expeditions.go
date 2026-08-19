package game

import (
	"fmt"
	"math/rand"
	"sort"
)

const (
	DefaultExpeditionRegionID  = "forest"
	DefaultExpeditionMaxStages = 5
)

type ExpeditionRegion struct {
	ID                 string `json:"id"`
	BiomeKey           string `json:"biome_key"`
	Name               string `json:"name"`
	Tier               int    `json:"tier"`
	Order              int    `json:"order"`
	MinLevel           int    `json:"min_level"`
	MaxLevel           int    `json:"max_level"`
	Description        string `json:"description"`
	Icon               string `json:"icon"`
	MaxStages          int    `json:"max_stages"`
	RequiresUnlockFrom string `json:"requires_unlock_from,omitempty"`
	// RequiresTierComplete indica que, para acessar esta região, TODOS os chefes
	// do Tier anterior devem ter sido derrotados. Escalável: basta adicionar novas
	// regiões ao tier e o sistema detecta automaticamente, sem hardcode.
	RequiresTierComplete bool      `json:"requires_tier_complete,omitempty"`
	DropsPreview         []string  `json:"drops_preview"`
	Monsters             []Monster `json:"monsters"`
	Boss                 Monster   `json:"boss"`
	IsSecret             bool      `json:"is_secret"`
}

// RegionAvailability representa a decisão autoritativa de disponibilidade de uma expedição.
type RegionAvailability struct {
	Available          bool   `json:"available"`
	Reason             string `json:"reason,omitempty"`
	RequiredLevel      int    `json:"required_level"`
	RequiresUnlockFrom string `json:"requires_unlock_from,omitempty"`
	// Campos de progresso de tier (populados quando RequiresTierComplete bloqueia)
	DefeatedInTier int `json:"defeated_in_tier,omitempty"`
	TotalInTier    int `json:"total_in_tier,omitempty"`
	BlockedByTier  int `json:"blocked_by_tier,omitempty"`
}

// GetRegionsByTier retorna todas as regiões de um tier específico, ordenadas por Order.
// Totalmente data-driven: basta adicionar novas regiões em ExpeditionRegions e elas
// são automaticamente incluídas na validação de tier, sem nenhuma outra mudança.
func GetRegionsByTier(tier int) []ExpeditionRegion {
	var result []ExpeditionRegion
	for _, reg := range ExpeditionRegions {
		if reg.Tier == tier {
			result = append(result, reg)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Order < result[j].Order
	})
	return result
}

// CheckRegionAvailability valida a regra única e autoritativa de acesso a uma região.
// Suporta dois modos de bloqueio:
//  1. RequiresTierComplete=true: exige que TODOS os chefes do Tier anterior estejam
//     em defeatedBosses (região cuja boss foi derrotado → seu ID entra em UnlockedRegions).
//     Escalável para N tiers: basta marcar a região com RequiresTierComplete=true.
//  2. RequiresUnlockFrom=<id>: encadeamento 1-para-1 dentro do mesmo tier (caso legado/especial).
func CheckRegionAvailability(charLevel int, defeatedBosses []string, region ExpeditionRegion) RegionAvailability {
	// ── Caso 1: Região de Tier N (requer todos os chefes do Tier N-1 derrotados) ──────────
	if region.RequiresTierComplete && region.Tier > 1 {
		prevTierRegions := GetRegionsByTier(region.Tier - 1)
		defeatedSet := make(map[string]bool, len(defeatedBosses))
		for _, id := range defeatedBosses {
			defeatedSet[id] = true
		}
		defeatedCount := 0
		for _, prevReg := range prevTierRegions {
			if defeatedSet[prevReg.ID] {
				defeatedCount++
			}
		}
		totalPrev := len(prevTierRegions)
		if defeatedCount < totalPrev {
			msg := fmt.Sprintf(
				"Derrote todos os Chefes do Tier %d para avançar (%d/%d derrotados)",
				region.Tier-1, defeatedCount, totalPrev,
			)
			return RegionAvailability{
				Available:      false,
				Reason:         msg,
				RequiredLevel:  region.MinLevel,
				DefeatedInTier: defeatedCount,
				TotalInTier:    totalPrev,
				BlockedByTier:  region.Tier - 1,
			}
		}
		// Todos os chefes do tier anterior derrotados — verificar nível mínimo
		if charLevel < region.MinLevel {
			return RegionAvailability{
				Available:     false,
				Reason:        fmt.Sprintf("Requer Nível %d", region.MinLevel),
				RequiredLevel: region.MinLevel,
			}
		}
		return RegionAvailability{Available: true, RequiredLevel: region.MinLevel}
	}

	// ── Caso 2: Região sem pré-requisito de chefe (acessível por nível) ─────────────────
	if region.RequiresUnlockFrom == "" {
		if charLevel < region.MinLevel {
			return RegionAvailability{
				Available:     false,
				Reason:        fmt.Sprintf("Requer Nível %d", region.MinLevel),
				RequiredLevel: region.MinLevel,
			}
		}
		return RegionAvailability{Available: true, RequiredLevel: region.MinLevel}
	}

	// ── Caso 3: Encadeamento 1-para-1 legado (RequiresUnlockFrom não vazio) ──────────────
	// Mantido para suporte a regiões secretas ou pré-requisitos especiais dentro do tier.
	defeatedSet := make(map[string]bool, len(defeatedBosses))
	for _, id := range defeatedBosses {
		defeatedSet[id] = true
	}
	if !defeatedSet[region.ID] {
		preReqRegion, exists := ExpeditionRegions[region.RequiresUnlockFrom]
		preReqName := region.RequiresUnlockFrom
		if exists {
			preReqName = preReqRegion.Name
		}
		if charLevel < region.MinLevel {
			return RegionAvailability{
				Available:          false,
				Reason:             fmt.Sprintf("Derrote o Chefe de %s e alcance o Nível %d", preReqName, region.MinLevel),
				RequiredLevel:      region.MinLevel,
				RequiresUnlockFrom: region.RequiresUnlockFrom,
			}
		}
		return RegionAvailability{
			Available:          false,
			Reason:             fmt.Sprintf("Derrote o Chefe de %s para desbloquear esta região", preReqName),
			RequiredLevel:      region.MinLevel,
			RequiresUnlockFrom: region.RequiresUnlockFrom,
		}
	}
	if charLevel < region.MinLevel {
		return RegionAvailability{
			Available:     false,
			Reason:        fmt.Sprintf("Requer Nível %d", region.MinLevel),
			RequiredLevel: region.MinLevel,
		}
	}
	return RegionAvailability{Available: true, RequiredLevel: region.MinLevel}
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
		DropsPreview:       []string{"Espada do Aprendiz", "Arco Curvo", "Capacete de Couro", "Broquel de Madeira", "Amuleto do Lobo", "Manual: Armazém de Recursos"},
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
		DropsPreview:       []string{"Clava de Madeira", "Machadinha de Madeira", "Broquel de Madeira", "Túnica de Couro", "Sandálias Ágeis", "Tome: Golpe Giratório", "Manual: Cabana do Aventureiro"},
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
		DropsPreview:       []string{"Espada do Aprendiz", "Machadinha de Madeira", "Broquel de Madeira", "Anel de Cobre", "Manual: Tiro Quádruplo", "Manual: Fonte Arcana"},
		Monsters: []Monster{
			{Key: "chapolin_pirate", VisualKey: "chapolin_pirate", Name: "Pirata Alma Negra", Level: 3, Health: 95, MaxHealth: 95, Attack: 11, AttackType: AttackTypeMelee},
			{Key: "chapolin_tripa", VisualKey: "chapolin_tripa", Name: "Tripa Seca", Level: 4, Health: 105, MaxHealth: 105, Attack: 13, AttackType: AttackTypeMelee},
			{Key: "chapolin_bandit", VisualKey: "chapolin_bandit", Name: "Bandido dos Ermos", Level: 4, Health: 110, MaxHealth: 110, Attack: 14, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "chapolin_boss_alma", VisualKey: "chapolin_boss_alma", IsBoss: true, Name: "Alma Negra de Greiscu 🏴‍☠️", Level: 5, Health: 600, MaxHealth: 600, Attack: 32, AttackType: AttackTypeMelee},
	},

	// ─── TIER 2 (LV. 5–19) ──────────────────────────────────────────────────
	// RequiresTierComplete: true → liberado apenas quando TODOS os chefes do Tier 1
	// (Floresta, Shereque, Chapolin) forem derrotados. Data-driven: adicionar mais
	// regiões ao Tier 1 no futuro é suficiente; nenhuma mudança de código adicional.
	"orcruins": {
		ID:                   "orcruins",
		BiomeKey:             "orcruins",
		Name:                 "Castelo de Greiscu",
		Tier:                 2,
		Order:                4,
		MinLevel:             5,
		MaxLevel:             12,
		Description:          "Fortificação ancestral guardada pelo terrível Esquelético.",
		Icon:                 "🏰",
		MaxStages:            5,
		RequiresTierComplete: true,
		DropsPreview:         []string{"Machado Orc", "Sabre de Bronze", "Cota de Malha", "Escudo de Madeira", "Mochila de Aventureiro", "Livro: Cura Divina", "Manual: Bancada de Desmontagem"},
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
		ID:                   "esgotos",
		BiomeKey:             "esgotos",
		Name:                 "Esgotos Tartaruga",
		Tier:                 2,
		Order:                5,
		MinLevel:             5,
		MaxLevel:             12,
		Description:          "Subterrâneo escuro dominado pelo Clã do Pé e ratos mutantes.",
		Icon:                 "🥷",
		MaxStages:            5,
		RequiresTierComplete: true,
		DropsPreview:         []string{"Sabre de Bronze", "Maça de Batalha", "Calça de Couro", "Botas de Couro", "Colar de Prata", "Virotes Perfurantes", "Manual: Tiro Preciso"},
		Monsters: []Monster{
			{Key: "esgotos_ninja", VisualKey: "esgotos_ninja", Name: "Ninja do Clã do Pé", Level: 7, Health: 150, MaxHealth: 150, Attack: 17, AttackType: AttackTypeRanged},
			{Key: "esgotos_rat", VisualKey: "esgotos_rat", Name: "Rato Mutante", Level: 10, Health: 200, MaxHealth: 200, Attack: 23, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "esgotos_boss_destroyer", VisualKey: "esgotos_boss_destroyer", IsBoss: true, Name: "Destruidor Ranzinza 🥷", Level: 12, Health: 1200, MaxHealth: 1200, Attack: 55, AttackType: AttackTypeMelee},
	},
	"planalto": {
		ID:                   "planalto",
		BiomeKey:             "planalto",
		Name:                 "Planalto dos Três Poderes",
		Tier:                 2,
		Order:                6,
		MinLevel:             8,
		MaxLevel:             19,
		Description:          "Cenário político místico onde militantes e guardiões da lei disputam a Suprema Caneta.",
		Icon:                 "🏛️",
		MaxStages:            5,
		RequiresTierComplete: true,
		DropsPreview:         []string{"Martelo Constitucional", "Caneta Esferográfica Suprema", "Megafone do Povo", "Toga da Inviolabilidade", "Boina Tática da Puliça", "Pasta Executiva Presidencial", "Tome: Golpe Brutal", "Manual do Mestre de Obras"},
		Monsters: []Monster{
			{Key: "planalto_militante", VisualKey: "planalto_militante", Name: "Militante do Treze ⭐️", Level: 8, Health: 165, MaxHealth: 165, Attack: 18, AttackType: AttackTypeMelee},
			{Key: "planalto_patriota", VisualKey: "planalto_patriota", Name: "Patriota do Caminhão 🇧🇷", Level: 10, Health: 195, MaxHealth: 195, Attack: 22, AttackType: AttackTypeRanged},
			{Key: "planalto_pulica", VisualKey: "planalto_pulica", Name: "Puliça de Choque 👮", Level: 12, Health: 235, MaxHealth: 235, Attack: 26, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "planalto_boss_xandaum", VisualKey: "planalto_boss_xandaum", IsBoss: true, Name: "Xandaum, o Soberano da Toga ⚖️", Level: 16, Health: 1850, MaxHealth: 1850, Attack: 72, AttackType: AttackTypeRanged},
	},

	// ─── TIER 3 (LV. 12–20) ─────────────────────────────────────────────────
	// RequiresTierComplete: true → liberado quando TODOS os chefes do Tier 2 forem derrotados.
	"rogartes": {
		ID:                   "rogartes",
		BiomeKey:             "rogartes",
		Name:                 "Escola de Rogartes",
		Tier:                 3,
		Order:                7,
		MinLevel:             12,
		MaxLevel:             20,
		Description:          "Escola de magia infestada por dementadores e bruxos das sombras.",
		Icon:                 "🧙‍♂️",
		MaxStages:            5,
		RequiresTierComplete: true,
		DropsPreview:         []string{"Espada de Aço", "Cetro do Esquelético", "Elmo Rúnico", "Peitoral de Platina", "Bolsa Rúnica", "Livro: Bola de Fogo"},
		Monsters: []Monster{
			{Key: "rogartes_dementor", VisualKey: "rogartes_dementor", Name: "Dementador das Sombras", Level: 13, Health: 260, MaxHealth: 260, Attack: 29, AttackType: AttackTypeRanged},
			{Key: "rogartes_troll", VisualKey: "rogartes_troll", Name: "Trasgo das Cavernas", Level: 17, Health: 350, MaxHealth: 350, Attack: 36, AttackType: AttackTypeMelee},
		},
		Boss: Monster{Key: "rogartes_boss_darkmage", VisualKey: "rogartes_boss_darkmage", IsBoss: true, Name: "Voldemorte sem Nariz 🪄", Level: 20, Health: 2600, MaxHealth: 2600, Attack: 98, AttackType: AttackTypeRanged},
	},

	// ─── TIER 4 (LV. 20–35) ─────────────────────────────────────────────────
	// RequiresTierComplete: true → liberado quando TODOS os chefes do Tier 3 forem derrotados.
	"frozen": {
		ID:                   "frozen",
		BiomeKey:             "frozen",
		Name:                 "Santuário de Atenas",
		Tier:                 4,
		Order:                8,
		MinLevel:             20,
		MaxLevel:             35,
		Description:          "Picos congelados guardados pelos Cavaleiros de Ouro e espectros.",
		Icon:                 "🛡️",
		MaxStages:            5,
		RequiresTierComplete: true,
		DropsPreview:         []string{"Katana da Fúria", "Marreta Biônica", "Arco dos Ventos", "Orbe Protetor", "Robe Místico", "Mochila Dragônica", "Livro: Estilhaço de Gelo"},
		Monsters: []Monster{
			{Key: "frozen_specter", VisualKey: "frozen_specter", Name: "Lorde Espectro", Level: 22, Health: 380, MaxHealth: 380, Attack: 40, AttackType: AttackTypeRanged},
			{Key: "frozen_zombie", VisualKey: "frozen_zombie", Name: "Zumbi Congelado", Level: 25, Health: 440, MaxHealth: 440, Attack: 45, AttackType: AttackTypeMelee},
			{Key: "frozen_golem", VisualKey: "frozen_golem", Name: "Golem de Gelo", Level: 28, Health: 530, MaxHealth: 530, Attack: 52, AttackType: AttackTypeMelee},
			{Key: "frozen_chimera", VisualKey: "frozen_chimera", Name: "Quimera do Frost", Level: 33, Health: 680, MaxHealth: 680, Attack: 62, AttackType: AttackTypeRanged},
		},
		Boss: Monster{Key: "frozen_boss_master", VisualKey: "frozen_boss_master", IsBoss: true, Name: "Mestre do Santuário 🌟", Level: 35, Health: 4800, MaxHealth: 4800, Attack: 155, AttackType: AttackTypeRanged},
	},

	// ─── TIER 5 (LV. 35–99) ─────────────────────────────────────────────────
	// RequiresTierComplete: true → liberado quando TODOS os chefes do Tier 4 forem derrotados.
	"abyss": {
		ID:                   "abyss",
		BiomeKey:             "abyss",
		Name:                 "Caverna do Dragão Perdido",
		Tier:                 5,
		Order:                9,
		MinLevel:             35,
		MaxLevel:             99,
		Description:          "Abismo vulcânico lendário onde feras guardam relíquias míticas.",
		Icon:                 "🌋",
		MaxStages:            5,
		RequiresTierComplete: true,
		DropsPreview:         []string{"Espada Mítica do Vingador", "Lâmina de Greiscu", "Arco Apocalíptico", "Cajado da Eternidade", "Escudo do Zodíaco", "Mochila do Zodíaco"},
		IsSecret:             true,
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
	spd := mTemplate.AttackSpeedSeconds
	if spd <= 0 {
		spd = DefaultMonsterAttackSpeed
	}

	return Monster{
		Key:                mTemplate.Key,
		VisualKey:          mTemplate.VisualKey,
		IsBoss:             mTemplate.IsBoss,
		Name:               mTemplate.Name,
		Level:              mTemplate.Level,
		Health:             mTemplate.Health,
		MaxHealth:          mTemplate.MaxHealth,
		Attack:             mTemplate.Attack,
		AttackType:         mTemplate.AttackType,
		AttackSpeedSeconds: spd,
		AttackCooldownSec:  spd,
	}
}
