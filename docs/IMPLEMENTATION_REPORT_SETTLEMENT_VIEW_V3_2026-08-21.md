# Atlas MMORPG — Implementation Report: Settlement View V3

Data: 2026-08-21
Base: `repomix-output(20260821-015636).xml`

## Objetivo

Dar prioridade visual ao jogo e permitir que o assentamento isométrico cresça sem ser encoberto por HUD, construções superdimensionadas ou dezenas de moradores simultâneos.

## Alterações implementadas

1. Dashboard responsivo game-first: 2/8/2 colunas em `xl`.
2. Canvas lógico ampliado de 680x300 para 960x420.
3. Terreno isométrico ampliado de 16x12 para 24x18.
4. Migration V3 preservando layouts existentes com deslocamento +4/+3.
5. Escala visual de prédios separada do footprint de colisão.
6. Renderers de Cabana, Fonte, Fogueira, Armazém, Bancada e Cozinha respeitam `scale`.
7. Cards de construção reutilizam o mesmo Canvas renderer do cenário.
8. Prédios e NPCs compartilham depth sorting.
9. Máximo de 10 moradores renderizados ao mesmo tempo, sem reduzir população real.
10. Moradores ociosos revezam a cada 30s; trabalhadores em coleta não aparecem na vila.
11. Rotas de caminhada expandidas e pontos de trabalho vinculados a prédios relevantes.
12. Painéis laterais e notificações compactados, mantendo acesso às funções anteriores.

## Compatibilidade

- IDs, `slot_key`, `building_key`, níveis e obras são preservados.
- A migration não recria layouts personalizados: apenas translada coordenadas antigas para criar margem no terreno maior.
- O backend continua autoritativo na validação de bounds, rotação e colisão.

## Validações executadas

- `go test ./pkg/game`: PASS.
- `node tools/audit-content.mjs`: PASS / 0 erros.
- `node tools/audit-camp-content.mjs`: PASS / 0 erros / grid 24x18 sincronizado.
- `node tools/audit-economy.mjs`: PASS / 0 erros.
- TypeScript/TSX parse: 88 arquivos / 0 erros sintáticos.

## Validações bloqueadas pelo pacote de origem

- `go test ./...`: bloqueado porque `backend/go.sum` não foi enviado; o Go interrompe antes de compilar pacotes com dependências externas.
- `npm run build`: dependências não estão instaladas e não há `package-lock.json`. Uma tentativa de `npm install --ignore-scripts` excedeu o timeout e não gerou lockfile.

## Arquivos centrais

- `frontend/src/components/Dashboard/DashboardGrid.tsx`
- `frontend/src/components/Viewport/GameCanvas.tsx`
- `frontend/src/components/Viewport/GameViewport.ts`
- `frontend/src/game/camp/CampLayoutRegistry.ts`
- `frontend/src/game/camp/CampSceneRenderer.ts`
- `frontend/src/components/Camp/BuildingScenePreview.tsx`
- `frontend/src/game/renderers/biomes/forest.ts`
- `backend/pkg/game/camp_layout.go`
- `backend/internal/db/camp_layout.go`
- `backend/migrations/000018_expand_settlement_space.sql`