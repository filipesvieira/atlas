package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/atlas/backend/pkg/game"
)

// PvPAdminTelemetry é uma fotografia operacional, deliberadamente agregada,
// para QA e balanceamento. Não inclui inventário, buffs nem snapshots privados
// dos participantes: o painel administrativo deve explicar a saúde do PvP sem
// ampliar a superfície de dados sensíveis.
type PvPAdminTelemetry struct {
	CapturedAt    time.Time                  `json:"captured_at"`
	Queue         PvPAdminQueueTelemetry     `json:"queue"`
	Matches       PvPAdminMatchTelemetry     `json:"matches"`
	Integrity     PvPAdminIntegrityTelemetry `json:"integrity"`
	RecentMatches []PvPAdminRecentMatch      `json:"recent_matches"`
}

type PvPAdminQueueTelemetry struct {
	CasualQueued int `json:"casual_queued"`
	RankedQueued int `json:"ranked_queued"`
}

type PvPAdminMatchTelemetry struct {
	Ready              int `json:"ready"`
	Active             int `json:"active"`
	CompletedLast24h   int `json:"completed_last_24h"`
	RankedLast24h      int `json:"ranked_last_24h"`
	ForfeitsLast24h    int `json:"forfeits_last_24h"`
	DisconnectsLast24h int `json:"disconnects_last_24h"`
	AverageDurationSec int `json:"average_duration_seconds"`
}

type PvPAdminIntegrityTelemetry struct {
	OpenFlags int `json:"open_flags"`
	Critical  int `json:"critical_flags"`
}

type PvPAdminRecentMatch struct {
	ID               string    `json:"id"`
	Participants     string    `json:"participants"`
	Status           string    `json:"status"`
	Origin           string    `json:"origin"`
	Ranked           bool      `json:"ranked"`
	CompletionReason string    `json:"completion_reason"`
	CreatedAt        time.Time `json:"created_at"`
	DurationSeconds  int       `json:"duration_seconds"`
	Disconnects      int       `json:"disconnects"`
	ForfeitRequested bool      `json:"forfeit_requested"`
	WinnerName       string    `json:"winner_name,omitempty"`
}

type PvPAdminMatchDetail struct {
	ID               string                `json:"id"`
	Status           string                `json:"status"`
	Origin           string                `json:"origin"`
	Ranked           bool                  `json:"ranked"`
	CompletionReason string                `json:"completion_reason"`
	WinnerName       string                `json:"winner_name,omitempty"`
	DurationSeconds  int                   `json:"duration_seconds"`
	Participants     []PvPAdminParticipant `json:"participants"`
	Skills           []PvPAdminSkillUsage  `json:"skills"`
	Events           []PvPAdminReplayEvent `json:"events"`
}

type PvPAdminParticipant struct {
	CharacterID string                `json:"character_id"`
	Name        string                `json:"name"`
	Archetype   string                `json:"archetype"`
	Strategy    string                `json:"strategy"`
	CombatPower int                   `json:"combat_power"`
	IsWinner    bool                  `json:"is_winner"`
	Metrics     game.PvPCombatMetrics `json:"metrics"`
}

type PvPAdminSkillUsage struct {
	CharacterID string `json:"character_id"`
	Name        string `json:"name"`
	SkillKey    string `json:"skill_key"`
	Casts       int    `json:"casts"`
}

type PvPAdminReplayEvent struct {
	Sequence   int       `json:"sequence"`
	Kind       string    `json:"kind"`
	SourceName string    `json:"source_name,omitempty"`
	TargetName string    `json:"target_name,omitempty"`
	SkillKey   string    `json:"skill_key,omitempty"`
	Amount     int       `json:"amount,omitempty"`
	Critical   bool      `json:"critical,omitempty"`
	Healing    bool      `json:"healing,omitempty"`
	Tick       uint64    `json:"tick,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// GetPvPAdminTelemetry consulta somente contadores e a lista curta de partidas
// recentes. As queries usam o schema canônico de M4-B e não alteram estado.
func GetPvPAdminTelemetry(now time.Time) (PvPAdminTelemetry, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	out := PvPAdminTelemetry{CapturedAt: now.UTC(), RecentMatches: []PvPAdminRecentMatch{}}

	if err := DB.QueryRow(`
		SELECT
			COUNT(*) FILTER (WHERE queue_mode='casual'),
			COUNT(*) FILTER (WHERE queue_mode='ranked')
		FROM pvp_matchmaking_queue
	`).Scan(&out.Queue.CasualQueued, &out.Queue.RankedQueued); err != nil {
		return out, err
	}

	var average sql.NullFloat64
	if err := DB.QueryRow(`
		SELECT
			COUNT(*) FILTER (WHERE status='ready'),
			COUNT(*) FILTER (WHERE status='active'),
			COUNT(*) FILTER (WHERE status='completed' AND ended_at >= ($1::timestamptz - INTERVAL '24 hours')),
			COUNT(*) FILTER (WHERE status='completed' AND ranked=true AND ended_at >= ($1::timestamptz - INTERVAL '24 hours')),
			COUNT(*) FILTER (WHERE status='completed' AND completion_reason='forfeit' AND ended_at >= ($1::timestamptz - INTERVAL '24 hours')),
			COALESCE((SELECT SUM(disconnect_count) FROM pvp_match_participants participant JOIN pvp_matches m ON m.id=participant.match_id WHERE m.ended_at >= ($1::timestamptz - INTERVAL '24 hours')), 0),
			AVG(EXTRACT(EPOCH FROM (ended_at-started_at))) FILTER (WHERE status='completed' AND ended_at >= ($1::timestamptz - INTERVAL '24 hours') AND started_at IS NOT NULL)
		FROM pvp_matches
	`, now.UTC()).Scan(
		&out.Matches.Ready,
		&out.Matches.Active,
		&out.Matches.CompletedLast24h,
		&out.Matches.RankedLast24h,
		&out.Matches.ForfeitsLast24h,
		&out.Matches.DisconnectsLast24h,
		&average,
	); err != nil {
		return out, err
	}
	if average.Valid {
		out.Matches.AverageDurationSec = int(average.Float64 + 0.5)
	}

	if err := DB.QueryRow(`
		SELECT COUNT(*), COUNT(*) FILTER (WHERE severity >= 4)
		FROM pvp_integrity_flags
		WHERE resolved_at IS NULL
	`).Scan(&out.Integrity.OpenFlags, &out.Integrity.Critical); err != nil {
		return out, err
	}

	rows, err := DB.Query(`
		SELECT
			m.id,
			STRING_AGG(character.name, ' × ' ORDER BY participant.team),
			m.status,
			m.match_origin,
			m.ranked,
			m.completion_reason,
			m.created_at,
			GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(m.ended_at, $1::timestamptz)-COALESCE(m.started_at, m.created_at)))))::int,
			COALESCE(SUM(participant.disconnect_count), 0)::int,
			(m.forfeit_requested_by IS NOT NULL),
			COALESCE(winner.name, '')
		FROM pvp_matches m
		JOIN pvp_match_participants participant ON participant.match_id=m.id
		JOIN characters character ON character.id=participant.character_id
		LEFT JOIN characters winner ON winner.id=NULLIF(m.runtime_state->'snapshot'->>'winner_id','')::uuid
		GROUP BY m.id,winner.name
		ORDER BY m.created_at DESC
		LIMIT 12
	`, now.UTC())
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var match PvPAdminRecentMatch
		if err := rows.Scan(
			&match.ID,
			&match.Participants,
			&match.Status,
			&match.Origin,
			&match.Ranked,
			&match.CompletionReason,
			&match.CreatedAt,
			&match.DurationSeconds,
			&match.Disconnects,
			&match.ForfeitRequested,
			&match.WinnerName,
		); err != nil {
			return out, err
		}
		out.RecentMatches = append(out.RecentMatches, match)
	}
	return out, rows.Err()
}

// GetPvPAdminMatchDetail reúne a auditoria de uma partida específica. O acesso
// é protegido no handler por AdminMiddleware; a função continua somente leitura.
func GetPvPAdminMatchDetail(matchID string, now time.Time) (PvPAdminMatchDetail, error) {
	if matchID == "" {
		return PvPAdminMatchDetail{}, fmt.Errorf("partida PvP obrigatória")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	out := PvPAdminMatchDetail{Participants: []PvPAdminParticipant{}, Skills: []PvPAdminSkillUsage{}, Events: []PvPAdminReplayEvent{}}
	var winnerID string
	if err := DB.QueryRow(`
		SELECT m.id,m.status,m.match_origin,m.ranked,m.completion_reason,
			COALESCE(m.runtime_state->'snapshot'->>'winner_id',''),
			COALESCE(winner.name,''),
			GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (COALESCE(m.ended_at,$2::timestamptz)-COALESCE(m.started_at,m.created_at)))))::int
		FROM pvp_matches m
		LEFT JOIN characters winner ON winner.id=NULLIF(m.runtime_state->'snapshot'->>'winner_id','')::uuid
		WHERE m.id=$1::uuid
	`, matchID, now.UTC()).Scan(&out.ID, &out.Status, &out.Origin, &out.Ranked, &out.CompletionReason, &winnerID, &out.WinnerName, &out.DurationSeconds); err != nil {
		return out, err
	}

	participants, err := DB.Query(`
		SELECT p.character_id,c.name,
			COALESCE(p.snapshot->'derived_stats'->>'primary_archetype','melee'),
			COALESCE(p.snapshot->>'tactical_strategy','balanced'),p.combat_power,p.combat_metrics
		FROM pvp_match_participants p
		JOIN characters c ON c.id=p.character_id
		WHERE p.match_id=$1::uuid ORDER BY p.team
	`, matchID)
	if err != nil {
		return out, err
	}
	defer participants.Close()
	for participants.Next() {
		var participant PvPAdminParticipant
		var metricsRaw []byte
		if err := participants.Scan(&participant.CharacterID, &participant.Name, &participant.Archetype, &participant.Strategy, &participant.CombatPower, &metricsRaw); err != nil {
			return out, err
		}
		participant.IsWinner = winnerID != "" && participant.CharacterID == winnerID
		_ = json.Unmarshal(metricsRaw, &participant.Metrics)
		if participant.Metrics.CharacterID == "" {
			participant.Metrics.CharacterID = participant.CharacterID
		}
		out.Participants = append(out.Participants, participant)
	}
	if err := participants.Err(); err != nil {
		return out, err
	}

	skillRows, err := DB.Query(`
		SELECT event.payload->>'source_id',COALESCE(character.name,'?'),event.payload->>'skill_key',COUNT(*)::int
		FROM pvp_match_events event
		LEFT JOIN characters character ON character.id=NULLIF(event.payload->>'source_id','')::uuid
		WHERE event.match_id=$1::uuid AND event.event_type='SKILL' AND COALESCE(event.payload->>'skill_key','')<>''
		GROUP BY event.payload->>'source_id',character.name,event.payload->>'skill_key'
		ORDER BY COUNT(*) DESC,event.payload->>'skill_key'
	`, matchID)
	if err != nil {
		return out, err
	}
	defer skillRows.Close()
	for skillRows.Next() {
		var skill PvPAdminSkillUsage
		if err := skillRows.Scan(&skill.CharacterID, &skill.Name, &skill.SkillKey, &skill.Casts); err != nil {
			return out, err
		}
		out.Skills = append(out.Skills, skill)
	}
	if err := skillRows.Err(); err != nil {
		return out, err
	}

	eventRows, err := DB.Query(`
		SELECT event.sequence,event.event_type,
			COALESCE(source.name,''),COALESCE(target.name,''),
			COALESCE(event.payload->>'skill_key',''),COALESCE((event.payload->>'amount')::int,0),
			COALESCE((event.payload->>'is_critical')::boolean,false),COALESCE((event.payload->>'is_healing')::boolean,false),
			COALESCE((event.payload->>'tick')::bigint,0),event.created_at
		FROM pvp_match_events event
		LEFT JOIN characters source ON source.id=NULLIF(event.payload->>'source_id','')::uuid
		LEFT JOIN characters target ON target.id=NULLIF(event.payload->>'target_id','')::uuid
		WHERE event.match_id=$1::uuid
		ORDER BY event.sequence DESC LIMIT 80
	`, matchID)
	if err != nil {
		return out, err
	}
	defer eventRows.Close()
	for eventRows.Next() {
		var event PvPAdminReplayEvent
		var tick int64
		if err := eventRows.Scan(&event.Sequence, &event.Kind, &event.SourceName, &event.TargetName, &event.SkillKey, &event.Amount, &event.Critical, &event.Healing, &tick, &event.CreatedAt); err != nil {
			return out, err
		}
		if tick > 0 {
			event.Tick = uint64(tick)
		}
		out.Events = append(out.Events, event)
	}
	return out, eventRows.Err()
}
