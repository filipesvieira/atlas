package game

import (
	"testing"
	"time"
)

func TestPvPBalanceMechanicsMatrixStaysInsideSixtyFortyGate(t *testing.T) {
	report, err := RunPvPBalanceMatrix(PvPBalanceScenarioMechanicsEqualCP, 100)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Results) != 3 {
		t.Fatalf("matriz mecânica deveria ter 3 matchups, recebeu %d", len(report.Results))
	}
	for _, result := range report.Results {
		if !result.Eligible {
			t.Fatalf("matchup normalizado não elegível: %+v", result)
		}
		if result.PowerGapPercent > PvPBalanceMaxPowerGapPercent {
			t.Fatalf("gap de poder %.2f%% excedeu gate", result.PowerGapPercent)
		}
		if result.Timeouts != 0 {
			t.Fatalf("matchup %s/%s teve %d timeouts", result.ProfileA, result.ProfileB, result.Timeouts)
		}
		if !result.WithinBalanceGate || result.DominantWinShare > PvPBalanceTargetMaxWinShare {
			t.Fatalf("matchup %s/%s saiu do alvo 60/40: %+v", result.ProfileA, result.ProfileB, result)
		}
	}
}

func TestPvPStarterLoadoutsRemainDiagnosticWhenPowerGapIsLarge(t *testing.T) {
	report, err := RunPvPBalanceMatrix(PvPBalanceScenarioStarterBaseline, 5)
	if err != nil {
		t.Fatal(err)
	}
	foundDistanceGap := false
	for _, result := range report.Results {
		if (result.ProfileA == "distance" || result.ProfileB == "distance") && result.PowerGapPercent > PvPBalanceMaxPowerGapPercent {
			foundDistanceGap = true
			if result.Eligible || result.ExclusionReason == "" {
				t.Fatalf("starter com CP desigual não pode virar gate de classe: %+v", result)
			}
		}
	}
	if !foundDistanceGap {
		t.Fatal("esperava detectar ao menos um starter distance com gap >2%")
	}
}

func TestPvPSniperShotNoLongerGuaranteesCriticalInBalanceRules(t *testing.T) {
	rule := pvpSkillRules["sniper_shot"]
	if rule.GuaranteedCritical {
		t.Fatal("Sniper Shot não pode manter crítico 100% em rotação automática PvP v4")
	}
	if rule.BonusCriticalChance <= 0 {
		t.Fatal("Sniper Shot deve preservar identidade de precisão por bônus crítico")
	}
}

func TestPvPCombatMetricsSeparateSkillBasicAndActualKiteSteps(t *testing.T) {
	a := mechanicsEqualCPPvPBalanceProfile("melee").Participant
	b := mechanicsEqualCPPvPBalanceProfile("distance").Participant
	a.Team, b.Team = CombatTeamA, CombatTeamB
	match := testPvPMatch(40, 40, 2000, 2000)
	match.RulesVersion = PvPCombatRulesVersion
	match.Participants = []PvPParticipantSnapshot{a, b}
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 120; i++ {
		instance.Tick(match.CreatedAt.Add(timeDurationTicks(i + 1)))
		if instance.Snapshot().Status != PvPMatchActive {
			break
		}
	}
	metrics := instance.RuntimeState().Metrics[1]
	if metrics.KiteSteps > metrics.KiteTicks || metrics.MovementSteps > metrics.MovementTicks {
		t.Fatalf("passos reais não podem exceder ticks de estado: %+v", metrics)
	}
	if metrics.MovementSteps > 0 && metrics.MovementDistance <= 0 {
		t.Fatalf("movimento real deve acumular distância: %+v", metrics)
	}
	if metrics.BasicDamage+metrics.SkillDamage != metrics.DamageDealt {
		t.Fatalf("dano básico + skills deveria reconciliar com dano total: %+v", metrics)
	}
}

func timeDurationTicks(ticks int) time.Duration {
	return time.Duration(ticks) * PvPCombatTickInterval
}

func TestPvPIceShardAppliesAuthoritativeSlow(t *testing.T) {
	magic := mechanicsEqualCPPvPBalanceProfile("magic").Participant
	melee := mechanicsEqualCPPvPBalanceProfile("melee").Participant
	magic.Team, melee.Team = CombatTeamA, CombatTeamB
	magic.ActiveSkills = []string{"ice_shard"}
	melee.ActiveSkills = nil
	started := time.Unix(0, 0).UTC()
	match := PvPMatch{ID: "slow-test", Mode: CombatModeDuel, ArenaKey: "duel_arena", Status: PvPMatchActive, RulesVersion: PvPCombatRulesVersion, Seed: 11, CreatedAt: started, StartedAt: &started, Participants: []PvPParticipantSnapshot{magic, melee}}
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for tick := 1; tick <= 20; tick++ {
		snapshot := instance.Tick(started.Add(time.Duration(tick) * PvPCombatTickInterval))
		for _, event := range snapshot.Events {
			if event.SkillKey == "ice_shard" && event.StatusKey == "slow" && event.DurationTicks > 0 {
				found = true
			}
		}
		if found {
			break
		}
	}
	if !found {
		t.Fatal("Ice Shard deveria emitir slow autoritativo")
	}
	runtime := instance.RuntimeState()
	if runtime.SlowUntilTick[1] <= runtime.Snapshot.Tick || runtime.SlowMultipliers[1] >= 1 {
		t.Fatalf("slow não persistiu no runtime: %+v", runtime)
	}
}

func TestPvPArcaneNovaKnocksTargetBack(t *testing.T) {
	magic := mechanicsEqualCPPvPBalanceProfile("magic").Participant
	melee := mechanicsEqualCPPvPBalanceProfile("melee").Participant
	magic.Team, melee.Team = CombatTeamA, CombatTeamB
	magic.ActiveSkills = []string{"arcane_nova"}
	melee.ActiveSkills = nil
	started := time.Unix(0, 0).UTC()
	match := PvPMatch{ID: "nova-test", Mode: CombatModeDuel, ArenaKey: "duel_arena", Status: PvPMatchActive, RulesVersion: PvPCombatRulesVersion, Seed: 17, CreatedAt: started, StartedAt: &started, Participants: []PvPParticipantSnapshot{magic, melee}}
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		t.Fatal(err)
	}
	instance.actors[0].GridX, instance.actors[0].GridY = 8, 9
	instance.actors[1].GridX, instance.actors[1].GridY = 10, 9
	before := gridDistance(8, 9, 10, 9)
	found := false
	for tick := 1; tick <= 20; tick++ {
		snapshot := instance.Tick(started.Add(time.Duration(tick) * PvPCombatTickInterval))
		for _, event := range snapshot.Events {
			if event.SkillKey == "arcane_nova" && event.StatusKey == "knockback" {
				found = true
			}
		}
		if found {
			break
		}
	}
	if !found {
		t.Fatal("Arcane Nova deveria emitir knockback autoritativo")
	}
	after := gridDistance(instance.actors[0].GridX, instance.actors[0].GridY, instance.actors[1].GridX, instance.actors[1].GridY)
	if after <= before {
		t.Fatalf("Arcane Nova deveria aumentar distância: antes=%.2f depois=%.2f", before, after)
	}
}
