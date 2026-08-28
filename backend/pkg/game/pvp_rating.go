package game

import "math"

const (
	PvPDefaultRating = 1000
	PvPRatingKFactor = 24
)

// PvPCombatPower é um número comparativo de matchmaking, não um atributo de combate.
// Ele usa somente o snapshot já derivado para impedir que o cliente informe o próprio poder.
func PvPCombatPower(participant PvPParticipantSnapshot) int {
	d := participant.DerivedStats
	dps := math.Max(1, float64(d.CurrentDPS))
	ehp := math.Max(1, float64(participant.MaxHealth)*(1.0+float64(d.TotalDefense)*0.012))
	utility := 1.0 + math.Min(0.35, math.Max(0, d.CritChance)/300.0)
	mobility := math.Max(0.8, math.Min(1.6, d.MovementSpeedMultiplier))
	mana := 1.0 + math.Min(0.25, float64(participant.MaxMana)/1200.0)
	power := math.Sqrt(dps*ehp) * utility * math.Sqrt(mobility) * mana
	return max(1, int(math.Round(power)))
}

func PvPRatingDelta(ratingA, ratingB int, scoreA float64) int {
	expectedA := 1.0 / (1.0 + math.Pow(10, float64(ratingB-ratingA)/400.0))
	return int(math.Round(PvPRatingKFactor * (scoreA - expectedA)))
}
