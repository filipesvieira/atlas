# IMPLEMENTATION REPORT — Multiplayer M4-A Ranked Seasons

Data: 2026-08-28

## Objetivo

Iniciar a Etapa M4 sem misturar duelo amistoso, matchmaking casual e progressão competitiva. A M4-A introduz uma Arena Ranqueada sazonal server-authoritative, com placements, ladder, honra, recompensas persistentes e proteções iniciais contra win-trading.

## Review da UI recebida

A revisão comparou o checkout atual com o pacote M3F entregue anteriormente.

### Melhorias aprovadas

- `CommunicationConsole` substituiu corretamente o antigo card isolado de logs + chat mundial flutuante.
- Logs e Global compartilham o mesmo espaço, reduzindo sobreposição no viewport.
- Abas Clã/Reino/DM são explicitamente preparatórias e não fingem possuir protocolo de backend.
- HP/MP, skills, posturas e suprimentos foram movidos para overlay dentro do `GameCanvas`, aproximando a leitura do combate do padrão de MMORPG atual.
- O HUD PvE é ocultado durante a Arena PvP, evitando duas camadas de barras simultâneas.

### Correções aplicadas durante o review

- removido `WorldChatPanel.tsx`, que ficou órfão após a entrada do `CommunicationConsole`;
- `window.confirm` de bloquear/denunciar foi substituído por confirmação visual do próprio jogo;
- `PlayerInteractionLayer` foi desminificado/refatorado para suportar crescimento de Arena/Trading;
- múltiplos convites pendentes agora são sinalizados em vez de a UI fingir que existe somente um;
- corrigida reconexão de matchmaking com `challenge_id = NULL` em `GetPendingPvPMatchNotice`;
- fila Casual -> Ranqueada reseta `queued_at`, impedindo herdar tolerância de matchmaking acumulada em outro modo.
- fechamento/claim de recompensa sazonal agora materializa o `SELECT` antes dos `INSERT/UPDATE` na mesma transação, evitando depender de múltiplos `Rows` simultâneos no `lib/pq`.

## M4-A — Entregas

### 1. Temporadas

Migration `000030_pvp_ranked_seasons.sql` adiciona:

- `pvp_seasons`;
- `pvp_season_profiles`;
- `pvp_rewards`;
- `pvp_cosmetic_unlocks`;
- metadados ranqueados em `pvp_matches` e `pvp_match_participants`;
- `queue_mode`/`season_id` na fila existente.

Uma temporada dura inicialmente 28 dias. O scheduler global de Arena executa manutenção do ciclo de temporada. Uma temporada vencida só fecha depois que partidas `ready/active` já seladas forem resolvidas, evitando gerar recompensa antes do último resultado.

### 2. Rating sazonal e placements

- casual mantém o MMR geral M3F;
- ranqueada possui rating sazonal separado;
- 5 partidas de posicionamento antes de aparecer na ladder;
- soft reset entre temporadas mantém metade da distância para 1000, limitado a 700..1500.

Tiers iniciais:

- Bronze: < 1000;
- Prata: 1000+;
- Ouro: 1200+;
- Platina: 1400+;
- Diamante: 1600+;
- Mestre: 1800+.

Esses cortes são configuração inicial para playtest, não balanceamento final.

### 3. Honra

Base antes do anti-repeat:

- vitória: 30;
- empate: 14;
- derrota: 6.

Honra é sazonal e não altera economia PvE.

### 4. Anti-win-trading inicial

Somente `ranked_matchmaking` altera temporada. Desafio direto não conta.

Proteções:

- dois personagens da mesma conta não podem ser pareados pela fila;
- mesma dupla usa retorno decrescente em janela de 24h;
- 1º/2º confronto: 100%;
- 3º: 75%;
- 4º: 50%;
- 5º: 25%;
- 6º em diante: 0% de rating sazonal/honra;
- multiplicador aplicado e persistido no match/histórico.

### 5. Ladder

Novo comando `REQUEST_PVP_LADDER` retorna até 50 colocados, ordenados por:

1. rating;
2. honra;
3. vitórias;
4. atualização mais antiga como desempate estável.

Somente jogadores com placements completos aparecem.

### 6. Recompensas sazonais

Ao fechar a temporada, cada jogador posicionado recebe um bundle idempotente baseado no tier. A M4-A persiste direitos de:

- título;
- banner (Prata+);
- cosmético (Platina+).

`CLAIM_PVP_SEASON_REWARDS` converte o bundle em `pvp_cosmetic_unlocks` de forma idempotente. A seleção/renderização final dos títulos, banners e cosméticos fica para o refinamento visual posterior.

### 7. UI Arena

`PlayerInteractionLayer` agora separa:

- Casual;
- Ranqueada;
- Histórico.

A aba Ranqueada mostra temporada, tempo restante, placements, tier, rating, honra, fila e ladder. Match `ready` ranqueado é identificado no modal antes da confirmação.

## Compatibilidade

- M3A..M3F permanecem válidas;
- duelos diretos continuam amistosos;
- casual continua usando o matchmaking M3F;
- runtime de combate continua o mesmo M3E-B;
- M4 altera progressão competitiva, não cálculo de dano.

## Validação executada

- `go test ./pkg/game` — passou;
- `go test -modfile=/tmp/atlas-test.mod ./internal/db` — passou com stub local apenas para o blank import `github.com/lib/pq` ausente do Repomix;
- TypeScript alterado passou por `typescript.transpileModule` sem erro sintático.

O build completo de `cmd/server`/React ainda depende das dependências externas e `go.sum/node_modules` que não acompanham o Repomix.

## Pendências dentro da M4

### M4-B

- snapshot defensivo assíncrono opcional para oponente offline;
- política formal de abandono/desconexão para ranked (forfeit/grace window);
- telemetria de distribuição de tiers e repeat-opponent;
- equip/render final de títulos, banners e cosméticos;
- eventual painel de recompensa de fim de temporada mais rico.

A base de temporadas, ladder, honra e anti-win-trading já está preparada para essas extensões.
