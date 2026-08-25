package game

import "math"

const (
	SettlementEconomyVersion            = 1
	SettlementPayrollUnlockProsperity   = int64(25)
	SettlementBaseHourlyWage            = int64(40)
	SettlementDefaultPersonalGoldReserve = int64(500)
)

// SettlementTreasuryState separa o caixa produtivo do ouro pessoal do herói.
// Balance contém somente ouro disponível: salários reservados já foram
// abatidos e ficam visíveis em ReservedPayroll até a liquidação da ordem.
type SettlementTreasuryState struct {
	Balance             int64 `json:"balance"`
	ReservedPayroll     int64 `json:"reserved_payroll"`
	LifetimeIncome      int64 `json:"lifetime_income"`
	LifetimeExpenses    int64 `json:"lifetime_expenses"`
	AutoFundEnabled     bool  `json:"auto_fund_enabled"`
	PersonalGoldReserve int64 `json:"personal_gold_reserve"`
	PayrollUnlocked     bool  `json:"payroll_unlocked"`
	UnlockProsperity    int64 `json:"unlock_prosperity"`
	BaseHourlyWage      int64 `json:"base_hourly_wage"`
	EconomyVersion      int   `json:"economy_version"`
}

// CalculateGatheringWage gera um custo determinístico que pode ser salvo no
// snapshot da ordem. Alterações futuras na economia não mudam trabalhos já
// iniciados.
func CalculateGatheringWage(durationSeconds int64, professionLevel, expeditionTier int, prosperity int64) int64 {
	if durationSeconds <= 0 || prosperity < SettlementPayrollUnlockProsperity {
		return 0
	}
	if professionLevel < 1 {
		professionLevel = 1
	}
	if expeditionTier < 1 {
		expeditionTier = 1
	}
	levelBonus := math.Min(1, float64(professionLevel-1)*0.03)
	tierBonus := float64(expeditionTier-1) * 0.25
	wage := float64(SettlementBaseHourlyWage) * (float64(durationSeconds) / 3600) * (1 + levelBonus + tierBonus)
	return int64(math.Ceil(wage))
}

// CalculateEarnedWage preserva pagamento proporcional ao cancelar uma ordem.
// O restante reservado volta para a Tesouraria.
func CalculateEarnedWage(reserved, elapsedSeconds, durationSeconds int64) int64 {
	if reserved <= 0 || elapsedSeconds <= 0 || durationSeconds <= 0 {
		return 0
	}
	if elapsedSeconds >= durationSeconds {
		return reserved
	}
	earned := int64(math.Ceil(float64(reserved) * float64(elapsedSeconds) / float64(durationSeconds)))
	if earned > reserved {
		return reserved
	}
	return earned
}