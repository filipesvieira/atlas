-- M4-A: Arena ranqueada sazonal, honra, ladder e proteção inicial contra win-trading.

CREATE TABLE IF NOT EXISTS pvp_seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_number INT NOT NULL UNIQUE CHECK(season_number >= 1),
    name VARCHAR(80) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK(status IN ('scheduled','active','ended')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK(ends_at > starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pvp_seasons_single_active
    ON pvp_seasons(status) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_pvp_seasons_number_desc ON pvp_seasons(season_number DESC);

CREATE TABLE IF NOT EXISTS pvp_season_profiles (
    season_id UUID NOT NULL REFERENCES pvp_seasons(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    rating INT NOT NULL DEFAULT 1000 CHECK(rating >= 0),
    peak_rating INT NOT NULL DEFAULT 1000 CHECK(peak_rating >= 0),
    wins INT NOT NULL DEFAULT 0 CHECK(wins >= 0),
    losses INT NOT NULL DEFAULT 0 CHECK(losses >= 0),
    draws INT NOT NULL DEFAULT 0 CHECK(draws >= 0),
    placements_played INT NOT NULL DEFAULT 0 CHECK(placements_played >= 0),
    honor BIGINT NOT NULL DEFAULT 0 CHECK(honor >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(season_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_pvp_season_profiles_ladder
    ON pvp_season_profiles(season_id, rating DESC, honor DESC, wins DESC);

CREATE TABLE IF NOT EXISTS pvp_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES pvp_seasons(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    reward_key VARCHAR(120) NOT NULL,
    reward_type VARCHAR(24) NOT NULL DEFAULT 'bundle' CHECK(reward_type IN ('bundle','title','banner','cosmetic')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    UNIQUE(season_id, character_id, reward_key)
);
CREATE INDEX IF NOT EXISTS idx_pvp_rewards_character_unclaimed
    ON pvp_rewards(character_id, earned_at DESC) WHERE claimed_at IS NULL;

CREATE TABLE IF NOT EXISTS pvp_cosmetic_unlocks (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    cosmetic_type VARCHAR(24) NOT NULL CHECK(cosmetic_type IN ('title','banner','cosmetic')),
    cosmetic_key VARCHAR(120) NOT NULL,
    source_season_id UUID REFERENCES pvp_seasons(id) ON DELETE SET NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, cosmetic_type, cosmetic_key)
);

ALTER TABLE pvp_matches
    ADD COLUMN IF NOT EXISTS ranked BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES pvp_seasons(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS competitive_applied_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS repeat_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00;

ALTER TABLE pvp_matches
    DROP CONSTRAINT IF EXISTS pvp_matches_match_origin_check;
ALTER TABLE pvp_matches
    ADD CONSTRAINT pvp_matches_match_origin_check
    CHECK(match_origin IN ('direct_duel','matchmaking','ranked_matchmaking'));

ALTER TABLE pvp_match_participants
    ADD COLUMN IF NOT EXISTS honor_awarded INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS season_rating_before INT,
    ADD COLUMN IF NOT EXISTS season_rating_after INT;

ALTER TABLE pvp_matchmaking_queue
    ADD COLUMN IF NOT EXISTS queue_mode VARCHAR(16) NOT NULL DEFAULT 'casual',
    ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES pvp_seasons(id) ON DELETE CASCADE;
ALTER TABLE pvp_matchmaking_queue
    DROP CONSTRAINT IF EXISTS pvp_matchmaking_queue_mode_check;
ALTER TABLE pvp_matchmaking_queue
    ADD CONSTRAINT pvp_matchmaking_queue_mode_check CHECK(queue_mode IN ('casual','ranked'));
CREATE INDEX IF NOT EXISTS idx_pvp_matchmaking_queue_mode_rating_time
    ON pvp_matchmaking_queue(queue_mode, season_id, rating_snapshot, queued_at);

CREATE INDEX IF NOT EXISTS idx_pvp_matches_ranked_season_recent
    ON pvp_matches(season_id, ended_at DESC) WHERE ranked=true AND status='completed';
CREATE INDEX IF NOT EXISTS idx_pvp_match_participants_character_match
    ON pvp_match_participants(character_id, match_id);
