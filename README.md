# Project Atlas — Assentamento Vivo V1.2 (Profissões Especializadas & Modo Offline Contínuo)

Versão integral do jogo com progressão protegida, 12 profissões especializadas (6 de coleta e 6 de artesanato), sistema de moradores com dupla profissão e raridade procedural, Ambições automáticas com artesãos dedicados, simulação offline contínua e determinística com auto-retorno e recuperação dinâmica na fogueira, coletas paralelas ao combate e Arsenal protegido.

No jogo, abra **🏘️ Assentamento, Trabalhos & Oficina**. Em **Ordens de Trabalho**, envie um morador habilitado sem pausar a caçada; ao concluir, ele volta sozinho e deposita o que couber. Em **Ambições & Arsenal**, escolha uma receita descoberta, a raridade desejada e o limite de tentativas; os moradores reservam os custos e produzem automaticamente. Construções continuam no modal do Acampamento e nunca são iniciadas pelos trabalhadores.

Livros de habilidade podem ser estudados com qualquer arma equipada. A compatibilidade da arma é exigida apenas para ativar e executar a habilidade. O craft manual não possui falha aleatória total: cada unidade aceita produz um resultado e, para equipamentos, a rolagem define a raridade. Lotes exibem o total realmente concluído e o motivo de qualquer interrupção.

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
O `bootstrap.sql` não é uma segunda fonte de schema: ele apenas documenta que a autoridade está em `backend/migrations/000001` a `000013`.

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
npm ci
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
