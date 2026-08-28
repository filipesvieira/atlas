package db

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
)

const pvpArenaAdvisoryLock = "atlas_pvp_arena_scheduler_v1"

// PvPArenaLeadership mantém uma conexão dedicada enquanto esta réplica possui
// a autoridade do loop de arena. Se ela cair, PostgreSQL libera o advisory
// lock e outra réplica restaura a partida a partir do último pulso persistido.
type PvPArenaLeadership struct {
	conn *sql.Conn
	mu   sync.Mutex
	done bool
}

func TryAcquirePvPArenaLeadership(ctx context.Context) (*PvPArenaLeadership, bool, error) {
	if DB == nil {
		return nil, false, fmt.Errorf("banco de dados não inicializado")
	}
	conn, err := DB.Conn(ctx)
	if err != nil {
		return nil, false, err
	}
	var acquired bool
	if err := conn.QueryRowContext(ctx, `SELECT pg_try_advisory_lock(hashtext($1))`, pvpArenaAdvisoryLock).Scan(&acquired); err != nil {
		_ = conn.Close()
		return nil, false, err
	}
	if !acquired {
		_ = conn.Close()
		return nil, false, nil
	}
	return &PvPArenaLeadership{conn: conn}, true, nil
}

func (l *PvPArenaLeadership) Ping(ctx context.Context) error {
	if l == nil || l.conn == nil {
		return fmt.Errorf("liderança PvP inválida")
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.done {
		return fmt.Errorf("liderança PvP já foi liberada")
	}
	return l.conn.PingContext(ctx)
}

func (l *PvPArenaLeadership) Release(ctx context.Context) error {
	if l == nil || l.conn == nil {
		return nil
	}
	l.mu.Lock()
	if l.done {
		l.mu.Unlock()
		return nil
	}
	l.done = true
	conn := l.conn
	l.mu.Unlock()
	_, unlockErr := conn.ExecContext(ctx, `SELECT pg_advisory_unlock(hashtext($1))`, pvpArenaAdvisoryLock)
	closeErr := conn.Close()
	if unlockErr != nil {
		return unlockErr
	}
	return closeErr
}