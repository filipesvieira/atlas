package game

import "testing"

func TestNormalizeSettlementRarityAcceptsAPIAndGameLabels(t *testing.T) {
	cases := map[string]string{
		"epic":      "Épico",
		"Épico":     "Épico",
		"epico":     "Épico",
		"legendary": "Lendário",
		"Raro":      "Raro",
	}
	for input, expected := range cases {
		actual, ok := NormalizeSettlementRarity(input)
		if !ok || actual != expected {
			t.Fatalf("NormalizeSettlementRarity(%q) = %q,%v; esperado %q,true", input, actual, ok, expected)
		}
	}
	if _, ok := NormalizeSettlementRarity("mítica impossível"); ok {
		t.Fatal("raridade desconhecida não pode ser aceita")
	}
}

func TestRarityMeetsTargetUsesCanonicalOrder(t *testing.T) {
	if !RarityMeetsTarget("Lendário", "epic") {
		t.Fatal("lendário deveria atender meta épica")
	}
	if RarityMeetsTarget("Raro", "legendary") {
		t.Fatal("raro não deveria atender meta lendária")
	}
}

func TestSettlementPopulationTargetRequiresProsperityAndHousing(t *testing.T) {
	tests := []struct {
		name       string
		prosperity int64
		capacity   int
		want       int
	}{
		{name: "pioneiros preservados", prosperity: 0, capacity: 4, want: 7},
		{name: "primeira chegada", prosperity: 25, capacity: 12, want: 8},
		{name: "prosperidade sem moradia", prosperity: 1500, capacity: 8, want: 8},
		{name: "moradia sem prosperidade", prosperity: 24, capacity: 16, want: 7},
		{name: "etapa completa", prosperity: 1500, capacity: 16, want: 16},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := SettlementPopulationTarget(test.prosperity, test.capacity); got != test.want {
				t.Fatalf("população alvo = %d; esperado %d", got, test.want)
			}
		})
	}
}

func TestNextSettlementResidentMilestone(t *testing.T) {
	if milestone, ok := NextSettlementResidentMilestone(7); !ok || milestone != 25 {
		t.Fatalf("primeiro marco = %d, %v; esperado 25, true", milestone, ok)
	}
	if milestone, ok := NextSettlementResidentMilestone(15); !ok || milestone != 1500 {
		t.Fatalf("último marco = %d, %v; esperado 1500, true", milestone, ok)
	}
	if milestone, ok := NextSettlementResidentMilestone(16); ok || milestone != 0 {
		t.Fatalf("não deveria existir marco após a população máxima: %d, %v", milestone, ok)
	}
}

func TestGatheringProsperityGainIsBounded(t *testing.T) {
	tests := []struct {
		cycles int64
		want   int64
	}{
		{cycles: 0, want: 0},
		{cycles: 1, want: 1},
		{cycles: 40, want: 1},
		{cycles: 41, want: 2},
		{cycles: 10000, want: 10},
	}
	for _, test := range tests {
		if got := GatheringProsperityGain(test.cycles); got != test.want {
			t.Fatalf("ganho para %d ciclos = %d; esperado %d", test.cycles, got, test.want)
		}
	}
}
func TestSettlementStageTerritoryGrowthMatchesBuildBounds(t *testing.T) {
	lastArea := 0
	for _, definition := range SettlementStageDefinitions() {
		bounds := SettlementBuildBounds(definition.Key)
		if definition.TerritoryWidth != bounds.Width() || definition.TerritoryHeight != bounds.Height() {
			t.Fatalf("%s metadata=%dx%d bounds=%dx%d", definition.Key, definition.TerritoryWidth, definition.TerritoryHeight, bounds.Width(), bounds.Height())
		}
		area := bounds.Width() * bounds.Height()
		if area <= lastArea {
			t.Fatalf("território de %s não cresceu: %d <= %d", definition.Key, area, lastArea)
		}
		lastArea = area
	}
}
func TestSettlementStageProgressExposesVisibleRoadmap(t *testing.T) {
	levels := map[string]int{"campfire": 2, "adventurer_hut": 1, "warehouse": 1}
	progress := SettlementStageProgressFor(SettlementStageCamp, 75, 9, levels)
	if progress.Next == nil || progress.Next.Key != SettlementStageOutpost {
		t.Fatalf("próximo estágio inesperado: %+v", progress.Next)
	}
	if !progress.Ready || progress.CompletionPercent != 100 {
		t.Fatalf("progresso deveria estar pronto: %+v", progress)
	}
	if progress.Next.PromotionHeadline == "" || len(progress.Next.Highlights) == 0 {
		t.Fatal("roadmap visual precisa de headline e highlights")
	}
}

func TestSettlementStageProgressIsGradualBeforeRequirementCompletion(t *testing.T) {
	progress := SettlementStageProgressFor(SettlementStageCamp, 38, 5, map[string]int{"campfire": 1})
	if progress.CompletionPercent <= 0 || progress.CompletionPercent >= 100 {
		t.Fatalf("barra deve refletir progresso parcial, recebido=%d%%", progress.CompletionPercent)
	}
	if progress.CompletedRequirements != 0 {
		t.Fatalf("nenhum requisito completo era esperado, recebido=%d", progress.CompletedRequirements)
	}
}
