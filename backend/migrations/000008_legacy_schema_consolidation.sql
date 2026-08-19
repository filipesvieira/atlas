-- Consolida compatibilidade que antes era executada por dezenas de ALTERs
-- ignorados em InitDB. Toda alteração passa agora pelo runner transacional.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS origin VARCHAR(30) DEFAULT 'wanderer';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS masteries JSONB DEFAULT '{}'::jsonb;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS learned_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS unlocked_regions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE characters ALTER COLUMN unlocked_regions SET DEFAULT '[]'::jsonb;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_expedition_active BOOLEAN DEFAULT false;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_region VARCHAR(50) DEFAULT 'forest';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS str INT DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS dex INT DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS int_stat INT DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS vit INT DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS unspent_points INT DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_stance VARCHAR(20) DEFAULT 'balanced';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS current_stage INT DEFAULT 1;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_boss_stage BOOLEAN DEFAULT false;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS auto_resume_expedition BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS offline_claimed_at TIMESTAMPTZ;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS state_revision BIGINT DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS starter_pack_claimed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS starter_pack_key VARCHAR(50) DEFAULT NULL;
UPDATE characters SET offline_claimed_at=NOW() WHERE offline_claimed_at IS NULL;
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_vocation_check;

ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS report_key VARCHAR(64);
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS region_id VARCHAR(50);
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS region_name VARCHAR(120);
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS level_before INT;
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS level_after INT;
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS kills INT DEFAULT 0;
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS efficiency DOUBLE PRECISION DEFAULT 0;
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS state_revision BIGINT DEFAULT 0;
ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS report_payload JSONB DEFAULT '{}'::jsonb;
DROP INDEX IF EXISTS expedition_logs_report_key_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS expedition_logs_report_key_uidx ON expedition_logs(report_key) WHERE report_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS character_inventories_character_id_uidx ON character_inventories(character_id);
ALTER TABLE character_inventories ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;

ALTER TABLE character_auto_sell_settings ADD COLUMN IF NOT EXISTS sell_crafted_items BOOLEAN NOT NULL DEFAULT FALSE;
