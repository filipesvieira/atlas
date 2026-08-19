package game

import (
	"hash/fnv"
	"math"
	"math/rand"
	"sort"
	"time"
)

func DeterministicSeed(parts ...string) int64 {
	hasher := fnv.New64a()
	for _, part := range parts {
		_, _ = hasher.Write([]byte(part))
		_, _ = hasher.Write([]byte{0})
	}
	return int64(hasher.Sum64())
}

func CalculateGatheringResult(activity GatheringActivity, now time.Time) GatheringResult {
	result := GatheringResult{ActivityID: activity.ID, ResidentID: activity.ResidentID, ResidentName: activity.ResidentName, ExpeditionKey: activity.ExpeditionKey, ProfessionKey: activity.ProfessionKey, Rewards: []ResourceAmount{}, ProfessionBefore: activity.Snapshot.ProfessionLevel}
	definition := activity.Snapshot.ExpeditionSnapshot
	exists := definition.Key != ""
	if !exists {
		// Compatibilidade com ordens criadas antes do snapshot integral.
		definition, exists = GetGatheringExpedition(activity.ExpeditionKey)
	}
	if !exists || len(definition.Nodes) == 0 {
		return result
	}
	end := now
	if end.After(activity.EndsAt) {
		end = activity.EndsAt
	}
	if end.Before(activity.StartedAt) {
		end = activity.StartedAt
	}
	elapsed := end.Sub(activity.StartedAt).Seconds()
	if elapsed <= 0 {
		return result
	}
	rng := rand.New(rand.NewSource(activity.Snapshot.Seed))
	weights := 0
	for _, node := range definition.Nodes {
		weights += node.Weight
	}
	resourceTotals := map[string]int64{}
	remaining := elapsed
	for remaining > 0 {
		roll := rng.Intn(weights)
		selected := definition.Nodes[0]
		cursor := 0
		for _, node := range definition.Nodes {
			cursor += node.Weight
			if roll < cursor {
				selected = node
				break
			}
		}
		cycleSeconds := float64(selected.CycleSeconds)
		bonus := math.Max(0, math.Min(75, activity.Snapshot.CampBonusPercent))
		cycleSeconds *= 1 - bonus/100
		if cycleSeconds < 15 {
			cycleSeconds = 15
		}
		if remaining < cycleSeconds {
			break
		}
		remaining -= cycleSeconds
		result.CompletedCycles++
		xpMultiplier := ProfessionXPMultiplier(activity.Snapshot.ProfessionLevel, definition.RequiredProfessionLevel)
		result.ProfessionXP += int64(math.Round(float64(selected.ProfessionXP) * xpMultiplier))
		for _, reward := range selected.Rewards {
			if reward.Chance < 1 && rng.Float64() >= reward.Chance {
				continue
			}
			quantity := reward.MinQuantity
			if reward.MaxQuantity > reward.MinQuantity {
				quantity += int64(rng.Intn(int(reward.MaxQuantity - reward.MinQuantity + 1)))
			}
			resourceTotals[reward.ResourceKey] += quantity
		}
	}
	keys := make([]string, 0, len(resourceTotals))
	for key := range resourceTotals {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		result.Rewards = append(result.Rewards, ResourceAmount{Key: key, Quantity: resourceTotals[key]})
	}
	progress := ApplyProfessionExperience(ProfessionProgress{ProfessionKey: activity.ProfessionKey, Level: activity.Snapshot.ProfessionLevel}, result.ProfessionXP)
	result.ProfessionAfter = progress.Level
	return result
}
