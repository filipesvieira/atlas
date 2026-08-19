package game

import (
	"sort"
	"sync"
	"sync/atomic"
)

var runtimeTelemetry sync.Map

// IncrementTelemetry registra contadores de processo sem colocar métricas no
// caminho crítico do PostgreSQL. Nomes podem conter rótulos estáveis no formato
// metric{label=value}; o endpoint administrativo devolve um snapshot ordenado.
func IncrementTelemetry(name string) {
	if name == "" {
		return
	}
	value, _ := runtimeTelemetry.LoadOrStore(name, &atomic.Int64{})
	value.(*atomic.Int64).Add(1)
}

func TelemetrySnapshot() map[string]int64 {
	keys := []string{}
	runtimeTelemetry.Range(func(key, _ any) bool {
		keys = append(keys, key.(string))
		return true
	})
	sort.Strings(keys)
	result := make(map[string]int64, len(keys))
	for _, key := range keys {
		if value, ok := runtimeTelemetry.Load(key); ok {
			result[key] = value.(*atomic.Int64).Load()
		}
	}
	return result
}
