-- Generaliza a fila de resultados de crafting para qualquer item protegido que
-- não caiba na mochila nem no Baú de Achados. A coluna permanece compatível
-- com crafts existentes, mas deixa de exigir uma transação de crafting.
ALTER TABLE pending_crafted_items
    ALTER COLUMN transaction_id DROP NOT NULL;

ALTER TABLE pending_crafted_items
    ADD COLUMN IF NOT EXISTS source_kind VARCHAR(40) NOT NULL DEFAULT 'craft';
ALTER TABLE pending_crafted_items
    ADD COLUMN IF NOT EXISTS reference_key VARCHAR(160) NOT NULL DEFAULT '';

-- Saves antigos não deveriam repetir IDs de item, mas consolidamos qualquer
-- duplicata histórica antes de criar a proteção idempotente.
DELETE FROM pending_crafted_items older
USING pending_crafted_items newer
WHERE older.character_id = newer.character_id
  AND COALESCE(older.item->>'id', '') <> ''
  AND older.item->>'id' = newer.item->>'id'
  AND (older.created_at, older.id::text) > (newer.created_at, newer.id::text);

CREATE UNIQUE INDEX IF NOT EXISTS pending_items_character_item_uidx
    ON pending_crafted_items(character_id, ((item->>'id')))
    WHERE COALESCE(item->>'id', '') <> '';
