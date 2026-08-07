package game

import (
	"math/rand"
	"testing"
)

func TestExpeditionMonsterLevelBounds(t *testing.T) {
	for regionID, reg := range ExpeditionRegions {
		// Teste 1: Todos os monstros declarados devem respeitar MinLevel <= Level <= MaxLevel
		for _, m := range reg.Monsters {
			if m.Level < reg.MinLevel || m.Level > reg.MaxLevel {
				t.Errorf("Região %s: monstro %s tem nível %d fora dos limites [%d, %d]",
					regionID, m.Name, m.Level, reg.MinLevel, reg.MaxLevel)
			}
			if m.Key == "" || m.VisualKey == "" {
				t.Errorf("Região %s: monstro %s não possui Key ou VisualKey definidos", regionID, m.Name)
			}
		}

		// Teste 2: Boss deve respeitar MinLevel <= Level <= MaxLevel
		if reg.Boss.Level < reg.MinLevel || reg.Boss.Level > reg.MaxLevel {
			t.Errorf("Região %s: boss %s tem nível %d fora dos limites [%d, %d]",
				regionID, reg.Boss.Name, reg.Boss.Level, reg.MinLevel, reg.MaxLevel)
		}
		if reg.Boss.Key == "" || reg.Boss.VisualKey == "" || !reg.Boss.IsBoss {
			t.Errorf("Região %s: boss %s deve ter Key, VisualKey e IsBoss=true", regionID, reg.Boss.Name)
		}
	}
}

func TestGetRandomMonsterForRegionRegressionCases(t *testing.T) {
	r := rand.New(rand.NewSource(42))

	// Caso de regressão 1: Esgotos Tartaruga (Lv 5-12) nunca pode gerar monstro acima do Lv. 12
	for i := 0; i < 100; i++ {
		m := GetRandomMonsterForRegion("esgotos", r)
		if m.Level < 5 || m.Level > 12 {
			t.Errorf("Regressão falhou: monstro em Esgotos gerou nível %d (esperado entre 5 e 12)", m.Level)
		}
	}

	// Caso de regressão 2: Floresta dos Aprendizes (Lv 1-5) nunca pode gerar monstro acima do Lv. 5
	for i := 0; i < 100; i++ {
		m := GetRandomMonsterForRegion("forest", r)
		if m.Level < 1 || m.Level > 5 {
			t.Errorf("Regressão falhou: monstro na Floresta gerou nível %d (esperado entre 1 e 5)", m.Level)
		}
	}
}

func TestBuildOfflineWaveRespectsFixedLevels(t *testing.T) {
	rng := rand.New(rand.NewSource(123))
	reg := ExpeditionRegions["esgotos"]

	wave := buildOfflineWave(reg, 3, false, 31, rng)
	for _, m := range wave {
		if m.Level < reg.MinLevel || m.Level > reg.MaxLevel {
			t.Errorf("buildOfflineWave para Esgotos gerou monstro com nível %d fora da faixa [%d, %d]",
				m.Level, reg.MinLevel, reg.MaxLevel)
		}
	}
}
