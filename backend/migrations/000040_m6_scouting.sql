-- M6: Scouting / Inteligência territorial.
-- Relatórios persistem somente estimativas sanitizadas; snapshots defensivos
-- completos continuam privados no backend.

CREATE TABLE IF NOT EXISTS settlement_scouting_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attacker_settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    defender_settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    rules_version INT NOT NULL DEFAULT 1 CHECK(rules_version >= 1),
    state VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(state IN ('active','completed')),
    distance DOUBLE PRECISION NOT NULL CHECK(distance >= 0),
    gold_cost BIGINT NOT NULL CHECK(gold_cost >= 0),
    tracker_level INT NOT NULL CHECK(tracker_level BETWEEN 1 AND 50),
    coordination_percent INT NOT NULL CHECK(coordination_percent BETWEEN 0 AND 100),
    quality INT CHECK(quality BETWEEN 0 AND 100),
    detection_percent INT CHECK(detection_percent BETWEEN 0 AND 100),
    detected BOOLEAN NOT NULL DEFAULT FALSE,
    source_identified BOOLEAN NOT NULL DEFAULT FALSE,
    defender_snapshot_hash VARCHAR(64),
    report JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completes_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    report_expires_at TIMESTAMPTZ,
    CHECK(attacker_settlement_id <> defender_settlement_id),
    UNIQUE(attacker_settlement_id, request_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_scouting_active_pair
    ON settlement_scouting_missions(attacker_settlement_id, defender_settlement_id)
    WHERE state='active';

CREATE INDEX IF NOT EXISTS idx_settlement_scouting_attacker
    ON settlement_scouting_missions(attacker_settlement_id, state, completes_at DESC);

CREATE INDEX IF NOT EXISTS idx_settlement_scouting_due
    ON settlement_scouting_missions(completes_at, id)
    WHERE state='active';

CREATE INDEX IF NOT EXISTS idx_settlement_scouting_defender_detected
    ON settlement_scouting_missions(defender_settlement_id, completed_at DESC)
    WHERE state='completed' AND detected=TRUE;
