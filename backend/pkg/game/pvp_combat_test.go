package game

import (
	"testing"
	"time"
)

func testPvPMatch(attackA, attackB, healthA, healthB int) PvPMatch {
	created := time.Date(2026, 8, 27, 20, 0, 0, 0, time.UTC)
	return PvPMatch{
		ID: "match-1", Mode: CombatModeDuel, ArenaKey: "duel_arena", Status: PvPMatchReady, Seed: 99, CreatedAt: created,
		Participants: []PvPParticipantSnapshot{
			{CharacterID: "a", Name: "Alice", Level: 10, Team: CombatTeamA, Health: healthA, MaxHealth: healthA, Mana: 40, MaxMana: 40, DerivedStats: DerivedStats{TotalAttack: attackA, TotalDefense: 2, AttackSpeedSeconds: 0.5, PrimaryArchetype: "melee"}},
			{CharacterID: "b", Name: "Bob", Level: 10, Team: CombatTeamB, Health: healthB, MaxHealth: healthB, Mana: 40, MaxMana: 40, DerivedStats: DerivedStats{TotalAttack: attackB, TotalDefense: 2, AttackSpeedSeconds: 0.5, PrimaryArchetype: "melee"}},
		},
	}
}

func TestNewPvPCombatInstanceRejectsInvalidParticipants(t *testing.T) {
	match := testPvPMatch(20, 20, 100, 100)
	match.Participants[1].Team = CombatTeamA
	if _, err := NewPvPCombatInstance(match); err == nil {
		t.Fatal("duelo com times repetidos deveria falhar")
	}
}

func TestPvPCombatInstanceKeepsSnapshotsAndPvESeparate(t *testing.T) {
	match := testPvPMatch(20, 20, 10_000, 10_000)
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	before := instance.Snapshot()
	if before.Actors[0].GridX == before.Actors[1].GridX && before.Actors[0].GridY == before.Actors[1].GridY {
		t.Fatal("combatentes não podem nascer no mesmo tile")
	}
	if before.Actors[0].Derived.TotalAttack != 0 {
		t.Fatal("atributos internos não podem vazar no snapshot de arena")
	}
	for step := 0; step < 20; step++ {
		instance.Tick(time.Date(2026, 8, 27, 20, 0, step, 0, time.UTC))
	}
	after := instance.Snapshot()
	if after.Tick != 20 {
		t.Fatalf("ticks esperados=20 recebidos=%d", after.Tick)
	}
	if match.Participants[0].Health != 10_000 || match.Participants[1].Health != 10_000 {
		t.Fatal("instância não pode alterar o snapshot persistido de entrada")
	}
	if after.Actors[0].Health >= 10_000 && after.Actors[1].Health >= 10_000 {
		t.Fatal("duelo deveria aplicar dano sem tocar no PvE")
	}
}

func TestPvPCombatInstanceFinishesWithoutRewards(t *testing.T) {
	instance, err := NewPvPCombatInstance(testPvPMatch(300, 1, 100, 5))
	if err != nil {
		t.Fatal(err)
	}
	var result PvPCombatSnapshot
	for step := 0; step < 20; step++ {
		result = instance.Tick(time.Date(2026, 8, 27, 20, 0, step, 0, time.UTC))
		if result.Status == PvPMatchCompleted {
			break
		}
	}
	if result.Status != PvPMatchCompleted || result.WinnerID != "a" || result.EndedAt == nil {
		t.Fatalf("resultado inesperado: %+v", result)
	}
	if len(result.Events) == 0 || result.Events[len(result.Events)-1].Kind != "match_finished" {
		t.Fatalf("encerramento precisa emitir evento: %+v", result.Events)
	}
}

func TestPvPCombatInstanceRestoresSameDeterministicPulse(t *testing.T) {
	match := testPvPMatch(26, 23, 10_000, 10_000)
	original, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	for step := 0; step < 9; step++ {
		original.Tick(time.Date(2026, 8, 27, 20, 0, step, 0, time.UTC))
	}
	runtime := original.RuntimeState()
	restored, err := RestorePvPCombatInstance(match, runtime)
	if err != nil {
		t.Fatal(err)
	}
	expected := original.Tick(time.Date(2026, 8, 27, 20, 0, 10, 0, time.UTC))
	actual := restored.Tick(time.Date(2026, 8, 27, 20, 0, 10, 0, time.UTC))
	if expected.Tick != actual.Tick || expected.WinnerID != actual.WinnerID || len(expected.Actors) != len(actual.Actors) {
		t.Fatalf("pulso restaurado divergiu: esperado=%+v atual=%+v", expected, actual)
	}
	for index := range expected.Actors {
		if expected.Actors[index].Health != actual.Actors[index].Health || expected.Actors[index].GridX != actual.Actors[index].GridX || expected.Actors[index].GridY != actual.Actors[index].GridY {
			t.Fatalf("combatente %d divergiu após recuperação: esperado=%+v atual=%+v", index, expected.Actors[index], actual.Actors[index])
		}
	}
}

func TestPvPCombatSkillsUseFrozenLoadoutOnlyOnRulesVersionTwo(t *testing.T) {
	match := testPvPMatch(30, 30, 500, 500)
	match.RulesVersion = PvPCombatRulesVersion
	match.Participants[0].ActiveSkills = []string{"brutal_strike"}
	// A habilidade melee não pode ser injetada por um personagem distance.
	match.Participants[1].DerivedStats.PrimaryArchetype = "distance"
	match.Participants[1].ActiveSkills = []string{"brutal_strike", "multishot"}

	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}

	var foundBrutal, foundMultishot bool
	for step := 0; step < 20; step++ {
		snapshot := instance.Tick(time.Date(2026, 8, 27, 20, 0, step, 0, time.UTC))
		for _, event := range snapshot.Events {
			if event.Kind != "skill" {
				continue
			}
			if event.SkillKey == "brutal_strike" && event.SourceID == "a" {
				foundBrutal = true
			}
			if event.SkillKey == "multishot" && event.SourceID == "b" {
				foundMultishot = true
			}
			if event.SkillKey == "brutal_strike" && event.SourceID == "b" {
				t.Fatalf("skill incompatível não pode entrar na rotação PvP: %+v", event)
			}
		}
	}
	if !foundBrutal || !foundMultishot {
		t.Fatalf("loadouts selados deveriam executar skills compatíveis: brutal=%v multishot=%v", foundBrutal, foundMultishot)
	}
}

func TestPvPCombatRulesBeforeSkillRotationKeepsBasicAttacksOnly(t *testing.T) {
	match := testPvPMatch(30, 30, 500, 500)
	match.RulesVersion = PvPSkillRotationRulesVersion - 1
	match.Participants[0].ActiveSkills = []string{"brutal_strike"}
	match.Participants[1].ActiveSkills = []string{"brutal_strike"}
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	for step := 0; step < 20; step++ {
		snapshot := instance.Tick(time.Date(2026, 8, 27, 20, 0, step, 0, time.UTC))
		for _, event := range snapshot.Events {
			if event.Kind == "skill" {
				t.Fatalf("regras anteriores à rotação de skills não devem mudar no meio de uma atualização: %+v", event)
			}
		}
	}
}

func TestPvPCombatDivineHealUsesManaAndReportsSafeEvent(t *testing.T) {
	match := testPvPMatch(10, 10, 100, 100)
	match.RulesVersion = PvPCombatRulesVersion
	match.Participants[0].Health = 40
	match.Participants[0].ActiveSkills = []string{"divine_heal"}
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}

	snapshot := instance.Tick(time.Date(2026, 8, 27, 20, 0, 0, 0, time.UTC))
	if snapshot.Actors[0].Health <= 40 || snapshot.Actors[0].Mana != 12 {
		t.Fatalf("cura PvP deveria restaurar vida e debitar mana: %+v", snapshot.Actors[0])
	}
	if len(snapshot.Events) == 0 || snapshot.Events[0].Kind != "skill" || !snapshot.Events[0].IsHealing || snapshot.Events[0].SkillKey != "divine_heal" {
		t.Fatalf("evento de cura PvP inseguro ou ausente: %+v", snapshot.Events)
	}
}

func TestPvPCombatRestoresSkillCooldownAndRotationDeterministically(t *testing.T) {
	match := testPvPMatch(30, 30, 10_000, 10_000)
	match.RulesVersion = PvPCombatRulesVersion
	match.Participants[0].ActiveSkills = []string{"whirlwind", "brutal_strike"}
	match.Participants[1].ActiveSkills = []string{"whirlwind", "brutal_strike"}
	original, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	for step := 0; step < 9; step++ {
		original.Tick(time.Date(2026, 8, 27, 20, 0, step, 0, time.UTC))
	}
	restored, err := RestorePvPCombatInstance(match, original.RuntimeState())
	if err != nil {
		t.Fatal(err)
	}
	expected := original.Tick(time.Date(2026, 8, 27, 20, 0, 10, 0, time.UTC))
	actual := restored.Tick(time.Date(2026, 8, 27, 20, 0, 10, 0, time.UTC))
	if expected.Actors[0].Health != actual.Actors[0].Health || expected.Actors[1].Health != actual.Actors[1].Health || expected.Actors[0].Mana != actual.Actors[0].Mana || expected.Actors[1].Mana != actual.Actors[1].Mana {
		t.Fatalf("recuperação alterou resultado da rotação PvP: esperado=%+v atual=%+v", expected, actual)
	}
	if len(expected.Events) != len(actual.Events) {
		t.Fatalf("eventos após recuperação divergiram: esperado=%+v atual=%+v", expected.Events, actual.Events)
	}
	for index := range expected.Events {
		if expected.Events[index].Kind != actual.Events[index].Kind || expected.Events[index].SkillKey != actual.Events[index].SkillKey || expected.Events[index].Amount != actual.Events[index].Amount {
			t.Fatalf("evento %d após recuperação divergiu: esperado=%+v atual=%+v", index, expected.Events[index], actual.Events[index])
		}
	}
}
func TestPvPSkillGlobalCooldownStartsAtFullDuration(t *testing.T) {
	match := testPvPMatch(10, 10, 100, 100)
	match.RulesVersion = PvPCombatRulesVersion
	match.Participants[0].Health = 40
	match.Participants[0].ActiveSkills = []string{"divine_heal"}
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}

	snapshot := instance.Tick(time.Date(2026, 8, 27, 20, 0, 0, 0, time.UTC))
	foundHeal := false
	for _, event := range snapshot.Events {
		if event.Kind == "skill" && event.SourceID == "a" && event.SkillKey == "divine_heal" {
			foundHeal = true
		}
	}
	if !foundHeal {
		t.Fatalf("skill esperada não foi executada: %+v", snapshot.Events)
	}

	runtime := instance.RuntimeState()
	expected := pvpAttackCooldown(match.Participants[0].DerivedStats.AttackSpeedSeconds)
	if runtime.AttackCooldowns[0] != expected {
		t.Fatalf("GCD da skill foi consumido no mesmo tick: esperado=%.2f recebido=%.2f", expected, runtime.AttackCooldowns[0])
	}
}

func TestPvPCombatSnapshotCarriesSanitizedSkinOnly(t *testing.T) {
	match := testPvPMatch(10, 10, 100, 100)
	match.Participants[0].SkinKey = "mage"
	match.Participants[1].SkinKey = "../../skin-invalida"
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	snapshot := instance.Snapshot()
	if snapshot.Actors[0].SkinKey != "mage" {
		t.Fatalf("skin válida não chegou ao snapshot público: %+v", snapshot.Actors[0])
	}
	if snapshot.Actors[1].SkinKey != DefaultHeroSkinKey {
		t.Fatalf("skin inválida deveria cair no padrão seguro: %+v", snapshot.Actors[1])
	}
}

func TestPvPTacticalRangedKitesButMeleeEventuallyClosesGap(t *testing.T) {
	match := testPvPMatch(20, 20, 100_000, 100_000)
	match.RulesVersion = PvPTacticalCombatRulesVersion
	match.Participants[0].DerivedStats.PrimaryArchetype = "melee"
	match.Participants[0].DerivedStats.MovementSpeedMultiplier = BaseHeroMovementSpeedMultiplier
	match.Participants[0].TacticalStrategy = PvPStrategyBalanced
	match.Participants[0].StrategyVersion = PvPTacticalStrategyVersion
	match.Participants[1].DerivedStats.PrimaryArchetype = "distance"
	match.Participants[1].DerivedStats.MovementSpeedMultiplier = BaseHeroMovementSpeedMultiplier
	match.Participants[1].TacticalStrategy = PvPStrategyDefensive
	match.Participants[1].StrategyVersion = PvPTacticalStrategyVersion
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}

	sawKite := false
	minDistance := 999.0
	for step := 0; step < 120; step++ {
		snapshot := instance.Tick(time.Date(2026, 8, 27, 20, 0, 0, step*250_000_000, time.UTC))
		distance := gridDistance(snapshot.Actors[0].GridX, snapshot.Actors[0].GridY, snapshot.Actors[1].GridX, snapshot.Actors[1].GridY)
		if distance < minDistance {
			minDistance = distance
		}
		if snapshot.Actors[1].State == "KITE" {
			sawKite = true
		}
	}
	if !sawKite {
		t.Fatal("arqueiro deveria entrar em KITE quando o melee invade sua zona segura")
	}
	if minDistance > 2.25 {
		t.Fatalf("kiting não pode ser infinito; melee deveria conseguir fechar contato, menor distância=%.2f", minDistance)
	}
}

func TestPvPTacticalRangedDoesNotCastOffensiveSkillOnRetreatPulse(t *testing.T) {
	match := testPvPMatch(20, 20, 10_000, 10_000)
	match.RulesVersion = PvPTacticalCombatRulesVersion
	match.Participants[0].DerivedStats.PrimaryArchetype = "melee"
	match.Participants[0].DerivedStats.MovementSpeedMultiplier = BaseHeroMovementSpeedMultiplier
	match.Participants[1].DerivedStats.PrimaryArchetype = "distance"
	match.Participants[1].DerivedStats.MovementSpeedMultiplier = BaseHeroMovementSpeedMultiplier
	match.Participants[1].ActiveSkills = []string{"multishot"}
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	instance.actors[0].GridX, instance.actors[0].GridY = 8, 9
	instance.actors[1].GridX, instance.actors[1].GridY = 10, 9
	instance.movementAccumulators[1] = 0.90
	instance.actors[1].attackCooldown = 0

	before := instance.Snapshot().Actors[1]
	snapshot := instance.Tick(time.Date(2026, 8, 27, 20, 0, 0, 0, time.UTC))
	after := snapshot.Actors[1]
	if before.GridX == after.GridX && before.GridY == after.GridY {
		t.Fatalf("arqueiro deveria recuar neste pulso: antes=%+v depois=%+v", before, after)
	}
	for _, event := range snapshot.Events {
		if event.SourceID == "b" && event.Kind == "skill" && !event.IsHealing {
			t.Fatalf("ranged não deve castar skill ofensiva no mesmo pulso em que faz kite: %+v", event)
		}
	}
}

func TestPvPTacticalDefensiveStrategyUsesHealEarlier(t *testing.T) {
	match := testPvPMatch(10, 10, 100, 100)
	match.RulesVersion = PvPTacticalCombatRulesVersion
	match.Participants[0].Health = 55
	match.Participants[0].ActiveSkills = []string{"divine_heal"}
	match.Participants[0].TacticalStrategy = PvPStrategyDefensive
	match.Participants[0].StrategyVersion = PvPTacticalStrategyVersion
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	snapshot := instance.Tick(time.Date(2026, 8, 27, 20, 0, 0, 0, time.UTC))
	found := false
	for _, event := range snapshot.Events {
		if event.Kind == "skill" && event.SourceID == "a" && event.SkillKey == "divine_heal" && event.IsHealing {
			found = true
		}
	}
	if !found {
		t.Fatalf("estratégia defensiva deveria antecipar a cura em 55%% de vida: %+v", snapshot.Events)
	}
}

func TestPvPTacticalRuntimeRestoresMovementDeterministically(t *testing.T) {
	match := testPvPMatch(20, 20, 100_000, 100_000)
	match.RulesVersion = PvPTacticalCombatRulesVersion
	match.Participants[0].DerivedStats.PrimaryArchetype = "melee"
	match.Participants[0].DerivedStats.MovementSpeedMultiplier = 1.7
	match.Participants[1].DerivedStats.PrimaryArchetype = "distance"
	match.Participants[1].DerivedStats.MovementSpeedMultiplier = 1.8
	original, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	for step := 0; step < 11; step++ {
		original.Tick(time.Date(2026, 8, 27, 20, 0, 0, step*250_000_000, time.UTC))
	}
	restored, err := RestorePvPCombatInstance(match, original.RuntimeState())
	if err != nil {
		t.Fatal(err)
	}
	expected := original.Tick(time.Date(2026, 8, 27, 20, 0, 3, 0, time.UTC))
	actual := restored.Tick(time.Date(2026, 8, 27, 20, 0, 3, 0, time.UTC))
	for index := range expected.Actors {
		if expected.Actors[index].GridX != actual.Actors[index].GridX || expected.Actors[index].GridY != actual.Actors[index].GridY || expected.Actors[index].Health != actual.Actors[index].Health {
			t.Fatalf("M3E-B divergiu após restore no ator %d: esperado=%+v atual=%+v", index, expected.Actors[index], actual.Actors[index])
		}
	}
}

func TestPvPRulesVersionTwoKeepsLegacyMovementWithoutKite(t *testing.T) {
	match := testPvPMatch(20, 20, 10_000, 10_000)
	match.RulesVersion = PvPSkillRotationRulesVersion
	match.Participants[1].DerivedStats.PrimaryArchetype = "distance"
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	instance.actors[0].GridX, instance.actors[0].GridY = 8, 9
	instance.actors[1].GridX, instance.actors[1].GridY = 10, 9
	snapshot := instance.Tick(time.Date(2026, 8, 27, 20, 0, 0, 0, time.UTC))
	if snapshot.Actors[1].State == "KITE" {
		t.Fatalf("partida rules_version=2 não pode receber movimentação M3E-B retroativamente: %+v", snapshot.Actors[1])
	}
}

func TestNormalizePvPTacticalStrategyFallsBackToBalanced(t *testing.T) {
	if got := NormalizePvPTacticalStrategy("defensive"); got != PvPStrategyDefensive {
		t.Fatalf("estratégia válida foi alterada: %s", got)
	}
	if got := NormalizePvPTacticalStrategy("../../invalid"); got != PvPStrategyBalanced {
		t.Fatalf("estratégia inválida deve cair em balanced: %s", got)
	}
}
