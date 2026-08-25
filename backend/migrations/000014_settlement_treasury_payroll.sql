-- Economia recorrente do assentamento. Migração estritamente aditiva: ouro do
-- herói, ordens antigas, recursos e progresso existentes permanecem intactos.
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS treasury_balance BIGINT NOT NULL DEFAULT 0 CHECK(treasury_balance >= 0);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS treasury_reserved_payroll BIGINT NOT NULL DEFAULT 0 CHECK(treasury_reserved_payroll >= 0);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS treasury_lifetime_income BIGINT NOT NULL DEFAULT 0 CHECK(treasury_lifetime_income >= 0);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS treasury_lifetime_expenses BIGINT NOT NULL DEFAULT 0 CHECK(treasury_lifetime_expenses >= 0);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS treasury_auto_fund_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS treasury_personal_gold_reserve BIGINT NOT NULL DEFAULT 500 CHECK(treasury_personal_gold_reserve >= 0);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS economy_version INT NOT NULL DEFAULT 1 CHECK(economy_version >= 1);

ALTER TABLE character_activities ADD COLUMN IF NOT EXISTS wage_reserved BIGINT NOT NULL DEFAULT 0 CHECK(wage_reserved >= 0);
ALTER TABLE character_activities ADD COLUMN IF NOT EXISTS wage_paid BIGINT NOT NULL DEFAULT 0 CHECK(wage_paid >= 0 AND wage_paid <= wage_reserved);
ALTER TABLE character_activities ADD COLUMN IF NOT EXISTS wage_rule_version INT NOT NULL DEFAULT 0 CHECK(wage_rule_version >= 0);

CREATE TABLE IF NOT EXISTS settlement_gold_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    reference_key VARCHAR(160) NOT NULL DEFAULT '',
    delta BIGINT NOT NULL,
    balance_after BIGINT NOT NULL CHECK(balance_after >= 0),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(settlement_id, request_id, reason)
);
CREATE INDEX IF NOT EXISTS idx_settlement_gold_ledger_created
    ON settlement_gold_ledger(settlement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS settlement_payroll (
    activity_id UUID PRIMARY KEY REFERENCES character_activities(id) ON DELETE CASCADE,
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES settlement_residents(id) ON DELETE SET NULL,
    resident_name_snapshot VARCHAR(120) NOT NULL DEFAULT '',
    profession_key VARCHAR(60) NOT NULL,
    wage_reserved BIGINT NOT NULL CHECK(wage_reserved >= 0),
    wage_paid BIGINT NOT NULL DEFAULT 0 CHECK(wage_paid >= 0 AND wage_paid <= wage_reserved),
    wage_refunded BIGINT NOT NULL DEFAULT 0 CHECK(wage_refunded >= 0 AND wage_refunded <= wage_reserved),
    state VARCHAR(30) NOT NULL DEFAULT 'reserved',
    economy_version INT NOT NULL,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ,
    UNIQUE(activity_id)
);
