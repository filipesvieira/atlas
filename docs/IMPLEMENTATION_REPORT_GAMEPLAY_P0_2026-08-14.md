# Relatório de Implementação — Economia, Offline, Assentamento e QA (P0)

Data: 2026-08-14

## Escopo entregue

### Depósito e carga segura

- Depósito Improvisado: 10.000 unidades.
- Armazém: 30.000 / 100.000 / 500.000 unidades.
- Troféus continuam livres de capacidade e protegidos contra descarte.
- A carga segura agora expõe lotes por procedência e preserva `source_kind`/`source_key` quando apenas parte do lote cabe no depósito.
- O resgate consolidado incrementa a revisão do acampamento uma única vez e mantém resposta idempotente por `request_id`.

### Progressão offline

- Cada onda projeta dano recebido, defesa, aproximação melee/ranged, roubo de vida e regeneração.
- Onda fatal não concede recompensas parciais.
- Derrota retorna o herói ao acampamento com 40% de HP, fase 1 e expedição pausada; auto-retorno volta a funcionar após a recuperação.
- Recompensas especiais de chefes offline: no máximo uma por hora e 12 por relatório.
- Relatório diferencia chefes derrotados de chefes que concederam pacote especial.

### Drops temáticos

- Partes comuns: chance reduzida de 72% para 30% (1–2 unidades).
- Parte de chefe: 1–2 por pacote especial, em vez de 3–6.
- Pó de Qualidade de chefe: 12%, em vez de 18%.
- Troféu de chefe permanece garantido quando o pacote especial é elegível.

### Ambições

- O seletor de raridade passa a respeitar os limites da receita.
- Receitas Tier 1 não iniciam mais com uma meta Épica impossível; o padrão é Incomum.

### Moradores e Canvas

- Nomes dos três pioneiros são determinísticos por personagem, com 144 combinações por arquétipo.
- Moradores ociosos e artesãos aparecem no acampamento.
- Visuais distintos: pescador com vara, extrator com machado e cultivadora com regador.
- Morador em coleta não é desenhado no acampamento, pois está fora cumprindo a ordem.

### Conta de QA

- Feature flag: `ATLAS_DEV_TOOLS_ENABLED`.
- Bloqueio fatal se a flag for usada em `staging` ou `production`.
- Conta Docker local: `atlas-admin@local.test` / `AtlasTest!2026`.
- Botão **Preparar QA** na seleção de personagem.
- O preset só altera personagens pertencentes à própria conta administrativa e recusa sessão WebSocket ativa.
- Preset: nível 100, atributos 100, 100 milhões de gold, regiões, receitas, projetos, recursos, Armazém 3, profissões/moradores 60 e conclusão dos temporizadores já iniciados.

### Correção PostgreSQL

A consulta de desbloqueio de receita por troféu passou a usar casts explícitos (`$1::uuid`, `$2::text`, `$3::text`). Isso elimina a ambiguidade que produzia `pq: inconsistent types deduced for parameter $3`.

## Verificações executadas neste ambiente

- `node tools/audit-content.mjs`: aprovado, 0 erros.
- `node tools/audit-camp-content.mjs`: aprovado, 0 erros.
- `node tools/audit-economy.mjs`: aprovado, 0 erros.

O ambiente de empacotamento não possui Go, Docker nem dependências npm instaladas. Portanto, `go test ./...` e `npm run build` precisam ser executados na máquina de destino conforme o README.

## Próxima etapa recomendada (P1)

1. Plano de produção recursivo para Ambições: artesãos produzirem lingotes, tábuas, tecido e couro automaticamente, preservando sobras.
2. Scheduler persistente de trabalhadores independente de WebSocket, com ordens repetíveis e reconciliação por lease.
3. Recrutamento progressivo de novos moradores condicionado a moradia, reputação e prosperidade.
4. Estágios visuais `camp → hamlet → village → town → city` e layout dinâmico de NPCs.
5. Ferramentas QA granulares: reset de uma construção, simular N horas e forçar raridade/drop específico.
