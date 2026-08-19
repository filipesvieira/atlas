package game

import (
	"testing"
)

func TestGlobalContentRegistry_Integrity(t *testing.T) {
	registry := NewContentRegistry()
	if registry == nil {
		t.Fatal("Esperado ContentRegistry não nulo")
	}

	violations := registry.ValidateIntegrity()
	if len(violations) > 0 {
		for _, v := range violations {
			t.Errorf("Violação de integridade de conteúdo: %s", v)
		}
		t.Fatalf("Catálogo de conteúdo falhou na auditoria com %d violações", len(violations))
	}
}

func TestItemTemplateRegistry_LookupByCanonicalKeyAndName(t *testing.T) {
	// Busca por nome de exibição
	tpl1, found1 := ItemRegistry.Get("Espada do Aprendiz")
	if !found1 {
		t.Fatal("Espada do Aprendiz deveria ser encontrada por nome")
	}

	// Busca por chave canônica
	tpl2, found2 := ItemRegistry.Get("espada do aprendiz")
	if !found2 {
		t.Fatal("Espada do Aprendiz deveria ser encontrada por chave normalizada")
	}

	if tpl1.Name != tpl2.Name {
		t.Errorf("Templates divergentes para mesma chave. tpl1=%s, tpl2=%s", tpl1.Name, tpl2.Name)
	}
}
