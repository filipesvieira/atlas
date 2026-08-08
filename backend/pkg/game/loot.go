package game

import (
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"
)

const CurrentItemBalanceVersion = 2

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
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Attack         int     `json:"attack"`
	PhysicalAttack int     `json:"physical_attack"`
	MagicAttack    int     `json:"magic_attack"`
	Defense        int     `json:"defense"`
	Hands          int     `json:"hands"` // 1 or 2
	ValueGold      int64   `json:"value_gold"`
	Rarity         string  `json:"rarity"`
	Weight         float64 `json:"weight"`
	RequiredLevel  int     `json:"required_level"`
	BonusSTR       int     `json:"bonus_str,omitempty"`
	BonusDEX       int     `json:"bonus_dex,omitempty"`
	BonusINT       int     `json:"bonus_int,omitempty"`
	BonusHP        int     `json:"bonus_hp,omitempty"`
	BonusMP        int     `json:"bonus_mp,omitempty"`
	GoldBonus      float64 `json:"gold_bonus,omitempty"`
	CritChance     float64 `json:"crit_chance,omitempty"`
	Lifesteal      float64 `json:"lifesteal,omitempty"`
	ManaRegen      int     `json:"mana_regen,omitempty"`
	WeaponType     string  `json:"weapon_type,omitempty"`
	SkillKey       string  `json:"skill_key,omitempty"`
	SpecialEffect  string  `json:"special_effect"`
	SlotType       string  `json:"slot_type"`
	Tier           int     `json:"tier"`
	ItemPower      int     `json:"item_power"`
	BalanceVersion int     `json:"balance_version"`
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
	SkillKey      string
	RequiredLevel int
	Tier          int
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
	{Name: "Espada do Aprendiz", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 1, Tier: 1, BaseAtk: 8, BaseMagic: 0, BaseDef: 0, BaseWeight: 15.0, Hands: 1},
	{Name: "Machadinha de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 1, Tier: 1, BaseAtk: 9, BaseMagic: 0, BaseDef: 0, BaseWeight: 18.0, Hands: 1},
	{Name: "Clava de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 1, Tier: 1, BaseAtk: 9, BaseMagic: 0, BaseDef: 1, BaseWeight: 20.0, Hands: 1},
	{Name: "Arco Curvo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 1, Tier: 1, BaseAtk: 8, BaseMagic: 0, BaseDef: 0, BaseWeight: 12.0, Hands: 2},
	{Name: "Varinha do Aprendiz", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 10, BaseDef: 0, BaseWeight: 8.0, Hands: 1},
	{Name: "Capacete de Couro", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 3, BaseWeight: 12.0, Hands: 0},
	{Name: "Túnica de Couro", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 4, BaseWeight: 25.0, Hands: 0, BaseHP: 5},
	{Name: "Calça de Tecido", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 2, BaseWeight: 10.0, Hands: 0},
	{Name: "Sandálias Ágeis", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 5.0, Hands: 0, BaseDEX: 1},
	{Name: "Broquel de Madeira", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 6, BaseWeight: 14.0, Hands: 1, BaseHP: 5},
	{Name: "Pequena Bolsa", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 5.0, Hands: 0},
	{Name: "Flechas de Madeira", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 4, BaseMagic: 0, BaseDef: 0, BaseWeight: 1.5, Hands: 0},
	{Name: "Amuleto do Lobo", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 1, BaseMagic: 0, BaseDef: 1, BaseWeight: 1.5, Hands: 0, BaseSTR: 1},
	{Name: "Anel de Cobre", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 0.8, Hands: 0, BaseHP: 10},

	// ==================== TIER 2 (NÍVEL 5+) ====================
	{Name: "Sabre de Bronze", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 8, Tier: 2, BaseAtk: 16, BaseMagic: 0, BaseDef: 1, BaseWeight: 22.0, Hands: 1, BaseSTR: 1},
	{Name: "Machado Orc", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 8, Tier: 2, BaseAtk: 18, BaseMagic: 0, BaseDef: 0, BaseWeight: 45.0, Hands: 1, BaseSTR: 1},
	{Name: "Maça de Batalha", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 8, Tier: 2, BaseAtk: 17, BaseMagic: 0, BaseDef: 2, BaseWeight: 38.0, Hands: 1, BaseSTR: 1},
	{Name: "Arco Longo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 8, Tier: 2, BaseAtk: 16, BaseMagic: 0, BaseDef: 1, BaseWeight: 22.0, Hands: 2, CritChance: 2.0},
	{Name: "Cajado Rúnico", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 20, BaseDef: 0, BaseWeight: 18.5, Hands: 2, BaseMP: 15, BaseINT: 1},
	{Name: "Coifa de Prata", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 7, BaseWeight: 25.0, Hands: 0, BaseHP: 10},
	{Name: "Cota de Malha", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 75.0, Hands: 0, BaseHP: 15},
	{Name: "Calça de Couro", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 5, BaseWeight: 18.0, Hands: 0, BaseSTR: 1},
	{Name: "Botas de Couro", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 3, BaseWeight: 9.0, Hands: 0, BaseDEX: 1},
	{Name: "Escudo de Madeira", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 9, BaseWeight: 30.0, Hands: 1, BaseHP: 10},
	{Name: "Mochila de Aventureiro", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 15.0, Hands: 0, BaseHP: 15, GoldBonus: 5.0},
	{Name: "Flechas de Aço", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 9, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Name: "Colar de Prata", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 2, BaseMagic: 0, BaseDef: 2, BaseWeight: 1.5, Hands: 0, BaseMP: 15},
	{Name: "Anel de Prata", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 2, BaseDef: 2, BaseWeight: 0.8, Hands: 0, BaseINT: 2},

	// ==================== TIER 2: PLANALTO CENTRAL ====================
	{Name: "Martelo Constitucional", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 8, Tier: 2, BaseAtk: 18, BaseMagic: 0, BaseDef: 2, BaseWeight: 42.0, Hands: 1, BaseSTR: 2, BaseHP: 15},
	{Name: "Caneta Esferográfica Suprema", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 22, BaseDef: 1, BaseWeight: 8.0, Hands: 1, BaseINT: 2, BaseMP: 20, ManaRegen: 1},
	{Name: "Megafone do Povo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 8, Tier: 2, BaseAtk: 17, BaseMagic: 0, BaseDef: 1, BaseWeight: 16.0, Hands: 2, BaseDEX: 2, CritChance: 3.0},
	{Name: "Boina Tática da Puliça", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 1, BaseMagic: 0, BaseDef: 8, BaseWeight: 15.0, Hands: 0, BaseHP: 12, BaseDEX: 1},
	{Name: "Toga da Inviolabilidade", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 2, BaseDef: 12, BaseWeight: 35.0, Hands: 0, BaseHP: 20, BaseMP: 15, BaseINT: 1},
	{Name: "Calça Social Engomada", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 6, BaseWeight: 12.0, Hands: 0, BaseSTR: 1, BaseINT: 1},
	{Name: "Coturno da Lei", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 4, BaseWeight: 14.0, Hands: 0, BaseHP: 10, BaseDEX: 1},
	{Name: "Cordão da Estrela Rubra", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 2, BaseMagic: 0, BaseDef: 2, BaseWeight: 1.2, Hands: 0, BaseHP: 15, BaseSTR: 1, Lifesteal: 1.5},
	{Name: "Anel do Supremo Relator", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 3, BaseDef: 2, BaseWeight: 0.6, Hands: 0, BaseMP: 20, BaseINT: 2, GoldBonus: 5.0},
	{Name: "Pasta Executiva Presidencial", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 2, BaseWeight: 8.0, Hands: 0, BaseHP: 25, GoldBonus: 10.0},
	{Name: "Virotes da Notificação", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 10, BaseMagic: 0, BaseDef: 0, BaseWeight: 1.8, Hands: 0},

	// ==================== TIER 3 (NÍVEL 12+) ====================
	{Name: "Espada de Aço", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 15, Tier: 3, BaseAtk: 30, BaseMagic: 0, BaseDef: 2, BaseWeight: 35.5, Hands: 1, BaseSTR: 3},
	{Name: "Machado de Guerra", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 15, Tier: 3, BaseAtk: 33, BaseMagic: 0, BaseDef: 0, BaseWeight: 55.0, Hands: 1, BaseSTR: 3},
	{Name: "Martelo de Guerra", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 15, Tier: 3, BaseAtk: 32, BaseMagic: 0, BaseDef: 3, BaseWeight: 58.0, Hands: 1, BaseSTR: 3},
	{Name: "Arco do Caçador", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 15, Tier: 3, BaseAtk: 30, BaseMagic: 0, BaseDef: 2, BaseWeight: 26.0, Hands: 2, BaseDEX: 3, CritChance: 4.0},
	{Name: "Cetro do Esquelético", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 36, BaseDef: 2, BaseWeight: 24.0, Hands: 2, BaseMP: 30, BaseINT: 3, ManaRegen: 1},
	{Name: "Elmo Rúnico", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 2, BaseMagic: 0, BaseDef: 13, BaseWeight: 32.0, Hands: 0, BaseHP: 20, BaseSTR: 2},
	{Name: "Peitoral de Platina", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 18, BaseWeight: 110.0, Hands: 0, BaseHP: 30},
	{Name: "Grevas de Aço", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 45.0, Hands: 0, BaseSTR: 2},
	{Name: "Botas de Ferro", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 6, BaseWeight: 22.0, Hands: 0, BaseSTR: 2, BaseHP: 10},
	{Name: "Escudo de Batalha", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 16, BaseWeight: 55.0, Hands: 1, BaseHP: 25},
	{Name: "Bolsa Rúnica", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 2, BaseDef: 2, BaseWeight: 8.0, Hands: 0, BaseMP: 30, BaseINT: 3, GoldBonus: 10.0},
	{Name: "Virotes Perfurantes", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 14, BaseMagic: 0, BaseDef: 0, BaseWeight: 3.5, Hands: 0},
	{Name: "Colar de Rubi", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 4, BaseMagic: 0, BaseDef: 2, BaseWeight: 1.2, Hands: 0, BaseSTR: 2, BaseHP: 20},
	{Name: "Anel de Ouro", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 4, BaseDef: 3, BaseWeight: 0.8, Hands: 0, BaseINT: 3, BaseMP: 25},

	// ==================== TIER 4 (NÍVEL 20+) ====================
	{Name: "Katana da Fúria", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 25, Tier: 4, BaseAtk: 52, BaseMagic: 0, BaseDef: 3, BaseWeight: 28.0, Hands: 1, BaseSTR: 5, CritChance: 3.0},
	{Name: "Machado do Urso Ranzinza", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 25, Tier: 4, BaseAtk: 56, BaseMagic: 0, BaseDef: 2, BaseWeight: 60.0, Hands: 1, BaseSTR: 6},
	{Name: "Marreta Biônica", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 25, Tier: 4, BaseAtk: 55, BaseMagic: 0, BaseDef: 4, BaseWeight: 45.0, Hands: 1, BaseSTR: 5, Lifesteal: 2.0},
	{Name: "Arco dos Ventos", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 25, Tier: 4, BaseAtk: 50, BaseMagic: 0, BaseDef: 4, BaseWeight: 20.0, Hands: 2, BaseDEX: 6, CritChance: 5.0},
	{Name: "Varinha das Relíquias", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 25, Tier: 4, BaseAtk: 0, BaseMagic: 58, BaseDef: 5, BaseWeight: 16.0, Hands: 1, BaseMP: 50, BaseINT: 6, ManaRegen: 2},
	{Name: "Coroa de Ouro", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 5, BaseMagic: 0, BaseDef: 20, BaseWeight: 18.0, Hands: 0, BaseHP: 40, BaseINT: 3},
	{Name: "Robe Místico", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 6, BaseMagic: 0, BaseDef: 22, BaseWeight: 30.0, Hands: 0, BaseMP: 50, BaseINT: 5},
	{Name: "Saiote dos Magos", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 3, BaseMagic: 0, BaseDef: 14, BaseWeight: 14.0, Hands: 0, BaseMP: 30, BaseINT: 4},
	{Name: "Botas de Aço Rúnico", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 22.0, Hands: 0, BaseDEX: 5, BaseHP: 20},
	{Name: "Orbe Protetor", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 25, Tier: 4, BaseAtk: 4, BaseMagic: 8, BaseDef: 22, BaseWeight: 10.0, Hands: 1, BaseMP: 30, BaseINT: 3},
	{Name: "Mochila Dragônica", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 2, BaseMagic: 0, BaseDef: 3, BaseWeight: 15.0, Hands: 0, BaseHP: 50, BaseSTR: 4, GoldBonus: 15.0},
	{Name: "Flechas Incendiárias", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 22, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Name: "Amuleto Dragônico", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 6, BaseMagic: 4, BaseDef: 4, BaseWeight: 2.0, Hands: 0, BaseSTR: 4, BaseDEX: 4, BaseHP: 40},

	// ==================== TIER 5 (NÍVEL 35+) ====================
	{Name: "Lâmina de Greiscu", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 40, Tier: 5, BaseAtk: 80, BaseMagic: 0, BaseDef: 5, BaseWeight: 42.0, Hands: 1, BaseSTR: 10, Lifesteal: 5.0},
	{Name: "Espada Mítica do Vingador", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 40, Tier: 5, BaseAtk: 95, BaseMagic: 0, BaseDef: 10, BaseWeight: 50.0, Hands: 2, BaseSTR: 12, CritChance: 6.0},
	{Name: "Machado de Guerra Mítico", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 40, Tier: 5, BaseAtk: 88, BaseMagic: 0, BaseDef: 0, BaseWeight: 65.0, Hands: 1, BaseSTR: 10},
	{Name: "Maça Celestial", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 40, Tier: 5, BaseAtk: 85, BaseMagic: 0, BaseDef: 6, BaseWeight: 50.0, Hands: 1, BaseSTR: 8, BaseHP: 60},
	{Name: "Arco Apocalíptico", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 40, Tier: 5, BaseAtk: 82, BaseMagic: 0, BaseDef: 5, BaseWeight: 24.0, Hands: 2, BaseDEX: 10, CritChance: 8.0},
	{Name: "Cajado da Eternidade", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 40, Tier: 5, BaseAtk: 0, BaseMagic: 92, BaseDef: 8, BaseWeight: 20.0, Hands: 2, BaseMP: 100, BaseINT: 10, ManaRegen: 3},
	{Name: "Elmo do Zodíaco", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 4, BaseMagic: 0, BaseDef: 28, BaseWeight: 28.0, Hands: 0, BaseHP: 60, BaseSTR: 5},
	{Name: "Armadura de Ouro", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 8, BaseMagic: 0, BaseDef: 35, BaseWeight: 130.0, Hands: 0, BaseHP: 80, BaseSTR: 6},
	{Name: "Grevas Celestiais", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 4, BaseMagic: 0, BaseDef: 24, BaseWeight: 35.0, Hands: 0, BaseHP: 50, BaseSTR: 5},
	{Name: "Botas Celestiais", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 0, BaseMagic: 0, BaseDef: 15, BaseWeight: 18.0, Hands: 0, BaseDEX: 8, BaseHP: 40},
	{Name: "Escudo do Zodíaco", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 40, Tier: 5, BaseAtk: 5, BaseMagic: 0, BaseDef: 34, BaseWeight: 80.0, Hands: 1, BaseHP: 80},
	{Name: "Mochila do Zodíaco", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 5, BaseMagic: 5, BaseDef: 5, BaseWeight: 10.0, Hands: 0, BaseHP: 80, BaseMP: 60, BaseSTR: 5, BaseDEX: 5, BaseINT: 5, GoldBonus: 25.0},
	{Name: "Flechas Divinas", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 38, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Name: "Amuleto do Zodíaco", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 12, BaseMagic: 8, BaseDef: 8, BaseWeight: 2.5, Hands: 0, BaseSTR: 8, BaseDEX: 8, BaseINT: 8, BaseHP: 80},

	// Skill Books
	{Name: "Tome: Golpe Giratório", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "whirlwind", RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 25.0, Hands: 0},
	{Name: "Manual: Tiro Quádruplo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "multishot", RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 18.0, Hands: 0},
	{Name: "Livro: Bola de Fogo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "fireball", RequiredLevel: 12, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 22.0, Hands: 0},
	{Name: "Livro: Cura Divina", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "divine_heal", RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 20.0, Hands: 0},
}

// rarityProfile concentra o orçamento de poder de cada raridade. O tier define a
// base do item; a raridade define quanto essa base é aprimorada.
type rarityProfile struct {
	StatMultiplier    float64
	BonusMultiplier   float64
	PrimaryFlat       int
	PassiveMultiplier float64
	SaleMultiplier    float64
}

var rarityProfiles = map[string]rarityProfile{
	"Comum":    {StatMultiplier: 1.00, BonusMultiplier: 1.00, PrimaryFlat: 0, PassiveMultiplier: 1.00, SaleMultiplier: 1.00},
	"Incomum":  {StatMultiplier: 1.12, BonusMultiplier: 1.10, PrimaryFlat: 1, PassiveMultiplier: 1.15, SaleMultiplier: 1.25},
	"Raro":     {StatMultiplier: 1.85, BonusMultiplier: 1.65, PrimaryFlat: 5, PassiveMultiplier: 1.70, SaleMultiplier: 2.10},
	"Épico":    {StatMultiplier: 2.35, BonusMultiplier: 2.10, PrimaryFlat: 9, PassiveMultiplier: 2.20, SaleMultiplier: 3.25},
	"Lendário": {StatMultiplier: 3.10, BonusMultiplier: 2.80, PrimaryFlat: 14, PassiveMultiplier: 3.00, SaleMultiplier: 5.50},
}

var rarityOrder = []string{"Comum", "Incomum", "Raro", "Épico", "Lendário"}

func rarityRank(rarity string) int {
	for i, candidate := range rarityOrder {
		if candidate == rarity {
			return i
		}
	}
	return 0
}

func normalizeRarity(rarity string) string {
	for _, candidate := range rarityOrder {
		if strings.EqualFold(candidate, rarity) {
			return candidate
		}
	}
	return "Comum"
}

func scaleStat(base int, multiplier float64) int {
	if base <= 0 {
		return 0
	}
	return int(math.Ceil(float64(base) * multiplier))
}

func scaleFloat(base, multiplier float64) float64 {
	if base <= 0 {
		return 0
	}
	return math.Round(base*multiplier*10) / 10
}

func findLootTemplate(name string) *LootTemplate {
	template, exists := ItemRegistry.Get(name)
	if !exists {
		return nil
	}
	return &template
}

func rollRarityWithBounds(minRarity, maxRarity string, r *rand.Rand) string {
	minRank := rarityRank(normalizeRarity(minRarity))
	maxRank := rarityRank(normalizeRarity(maxRarity))
	if minRank > maxRank {
		minRank = maxRank
	}

	roll := r.Float64()
	rarity := "Comum"
	switch {
	case roll < 0.05:
		rarity = "Lendário"
	case roll < 0.20:
		rarity = "Épico"
	case roll < 0.50:
		rarity = "Raro"
	default:
		rarity = "Incomum"
	}
	rank := rarityRank(rarity)
	if rank < minRank {
		rank = minRank
	}
	if rank > maxRank {
		rank = maxRank
	}
	return rarityOrder[rank]
}

func rollRarity(maxRarity string, r *rand.Rand) string {
	return rollRarityWithBounds("Comum", maxRarity, r)
}

func applyRarityBudget(template *LootTemplate, rarity string, r *rand.Rand) *Item {
	rarity = normalizeRarity(rarity)
	profile := rarityProfiles[rarity]
	rank := rarityRank(rarity)

	pAtk := scaleStat(template.BaseAtk, profile.StatMultiplier)
	mAtk := scaleStat(template.BaseMagic, profile.StatMultiplier)
	def := scaleStat(template.BaseDef, profile.StatMultiplier)
	bStr := scaleStat(template.BaseSTR, profile.BonusMultiplier)
	bDex := scaleStat(template.BaseDEX, profile.BonusMultiplier)
	bInt := scaleStat(template.BaseINT, profile.BonusMultiplier)
	bHP := scaleStat(template.BaseHP, profile.BonusMultiplier)
	bMP := scaleStat(template.BaseMP, profile.BonusMultiplier)
	goldB := scaleFloat(template.GoldBonus, profile.PassiveMultiplier)
	lifeS := scaleFloat(template.Lifesteal, profile.PassiveMultiplier)
	manaR := scaleStat(template.ManaRegen, profile.PassiveMultiplier)
	critC := scaleFloat(template.CritChance, profile.PassiveMultiplier)

	flat := profile.PrimaryFlat
	switch template.Slot {
	case SlotMainHand:
		if template.BaseMagic > template.BaseAtk {
			mAtk += flat
		} else {
			pAtk += flat
		}
		if rank >= 2 {
			critC += float64(rank-1) * 1.5
			if template.WeaponType != WeaponTypeBow && r.Float64() < 0.45 {
				lifeS += float64(rank - 1)
			}
		}
	case SlotAmmo:
		pAtk += flat
		if rank >= 2 {
			critC += float64(rank - 1)
		}
	case SlotOffHand:
		def += flat
		bHP += flat * 4
	case SlotHead:
		def += flat
		bHP += flat * 3
	case SlotChest:
		def += flat
		bHP += flat * 5
	case SlotLegs:
		def += flat
		bHP += flat * 4
	case SlotBoots:
		def += flat
		bHP += flat * 2
		if rank >= 2 {
			bDex += rank - 1
		}
	case SlotBag:
		bHP += flat * 5
		bMP += flat * 4
		goldB += float64(flat) * 1.5
	case SlotNecklace, SlotRing:
		def += flat / 2
		bHP += flat * 3
		bMP += flat * 3
		if template.BaseSTR >= template.BaseDEX && template.BaseSTR >= template.BaseINT {
			bStr += flat
		} else if template.BaseDEX >= template.BaseINT {
			bDex += flat
		} else {
			bInt += flat
		}
	}

	item := &Item{
		ID:             fmt.Sprintf("item_%016x", r.Uint64()),
		Name:           template.Name,
		Attack:         pAtk + mAtk,
		PhysicalAttack: pAtk,
		MagicAttack:    mAtk,
		Defense:        def,
		Hands:          template.Hands,
		Rarity:         rarity,
		Weight:         template.BaseWeight,
		RequiredLevel:  template.RequiredLevel,
		BonusSTR:       bStr,
		BonusDEX:       bDex,
		BonusINT:       bInt,
		BonusHP:        bHP,
		BonusMP:        bMP,
		GoldBonus:      goldB,
		Lifesteal:      lifeS,
		ManaRegen:      manaR,
		CritChance:     critC,
		WeaponType:     template.WeaponType,
		SlotType:       string(template.Slot),
		Tier:           template.Tier,
		BalanceVersion: CurrentItemBalanceVersion,
	}
	item.ItemPower = CalculateItemPower(item)
	item.ValueGold = int64(math.Max(5, math.Round(float64(item.ItemPower*item.Tier)*profile.SaleMultiplier)))
	return item
}

// CalculateItemPower produz uma métrica única usada por testes, comparação da UI
// e preço. Ela não substitui os atributos reais; apenas detecta regressões de poder.
func CalculateItemPower(item *Item) int {
	if item == nil {
		return 0
	}
	power := float64(item.PhysicalAttack+item.MagicAttack)*2.0 +
		float64(item.Defense)*2.2 +
		float64(item.BonusSTR+item.BonusDEX+item.BonusINT)*6.0 +
		float64(item.BonusHP)/8.0 + float64(item.BonusMP)/10.0 +
		item.CritChance*3.0 + item.Lifesteal*4.0 +
		float64(item.ManaRegen)*8.0 + item.GoldBonus*0.35
	return int(math.Round(power))
}

// GenerateItemFromTemplate cria uma instância canônica; starters, testes e loot
// passam pela mesma fonte de verdade e deixam de divergir dos templates.
func GenerateItemFromTemplate(name, rarity string, r *rand.Rand) *Item {
	if r == nil {
		r = rand.New(rand.NewSource(time.Now().UnixNano()))
	}
	template := findLootTemplate(name)
	if template == nil {
		return nil
	}
	if template.Slot == SlotSkillBook {
		return &Item{
			ID:             fmt.Sprintf("skillbook_%016x", r.Uint64()),
			Name:           template.Name,
			Rarity:         "Raro",
			Weight:         template.BaseWeight,
			RequiredLevel:  template.RequiredLevel,
			SpecialEffect:  fmt.Sprintf("Slot: skill_book | Skill: %s", template.SkillKey),
			SkillKey:       template.SkillKey,
			SlotType:       string(SlotSkillBook),
			Tier:           template.Tier,
			ValueGold:      50,
			ItemPower:      0,
			BalanceVersion: CurrentItemBalanceVersion,
		}
	}
	return applyRarityBudget(template, rarity, r)
}

type MonsterLootProfile struct {
	Items      []string
	DropChance float64
	MinRarity  string
	MaxRarity  string
}

var MonsterLootProfileMap = map[string]MonsterLootProfile{
	// ─── TIER 1 (Forest, Shereque, Chapolin) ───
	"forest_goblin":          {Items: []string{"Espada do Aprendiz", "Capacete de Couro", "Pequena Bolsa", "Flechas de Madeira"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Incomum"},
	"forest_wolf":            {Items: []string{"Amuleto do Lobo", "Sandálias Ágeis", "Calça de Tecido", "Broquel de Madeira"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Incomum"},
	"forest_spider":          {Items: []string{"Arco Curvo", "Flechas de Madeira", "Varinha do Aprendiz", "Pequena Bolsa"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Incomum"},
	"forest_boss_bear":       {Items: []string{"Espada do Aprendiz", "Arco Curvo", "Capacete de Couro", "Broquel de Madeira", "Amuleto do Lobo"}, DropChance: 1.0, MinRarity: "Raro", MaxRarity: "Raro"},

	"shereque_ogre":          {Items: []string{"Clava de Madeira", "Machadinha de Madeira", "Broquel de Madeira", "Túnica de Couro"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Incomum"},
	"shereque_donkey":        {Items: []string{"Sandálias Ágeis", "Clava de Madeira", "Broquel de Madeira", "Túnica de Couro"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Incomum"},
	"shereque_boss_fiona":    {Items: []string{"Clava de Madeira", "Broquel de Madeira", "Túnica de Couro", "Sandálias Ágeis", "Tome: Golpe Giratório"}, DropChance: 1.0, MinRarity: "Raro", MaxRarity: "Raro"},

	"chapolin_pirate":        {Items: []string{"Espada do Aprendiz", "Machadinha de Madeira", "Broquel de Madeira", "Anel de Cobre", "Flechas de Madeira"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Incomum"},
	"chapolin_tripa":         {Items: []string{"Espada do Aprendiz", "Machadinha de Madeira", "Broquel de Madeira", "Anel de Cobre"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Incomum"},
	"chapolin_bandit":        {Items: []string{"Espada do Aprendiz", "Machadinha de Madeira", "Broquel de Madeira", "Anel de Cobre", "Flechas de Madeira"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Incomum"},
	"chapolin_boss_alma":      {Items: []string{"Espada do Aprendiz", "Machadinha de Madeira", "Broquel de Madeira", "Anel de Cobre", "Manual: Tiro Quádruplo"}, DropChance: 1.0, MinRarity: "Raro", MaxRarity: "Raro"},

	// ─── TIER 2 (Orcruins, Esgotos, Planalto Central) ───
	"orcruins_orc":           {Items: []string{"Machado Orc", "Sabre de Bronze", "Cota de Malha", "Escudo de Madeira", "Arco Longo"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"orcruins_orc_mage":      {Items: []string{"Cajado Rúnico", "Coifa de Prata", "Colar de Prata", "Escudo de Madeira"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"orcruins_skeleton":      {Items: []string{"Coifa de Prata", "Cajado Rúnico", "Escudo de Madeira", "Flechas de Aço"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"orcruins_orc_archer":    {Items: []string{"Arco Longo", "Flechas de Aço", "Botas de Couro", "Calça de Couro"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"orcruins_berserker":     {Items: []string{"Machado Orc", "Sabre de Bronze", "Cota de Malha", "Mochila de Aventureiro"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"orcruins_boss_skeleton": {Items: []string{"Machado Orc", "Sabre de Bronze", "Cajado Rúnico", "Escudo de Madeira", "Mochila de Aventureiro", "Livro: Cura Divina"}, DropChance: 1.0, MinRarity: "Raro", MaxRarity: "Épico"},

	"esgotos_ninja":          {Items: []string{"Sabre de Bronze", "Arco Longo", "Coifa de Prata", "Botas de Couro", "Flechas de Aço"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"esgotos_rat":            {Items: []string{"Maça de Batalha", "Calça de Couro", "Botas de Couro", "Colar de Prata"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"esgotos_boss_destroyer": {Items: []string{"Arco Longo", "Maça de Batalha", "Cota de Malha", "Colar de Prata", "Calça de Couro", "Botas de Couro", "Virotes Perfurantes"}, DropChance: 1.0, MinRarity: "Raro", MaxRarity: "Épico"},

	"planalto_militante":     {Items: []string{"Martelo Constitucional", "Cordão da Estrela Rubra", "Calça Social Engomada", "Pasta Executiva Presidencial"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"planalto_patriota":      {Items: []string{"Megafone do Povo", "Virotes da Notificação", "Coturno da Lei", "Calça Social Engomada"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"planalto_pulica":        {Items: []string{"Boina Tática da Puliça", "Coturno da Lei", "Martelo Constitucional", "Virotes da Notificação"}, DropChance: 0.35, MinRarity: "Comum", MaxRarity: "Raro"},
	"planalto_boss_xandaum":  {Items: []string{"Caneta Esferográfica Suprema", "Toga da Inviolabilidade", "Anel do Supremo Relator", "Martelo Constitucional", "Pasta Executiva Presidencial", "Virotes da Notificação"}, DropChance: 1.0, MinRarity: "Raro", MaxRarity: "Épico"},

	// ─── TIER 3 (Rogartes) ───
	"rogartes_dementor":      {Items: []string{"Espada de Aço", "Cetro do Esquelético", "Elmo Rúnico", "Peitoral de Platina", "Bolsa Rúnica"}, DropChance: 0.35, MinRarity: "Incomum", MaxRarity: "Épico"},
	"rogartes_troll":         {Items: []string{"Escudo de Batalha", "Grevas de Aço", "Botas de Ferro", "Peitoral de Platina"}, DropChance: 0.35, MinRarity: "Incomum", MaxRarity: "Épico"},
	"rogartes_boss_darkmage": {Items: []string{"Espada de Aço", "Cetro do Esquelético", "Elmo Rúnico", "Peitoral de Platina", "Bolsa Rúnica", "Livro: Bola de Fogo"}, DropChance: 1.0, MinRarity: "Raro", MaxRarity: "Épico"},

	// ─── TIER 4 (Frozen) ───
	"frozen_specter":         {Items: []string{"Katana da Fúria", "Varinha das Relíquias", "Orbe Protetor", "Coroa de Ouro"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Épico"},
	"frozen_zombie":          {Items: []string{"Marreta Biônica", "Botas de Aço Rúnico", "Saiote dos Magos", "Mochila Dragônica"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Épico"},
	"frozen_golem":           {Items: []string{"Marreta Biônica", "Katana da Fúria", "Orbe Protetor", "Robe Místico"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Épico"},
	"frozen_chimera":         {Items: []string{"Arco dos Ventos", "Flechas Incendiárias", "Amuleto Dragônico", "Mochila Dragônica"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Épico"},
	"frozen_boss_master":     {Items: []string{"Katana da Fúria", "Marreta Biônica", "Arco dos Ventos", "Varinha das Relíquias", "Orbe Protetor", "Coroa de Ouro", "Robe Místico", "Mochila Dragônica"}, DropChance: 1.0, MinRarity: "Épico", MaxRarity: "Lendário"},

	// ─── TIER 5 (Abyss) ───
	"abyss_dragon":           {Items: []string{"Lâmina de Greiscu", "Arco Apocalíptico", "Flechas Divinas", "Amuleto do Zodíaco"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Lendário"},
	"abyss_demon":            {Items: []string{"Espada Mítica do Vingador", "Machado de Guerra Mítico", "Elmo do Zodíaco", "Armadura de Ouro"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Lendário"},
	"abyss_vampire":          {Items: []string{"Cajado da Eternidade", "Lâmina de Greiscu", "Amuleto do Zodíaco", "Mochila do Zodíaco"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Lendário"},
	"abyss_necromancer":      {Items: []string{"Cajado da Eternidade", "Maça Celestial", "Amuleto do Zodíaco", "Elmo do Zodíaco"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Lendário"},
	"abyss_scorpion":         {Items: []string{"Grevas Celestiais", "Botas Celestiais", "Machado de Guerra Mítico", "Maça Celestial"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Lendário"},
	"abyss_flame_lord":       {Items: []string{"Maça Celestial", "Cajado da Eternidade", "Armadura de Ouro", "Flechas Divinas"}, DropChance: 0.35, MinRarity: "Raro", MaxRarity: "Lendário"},
	"abyss_boss_avenger":     {Items: []string{"Espada Mítica do Vingador", "Lâmina de Greiscu", "Machado de Guerra Mítico", "Maça Celestial", "Arco Apocalíptico", "Cajado da Eternidade", "Escudo do Zodíaco", "Mochila do Zodíaco"}, DropChance: 1.0, MinRarity: "Épico", MaxRarity: "Lendário"},
}

func getLootProfileForMonster(monsterKeyOrName string) MonsterLootProfile {
	if entry, exists := MonsterRegistry.Get(monsterKeyOrName); exists && len(entry.Loot.Items) > 0 {
		return entry.Loot
	}

	return MonsterLootProfile{
		Items:      []string{"Espada do Aprendiz", "Broquel de Madeira", "Capacete de Couro", "Pequena Bolsa"},
		DropChance: 0.35,
		MinRarity:  "Comum",
		MaxRarity:  "Incomum",
	}
}

func lootTableForMonster(monsterName string) ([]string, string) {
	prof := getLootProfileForMonster(monsterName)
	return prof.Items, prof.MaxRarity
}

// RebalanceExistingItem migra itens JSONB antigos sem trocar identidade.
func RebalanceExistingItem(existing Item) Item {
	if existing.BalanceVersion >= CurrentItemBalanceVersion {
		if existing.ItemPower == 0 {
			existing.ItemPower = CalculateItemPower(&existing)
		}
		return existing
	}

	name := existing.Name
	if existing.ID == "starter_shield" || strings.Contains(strings.ToLower(existing.SpecialEffect), "escudo inicial") {
		name = "Broquel de Madeira"
	}
	if name == "Botas de Ferro" && existing.RequiredLevel >= 35 {
		name = "Botas de Aço Rúnico"
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	rebalanced := GenerateItemFromTemplate(name, normalizeRarity(existing.Rarity), rng)
	if rebalanced == nil {
		existing.ItemPower = CalculateItemPower(&existing)
		existing.BalanceVersion = CurrentItemBalanceVersion
		return existing
	}
	rebalanced.ID = existing.ID
	if rebalanced.ID == "" {
		rebalanced.ID = fmt.Sprintf("item_%016x", rng.Uint64())
	}
	if existing.SpecialEffect != "" && rebalancePreservesSpecialEffect(existing.SpecialEffect) {
		rebalanced.SpecialEffect = existing.SpecialEffect
	}
	rebalanced.ItemPower = CalculateItemPower(rebalanced)
	rebalanced.BalanceVersion = CurrentItemBalanceVersion
	return *rebalanced
}

func rebalancePreservesSpecialEffect(effect string) bool {
	lower := strings.ToLower(effect)
	return strings.Contains(lower, "inicial") || strings.Contains(lower, "skill:") || strings.Contains(lower, "ensina")
}

// GenerateLootForMonsterWithRand gera loot baseado na tabela canônica do monstro.
func GenerateLootForMonsterWithRand(monsterName string, mobLevel int, r *rand.Rand) *Item {
	if r == nil {
		r = rand.New(rand.NewSource(time.Now().UnixNano()))
	}
	prof := getLootProfileForMonster(monsterName)
	chosenName := prof.Items[r.Intn(len(prof.Items))]
	rarity := rollRarityWithBounds(prof.MinRarity, prof.MaxRarity, r)
	item := GenerateItemFromTemplate(chosenName, rarity, r)
	if item == nil {
		return nil
	}
	encounterLevel := mobLevel
	if encounterLevel < 1 {
		encounterLevel = 1
	}
	item.ValueGold += int64(encounterLevel * item.Tier)
	return item
}

func GenerateLootForMonster(monsterName string, mobLevel int) *Item {
	return GenerateLootForMonsterWithRand(monsterName, mobLevel, rand.New(rand.NewSource(time.Now().UnixNano())))
}

func GenerateProceduralLoot() Item {
	lootPtr := GenerateLootForMonster("forest_goblin", 1)
	if lootPtr == nil {
		return Item{}
	}
	return *lootPtr
}

func GetItemWeaponType(item *Item) string {
	if item == nil {
		return WeaponTypeNone
	}
	if item.WeaponType != "" {
		return item.WeaponType
	}
	if template := findLootTemplate(item.Name); template != nil && template.WeaponType != "" {
		return template.WeaponType
	}
	// Compatibilidade para itens legados desconhecidos: historicamente o fallback
	// era tratado como espada pelo motor.
	return WeaponTypeSword
}

// GetItemSkillKey usa metadado canônico e consulta o template como fallback
// de compatibilidade para itens persistidos antes da introdução de skill_key.
func GetItemSkillKey(item *Item) string {
	if item == nil {
		return ""
	}
	if item.SkillKey != "" {
		return item.SkillKey
	}
	if template := findLootTemplate(item.Name); template != nil {
		return template.SkillKey
	}
	return ""
}

func GetItemSlotType(item *Item) string {
	if item == nil {
		return ""
	}
	if item.SlotType != "" {
		return item.SlotType
	}
	if template := findLootTemplate(item.Name); template != nil {
		return string(template.Slot)
	}
	return ""
}

// ListLootTemplates retorna uma cópia do catálogo canônico para auditoria,
// telemetria administrativa e geração de documentação de balanceamento.
func ListLootTemplates() []LootTemplate {
	return ItemRegistry.List()
}
