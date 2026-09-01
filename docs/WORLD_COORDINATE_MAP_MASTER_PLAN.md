# World Coordinate Map Master Plan — Mapa Territorial de Reinos

**Status:** **M5-D funcional e visualmente implementada em 2026-09-01**; resta o gate integral final no repositório real para encerrar formalmente a fase.  
**Nome de UX:** **Mapa Territorial** / **Mapa de Reinos**. O termo “Mapa do Mundo” já é usado pela navegação PvE e não deve ser sobrecarregado.

## 1. Visão

Cada assentamento possui uma posição fixa em um mundo persistente:

```text
(-1, 1)   (0, 1)   (1, 1)
(-1, 0)   (0, 0)   (1, 0)
(-1,-1)   (0,-1)   (1,-1)
```

Ao começar, o Reino recebe coordenadas únicas `(x,y)`. A Sala de Guerra abre o Mapa Territorial centrado no próprio assentamento.

Isso substitui uma lista abstrata de “alvos disponíveis” por geografia compreensível e cria um fundamento simples para distância, scouting e viagens de raid.

## 2. Princípios

1. coordenadas são atribuídas pelo backend e únicas dentro de um mundo/shard;
2. posição inicial é fixa — sem teleporte/mudança de Reino na primeira versão;
3. distância influencia **tempo e logística**, não concede bônus arbitrário de dano;
4. coordenada/nome podem ser públicos; detalhes defensivos exigem Inteligência M6;
5. cliente nunca descobre dados privados lendo tabelas do alvo;
6. mapa funciona com zoom/pan e também com busca/lista acessível;
7. proteção de novatos e pós-raid continua obrigatória.

## 3. Persistência proposta

Fase M5-D:

```text
worlds
- id
- key
- name
- rules_version

settlements
- world_id
- world_x
- world_y
- world_assigned_at

UNIQUE(world_id, world_x, world_y)
```

Para escala futura, `world_id` evita assumir que todo jogador do produto estará eternamente no mesmo plano cartesiano.

## 4. Alocação de coordenadas

Não usar `SELECT random()` até achar espaço livre.

Recomendação: sequência transacional + espiral quadrada determinística:

```text
0  -> (0,0)
1  -> (1,0)
2  -> (1,1)
3  -> (0,1)
4  -> (-1,1)
...
```

O algoritmo é reproduzível, livre de corrida quando respaldado por sequence/constraint e mantém os primeiros assentamentos relativamente próximos.

Mais tarde podemos introduzir regiões/shards sem alterar a semântica `(x,y)`.

## 5. Distância

Distância base:

```text
dx = alvo.x - origem.x
dy = alvo.y - origem.y
d = sqrt(dx² + dy²)
```

M6 poderá derivar:
- tempo de scouting;
- custo de provisões;
- validade/frescura de inteligência.

M7 poderá derivar:
- tempo de preparação/viagem da incursão;
- custo logístico;
- cooldown/alcance operacional.

**Não** usar distância para multiplicar Attack/Defense Power. Um Reino distante não fica magicamente mais forte.

## 6. Sala de Guerra

A Sala de Guerra evolui progressivamente:

### M5-D
- abre Mapa Territorial;
- mostra “Você está em (x,y)”;
- pan/zoom;
- reinos conhecidos próximos;
- distância geométrica.

### M6
- botão `Enviar batedores`;
- névoa de informação;
- último relatório + idade;
- detecção/contraespionagem.

### M7
- selecionar objetivo;
- estimar viagem/custo;
- preparar incursão;
- acompanhar ida/resolução/retorno.

## 7. Informação visível

Sem scouting:
- nome público do Reino;
- coordenada;
- estágio aproximado/publicável;
- status de proteção que impede ação (sem revelar motivo privado).

Com scouting:
- faixa estimada de Defense Power;
- muralha/torres detectadas;
- guarnição estimada;
- recursos expostos por faixa, nunca valores privados exatos por padrão;
- timestamp `visto há ...`.

Informação envelhece. O mapa não é uma API de espionagem gratuita.

## 8. Proteções

Antes de M7 devem existir:
- proteção inicial de Reino/novo jogador;
- shield após sofrer raid;
- limite de frequência por par atacante/defensor;
- limites de diferença de progressão;
- alvo indisponível quando não há snapshot defensivo válido;
- nenhum saque de GoldBank pessoal/equipamento do herói.

## 9. QA

Presets administrativos devem conseguir gerar vizinhos determinísticos:

```text
QA_SELF       (0,0)
QA_NEAR       (2,1)
QA_MEDIUM     (8,-4)
QA_FAR        (20,15)
```

Isso permite testar distância e mapa sem depender de dezenas de contas reais.

## 10. Sequência

```text
✅ M5-C  Defense Power / Readiness / snapshots
✅ S1    simplificação do herói
🟡 M5-D  World Grid + coordenadas + mapa visual V2 — gate final pendente
⬜ M6    Scouting baseado em distância/inteligência
⬜ M7    Raid baseada em mapa/logística
```

## 11. Resultado da implementação M5-D

Implementado nesta fundação:
- `worlds` e coordenadas persistentes em `settlements`;
- alocação determinística em espiral quadrada com unicidade por mundo;
- backfill/reconciliação de settlements legados no startup;
- distância geométrica `sqrt(dx² + dy²)` sem bônus de combate;
- contrato público do mapa sem Defense Power, guarnição ou recursos privados;
- WebSocket `REQUEST_TERRITORIAL_MAP` / `TERRITORIAL_MAP`;
- painel de Mapa Territorial com pan, zoom, busca, lista acessível e seleção;
- renderer cartográfico Canvas com células `(x,y)` preenchendo integralmente o viewport, sem cards sobrepostos;
- terreno procedural e miniaturas dos estágios usando `FOREST_NIGHT_PALETTE`, `CAMP_VISUAL_PALETTE`, `WORLD_VISUAL_CONTRACT` e primitivas isométricas já canônicas;
- régua de coordenadas, hover, foco, seleção e zoom ancorado no cursor;
- integração com o Centro de Comando;
- presets QA determinísticos em mundo QA separado: `QA_SELF`, `QA_NEAR`, `QA_MEDIUM`, `QA_FAR`.

A M5-D não habilita scouting nem raids. M6 continua responsável por inteligência e M7 por resolução ofensiva.