# Runbook de Migração — Economia V2

## 1. Antes do deploy

1. Gere backup consistente do PostgreSQL.
2. Guarde contagens de `characters`, `character_inventories`, `character_resources` e soma de `gold_bank`.
3. Execute os três auditores Node e `go test -race ./...`.
4. Faça o primeiro deploy com as features habilitadas e `ATLAS_COMMON_EQUIPMENT_DROP_MULTIPLIER=1` se desejar observar a economia antes de reduzir o loot.

O backend aplica, em ordem, `000001` a `000013`. As mudanças econômicas/classless ficam em `000006`–`000012`; o assentamento vivo, moradores, Ambições e Arsenal entram aditivamente em `000013`. O `bootstrap.sql` é apenas documental e não deve ser executado como fonte alternativa de schema.

Confira a trilha depois do primeiro startup:

```sql
SELECT version, applied_at FROM schema_migrations ORDER BY version;
```

## 2. Garantia de progressão

A migration não recalcula nível nem XP. O classificador promove somente snapshots onde `0 <= experience < required_xp(level)`. Estados ambíguos são registrados e bloqueados para revisão, sem alteração de nível ou XP.

```sql
SELECT c.id, c.name, c.level, c.experience, i.required_experience_snapshot, i.reason
FROM progression_migration_issues i
JOIN characters c ON c.id = i.character_id
WHERE i.resolved_at IS NULL;
```

Depois de revisar manualmente um caso, corrija o snapshot segundo a regra histórica confirmada, marque `progression_version=1` e preencha `resolved_at`. Nunca aplique conversão em massa por suposição.

Enquanto houver linha não resolvida em `progression_migration_issues`, mantenha o personagem bloqueado para jogo. O sistema prefere uma intervenção explícita a surpreender o jogador com redução de nível ou XP.

## 3. Itens legados

No primeiro carregamento, itens antigos recebem apenas `source=legacy_drop`. ID, nome, raridade, atributos, valor, efeito especial, uso e equipamento atual permanecem intactos. O carregador não chama o gerador procedural para itens persistidos.

## 4. Rollout sugerido

1. Profissões e coleta: `ATLAS_GATHERING_ENABLED=true`.
2. Oficina: `ATLAS_CRAFTING_ENABLED=true`.
3. Loot transitório: diminua `ATLAS_COMMON_EQUIPMENT_DROP_MULTIPLIER` de `1` para `0.5`, `0.25` e `0`.
4. Estado final: `ATLAS_CRAFTING_FIRST_LOOT=true` e multiplicador `0`.

Reinicie o backend ao alterar flags. Nenhuma flag reescreve conteúdo persistido.

## 5. Consultas operacionais

```sql
-- Atividades ainda abertas
SELECT state, count(*) FROM character_activities GROUP BY state;

-- Recursos pendentes por falta de espaço
SELECT resource_key, sum(quantity) FROM character_pending_resource_rewards GROUP BY resource_key;
SELECT resource_key, sum(quantity) FROM character_pending_gathering_rewards GROUP BY resource_key;

-- Fontes e sumidouros
SELECT reason, resource_key, sum(delta) FROM character_resource_ledger GROUP BY reason, resource_key ORDER BY reason, resource_key;

-- Crafts idempotentes
SELECT recipe_key, count(*), min(created_at), max(created_at) FROM crafting_transactions GROUP BY recipe_key;

-- Eventos de progressão
SELECT source_kind, count(*), sum(xp_delta) FROM character_progression_events GROUP BY source_kind;

-- Seeds e versões persistidas para auditoria de crafting/coleta
SELECT recipe_key, algorithm_version, seed, count(*) FROM crafting_transactions GROUP BY recipe_key, algorithm_version, seed;
SELECT profession_key, state, count(*) FROM character_activities GROUP BY profession_key, state;
```

O endpoint autenticado `GET /api/v1/admin/telemetry` expõe `economy_counters`. Acompanhe especialmente `progression_conflict_total`, `inventory_conflict_total`, `stale_snapshot_rejected_total`, `session_lease_conflict_total`, `gathering_pending_storage_total`, `craft_idempotency_replay_total` e `inventory_overflow_total{source=craft}`.

## 6. Teste de aceitação local

```bash
cd backend
go test -race ./...

cd ../frontend
npm ci
npm run build

cd ..
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
node tools/audit-economy.mjs
docker compose up --build
```

Valide manualmente: abertura sem reset de nível; caça sem matéria-prima profissional; coleta com cada duração; cancelamento após pelo menos um ciclo; depósito cheio gerando carga pendente; claim parcial; craft repetido com o mesmo `request_id`; craft com inventário cheio; e permanência do desbloqueio após gastar um troféu.

## 7. Rollback

- Desative coleta/crafting por flag antes de reverter aplicação.
- Não remova migrations nem colunas: versões antigas ignoram tabelas adicionais.
- Não apague cargas pendentes, ledgers ou origens de item.
- Reative temporariamente o loot comum com multiplicador `1` se a cobertura de receitas bloquear a progressão.