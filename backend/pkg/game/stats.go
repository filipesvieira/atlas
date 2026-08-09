package game

import (
	"math"
)

// DerivedStats encapsula todas as propriedades de combate calculadas
// de forma autoritativa pelo backend para uso no combate e transmissão à UI.
type DerivedStats struct {
	EffectiveSTR       int     `json:"effective_str"`
	EffectiveDEX       int     `json:"effective_dex"`
	EffectiveINT       int     `json:"effective_int"`
	EffectiveVIT       int     `json:"effective_vit"`
	TotalAttack        int     `json:"total_attack"`
	TotalDefense       int     `json:"total_defense"`
	MaxHealth          int     `json:"max_health"`
	MaxMana            int     `json:"max_mana"`
	TotalCapacity      int     `json:"total_capacity"`
	CritChance         float64 `json:"crit_chance"`
	ManaRegenPerSecond float64 `json:"mana_regen_per_second"`
	CurrentDPS         int     `json:"current_dps"`
	SpeedMultiplier    float64 `json:"speed_multiplier"`
	PrimaryArchetype   string  `json:"primary_archetype"`
}

// CalculateDerivedStats calcula os atributos derivados do aventureiro a partir
// dos atributos primários, equipamentos e posturas táticas.
func CalculateDerivedStats(char *CharacterData, inv *InventoryData, stance string) DerivedStats {
	if char == nil {
		return DerivedStats{
			EffectiveSTR: 5, EffectiveDEX: 5, EffectiveINT: 5, EffectiveVIT: 5,
			MaxHealth: 235, MaxMana: 95, TotalCapacity: 1085,
			CritChance: 5.41, ManaRegenPerSecond: 1.60,
			SpeedMultiplier: 1.0, PrimaryArchetype: "melee",
		}
	}

	rawSTR := char.STR
	if rawSTR <= 0 {
		rawSTR = 5
	}
	rawDEX := char.DEX
	if rawDEX <= 0 {
		rawDEX = 5
	}
	rawINT := char.INT
	if rawINT <= 0 {
		rawINT = 5
	}
	rawVIT := char.VIT
	if rawVIT <= 0 {
		rawVIT = 5
	}

	bonusSTR, bonusDEX, bonusINT, bonusHP, bonusMP := 0, 0, 0, 0, 0
	bonusDefense, itemManaRegen := 0, 0
	extraCritChance := 0.0

	var eq EquipmentSlots
	if inv != nil {
		eq = inv.Equipment
	}

	equippedList := []*Item{
		eq.Head, eq.Chest, eq.Legs, eq.Boots,
		eq.MainHand, eq.OffHand, eq.Necklace, eq.Ring,
		eq.Ammo, eq.Bag,
	}

	for _, item := range equippedList {
		if item != nil {
			bonusSTR += item.BonusSTR
			bonusDEX += item.BonusDEX
			bonusINT += item.BonusINT
			bonusHP += item.BonusHP
			bonusMP += item.BonusMP
			bonusDefense += item.Defense
			extraCritChance += item.CritChance
			itemManaRegen += item.ManaRegen
		}
	}

	effectiveSTR := rawSTR + bonusSTR
	effectiveDEX := rawDEX + bonusDEX
	effectiveINT := rawINT + bonusINT
	effectiveVIT := rawVIT

	// 1. MaxHealth & MaxMana
	maxHealth := 100 + (effectiveVIT * 25) + (char.Level * 10) + bonusHP
	maxMana := 30 + (effectiveINT * 12) + (char.Level * 5) + bonusMP

	// 2. Capacidade Total de Carga (Cap oz)
	// Base de 1000 + Nível*10 + STR*15 + Bônus por Raridade da Mochila
	bagCapBonus := 0
	if eq.Bag != nil {
		switch eq.Bag.Rarity {
		case "Comum":
			bagCapBonus = 200
		case "Incomum":
			bagCapBonus = 350
		case "Raro":
			bagCapBonus = 500
		case "Épico":
			bagCapBonus = 650
		case "Lendário":
			bagCapBonus = 800
		case "Mítico":
			bagCapBonus = 1000
		case "Divino":
			bagCapBonus = 1300
		default:
			bagCapBonus = 300
		}
	}
	totalCapacity := 1000 + (char.Level * 10) + (effectiveSTR * 15) + bagCapBonus

	// 3. Chance de Crítico com Diminishing Returns & Hard Cap de 50%
	// Crit_DEX = (EffectiveDEX / (EffectiveDEX + 300)) * 25.0%
	// Crit_Final = Min(50.0%, 5.0% + Crit_DEX + EquipCrit)
	critDEX := (float64(effectiveDEX) / (float64(effectiveDEX) + 300.0)) * 25.0
	rawCritChance := 5.0 + critDEX + extraCritChance
	critChance := math.Min(50.0, rawCritChance)
	critChance = math.Round(critChance*100) / 100

	// 4. Regeneração de Mana contínua por segundo (MP/s)
	// Regen_INT = (EffectiveINT / (EffectiveINT + 300)) * 6.0 MP/s
	// Regen_Final = 1.5 + Regen_INT + itemManaRegen
	regenINT := (float64(effectiveINT) / (float64(effectiveINT) + 300.0)) * 6.0
	manaRegenPerSecond := 1.5 + regenINT + float64(itemManaRegen)
	manaRegenPerSecond = math.Round(manaRegenPerSecond*100) / 100

	// 5. Arquétipo, Poder Ofensivo (Ataque) & Velocidade de Ataque
	totalAtk := 0
	speedMultiplier := 1.00
	primaryArchetype := "melee"

	if eq.MainHand != nil {
		wType := GetItemWeaponType(eq.MainHand)
		physical := eq.MainHand.PhysicalAttack
		magic := eq.MainHand.MagicAttack
		if physical == 0 && magic == 0 {
			physical = eq.MainHand.Attack
		}

		switch wType {
		case WeaponTypeBow:
			primaryArchetype = "distance"
			speedMultiplier = 1.40
			ammoAtk := 0
			if eq.Ammo != nil {
				ammoAtk = eq.Ammo.PhysicalAttack
				if ammoAtk == 0 && eq.Ammo.MagicAttack == 0 {
					ammoAtk = eq.Ammo.Attack
				}
			}
			baseDmg := math.Max(1, float64(physical+ammoAtk))
			totalAtk = int(baseDmg * (1.0 + (float64(effectiveDEX) / 100.0)))

		case WeaponTypeWand:
			primaryArchetype = "magic"
			speedMultiplier = 1.25
			if magic == 0 {
				magic = eq.MainHand.Attack
			}
			baseDmg := math.Max(1, float64(magic))
			totalAtk = int(baseDmg * (1.0 + (float64(effectiveINT) / 100.0)))

		default:
			primaryArchetype = "melee"
			speedMultiplier = 1.00
			baseDmg := math.Max(1, float64(physical))
			totalAtk = int(baseDmg * (1.0 + (float64(effectiveSTR) / 100.0)))
		}
	} else {
		primaryArchetype = "wanderer"
		speedMultiplier = 1.00
		totalAtk = int(5.0 * (1.0 + (float64(effectiveSTR) / 100.0)))
	}

	// Bônus de Maestria de Arma
	var masteryLevel int
	if eq.MainHand != nil {
		wType := GetItemWeaponType(eq.MainHand)
		switch wType {
		case WeaponTypeAxe:
			masteryLevel = GetMasteryLevel(char.Masteries.AxeMastery)
		case WeaponTypeBow:
			masteryLevel = GetMasteryLevel(char.Masteries.DistanceMastery)
		case WeaponTypeWand:
			masteryLevel = GetMasteryLevel(char.Masteries.MagicMastery)
		case WeaponTypeClub:
			masteryLevel = GetMasteryLevel(char.Masteries.ClubMastery)
		default:
			masteryLevel = GetMasteryLevel(char.Masteries.SwordMastery)
		}
	} else {
		masteryLevel = GetMasteryLevel(char.Masteries.SwordMastery)
	}

	if masteryLevel > 10 {
		totalAtk += (masteryLevel - 10) / 4
	}

	// 6. Defesa Física Total: (VIT * 0.5) + Equipamentos + Escudo
	totalDef := int(float64(effectiveVIT) * 0.5)
	totalDef += bonusDefense

	if eq.OffHand != nil {
		shieldLevel := GetMasteryLevel(char.Masteries.ShieldMastery)
		if shieldLevel > 10 {
			totalDef += (shieldLevel - 10) / 4
		}
	}

	// 7. Modificadores de Postura Tática
	switch stance {
	case "offensive":
		totalAtk = int(float64(totalAtk) * 1.35)
		totalDef = int(float64(totalDef) * 0.80)
	case "defensive":
		totalDef = int(float64(totalDef) * 1.50)
		totalAtk = int(float64(totalAtk) * 0.75)
	}

	// 8. Cálculo de DPS dinâmico
	currentDPS := int((float64(totalAtk) / 0.75) * speedMultiplier)

	return DerivedStats{
		EffectiveSTR:       effectiveSTR,
		EffectiveDEX:       effectiveDEX,
		EffectiveINT:       effectiveINT,
		EffectiveVIT:       effectiveVIT,
		TotalAttack:        totalAtk,
		TotalDefense:       totalDef,
		MaxHealth:          maxHealth,
		MaxMana:            maxMana,
		TotalCapacity:      totalCapacity,
		CritChance:         critChance,
		ManaRegenPerSecond: manaRegenPerSecond,
		CurrentDPS:         currentDPS,
		SpeedMultiplier:    speedMultiplier,
		PrimaryArchetype:   primaryArchetype,
	}
}
