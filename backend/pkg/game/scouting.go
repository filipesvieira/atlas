package game

import (
	"crypto/sha256"
	"encoding/binary"
	"math"
	"time"
)

const (
	SettlementScoutingRulesVersion   = 1
	SettlementScoutingReportTTL      = 6 * time.Hour
	SettlementScoutingBaseCost       = int64(2_000)
	SettlementScoutingCostPerTile    = int64(500)
	SettlementScoutingBaseSeconds    = int64(120)
	SettlementScoutingSecondsPerTile = int64(30)
)

const (
	ScoutingMissionActive    = "active"
	ScoutingMissionCompleted = "completed"
)

type ScoutingNumericEstimate struct {
	Min int `json:"min"`
	Max int `json:"max"`
}

type SettlementScoutingMission struct {
	ID                  string     `json:"id"`
	TargetSettlementID  string     `json:"target_settlement_id"`
	TargetName          string     `json:"target_name"`
	TargetStageKey      string     `json:"target_stage_key"`
	TargetX             int        `json:"target_x"`
	TargetY             int        `json:"target_y"`
	Distance            float64    `json:"distance"`
	State               string     `json:"state"`
	GoldCost            int64      `json:"gold_cost"`
	TrackerLevel        int        `json:"tracker_level"`
	CoordinationPercent int        `json:"coordination_percent"`
	StartedAt           time.Time  `json:"started_at"`
	CompletesAt         time.Time  `json:"completes_at"`
	CompletedAt         *time.Time `json:"completed_at,omitempty"`
}

type SettlementScoutingReport struct {
	MissionID            string                  `json:"mission_id"`
	TargetSettlementID   string                  `json:"target_settlement_id"`
	TargetName           string                  `json:"target_name"`
	TargetStageKey       string                  `json:"target_stage_key"`
	TargetX              int                     `json:"target_x"`
	TargetY              int                     `json:"target_y"`
	Distance             float64                 `json:"distance"`
	Quality              int                     `json:"quality"`
	ConfidenceKey        string                  `json:"confidence_key"`
	DefensePower         ScoutingNumericEstimate `json:"defense_power"`
	WallLevel            ScoutingNumericEstimate `json:"wall_level"`
	WatchtowerLevel      ScoutingNumericEstimate `json:"watchtower_level"`
	Garrison             ScoutingNumericEstimate `json:"garrison"`
	ResonatorPresence    string                  `json:"resonator_presence"`
	StorageExposureKey   string                  `json:"storage_exposure_key"`
	TreasuryExposureKey  string                  `json:"treasury_exposure_key"`
	Detected             bool                    `json:"detected"`
	GeneratedAt          time.Time               `json:"generated_at"`
	ExpiresAt            time.Time               `json:"expires_at"`
	DefenderSnapshotHash string                  `json:"-"`
}

type SettlementScoutingAlert struct {
	MissionID        string    `json:"mission_id"`
	DetectedAt       time.Time `json:"detected_at"`
	SourceIdentified bool      `json:"source_identified"`
	SourceName       string    `json:"source_name,omitempty"`
	SourceX          int       `json:"source_x,omitempty"`
	SourceY          int       `json:"source_y,omitempty"`
	DetectionPercent int       `json:"detection_percent"`
}

type SettlementScoutingState struct {
	RulesVersion int                         `json:"rules_version"`
	Unlocked     bool                        `json:"unlocked"`
	Slots        int                         `json:"slots"`
	TrackerLevel int                         `json:"tracker_level"`
	Coordination int                         `json:"coordination_percent"`
	Active       []SettlementScoutingMission `json:"active"`
	Reports      []SettlementScoutingReport  `json:"reports"`
	Alerts       []SettlementScoutingAlert   `json:"alerts"`
	GeneratedAt  time.Time                   `json:"generated_at"`
}

func ScoutingSlotsForWarRoom(level int) int {
	if level < 1 {
		return 0
	}
	if level > 3 {
		return 3
	}
	return level
}

func SettlementScoutingUnlocked(stageKey string, warRoomLevel int) bool {
	return SettlementStageIndex(stageKey) >= SettlementStageIndex(SettlementStageCity) && warRoomLevel >= 1
}

func ScoutingCoordinationForLevels(levels map[string]int) int {
	if levels == nil {
		return 0
	}
	return clampPercent(buildingEffectValue("war_room", levels["war_room"], "scouting_coordination_percent"))
}

func ScoutingDetectionForLevels(levels map[string]int) int {
	if levels == nil {
		return 0
	}
	watch := buildingEffectValue("watchtower", levels["watchtower"], "watchtower_detection_percent")
	command := buildingEffectValue("war_room", levels["war_room"], "war_room_command_percent")
	return clampPercent(watch + command/2)
}

func CalculateScoutingGoldCost(distance float64) int64 {
	if distance < 0 {
		distance = 0
	}
	return SettlementScoutingBaseCost + int64(math.Ceil(distance))*SettlementScoutingCostPerTile
}

func CalculateScoutingDuration(distance float64, trackerLevel, coordinationPercent int) time.Duration {
	if distance < 0 {
		distance = 0
	}
	if trackerLevel < 1 {
		trackerLevel = 1
	}
	if trackerLevel > MaxProfessionLevel {
		trackerLevel = MaxProfessionLevel
	}
	coordinationPercent = clampPercent(coordinationPercent)
	baseSeconds := SettlementScoutingBaseSeconds + int64(math.Ceil(distance))*SettlementScoutingSecondsPerTile
	trackerReduction := min(20, trackerLevel/2)
	totalReduction := min(40, coordinationPercent+trackerReduction)
	seconds := int64(math.Ceil(float64(baseSeconds) * float64(100-totalReduction) / 100))
	if seconds < 60 {
		seconds = 60
	}
	return time.Duration(seconds) * time.Second
}

func CalculateScoutingQuality(distance float64, trackerLevel, coordinationPercent, defenderDetectionPercent int) int {
	if distance < 0 {
		distance = 0
	}
	if trackerLevel < 1 {
		trackerLevel = 1
	}
	if trackerLevel > MaxProfessionLevel {
		trackerLevel = MaxProfessionLevel
	}
	coordinationPercent = clampPercent(coordinationPercent)
	defenderDetectionPercent = clampPercent(defenderDetectionPercent)
	quality := 38 + trackerLevel + coordinationPercent - int(math.Round(distance*1.15)) - defenderDetectionPercent/2
	if quality < 15 {
		return 15
	}
	if quality > 95 {
		return 95
	}
	return quality
}

func ScoutingConfidenceKey(quality int) string {
	switch {
	case quality >= 80:
		return "high"
	case quality >= 55:
		return "medium"
	default:
		return "low"
	}
}

func CalculateScoutingDetectionChance(trackerLevel, coordinationPercent, defenderDetectionPercent int) int {
	if trackerLevel < 1 {
		trackerLevel = 1
	}
	if trackerLevel > MaxProfessionLevel {
		trackerLevel = MaxProfessionLevel
	}
	coordinationPercent = clampPercent(coordinationPercent)
	defenderDetectionPercent = clampPercent(defenderDetectionPercent)
	chance := 8 + defenderDetectionPercent - coordinationPercent - trackerLevel/3
	if chance < 5 {
		return 5
	}
	if chance > 85 {
		return 85
	}
	return chance
}

func DeterministicScoutingDetected(seed string, chancePercent int) bool {
	if chancePercent <= 0 {
		return false
	}
	if chancePercent >= 100 {
		return true
	}
	hash := sha256.Sum256([]byte(seed))
	roll := int(binary.BigEndian.Uint32(hash[:4]) % 100)
	return roll < chancePercent
}

func ScoutingEstimate(actual, quality, absoluteMax int) ScoutingNumericEstimate {
	if actual < 0 {
		actual = 0
	}
	if absoluteMax < actual {
		absoluteMax = actual
	}
	quality = clampPercent(quality)
	errorPercent := 42 - quality/3
	if errorPercent < 8 {
		errorPercent = 8
	}
	spread := int(math.Ceil(float64(max(1, actual)) * float64(errorPercent) / 100))
	if actual <= 3 {
		spread = max(1, int(math.Ceil(float64(100-quality)/35)))
	}
	minValue := max(0, actual-spread)
	maxValue := actual + spread
	if absoluteMax > 0 {
		maxValue = min(maxValue, absoluteMax)
	}
	return ScoutingNumericEstimate{Min: minValue, Max: maxValue}
}

func ScoutingExposureBand(amount int64) string {
	switch {
	case amount <= 0:
		return "none"
	case amount < 500:
		return "low"
	case amount < 2_500:
		return "moderate"
	case amount < 10_000:
		return "high"
	default:
		return "very_high"
	}
}

func ScoutingTreasuryExposureBand(amount int64) string {
	switch {
	case amount <= 0:
		return "none"
	case amount < 5_000:
		return "low"
	case amount < 25_000:
		return "moderate"
	case amount < 100_000:
		return "high"
	default:
		return "very_high"
	}
}
