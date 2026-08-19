package game

import (
	"math/rand"
	"testing"
)

type deterministicRNG struct {
	r *rand.Rand
}

func (d *deterministicRNG) Intn(n int) int {
	return d.r.Intn(n)
}

func (d *deterministicRNG) Float64() float64 {
	return d.r.Float64()
}

func TestCalculateKillXP_Formulas(t *testing.T) {
	// Monstro nível 1 contra player nível 1
	xp1 := CalculateKillXP(1, 1, 50, false)
	if xp1 <= 0 {
		t.Errorf("Esperado XP > 0, obteve %d", xp1)
	}

	// Boss concede 2.5x mais XP que monstro comum de mesmo nível/HP
	xpMob := CalculateKillXP(10, 10, 200, false)
	xpBoss := CalculateKillXP(10, 10, 200, true)
	if xpBoss < int64(float64(xpMob)*2.4) {
		t.Errorf("Boss deveria conceder ~2.5x XP. Mob=%d, Boss=%d", xpMob, xpBoss)
	}

	// Underdog / Desafio: monstro de nível superior concede bônus
	xpHigher := CalculateKillXP(5, 10, 100, false)
	xpSame := CalculateKillXP(10, 10, 100, false)
	if xpHigher <= xpSame {
		t.Errorf("Underdog deveria conceder mais XP. xpHigher=%d, xpSame=%d", xpHigher, xpSame)
	}
}

func TestCalculateKillGold_Determinism(t *testing.T) {
	rng1 := &deterministicRNG{r: rand.New(rand.NewSource(12345))}
	rng2 := &deterministicRNG{r: rand.New(rand.NewSource(12345))}

	gold1 := CalculateKillGold(false, 20.0, rng1)
	gold2 := CalculateKillGold(false, 20.0, rng2)

	if gold1 != gold2 {
		t.Errorf("Cálculo de ouro deveria ser determinístico com mesma seed. gold1=%d, gold2=%d", gold1, gold2)
	}

	bossGold := CalculateKillGold(true, 0, &deterministicRNG{r: rand.New(rand.NewSource(999))})
	mobGold := CalculateKillGold(false, 0, &deterministicRNG{r: rand.New(rand.NewSource(999))})
	if bossGold <= mobGold {
		t.Errorf("Chefe deve conceder mais ouro que monstro comum. bossGold=%d, mobGold=%d", bossGold, mobGold)
	}
}

func TestApplyExperienceGain_SingleAndMultiLevelUp(t *testing.T) {
	char := &CharacterData{
		Level:         1,
		Experience:    0,
		UnspentPoints: 0,
		MaxHealth:     100,
		Health:        50,
		MaxMana:       50,
		Mana:          10,
	}

	// Nível 1 requer 250 XP
	leveled, newLvls, statPoints := ApplyExperienceGain(char, 100)
	if leveled || newLvls != 0 || statPoints != 0 || char.Level != 1 || char.Experience != 100 {
		t.Errorf("Não deveria subir de nível com 100 XP. Char: %+v", char)
	}

	// Concedendo XP suficiente para subir 2 níveis (Lv 1 -> 2 -> 3)
	// Lv 1 precisa de 250 XP; Lv 2 precisa de ~966 XP. Total: 1500 XP
	leveled, newLvls, statPoints = ApplyExperienceGain(char, 1500)
	if !leveled || newLvls < 1 || statPoints < 3 {
		t.Errorf("Esperado level up com 1600 XP acumulados. Leveled=%v, newLvls=%d, statPoints=%d, char.Level=%d",
			leveled, newLvls, statPoints, char.Level)
	}

	// Ao subir de nível, HP e Mana devem estar totalmente restaurados
	if char.Health != char.MaxHealth || char.Mana != char.MaxMana {
		t.Errorf("HP e Mana devem estar no máximo após Level-Up. HP=%d/%d, MP=%d/%d",
			char.Health, char.MaxHealth, char.Mana, char.MaxMana)
	}
}

func TestExpeditionStateMachine_Transitions(t *testing.T) {
	if !CanTransition(StateCampResting, StateExpeditionStarting) {
		t.Errorf("Deveria ser possível transicionar de CampResting para ExpeditionStarting")
	}
	if !CanTransition(StateExpeditionStarting, StateWaveSpawning) {
		t.Errorf("Deveria ser possível transicionar de ExpeditionStarting para WaveSpawning")
	}
	if !CanTransition(StateWaveSpawning, StateCombatActive) {
		t.Errorf("Deveria ser possível transicionar de WaveSpawning para CombatActive")
	}
	if !CanTransition(StateCombatActive, StateDefeated) {
		t.Errorf("Deveria ser possível transicionar de CombatActive para Defeated")
	}
	if !CanTransition(StateDefeated, StateRecovering) {
		t.Errorf("Deveria ser possível transicionar de Defeated para Recovering")
	}

	// Transição ilegal
	if CanTransition(StateDefeated, StateWaveSpawning) {
		t.Errorf("NÃO deveria ser possível transicionar diretamente de Defeated para WaveSpawning sem repouso/recuperação")
	}
}
