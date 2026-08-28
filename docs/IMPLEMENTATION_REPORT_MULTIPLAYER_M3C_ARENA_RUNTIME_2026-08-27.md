# Relatório de implementação — Multiplayer M3C: ciclo autoritativo da arena

Data: 2026-08-27

## Escopo entregue

- Migration aditiva `000026_pvp_arena_lifecycle.sql`, com confirmação por participante, janela de entrada, último pulso e estado serializado da arena.
- Os dois participantes confirmam a entrada em até 90 segundos. A transação no PostgreSQL promove `ready` para `active` somente quando há duas confirmações.
- `PvPCombatInstance` é independente de `GameSession`: usa o snapshot M3B congelado, inicia com vida/mana completas e nunca lê ou altera expedição, inventário, ouro, recursos, poções automáticas ou progressão.
- A líder global `atlas_pvp_arena_scheduler_v1`, eleita por advisory lock PostgreSQL, avança cada duelo em 250 ms. O estado persistido inclui pulso, posições, vida/mana, cooldowns e PRNG, permitindo restauração determinística após queda da líder.
- O contrato social `PvPCombatSnapshot` contém apenas identidade pública, nível, vida/mana, posição, estado, arquétipo e eventos de combate. Atributos derivados, equipamentos, buffs e skills continuam internos.
- O card pixelado do chat mostra entrada, espera, vida dos dois combatentes e resultado. Em reconexão, o gateway consulta a confirmação individual persistida e recompõe esse estado sem depender da memória do WebSocket.
- Arenas `ready` vencidas são canceladas pela líder global e recebem `MATCH_TIMEOUT` no histórico.

## Regras atuais de combate

- Ataques básicos automáticos, em passos de grade, com intenção simultânea para permitir empate legítimo.
- Mitigação, crítico e cooldown PvP são calculados por regras próprias e não reutilizam diretamente a resolução do PvE.
- Nenhum ouro, item, recurso, XP, maestria, rating, vitória/derrota ou punição é aplicado nesta etapa.
- A expedição segue em paralelo e o jogador não é removido da sessão PvE.

## Limites preservados

- A arena ainda não é renderizada dentro do `GameCanvas`; o card social é uma representação segura de transição.
- Não há habilidades PvP, cura, controle, controle manual, colisão/obstáculos específicos, matchmaking ou ranqueamento.
- Uma partida em `ready` expirada é cancelada; uma partida `active` é retomada pela líder a partir do último pulso salvo.

## Próxima etapa: M3D

1. Renderizar a arena isométrica separada no `GameCanvas`, usando o mesmo estilo pixel art e profundidade das arenas existentes.
2. Manter o PvE visível/íntegro enquanto o duelo é exibido como instância independente.
3. Adicionar feedback visual para ataque, dano e encerramento sem expor dados privados.
4. Só depois introduzir comandos táticos e habilidades PvP versionadas.

## Validação

```bash
cd backend
go test -race ./...

cd ../frontend
npm run build
```