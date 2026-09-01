-- M4-B: hardening competitivo, surrender explícito, telemetria e identidade sazonal.

ALTER TABLE pvp_matches
    ADD COLUMN IF NOT EXISTS completion_reason VARCHAR(32) NOT NULL DEFAULT 'combat',
    ADD COLUMN IF NOT EXISTS forfeit_requested_by UUID REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forfeit_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS integrity_checked_at TIMESTAMPTZ;

ALTER TABLE pvp_matches
    DROP CONSTRAINT IF EXISTS pvp_matches_completion_reason_check;
ALTER TABLE pvp_matches
    ADD CONSTRAINT pvp_matches_completion_reason_check
    CHECK(completion_reason IN ('combat','forfeit','ready_timeout','ready_declined','server_cancelled'));

ALTER TABLE pvp_match_participants
    ADD COLUMN IF NOT EXISTS disconnect_count INT NOT NULL DEFAULT 0 CHECK(disconnect_count >= 0),
    ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disconnected_seconds INT NOT NULL DEFAULT 0 CHECK(disconnected_seconds >= 0),
    ADD COLUMN IF NOT EXISTS combat_metrics JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS pvp_integrity_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES pvp_seasons(id) ON DELETE SET NULL,
    match_id UUID NOT NULL REFERENCES pvp_matches(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    flag_type VARCHAR(48) NOT NULL,
    severity SMALLINT NOT NULL DEFAULT 1 CHECK(severity BETWEEN 1 AND 5),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    UNIQUE(match_id, flag_type, character_id)
);
CREATE INDEX IF NOT EXISTS idx_pvp_integrity_flags_open
    ON pvp_integrity_flags(created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pvp_integrity_flags_season
    ON pvp_integrity_flags(season_id, created_at DESC);

ALTER TABLE pvp_profiles
    ADD COLUMN IF NOT EXISTS equipped_title_key VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS equipped_banner_key VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS equipped_cosmetic_key VARCHAR(120) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_pvp_matches_forfeit_pending
    ON pvp_matches(forfeit_requested_at)
    WHERE status='active' AND forfeit_requested_by IS NOT NULL;
