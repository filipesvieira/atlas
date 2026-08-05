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
	Defense       int     `json:"defense"`
	Rarity        string  `json:"rarity"`
	Weight        float64 `json:"weight"`
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
	Name       string
	Slot       ItemSlot
	WeaponType string
	BaseAtk    int
	BaseDef    int
	BaseWeight float64
}

var lootTemplates = []LootTemplate{
	// Weapons (MainHand)
	{Name: "Espada do Aprendiz", Slot: SlotMainHand, WeaponType: WeaponTypeSword, BaseAtk: 8, BaseDef: 0, BaseWeight: 15.0},
	{Name: "Sabre de Bronze", Slot: SlotMainHand, WeaponType: WeaponTypeSword, BaseAtk: 11, BaseDef: 1, BaseWeight: 22.0},
	{Name: "Espada de Aço", Slot: SlotMainHand, WeaponType: WeaponTypeSword, BaseAtk: 16, BaseDef: 2, BaseWeight: 35.5},
	{Name: "Katana da Fúria", Slot: SlotMainHand, WeaponType: WeaponTypeSword, BaseAtk: 24, BaseDef: 3, BaseWeight: 28.0},
	{Name: "Lâmina de Greiscu", Slot: SlotMainHand, WeaponType: WeaponTypeSword, BaseAtk: 32, BaseDef: 5, BaseWeight: 42.0},
	{Name: "Espada Mítica do Vingador", Slot: SlotMainHand, WeaponType: WeaponTypeSword, BaseAtk: 55, BaseDef: 10, BaseWeight: 50.0},

	{Name: "Machadinha de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, BaseAtk: 9, BaseDef: 0, BaseWeight: 18.0},
	{Name: "Machado Orc", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, BaseAtk: 17, BaseDef: 0, BaseWeight: 45.0},
	{Name: "Machado de Guerra", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, BaseAtk: 24, BaseDef: 0, BaseWeight: 55.0},
	{Name: "Machado do Urso Ranzinza", Slot: SlotMainHand, WeaponType: WeaponTypeAxe, BaseAtk: 30, BaseDef: 2, BaseWeight: 60.0},

	{Name: "Clava de Madeira", Slot: SlotMainHand, WeaponType: WeaponTypeClub, BaseAtk: 9, BaseDef: 1, BaseWeight: 20.0},
	{Name: "Maça de Batalha", Slot: SlotMainHand, WeaponType: WeaponTypeClub, BaseAtk: 18, BaseDef: 2, BaseWeight: 38.0},
	{Name: "Martelo de Guerra", Slot: SlotMainHand, WeaponType: WeaponTypeClub, BaseAtk: 26, BaseDef: 3, BaseWeight: 58.0},
	{Name: "Marreta Biônica", Slot: SlotMainHand, WeaponType: WeaponTypeClub, BaseAtk: 35, BaseDef: 4, BaseWeight: 45.0},

	{Name: "Arco Curvo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, BaseAtk: 9, BaseDef: 0, BaseWeight: 12.0},
	{Name: "Arco Longo", Slot: SlotMainHand, WeaponType: WeaponTypeBow, BaseAtk: 17, BaseDef: 1, BaseWeight: 22.0},
	{Name: "Arco do Caçador", Slot: SlotMainHand, WeaponType: WeaponTypeBow, BaseAtk: 25, BaseDef: 2, BaseWeight: 26.0},
	{Name: "Arco dos Ventos", Slot: SlotMainHand, WeaponType: WeaponTypeBow, BaseAtk: 42, BaseDef: 4, BaseWeight: 20.0},

	{Name: "Varinha do Aprendiz", Slot: SlotMainHand, WeaponType: WeaponTypeWand, BaseAtk: 10, BaseDef: 0, BaseWeight: 8.0},
	{Name: "Cajado Rúnico", Slot: SlotMainHand, WeaponType: WeaponTypeWand, BaseAtk: 20, BaseDef: 0, BaseWeight: 18.5},
	{Name: "Cetro do Esquelético", Slot: SlotMainHand, WeaponType: WeaponTypeWand, BaseAtk: 30, BaseDef: 2, BaseWeight: 24.0},
	{Name: "Varinha das Relíquias", Slot: SlotMainHand, WeaponType: WeaponTypeWand, BaseAtk: 48, BaseDef: 5, BaseWeight: 16.0},

	// Head (Capacetes / Elmos / Coroas)
	{Name: "Capacete de Couro", Slot: SlotHead, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 4, BaseWeight: 12.0},
	{Name: "Coifa de Prata", Slot: SlotHead, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 8, BaseWeight: 25.0},
	{Name: "Elmo Rúnico", Slot: SlotHead, WeaponType: WeaponTypeNone, BaseAtk: 2, BaseDef: 14, BaseWeight: 32.0},
	{Name: "Coroa de Ouro", Slot: SlotHead, WeaponType: WeaponTypeNone, BaseAtk: 5, BaseDef: 22, BaseWeight: 18.0},

	// Chest (Armaduras / Cotas / Robes)
	{Name: "Túnica de Couro", Slot: SlotChest, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 5, BaseWeight: 25.0},
	{Name: "Cota de Malha", Slot: SlotChest, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 10, BaseWeight: 75.0},
	{Name: "Peitoral de Platina", Slot: SlotChest, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 18, BaseWeight: 110.0},
	{Name: "Robe Místico", Slot: SlotChest, WeaponType: WeaponTypeNone, BaseAtk: 6, BaseDef: 14, BaseWeight: 30.0},
	{Name: "Armadura de Ouro", Slot: SlotChest, WeaponType: WeaponTypeNone, BaseAtk: 8, BaseDef: 30, BaseWeight: 130.0},

	// Legs (Calças / Grevas / Saiotes)
	{Name: "Calça de Couro", Slot: SlotLegs, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 3, BaseWeight: 18.0},
	{Name: "Calça de Tecido", Slot: SlotLegs, WeaponType: WeaponTypeNone, BaseAtk: 1, BaseDef: 2, BaseWeight: 10.0},
	{Name: "Grevas de Aço", Slot: SlotLegs, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 8, BaseWeight: 45.0},
	{Name: "Saiote dos Magos", Slot: SlotLegs, WeaponType: WeaponTypeNone, BaseAtk: 3, BaseDef: 6, BaseWeight: 14.0},

	// Boots (Botas)
	{Name: "Sandálias Ágeis", Slot: SlotBoots, WeaponType: WeaponTypeNone, BaseAtk: 1, BaseDef: 1, BaseWeight: 5.0},
	{Name: "Botas de Couro", Slot: SlotBoots, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 3, BaseWeight: 9.0},
	{Name: "Botas de Ferro", Slot: SlotBoots, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 6, BaseWeight: 22.0},

	// Shields (OffHand)
	{Name: "Broquel de Madeira", Slot: SlotOffHand, WeaponType: WeaponTypeShield, BaseAtk: 0, BaseDef: 6, BaseWeight: 20.0},
	{Name: "Escudo de Madeira", Slot: SlotOffHand, WeaponType: WeaponTypeShield, BaseAtk: 0, BaseDef: 10, BaseWeight: 40.0},
	{Name: "Escudo de Batalha", Slot: SlotOffHand, WeaponType: WeaponTypeShield, BaseAtk: 0, BaseDef: 18, BaseWeight: 75.0},
	{Name: "Orbe Protetor", Slot: SlotOffHand, WeaponType: WeaponTypeShield, BaseAtk: 4, BaseDef: 12, BaseWeight: 10.0},
	{Name: "Escudo do Zodíaco", Slot: SlotOffHand, WeaponType: WeaponTypeShield, BaseAtk: 5, BaseDef: 28, BaseWeight: 80.0},

	// Bags (Backpacks)
	{Name: "Pequena Bolsa", Slot: SlotBag, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 0, BaseWeight: 5.0},
	{Name: "Mochila de Aventureiro", Slot: SlotBag, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 1, BaseWeight: 15.0},
	{Name: "Bolsa Rúnica", Slot: SlotBag, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 2, BaseWeight: 8.0},

	// Ammo
	{Name: "Flechas de Madeira", Slot: SlotAmmo, WeaponType: WeaponTypeNone, BaseAtk: 5, BaseDef: 0, BaseWeight: 1.5},
	{Name: "Virotes Perfurantes", Slot: SlotAmmo, WeaponType: WeaponTypeNone, BaseAtk: 12, BaseDef: 0, BaseWeight: 3.5},
	{Name: "Flechas Incendiárias", Slot: SlotAmmo, WeaponType: WeaponTypeNone, BaseAtk: 18, BaseDef: 0, BaseWeight: 2.0},

	// Necklaces & Rings
	{Name: "Amuleto do Lobo", Slot: SlotNecklace, WeaponType: WeaponTypeNone, BaseAtk: 2, BaseDef: 2, BaseWeight: 1.5},
	{Name: "Colar de Rubi", Slot: SlotNecklace, WeaponType: WeaponTypeNone, BaseAtk: 5, BaseDef: 1, BaseWeight: 1.2},
	{Name: "Anel de Ouro", Slot: SlotRing, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 3, BaseWeight: 0.8},
	{Name: "Anel do Combate", Slot: SlotRing, WeaponType: WeaponTypeNone, BaseAtk: 4, BaseDef: 2, BaseWeight: 0.9},

	// Skill Books
	{Name: "Tome: Golpe Giratório", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 0, BaseWeight: 25.0},
	{Name: "Manual: Tiro Quádruplo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 0, BaseWeight: 18.0},
	{Name: "Livro: Bola de Fogo", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 0, BaseWeight: 22.0},
	{Name: "Livro: Cura Divina", Slot: SlotSkillBook, WeaponType: WeaponTypeNone, BaseAtk: 0, BaseDef: 0, BaseWeight: 20.0},
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
		validNames = []string{"Sabre de Bronze", "Coifa de Prata", "Marreta Biônica", "Manual: Tiro Quádruplo"}
		maxRarity = "Raro"
	} else if strings.Contains(nLower, "orc") {
		validNames = []string{"Machado Orc", "Espada de Aço", "Cota de Malha", "Escudo de Batalha", "Arco Longo"}
		maxRarity = "Raro"
	} else if strings.Contains(nLower, "esqueleto") || strings.Contains(nLower, "esquelético") {
		validNames = []string{"Elmo Rúnico", "Orbe Protetor", "Lâmina de Greiscu", "Cetro do Esquelético", "Livro: Cura Divina"}
		maxRarity = "Raro"
	} else if strings.Contains(nLower, "dementador") || strings.Contains(nLower, "voldemorte") || strings.Contains(nLower, "rogartes") {
		validNames = []string{"Robe Místico", "Cajado Rúnico", "Varinha das Relíquias", "Livro: Bola de Fogo"}
		maxRarity = "Lendário"
	} else if strings.Contains(nLower, "atenas") || strings.Contains(nLower, "santuário") || strings.Contains(nLower, "espectro") {
		validNames = []string{"Escudo do Zodíaco", "Armadura de Ouro", "Arco dos Ventos", "Botas de Ferro"}
		maxRarity = "Lendário"
	} else if strings.Contains(nLower, "dragão") || strings.Contains(nLower, "vingador") || strings.Contains(nLower, "demônio") {
		validNames = []string{"Espada Mítica do Vingador", "Arco dos Ventos", "Flechas Incendiárias", "Machado de Guerra", "Coroa de Ouro"}
		maxRarity = "Lendário"
	} else {
		// Fallback genérico
		validNames = []string{"Espada de Aço", "Escudo de Madeira", "Capacete de Couro", "Mochila de Aventureiro"}
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
			Defense:       0,
			Rarity:        "Raro",
			Weight:        chosenTemplate.BaseWeight,
			SpecialEffect: fmt.Sprintf("Slot: skill_book | Skill: %s", skillKey),
			SlotType:      string(SlotSkillBook),
			Tier:          1,
		}
	}

	// Determinar Raridade (respeitando maxRarity do monstro)
	rarityRoll := r.Float64()
	rarity := "Comum"
	multiplier := 1.0

	if maxRarity == "Lendário" && rarityRoll > 0.85 {
		rarity = "Lendário"
		multiplier = 1.8
	} else if (maxRarity == "Raro" || maxRarity == "Lendário") && rarityRoll > 0.60 {
		rarity = "Raro"
		multiplier = 1.4
	} else if rarityRoll > 0.30 {
		rarity = "Incomum"
		multiplier = 1.2
	}

	atk := int(float64(chosenTemplate.BaseAtk) * multiplier)
	def := int(float64(chosenTemplate.BaseDef) * multiplier)

	return &Item{
		ID:            fmt.Sprintf("item_%d_%d", time.Now().UnixNano(), r.Intn(1000)),
		Name:          chosenTemplate.Name,
		Attack:        atk,
		Defense:       def,
		Rarity:        rarity,
		Weight:        chosenTemplate.BaseWeight,
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
