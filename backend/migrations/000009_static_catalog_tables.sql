-- Catálogos estáticos legados passam a ter schema controlado pelo migrator.
-- O bootstrap de dados somente popula tabelas vazias e nunca executa DDL.
CREATE TABLE IF NOT EXISTS base_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slot VARCHAR(50) NOT NULL,
    base_atk INT NOT NULL DEFAULT 0,
    base_def INT NOT NULL DEFAULT 0,
    base_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    tier INT NOT NULL DEFAULT 1,
    special_effect VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS base_monsters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    base_health INT NOT NULL,
    base_attack INT NOT NULL,
    min_level INT NOT NULL DEFAULT 1,
    max_level INT NOT NULL DEFAULT 999,
    region_id VARCHAR(100) NOT NULL
);
