-- Layout V2 do acampamento: coordenadas persistentes para posicionamento livre/isométrico.
-- A migração é aditiva e preserva slot_key/building_key para retrocompatibilidade.
ALTER TABLE character_camp_buildings ADD COLUMN IF NOT EXISTS tile_x INT;
ALTER TABLE character_camp_buildings ADD COLUMN IF NOT EXISTS tile_y INT;
ALTER TABLE character_camp_buildings ADD COLUMN IF NOT EXISTS rotation SMALLINT NOT NULL DEFAULT 0;

-- Posições iniciais equivalentes ao layout legado. Cada jogador pode alterá-las depois.
UPDATE character_camp_buildings
SET tile_x = CASE slot_key
        WHEN 'west' THEN 2
        WHEN 'north' THEN 6
        WHEN 'east' THEN 10
        WHEN 'center' THEN 6
        WHEN 'south' THEN 8
        ELSE 0
    END,
    tile_y = CASE slot_key
        WHEN 'west' THEN 5
        WHEN 'north' THEN 2
        WHEN 'east' THEN 5
        WHEN 'center' THEN 5
        WHEN 'south' THEN 7
        ELSE 0
    END
WHERE tile_x IS NULL OR tile_y IS NULL;

ALTER TABLE character_camp_buildings ALTER COLUMN tile_x SET DEFAULT 0;
ALTER TABLE character_camp_buildings ALTER COLUMN tile_y SET DEFAULT 0;
ALTER TABLE character_camp_buildings ALTER COLUMN tile_x SET NOT NULL;
ALTER TABLE character_camp_buildings ALTER COLUMN tile_y SET NOT NULL;
ALTER TABLE character_camp_buildings ADD CONSTRAINT character_camp_buildings_rotation_check CHECK (rotation IN (0, 1, 2, 3));
ALTER TABLE character_camp_buildings ADD CONSTRAINT character_camp_buildings_tile_x_check CHECK (tile_x BETWEEN 0 AND 15);
ALTER TABLE character_camp_buildings ADD CONSTRAINT character_camp_buildings_tile_y_check CHECK (tile_y BETWEEN 0 AND 11);

UPDATE character_camps SET layout_version = GREATEST(layout_version, 2), updated_at = NOW();
