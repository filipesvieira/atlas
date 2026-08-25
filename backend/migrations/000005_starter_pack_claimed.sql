-- P0-01: Starter pack one-shot — impede resgate infinito
ALTER TABLE characters ADD COLUMN IF NOT EXISTS starter_pack_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS starter_pack_key VARCHAR(50) DEFAULT NULL;