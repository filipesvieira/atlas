# ATLAS — M5-C Implementation Report

**Fase:** M5-C — Defense Power, Readiness, defesa automática e feedback de progressão  
**Data:** 2026-09-01

## Objetivo

Transformar as fortificações da M5-B em um sistema defensivo compreensível e server-authoritative, sem ligar raids ainda, e resolver um problema de UX: promoções territoriais não podiam mais passar despercebidas.

## Entregue

### Progressão territorial visível
- estágios possuem `summary`, `promotion_headline` e `highlights`;
- progresso para o próximo estágio possui percentual gradual, requisitos completos/total e expansão territorial seguinte;
- card persistente no Dashboard mostra estágio atual e próximo passo;
- modal comemorativo aparece em cada promoção;
- promoção pendente é persistida no backend e só some após ACK do jogador;
- promoções históricas anteriores à migration são marcadas como reconhecidas para evitar spam retroativo;
- feed/notificações também recebe o evento de promoção.

### Defense Power / Readiness
- `EvaluateSettlementDefense` centraliza cálculo determinístico;
- Defense Power é decomposto em Fortificações, Guarnição, Vigilância, Suporte, Defesa Arcana e Proteção Econômica;
- Readiness 0–100 é separado do poder bruto;
- estratégia simples: Equilibrada, Agressiva ou Defensiva;
- Sala de Guerra/Centro de Comando explica os números em vez de exibir score opaco.

### Guarnição automática
- Quartel define capacidade e treinamento;
- população real limita os guardas ativos;
- sete pioneiros formam a reserva civil inicial;
- preenchimento é automático por padrão;
- não existe microgestão de arrastar NPC por posto na M5-C.

### Enfermaria / Engenheiro / Cofre / Ressonador
- Enfermaria expõe recuperação e redução de ferimentos para consumo futuro da resolução M7;
- Engenheiro expõe eficiência de reparo e slots de armadilha;
- Cofre expõe proteção de Armazém/Tesouraria;
- Ressonador expõe escudo/estabilidade territorial;
- efeitos participam do Defense Power/Readiness quando aplicável.

### Snapshot defensivo
- snapshot v1 determinístico;
- inclui Layout Version, estágio, estratégia, população, níveis, placements e avaliação;
- hash SHA-256 evita gerar linhas duplicadas em leituras repetidas;
- mutações invalidam snapshot e a M5-C regenera a fotografia atual;
- estratégia defensiva invalida e regenera;
- raids permanecem desligadas.

## Migration

`000037_m5c_defense_and_stage_feedback.sql`

Ela adiciona reconhecimento de promoção, contrato de estratégia e metadados indexados do snapshot.

## Simplificação futura

A revisão confirmou que STR/DEX/INT/VIT + pontos manuais duplicam em parte a especialização já expressa pelas Maestrias. A remoção foi aprovada como direção, mas isolada na fase S1 para exigir migração e balance gate próprios. Ver `HERO_PROGRESSION_SIMPLIFICATION_PLAN.md`.

## Mapa Territorial

A proposta `(x,y)` foi aprovada como fundação do RvR. Será M5-D, antes de Scouting, e está detalhada em `WORLD_COORDINATE_MAP_MASTER_PLAN.md`.

## Próxima sequência

```text
✅ M5-C
➡️ S1    Hero Progression Simplification
⬜ M5-D  World Grid / Mapa Territorial
⬜ M6    Scouting
⬜ M7    Raid Reino vs Reino
```

## Validação executada

```text
go test ./pkg/game                                  PASS
go test -race ./pkg/game                            PASS
go test ./internal/db (stub local lib/pq)           PASS
go run ./cmd/pvpbalance -scenario mechanics_equal_cp -seeds 100   PASS
```

PvP preservado:
- melee × distance: 41/59;
- melee × magic: 54/46;
- distance × magic: 52/48;
- CP 371/371, zero timeouts.

Frontend: os sete arquivos TS/TSX alterados passaram por `transpileModule` do TypeScript sem diagnósticos sintáticos.

Auditores:
- `audit-content`: PASS;
- `audit-camp-content`: PASS — Arena 24×18 / Settlement V5 52×38;
- `audit-economy`: PASS;
- `audit-resource-usage`: PASS;
- `audit-settlement-viewport`: PASS — 42 cenários, crescimento Cidade→Reino 76,4%.

O build completo de `cmd/server` e o build React integral continuam dependendo das dependências omitidas no pacote Repomix (`go.sum`/`node_modules`). No repositório real, execute `go test -race ./...` e `npm run build` antes do merge/release.
