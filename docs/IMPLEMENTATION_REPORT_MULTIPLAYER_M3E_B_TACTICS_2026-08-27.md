# Atlas — Multiplayer M3E-B Tactical Arena

Data: 2026-08-27

## Objetivo

Transformar a arena PvP de aproximação linear em um combate tático autoritativo,
com escolha pré-duelo, movimentação por arquétipo e contrapesos explícitos para
melee x distance/magic, sem permitir que o cliente determine dano ou resultado.

## Hotfix de persistência incluído

Foi corrigida a falha observada no encerramento da arena:

`pq: operator does not exist: text = uuid`

`characters.active_pvp_match_id` foi introduzido como TEXT na M3E-A.1, enquanto
`pvp_match_participants.match_id` é UUID. A query de liberação reutilizava `$1`
nas duas comparações, fazendo PostgreSQL inferir o parâmetro como UUID. O encerramento
agora usa casts explícitos `$1::uuid` e `$1::text`.

## Rules version

- M3E-A / skills permanece compatível a partir de `rules_version = 2`.
- Novos duelos passam a ser criados com `rules_version = 3`.
- M3E-B só altera movimentação/estratégia em partidas v3+.
- Partidas v1/v2 continuam restaurando o comportamento histórico.

## Estratégia pré-duelo

O jogador escolhe antes de confirmar a arena:

- `aggressive`: aceita lutar mais perto e prioriza skills ofensivas;
- `balanced`: comportamento neutro;
- `defensive`: busca zona mais segura e antecipa skills de cura.

A estratégia possui `strategy_version = 1`, é validada pelo backend e fica selada
na primeira confirmação. Uma reconexão não pode alterá-la.

Migration: `000028_pvp_tactical_strategy.sql`.

## Movimento tático

A arena v3 usa bandas de distância por arquétipo:

- melee persegue até contato;
- distance aproxima se estiver longe, ataca em zona útil e entra em `KITE` quando
  o inimigo invade a distância mínima;
- magic segue a mesma regra com banda um pouco menor que arqueiro.

A velocidade de botas continua relevante. A escala é convertida do tick PvE
(750 ms) para o tick PvP (250 ms) por acumulador fracionário e o acumulador é
persistido no runtime para recuperação determinística de liderança.

## Anti-kite infinito / equilíbrio melee

M3E-B adiciona três contrapesos:

1. backpedal possui velocidade efetiva menor que perseguição melee;
2. skills ofensivas distance/magic exigem um pulso sem reposicionamento; ataques
   básicos podem ser disparados em movimento, mas com penalidade moderada;
3. quando um ranged fica pressionado a <= 2,25 tiles de um melee, o dano sofre
   um pequeno redutor de pressão corpo a corpo.

Isso permite que DEX/INT e botas continuem importantes, enquanto VIT permanece
uma opção natural de sustain melee sem ser a única ferramenta de aproximação.

## Simulação de sanidade

Foi usado um cenário sintético propositalmente artificial com mesmos HP, ataque,
defesa e attack speed, sem skills e com 100 seeds por matchup. O objetivo não é
balanceamento final, apenas detectar domínio absoluto de um arquétipo.

Resultado aproximado após o ajuste:

- melee x distance: 26 vitórias melee, 38 distance, 36 empates simultâneos;
- melee x magic: 57 vitórias melee, 43 magic.

O balanceamento real deve continuar usando telemetria com builds verdadeiras,
STR/DEX/INT/VIT, equipamentos, skills e raridades.

## Validação executada

- `go test ./pkg/game` — aprovado;
- `go test ./internal/db` — aprovado com stub local temporário apenas para `lib/pq`;
- transpile sintático TypeScript dos arquivos alterados e do Dashboard — sem diagnóstico;
- build completo de `cmd/server` não foi possível neste pacote Repomix por ausência
  de `go.sum`/dependências e indisponibilidade de rede.

## Próxima fatia sugerida

Após validar a M3E-B em duas instâncias reais:

1. telemetria de distância média, tempo em KITE/CHASE e dano antes/depois do contato;
2. histórico/replay resumido usando eventos autoritativos;
3. fechamento da M3 com matchmaking por Rating + Combat Power;
4. M4 Arena Ranqueada.
