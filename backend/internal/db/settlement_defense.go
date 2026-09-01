package db

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/atlas/backend/pkg/game"
)

type settlementDefensePlacement struct {
	SlotKey     string `json:"slot_key"`
	BuildingKey string `json:"building_key"`
	Level       int    `json:"level"`
	TileX       int    `json:"tile_x"`
	TileY       int    `json:"tile_y"`
	Rotation    int    `json:"rotation"`
}

type settlementDefenseSnapshotPayload struct {
	Version        int                              `json:"version"`
	LayoutVersion  int                              `json:"layout_version"`
	StageKey       string                           `json:"stage_key"`
	Strategy       string                           `json:"strategy"`
	Population     int                              `json:"population"`
	BuildingLevels map[string]int                   `json:"building_levels"`
	Placements     []settlementDefensePlacement     `json:"placements"`
	Evaluation     game.SettlementDefenseEvaluation `json:"evaluation"`
}

func settlementDefenseSnapshotPayloadTx(tx *sql.Tx, charID string) (string, settlementDefenseSnapshotPayload, error) {
	var settlementID, stageKey, strategy string
	if err := tx.QueryRow(`
        SELECT settlement.id,settlement.stage_key,settings.defense_strategy
        FROM settlements settlement
        JOIN settlement_pvp_settings settings ON settings.settlement_id=settlement.id
        WHERE settlement.character_id=$1`, charID).Scan(&settlementID, &stageKey, &strategy); err != nil {
		return "", settlementDefenseSnapshotPayload{}, err
	}
	var population int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM settlement_residents WHERE settlement_id=$1`, settlementID).Scan(&population); err != nil {
		return "", settlementDefenseSnapshotPayload{}, err
	}
	levels, err := settlementBuildingLevelsTx(tx, charID)
	if err != nil {
		return "", settlementDefenseSnapshotPayload{}, err
	}

	layoutVersion := game.CampLayoutVersion
	_ = tx.QueryRow(`SELECT COALESCE(layout_version,$2) FROM character_camps WHERE character_id=$1`, charID, game.CampLayoutVersion).Scan(&layoutVersion)

	rows, err := tx.Query(`
        SELECT slot_key,building_key,level,tile_x,tile_y,rotation
        FROM character_camp_buildings
        WHERE character_id=$1 AND level>0
        ORDER BY building_key,slot_key`, charID)
	if err != nil {
		return "", settlementDefenseSnapshotPayload{}, err
	}
	defer rows.Close()
	placements := []settlementDefensePlacement{}
	for rows.Next() {
		var placement settlementDefensePlacement
		if err := rows.Scan(&placement.SlotKey, &placement.BuildingKey, &placement.Level, &placement.TileX, &placement.TileY, &placement.Rotation); err != nil {
			return "", settlementDefenseSnapshotPayload{}, err
		}
		placements = append(placements, placement)
	}
	if err := rows.Err(); err != nil {
		return "", settlementDefenseSnapshotPayload{}, err
	}
	sort.SliceStable(placements, func(i, j int) bool {
		if placements[i].BuildingKey == placements[j].BuildingKey {
			return placements[i].SlotKey < placements[j].SlotKey
		}
		return placements[i].BuildingKey < placements[j].BuildingKey
	})

	evaluation := game.EvaluateSettlementDefense(stageKey, levels, strategy, population)
	return settlementID, settlementDefenseSnapshotPayload{
		Version:        game.SettlementDefenseSnapshotVersion,
		LayoutVersion:  layoutVersion,
		StageKey:       stageKey,
		Strategy:       strategy,
		Population:     population,
		BuildingLevels: levels,
		Placements:     placements,
		Evaluation:     evaluation,
	}, nil
}

// reconcileSettlementDefenseSnapshot mantém uma fotografia determinística da
// defesa atual. Leituras repetidas não geram novas linhas quando o hash é igual.
func reconcileSettlementDefenseSnapshot(charID string, now time.Time) error {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`
        INSERT INTO settlement_pvp_settings(settlement_id)
        SELECT id FROM settlements WHERE character_id=$1
        ON CONFLICT(settlement_id) DO NOTHING`, charID); err != nil {
		return err
	}

	settlementID, payload, err := settlementDefenseSnapshotPayloadTx(tx, charID)
	if err != nil {
		return err
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	hash := fmt.Sprintf("%x", sha256.Sum256(raw))

	var currentHash sql.NullString
	err = tx.QueryRow(`
        SELECT snapshot_hash FROM settlement_defense_snapshots
        WHERE settlement_id=$1 AND invalidated_at IS NULL
        ORDER BY created_at DESC LIMIT 1`, settlementID).Scan(&currentHash)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	if currentHash.Valid && currentHash.String == hash {
		return tx.Commit()
	}

	if _, err := tx.Exec(`UPDATE settlement_defense_snapshots SET invalidated_at=$2 WHERE settlement_id=$1 AND invalidated_at IS NULL`, settlementID, now.UTC()); err != nil {
		return err
	}
	if _, err := tx.Exec(`
        INSERT INTO settlement_defense_snapshots(
            settlement_id,snapshot_version,snapshot_hash,layout_version,defense_power,readiness,snapshot,created_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
		settlementID, payload.Version, hash, payload.LayoutVersion, payload.Evaluation.DefensePower, payload.Evaluation.Readiness, string(raw), now.UTC()); err != nil {
		return err
	}
	return tx.Commit()
}

func loadSettlementDefenseFoundation(settlementID string) (game.SettlementDefenseFoundation, error) {
	var out game.SettlementDefenseFoundation
	var shieldUntil sql.NullTime
	var snapshotRaw []byte
	var snapshotVersion sql.NullInt64
	var snapshotHash sql.NullString
	var generatedAt sql.NullTime
	err := DB.QueryRow(`
        SELECT settings.raids_enabled,settings.defense_strategy,settings.shield_until,settings.revision,
               snapshot.snapshot_version,snapshot.snapshot_hash,snapshot.created_at,COALESCE(snapshot.snapshot,'{}'::jsonb)
        FROM settlement_pvp_settings settings
        LEFT JOIN LATERAL (
            SELECT snapshot_version,snapshot_hash,created_at,snapshot
            FROM settlement_defense_snapshots
            WHERE settlement_id=settings.settlement_id AND invalidated_at IS NULL
            ORDER BY created_at DESC LIMIT 1
        ) snapshot ON TRUE
        WHERE settings.settlement_id=$1`, settlementID).Scan(
		&out.RaidsEnabled, &out.Strategy, &shieldUntil, &out.Revision,
		&snapshotVersion, &snapshotHash, &generatedAt, &snapshotRaw,
	)
	if err != nil {
		return out, err
	}
	if shieldUntil.Valid {
		value := shieldUntil.Time.UTC()
		out.ShieldUntil = &value
	}
	out.SnapshotReady = snapshotHash.Valid && snapshotHash.String != ""
	if snapshotVersion.Valid {
		out.SnapshotVersion = int(snapshotVersion.Int64)
	}
	if snapshotHash.Valid {
		out.SnapshotHash = snapshotHash.String
	}
	if generatedAt.Valid {
		value := generatedAt.Time.UTC()
		out.SnapshotGeneratedAt = &value
	}
	if len(snapshotRaw) > 0 {
		var payload settlementDefenseSnapshotPayload
		if err := json.Unmarshal(snapshotRaw, &payload); err == nil {
			out.DefensePower = payload.Evaluation.DefensePower
			out.Readiness = payload.Evaluation.Readiness
			out.ReadinessKey = payload.Evaluation.ReadinessKey
			out.Components = payload.Evaluation.Components
			out.Garrison = payload.Evaluation.Garrison
			out.Recovery = payload.Evaluation.Recovery
			out.Engineering = payload.Evaluation.Engineering
			out.Protection = payload.Evaluation.Protection
			out.Arcane = payload.Evaluation.Arcane
		}
	}
	return out, nil
}

func UpdateSettlementDefenseStrategy(charID, strategy string, now time.Time) error {
	switch strategy {
	case "balanced", "aggressive", "defensive":
	default:
		return fmt.Errorf("estratégia defensiva inválida")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var settlementID string
	if err := tx.QueryRow(`SELECT id FROM settlements WHERE character_id=$1 FOR UPDATE`, charID).Scan(&settlementID); err != nil {
		return err
	}
	if _, err := tx.Exec(`
        INSERT INTO settlement_pvp_settings(settlement_id,defense_strategy,revision,updated_at)
        VALUES($1,$2,1,$3)
        ON CONFLICT(settlement_id) DO UPDATE SET defense_strategy=EXCLUDED.defense_strategy,revision=settlement_pvp_settings.revision+1,updated_at=EXCLUDED.updated_at`, settlementID, strategy, now.UTC()); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE settlement_defense_snapshots SET invalidated_at=$2 WHERE settlement_id=$1 AND invalidated_at IS NULL`, settlementID, now.UTC()); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return reconcileSettlementDefenseSnapshot(charID, now)
}

func pendingSettlementPromotion(settlementID string) (*game.SettlementPromotionNotice, error) {
	var id, fromKey, toKey string
	var prosperity int64
	var population int
	var promotedAt time.Time
	err := DB.QueryRow(`
        SELECT id::text,from_stage,to_stage,prosperity,population,promoted_at
        FROM settlement_stage_history
        WHERE settlement_id=$1 AND acknowledged_at IS NULL
        ORDER BY promoted_at DESC LIMIT 1`, settlementID).Scan(&id, &fromKey, &toKey, &prosperity, &population, &promotedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &game.SettlementPromotionNotice{HistoryID: id, FromStage: game.SettlementStageDefinitionFor(fromKey), ToStage: game.SettlementStageDefinitionFor(toKey), PromotedAt: promotedAt.UTC(), Prosperity: prosperity, Population: population}, nil
}

func AcknowledgeSettlementPromotion(charID string, now time.Time) error {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	result, err := DB.Exec(`
        UPDATE settlement_stage_history history SET acknowledged_at=$2
        WHERE history.id=(
            SELECT h.id
            FROM settlement_stage_history h
            JOIN settlements settlement ON settlement.id=h.settlement_id
            WHERE settlement.character_id=$1 AND h.acknowledged_at IS NULL
            ORDER BY h.promoted_at DESC LIMIT 1
        )`, charID, now.UTC())
	if err != nil {
		return err
	}
	_, _ = result.RowsAffected()
	return nil
}
