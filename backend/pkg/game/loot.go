package game

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

const (
	WeaponTypeSword  = "sword"
	WeaponTypeAxe    = "axe"
	WeaponTypeClub   = "club"
	WeaponTypeBow    = "bow"
	WeaponTypeWand   = "wand"
	WeaponTypeShield = "shield"
	WeaponTypeNone   = "none"
)

type Item struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Attack        int     `json:"attack"`
	PhysicalAttack int     `json:"physical_attack"`
	MagicAttack    int     `json:"magic_attack"`
	Defense       int     `json:"defense"`
	Hands          int     `json:"hands"` // 1 or 2
	ValueGold      int64   `json:"value_gold"`
	Rarity        string  `json:"rarity"`
	Weight        float64 `json:"weight"`
	RequiredLevel int     `json:"required_level"`
	BonusSTR      int     `json:"bonus_str,omitempty"`
	BonusDEX      int     `json:"bonus_dex,omitempty"`
	BonusINT      int     `json:"bonus_int,omitempty"`
	BonusHP       int     `json:"bonus_hp,omitempty"`
	BonusMP       int     `json:"bonus_mp,omitempty"`
	GoldBonus     float64 `json:"gold_bonus,omitempty"`
	CritChance    float64 `json:"crit_chance,omitempty"`
	Lifesteal     float64 `json:"lifesteal,omitempty"`
	ManaRegen     int     `json:"mana_regen,omitempty"`
	WeaponType    string  `json:"weapon_type,omitempty"`
	SpecialEffect string  `json:"special_effect"`
	SlotType      string  `json:"slot_type"`
	Tier          int     `json:"tier"`
}

type ItemSlot string

const (
	SlotHead      ItemSlot = "head"
	SlotChest     ItemSlot = "chest"
	SlotLegs      ItemSlot = "legs"
	SlotBoots     ItemSlot = "boots"
	SlotMainHand  ItemSlot = "mainhand"
	SlotOffHand   ItemSlot = "offhand"
	SlotNecklace  ItemSlot = "necklace"
	SlotRing      ItemSlot = "ring"
	SlotAmmo      ItemSlot = "ammo"
	SlotBag       ItemSlot = "bag"
	SlotSkillBook ItemSlot = "skill_book"
)

type LootTemplate struct {
	Name          string
	Slot          ItemSlot
	WeaponType    string
	RequiredLevel int
	BaseAtk       int
	BaseMagic     int
	BaseDef       int
	BaseWeight    float64
	Hands         int
	BaseSTR       int
	BaseDEX       int
	BaseINT       int
	BaseHP        int
	BaseMP        int
	GoldBonus     float64
	Lifesteal     float64
	ManaRegen     int
	CritChance    float64
}

var lootTemplates = []LootTemplate{
	// ==================== TIER 1 (NÍVEL 1+) ====================
	{Name: "Espada do Aprendiz", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 1, BaseAtk: 8, BaseMagic: 0, BaseDef: 0, BaseWeight: 15.0, Hands: 1},
	{Name: "Machadinha de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 1, BaseAtk: 9, BaseMagic: 0, BaseDef: 0, BaseWeight: 18.0, Hands: 1},
	{Name: "Clava de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 1, BaseAtk: 9, BaseMagic: 0, BaseDef: 1, BaseWeight: 20.0, Hands: 1},
	{Name: "Arco Curvo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 1, BaseAtk: 8, BaseMagic: 0, BaseDef: 0, BaseWeight: 12.0, Hands: 2},
	{Name: "Varinha do Aprendiz", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 1, BaseAtk: 0, BaseMagic: 10, BaseDef: 0, BaseWeight: 8.0, Hands: 1},
	{Name: "Capacete de Couro", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 3, BaseWeight: 12.0, Hands: 0},
	{Name: "Túnica de Couro", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 4, BaseWeight: 25.0, Hands: 0, BaseHP: 5},
	{Name: "Calça de Tecido", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 2, BaseWeight: 10.0, Hands: 0},
	{Name: "Sandálias Ágeis", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 5.0, Hands: 0, BaseDEX: 1},
	{Name: "Broquel de Madeira", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 5, BaseWeight: 20.0, Hands: 1},
	{Name: "Pequena Bolsa", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 5.0, Hands: 0},
	{Name: "Flechas de Madeira", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 1, BaseAtk: 4, BaseMagic: 0, BaseDef: 0, BaseWeight: 1.5, Hands: 0},
	{Name: "Amuleto do Lobo", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 1, BaseAtk: 1, BaseMagic: 0, BaseDef: 1, BaseWeight: 1.5, Hands: 0, BaseSTR: 1},
	{Name: "Anel de Cobre", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 0.8, Hands: 0, BaseHP: 10},

	// ==================== TIER 2 (NÍVEL 8+) ====================
	{Name: "Sabre de Bronze", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 8, BaseAtk: 16, BaseMagic: 0, BaseDef: 1, BaseWeight: 22.0, Hands: 1, BaseSTR: 1},
	{Name: "Machado Orc", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 8, BaseAtk: 18, BaseMagic: 0, BaseDef: 0, BaseWeight: 45.0, Hands: 1, BaseSTR: 1},
	{Name: "Maça de Batalha", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 8, BaseAtk: 17, BaseMagic: 0, BaseDef: 2, BaseWeight: 38.0, Hands: 1, BaseSTR: 1},
	{Name: "Arco Longo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 8, BaseAtk: 16, BaseMagic: 0, BaseDef: 1, BaseWeight: 22.0, Hands: 2, CritChance: 2.0},
	{Name: "Cajado Rúnico", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 8, BaseAtk: 0, BaseMagic: 20, BaseDef: 0, BaseWeight: 18.5, Hands: 2, BaseMP: 15, BaseINT: 1},
	{Name: "Coifa de Prata", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 8, BaseAtk: 0, BaseMagic: 0, BaseDef: 7, BaseWeight: 25.0, Hands: 0, BaseHP: 10},
	{Name: "Cota de Malha", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 8, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 75.0, Hands: 0, BaseHP: 15},
	{Name: "Calça de Couro", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 8, BaseAtk: 0, BaseMagic: 0, BaseDef: 5, BaseWeight: 18.0, Hands: 0, BaseSTR: 1},
	{Name: "Botas de Couro", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 8, BaseAtk: 0, BaseMagic: 0, BaseDef: 3, BaseWeight: 9.0, Hands: 0, BaseDEX: 1},
	{Name: "Escudo de Madeira", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 8, BaseAtk: 0, BaseMagic: 0, BaseDef: 9, BaseWeight: 40.0, Hands: 1, BaseHP: 10},
	{Name: "Mochila de Aventureiro", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 8, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 15.0, Hands: 0, BaseHP: 15, GoldBonus: 5.0},
	{Name: "Flechas de Aço", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 8, BaseAtk: 9, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Name: "Colar de Prata", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 8, BaseAtk: 2, BaseMagic: 0, BaseDef: 2, BaseWeight: 1.5, Hands: 0, BaseMP: 15},
	{Name: "Anel de Prata", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 8, BaseAtk: 0, BaseMagic: 2, BaseDef: 2, BaseWeight: 0.8, Hands: 0, BaseINT: 2},

	// ==================== TIER 3 (NÍVEL 20+) ====================
	{Name: "Espada de Aço", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 20, BaseAtk: 30, BaseMagic: 0, BaseDef: 2, BaseWeight: 35.5, Hands: 1, BaseSTR: 3},
	{Name: "Machado de Guerra", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 20, BaseAtk: 33, BaseMagic: 0, BaseDef: 0, BaseWeight: 55.0, Hands: 1, BaseSTR: 3},
	{Name: "Martelo de Guerra", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 20, BaseAtk: 32, BaseMagic: 0, BaseDef: 3, BaseWeight: 58.0, Hands: 1, BaseSTR: 3},
	{Name: "Arco do Caçador", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 20, BaseAtk: 30, BaseMagic: 0, BaseDef: 2, BaseWeight: 26.0, Hands: 2, BaseDEX: 3, CritChance: 4.0},
	{Name: "Cetro do Esquelético", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 20, BaseAtk: 0, BaseMagic: 36, BaseDef: 2, BaseWeight: 24.0, Hands: 2, BaseMP: 30, BaseINT: 3, ManaRegen: 1},
	{Name: "Elmo Rúnico", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 20, BaseAtk: 2, BaseMagic: 0, BaseDef: 13, BaseWeight: 32.0, Hands: 0, BaseHP: 20, BaseSTR: 2},
	{Name: "Peitoral de Platina", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 20, BaseAtk: 0, BaseMagic: 0, BaseDef: 18, BaseWeight: 110.0, Hands: 0, BaseHP: 30},
	{Name: "Grevas de Aço", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 20, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 45.0, Hands: 0, BaseSTR: 2},
	{Name: "Botas de Ferro", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 20, BaseAtk: 0, BaseMagic: 0, BaseDef: 6, BaseWeight: 22.0, Hands: 0, BaseSTR: 2, BaseHP: 10},
	{Name: "Escudo de Batalha", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 20, BaseAtk: 0, BaseMagic: 0, BaseDef: 16, BaseWeight: 75.0, Hands: 1, BaseHP: 20},
	{Name: "Bolsa Rúnica", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 20, BaseAtk: 0, BaseMagic: 2, BaseDef: 2, BaseWeight: 8.0, Hands: 0, BaseMP: 30, BaseINT: 3, GoldBonus: 10.0},
	{Name: "Virotes Perfurantes", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 20, BaseAtk: 14, BaseMagic: 0, BaseDef: 0, BaseWeight: 3.5, Hands: 0},
	{Name: "Colar de Rubi", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 20, BaseAtk: 4, BaseMagic: 0, BaseDef: 2, BaseWeight: 1.2, Hands: 0, BaseSTR: 2, BaseHP: 20},
	{Name: "Anel de Ouro", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 20, BaseAtk: 0, BaseMagic: 4, BaseDef: 3, BaseWeight: 0.8, Hands: 0, BaseINT: 3, BaseMP: 25},

	// ==================== TIER 4 (NÍVEL 35+) ====================
	{Name: "Katana da Fúria", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 35, BaseAtk: 52, BaseMagic: 0, BaseDef: 3, BaseWeight: 28.0, Hands: 1, BaseSTR: 5, CritChance: 3.0},
	{Name: "Machado do Urso Ranzinza", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 35, BaseAtk: 56, BaseMagic: 0, BaseDef: 2, BaseWeight: 60.0, Hands: 1, BaseSTR: 6},
	{Name: "Marreta Biônica", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 35, BaseAtk: 55, BaseMagic: 0, BaseDef: 4, BaseWeight: 45.0, Hands: 1, BaseSTR: 5, Lifesteal: 2.0},
	{Name: "Arco dos Ventos", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 35, BaseAtk: 50, BaseMagic: 0, BaseDef: 4, BaseWeight: 20.0, Hands: 2, BaseDEX: 6, CritChance: 5.0},
	{Name: "Varinha das Relíquias", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 35, BaseAtk: 0, BaseMagic: 58, BaseDef: 5, BaseWeight: 16.0, Hands: 1, BaseMP: 50, BaseINT: 6, ManaRegen: 2},
	{Name: "Coroa de Ouro", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 35, BaseAtk: 5, BaseMagic: 0, BaseDef: 20, BaseWeight: 18.0, Hands: 0, BaseHP: 40, BaseINT: 3},
	{Name: "Robe Místico", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 35, BaseAtk: 6, BaseMagic: 0, BaseDef: 22, BaseWeight: 30.0, Hands: 0, BaseMP: 50, BaseINT: 5},
	{Name: "Saiote dos Magos", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 35, BaseAtk: 3, BaseMagic: 0, BaseDef: 14, BaseWeight: 14.0, Hands: 0, BaseMP: 30, BaseINT: 4},
	{Name: "Botas de Ferro", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 35, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 22.0, Hands: 0, BaseDEX: 5, BaseHP: 20},
	{Name: "Orbe Protetor", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 35, BaseAtk: 4, BaseMagic: 8, BaseDef: 22, BaseWeight: 10.0, Hands: 1, BaseMP: 30, BaseINT: 3},
	{Name: "Mochila Dragônica", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 35, BaseAtk: 2, BaseMagic: 0, BaseDef: 3, BaseWeight: 15.0, Hands: 0, BaseHP: 50, BaseSTR: 4, GoldBonus: 15.0},
	{Name: "Flechas Incendiárias", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 35, BaseAtk: 22, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Name: "Amuleto Dragônico", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 35, BaseAtk: 6, BaseMagic: 4, BaseDef: 4, BaseWeight: 2.0, Hands: 0, BaseSTR: 4, BaseDEX: 4, BaseHP: 40},

	// ==================== TIER 5 (NÍVEL 50+) ====================
	{Name: "Lâmina de Greiscu", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 50, BaseAtk: 80, BaseMagic: 0, BaseDef: 5, BaseWeight: 42.0, Hands: 1, BaseSTR: 10, Lifesteal: 5.0},
	{Name: "Espada Mítica do Vingador", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 50, BaseAtk: 95, BaseMagic: 0, BaseDef: 10, BaseWeight: 50.0, Hands: 2, BaseSTR: 12, CritChance: 6.0},
	{Name: "Machado de Guerra Mítico", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 50, BaseAtk: 88, BaseMagic: 0, BaseDef: 0, BaseWeight: 65.0, Hands: 1, BaseSTR: 10},
	{Name: "Maça Celestial", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 50, BaseAtk: 85, BaseMagic: 0, BaseDef: 6, BaseWeight: 50.0, Hands: 1, BaseSTR: 8, BaseHP: 60},
	{Name: "Arco Apocalíptico", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 50, BaseAtk: 82, BaseMagic: 0, BaseDef: 5, BaseWeight: 24.0, Hands: 2, BaseDEX: 10, CritChance: 8.0},
	{Name: "Cajado da Eternidade", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 50, BaseAtk: 0, BaseMagic: 92, BaseDef: 8, BaseWeight: 20.0, Hands: 2, BaseMP: 100, BaseINT: 10, ManaRegen: 3},
	{Name: "Elmo do Zodíaco", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 50, BaseAtk: 4, BaseMagic: 0, BaseDef: 28, BaseWeight: 28.0, Hands: 0, BaseHP: 60, BaseSTR: 5},
	{Name: "Armadura de Ouro", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 50, BaseAtk: 8, BaseMagic: 0, BaseDef: 35, BaseWeight: 130.0, Hands: 0, BaseHP: 80, BaseSTR: 6},
	{Name: "Grevas Celestiais", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 50, BaseAtk: 4, BaseMagic: 0, BaseDef: 24, BaseWeight: 35.0, Hands: 0, BaseHP: 50, BaseSTR: 5},
	{Name: "Botas Celestiais", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 50, BaseAtk: 0, BaseMagic: 0, BaseDef: 15, BaseWeight: 18.0, Hands: 0, BaseDEX: 8, BaseHP: 40},
	{Name: "Escudo do Zodíaco", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 50, BaseAtk: 5, BaseMagic: 0, BaseDef: 34, BaseWeight: 80.0, Hands: 1, BaseHP: 80},
	{Name: "Mochila do Zodíaco", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 50, BaseAtk: 5, BaseMagic: 5, BaseDef: 5, BaseWeight: 10.0, Hands: 0, BaseHP: 80, BaseMP: 60, BaseSTR: 5, BaseDEX: 5, BaseINT: 5, GoldBonus: 25.0},
	{Name: "Flechas Divinas", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 50, BaseAtk: 38, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Name: "Amuleto do Zodíaco", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 50, BaseAtk: 12, BaseMagic: 8, BaseDef: 8, BaseWeight: 2.5, Hands: 0, BaseSTR: 8, BaseDEX: 8, BaseINT: 8, BaseHP: 80},

	// Skill Books
	{Name: "Tome: Golpe Giratório", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, RequiredLevel: 10, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 25.0, Hands: 0},
	{Name: "Manual: Tiro Quádruplo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, RequiredLevel: 10, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 18.0, Hands: 0},
	{Name: "Livro: Bola de Fogo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, RequiredLevel: 10, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 22.0, Hands: 0},
	{Name: "Livro: Cura Divina", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, RequiredLevel: 15, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 20.0, Hands: 0},
}

// GenerateLootForMonster seleciona um loot específico a partir da tabela do monstro e região
func GenerateLootForMonster(monsterName string, mobLevel int) *Item {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	nLower := strings.ToLower(monsterName)

	var validNames []string
	maxRarity := "Comum"

	// Tabela Determinística por Monstro
	if strings.Contains(nLower, "goblin") {
		validNames = []string{"Espada do Aprendiz", "Capacete de Couro", "Pequena Bolsa", "Flechas de Madeira"}
		maxRarity = "Incomum"
	} else if strings.Contains(nLower, "lobo") {
		validNames = []string{"Amuleto do Lobo", "Botas de Couro", "Calça de Couro"}
		maxRarity = "Incomum"
	} else if strings.Contains(nLower, "aranha") {
		validNames = []string{"Arco Curvo", "Flechas de Madeira", "Varinha do Aprendiz", "Pequena Bolsa"}
		maxRarity = "Incomum"
	} else if strings.Contains(nLower, "ogre") || strings.Contains(nLower, "fiona") {
		validNames = []string{"Clava de Madeira", "Broquel de Madeira", "Túnica de Couro", "Maça de Batalha", "Tome: Golpe Giratório"}
		maxRarity = "Raro"
	} else if strings.Contains(nLower, "pirata") || strings.Contains(nLower, "alma negra") {
		validNames = []string{"Sabre de Bronze", "Coifa de Prata", "Manual: Tiro Quádruplo"}
		maxRarity = "Raro"
	} else if strings.Contains(nLower, "orc") {
		validNames = []string{"Machado Orc", "Espada de Aço", "Cota de Malha", "Escudo de Madeira", "Arco Longo"}
		maxRarity = "Raro"
	} else if strings.Contains(nLower, "esqueleto") || strings.Contains(nLower, "esquelético") {
		validNames = []string{"Elmo Rúnico", "Orbe Protetor", "Cetro do Esquelético", "Livro: Cura Divina"}
		maxRarity = "Raro"
	} else if strings.Contains(nLower, "dementador") || strings.Contains(nLower, "voldemorte") || strings.Contains(nLower, "rogartes") {
		validNames = []string{"Robe Místico", "Cajado Rúnico", "Varinha das Relíquias", "Livro: Bola de Fogo"}
		maxRarity = "Lendário"
	} else if strings.Contains(nLower, "atenas") || strings.Contains(nLower, "santuário") || strings.Contains(nLower, "espectro") {
		validNames = []string{"Escudo do Zodíaco", "Armadura de Ouro", "Arco dos Ventos", "Botas Celestiais"}
		maxRarity = "Lendário"
	} else if strings.Contains(nLower, "dragão") || strings.Contains(nLower, "vingador") || strings.Contains(nLower, "demônio") {
		validNames = []string{"Espada Mítica do Vingador", "Lâmina de Greiscu", "Arco Apocalíptico", "Flechas Incendiárias", "Mochila Dragônica"}
		maxRarity = "Lendário"
	} else {
		// Fallback genérico
		validNames = []string{"Espada do Aprendiz", "Escudo de Madeira", "Capacete de Couro", "Mochila de Aventureiro"}
		maxRarity = "Incomum"
	}

	// Sorteia o nome do item dentro da tabela válida do monstro
	chosenName := validNames[r.Intn(len(validNames))]

	// Localizar template correspondente
	var chosenTemplate *LootTemplate
	for i := range lootTemplates {
		if lootTemplates[i].Name == chosenName {
			chosenTemplate = &lootTemplates[i]
			break
		}
	}
	if chosenTemplate == nil {
		chosenTemplate = &lootTemplates[r.Intn(len(lootTemplates))]
	}

	// Se for Skill Book
	if chosenTemplate.Slot == SlotSkillBook {
		skillKey := "fireball"
		if strings.Contains(chosenTemplate.Name, "Giratório") {
			skillKey = "whirlwind"
		} else if strings.Contains(chosenTemplate.Name, "Quádr") {
			skillKey = "multishot"
		} else if strings.Contains(chosenTemplate.Name, "Cura") {
			skillKey = "divine_heal"
		}
		return &Item{
			ID:            fmt.Sprintf("skillbook_%d_%d", time.Now().UnixNano(), r.Intn(1000)),
			Name:          chosenTemplate.Name,
			Attack:        0,
			PhysicalAttack: 0,
			MagicAttack:    0,
			Defense:       0,
			Rarity:        "Raro",
			Weight:        chosenTemplate.BaseWeight,
			RequiredLevel: chosenTemplate.RequiredLevel,
			SpecialEffect: fmt.Sprintf("Slot: skill_book | Skill: %s", skillKey),
			SlotType:      string(SlotSkillBook),
			Tier:          1,
			Hands:         0,
			ValueGold:     50,
		}
	}

	// Determinar Raridade (respeitando maxRarity do monstro)
	rarityRoll := r.Float64()
	rarity := "Comum"
	multiplier := 1.0

	if maxRarity == "Lendário" && rarityRoll > 0.995 {
		rarity = "Lendário"
		multiplier = 1.6
	} else if (maxRarity == "Lendário" || maxRarity == "Raro") && rarityRoll > 0.95 {
		rarity = "Épico"
		multiplier = 1.4
	} else if (maxRarity == "Raro" || maxRarity == "Lendário") && rarityRoll > 0.80 {
		rarity = "Raro"
		multiplier = 1.25
	} else if rarityRoll > 0.50 {
		rarity = "Incomum"
		multiplier = 1.12
	}

	pAtk := int(float64(chosenTemplate.BaseAtk) * multiplier)
	mAtk := int(float64(chosenTemplate.BaseMagic) * multiplier)
	def := int(float64(chosenTemplate.BaseDef) * multiplier)
	bStr := int(float64(chosenTemplate.BaseSTR) * multiplier)
	bDex := int(float64(chosenTemplate.BaseDEX) * multiplier)
	bInt := int(float64(chosenTemplate.BaseINT) * multiplier)
	bHP := int(float64(chosenTemplate.BaseHP) * multiplier)
	bMP := int(float64(chosenTemplate.BaseMP) * multiplier)
	goldB := chosenTemplate.GoldBonus
	lifeS := chosenTemplate.Lifesteal
	manaR := chosenTemplate.ManaRegen
	critC := chosenTemplate.CritChance

	if rarity == "Raro" || rarity == "Épico" || rarity == "Lendário" {
		if chosenTemplate.Slot == SlotMainHand && lifeS == 0 && r.Float64() < 0.4 {
			lifeS = float64(r.Intn(3) + 1)
		}
		if chosenTemplate.Slot == SlotBag && goldB == 0 {
			goldB = float64(r.Intn(10) + 5)
		}
	}

	valGold := int64(float64(chosenTemplate.BaseAtk + chosenTemplate.BaseMagic + chosenTemplate.BaseDef + (chosenTemplate.BaseHP/2)) * float64(mobLevel*10) * multiplier)
	if valGold == 0 {
		valGold = 5
	}

	return &Item{
		ID:            fmt.Sprintf("item_%d_%d", time.Now().UnixNano(), r.Intn(1000)),
		Name:          chosenTemplate.Name,
		Attack:        pAtk + mAtk,
		PhysicalAttack: pAtk,
		MagicAttack:    mAtk,
		Defense:       def,
		Hands:         chosenTemplate.Hands,
		ValueGold:     valGold,
		Rarity:        rarity,
		Weight:        chosenTemplate.BaseWeight,
		RequiredLevel: chosenTemplate.RequiredLevel,
		BonusSTR:      bStr,
		BonusDEX:      bDex,
		BonusINT:      bInt,
		BonusHP:       bHP,
		BonusMP:       bMP,
		GoldBonus:     goldB,
		Lifesteal:     lifeS,
		ManaRegen:     manaR,
		CritChance:    critC,
		WeaponType:    chosenTemplate.WeaponType,
		SpecialEffect: "",
		SlotType:      string(chosenTemplate.Slot),
		Tier:          mobLevel,
	}
}
func GenerateProceduralLoot() Item {
	lootPtr := GenerateLootForMonster("Goblin Salteador", 1)
	return *lootPtr
}

func GetItemWeaponType(item *Item) string {
	if item == nil {
		return WeaponTypeNone
	}
	if item.WeaponType != "" {
		return item.WeaponType
	}
	nameLower := strings.ToLower(item.Name + " " + item.SpecialEffect)

	if strings.Contains(nameLower, "arco") || strings.Contains(nameLower, "besta") || strings.Contains(nameLower, "bow") {
		return WeaponTypeBow
	}
	if strings.Contains(nameLower, "cajado") || strings.Contains(nameLower, "varinha") || strings.Contains(nameLower, "wand") || strings.Contains(nameLower, "staff") {
		return WeaponTypeWand
	}
	if strings.Contains(nameLower, "machado") || strings.Contains(nameLower, "axe") {
		return WeaponTypeAxe
	}
	if strings.Contains(nameLower, "clava") || strings.Contains(nameLower, "maça") || strings.Contains(nameLower, "martelo") || strings.Contains(nameLower, "club") {
		return WeaponTypeClub
	}
	if strings.Contains(nameLower, "escudo") || strings.Contains(nameLower, "shield") || strings.Contains(nameLower, "pavise") {
		return WeaponTypeShield
	}
	return WeaponTypeSword
}
