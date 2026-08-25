-- Fundação do assentamento vivo. O personagem permanece proprietário e herói;
-- moradores assumem trabalhos e artesanato sem alterar progressão, inventário
-- ou construções existentes.
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    stage_key VARCHAR(40) NOT NULL DEFAULT 'camp',
    reputation BIGINT NOT NULL DEFAULT 0 CHECK(reputation >= 0),
    prosperity BIGINT NOT NULL DEFAULT 0 CHECK(prosperity >= 0),
    revision BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlement_residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    resident_key VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    icon VARCHAR(16) NOT NULL DEFAULT '🧑',
    title VARCHAR(120) NOT NULL DEFAULT 'Pioneiro',
    traits JSONB NOT NULL DEFAULT '[]'::jsonb,
    happiness INT NOT NULL DEFAULT 70 CHECK(happiness BETWEEN 0 AND 100),
    state VARCHAR(30) NOT NULL DEFAULT 'idle',
    arrived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(settlement_id, resident_key)
);

CREATE TABLE IF NOT EXISTS settlement_resident_skills (
    resident_id UUID NOT NULL REFERENCES settlement_residents(id) ON DELETE CASCADE,
    skill_key VARCHAR(60) NOT NULL,
    skill_kind VARCHAR(30) NOT NULL DEFAULT 'profession',
    level INT NOT NULL DEFAULT 1 CHECK(level >= 1),
    experience BIGINT NOT NULL DEFAULT 0 CHECK(experience >= 0),
    lifetime_experience BIGINT NOT NULL DEFAULT 0 CHECK(lifetime_experience >= 0),
    revision BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(resident_id, skill_key)
);

ALTER TABLE character_activities
    ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES settlement_residents(id) ON DELETE SET NULL;
ALTER TABLE character_activities
    ADD COLUMN IF NOT EXISTS resident_name_snapshot VARCHAR(120) NOT NULL DEFAULT '';

DROP INDEX IF EXISTS idx_character_one_active_activity;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resident_one_active_work_order
    ON character_activities(resident_id)
    WHERE resident_id IS NOT NULL
      AND state IN ('running', 'claimable');
CREATE UNIQUE INDEX IF NOT EXISTS idx_character_one_active_legacy_activity
    ON character_activities(character_id)
    WHERE resident_id IS NULL
      AND state IN ('running', 'claimable');

CREATE TABLE IF NOT EXISTS hero_desires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    recipe_key VARCHAR(160) NOT NULL,
    recipe_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    target_rarity VARCHAR(30) NOT NULL,
    catalyst_key VARCHAR(80) NOT NULL DEFAULT '',
    priority INT NOT NULL DEFAULT 50 CHECK(priority BETWEEN 1 AND 100),
    max_attempts INT NOT NULL DEFAULT 5 CHECK(max_attempts BETWEEN 1 AND 20),
    attempts_completed INT NOT NULL DEFAULT 0 CHECK(attempts_completed >= 0),
    state VARCHAR(30) NOT NULL DEFAULT 'queued',
    blocked_reason TEXT NOT NULL DEFAULT '',
    assigned_resident_id UUID REFERENCES settlement_residents(id) ON DELETE SET NULL,
    current_order_started_at TIMESTAMPTZ,
    current_order_ready_at TIMESTAMPTZ,
    reserved_gold BIGINT NOT NULL DEFAULT 0 CHECK(reserved_gold >= 0),
    result_item_id VARCHAR(160) NOT NULL DEFAULT '',
    revision BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS hero_desires_request_uidx
    ON hero_desires(settlement_id, request_id);
CREATE UNIQUE INDEX IF NOT EXISTS hero_desire_one_active_recipe
    ON hero_desires(settlement_id, recipe_key)
    WHERE state IN ('queued', 'blocked', 'crafting');
CREATE INDEX IF NOT EXISTS hero_desires_scheduler_idx
    ON hero_desires(settlement_id, state, priority DESC, created_at);

CREATE TABLE IF NOT EXISTS hero_desire_resource_reservations (
    desire_id UUID NOT NULL REFERENCES hero_desires(id) ON DELETE CASCADE,
    resource_key VARCHAR(80) NOT NULL,
    quantity BIGINT NOT NULL CHECK(quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(desire_id, resource_key)
);

CREATE TABLE IF NOT EXISTS settlement_armory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    item JSONB NOT NULL,
    source_kind VARCHAR(40) NOT NULL DEFAULT 'hero_desire',
    reference_key VARCHAR(160) NOT NULL DEFAULT '',
    stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS settlement_armory_item_uidx
    ON settlement_armory(settlement_id, ((item->>'id')))
    WHERE COALESCE(item->>'id', '') <> '' AND claimed_at IS NULL;

-- Todo save existente recebe um assentamento e três pioneiros. Os níveis já
-- conquistados são copiados para as habilidades individuais e permanecem
-- também em character_professions como conhecimento coletivo.
INSERT INTO settlements(character_id, name)
SELECT id, CONCAT('Refúgio de ', name)
FROM characters
ON CONFLICT(character_id) DO NOTHING;

INSERT INTO settlement_residents(settlement_id, resident_key, name, icon, title, traits)
SELECT s.id, pioneer.resident_key, pioneer.name, pioneer.icon, pioneer.title, pioneer.traits::jsonb
FROM settlements s
CROSS JOIN (VALUES
    ('tonho_three_axes', 'Tonho Três-Machados', '🪓', 'Extrator Pioneiro', '["Braço pesado", "Conhece minério pelo barulho"]'),
    ('jurema_net_pull', 'Jurema Puxa-Rede', '🎣', 'Provedora Pioneira', '["Olho para cardumes", "Rastreadora paciente"]'),
    ('cida_suspicious_tea', 'Dona Cida do Chá Suspeito', '🌿', 'Cultivadora Pioneira', '["Mão boa para plantio", "Ervas nunca são só ervas"]')
) AS pioneer(resident_key, name, icon, title, traits)
ON CONFLICT(settlement_id, resident_key) DO NOTHING;

INSERT INTO settlement_resident_skills(resident_id, skill_key, level, experience, lifetime_experience)
SELECT r.id, p.profession_key, p.level, p.experience, p.lifetime_experience
FROM settlement_residents r
JOIN settlements s ON s.id = r.settlement_id
JOIN character_professions p ON p.character_id = s.character_id
WHERE (r.resident_key = 'tonho_three_axes' AND p.profession_key IN ('lumberjack', 'miner'))
   OR (r.resident_key = 'jurema_net_pull' AND p.profession_key IN ('fisher', 'tracker'))
   OR (r.resident_key = 'cida_suspicious_tea' AND p.profession_key IN ('farmer', 'herbalist'))
ON CONFLICT(resident_id, skill_key) DO NOTHING;

-- Ordens legadas em andamento passam para um pioneiro compatível quando
-- possível. Caso não exista skill ainda, permanecem legadas e reivindicáveis.
WITH assignments AS (
    SELECT DISTINCT ON (activity.id)
        activity.id AS activity_id,
        resident.id AS resident_id,
        resident.name AS resident_name
    FROM character_activities activity
    JOIN settlements settlement ON settlement.character_id = activity.character_id
    JOIN settlement_residents resident ON resident.settlement_id = settlement.id
    JOIN settlement_resident_skills skill
      ON skill.resident_id = resident.id
     AND skill.skill_key = activity.profession_key
    WHERE activity.resident_id IS NULL
      AND activity.state IN ('running', 'claimable', 'pending_storage')
    ORDER BY activity.id, skill.level DESC, resident.arrived_at
)
UPDATE character_activities activity
SET resident_id = assignments.resident_id,
    resident_name_snapshot = assignments.resident_name
FROM assignments
WHERE activity.id = assignments.activity_id;

UPDATE settlement_residents resident
SET state = 'collecting', updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM character_activities activity
    WHERE activity.resident_id = resident.id
      AND activity.state IN ('running', 'claimable')
);