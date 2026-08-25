package db

import "testing"

func TestGeneratedPioneerNamesAreStableAndCharacterSpecific(t *testing.T) {
	for _, pioneer := range pioneerSeeds {
		first := generatedPioneerName("character-a", pioneer)
		second := generatedPioneerName("character-a", pioneer)
		if first != second {
			t.Fatalf("nome do pioneiro não é determinístico: %q / %q", first, second)
		}
		if first == pioneer.Name {
			t.Fatalf("pioneiro continuou com o nome global hardcoded: %q", first)
		}
	}

	different := false
	for _, pioneer := range pioneerSeeds {
		if generatedPioneerName("character-a", pioneer) != generatedPioneerName("character-b", pioneer) {
			different = true
			break
		}
	}
	if !different {
		t.Fatal("personagens diferentes receberam o mesmo elenco completo")
	}
}

func TestGeneratedArrivalNamesAreStableAndCharacterSpecific(t *testing.T) {
	for _, arrival := range arrivalSeeds {
		first := generatedArrivalName("character-a", arrival)
		second := generatedArrivalName("character-a", arrival)
		if first != second {
			t.Fatalf("nome de chegada não é determinístico: %q / %q", first, second)
		}
		if first == arrival.Name {
			t.Fatalf("novo morador continuou com nome global hardcoded: %q", first)
		}
	}

	different := false
	for _, arrival := range arrivalSeeds {
		if generatedArrivalName("character-a", arrival) != generatedArrivalName("character-b", arrival) {
			different = true
			break
		}
	}
	if !different {
		t.Fatal("personagens diferentes receberam o mesmo conjunto completo de chegadas")
	}
}