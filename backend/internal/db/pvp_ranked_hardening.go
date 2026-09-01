package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/atlas/backend/pkg/game"
)

// RequestPvPForfeit nunca decide dano ou vencedor no gateway. Em partida
// ativa ele apenas persiste a intenção; a líder autoritativa da arena materializa
// a derrota no próximo tick. Em ready, a recusa apenas cancela a preparação.
func RequestPvPForfeit(characterID, matchID string, now time.Time) (game.PvPMatch, error) {
	if characterID == "" || matchID == "" {
		return game.PvPMatch{}, fmt.Errorf("personagem e partida PvP são obrigatórios")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return game.PvPMatch{}, err
	}
	defer tx.Rollback()

	var status string
	var existingForfeit sql.NullString
	if err := tx.QueryRow(`SELECT status, forfeit_requested_by::text FROM pvp_matches WHERE id=$1 FOR UPDATE`, matchID).Scan(&status, &existingForfeit); err != nil {
		return game.PvPMatch{}, err
	}
	var participant bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM pvp_match_participants WHERE match_id=$1 AND character_id=$2)`, matchID, characterID).Scan(&participant); err != nil {
		return game.PvPMatch{}, err
	}
	if !participant {
		return game.PvPMatch{}, fmt.Errorf("personagem não participa desta arena")
	}

	switch game.PvPMatchStatus(status) {
	case game.PvPMatchReady:
		if _, err := tx.Exec(`
			UPDATE pvp_matches
			SET status='cancelled', ended_at=$2, completion_reason='ready_declined'
			WHERE id=$1 AND status='ready'
		`, matchID, now.UTC()); err != nil {
			return game.PvPMatch{}, err
		}
		if err := appendPvPMatchEventTx(tx, matchID, "MATCH_CANCELLED", map[string]any{"reason": "ready_declined", "character_id": characterID}, now); err != nil {
			return game.PvPMatch{}, err
		}
	case game.PvPMatchActive:
		if existingForfeit.Valid {
			if existingForfeit.String != characterID {
				return game.PvPMatch{}, fmt.Errorf("a partida já possui outra desistência em processamento")
			}
			// Retry idempotente: a intenção já está persistida e o scheduler
			// autoritativo irá materializá-la no próximo pulso.
			break
		}
		result, err := tx.Exec(`
			UPDATE pvp_matches
			SET forfeit_requested_by=$2, forfeit_requested_at=$3
			WHERE id=$1 AND status='active' AND forfeit_requested_by IS NULL
		`, matchID, characterID, now.UTC())
		if err != nil {
			return game.PvPMatch{}, err
		}
		if affected, _ := result.RowsAffected(); affected != 1 {
			return game.PvPMatch{}, fmt.Errorf("a partida já possui outra desistência em processamento")
		}
		if err := appendPvPMatchEventTx(tx, matchID, "FORFEIT_REQUESTED", map[string]any{"character_id": characterID}, now); err != nil {
			return game.PvPMatch{}, err
		}
	default:
		return game.PvPMatch{}, fmt.Errorf("a partida PvP já foi encerrada")
	}

	match, err := getPvPMatchTx(tx, matchID)
	if err != nil {
		return game.PvPMatch{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.PvPMatch{}, err
	}
	return match, nil
}

// RecordPvPParticipantConnection registra indisponibilidade do cliente apenas
// como telemetria. A simulação autoritativa continua no servidor e a conexão
// ruim não transforma uma partida ativa em derrota automática.
func RecordPvPParticipantConnection(characterID string, connected bool, now time.Time) error {
	if characterID == "" {
		return nil
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var matchID string
	if err := tx.QueryRow(`SELECT COALESCE(active_pvp_match_id,'') FROM characters WHERE id=$1`, characterID).Scan(&matchID); err != nil {
		return err
	}
	if matchID == "" {
		return tx.Commit()
	}
	var result sql.Result
	if connected {
		result, err = tx.Exec(`
			UPDATE pvp_match_participants
			SET disconnected_seconds=disconnected_seconds + GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ($3-disconnected_at))))::int,
			    disconnected_at=NULL
			WHERE match_id=$1::uuid AND character_id=$2 AND disconnected_at IS NOT NULL
		`, matchID, characterID, now.UTC())
	} else {
		result, err = tx.Exec(`
			UPDATE pvp_match_participants
			SET disconnect_count=disconnect_count+1, disconnected_at=$3
			WHERE match_id=$1::uuid AND character_id=$2 AND disconnected_at IS NULL
		`, matchID, characterID, now.UTC())
	}
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 1 {
		eventType := "CLIENT_DISCONNECTED"
		if connected {
			eventType = "CLIENT_RECONNECTED"
		}
		if err := appendPvPMatchEventTx(tx, matchID, eventType, map[string]any{"character_id": characterID}, now); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func finalizePvPParticipantDisconnectsTx(tx *sql.Tx, matchID string, now time.Time) error {
	_, err := tx.Exec(`
		UPDATE pvp_match_participants
		SET disconnected_seconds=disconnected_seconds + GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ($2-disconnected_at))))::int,
		    disconnected_at=NULL
		WHERE match_id=$1::uuid AND disconnected_at IS NOT NULL
	`, matchID, now.UTC())
	return err
}

func persistPvPCombatMetricsTx(tx *sql.Tx, matchID string, metrics [2]game.PvPCombatMetrics) error {
	for _, metric := range metrics {
		if metric.CharacterID == "" {
			continue
		}
		raw, err := json.Marshal(metric)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(`UPDATE pvp_match_participants SET combat_metrics=$3::jsonb WHERE match_id=$1::uuid AND character_id=$2`, matchID, metric.CharacterID, string(raw)); err != nil {
			return err
		}
	}
	return nil
}

func recordPvPIntegrityFlagsTx(tx *sql.Tx, matchID, seasonID, aID, bID string, recent int, multiplier float64, now time.Time) error {
	type flag struct {
		kind     string
		severity int
		meta     map[string]any
	}
	buildFlags := func(opponentID string) []flag {
		flags := []flag{}
		if recent >= 2 {
			flags = append(flags, flag{kind: "repeat_opponent", severity: min(4, 1+recent/2), meta: map[string]any{"previous_matches_24h": recent, "multiplier": multiplier, "opponent_id": opponentID}})
		}
		if multiplier <= 0 {
			flags = append(flags, flag{kind: "zero_return_pair", severity: 3, meta: map[string]any{"previous_matches_24h": recent, "opponent_id": opponentID}})
		}
		return flags
	}

	var completionReason string
	_ = tx.QueryRow(`SELECT completion_reason FROM pvp_matches WHERE id=$1`, matchID).Scan(&completionReason)
	insertForCharacter := func(characterID, opponentID string) error {
		flags := buildFlags(opponentID)
		if completionReason == "forfeit" && recent >= 1 {
			flags = append(flags, flag{kind: "repeat_forfeit_pair", severity: min(5, 2+recent/2), meta: map[string]any{"previous_matches_24h": recent, "opponent_id": opponentID}})
		}
		for _, item := range flags {
			raw, _ := json.Marshal(item.meta)
			if _, err := tx.Exec(`
				INSERT INTO pvp_integrity_flags(season_id,match_id,character_id,flag_type,severity,metadata,created_at)
				VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)
				ON CONFLICT(match_id,flag_type,character_id) DO NOTHING
			`, seasonID, matchID, characterID, item.kind, item.severity, string(raw), now.UTC()); err != nil {
				return err
			}
		}
		return nil
	}
	if err := insertForCharacter(aID, bID); err != nil {
		return err
	}
	if err := insertForCharacter(bID, aID); err != nil {
		return err
	}
	_, err := tx.Exec(`UPDATE pvp_matches SET integrity_checked_at=$2 WHERE id=$1`, matchID, now.UTC())
	return err
}

func GetPvPCompetitiveOverview(characterID string, now time.Time) (game.PvPCompetitiveOverview, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return game.PvPCompetitiveOverview{}, err
	}
	defer tx.Rollback()
	season, err := ensureActivePvPSeasonTx(tx, now)
	if err != nil {
		return game.PvPCompetitiveOverview{}, err
	}
	if characterID != "" {
		if _, err := ensurePvPSeasonProfileTx(tx, season, characterID); err != nil {
			return game.PvPCompetitiveOverview{}, err
		}
	}
	overview := game.PvPCompetitiveOverview{SeasonNumber: season.Number, TierDistribution: []game.PvPTierDistributionEntry{}}
	var average sql.NullFloat64
	if err := tx.QueryRow(`
		SELECT COUNT(*), AVG(EXTRACT(EPOCH FROM (ended_at-started_at))),
		       COUNT(*) FILTER (WHERE completion_reason='forfeit'),
		       COUNT(*) FILTER (WHERE repeat_multiplier < 1)
		FROM pvp_matches
		WHERE season_id=$1 AND ranked=true AND status='completed'
	`, season.ID).Scan(&overview.RankedMatches, &average, &overview.ForfeitMatches, &overview.RepeatLimitedMatches); err != nil {
		return game.PvPCompetitiveOverview{}, err
	}
	if average.Valid {
		overview.AverageDurationSec = int(math.Round(average.Float64))
	}
	rows, err := tx.Query(`SELECT rating,placements_played FROM pvp_season_profiles WHERE season_id=$1 AND placements_played >= $2`, season.ID, game.PvPRankedPlacementsRequired)
	if err != nil {
		return game.PvPCompetitiveOverview{}, err
	}
	counts := map[string]int{}
	for rows.Next() {
		var rating, placements int
		if err := rows.Scan(&rating, &placements); err != nil {
			rows.Close()
			return game.PvPCompetitiveOverview{}, err
		}
		tier := game.PvPRankTier(rating, placements)
		counts[tier.Key]++
		overview.PositionedPlayers++
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return game.PvPCompetitiveOverview{}, err
	}
	rows.Close()
	for _, tier := range game.PvPRankTiers() {
		players := counts[tier.Key]
		percent := 0.0
		if overview.PositionedPlayers > 0 {
			percent = math.Round(float64(players)*1000/float64(overview.PositionedPlayers)) / 10
		}
		overview.TierDistribution = append(overview.TierDistribution, game.PvPTierDistributionEntry{Tier: tier, Players: players, Percent: percent})
	}
	if err := tx.Commit(); err != nil {
		return game.PvPCompetitiveOverview{}, err
	}
	return overview, nil
}

func GetPvPCosmetics(characterID string) (game.PvPCosmeticCollection, error) {
	if characterID == "" {
		return game.PvPCosmeticCollection{}, fmt.Errorf("personagem obrigatório")
	}
	if _, err := EnsurePvPProfile(characterID); err != nil {
		return game.PvPCosmeticCollection{}, err
	}
	var out game.PvPCosmeticCollection
	if err := DB.QueryRow(`SELECT equipped_title_key,equipped_banner_key,equipped_cosmetic_key FROM pvp_profiles WHERE character_id=$1`, characterID).Scan(&out.EquippedTitle, &out.EquippedBanner, &out.EquippedCosmetic); err != nil {
		return game.PvPCosmeticCollection{}, err
	}
	rows, err := DB.Query(`
		SELECT u.cosmetic_type,u.cosmetic_key,COALESCE(s.season_number,0),u.unlocked_at
		FROM pvp_cosmetic_unlocks u LEFT JOIN pvp_seasons s ON s.id=u.source_season_id
		WHERE u.character_id=$1 ORDER BY u.unlocked_at DESC,u.cosmetic_type,u.cosmetic_key
	`, characterID)
	if err != nil {
		return game.PvPCosmeticCollection{}, err
	}
	defer rows.Close()
	out.Unlocks = []game.PvPCosmeticUnlock{}
	for rows.Next() {
		var unlock game.PvPCosmeticUnlock
		if err := rows.Scan(&unlock.Type, &unlock.Key, &unlock.SeasonNumber, &unlock.UnlockedAt); err != nil {
			return game.PvPCosmeticCollection{}, err
		}
		out.Unlocks = append(out.Unlocks, unlock)
	}
	return out, rows.Err()
}

func SetPvPCosmetic(characterID, cosmeticType, key string) (game.PvPCosmeticCollection, error) {
	column := ""
	switch cosmeticType {
	case "title":
		column = "equipped_title_key"
	case "banner":
		column = "equipped_banner_key"
	case "cosmetic":
		column = "equipped_cosmetic_key"
	default:
		return game.PvPCosmeticCollection{}, fmt.Errorf("tipo cosmético PvP inválido")
	}
	if key != "" {
		var unlocked bool
		if err := DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM pvp_cosmetic_unlocks WHERE character_id=$1 AND cosmetic_type=$2 AND cosmetic_key=$3)`, characterID, cosmeticType, key).Scan(&unlocked); err != nil {
			return game.PvPCosmeticCollection{}, err
		}
		if !unlocked {
			return game.PvPCosmeticCollection{}, fmt.Errorf("cosmético PvP não desbloqueado")
		}
	}
	if _, err := EnsurePvPProfile(characterID); err != nil {
		return game.PvPCosmeticCollection{}, err
	}
	query := fmt.Sprintf(`UPDATE pvp_profiles SET %s=$2,updated_at=$3 WHERE character_id=$1`, column)
	if _, err := DB.Exec(query, characterID, key, time.Now().UTC()); err != nil {
		return game.PvPCosmeticCollection{}, err
	}
	return GetPvPCosmetics(characterID)
}
