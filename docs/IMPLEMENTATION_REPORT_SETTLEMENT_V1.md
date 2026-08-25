# Relatório de Implementação — Assentamento Vivo V1

## Escopo entregue

Esta versão transforma as profissões solitárias em uma primeira fatia vertical de cidade autônoma, preservando combate, saves, inventário, crafting manual e construções existentes.

- Cada personagem recebe um assentamento persistente e sete moradores pioneiros, com nomes estáveis e específicos do save.
- Madeira, mineração, pesca, rastreio, agricultura e herbologia passam a ser executados pelos moradores.
- O herói continua combatendo enquanto ordens profissionais ocorrem em paralelo.
- Moradores distintos podem cumprir trabalhos simultâneos; cada morador mantém apenas uma ocupação por vez.
- A Cabana do Aventureiro define a capacidade populacional: 4 vagas base e mais 4 por nível.
- Construções permanecem exclusivamente sob comando do jogador.
- O jogador pode registrar uma **Ambição** por equipamento, raridade mínima, catalisador, prioridade e limite de tentativas.
- O servidor escolhe um artesão livre, valida profissão/estação/receita e reserva ouro e materiais atomicamente antes do início.
- Cada tentativa usa o gerador autoritativo de crafting existente. Resultados ficam no **Arsenal do assentamento**, fora da mochila e da venda automática.
- Se a meta não for alcançada, a Ambição volta à fila; falta de material, ouro, nível, estação ou trabalhador produz estado `blocked` legível e recuperável.
- Ordens em andamento persistem no banco e são reconciliadas no login e a cada cinco segundos enquanto a sessão está aberta.

## Compatibilidade de saves

A migration `000013_settlement_residents_desires.sql` é somente aditiva. Ela cria os registros de assentamento, moradores, habilidades, Ambições, reservas e Arsenal. Ordens de coleta legadas são atribuídas a um pioneiro compatível quando possível; caso contrário continuam reivindicáveis pelo fluxo legado.

Os níveis de `character_professions` são copiados para as habilidades dos pioneiros. A tabela antiga permanece como conhecimento coletivo e contrato retrocompatível. Ganhos futuros atualizam tanto o morador responsável quanto o conhecimento coletivo.

## Segurança econômica

1. Criação e execução usam `request_id` e limites de payload/rate limit no WebSocket.
2. Uma receita não pode ter duas Ambições ativas no mesmo assentamento.
3. Recursos, ouro, reserva e estado de produção mudam dentro de uma transação serializável.
4. Materiais reservados são removidos do saldo livre; construções e crafting manual não conseguem gastá-los novamente.
5. Uma tentativa em execução não pode ser cancelada depois de consumir materiais.
6. O item produzido entra no Arsenal antes do commit e só sai por claim transacional com validação de slots e peso.
7. A raridade aceita nomes do protocolo em inglês e nomes canônicos em português, persistindo a forma canônica.
8. A receita é congelada em `recipe_snapshot`, portanto uma tentativa autorizada não muda de custo ou resultado após atualização do catálogo.

## Contratos novos

- `START_GATHERING` continua aceitando expedição e duração; o servidor agora atribui um morador.
- `CANCEL_GATHERING` e `CLAIM_GATHERING_REWARDS` aceitam `activity_id`.
- `CREATE_HERO_DESIRE`: `recipe_key`, `target_rarity`, `catalyst_key`, `max_attempts`, `priority`, `request_id`.
- `CANCEL_HERO_DESIRE`: `desire_id`, `request_id`.
- `CLAIM_ARMORY_ITEM`: `armory_id`, `request_id`.
- `EconomyState` preserva `active_gathering` e adiciona `active_gatherings` e `settlement`.

## Evolução entregue na V1.1

- Coletas vencidas são conciliadas automaticamente a cada cinco segundos online e no próximo login após um período offline.
- O morador é liberado mesmo quando parte da carga não cabe; somente o excedente continua protegido para tentativa posterior.
- Nove chegadas adicionais são desbloqueadas por marcos permanentes de Prosperidade e vagas da Cabana, totalizando até 16 moradores nesta etapa.
- O painel explica fontes, finalidade e próximo bloqueio da Prosperidade, enquanto o Canvas reserva posições próprias para cada habitante.
- Ambições concluídas/esgotadas podem ser limpas sem apagar resultados do Arsenal.

## Limites deliberados da V1.1

Esta entrega cria o núcleo econômico e o primeiro recrutamento automático por marcos. Necessidades familiares, mercado entre jogadores, alianças e ataques ficam para versões posteriores. Nenhuma dessas promessas futuras foi simulada com dados falsos nesta versão.

## Validação

- `npx tsc --noEmit`
- `npm run build`
- `node tools/audit-economy.mjs`
- formatador/parser Go sobre os arquivos alterados
- `go test -race ./...` deve ser repetido no ambiente local/CI com Go 1.22 e PostgreSQL de teste.