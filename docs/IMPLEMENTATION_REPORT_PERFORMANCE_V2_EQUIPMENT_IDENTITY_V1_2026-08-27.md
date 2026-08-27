# Reino do Avesso — Performance V2 pré-multiplayer + Equipment Identity V1

Data: 2026-08-27
Base: `repomix-output(3).xml`

## Performance V2

- Protocolo WebSocket V3 com `character_delta` nos eventos de caminho quente; snapshots completos permanecem em eventos críticos e sincronizações explícitas.
- Frontend recompõe o estado do personagem a partir do delta antes de atualizar UI/Canvas.
- Telemetria de frames, bytes enviados e writes lentos do WebSocket.
- Fila serial de persistência para loot/inventário/overflow/descobertas, executada fora do `Session.Mu` e drenada antes do snapshot de logout.
- `CraftBatch` transacional: até 20 unidades em um único `BEGIN/COMMIT`, com idempotência por `request_id`, débito agregado de recursos/ouro, XP agregado e migration `000022_crafting_batch_transactions.sql`.
- `preview_revision` validada no lote antes do commit.
- Cenário de carga k6 em `tools/loadtest/`, preparado para rampas 100 → 500 → 1.000 → 2.500 → 5.000 CCU usando personagens exclusivos por VU.

## Equipment Identity V1

- `visual_key` e `set_key` adicionados aos templates, itens e receitas.
- Oficina Manual não lista mais comidas, poções nem receitas vinculadas a `kitchen`/`alchemy_bench`.
- Painel de detalhes da Oficina usa o `weapon_type` e a identidade real da receita; não há mais fallback geral para espada.
- `PixelArtItemRegistry` recebeu paletas coerentes para couro, madeira, tecido e metais.
- Cajado de Pirulito possui silhueta pixel art própria.
- Arcos longos/avançados possuem silhueta distinta do Arco Curvo.
- Sets catalogados: Urso Ranzinza (6 peças, foco melee), Feiona (6 peças, foco magic) e Zodíaco (identidade catalogada).
- Bosses Urso Ranzinza e Feiona podem dropar suas peças temáticas sem remover os drops antigos.
- Os sets não aplicam bônus 2/4/6 peças nesta versão; a identidade e o catálogo ficam prontos para isso no futuro.

## Validação realizada

- `go test ./pkg/game` — PASS
- `go test -race ./pkg/game` — PASS
- `go vet ./pkg/game` — PASS
- `internal/db` — compilação validada com stub local apenas para `lib/pq`, pois o pacote enviado não contém `go.sum`.
- `cmd/server` — compilação validada com stubs locais das dependências externas, sem alterar o fonte entregue.
- Frontend: 104 arquivos TS/TSX analisados pelo parser TypeScript, 0 erros de sintaxe.
- `audit-content.mjs` — 0 erros
- `audit-camp-content.mjs` — 0 erros
- `audit-economy.mjs` — 0 erros
- `audit-resource-usage.mjs` — 0 erros

## Limitações do material de origem

O Repomix não contém arquivos binários ignorados/excluídos e também não trouxe `backend/go.sum`, `frontend/package-lock.json` ou `frontend/src-tauri/Cargo.lock`. Por isso o ZIP entregue contém o código-fonte textual completo reconstruível a partir do pacote enviado, mais os novos arquivos desta implementação; assets binários omitidos pelo próprio Repomix não podem ser reconstruídos com fidelidade a partir dele.
