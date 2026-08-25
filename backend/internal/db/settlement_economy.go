package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/atlas/backend/pkg/game"
)

type settlementTreasuryRow struct {
	SettlementID       string
	Prosperity         int64
	Balance            int64
	ReservedPayroll    int64
	AutoFundEnabled    bool
	PersonalGoldReserve int64
}

func lockSettlementTreasuryTx(tx *sql.Tx, charID string) (settlementTreasuryRow, error) {
	var row settlementTreasuryRow
	err := tx.QueryRow(`
		SELECT id,prosperity,treasury_balance,treasury_reserved_payroll,
		       treasury_auto_fund_enabled,treasury_personal_gold_reserve
		FROM settlements WHERE character_id=$1 FOR UPDATE`, charID).
		Scan(&row.SettlementID, &row.Prosperity, &row.Balance, &row.ReservedPayroll, &row.AutoFundEnabled, &row.PersonalGoldReserve)
	return row, err
}

func insertSettlementGoldLedgerTx(tx *sql.Tx, settlementID, charID, requestID, reason, referenceKey string, delta, balanceAfter int64, metadata any) error {
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`
		INSERT INTO settlement_gold_ledger(settlement_id,character_id,request_id,reason,reference_key,delta,balance_after,metadata)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT(settlement_id,request_id,reason) DO NOTHING`,
		settlementID, charID, requestID, reason, referenceKey, delta, balanceAfter, string(metadataJSON))
	return err
}

// reserveGatheringWageTx move o custo para custódia antes do morador sair.
// Se o caixa estiver curto e o autofinanciamento estiver habilitado, somente o
// déficit é transferido do herói e a reserva pessoal configurada é preservada.
func reserveGatheringWageTx(tx *sql.Tx, charID, residentID, residentName, professionKey, requestID string, durationSeconds int64, professionLevel, expeditionTier int) (string, int64, error) {
	treasury, err := lockSettlementTreasuryTx(tx, charID)
	if err != nil {
		return "", 0, err
	}
	wage := game.CalculateGatheringWage(durationSeconds, professionLevel, expeditionTier, treasury.Prosperity)
	if wage == 0 {
		return treasury.SettlementID, 0, nil
	}
	if treasury.Balance < wage {
		deficit := wage - treasury.Balance
		if !treasury.AutoFundEnabled {
			return "", 0, fmt.Errorf("a Tesouraria precisa de %d ouro para reservar este salário; deposite ouro ou habilite o financiamento automático", deficit)
		}
		var heroGold int64
		if err := tx.QueryRow(`SELECT gold_bank FROM characters WHERE id=$1 FOR UPDATE`, charID).Scan(&heroGold); err != nil {
			return "", 0, err
		}
		if heroGold-deficit < treasury.PersonalGoldReserve {
			return "", 0, fmt.Errorf("faltam %d ouro na Tesouraria; o financiamento automático preserva %d ouro pessoal do herói", deficit, treasury.PersonalGoldReserve)
		}
		if _, err := tx.Exec(`UPDATE characters SET gold_bank=gold_bank-$2,state_revision=state_revision+1 WHERE id=$1`, charID, deficit); err != nil {
			return "", 0, err
		}
		treasury.Balance += deficit
		if _, err := tx.Exec(`UPDATE settlements SET treasury_balance=treasury_balance+$2,treasury_lifetime_income=treasury_lifetime_income+$2,revision=revision+1,updated_at=NOW() WHERE id=$1`, treasury.SettlementID, deficit); err != nil {
			return "", 0, err
		}
		if err := insertSettlementGoldLedgerTx(tx, treasury.SettlementID, charID, requestID, "auto_fund", professionKey, deficit, treasury.Balance, map[string]any{"resident_id": residentID, "resident_name": residentName}); err != nil {
			return "", 0, err
		}
	}
	treasury.Balance -= wage
	if _, err := tx.Exec(`
		UPDATE settlements
		SET treasury_balance=treasury_balance-$2,
		    treasury_reserved_payroll=treasury_reserved_payroll+$2,
		    revision=revision+1,updated_at=NOW()
		WHERE id=$1`, treasury.SettlementID, wage); err != nil {
		return "", 0, err
	}
	if err := insertSettlementGoldLedgerTx(tx, treasury.SettlementID, charID, requestID, "payroll_reserve", professionKey, -wage, treasury.Balance, map[string]any{"resident_id": residentID, "resident_name": residentName, "duration_seconds": durationSeconds, "economy_version": game.SettlementEconomyVersion}); err != nil {
		return "", 0, err
	}
	return treasury.SettlementID, wage, nil
}

func settleGatheringPayrollTx(tx *sql.Tx, charID string, activity *game.GatheringActivity, settledAt time.Time, cancelled bool, requestID string) (int64, int64, error) {
	if activity == nil {
		return 0, 0, nil
	}
	if activity.WageReserved <= 0 || activity.WagePaid > 0 {
		return activity.WagePaid, 0, nil
	}
	var settlementID, payrollState string
	var reserved, alreadyPaid, alreadyRefunded int64
	err := tx.QueryRow(`SELECT settlement_id::text,state,wage_reserved,wage_paid,wage_refunded FROM settlement_payroll WHERE activity_id=$1 FOR UPDATE`, activity.ID).
		Scan(&settlementID, &payrollState, &reserved, &alreadyPaid, &alreadyRefunded)
	if err == sql.ErrNoRows {
		return 0, 0, fmt.Errorf("reserva salarial da atividade %s não foi encontrada", activity.ID)
	}
	if err != nil {
		return 0, 0, err
	}
	if payrollState != "reserved" {
		return alreadyPaid, alreadyRefunded, nil
	}
	earned := reserved
	if cancelled {
		elapsed := int64(settledAt.Sub(activity.StartedAt).Seconds())
		earned = game.CalculateEarnedWage(reserved, elapsed, activity.DurationSeconds)
	}
	refunded := reserved - earned
	var balanceAfter int64
	if err := tx.QueryRow(`
		UPDATE settlements
		SET treasury_balance=treasury_balance+$2,
		    treasury_reserved_payroll=treasury_reserved_payroll-$3,
		    treasury_lifetime_expenses=treasury_lifetime_expenses+$4,
		    revision=revision+1,updated_at=NOW()
		WHERE id=$1 RETURNING treasury_balance`, settlementID, refunded, reserved, earned).Scan(&balanceAfter); err != nil {
		return 0, 0, err
	}
	state := "paid"
	if cancelled {
		state = "cancelled"
	}
	if _, err := tx.Exec(`UPDATE settlement_payroll SET wage_paid=$2,wage_refunded=$3,state=$4,settled_at=$5 WHERE activity_id=$1`, activity.ID, earned, refunded, state, settledAt); err != nil {
		return 0, 0, err
	}
	if _, err := tx.Exec(`UPDATE character_activities SET wage_paid=$2 WHERE id=$1`, activity.ID, earned); err != nil {
		return 0, 0, err
	}
	if refunded > 0 {
		if err := insertSettlementGoldLedgerTx(tx, settlementID, charID, requestID, "payroll_refund", activity.ID, refunded, balanceAfter, map[string]any{"wage_paid": earned}); err != nil {
			return 0, 0, err
		}
	}
	return earned, refunded, nil
}

func TransferSettlementGold(charID, direction string, amount int64, requestID string) (*game.SettlementState, int64, error) {
	if requestID == "" || amount <= 0 || amount > 1_000_000_000_000 {
		return nil, 0, fmt.Errorf("transferência inválida")
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, 0, err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()
	reason := "manual_deposit"
	if direction == "withdraw" {
		reason = "manual_withdraw"
	} else if direction != "deposit" {
		return nil, 0, fmt.Errorf("direção de transferência inválida")
	}
	treasury, err := lockSettlementTreasuryTx(tx, charID)
	if err != nil {
		return nil, 0, err
	}
	var heroGold int64
	if err := tx.QueryRow(`SELECT gold_bank FROM characters WHERE id=$1 FOR UPDATE`, charID).Scan(&heroGold); err != nil {
		return nil, 0, err
	}
	var repeated bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM settlement_gold_ledger WHERE settlement_id=$1 AND request_id=$2 AND reason=$3)`, treasury.SettlementID, requestID, reason).Scan(&repeated); err != nil {
		return nil, 0, err
	}
	if repeated {
		if err := tx.Commit(); err != nil {
			return nil, 0, err
		}
		state, err := GetSettlementState(charID)
		return state, heroGold, err
	}
	delta := amount
	switch direction {
	case "deposit":
		if heroGold < amount {
			return nil, 0, fmt.Errorf("ouro pessoal insuficiente para o depósito")
		}
		heroGold -= amount
		treasury.Balance += amount
	case "withdraw":
		if treasury.Balance < amount {
			return nil, 0, fmt.Errorf("saldo disponível insuficiente na Tesouraria")
		}
		delta = -amount
		heroGold += amount
		treasury.Balance -= amount
	}
	if _, err := tx.Exec(`UPDATE characters SET gold_bank=$2,state_revision=state_revision+1 WHERE id=$1`, charID, heroGold); err != nil {
		return nil, 0, err
	}
	if _, err := tx.Exec(`UPDATE settlements SET treasury_balance=$2,treasury_lifetime_income=treasury_lifetime_income+$3,revision=revision+1,updated_at=NOW() WHERE id=$1`, treasury.SettlementID, treasury.Balance, maxInt64(delta, 0)); err != nil {
		return nil, 0, err
	}
	if err := insertSettlementGoldLedgerTx(tx, treasury.SettlementID, charID, requestID, reason, "treasury", delta, treasury.Balance, map[string]any{"direction": direction}); err != nil {
		return nil, 0, err
	}
	if err := tx.Commit(); err != nil {
		return nil, 0, err
	}
	state, err := GetSettlementState(charID)
	return state, heroGold, err
}

func UpdateSettlementTreasuryPolicy(charID string, autoFund bool, personalReserve int64, requestID string) (*game.SettlementState, error) {
	if requestID == "" || personalReserve < 0 || personalReserve > 1_000_000_000_000 {
		return nil, fmt.Errorf("reserva pessoal inválida")
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	treasury, err := lockSettlementTreasuryTx(tx, charID)
	if err != nil {
		return nil, err
	}
	var repeated bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM settlement_gold_ledger WHERE settlement_id=$1 AND request_id=$2 AND reason='policy_update')`, treasury.SettlementID, requestID).Scan(&repeated); err != nil {
		return nil, err
	}
	if !repeated {
		if _, err := tx.Exec(`UPDATE settlements SET treasury_auto_fund_enabled=$2,treasury_personal_gold_reserve=$3,revision=revision+1,updated_at=NOW() WHERE id=$1`, treasury.SettlementID, autoFund, personalReserve); err != nil {
			return nil, err
		}
		if err := insertSettlementGoldLedgerTx(tx, treasury.SettlementID, charID, requestID, "policy_update", "treasury", 0, treasury.Balance, map[string]any{"auto_fund_enabled": autoFund, "personal_gold_reserve": personalReserve}); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetSettlementState(charID)
}

func maxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}