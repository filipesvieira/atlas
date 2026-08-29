package game

import "testing"

func TestPvPRankTierRequiresPlacements(t *testing.T) {
	if got := PvPRankTier(1900, 4); got.Key != "placement" {
		t.Fatalf("antes de %d partidas deveria estar em placement, recebeu %s", PvPRankedPlacementsRequired, got.Key)
	}
	cases := []struct {
		rating int
		want   string
	}{{900, "bronze"}, {1000, "silver"}, {1250, "gold"}, {1450, "platinum"}, {1650, "diamond"}, {1850, "master"}}
	for _, tc := range cases {
		if got := PvPRankTier(tc.rating, 5); got.Key != tc.want {
			t.Fatalf("rating %d => %s, esperado %s", tc.rating, got.Key, tc.want)
		}
	}
}

func TestPvPRepeatOpponentMultiplierDecays(t *testing.T) {
	wants := []float64{1, 1, .75, .5, .25, 0, 0}
	for n, want := range wants {
		if got := PvPRepeatOpponentMultiplier(n); got != want {
			t.Fatalf("repetições=%d multiplicador=%v esperado=%v", n, got, want)
		}
	}
}

func TestPvPSoftResetRatingMovesTowardDefault(t *testing.T) {
	if got := PvPSoftResetRating(1400); got != 1200 {
		t.Fatalf("reset 1400=%d", got)
	}
	if got := PvPSoftResetRating(800); got != 900 {
		t.Fatalf("reset 800=%d", got)
	}
}

func TestPvPHonorAwardUsesRepeatMultiplier(t *testing.T) {
	if got := PvPHonorAward("win", .5); got != 15 {
		t.Fatalf("honra win=%d", got)
	}
	if got := PvPHonorAward("loss", 0); got != 0 {
		t.Fatalf("honra bloqueada=%d", got)
	}
}

func TestPvPRankedRatingDeltaCanBeNeutralizedByAntiRepeat(t *testing.T) {
	if got := PvPRankedRatingDelta(1000, 1000, 1, 0); got != 0 {
		t.Fatalf("anti-repeat 0 deveria bloquear rating, recebeu %d", got)
	}
	if got := PvPRankedRatingDelta(1000, 1000, 1, 1); got != 12 {
		t.Fatalf("vitória equilibrada deveria valer +12, recebeu %d", got)
	}
}

func TestPvPSeasonRewardBundleGrowsWithTier(t *testing.T) {
	gold := PvPSeasonRewardBundle(2, PvPRankTier(1250, 5))
	if gold["title_key"] == "" || gold["banner_key"] == "" {
		t.Fatalf("ouro deveria liberar título e banner: %+v", gold)
	}
	platinum := PvPSeasonRewardBundle(2, PvPRankTier(1450, 5))
	if platinum["cosmetic_key"] == "" {
		t.Fatalf("platina deveria liberar cosmético sazonal: %+v", platinum)
	}
}
