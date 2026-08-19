-- Migration 000002: Sistema de Acampamento, Recursos e Construções
-- Tabelas para persistência segura e independente da progressão do acampamento

CREATE TABLE IF NOT EXISTS character_resources (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    resource_key VARCHAR(80) NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (character_id, resource_key)
);

CREATE TABLE IF NOT EXISTS character_camps (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    layout_version INT NOT NULL DEFAULT 1,
    state_revision BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS character_camp_buildings (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    slot_key VARCHAR(40) NOT NULL,
    building_key VARCHAR(80) NOT NULL,
    level INT NOT NULL DEFAULT 0 CHECK (level >= 0),
    upgrade_target_level INT,
    upgrade_started_at TIMESTAMPTZ,
    upgrade_ends_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (character_id, slot_key),
    UNIQUE (character_id, building_key)
);

CREATE TABLE IF NOT EXISTS character_building_blueprints (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    building_key VARCHAR(80) NOT NULL,
    unlocked_max_level INT NOT NULL DEFAULT 1,
    source_key VARCHAR(120),
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (character_id, building_key)
);
