-- Migration 000004: Venda Automática Customizável e Baú de Achados (Overflow)

CREATE TABLE IF NOT EXISTS character_auto_sell_settings (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    online_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    offline_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    trigger_percent SMALLINT NOT NULL DEFAULT 75,
    target_percent SMALLINT NOT NULL DEFAULT 60,
    sell_rarities JSONB NOT NULL DEFAULT '["Comum", "Incomum"]',
    sell_slot_types JSONB NOT NULL DEFAULT '[]',
    only_duplicates BOOLEAN NOT NULL DEFAULT TRUE,
    keep_first_discovered_copy BOOLEAN NOT NULL DEFAULT TRUE,
    keep_best_per_template SMALLINT NOT NULL DEFAULT 1,
    protected_template_keys JSONB NOT NULL DEFAULT '[]',
    revision BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK(target_percent < trigger_percent)
);

CREATE TABLE IF NOT EXISTS character_overflow_chests (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    max_slots INT NOT NULL DEFAULT 20,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
