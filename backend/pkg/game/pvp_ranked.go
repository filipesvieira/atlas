package game

import (
	"fmt"
	"math"
	"time"
)

const (
	PvPRankedPlacementsRequired = 5
	PvPSeasonLength             = 28 * 24 * time.Hour
)

type PvPRankTierInfo struct {
	Key       string `json:"key"`
	Name      string `json:"name"`
	MinRating int    `json:"min_rating"`
	Icon      string `json:"icon"`
	Order     int    `json:"order"`
}

var pvpRankTiers = []PvPRankTierInfo{
	{Key: "bronze", Name: "Bronze", MinRating: 0, Icon: "🥉", Order: 1},
	{Key: "silver", Name: "Prata", MinRating: 1000, Icon: "🥈", Order: 2},
	{Key: "gold", Name: "Ouro", MinRating: 1200, Icon: "🥇", Order: 3},
	{Key: "platinum", Name: "Platina", MinRating: 1400, Icon: "💠", Order: 4},
	{Key: "diamond", Name: "Diamante", MinRating: 1600, Icon: "💎", Order: 5},
	{Key: "master", Name: "Mestre", MinRating: 1800, Icon: "👑", Order: 6},
}

func PvPRankTier(rating, placements int) PvPRankTierInfo {
	if placements < PvPRankedPlacementsRequired {
		return PvPRankTierInfo{Key: "placement", Name: "Posicionamento", MinRating: 0, Icon: "⚔️", Order: 0}
	}
	selected := pvpRankTiers[0]
	for _, tier := range pvpRankTiers {
		if rating >= tier.MinRating {
			selected = tier
		}
	}
	return selected
}

func PvPSoftResetRating(previous int) int {
	if previous <= 0 {
		return PvPDefaultRating
	}
	// Mantém metade da distância em relação a 1000 e evita extremos no início
	// de uma nova temporada.
	reset := PvPDefaultRating + (previous-PvPDefaultRating)/2
	return max(700, min(1500, reset))
}

// PvPRepeatOpponentMultiplier reduz progressivamente rating sazonal e honra
// quando a mesma dupla se enfrenta repetidas vezes em 24h. recentMatches é a
// quantidade de confrontos ranqueados anteriores da dupla dentro da janela.
func PvPRepeatOpponentMultiplier(recentMatches int) float64 {
	switch {
	case recentMatches <= 1:
		return 1.0
	case recentMatches == 2:
		return 0.75
	case recentMatches == 3:
		return 0.50
	case recentMatches == 4:
		return 0.25
	default:
		return 0.0
	}
}

func PvPRankedRatingDelta(ratingA, ratingB int, scoreA, multiplier float64) int {
	base := PvPRatingDelta(ratingA, ratingB, scoreA)
	return int(math.Round(float64(base) * math.Max(0, math.Min(1, multiplier))))
}

func PvPHonorAward(result string, multiplier float64) int {
	base := 0
	switch result {
	case "win":
		base = 30
	case "draw":
		base = 14
	case "loss":
		base = 6
	default:
		return 0
	}
	return max(0, int(math.Round(float64(base)*math.Max(0, math.Min(1, multiplier)))))
}

func PvPSeasonRewardBundle(seasonNumber int, tier PvPRankTierInfo) map[string]string {
	if seasonNumber < 1 || tier.Order <= 0 {
		return nil
	}
	prefix := fmt.Sprintf("arena_s%d_%s", seasonNumber, tier.Key)
	bundle := map[string]string{
		"tier":      tier.Key,
		"tier_name": tier.Name,
		"title_key": prefix + "_title",
	}
	if tier.Order >= 2 {
		bundle["banner_key"] = prefix + "_banner"
	}
	if tier.Order >= 4 {
		bundle["cosmetic_key"] = prefix + "_cosmetic"
	}
	return bundle
}

type PvPSeason struct {
	ID       string     `json:"id"`
	Number   int        `json:"number"`
	Name     string     `json:"name"`
	Status   string     `json:"status"`
	StartsAt time.Time  `json:"starts_at"`
	EndsAt   time.Time  `json:"ends_at"`
	ClosedAt *time.Time `json:"closed_at,omitempty"`
}

type PvPRankedProfile struct {
	SeasonID         string          `json:"season_id"`
	CharacterID      string          `json:"character_id"`
	Rating           int             `json:"rating"`
	PeakRating       int             `json:"peak_rating"`
	Wins             int             `json:"wins"`
	Losses           int             `json:"losses"`
	Draws            int             `json:"draws"`
	PlacementsPlayed int             `json:"placements_played"`
	Honor            int64           `json:"honor"`
	Tier             PvPRankTierInfo `json:"tier"`
}

type PvPSeasonReward struct {
	ID           string            `json:"id"`
	SeasonID     string            `json:"season_id"`
	SeasonNumber int               `json:"season_number"`
	RewardKey    string            `json:"reward_key"`
	RewardType   string            `json:"reward_type"`
	Metadata     map[string]string `json:"metadata"`
	EarnedAt     time.Time         `json:"earned_at"`
	ClaimedAt    *time.Time        `json:"claimed_at,omitempty"`
}

type PvPSeasonStatus struct {
	Season         PvPSeason         `json:"season"`
	Profile        PvPRankedProfile  `json:"profile"`
	PendingRewards []PvPSeasonReward `json:"pending_rewards"`
}

type PvPLadderEntry struct {
	Rank        int             `json:"rank"`
	CharacterID string          `json:"character_id"`
	Name        string          `json:"name"`
	Level       int             `json:"level"`
	Rating      int             `json:"rating"`
	PeakRating  int             `json:"peak_rating"`
	Wins        int             `json:"wins"`
	Losses      int             `json:"losses"`
	Draws       int             `json:"draws"`
	Honor       int64           `json:"honor"`
	Tier        PvPRankTierInfo `json:"tier"`
}
