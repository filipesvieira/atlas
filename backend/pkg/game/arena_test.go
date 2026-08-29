package game

import (
	"math"
	"testing"
	"time"
)

func TestArenaMovementUsesBothAxes(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{{
			ID:         "mob-1",
			Health:     100,
			MaxHealth:  100,
			GridX:      13,
			GridY:      13,
			AttackType: AttackTypeMelee,
			State:      "CHASE",
		}},
	}

	session.moveHero("melee")
	if session.HeroGridX != 8 || session.HeroGridY != 10 || session.HeroState != "CHASE" {
		t.Fatalf("herói deveria perseguir em dois eixos: %+v", session.buildArenaSnapshot().Hero)
	}

	session.moveMonsters()
	mob := session.CurrentMonsters[0]
	if mob.GridX != 12 || mob.GridY != 12 {
		t.Fatalf("monstro deveria avançar diagonalmente: (%d,%d)", mob.GridX, mob.GridY)
	}
}

func TestManualHeroMovementOverridesAIUntilReleased(t *testing.T) {
	session := &GameSession{
		IsExpeditionActive: true,
		HeroGridX:          7,
		HeroGridY:          9,
		CurrentMonsters: []Monster{{
			ID: "mob-1", Health: 100, MaxHealth: 100,
			GridX: 20, GridY: 9, AttackType: AttackTypeMelee, State: "CHASE",
		}},
	}

	session.SetManualMovement("up-right", true)
	if session.HeroGridX != 8 || session.HeroGridY != 8 || session.HeroState != "MANUAL" {
		t.Fatalf("o comando manual deveria mover imediatamente na diagonal: (%d,%d), estado=%s", session.HeroGridX, session.HeroGridY, session.HeroState)
	}

	// Ao liberar a tecla, a próxima decisão volta a ser da IA.
	session.SetManualMovement("up-right", false)
	session.moveHero("melee")
	if session.HeroGridX != 9 || session.HeroGridY != 9 || session.HeroState != "CHASE" {
		t.Fatalf("a IA deveria retomar após a liberação: (%d,%d), estado=%s", session.HeroGridX, session.HeroGridY, session.HeroState)
	}
}

func TestManualHeroMovementClampsArenaBounds(t *testing.T) {
	session := &GameSession{IsExpeditionActive: true, HeroGridX: 0, HeroGridY: 0}
	session.SetManualMovement("up-left", true)
	if session.HeroGridX != 0 || session.HeroGridY != 0 {
		t.Fatalf("movimento manual não deveria ultrapassar a arena: (%d,%d)", session.HeroGridX, session.HeroGridY)
	}
}

func TestManualHeroMovementPublishesImmediateSnapshot(t *testing.T) {
	session := &GameSession{
		IsExpeditionActive: true,
		HeroGridX:          7,
		HeroGridY:          9,
		SendChannel:        make(chan CombatMessage, 1),
	}

	session.ApplyManualMovement("right", true, 1.0, "move_test")

	select {
	case msg := <-session.SendChannel:
		if msg.Type != "HERO_MOVEMENT" || msg.RequestID != "move_test" {
			t.Fatalf("snapshot manual inesperado: tipo=%q request_id=%q", msg.Type, msg.RequestID)
		}
		if msg.Arena == nil || msg.Arena.Hero.GridX != 8 || msg.Arena.Hero.GridY != 9 {
			t.Fatalf("snapshot deveria refletir o passo imediato: %+v", msg.Arena)
		}
	default:
		t.Fatal("o comando manual deveria publicar um snapshot imediatamente")
	}
}

func TestRepeatedManualPressesAddImmediateEffortStep(t *testing.T) {
	session := &GameSession{IsExpeditionActive: true, HeroGridX: 7, HeroGridY: 9}

	// Cada clique/pressionar depois de soltar começa uma nova intenção e ganha
	// o mesmo passo imediato que o teclado; a velocidade base continua usando
	// o acumulador quando a intenção permanece pressionada.
	session.SetManualMovement("right", true)
	session.SetManualMovement("right", false)
	session.SetManualMovement("right", true)

	if session.HeroGridX != 9 || session.HeroGridY != 9 {
		t.Fatalf("duas pressões manuais deveriam produzir dois passos imediatos: (%d,%d)", session.HeroGridX, session.HeroGridY)
	}
}

func TestHeroMovementSpeedConsumesFractionalSteps(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{{
			ID: "fast-target", Health: 100, MaxHealth: 100,
			GridX: 20, GridY: 9, AttackType: AttackTypeMelee, State: "CHASE",
		}},
	}

	session.moveHeroWithSpeed("melee", 2.0)
	if session.HeroGridX != 9 || session.HeroGridY != 9 {
		t.Fatalf("herói 2x deveria avançar dois tiles: (%d,%d)", session.HeroGridX, session.HeroGridY)
	}
}

func TestManualHeroControlAppliesMovementBoost(t *testing.T) {
	now := time.Now().UTC()
	session := &GameSession{ManualMoveStartedAt: now}
	if got := session.manualHeroMovementSpeed(BaseHeroMovementSpeedMultiplier, now); got != BaseHeroMovementSpeedMultiplier {
		t.Fatalf("controle manual deveria iniciar na velocidade base, obtido %.2f", got)
	}
	manualMaximum := math.Min(MaxHeroMovementSpeedMultiplier, BaseHeroMovementSpeedMultiplier*ManualHeroControlSpeedMultiplier)
	if got := session.manualHeroMovementSpeed(BaseHeroMovementSpeedMultiplier, now.Add(manualMovementAccelerationDuration)); got != manualMaximum {
		t.Fatalf("controle manual deveria alcançar %.2f, obtido %.2f", manualMaximum, got)
	}
	if got := session.manualHeroMovementSpeed(2.4, now.Add(manualMovementAccelerationDuration)); got != MaxHeroMovementSpeedMultiplier {
		t.Fatalf("controle manual deveria respeitar o teto %.2f, obtido %.2f", MaxHeroMovementSpeedMultiplier, got)
	}
}

func TestMonsterMovementSpeedAllowsMultipleStepsPerTick(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{{
			ID: "fast-wolf", Health: 100, MaxHealth: 100,
			GridX: 20, GridY: 9, AttackType: AttackTypeMelee, State: "CHASE",
			MovementSpeedMultiplier: 2.0,
		}},
	}

	session.moveMonsters()
	if session.CurrentMonsters[0].GridX != 18 || session.CurrentMonsters[0].GridY != 9 {
		t.Fatalf("monstro 2x deveria avançar dois tiles: (%d,%d)", session.CurrentMonsters[0].GridX, session.CurrentMonsters[0].GridY)
	}
}

func TestMeleeHeroWithBootSpeedCatchesKitingSpider(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{{
			ID: "spider", Health: 100, MaxHealth: 100,
			GridX: 20, GridY: 9, AttackType: AttackTypeRanged, State: "CHASE",
			MovementSpeedMultiplier: 1.10,
		}},
	}

	for tick := 0; tick < 40; tick++ {
		session.moveHeroWithSpeed("melee", 1.165)
		session.moveMonsters()
		if session.HeroState == "ATTACK" && session.nearestLivingMonsterInRange("melee") != nil {
			return
		}
	}

	spider := session.CurrentMonsters[0]
	t.Fatalf("herói com +16.5%% deveria alcançar a aranha: herói=(%d,%d), aranha=(%d,%d), distância=%.2f", session.HeroGridX, session.HeroGridY, spider.GridX, spider.GridY, gridDistance(session.HeroGridX, session.HeroGridY, spider.GridX, spider.GridY))
}

func TestRangedHeroKitesNearbyMelee(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{{
			ID:         "melee-1",
			Health:     100,
			MaxHealth:  100,
			GridX:      8,
			GridY:      9,
			AttackType: AttackTypeMelee,
			State:      "CHASE",
		}},
	}

	session.moveHero("distance")
	if session.HeroGridX != 6 || session.HeroGridY != 9 || session.HeroState != "KITE" {
		t.Fatalf("herói à distância deveria recuar: %+v", session.buildArenaSnapshot().Hero)
	}
}

func TestRangedHeroChasesFleeingMonster(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{{
			ID: "fleeing-1", Health: 10, MaxHealth: 100,
			GridX: 16, GridY: 12, AttackType: AttackTypeMelee, State: "FLEE",
		}},
	}

	session.moveHero("distance")
	if session.HeroGridX != 8 || session.HeroGridY != 10 || session.HeroState != "CHASE" {
		t.Fatalf("herói à distância deveria perseguir alvo em fuga: %+v", session.buildArenaSnapshot().Hero)
	}
}

func TestMagicHeroClosesRangedDeadZone(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{{
			ID: "ranged-kite", Health: 100, MaxHealth: 100,
			GridX: 14, GridY: 10, AttackType: AttackTypeRanged, State: "KITE",
		}},
	}

	// Distância sqrt(50) ~= 7.07: fora do alcance mágico (7), mas dentro do
	// alcance ranged do monstro (8). O herói deve avançar, não ficar em ATTACK.
	session.moveHero("magic")
	if session.HeroGridX != 8 || session.HeroGridY != 10 || session.HeroState != "CHASE" {
		t.Fatalf("mago deveria fechar a faixa morta de alcance: %+v", session.buildArenaSnapshot().Hero)
	}
}

func TestAttackUsesNearestReachableMonsterWhenFinishTargetIsFar(t *testing.T) {
	session := &GameSession{
		HeroGridX:    7,
		HeroGridY:    9,
		HeroTargetID: "fleeing-far",
		CurrentMonsters: []Monster{
			{ID: "fleeing-far", Health: 10, MaxHealth: 100, GridX: 20, GridY: 15, AttackType: AttackTypeMelee, State: "FLEE"},
			{ID: "nearby", Health: 100, MaxHealth: 100, GridX: 9, GridY: 9, AttackType: AttackTypeMelee, State: "ATTACK"},
		},
	}

	target := session.nearestLivingMonsterInRange("melee")
	if target == nil || target.ID != "nearby" {
		t.Fatalf("deveria haver um alvo atacável próximo, obtido: %+v", target)
	}
}

func TestFleeingMonsterCanBeFinishedWhenCornered(t *testing.T) {
	session := &GameSession{
		HeroGridX: 1,
		HeroGridY: 1,
		CurrentMonsters: []Monster{{
			ID: "cornered-1", Health: 10, MaxHealth: 100,
			GridX: 0, GridY: 0, AttackType: AttackTypeMelee, State: "FLEE",
		}},
	}

	session.moveMonsters()
	mob := session.CurrentMonsters[0]
	if mob.State != "CHASE" || !mob.FleeResolved {
		t.Fatalf("monstro encurralado deveria encerrar a fuga: %+v", mob)
	}
}

func TestFleeingMonsterCreatesDistanceEvenWhenClose(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{{
			ID: "wolf-close", Health: 20, MaxHealth: 100,
			GridX: 8, GridY: 9, AttackType: AttackTypeMelee,
			State: "FLEE", LowHealthBehavior: LowHealthBehaviorFlee,
		}},
	}

	session.moveMonsters()
	mob := session.CurrentMonsters[0]
	if mob.State != "FLEE" || mob.GridX != 9 || mob.GridY != 9 || mob.FleeResolved {
		t.Fatalf("monstro ferido próximo deveria abrir distância sem cancelar a fuga: %+v", mob)
	}
}

func TestForestLowHealthBehaviorIsConfiguredPerMonster(t *testing.T) {
	forest, ok := GetExpeditionRegion("forest")
	if !ok {
		t.Fatal("região forest não encontrada")
	}

	behaviorByKey := make(map[string]LowHealthBehavior, len(forest.Monsters)+1)
	for _, mob := range forest.Monsters {
		behaviorByKey[mob.Key] = mob.LowHealthBehavior
	}
	behaviorByKey[forest.Boss.Key] = forest.Boss.LowHealthBehavior

	expectations := map[string]LowHealthBehavior{
		"forest_goblin":    LowHealthBehaviorStandGround,
		"forest_wolf":      LowHealthBehaviorFlee,
		"forest_spider":    LowHealthBehaviorFlee,
		"forest_boss_bear": LowHealthBehaviorStandGround,
	}
	for key, expected := range expectations {
		if behaviorByKey[key] != expected {
			t.Errorf("%s deveria usar comportamento %q, obteve %q", key, expected, behaviorByKey[key])
		}
	}
}

func TestLowHealthBehaviorTransitionsOnlyConfiguredFleeers(t *testing.T) {
	fleeing := Monster{
		ID: "wolf", Health: 20, MaxHealth: 100, GridX: 18, GridY: 9,
		AttackType: AttackTypeMelee, State: "ATTACK", LowHealthBehavior: LowHealthBehaviorFlee,
	}
	updateMonsterFleeState(&fleeing)
	if fleeing.State != "FLEE" {
		t.Fatalf("monstro configurado para fugir deveria entrar em FLEE: %+v", fleeing)
	}

	standing := Monster{
		ID: "goblin", Health: 20, MaxHealth: 100, GridX: 18, GridY: 9,
		AttackType: AttackTypeMelee, State: "ATTACK", LowHealthBehavior: LowHealthBehaviorStandGround,
	}
	updateMonsterFleeState(&standing)
	if standing.State == "FLEE" {
		t.Fatalf("monstro configurado para lutar até morrer não deveria fugir: %+v", standing)
	}
}

func TestArenaSeparatesMonstersOnSameTile(t *testing.T) {
	session := &GameSession{
		HeroGridX: 7,
		HeroGridY: 9,
		CurrentMonsters: []Monster{
			{ID: "mob-a", Health: 100, MaxHealth: 100, GridX: 12, GridY: 9, AttackType: AttackTypeMelee, State: "ATTACK"},
			{ID: "mob-b", Health: 100, MaxHealth: 100, GridX: 12, GridY: 9, AttackType: AttackTypeMelee, State: "ATTACK"},
		},
	}

	session.separateMonsters()
	if session.CurrentMonsters[0].GridX == session.CurrentMonsters[1].GridX && session.CurrentMonsters[0].GridY == session.CurrentMonsters[1].GridY {
		t.Fatalf("monstros não deveriam permanecer no mesmo tile: %+v", session.CurrentMonsters)
	}
}

func TestKiteContinuesAlongArenaEdge(t *testing.T) {
	x, y := stepGridAway(0, 9, 1, 9)
	if x == 0 && y == 9 {
		t.Fatalf("o herói não deveria ficar parado na borda: (%d,%d)", x, y)
	}
}

func TestKiteTurnsBeforeArenaEdge(t *testing.T) {
	x, y := stepGridAwayWithOrbitWithin(21, 9, 15, 9, GridWidth, GridHeight, true)
	if x == 22 || arenaEdgeClearance(x, y, GridWidth, GridHeight) < 2 {
		t.Fatalf("kite deveria contornar antes da borda: (%d,%d)", x, y)
	}
}

func TestLivingFleeingTargetIsReacquiredAfterPreviousTargetDies(t *testing.T) {
	session := &GameSession{
		HeroGridX:    7,
		HeroGridY:    9,
		HeroTargetID: "boss-dead",
		CurrentMonsters: []Monster{
			{ID: "boss-dead", Health: 0, MaxHealth: 100, GridX: 8, GridY: 9, AttackType: AttackTypeMelee, State: "ATTACK"},
			{ID: "fleeing-survivor", Health: 10, MaxHealth: 100, GridX: 16, GridY: 12, AttackType: AttackTypeMelee, State: "ATTACK"},
		},
	}

	session.moveHero("distance")
	if session.HeroTargetID != "fleeing-survivor" || session.HeroState != "CHASE" {
		t.Fatalf("herói deveria reacquirir o monstro vivo: %+v", session.buildArenaSnapshot().Hero)
	}
}

func TestArenaSpawnPointsUseDifferentCorners(t *testing.T) {
	seen := map[[2]int]bool{}
	for i := 0; i < 4; i++ {
		x, y := arenaSpawnPoint(i)
		point := [2]int{x, y}
		if seen[point] {
			t.Fatalf("ponto de spawn repetido: (%d,%d)", x, y)
		}
		seen[point] = true
	}
}

func TestArenaCollisionBlocksSherequeHut(t *testing.T) {
	session := &GameSession{ActiveRegion: "shereque", HeroGridX: 15, HeroGridY: 6}
	if session.canOccupyArenaTile(18, 6, arenaHeroMover, "") {
		t.Fatal("o herói não deveria ocupar um tile dentro da cabana de Shereque")
	}
	if !session.canOccupyArenaTile(15, 6, arenaHeroMover, "") {
		t.Fatal("o tile de aproximação da cabana deveria continuar livre")
	}
}

func TestArenaCollisionRoutesAroundSherequeHut(t *testing.T) {
	session := &GameSession{ActiveRegion: "shereque", HeroGridX: 15, HeroGridY: 6}
	nextX, nextY := session.stepArenaToward(15, 6, 22, 6, "")
	if nextX == 16 && nextY >= 4 && nextY <= 7 {
		t.Fatalf("o primeiro passo não deveria atravessar a parede da cabana: (%d,%d)", nextX, nextY)
	}
	if nextX == 15 && nextY == 6 {
		t.Fatal("o herói deveria iniciar o contorno da cabana, não ficar parado")
	}
}

func TestArenaCollisionBlocksSherequeSign(t *testing.T) {
	session := &GameSession{ActiveRegion: "shereque"}
	if session.canOccupyArenaTile(5, 14, arenaHeroMover, "") {
		t.Fatal("o herói não deveria ocupar o tile do letreiro da Vila do Shereque")
	}
	if !session.canOccupyArenaTile(5, 13, arenaHeroMover, "") {
		t.Fatal("o tile diante do letreiro deveria continuar livre")
	}
}

func TestArenaCollisionBlocksForestTree(t *testing.T) {
	session := &GameSession{ActiveRegion: "forest"}
	if session.canOccupyArenaTile(1, 3, arenaHeroMover, "") {
		t.Fatal("o herói não deveria ocupar o tile de uma árvore da Floresta")
	}
	if !session.canOccupyArenaTile(1, 4, arenaHeroMover, "") {
		t.Fatal("um tile adjacente à árvore deveria continuar livre")
	}
}

func TestArenaManualMovementStopsAtSolidObject(t *testing.T) {
	session := &GameSession{ActiveRegion: "forest", IsExpeditionActive: true, HeroGridX: 11, HeroGridY: 9}
	session.SetManualMovement("right", true)
	if session.HeroGridX != 11 || session.HeroGridY != 9 || session.HeroState != "MANUAL_BLOCKED" {
		t.Fatalf("movimento manual deveria respeitar a fogueira: (%d,%d), estado=%s", session.HeroGridX, session.HeroGridY, session.HeroState)
	}
}
