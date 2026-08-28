# Relatório de implementação — Multiplayer M3B: partida e snapshots PvP

Data: 2026-08-27

## Escopo entregue

- Migration aditiva `000025_pvp_match_snapshots.sql`.
- Uma única `pvp_matches` é criada para cada desafio aceito; repetir a ação devolve a mesma partida, sem duplicar participantes ou eventos.
- `pvp_match_participants` guarda o snapshot JSONB de ambos os combatentes e `pvp_match_events` inicia a trilha com `MATCH_READY`.
- O snapshot é calculado dentro de transação serializável, com leitura compartilhada do personagem, inventário, postura, skills compatíveis com a classe e buffs ativos.
- Vida e mana do duelo começam completas, sem recuperar, consumir ou alterar a vida e mana persistidas da expedição.
- O stream social avisa os dois participantes com `PVP_MATCH_READY`, porém carrega somente `PvPMatchNotice`: id, arena, status, versão de regras e criação. O snapshot completo nunca sai do backend.
- O chat mostra um card pixelado de “Arena preparada”, sem alegar que a luta já começou.

## Limites preservados

- A partida nasce em `ready`; ainda não existe `PvPCombatInstance`, loop de 200–250 ms, movimentação de arena, dano PvP, rating ou recompensa.
- A expedição PvE continua íntegra: não há troca de sessão, bloqueio de inventário, perda de item, ouro ou recursos.
- Não há matchmaking automático nesta etapa.

## Próxima etapa: M3C

1. promover `ready` para `active` quando os dois clientes confirmarem presença;
2. criar `PvPCombatInstance` isolada do `GameSession` PvE;
3. executar tick autoritativo de 200–250 ms e deltas específicos da arena;
4. tratar desconexão, timeout, conclusão e persistência do resultado;
5. só então conectar a arena isométrica e regras de dano/cura PvP.

## Validação

```bash
cd backend
go test -race ./...

cd ../frontend
npm run build
```