# Project Atlas — Implementação da Economia do Acampamento V1

Data: 2026-08-20  
Catálogo: `2026.08-settlement-v1.2-treasury-payroll`

## Escopo entregue

Esta versão inicia o foco integral no acampamento por sua fundação econômica. O trabalho automatizado deixa de ser gratuito após o primeiro marco de Prosperidade, mas nenhuma cobrança ocorre por simples passagem de tempo.

### Backend autoritativo

- Tesouraria persistente e separada da carteira do herói.
- Depósito e retirada idempotentes.
- Reposição automática com reserva pessoal protegida.
- Salário determinístico por duração, nível profissional e tier.
- Reserva transacional antes do início da coleta.
- Liquidação automática online e offline.
- Reembolso proporcional ao cancelar.
- Ledger imutável e folha por atividade.
- Snapshot de versão econômica em cada ordem.
- Mensagens econômicas não podem mais sobrescrever a UI com atributos ou estado de expedição vazios.

### Experiência do jogador

- Aba `Tesouraria & Folha` no Hub do Assentamento.
- Custo do turno visível antes do envio.
- Salário reservado visível na ordem ativa.
- Explicação da proteção inicial e do desbloqueio em 25 de Prosperidade.
- Configuração de financiamento automático e reserva pessoal.
- Turno de coleta de 3 minutos para feedback inicial.
- Personagens novos começam com espada e broquel equipados; arco, flechas e varinha continuam disponíveis na mochila.
- Drops comuns alinhados ao modo `crafting-first`, fortalecendo a cadeia coleta -> processamento -> artesanato.

### Compatibilidade

- Migration `000014` apenas adiciona colunas e tabelas.
- Ouro existente permanece na carteira do herói.
- Ordens anteriores permanecem válidas e sem cobrança retroativa.
- O equipamento inicial automático vale apenas para personagens criados após esta versão e não altera inventários existentes.
- Recursos, construções, moradores, Ambições e inventários não são regravados.
- Migrador serializado com advisory lock e checksum de migrations publicadas.

## Regras de balanceamento iniciais

- Folha desbloqueada: 25 de Prosperidade.
- Salário base: 40 ouro por hora.
- Nível profissional: +3% por nível acima do primeiro, limitado a +100%.
- Tier da área: +25% por tier acima do primeiro.
- Cancelamento: pagamento proporcional ao tempo transcorrido.

Os valores devem ser recalibrados com telemetria de ouro ganho por hora e valor médio dos recursos coletados.

## Próxima etapa recomendada

1. Salário de artesãos nas Ambições, separado do custo técnico da receita.
2. Relatório financeiro com entradas/saídas por período.
3. Cozinha de Campanha, refeições e sustento dos trabalhadores.
4. Estágio `acampamento -> vila` com objetivos explícitos.
5. Novos edifícios em layout orientado a tiles.

## Validação necessária no ambiente de desenvolvimento

As auditorias estáticas de conteúdo, acampamento e economia foram executadas nesta entrega e finalizaram com zero erros. O arquivo recebido não inclui `node_modules`, lockfile npm, `go.sum` ou `Cargo.lock`, e o ambiente de revisão não possui Go/Rust; por isso, compilação completa de backend, frontend e Tauri permanece como gate de homologação local.

```bash
cd backend
go test -race ./...

cd ../frontend
npm install
npm run build
npm run tauri build
```

Depois da primeira instalação reproduzível, `package-lock.json`, `go.sum` e `Cargo.lock` devem ser versionados; as execuções seguintes devem voltar a usar `npm ci`.

Também deve ser ensaiada uma atualização sobre cópia de banco que já possua migrations até `000013`, verificando saldos antes e depois da aplicação da `000014`.