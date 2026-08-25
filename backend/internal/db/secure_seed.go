package db

import (
	cryptorand "crypto/rand"
	"encoding/binary"
	"fmt"
)

// secureServerSeed impede que request_id ou qualquer outro campo controlado
// pelo cliente seja usado para prever/selecionar resultados econômicos.
func secureServerSeed() (int64, error) {
	var bytes [8]byte
	if _, err := cryptorand.Read(bytes[:]); err != nil {
		return 0, fmt.Errorf("gerar seed econômica: %w", err)
	}
	seed := int64(binary.LittleEndian.Uint64(bytes[:]) & uint64(^uint64(0)>>1))
	if seed == 0 {
		seed = 1
	}
	return seed, nil
}