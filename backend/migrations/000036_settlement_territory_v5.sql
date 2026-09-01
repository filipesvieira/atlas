-- M5-B.1 — Kingdom Scale & Usability Hardening.
-- Cidade permanece 40x28; Reino cresce de 44x32 para 52x38.
-- O mundo V4 inteiro é centralizado no V5 por +4 X / +3 Y, preservando
-- posições relativas e layouts personalizados existentes.

ALTER TABLE character_camps ALTER COLUMN layout_version SET DEFAULT 5;

ALTER TABLE character_camp_buildings
    DROP CONSTRAINT IF EXISTS character_camp_buildings_tile_x_check;
ALTER TABLE character_camp_buildings
    DROP CONSTRAINT IF EXISTS character_camp_buildings_tile_y_check;

ALTER TABLE character_camp_buildings
    ADD CONSTRAINT character_camp_buildings_tile_x_check CHECK (tile_x BETWEEN 0 AND 51);
ALTER TABLE character_camp_buildings
    ADD CONSTRAINT character_camp_buildings_tile_y_check CHECK (tile_y BETWEEN 0 AND 37);

UPDATE character_camp_buildings building
SET tile_x = building.tile_x + 4,
    tile_y = building.tile_y + 3,
    updated_at = NOW()
FROM character_camps camp
WHERE camp.character_id = building.character_id
  AND COALESCE(camp.layout_version, 0) = 4;

UPDATE character_camps
SET layout_version = 5,
    state_revision = state_revision + 1,
    updated_at = NOW()
WHERE COALESCE(layout_version, 0) = 4;

-- Snapshots defensivos produzidos sobre coordenadas V4 não podem ser tratados
-- como prontos quando a M5-C começar a consumi-los.
UPDATE settlement_defense_snapshots
SET invalidated_at = NOW()
WHERE invalidated_at IS NULL;
