-- M3E-A.1: atividade exclusiva do herói durante PvP e identidade visual persistida.
ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS equipped_skin_key TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS active_pvp_match_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS resume_expedition_after_pvp BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_characters_active_pvp_match
    ON characters(active_pvp_match_id)
    WHERE active_pvp_match_id <> '';
