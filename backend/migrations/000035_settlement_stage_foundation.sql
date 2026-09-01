-- M5-A.1: base persistente para estágios territoriais e defesa futura.
--
-- A expansão do grid (000034) é independente desta camada. Esta migration
-- completa o contrato usado pelo estado do assentamento e pelos presets QA,
-- sem alterar layouts, recursos, moradores ou construções já existentes.

ALTER TABLE settlements
    ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ;

UPDATE settlements
SET stage_updated_at = COALESCE(stage_updated_at, updated_at, created_at, NOW())
WHERE stage_updated_at IS NULL;

ALTER TABLE settlements
    ALTER COLUMN stage_updated_at SET DEFAULT NOW(),
    ALTER COLUMN stage_updated_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS settlement_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    from_stage VARCHAR(40) NOT NULL,
    to_stage VARCHAR(40) NOT NULL,
    prosperity BIGINT NOT NULL DEFAULT 0 CHECK(prosperity >= 0),
    population INT NOT NULL DEFAULT 0 CHECK(population >= 0),
    requirements_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(settlement_id, to_stage)
);
CREATE INDEX IF NOT EXISTS idx_settlement_stage_history_recent
    ON settlement_stage_history(settlement_id, promoted_at DESC);

CREATE TABLE IF NOT EXISTS settlement_pvp_settings (
    settlement_id UUID PRIMARY KEY REFERENCES settlements(id) ON DELETE CASCADE,
    raids_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    defense_strategy VARCHAR(40) NOT NULL DEFAULT 'balanced',
    shield_until TIMESTAMPTZ,
    revision BIGINT NOT NULL DEFAULT 0 CHECK(revision >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlement_defense_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invalidated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_settlement_defense_snapshots_active
    ON settlement_defense_snapshots(settlement_id, created_at DESC)
    WHERE invalidated_at IS NULL;

-- Garante que saves existentes já possam ser lidos sem depender de uma
-- promoção territorial para criar a configuração defensiva inicial.
INSERT INTO settlement_pvp_settings(settlement_id)
SELECT id FROM settlements
ON CONFLICT(settlement_id) DO NOTHING;
