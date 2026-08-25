-- Histórico monotônico da expedição e fronteira de recuperação pós-derrota.
-- Defaults preservam personagens existentes e tornam a migration compatível.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS expeditions_completed_total BIGINT NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS bosses_defeated_total BIGINT NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS expedition_deaths_total BIGINT NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS highest_stage_reached INT NOT NULL DEFAULT 1;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_expedition_death_stage INT NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS expedition_recovery_until TIMESTAMPTZ;

ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_expedition_history_nonnegative;
ALTER TABLE characters ADD CONSTRAINT characters_expedition_history_nonnegative
    CHECK (expeditions_completed_total >= 0 AND bosses_defeated_total >= 0 AND expedition_deaths_total >= 0
       AND highest_stage_reached >= 1 AND last_expedition_death_stage >= 0) NOT VALID;
