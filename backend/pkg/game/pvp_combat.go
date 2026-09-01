package game

import (
	"fmt"
	"math"
	"sort"
	"sync"
	"time"
)

// PvPCombatTickInterval é deliberadamente menor que o tick PvE. A arena
// continua automática nesta etapa, mas o ritmo deixa espaço para movimento e
// comandos táticos futuros sem reutilizar o ticker da expedição.
const PvPCombatTickInterval = 250 * time.Millisecond

const (
	duelArenaWidth             = GridWidth
	duelArenaHeight            = GridHeight
	pvpDefenseMitigationFactor = 0.35
	pvpCriticalMultiplier      = 1.35
)

// PvPCombatActor é o estado mínimo que os dois jogadores podem observar na
// arena. Equipamento, buffs, atributos brutos e recursos permanecem no
// snapshot interno persistido e não integram este contrato de rede.
type PvPCombatActor struct {
	CharacterID string       `json:"character_id"`
	Name        string       `json:"name"`
	Level       int          `json:"level"`
	Team        CombatTeam   `json:"team"`
	Health      int          `json:"health"`
	MaxHealth   int          `json:"max_health"`
	Mana        int          `json:"mana"`
	MaxMana     int          `json:"max_mana"`
	GridX       int          `json:"grid_x"`
	GridY       int          `json:"grid_y"`
	State       string       `json:"state"`
	TargetID    string       `json:"target_id,omitempty"`
	Archetype   string       `json:"archetype"`
	SkinKey     string       `json:"skin_key"`
	Derived     DerivedStats `json:"-"`

	attackCooldown float64
}

// PvPCombatEvent é um delta efêmero da arena. Ele não participa da sequência
// econômica da expedição nem concede XP, item, ouro ou maestria.
type PvPCombatEvent struct {
	Tick          uint64 `json:"tick"`
	Kind          string `json:"kind"`
	SourceID      string `json:"source_id,omitempty"`
	TargetID      string `json:"target_id,omitempty"`
	SkillKey      string `json:"skill_key,omitempty"`
	Amount        int    `json:"amount,omitempty"`
	IsCritical    bool   `json:"is_critical,omitempty"`
	IsHealing     bool   `json:"is_healing,omitempty"`
	StatusKey     string `json:"status_key,omitempty"`
	DurationTicks uint64 `json:"duration_ticks,omitempty"`
	WinnerID      string `json:"winner_id,omitempty"`
}

// PvPCombatSnapshot é o payload seguro que poderá alimentar o renderer
// isométrico. A sequência é própria da arena e não usa state_revision do PvE.
type PvPCombatMetrics struct {
	CharacterID         string         `json:"character_id"`
	DamageDealt         int            `json:"damage_dealt"`
	DamageTaken         int            `json:"damage_taken"`
	HealingDone         int            `json:"healing_done"`
	BasicDamage         int            `json:"basic_damage"`
	SkillDamage         int            `json:"skill_damage"`
	SkillDamageByKey    map[string]int `json:"skill_damage_by_key,omitempty"`
	SkillHealingByKey   map[string]int `json:"skill_healing_by_key,omitempty"`
	BasicAttacks        int            `json:"basic_attacks"`
	SkillsUsed          int            `json:"skills_used"`
	CriticalHits        int            `json:"critical_hits"`
	MovementTicks       int            `json:"movement_ticks"`
	MovementSteps       int            `json:"movement_steps"`
	MovementDistance    float64        `json:"movement_distance"`
	ChaseTicks          int            `json:"chase_ticks"`
	ChaseSteps          int            `json:"chase_steps"`
	KiteTicks           int            `json:"kite_ticks"`
	KiteSteps           int            `json:"kite_steps"`
	FirstContactTick    uint64         `json:"first_contact_tick,omitempty"`
	DamageBeforeContact int            `json:"damage_before_contact"`
	FinalHealth         int            `json:"final_health"`
	FinalMana           int            `json:"final_mana"`
}

type PvPCombatSnapshot struct {
	MatchID   string           `json:"match_id"`
	ArenaKey  string           `json:"arena_key"`
	Status    PvPMatchStatus   `json:"status"`
	Tick      uint64           `json:"tick"`
	StartedAt time.Time        `json:"started_at"`
	EndedAt   *time.Time       `json:"ended_at,omitempty"`
	WinnerID  string           `json:"winner_id,omitempty"`
	Actors    []PvPCombatActor `json:"actors"`
	Events    []PvPCombatEvent `json:"events,omitempty"`
}

// PvPCombatRuntimeState é persistido somente pelo backend para retomar uma
// arena após troca de liderança. RandomState preserva a sequência de rolagens
// determinísticas; ele nunca integra o payload enviado ao cliente.
type PvPCombatRuntimeState struct {
	Snapshot             PvPCombatSnapshot     `json:"snapshot"`
	RandomState          uint64                `json:"random_state"`
	AttackCooldowns      [2]float64            `json:"attack_cooldowns"`
	SkillCooldowns       [2]map[string]float64 `json:"skill_cooldowns,omitempty"`
	SkillRotation        [2]int                `json:"skill_rotation,omitempty"`
	MovementAccumulators [2]float64            `json:"movement_accumulators,omitempty"`
	SlowUntilTick        [2]uint64             `json:"slow_until_tick,omitempty"`
	SlowMultipliers      [2]float64            `json:"slow_multipliers,omitempty"`
	Metrics              [2]PvPCombatMetrics   `json:"metrics,omitempty"`
}

// PvPCombatInstance é completamente independente de GameSession. O servidor
// mantém uma cópia derivada do snapshot aceito no banco e nunca toca no estado
// de expedição, inventário, economia, poções automáticas ou progressão.
type PvPCombatInstance struct {
	mu                   sync.Mutex
	matchID              string
	arenaKey             string
	status               PvPMatchStatus
	startedAt            time.Time
	endedAt              *time.Time
	winnerID             string
	tick                 uint64
	actors               [2]PvPCombatActor
	randomState          uint64
	rulesVersion         int
	skillLoadouts        [2][]string
	skillCooldowns       [2]map[string]float64
	skillRotation        [2]int
	strategies           [2]PvPTacticalStrategy
	movementAccumulators [2]float64
	movedThisTick        [2]bool
	movementDistanceTick [2]float64
	slowUntilTick        [2]uint64
	slowMultipliers      [2]float64
	metrics              [2]PvPCombatMetrics
	forfeitRequestedBy   string
}

// NewPvPCombatInstance materializa a arena a partir do snapshot imutável que
// foi persistido na M3B. Não aceita uma partida sem exatamente dois times.
func NewPvPCombatInstance(match PvPMatch) (*PvPCombatInstance, error) {
	if match.ID == "" || match.ArenaKey == "" {
		return nil, fmt.Errorf("partida PvP inválida")
	}
	if match.Mode != CombatModeDuel || (match.Status != PvPMatchReady && match.Status != PvPMatchActive) {
		return nil, fmt.Errorf("partida PvP não está pronta para arena")
	}
	if len(match.Participants) != 2 {
		return nil, fmt.Errorf("duelo requer exatamente dois participantes")
	}

	participants := append([]PvPParticipantSnapshot(nil), match.Participants...)
	sort.Slice(participants, func(left, right int) bool { return participants[left].Team < participants[right].Team })
	if participants[0].Team != CombatTeamA || participants[1].Team != CombatTeamB ||
		participants[0].CharacterID == "" || participants[1].CharacterID == "" ||
		participants[0].CharacterID == participants[1].CharacterID {
		return nil, fmt.Errorf("times do duelo inválidos")
	}

	startedAt := match.CreatedAt.UTC()
	if match.StartedAt != nil {
		startedAt = match.StartedAt.UTC()
	}
	if startedAt.IsZero() {
		startedAt = time.Now().UTC()
	}
	seed := match.Seed
	if seed == 0 {
		seed = 1
	}
	instance := &PvPCombatInstance{
		matchID: match.ID, arenaKey: match.ArenaKey, status: PvPMatchActive, startedAt: startedAt,
		randomState: uint64(seed), rulesVersion: match.RulesVersion,
	}
	instance.actors[0] = newPvPCombatActor(participants[0], 4, duelArenaHeight/2)
	instance.actors[1] = newPvPCombatActor(participants[1], duelArenaWidth-5, duelArenaHeight/2)
	instance.actors[0].TargetID = instance.actors[1].CharacterID
	instance.actors[1].TargetID = instance.actors[0].CharacterID
	instance.metrics[0] = newPvPCombatMetrics(instance.actors[0].CharacterID)
	instance.metrics[1] = newPvPCombatMetrics(instance.actors[1].CharacterID)
	instance.slowMultipliers = [2]float64{1, 1}
	for index, participant := range participants {
		instance.skillLoadouts[index] = pvpSkillLoadout(participant.ActiveSkills, instance.actors[index].Archetype, match.RulesVersion)
		instance.skillCooldowns[index] = normalizePvPSkillCooldowns(nil, instance.skillLoadouts[index])
		instance.strategies[index] = NormalizePvPTacticalStrategy(string(participant.TacticalStrategy))
	}
	return instance, nil
}

// RestorePvPCombatInstance recupera uma arena ativa a partir do último pulso
// persistido. O estado só é aceito se ainda representar exatamente os dois
// participantes do snapshot original da partida.
func RestorePvPCombatInstance(match PvPMatch, runtime PvPCombatRuntimeState) (*PvPCombatInstance, error) {
	if runtime.Snapshot.MatchID == "" {
		return NewPvPCombatInstance(match)
	}
	if runtime.Snapshot.MatchID != match.ID || runtime.Snapshot.Status != PvPMatchActive || len(runtime.Snapshot.Actors) != 2 {
		return nil, fmt.Errorf("estado persistido da arena PvP inválido")
	}
	instance, err := NewPvPCombatInstance(match)
	if err != nil {
		return nil, err
	}
	derivedByCharacter := make(map[string]DerivedStats, len(match.Participants))
	for _, participant := range match.Participants {
		derivedByCharacter[participant.CharacterID] = participant.DerivedStats
	}
	for index, actor := range runtime.Snapshot.Actors {
		if actor.CharacterID == "" || actor.Team != instance.actors[index].Team || derivedByCharacter[actor.CharacterID].PrimaryArchetype == "" {
			return nil, fmt.Errorf("combatente persistido da arena PvP inválido")
		}
		actor.Derived = derivedByCharacter[actor.CharacterID]
		actor.attackCooldown = runtime.AttackCooldowns[index]
		instance.actors[index] = actor
		instance.movementAccumulators[index] = math.Max(0, math.Min(0.999999, runtime.MovementAccumulators[index]))
		instance.slowUntilTick[index] = runtime.SlowUntilTick[index]
		instance.slowMultipliers[index] = runtime.SlowMultipliers[index]
		if instance.slowMultipliers[index] <= 0 || instance.slowMultipliers[index] > 1 {
			instance.slowMultipliers[index] = 1
		}
		instance.skillCooldowns[index] = normalizePvPSkillCooldowns(runtime.SkillCooldowns[index], instance.skillLoadouts[index])
		if len(instance.skillLoadouts[index]) > 0 && runtime.SkillRotation[index] >= 0 {
			instance.skillRotation[index] = runtime.SkillRotation[index] % len(instance.skillLoadouts[index])
		}
	}
	if instance.actors[0].CharacterID == instance.actors[1].CharacterID {
		return nil, fmt.Errorf("estado persistido repete combatente")
	}
	instance.metrics = runtime.Metrics
	for index := range instance.metrics {
		if instance.metrics[index].CharacterID == "" {
			instance.metrics[index].CharacterID = instance.actors[index].CharacterID
		}
		ensurePvPCombatMetricMaps(&instance.metrics[index])
	}
	instance.tick = runtime.Snapshot.Tick
	instance.startedAt = runtime.Snapshot.StartedAt.UTC()
	instance.status = PvPMatchActive
	instance.randomState = runtime.RandomState
	if instance.randomState == 0 {
		instance.randomState = uint64(match.Seed)
		if instance.randomState == 0 {
			instance.randomState = 1
		}
	}
	return instance, nil
}

func newPvPCombatActor(participant PvPParticipantSnapshot, x, y int) PvPCombatActor {
	maxHealth := max(1, participant.MaxHealth)
	maxMana := max(0, participant.MaxMana)
	health := participant.Health
	if health <= 0 || health > maxHealth {
		health = maxHealth
	}
	mana := participant.Mana
	if mana < 0 || mana > maxMana {
		mana = maxMana
	}
	archetype := participant.DerivedStats.PrimaryArchetype
	if archetype != "magic" && archetype != "distance" {
		archetype = "melee"
	}
	return PvPCombatActor{
		CharacterID: participant.CharacterID, Name: participant.Name, Level: participant.Level, Team: participant.Team,
		Health: health, MaxHealth: maxHealth, Mana: mana, MaxMana: maxMana,
		GridX: clampArenaCoordinate(x, duelArenaWidth), GridY: clampArenaCoordinate(y, duelArenaHeight),
		State: "CHASE", Archetype: archetype, SkinKey: NormalizeHeroSkinKey(participant.SkinKey), Derived: participant.DerivedStats,
	}
}

// Tick avança exatamente uma vez o estado da arena. As duas intenções de
// ataque são calculadas antes de aplicar dano, permitindo empates legítimos em
// golpes simultâneos e evitando que a ordem do slice favoreça um dos times.
func (instance *PvPCombatInstance) Tick(now time.Time) PvPCombatSnapshot {
	if instance == nil {
		return PvPCombatSnapshot{Status: PvPMatchCancelled}
	}
	instance.mu.Lock()
	defer instance.mu.Unlock()
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if instance.status != PvPMatchActive {
		return instance.snapshotLocked(nil)
	}

	instance.tick++
	instance.movedThisTick = [2]bool{}
	instance.movementDistanceTick = [2]float64{}
	instance.moveLocked()
	instance.captureMovementMetricsLocked()
	instance.tickSkillCooldownsLocked()
	instance.tickAttackCooldownsLocked()
	events := instance.skillLocked()
	events = append(events, instance.attackLocked()...)
	instance.finishIfNeededLocked(now, &events)
	return instance.snapshotLocked(events)
}

func (instance *PvPCombatInstance) moveLocked() {
	if instance.rulesVersion < PvPTacticalCombatRulesVersion {
		instance.legacyMoveLocked()
		return
	}

	original := instance.actors
	type moveIntent struct {
		x, y  int
		state string
		moved bool
	}
	intents := [2]moveIntent{}
	for index := range original {
		actor := original[index]
		target := original[1-index]
		intents[index] = moveIntent{x: actor.GridX, y: actor.GridY, state: actor.State}
		if actor.Health <= 0 || target.Health <= 0 {
			continue
		}

		distance := gridDistance(actor.GridX, actor.GridY, target.GridX, target.GridY)
		strategy := instance.strategies[index]
		band := pvpTacticalBandFor(actor.Archetype, strategy)
		retreating := actor.Archetype != "melee" && distance < band.MinRange
		chasing := distance > band.MaxRange
		if actor.Archetype == "melee" {
			chasing = distance > combatRangeForArchetype("melee")
			retreating = false
		}

		if !retreating && !chasing {
			intents[index].state = "ATTACK"
			continue
		}

		chasingRanged := actor.Archetype == "melee" && target.Archetype != "melee"
		speed := pvpMovementSpeedFor(actor, strategy, retreating, chasingRanged)
		if instance.rulesVersion >= PvPBalanceCombatRulesVersion && instance.tick <= instance.slowUntilTick[index] {
			slow := instance.slowMultipliers[index]
			if slow > 0 && slow < 1 {
				speed *= slow
			}
		}
		// MovementSpeedMultiplier foi calibrado para o tick PvE de 750 ms.
		// Escalamos para os pulsos de 250 ms da arena sem criar três passos por
		// pulso nem ignorar bônus de botas.
		instance.movementAccumulators[index] += speed * (PvPCombatTickInterval.Seconds() / arenaTickSeconds)
		if instance.movementAccumulators[index] < 1 {
			if retreating {
				intents[index].state = "KITE"
			} else {
				intents[index].state = "CHASE"
			}
			continue
		}
		instance.movementAccumulators[index] -= 1

		if retreating {
			// O contorno começa antes da borda. O sentido vem do participante,
			// ficando determinístico para restore/replay e evitando o padrão de
			// dois atores presos nos mesmos cantos da arena.
			intents[index].x, intents[index].y = stepGridAwayWithOrbitWithin(actor.GridX, actor.GridY, target.GridX, target.GridY, duelArenaWidth, duelArenaHeight, pvpOrbitClockwise(actor.CharacterID))
			intents[index].state = "KITE"
		} else {
			intents[index].x, intents[index].y = stepGridTowardWithin(actor.GridX, actor.GridY, target.GridX, target.GridY, duelArenaWidth, duelArenaHeight)
			intents[index].state = "CHASE"
		}
		intents[index].moved = intents[index].x != actor.GridX || intents[index].y != actor.GridY
	}

	// Resolve movimentos simultâneos. Não existe ordem fixa que favoreça time A:
	// quando ambos disputam a mesma célula, a prioridade alterna pelo tick.
	old0 := [2]int{original[0].GridX, original[0].GridY}
	old1 := [2]int{original[1].GridX, original[1].GridY}
	dest0 := [2]int{intents[0].x, intents[0].y}
	dest1 := [2]int{intents[1].x, intents[1].y}
	if dest0 == dest1 {
		switch dest0 {
		case old0, old1:
			intents[0].x, intents[0].y = old0[0], old0[1]
			intents[1].x, intents[1].y = old1[0], old1[1]
		default:
			if instance.tick%2 == 0 {
				intents[1].x, intents[1].y = old1[0], old1[1]
			} else {
				intents[0].x, intents[0].y = old0[0], old0[1]
			}
		}
	}
	dest0 = [2]int{intents[0].x, intents[0].y}
	dest1 = [2]int{intents[1].x, intents[1].y}
	if dest0 == old1 && dest1 == old0 { // troca direta de células
		intents[0].x, intents[0].y = old0[0], old0[1]
		intents[1].x, intents[1].y = old1[0], old1[1]
	} else {
		if dest0 == old1 && dest1 == old1 {
			intents[0].x, intents[0].y = old0[0], old0[1]
		}
		if dest1 == old0 && dest0 == old0 {
			intents[1].x, intents[1].y = old1[0], old1[1]
		}
	}

	for index := range instance.actors {
		old := [2]int{instance.actors[index].GridX, instance.actors[index].GridY}
		instance.actors[index].GridX = clampArenaCoordinate(intents[index].x, duelArenaWidth)
		instance.actors[index].GridY = clampArenaCoordinate(intents[index].y, duelArenaHeight)
		instance.actors[index].State = intents[index].state
		instance.movedThisTick[index] = old != [2]int{instance.actors[index].GridX, instance.actors[index].GridY}
		if instance.movedThisTick[index] {
			instance.movementDistanceTick[index] = gridDistance(old[0], old[1], instance.actors[index].GridX, instance.actors[index].GridY)
		}
	}
}

func pvpOrbitClockwise(characterID string) bool {
	var hash uint32 = 2166136261
	for _, value := range characterID {
		hash ^= uint32(value)
		hash *= 16777619
	}
	return hash&1 == 0
}

func (instance *PvPCombatInstance) legacyMoveLocked() {
	first, second := &instance.actors[0], &instance.actors[1]
	for _, pair := range [][2]*PvPCombatActor{{first, second}, {second, first}} {
		actor, target := pair[0], pair[1]
		if actor.Health <= 0 || target.Health <= 0 {
			continue
		}
		if gridDistance(actor.GridX, actor.GridY, target.GridX, target.GridY) <= combatRangeForArchetype(actor.Archetype) {
			actor.State = "ATTACK"
			continue
		}
		nextX, nextY := stepGridTowardWithin(actor.GridX, actor.GridY, target.GridX, target.GridY, duelArenaWidth, duelArenaHeight)
		if nextX != target.GridX || nextY != target.GridY {
			actor.GridX, actor.GridY = nextX, nextY
		}
		actor.State = "CHASE"
	}
}

type pvpAttackIntent struct {
	sourceIndex int
	targetIndex int
	damage      int
	isCritical  bool
}

func (instance *PvPCombatInstance) captureMovementMetricsLocked() {
	if gridDistance(instance.actors[0].GridX, instance.actors[0].GridY, instance.actors[1].GridX, instance.actors[1].GridY) <= combatRangeForArchetype("melee") {
		for index := range instance.metrics {
			if instance.metrics[index].FirstContactTick == 0 {
				instance.metrics[index].FirstContactTick = instance.tick
			}
		}
	}
	for index, actor := range instance.actors {
		if actor.Health <= 0 {
			continue
		}
		if instance.movedThisTick[index] {
			instance.metrics[index].MovementTicks++
			instance.metrics[index].MovementSteps++
			instance.metrics[index].MovementDistance += instance.movementDistanceTick[index]
		}
		switch actor.State {
		case "CHASE":
			instance.metrics[index].ChaseTicks++
			if instance.movedThisTick[index] {
				instance.metrics[index].ChaseSteps++
			}
		case "KITE":
			instance.metrics[index].KiteTicks++
			if instance.movedThisTick[index] {
				instance.metrics[index].KiteSteps++
			}
		}
	}
}

func (instance *PvPCombatInstance) recordDamageLocked(sourceIndex, targetIndex, amount int, critical bool) {
	if amount <= 0 {
		return
	}
	instance.metrics[sourceIndex].DamageDealt += amount
	instance.metrics[targetIndex].DamageTaken += amount
	if critical {
		instance.metrics[sourceIndex].CriticalHits++
	}
	if instance.metrics[sourceIndex].FirstContactTick == 0 {
		instance.metrics[sourceIndex].DamageBeforeContact += amount
	}
}

func newPvPCombatMetrics(characterID string) PvPCombatMetrics {
	metric := PvPCombatMetrics{CharacterID: characterID}
	ensurePvPCombatMetricMaps(&metric)
	return metric
}

func ensurePvPCombatMetricMaps(metric *PvPCombatMetrics) {
	if metric == nil {
		return
	}
	if metric.SkillDamageByKey == nil {
		metric.SkillDamageByKey = map[string]int{}
	}
	if metric.SkillHealingByKey == nil {
		metric.SkillHealingByKey = map[string]int{}
	}
}

func (instance *PvPCombatInstance) metricsSnapshotLocked() [2]PvPCombatMetrics {
	out := instance.metrics
	for index := range out {
		out[index].FinalHealth = instance.actors[index].Health
		out[index].FinalMana = instance.actors[index].Mana
	}
	return out
}

func (instance *PvPCombatInstance) applyPvPKnockbackLocked(sourceIndex, targetIndex, tiles int) {
	if tiles <= 0 || sourceIndex < 0 || sourceIndex >= len(instance.actors) || targetIndex < 0 || targetIndex >= len(instance.actors) {
		return
	}
	source := instance.actors[sourceIndex]
	target := &instance.actors[targetIndex]
	for step := 0; step < tiles; step++ {
		nx, ny := stepGridAwayWithOrbitWithin(target.GridX, target.GridY, source.GridX, source.GridY, duelArenaWidth, duelArenaHeight, pvpOrbitClockwise(target.CharacterID))
		if nx == target.GridX && ny == target.GridY {
			break
		}
		if nx == source.GridX && ny == source.GridY {
			break
		}
		target.GridX, target.GridY = nx, ny
	}
}

// RequestForfeit marca o combatente como derrotado, mas deixa a finalização
// ocorrer no próximo Tick autoritativo. Assim persistência, rating e publicação
// continuam passando pelo mesmo pipeline usado por uma derrota normal.
func (instance *PvPCombatInstance) RequestForfeit(characterID string) bool {
	if instance == nil || characterID == "" {
		return false
	}
	instance.mu.Lock()
	defer instance.mu.Unlock()
	if instance.status != PvPMatchActive || instance.forfeitRequestedBy != "" {
		return false
	}
	for index := range instance.actors {
		if instance.actors[index].CharacterID == characterID && instance.actors[index].Health > 0 {
			instance.forfeitRequestedBy = characterID
			instance.actors[index].Health = 0
			return true
		}
	}
	return false
}

type pvpSkillIntent struct {
	sourceIndex int
	targetIndex int
	rule        pvpSkillRule
	damage      int
	healing     int
	isCritical  bool
}

func (instance *PvPCombatInstance) tickSkillCooldownsLocked() {
	for index := range instance.skillCooldowns {
		for key, cooldown := range instance.skillCooldowns[index] {
			instance.skillCooldowns[index][key] = math.Max(0, cooldown-PvPCombatTickInterval.Seconds())
		}
	}
}

// skillLocked resolve apenas regras próprias de PvP sobre a seleção de skills
// congelada no aceite. O cliente não escolhe alvo, dano ou o momento do cast.
func (instance *PvPCombatInstance) skillLocked() []PvPCombatEvent {
	if instance.rulesVersion < PvPSkillRotationRulesVersion {
		return nil
	}
	intents := make([]pvpSkillIntent, 0, 2)
	for sourceIndex := range instance.actors {
		targetIndex := 1 - sourceIndex
		source, target := &instance.actors[sourceIndex], &instance.actors[targetIndex]
		if source.Health <= 0 || target.Health <= 0 {
			continue
		}
		rule, found := instance.nextReadyPvPSkillLocked(sourceIndex, *source, *target)
		if !found {
			continue
		}
		source.Mana = max(0, source.Mana-rule.ManaCost)
		instance.skillCooldowns[sourceIndex][rule.Key] = rule.CooldownSeconds
		source.attackCooldown = math.Max(source.attackCooldown, pvpAttackCooldown(source.Derived.AttackSpeedSeconds))
		if rule.HealingPercent > 0 {
			healing := max(1, int(math.Round(float64(source.MaxHealth)*rule.HealingPercent)))
			intents = append(intents, pvpSkillIntent{sourceIndex: sourceIndex, targetIndex: sourceIndex, rule: rule, healing: healing})
			continue
		}
		damage, critical := instance.pvpDamageWithMultiplierLocked(*source, *target, rule.DamageMultiplier, rule.GuaranteedCritical, rule.BonusCriticalChance)
		intents = append(intents, pvpSkillIntent{sourceIndex: sourceIndex, targetIndex: targetIndex, rule: rule, damage: damage, isCritical: critical})
	}

	events := make([]PvPCombatEvent, 0, len(intents))
	for _, intent := range intents {
		source := &instance.actors[intent.sourceIndex]
		target := &instance.actors[intent.targetIndex]
		instance.metrics[intent.sourceIndex].SkillsUsed++
		if intent.healing > 0 {
			before := target.Health
			target.Health = min(target.MaxHealth, target.Health+intent.healing)
			actual := max(0, target.Health-before)
			instance.metrics[intent.sourceIndex].HealingDone += actual
			ensurePvPCombatMetricMaps(&instance.metrics[intent.sourceIndex])
			instance.metrics[intent.sourceIndex].SkillHealingByKey[intent.rule.Key] += actual
			events = append(events, PvPCombatEvent{Tick: instance.tick, Kind: "skill", SourceID: source.CharacterID, TargetID: target.CharacterID, SkillKey: intent.rule.Key, Amount: actual, IsHealing: true})
			continue
		}
		actualDamage := min(target.Health, intent.damage)
		target.Health = max(0, target.Health-intent.damage)
		instance.recordDamageLocked(intent.sourceIndex, intent.targetIndex, actualDamage, intent.isCritical)
		instance.metrics[intent.sourceIndex].SkillDamage += actualDamage
		ensurePvPCombatMetricMaps(&instance.metrics[intent.sourceIndex])
		instance.metrics[intent.sourceIndex].SkillDamageByKey[intent.rule.Key] += actualDamage
		event := PvPCombatEvent{Tick: instance.tick, Kind: "skill", SourceID: source.CharacterID, TargetID: target.CharacterID, SkillKey: intent.rule.Key, Amount: actualDamage, IsCritical: intent.isCritical}
		if instance.rulesVersion >= PvPBalanceCombatRulesVersion && target.Health > 0 {
			if intent.rule.SlowMultiplier > 0 && intent.rule.SlowMultiplier < 1 && intent.rule.SlowDurationSeconds > 0 {
				slowMultiplier := intent.rule.SlowMultiplier
				slowDuration := intent.rule.SlowDurationSeconds
				// Slow é a ferramenta do mago para criar espaço contra melee. Contra
				// outro ranged ele é curto para não virar lockdown de longa distância.
				if target.Archetype != "melee" {
					slowMultiplier = math.Max(slowMultiplier, 0.92)
					slowDuration = math.Min(slowDuration, 1.00)
				}
				durationTicks := uint64(math.Ceil(slowDuration / PvPCombatTickInterval.Seconds()))
				instance.slowUntilTick[intent.targetIndex] = max(instance.slowUntilTick[intent.targetIndex], instance.tick+durationTicks)
				instance.slowMultipliers[intent.targetIndex] = slowMultiplier
				event.StatusKey = "slow"
				event.DurationTicks = durationTicks
			}
			if intent.rule.KnockbackTiles > 0 {
				instance.applyPvPKnockbackLocked(intent.sourceIndex, intent.targetIndex, intent.rule.KnockbackTiles)
				event.StatusKey = "knockback"
			}
		}
		events = append(events, event)
	}
	return events
}

func (instance *PvPCombatInstance) nextReadyPvPSkillLocked(sourceIndex int, source, target PvPCombatActor) (pvpSkillRule, bool) {
	loadout := instance.skillLoadouts[sourceIndex]
	if len(loadout) == 0 {
		return pvpSkillRule{}, false
	}
	strategy := instance.strategies[sourceIndex]

	// Balanced mantém a rotação histórica. Defensive procura cura primeiro;
	// Aggressive procura dano primeiro. A escolha continua limitada às skills
	// seladas antes da partida.
	passes := []int{0}
	if strategy == PvPStrategyDefensive || strategy == PvPStrategyAggressive {
		passes = []int{0, 1}
	}
	for _, pass := range passes {
		for offset := 0; offset < len(loadout); offset++ {
			index := (instance.skillRotation[sourceIndex] + offset) % len(loadout)
			key := loadout[index]
			rule := pvpSkillRules[key]
			isHealing := rule.HealingPercent > 0
			if strategy == PvPStrategyDefensive && ((pass == 0 && !isHealing) || (pass == 1 && isHealing)) {
				continue
			}
			if strategy == PvPStrategyAggressive && ((pass == 0 && isHealing) || (pass == 1 && !isHealing)) {
				continue
			}
			if instance.skillCooldowns[sourceIndex][key] > 0 || source.Mana < rule.ManaCost {
				continue
			}
			if isHealing {
				threshold := rule.HealAtOrBelow
				if instance.rulesVersion >= PvPTacticalCombatRulesVersion {
					threshold = pvpHealThreshold(rule, strategy)
				}
				if source.MaxHealth <= 0 || float64(source.Health)/float64(source.MaxHealth) > threshold {
					continue
				}
			} else {
				// Arqueiro/mago precisam parar para mirar/castar depois de um passo de
				// reposicionamento. Melee pode entrar em alcance e golpear no mesmo pulso.
				if instance.rulesVersion >= PvPTacticalCombatRulesVersion && instance.movedThisTick[sourceIndex] && source.Archetype != "melee" && !rule.CanCastWhileMoving {
					continue
				}
				if gridDistance(source.GridX, source.GridY, target.GridX, target.GridY) > combatRangeForArchetype(source.Archetype) {
					continue
				}
			}
			instance.skillRotation[sourceIndex] = (index + 1) % len(loadout)
			return rule, true
		}
	}
	return pvpSkillRule{}, false
}

func (instance *PvPCombatInstance) tickAttackCooldownsLocked() {
	for index := range instance.actors {
		instance.actors[index].attackCooldown = math.Max(0, instance.actors[index].attackCooldown-PvPCombatTickInterval.Seconds())
	}
}

func (instance *PvPCombatInstance) attackLocked() []PvPCombatEvent {
	intents := make([]pvpAttackIntent, 0, 2)
	for sourceIndex := range instance.actors {
		targetIndex := 1 - sourceIndex
		source, target := &instance.actors[sourceIndex], &instance.actors[targetIndex]
		if source.Health <= 0 || target.Health <= 0 {
			continue
		}
		if source.attackCooldown > 0 || gridDistance(source.GridX, source.GridY, target.GridX, target.GridY) > combatRangeForArchetype(source.Archetype) {
			continue
		}
		source.attackCooldown = pvpAttackCooldown(source.Derived.AttackSpeedSeconds)
		multiplier := 1.0
		if instance.rulesVersion >= PvPTacticalCombatRulesVersion && instance.movedThisTick[sourceIndex] && source.Archetype != "melee" {
			// Tiros em backpedal continuam possíveis, mas perdem eficiência. Skills
			// ofensivas ainda exigem uma janela parada para cast/mira.
			multiplier = 0.84
			if source.Archetype == "distance" {
				multiplier = 0.82
			}
		}
		damage, critical := instance.pvpDamageWithMultiplierLocked(*source, *target, multiplier, false, 0)
		intents = append(intents, pvpAttackIntent{sourceIndex: sourceIndex, targetIndex: targetIndex, damage: damage, isCritical: critical})
	}

	events := make([]PvPCombatEvent, 0, len(intents))
	for _, intent := range intents {
		source, target := &instance.actors[intent.sourceIndex], &instance.actors[intent.targetIndex]
		actualDamage := min(target.Health, intent.damage)
		target.Health = max(0, target.Health-intent.damage)
		instance.metrics[intent.sourceIndex].BasicAttacks++
		instance.metrics[intent.sourceIndex].BasicDamage += actualDamage
		instance.recordDamageLocked(intent.sourceIndex, intent.targetIndex, actualDamage, intent.isCritical)
		events = append(events, PvPCombatEvent{
			Tick: instance.tick, Kind: "basic_attack", SourceID: source.CharacterID, TargetID: target.CharacterID,
			Amount: actualDamage, IsCritical: intent.isCritical,
		})
	}
	return events
}

func pvpAttackCooldown(seconds float64) float64 {
	if seconds <= 0 || math.IsNaN(seconds) || math.IsInf(seconds, 0) {
		return 2
	}
	return math.Max(0.5, math.Min(4, seconds))
}

func (instance *PvPCombatInstance) pvpDamageLocked(source, target PvPCombatActor) (int, bool) {
	return instance.pvpDamageWithMultiplierLocked(source, target, 1, false, 0)
}

func pvpDefenseDamageMultiplier(defense int) float64 {
	// Mitigação percentual evita o antigo "ataque - defesa*0,35", que fazia
	// builds legítimas caírem para 1 de dano quando VIT/armadura eram altas.
	// A curva preserva valor de defesa sem anular completamente armas leves.
	value := math.Max(0, float64(defense))
	return math.Max(0.34, 100.0/(100.0+value*1.35))
}

func pvpArchetypeDamageMultiplier(archetype string) float64 {
	switch archetype {
	case "distance":
		// Arco+munição já somam duas fontes de ataque antes do scaling de DEX.
		// Este coeficiente é somente PvP e não altera loot, crafting ou PvE.
		return 0.95
	case "magic":
		return 1.01
	default:
		return 1
	}
}

func pvpMatchupDamageMultiplier(source, target PvPCombatActor) float64 {
	if source.Archetype == "magic" && target.Archetype == "distance" {
		return 1.02
	}
	if source.Archetype == "distance" && target.Archetype == "magic" {
		return 0.993
	}
	if source.Archetype == "magic" && target.Archetype == "melee" {
		return 1.02
	}
	if source.Archetype == "melee" && target.Archetype == "magic" {
		return 1.00
	}
	return 1
}

func (instance *PvPCombatInstance) pvpDamageWithMultiplierLocked(source, target PvPCombatActor, multiplier float64, guaranteedCritical bool, bonusCriticalChance float64) (int, bool) {
	if multiplier <= 0 || math.IsNaN(multiplier) || math.IsInf(multiplier, 0) {
		multiplier = 1
	}
	attack := max(1, source.Derived.TotalAttack)
	defense := max(0, target.Derived.TotalDefense)
	if instance.rulesVersion >= PvPTacticalCombatRulesVersion {
		multiplier *= pvpClosePressureMultiplier(source, target)
	}
	if instance.rulesVersion >= PvPBalanceCombatRulesVersion {
		multiplier *= pvpArchetypeDamageMultiplier(source.Archetype)
		multiplier *= pvpMatchupDamageMultiplier(source, target)
	}
	base := float64(attack) * multiplier * (0.90 + instance.nextRandomLocked()*0.20)
	damage := 0
	if instance.rulesVersion >= PvPBalanceCombatRulesVersion {
		damage = max(1, int(math.Round(base*pvpDefenseDamageMultiplier(defense))))
	} else {
		damage = max(1, int(math.Round(base))-int(math.Round(float64(defense)*pvpDefenseMitigationFactor)))
	}
	critChance := math.Max(0, math.Min(1, source.Derived.CritChance/100+bonusCriticalChance))
	critical := guaranteedCritical || instance.nextRandomLocked() < critChance
	if critical {
		damage = max(1, int(math.Round(float64(damage)*pvpCriticalMultiplier)))
	}
	return damage, critical
}

func (instance *PvPCombatInstance) nextRandomLocked() float64 {
	// xorshift64* produz uma sequência reproduzível, rápida e suficiente para
	// variação visual/combate. A seed e o estado são persistidos pelo servidor.
	state := instance.randomState
	if state == 0 {
		state = 1
	}
	state ^= state >> 12
	state ^= state << 25
	state ^= state >> 27
	instance.randomState = state
	return float64((state*2685821657736338717)>>11) * (1.0 / (1 << 53))
}

func (instance *PvPCombatInstance) finishIfNeededLocked(now time.Time, events *[]PvPCombatEvent) {
	firstAlive := instance.actors[0].Health > 0
	secondAlive := instance.actors[1].Health > 0
	if firstAlive && secondAlive {
		return
	}
	instance.status = PvPMatchCompleted
	endedAt := now.UTC()
	instance.endedAt = &endedAt
	if !firstAlive {
		instance.actors[0].State = "DEAD"
	}
	if !secondAlive {
		instance.actors[1].State = "DEAD"
	}
	if firstAlive {
		instance.winnerID = instance.actors[0].CharacterID
	} else if secondAlive {
		instance.winnerID = instance.actors[1].CharacterID
	}
	*events = append(*events, PvPCombatEvent{Tick: instance.tick, Kind: "match_finished", WinnerID: instance.winnerID})
}

// Snapshot devolve cópias, permitindo que a camada de transporte serialize o
// resultado fora do lock sem expor estado mutável interno.
func (instance *PvPCombatInstance) Snapshot() PvPCombatSnapshot {
	if instance == nil {
		return PvPCombatSnapshot{Status: PvPMatchCancelled}
	}
	instance.mu.Lock()
	defer instance.mu.Unlock()
	return instance.snapshotLocked(nil)
}

// RuntimeState é usado exclusivamente pela persistência PvP. Events são
// efêmeros e não precisam ser repetidos após uma recuperação da arena.
func (instance *PvPCombatInstance) RuntimeState() PvPCombatRuntimeState {
	if instance == nil {
		return PvPCombatRuntimeState{}
	}
	instance.mu.Lock()
	defer instance.mu.Unlock()
	snapshot := instance.snapshotLocked(nil)
	return PvPCombatRuntimeState{
		Snapshot: snapshot, RandomState: instance.randomState,
		AttackCooldowns: [2]float64{instance.actors[0].attackCooldown, instance.actors[1].attackCooldown},
		SkillCooldowns: [2]map[string]float64{
			normalizePvPSkillCooldowns(instance.skillCooldowns[0], instance.skillLoadouts[0]),
			normalizePvPSkillCooldowns(instance.skillCooldowns[1], instance.skillLoadouts[1]),
		},
		SkillRotation:        instance.skillRotation,
		MovementAccumulators: instance.movementAccumulators,
		SlowUntilTick:        instance.slowUntilTick,
		SlowMultipliers:      instance.slowMultipliers,
		Metrics:              instance.metricsSnapshotLocked(),
	}
}

func (instance *PvPCombatInstance) snapshotLocked(events []PvPCombatEvent) PvPCombatSnapshot {
	actors := []PvPCombatActor{instance.actors[0], instance.actors[1]}
	for index := range actors {
		actors[index].Derived = DerivedStats{}
		actors[index].attackCooldown = 0
	}
	return PvPCombatSnapshot{
		MatchID: instance.matchID, ArenaKey: instance.arenaKey, Status: instance.status, Tick: instance.tick,
		StartedAt: instance.startedAt, EndedAt: instance.endedAt, WinnerID: instance.winnerID,
		Actors: actors, Events: append([]PvPCombatEvent(nil), events...),
	}
}
