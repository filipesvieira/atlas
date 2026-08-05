-- Extensão para geração de UUIDs nativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Contas de Usuários
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'tutor', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Personagens
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(50) UNIQUE NOT NULL,
    vocation VARCHAR(20) NOT NULL CHECK (vocation IN ('knight', 'paladin', 'sorcerer', 'druid')),
    level INT DEFAULT 1,
    experience BIGINT DEFAULT 0,
    health INT DEFAULT 150,
    max_health INT DEFAULT 150,
    mana INT DEFAULT 50,
    max_mana INT DEFAULT 50,
    gold_bank BIGINT DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_logout TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventário e Equipamentos (JSONB para suportar atributos procedurais flexíveis)
CREATE TABLE IF NOT EXISTS character_inventories (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    equipment JSONB DEFAULT '{"head": null, "chest": null, "legs": null, "boots": null, "mainhand": null, "offhand": null}'::jsonb,
    backpack JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Histórico e Relatórios de Expedições Offline
CREATE TABLE IF NOT EXISTS expedition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    minutes_offline INT NOT NULL,
    xp_gained BIGINT NOT NULL,
    gold_gained BIGINT NOT NULL,
    items_found JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
