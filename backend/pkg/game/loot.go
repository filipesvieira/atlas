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
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	Attack            int       `json:"attack"`
	PhysicalAttack    int       `json:"physical_attack"`
	MagicAttack       int       `json:"magic_attack"`
	Defense           int       `json:"defense"`
	Hands             int       `json:"hands"` // 1 or 2
	ValueGold         int64     `json:"value_gold"`
	Rarity            string    `json:"rarity"`
	Weight            float64   `json:"weight"`
	RequiredLevel     int       `json:"required_level"`
	BonusSTR          int       `json:"bonus_str,omitempty"`
	BonusDEX          int       `json:"bonus_dex,omitempty"`
	BonusINT          int       `json:"bonus_int,omitempty"`
	BonusHP           int       `json:"bonus_hp,omitempty"`
	BonusMP           int       `json:"bonus_mp,omitempty"`
	GoldBonus         float64   `json:"gold_bonus,omitempty"`
	CritChance        float64   `json:"crit_chance,omitempty"`
	Lifesteal         float64   `json:"lifesteal,omitempty"`
	ManaRegen         int       `json:"mana_regen,omitempty"`
	WeaponType        string    `json:"weapon_type,omitempty"`
	SkillKey          string    `json:"skill_key,omitempty"`
	SpecialEffect     string    `json:"special_effect"`
	SlotType          string    `json:"slot_type"`
	ItemKind          ItemKind  `json:"item_kind,omitempty"`
	UnlockBuildingKey string    `json:"unlock_building_key,omitempty"`
	UnlockMaxLevel    int       `json:"unlock_max_level,omitempty"`
	TemplateKey       string    `json:"template_key,omitempty"`
	Tier              int       `json:"tier"`
	ItemPower         int       `json:"item_power"`
	BalanceVersion    int       `json:"balance_version"`
	Source            string    `json:"source,omitempty"`
	CreatedAt         time.Time `json:"created_at,omitempty"`
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
	SlotManual    ItemSlot = "manual"
)

type ItemKind string

const (
	ItemKindEquipment          ItemKind = "equipment"
	ItemKindSkillBook          ItemKind = "skill_book"
	ItemKindConstructionManual ItemKind = "construction_manual"
	ItemKindQuest              ItemKind = "quest"
)

type LootTemplate struct {
	Key               string
	Name              string
	Slot              ItemSlot
	ItemKind          ItemKind
	UnlockBuildingKey string
	UnlockMaxLevel    int
	WeaponType        string
	SkillKey          string
	RequiredLevel     int
	Tier              int
	BaseAtk           int
	BaseMagic         int
	BaseDef           int
	BaseWeight        float64
	Hands             int
	BaseSTR           int
	BaseDEX           int
	BaseINT           int
	BaseHP            int
	BaseMP            int
	GoldBonus         float64
	Lifesteal         float64
	ManaRegen         int
	CritChance        float64
}

var lootTemplates = []LootTemplate{
	// ==================== TIER 1 (NÍVEL 1+) ====================
	{Key: "espada_do_aprendiz", Name: "Espada do Aprendiz", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 1, Tier: 1, BaseAtk: 8, BaseMagic: 0, BaseDef: 0, BaseWeight: 15.0, Hands: 1},
	{Key: "montante_de_madeira", Name: "Montante de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 1, Tier: 1, BaseAtk: 14, BaseMagic: 0, BaseDef: 0, BaseWeight: 24.0, Hands: 2, BaseSTR: 1, CritChance: 3.0},
	{Key: "machadinha_de_madeira", Name: "Machadinha de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 1, Tier: 1, BaseAtk: 9, BaseMagic: 0, BaseDef: 0, BaseWeight: 18.0, Hands: 1},
	{Key: "clava_de_madeira", Name: "Clava de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 1, Tier: 1, BaseAtk: 9, BaseMagic: 0, BaseDef: 1, BaseWeight: 20.0, Hands: 1},
	{Key: "arco_curvo", Name: "Arco Curvo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 1, Tier: 1, BaseAtk: 14, BaseMagic: 0, BaseDef: 0, BaseWeight: 12.0, Hands: 2, CritChance: 3.0},
	{Key: "varinha_do_aprendiz", Name: "Varinha do Aprendiz", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 10, BaseDef: 0, BaseWeight: 8.0, Hands: 1},
	{Key: "capacete_de_couro", Name: "Capacete de Couro", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 3, BaseWeight: 12.0, Hands: 0},
	{Key: "tunica_de_couro", Name: "Túnica de Couro", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 4, BaseWeight: 25.0, Hands: 0, BaseHP: 5},
	{Key: "calca_de_tecido", Name: "Calça de Tecido", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 2, BaseWeight: 10.0, Hands: 0},
	{Key: "sandalias_ageis", Name: "Sandálias Ágeis", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 5.0, Hands: 0, BaseDEX: 1},
	{Key: "broquel_de_madeira", Name: "Broquel de Madeira", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 6, BaseWeight: 14.0, Hands: 1, BaseHP: 5},
	{Key: "pequena_bolsa", Name: "Pequena Bolsa", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 5.0, Hands: 0},
	{Key: "flechas_de_madeira", Name: "Flechas de Madeira", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 4, BaseMagic: 0, BaseDef: 0, BaseWeight: 1.5, Hands: 0},
	{Key: "amuleto_do_lobo", Name: "Amuleto do Lobo", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 1, BaseMagic: 0, BaseDef: 1, BaseWeight: 1.5, Hands: 0, BaseSTR: 1},
	{Key: "anel_de_cobre", Name: "Anel de Cobre", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 0.8, Hands: 0, BaseHP: 10},

	// ==================== TIER 2 (NÍVEL 5+) ====================
	{Key: "sabre_de_bronze", Name: "Sabre de Bronze", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 8, Tier: 2, BaseAtk: 16, BaseMagic: 0, BaseDef: 1, BaseWeight: 22.0, Hands: 1, BaseSTR: 1},
	{Key: "montante_de_bronze", Name: "Montante de Bronze", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 8, Tier: 2, BaseAtk: 28, BaseMagic: 0, BaseDef: 1, BaseWeight: 45.0, Hands: 2, BaseSTR: 3, CritChance: 4.0},
	{Key: "machado_orc", Name: "Machado Orc", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 8, Tier: 2, BaseAtk: 18, BaseMagic: 0, BaseDef: 0, BaseWeight: 45.0, Hands: 1, BaseSTR: 1},
	{Key: "maca_de_batalha", Name: "Maça de Batalha", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 8, Tier: 2, BaseAtk: 17, BaseMagic: 0, BaseDef: 2, BaseWeight: 38.0, Hands: 1, BaseSTR: 1},
	{Key: "arco_longo", Name: "Arco Longo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 8, Tier: 2, BaseAtk: 26, BaseMagic: 0, BaseDef: 1, BaseWeight: 22.0, Hands: 2, BaseDEX: 2, CritChance: 4.0},
	{Key: "cajado_runico", Name: "Cajado Rúnico", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 30, BaseDef: 0, BaseWeight: 18.5, Hands: 2, BaseMP: 25, BaseINT: 2, ManaRegen: 1},
	{Key: "coifa_de_prata", Name: "Coifa de Prata", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 7, BaseWeight: 25.0, Hands: 0, BaseHP: 10},
	{Key: "cota_de_malha", Name: "Cota de Malha", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 75.0, Hands: 0, BaseHP: 15},
	{Key: "calca_de_couro", Name: "Calça de Couro", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 5, BaseWeight: 18.0, Hands: 0, BaseSTR: 1},
	{Key: "botas_de_couro", Name: "Botas de Couro", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 3, BaseWeight: 9.0, Hands: 0, BaseDEX: 1},
	{Key: "escudo_de_madeira", Name: "Escudo de Madeira", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 9, BaseWeight: 30.0, Hands: 1, BaseHP: 10},
	{Key: "mochila_de_aventureiro", Name: "Mochila de Aventureiro", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 1, BaseWeight: 15.0, Hands: 0, BaseHP: 15, GoldBonus: 5.0},
	{Key: "flechas_de_aco", Name: "Flechas de Aço", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 9, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Key: "colar_de_prata", Name: "Colar de Prata", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 2, BaseMagic: 0, BaseDef: 2, BaseWeight: 1.5, Hands: 0, BaseMP: 15},
	{Key: "anel_de_prata", Name: "Anel de Prata", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 2, BaseDef: 2, BaseWeight: 0.8, Hands: 0, BaseINT: 2},

	// ==================== TIER 2: PLANALTO CENTRAL ====================
	{Key: "martelo_constitucional", Name: "Martelo Constitucional", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 8, Tier: 2, BaseAtk: 18, BaseMagic: 0, BaseDef: 2, BaseWeight: 42.0, Hands: 1, BaseSTR: 2, BaseHP: 15},
	{Key: "caneta_esferografica_suprema", Name: "Caneta Esferográfica Suprema", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 22, BaseDef: 1, BaseWeight: 8.0, Hands: 1, BaseINT: 2, BaseMP: 20, ManaRegen: 1},
	{Key: "megafone_do_povo", Name: "Megafone do Povo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 8, Tier: 2, BaseAtk: 28, BaseMagic: 0, BaseDef: 1, BaseWeight: 16.0, Hands: 2, BaseDEX: 3, CritChance: 4.0},
	{Key: "boina_tatica_da_pulica", Name: "Boina Tática da Puliça", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 1, BaseMagic: 0, BaseDef: 8, BaseWeight: 15.0, Hands: 0, BaseHP: 12, BaseDEX: 1},
	{Key: "toga_da_inviolabilidade", Name: "Toga da Inviolabilidade", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 2, BaseDef: 12, BaseWeight: 35.0, Hands: 0, BaseHP: 20, BaseMP: 15, BaseINT: 1},
	{Key: "calca_social_engomada", Name: "Calça Social Engomada", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 6, BaseWeight: 12.0, Hands: 0, BaseSTR: 1, BaseINT: 1},
	{Key: "coturno_da_lei", Name: "Coturno da Lei", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 4, BaseWeight: 14.0, Hands: 0, BaseHP: 10, BaseDEX: 1},
	{Key: "cordao_da_estrela_rubra", Name: "Cordão da Estrela Rubra", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 2, BaseMagic: 0, BaseDef: 2, BaseWeight: 1.2, Hands: 0, BaseHP: 15, BaseSTR: 1, Lifesteal: 1.5},
	{Key: "anel_do_supremo_relator", Name: "Anel do Supremo Relator", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 3, BaseDef: 2, BaseWeight: 0.6, Hands: 0, BaseMP: 20, BaseINT: 2, GoldBonus: 5.0},
	{Key: "pasta_executiva_presidencial", Name: "Pasta Executiva Presidencial", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 2, BaseWeight: 8.0, Hands: 0, BaseHP: 25, GoldBonus: 10.0},
	{Key: "virotes_da_notificacao", Name: "Virotes da Notificação", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 10, BaseMagic: 0, BaseDef: 0, BaseWeight: 1.8, Hands: 0},

	// ==================== TIER 3 (NÍVEL 12+) ====================
	{Key: "espada_de_aco", Name: "Espada de Aço", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 15, Tier: 3, BaseAtk: 30, BaseMagic: 0, BaseDef: 2, BaseWeight: 35.5, Hands: 1, BaseSTR: 3},
	{Key: "espada_grande_de_aco", Name: "Espada Grande de Aço", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 15, Tier: 3, BaseAtk: 50, BaseMagic: 0, BaseDef: 2, BaseWeight: 60.0, Hands: 2, BaseSTR: 5, CritChance: 5.0},
	{Key: "machado_de_guerra", Name: "Machado de Guerra", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 15, Tier: 3, BaseAtk: 33, BaseMagic: 0, BaseDef: 0, BaseWeight: 55.0, Hands: 1, BaseSTR: 3},
	{Key: "martelo_de_guerra", Name: "Martelo de Guerra", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 15, Tier: 3, BaseAtk: 32, BaseMagic: 0, BaseDef: 3, BaseWeight: 58.0, Hands: 1, BaseSTR: 3},
	{Key: "arco_do_cacador", Name: "Arco do Caçador", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 15, Tier: 3, BaseAtk: 48, BaseMagic: 0, BaseDef: 2, BaseWeight: 26.0, Hands: 2, BaseDEX: 5, CritChance: 5.0},
	{Key: "cetro_do_esqueletico", Name: "Cetro do Esquelético", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 56, BaseDef: 2, BaseWeight: 24.0, Hands: 2, BaseMP: 50, BaseINT: 5, ManaRegen: 2},
	{Key: "elmo_runico", Name: "Elmo Rúnico", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 2, BaseMagic: 0, BaseDef: 13, BaseWeight: 32.0, Hands: 0, BaseHP: 20, BaseSTR: 2},
	{Key: "peitoral_de_platina", Name: "Peitoral de Platina", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 18, BaseWeight: 110.0, Hands: 0, BaseHP: 30},
	{Key: "grevas_de_aco", Name: "Grevas de Aço", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 45.0, Hands: 0, BaseSTR: 2},
	{Key: "botas_de_ferro", Name: "Botas de Ferro", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 6, BaseWeight: 22.0, Hands: 0, BaseSTR: 2, BaseHP: 10},
	{Key: "escudo_de_batalha", Name: "Escudo de Batalha", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 16, BaseWeight: 55.0, Hands: 1, BaseHP: 25},
	{Key: "bolsa_runica", Name: "Bolsa Rúnica", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 2, BaseDef: 2, BaseWeight: 8.0, Hands: 0, BaseMP: 30, BaseINT: 3, GoldBonus: 10.0},
	{Key: "virotes_perfurantes", Name: "Virotes Perfurantes", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 8, Tier: 2, BaseAtk: 14, BaseMagic: 0, BaseDef: 0, BaseWeight: 3.5, Hands: 0},
	{Key: "colar_de_rubi", Name: "Colar de Rubi", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 4, BaseMagic: 0, BaseDef: 2, BaseWeight: 1.2, Hands: 0, BaseSTR: 2, BaseHP: 20},
	{Key: "anel_de_ouro", Name: "Anel de Ouro", Slot: SlotRing, WeaponType: WeaponTypeNone, RequiredLevel: 15, Tier: 3, BaseAtk: 0, BaseMagic: 4, BaseDef: 3, BaseWeight: 0.8, Hands: 0, BaseINT: 3, BaseMP: 25},

	// ==================== TIER 4 (NÍVEL 20+) ====================
	{Key: "katana_da_furia", Name: "Katana da Fúria", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 25, Tier: 4, BaseAtk: 52, BaseMagic: 0, BaseDef: 3, BaseWeight: 28.0, Hands: 1, BaseSTR: 5, CritChance: 3.0},
	{Key: "lamina_colossal", Name: "Lâmina Colossal", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 25, Tier: 4, BaseAtk: 84, BaseMagic: 0, BaseDef: 4, BaseWeight: 65.0, Hands: 2, BaseSTR: 9, CritChance: 6.0},
	{Key: "machado_do_urso_ranzinza", Name: "Machado do Urso Ranzinza", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 25, Tier: 4, BaseAtk: 56, BaseMagic: 0, BaseDef: 2, BaseWeight: 60.0, Hands: 1, BaseSTR: 6},
	{Key: "marreta_bionica", Name: "Marreta Biônica", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 25, Tier: 4, BaseAtk: 55, BaseMagic: 0, BaseDef: 4, BaseWeight: 45.0, Hands: 1, BaseSTR: 5, Lifesteal: 2.0},
	{Key: "arco_dos_ventos", Name: "Arco dos Ventos", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 25, Tier: 4, BaseAtk: 80, BaseMagic: 0, BaseDef: 4, BaseWeight: 20.0, Hands: 2, BaseDEX: 8, CritChance: 7.0},
	{Key: "varinha_das_reliquias", Name: "Varinha das Relíquias", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 25, Tier: 4, BaseAtk: 0, BaseMagic: 58, BaseDef: 5, BaseWeight: 16.0, Hands: 1, BaseMP: 50, BaseINT: 6, ManaRegen: 2},
	{Key: "coroa_de_ouro", Name: "Coroa de Ouro", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 5, BaseMagic: 0, BaseDef: 20, BaseWeight: 18.0, Hands: 0, BaseHP: 40, BaseINT: 3},
	{Key: "robe_mistico", Name: "Robe Místico", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 6, BaseMagic: 0, BaseDef: 22, BaseWeight: 30.0, Hands: 0, BaseMP: 50, BaseINT: 5},
	{Key: "saiote_dos_magos", Name: "Saiote dos Magos", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 3, BaseMagic: 0, BaseDef: 14, BaseWeight: 14.0, Hands: 0, BaseMP: 30, BaseINT: 4},
	{Key: "botas_de_aco_runico", Name: "Botas de Aço Rúnico", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 0, BaseMagic: 0, BaseDef: 10, BaseWeight: 22.0, Hands: 0, BaseDEX: 5, BaseHP: 20},
	{Key: "orbe_protetor", Name: "Orbe Protetor", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 25, Tier: 4, BaseAtk: 4, BaseMagic: 8, BaseDef: 22, BaseWeight: 10.0, Hands: 1, BaseMP: 30, BaseINT: 3},
	{Key: "mochila_dragonica", Name: "Mochila Dragônica", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 2, BaseMagic: 0, BaseDef: 3, BaseWeight: 15.0, Hands: 0, BaseHP: 50, BaseSTR: 4, GoldBonus: 15.0},
	{Key: "flechas_incendiarias", Name: "Flechas Incendiárias", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 22, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Key: "amuleto_dragonico", Name: "Amuleto Dragônico", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 25, Tier: 4, BaseAtk: 6, BaseMagic: 4, BaseDef: 4, BaseWeight: 2.0, Hands: 0, BaseSTR: 4, BaseDEX: 4, BaseHP: 40},

	// ==================== TIER 5 (NÍVEL 35+) ====================
	{Key: "lamina_de_greiscu", Name: "Lâmina de Greiscu", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 40, Tier: 5, BaseAtk: 80, BaseMagic: 0, BaseDef: 5, BaseWeight: 42.0, Hands: 1, BaseSTR: 10, Lifesteal: 5.0},
	{Key: "espada_mitica_do_vingador", Name: "Espada Mítica do Vingador", Slot: SlotMainHand, WeaponType: WeaponTypeSword, RequiredLevel: 40, Tier: 5, BaseAtk: 145, BaseMagic: 0, BaseDef: 12, BaseWeight: 50.0, Hands: 2, BaseSTR: 15, CritChance: 8.0},
	{Key: "machado_de_guerra_mitico", Name: "Machado de Guerra Mítico", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, RequiredLevel: 40, Tier: 5, BaseAtk: 88, BaseMagic: 0, BaseDef: 0, BaseWeight: 65.0, Hands: 1, BaseSTR: 10},
	{Key: "maca_celestial", Name: "Maça Celestial", Slot: SlotMainHand, WeaponType: WeaponTypeClub, RequiredLevel: 40, Tier: 5, BaseAtk: 85, BaseMagic: 0, BaseDef: 6, BaseWeight: 50.0, Hands: 1, BaseSTR: 8, BaseHP: 60},
	{Key: "arco_apocaliptico", Name: "Arco Apocalíptico", Slot: SlotMainHand, WeaponType: WeaponTypeBow, RequiredLevel: 40, Tier: 5, BaseAtk: 135, BaseMagic: 0, BaseDef: 5, BaseWeight: 24.0, Hands: 2, BaseDEX: 14, CritChance: 10.0},
	{Key: "cajado_da_eternidade", Name: "Cajado da Eternidade", Slot: SlotMainHand, WeaponType: WeaponTypeWand, RequiredLevel: 40, Tier: 5, BaseAtk: 0, BaseMagic: 145, BaseDef: 8, BaseWeight: 20.0, Hands: 2, BaseMP: 140, BaseINT: 15, ManaRegen: 5},
	{Key: "elmo_do_zodiaco", Name: "Elmo do Zodíaco", Slot: SlotHead, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 4, BaseMagic: 0, BaseDef: 28, BaseWeight: 28.0, Hands: 0, BaseHP: 60, BaseSTR: 5},
	{Key: "armadura_de_ouro", Name: "Armadura de Ouro", Slot: SlotChest, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 8, BaseMagic: 0, BaseDef: 35, BaseWeight: 130.0, Hands: 0, BaseHP: 80, BaseSTR: 6},
	{Key: "grevas_celestiais", Name: "Grevas Celestiais", Slot: SlotLegs, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 4, BaseMagic: 0, BaseDef: 24, BaseWeight: 35.0, Hands: 0, BaseHP: 50, BaseSTR: 5},
	{Key: "botas_celestiais", Name: "Botas Celestiais", Slot: SlotBoots, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 0, BaseMagic: 0, BaseDef: 15, BaseWeight: 18.0, Hands: 0, BaseDEX: 8, BaseHP: 40},
	{Key: "escudo_do_zodiaco", Name: "Escudo do Zodíaco", Slot: SlotOffHand, WeaponType: WeaponTypeShield, RequiredLevel: 40, Tier: 5, BaseAtk: 5, BaseMagic: 0, BaseDef: 34, BaseWeight: 80.0, Hands: 1, BaseHP: 80},
	{Key: "mochila_do_zodiaco", Name: "Mochila do Zodíaco", Slot: SlotBag, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 5, BaseMagic: 5, BaseDef: 5, BaseWeight: 10.0, Hands: 0, BaseHP: 80, BaseMP: 60, BaseSTR: 5, BaseDEX: 5, BaseINT: 5, GoldBonus: 25.0},
	{Key: "flechas_divinas", Name: "Flechas Divinas", Slot: SlotAmmo, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 38, BaseMagic: 0, BaseDef: 0, BaseWeight: 2.0, Hands: 0},
	{Key: "amuleto_do_zodiaco", Name: "Amuleto do Zodíaco", Slot: SlotNecklace, WeaponType: WeaponTypeNone, RequiredLevel: 40, Tier: 5, BaseAtk: 12, BaseMagic: 8, BaseDef: 8, BaseWeight: 2.5, Hands: 0, BaseSTR: 8, BaseDEX: 8, BaseINT: 8, BaseHP: 80},

	// Skill Books
	{Key: "tome_golpe_giratorio", Name: "Tome: Golpe Giratório", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "whirlwind", RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 25.0, Hands: 0},
	{Key: "manual_tiro_quadruplo", Name: "Manual: Tiro Quádruplo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "multishot", RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 18.0, Hands: 0},
	{Key: "tome_golpe_brutal", Name: "Tome: Golpe Brutal", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "brutal_strike", RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 24.0, Hands: 0},
	{Key: "manual_tiro_preciso", Name: "Manual: Tiro Preciso", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "sniper_shot", RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 18.0, Hands: 0},
	{Key: "livro_bola_de_fogo", Name: "Livro: Bola de Fogo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "fireball", RequiredLevel: 12, Tier: 3, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 22.0, Hands: 0},
	{Key: "livro_estilhaco_de_gelo", Name: "Livro: Estilhaço de Gelo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "ice_shard", RequiredLevel: 20, Tier: 4, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 22.0, Hands: 0},
	{Key: "livro_cura_divina", Name: "Livro: Cura Divina", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, SkillKey: "divine_heal", RequiredLevel: 8, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 20.0, Hands: 0},

	// Construction Manuals (Blueprints)
	{Key: "manual_armazem_de_recursos", Name: "Manual: Armazém de Recursos", Slot: SlotManual, ItemKind: ItemKindConstructionManual, UnlockBuildingKey: "warehouse", UnlockMaxLevel: 3, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 5.0, Hands: 0},
	{Key: "manual_cabana_do_aventureiro", Name: "Manual: Cabana do Aventureiro", Slot: SlotManual, ItemKind: ItemKindConstructionManual, UnlockBuildingKey: "adventurer_hut", UnlockMaxLevel: 3, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 5.0, Hands: 0},
	{Key: "manual_fonte_arcana", Name: "Manual: Fonte Arcana", Slot: SlotManual, ItemKind: ItemKindConstructionManual, UnlockBuildingKey: "arcane_spring", UnlockMaxLevel: 3, RequiredLevel: 1, Tier: 1, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 5.0, Hands: 0},
	{Key: "manual_bancada_de_desmontagem", Name: "Manual: Bancada de Desmontagem", Slot: SlotManual, ItemKind: ItemKindConstructionManual, UnlockBuildingKey: "workbench", UnlockMaxLevel: 3, RequiredLevel: 1, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 5.0, Hands: 0},
	{Key: "manual_do_mestre_de_obras", Name: "Manual do Mestre de Obras", Slot: SlotManual, ItemKind: ItemKindConstructionManual, UnlockBuildingKey: "master_builder", UnlockMaxLevel: 1, RequiredLevel: 1, Tier: 2, BaseAtk: 0, BaseMagic: 0, BaseDef: 0, BaseWeight: 5.0, Hands: 0},
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
	case roll < 0.01:
		rarity = "Lendário"
	case roll < 0.05:
		rarity = "Épico"
	case roll < 0.18:
		rarity = "Raro"
	case roll < 0.45:
		rarity = "Incomum"
	default:
		rarity = "Comum"
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
		atkBonus := flat
		if template.Hands == 2 {
			atkBonus = int(float64(flat) * 1.5)
		}
		if template.BaseMagic > template.BaseAtk {
			mAtk += atkBonus
		} else {
			pAtk += atkBonus
		}
		if rank >= 2 {
			mult := 1.5
			if template.Hands == 2 {
				mult = 2.2
			}
			critC += float64(rank-1) * mult
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

	tplKey := template.Key
	if tplKey == "" {
		tplKey = normalizeContentKey(template.Name)
	}

	item := &Item{
		ID:             fmt.Sprintf("item_%016x", r.Uint64()),
		Name:           template.Name,
		TemplateKey:    tplKey,
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
		CreatedAt:      time.Now().UTC(),
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
	tplKey := template.Key
	if tplKey == "" {
		tplKey = normalizeContentKey(template.Name)
	}

	if template.Slot == SlotSkillBook {
		finalRarity := normalizeRarity(rarity)
		if finalRarity == "Comum" || finalRarity == "Incomum" {
			finalRarity = "Raro"
		}
		return &Item{
			ID:             fmt.Sprintf("skillbook_%016x", r.Uint64()),
			Name:           template.Name,
			TemplateKey:    tplKey,
			Rarity:         finalRarity,
			Weight:         template.BaseWeight,
			RequiredLevel:  template.RequiredLevel,
			SpecialEffect:  fmt.Sprintf("Slot: skill_book | Skill: %s", template.SkillKey),
			SkillKey:       template.SkillKey,
			SlotType:       string(SlotSkillBook),
			ItemKind:       ItemKindSkillBook,
			Tier:           template.Tier,
			ValueGold:      50,
			ItemPower:      0,
			BalanceVersion: CurrentItemBalanceVersion,
			CreatedAt:      time.Now().UTC(),
		}
	}
	if template.ItemKind == ItemKindConstructionManual || template.Slot == SlotManual {
		finalRarity := normalizeRarity(rarity)
		if finalRarity == "Comum" {
			finalRarity = "Incomum"
		}
		return &Item{
			ID:                fmt.Sprintf("manual_%016x", r.Uint64()),
			Name:              template.Name,
			TemplateKey:       tplKey,
			Rarity:            finalRarity,
			Weight:            template.BaseWeight,
			RequiredLevel:     template.RequiredLevel,
			SpecialEffect:     fmt.Sprintf("Manual de Construção: Desbloqueia projeto de %s", template.UnlockBuildingKey),
			SlotType:          string(SlotManual),
			ItemKind:          ItemKindConstructionManual,
			UnlockBuildingKey: template.UnlockBuildingKey,
			UnlockMaxLevel:    template.UnlockMaxLevel,
			Tier:              template.Tier,
			ValueGold:         100,
			ItemPower:         0,
			BalanceVersion:    CurrentItemBalanceVersion,
			CreatedAt:         time.Now().UTC(),
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
	"forest_goblin":    {Items: []string{"Espada do Aprendiz", "Capacete de Couro"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"forest_wolf":      {Items: []string{"Sandálias Ágeis"}, DropChance: 0.008, MinRarity: "Comum", MaxRarity: "Lendário"},
	"forest_spider":    {Items: []string{"Flechas de Madeira"}, DropChance: 0.00, MinRarity: "Comum", MaxRarity: "Lendário"},
	"forest_boss_bear": {Items: []string{"Arco Curvo", "Broquel de Madeira", "Amuleto do Lobo", "Manual: Armazém de Recursos"}, DropChance: 0.035, MinRarity: "Raro", MaxRarity: "Lendário"},

	"shereque_ogre":       {Items: []string{"Clava de Madeira", "Túnica de Couro"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"shereque_donkey":     {Items: []string{"Sandálias Ágeis"}, DropChance: 0.008, MinRarity: "Comum", MaxRarity: "Lendário"},
	"shereque_boss_fiona": {Items: []string{"Machadinha de Madeira", "Broquel de Madeira", "Tome: Golpe Giratório", "Manual: Cabana do Aventureiro"}, DropChance: 0.035, MinRarity: "Raro", MaxRarity: "Lendário"},

	"chapolin_pirate":    {Items: []string{"Espada do Aprendiz", "Broquel de Madeira"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"chapolin_tripa":     {Items: []string{"Machadinha de Madeira"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"chapolin_bandit":    {Items: []string{"Arco Curvo", "Flechas de Madeira"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"chapolin_boss_alma": {Items: []string{"Anel de Cobre", "Manual: Tiro Quádruplo", "Manual: Fonte Arcana"}, DropChance: 0.035, MinRarity: "Raro", MaxRarity: "Lendário"},

	// ─── TIER 2 (Orcruins, Esgotos, Planalto Central) ───
	"orcruins_orc":           {Items: []string{"Machado Orc", "Cota de Malha"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"orcruins_orc_mage":      {Items: []string{"Coifa de Prata"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"orcruins_skeleton":      {Items: []string{"Escudo de Madeira"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"orcruins_orc_archer":    {Items: []string{"Arco Longo", "Flechas de Aço"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"orcruins_berserker":     {Items: []string{"Sabre de Bronze"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"orcruins_boss_skeleton": {Items: []string{"Cajado Rúnico", "Mochila de Aventureiro", "Livro: Cura Divina", "Manual: Bancada de Desmontagem"}, DropChance: 0.035, MinRarity: "Raro", MaxRarity: "Lendário"},

	"esgotos_ninja":          {Items: []string{"Sabre de Bronze", "Botas de Couro"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"esgotos_rat":            {Items: []string{"Calça de Couro"}, DropChance: 0.00, MinRarity: "Comum", MaxRarity: "Lendário"},
	"esgotos_boss_destroyer": {Items: []string{"Maça de Batalha", "Calça de Couro", "Colar de Prata", "Virotes Perfurantes", "Manual: Tiro Preciso"}, DropChance: 0.035, MinRarity: "Raro", MaxRarity: "Lendário"},

	"planalto_militante":    {Items: []string{"Martelo Constitucional", "Cordão da Estrela Rubra"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"planalto_patriota":     {Items: []string{"Megafone do Povo", "Virotes da Notificação"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"planalto_pulica":       {Items: []string{"Boina Tática da Puliça", "Coturno da Lei"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"planalto_boss_xandaum": {Items: []string{"Caneta Esferográfica Suprema", "Toga da Inviolabilidade", "Anel do Supremo Relator", "Pasta Executiva Presidencial", "Tome: Golpe Brutal", "Manual do Mestre de Obras"}, DropChance: 0.035, MinRarity: "Raro", MaxRarity: "Lendário"},

	// ─── TIER 3 (Rogartes) ───
	"rogartes_dementor":      {Items: []string{"Espada de Aço", "Elmo Rúnico"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"rogartes_troll":         {Items: []string{"Escudo de Batalha", "Grevas de Aço", "Botas de Ferro"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"rogartes_boss_darkmage": {Items: []string{"Cetro do Esquelético", "Peitoral de Platina", "Bolsa Rúnica", "Livro: Bola de Fogo"}, DropChance: 0.035, MinRarity: "Raro", MaxRarity: "Lendário"},

	// ─── TIER 4 (Frozen) ───
	"frozen_specter":     {Items: []string{"Orbe Protetor", "Coroa de Ouro"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"frozen_zombie":      {Items: []string{"Botas de Aço Rúnico"}, DropChance: 0.00, MinRarity: "Comum", MaxRarity: "Lendário"},
	"frozen_golem":       {Items: []string{"Marreta Biônica", "Robe Místico"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"frozen_chimera":     {Items: []string{"Arco dos Ventos", "Flechas Incendiárias"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"frozen_boss_master": {Items: []string{"Katana da Fúria", "Varinha das Relíquias", "Botas de Aço Rúnico", "Saiote dos Magos", "Amuleto Dragônico", "Mochila Dragônica", "Livro: Estilhaço de Gelo"}, DropChance: 0.035, MinRarity: "Épico", MaxRarity: "Lendário"},

	// ─── TIER 5 (Abyss) ───
	"abyss_dragon":       {Items: []string{"Lâmina de Greiscu", "Amuleto do Zodíaco"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"abyss_demon":        {Items: []string{"Machado de Guerra Mítico", "Armadura de Ouro"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"abyss_vampire":      {Items: []string{"Cajado da Eternidade"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"abyss_necromancer":  {Items: []string{"Elmo do Zodíaco"}, DropChance: 0.012, MinRarity: "Comum", MaxRarity: "Lendário"},
	"abyss_scorpion":     {Items: []string{"Grevas Celestiais"}, DropChance: 0.00, MinRarity: "Comum", MaxRarity: "Lendário"},
	"abyss_flame_lord":   {Items: []string{"Maça Celestial", "Flechas Divinas"}, DropChance: 0.015, MinRarity: "Comum", MaxRarity: "Lendário"},
	"abyss_boss_avenger": {Items: []string{"Espada Mítica do Vingador", "Arco Apocalíptico", "Grevas Celestiais", "Botas Celestiais", "Escudo do Zodíaco", "Mochila do Zodíaco"}, DropChance: 0.035, MinRarity: "Épico", MaxRarity: "Lendário"},
}

func getLootProfileForMonster(monsterKeyOrName string) MonsterLootProfile {
	profile, exists := MonsterLootProfileMap[monsterKeyOrName]
	if exists {
		return profile
	}
	return MonsterLootProfile{Items: []string{}, DropChance: 0.0, MinRarity: "Comum", MaxRarity: "Lendário"}
}

func lootTableForMonster(monsterName string) ([]string, string) {
	prof := getLootProfileForMonster(monsterName)
	return prof.Items, prof.MaxRarity
}

// RebalanceExistingItem identifica itens JSONB anteriores à Economia V2 sem
// recalcular ou alterar nome, raridade, atributos, efeito, uso ou valor. O nome
// foi mantido para compatibilidade com os pontos de carga existentes.
func RebalanceExistingItem(existing Item) Item {
	if existing.Source == "" {
		existing.Source = ItemSourceLegacyDrop
	}
	return existing
}

// GenerateLootForMonsterWithRand gera loot baseado na tabela canônica do monstro.
func GenerateLootForMonsterWithRand(monsterName string, mobLevel int, r *rand.Rand) *Item {
	if r == nil {
		r = rand.New(rand.NewSource(time.Now().UnixNano()))
	}
	prof := getLootProfileForMonster(monsterName)
	if len(prof.Items) == 0 {
		return nil
	}
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

// RollCombatDirectLoot sorteia drop direto de equipamento e livros de chefes.
// O catálogo de perfis MonsterLootProfileMap define os itens elegíveis e a chance base,
// governando a rolagem, sem probabilidades duplicadas no engine/offline.
func RollCombatDirectLoot(monsterKey string, mobLevel int, isBoss bool, r *rand.Rand) *Item {
	if r == nil {
		r = rand.New(rand.NewSource(time.Now().UnixNano()))
	}
	profile := getLootProfileForMonster(monsterKey)
	if len(profile.Items) == 0 || profile.DropChance <= 0 {
		return nil
	}

	special := make([]string, 0)
	equipment := make([]string, 0)
	for _, keyOrName := range profile.Items {
		template := findLootTemplate(keyOrName)
		if template == nil {
			continue
		}
		if template.ItemKind == ItemKindSkillBook || template.ItemKind == ItemKindConstructionManual || template.ItemKind == ItemKindQuest || template.Slot == SlotSkillBook || template.Slot == SlotManual {
			special = append(special, keyOrName)
		} else {
			equipment = append(equipment, keyOrName)
		}
	}

	policy := CurrentEconomyPolicy()
	chosen := ""
	if isBoss && len(special) > 0 && r.Float64() < 0.018 {
		// Livros de habilidade e manuais de construção: 1.8% de chance rara
		chosen = special[r.Intn(len(special))]
	} else if isBoss && len(equipment) > 0 && r.Float64() < profile.DropChance*policy.BossArtifactDropMultiplier {
		// Equipamentos raros/lendários de chefe: 3.5% de chance
		chosen = equipment[r.Intn(len(equipment))]
	} else if !isBoss && len(equipment) > 0 && r.Float64() < profile.DropChance*policy.CommonEquipmentDropMultiplier {
		// Equipamentos de monstros comuns: 0.8% a 1.5% de chance
		chosen = equipment[r.Intn(len(equipment))]
	}
	if chosen == "" {
		return nil
	}
	rarity := rollRarityWithBounds(profile.MinRarity, profile.MaxRarity, r)
	item := GenerateItemFromTemplate(chosen, rarity, r)
	if item != nil {
		item.Source = ItemSourceBossDrop
		if !isBoss {
			item.Source = ItemSourceMonsterDrop
		}
		level := mobLevel
		if level < 1 {
			level = 1
		}
		item.ValueGold += int64(level * item.Tier)
		IncrementTelemetry("direct_equipment_drop_total{source=" + item.Source + "}")
	}
	return item
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
