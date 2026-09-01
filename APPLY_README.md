# APPLY — M5-D Visual Map V2

Base: Repomix `repomix-output(20260901-032946).xml` enviado em 2026-09-01.

Este pacote contém arquivos completos, somente os alterados/novos desta implementação.
Copie-os sobre o repositório preservando os caminhos.

## Alteração principal

O Mapa Territorial deixa de usar cards HTML absolutos sobre uma grade e passa a usar um renderer Canvas próprio:

- cada coordenada `(x,y)` ocupa uma célula inteira;
- terreno procedural usa a paleta visual canônica do jogo;
- estágios territoriais possuem miniaturas pixel-art desenhadas com primitivas isométricas existentes;
- pan, zoom, busca, seleção, hover, tooltip e lista lateral permanecem;
- zoom é ancorado no cursor;
- modal aproveita melhor telas desktop/Tauri;
- nenhuma regra do backend, distância ou informação privada foi alterada.

## Ordem de aplicação

1. `frontend/src/game/world/TerritorialMapRenderer.ts` (novo)
2. `frontend/src/components/Camp/TerritorialMapPanel.tsx`
3. `frontend/src/components/Camp/TerritorialMapModal.tsx`
4. documentos em `docs/`

## Validação executada neste pacote

- `go test ./pkg/game` — PASS
- `go test -race ./pkg/game` — PASS
- `node tools/audit-content.mjs` — PASS
- `node tools/audit-camp-content.mjs` — PASS
- `node tools/audit-economy.mjs` — PASS
- `node tools/audit-resource-usage.mjs` — PASS
- `node tools/audit-settlement-viewport.mjs` — PASS
- transpile sintático dos 3 arquivos TS/TSX alterados — PASS
- type-check isolado de `TerritorialMapRenderer.ts` com `tsc` — PASS

## Gate no repositório real

O Repomix não inclui `node_modules`/tipos React nem `go.sum` completo. Depois de aplicar no repositório real:

```bash
cd backend
go test -race ./...

cd ../frontend
npm run build
```

Depois valide manualmente:

- abrir mapa pelo botão global;
- abrir pelo Centro de Comando;
- pan/zoom e zoom com roda do mouse;
- duplo clique para foco;
- busca por nome e `x,y`;
- seleção/lista lateral;
- cluster de assentamentos próximos sem sobreposição;
- presets QA;
- criação de personagem novo;
- assentamento legado reconciliado;
- ausência de Defense Power/guarnição/recursos privados no payload público.