-- Performance V2: idempotência de crafting em lote em uma única transação.
CREATE TABLE IF NOT EXISTS crafting_batch_transactions (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    recipe_key VARCHAR(160) NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(character_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_crafting_batch_transactions_created
    ON crafting_batch_transactions(character_id, created_at DESC);
