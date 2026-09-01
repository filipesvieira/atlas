package game

import (
	"math"
	"testing"
)

func TestWorldCoordinateForIndexSquareSpiral(t *testing.T) {
	expected := []WorldCoordinate{
		{0, 0}, {1, 0}, {1, 1}, {0, 1}, {-1, 1}, {-1, 0}, {-1, -1}, {0, -1}, {1, -1},
		{2, -1}, {2, 0}, {2, 1}, {2, 2}, {1, 2}, {0, 2}, {-1, 2}, {-2, 2}, {-2, 1}, {-2, 0}, {-2, -1}, {-2, -2},
		{-1, -2}, {0, -2}, {1, -2}, {2, -2},
	}
	for index, want := range expected {
		if got := WorldCoordinateForIndex(int64(index)); got != want {
			t.Fatalf("índice %d: esperado %+v, obtido %+v", index, want, got)
		}
	}
}

func TestWorldCoordinateForIndexHasNoDuplicates(t *testing.T) {
	seen := map[WorldCoordinate]int64{}
	for index := int64(0); index < 10000; index++ {
		coord := WorldCoordinateForIndex(index)
		if previous, exists := seen[coord]; exists {
			t.Fatalf("coordenada %+v duplicada nos índices %d e %d", coord, previous, index)
		}
		seen[coord] = index
	}
}

func TestWorldDistanceIsGeometricOnly(t *testing.T) {
	got := WorldDistance(WorldCoordinate{X: 0, Y: 0}, WorldCoordinate{X: 3, Y: 4})
	if math.Abs(got-5.0) > 0.0001 {
		t.Fatalf("distância 3-4-5 esperada 5, obtido %.4f", got)
	}
}
