# Relatório de Implementação — Gameplay P1 (15/08/2026)

## Resultado funcional

Esta entrega corrige as fricções reportadas sem migration destrutiva e sem resetar progresso existente.

| Tema | Regra final |
|---|---|
| Aprender habilidade | Independe da arma atual; exige apenas o nível mínimo do livro. |
| Ativar/usar habilidade | Exige arma ou arquétipo compatível e continua validado no servidor. |
| Livro duplicado | Não é consumido. |
| Craft manual | Não possui falha aleatória total; cada unidade aceita gera uma saída. |
| Raridade de equipamento | Continua sendo sorteada individualmente conforme receita, profissão, estação e catalisador. |
| Lote de craft | Uma ordem autoritativa de 1–50 unidades; para quando um requisito deixa de existir. |
| Prioridade de Ambição | Ordena a fila decrescente; não aumenta chance, raridade nem velocidade. |
| Limpar Ambição | Remove a ficha concluída/esgotada; não remove itens do Arsenal. |
| Retorno de trabalhador | Automático online e no próximo login após período offline. |
| Depósito cheio | O que couber é depositado, o excedente fica protegido e o morador é liberado. |
| Prosperidade | Reputação produtiva permanente que atrai moradores quando também existe vaga. |

## Aprendizado e uso de habilidades

O bug não estava apenas na regra de combate. O cliente classificava todo item iniciado por `Manual:` como manual de construção; por isso `Manual: Tiro Quádruplo` seguia o endpoint errado. A classificação agora usa os metadados canônicos `item_kind` e `slot_type`.

O backend permite estudar o livro com espada, arco, varinha ou sem arma. Depois do aprendizado, a habilidade permanece visível. Se a arma atual for incompatível, ela aparece como aprendida e bloqueada apenas para ativação. A execução continua verificando o arquétipo no servidor, impedindo contorno pelo WebSocket.

## Produção manual e lotes

Um pedido de 25 não dispara mais 25 mensagens otimistas no navegador. O cliente envia uma única ordem e o servidor processa as unidades sequencialmente em transações idempotentes. A resposta contém:

- quantidade pedida, concluída e não concluída;
- contagem por raridade;
- itens enviados à carga segura;
- número de falhas aleatórias totais, atualmente sempre zero;
- motivo real da parada, se houver.

O lote pode terminar parcialmente por falta de material, ouro, catalisador, nível/estação válidos ou espaço para uma saída processada. Custos são cobrados somente pelas unidades concluídas.

Ambições são diferentes de falha de craft: toda tentativa produz um equipamento e o guarda no Arsenal. Se a raridade ficar abaixo da meta, o item não é perdido; ele permanece disponível e a cidade tenta novamente enquanto houver autorização e recursos.

## Trabalhadores e entrega automática

O pulso da sessão consulta ordens vencidas a cada cinco segundos. O claim utiliza um `request_id` determinístico por atividade, locks serializáveis e ledger, preservando idempotência. No login, até cem atividades vencidas são conciliadas antes do estado inicial.

Se não houver espaço, a atividade passa a `pending_storage`, o excedente mantém a origem e o morador volta a `idle`. O botão exibido nesse caso não “libera” o trabalhador: apenas tenta transferir novamente a carga protegida.

## Prosperidade e moradores

A Prosperidade não é uma moeda. Ela nunca é subtraída nesta versão e cresce por:

- conclusão de obras: `25 × nível alvo`;
- craft manual: `tier da receita` por unidade;
- Ambição concluída: `10 × tier da receita` por tentativa produzida;
- entrega de coleta: ganho proporcional aos ciclos completos, entre 1 e 10.

Os sete pioneiros são preservados. Até nove novos moradores chegam nos marcos `25, 75, 150, 250, 400, 600, 850, 1150 e 1500`, sempre limitados pela capacidade de moradia. As chegadas têm nomes determinísticos específicos do personagem e posições visuais próprias no refúgio.

## Compatibilidade e homologação

Não há nova tabela nem alteração destrutiva de colunas. Saves atuais recebem as chegadas elegíveis ao abrir/sincronizar o assentamento. Ambições e itens existentes do Arsenal permanecem intactos.

Verificações recomendadas na máquina de homologação:

```bash
cd backend && go test -race ./...
cd ../frontend && npm ci && npm run build
cd ..
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
node tools/audit-economy.mjs
```