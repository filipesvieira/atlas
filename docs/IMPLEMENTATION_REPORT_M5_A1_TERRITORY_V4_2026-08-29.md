# IMPLEMENTATION REPORT — M5-A.1 Expansão Territorial V4

Data: 2026-08-29

## Objetivo

Preparar o assentamento para crescer de Acampamento até Reino sem comprimir as novas construções da M5-B no grid legado `24x18`, preservando os layouts já personalizados pelos jogadores e sem alterar arenas PvE/PvP.

## Decisão arquitetural

A geometria que antes era compartilhada foi separada:

- arena de combate: `24x18`, contrato preservado;
- mundo do assentamento: `44x32`, Layout V4.

O terreno máximo existe como coordenada autoritativa, mas apenas um retângulo central fica liberado por estágio.

| Estágio | Área construtiva | Offset no mundo 44x32 |
|---|---:|---:|
| Acampamento | 24x18 | 10,7 |
| Posto | 28x20 | 8,6 |
| Vilarejo | 32x22 | 6,5 |
| Vila | 36x24 | 4,4 |
| Cidade | 40x28 | 2,2 |
| Reino | 44x32 | 0,0 |

## Compatibilidade V3

`000034_settlement_territory_v4.sql` amplia os constraints de coordenadas e, apenas para `layout_version < 4`, desloca todos os prédios por `+10 X / +7 Y`. Como o vetor é uniforme, distância, vizinhança, rotação e composição do layout antigo são preservadas. Depois a linha do camp é marcada como Layout V4.

## Placement e drag-and-drop

A validação continua server-authoritative. `ValidateCampPlacementForStage` e `FindFirstFreeCampPlacementForStage` aplicam footprint, rotação, colisão e agora também os limites territoriais do estágio. Os wrappers antigos permanecem para compatibilidade interna e representam o mundo máximo/Reino.

## Frontend e câmera

`ISO_ARENA_GEOMETRY` continua em 24x18. Foi criada `SETTLEMENT_WORLD_GEOMETRY` 44x32 e o renderer do acampamento passou a usar essa geometria. O viewport do assentamento ganhou:

- fit automático por estágio;
- zoom mínimo 0.65x e máximo 1.45x;
- roda do mouse para zoom;
- pan com botão do meio ou `Alt+arrastar`;
- clamp pelo retângulo territorial desbloqueado;
- camada visual que escurece área ainda bloqueada e marca o limite atual.

O clique de movimento do herói em arena foi separado explicitamente para continuar convertendo `screen -> tile` pela geometria da arena, evitando regressão quando o assentamento passou a 44x32.

## Moradores

O renderer não tenta desenhar toda a população de um Reino. O teto de moradores simultaneamente visíveis cresce por estágio, de 10 no Acampamento a 20 no Reino, enquanto rotas e pontos de trabalho usam as coordenadas relativas ao território atual. O painel administrativo continua sendo a fonte para ver a população total.

## QA

`ApplyDeveloperPresetMode` oferece:

- `progress`: loop normal com recursos/desbloqueios;
- `city`: Cidade + ~18 moradores + catálogo de construções no máximo;
- `kingdom`: Reino + ~30 moradores + catálogo completo;
- `kingdom_stress`: Reino + ~40 moradores + cenário de stress visual.

Os cenários avançados iteram `ListBuildingDefinitions()`, portanto fortificações futuras da M5-B entram automaticamente quando forem registradas.

## Auditoria

`tools/audit-camp-content.mjs` deixa de assumir um único grid e valida:

- arena = 24x18;
- settlement world = 44x32;
- LayoutVersion = 4;
- seis retângulos de estágio;
- paridade frontend/backend.

## Validação executada

- `go test ./pkg/game` — aprovado;
- `go test -race ./pkg/game` — aprovado;
- `go test -modfile=/tmp/atlas_validate.mod ./internal/db -run '^$'` — type-check aprovado com stub local apenas para o blank import `lib/pq`;
- `go run ./cmd/pvpbalance -scenario mechanics_equal_cp -seeds 100` — aprovado, preservando `60/40`, `58/42` e `52/48`, todos CP `371/371` e zero timeout;
- transpilação TypeScript dos 11 arquivos TS/TSX alterados — aprovada;
- `node tools/audit-camp-content.mjs` — aprovado (`arenaGrid=24x18`, `settlementWorld=44x32`, 6 estágios, V4);
- `node tools/audit-content.mjs` — aprovado;
- `node tools/audit-economy.mjs` — aprovado;
- `node tools/audit-resource-usage.mjs` — aprovado.

O pacote Repomix não inclui `go.sum`, `node_modules` e lockfiles suficientes para homologar `go test ./...` e `npm run build` completos neste ambiente. A tentativa de `go test ./cmd/server` interrompe antes da compilação solicitando entries ausentes de `lib/pq`, Chi, CORS, JWT, Gorilla WebSocket, Redis e `x/crypto`. Esses gates devem ser executados no repositório oficial.

## Próxima etapa

M5-B implementará as estruturas defensivas já sobre o território definitivo: perímetro/Muralha, Portão, Torre de Vigia, Quartel, Cofre, Enfermaria, Cárcere, Oficina do Engenheiro, Sala de Guerra e Ressonador.
