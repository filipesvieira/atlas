# Reino do Avesso — Multiplayer M2A: Redis compartilhado

Data: 2026-08-27

## Objetivo

Evoluir a fundação social M1 para que Chat Mundial, presença e tickets
WebSocket funcionem quando HTTP e WebSocket forem atendidos por réplicas
distintas do backend. Nenhuma regra de combate, economia, inventário ou PvP
Hero vs Hero foi introduzida nesta etapa.

## Implementado

- `github.com/redis/go-redis/v9` como cliente Redis oficial.
- `redisSocialBus`: eventos de chat e presença são publicados em
  `atlas.social.world.v1` e entregues às sessões locais de cada réplica.
- `redisPresenceStore`: chave por personagem com TTL de 60 s e sorted set para
  remover presenças vencidas e calcular o contador global.
- Token de ownership por sessão: uma desconexão atrasada não remove a presença
  de uma sessão nova que já assumiu o personagem.
- `redisWSTicketStore`: ticket efêmero com TTL de 20 s e consumo atômico via
  `GETDEL`, permitindo emissão e upgrade em réplicas diferentes.
- Inicialização fail-closed em `staging` e `production`. Em desenvolvimento o
  fallback in-memory mantém a experiência local de uma única instância e
  registra um aviso no log.

## Limites preservados

- PostgreSQL continua a verdade persistente e o lease de personagem permanece
  nele; Redis não armazena economia, inventário, dano ou progresso.
- O rate limit de chat é local por sessão. Como o lease permite somente uma
  sessão ativa por personagem, isso preserva o limite atual; um rate limit
  distribuído pode ser adicionado caso a topologia permita múltiplas conexões
  sociais por identidade no futuro.
- O scheduler do assentamento ainda não deve rodar em várias réplicas. A M2B
  precisa adicionar liderança distribuída ou seleção transacional com
  `SKIP LOCKED` antes da escala horizontal dos workers.

## Validação

```bash
cd backend
go test ./...
```

Os testes cobrem a entrega social já existente e o caso de ownership de
presença: o cleanup de uma conexão antiga não pode remover uma reconexão.