-- M3A: convites diretos de duelo. Não altera economia, inventário ou combate PvE.

CREATE TABLE IF NOT EXISTS pvp_duel_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(100) NOT NULL,
    challenger_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    target_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    CHECK (challenger_character_id <> target_character_id),
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    UNIQUE (challenger_character_id, request_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pvp_duel_challenges_pending_pair
    ON pvp_duel_challenges(challenger_character_id, target_character_id)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pvp_duel_challenges_target_pending
    ON pvp_duel_challenges(target_character_id, expires_at)
    WHERE status = 'pending';
