package db

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/atlas/backend/pkg/game"
)

const sessionLeaseTTL = 60 * time.Second

func AcquireCharacterSessionLease(charID, serverID string) (string, error) {
	if charID == "" || serverID == "" {
		return "", fmt.Errorf("personagem ou servidor inválido para lease")
	}
	var leaseID string
	err := DB.QueryRow(`
		INSERT INTO character_session_leases(character_id,lease_id,server_id,acquired_at,expires_at,heartbeat_at)
		VALUES($1,uuid_generate_v4(),$2,NOW(),NOW()+($3 * INTERVAL '1 second'),NOW())
		ON CONFLICT(character_id) DO UPDATE
		SET lease_id=EXCLUDED.lease_id,server_id=EXCLUDED.server_id,acquired_at=NOW(),expires_at=EXCLUDED.expires_at,heartbeat_at=NOW()
		WHERE character_session_leases.expires_at <= NOW()
		RETURNING lease_id`, charID, serverID, int64(sessionLeaseTTL/time.Second)).Scan(&leaseID)
	if err == sql.ErrNoRows {
		game.IncrementTelemetry("session_lease_conflict_total")
		return "", fmt.Errorf("personagem já possui uma sessão válida em outro processo")
	}
	return leaseID, err
}

func HeartbeatCharacterSessionLease(charID, leaseID string) error {
	result, err := DB.Exec(`UPDATE character_session_leases SET heartbeat_at=NOW(),expires_at=NOW()+($3 * INTERVAL '1 second') WHERE character_id=$1 AND lease_id=$2`, charID, leaseID, int64(sessionLeaseTTL/time.Second))
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected != 1 {
		game.IncrementTelemetry("session_lease_lost_total")
		return fmt.Errorf("lease de sessão perdido")
	}
	return nil
}

func ReleaseCharacterSessionLease(charID, leaseID string) error {
	_, err := DB.Exec(`DELETE FROM character_session_leases WHERE character_id=$1 AND lease_id=$2`, charID, leaseID)
	return err
}

// ClearDevelopmentSessionLeases removes leases left behind when the local
// server is rebuilt or terminated without running the WebSocket cleanup path.
// Session leases are ephemeral coordination records, not player data. This is
// intentionally exposed as a development-only operation and must not be used
// during a production startup, where another server instance may be active.
func ClearDevelopmentSessionLeases() error {
	if DB == nil {
		return fmt.Errorf("banco de dados não inicializado")
	}
	_, err := DB.Exec(`DELETE FROM character_session_leases`)
	return err
}

func HasActiveCharacterSessionLeaseTx(tx *sql.Tx, charID string) (bool, error) {
	var active bool
	err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM character_session_leases WHERE character_id=$1 AND expires_at>NOW())`, charID).Scan(&active)
	return active, err
}