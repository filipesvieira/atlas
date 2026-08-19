package game

// ExpeditionState representa os estados formais do ciclo de vida de uma expedição.
type ExpeditionState string

const (
	StateCampResting        ExpeditionState = "CAMP_RESTING"
	StateRecovering         ExpeditionState = "RECOVERING"
	StateExpeditionStarting ExpeditionState = "EXPEDITION_STARTING"
	StateWaveSpawning       ExpeditionState = "WAVE_SPAWNING"
	StateCombatActive       ExpeditionState = "COMBAT_ACTIVE"
	StateWaveCompleted      ExpeditionState = "WAVE_COMPLETED"
	StateBossSpawning       ExpeditionState = "BOSS_SPAWNING"
	StateExpeditionVictory  ExpeditionState = "EXPEDITION_VICTORY"
	StateDefeated           ExpeditionState = "DEFEATED"
)

// ValidStateTransitions define a matriz autoritativa de transições legais entre estados.
var validStateTransitions = map[ExpeditionState]map[ExpeditionState]bool{
	StateCampResting: {
		StateExpeditionStarting: true,
		StateCampResting:        true,
	},
	StateRecovering: {
		StateCampResting:        true,
		StateExpeditionStarting: true,
	},
	StateExpeditionStarting: {
		StateWaveSpawning: true,
		StateCampResting:  true,
	},
	StateWaveSpawning: {
		StateCombatActive: true,
		StateBossSpawning: true,
		StateCampResting:  true,
		StateDefeated:     true,
	},
	StateCombatActive: {
		StateWaveCompleted:     true,
		StateExpeditionVictory: true,
		StateDefeated:          true,
		StateCampResting:       true,
	},
	StateWaveCompleted: {
		StateWaveSpawning: true,
		StateBossSpawning: true,
		StateCampResting:  true,
	},
	StateBossSpawning: {
		StateCombatActive: true,
		StateCampResting:  true,
		StateDefeated:     true,
	},
	StateExpeditionVictory: {
		StateWaveSpawning:       true,
		StateExpeditionStarting: true,
		StateCampResting:        true,
	},
	StateDefeated: {
		StateRecovering:  true,
		StateCampResting: true,
	},
}

// CanTransition valida se a transição entre dois estados é permitida pelas regras de domínio.
func CanTransition(from, to ExpeditionState) bool {
	if allowedTargets, exists := validStateTransitions[from]; exists {
		return allowedTargets[to]
	}
	return false
}

// StateDescription retorna o texto imersivo associado a cada estado da expedição.
func (s ExpeditionState) Description() string {
	switch s {
	case StateCampResting:
		return "⛺ Descansando no acampamento."
	case StateRecovering:
		return "🩹 Recuperando energia após combate desafiador."
	case StateExpeditionStarting:
		return "⚔️ Organizando suprimentos e iniciando marcha."
	case StateWaveSpawning:
		return "🌲 Inimigos se aproximando pela vegetação."
	case StateCombatActive:
		return "⚔️ Em combate ativo contra os monstros da região."
	case StateWaveCompleted:
		return "✨ Onda de inimigos superada! Avançando no terreno."
	case StateBossSpawning:
		return "👑 Um rugido ecoa no horizonte! O Chefe da região emergiu!"
	case StateExpeditionVictory:
		return "🏆 Chefe derrotado! Expedição conquistada com glória!"
	case StateDefeated:
		return "💀 Forças exauridas em combate. Recuando para o acampamento."
	default:
		return "Explorando o mundo de Atlas."
	}
}
