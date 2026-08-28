-- M3F: fechamento funcional do PvP antes da Arena ranqueada.
-- Adiciona origem da partida, aplicação idempotente de rating e fila de matchmaking.

ALTER TABLE pvp_matches
    ALTER COLUMN challenge_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS match_origin VARCHAR(24) NOT NULL DEFAULT 'direct_duel',
    ADD COLUMN IF NOT EXISTS rating_applied_at TIMESTAMPTZ;

ALTER TABLE pvp_matches
    DROP CONSTRAINT IF EXISTS pvp_matches_mode_check;
ALTER TABLE pvp_matches
    ADD CONSTRAINT pvp_matches_mode_check CHECK (mode IN ('duel','arena'));

ALTER TABLE pvp_matches
    DROP CONSTRAINT IF EXISTS pvp_matches_match_origin_check;
ALTER TABLE pvp_matches
    ADD CONSTRAINT pvp_matches_match_origin_check CHECK (match_origin IN ('direct_duel','matchmaking'));

CREATE TABLE IF NOT EXISTS pvp_matchmaking_queue (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    rating_snapshot INT NOT NULL CHECK(rating_snapshot >= 0),
    combat_power_snapshot INT NOT NULL CHECK(combat_power_snapshot >= 1),
    tactical_strategy TEXT NOT NULL DEFAULT 'balanced',
    strategy_version INT NOT NULL DEFAULT 1,
    participant_snapshot JSONB NOT NULL,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK(tactical_strategy IN ('aggressive','balanced','defensive'))
);

CREATE INDEX IF NOT EXISTS idx_pvp_matchmaking_queue_rating_time
    ON pvp_matchmaking_queue(rating_snapshot, queued_at);
CREATE INDEX IF NOT EXISTS idx_pvp_matchmaking_queue_power_time
    ON pvp_matchmaking_queue(combat_power_snapshot, queued_at);

ALTER TABLE pvp_match_participants
    ADD COLUMN IF NOT EXISTS rating_before INT NOT NULL DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS rating_after INT,
    ADD COLUMN IF NOT EXISTS combat_power INT NOT NULL DEFAULT 1;
