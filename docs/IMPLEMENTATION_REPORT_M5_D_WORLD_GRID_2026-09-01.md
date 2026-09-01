# Reino do Avesso — M5-D World Grid / Mapa Territorial

**Data:** 2026-09-01  
**Status:** implementação funcional e visual concluída; falta somente o gate integral no repositório real antes de marcar a fase como encerrada.

## Objetivo

Dar a cada assentamento uma posição persistente em um mundo `(x,y)` e criar a base pública/cartográfica sobre a qual M6 Scouting e M7 Raid serão construídos.

## Entregue — fundação autoritativa

- migration `000039_m5d_world_grid.sql`;
- `worlds` e coordenadas persistentes/únicas por world;
- alocação por espiral quadrada determinística;
- reconciliação de settlements antigos no startup;
- geração lazy segura para assentamentos criados após o startup;
- distância geométrica pura;
- contrato público sem vazamento de Defense Power, guarnição ou estoque;
- WebSocket `REQUEST_TERRITORIAL_MAP` / `TERRITORIAL_MAP`;
- integração no `KingdomCommandCenterModal` e acesso global pelo modal territorial;
- presets `QA_SELF`, `QA_NEAR`, `QA_MEDIUM`, `QA_FAR` em mundo QA separado.

## Entregue — mapa visual V2

O primeiro mapa funcionava, mas renderizava cada assentamento como um card HTML sobre uma grade. Em aglomerações próximas os cards se sobrepunham e o zoom apenas aumentava a sobreposição.

A visualização foi substituída por um renderer cartográfico em Canvas:

- novo `frontend/src/game/world/TerritorialMapRenderer.ts`;
- cada coordenada `(x,y)` ocupa uma célula territorial completa, sem espaços vazios entre quadrantes;
- terreno procedural determinístico usa a estética existente do jogo (`FOREST_NIGHT_PALETTE`, `WORLD_VISUAL_CONTRACT` e `CAMP_VISUAL_PALETTE`);
- miniaturas dos seis estágios territoriais são desenhadas com as primitivas isométricas já usadas pelas construções do acampamento;
- Acampamento, Posto, Vilarejo, Vila, Cidade e Reino possuem silhuetas distintas;
- célula do próprio jogador recebe leitura dourada e seleção usa cyan;
- proteção territorial possui badge próprio;
- régua de coordenadas acompanha pan/zoom;
- nomes deixam de ocupar permanentemente todas as células: o mapa prioriza miniatura, hover, seleção e painel lateral;
- tooltip no hover, busca, seleção, lista acessível e foco por reino foram preservados;
- zoom usa âncora do cursor e duplo clique aproxima/foca;
- modal territorial foi ampliado para aproveitar melhor telas desktop/Tauri.

## Princípio visual

A referência do Dofus foi usada apenas como princípio de legibilidade cartográfica: grade territorial cheia, leitura clara de coordenadas e elementos integrados à célula. A arte não copia Dofus; o mapa usa a paleta noturna, materiais e pixel-art já canônicos do Reino do Avesso.

## Fora de escopo

- scouting e névoa de inteligência: M6;
- preparação/resolução de raid: M7;
- estradas com efeito logístico real: fase futura; os detalhes de terreno da M5-D são somente apresentação;
- bônus de combate por distância: proibido pelo contrato.

## Validação deste corte

- `go test ./pkg/game`: **PASS**;
- transpile sintático isolado dos três arquivos TS/TSX alterados: **PASS**;
- `tsc` integral não pôde ser executado neste Repomix porque `node_modules`/tipos React não são incluídos no pacote;
- o backend integral continua dependente do `go.sum` real para todos os pacotes.

## Gate final para encerrar M5-D

No repositório real executar:

```text
go test -race ./...
npm run build
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
node tools/audit-economy.mjs
node tools/audit-resource-usage.mjs
node tools/audit-settlement-viewport.mjs
```

Depois realizar QA manual de pan/zoom, busca, presets QA, criação de personagem novo, reconciliação de assentamento legado e ausência de vazamento de dados defensivos.

Se esse gate passar, M5-D pode ser marcada `✅` e a próxima fase é M6 — Scouting.
