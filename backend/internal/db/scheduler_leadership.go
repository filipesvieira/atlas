package db

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
)

const settlementSchedulerAdvisoryLock = "atlas_settlement_scheduler_v1"

// SettlementSchedulerLeadership prende uma conexão exclusiva enquanto esta
// réplica é responsável pelo pulso global do assentamento. Advisory locks são
// liberados automaticamente pelo PostgreSQL se o processo/conexão morrer.
type SettlementSchedulerLeadership struct {
	conn *sql.Conn
	mu   sync.Mutex
	done bool
}

// TryAcquireSettlementSchedulerLeadership garante que apenas uma instância do
// backend execute o scheduler. A persistência das atividades continua usando
// transações próprias; este lock evita polling e reconciliação duplicados.
func TryAcquireSettlementSchedulerLeadership(ctx context.Context) (*SettlementSchedulerLeadership, bool, error) {
	if DB == nil {
		return nil, false, fmt.Errorf("banco de dados não inicializado")
	}
	conn, err := DB.Conn(ctx)
	if err != nil {
		return nil, false, err
	}
	var acquired bool
	err = conn.QueryRowContext(ctx, `SELECT pg_try_advisory_lock(hashtext($1))`, settlementSchedulerAdvisoryLock).Scan(&acquired)
	if err != nil {
		_ = conn.Close()
		return nil, false, err
	}
	if !acquired {
		_ = conn.Close()
		return nil, false, nil
	}
	return &SettlementSchedulerLeadership{conn: conn}, true, nil
}

// Ping confirma que a conexão que detém o advisory lock continua viva. Se ela
// cair, o chamador deve encerrar o loop; o PostgreSQL libera o lock e outra
// réplica poderá assumir no próximo ciclo de eleição.
func (l *SettlementSchedulerLeadership) Ping(ctx context.Context) error {
	if l == nil || l.conn == nil {
		return fmt.Errorf("liderança do scheduler inválida")
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.done {
		return fmt.Errorf("liderança do scheduler já foi liberada")
	}
	return l.conn.PingContext(ctx)
}

func (l *SettlementSchedulerLeadership) Release(ctx context.Context) error {
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
	_, unlockErr := conn.ExecContext(ctx, `SELECT pg_advisory_unlock(hashtext($1))`, settlementSchedulerAdvisoryLock)
	closeErr := conn.Close()
	if unlockErr != nil {
		return unlockErr
	}
	return closeErr
}