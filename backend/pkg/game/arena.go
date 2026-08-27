package game

import (
	"math"
	"strings"
	"time"
)

const lowHealthFleeRatio = 0.20
const maxMovementStepsPerTick = 3
const manualMovementTimeout = 500 * time.Millisecond
const manualMovementAccelerationDuration = 650 * time.Millisecond
const manualMovementMomentumGrace = 350 * time.Millisecond
const arenaTickSeconds = 0.75

// consumeMovementSteps transforma um multiplicador contínuo em passos inteiros
// sem perder o restante fracionário. Assim, +10% realmente produz um passo
// extra ao longo do tempo, em vez de ser arredondado para a velocidade base.
func consumeMovementSteps(accumulator *float64, multiplier float64) int {
	if multiplier <= 0 || math.IsNaN(multiplier) || math.IsInf(multiplier, 0) {
		multiplier = 1.0
	}
	if accumulator == nil {
		return 1
	}

	*accumulator += multiplier
	steps := int(math.Floor(*accumulator))
	*accumulator -= float64(steps)
	if steps > maxMovementStepsPerTick {
		steps = maxMovementStepsPerTick
	}
	return steps
}

// manualHeroMovementSpeed aplica o bônus de controle sobre a velocidade
// autoritativa do herói. O limite permanece o mesmo do cálculo de atributos,
// preservando a segurança da simulação mesmo com equipamentos futuros.
func (s *GameSession) manualHeroMovementSpeed(movementSpeed float64, now time.Time) float64 {
	if movementSpeed <= 0 || math.IsNaN(movementSpeed) || math.IsInf(movementSpeed, 0) {
		movementSpeed = BaseHeroMovementSpeedMultiplier
	}
	baseSpeed := math.Max(BaseHeroMovementSpeedMultiplier, movementSpeed)
	targetSpeed := math.Min(MaxHeroMovementSpeedMultiplier, baseSpeed*ManualHeroControlSpeedMultiplier)
	if s == nil || s.ManualMoveStartedAt.IsZero() || now.Before(s.ManualMoveStartedAt) {
		return baseSpeed
	}
	progress := math.Min(1, now.Sub(s.ManualMoveStartedAt).Seconds()/manualMovementAccelerationDuration.Seconds())
	return baseSpeed + (targetSpeed-baseSpeed)*progress
}

func updateMonsterFleeState(mob *Monster) {
	if mob == nil || mob.Health <= 0 || !mob.FleesAtLowHealth() || mob.State == "FLEE" || mob.FleeResolved {
		return
	}
	if mob.MaxHealth > 0 && mob.Health <= int(float64(mob.MaxHealth)*lowHealthFleeRatio) {
		mob.State = "FLEE"
	}
}

// 24x18 permanece como dimensão padrão e compatibilidade para regiões ainda
// não convertidas. Regiões registradas podem declarar dimensões próprias na
// definição de terreno compilada em arena_terrain.go.
const (
	GridWidth  = 24
	GridHeight = 18
	HeroGridX  = 7
	HeroGridY  = 9
)

type ArenaActor struct {
	GridX                   int     `json:"grid_x"`
	GridY                   int     `json:"grid_y"`
	State                   string  `json:"state,omitempty"`
	TargetID                string  `json:"target_id,omitempty"`
	MovementSpeedMultiplier float64 `json:"movement_speed_multiplier,omitempty"`
}

type ArenaSnapshot struct {
	Key        string     `json:"key"`
	Width      int        `json:"width"`
	Height     int        `json:"height"`
	Hero       ArenaActor `json:"hero"`
	Projectile bool       `json:"projectile_follow"`
}

func clampGridX(x int) int {
	return clampArenaCoordinate(x, GridWidth)
}

func clampGridY(y int) int {
	return clampArenaCoordinate(y, GridHeight)
}

func gridDistance(ax, ay, bx, by int) float64 {
	return math.Hypot(float64(ax-bx), float64(ay-by))
}

func stepGridToward(x, y, targetX, targetY int) (int, int) {
	return stepGridTowardWithin(x, y, targetX, targetY, GridWidth, GridHeight)
}

func stepGridTowardWithin(x, y, targetX, targetY, width, height int) (int, int) {
	if x < targetX {
		x++
	} else if x > targetX {
		x--
	}
	if y < targetY {
		y++
	} else if y > targetY {
		y--
	}
	return clampArenaCoordinate(x, width), clampArenaCoordinate(y, height)
}

func stepGridAway(x, y, threatX, threatY int) (int, int) {
	return stepGridAwayWithin(x, y, threatX, threatY, GridWidth, GridHeight)
}

func stepGridAwayWithin(x, y, threatX, threatY, width, height int) (int, int) {
	currentX, currentY := x, y
	if x < threatX {
		x--
	} else if x > threatX {
		x++
	}
	if y < threatY {
		y--
	} else if y > threatY {
		y++
	}
	directX, directY := clampArenaCoordinate(x, width), clampArenaCoordinate(y, height)
	if directX != currentX || directY != currentY {
		return directX, directY
	}

	// Nos limites, o vetor contrário pode ser totalmente bloqueado. Nesse
	// caso, procura a melhor célula vizinha disponível, preferindo a que
	// aumenta a distância e, quando isso é impossível em um canto, a que
	// mantém o herói em movimento pela borda.
	candidates := [][2]int{
		{currentX - 1, currentY}, {currentX + 1, currentY},
		{currentX, currentY - 1}, {currentX, currentY + 1},
		{currentX - 1, currentY - 1}, {currentX + 1, currentY - 1},
		{currentX - 1, currentY + 1}, {currentX + 1, currentY + 1},
	}
	currentDistance := gridDistance(currentX, currentY, threatX, threatY)
	bestDistance := -1.0
	bestX, bestY := currentX, currentY
	bestImproves := false
	for _, candidate := range candidates {
		candidateX := clampArenaCoordinate(candidate[0], width)
		candidateY := clampArenaCoordinate(candidate[1], height)
		if candidateX == currentX && candidateY == currentY {
			continue
		}
		candidateDistance := gridDistance(candidateX, candidateY, threatX, threatY)
		improves := candidateDistance > currentDistance
		if (improves && !bestImproves) ||
			(improves == bestImproves && candidateDistance > bestDistance) {
			bestX, bestY = candidateX, candidateY
			bestDistance = candidateDistance
			bestImproves = improves
		}
	}
	return bestX, bestY
}

// Os pontos de entrada usam os quatro cantos da malha antes de recorrer às
// faixas centrais. Isso dá espaço para portais e evita uma fila visual no
// mesmo lado do cenário quando a fase possui vários monstros.
func arenaSpawnPoint(index int) (int, int) {
	return arenaSpawnPointWithin(GridWidth, GridHeight, index)
}

func arenaSpawnPointWithin(width, height, index int) (int, int) {
	points := [][2]int{
		{width - 2, 1}, {2, 1},
		{width - 2, height - 2}, {2, height - 2},
		{width / 2, 1}, {width / 2, height - 2},
	}
	point := points[index%len(points)]
	return point[0], point[1]
}

func (s *GameSession) resetArenaPosition() {
	s.HeroGridX = s.clampArenaX(HeroGridX)
	s.HeroGridY = s.clampArenaY(HeroGridY)
	s.HeroState = "IDLE"
	s.HeroTargetID = ""
	s.HeroMovementAccumulator = 0
	s.clearManualMovement()
}

func manualMovementVector(direction string) (int, int, bool) {
	switch strings.ToLower(strings.TrimSpace(direction)) {
	case "up":
		return 0, -1, true
	case "down":
		return 0, 1, true
	case "left":
		return -1, 0, true
	case "right":
		return 1, 0, true
	case "up-left", "left-up":
		return -1, -1, true
	case "up-right", "right-up":
		return 1, -1, true
	case "down-left", "left-down":
		return -1, 1, true
	case "down-right", "right-down":
		return 1, 1, true
	default:
		return 0, 0, false
	}
}

// clearManualMovement zera a intenção do jogador. Ele é chamado com o lock da
// sessão já adquirido pelo ticker, por SetManualMovement ou ao encerrar a
// sessão; por isso não tenta adquirir o mutex novamente.
func (s *GameSession) clearManualMovement() {
	s.ManualMoveDirection = ""
	s.ManualMoveInputAt = time.Time{}
	s.ManualMoveLastStepAt = time.Time{}
	s.ManualMoveAccumulator = 0
	s.ManualMoveStartedAt = time.Time{}
	s.ManualMoveReleasedAt = time.Time{}
	s.ManualMoveMomentumDir = ""
}

// releaseManualMovement encerra a posse do movimento, mas conserva por uma
// janela curta a rampa da mesma direção. Assim cliques repetidos passam a
// sensação de esforço/aceleração sem manter o herói em controle manual.
func (s *GameSession) releaseManualMovement(now time.Time) {
	s.ManualMoveMomentumDir = s.ManualMoveDirection
	s.ManualMoveReleasedAt = now
	s.ManualMoveDirection = ""
	s.ManualMoveInputAt = time.Time{}
	s.ManualMoveLastStepAt = time.Time{}
	s.ManualMoveAccumulator = 0
}

// setManualMovementLocked atualiza a intenção manual e consome todos os passos
// que já venceram desde a última atualização. O chamador deve possuir s.Mu.
// Ataques, magias, curas e dano continuam sendo decididos pelo processTick.
func (s *GameSession) setManualMovementLocked(direction string, pressed bool, movementSpeed float64, now time.Time) bool {
	previousDirection := s.ManualMoveDirection
	previousX, previousY := s.HeroGridX, s.HeroGridY
	previousState := s.HeroState

	if !pressed {
		s.releaseManualMovement(now)
		return previousDirection != ""
	}
	if !s.IsExpeditionActive {
		s.clearManualMovement()
		return false
	}
	direction = strings.ToLower(strings.TrimSpace(direction))
	if _, _, valid := manualMovementVector(direction); !valid {
		return false
	}
	if movementSpeed <= 0 {
		movementSpeed = 1.0
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}

	directionChanged := previousDirection != direction
	resumeMomentum := previousDirection == "" &&
		s.ManualMoveMomentumDir == direction &&
		!s.ManualMoveReleasedAt.IsZero() &&
		now.Sub(s.ManualMoveReleasedAt) <= manualMovementMomentumGrace
	s.ManualMoveDirection = direction
	s.ManualMoveInputAt = now
	if directionChanged || s.ManualMoveLastStepAt.IsZero() {
		// Trocar a diagonal/tecla deve responder imediatamente, mas não deve
		// herdar a fração acumulada da direção anterior.
		s.ManualMoveLastStepAt = now
		s.ManualMoveAccumulator = 0
		if !resumeMomentum {
			s.ManualMoveStartedAt = now
		}
		s.ManualMoveReleasedAt = time.Time{}
		s.ManualMoveMomentumDir = ""
		s.moveHeroManualStep(direction)
	} else {
		// Heartbeats também são oportunidades de aplicar o passo vencido. Isso
		// elimina a espera pelo tick de combate de 750 ms.
		s.moveHeroManually(movementSpeed, now)
	}

	return previousX != s.HeroGridX || previousY != s.HeroGridY || previousState != s.HeroState
}

// SetManualMovement preserva a API usada pelos testes e por integrações locais.
// O handler WebSocket usa ApplyManualMovement para também devolver o snapshot
// autoritativo imediatamente ao cliente.
func (s *GameSession) SetManualMovement(direction string, pressed bool) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	s.setManualMovementLocked(direction, pressed, 1.0, time.Now().UTC())
}

// ApplyManualMovement aplica o comando sob o lock e publica somente quando o
// estado visual realmente avançou. Assim o teclado não espera o próximo tick
// de combate para refletir a posição, sem criar mensagens repetidas enquanto a
// tecla está pressionada entre dois passos.
func (s *GameSession) ApplyManualMovement(direction string, pressed bool, movementSpeed float64, requestID string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	if movementSpeed <= 0 {
		movementSpeed = s.CalculateDerivedStats().MovementSpeedMultiplier
	}
	now := time.Now().UTC()
	movementSpeed = s.manualHeroMovementSpeed(movementSpeed, now)
	changed := s.setManualMovementLocked(direction, pressed, movementSpeed, now)
	if !changed {
		return
	}
	s.SendMessageLocked(CombatMessage{
		Type:      "HERO_MOVEMENT",
		RequestID: requestID,
		Timestamp: time.Now().Format("15:04:05"),
	})
}

func (s *GameSession) manualMovementActive(now time.Time) bool {
	return s.ManualMoveDirection != "" && !s.ManualMoveInputAt.IsZero() && now.Sub(s.ManualMoveInputAt) <= manualMovementTimeout
}

func (s *GameSession) moveHeroManualStep(direction string) bool {
	dx, dy, valid := manualMovementVector(direction)
	if !valid {
		return false
	}
	nextX := s.clampArenaX(s.HeroGridX + dx)
	nextY := s.clampArenaY(s.HeroGridY + dy)
	if (nextX == s.HeroGridX && nextY == s.HeroGridY) || !s.canOccupyArenaTile(nextX, nextY, arenaHeroMover, "") {
		s.HeroState = "MANUAL_BLOCKED"
		return false
	}
	s.HeroGridX = nextX
	s.HeroGridY = nextY
	s.HeroState = "MANUAL"
	return true
}

func (s *GameSession) moveHeroManually(movementSpeed float64, now time.Time) {
	if !s.manualMovementActive(now) {
		s.clearManualMovement()
		return
	}
	if s.ManualMoveLastStepAt.IsZero() {
		s.ManualMoveLastStepAt = now
		return
	}
	elapsed := now.Sub(s.ManualMoveLastStepAt).Seconds()
	if elapsed <= 0 {
		return
	}
	if elapsed > 2*arenaTickSeconds {
		elapsed = 2 * arenaTickSeconds
	}
	s.ManualMoveLastStepAt = now
	s.ManualMoveAccumulator += (elapsed / arenaTickSeconds) * movementSpeed
	steps := int(math.Floor(s.ManualMoveAccumulator))
	s.ManualMoveAccumulator -= float64(steps)
	if steps > maxMovementStepsPerTick {
		steps = maxMovementStepsPerTick
	}
	for step := 0; step < steps; step++ {
		s.moveHeroManualStep(s.ManualMoveDirection)
	}
}

func (s *GameSession) buildArenaSnapshot() *ArenaSnapshot {
	if s == nil {
		return nil
	}
	now := time.Now().UTC()
	movementSpeed := s.CalculateDerivedStats().MovementSpeedMultiplier
	if s.manualMovementActive(now) {
		movementSpeed = s.manualHeroMovementSpeed(movementSpeed, now)
	}
	width, height := s.arenaDimensions()
	return &ArenaSnapshot{
		Key:        s.ActiveRegion,
		Width:      width,
		Height:     height,
		Hero:       ArenaActor{GridX: s.HeroGridX, GridY: s.HeroGridY, State: s.HeroState, TargetID: s.HeroTargetID, MovementSpeedMultiplier: movementSpeed},
		Projectile: true,
	}
}

func combatRangeForArchetype(archetype string) float64 {
	switch archetype {
	case "melee":
		return 1.5
	case "magic":
		return 7.0
	default:
		return 8.0
	}
}

// Ataques básicos de curta distância têm uma pequena margem de perseguição.
// A simulação é discreta (um tile por tick); sem essa margem, um monstro que
// recua no mesmo tick em que o guerreiro chega ao alcance pode atravessar a
// janela de ataque e deixar a luta visualmente travada.
func basicAttackRangeForArchetype(archetype string) float64 {
	if archetype == "melee" {
		return 2.25
	}
	return combatRangeForArchetype(archetype)
}

// O guerreiro precisa fechar contato antes de parar de perseguir. A margem de
// 2.25 usada para selecionar um ataque é deliberadamente maior que o alcance
// corporal de 1.5; usar essa margem também para interromper a perseguição
// permitia que criaturas ranged entrassem em KITE e recuassem no mesmo tick,
// mantendo uma distância impossível de vencer para o herói.
func movementStopRangeForArchetype(archetype string) float64 {
	if archetype == "melee" {
		return combatRangeForArchetype("melee")
	}
	return combatRangeForArchetype(archetype)
}

func (s *GameSession) nearestLivingMonster() *Monster {
	// Se o alvo anterior entrou em fuga ou ficou com pouca vida, ele mantém
	// prioridade até morrer. Assim o herói pode trocar temporariamente para um
	// boss próximo sem abandonar uma criatura que precisa ser finalizada.
	for idx := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[idx]
		if mob.Health <= 0 || mob.ID != s.HeroTargetID {
			continue
		}
		if mob.State == "FLEE" || mob.Health <= int(float64(mob.MaxHealth)*0.20) {
			return mob
		}
	}

	var nearest *Monster
	nearestDistance := math.MaxFloat64
	for idx := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[idx]
		if mob.Health <= 0 {
			continue
		}
		distance := gridDistance(s.HeroGridX, s.HeroGridY, mob.GridX, mob.GridY)
		if distance < nearestDistance {
			nearest = mob
			nearestDistance = distance
		}
	}
	return nearest
}

// nearestLivingMonsterInRange separa o alvo de perseguição do alvo que pode
// receber um ataque neste tick. Um monstro ferido pode continuar sendo a
// prioridade de perseguição, mas não deve impedir o herói de atacar outro
// inimigo que esteja ao alcance imediato.
func (s *GameSession) nearestLivingMonsterInRange(archetype string) *Monster {
	maxRange := basicAttackRangeForArchetype(archetype)
	var nearest *Monster
	nearestDistance := math.MaxFloat64
	for idx := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[idx]
		if mob.Health <= 0 {
			continue
		}
		distance := gridDistance(s.HeroGridX, s.HeroGridY, mob.GridX, mob.GridY)
		if distance > maxRange {
			continue
		}
		if mob.ID == s.HeroTargetID {
			return mob
		}
		if distance < nearestDistance {
			nearest = mob
			nearestDistance = distance
		}
	}
	return nearest
}

func (s *GameSession) moveHero(archetype string) {
	s.moveHeroWithSpeed(archetype, 1.0)
}

func (s *GameSession) moveHeroWithSpeed(archetype string, movementSpeed float64) {
	steps := consumeMovementSteps(&s.HeroMovementAccumulator, movementSpeed)
	for step := 0; step < steps; step++ {
		s.moveHeroOneStep(archetype)
		if s.HeroState == "IDLE" || s.HeroState == "ATTACK" {
			break
		}
	}
}

func (s *GameSession) moveHeroOneStep(archetype string) {
	target := s.nearestLivingMonster()
	if target == nil {
		s.HeroState = "IDLE"
		s.HeroTargetID = ""
		return
	}

	s.HeroTargetID = target.ID
	distance := gridDistance(s.HeroGridX, s.HeroGridY, target.GridX, target.GridY)
	attackRange := basicAttackRangeForArchetype(archetype)
	if archetype == "melee" {
		if distance > movementStopRangeForArchetype(archetype) {
			s.HeroGridX, s.HeroGridY = s.stepArenaToward(s.HeroGridX, s.HeroGridY, target.GridX, target.GridY, "")
			s.HeroState = "CHASE"
		} else {
			s.HeroState = "ATTACK"
		}
		return
	}

	// Um alvo em fuga é uma exceção deliberada à postura de kite: arqueiros e
	// magos precisam avançar para finalizar a criatura, senão ela pode sair do
	// alcance e permanecer viva no limite da arena indefinidamente.
	if target.State == "FLEE" || target.Health <= int(float64(target.MaxHealth)*0.20) {
		if distance > attackRange {
			s.HeroGridX, s.HeroGridY = s.stepArenaToward(s.HeroGridX, s.HeroGridY, target.GridX, target.GridY, "")
			s.HeroState = "CHASE"
		} else {
			s.HeroState = "ATTACK"
		}
		return
	}

	// Arqueiros e magos mantêm uma zona segura apenas quando existe uma ameaça
	// melee próxima. Um inimigo ranged fora do alcance do herói não pode criar
	// uma zona morta: nesse caso o herói avança até poder atacá-lo.
	var nearestMeleeThreat *Monster
	nearestMeleeThreatDistance := math.MaxFloat64
	for idx := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[idx]
		if mob.Health <= 0 || mob.AttackType != AttackTypeMelee {
			continue
		}
		threatDistance := gridDistance(s.HeroGridX, s.HeroGridY, mob.GridX, mob.GridY)
		if threatDistance < nearestMeleeThreatDistance {
			nearestMeleeThreat = mob
			nearestMeleeThreatDistance = threatDistance
		}
	}

	if nearestMeleeThreatDistance < 4.0 {
		s.HeroGridX, s.HeroGridY = s.stepArenaAway(s.HeroGridX, s.HeroGridY, nearestMeleeThreat.GridX, nearestMeleeThreat.GridY, "")
		s.HeroState = "KITE"
	} else if distance > attackRange {
		// Sem ameaça melee próxima, aproximar-se é obrigatório. Antes, o código
		// marcava ATTACK mesmo fora do alcance e podia deixar o herói morrer
		// contra monstros ranged que atacavam de até 8 tiles.
		s.HeroGridX, s.HeroGridY = s.stepArenaToward(s.HeroGridX, s.HeroGridY, target.GridX, target.GridY, "")
		s.HeroState = "CHASE"
	} else {
		s.HeroState = "ATTACK"
	}
}

func (s *GameSession) moveMonsters() {
	for idx := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[idx]
		if mob.Health <= 0 {
			continue
		}

		updateMonsterFleeState(mob)
		movementSpeed := mob.MovementSpeedMultiplier
		if movementSpeed <= 0 {
			movementSpeed = 1.0
			mob.MovementSpeedMultiplier = movementSpeed
		}
		steps := consumeMovementSteps(&mob.MovementAccumulator, movementSpeed*GetStatusSpeedModifier(mob.StatusEffects))
		for step := 0; step < steps; step++ {
			if mob.Health <= 0 {
				break
			}
			updateMonsterFleeState(mob)
			s.moveMonsterOneStep(mob)
			if mob.State == "ATTACK" {
				break
			}
		}
	}

	// A malha é compartilhada por vários atores. Resolva tiles idênticos após
	// o movimento para que a horda mantenha leitura visual e não seja desenhada
	// como um único sprite empilhado sobre o outro.
	s.separateMonsters()
}

func (s *GameSession) moveMonsterOneStep(mob *Monster) {
	distance := gridDistance(mob.GridX, mob.GridY, s.HeroGridX, s.HeroGridY)
	switch mob.State {
	case "FLEE":
		// A proximidade não encerra a fuga: um lobo/aranha ferido precisa
		// conseguir abrir espaço mesmo quando o golpe crítico aconteceu
		// corpo a corpo. A fuga só termina quando a malha não oferece uma
		// célula que aumente a distância do herói.
		nextX, nextY := s.stepArenaAway(mob.GridX, mob.GridY, s.HeroGridX, s.HeroGridY, mob.ID)
		nextDistance := gridDistance(nextX, nextY, s.HeroGridX, s.HeroGridY)
		// Se o limite da arena bloqueou o recuo, a fuga terminou. O monstro
		// volta a perseguir/kitar em vez de ficar congelado em FLEE.
		if nextX == mob.GridX && nextY == mob.GridY || nextDistance <= distance {
			mob.FleeResolved = true
			if mob.AttackType == AttackTypeRanged {
				mob.State = "KITE"
			} else {
				mob.State = "CHASE"
			}
		} else {
			mob.GridX, mob.GridY = nextX, nextY
		}
	case "CHASE":
		if mob.AttackType == AttackTypeRanged {
			if distance < 4.0 {
				mob.GridX, mob.GridY = s.stepArenaAway(mob.GridX, mob.GridY, s.HeroGridX, s.HeroGridY, mob.ID)
				mob.State = "KITE"
			} else if distance > 7.0 {
				mob.GridX, mob.GridY = s.stepArenaToward(mob.GridX, mob.GridY, s.HeroGridX, s.HeroGridY, mob.ID)
			} else {
				mob.State = "KITE"
			}
		} else if distance > combatRangeForArchetype("melee") {
			mob.GridX, mob.GridY = s.stepArenaToward(mob.GridX, mob.GridY, s.HeroGridX, s.HeroGridY, mob.ID)
		} else {
			mob.State = "ATTACK"
		}
	case "KITE":
		if mob.AttackType == AttackTypeRanged && distance < 4.0 {
			mob.GridX, mob.GridY = s.stepArenaAway(mob.GridX, mob.GridY, s.HeroGridX, s.HeroGridY, mob.ID)
		} else if distance > 8.0 {
			mob.GridX, mob.GridY = s.stepArenaToward(mob.GridX, mob.GridY, s.HeroGridX, s.HeroGridY, mob.ID)
		} else if mob.AttackType == AttackTypeMelee {
			if distance > combatRangeForArchetype("melee") {
				mob.State = "CHASE"
			} else {
				mob.State = "ATTACK"
			}
		}
	case "ATTACK":
		if (mob.AttackType == AttackTypeMelee && distance > combatRangeForArchetype("melee")) ||
			(mob.AttackType == AttackTypeRanged && distance > 8.0) {
			mob.State = "CHASE"
		}
	}
}

func (s *GameSession) separateMonsters() {
	occupied := make(map[[2]int]struct{}, len(s.CurrentMonsters))
	for idx := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[idx]
		if mob.Health <= 0 {
			continue
		}

		key := [2]int{mob.GridX, mob.GridY}
		if _, exists := occupied[key]; !exists {
			occupied[key] = struct{}{}
			continue
		}

		// Primeiro tenta as casas adjacentes; a ordem estável evita jitter entre
		// ticks e mantém os monstros próximos do herói para o combate.
		candidates := [][2]int{
			{mob.GridX - 1, mob.GridY}, {mob.GridX + 1, mob.GridY},
			{mob.GridX, mob.GridY - 1}, {mob.GridX, mob.GridY + 1},
			{mob.GridX - 1, mob.GridY - 1}, {mob.GridX + 1, mob.GridY - 1},
			{mob.GridX - 1, mob.GridY + 1}, {mob.GridX + 1, mob.GridY + 1},
		}
		placed := false
		for _, candidate := range candidates {
			candidate[0] = s.clampArenaX(candidate[0])
			candidate[1] = s.clampArenaY(candidate[1])
			if _, exists := occupied[candidate]; exists {
				continue
			}
			if !s.canOccupyArenaTile(candidate[0], candidate[1], arenaMonsterMover, mob.ID) {
				continue
			}
			mob.GridX, mob.GridY = candidate[0], candidate[1]
			occupied[candidate] = struct{}{}
			placed = true
			break
		}
		if !placed {
			// Não há uma casa livre imediata; preservar a posição é mais seguro
			// que teleportar ou alterar o alvo autoritativo.
			occupied[key] = struct{}{}
		}
	}
}