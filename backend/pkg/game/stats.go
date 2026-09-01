package game

import "math"

const (
	// BaseHeroMovementSpeedMultiplier representa 100% da velocidade natural do
	// herói. Bônus de botas são somados sobre este valor.
	BaseHeroMovementSpeedMultiplier  = 1.5
	MaxHeroMovementSpeedMultiplier   = 2.5
	ManualHeroControlSpeedMultiplier = 2.5

	// S1: sobrevivência, recursos e carga passam a crescer com o nível em vez de
	// depender de uma distribuição manual de atributos primários.
	HeroBaseHealth       = 225
	HeroHealthPerLevel   = 35
	HeroBaseMana         = 90
	HeroManaPerLevel     = 12
	HeroBaseCapacity     = 1100
	HeroCapacityPerLevel = 20
)

// DerivedStats contém apenas grandezas que têm significado direto para o
// jogador. STR/DEX/INT/VIT foram retirados deste contrato na S1.
type DerivedStats struct {
	TotalAttack             int     `json:"total_attack"`
	TotalDefense            int     `json:"total_defense"`
	MaxHealth               int     `json:"max_health"`
	MaxMana                 int     `json:"max_mana"`
	TotalCapacity           int     `json:"total_capacity"`
	MaxSlots                int     `json:"max_slots"`
	CritChance              float64 `json:"crit_chance"`
	ManaRegenPerSecond      float64 `json:"mana_regen_per_second"`
	CurrentDPS              int     `json:"current_dps"`
	SpeedMultiplier         float64 `json:"speed_multiplier"`
	MovementSpeedMultiplier float64 `json:"movement_speed_multiplier"`
	PrimaryArchetype        string  `json:"primary_archetype"`
	AttackSpeedSeconds      float64 `json:"attack_speed_seconds"`
	AttackSpeedBonus        float64 `json:"attack_speed_bonus"`
	ActiveMasteryKey        string  `json:"active_mastery_key"`
	ActiveMasteryLevel      int     `json:"active_mastery_level"`
	MeleePowerBonus         int     `json:"melee_power_bonus"`
	RangedPowerBonus        int     `json:"ranged_power_bonus"`
	MagicPowerBonus         int     `json:"magic_power_bonus"`
}

func masteryForWeapon(char *CharacterData, weaponType string) (string, int) {
	if char == nil {
		return "sword", 10
	}
	switch weaponType {
	case WeaponTypeAxe:
		return "axe", GetMasteryLevel(char.Masteries.AxeMastery)
	case WeaponTypeClub:
		return "club", GetMasteryLevel(char.Masteries.ClubMastery)
	case WeaponTypeBow:
		return "distance", GetMasteryLevel(char.Masteries.DistanceMastery)
	case WeaponTypeWand:
		return "magic", GetMasteryLevel(char.Masteries.MagicMastery)
	default:
		return "sword", GetMasteryLevel(char.Masteries.SwordMastery)
	}
}

func masteryDamageMultiplier(level int) float64 {
	progress := math.Max(0, float64(level-10))
	return 1.0 + math.Min(0.65, progress*0.0125)
}

func masteryAttackSpeedReduction(level int) float64 {
	progress := math.Max(0, float64(level-10))
	return math.Min(0.20, progress*0.004)
}

func distanceMasteryCritBonus(level int) float64 {
	progress := math.Max(0, float64(level-10))
	return math.Min(10.0, progress*0.20)
}

func normalizedEquipmentItem(item *Item) *Item {
	if item == nil {
		return nil
	}
	normalized := RebalanceExistingItem(*item)
	return &normalized
}

// CalculateDerivedStats é a fonte autoritativa da S1. O nível fornece a curva
// básica do herói; equipamento fornece números explícitos; maestria da arma
// equipada fornece especialização por uso.
func CalculateDerivedStats(char *CharacterData, inv *InventoryData, stance string) DerivedStats {
	if char == nil {
		return DerivedStats{
			MaxHealth:               HeroBaseHealth + HeroHealthPerLevel,
			MaxMana:                 HeroBaseMana + HeroManaPerLevel,
			TotalCapacity:           HeroBaseCapacity + HeroCapacityPerLevel,
			MaxSlots:                20,
			CritChance:              5.0,
			ManaRegenPerSecond:      1.57,
			SpeedMultiplier:         1.0,
			MovementSpeedMultiplier: BaseHeroMovementSpeedMultiplier,
			PrimaryArchetype:        "wanderer",
			AttackSpeedSeconds:      2.40,
			ActiveMasteryKey:        "sword",
			ActiveMasteryLevel:      10,
		}
	}

	level := max(1, char.Level)
	var eq EquipmentSlots
	if inv != nil {
		eq = inv.Equipment
	}
	// Normaliza todos os slots para que saves antigos com +STR/+DEX/+INT sejam
	// interpretados como poder semântico já na primeira leitura S1.
	eq.Head = normalizedEquipmentItem(eq.Head)
	eq.Chest = normalizedEquipmentItem(eq.Chest)
	eq.Legs = normalizedEquipmentItem(eq.Legs)
	eq.Boots = normalizedEquipmentItem(eq.Boots)
	eq.MainHand = normalizedEquipmentItem(eq.MainHand)
	eq.OffHand = normalizedEquipmentItem(eq.OffHand)
	eq.Necklace = normalizedEquipmentItem(eq.Necklace)
	eq.Ring = normalizedEquipmentItem(eq.Ring)
	eq.Ammo = normalizedEquipmentItem(eq.Ammo)
	eq.Bag = normalizedEquipmentItem(eq.Bag)

	bonusHP, bonusMP, bonusDefense, itemManaRegen := 0, 0, 0, 0
	meleePower, rangedPower, magicPower := 0, 0, 0
	extraCritChance := 0.0
	attackSpeedBonus := 0.0
	equippedList := []*Item{eq.Head, eq.Chest, eq.Legs, eq.Boots, eq.MainHand, eq.OffHand, eq.Necklace, eq.Ring, eq.Ammo, eq.Bag}
	for _, item := range equippedList {
		if item == nil {
			continue
		}
		meleePower += item.MeleePowerBonus
		rangedPower += item.RangedPowerBonus
		magicPower += item.MagicPowerBonus
		bonusHP += item.BonusHP
		bonusMP += item.BonusMP
		bonusDefense += item.Defense
		extraCritChance += item.CritChance
		itemManaRegen += item.ManaRegen
		// AttackSpeedBonus já é semântico e fica reservado para conteúdo futuro;
		// itens atuais não precisam recebê-lo artificialmente ao migrar DEX.
	}

	movementSpeedMultiplier := BaseHeroMovementSpeedMultiplier
	if eq.Boots != nil && eq.Boots.MovementSpeedBonus > 0 {
		movementSpeedMultiplier += eq.Boots.MovementSpeedBonus / 100.0
	}
	movementSpeedMultiplier = math.Max(BaseHeroMovementSpeedMultiplier, math.Min(MaxHeroMovementSpeedMultiplier, movementSpeedMultiplier))

	maxHealth := HeroBaseHealth + level*HeroHealthPerLevel + bonusHP
	maxMana := HeroBaseMana + level*HeroManaPerLevel + bonusMP

	bagCapBonus, bagSlotsBonus := 0, 0
	if eq.Bag != nil {
		switch eq.Bag.Rarity {
		case "Comum":
			bagCapBonus, bagSlotsBonus = 200, 4
		case "Incomum":
			bagCapBonus, bagSlotsBonus = 350, 6
		case "Raro":
			bagCapBonus, bagSlotsBonus = 500, 8
		case "Épico":
			bagCapBonus, bagSlotsBonus = 650, 10
		case "Lendário":
			bagCapBonus, bagSlotsBonus = 800, 12
		case "Mítico":
			bagCapBonus, bagSlotsBonus = 1000, 14
		case "Divino":
			bagCapBonus, bagSlotsBonus = 1300, 16
		default:
			bagCapBonus, bagSlotsBonus = 200, 4
		}
	}
	totalCapacity := HeroBaseCapacity + level*HeroCapacityPerLevel + bagCapBonus
	maxSlots := 20 + bagSlotsBonus

	primaryArchetype := "wanderer"
	speedMultiplier := 1.0
	weaponType := WeaponTypeSword
	if eq.MainHand != nil {
		weaponType = GetItemWeaponType(eq.MainHand)
	}
	masteryKey, masteryLevel := masteryForWeapon(char, weaponType)
	masteryMultiplier := masteryDamageMultiplier(masteryLevel)

	totalAtk := 5 + level/3
	if eq.MainHand != nil {
		physical := eq.MainHand.PhysicalAttack
		magic := eq.MainHand.MagicAttack
		if physical == 0 && magic == 0 {
			physical = eq.MainHand.Attack
		}
		switch weaponType {
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
			totalAtk = int(math.Round(math.Max(1, float64(physical+ammoAtk+rangedPower)) * masteryMultiplier))
		case WeaponTypeWand:
			primaryArchetype = "magic"
			speedMultiplier = 1.25
			if magic == 0 {
				magic = eq.MainHand.Attack
			}
			totalAtk = int(math.Round(math.Max(1, float64(magic+magicPower)) * masteryMultiplier))
		default:
			primaryArchetype = "melee"
			speedMultiplier = 1.0
			totalAtk = int(math.Round(math.Max(1, float64(physical+meleePower)) * masteryMultiplier))
		}
	}

	baseAttackSpeed := 2.40
	if eq.MainHand != nil {
		isTwoHanded := eq.MainHand.Hands == 2
		switch weaponType {
		case WeaponTypeBow:
			baseAttackSpeed = 2.10
		case WeaponTypeWand:
			if isTwoHanded {
				baseAttackSpeed = 2.60
			} else {
				baseAttackSpeed = 2.00
			}
		default:
			if isTwoHanded {
				baseAttackSpeed = 2.80
			} else {
				baseAttackSpeed = 2.20
			}
		}
	}
	masterySpeedReduction := masteryAttackSpeedReduction(masteryLevel)
	equipSpeedMultiplier := math.Max(0.50, 1.0-(attackSpeedBonus/100.0))
	attackSpeedSeconds := baseAttackSpeed * (1.0 - masterySpeedReduction) * equipSpeedMultiplier
	attackSpeedSeconds = math.Round(math.Max(0.80, math.Min(4.00, attackSpeedSeconds))*100) / 100

	critChance := 5.0 + extraCritChance
	if primaryArchetype == "distance" {
		critChance += distanceMasteryCritBonus(masteryLevel)
	}
	critChance = math.Round(math.Min(50.0, math.Max(0, critChance))*100) / 100

	levelRegen := (float64(level) / (float64(level) + 60.0)) * 4.0
	manaRegenPerSecond := math.Round((1.5+levelRegen+float64(itemManaRegen))*100) / 100

	// Defesa não depende mais de VIT. Nível dá uma base pequena e equipamento/
	// escudo são responsáveis pela maior parte da proteção.
	totalDef := 5 + level/4 + bonusDefense
	if eq.OffHand != nil && GetItemWeaponType(eq.OffHand) == WeaponTypeShield {
		shieldLevel := GetMasteryLevel(char.Masteries.ShieldMastery)
		if shieldLevel > 10 {
			totalDef += (shieldLevel - 10) / 3
		}
	}

	switch stance {
	case "offensive":
		totalAtk = int(float64(totalAtk) * 1.35)
		totalDef = int(float64(totalDef) * 0.80)
	case "defensive":
		totalDef = int(float64(totalDef) * 1.50)
		totalAtk = int(float64(totalAtk) * 0.75)
	}

	critDamageMultiplier := 1.0 + (critChance/100.0)*0.50
	currentDPS := int(math.Round((float64(totalAtk) / attackSpeedSeconds) * critDamageMultiplier))

	return DerivedStats{
		TotalAttack: totalAtk, TotalDefense: totalDef,
		MaxHealth: maxHealth, MaxMana: maxMana,
		TotalCapacity: totalCapacity, MaxSlots: maxSlots,
		CritChance: critChance, ManaRegenPerSecond: manaRegenPerSecond,
		CurrentDPS: currentDPS, SpeedMultiplier: speedMultiplier,
		MovementSpeedMultiplier: movementSpeedMultiplier,
		PrimaryArchetype:        primaryArchetype,
		AttackSpeedSeconds:      attackSpeedSeconds, AttackSpeedBonus: attackSpeedBonus,
		ActiveMasteryKey: masteryKey, ActiveMasteryLevel: masteryLevel,
		MeleePowerBonus: meleePower, RangedPowerBonus: rangedPower, MagicPowerBonus: magicPower,
	}
}
