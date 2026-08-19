-- Compatibilidade para bancos que chegaram a executar uma versão preliminar da 000006.
ALTER TABLE characters ALTER COLUMN progression_version SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS progression_migration_issues (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    level_snapshot INT NOT NULL,
    experience_snapshot BIGINT NOT NULL,
    required_experience_snapshot BIGINT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS gathering_claim_requests (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES character_activities(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, request_id)
);

ALTER TABLE crafting_transactions ADD COLUMN IF NOT EXISTS deterministic_seed BIGINT NOT NULL DEFAULT 0;
ALTER TABLE crafting_transactions ADD COLUMN IF NOT EXISTS rarity_table_version INT NOT NULL DEFAULT 1;
ALTER TABLE crafting_transactions ADD COLUMN IF NOT EXISTS profession_level_snapshot INT NOT NULL DEFAULT 1;
ALTER TABLE crafting_transactions ADD COLUMN IF NOT EXISTS station_level_snapshot INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_resource_ledger_reason_created ON character_resource_ledger(reason, created_at DESC);
ALTER TABLE character_auto_sell_settings ADD COLUMN IF NOT EXISTS sell_crafted_items BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS character_pending_resource_rewards (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    source_kind VARCHAR(50) NOT NULL,
    source_key VARCHAR(160) NOT NULL DEFAULT '',
    resource_key VARCHAR(80) NOT NULL,
    quantity BIGINT NOT NULL CHECK(quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, source_kind, source_key, resource_key)
);

CREATE TABLE IF NOT EXISTS pending_resource_claim_requests (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, request_id)
);
