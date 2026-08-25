package db

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/atlas/backend/pkg/game"
)

// ClassifyLegacyProgression promove apenas snapshots inequivocamente compatíveis
// com a curva atual. Um snapshot com XP suficiente para subir de nível pode ser
// resíduo de uma regra antiga; ele é registrado e bloqueado, nunca corrigido por
// palpite. Assim nenhum deploy reduz nível/XP ou concede níveis inesperados.
func ClassifyLegacyProgression(database *sql.DB) error {
	rows, err := database.Query(`SELECT id::text,level,experience,progression_version FROM characters ORDER BY id`)
	if err != nil {
		return fmt.Errorf("listar progressões legadas: %w", err)
	}
	type candidate struct {
		id         string
		level      int
		experience int64
		version    int
	}
	candidates := []candidate{}
	for rows.Next() {
		var item candidate
		if err := rows.Scan(&item.id, &item.level, &item.experience, &item.version); err != nil {
			rows.Close()
			return err
		}
		candidates = append(candidates, item)
	}
	if err := rows.Close(); err != nil {
		return err
	}

	for _, item := range candidates {
		required := game.GetRequiredXPForLevel(item.level)
		if item.level >= 1 && item.experience >= 0 && (item.level >= game.MaxCharacterLevel || item.experience < required) {
			if item.version >= 1 {
				continue
			}
			if _, err := database.Exec(`UPDATE characters SET progression_version=1,lifetime_experience=GREATEST(lifetime_experience,experience),highest_level_ever=GREATEST(highest_level_ever,level) WHERE id=$1 AND progression_version=0`, item.id); err != nil {
				return fmt.Errorf("classificar progressão segura %s: %w", item.id, err)
			}
			continue
		}
		if _, err := database.Exec(`
			INSERT INTO progression_migration_issues(character_id,level_snapshot,experience_snapshot,required_experience_snapshot,reason)
			VALUES($1,$2,$3,$4,'xp_ambiguous_for_current_level')
			ON CONFLICT(character_id) DO UPDATE SET level_snapshot=EXCLUDED.level_snapshot,experience_snapshot=EXCLUDED.experience_snapshot,required_experience_snapshot=EXCLUDED.required_experience_snapshot,reason=EXCLUDED.reason,detected_at=NOW(),resolved_at=NULL`, item.id, item.level, item.experience, required); err != nil {
			return fmt.Errorf("registrar progressão ambígua %s: %w", item.id, err)
		}
		if _, err := database.Exec(`UPDATE characters SET progression_version=0 WHERE id=$1`, item.id); err != nil {
			return fmt.Errorf("bloquear progressão ambígua %s: %w", item.id, err)
		}
		game.IncrementTelemetry("xp_migration_ambiguous_total")
		log.Printf("[PROGRESSION_MIGRATION] personagem %s bloqueado para revisão: level=%d xp=%d required=%d", item.id, item.level, item.experience, required)
	}
	return nil
}