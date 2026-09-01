package game

import "testing"

func TestSettlementDefenseEvaluationGrowsWithFortifications(t *testing.T) {
	base := EvaluateSettlementDefense(SettlementStageCity, map[string]int{"wall": 1, "watchtower": 1, "gate": 1, "barracks": 1, "war_room": 1}, "balanced", 15)
	upgraded := EvaluateSettlementDefense(SettlementStageKingdom, map[string]int{"wall": 3, "watchtower": 3, "gate": 3, "barracks": 3, "war_room": 3, "vault": 3, "infirmary": 3, "engineer_workshop": 3, "resonator": 3}, "balanced", 30)
	if upgraded.DefensePower <= base.DefensePower {
		t.Fatalf("defense power deveria crescer: base=%d upgraded=%d", base.DefensePower, upgraded.DefensePower)
	}
	if upgraded.Readiness < 95 {
		t.Fatalf("reino completo deveria estar pronto, readiness=%d", upgraded.Readiness)
	}
}

func TestSettlementDefenseStrategyOnlyReweightsPresentationPower(t *testing.T) {
	levels := map[string]int{"wall": 2, "watchtower": 2, "gate": 2, "barracks": 2, "war_room": 1, "infirmary": 1, "engineer_workshop": 1, "resonator": 1}
	balanced := EvaluateSettlementDefense(SettlementStageCity, levels, "balanced", 15)
	defensive := EvaluateSettlementDefense(SettlementStageCity, levels, "defensive", 15)
	aggressive := EvaluateSettlementDefense(SettlementStageCity, levels, "aggressive", 15)
	if defensive.DefensePower == balanced.DefensePower && aggressive.DefensePower == balanced.DefensePower {
		t.Fatal("estratégias deveriam produzir leitura diferente de power")
	}
	if defensive.Readiness != balanced.Readiness || aggressive.Readiness != balanced.Readiness {
		t.Fatal("estratégia não deve alterar readiness estrutural")
	}
}

func TestSettlementDefenseAutomaticallyFillsGarrisonWithoutMicromanagement(t *testing.T) {
	evaluation := EvaluateSettlementDefense(SettlementStageCity, map[string]int{"wall": 2, "watchtower": 2, "gate": 2, "barracks": 2, "war_room": 1}, "balanced", 15)
	if evaluation.Garrison.Capacity != 8 || evaluation.Garrison.ActiveGuards != 8 {
		t.Fatalf("guarnição automática inesperada: %+v", evaluation.Garrison)
	}
	if evaluation.Garrison.CivilianReserve != SettlementPioneerCount || evaluation.Garrison.AssignmentMode != "automatic" {
		t.Fatalf("reserva civil/modo automático inválidos: %+v", evaluation.Garrison)
	}

	underpopulated := EvaluateSettlementDefense(SettlementStageKingdom, map[string]int{"wall": 3, "watchtower": 3, "gate": 3, "barracks": 3, "war_room": 3}, "balanced", 16)
	if underpopulated.Garrison.Capacity != 12 || underpopulated.Garrison.ActiveGuards != 9 {
		t.Fatalf("população deve limitar guarnição sem microgestão: %+v", underpopulated.Garrison)
	}
}
