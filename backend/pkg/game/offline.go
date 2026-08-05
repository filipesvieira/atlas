package game

import (
	"time"
)

type OfflineResult struct {
	MinutesOffline int    `json:"minutes_offline"`
	XPGained       int64  `json:"xp_gained"`
	GoldGained     int64  `json:"gold_gained"`
	ItemsFound     []Item `json:"items_found"`
}

func CalculateOfflineProgress(lastLogout time.Time, playerLevel int, activeRegion string, playerAtk int, playerDef int) OfflineResult {
	if lastLogout.IsZero() || lastLogout.Year() < 2020 {
		return OfflineResult{}
	}

	now := time.Now()
	duration := now.Sub(lastLogout)
	minutes := int(duration.Minutes())

	// Limite máximo de 12 horas (720 minutos) de cálculo offline
	if minutes > 720 {
		minutes = 720
	}

	if minutes < 5 {
		return OfflineResult{}
	}

	// Estatísticas da Região para a Simulação Offline
	avgHP := 80.0
	avgAtk := 15
	avgXP := 50.0
	avgGold := 15.0
	reqDef := 10

	switch activeRegion {
	case "orcruins":
		avgHP = 160.0
		avgAtk = 24
		avgXP = 110.0
		avgGold = 35.0
		reqDef = 22
	case "frozen":
		avgHP = 320.0
		avgAtk = 40
		avgXP = 240.0
		avgGold = 70.0
		reqDef = 45
	case "abyss":
		avgHP = 650.0
		avgAtk = 75
		avgXP = 500.0
		avgGold = 160.0
		reqDef = 85
	}

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

	// 4. Penalidade de Defesa Insuficiente (baseada na média de ataque dos monstros da região)
	if playerDef < reqDef {
		defRatio := float64(playerDef) / float64(reqDef)
		if defRatio < 0.4 {
			defRatio = 0.4
		}
		totalKills *= defRatio
	}
	_ = avgAtk

	if totalKills < 1 {
		totalKills = 1
	}

	xpGained := int64(totalKills * avgXP)
	goldGained := int64(totalKills * avgGold)

	// Rolls de Loot (máximo 10 itens por sessão offline)
	var items []Item
	lootRolls := int(totalKills * 0.05)
	if lootRolls > 10 {
		lootRolls = 10
	}
	for i := 0; i < lootRolls; i++ {
		items = append(items, GenerateProceduralLoot())
	}

	return OfflineResult{
		MinutesOffline: minutes,
		XPGained:       xpGained,
		GoldGained:     goldGained,
		ItemsFound:     items,
	}
}
