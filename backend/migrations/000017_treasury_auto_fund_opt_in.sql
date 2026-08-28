-- Novos assentamentos não devem transferir ouro pessoal sem escolha explícita do jogador.
-- Não altera linhas existentes: apenas muda o default para criações futuras.
ALTER TABLE settlements
    ALTER COLUMN treasury_auto_fund_enabled SET DEFAULT FALSE;