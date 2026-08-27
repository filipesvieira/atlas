package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/atlas/backend/pkg/game"
)

func scanActiveBuff(row rowScanner) (game.ActiveBuff, error) {
	var buff game.ActiveBuff
	err := row.Scan(
		&buff.Category,
		&buff.SourceResourceKey,
		&buff.EffectKey,
		&buff.Magnitude,
		&buff.StartedAt,
		&buff.ExpiresAt,
		&buff.ContentVersion,
	)
	if err != nil {
		return game.ActiveBuff{}, err
	}
	if definition, ok := game.GetConsumableDefinition(buff.SourceResourceKey); ok {
		buff.SourceName = definition.Name
	} else {
		buff.SourceName = buff.SourceResourceKey
	}
	return buff, nil
}

// GetCharacterActiveBuffs retorna somente efeitos ativos no instante solicitado.
func GetCharacterActiveBuffs(charID string, at time.Time) ([]game.ActiveBuff, error) {
	if at.IsZero() {
		at = time.Now().UTC()
	}
	rows, err := DB.Query(`
		SELECT category,source_resource_key,effect_key,magnitude,started_at,expires_at,content_version
		FROM character_active_buffs
		WHERE character_id=$1 AND started_at <= $2 AND expires_at > $2
		ORDER BY category,started_at DESC`, charID, at.UTC())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	buffs := make([]game.ActiveBuff, 0, 4)
	seen := make(map[game.BuffCategory]bool)
	for rows.Next() {
		buff, err := scanActiveBuff(rows)
		if err != nil {
			return nil, err
		}
		// A transação de consumo garante exclusividade; este filtro também torna
		// leituras tolerantes a dados legados ou correções administrativas.
		if seen[buff.Category] {
			continue
		}
		seen[buff.Category] = true
		buffs = append(buffs, buff)
	}
	return buffs, rows.Err()
}

func getCharacterBuffsOverlappingTx(tx *sql.Tx, charID string, start, end time.Time) ([]game.ActiveBuff, error) {
	rows, err := tx.Query(`
		SELECT category,source_resource_key,effect_key,magnitude,started_at,expires_at,content_version
		FROM character_active_buffs
		WHERE character_id=$1 AND expires_at > $2 AND started_at < $3
		ORDER BY started_at`, charID, start.UTC(), end.UTC())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	buffs := make([]game.ActiveBuff, 0, 8)
	for rows.Next() {
		buff, err := scanActiveBuff(rows)
		if err != nil {
			return nil, err
		}
		buffs = append(buffs, buff)
	}
	return buffs, rows.Err()
}

// ConsumeCharacterConsumable consome uma unidade e cria um intervalo persistente
// de buff. Uma nova refeição encerra a refeição anterior no mesmo instante,
// preservando o histórico necessário à simulação offline.
func ConsumeCharacterConsumable(accountID, charID, resourceKey, requestID string, expectedRevision int64) (*game.ConsumeResult, error) {
	definition, ok := game.GetConsumableDefinition(resourceKey)
	if !ok {
		return nil, fmt.Errorf("%s não é um consumível válido", resourceKey)
	}
	if requestID == "" {
		return nil, fmt.Errorf("request_id obrigatório")
	}

	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Serializa mutações do personagem antes de consultar a chave idempotente.
	// Assim dois retries simultâneos com o mesmo request_id não consomem duas
	// unidades nem terminam em conflito de UNIQUE: o segundo observa o commit
	// do primeiro e apenas devolve o resultado já persistido.
	var ownerCheck string
	if err := tx.QueryRow(`SELECT id::text FROM characters WHERE id=$1 AND account_id=$2 FOR UPDATE`, charID, accountID).Scan(&ownerCheck); err != nil {
		return nil, fmt.Errorf("personagem não encontrado: %w", err)
	}

	var replayJSON string
	err = tx.QueryRow(`SELECT result::text FROM character_consumption_transactions WHERE character_id=$1 AND request_id=$2`, charID, requestID).Scan(&replayJSON)
	if err == nil {
		var replay game.ConsumeResult
		if unmarshalErr := json.Unmarshal([]byte(replayJSON), &replay); unmarshalErr != nil {
			return nil, fmt.Errorf("resultado de consumo corrompido: %w", unmarshalErr)
		}
		return &replay, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
		return nil, err
	}
	var revision int64
	if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id=$1 FOR UPDATE`, charID).Scan(&revision); err != nil {
		return nil, err
	}
	if expectedRevision > 0 && revision != expectedRevision {
		return nil, fmt.Errorf("estado do acampamento desatualizado: esperado %d, atual %d", expectedRevision, revision)
	}

	result, err := tx.Exec(`
		UPDATE character_resources SET quantity=quantity-1,updated_at=NOW()
		WHERE character_id=$1 AND resource_key=$2 AND quantity >= 1`, charID, resourceKey)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, fmt.Errorf("você não possui %s para consumir", definition.Name)
	}

	now := time.Now().UTC()
	var replaced *game.ActiveBuff
	row := tx.QueryRow(`
		SELECT category,source_resource_key,effect_key,magnitude,started_at,expires_at,content_version
		FROM character_active_buffs
		WHERE character_id=$1 AND category=$2 AND started_at <= $3 AND expires_at > $3
		ORDER BY started_at DESC LIMIT 1 FOR UPDATE`, charID, definition.Category, now)
	previous, scanErr := scanActiveBuff(row)
	if scanErr == nil {
		replaced = &previous
		if _, err := tx.Exec(`UPDATE character_active_buffs SET expires_at=$3,updated_at=NOW() WHERE character_id=$1 AND category=$2 AND started_at=$4`, charID, definition.Category, now, previous.StartedAt); err != nil {
			return nil, err
		}
	} else if scanErr != sql.ErrNoRows {
		return nil, scanErr
	}

	active := game.ActiveBuff{
		Category:          definition.Category,
		SourceResourceKey: definition.ResourceKey,
		SourceName:        definition.Name,
		EffectKey:         definition.EffectKey,
		Magnitude:         definition.Magnitude,
		StartedAt:         now,
		ExpiresAt:         now.Add(time.Duration(definition.DurationSeconds) * time.Second),
		ContentVersion:    definition.ContentVersion,
	}
	if _, err := tx.Exec(`
		INSERT INTO character_active_buffs(character_id,category,source_resource_key,effect_key,magnitude,started_at,expires_at,content_version)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, charID, active.Category, active.SourceResourceKey, active.EffectKey, active.Magnitude, active.StartedAt, active.ExpiresAt, active.ContentVersion); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(`UPDATE character_camps SET state_revision=state_revision+1,updated_at=NOW() WHERE character_id=$1`, charID); err != nil {
		return nil, err
	}
	if err := recordResourceLedgerTx(tx, charID, requestID, "consume", resourceKey, []game.ResourceAmount{{Key: resourceKey, Quantity: -1}}); err != nil {
		return nil, err
	}
	capacity, err := campStorageCapacityTx(tx, charID)
	if err != nil {
		return nil, err
	}
	snapshot, err := getSnapshotWithinTx(tx, charID, capacity)
	if err != nil {
		return nil, err
	}
	consumeResult := game.ConsumeResult{RequestID: requestID, ResourceKey: resourceKey, ActiveBuff: active, ReplacedBuff: replaced, ResourceInventory: *snapshot}
	encoded, err := json.Marshal(consumeResult)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO character_consumption_transactions(character_id,request_id,resource_key,result) VALUES($1,$2,$3,$4)`, charID, requestID, resourceKey, string(encoded)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	game.IncrementTelemetry("consumable_used_total{resource=" + resourceKey + "}")
	return &consumeResult, nil
}