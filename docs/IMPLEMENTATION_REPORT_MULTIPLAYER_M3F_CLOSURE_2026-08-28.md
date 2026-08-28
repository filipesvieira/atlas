# IMPLEMENTATION REPORT — Multiplayer M3F Closure

Data: 2026-08-28

## Objetivo

Fechar a Etapa M3 antes de avançar para Arena ranqueada: retirar responsabilidades PvP do chat, aplicar resultado competitivo idempotente, disponibilizar histórico/replay resumido e introduzir matchmaking seguro por Rating + Combat Power.

## Entregas

### 1. Player Interaction Layer

- `WorldChatPanel` voltou a tratar somente chat/presença/perfil.
- convite recebido abre modal de aceitar/recusar na tela;
- partida `ready` abre modal independente para estratégia e confirmação;
- barras/estado do combate deixam de ser renderizados no chat; o Canvas permanece a fonte visual da luta;
- `PlayerInteractionLayer` vira o ponto de extensão para futuros `TRADE_INVITE`, `TRADE_READY` e outras interações jogador-jogador.

### 2. Rating idempotente

Migration `000029_pvp_m3f_closure.sql` adiciona `rating_applied_at`, `rating_before`, `rating_after` e `combat_power`.

Ao persistir um match `completed`, a mesma transação:

1. encerra a atividade PvP;
2. calcula Elo (`K=24`);
3. atualiza wins/losses/draws;
4. grava rating final no participante;
5. marca `rating_applied_at`;
6. registra `RATING_APPLIED` no event log.

Retries não reaplicam resultado.

### 3. Histórico e replay resumido

Novos comandos:

- `REQUEST_PVP_HISTORY`;
- `REQUEST_PVP_REPLAY`.

O histórico mostra adversário, resultado, delta de rating e Combat Power. O replay é uma leitura ordenada de `pvp_match_events`; não há vídeo nem exposição de equipamento/atributos privados.

### 4. Matchmaking

Novos comandos:

- `JOIN_PVP_MATCHMAKING`;
- `LEAVE_PVP_MATCHMAKING`;
- `REQUEST_PVP_MATCHMAKING_STATUS`.

A fila sela um snapshot calculado pelo servidor e compara:

- Rating;
- Combat Power;
- tempo de espera.

A tolerância cresce progressivamente. Um pareamento gera uma partida `ready` de origem `matchmaking`; ambos ainda precisam confirmar presença antes de `active`.

Invariantes:

- duelo direto remove os participantes da fila;
- fila ignora personagens que já possuem match `ready/active`;
- entradas expiram após 30 minutos;
- cliente nunca informa Combat Power.

## Balanceamento inicial do matchmaking

- tolerância inicial de rating: 100;
- +50 de rating por minuto, teto 400;
- tolerância inicial de Combat Power: 15%;
- +5 p.p. por minuto, teto 45%.

São parâmetros de primeira versão e deverão ser refinados por telemetria/playtest.

## Validação

- `go test ./pkg/game` passou;
- `go test -modfile=test.mod ./internal/db` passou com stub local apenas para o driver `lib/pq`;
- arquivos TypeScript alterados passaram por `typescript.transpileModule` sem erros sintáticos;
- build completo do frontend permanece dependente de `node_modules`/tipagens React, ausentes no Repomix.

## Próxima etapa

M4 — Arena ranqueada: temporadas, recompensas cosméticas/honra, proteção anti-win-trading e políticas de ranking. Refinamento final de layout/chat/HUD fica deliberadamente depois das etapas funcionais, conforme decisão de produto.
