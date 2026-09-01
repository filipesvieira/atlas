# Relatório de Implementação — CFF-A Combat Feel Presentation Foundation

Data: 2026-08-30

## Objetivo

Adicionar peso, legibilidade e identidade visual aos ataques existentes sem alterar dano, cooldown, alcance, loot ou posição autoritativa.

## Arquitetura

Foi criado `frontend/src/game/effects/CombatPresentationSystem.ts` como camada de presentation compartilhada.

O fluxo passa a ser:

```text
Evento autoritativo
  -> CombatEffectRegistry (VFX da skill)
  -> CombatPresentationSystem
       -> hit stop visual
       -> impact burst/sparks
       -> screen shake
       -> visual stagger/knockback
       -> critical/finisher intensity
  -> renderer
```

Nenhum método do novo sistema escreve estado de gameplay.

## PvE

`GameViewport` agora:

- agenda impactos visuais de acordo com viagem/cast;
- congela apenas seu delta de animação durante hit stop;
- aplica reação visual temporária ao monstro/herói;
- usa profiles derivados de arquétipo, arma e skill;
- renderiza sparks/bursts centralizados;
- aplica shake antes da transformação da câmera;
- preserva `CombatEffectRegistry` para VFX especializados.

## PvP

`PvPArenaViewport` dispara CFF somente no momento em que `PendingImpact` alcança o alvo. Isso mantém flechas/magias sincronizadas com o impacto visual.

Dano e HP continuam provenientes de `PvPCombatSnapshot`; o deslocamento de reação nunca altera `grid_x/grid_y`.

## Acessibilidade

`GameCanvas` ganhou um controle compacto:

```text
SHAKE N -> SHAKE B -> SHAKE OFF
```

A preferência é persistida em `localStorage`. `prefers-reduced-motion` reduz automaticamente a amplitude efetiva.

## Critical / death feedback

Críticos aumentam hit stop, partículas, shake e reação visual. Golpe letal usa profile `finisher`, sem conceder qualquer bônus econômico ou dano adicional.

## Reconciliacão PvP v4

O source recebido declarava o gate v4 na documentação, porém `PvPCombatRulesVersion` ainda apontava para v3. O código foi reconciliado:

- `PvPBalanceCombatRulesVersion = 4`;
- Sniper deixa de ter crítico garantido;
- Ice Shard possui slow PvP autoritativo;
- Arcane Nova possui knockback PvP autoritativo;
- mitigação percentual v4;
- métricas de damage split e movimento real;
- migration `000032_pvp_balance_qa.sql` restaurada;
- harness `pvp_balance.go` e CLI `cmd/pvpbalance` restaurados.

Após considerar as alterações táticas mais recentes do checkout, o gate mecânico com 100 seeds ficou:

- melee x distance: 41 / 59;
- melee x magic: 54 / 46;
- distance x magic: 52 / 48;
- CP: 371 / 371 nos três confrontos;
- timeouts: 0.

Todos permanecem dentro do alvo máximo aproximado de 60/40.

## Escopo explicitamente NÃO implementado

CFF-A não adiciona:

- stun gameplay;
- root gameplay;
- bleed/burn/poison;
- knockback em tiles;
- stagger que atrasa cooldown;
- i-frames;
- parry;
- dodge ativo;
- reações elementais;
- áudio novo.

Esses itens pertencem a CFF-B/C ou ao refinamento final.

## Próxima etapa

`M5-B — Fortificações e defesa ativa`.

## Validação executada

```bash
cd backend
go test ./pkg/game
go test -race ./pkg/game
go test ./cmd/pvpbalance
go run ./cmd/pvpbalance -scenario mechanics_equal_cp -seeds 100
```

Todos passaram. O balance CLI reportou 59/41, 54/46 e 52/48, sem timeout.

Auditores:

```bash
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
node tools/audit-economy.mjs
node tools/audit-resource-usage.mjs
```

Todos retornaram `errors: 0`.

Frontend:

- `CombatPresentationSystem.ts` passou em `tsc` isolado com `strict`, `noUnusedLocals` e `noUnusedParameters`;
- `CombatPresentationSystem.ts`, `GameViewport.ts`, `PvPArenaViewport.ts` e `GameCanvas.tsx` passaram por `transpileModule` sem diagnóstico sintático.

Não foi possível homologar `go test ./cmd/server` neste Repomix porque `go.sum` não está presente para `lib/pq`, Chi, CORS, JWT, Gorilla WebSocket, Redis e `x/crypto`. O repositório real deve executar `go test -race ./...` e `npm run build` antes de merge/release.
