# Reino do Avesso — M6 Scouting / Inteligência

**Data:** 2026-09-01  
**Status:** implementada; M7 Raid permanece desligada.

## Objetivo

Transformar o Mapa Territorial da M5-D em uma camada de inteligência persistente sem expor o snapshot privado de outro jogador e sem introduzir microgerenciamento de moradores.

## Fluxo

1. jogador seleciona outro assentamento no Mapa Territorial;
2. `Enviar batedores` cria missão server-authoritative e idempotente;
3. custo sai da Tesouraria (com auto-fund existente, respeitando reserva pessoal);
4. distância define custo e duração base;
5. Rastreador + coordenação da Sala de Guerra melhoram o scouting;
6. Torre de Vigia + comando defensivo alimentam contraespionagem;
7. scheduler global conclui a missão;
8. atacante recebe relatório estimado e temporário;
9. defensor recebe alerta apenas quando os batedores são detectados.

## Informação entregue

O relatório expõe somente faixas/estimativas:
- Defense Power;
- nível provável de Muralha;
- nível provável de Torre de Vigia;
- guarnição estimada;
- presença provável/confirmada do Ressonador;
- faixa de exposição do Armazém;
- faixa de exposição da Tesouraria;
- confiança, qualidade, idade e expiração.

Nenhum valor privado exato de estoque, tesouraria, guarnição ou snapshot é enviado ao cliente.

## Persistência

Migration: `000040_m6_scouting.sql`.

A tabela `settlement_scouting_missions` mantém request idempotente, atacante/defensor, custo, parâmetros de scouting, timestamps, resultado sanitizado e metadados privados de integridade.

## UX

- painel de Inteligência integrado ao Mapa Territorial;
- badge no mapa: missão ativa, inteligência fresca ou inteligência velha;
- contador de retorno em tempo real;
- relatório no reino selecionado;
- alertas de contraespionagem das últimas 24h;
- Centro de Comando abre o mapa também na seção Inteligência.

## Próxima fase

`M7 — Raid Reino vs Reino`: preparação, viagem/logística, resolução sobre snapshot defensivo, proteção pós-raid, limites anti-abuso e saque territorial limitado.
