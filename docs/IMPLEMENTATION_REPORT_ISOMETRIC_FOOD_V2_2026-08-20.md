# Atlas — Relatório de Implementação: Vila Isométrica + Cozinha/Buffs V2

Data: 2026-08-20

## Escopo desta entrega

Esta entrega continua a rodada de hardening do executável Tauri e transforma o acampamento em uma base de assentamento personalizável, sem quebrar os cinco prédios e saves legados. Também cria o primeiro novo ciclo econômico completo baseado em recursos já existentes: Cozinha -> refeições -> bônus persistentes do herói.

## 1. Layout isométrico livre e identidade do assentamento

### Persistência

A migration `000015_isometric_camp_layout.sql` adiciona de forma aditiva às construções:

- `tile_x`
- `tile_y`
- `rotation`
- `layout_version`

Os cinco `slot_key` antigos continuam válidos como identificadores de instância para preservar saves. Eles deixam de representar posição física.

O domínio usa um grid 16x12 e footprints por construção. O backend é a autoridade para:

- limites do terreno;
- colisões;
- footprint rotacionado;
- ownership;
- revisão otimista do acampamento;
- bloqueio de movimento durante uma obra.

### Posicionamento antes/depois da obra

Novos projetos podem existir como fundações de nível 0. O jogador pode arrastar essa fundação antes de iniciar a primeira construção e pode reorganizar o prédio novamente depois de pronto.

A Cozinha já nasce nesse modelo livre, demonstrando que novos prédios não precisam ser adicionados aos cinco slots cardeais antigos.

### Drag-and-drop e rotação

No canvas do acampamento:

- arrastar move uma construção;
- preview verde/vermelho mostra posição válida/inválida;
- soltar só envia a mutação se o cliente considerar válida;
- o servidor valida tudo novamente;
- `R` durante o arraste gira 90°;
- footprints como Cozinha 3x2 passam a 2x3 quando girados.

Isso permite que cada jogador organize o assentamento de maneira própria.

## 2. Cozinha de Campanha

Nova construção `kitchen`, com três níveis e renderer pixel-art dedicado.

### Nível 1

- 3.500 gold
- 120 madeira
- 60 pedra
- requer Fogueira nível 1
- libera culinária básica

### Nível 2

- 30.000 gold
- 500 madeira
- 300 pedra
- 150 ferro
- requer Fogueira nível 2 e Armazém nível 1
- melhora velocidade de produção

### Nível 3

- 150.000 gold
- 1.600 madeira
- 1.000 pedra
- 700 ferro
- 150 essência arcana
- requer Fogueira nível 3 e Armazém nível 2
- melhora velocidade de produção

O desenho evolui de fundação/fogareiro para bancada, despensa e, no nível 3, forno de pedra e chaminé.

## 3. Nova profissão: Cozinheiro

Foi registrada a profissão `cook` / Cozinheiro como profissão de manufatura.

- O catálogo passa de 12 para 13 profissões.
- Novos moradores procedurais podem receber `cook`.
- Aurora dos Elixires passa a garantir `herbalist + alchemist + cook` entre os pioneiros, mantendo sete pioneiros e preservando a estrutura populacional atual.

## 4. Seis refeições iniciais

As receitas usam recursos que já faziam parte da economia, criando utilidade recorrente para peixe, carne, farinha, ervas e flor arcana.

| Refeição | Efeito | Duração | Requisito principal |
|---|---:|---:|---|
| Peixe Assado | +5% XP de combate | 20 min | Cozinheiro 1 / Cozinha 1 |
| Espeto do Caçador | +5% Ataque | 20 min | Cozinheiro 1 / Cozinha 1 |
| Ensopado do Explorador | +8% XP de combate | 5 h | Cozinheiro 8 / Cozinha 2 |
| Torta do Rastreador | +7% Ataque | 5 h | Cozinheiro 8 / Cozinha 2 |
| Banquete Arcano | +12% XP de combate | 24 h | Cozinheiro 18 / Cozinha 3 |
| Banquete do Guerreiro | +10% Ataque | 24 h | Cozinheiro 18 / Cozinha 3 |

As receitas também têm custo em gold, reforçando a função de gold sink recorrente da economia do assentamento.

## 5. Buffs persistentes em tempo real

A migration `000016_character_food_buffs.sql` adiciona:

- histórico de intervalos de buffs;
- categoria do buff;
- recurso de origem;
- efeito e magnitude;
- início e expiração em `TIMESTAMPTZ`;
- versão de conteúdo;
- transações idempotentes de consumo.

### Regra inicial de stacking

Existe uma categoria `meal`. Apenas uma refeição dessa categoria fica ativa por vez. Consumir outra encerra a anterior no instante do novo consumo. O frontend pede confirmação antes da substituição.

### Por que manter histórico

Não foi implementado apenas um campo "buff atual". Cada refeição é um intervalo temporal persistido. Isso é necessário para a simulação offline.

Exemplo:

- jogador consome um buff de 5 h;
- joga 30 min;
- fecha o executável;
- volta 8 h depois.

A simulação consegue aplicar o bônus somente nas 4 h 30 restantes em que ele realmente estava ativo, mesmo que já esteja expirado no momento do login.

### Online

O motor aplica:

- multiplicador de XP no momento do abate;
- multiplicador de ataque na derivação dos atributos.

### Offline

A simulação recalcula os atributos no instante simulado de cada onda e aplica XP no instante de cada abate. Fechar o jogo não congela nem estende uma refeição.

## 6. Consumo transacional e idempotente

Novo comando WebSocket `CONSUME_FOOD`.

O consumo:

1. valida personagem/conta;
2. serializa a mutação por lock do personagem;
3. trata `request_id` idempotente;
4. verifica revisão esperada do acampamento;
5. remove exatamente uma unidade do recurso;
6. encerra refeição anterior da mesma categoria;
7. cria o novo intervalo;
8. registra ledger de recurso;
9. incrementa `state_revision`;
10. devolve snapshot autoritativo.

Retries simultâneos com o mesmo `request_id` não consomem duas refeições.

## 7. Interface da Cozinha

O Hub Econômico ganhou a aba `🍳 Cozinha` com:

- refeição atualmente ativa;
- efeito e tempo restante;
- receitas culinárias disponíveis;
- requisitos de profissão/prédio;
- integração com o crafting existente;
- despensa de refeições prontas;
- botão Consumir;
- confirmação ao substituir refeição ativa.

## 8. Identidade visual de recursos e equipamentos

A primeira camada visual foi incorporada nesta entrega completa:

- raridade volta a ser considerada visualmente;
- material é independente da raridade;
- madeira, couro, tecido, osso, pedra, cobre, bronze, prata e ferro possuem paletas próprias;
- Broquel de Madeira recebe desenho circular com tábuas, emendas, aro escuro e boss metálico;
- uma raridade alta adiciona ornamentação, mas não transforma madeira em metal/ouro;
- novo `PixelResourceSprite` diferencia peixe, carne, trigo, farinha, madeira, minério, carvão, ervas, couro, troféus e partes de monstros;
- as seis refeições têm sprites dedicados.

O `image-rendering: pixelated` também deixa de ser imposto globalmente à UI e fica restrito a sprites/canvas.

## 9. Tesouraria: financiamento automático opt-in

A migration `000017_treasury_auto_fund_opt_in.sql` muda apenas o default futuro de `treasury_auto_fund_enabled` para `FALSE`.

Importante: a migration `000014` não foi modificada. Isso preserva o checksum de uma migration potencialmente já publicada e não altera preferências de assentamentos existentes.

A UI também assume `false` na ausência de estado recebido. O jogador continua podendo ativar a transferência automática e configurar a reserva pessoal.

## 10. Hardening Tauri incluído no pacote

A entrega também contém a camada anterior de correção para o executável:

- cliente Tauri não deduz backend a partir da origem local da WebView;
- builds recebem `VITE_API_BASE_URL` e `VITE_WS_BASE_URL`;
- workflow de release injeta os endpoints configurados;
- CSP explícita no Tauri;
- removidos Tailwind CDN e Google Fonts remotos do HTML;
- allowlist de origens do backend preparada para Tauri;
- falha crítica ao carregar Baú de Achados interrompe a sessão em vez de tratar erro como baú vazio.

## 11. Validações executadas

### Passaram

- `go test ./pkg/game`
- `node tools/audit-content.mjs` — 0 erros
- `node tools/audit-camp-content.mjs` — 0 erros
- `node tools/audit-economy.mjs` — 0 erros
- checagem sintática/transpile de 87 arquivos `.ts/.tsx` — 0 erros
- `git diff --check` — sem whitespace errors

Resultados atuais dos audits:

- 9 regiões
- 39 monstros/chefes
- 96 templates de equipamentos
- 81 recursos registrados
- 6 construções de acampamento
- 13 profissões
- 6 expedições de coleta
- 6 refeições persistentes

### Não foi possível homologar integralmente neste ambiente

`go test ./...` para antes de compilar servidor/DB porque o pacote-fonte enviado não possui `backend/go.sum`. As entradas faltantes reportadas pelo Go incluem `lib/pq`, `chi`, `cors`, `jwt`, `gorilla/websocket` e `x/crypto`.

O frontend também foi enviado sem `package-lock.json` e sem `node_modules`. Uma tentativa de resolver dependências neste ambiente não concluiu dentro da janela disponível; por isso não é correto afirmar que `npm run build` ou o bundle Tauri final foram homologados aqui.

Não foram fabricados lockfiles/checksums manualmente.

## 12. Compatibilidade de saves

As mudanças de banco desta rodada são aditivas.

- ouro existente não é zerado;
- recursos existentes não são convertidos;
- inventário/equipamentos não são recriados;
- moradores existentes são preservados;
- níveis/timers das cinco construções antigas são preservados;
- `slot_key` legado continua válido;
- layout antigo recebe posições determinísticas;
- a nova Cozinha é adicionada como fundação livre;
- política de auto-financiamento existente não é sobrescrita.

Antes de aplicar em produção, continue fazendo backup do PostgreSQL e execute as migrations pelo migrador oficial do projeto.

## 13. Próximos passos recomendados

A base está pronta para continuar a transformação de acampamento -> vilarejo -> vila -> cidade. Os próximos incrementos de maior valor são:

1. unificar z-order de moradores, prédios e props para oclusão isométrica perfeita;
2. ruas/caminhos decorativos e tiles de terreno;
3. câmera com pan/zoom e expansão comprável de terreno;
4. Taverna/Estalagem ligada a Prosperidade e chegada de moradores;
5. Campo de Treinamento;
6. produção culinária automática por morador Cozinheiro;
7. mover identidade visual de equipamentos de heurística de nome para `visual_key/material/silhouette` explícitos no catálogo;
8. adicionar lockfiles e CI com `npm ci`, `go test ./...` e bundle Tauri Windows/Linux/macOS;
9. updater/version handshake do executável.