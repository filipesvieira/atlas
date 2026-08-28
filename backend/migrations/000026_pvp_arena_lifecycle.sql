-- M3C: confirmação dos dois participantes e recuperação autoritativa da arena.
-- A migration é apenas aditiva e preserva partidas M3B já existentes.

ALTER TABLE pvp_match_participants
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

ALTER TABLE pvp_matches
    ADD COLUMN IF NOT EXISTS ready_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_tick BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS runtime_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_pulse_at TIMESTAMPTZ;

UPDATE pvp_matches
SET ready_expires_at = created_at + INTERVAL '90 seconds'
WHERE ready_expires_at IS NULL AND status = 'ready';

UPDATE pvp_matches
SET ready_expires_at = created_at
WHERE ready_expires_at IS NULL;

ALTER TABLE pvp_matches
    ALTER COLUMN ready_expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pvp_matches_active_pulse
    ON pvp_matches(status, last_pulse_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pvp_match_participants_confirmation
    ON pvp_match_participants(match_id, confirmed_at);
