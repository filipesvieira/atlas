# Atlas — Release Assentamento Vivo V1.1

> **Status:** manifesto histórico da release de 2026-08-15. Para o estado
> atual, migrations vigentes e conteúdo convertido, consulte
> [`DOCUMENTATION_STATUS.md`](DOCUMENTATION_STATUS.md).

Data: 2026-08-15  
Catálogo: `2026.08-settlement-v1.1-usability-growth`  
Migration mais recente: `000013_settlement_residents_desires.sql`

## Implementado

- assentamento persistente por personagem;
- sete moradores pioneiros com habilidades individuais herdadas do save;
- nove chegadas progressivas por Prosperidade e vagas da Cabana;
- várias ordens de coleta simultâneas, uma por morador;
- coleta sem pausar a expedição de combate;
- retorno, depósito e liberação automáticos de trabalhadores;
- excedente de coleta protegido sem manter o trabalhador ocupado;
- Ambições automáticas por receita, raridade, catalisador, prioridade e limite de tentativas;
- limpeza de Ambições concluídas/esgotadas sem apagar o Arsenal;
- reserva transacional de recursos e ouro;
- snapshot de receita para estabilidade entre versões;
- Arsenal protegido e claim com validação de capacidade;
- limite de 12 Ambições ativas e retenção dos 100 históricos mais recentes;
- aprendizado de livros independente da arma, com restrição apenas para uso;
- craft manual em lote com resultado autoritativo e zero sucesso presumido no cliente;
- interface de trabalhos, Ambições, oficina e moradores com explicações e tooltips;
- compatibilidade com o contrato legado `active_gathering`.

## Verificações executadas

- TypeScript + build Vite de produção: aprovado;
- auditoria de acampamento: 0 erros;
- auditoria de conteúdo/loot/níveis: 0 erros;
- auditoria de economia/crafting/assentamento: 0 erros;

O ambiente de geração não contém o executável Go nem PostgreSQL. Execute `go test -race ./...` em sua máquina antes da homologação. Esta atualização não adiciona migration destrutiva. Consulte `docs/IMPLEMENTATION_REPORT_GAMEPLAY_P1_2026-08-15.md`.