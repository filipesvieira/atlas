package game

import (
	"math/rand"
	"time"
)

type OfflineResult struct {
	MinutesOffline int    `json:"minutes_offline"`
	XPGained       int64  `json:"xp_gained"`
	GoldGained     int64  `json:"gold_gained"`
	ItemsFound     []Item `json:"items_found"`
}

func CalculateOfflineProgress(isExpeditionActive bool, lastLogout time.Time, playerLevel int, activeRegion string, playerAtk int, playerDef int) OfflineResult {
	if !isExpeditionActive || lastLogout.IsZero() || lastLogout.Year() < 2020 {
		return OfflineResult{}
	}

	now := time.Now()
	duration := now.Sub(lastLogout)
	minutes := int(duration.Minutes())

	// Limite máximo de 12 horas (720 minutos) de cálculo offline
	if minutes > 720 {
		minutes = 720
	}

	// Mínimo de 3 minutos para registrar expedição offline
	if minutes < 3 {
		return OfflineResult{}
	}

	// Buscar estatísticas dinâmicas da região
	reg, exists := ExpeditionRegions[activeRegion]
	if !exists {
		reg = ExpeditionRegions["forest"]
	}

	totalHP := 0
	totalAtk := 0
	for _, m := range reg.Monsters {
		totalHP += m.Health
		totalAtk += m.Attack
	}
	mCount := float64(len(reg.Monsters))
	if mCount == 0 {
		mCount = 1
	}

	avgHP := float64(totalHP) / mCount
	avgAtk := float64(totalAtk) / mCount
	reqDef := int(avgAtk * 0.7)

	avgXP := float64(25 + (reg.Tier * 35) + (playerLevel * 5))
	avgGold := float64(10 + (reg.Tier * 15) + (playerLevel * 2))

	// 1. DPS do Jogador
	dps := float64(playerAtk) / 0.75
	if dps < 10 {
		dps = 10
	}

	// 2. Tempo por abate em segundos (HP / DPS + 2s de busca)
	timePerKill := (avgHP / dps) + 2.0

	// 3. Total de Abates
	totalSeconds := float64(minutes * 60)
	totalKills := totalSeconds / timePerKill

	// 4. Penalidade de Defesa Insuficiente
	if playerDef < reqDef {
		defRatio := float64(playerDef) / float64(reqDef)
		if defRatio < 0.4 {
			defRatio = 0.4
		}
		totalKills *= defRatio
	}

	if totalKills < 1 {
		totalKills = 1
	}

	xpGained := int64(totalKills * avgXP)
	goldGained := int64(totalKills * avgGold)

	// Rolls de Loot baseados nos monstros da região (máximo 10 itens por sessão offline)
	var items []Item
	lootRolls := int(totalKills * 0.05)
	if lootRolls > 10 {
		lootRolls = 10
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := 0; i < lootRolls; i++ {
		mobTemplate := reg.Monsters[r.Intn(len(reg.Monsters))]
		itemPtr := GenerateLootForMonster(mobTemplate.Name, playerLevel)
		if itemPtr != nil {
			items = append(items, *itemPtr)
		}
	}

	return OfflineResult{
		MinutesOffline: minutes,
		XPGained:       xpGained,
		GoldGained:     goldGained,
		ItemsFound:     items,
	}
}
