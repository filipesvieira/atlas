-- Histórico de refeições e buffs persistentes em tempo real.
-- Cada consumo cria um intervalo; ao substituir uma refeição, a anterior é
-- encerrada no instante do novo consumo. Isso preserva a simulação offline.
CREATE TABLE IF NOT EXISTS character_active_buffs (
    id BIGSERIAL PRIMARY KEY,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    source_resource_key TEXT NOT NULL,
    effect_key TEXT NOT NULL,
    magnitude DOUBLE PRECISION NOT NULL CHECK (magnitude > 0),
    started_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    content_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (expires_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_character_active_buffs_character_category
    ON character_active_buffs(character_id, category, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_character_active_buffs_expires
    ON character_active_buffs(expires_at);

CREATE TABLE IF NOT EXISTS character_consumption_transactions (
    id BIGSERIAL PRIMARY KEY,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    resource_key TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(character_id, request_id)
);