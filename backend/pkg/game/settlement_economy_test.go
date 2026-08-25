package game

import "testing"

func TestGatheringWageProtectsOnboardingAndScales(t *testing.T) {
	if got := CalculateGatheringWage(8*3600, 50, 3, SettlementPayrollUnlockProsperity-1); got != 0 {
		t.Fatalf("salário antes do desbloqueio = %d, esperado 0", got)
	}
	if got := CalculateGatheringWage(15*60, 1, 1, SettlementPayrollUnlockProsperity); got != 10 {
		t.Fatalf("salário tutorial de 15 minutos = %d, esperado 10", got)
	}
	if low, high := CalculateGatheringWage(3600, 1, 1, 25), CalculateGatheringWage(3600, 20, 2, 25); high <= low {
		t.Fatalf("trabalhador/área avançados deveriam custar mais: básico=%d avançado=%d", low, high)
	}
}

func TestCancelledGatheringPaysOnlyWorkedShare(t *testing.T) {
	if got := CalculateEarnedWage(320, 2*3600, 8*3600); got != 80 {
		t.Fatalf("salário proporcional = %d, esperado 80", got)
	}
	if got := CalculateEarnedWage(320, 8*3600, 8*3600); got != 320 {
		t.Fatalf("ordem completa deveria pagar toda a reserva, obteve %d", got)
	}
	if got := CalculateEarnedWage(320, 0, 8*3600); got != 0 {
		t.Fatalf("cancelamento imediato deveria devolver tudo, obteve %d", got)
	}
}