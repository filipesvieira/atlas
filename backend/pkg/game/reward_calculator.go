package game

import (
	"math"
)

// RNG define a interface abstrata de aleatoriedade para garantir determinismo e testes puros.
type RNG interface {
	Intn(n int) int
	Float64() float64
}

// CalculateKillGold calcula a quantidade de ouro concedida por um monstro derrotado,
// aplicando multiplicadores para chefes e bônus de equipamentos/atributos.
func CalculateKillGold(isBoss bool, goldBonusPct float64, rng RNG) int64 {
	baseGold := 15.0
	if rng != nil {
		if isBoss {
			baseGold = float64(80 + rng.Intn(120))
		} else {
			baseGold = float64(15 + rng.Intn(25))
		}
	} else {
		if isBoss {
			baseGold = 140.0
		} else {
			baseGold = 27.5
		}
	}

	multiplier := 1.0 + (goldBonusPct / 100.0)
	if multiplier < 1.0 {
		multiplier = 1.0
	}
	return int64(math.Round(baseGold * multiplier))
}

// ApplyExperienceGain adiciona experiência ao personagem e processa todos os level-ups
// acumulados de forma determinística, distribuindo pontos de atributos e restaurando HP/Mana.
func ApplyExperienceGain(char *CharacterData, xpGained int64) (bool, int, int) {
	if char == nil || xpGained <= 0 {
		return false, 0, 0
	}
	if char.Level < 1 || char.Experience < 0 {
		return false, 0, 0
	}
	const maxInt64Value int64 = 1<<63 - 1
	if char.Experience > maxInt64Value-xpGained {
		char.Experience = maxInt64Value
	} else {
		char.Experience += xpGained
	}
	if char.LifetimeExperience > maxInt64Value-xpGained {
		char.LifetimeExperience = maxInt64Value
	} else {
		char.LifetimeExperience += xpGained
	}
	initialLevel := char.Level
	leveledUp := false
	statPointsGained := 0

	for char.Level < MaxCharacterLevel && char.Experience >= GetRequiredXPForLevel(char.Level) {
		char.Experience -= GetRequiredXPForLevel(char.Level)
		char.Level++
		char.UnspentPoints += 3
		statPointsGained += 3
		leveledUp = true
	}

	if leveledUp {
		char.Health = char.MaxHealth
		char.Mana = char.MaxMana
		EnsureUnlockedRegionsForLevel(char)
	}
	// Também cobre progressão offline e personagens que cruzam o marco em um
	// ganho grande de experiência. A operação é idempotente para saves antigos.
	UnlockInitialCombatSkills(char)
	// A revisão é incrementada atomicamente pelo repositório ao persistir este
	// snapshot. O domínio não antecipa a versão esperada.
	if char.HighestLevelEver < char.Level {
		char.HighestLevelEver = char.Level
	}
	RefreshProgressionView(char)

	return leveledUp, char.Level - initialLevel, statPointsGained
}