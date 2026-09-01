package db

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/atlas/backend/pkg/game"
)

type scoutingMissionRow struct {
	ID                  string
	AttackerSettlement  string
	DefenderSettlement  string
	AttackerCharacter   string
	DefenderCharacter   string
	AttackerName        string
	DefenderName        string
	DefenderStage       string
	AttackerX           int
	AttackerY           int
	DefenderX           int
	DefenderY           int
	Distance            float64
	GoldCost            int64
	TrackerLevel        int
	CoordinationPercent int
	StartedAt           time.Time
	CompletesAt         time.Time
}

func spendScoutingTreasuryTx(tx *sql.Tx, charID, requestID, targetSettlementID string, cost int64) error {
	if cost <= 0 {
		return nil
	}
	treasury, err := lockSettlementTreasuryTx(tx, charID)
	if err != nil {
		return err
	}
	if treasury.Balance < cost {
		deficit := cost - treasury.Balance
		if !treasury.AutoFundEnabled {
			return fmt.Errorf("a Tesouraria precisa de %d ouro para enviar os batedores", deficit)
		}
		var heroGold int64
		if err := tx.QueryRow(`SELECT gold_bank FROM characters WHERE id=$1 FOR UPDATE`, charID).Scan(&heroGold); err != nil {
			return err
		}
		if heroGold-deficit < treasury.PersonalGoldReserve {
			return fmt.Errorf("faltam %d ouro na Tesouraria; o financiamento automático preserva %d ouro pessoal do herói", deficit, treasury.PersonalGoldReserve)
		}
		if _, err := tx.Exec(`UPDATE characters SET gold_bank=gold_bank-$2,state_revision=state_revision+1 WHERE id=$1`, charID, deficit); err != nil {
			return err
		}
		treasury.Balance += deficit
		if _, err := tx.Exec(`UPDATE settlements SET treasury_balance=treasury_balance+$2,treasury_lifetime_income=treasury_lifetime_income+$2,revision=revision+1,updated_at=NOW() WHERE id=$1`, treasury.SettlementID, deficit); err != nil {
			return err
		}
		if err := insertSettlementGoldLedgerTx(tx, treasury.SettlementID, charID, requestID, "auto_fund", "scouting", deficit, treasury.Balance, map[string]any{"target_settlement_id": targetSettlementID}); err != nil {
			return err
		}
	}

	treasury.Balance -= cost
	if _, err := tx.Exec(`
		UPDATE settlements
		SET treasury_balance=treasury_balance-$2,
		    treasury_lifetime_expenses=treasury_lifetime_expenses+$2,
		    revision=revision+1,updated_at=NOW()
		WHERE id=$1`, treasury.SettlementID, cost); err != nil {
		return err
	}
	return insertSettlementGoldLedgerTx(tx, treasury.SettlementID, charID, requestID, "scouting_dispatch", targetSettlementID, -cost, treasury.Balance, map[string]any{"rules_version": game.SettlementScoutingRulesVersion})
}

func resonatorScoutingPresence(level, quality int) string {
	if quality < 45 {
		return "unknown"
	}
	if level <= 0 {
		return "not_observed"
	}
	if quality >= 80 {
		return "confirmed"
	}
	return "likely"
}

func finalizeScoutingMissionTx(tx *sql.Tx, missionID string, now time.Time) (bool, error) {
	var row scoutingMissionRow
	err := tx.QueryRow(`
		SELECT mission.id::text,mission.attacker_settlement_id::text,mission.defender_settlement_id::text,
		       attacker.character_id::text,defender.character_id::text,attacker.name,defender.name,defender.stage_key,
		       attacker.world_x,attacker.world_y,defender.world_x,defender.world_y,
		       mission.distance,mission.gold_cost,mission.tracker_level,mission.coordination_percent,
		       mission.started_at,mission.completes_at
		FROM settlement_scouting_missions mission
		JOIN settlements attacker ON attacker.id=mission.attacker_settlement_id
		JOIN settlements defender ON defender.id=mission.defender_settlement_id
		WHERE mission.id=$1 AND mission.state='active' FOR UPDATE`, missionID).Scan(
		&row.ID, &row.AttackerSettlement, &row.DefenderSettlement,
		&row.AttackerCharacter, &row.DefenderCharacter, &row.AttackerName, &row.DefenderName, &row.DefenderStage,
		&row.AttackerX, &row.AttackerY, &row.DefenderX, &row.DefenderY,
		&row.Distance, &row.GoldCost, &row.TrackerLevel, &row.CoordinationPercent,
		&row.StartedAt, &row.CompletesAt,
	)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if row.CompletesAt.After(now) {
		return false, nil
	}

	defenderLevels, err := settlementBuildingLevelsTx(tx, row.DefenderCharacter)
	if err != nil {
		return false, err
	}
	defenderDetection := game.ScoutingDetectionForLevels(defenderLevels)
	quality := game.CalculateScoutingQuality(row.Distance, row.TrackerLevel, row.CoordinationPercent, defenderDetection)
	detectionChance := game.CalculateScoutingDetectionChance(row.TrackerLevel, row.CoordinationPercent, defenderDetection)

	if _, err := tx.Exec(`
		INSERT INTO settlement_pvp_settings(settlement_id)
		VALUES($1) ON CONFLICT(settlement_id) DO NOTHING`, row.DefenderSettlement); err != nil {
		return false, err
	}
	_, payload, err := settlementDefenseSnapshotPayloadTx(tx, row.DefenderCharacter)
	if err != nil {
		return false, fmt.Errorf("gerar fotografia privada para scouting: %w", err)
	}
	privateSnapshot, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}
	snapshotHash := fmt.Sprintf("%x", sha256.Sum256(privateSnapshot))
	detected := game.DeterministicScoutingDetected(row.ID+":"+snapshotHash+":detect", detectionChance)
	sourceIdentified := detected && defenderDetection >= 25

	capacity, err := campStorageCapacityTx(tx, row.DefenderCharacter)
	if err != nil {
		return false, err
	}
	resourceSnapshot, err := getSnapshotWithinTx(tx, row.DefenderCharacter, capacity)
	if err != nil {
		return false, err
	}
	var treasuryBalance int64
	if err := tx.QueryRow(`SELECT treasury_balance FROM settlements WHERE id=$1`, row.DefenderSettlement).Scan(&treasuryBalance); err != nil {
		return false, err
	}

	storageProtection := int64(payload.Evaluation.Protection.StoragePercent)
	treasuryProtection := int64(payload.Evaluation.Protection.TreasuryPercent)
	exposedStorage := resourceSnapshot.StorageUsed * maxInt64(0, 100-storageProtection) / 100
	exposedTreasury := treasuryBalance * maxInt64(0, 100-treasuryProtection) / 100
	completedAt := row.CompletesAt.UTC()
	expiresAt := completedAt.Add(game.SettlementScoutingReportTTL)
	report := game.SettlementScoutingReport{
		MissionID:            row.ID,
		TargetSettlementID:   row.DefenderSettlement,
		TargetName:           row.DefenderName,
		TargetStageKey:       row.DefenderStage,
		TargetX:              row.DefenderX,
		TargetY:              row.DefenderY,
		Distance:             math.Round(row.Distance*100) / 100,
		Quality:              quality,
		ConfidenceKey:        game.ScoutingConfidenceKey(quality),
		DefensePower:         game.ScoutingEstimate(payload.Evaluation.DefensePower, quality, 0),
		WallLevel:            game.ScoutingEstimate(defenderLevels["wall"], quality, 3),
		WatchtowerLevel:      game.ScoutingEstimate(defenderLevels["watchtower"], quality, 3),
		Garrison:             game.ScoutingEstimate(payload.Evaluation.Garrison.ActiveGuards, quality, max(1, payload.Evaluation.Garrison.Capacity)),
		ResonatorPresence:    resonatorScoutingPresence(defenderLevels["resonator"], quality),
		StorageExposureKey:   game.ScoutingExposureBand(exposedStorage),
		TreasuryExposureKey:  game.ScoutingTreasuryExposureBand(exposedTreasury),
		Detected:             detected,
		GeneratedAt:          completedAt,
		ExpiresAt:            expiresAt,
		DefenderSnapshotHash: snapshotHash,
	}
	reportJSON, err := json.Marshal(report)
	if err != nil {
		return false, err
	}
	result, err := tx.Exec(`
		UPDATE settlement_scouting_missions
		SET state='completed',quality=$2,detection_percent=$3,detected=$4,source_identified=$5,
		    defender_snapshot_hash=$6,report=$7::jsonb,completed_at=$8,report_expires_at=$9
		WHERE id=$1 AND state='active'`, row.ID, quality, detectionChance, detected, sourceIdentified, snapshotHash, string(reportJSON), completedAt, expiresAt)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	return err == nil && affected > 0, err
}

func reconcileScoutingMissionsTx(tx *sql.Tx, settlementID string, now time.Time) error {
	rows, err := tx.Query(`
		SELECT id::text
		FROM settlement_scouting_missions
		WHERE state='active' AND completes_at <= $2
		  AND (attacker_settlement_id=$1 OR defender_settlement_id=$1)
		ORDER BY completes_at,id FOR UPDATE`, settlementID, now.UTC())
	if err != nil {
		return err
	}
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	if err := rows.Close(); err != nil {
		return err
	}
	for _, id := range ids {
		if _, err := finalizeScoutingMissionTx(tx, id, now); err != nil {
			return err
		}
	}
	return nil
}

func StartSettlementScouting(charID, targetSettlementID, requestID string, now time.Time) (*game.SettlementScoutingState, error) {
	if charID == "" || targetSettlementID == "" || requestID == "" {
		return nil, fmt.Errorf("personagem, alvo e request_id são obrigatórios")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var attackerSettlementID, attackerWorldID, attackerStage string
	var attackerX, attackerY int
	if err := tx.QueryRow(`SELECT id::text,world_id::text,stage_key,world_x,world_y FROM settlements WHERE character_id=$1 FOR UPDATE`, charID).
		Scan(&attackerSettlementID, &attackerWorldID, &attackerStage, &attackerX, &attackerY); err != nil {
		return nil, err
	}
	if err := reconcileScoutingMissionsTx(tx, attackerSettlementID, now); err != nil {
		return nil, err
	}

	var existingID string
	err = tx.QueryRow(`SELECT id::text FROM settlement_scouting_missions WHERE attacker_settlement_id=$1 AND request_id=$2`, attackerSettlementID, requestID).Scan(&existingID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if err == nil {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetSettlementScoutingState(charID, now)
	}

	levels, err := settlementBuildingLevelsTx(tx, charID)
	if err != nil {
		return nil, err
	}
	warRoomLevel := levels["war_room"]
	if !game.SettlementScoutingUnlocked(attackerStage, warRoomLevel) {
		return nil, fmt.Errorf("construa a Sala de Guerra para liberar Inteligência")
	}
	slots := game.ScoutingSlotsForWarRoom(warRoomLevel)
	var activeCount int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM settlement_scouting_missions WHERE attacker_settlement_id=$1 AND state='active'`, attackerSettlementID).Scan(&activeCount); err != nil {
		return nil, err
	}
	if activeCount >= slots {
		return nil, fmt.Errorf("todos os %d espaço(s) de scouting da Sala de Guerra estão ocupados", slots)
	}

	var targetWorldID, targetName, targetStage string
	var targetX, targetY int
	if err := tx.QueryRow(`SELECT world_id::text,name,stage_key,world_x,world_y FROM settlements WHERE id=$1`, targetSettlementID).
		Scan(&targetWorldID, &targetName, &targetStage, &targetX, &targetY); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("assentamento alvo não encontrado")
		}
		return nil, err
	}
	if targetSettlementID == attackerSettlementID {
		return nil, fmt.Errorf("seus batedores já conhecem o próprio Reino")
	}
	if targetWorldID != attackerWorldID {
		return nil, fmt.Errorf("o alvo pertence a outro mundo")
	}

	var activePair bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM settlement_scouting_missions WHERE attacker_settlement_id=$1 AND defender_settlement_id=$2 AND state='active')`, attackerSettlementID, targetSettlementID).Scan(&activePair); err != nil {
		return nil, err
	}
	if activePair {
		return nil, fmt.Errorf("já existe uma missão de scouting em andamento contra este Reino")
	}

	trackerLevel := 1
	if err := tx.QueryRow(`SELECT level FROM character_professions WHERE character_id=$1 AND profession_key='tracker'`, charID).Scan(&trackerLevel); err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("consultar nível de rastreador: %w", err)
	}
	trackerLevel = max(1, trackerLevel)
	coordination := game.ScoutingCoordinationForLevels(levels)
	distance := game.WorldDistance(game.WorldCoordinate{X: attackerX, Y: attackerY}, game.WorldCoordinate{X: targetX, Y: targetY})
	cost := game.CalculateScoutingGoldCost(distance)
	duration := game.CalculateScoutingDuration(distance, trackerLevel, coordination)
	if err := spendScoutingTreasuryTx(tx, charID, requestID, targetSettlementID, cost); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(`
		INSERT INTO settlement_scouting_missions(
			attacker_settlement_id,defender_settlement_id,request_id,rules_version,state,distance,gold_cost,
			tracker_level,coordination_percent,started_at,completes_at
		) VALUES($1,$2,$3,$4,'active',$5,$6,GREATEST(1, LEAST(50, $7)),$8,$9,$10)`,
		attackerSettlementID, targetSettlementID, requestID, game.SettlementScoutingRulesVersion,
		distance, cost, trackerLevel, coordination, now.UTC(), now.UTC().Add(duration)); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetSettlementScoutingState(charID, now)
}

type ScoutingCompletionEvent struct {
	AttackerCharacterID string
	DefenderCharacterID string
	TargetSettlementID  string
	TargetName          string
	Detected            bool
	SourceIdentified    bool
}

// ReconcileDueScoutingMissions conclui missões vencidas independentemente de o
// atacante estar com o mapa aberto. O scheduler global chama esta função na
// réplica líder, preservando alertas de contraespionagem em tempo quase real.
func ReconcileDueScoutingMissions(now time.Time, limit int) ([]ScoutingCompletionEvent, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := DB.Query(`
		SELECT id::text
		FROM settlement_scouting_missions
		WHERE state='active' AND completes_at <= $1
		ORDER BY completes_at,id LIMIT $2`, now.UTC(), limit)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, limit)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	events := make([]ScoutingCompletionEvent, 0, len(ids))
	for _, id := range ids {
		tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
		if err != nil {
			return events, err
		}
		changed, err := finalizeScoutingMissionTx(tx, id, now)
		if err != nil {
			_ = tx.Rollback()
			return events, err
		}
		if !changed {
			_ = tx.Rollback()
			continue
		}
		var event ScoutingCompletionEvent
		if err := tx.QueryRow(`
			SELECT attacker.character_id::text,defender.character_id::text,defender.id::text,defender.name,
			       mission.detected,mission.source_identified
			FROM settlement_scouting_missions mission
			JOIN settlements attacker ON attacker.id=mission.attacker_settlement_id
			JOIN settlements defender ON defender.id=mission.defender_settlement_id
			WHERE mission.id=$1`, id).Scan(
			&event.AttackerCharacterID, &event.DefenderCharacterID, &event.TargetSettlementID, &event.TargetName,
			&event.Detected, &event.SourceIdentified,
		); err != nil {
			_ = tx.Rollback()
			return events, err
		}
		if err := tx.Commit(); err != nil {
			return events, err
		}
		events = append(events, event)
	}
	return events, nil
}

func GetSettlementScoutingState(charID string, now time.Time) (*game.SettlementScoutingState, error) {
	if charID == "" {
		return nil, fmt.Errorf("personagem obrigatório")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var settlementID, stageKey string
	if err := tx.QueryRow(`SELECT id::text,stage_key FROM settlements WHERE character_id=$1 FOR UPDATE`, charID).Scan(&settlementID, &stageKey); err != nil {
		return nil, err
	}
	if err := reconcileScoutingMissionsTx(tx, settlementID, now); err != nil {
		return nil, err
	}
	levels, err := settlementBuildingLevelsTx(tx, charID)
	if err != nil {
		return nil, err
	}
	warRoomLevel := levels["war_room"]
	trackerLevel := 1
	_ = tx.QueryRow(`SELECT level FROM character_professions WHERE character_id=$1 AND profession_key='tracker'`, charID).Scan(&trackerLevel)
	if trackerLevel < 1 {
		trackerLevel = 1
	}
	state := &game.SettlementScoutingState{
		RulesVersion: game.SettlementScoutingRulesVersion,
		Unlocked:     game.SettlementScoutingUnlocked(stageKey, warRoomLevel),
		Slots:        game.ScoutingSlotsForWarRoom(warRoomLevel),
		TrackerLevel: trackerLevel,
		Coordination: game.ScoutingCoordinationForLevels(levels),
		Active:       []game.SettlementScoutingMission{},
		Reports:      []game.SettlementScoutingReport{},
		Alerts:       []game.SettlementScoutingAlert{},
		GeneratedAt:  now.UTC(),
	}

	rows, err := tx.Query(`
		SELECT mission.id::text,defender.id::text,defender.name,defender.stage_key,defender.world_x,defender.world_y,
		       mission.distance,mission.state,mission.gold_cost,mission.tracker_level,mission.coordination_percent,
		       mission.started_at,mission.completes_at
		FROM settlement_scouting_missions mission
		JOIN settlements defender ON defender.id=mission.defender_settlement_id
		WHERE mission.attacker_settlement_id=$1 AND mission.state='active'
		ORDER BY mission.completes_at,mission.id`, settlementID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var mission game.SettlementScoutingMission
		if err := rows.Scan(&mission.ID, &mission.TargetSettlementID, &mission.TargetName, &mission.TargetStageKey, &mission.TargetX, &mission.TargetY,
			&mission.Distance, &mission.State, &mission.GoldCost, &mission.TrackerLevel, &mission.CoordinationPercent, &mission.StartedAt, &mission.CompletesAt); err != nil {
			rows.Close()
			return nil, err
		}
		state.Active = append(state.Active, mission)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	reportRows, err := tx.Query(`
		SELECT report
		FROM settlement_scouting_missions
		WHERE attacker_settlement_id=$1 AND state='completed' AND report IS NOT NULL
		ORDER BY completed_at DESC,id DESC LIMIT 30`, settlementID)
	if err != nil {
		return nil, err
	}
	for reportRows.Next() {
		var raw []byte
		if err := reportRows.Scan(&raw); err != nil {
			reportRows.Close()
			return nil, err
		}
		var report game.SettlementScoutingReport
		if err := json.Unmarshal(raw, &report); err != nil {
			reportRows.Close()
			return nil, fmt.Errorf("relatório de scouting corrompido: %w", err)
		}
		state.Reports = append(state.Reports, report)
	}
	if err := reportRows.Close(); err != nil {
		return nil, err
	}

	alertRows, err := tx.Query(`
		SELECT mission.id::text,mission.completed_at,mission.source_identified,attacker.name,attacker.world_x,attacker.world_y,mission.detection_percent
		FROM settlement_scouting_missions mission
		JOIN settlements attacker ON attacker.id=mission.attacker_settlement_id
		WHERE mission.defender_settlement_id=$1 AND mission.state='completed' AND mission.detected=TRUE
		  AND mission.completed_at >= $2
		ORDER BY mission.completed_at DESC,mission.id DESC LIMIT 20`, settlementID, now.UTC().Add(-24*time.Hour))
	if err != nil {
		return nil, err
	}
	for alertRows.Next() {
		var alert game.SettlementScoutingAlert
		var attackerName string
		var attackerX, attackerY int
		if err := alertRows.Scan(&alert.MissionID, &alert.DetectedAt, &alert.SourceIdentified, &attackerName, &attackerX, &attackerY, &alert.DetectionPercent); err != nil {
			alertRows.Close()
			return nil, err
		}
		if alert.SourceIdentified {
			alert.SourceName = attackerName
			alert.SourceX = attackerX
			alert.SourceY = attackerY
		}
		state.Alerts = append(state.Alerts, alert)
	}
	if err := alertRows.Close(); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return state, nil
}
