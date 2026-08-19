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

func TestCheckRegionAvailability_Rules(t *testing.T) {
	forest := ExpeditionRegions["forest"]
	shereque := ExpeditionRegions["shereque"]
	chapolin := ExpeditionRegions["chapolin"]
	orcruins := ExpeditionRegions["orcruins"]
	rogartes := ExpeditionRegions["rogartes"]
	abyss := ExpeditionRegions["abyss"]

	// 1. Tier 1 — acess\u00edvel por n\u00edvel (RequiresUnlockFrom == "" e RequiresTierComplete == false)
	avail := CheckRegionAvailability(1, []string{}, forest)
	if !avail.Available {
		t.Errorf("Floresta deveria estar dispon\u00edvel no n\u00edvel 1 sem boss derrotados, motivo: %s", avail.Reason)
	}
	avail = CheckRegionAvailability(1, []string{}, shereque)
	if !avail.Available {
		t.Errorf("Shereque deveria estar dispon\u00edvel no n\u00edvel 1, motivo: %s", avail.Reason)
	}
	avail = CheckRegionAvailability(1, []string{}, chapolin)
	if !avail.Available {
		t.Errorf("Chapolin deveria estar dispon\u00edvel no n\u00edvel 1, motivo: %s", avail.Reason)
	}

	// 2. Tier 2 (RequiresTierComplete): bloqueado sem nenhum boss do Tier 1 derrotado
	avail = CheckRegionAvailability(orcruins.MinLevel, []string{}, orcruins)
	if avail.Available {
		t.Errorf("Orcruins N\u00c3O deveria estar dispon\u00edvel sem nenhum boss do Tier 1 derrotado")
	}
	if avail.DefeatedInTier != 0 || avail.TotalInTier != 3 {
		t.Errorf("Esperado DefeatedInTier=0, TotalInTier=3; obtido %d/%d", avail.DefeatedInTier, avail.TotalInTier)
	}

	// 3. Tier 2 — bloqueado com apenas 1 de 3 chefes derrotados
	avail = CheckRegionAvailability(orcruins.MinLevel, []string{"forest"}, orcruins)
	if avail.Available {
		t.Errorf("Orcruins N\u00c3O deveria estar dispon\u00edvel com apenas 1/3 do Tier 1 derrotado")
	}
	if avail.DefeatedInTier != 1 {
		t.Errorf("Esperado DefeatedInTier=1; obtido %d", avail.DefeatedInTier)
	}

	// 4. Tier 2 — bloqueado com 2 de 3 chefes derrotados
	avail = CheckRegionAvailability(orcruins.MinLevel, []string{"forest", "shereque"}, orcruins)
	if avail.Available {
		t.Errorf("Orcruins N\u00c3O deveria estar dispon\u00edvel com 2/3 do Tier 1 derrotado")
	}
	if avail.DefeatedInTier != 2 {
		t.Errorf("Esperado DefeatedInTier=2; obtido %d", avail.DefeatedInTier)
	}

	// 5. Tier 2 — desbloqueado com TODOS os 3 chefes do Tier 1 derrotados
	allTier1Defeated := []string{"forest", "shereque", "chapolin"}
	avail = CheckRegionAvailability(orcruins.MinLevel, allTier1Defeated, orcruins)
	if !avail.Available {
		t.Errorf("Orcruins DEVERIA estar dispon\u00edvel com todos os Tier 1 derrotados. Motivo: %s", avail.Reason)
	}

	// 6. Tier 3 (Rogartes): bloqueado sem todos os chefes do Tier 2 derrotados
	avail = CheckRegionAvailability(rogartes.MinLevel, []string{"forest", "shereque", "chapolin", "orcruins"}, rogartes)
	if avail.Available {
		t.Errorf("Rogartes N\u00c3O deveria estar dispon\u00edvel sem todos os Tier 2 derrotados")
	}

	// 7. Tier 3 — desbloqueado com todos os Tier 2 derrotados
	allTier2Defeated := []string{"forest", "shereque", "chapolin", "orcruins", "esgotos", "planalto"}
	avail = CheckRegionAvailability(rogartes.MinLevel, allTier2Defeated, rogartes)
	if !avail.Available {
		t.Errorf("Rogartes DEVERIA estar dispon\u00edvel com todos os Tier 2 derrotados. Motivo: %s", avail.Reason)
	}

	// 8. Abyss (Tier 5): bloqueado para n\u00edvel baixo (mesmo com todas as regi\u00f5es anteriores)
	avail = CheckRegionAvailability(10, []string{"forest", "shereque", "chapolin", "orcruins", "esgotos", "planalto", "rogartes", "frozen"}, abyss)
	if avail.Available {
		t.Errorf("Abyss N\u00c3O deveria estar dispon\u00edvel para n\u00edvel 10 (Requer Lv %d)", abyss.MinLevel)
	}

	// 9. Data-driven: GetRegionsByTier deve retornar exatamente 3 regi\u00f5es no Tier 1
	tier1Regions := GetRegionsByTier(1)
	if len(tier1Regions) != 3 {
		t.Errorf("Tier 1 deveria ter 3 regi\u00f5es, encontrado %d", len(tier1Regions))
	}

	// 10. GetRegionsByTier deve retornar 3 regi\u00f5es no Tier 2
	tier2Regions := GetRegionsByTier(2)
	if len(tier2Regions) != 3 {
		t.Errorf("Tier 2 deveria ter 3 regi\u00f5es, encontrado %d", len(tier2Regions))
	}
}
