-- O personagem já recebe espada, escudo, arco, munição e varinha ao nascer.
-- A antiga escolha de um único pacote ficou redundante e permitiria duplicar
-- equipamentos via comando WebSocket legado. Mantemos o handler para
-- compatibilidade de protocolo, mas todos os personagens passam a ter o
-- onboarding classless concluído.
UPDATE characters
SET starter_pack_claimed = TRUE,
    starter_pack_key = 'classless_all'
WHERE starter_pack_claimed IS DISTINCT FROM TRUE
   OR COALESCE(starter_pack_key, '') = '';

ALTER TABLE characters
    ALTER COLUMN starter_pack_claimed SET DEFAULT TRUE;