-- Gate 0: progressão monotônica e economia de profissões/crafting.
-- Zero significa "legado ainda não classificado". O classificador Go somente
-- promove snapshots inequívocos; XP acima do limiar fica bloqueado para revisão.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS progression_version INT NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS lifetime_experience BIGINT NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS highest_level_ever INT NOT NULL DEFAULT 1;

UPDATE characters
SET highest_level_ever = GREATEST(highest_level_ever, level),
    lifetime_experience = GREATEST(lifetime_experience, experience);

CREATE TABLE IF NOT EXISTS progression_migration_issues (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    level_snapshot INT NOT NULL,
    experience_snapshot BIGINT NOT NULL,
    required_experience_snapshot BIGINT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_level_positive;
ALTER TABLE characters ADD CONSTRAINT characters_level_positive CHECK (level >= 1) NOT VALID;
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_experience_nonnegative;
ALTER TABLE characters ADD CONSTRAINT characters_experience_nonnegative CHECK (experience >= 0) NOT VALID;
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_highest_level_monotonic;
ALTER TABLE characters ADD CONSTRAINT characters_highest_level_monotonic CHECK (highest_level_ever >= level) NOT VALID;

CREATE TABLE IF NOT EXISTS character_progression_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    event_key VARCHAR(80) NOT NULL,
    source_kind VARCHAR(40) NOT NULL,
    source_key VARCHAR(120) NOT NULL DEFAULT '',
    level_before INT NOT NULL,
    level_after INT NOT NULL,
    experience_before BIGINT NOT NULL,
    experience_after BIGINT NOT NULL,
    xp_delta BIGINT NOT NULL DEFAULT 0,
    state_revision BIGINT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(character_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_progression_events_character_created
    ON character_progression_events(character_id, created_at DESC);

CREATE TABLE IF NOT EXISTS character_professions (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    profession_key VARCHAR(60) NOT NULL,
    level INT NOT NULL DEFAULT 1 CHECK(level >= 1),
    experience BIGINT NOT NULL DEFAULT 0 CHECK(experience >= 0),
    lifetime_experience BIGINT NOT NULL DEFAULT 0 CHECK(lifetime_experience >= 0),
    revision BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, profession_key)
);

CREATE TABLE IF NOT EXISTS character_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    activity_kind VARCHAR(30) NOT NULL,
    expedition_key VARCHAR(100) NOT NULL,
    profession_key VARCHAR(60) NOT NULL,
    state VARCHAR(30) NOT NULL,
    duration_seconds BIGINT NOT NULL CHECK(duration_seconds > 0),
    started_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    snapshot JSONB NOT NULL,
    result JSONB,
    profession_xp_applied BOOLEAN NOT NULL DEFAULT FALSE,
    request_id VARCHAR(100) NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(character_id, request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_character_one_active_activity
    ON character_activities(character_id)
    WHERE state IN ('running', 'claimable', 'pending_storage');
CREATE INDEX IF NOT EXISTS idx_character_activities_end
    ON character_activities(character_id, ends_at DESC);

CREATE TABLE IF NOT EXISTS character_pending_gathering_rewards (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES character_activities(id) ON DELETE CASCADE,
    resource_key VARCHAR(80) NOT NULL,
    quantity BIGINT NOT NULL CHECK(quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, activity_id, resource_key)
);

CREATE TABLE IF NOT EXISTS character_recipe_unlocks (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    recipe_key VARCHAR(160) NOT NULL,
    source_kind VARCHAR(40) NOT NULL DEFAULT 'default',
    source_key VARCHAR(120) NOT NULL DEFAULT '',
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, recipe_key)
);

CREATE TABLE IF NOT EXISTS crafting_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    recipe_key VARCHAR(160) NOT NULL,
    recipe_version INT NOT NULL,
    catalyst_key VARCHAR(80) NOT NULL DEFAULT '',
    preview_revision BIGINT NOT NULL,
    costs JSONB NOT NULL,
    gold_cost BIGINT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(character_id, request_id)
);

CREATE TABLE IF NOT EXISTS character_resource_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    reference_key VARCHAR(160) NOT NULL DEFAULT '',
    resource_key VARCHAR(80) NOT NULL,
    delta BIGINT NOT NULL,
    balance_after BIGINT NOT NULL CHECK(balance_after >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(character_id, request_id, resource_key)
);
CREATE INDEX IF NOT EXISTS idx_resource_ledger_character_created
    ON character_resource_ledger(character_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pending_crafted_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES crafting_transactions(id) ON DELETE CASCADE,
    item JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(transaction_id)
);

CREATE TABLE IF NOT EXISTS character_session_leases (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL,
    server_id TEXT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    heartbeat_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_character_session_leases_expiry ON character_session_leases(expires_at);

-- Corrige o compêndio antigo que não separava o mesmo item por região.
ALTER TABLE character_loot_discoveries ADD COLUMN IF NOT EXISTS first_region_key VARCHAR(80) DEFAULT '';
UPDATE character_loot_discoveries SET first_region_key='' WHERE first_region_key IS NULL;
ALTER TABLE character_loot_discoveries ALTER COLUMN first_region_key SET DEFAULT '';
ALTER TABLE character_loot_discoveries ALTER COLUMN first_region_key SET NOT NULL;
DO $$
DECLARE pk_name text;
BEGIN
    IF to_regclass('public.character_loot_discoveries') IS NOT NULL THEN
        SELECT conname INTO pk_name
        FROM pg_constraint
        WHERE conrelid='character_loot_discoveries'::regclass AND contype='p';
        IF pk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE character_loot_discoveries DROP CONSTRAINT %I', pk_name);
        END IF;
        ALTER TABLE character_loot_discoveries
            ADD CONSTRAINT character_loot_discoveries_pkey
            PRIMARY KEY(character_id, item_template_key, first_region_key);
    END IF;
END $$;
