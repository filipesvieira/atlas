-- PvP Balance QA: corrige duração terminal histórica e impede regressão.
-- Partidas concluídas/canceladas precisam ter ended_at persistido; uma duração
-- crescente após o encerramento torna a telemetria imprópria para balanceamento.

UPDATE pvp_matches
SET ended_at = COALESCE(
    ended_at,
    NULLIF(runtime_state->'snapshot'->>'ended_at','')::timestamptz,
    last_pulse_at,
    started_at,
    created_at
)
WHERE status IN ('completed','cancelled')
  AND ended_at IS NULL;

ALTER TABLE pvp_matches
    DROP CONSTRAINT IF EXISTS pvp_matches_terminal_ended_at_check;
ALTER TABLE pvp_matches
    ADD CONSTRAINT pvp_matches_terminal_ended_at_check
    CHECK(status NOT IN ('completed','cancelled') OR ended_at IS NOT NULL);
