package game

import "testing"

func TestPvPRatingDeltaIsSymmetricAtEqualRating(t *testing.T) {
	if got := PvPRatingDelta(1000, 1000, 1); got != 12 {
		t.Fatalf("vitória igual deveria valer +12, recebeu %d", got)
	}
	if got := PvPRatingDelta(1000, 1000, 0); got != -12 {
		t.Fatalf("derrota igual deveria valer -12, recebeu %d", got)
	}
	if got := PvPRatingDelta(1000, 1000, 0.5); got != 0 {
		t.Fatalf("empate igual deveria valer 0, recebeu %d", got)
	}
}
func TestPvPCombatPowerRespondsToBuildStrength(t *testing.T) {
	base := PvPParticipantSnapshot{MaxHealth: 100, MaxMana: 50, DerivedStats: DerivedStats{CurrentDPS: 20, TotalDefense: 10, MovementSpeedMultiplier: 1, CritChance: 5}}
	strong := base
	strong.MaxHealth = 200
	strong.DerivedStats.CurrentDPS = 40
	strong.DerivedStats.TotalDefense = 20
	if PvPCombatPower(strong) <= PvPCombatPower(base) {
		t.Fatal("build mais forte deveria possuir combat power maior")
	}
}
