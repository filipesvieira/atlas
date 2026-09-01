-- M5-A.1 — Expansão Territorial V4.
-- O mundo do assentamento passa a 44x32, enquanto o antigo terreno 24x18
-- permanece centralizado. A translação uniforme preserva 100% do layout
-- relativo criado pelos jogadores no V3.

ALTER TABLE character_camps ALTER COLUMN layout_version SET DEFAULT 4;

ALTER TABLE character_camp_buildings
    DROP CONSTRAINT IF EXISTS character_camp_buildings_tile_x_check;
ALTER TABLE character_camp_buildings
    DROP CONSTRAINT IF EXISTS character_camp_buildings_tile_y_check;

ALTER TABLE character_camp_buildings
    ADD CONSTRAINT character_camp_buildings_tile_x_check CHECK (tile_x BETWEEN 0 AND 43);
ALTER TABLE character_camp_buildings
    ADD CONSTRAINT character_camp_buildings_tile_y_check CHECK (tile_y BETWEEN 0 AND 31);

-- V3 ocupava 24x18. O novo mundo 44x32 cria margens simétricas:
-- (44-24)/2 = +10 X e (32-18)/2 = +7 Y.
UPDATE character_camp_buildings building
SET tile_x = building.tile_x + 10,
    tile_y = building.tile_y + 7,
    updated_at = NOW()
FROM character_camps camp
WHERE camp.character_id = building.character_id
  AND COALESCE(camp.layout_version, 0) < 4;

UPDATE character_camps
SET layout_version = 4,
    state_revision = state_revision + 1,
    updated_at = NOW()
WHERE COALESCE(layout_version, 0) < 4;
