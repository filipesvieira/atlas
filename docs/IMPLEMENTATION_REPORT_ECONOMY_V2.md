# Relatório de Implementação — Progressão, Profissões e Crafting

Data: 13 de agosto de 2026  
Catálogo: `2026.08-economy-v4-professions-crafting`

## Resultado

O Atlas passa a ter dois ciclos mutuamente exclusivos: caça e expedição de profissão. Recursos naturais são coletados por profissões; monstros entregam partes temáticas, troféus e catalisadores; equipamentos genéricos possuem receita equivalente e deixam de cair de monstros comuns no estado final.

| Pilar | Implementação |
|---|---|
| Progressão segura | nível/XP monotônicos, XP vitalício, maior nível histórico, limite técnico 10.000, eventos e classificador conservador |
| Concorrência | lease distribuído por personagem, transações serializáveis, revisões otimistas, request IDs e claims idempotentes |
| Profissões | Lenhador, Minerador, Pescador, Fazendeiro, Rastreador e Herbalista, todas com XP independente |
| Coleta | seis expedições idle, durações 15 min/1 h/4 h/8 h, seed criptográfica do servidor e snapshot persistidos |
| Armazém/mochila cheios | cargas pendentes de recursos e itens protegidos, resgate parcial e nenhuma perda silenciosa |
| Loot de caça | 39 perfis com materiais temáticos; chefes preservam manuais/troféus/catalisadores e artefato raro |
| Crafting | receitas de processamento e uma receita gerada/validada para cada equipamento genérico |
| Qualidade | distribuição base, bônus limitado de profissão/estação, catalisadores, piso/teto, hard cap da receita e resultado determinístico pelo seed persistido |
| Itens legados | marcação `legacy_drop` sem reroll nem mudança de atributos |
| Auto-venda | customização existente preservada; craftados exigem opt-in e possuem proteção rígida por 24 h |
| Rollout | policy publicada no catálogo e flags de coleta, crafting e transição do drop |
| Interface | hub de profissões/oficina, CTA explícito de coleta, cronômetro, estimativa de rendimento, preview de raridade, cargas pendentes e ajuda classless |

## Conteúdo adicionado

- 6 profissões.
- 6 expedições de coleta.
- 15 matérias-primas de profissão, além de processados, sucatas e catalisadores.
- 39 vínculos monstro → parte temática.
- 92 templates cobertos pelo registry; itens não equipáveis são excluídos conscientemente da geração de receitas.
- Recipes de equipamento criadas dinamicamente a partir do `ItemRegistry`, com validação fail-fast.

## Persistência

As migrations `000006` a `000012` criam e endurecem progressão auditável, profissões, atividades, cargas pendentes, desbloqueios, crafting, ledger, leases, revisões otimistas, catálogos estáticos, identidade regional do compêndio, fila geral de itens protegidos e onboarding classless. Todas são embutidas no binário e registradas por `schema_migrations`.

O `bootstrap.sql` não cria mais tabelas. O migrador embutido é a única autoridade de schema e cada arquivo roda transacionalmente uma única vez.

O backend agora falha no startup se PostgreSQL, migrations ou integridade do catálogo falharem. Isso impede iniciar um processo capaz de servir comandos com schema parcial.

## Contratos importantes

- O cliente envia intenção, nunca quantidade coletada, raridade, XP, seed ou conclusão; seeds econômicos são gerados por `crypto/rand` no servidor.
- A coleta usa `min(now, ends_at)` e snapshot imutável.
- Cancelar uma coleta conserva ciclos completos e XP já conquistados; somente o ciclo parcial em andamento é descartado.
- O craft recalcula requisitos sob lock e rejeita preview desatualizado.
- Débitos, resultado e histórico de craft ficam na mesma transação.
- Recursos aceitos e consumidos alimentam `character_resource_ledger`.
- Troca de região, morte e coleta podem reiniciar/pausar a fase, mas não alteram nível, XP, ouro, itens, receitas ou profissões.
- Conflitos de revisão rejeitam snapshots atrasados e recarregam o estado vencedor do PostgreSQL na sessão.
- Receitas desbloqueadas por troféu continuam conhecidas após o material ser gasto, via ledger histórico.

## Verificação realizada neste pacote

| Verificação | Resultado |
|---|---|
| Formatação/parser Go em todos os arquivos | 64 arquivos aceitos |
| `node tools/audit-content.mjs` | 9 regiões, 39 monstros, 92 itens, 0 erros |
| `node tools/audit-camp-content.mjs` | 75 recursos, 39 perfis, 0 erros |
| `node tools/audit-economy.mjs` | 6 profissões, 6 coletas, 39 materiais temáticos, 0 erros |
| `npm run build` | 107 módulos, 0 erros TypeScript/Vite |
| Compose e migrations | YAML válido, 12 migrations SQL embutidas |

O ambiente de montagem não disponibilizava o executável Go/Docker, portanto `go test -race ./...` e o teste de integração PostgreSQL devem ser executados na máquina de destino. Os testes Go de domínio foram incluídos em `backend/pkg/game/economy_test.go`; o parser/formatador Go aceitou os 64 arquivos.

## Arquivos centrais

- `backend/pkg/game/economy_policy.go`
- `backend/pkg/game/profession_registry.go`
- `backend/pkg/game/gathering_registry.go`
- `backend/pkg/game/gathering_simulator.go`
- `backend/pkg/game/recipe_registry.go`
- `backend/pkg/game/crafting.go`
- `backend/internal/db/economy.go`
- `backend/internal/db/secure_seed.go`
- `backend/internal/db/progression_migration.go`
- `backend/internal/db/session_lease.go`
- `backend/migrations/000006_progression_professions_crafting.sql` a `000012_classless_onboarding.sql`
- `frontend/src/components/Economy/EconomyHubModal.tsx`
- `tools/audit-economy.mjs`