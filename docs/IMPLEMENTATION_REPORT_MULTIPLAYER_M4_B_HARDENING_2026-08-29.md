# IMPLEMENTATION REPORT — Multiplayer M4-B Ranked Hardening

Data: 2026-08-29

## Objetivo

Fechar a Arena Ranqueada síncrona iniciada na M4-A sem punir instabilidade de conexão como derrota automática, preservar o servidor como autoridade de resultado, gerar telemetria suficiente para balanceamento e tornar sinais de abuso auditáveis antes de avançar para Reino vs Reino.

## Review da base recebida

A revisão foi feita sobre o Repomix mais recente, que já continha ajustes posteriores à M4-A. Foram preservados especialmente:

- `stepGridAwayWithOrbitWithin`, que faz ranged/magic contornarem a borda em vez de travarem no canto;
- `ReturnToCamp`, ação idempotente usada no pós-PvP para não reativar expedição por engano;
- abertura da Central da Arena por `arenaRequest`, integrada ao Dashboard em vez de botão flutuante;
- ajustes recentes de `GameCanvas`/`PvPArenaViewport` e command router.

## Política de desconexão e abandono

- Desconectar não encerra uma partida `active` e não gera derrota. O combate já é automático e autoritativo no servidor, então punir a conexão seria injusto sem impedir evasão.
- Reconnect/disconnect são contabilizados por participante para observabilidade.
- Em `ready`, cancelar/recusar encerra a preparação sem rating.
- Em `active`, `FORFEIT_PVP_MATCH` persiste uma intenção idempotente. A líder global aplica a derrota no `PvPCombatInstance` e o próximo tick termina pelo pipeline normal de persistência, atividade do herói e rating.
- Falha de processo continua usando restore do runtime persistido.

## Telemetria competitiva persistível

`PvPCombatRuntimeState` ganhou métricas por personagem:

- dano causado/recebido;
- cura;
- ataques básicos;
- skills;
- críticos;
- ticks de movimento/CHASE/KITE;
- tick do primeiro contato melee;
- dano antes do primeiro contato.

As métricas fazem parte do runtime para sobreviver a failover e são copiadas para `pvp_match_participants.combat_metrics` no encerramento.

## Integridade ranqueada

`pvp_integrity_flags` registra sinais auditáveis, sem decisão automática de punição:

- `repeat_opponent`;
- `zero_return_pair`;
- `repeat_forfeit_pair`.

O retorno decrescente da M4-A continua sendo a proteção econômica/ranked imediata; as flags fornecem trilha para observabilidade e moderação futura.

## Saúde competitiva

`REQUEST_PVP_COMPETITIVE` expõe uma visão agregada da temporada com:

- jogadores posicionados;
- partidas ranqueadas;
- duração média;
- quantidade de forfeits;
- partidas com retorno reduzido;
- distribuição Bronze -> Mestre.

Isso permite detectar tiers excessivamente concentrados e acompanhar a qualidade da temporada antes de mexer nos thresholds.

## Cosméticos sazonais

Os entitlements da M4-A agora podem ser selecionados no backend por tipo (`title`, `banner`, `cosmetic`). Somente unlocks realmente pertencentes ao personagem são aceitos. Perfil público expõe título/banner; a arte/renderização definitiva permanece para refinamento visual.

## Escopo deliberadamente adiado

O snapshot defensivo assíncrono contra jogador offline continua opcional. Ele não é necessário para fechar a Arena Ranqueada síncrona e cria uma modalidade distinta, com regras próprias de snapshot, defesa, recompensa e anti-abuso. Deve ser reavaliado antes de M7 caso o produto realmente precise dele.

## Validação no pacote Repomix

- `go test ./pkg/game`: OK.
- `go test ./internal/db`: OK usando stub local somente para o blank import de `lib/pq` ausente no pacote.
- transpilação sintática dos arquivos TypeScript/TSX alterados: OK.
- `go test ./cmd/server` completo e `npm run build` dependem das dependências/lockfiles do repositório real, não incluídos no Repomix.

## Próxima etapa

M5 — Acampamento -> Reino defensável.
