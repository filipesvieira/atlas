# Reino do Avesso — M5-B Fortificações e Defesa Ativa

Data: 2026-08-30
Status: concluída
Próxima etapa: M5-C — Engenheiro, Defense Power e Snapshot Defensivo

## Objetivo

Materializar as fortificações exigidas pela progressão Cidade/Reino sobre o território V4 44x32, sem habilitar raids antes da hora e sem reverter as correções recentes do viewport PvE.

## Estruturas entregues

1. Muralha (`wall`) — perímetro
2. Portão Fortificado (`gate`) — perímetro
3. Torre de Vigia (`watchtower`)
4. Quartel (`barracks`)
5. Cofre do Reino (`vault`)
6. Enfermaria (`infirmary`)
7. Cárcere (`prison`)
8. Oficina do Engenheiro (`engineer_workshop`)
9. Sala de Guerra (`war_room`)
10. Ressonador Arcano (`resonator`)

O catálogo total passa de 7 para 17 construções.

## Progressão sem circularidade

- `village` libera Muralha e Torre de Vigia. Elas permitem satisfazer a promoção para `city`.
- `city` libera Portão, Quartel, Cofre, Enfermaria, Cárcere, Oficina do Engenheiro, Sala de Guerra e Ressonador.
- níveis mais altos podem exigir `city` ou `kingdom` independentemente do blueprint já estar descoberto.
- o backend é a autoridade para `unlock_stage` e `required_settlement_stage`.

## Perímetro

Muralha e Portão possuem linha normal em `character_camp_buildings`, níveis, custos, timer e revisão, porém `GetBuildingGridFootprint()` retorna 0x0 e o servidor rejeita tentativa de reposicionamento. O frontend gera o cinturão visual ao redor dos bounds do estágio atual e intercala cada segmento por profundidade isométrica.

A promoção territorial pode aumentar fisicamente o cinturão sem multiplicar o número de registros da muralha. O nível representa qualidade/integridade do sistema de fortificação; o estágio representa a extensão territorial protegida.

## Estruturas internas

Footprints M5-B:

- Torre 3x3
- Quartel 4x3
- Cofre 3x3
- Enfermaria 3x3
- Cárcere 3x3
- Oficina do Engenheiro 4x3
- Sala de Guerra 4x3
- Ressonador 3x3

Todas continuam usando drag-and-drop, colisão e bounds server-authoritative do Layout V4.

## Defesa futura sem raid prematura

Os níveis já expõem metadados para integridade, proteção, capacidade de guardas, reparo, scouting e barreira arcana. A M5-B não soma esses valores em um score nem habilita ataque.

Qualquer upgrade ou reposicionamento invalida snapshots defensivos vigentes e incrementa a revisão de defesa. `raids_enabled` permanece falso.

## QA

Os presets territoriais continuam orientados pelo registry:

- `city`: constrói apenas conteúdo disponível naquele estágio e usa o maior nível permitido em Cidade;
- `kingdom`: materializa o catálogo completo em nível permitido de Reino;
- `kingdom_stress`: mesma base do Reino com população ampliada.

Há teste automático que tenta posicionar todo o catálogo aplicável em Cidade e Reino.

## UI

- Gestão do Acampamento separa Infraestrutura/Produção de Fortificações/Defesa.
- Muralha/Portão são identificados como perímetro.
- cards mostram estágio de desbloqueio.
- modal de upgrade mostra e valida estágio mínimo do próximo nível.
- efeitos defensivos possuem descrições legíveis em vez de chaves internas.
- timers longos passam a exibir horas.

## Preservação das correções do usuário

Esta entrega não altera `frontend/src/components/Viewport/GameViewport.ts`. Portanto as correções manuais imediatamente anteriores — remoção das bordas pretas do PvE e isolamento do zoom do assentamento — permanecem exatamente sobre o source recebido.

## Validação

- `go test ./pkg/game`
- `go test -race ./pkg/game`
- `go test ./internal/db` com stub local temporário somente para o blank import `lib/pq`
- `go run ./cmd/pvpbalance -scenario mechanics_equal_cp -seeds 100`
- transpilação sintática dos arquivos TS/TSX alterados
- auditores de conteúdo/economia/layout

O build integral de `cmd/server`/frontend deve ser repetido no repositório real porque o Repomix não contém `go.sum`/`node_modules` completos.

## Resultado dos gates nesta entrega

- `go test ./pkg/game` — OK
- `go test -race ./pkg/game` — OK
- `go test ./internal/db` — OK com stub local temporário apenas para o blank import `github.com/lib/pq`; o stub não integra o pacote final
- balance gate 100 seeds:
  - melee × distance: 41/59, CP 371/371, timeout 0 — PASS
  - melee × magic: 54/46, CP 371/371, timeout 0 — PASS
  - distance × magic: 52/48, CP 371/371, timeout 0 — PASS
- transpilação sintática dos 12 arquivos TS/TSX alterados — OK
- `audit-content.mjs` — 0 erros
- `audit-camp-content.mjs` — 17 construções, 0 erros
- `audit-economy.mjs` — 0 erros
- `audit-resource-usage.mjs` — 0 erros; `abyssal_ember` e `trophy_abyss_avenger` agora possuem sink real nas fortificações M5-B

Tentativas de build integral continuam limitadas pela natureza do Repomix:

- `go test ./cmd/server` não resolve dependências por ausência de `go.sum` no pacote;
- `npm run build` inicia `tsc`, mas o pacote não contém `node_modules`/React e portanto falha antes de homologar o projeto completo.
