-- M3E-B: intenção tática pré-duelo. A escolha fica separada do snapshot
-- imutável de equipamento/atributos e é selada no primeiro CONFIRM_PVP_MATCH.
ALTER TABLE pvp_match_participants
    ADD COLUMN IF NOT EXISTS tactical_strategy TEXT NOT NULL DEFAULT 'balanced',
    ADD COLUMN IF NOT EXISTS strategy_version INTEGER NOT NULL DEFAULT 1;

UPDATE pvp_match_participants
SET tactical_strategy='balanced'
WHERE tactical_strategy NOT IN ('aggressive','balanced','defensive');

UPDATE pvp_match_participants
SET strategy_version=1
WHERE strategy_version <= 0;
