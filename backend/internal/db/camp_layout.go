package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/atlas/backend/pkg/game"
)

func settlementStageKeyTx(tx *sql.Tx, charID string) string {
	var stage string
	err := tx.QueryRow(`SELECT COALESCE(stage_key,'camp') FROM settlements WHERE character_id=$1`, charID).Scan(&stage)
	if err != nil || stage == "" {
		return game.SettlementStageCamp
	}
	return stage
}

func settlementStageKey(charID string) string {
	var stage string
	err := DB.QueryRow(`SELECT COALESCE(stage_key,'camp') FROM settlements WHERE character_id=$1`, charID).Scan(&stage)
	if err != nil || stage == "" {
		return game.SettlementStageCamp
	}
	return stage
}

// MoveCampBuilding reposiciona uma construção sem alterar nível, recursos ou tempo de obra.
// O servidor é autoritativo para limites, colisões e revisão do layout.
func MoveCampBuilding(accountID, charID, slotKey string, tileX, tileY, rotation int, expectedRevision int64) (*game.CampState, error) {
	if slotKey == "" {
		return nil, fmt.Errorf("construção obrigatória para reposicionar")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var owner string
	if err := tx.QueryRow(`SELECT account_id::text FROM characters WHERE id=$1 FOR UPDATE`, charID).Scan(&owner); err != nil {
		return nil, fmt.Errorf("personagem não encontrado: %w", err)
	}
	if owner != accountID {
		return nil, fmt.Errorf("personagem não pertence à conta autenticada")
	}

	var revision int64
	if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id=$1 FOR UPDATE`, charID).Scan(&revision); err != nil {
		return nil, fmt.Errorf("acampamento não encontrado: %w", err)
	}
	if expectedRevision > 0 && expectedRevision != revision {
		return nil, fmt.Errorf("o layout mudou enquanto você movia a construção; tente novamente")
	}

	rows, err := tx.Query(`
		SELECT slot_key,building_key,level,COALESCE(upgrade_target_level,0),tile_x,tile_y,rotation
		FROM character_camp_buildings
		WHERE character_id=$1
		FOR UPDATE`, charID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	buildings := make([]game.BuildingSlot, 0, 16)
	var target *game.BuildingSlot
	for rows.Next() {
		var slot game.BuildingSlot
		if err := rows.Scan(&slot.SlotKey, &slot.BuildingKey, &slot.Level, &slot.UpgradeTargetLevel, &slot.TileX, &slot.TileY, &slot.Rotation); err != nil {
			return nil, err
		}
		buildings = append(buildings, slot)
		if slot.SlotKey == slotKey {
			copySlot := slot
			target = &copySlot
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if target == nil {
		return nil, fmt.Errorf("construção não encontrada")
	}
	if game.IsPerimeterBuilding(target.BuildingKey) {
		return nil, fmt.Errorf("%s acompanha o perímetro do assentamento e não pode ser reposicionada", target.BuildingKey)
	}

	discovered := map[string]bool{"campfire": true}
	bpRows, err := tx.Query(`SELECT building_key FROM character_building_blueprints WHERE character_id=$1`, charID)
	if err != nil {
		return nil, err
	}
	for bpRows.Next() {
		var key string
		if err := bpRows.Scan(&key); err != nil {
			bpRows.Close()
			return nil, err
		}
		discovered[key] = true
	}
	if err := bpRows.Err(); err != nil {
		bpRows.Close()
		return nil, err
	}
	if err := bpRows.Close(); err != nil {
		return nil, err
	}
	for i := range buildings {
		buildings[i].Discovered = discovered[buildings[i].BuildingKey]
	}
	target.Discovered = discovered[target.BuildingKey]

	if target.UpgradeTargetLevel > 0 {
		return nil, fmt.Errorf("não é possível mover uma construção enquanto a obra está em andamento")
	}

	if target.Level <= 0 {
		definition, exists := game.GetBuildingDefinition(target.BuildingKey)
		if !exists {
			return nil, fmt.Errorf("construção inválida: %s", target.BuildingKey)
		}
		if !definition.DefaultUnlocked {
			var discovered bool
			if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM character_building_blueprints WHERE character_id=$1 AND building_key=$2)`, charID, target.BuildingKey).Scan(&discovered); err != nil {
				return nil, err
			}
			if !discovered {
				return nil, fmt.Errorf("descubra o projeto antes de escolher a posição da construção")
			}
		}
	}

	stageKey := settlementStageKeyTx(tx, charID)
	if err := game.ValidateCampPlacementForStage(stageKey, target.BuildingKey, tileX, tileY, rotation, buildings, slotKey); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(`UPDATE character_camp_buildings SET tile_x=$3,tile_y=$4,rotation=$5,updated_at=NOW() WHERE character_id=$1 AND slot_key=$2`, charID, slotKey, tileX, tileY, rotation); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE character_camps SET layout_version=GREATEST(layout_version,4),state_revision=state_revision+1,updated_at=NOW() WHERE character_id=$1`, charID); err != nil {
		return nil, err
	}
	if err := invalidateSettlementDefenseSnapshotTx(tx, charID, time.Now().UTC()); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetCharacterCamp(charID)
}
