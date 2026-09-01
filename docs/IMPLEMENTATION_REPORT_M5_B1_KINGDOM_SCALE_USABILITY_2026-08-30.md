# Relatório de Implementação — M5-B.1 Kingdom Scale & Usability Hardening

**Data:** 2026-08-30  
**Base:** Repomix `repomix-output(20260830-162535).xml`  
**Status:** implementado e validado nos gates disponíveis no ambiente.

## Objetivo

Fechar as decisões estruturais que precisavam ocorrer antes da M5-C: diferença territorial perceptível Cidade→Reino, compatibilidade de saves, contrato territorial único, navegação por construções, QA de viewport e especificação canônica do Reino vs Reino.

## Implementado

### Territory V5
- `CampLayoutVersion = 5`;
- mundo máximo `52×38`;
- Cidade permanece `40×28`;
- Reino passa a `52×38`;
- salto de área: `1120 → 1976` tiles (+76,4%);
- bounds dos demais estágios continuam centralizados e preservam seus tamanhos.

### Migration 000036
- amplia constraints para X 0..51 / Y 0..37;
- migra apenas saves V4 com `+4 X / +3 Y`;
- incrementa `state_revision`;
- invalida snapshots defensivos ativos antigos.

### Contrato territorial backend-authoritative
- novo `SettlementTerritoryContract` no GameCatalog;
- inclui `layout_version`, mundo máximo e dimensões dos seis estágios;
- frontend configura sua geometria a partir do contrato;
- `CampLayoutRegistry` não possui mais tabela manual `SettlementStageBounds`;
- bounds são calculados centralmente.

### Interação com construções
- hover/click/drag passam a ser semânticas distintas;
- threshold de 6px separa clique de drag;
- Muralha/Portão passam a possuir hit regions e são clicáveis, nunca arrastáveis;
- tooltip mostra descrição, nível, efeitos e ação;
- `BuildingInteractionRegistry` centraliza deep-links.

### Deep-links
- Armazém → Depósito;
- Cozinha → aba Cozinha;
- Alquimia → aba Alquimia;
- estruturas defensivas → Centro de Comando;
- demais estruturas básicas → Gestão do Acampamento.

### Centro de Comando
Primeiro shell de navegação para:
- visão geral;
- fortificações;
- guarnição;
- proteção;
- recuperação;
- cárcere;
- engenharia;
- inteligência;
- defesa arcana.

A M5-C preencherá Defense Power/Readiness/Snapshot. M6 preenche scouting. M7 preenche raid real.

### Identidade visual do Reino
- anel viário exterior;
- pátio militar;
- bandeiras junto ao acesso principal;
- terreno V5 ampliado.

### QA
- `audit-settlement-viewport.mjs` adiciona 42 cenários matemáticos (6 estágios × 7 resoluções);
- valida Territory V5, contrato, salto Cidade→Reino e proteção de zoom;
- `audit-camp-content` atualizado para V5/52×38;
- F8 exibe overlay leve de FPS/frame time, prédios e moradores para stress manual.

## Validação

Executado com sucesso:

```text
go test ./pkg/game
go test -race ./pkg/game
go run ./cmd/pvpbalance -scenario mechanics_equal_cp -seeds 100
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
node tools/audit-economy.mjs
node tools/audit-resource-usage.mjs
node tools/audit-settlement-viewport.mjs
```

Balance gate preservado:
- melee × distance = 41/59;
- melee × magic = 54/46;
- distance × magic = 52/48;
- CP 371/371;
- zero timeouts.

Os arquivos TS/TSX alterados foram verificados com `TypeScript.transpileModule`, sem diagnósticos sintáticos.

## Limitações do ambiente

O Repomix é um subset do repositório e não inclui `node_modules`, builds e outros arquivos ignorados. O build completo `npm run build` deve ser executado no repositório real. O mesmo vale para a integração completa de `cmd/server` quando dependências/go.sum não estiverem disponíveis no pacote.

## Próximo passo

**M5-C — Defense Power, Readiness, Guarnição, Engenheiro, Ferimentos/Enfermaria, Proteção Econômica, Ressonador e Snapshot defensivo versionado.**

Scouting continua M6 e a raid real continua M7.
