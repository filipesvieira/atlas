package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/atlas/backend/pkg/game"
)

func EnsurePvPProfile(characterID string) (game.PvPProfile, error) {
	var profile game.PvPProfile
	err := DB.QueryRow(`
		INSERT INTO pvp_profiles(character_id)
		VALUES ($1)
		ON CONFLICT(character_id) DO UPDATE SET character_id = EXCLUDED.character_id
		RETURNING character_id, rating, wins, losses, draws, season, updated_at
	`, characterID).Scan(&profile.CharacterID, &profile.Rating, &profile.Wins, &profile.Losses, &profile.Draws, &profile.Season, &profile.UpdatedAt)
	return profile, err
}

func ensurePvPProfileTx(tx *sql.Tx, characterID string) (game.PvPProfile, error) {
	var profile game.PvPProfile
	err := tx.QueryRow(`
		INSERT INTO pvp_profiles(character_id) VALUES ($1)
		ON CONFLICT(character_id) DO UPDATE SET character_id=EXCLUDED.character_id
		RETURNING character_id,rating,wins,losses,draws,season,updated_at
	`, characterID).Scan(&profile.CharacterID, &profile.Rating, &profile.Wins, &profile.Losses, &profile.Draws, &profile.Season, &profile.UpdatedAt)
	return profile, err
}

func expirePendingDuelChallengesTx(tx *sql.Tx, now time.Time) error {
	_, err := tx.Exec(`
		UPDATE pvp_duel_challenges
		SET status='expired', responded_at=$1
		WHERE status='pending' AND expires_at <= $1
	`, now.UTC())
	return err
}

const duelChallengeColumns = `
	c.id, c.request_id, c.status, c.created_at, c.expires_at, c.responded_at,
	challenger.id, challenger.name, challenger.level, COALESCE(challenger.active_region, ''),
	COALESCE(challenger_profile.rating, 1000), COALESCE(challenger_profile.wins, 0), COALESCE(challenger_profile.losses, 0),
	target.id, target.name, target.level, COALESCE(target.active_region, ''),
	COALESCE(target_profile.rating, 1000), COALESCE(target_profile.wins, 0), COALESCE(target_profile.losses, 0)`

const duelChallengeJoin = `
	FROM pvp_duel_challenges c
	JOIN characters challenger ON challenger.id = c.challenger_character_id
	JOIN characters target ON target.id = c.target_character_id
	LEFT JOIN pvp_profiles challenger_profile ON challenger_profile.character_id = challenger.id
	LEFT JOIN pvp_profiles target_profile ON target_profile.character_id = target.id`

type duelChallengeScanner interface {
	Scan(dest ...any) error
}

func scanDuelChallenge(row duelChallengeScanner) (game.DuelChallenge, error) {
	var challenge game.DuelChallenge
	var respondedAt sql.NullTime
	err := row.Scan(
		&challenge.ID, &challenge.RequestID, &challenge.Status, &challenge.CreatedAt, &challenge.ExpiresAt, &respondedAt,
		&challenge.Challenger.CharacterID, &challenge.Challenger.Name, &challenge.Challenger.Level, &challenge.Challenger.Region,
		&challenge.Challenger.Rating, &challenge.Challenger.Wins, &challenge.Challenger.Losses,
		&challenge.Target.CharacterID, &challenge.Target.Name, &challenge.Target.Level, &challenge.Target.Region,
		&challenge.Target.Rating, &challenge.Target.Wins, &challenge.Target.Losses,
	)
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if respondedAt.Valid {
		value := respondedAt.Time
		challenge.RespondedAt = &value
	}
	return challenge, nil
}

func getDuelChallengeTx(tx *sql.Tx, challengeID string) (game.DuelChallenge, error) {
	return scanDuelChallenge(tx.QueryRow(`SELECT `+duelChallengeColumns+duelChallengeJoin+` WHERE c.id=$1`, challengeID))
}

// CreateDuelChallenge cria um convite de 90 segundos. request_id torna retry
// do cliente idempotente e o índice parcial impede spam paralelo para a mesma dupla.
func CreateDuelChallenge(challengerID, targetID, requestID string, now time.Time) (game.DuelChallenge, error) {
	if challengerID == "" || targetID == "" || challengerID == targetID || requestID == "" {
		return game.DuelChallenge{}, fmt.Errorf("desafio de duelo inválido")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return game.DuelChallenge{}, err
	}
	defer tx.Rollback()
	if err := expirePendingDuelChallengesTx(tx, now); err != nil {
		return game.DuelChallenge{}, err
	}
	var challengeID string
	err = tx.QueryRow(`
		SELECT id FROM pvp_duel_challenges
		WHERE challenger_character_id=$1 AND request_id=$2
	`, challengerID, requestID).Scan(&challengeID)
	if err == nil {
		challenge, getErr := getDuelChallengeTx(tx, challengeID)
		if getErr != nil {
			return game.DuelChallenge{}, getErr
		}
		if err := tx.Commit(); err != nil {
			return game.DuelChallenge{}, err
		}
		return challenge, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return game.DuelChallenge{}, err
	}
	if err := tx.QueryRow(`
		INSERT INTO pvp_duel_challenges(request_id, challenger_character_id, target_character_id, expires_at)
		VALUES($1,$2,$3,$4)
		RETURNING id
	`, requestID, challengerID, targetID, now.UTC().Add(90*time.Second)).Scan(&challengeID); err != nil {
		return game.DuelChallenge{}, fmt.Errorf("não foi possível criar desafio: %w", err)
	}
	challenge, err := getDuelChallengeTx(tx, challengeID)
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.DuelChallenge{}, err
	}
	return challenge, nil
}

func ListPendingDuelChallenges(characterID string, now time.Time) ([]game.DuelChallenge, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if err := expirePendingDuelChallengesTx(tx, now); err != nil {
		return nil, err
	}
	rows, err := tx.Query(`SELECT `+duelChallengeColumns+duelChallengeJoin+`
		WHERE c.target_character_id=$1 AND c.status='pending' AND c.expires_at > $2
		ORDER BY c.created_at ASC`, characterID, now.UTC())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	challenges := []game.DuelChallenge{}
	for rows.Next() {
		challenge, err := scanDuelChallenge(rows)
		if err != nil {
			return nil, err
		}
		challenges = append(challenges, challenge)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return challenges, nil
}

func RespondDuelChallenge(targetID, challengeID string, accept bool, now time.Time) (game.DuelChallenge, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return game.DuelChallenge{}, err
	}
	defer tx.Rollback()
	if err := expirePendingDuelChallengesTx(tx, now); err != nil {
		return game.DuelChallenge{}, err
	}
	var status string
	var expiresAt time.Time
	err = tx.QueryRow(`SELECT status, expires_at FROM pvp_duel_challenges WHERE id=$1 AND target_character_id=$2 FOR UPDATE`, challengeID, targetID).Scan(&status, &expiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return game.DuelChallenge{}, fmt.Errorf("desafio não encontrado")
	}
	if err != nil {
		return game.DuelChallenge{}, err
	}
	next := "declined"
	if accept {
		next = "accepted"
	}
	if status == "pending" && expiresAt.After(now.UTC()) {
		if _, err := tx.Exec(`UPDATE pvp_duel_challenges SET status=$2,responded_at=$3 WHERE id=$1`, challengeID, next, now.UTC()); err != nil {
			return game.DuelChallenge{}, err
		}
	} else if status != next {
		return game.DuelChallenge{}, fmt.Errorf("desafio não está mais pendente")
	}
	challenge, err := getDuelChallengeTx(tx, challengeID)
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.DuelChallenge{}, err
	}
	return challenge, nil
}

func CancelDuelChallenge(challengerID, challengeID string, now time.Time) (game.DuelChallenge, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return game.DuelChallenge{}, err
	}
	defer tx.Rollback()
	if err := expirePendingDuelChallengesTx(tx, now); err != nil {
		return game.DuelChallenge{}, err
	}
	result, err := tx.Exec(`
		UPDATE pvp_duel_challenges SET status='cancelled',responded_at=$3
		WHERE id=$1 AND challenger_character_id=$2 AND status='pending'
	`, challengeID, challengerID, now.UTC())
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return game.DuelChallenge{}, fmt.Errorf("desafio não pode mais ser cancelado")
	}
	challenge, err := getDuelChallengeTx(tx, challengeID)
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.DuelChallenge{}, err
	}
	return challenge, nil
}

const pvpMatchColumns = `
	m.id, m.challenge_id, m.mode, m.arena_key, m.status, m.rules_version,
	m.deterministic_seed, m.created_at, m.ready_expires_at, m.started_at, m.ended_at,
	m.last_tick, m.runtime_state, m.match_origin, m.ranked, m.season_id, m.repeat_multiplier,
	m.completion_reason, m.forfeit_requested_by`

func getPvPMatchTx(tx *sql.Tx, matchID string) (game.PvPMatch, error) {
	var match game.PvPMatch
	var mode, status string
	var startedAt, endedAt sql.NullTime
	var challengeID sql.NullString
	var seasonID sql.NullString
	var forfeitRequestedBy sql.NullString
	var lastTick int64
	var runtimeRaw []byte
	err := tx.QueryRow(`SELECT `+pvpMatchColumns+` FROM pvp_matches m WHERE m.id=$1`, matchID).Scan(
		&match.ID, &challengeID, &mode, &match.ArenaKey, &status, &match.RulesVersion,
		&match.Seed, &match.CreatedAt, &match.ReadyExpiresAt, &startedAt, &endedAt, &lastTick, &runtimeRaw, &match.MatchOrigin,
		&match.Ranked, &seasonID, &match.RepeatMultiplier, &match.CompletionReason, &forfeitRequestedBy,
	)
	if err != nil {
		return game.PvPMatch{}, err
	}
	if challengeID.Valid {
		match.ChallengeID = challengeID.String
	}
	if seasonID.Valid {
		match.SeasonID = seasonID.String
	}
	if forfeitRequestedBy.Valid {
		match.ForfeitRequestedBy = forfeitRequestedBy.String
	}
	match.Mode = game.CombatInstanceMode(mode)
	match.Status = game.PvPMatchStatus(status)
	if startedAt.Valid {
		value := startedAt.Time
		match.StartedAt = &value
	}
	if endedAt.Valid {
		value := endedAt.Time
		match.EndedAt = &value
	}
	if lastTick < 0 {
		return game.PvPMatch{}, fmt.Errorf("tick PvP inválido")
	}
	match.LastTick = uint64(lastTick)
	if len(runtimeRaw) > 0 && string(runtimeRaw) != "{}" {
		var runtime game.PvPCombatRuntimeState
		if err := json.Unmarshal(runtimeRaw, &runtime); err != nil {
			return game.PvPMatch{}, fmt.Errorf("estado da arena PvP corrompido: %w", err)
		}
		match.RuntimeState = &runtime
	}
	rows, err := tx.Query(`SELECT snapshot, tactical_strategy, strategy_version FROM pvp_match_participants WHERE match_id=$1 ORDER BY team`, matchID)
	if err != nil {
		return game.PvPMatch{}, err
	}
	defer rows.Close()
	match.Participants = make([]game.PvPParticipantSnapshot, 0, 2)
	for rows.Next() {
		var raw []byte
		var tacticalStrategy string
		var strategyVersion int
		if err := rows.Scan(&raw, &tacticalStrategy, &strategyVersion); err != nil {
			return game.PvPMatch{}, err
		}
		var participant game.PvPParticipantSnapshot
		if err := json.Unmarshal(raw, &participant); err != nil {
			return game.PvPMatch{}, fmt.Errorf("snapshot PvP corrompido: %w", err)
		}
		participant.TacticalStrategy = game.NormalizePvPTacticalStrategy(tacticalStrategy)
		if strategyVersion <= 0 {
			strategyVersion = game.PvPTacticalStrategyVersion
		}
		participant.StrategyVersion = strategyVersion
		match.Participants = append(match.Participants, participant)
	}
	if err := rows.Err(); err != nil {
		return game.PvPMatch{}, err
	}
	return match, nil
}

func buildPvPParticipantSnapshotTx(tx *sql.Tx, characterID string, team game.CombatTeam, now time.Time) (game.PvPParticipantSnapshot, error) {
	character, err := scanLockedCharacter(tx.QueryRow(`SELECT `+characterSnapshotColumns+` FROM characters WHERE id=$1 FOR SHARE`, characterID))
	if err != nil {
		return game.PvPParticipantSnapshot{}, err
	}
	inventory, err := GetCharacterInventoryTx(tx, characterID, false)
	if err != nil {
		return game.PvPParticipantSnapshot{}, err
	}
	buffs, err := getCharacterBuffsOverlappingTx(tx, characterID, now.Add(-time.Nanosecond), now.Add(time.Nanosecond))
	if err != nil {
		return game.PvPParticipantSnapshot{}, err
	}
	activeBuffs := make([]game.ActiveBuff, 0, len(buffs))
	for _, buff := range buffs {
		if buff.IsActive(now) {
			activeBuffs = append(activeBuffs, buff)
		}
	}
	gameCharacter := characterToGame(character)
	gameInventory := inventoryToGame(inventory)
	derived := game.ApplyActiveBuffsToDerivedStats(game.CalculateDerivedStats(gameCharacter, gameInventory, character.ActiveStance), activeBuffs, now)
	activeSkills := game.FilterActiveSkillsForArchetype(gameCharacter.ActiveSkills, derived.PrimaryArchetype)
	participant := game.PvPParticipantSnapshot{
		CharacterID: character.ID,
		Name:        character.Name,
		Level:       character.Level,
		Team:        team,
		Stance:      character.ActiveStance,
		// Duelo inicia com ambos recuperados, sem premiar quem chegou ao
		// convite com dano prévio de PvE e sem tocar a vida/mana persistidas.
		Health:           derived.MaxHealth,
		MaxHealth:        derived.MaxHealth,
		Mana:             derived.MaxMana,
		MaxMana:          derived.MaxMana,
		DerivedStats:     derived,
		Equipment:        gameInventory.Equipment,
		ActiveSkills:     append([]string(nil), activeSkills...),
		ActiveBuffs:      append([]game.ActiveBuff(nil), activeBuffs...),
		SkinKey:          game.NormalizeHeroSkinKey(character.EquippedSkinKey),
		TacticalStrategy: game.PvPStrategyBalanced,
		StrategyVersion:  game.PvPTacticalStrategyVersion,
		SnapshotAt:       now.UTC(),
	}
	participant.CombatPower = game.PvPCombatPower(participant)
	return participant, nil
}

// CreatePvPMatchFromAcceptedDuel congela uma única vez os dois participantes.
// A partida nasce em "ready" e ainda não interfere no GameSession PvE.
func CreatePvPMatchFromAcceptedDuel(challengeID string, now time.Time) (game.PvPMatch, error) {
	if challengeID == "" {
		return game.PvPMatch{}, fmt.Errorf("desafio de duelo obrigatório")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return game.PvPMatch{}, err
	}
	defer tx.Rollback()
	var challengerID, targetID, status string
	err = tx.QueryRow(`
		SELECT challenger_character_id, target_character_id, status
		FROM pvp_duel_challenges WHERE id=$1 FOR UPDATE
	`, challengeID).Scan(&challengerID, &targetID, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return game.PvPMatch{}, fmt.Errorf("desafio não encontrado")
	}
	if err != nil {
		return game.PvPMatch{}, err
	}
	var existingID string
	err = tx.QueryRow(`SELECT id FROM pvp_matches WHERE challenge_id=$1`, challengeID).Scan(&existingID)
	if err == nil {
		match, getErr := getPvPMatchTx(tx, existingID)
		if getErr != nil {
			return game.PvPMatch{}, getErr
		}
		if err := tx.Commit(); err != nil {
			return game.PvPMatch{}, err
		}
		return match, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return game.PvPMatch{}, err
	}
	if status != "accepted" {
		return game.PvPMatch{}, fmt.Errorf("desafio ainda não foi aceito")
	}
	challenger, err := buildPvPParticipantSnapshotTx(tx, challengerID, game.CombatTeamA, now.UTC())
	if err != nil {
		return game.PvPMatch{}, err
	}
	target, err := buildPvPParticipantSnapshotTx(tx, targetID, game.CombatTeamB, now.UTC())
	if err != nil {
		return game.PvPMatch{}, err
	}
	var matchID string
	seed := now.UTC().UnixNano()
	if err := tx.QueryRow(`
		INSERT INTO pvp_matches(challenge_id, mode, arena_key, status, rules_version, deterministic_seed, ready_expires_at, match_origin)
		VALUES($1, 'duel', 'duel_arena', 'ready', $2, $3, $4, 'direct_duel')
		RETURNING id
	`, challengeID, game.PvPCombatRulesVersion, seed, now.UTC().Add(90*time.Second)).Scan(&matchID); err != nil {
		return game.PvPMatch{}, err
	}
	for _, participant := range []game.PvPParticipantSnapshot{challenger, target} {
		profile, err := ensurePvPProfileTx(tx, participant.CharacterID)
		if err != nil {
			return game.PvPMatch{}, err
		}
		raw, err := json.Marshal(participant)
		if err != nil {
			return game.PvPMatch{}, err
		}
		if _, err := tx.Exec(`
			INSERT INTO pvp_match_participants(match_id, character_id, team, snapshot, rating_before, combat_power)
			VALUES($1,$2,$3,$4::jsonb,$5,$6)
		`, matchID, participant.CharacterID, participant.Team, string(raw), profile.Rating, participant.CombatPower); err != nil {
			return game.PvPMatch{}, err
		}
	}
	if _, err := tx.Exec(`DELETE FROM pvp_matchmaking_queue WHERE character_id IN ($1,$2)`, challengerID, targetID); err != nil {
		return game.PvPMatch{}, err
	}
	if _, err := tx.Exec(`
		INSERT INTO pvp_match_events(match_id, sequence, event_type, payload)
		VALUES($1, 1, 'MATCH_READY', $2::jsonb)
	`, matchID, fmt.Sprintf(`{"rules_version":%d}`, game.PvPCombatRulesVersion)); err != nil {
		return game.PvPMatch{}, err
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

func appendPvPMatchEventTx(tx *sql.Tx, matchID, eventType string, payload any, now time.Time) error {
	if matchID == "" || eventType == "" {
		return fmt.Errorf("evento PvP inválido")
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var sequence int
	if err := tx.QueryRow(`SELECT COALESCE(MAX(sequence), 0) + 1 FROM pvp_match_events WHERE match_id=$1`, matchID).Scan(&sequence); err != nil {
		return err
	}
	_, err = tx.Exec(`
		INSERT INTO pvp_match_events(match_id, sequence, event_type, payload, created_at)
		VALUES($1,$2,$3,$4::jsonb,$5)
	`, matchID, sequence, eventType, string(raw), now.UTC())
	return err
}

// ConfirmPvPMatchParticipant registra a presença explícita do jogador. Quando
// ambos confirmam dentro da janela, a mesma transação promove a partida para
// active; nenhuma réplica decide esse estado apenas em memória.
func ConfirmPvPMatchParticipant(matchID, characterID, tacticalStrategy string, strategyVersion int, now time.Time) (game.PvPMatch, bool, error) {
	if matchID == "" || characterID == "" {
		return game.PvPMatch{}, false, fmt.Errorf("partida ou personagem PvP inválido")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return game.PvPMatch{}, false, err
	}
	defer tx.Rollback()
	var status string
	var readyExpiresAt time.Time
	if err := tx.QueryRow(`SELECT status, ready_expires_at FROM pvp_matches WHERE id=$1 FOR UPDATE`, matchID).Scan(&status, &readyExpiresAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return game.PvPMatch{}, false, fmt.Errorf("partida PvP não encontrada")
		}
		return game.PvPMatch{}, false, err
	}
	if status == string(game.PvPMatchReady) && !readyExpiresAt.After(now.UTC()) {
		if _, err := tx.Exec(`UPDATE pvp_matches SET status='cancelled', ended_at=$2, completion_reason='ready_timeout' WHERE id=$1`, matchID, now.UTC()); err != nil {
			return game.PvPMatch{}, false, err
		}
		if err := appendPvPMatchEventTx(tx, matchID, "MATCH_TIMEOUT", map[string]string{"reason": "ready_timeout"}, now); err != nil {
			return game.PvPMatch{}, false, err
		}
		if err := tx.Commit(); err != nil {
			return game.PvPMatch{}, false, err
		}
		return game.PvPMatch{}, false, fmt.Errorf("a confirmação da arena expirou")
	}
	if status != string(game.PvPMatchReady) && status != string(game.PvPMatchActive) {
		return game.PvPMatch{}, false, fmt.Errorf("a partida PvP não está disponível")
	}
	strategy := game.NormalizePvPTacticalStrategy(tacticalStrategy)
	if tacticalStrategy != "" && string(strategy) != tacticalStrategy {
		return game.PvPMatch{}, false, fmt.Errorf("estratégia PvP inválida")
	}
	if strategyVersion == 0 {
		strategyVersion = game.PvPTacticalStrategyVersion
	}
	if strategyVersion != game.PvPTacticalStrategyVersion {
		return game.PvPMatch{}, false, fmt.Errorf("versão de estratégia PvP não suportada")
	}
	result, err := tx.Exec(`
		UPDATE pvp_match_participants
		SET tactical_strategy=CASE WHEN confirmed_at IS NULL THEN $3 ELSE tactical_strategy END,
			strategy_version=CASE WHEN confirmed_at IS NULL THEN $4 ELSE strategy_version END,
			confirmed_at=COALESCE(confirmed_at, $5)
		WHERE match_id=$1 AND character_id=$2
	`, matchID, characterID, strategy, strategyVersion, now.UTC())
	if err != nil {
		return game.PvPMatch{}, false, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return game.PvPMatch{}, false, fmt.Errorf("personagem não participa desta arena")
	}

	started := false
	if status == string(game.PvPMatchReady) {
		var confirmations int
		if err := tx.QueryRow(`SELECT COUNT(*) FROM pvp_match_participants WHERE match_id=$1 AND confirmed_at IS NOT NULL`, matchID).Scan(&confirmations); err != nil {
			return game.PvPMatch{}, false, err
		}
		if confirmations == 2 {
			rows, err := tx.Query(`SELECT character_id FROM pvp_match_participants WHERE match_id=$1 ORDER BY team FOR UPDATE`, matchID)
			if err != nil {
				return game.PvPMatch{}, false, err
			}
			participantIDs := make([]string, 0, 2)
			for rows.Next() {
				var participantID string
				if err := rows.Scan(&participantID); err != nil {
					rows.Close()
					return game.PvPMatch{}, false, err
				}
				participantIDs = append(participantIDs, participantID)
			}
			if err := rows.Close(); err != nil {
				return game.PvPMatch{}, false, err
			}
			if len(participantIDs) != 2 {
				return game.PvPMatch{}, false, fmt.Errorf("duelo ativo sem dois participantes")
			}
			for _, participantID := range participantIDs {
				result, err := tx.Exec(`
					UPDATE characters SET
						resume_expedition_after_pvp=CASE WHEN active_pvp_match_id='' THEN is_expedition_active ELSE resume_expedition_after_pvp END,
						is_expedition_active=false, active_pvp_match_id=$2, state_revision=COALESCE(state_revision,0)+1
					WHERE id=$1 AND (active_pvp_match_id='' OR active_pvp_match_id=$2)
				`, participantID, matchID)
				if err != nil {
					return game.PvPMatch{}, false, err
				}
				if affected, _ := result.RowsAffected(); affected != 1 {
					return game.PvPMatch{}, false, fmt.Errorf("personagem %s já está reservado por outra arena", participantID)
				}
			}
			if _, err := tx.Exec(`UPDATE pvp_matches SET status='active', started_at=$2, last_pulse_at=$2 WHERE id=$1 AND status='ready'`, matchID, now.UTC()); err != nil {
				return game.PvPMatch{}, false, err
			}
			if err := appendPvPMatchEventTx(tx, matchID, "MATCH_ACTIVE", map[string]int{"participants": confirmations}, now); err != nil {
				return game.PvPMatch{}, false, err
			}
			started = true
		}
	}
	match, err := getPvPMatchTx(tx, matchID)
	if err != nil {
		return game.PvPMatch{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return game.PvPMatch{}, false, err
	}
	return match, started, nil
}

func GetPvPMatch(matchID string) (game.PvPMatch, error) {
	if matchID == "" {
		return game.PvPMatch{}, fmt.Errorf("partida PvP obrigatória")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return game.PvPMatch{}, err
	}
	defer tx.Rollback()
	match, err := getPvPMatchTx(tx, matchID)
	if err != nil {
		return game.PvPMatch{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.PvPMatch{}, err
	}
	return match, nil
}

// GetPendingPvPMatchNotice recompõe a única informação de arena que um
// participante precisa após reconectar. O retorno é intencionalmente seguro:
// não contém snapshot, equipamento, buffs ou atributos de nenhum combatente.
func GetPendingPvPMatchNotice(characterID string, now time.Time) (*game.PvPMatchNotice, error) {
	if characterID == "" {
		return nil, fmt.Errorf("personagem PvP obrigatório")
	}
	var notice game.PvPMatchNotice
	err := DB.QueryRow(`
		SELECT m.id, COALESCE(m.challenge_id::text,''), m.arena_key, m.status, m.rules_version, m.created_at,
			p.confirmed_at IS NOT NULL, p.tactical_strategy, p.strategy_version, m.ranked, m.match_origin
		FROM pvp_matches m
		JOIN pvp_match_participants p ON p.match_id=m.id
		WHERE p.character_id=$1
			AND (m.status='active' OR (m.status='ready' AND m.ready_expires_at > $2))
		ORDER BY m.created_at DESC
		LIMIT 1
	`, characterID, now.UTC()).Scan(
		&notice.ID, &notice.ChallengeID, &notice.ArenaKey, &notice.Status,
		&notice.RulesVersion, &notice.CreatedAt, &notice.PlayerConfirmed,
		&notice.TacticalStrategy, &notice.StrategyVersion, &notice.Ranked, &notice.MatchOrigin,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	notice.TacticalStrategy = game.NormalizePvPTacticalStrategy(string(notice.TacticalStrategy))
	if notice.StrategyVersion <= 0 {
		notice.StrategyVersion = game.PvPTacticalStrategyVersion
	}
	return &notice, nil
}

func ListActivePvPMatches(limit int) ([]game.PvPMatch, error) {
	if limit <= 0 || limit > 100 {
		limit = 100
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	rows, err := tx.Query(`SELECT id FROM pvp_matches WHERE status='active' ORDER BY started_at ASC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0)
	for rows.Next() {
		var matchID string
		if err := rows.Scan(&matchID); err != nil {
			return nil, err
		}
		ids = append(ids, matchID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	matches := make([]game.PvPMatch, 0, len(ids))
	for _, matchID := range ids {
		match, err := getPvPMatchTx(tx, matchID)
		if err != nil {
			return nil, err
		}
		matches = append(matches, match)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return matches, nil
}

// ExpireReadyPvPMatches conclui o ciclo das arenas que não receberam a
// confirmação dos dois jogadores. A líder global chama esta limpeza; assim
// nenhuma réplica de WebSocket decide sozinha o fim de uma partida.
func ExpireReadyPvPMatches(now time.Time) (int, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	rows, err := tx.Query(`
		SELECT id FROM pvp_matches
		WHERE status='ready' AND ready_expires_at <= $1
		FOR UPDATE
	`, now.UTC())
	if err != nil {
		return 0, err
	}
	matchIDs := make([]string, 0)
	for rows.Next() {
		var matchID string
		if err := rows.Scan(&matchID); err != nil {
			rows.Close()
			return 0, err
		}
		matchIDs = append(matchIDs, matchID)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, err
	}
	if err := rows.Close(); err != nil {
		return 0, err
	}
	for _, matchID := range matchIDs {
		if _, err := tx.Exec(`
			UPDATE pvp_matches SET status='cancelled', ended_at=$2, completion_reason='ready_timeout'
			WHERE id=$1 AND status='ready'
		`, matchID, now.UTC()); err != nil {
			return 0, err
		}
		if err := appendPvPMatchEventTx(tx, matchID, "MATCH_TIMEOUT", map[string]string{"reason": "ready_timeout"}, now); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(matchIDs), nil
}

func endPvPActivitiesForMatchTx(tx *sql.Tx, matchID string, now time.Time) error {
	_, err := tx.Exec(`
		UPDATE characters AS c SET
			is_expedition_active=c.resume_expedition_after_pvp,
			resume_expedition_after_pvp=false,
			active_pvp_match_id='',
			offline_claimed_at=GREATEST(COALESCE(c.offline_claimed_at,c.last_logout),$2),
			state_revision=COALESCE(c.state_revision,0)+1
		FROM pvp_match_participants AS p
		WHERE p.match_id=$1::uuid AND p.character_id=c.id AND c.active_pvp_match_id=$1::text
	`, matchID, now.UTC())
	return err
}

// PersistPvPCombatRuntime persiste cada pulso autoritativo. Duelo é um modo
// de baixa concorrência; guardar o estado a cada 250 ms prioriza recuperação
// correta de liderança sobre uma otimização prematura de escrita.
func PersistPvPCombatRuntime(runtime game.PvPCombatRuntimeState, now time.Time) error {
	state := runtime.Snapshot
	if state.MatchID == "" || state.Tick == 0 {
		return fmt.Errorf("pulso PvP inválido")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var status string
	var lastTick int64
	var ratingAppliedAt sql.NullTime
	var competitiveAppliedAt sql.NullTime
	var ranked bool
	if err := tx.QueryRow(`SELECT status,last_tick,rating_applied_at,competitive_applied_at,ranked FROM pvp_matches WHERE id=$1 FOR UPDATE`, state.MatchID).Scan(&status, &lastTick, &ratingAppliedAt, &competitiveAppliedAt, &ranked); err != nil {
		return err
	}
	if status != string(game.PvPMatchActive) && status != string(game.PvPMatchCompleted) {
		return fmt.Errorf("partida PvP não aceita pulso no estado atual")
	}
	if lastTick >= 0 && uint64(lastTick) >= state.Tick {
		return tx.Commit()
	}
	persistent := runtime
	persistent.Snapshot.Events = nil
	raw, err := json.Marshal(persistent)
	if err != nil {
		return err
	}
	if state.Status == game.PvPMatchCompleted {
		if _, err := tx.Exec(`
			UPDATE pvp_matches
			SET status='completed', ended_at=$2, last_tick=$3, runtime_state=$4::jsonb, last_pulse_at=$2,
			    completion_reason=CASE WHEN forfeit_requested_by IS NOT NULL THEN 'forfeit' ELSE completion_reason END
			WHERE id=$1
		`, state.MatchID, now.UTC(), state.Tick, string(raw)); err != nil {
			return err
		}
		if err := persistPvPCombatMetricsTx(tx, state.MatchID, runtime.Metrics); err != nil {
			return err
		}
		if err := finalizePvPParticipantDisconnectsTx(tx, state.MatchID, now); err != nil {
			return err
		}
		// Match e atividade do herói encerram na MESMA transação. Assim uma queda
		// entre persistir o vencedor e liberar o personagem não deixa lock órfão.
		if err := endPvPActivitiesForMatchTx(tx, state.MatchID, now); err != nil {
			return err
		}
		if ranked {
			if !competitiveAppliedAt.Valid {
				if err := applyPvPRankedResultTx(tx, state.MatchID, state.WinnerID, now); err != nil {
					return err
				}
			}
		} else if !ratingAppliedAt.Valid {
			if err := applyPvPRatingTx(tx, state.MatchID, state.WinnerID, now); err != nil {
				return err
			}
		}
	} else if _, err := tx.Exec(`
		UPDATE pvp_matches SET last_tick=$2, runtime_state=$3::jsonb, last_pulse_at=$4 WHERE id=$1
	`, state.MatchID, state.Tick, string(raw), now.UTC()); err != nil {
		return err
	}
	for _, event := range state.Events {
		if err := appendPvPMatchEventTx(tx, state.MatchID, strings.ToUpper(event.Kind), event, now); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func GetPublicPlayerProfile(characterID string) (game.PublicPlayerProfile, error) {
	var profile game.PublicPlayerProfile
	err := DB.QueryRow(`
		SELECT c.id, c.name, c.level, COALESCE(c.active_region, ''),
		       COALESCE(p.rating, 1000), COALESCE(p.wins, 0), COALESCE(p.losses, 0),
		       COALESCE(p.equipped_title_key,''), COALESCE(p.equipped_banner_key,'')
		FROM characters c
		LEFT JOIN pvp_profiles p ON p.character_id = c.id
		WHERE c.id = $1
	`, characterID).Scan(&profile.CharacterID, &profile.Name, &profile.Level, &profile.Region, &profile.Rating, &profile.Wins, &profile.Losses, &profile.TitleKey, &profile.BannerKey)
	return profile, err
}

func SaveChatMessage(senderID, senderName string, senderLevel int, channel, text string) (game.ChatMessage, error) {
	text = strings.TrimSpace(text)
	var msg game.ChatMessage
	err := DB.QueryRow(`
		INSERT INTO chat_messages(channel, sender_character_id, sender_name_snapshot, sender_level_snapshot, message_text)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, channel, sender_character_id, sender_name_snapshot, sender_level_snapshot, message_text, created_at
	`, channel, senderID, senderName, senderLevel, text).Scan(
		&msg.ID, &msg.Channel, &msg.SenderID, &msg.SenderName, &msg.SenderLevel, &msg.Text, &msg.CreatedAt,
	)
	return msg, err
}

func ListRecentChatMessages(channel string, limit int) ([]game.ChatMessage, error) {
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}
	rows, err := DB.Query(`
		SELECT id, channel, sender_character_id, sender_name_snapshot, sender_level_snapshot, message_text, created_at
		FROM (
			SELECT id, channel, sender_character_id, sender_name_snapshot, sender_level_snapshot, message_text, created_at
			FROM chat_messages
			WHERE channel = $1
			ORDER BY created_at DESC
			LIMIT $2
		) recent
		ORDER BY created_at ASC
	`, channel, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	messages := make([]game.ChatMessage, 0, limit)
	for rows.Next() {
		var msg game.ChatMessage
		if err := rows.Scan(&msg.ID, &msg.Channel, &msg.SenderID, &msg.SenderName, &msg.SenderLevel, &msg.Text, &msg.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, rows.Err()
}

func ListBlockedCharacterIDs(characterID string) (map[string]bool, error) {
	rows, err := DB.Query(`SELECT blocked_character_id FROM chat_blocks WHERE blocker_character_id = $1`, characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	blocked := map[string]bool{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		blocked[id] = true
	}
	return blocked, rows.Err()
}

func BlockChatCharacter(characterID, targetID string) error {
	_, err := DB.Exec(`
		INSERT INTO chat_blocks(blocker_character_id, blocked_character_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, characterID, targetID)
	return err
}

func UnblockChatCharacter(characterID, targetID string) error {
	_, err := DB.Exec(`DELETE FROM chat_blocks WHERE blocker_character_id = $1 AND blocked_character_id = $2`, characterID, targetID)
	return err
}

func IsCharacterChatMuted(characterID string, now time.Time) (bool, error) {
	var until sql.NullTime
	err := DB.QueryRow(`SELECT muted_until FROM chat_mutes WHERE character_id = $1`, characterID).Scan(&until)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	// NULL representa mute administrativo sem expiração.
	return !until.Valid || until.Time.After(now), nil
}

func ReportChatMessage(reporterID, messageID, reason string) error {
	reason = strings.TrimSpace(reason)
	if len(reason) > 240 {
		reason = reason[:240]
	}
	_, err := DB.Exec(`
		INSERT INTO chat_reports(reporter_character_id, message_id, reason)
		VALUES ($1, $2, $3)
		ON CONFLICT(reporter_character_id, message_id) DO NOTHING
	`, reporterID, messageID, reason)
	return err
}

// CharacterPvPActivityState é a fronteira mínima usada pelo gateway para
// sincronizar a GameSession sem substituir XP/ouro ainda não checkpointados.
type CharacterPvPActivityState struct {
	ActiveMatchID      string
	ResumeExpedition   bool
	IsExpeditionActive bool
	StateRevision      int64
}

func GetCharacterPvPActivityState(characterID string) (CharacterPvPActivityState, error) {
	var state CharacterPvPActivityState
	err := DB.QueryRow(`
		SELECT COALESCE(active_pvp_match_id,''), COALESCE(resume_expedition_after_pvp,false),
			COALESCE(is_expedition_active,false), COALESCE(state_revision,0)
		FROM characters WHERE id=$1
	`, characterID).Scan(&state.ActiveMatchID, &state.ResumeExpedition, &state.IsExpeditionActive, &state.StateRevision)
	return state, err
}

// EndCharacterPvPActivity libera o herói de forma idempotente. O cursor offline
// avança até o fim do duelo para impedir ganho PvE offline no mesmo intervalo.
func EndCharacterPvPActivity(characterID, matchID string, now time.Time) (CharacterPvPActivityState, error) {
	if characterID == "" || matchID == "" {
		return CharacterPvPActivityState{}, fmt.Errorf("personagem ou partida PvP inválida")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	var state CharacterPvPActivityState
	err := DB.QueryRow(`
		UPDATE characters SET
			is_expedition_active=resume_expedition_after_pvp,
			resume_expedition_after_pvp=false,
			active_pvp_match_id='',
			offline_claimed_at=GREATEST(COALESCE(offline_claimed_at,last_logout),$3),
			state_revision=COALESCE(state_revision,0)+1
		WHERE id=$1 AND active_pvp_match_id=$2
		RETURNING COALESCE(active_pvp_match_id,''), COALESCE(resume_expedition_after_pvp,false),
			COALESCE(is_expedition_active,false), COALESCE(state_revision,0)
	`, characterID, matchID, now.UTC()).Scan(&state.ActiveMatchID, &state.ResumeExpedition, &state.IsExpeditionActive, &state.StateRevision)
	if errors.Is(err, sql.ErrNoRows) {
		return GetCharacterPvPActivityState(characterID)
	}
	return state, err
}

func SetCharacterEquippedSkin(characterID, skinKey string) (int64, error) {
	skinKey = game.NormalizeHeroSkinKey(skinKey)
	var revision int64
	err := DB.QueryRow(`
		UPDATE characters SET equipped_skin_key=$2, state_revision=COALESCE(state_revision,0)+1
		WHERE id=$1 RETURNING state_revision
	`, characterID, skinKey).Scan(&revision)
	return revision, err
}

func applyPvPRatingTx(tx *sql.Tx, matchID, winnerID string, now time.Time) error {
	rows, err := tx.Query(`
		SELECT character_id, rating_before FROM pvp_match_participants
		WHERE match_id=$1 ORDER BY team
	`, matchID)
	if err != nil {
		return err
	}
	defer rows.Close()
	type participant struct {
		id     string
		rating int
	}
	players := make([]participant, 0, 2)
	for rows.Next() {
		var p participant
		if err := rows.Scan(&p.id, &p.rating); err != nil {
			return err
		}
		players = append(players, p)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(players) != 2 {
		return fmt.Errorf("partida PvP sem dois participantes para rating")
	}
	scoreA := 0.5
	if winnerID == players[0].id {
		scoreA = 1
	} else if winnerID == players[1].id {
		scoreA = 0
	}
	deltaA := game.PvPRatingDelta(players[0].rating, players[1].rating, scoreA)
	deltaB := game.PvPRatingDelta(players[1].rating, players[0].rating, 1-scoreA)
	afterA := max(0, players[0].rating+deltaA)
	afterB := max(0, players[1].rating+deltaB)
	for i, p := range players {
		after := afterA
		win, loss, draw := 0, 0, 0
		if i == 1 {
			after = afterB
		}
		if winnerID == "" {
			draw = 1
		} else if winnerID == p.id {
			win = 1
		} else {
			loss = 1
		}
		if _, err := tx.Exec(`INSERT INTO pvp_profiles(character_id,rating,wins,losses,draws)
			VALUES($1,$2,$3,$4,$5)
			ON CONFLICT(character_id) DO UPDATE SET rating=$2,wins=pvp_profiles.wins+$3,losses=pvp_profiles.losses+$4,draws=pvp_profiles.draws+$5,updated_at=$6`, p.id, after, win, loss, draw, now.UTC()); err != nil {
			return err
		}
		if _, err := tx.Exec(`UPDATE pvp_match_participants SET rating_after=$3 WHERE match_id=$1 AND character_id=$2`, matchID, p.id, after); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(`UPDATE pvp_matches SET rating_applied_at=$2 WHERE id=$1 AND rating_applied_at IS NULL`, matchID, now.UTC()); err != nil {
		return err
	}
	return appendPvPMatchEventTx(tx, matchID, "RATING_APPLIED", map[string]any{"winner_id": winnerID, "a_delta": deltaA, "b_delta": deltaB}, now)
}

func ListPvPMatchHistory(characterID string, limit int) ([]game.PvPMatchHistoryEntry, error) {
	if limit < 1 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	rows, err := DB.Query(`
		SELECT m.id,m.match_origin, opp.character_id, COALESCE(opp.snapshot->>'name','Adversário'),
			COALESCE(mine.season_rating_before,mine.rating_before),
			COALESCE(mine.season_rating_after,mine.rating_after,mine.season_rating_before,mine.rating_before),
			mine.combat_power,opp.combat_power,m.ranked,COALESCE(s.season_number,0),mine.honor_awarded,m.repeat_multiplier,
			m.completion_reason,
			GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (COALESCE(m.ended_at,m.created_at)-COALESCE(m.started_at,m.created_at)))))::int,
			mine.disconnect_count,mine.disconnected_seconds,mine.combat_metrics,
			COALESCE(m.started_at,m.created_at),COALESCE(m.ended_at,m.created_at),
			COALESCE(m.runtime_state->'snapshot'->>'winner_id','')
		FROM pvp_matches m
		JOIN pvp_match_participants mine ON mine.match_id=m.id AND mine.character_id=$1
		JOIN pvp_match_participants opp ON opp.match_id=m.id AND opp.character_id<>$1
		LEFT JOIN pvp_seasons s ON s.id=m.season_id
		WHERE m.status='completed'
		ORDER BY COALESCE(m.ended_at,m.created_at) DESC LIMIT $2
	`, characterID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]game.PvPMatchHistoryEntry, 0, limit)
	for rows.Next() {
		var e game.PvPMatchHistoryEntry
		var winner string
		var metricsRaw []byte
		if err := rows.Scan(&e.MatchID, &e.Origin, &e.OpponentID, &e.OpponentName, &e.RatingBefore, &e.RatingAfter, &e.CombatPower, &e.OpponentPower, &e.Ranked, &e.SeasonNumber, &e.HonorAwarded, &e.RepeatMultiplier, &e.CompletionReason, &e.DurationSeconds, &e.DisconnectCount, &e.DisconnectedSeconds, &metricsRaw, &e.StartedAt, &e.EndedAt, &winner); err != nil {
			return nil, err
		}
		e.RatingDelta = e.RatingAfter - e.RatingBefore
		_ = json.Unmarshal(metricsRaw, &e.Metrics)
		if winner == "" {
			e.Result = "draw"
		} else if winner == characterID {
			e.Result = "win"
		} else {
			e.Result = "loss"
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func GetPvPMatchReplay(characterID, matchID string) (game.PvPMatchReplay, error) {
	var allowed bool
	if err := DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM pvp_match_participants WHERE match_id=$1 AND character_id=$2)`, matchID, characterID).Scan(&allowed); err != nil {
		return game.PvPMatchReplay{}, err
	}
	if !allowed {
		return game.PvPMatchReplay{}, fmt.Errorf("replay PvP indisponível")
	}
	rows, err := DB.Query(`SELECT sequence,event_type,payload,created_at FROM pvp_match_events WHERE match_id=$1 ORDER BY sequence`, matchID)
	if err != nil {
		return game.PvPMatchReplay{}, err
	}
	defer rows.Close()
	replay := game.PvPMatchReplay{MatchID: matchID, Events: []game.PvPReplayEvent{}}
	for rows.Next() {
		var e game.PvPReplayEvent
		var raw []byte
		if err := rows.Scan(&e.Sequence, &e.EventType, &raw, &e.CreatedAt); err != nil {
			return replay, err
		}
		e.Payload = map[string]any{}
		_ = json.Unmarshal(raw, &e.Payload)
		replay.Events = append(replay.Events, e)
	}
	return replay, rows.Err()
}

func JoinPvPMatchmaking(characterID, tacticalStrategy string, strategyVersion int, now time.Time) (game.PvPMatchmakingStatus, error) {
	if characterID == "" {
		return game.PvPMatchmakingStatus{}, fmt.Errorf("personagem PvP obrigatório")
	}
	strategy := game.NormalizePvPTacticalStrategy(tacticalStrategy)
	if tacticalStrategy != "" && string(strategy) != tacticalStrategy {
		return game.PvPMatchmakingStatus{}, fmt.Errorf("estratégia PvP inválida")
	}
	if strategyVersion == 0 {
		strategyVersion = game.PvPTacticalStrategyVersion
	}
	if strategyVersion != game.PvPTacticalStrategyVersion {
		return game.PvPMatchmakingStatus{}, fmt.Errorf("versão tática não suportada")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	defer tx.Rollback()
	var active string
	if err := tx.QueryRow(`SELECT COALESCE(active_pvp_match_id,'') FROM characters WHERE id=$1 FOR UPDATE`, characterID).Scan(&active); err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	if active != "" {
		return game.PvPMatchmakingStatus{}, fmt.Errorf("personagem já está em uma Arena PvP")
	}
	profile, err := ensurePvPProfileTx(tx, characterID)
	if err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	snapshot, err := buildPvPParticipantSnapshotTx(tx, characterID, game.CombatTeamA, now)
	if err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	snapshot.TacticalStrategy = strategy
	snapshot.StrategyVersion = strategyVersion
	snapshot.CombatPower = game.PvPCombatPower(snapshot)
	raw, err := json.Marshal(snapshot)
	if err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	if _, err := tx.Exec(`INSERT INTO pvp_matchmaking_queue(character_id,rating_snapshot,combat_power_snapshot,tactical_strategy,strategy_version,participant_snapshot,queued_at,heartbeat_at,queue_mode,season_id)
		VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$7,'casual',NULL)
		ON CONFLICT(character_id) DO UPDATE SET rating_snapshot=$2,combat_power_snapshot=$3,tactical_strategy=$4,strategy_version=$5,participant_snapshot=$6::jsonb,queued_at=$7,heartbeat_at=$7,queue_mode='casual',season_id=NULL`, characterID, profile.Rating, snapshot.CombatPower, strategy, strategyVersion, string(raw), now.UTC()); err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	return game.PvPMatchmakingStatus{Queued: true, Rating: profile.Rating, CombatPower: snapshot.CombatPower, QueuedAt: now.UTC(), QueueMode: "casual"}, nil
}

func LeavePvPMatchmaking(characterID string) error {
	_, err := DB.Exec(`DELETE FROM pvp_matchmaking_queue WHERE character_id=$1`, characterID)
	return err
}

func GetPvPMatchmakingStatus(characterID string) (game.PvPMatchmakingStatus, error) {
	var s game.PvPMatchmakingStatus
	var seasonNumber sql.NullInt64
	var tier sql.NullString
	var honor sql.NullInt64
	err := DB.QueryRow(`
		SELECT q.rating_snapshot,q.combat_power_snapshot,q.queued_at,q.queue_mode,
		       s.season_number,
		       CASE WHEN q.queue_mode='ranked' THEN
		         CASE
		           WHEN COALESCE(sp.placements_played,0) < $2 THEN 'placement'
		           WHEN q.rating_snapshot >= 1800 THEN 'master'
		           WHEN q.rating_snapshot >= 1600 THEN 'diamond'
		           WHEN q.rating_snapshot >= 1400 THEN 'platinum'
		           WHEN q.rating_snapshot >= 1200 THEN 'gold'
		           WHEN q.rating_snapshot >= 1000 THEN 'silver'
		           ELSE 'bronze'
		         END
		       END,
		       CASE WHEN q.queue_mode='ranked' THEN COALESCE(sp.honor,0) END
		FROM pvp_matchmaking_queue q
		LEFT JOIN pvp_seasons s ON s.id=q.season_id
		LEFT JOIN pvp_season_profiles sp ON sp.season_id=q.season_id AND sp.character_id=q.character_id
		WHERE q.character_id=$1
	`, characterID, game.PvPRankedPlacementsRequired).Scan(&s.Rating, &s.CombatPower, &s.QueuedAt, &s.QueueMode, &seasonNumber, &tier, &honor)
	if seasonNumber.Valid {
		s.SeasonNumber = int(seasonNumber.Int64)
	}
	if tier.Valid {
		s.Tier = tier.String
	}
	if honor.Valid {
		s.Honor = honor.Int64
	}
	if errors.Is(err, sql.ErrNoRows) {
		return s, nil
	}
	if err != nil {
		return s, err
	}
	s.Queued = true
	return s, nil
}

type matchmakingCandidate struct {
	characterID     string
	accountID       string
	rating, power   int
	strategy        string
	strategyVersion int
	raw             []byte
	queuedAt        time.Time
	queueMode       string
	seasonID        string
}

func MatchPvPQueue(now time.Time, maxPairs int) ([]game.PvPMatch, error) {
	if maxPairs < 1 {
		maxPairs = 1
	}
	if maxPairs > 20 {
		maxPairs = 20
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM pvp_matchmaking_queue WHERE queued_at < $1`, now.UTC().Add(-30*time.Minute)); err != nil {
		return nil, err
	}
	rows, err := tx.Query(`
		SELECT q.character_id,COALESCE(c.account_id::text,''),q.rating_snapshot,q.combat_power_snapshot,
		       q.tactical_strategy,q.strategy_version,q.participant_snapshot,q.queued_at,
		       q.queue_mode,COALESCE(q.season_id::text,'')
		FROM pvp_matchmaking_queue q
		JOIN characters c ON c.id=q.character_id
		WHERE NOT EXISTS (
			SELECT 1 FROM pvp_match_participants pp JOIN pvp_matches m ON m.id=pp.match_id
			WHERE pp.character_id=q.character_id AND m.status IN ('ready','active')
		)
		  AND (
			q.queue_mode='casual' OR EXISTS(
				SELECT 1 FROM pvp_seasons season
				WHERE season.id=q.season_id AND season.status='active' AND season.ends_at > $1
			)
		  )
		ORDER BY q.queued_at
		FOR UPDATE OF q
	`, now.UTC())
	if err != nil {
		return nil, err
	}
	cands := []matchmakingCandidate{}
	for rows.Next() {
		var c matchmakingCandidate
		if err := rows.Scan(&c.characterID, &c.accountID, &c.rating, &c.power, &c.strategy, &c.strategyVersion, &c.raw, &c.queuedAt, &c.queueMode, &c.seasonID); err != nil {
			rows.Close()
			return nil, err
		}
		cands = append(cands, c)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	used := map[int]bool{}
	matches := []game.PvPMatch{}
	for i, a := range cands {
		if used[i] || len(matches) >= maxPairs {
			continue
		}
		best := -1
		bestScore := 1 << 30
		for j := i + 1; j < len(cands); j++ {
			if used[j] {
				continue
			}
			b := cands[j]
			if a.queueMode != b.queueMode || (a.accountID != "" && a.accountID == b.accountID) {
				continue
			}
			if a.queueMode == "ranked" && (a.seasonID == "" || a.seasonID != b.seasonID) {
				continue
			}
			wait := now.Sub(a.queuedAt)
			if w := now.Sub(b.queuedAt); w > wait {
				wait = w
			}
			mins := int(wait.Minutes())
			ratingTol := 100 + mins*50
			if ratingTol > 400 {
				ratingTol = 400
			}
			powerTol := 0.15 + float64(mins)*0.05
			if powerTol > 0.45 {
				powerTol = 0.45
			}
			rd := absInt(a.rating - b.rating)
			maxp := max(a.power, b.power)
			pd := float64(absInt(a.power-b.power)) / float64(max(1, maxp))
			if rd > ratingTol || pd > powerTol {
				continue
			}
			score := rd + int(pd*500)
			if score < bestScore {
				bestScore = score
				best = j
			}
		}
		if best < 0 {
			continue
		}

		b := cands[best]
		var pa, pb game.PvPParticipantSnapshot
		if err := json.Unmarshal(a.raw, &pa); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(b.raw, &pb); err != nil {
			return nil, err
		}
		pa.Team = game.CombatTeamA
		pb.Team = game.CombatTeamB
		pa.TacticalStrategy = game.NormalizePvPTacticalStrategy(a.strategy)
		pb.TacticalStrategy = game.NormalizePvPTacticalStrategy(b.strategy)
		pa.StrategyVersion = a.strategyVersion
		pb.StrategyVersion = b.strategyVersion
		rawA, _ := json.Marshal(pa)
		rawB, _ := json.Marshal(pb)

		ranked := a.queueMode == "ranked"
		origin := "matchmaking"
		if ranked {
			origin = "ranked_matchmaking"
		}
		var matchID string
		seed := now.UTC().UnixNano() + int64(i)
		if ranked {
			if err := tx.QueryRow(`
				INSERT INTO pvp_matches(challenge_id,mode,arena_key,status,rules_version,deterministic_seed,ready_expires_at,match_origin,ranked,season_id)
				VALUES(NULL,'duel','duel_arena','ready',$1,$2,$3,$4,true,$5::uuid)
				RETURNING id
			`, game.PvPCombatRulesVersion, seed, now.UTC().Add(60*time.Second), origin, a.seasonID).Scan(&matchID); err != nil {
				return nil, err
			}
		} else {
			if err := tx.QueryRow(`
				INSERT INTO pvp_matches(challenge_id,mode,arena_key,status,rules_version,deterministic_seed,ready_expires_at,match_origin,ranked)
				VALUES(NULL,'duel','duel_arena','ready',$1,$2,$3,$4,false)
				RETURNING id
			`, game.PvPCombatRulesVersion, seed, now.UTC().Add(60*time.Second), origin).Scan(&matchID); err != nil {
				return nil, err
			}
		}

		for _, v := range []struct {
			c   matchmakingCandidate
			p   game.PvPParticipantSnapshot
			raw []byte
		}{{a, pa, rawA}, {b, pb, rawB}} {
			if ranked {
				if _, err := tx.Exec(`
					INSERT INTO pvp_match_participants(match_id,character_id,team,snapshot,tactical_strategy,strategy_version,rating_before,combat_power,season_rating_before)
					VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$7)
				`, matchID, v.c.characterID, v.p.Team, string(v.raw), v.p.TacticalStrategy, v.p.StrategyVersion, v.c.rating, v.c.power); err != nil {
					return nil, err
				}
			} else if _, err := tx.Exec(`
				INSERT INTO pvp_match_participants(match_id,character_id,team,snapshot,tactical_strategy,strategy_version,rating_before,combat_power)
				VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
			`, matchID, v.c.characterID, v.p.Team, string(v.raw), v.p.TacticalStrategy, v.p.StrategyVersion, v.c.rating, v.c.power); err != nil {
				return nil, err
			}
		}
		if err := appendPvPMatchEventTx(tx, matchID, "MATCH_READY", map[string]any{
			"origin": origin, "rules_version": game.PvPCombatRulesVersion, "ranked": ranked,
		}, now); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`DELETE FROM pvp_matchmaking_queue WHERE character_id IN ($1,$2)`, a.characterID, b.characterID); err != nil {
			return nil, err
		}
		m, err := getPvPMatchTx(tx, matchID)
		if err != nil {
			return nil, err
		}
		matches = append(matches, m)
		used[i] = true
		used[best] = true
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return matches, nil
}

func absInt(v int) int {
	if v < 0 {
		return -v
	}
	return v
}
