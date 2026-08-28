# Relatório de implementação — Multiplayer M2B: scheduler distribuído

Data: 2026-08-27

## Entrega

- O scheduler do assentamento não é mais executado simultaneamente por todas as réplicas. A líder é eleita por advisory lock do PostgreSQL, preso a uma conexão exclusiva.
- Se a conexão ou o processo líder encerrar, o PostgreSQL libera o lock automaticamente. Réplicas em espera tentam assumir novamente em intervalos curtos.
- Ao concluir uma coleta, obra ou tentativa de Ambição, a líder publica um evento leve no Redis (`atlas.settlement.scheduler.v1`).
- Cada backend recebe o evento, mas somente a réplica que contém a sessão WebSocket daquele personagem consulta os snapshots necessários no PostgreSQL e notifica o cliente.

## Garantias

- PostgreSQL continua autoritativo para economia, acampamento, inventário e recursos.
- Redis não carrega estado de combate nem snapshots completos mutáveis.
- Revisões do acampamento, inventário e personagem impedem que o evento substitua estado local mais novo.
- O desenvolvimento sem Redis continua em modo local de uma réplica; staging e produção exigem Redis.

## Validação

```bash
cd backend
go test -race ./...
```

Resultado: aprovado em 2026-08-27.

## Próximo passo multiplayer

M3: Duelo Hero vs Hero, com arena, snapshot de entrada e regras PvP autoritativas isoladas do PvE.