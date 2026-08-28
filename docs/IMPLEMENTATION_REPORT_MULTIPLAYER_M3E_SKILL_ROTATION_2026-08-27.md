# Relatório de implementação — Multiplayer M3E-A: rotação de habilidades PvP

Data: 2026-08-27

## Escopo entregue

- Novos duelos são criados com `rules_version = 2`; partidas já criadas com a
  versão 1 permanecem exclusivamente com ataques básicos.
- `PvPCombatInstance` passa a materializar somente as até duas habilidades
  ativas que já estavam congeladas no snapshot aceito da partida. Chaves
  duplicadas, inexistentes ou incompatíveis com o arquétipo são ignoradas.
- A arena possui uma tabela própria de regras PvP para `whirlwind`,
  `brutal_strike`, `multishot`, `sniper_shot`, `fireball`, `ice_shard`,
  `arcane_nova` e `divine_heal`. Ela não chama `SkillDefinition.Execute` nem
  herda dano em área, maestria, loot, efeitos de expedição ou regras de mobs.
- Cada cast é autoritativo: valida mana, alcance/vida, cooldown e GCD de
  ataque no backend. A Cura Divina só é considerada abaixo de 50% da vida e
  recupera 18% da vida máxima na arena.
- Cooldowns e posição da rotação foram incluídos no estado persistido da arena.
  Uma nova líder continua o mesmo resultado após recuperar um pulso.
- O snapshot público ganhou apenas `skill_key` e `is_healing` nos eventos. O
  `PvPArenaViewport` usa esses campos para desenhar impactos pixelados de cor
  própria e números de cura, sem receber loadout, atributos ou cooldowns do
  adversário.

## Regras de balanceamento desta primeira fatia

As regras PvP são deliberadamente mais contidas que suas equivalentes PvE:

- habilidades em área atingem um único adversário no duelo;
- dano, recarga e custo pertencem à tabela PvP e são versionados com a partida;
- `sniper_shot` preserva o crítico garantido, mas com multiplicador ofensivo
  específico de arena;
- não existe regeneração gratuita de mana, poções automáticas, XP, maestria,
  ouro, item ou recurso durante o duelo.

O objetivo é validar a importância da preparação do build sem transformar o
duelo em uma sequência de cliques por segundo.

## Fronteiras preservadas

- O cliente não escolhe dano, alvo, mana, cooldown, cura ou vitória.
- Nenhuma habilidade muta `GameSession`, expedição, mochila, poções ou buffs
  persistidos do PvE.
- Não foi necessária migration: `runtime_state` já é JSONB e a versão da regra
  já faz parte de `pvp_matches`.

## Próxima fatia: M3E-B

1. desenhar uma interface de estratégia pré-duelo usando apenas loadouts já
   equipados, sem expor dados privados;
2. definir intenções táticas versionadas (por exemplo, prioridade ofensiva ou
   defensiva) enviadas uma vez e validadas pelo backend;
3. introduzir controle e pathfinding somente depois de política explícita para
   desconexão, desistência e reconexão em partida `active`.

## Validação

```bash
cd backend
go test -race ./...

cd ../frontend
npm run build
```