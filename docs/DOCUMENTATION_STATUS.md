# Status da documentação — Reino do Avesso

Data da revisão: **2026-08-30**  
Checkout auditado: `/l/disk0/filipev/Projetos/atlas/atlas`

Este documento é o índice de navegação da documentação. Quando um plano antigo
divergir do código, o código e este status prevalecem. Os relatórios datados
continuam preservados como registro histórico da entrega em que foram escritos.

## Estado atual verificável

| Área | Estado atual | Fonte no código |
|---|---|---|
| Identidade do produto | Reino do Avesso; `Atlas` permanece em nomes internos e compatibilidade | `frontend/src/App.tsx`, `backend/pkg/game/game_catalog.go` |
| Catálogo | versão `2026.08-performance-v2-equipment-identity-v1` | `backend/pkg/game/game_catalog.go` |
| Conteúdo | 9 regiões, 40 monstros/bosses, 40 perfis de loot, 111 templates e 40 visuais | `node tools/audit-content.mjs` |
| Profissões/economia | 13 profissões, 6 de coleta e 7 de artesanato; 6 expedições de coleta | `node tools/audit-economy.mjs` |
| Assentamento | Layout V4: mundo 44x32 com bounds progressivos 24x18 -> 44x32; 17 construções canônicas após M5-B, incluindo fortificações de perímetro | `backend/pkg/game/building_registry.go`, `backend/pkg/game/defense_building_registry.go`, `backend/pkg/game/camp_layout.go` |
| Arenas isométricas | arenas PvE/PvP permanecem em `ISO_ARENA_GEOMETRY` 24x18; assentamento usa geometria territorial V4 independente até 44x32 | `frontend/src/game/IsoWorldGeometry.ts`, `frontend/src/game/camp/CampLayoutRegistry.ts`, `backend/pkg/game/camp_layout.go` |
| Outras arenas | continuam com renderers legados até receberem geometria e terreno próprios | `frontend/src/game/registries/BiomeRegistry.ts` |
| Renderização | Canvas 2D com cache offscreen e interpolação; PixiJS continua como dependência instalada, mas não é o renderer atual do jogo | `frontend/src/components/Viewport/GameViewport.ts`, `frontend/src/game/renderers/` |
| Combat Feel | CFF-A concluída: hit stop visual, sparks/bursts, screen shake acessível, critical/death impact e reações visuais compartilhadas entre PvE/PvP; CFF-B/C ficam após M7 | `frontend/src/game/effects/CombatPresentationSystem.ts`, `docs/COMBAT_FEEL_MASTER_PLAN.md` |
| Persistência | 35 arquivos SQL embutidos; migrations canônicas atualmente chegam a `000035_settlement_stage_foundation.sql`, incluindo `000032_pvp_balance_qa.sql` | `backend/migrations/`, `backend/internal/db/migrator.go` |
| WebSocket | ticket curto single-use para conexão e deltas `character_delta` em caminhos quentes | `backend/cmd/server/security.go`, `frontend/src/hooks/useGameSocket.ts` |
| Multiplayer/realtime | M1-M4 concluídas; PvP v4 reconciliado com balance gate CP-normalizado, telemetria e restore; matchmaking casual/ranqueado, temporadas, honra, forfeit e integridade permanecem server-authoritative | `backend/cmd/server/multiplayer.go`, `backend/cmd/server/pvp_arena_scheduler.go`, `backend/pkg/game/pvp_combat.go`, `backend/pkg/game/pvp_skill_rules.go`, `backend/internal/db/multiplayer.go`, `frontend/src/components/Viewport/PvPArenaViewport.ts` |
| Prólogo | seis telas, versionado e exibido uma vez por personagem no navegador; pode ser revisto pelo menu | `frontend/src/components/Prologue/`, `frontend/src/App.tsx` |

## Auditorias executadas

Na revisão de 2026-08-27, os quatro auditores retornaram zero erros:

```bash
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
node tools/audit-economy.mjs
node tools/audit-resource-usage.mjs
```

Resultados resumidos:

- `audit-content`: 9 regiões, 40 monstros/bosses, 40 perfis, 111 itens e 40 visuais;
- `audit-camp-content`: território V4 44x32, arena 24x18 e seis estágios territoriais validados;
- `audit-economy`: 13 profissões, 6 expedições de coleta e cobertura de crafting/assentamento;
- `audit-resource-usage`: nenhum recurso obtível sem origem e destino; apenas `abyssal_ember` e `trophy_abyss_avenger` estão reservados para conteúdo futuro.

## Mapa de documentos

### Canônicos e operacionais

- [`README.md`](../README.md): instalação local, Docker, QA e verificações rápidas.
- [`KNOWLEDGE_BASE.md`](KNOWLEDGE_BASE.md): regras de domínio e arquitetura viva.
- [`ARCHITECTURE_MODULAR.md`](ARCHITECTURE_MODULAR.md): registries, contratos e extensibilidade.
- [`ARENA_TERRAIN_SYSTEM.md`](ARENA_TERRAIN_SYSTEM.md): grade, colisão, profundidade e terrenos.
- [`COMBAT_FEEL_MASTER_PLAN.md`](COMBAT_FEEL_MASTER_PLAN.md): roadmap, invariantes e escopo CFF-A/B/C.
- [`MIGRATION_RUNBOOK_ECONOMY_V2.md`](MIGRATION_RUNBOOK_ECONOMY_V2.md): operação de migrations, rollout e rollback.
- [`ATLAS_GAME_SPECIALIST_MANUAL.md`](ATLAS_GAME_SPECIALIST_MANUAL.md): práticas para implementar conteúdo novo.
- [`REFACTOR_CHANGELOG.md`](REFACTOR_CHANGELOG.md): histórico consolidado e últimas entregas.

### Relatórios históricos preservados

Os arquivos `IMPLEMENTATION_REPORT_*.md`, `RELEASE_MANIFEST_SETTLEMENT_V1.md`,
`Relatorio_Code_Review_Atlas_V5.md` e `EQUIPMENT_BALANCE_MATRIX.csv` registram
uma entrega, revisão ou matriz específica. Eles não devem ser reescritos para
parecer o estado atual; consulte este índice quando números, migrations ou
escopo tiverem evoluído.

### Planos e blueprints históricos

`IMPLEMENTATION.md`, `GAME_SPECIFICATION.md`, `# REFACT V2.md`,
`# MASTER IMPLEMENTATION BLUEPRINT: CORE .md`, `# ESPECIFICAÇÃO DE
REFATORAÇÃO: COMBATE .md`, `# VISUAL-GAME.md`, `ATLAS_PLANO_REFATORAMENTO_CIRURGICO.md`,
`PLANO_MESTRE_REFATORACAO_ARQUITETURAL_ATLAS_V5.md`,
`PLANO_CONTEXTO_ANTIGRAVITY_ASSENTAMENTO_V1.md` e os planos de acampamento
continuam úteis para decisões de design, mas foram escritos antes de todas as
entregas atuais. Não são instruções literais para trocar Canvas 2D por PixiJS,
recriar `WORLD_REGIONS`, reduzir a grade para 15x8 ou voltar às migrations
antigas.

## Decisões desta revisão

- Nenhum arquivo foi removido: os planos e relatórios antigos preservam o
  raciocínio de produto e podem ser úteis para futuras fases.
- Números mutáveis foram corrigidos nos documentos canônicos, não nos relatórios
  históricos.
- A afirmação de que somente a Floresta é isométrica foi corrigida: a Vila do
  Shereque também possui renderer, geometria e terreno isométricos próprios.
- A documentação agora distingue **dependência instalada** de **tecnologia
  efetivamente usada**: o jogo atual renderiza em Canvas 2D.
- A lista de migrations canônicas deve ser lida no diretório `backend/migrations/`; migration aplicada nunca deve ser editada. Mudanças futuras são sempre aditivas.
- CFF-A foi inserida antes da M5-B por ser presentation-only; CFF-B/C permanecem após M7 porque alteram regras de combate.
## Atualização 2026-08-30 — M5-B.1

- Territory V5: Reino 52x38; Cidade permanece 40x28; Layout Version 5.
- Contrato territorial é backend-authoritative via GameCatalog (`settlement_territory`).
- Hover/click/drag de construções e deep-links são parte da fundação oficial de UX.
- `docs/KINGDOM_VS_KINGDOM_MASTER_PLAN.md` é a fonte canônica para M5-C/M6/M7.
- Próxima etapa: M5-C. Raid real permanece M7.
