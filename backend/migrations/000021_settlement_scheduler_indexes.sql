-- Índices para o scheduler global de assentamento. Evita um ticker/consulta por
-- WebSocket conectado e permite buscar somente trabalhos que realmente vencem.
CREATE INDEX IF NOT EXISTS idx_character_activities_due_scheduler
    ON character_activities(ends_at, character_id)
    WHERE state IN ('running','claimable');

CREATE INDEX IF NOT EXISTS idx_hero_desires_ready_scheduler
    ON hero_desires(current_order_ready_at, settlement_id)
    WHERE state='crafting';

CREATE INDEX IF NOT EXISTS idx_hero_desires_waiting_scheduler
    ON hero_desires(updated_at, settlement_id)
    WHERE state='queued';


CREATE INDEX IF NOT EXISTS idx_camp_buildings_due_scheduler
    ON character_camp_buildings(upgrade_ends_at, character_id)
    WHERE upgrade_target_level IS NOT NULL;
