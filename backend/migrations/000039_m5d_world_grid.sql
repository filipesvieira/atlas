-- M5-D: World Grid / Mapa Territorial.
-- Coordenadas são públicas e fixas; inteligência defensiva continua isolada para M6.

CREATE TABLE IF NOT EXISTS worlds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    rules_version INT NOT NULL DEFAULT 1 CHECK(rules_version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO worlds(key,name,rules_version)
VALUES
    ('reino_do_avesso_1','Reino do Avesso — Mundo 1',1),
    ('reino_do_avesso_qa','Reino do Avesso — QA Territorial',1)
ON CONFLICT(key) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS settlement_world_coordinate_seq
    AS BIGINT
    MINVALUE 0
    START WITH 0
    INCREMENT BY 1;

ALTER TABLE settlements
    ADD COLUMN IF NOT EXISTS world_id UUID REFERENCES worlds(id),
    ADD COLUMN IF NOT EXISTS world_x INT,
    ADD COLUMN IF NOT EXISTS world_y INT,
    ADD COLUMN IF NOT EXISTS world_allocation_index BIGINT,
    ADD COLUMN IF NOT EXISTS world_assigned_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_world_coordinate
    ON settlements(world_id, world_x, world_y)
    WHERE world_id IS NOT NULL AND world_x IS NOT NULL AND world_y IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_world_allocation_index
    ON settlements(world_allocation_index)
    WHERE world_allocation_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settlement_world_nearby
    ON settlements(world_id, world_x, world_y)
    WHERE world_id IS NOT NULL AND world_x IS NOT NULL AND world_y IS NOT NULL;
