# Reino do Avesso — S1 Hero Progression Simplification

**Data:** 2026-09-01  
**Status:** concluída nos gates disponíveis no pacote Repomix

## Objetivo

Eliminar a duplicidade entre atributos primários manuais e Maestrias sem destruir compatibilidade de saves.

## Entregue

- STR/DEX/INT/VIT deixam de participar das fórmulas de gameplay;
- `UnspentPoints` deixa de crescer no level-up;
- `ALLOCATE_STAT` é removido do fluxo do jogador;
- UI/tutorial/onboarding deixam de ensinar distribuição manual;
- equipamentos usam bônus semânticos (`MeleePowerBonus`, `RangedPowerBonus`, `MagicPowerBonus`);
- itens legados são normalizados ao carregar;
- criação de personagem grava a versão de progressão atual;
- presets QA deixam de inflar atributos legados;
- colunas antigas permanecem temporariamente apenas como compatibilidade/rollback.

## Validação

- `go test ./pkg/game`: PASS
- `go test -race ./pkg/game`: PASS
- auditorias de conteúdo/economia/recursos: PASS
- balance gate PvP, 100 seeds: melee×distance 41/59; melee×magic 54/46; distance×magic 52/48; CP 371/371; 0 timeouts.

O build integral do servidor/frontend deve ser repetido no repositório real porque o Repomix não contém `go.sum`/`node_modules`.
