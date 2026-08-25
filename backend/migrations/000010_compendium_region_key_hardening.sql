-- Reaplica de forma versionada a correção do compêndio para bancos que possam
-- ter registrado uma versão preliminar da migration 000006.
ALTER TABLE character_loot_discoveries
    ADD COLUMN IF NOT EXISTS first_region_key VARCHAR(80) DEFAULT '';
UPDATE character_loot_discoveries
SET first_region_key = ''
WHERE first_region_key IS NULL;
ALTER TABLE character_loot_discoveries
    ALTER COLUMN first_region_key SET DEFAULT '';
ALTER TABLE character_loot_discoveries
    ALTER COLUMN first_region_key SET NOT NULL;

DO $$
DECLARE
    pk_name text;
    pk_columns text[];
BEGIN
    SELECT c.conname,
           array_agg(a.attname::text ORDER BY u.ordinality)
    INTO pk_name, pk_columns
    FROM pg_constraint c
    JOIN unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality) ON TRUE
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = u.attnum
    WHERE c.conrelid = 'character_loot_discoveries'::regclass
      AND c.contype = 'p'
    GROUP BY c.conname;

    IF pk_columns IS DISTINCT FROM ARRAY['character_id', 'item_template_key', 'first_region_key']::text[] THEN
        IF pk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE character_loot_discoveries DROP CONSTRAINT %I', pk_name);
        END IF;
        ALTER TABLE character_loot_discoveries
            ADD CONSTRAINT character_loot_discoveries_pkey
            PRIMARY KEY(character_id, item_template_key, first_region_key);
    END IF;
END $$;