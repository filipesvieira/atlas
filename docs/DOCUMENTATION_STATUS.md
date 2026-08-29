# Status da documentação — Reino do Avesso

Data da revisão: **2026-08-27**  
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
| Assentamento | 7 construções canônicas, layout V3 em grade 24x18 | `backend/pkg/game/building_registry.go`, `backend/pkg/game/camp_layout.go` |
| Arenas isométricas | acampamento, Floresta e Vila do Shereque usam `ISO_ARENA_GEOMETRY`; Floresta e Shereque possuem terreno/colisão próprios | `frontend/src/game/registries/BiomeRegistry.ts`, `backend/pkg/game/arena_terrain.go` |
| Outras arenas | continuam com renderers legados até receberem geometria e terreno próprios | `frontend/src/game/registries/BiomeRegistry.ts` |
| Renderização | Canvas 2D com cache offscreen e interpolação; PixiJS continua como dependência instalada, mas não é o renderer atual do jogo | `frontend/src/components/Viewport/GameViewport.ts`, `frontend/src/game/renderers/` |
| Persistência | 30 arquivos de migration embutidos, até `000030_pvp_ranked_seasons.sql` | `backend/migrations/`, `backend/internal/db/migrator.go` |
| WebSocket | ticket curto single-use para conexão e deltas `character_delta` em caminhos quentes | `backend/cmd/server/security.go`, `frontend/src/hooks/useGameSocket.ts` |
| Multiplayer/realtime | chat mundial persistente, Pub/Sub Redis, presença global TTL, ticket WebSocket compartilhado, schedulers com liderança PostgreSQL, desafios PvP, confirmação bilateral, duelo isolado com recuperação por pulso persistido, matchmaking casual e ranqueado, temporadas/ladder/honra M4-A; arena isométrica visual no Canvas, block/report, perfil PvP e stream social separado | `backend/cmd/server/multiplayer.go`, `backend/cmd/server/pvp_arena_scheduler.go`, `backend/pkg/game/pvp_combat.go`, `backend/pkg/game/pvp_skill_rules.go`, `backend/internal/db/multiplayer.go`, `frontend/src/components/Viewport/PvPArenaViewport.ts` |
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
- `audit-camp-content`: 88 recursos registrados, 40 perfis de monstros, 7 construções canônicas, layout 24x18 V3;
- `audit-economy`: 13 profissões, 6 expedições de coleta e cobertura de crafting/assentamento;
- `audit-resource-usage`: nenhum recurso obtível sem origem e destino; apenas `abyssal_ember` e `trophy_abyss_avenger` estão reservados para conteúdo futuro.

## Mapa de documentos

### Canônicos e operacionais

- [`README.md`](../README.md): instalação local, Docker, QA e verificações rápidas.
- [`KNOWLEDGE_BASE.md`](KNOWLEDGE_BASE.md): regras de domínio e arquitetura viva.
- [`ARCHITECTURE_MODULAR.md`](ARCHITECTURE_MODULAR.md): registries, contratos e extensibilidade.
- [`ARENA_TERRAIN_SYSTEM.md`](ARENA_TERRAIN_SYSTEM.md): grade, colisão, profundidade e terrenos.
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
- A lista de migrations deve ser lida até `000026`; uma migration aplicada nunca
  deve ser editada. Mudanças futuras precisam ser aditivas.