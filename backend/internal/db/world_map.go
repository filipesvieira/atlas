package db

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"time"

	"github.com/atlas/backend/pkg/game"
)

func ensureSettlementWorldLocationTx(tx *sql.Tx, settlementID string, now time.Time) (game.WorldLocation, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	var worldID sql.NullString
	var worldX, worldY sql.NullInt64
	var assignedAt sql.NullTime
	if err := tx.QueryRow(`
		SELECT world_id::text,world_x,world_y,world_assigned_at
		FROM settlements WHERE id=$1 FOR UPDATE`, settlementID).Scan(&worldID, &worldX, &worldY, &assignedAt); err != nil {
		return game.WorldLocation{}, err
	}

	if worldID.Valid && worldID.String != "" && worldX.Valid && worldY.Valid && assignedAt.Valid {
		location := game.WorldLocation{WorldID: worldID.String, X: int(worldX.Int64), Y: int(worldY.Int64), AssignedAt: assignedAt.Time.UTC()}
		if err := tx.QueryRow(`SELECT key,name FROM worlds WHERE id=$1`, location.WorldID).Scan(&location.WorldKey, &location.WorldName); err != nil {
			return game.WorldLocation{}, err
		}
		return location, nil
	}

	var worldName string
	if err := tx.QueryRow(`SELECT id::text,name FROM worlds WHERE key=$1`, game.DefaultWorldKey).Scan(&worldID.String, &worldName); err != nil {
		return game.WorldLocation{}, fmt.Errorf("mundo padrão indisponível: %w", err)
	}
	worldID.Valid = true

	var allocationIndex int64
	if err := tx.QueryRow(`SELECT nextval('settlement_world_coordinate_seq')`).Scan(&allocationIndex); err != nil {
		return game.WorldLocation{}, fmt.Errorf("alocar coordenada territorial: %w", err)
	}
	coordinate := game.WorldCoordinateForIndex(allocationIndex)
	assigned := now.UTC()
	if _, err := tx.Exec(`
		UPDATE settlements
		SET world_id=$2,world_x=$3,world_y=$4,world_allocation_index=$5,world_assigned_at=$6,
		    revision=revision+1,updated_at=$6
		WHERE id=$1`, settlementID, worldID.String, coordinate.X, coordinate.Y, allocationIndex, assigned); err != nil {
		return game.WorldLocation{}, fmt.Errorf("persistir coordenada territorial: %w", err)
	}
	return game.WorldLocation{
		WorldID: worldID.String, WorldKey: game.DefaultWorldKey, WorldName: worldName,
		X: coordinate.X, Y: coordinate.Y, AssignedAt: assigned,
	}, nil
}

func EnsureSettlementWorldLocation(charID string, now time.Time) (game.WorldLocation, error) {
	if charID == "" {
		return game.WorldLocation{}, fmt.Errorf("personagem obrigatório para mapa territorial")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return game.WorldLocation{}, err
	}
	defer tx.Rollback()
	var settlementID string
	if err := tx.QueryRow(`SELECT id::text FROM settlements WHERE character_id=$1 FOR UPDATE`, charID).Scan(&settlementID); err != nil {
		return game.WorldLocation{}, err
	}
	location, err := ensureSettlementWorldLocationTx(tx, settlementID, now)
	if err != nil {
		return game.WorldLocation{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.WorldLocation{}, err
	}
	return location, nil
}

func GetTerritorialMap(charID string, radius int, now time.Time) (*game.TerritorialMapSnapshot, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}
	// Assentamentos criados depois do startup ainda não passaram pela
	// reconciliação global. Garantir a coordenada no momento da consulta evita
	// que o primeiro clique no mapa retorne sql.ErrNoRows silenciosamente.
	if _, err := EnsureSettlementWorldLocation(charID, now); err != nil {
		return nil, err
	}
	radius = game.NormalizeWorldMapRadius(radius)

	var selfSettlementID string
	var location game.WorldLocation
	if err := DB.QueryRow(`
		SELECT settlement.id::text,world.id::text,world.key,world.name,
		       settlement.world_x,settlement.world_y,settlement.world_assigned_at
		FROM settlements settlement
		JOIN worlds world ON world.id=settlement.world_id
		WHERE settlement.character_id=$1`, charID).Scan(
		&selfSettlementID, &location.WorldID, &location.WorldKey, &location.WorldName,
		&location.X, &location.Y, &location.AssignedAt); err != nil {
		return nil, err
	}

	rows, err := DB.Query(`
		SELECT settlement.id::text,settlement.name,settlement.stage_key,settlement.world_x,settlement.world_y,
		       settings.shield_until
		FROM settlements settlement
		LEFT JOIN settlement_pvp_settings settings ON settings.settlement_id=settlement.id
		WHERE settlement.world_id=$1
		  AND settlement.world_x BETWEEN $2 AND $3
		  AND settlement.world_y BETWEEN $4 AND $5
		ORDER BY ((settlement.world_x-$6)*(settlement.world_x-$6) + (settlement.world_y-$7)*(settlement.world_y-$7)), settlement.id
		LIMIT 500`, location.WorldID, location.X-radius, location.X+radius, location.Y-radius, location.Y+radius, location.X, location.Y)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	kingdoms := make([]game.TerritorialKingdomSummary, 0, 32)
	center := game.WorldCoordinate{X: location.X, Y: location.Y}
	for rows.Next() {
		var kingdom game.TerritorialKingdomSummary
		var shieldUntil sql.NullTime
		if err := rows.Scan(&kingdom.SettlementID, &kingdom.Name, &kingdom.StageKey, &kingdom.X, &kingdom.Y, &shieldUntil); err != nil {
			return nil, err
		}
		kingdom.IsSelf = kingdom.SettlementID == selfSettlementID
		kingdom.Protected = shieldUntil.Valid && shieldUntil.Time.After(now)
		kingdom.Distance = math.Round(game.WorldDistance(center, game.WorldCoordinate{X: kingdom.X, Y: kingdom.Y})*100) / 100
		kingdoms = append(kingdoms, kingdom)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &game.TerritorialMapSnapshot{
		ContractVersion: game.WorldMapContractVersion,
		WorldID:         location.WorldID, WorldKey: location.WorldKey, WorldName: location.WorldName,
		Center: center, Radius: radius, Kingdoms: kingdoms, GeneratedAt: now.UTC(),
	}, nil
}

// ReconcileSettlementWorldLocations atribui coordenadas a assentamentos legados
// logo no startup. Isso evita um mundo "lazy" onde um Reino antigo só aparece
// para os vizinhos depois que o próprio dono abre o assentamento.
//
// A sequence é global e monotônica. O FOR UPDATE de
// ensureSettlementWorldLocationTx torna a rotina segura mesmo quando dois nós
// de servidor iniciam ao mesmo tempo: o segundo observa a coordenada já gravada.
func ReconcileSettlementWorldLocations(now time.Time) error {
	if DB == nil {
		return fmt.Errorf("banco indisponível para reconciliar mapa territorial")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}

	// Se já existirem alocações (por exemplo, após restart), mantenha a sequence
	// adiante do maior índice persistido. Em um banco recém-migrado, sem índices,
	// ela permanece em START WITH 0 para que o primeiro Reino receba (0,0).
	var maxAllocation sql.NullInt64
	if err := DB.QueryRow(`SELECT MAX(world_allocation_index) FROM settlements WHERE world_allocation_index IS NOT NULL`).Scan(&maxAllocation); err != nil {
		return fmt.Errorf("ler maior índice territorial: %w", err)
	}
	if maxAllocation.Valid {
		if _, err := DB.Exec(`SELECT setval('settlement_world_coordinate_seq',$1,true)`, maxAllocation.Int64); err != nil {
			return fmt.Errorf("sincronizar sequência territorial: %w", err)
		}
	}

	rows, err := DB.Query(`
		SELECT id::text
		FROM settlements
		WHERE world_id IS NULL OR world_x IS NULL OR world_y IS NULL OR world_assigned_at IS NULL
		ORDER BY created_at,id`)
	if err != nil {
		return fmt.Errorf("listar assentamentos sem coordenada: %w", err)
	}
	ids := make([]string, 0)
	for rows.Next() {
		var settlementID string
		if err := rows.Scan(&settlementID); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, settlementID)
	}
	if err := rows.Close(); err != nil {
		return err
	}

	for _, settlementID := range ids {
		tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
		if err != nil {
			return err
		}
		if _, err := ensureSettlementWorldLocationTx(tx, settlementID, now); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("alocar coordenada para assentamento %s: %w", settlementID, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("confirmar coordenada do assentamento %s: %w", settlementID, err)
		}
	}
	return nil
}
