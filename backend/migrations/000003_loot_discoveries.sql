-- Migration 000003: Compêndio de Exploração e Descobertas de Loot
-- Persistência permanente de itens encontrados por personagem

CREATE TABLE IF NOT EXISTS character_loot_discoveries (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    item_template_key VARCHAR(120) NOT NULL,
    first_region_key VARCHAR(80),
    first_monster_key VARCHAR(120),
    first_discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_found_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    times_found BIGINT NOT NULL DEFAULT 1,
    highest_rarity VARCHAR(24) NOT NULL DEFAULT 'Comum',
    PRIMARY KEY(character_id, item_template_key)
);

CREATE INDEX IF NOT EXISTS idx_char_loot_discoveries_char_id ON character_loot_discoveries(character_id);