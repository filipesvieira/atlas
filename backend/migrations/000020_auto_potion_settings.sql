-- Suprimentos automáticos: preferência e orçamento da expedição separados
-- dos buffs consumíveis. O estado persiste entre reconexões para impedir que
-- relogar renove o orçamento ou o cooldown.
CREATE TABLE IF NOT EXISTS character_auto_potion_settings (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    health_threshold_percent SMALLINT NOT NULL DEFAULT 30,
    mana_threshold_percent SMALLINT NOT NULL DEFAULT 25,
    max_gold_per_expedition BIGINT NOT NULL DEFAULT 50,
    revision BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (health_threshold_percent BETWEEN 10 AND 70),
    CHECK (mana_threshold_percent BETWEEN 5 AND 70),
    CHECK (max_gold_per_expedition IN (25, 50, 100, 250))
);

CREATE TABLE IF NOT EXISTS character_auto_potion_state (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    gold_spent BIGINT NOT NULL DEFAULT 0 CHECK (gold_spent >= 0),
    health_cooldown_until TIMESTAMPTZ,
    mana_cooldown_until TIMESTAMPTZ,
    budget_exhausted BOOLEAN NOT NULL DEFAULT FALSE,
    revision BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
