# Reino do Avesso — Alpha Hardening V1

Data: 2026-08-26
Base: último pacote Repomix enviado pelo projeto (`repomix-output(1).xml`).

## Objetivo

Esta entrega é a primeira rodada de hardening pré-multiplayer. Ela prioriza:

1. reduzir superfície de ataque HTTP/WebSocket;
2. impedir que polling/persistência excessiva degradem o servidor conforme o CCU cresce;
3. retirar I/O de PostgreSQL dos locks de sessão nos fluxos mais pesados;
4. liberar todas as construções básicas na alpha sem remover o sistema de manuais;
5. permitir interromper uma Ambição já em fabricação com reembolso transacional;
6. impedir recursos obtíveis sem utilidade de permanecerem invisíveis na economia.

## Segurança implementada

### Autenticação e WebSocket

- Rotas HTTP protegidas aceitam JWT apenas em `Authorization: Bearer`.
- O WebSocket não recebe mais o JWT longo na URL.
- Novo endpoint autenticado `POST /api/v1/auth/ws-ticket` emite ticket aleatório de 256 bits.
- Ticket WebSocket expira em 20 segundos e é single-use.
- Emissão de ticket possui limites por conta e IP.
- O ticket é vinculado simultaneamente à conta e ao personagem, e a propriedade do personagem é validada antes da emissão e novamente na abertura da sessão.
- O store de tickets desta V1 é local ao processo. Para múltiplas instâncias do backend ele deve migrar para Redis/armazenamento compartilhado.

### WebSocket anti-DoS

- frame máximo: 64 KiB;
- read deadline renovado por Pong;
- ping periódico;
- write deadline;
- conexão sem resposta é encerrada;
- comandos passam por validação de comprimento/quantidade;
- existe bucket global por personagem e buckets específicos para operações caras;
- ações desconhecidas também passam por validação/rate-limit antes de serem rejeitadas, evitando flood gratuito de logs.

### Login / cadastro / configuração

- rate-limit para login por IP e por combinação IP+identidade;
- rate-limit para cadastro;
- HTTP server com `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout` e limite de headers;
- produção/staging exige `JWT_SECRET` com no mínimo 32 bytes;
- produção/staging exige `ALLOWED_ORIGINS` explícito e rejeita `*`;
- dev tools são rejeitadas em production/staging;
- proxy headers só são confiados quando configurado explicitamente.

### Deployment de produção

Foram adicionados:

- `.env.production.example`;
- `docker-compose.prod.yml`;
- `deploy/Caddyfile`.

No compose de produção PostgreSQL e Redis não publicam portas para a Internet. O Caddy é a única borda pública, em 80/443, e encaminha API/WebSocket para a rede interna. O Caddy sobrescreve `X-Real-IP` e `X-Forwarded-For` com o IP remoto em vez de confiar em valores enviados pelo cliente.

## Performance implementada

### Checkpoint de personagem

O personagem não é mais salvo no PostgreSQL em todo tick de 750 ms. O estado transitório de combate permanece em RAM e a sessão produz checkpoint periódico (~15 s), persistido depois de liberar `Session.Mu`.

Mutações econômicas críticas continuam transacionais no banco.

### Scheduler do assentamento

Foi removido o polling de assentamento por sessão conectada. Um scheduler global procura somente personagens que realmente possuem eventos vencidos:

- coleta concluída;
- Ambição pronta/que pode avançar;
- construção finalizada.

A migration `000021_settlement_scheduler_indexes.sql` adiciona índices parciais para essas consultas.

Observação: esta versão do scheduler é apropriada para uma única instância do backend. Antes de executar múltiplas instâncias, adicionar liderança distribuída/advisory lock ou processamento `SKIP LOCKED` com garantia de ownership.

### Locks de sessão

Os hotspots de craft e início de obra foram alterados para não manter `Session.Mu` durante I/O de banco. O padrão agora é:

`capturar estado curto -> unlock -> PostgreSQL -> lock curto -> aplicar snapshot/delta -> unlock`.

Uma varredura nos handlers de `backend/cmd/server` não encontrou chamadas de banco reais dentro de trechos delimitados por `Session.Mu`; as duas ocorrências remanescentes são apenas conversores `db.Convert...`, sem I/O.

Ainda existem callbacks persistentes dentro de alguns eventos menos frequentes em `engine.go` (loot, morte, auto-sell, equip/ações específicas). Eles são P1 da próxima rodada e precisam ser desacoplados antes de metas de milhares de CCU.

### Ouro concorrente entre RAM e DB

Fluxos alterados nesta entrega passam a aplicar `GoldDelta` na sessão em vez de substituir o saldo em RAM pelo valor absoluto lido do PostgreSQL. Isso cobre:

- início/cancelamento de Ambição;
- crafting manual;
- início de coleta com auto-fund da tesouraria;
- transferência da tesouraria;
- auto-potions;
- início de construção.

Isso evita apagar ouro de combate ainda aguardando checkpoint quando uma mutação econômica termina no banco.

Limitação conhecida: durante a janela entre ganho de ouro em RAM e checkpoint, uma transação econômica pode enxergar no banco um saldo temporariamente menor e rejeitar a compra por insuficiência. Isso é preferível a duplicar/perder ouro, mas a arquitetura final deve usar um ledger/mutation stream único ou flush controlado antes de mutações econômicas.

## Construções básicas liberadas na alpha

As sete construções atuais usam `DefaultUnlocked = true`:

- Fogueira;
- Cabana do Aventureiro;
- Armazém;
- Fonte Arcana;
- Bancada de Desmontagem;
- Cozinha;
- Bancada de Alquimia.

Backend e frontend usam o mesmo contrato. `EnsureCharacterCamp` garante as fundações/projetos básicos inclusive para saves existentes.

O sistema de manuais/blueprints NÃO foi removido. Construções futuras podem usar `DefaultUnlocked = false` e continuar dependendo de manual, drop ou outro desbloqueio.

## Parar produção em andamento

`CancelHeroDesire` agora aceita também uma Ambição em `crafting`.

A operação é transacional:

1. trava a `hero_desires` com `FOR UPDATE`;
2. trava as reservas de recursos;
3. devolve recursos respeitando capacidade do depósito;
4. excedentes vão para Cargas Pendentes, sem perda;
5. devolve ouro reservado;
6. libera o morador;
7. apaga reservas;
8. muda a ordem para `cancelled`;
9. faz commit.

O finalizador da produção disputa o mesmo lock. Assim conclusão e cancelamento são mutuamente exclusivos. Repetir o cancelamento não reembolsa duas vezes porque a primeira execução deixa a ordem em `cancelled`.

A interface mostra `■ Parar produção` com confirmação quando uma Ambição está fabricando.

## Ciclo de recursos

Foram adicionados:

- `copper_ingot` — Lingote de Cobre;
- `bone_meal` — Farinha de Osso.

Novas cadeias:

- `4 copper_ore + 1 coal -> 2 copper_ingot`;
- `4 animal_bone + 1 herbs -> 2 bone_meal`.

O Lingote de Cobre passou a participar de upgrades avançados de infraestrutura, preparando o ciclo futuro do Engenheiro. A Farinha de Osso entrou na alquimia.

`abyssal_ember` e `trophy_abyss_avenger` permanecem intencionalmente reservados para conteúdo futuro. Eles não receberam um sink artificial.

Novo `tools/audit-resource-usage.mjs` cruza source/sink e falha quando um recurso obtível não possui função, salvo recursos explicitamente marcados como futuros.

## Engenheiro

A profissão não foi adicionada nesta V1 para não substituir a barreira dos manuais por outra barreira de onboarding. O encaixe recomendado permanece:

`Engenheiro + cobre + infraestrutura + expansão territorial + Ressonador Harmônico`.

Quando esse ciclo entrar, o Engenheiro deve aumentar eficiência/infraestrutura, não ser obrigatório para construir Fogueira/Cabana/Armazém no começo da alpha.

## Validação executada

Passaram no workspace:

- `go test ./pkg/game`;
- `go test -race ./pkg/game`;
- `go vet ./pkg/game`;
- `go test ./internal/config`;
- Content Audit: 0 erros;
- Camp Audit: 0 erros;
- Economy Audit: 0 erros;
- Resource Usage Audit: 0 erros;
- 103 arquivos `.ts/.tsx` verificados sintaticamente: 0 erros.

Também foi executada uma checagem de compilação de todos os pacotes Go usando stubs locais somente para as dependências externas indisponíveis no ambiente. Ela encontrou e permitiu corrigir duas regressões antes da entrega (handler de consumível ausente e redeclaração no WELCOME_EVENT). Essa checagem serve para type-check interno; ela não substitui o build real com as bibliotecas oficiais.

## Limitações de homologação do pacote enviado

O Repomix recebido não contém:

- `backend/go.sum`;
- `frontend/package-lock.json`;
- `frontend/src-tauri/Cargo.lock`;
- dependências instaladas do frontend;
- diversos binários/assets ignorados pelo Repomix.

Por isso `go test ./...`, `npm ci/npm run build` e `tauri build` não podem ser declarados homologados a partir deste pacote isolado. O `go test ./...` real para antes da compilação solicitando entries do `go.sum`.

No repositório oficial, versionar os três lockfiles e tornar build/testes completos um gate obrigatório de release.

## P1 que permanece antes de multiplayer em escala

Esta entrega reduz de forma importante os gargalos, mas não significa “5.000 CCU homologados”. Ainda devem entrar antes de uma meta grande:

- protocolo WebSocket baseado em deltas em vez de hidratar snapshots grandes em vários eventos;
- `CraftBatch` em uma única transação, em vez de até 20 `CraftItem` sequenciais;
- retirar callbacks de persistência restantes de dentro do tick/lock em eventos de loot/equipamento/morte;
- shared WebSocket ticket store para múltiplas instâncias;
- presença/ownership de sessão compartilhado para multiplayer/horizontal scaling;
- coordenação distribuída do scheduler;
- load tests progressivos 100/500/1000/2500/5000 CCU com p50/p95/p99, queries/s, bytes/s, GC e queue depth;
- backup/restore testado e observabilidade de produção.

## Arquivos de maior impacto

- `backend/cmd/server/security.go`
- `backend/cmd/server/ws.go`
- `backend/cmd/server/command_router.go`
- `backend/cmd/server/settlement_scheduler.go`
- `backend/cmd/server/main.go`
- `backend/internal/config/config.go`
- `backend/internal/db/settlement.go`
- `backend/internal/db/settlement_economy.go`
- `backend/internal/db/economy.go`
- `backend/pkg/game/engine.go`
- `backend/pkg/game/building_registry.go`
- `backend/pkg/game/economy_resources.go`
- `backend/pkg/game/recipe_registry.go`
- `frontend/src/hooks/useGameSocket.ts`
- `frontend/src/components/Economy/EconomyHubModal.tsx`
- `docker-compose.prod.yml`
- `deploy/Caddyfile`
- `tools/audit-resource-usage.mjs`