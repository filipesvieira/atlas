package main

import (
	"encoding/csv"
	"fmt"
	"math/rand"
	"os"
	"strconv"

	"github.com/atlas/backend/pkg/game"
)

func main() {
	writer := csv.NewWriter(os.Stdout)
	defer writer.Flush()
	_ = writer.Write([]string{"item", "slot", "weapon_type", "required_level", "tier", "rarity", "attack", "magic_attack", "defense", "bonus_hp", "bonus_mp", "melee_power", "ranged_power", "magic_power", "crit", "lifesteal", "gold_bonus", "weight", "item_power", "value_gold"})

	rarities := []string{"Comum", "Incomum", "Raro", "Épico", "Lendário"}
	for templateIndex, template := range game.ListLootTemplates() {
		if template.Slot == game.SlotSkillBook {
			continue
		}
		for rarityIndex, rarity := range rarities {
			rng := rand.New(rand.NewSource(int64(1000 + templateIndex*10 + rarityIndex)))
			item := game.GenerateItemFromTemplate(template.Name, rarity, rng)
			if item == nil {
				continue
			}
			_ = writer.Write([]string{
				item.Name, item.SlotType, item.WeaponType,
				strconv.Itoa(item.RequiredLevel), strconv.Itoa(item.Tier), item.Rarity,
				strconv.Itoa(item.PhysicalAttack), strconv.Itoa(item.MagicAttack), strconv.Itoa(item.Defense),
				strconv.Itoa(item.BonusHP), strconv.Itoa(item.BonusMP), strconv.Itoa(item.MeleePowerBonus), strconv.Itoa(item.RangedPowerBonus), strconv.Itoa(item.MagicPowerBonus),
				fmt.Sprintf("%.1f", item.CritChance), fmt.Sprintf("%.1f", item.Lifesteal), fmt.Sprintf("%.1f", item.GoldBonus), fmt.Sprintf("%.1f", item.Weight),
				strconv.Itoa(item.ItemPower), strconv.FormatInt(item.ValueGold, 10),
			})
		}
	}
	if err := writer.Error(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
