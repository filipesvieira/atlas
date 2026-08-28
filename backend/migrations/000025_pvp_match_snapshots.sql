-- M3B: partida e snapshots imutáveis de entrada. Nenhum saque ou rating é aplicado aqui.

CREATE TABLE IF NOT EXISTS pvp_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL UNIQUE REFERENCES pvp_duel_challenges(id) ON DELETE RESTRICT,
    mode VARCHAR(24) NOT NULL DEFAULT 'duel',
    arena_key VARCHAR(64) NOT NULL DEFAULT 'duel_arena',
    status VARCHAR(16) NOT NULL DEFAULT 'ready',
    rules_version INT NOT NULL DEFAULT 1,
    deterministic_seed BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    CHECK (mode = 'duel'),
    CHECK (status IN ('ready', 'active', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS pvp_match_participants (
    match_id UUID NOT NULL REFERENCES pvp_matches(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE RESTRICT,
    team VARCHAR(1) NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, character_id),
    UNIQUE (match_id, team),
    CHECK (team IN ('a', 'b'))
);

CREATE TABLE IF NOT EXISTS pvp_match_events (
    match_id UUID NOT NULL REFERENCES pvp_matches(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    event_type VARCHAR(48) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, sequence)
);
