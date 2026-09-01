-- S1: Hero Progression Simplification.
-- STR/DEX/INT/VIT permanecem fisicamente por uma versão para rollback/compatibilidade,
-- mas deixam de participar das fórmulas de gameplay.

UPDATE characters
SET unspent_points = 0,
    progression_version = GREATEST(progression_version, 2)
WHERE unspent_points <> 0 OR progression_version < 2;

ALTER TABLE characters
    ALTER COLUMN unspent_points SET DEFAULT 0;
