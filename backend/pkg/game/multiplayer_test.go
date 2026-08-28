package game

import "testing"

func TestMultiplayerCombatContractsAreStable(t *testing.T) {
	instance := CombatInstance{Mode: CombatModeDuel, Actors: []CombatActor{
		{ID: "hero-a", Type: CombatActorHero, Team: CombatTeamA, Health: 100, MaxHealth: 100},
		{ID: "hero-b", Type: CombatActorHero, Team: CombatTeamB, Health: 100, MaxHealth: 100},
	}}
	if instance.Mode != CombatModeDuel || len(instance.Actors) != 2 {
		t.Fatalf("contrato PvP inválido: %+v", instance)
	}
	if instance.Actors[0].Team == instance.Actors[1].Team {
		t.Fatal("duelo precisa de times distintos")
	}
}