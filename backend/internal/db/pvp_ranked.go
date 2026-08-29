package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/atlas/backend/pkg/game"
)

const pvpSeasonAdvisoryKey = "atlas_pvp_season_v1"

type seasonScanner interface{ Scan(dest ...any) error }

func scanPvPSeason(row seasonScanner) (game.PvPSeason, error) {
	var season game.PvPSeason
	var closed sql.NullTime
	err := row.Scan(&season.ID, &season.Number, &season.Name, &season.Status, &season.StartsAt, &season.EndsAt, &closed)
	if closed.Valid {
		value := closed.Time
		season.ClosedAt = &value
	}
	return season, err
}

func getActivePvPSeasonTx(tx *sql.Tx) (game.PvPSeason, error) {
	return scanPvPSeason(tx.QueryRow(`
		SELECT id,season_number,name,status,starts_at,ends_at,closed_at
		FROM pvp_seasons WHERE status='active' ORDER BY season_number DESC LIMIT 1 FOR UPDATE
	`))
}

func createNextPvPSeasonTx(tx *sql.Tx, now time.Time) (game.PvPSeason, error) {
	var next int
	if err := tx.QueryRow(`SELECT COALESCE(MAX(season_number),0)+1 FROM pvp_seasons`).Scan(&next); err != nil {
		return game.PvPSeason{}, err
	}
	name := fmt.Sprintf("Temporada %d", next)
	return scanPvPSeason(tx.QueryRow(`
		INSERT INTO pvp_seasons(season_number,name,status,starts_at,ends_at)
		VALUES($1,$2,'active',$3,$4)
		RETURNING id,season_number,name,status,starts_at,ends_at,closed_at
	`, next, name, now.UTC(), now.UTC().Add(game.PvPSeasonLength)))
}

func seedPvPSeasonRewardsTx(tx *sql.Tx, season game.PvPSeason, now time.Time) error {
	type eligibleReward struct {
		characterID string
		rating      int
		placements  int
	}
	rows, err := tx.Query(`
		SELECT character_id,rating,placements_played
		FROM pvp_season_profiles WHERE season_id=$1 AND placements_played >= $2
	`, season.ID, game.PvPRankedPlacementsRequired)
	if err != nil {
		return err
	}
	eligible := make([]eligibleReward, 0)
	for rows.Next() {
		var item eligibleReward
		if err := rows.Scan(&item.characterID, &item.rating, &item.placements); err != nil {
			rows.Close()
			return err
		}
		eligible = append(eligible, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()

	// Não executamos INSERTs enquanto o SELECT anterior ainda mantém Rows
	// aberto na mesma transação/conexão. Isso evita depender de múltiplos
	// result sets simultâneos, algo que drivers PostgreSQL como lib/pq não
	// garantem dentro de um único sql.Tx.
	for _, item := range eligible {
		tier := game.PvPRankTier(item.rating, item.placements)
		bundle := game.PvPSeasonRewardBundle(season.Number, tier)
		if len(bundle) == 0 {
			continue
		}
		raw, err := json.Marshal(bundle)
		if err != nil {
			return err
		}
		rewardKey := fmt.Sprintf("season_%d_%s_bundle", season.Number, tier.Key)
		if _, err := tx.Exec(`
			INSERT INTO pvp_rewards(season_id,character_id,reward_key,reward_type,metadata,earned_at)
			VALUES($1,$2,$3,'bundle',$4::jsonb,$5)
			ON CONFLICT(season_id,character_id,reward_key) DO NOTHING
		`, season.ID, item.characterID, rewardKey, string(raw), now.UTC()); err != nil {
			return err
		}
	}
	return nil
}

func closePvPSeasonTx(tx *sql.Tx, season game.PvPSeason, now time.Time) error {
	if season.Status != "active" {
		return nil
	}
	if err := seedPvPSeasonRewardsTx(tx, season, now); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE pvp_seasons SET status='ended',closed_at=$2 WHERE id=$1 AND status='active'`, season.ID, now.UTC()); err != nil {
		return err
	}
	// Uma fila ranqueada nunca atravessa a fronteira de temporada com snapshot antigo.
	_, err := tx.Exec(`DELETE FROM pvp_matchmaking_queue WHERE queue_mode='ranked' AND season_id=$1`, season.ID)
	return err
}

func ensureActivePvPSeasonTx(tx *sql.Tx, now time.Time) (game.PvPSeason, error) {
	if _, err := tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1))`, pvpSeasonAdvisoryKey); err != nil {
		return game.PvPSeason{}, err
	}
	season, err := getActivePvPSeasonTx(tx)
	if errors.Is(err, sql.ErrNoRows) {
		return createNextPvPSeasonTx(tx, now)
	}
	if err != nil {
		return game.PvPSeason{}, err
	}
	if !season.EndsAt.After(now.UTC()) {
		var activeMatches int
		if err := tx.QueryRow(`
			SELECT COUNT(*) FROM pvp_matches
			WHERE ranked=true AND season_id=$1 AND status IN ('ready','active')
		`, season.ID).Scan(&activeMatches); err != nil {
			return game.PvPSeason{}, err
		}
		if activeMatches > 0 {
			// A temporada entra em fechamento: não criamos nova fila enquanto uma
			// luta já selada ainda precisa aplicar o resultado na temporada antiga.
			return season, nil
		}
		if err := closePvPSeasonTx(tx, season, now); err != nil {
			return game.PvPSeason{}, err
		}
		return createNextPvPSeasonTx(tx, now)
	}
	return season, nil
}

func RefreshPvPSeasonLifecycle(now time.Time) (game.PvPSeason, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return game.PvPSeason{}, err
	}
	defer tx.Rollback()
	season, err := ensureActivePvPSeasonTx(tx, now)
	if err != nil {
		return game.PvPSeason{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.PvPSeason{}, err
	}
	return season, nil
}

func scanPvPRankedProfile(row seasonScanner, season game.PvPSeason) (game.PvPRankedProfile, error) {
	var profile game.PvPRankedProfile
	err := row.Scan(&profile.SeasonID, &profile.CharacterID, &profile.Rating, &profile.PeakRating, &profile.Wins, &profile.Losses, &profile.Draws, &profile.PlacementsPlayed, &profile.Honor)
	if err == nil {
		profile.Tier = game.PvPRankTier(profile.Rating, profile.PlacementsPlayed)
	}
	return profile, err
}

func ensurePvPSeasonProfileTx(tx *sql.Tx, season game.PvPSeason, characterID string) (game.PvPRankedProfile, error) {
	profile, err := scanPvPRankedProfile(tx.QueryRow(`
		SELECT season_id,character_id,rating,peak_rating,wins,losses,draws,placements_played,honor
		FROM pvp_season_profiles WHERE season_id=$1 AND character_id=$2 FOR UPDATE
	`, season.ID, characterID), season)
	if err == nil {
		return profile, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return game.PvPRankedProfile{}, err
	}

	previous := game.PvPDefaultRating
	_ = tx.QueryRow(`
		SELECT sp.rating FROM pvp_season_profiles sp
		JOIN pvp_seasons s ON s.id=sp.season_id
		WHERE sp.character_id=$1 AND s.season_number < $2
		ORDER BY s.season_number DESC LIMIT 1
	`, characterID, season.Number).Scan(&previous)
	seed := game.PvPSoftResetRating(previous)
	return scanPvPRankedProfile(tx.QueryRow(`
		INSERT INTO pvp_season_profiles(season_id,character_id,rating,peak_rating)
		VALUES($1,$2,$3,$3)
		RETURNING season_id,character_id,rating,peak_rating,wins,losses,draws,placements_played,honor
	`, season.ID, characterID, seed), season)
}

func listPendingPvPRewardsTx(tx *sql.Tx, characterID string) ([]game.PvPSeasonReward, error) {
	rows, err := tx.Query(`
		SELECT r.id,r.season_id,s.season_number,r.reward_key,r.reward_type,r.metadata,r.earned_at,r.claimed_at
		FROM pvp_rewards r JOIN pvp_seasons s ON s.id=r.season_id
		WHERE r.character_id=$1 AND r.claimed_at IS NULL
		ORDER BY s.season_number DESC,r.earned_at DESC
	`, characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []game.PvPSeasonReward{}
	for rows.Next() {
		var reward game.PvPSeasonReward
		var raw []byte
		var claimed sql.NullTime
		if err := rows.Scan(&reward.ID, &reward.SeasonID, &reward.SeasonNumber, &reward.RewardKey, &reward.RewardType, &raw, &reward.EarnedAt, &claimed); err != nil {
			return nil, err
		}
		reward.Metadata = map[string]string{}
		_ = json.Unmarshal(raw, &reward.Metadata)
		if claimed.Valid {
			value := claimed.Time
			reward.ClaimedAt = &value
		}
		out = append(out, reward)
	}
	return out, rows.Err()
}

func GetPvPSeasonStatus(characterID string, now time.Time) (game.PvPSeasonStatus, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return game.PvPSeasonStatus{}, err
	}
	defer tx.Rollback()
	season, err := ensureActivePvPSeasonTx(tx, now)
	if err != nil {
		return game.PvPSeasonStatus{}, err
	}
	profile, err := ensurePvPSeasonProfileTx(tx, season, characterID)
	if err != nil {
		return game.PvPSeasonStatus{}, err
	}
	rewards, err := listPendingPvPRewardsTx(tx, characterID)
	if err != nil {
		return game.PvPSeasonStatus{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.PvPSeasonStatus{}, err
	}
	return game.PvPSeasonStatus{Season: season, Profile: profile, PendingRewards: rewards}, nil
}

func ListPvPLadder(characterID string, now time.Time, limit int) ([]game.PvPLadderEntry, error) {
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	season, err := ensureActivePvPSeasonTx(tx, now)
	if err != nil {
		return nil, err
	}
	rows, err := tx.Query(`
		SELECT sp.character_id,c.name,c.level,sp.rating,sp.peak_rating,sp.wins,sp.losses,sp.draws,sp.honor
		FROM pvp_season_profiles sp JOIN characters c ON c.id=sp.character_id
		WHERE sp.season_id=$1 AND sp.placements_played >= $2
		ORDER BY sp.rating DESC,sp.honor DESC,sp.wins DESC,sp.updated_at ASC LIMIT $3
	`, season.ID, game.PvPRankedPlacementsRequired, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []game.PvPLadderEntry{}
	rank := 0
	for rows.Next() {
		rank++
		var e game.PvPLadderEntry
		if err := rows.Scan(&e.CharacterID, &e.Name, &e.Level, &e.Rating, &e.PeakRating, &e.Wins, &e.Losses, &e.Draws, &e.Honor); err != nil {
			return nil, err
		}
		e.Rank = rank
		e.Tier = game.PvPRankTier(e.Rating, game.PvPRankedPlacementsRequired)
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return out, nil
}

func ClaimPvPSeasonRewards(characterID string, now time.Time) ([]game.PvPSeasonReward, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	rows, err := tx.Query(`
		SELECT r.id,r.season_id,s.season_number,r.reward_key,r.reward_type,r.metadata,r.earned_at
		FROM pvp_rewards r JOIN pvp_seasons s ON s.id=r.season_id
		WHERE r.character_id=$1 AND r.claimed_at IS NULL FOR UPDATE OF r
	`, characterID)
	if err != nil {
		return nil, err
	}
	pending := []game.PvPSeasonReward{}
	for rows.Next() {
		var reward game.PvPSeasonReward
		var raw []byte
		if err := rows.Scan(&reward.ID, &reward.SeasonID, &reward.SeasonNumber, &reward.RewardKey, &reward.RewardType, &raw, &reward.EarnedAt); err != nil {
			rows.Close()
			return nil, err
		}
		reward.Metadata = map[string]string{}
		_ = json.Unmarshal(raw, &reward.Metadata)
		pending = append(pending, reward)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	claimed := make([]game.PvPSeasonReward, 0, len(pending))
	for _, reward := range pending {
		for cosmeticType, metadataKey := range map[string]string{"title": "title_key", "banner": "banner_key", "cosmetic": "cosmetic_key"} {
			key := reward.Metadata[metadataKey]
			if key == "" {
				continue
			}
			if _, err := tx.Exec(`INSERT INTO pvp_cosmetic_unlocks(character_id,cosmetic_type,cosmetic_key,source_season_id,unlocked_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, characterID, cosmeticType, key, reward.SeasonID, now.UTC()); err != nil {
				return nil, err
			}
		}
		result, err := tx.Exec(`UPDATE pvp_rewards SET claimed_at=$2 WHERE id=$1 AND claimed_at IS NULL`, reward.ID, now.UTC())
		if err != nil {
			return nil, err
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return nil, err
		}
		if affected != 1 {
			return nil, fmt.Errorf("recompensa PvP já foi processada em outra transação")
		}
		value := now.UTC()
		reward.ClaimedAt = &value
		claimed = append(claimed, reward)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return claimed, nil
}

func JoinPvPRankedMatchmaking(characterID, tacticalStrategy string, strategyVersion int, now time.Time) (game.PvPMatchmakingStatus, error) {
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
	season, err := ensureActivePvPSeasonTx(tx, now)
	if err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	if !season.EndsAt.After(now.UTC()) {
		return game.PvPMatchmakingStatus{}, fmt.Errorf("a temporada ranqueada está encerrando; aguarde a próxima temporada")
	}
	var active string
	if err := tx.QueryRow(`SELECT COALESCE(active_pvp_match_id,'') FROM characters WHERE id=$1 FOR UPDATE`, characterID).Scan(&active); err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	if active != "" {
		return game.PvPMatchmakingStatus{}, fmt.Errorf("personagem já está em uma Arena PvP")
	}
	profile, err := ensurePvPSeasonProfileTx(tx, season, characterID)
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
	if _, err := tx.Exec(`
		INSERT INTO pvp_matchmaking_queue(character_id,rating_snapshot,combat_power_snapshot,tactical_strategy,strategy_version,participant_snapshot,queued_at,heartbeat_at,queue_mode,season_id)
		VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$7,'ranked',$8)
		ON CONFLICT(character_id) DO UPDATE SET rating_snapshot=$2,combat_power_snapshot=$3,tactical_strategy=$4,strategy_version=$5,participant_snapshot=$6::jsonb,queued_at=$7,heartbeat_at=$7,queue_mode='ranked',season_id=$8
	`, characterID, profile.Rating, snapshot.CombatPower, strategy, strategyVersion, string(raw), now.UTC(), season.ID); err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.PvPMatchmakingStatus{}, err
	}
	return game.PvPMatchmakingStatus{Queued: true, Rating: profile.Rating, CombatPower: snapshot.CombatPower, QueuedAt: now.UTC(), QueueMode: "ranked", SeasonNumber: season.Number, Tier: profile.Tier.Key, Honor: profile.Honor}, nil
}

func recentRankedPairCountTx(tx *sql.Tx, matchID, seasonID, aID, bID string, now time.Time) (int, error) {
	var count int
	err := tx.QueryRow(`
		SELECT COUNT(*) FROM pvp_matches m
		WHERE m.id<>$1 AND m.ranked=true AND m.season_id=$2 AND m.status='completed'
		  AND m.ended_at >= $5
		  AND EXISTS(SELECT 1 FROM pvp_match_participants p WHERE p.match_id=m.id AND p.character_id=$3)
		  AND EXISTS(SELECT 1 FROM pvp_match_participants p WHERE p.match_id=m.id AND p.character_id=$4)
	`, matchID, seasonID, aID, bID, now.UTC().Add(-24*time.Hour)).Scan(&count)
	return count, err
}

func applyPvPRankedResultTx(tx *sql.Tx, matchID, winnerID string, now time.Time) error {
	var seasonID string
	var seasonNumber int
	if err := tx.QueryRow(`SELECT m.season_id,s.season_number FROM pvp_matches m JOIN pvp_seasons s ON s.id=m.season_id WHERE m.id=$1 AND m.ranked=true FOR UPDATE`, matchID).Scan(&seasonID, &seasonNumber); err != nil {
		return err
	}
	rows, err := tx.Query(`SELECT character_id,COALESCE(season_rating_before,rating_before) FROM pvp_match_participants WHERE match_id=$1 ORDER BY team`, matchID)
	if err != nil {
		return err
	}
	type participant struct {
		id     string
		rating int
	}
	players := []participant{}
	for rows.Next() {
		var p participant
		if err := rows.Scan(&p.id, &p.rating); err != nil {
			rows.Close()
			return err
		}
		players = append(players, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	if len(players) != 2 {
		return fmt.Errorf("partida ranqueada sem dois participantes")
	}
	recent, err := recentRankedPairCountTx(tx, matchID, seasonID, players[0].id, players[1].id, now)
	if err != nil {
		return err
	}
	multiplier := game.PvPRepeatOpponentMultiplier(recent)
	scoreA := 0.5
	if winnerID == players[0].id {
		scoreA = 1
	} else if winnerID == players[1].id {
		scoreA = 0
	}
	deltaA := game.PvPRankedRatingDelta(players[0].rating, players[1].rating, scoreA, multiplier)
	deltaB := game.PvPRankedRatingDelta(players[1].rating, players[0].rating, 1-scoreA, multiplier)
	after := []int{max(0, players[0].rating+deltaA), max(0, players[1].rating+deltaB)}
	for i, p := range players {
		result := "loss"
		win, loss, draw := 0, 0, 0
		if winnerID == "" {
			result = "draw"
			draw = 1
		} else if winnerID == p.id {
			result = "win"
			win = 1
		} else {
			loss = 1
		}
		honor := game.PvPHonorAward(result, multiplier)
		season := game.PvPSeason{ID: seasonID, Number: seasonNumber}
		profile, err := ensurePvPSeasonProfileTx(tx, season, p.id)
		if err != nil {
			return err
		}
		placements := profile.PlacementsPlayed + 1
		peak := max(profile.PeakRating, after[i])
		if _, err := tx.Exec(`UPDATE pvp_season_profiles SET rating=$3,peak_rating=$4,wins=wins+$5,losses=losses+$6,draws=draws+$7,placements_played=$8,honor=honor+$9,updated_at=$10 WHERE season_id=$1 AND character_id=$2`, seasonID, p.id, after[i], peak, win, loss, draw, placements, honor, now.UTC()); err != nil {
			return err
		}
		if _, err := tx.Exec(`UPDATE pvp_match_participants SET season_rating_after=$3,rating_after=$3,honor_awarded=$4 WHERE match_id=$1 AND character_id=$2`, matchID, p.id, after[i], honor); err != nil {
			return err
		}
		// Perfil geral conserva estatísticas vitalícias; rating geral/casual não é alterado pela temporada.
		if _, err := tx.Exec(`INSERT INTO pvp_profiles(character_id,wins,losses,draws,season) VALUES($1,$2,$3,$4,$5) ON CONFLICT(character_id) DO UPDATE SET wins=pvp_profiles.wins+$2,losses=pvp_profiles.losses+$3,draws=pvp_profiles.draws+$4,season=$5,updated_at=$6`, p.id, win, loss, draw, seasonNumber, now.UTC()); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(`UPDATE pvp_matches SET competitive_applied_at=$2,repeat_multiplier=$3 WHERE id=$1 AND competitive_applied_at IS NULL`, matchID, now.UTC(), multiplier); err != nil {
		return err
	}
	return appendPvPMatchEventTx(tx, matchID, "RANKED_RESULT_APPLIED", map[string]any{"winner_id": winnerID, "season": seasonNumber, "repeat_multiplier": multiplier, "a_delta": deltaA, "b_delta": deltaB}, now)
}
