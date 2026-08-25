-- Layout V3 do assentamento: amplia o terreno isométrico de 16x12 para 24x18.
ALTER TABLE character_camps ALTER COLUMN layout_version SET DEFAULT 3;
-- O deslocamento é executado somente uma vez para layouts anteriores ao V3 e
-- preserva a disposição relativa que cada jogador já personalizou.
ALTER TABLE character_camp_buildings
    DROP CONSTRAINT IF EXISTS character_camp_buildings_tile_x_check;
ALTER TABLE character_camp_buildings
    DROP CONSTRAINT IF EXISTS character_camp_buildings_tile_y_check;

ALTER TABLE character_camp_buildings
    ADD CONSTRAINT character_camp_buildings_tile_x_check CHECK (tile_x BETWEEN 0 AND 23);
ALTER TABLE character_camp_buildings
    ADD CONSTRAINT character_camp_buildings_tile_y_check CHECK (tile_y BETWEEN 0 AND 17);

-- Cria margem equivalente em volta do terreno antigo: +4 X e +3 Y.
-- A seleção por layout_version torna a migration idempotente em bancos onde
-- o migrador precise ser retomado após uma interrupção.
UPDATE character_camp_buildings b
SET tile_x = b.tile_x + 4,
    tile_y = b.tile_y + 3,
    updated_at = NOW()
FROM character_camps c
WHERE c.character_id = b.character_id
  AND COALESCE(c.layout_version, 0) < 3;

UPDATE character_camps
SET layout_version = 3,
    state_revision = state_revision + 1,
    updated_at = NOW()
WHERE COALESCE(layout_version, 0) < 3;
