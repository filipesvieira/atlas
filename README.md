# Reino do Avesso — Assentamento Vivo, Arenas Isométricas & Economia Persistente

Estado atual: catálogo `2026.08-performance-v2-equipment-identity-v1`, com 9 regiões, 40 monstros/bosses, 13 profissões, assentamento persistente, prólogo de Reino do Avesso, combate autoritativo e progressão offline determinística. A Floresta e a Vila do Shereque usam arenas isométricas com terreno próprio; as demais regiões ainda evoluem a partir dos renderers legados.

O índice de divergências, documentos históricos e fontes canônicas está em
[`docs/DOCUMENTATION_STATUS.md`](docs/DOCUMENTATION_STATUS.md).

No jogo, abra **🏘️ Assentamento, Trabalhos & Oficina**. Em **Ordens de Trabalho**, envie um morador habilitado sem pausar a caçada; ao concluir, ele volta sozinho e deposita o que couber. Em **Ambições & Arsenal**, escolha uma receita descoberta, a raridade desejada e o limite de tentativas; os moradores reservam os custos e produzem automaticamente. Construções continuam no modal do Acampamento e nunca são iniciadas pelos trabalhadores.

A **🍳 Cozinha** transforma recursos de coleta em seis refeições iniciais. Refeições usam tempo real (20 min, 5 h ou 24 h), persistem ao fechar o executável e são aplicadas também na simulação offline apenas durante o intervalo em que estavam ativas. Uma refeição substitui a anterior da categoria `meal`.

Livros de habilidade podem ser estudados com qualquer arma equipada. A compatibilidade da arma é exigida apenas para ativar e executar a habilidade. O craft manual não possui falha aleatória total: cada unidade aceita produz um resultado e, para equipamentos, a rolagem define a raridade. Lotes exibem o total realmente concluído e o motivo de qualquer interrupção.


## Executável Tauri e backend remoto

O executável contém somente o cliente. O backend Go/PostgreSQL continua hospedado separadamente. Redis sustenta a camada realtime compartilhada: Pub/Sub do Chat Mundial, presença global com TTL, tickets WebSocket single-use e propagação das atualizações do scheduler do assentamento para a réplica que hospeda cada sessão. O scheduler possui liderança exclusiva por advisory lock do PostgreSQL, evitando reconciliação duplicada. Em desenvolvimento, se Redis estiver indisponível, o servidor preserva o modo local de uma única instância com aviso explícito; em `staging` e `production`, Redis é obrigatório e o startup falha de forma segura caso não esteja acessível. Para uma release Tauri configure no build:

```bash
VITE_API_BASE_URL=https://api.seu-dominio-atlas.com
VITE_WS_BASE_URL=wss://api.seu-dominio-atlas.com
```

Sem essas variáveis, o cliente usa automaticamente o backend local em
`http://localhost:8080` e `ws://localhost:8080`, o que permite executar os
testes locais sem configuração adicional. Quando o backend for publicado na
nuvem, basta definir as duas variáveis no ambiente do build, como no exemplo
acima.

No backend de produção, inclua as origens nativas do Tauri na allowlist usada por `ALLOWED_ORIGINS` (`http://tauri.localhost` para Windows e `tauri://localhost` para o protocolo nativo), além de qualquer origem web oficial.

No acampamento, o layout V3 é persistido em grid isométrico 24x18. Construções descobertas podem ser posicionadas antes do primeiro nível e reorganizadas depois de prontas por drag-and-drop; durante o arraste, pressione **R** para girar em 90°. O backend valida limites, footprint, rotação e colisões antes de salvar.

## Executar com Docker

Pré-requisito: Docker Desktop ou Docker Engine com Compose V2.

```bash
docker compose up --build
```

- Jogo: `http://localhost:3000`
- Backend: `http://localhost:8080`
- Readiness: `http://localhost:8080/health/ready`
- PostgreSQL: `localhost:5432` (`atlas` / `atlas_password`)

O backend aplica as migrations embutidas no startup e encerra imediatamente se o schema ou o catálogo estiver inconsistente. Em banco existente, faça backup antes do primeiro start.
O `bootstrap.sql` não é uma segunda fonte de schema: ele apenas documenta que a autoridade está nas migrations embutidas de `backend/migrations/000001` até `000026`.

### Conta local de QA

O `docker-compose.yml` de desenvolvimento habilita uma conta administrativa exclusiva para testes locais:

- E-mail: `atlas-admin@local.test`
- Senha: `AtlasTest!2026`

Crie um personagem normalmente e, na tela de personagens, use **🧪 Preparar QA** antes de entrar no mundo. O preset concede recursos de teste, ouro, receitas, projetos e profissões Nv. 60, libera as regiões e conclui temporizadores que já estavam em andamento. O Armazém é colocado no Nv. 3 para receber o kit; as demais construções continuam testáveis.

Essa superfície exige simultaneamente `ENVIRONMENT=development`, `ATLAS_DEV_TOOLS_ENABLED=true` e JWT com papel `admin`. O backend recusa a inicialização se as ferramentas forem habilitadas em `staging` ou `production`. Fora do Docker, defina também `ATLAS_DEV_ADMIN_EMAIL` e `ATLAS_DEV_ADMIN_PASSWORD` (mínimo de 12 caracteres).

```bash
docker compose exec postgres pg_dump -U atlas -d atlas_db -Fc -f /tmp/atlas_before_economy_v2.dump
```

Para um teste totalmente novo, a remoção do volume apaga todos os personagens e só deve ser usada conscientemente:

```bash
docker compose down -v
docker compose up --build
```

## Executar sem Docker

Backend (Go 1.22 e PostgreSQL 16):

```bash
cd backend
go mod download
go test ./...
go run ./cmd/server
```

Frontend (Node 20+):

```bash
cd frontend
npm install
npm run dev -- --port 3000
```

## Verificações

```bash
cd backend && go test -race ./...
cd ../frontend && npm run build
cd ..
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
node tools/audit-economy.mjs
node tools/audit-resource-usage.mjs
```

Para homologar um save legado, consulte `progression_migration_issues` antes de liberar o personagem. Casos ambíguos são bloqueados e nunca convertidos automaticamente, evitando reset surpresa de nível/XP.

## Controles de rollout

O estado padrão já é `crafting-first`. As variáveis abaixo permitem rollback sem alterar os saves:

| Variável | Padrão | Uso |
|---|---:|---|
| `ATLAS_PROFESSIONS_ENABLED` | `true` | habilita progressão profissional |
| `ATLAS_GATHERING_ENABLED` | `true` | habilita expedições de coleta |
| `ATLAS_CRAFTING_ENABLED` | `true` | habilita preview e crafting |
| `ATLAS_CRAFTING_FIRST_LOOT` | `true` | remove equipamento genérico de monstros comuns |
| `ATLAS_COMMON_EQUIPMENT_DROP_MULTIPLIER` | `0` | rollback gradual do drop comum (`0..1`) |
| `ATLAS_BOSS_ARTIFACT_DROP_MULTIPLIER` | `0.02` | chance pequena de artefato pronto de chefe |

Consulte [docs/IMPLEMENTATION_REPORT_GAMEPLAY_P1_2026-08-15.md](docs/IMPLEMENTATION_REPORT_GAMEPLAY_P1_2026-08-15.md), [docs/IMPLEMENTATION_REPORT_SETTLEMENT_V1.md](docs/IMPLEMENTATION_REPORT_SETTLEMENT_V1.md), [docs/IMPLEMENTATION_REPORT_ECONOMY_V2.md](docs/IMPLEMENTATION_REPORT_ECONOMY_V2.md) e [docs/MIGRATION_RUNBOOK_ECONOMY_V2.md](docs/MIGRATION_RUNBOOK_ECONOMY_V2.md).