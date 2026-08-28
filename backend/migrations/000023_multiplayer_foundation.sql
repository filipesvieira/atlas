-- Multiplayer Foundation V1: chat mundial, moderação e perfil PvP persistente.
-- A migration não altera progressão/economia existente e não transfere recursos.

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel VARCHAR(24) NOT NULL,
    sender_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    sender_name_snapshot VARCHAR(50) NOT NULL,
    sender_level_snapshot INT NOT NULL CHECK(sender_level_snapshot >= 1),
    message_text VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (channel IN ('world', 'region', 'kingdom', 'pvp')),
    CHECK (length(trim(message_text)) BETWEEN 1 AND 200)
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
    ON chat_messages(channel, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_blocks (
    blocker_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    blocked_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(blocker_character_id, blocked_character_id),
    CHECK(blocker_character_id <> blocked_character_id)
);

CREATE TABLE IF NOT EXISTS chat_mutes (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    reason VARCHAR(240) NOT NULL DEFAULT '',
    muted_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_mutes_until ON chat_mutes(muted_until);

CREATE TABLE IF NOT EXISTS chat_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    reason VARCHAR(240) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(reporter_character_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_reports_created ON chat_reports(created_at DESC);

CREATE TABLE IF NOT EXISTS pvp_profiles (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    rating INT NOT NULL DEFAULT 1000 CHECK(rating >= 0),
    wins INT NOT NULL DEFAULT 0 CHECK(wins >= 0),
    losses INT NOT NULL DEFAULT 0 CHECK(losses >= 0),
    draws INT NOT NULL DEFAULT 0 CHECK(draws >= 0),
    season INT NOT NULL DEFAULT 1 CHECK(season >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
