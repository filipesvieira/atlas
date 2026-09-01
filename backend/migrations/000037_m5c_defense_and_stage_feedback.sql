-- M5-C: Defense Power/Readiness/snapshot v1 + reconhecimento persistente de promoções.

ALTER TABLE settlement_stage_history
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Promoções históricas anteriores a esta feature não devem abrir uma fila de
-- modais retroativos. Somente promoções criadas depois da migration ficam pendentes.
UPDATE settlement_stage_history
SET acknowledged_at = COALESCE(acknowledged_at, promoted_at)
WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_settlement_stage_history_pending
    ON settlement_stage_history(settlement_id, promoted_at DESC)
    WHERE acknowledged_at IS NULL;

ALTER TABLE settlement_pvp_settings
    DROP CONSTRAINT IF EXISTS settlement_pvp_settings_defense_strategy_check;
ALTER TABLE settlement_pvp_settings
    ADD CONSTRAINT settlement_pvp_settings_defense_strategy_check
    CHECK(defense_strategy IN ('balanced','aggressive','defensive'));

ALTER TABLE settlement_defense_snapshots
    ADD COLUMN IF NOT EXISTS snapshot_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS snapshot_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS layout_version INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS defense_power INT NOT NULL DEFAULT 0 CHECK(defense_power >= 0),
    ADD COLUMN IF NOT EXISTS readiness INT NOT NULL DEFAULT 0 CHECK(readiness BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_settlement_defense_snapshots_hash
    ON settlement_defense_snapshots(settlement_id, snapshot_hash, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_defense_current_hash
    ON settlement_defense_snapshots(settlement_id, snapshot_hash)
    WHERE invalidated_at IS NULL AND snapshot_hash IS NOT NULL;

-- Snapshots anteriores não carregavam o contrato M5-C completo.
UPDATE settlement_defense_snapshots
SET invalidated_at = COALESCE(invalidated_at, NOW())
WHERE snapshot_hash IS NULL;
