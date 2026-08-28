# Reino do Avesso — Base de Conhecimento & Arquitetura Técnica

Este documento serve como a **Fonte da Verdade (Single Source of Truth)** do projeto **Reino do Avesso**. `Atlas` permanece em nomes internos e contratos de compatibilidade. As regras abaixo refletem o checkout atual; números e decisões históricas devem ser conferidos em [`DOCUMENTATION_STATUS.md`](DOCUMENTATION_STATUS.md).

## 🌎 Multiplayer M2 — Redis compartilhado, PostgreSQL autoritativo e scheduler global

- PostgreSQL continua sendo a fonte persistente para personagem, inventário, economia, chat histórico, bloqueios, denúncias e perfil PvP.
- Redis é exclusivamente efêmero/realtime: `atlas.social.world.v1` transmite eventos sociais por Pub/Sub; `atlas.settlement.scheduler.v1` transmite a conclusão de trabalhos para os gateways; `atlas:presence:character:v1:<id>` mantém presença com TTL de 60 segundos; `atlas:presence:online:v1` fornece a contagem global após remover entradas vencidas.
- A presença contém um token por sessão. Um disconnect atrasado só remove sua própria chave e nunca apaga a reconexão que já assumiu o mesmo personagem.
- Tickets WebSocket são gravados em `atlas:ws-ticket:v1:<ticket>` com TTL de 20 segundos e consumidos por `GETDEL`; portanto continuam single-use mesmo quando o HTTP e o upgrade WebSocket chegam a réplicas distintas.
- A M3A persiste convites em `pvp_duel_challenges`: expiram em 90 segundos, são idempotentes por `(challenger_character_id, request_id)` e são entregues ao destinatário pelo stream social.
- A M3B cria uma única `pvp_matches` por desafio aceito, junto de `pvp_match_participants` e `pvp_match_events`. O snapshot JSONB interno congela atributos derivados, equipamento, skills e buffs ativos; vida e mana começam completas sem tocar o estado de expedição. Somente `PvPMatchNotice` (id, arena, status e versão de regras) é enviado ao cliente, evitando expor o build completo do oponente.
- A M3C exige confirmação bilateral em 90 segundos e promove `ready` para `active` numa única transação. Uma segunda liderança PostgreSQL (`atlas_pvp_arena_scheduler_v1`) executa `PvPCombatInstance` isolada em pulsos de 250 ms, persiste posição, vida, cooldowns e estado aleatório para recuperação, e publica apenas o snapshot seguro de combate no stream social. O duelo não consome poções, não altera a expedição e não concede recompensa nesta versão.
- Ao reconectar durante `ready`, o gateway consulta a confirmação individual persistida e recompõe o card correto: entrar na arena ou aguardar o oponente. Arenas sem ambas as confirmações expiram de forma autoritativa e registram `MATCH_TIMEOUT`.
- A M3D conecta esse contrato seguro a `PvPArenaViewport`, um canvas isométrico sobreposto ao `GameCanvas`. O renderer usa a grade 24×18, terreno de runas, tochas e avatares genéricos de guerreiro/arqueiro/mago conforme o arquétipo público. O viewport de expedição não é destruído, e o Canvas PvP não recebe detalhes privados do build adversário.
- A M3E-A versiona habilidades de duelo sem reutilizar a execução do PvE: `PvPCombatRulesVersion = 2` sela a rotação das até duas skills ativas no instante do aceite. A tabela PvP possui custo, recarga, dano e cura próprios; seus cooldowns e posição de rotação estão no `runtime_state` para recuperação determinística. A rede recebe somente `skill_key` e `is_healing` no evento já resolvido.
- Em `development`, indisponibilidade de Redis reduz social/tickets/scheduler ao adapter local e emite aviso. Em `staging` e `production`, Redis é obrigatório no startup para impedir visão fragmentada do mundo.
- O lease de personagem permanece no PostgreSQL e impede duas sessões ativas para o mesmo herói. O scheduler usa uma única liderança global por `pg_try_advisory_lock(hashtext('atlas_settlement_scheduler_v1'))`; se a conexão líder cair, o PostgreSQL libera o lock e outra réplica pode assumir. A líder persiste a mutação normalmente e publica um evento leve; a réplica dona do WebSocket consulta PostgreSQL e aplica snapshots por revisão, sem receber estado de combate por Redis.

## 🏦 Economia do Acampamento V1.2 — Tesouraria e Folha

- O ouro pessoal continua intacto e financia o caixa somente por transferência manual ou política automática autorizada.
- Salários são cobrados por ordem produtiva, nunca por calendário ou tempo offline sem trabalho.
- A folha é subsidiada até 25 de Prosperidade para não bloquear o onboarding.
- Toda ordem reserva o salário antes de começar; sem caixa, ela não começa e nunca cria saldo negativo.
- A reposição automática preserva `treasury_personal_gold_reserve` e transfere somente o déficit.
- Coletas concluídas liquidam a folha no mesmo fluxo transacional que entrega recursos e libera o morador.
- Cancelamento paga proporcionalmente ao tempo trabalhado e devolve a parte não utilizada.
- Ordens antigas recebem `wage_reserved=0`, preservando integralmente saves já existentes.
- O ledger `settlement_gold_ledger` e a tabela `settlement_payroll` são a trilha auditável da economia do assentamento.
- Custos são snapshots com `economy_version`; mudanças futuras não alteram trabalhos em andamento.

## 🏘️ Assentamento Vivo — estado atual (Profissões, Cozinha e Layout Isométrico)

O personagem é o herói e proprietário do assentamento. Ele decide construções e permanece focado em combate; moradores persistentes com especialidades individuais assumem coleta e artesanato automático.

| Responsabilidade | Autoridade |
|---|---|
| Construir e melhorar edifícios | Jogador |
| Selecionar Ambições e metas de raridade | Jogador |
| Escolher morador livre especializado e executar ordem | Servidor |
| Reservar/consumir materiais e ouro | Transação PostgreSQL |
| Coletar recursos brutos | Moradores Especialistas de Coleta |
| Forjar equipamentos e processar materiais | Moradores Artesãos Especializados |
| Guardar produção automática | Arsenal do assentamento |

### Sistema de Profissões Especializadas (Coleta vs Artesanato)
O jogo possui **13 profissões canônicas** divididas entre extração e manufatura:
- **🌲 6 Profissões de Coleta (*Gathering*)**:
  - 🪓 `lumberjack` (Lenhador): Madeira, resina e sementes em bosques.
  - ⛏️ `miner` (Minerador): Minérios de ferro, carvão e pedras.
  - 🎣 `fisher` (Pescador): Peixes, escamas e óleos aquáticos.
  - 🌾 `farmer` (Agricultor): Trigo, fibras e sementes.
  - 🐾 `tracker` (Rastreador): Couros crus, peles e carnes.
  - 🌿 `herbalist` (Herbalista): Ervas medicinais e essências naturais.
- **⚒️ 7 Profissões de Artesanato (*Crafting*)**:
  - ⚔️ `blacksmith` (Ferreiro): Armas corpo a corpo (espadas, machados, clavas), escudos e fundição de lingotes.
  - 💎 `jeweler` (Joalheiro): Anéis, amuletos, colares e lapidação de joias.
  - 🧥 `leatherworker` (Coureiro / Sapateiro): Botas, sandálias, mochilas, bolsas e curtume.
  - 🧵 `tailor` (Alfaiate): Armaduras (peitorais, robes, túnicas), calças, capacetes e tecelagem.
  - 🪵 `woodworker` (Marceneiro): Arcos, varinhas mágicas, cajados, flechas, virotes e tábuas tratadas.
  - 🧪 `alchemist` (Alquimista): Elixires, poções, pós e refinamentos arcanos.
  - 🍳 `cook` (Cozinheiro): Refeições persistentes de preparação, usando peixe, carne, farinha, ervas e ingredientes raros.

### Alquimia e progressão inicial de consumíveis

- A **Bancada de Alquimia** (`alchemy_bench`) nasce descoberta, assim como a Cozinha, mas precisa ser construída. O nível 1 exige Fogueira nível 1, 100 Madeira, 50 Pedra, 2.500 gold e 15 minutos.
- A aba **Alquimia** fica ao lado da Cozinha e usa a mesma fila de produção autoritativa, prévia de requisitos e consumo persistente de recursos.
- As poções básicas começam no **Alquimista nível 1 + Bancada nível 1**: Tônico de Força (+5% ataque por 30 min) e Tônico de Foco (+5% XP de combate por 30 min). Elas usam categorias de buff próprias e não substituem uma refeição ativa.
- O Elixir Arcano é uma receita intermediária (**Alquimista nível 8 + Bancada nível 2**) e usa Pó Arcano Residual, mantendo os catalisadores raros fora da entrada da progressão.
- A curva inicial de equipamentos foi suavizada somente no Tier 1: a quantidade-base de materiais processados caiu de 4 para 3. A parte de monstro, o ouro, a profissão, a estação e os drops permanecem exigidos. Tiers 2+ não foram alterados e os drops da primeira região não foram aumentados.

### Os 7 Pioneiros Iniciais (Dupla Profissão Garantida)
Para assegurar que nenhum jogador fique bloqueado no início do jogo, os 7 pioneiros cobrem 100% das 6 coletas e 100% dos 7 artesanatos desde o nível 1; Aurora também assume a cozinha inicial:
1. **Tonho Três-Machados**: `lumberjack` (Lenhador) + `blacksmith` (Ferreiro)
2. **Jurema Puxa-Rede**: `fisher` (Pescadora) + `leatherworker` (Coureira / Sapateira)
3. **Dona Cida do Chá Suspeito**: `farmer` (Agricultora) + `jeweler` (Joalheira)
4. **Mestre Alencastro**: `miner` (Minerador) + `tailor` (Alfaiate)
5. **Seu Barnabé das Vigas**: `tracker` (Rastreador) + `woodworker` (Marceneiro)
6. **Aurora dos Elixires**: `herbalist` (Herbalista) + `alchemist` (Alquimista) + `cook` (Cozinheira)
7. **Dona Elena Pé-de-Trilha**: `fisher` (Pescadora) + `tracker` (Rastreadora) — Suporte de coleta rápida

### Sistema de Raridade Procedimental de Novos Moradores (*Arrivals*)
Quando a prosperidade e moradia atraem novos moradores, suas especialidades são sorteadas por tabela de raridade determinística:
- 🟢 **Comum (65%)**: 1 Profissão única (Nv. 1).
- 🔵 **Raro (25%)**: 2 Profissões combinadas (Nv. 1).
- 🟣 **Épico (8%)**: 2 Profissões e inicia em **Nível 2**!
- 🟡 **Lendário (2%)**: Grão-Mestre com 2 Profissões e inicia em **Nível 3**!

---

## 📌 1. Visão Geral do Projeto

**Reino do Avesso** é um jogo MMORPG Idle web de inspiração clássica (estilo Tibia e retro-RPGs), com:
- **Engine de Combate em Tempo Real**: desenvolvida em **Go (Gorilla WebSockets)**, com posição autoritativa em grid regional 24x18 e atualização por eventos/ticks do servidor.
- **Viewport 2D Ultra-Fluido**: renderizador HTML5 Canvas 2D customizado a 60 FPS, com interpolação, fundos cênicos, efeitos de ataque, feitiços, projéteis e barras de status flutuantes.
- **Conteúdo modular atual**: 9 regiões, 40 monstros/bosses, 13 profissões, 11 slots de equipamento, 6 maestrias e expedições com quantidade de fases definida pelo catálogo.

---

## 🏗️ 2. Arquitetura do Sistema & Estrutura de Arquivos

```
atlas/
├── backend/                        # Servidor de Jogo & API em Go
│   ├── cmd/server/                 # Ponto de entrada do servidor
│   │   ├── main.go                 # Inicialização da API, rotas HTTP e servidor de WS
│   │   └── ws.go                   # Handler do WebSocket e roteamento de ações do jogador (ClientAction)
│   ├── pkg/game/                   # Motor de Jogo e Regras de Negócio
│   │   ├── engine.go               # Loop principal (processTick), cálculo de stats, grid, fases e SetRegion
│   │   ├── loot.go                 # Itens, templates, 11 slots e GenerateLootForMonster
│   │   ├── expeditions.go          # Mapa do mundo, tiers, 9 regiões, fases e Bosses
│   │   ├── arena_terrain.go        # Grade regional, flags de terreno e definições de arena
│   │   ├── arena_collision.go      # Ocupação, colisão e navegação autoritativas
│   │   └── offline.go              # Simulação de progresso offline / descanso
│   └── internal/db/                # Persistência e Banco de Dados
│       ├── db.go                   # Migrações SQL, consultas PostgreSQL e persistência JSONB
│       └── cache.go                # Cache em memória e gerador de monstros fallback
├── frontend/                       # Cliente Web React / TypeScript / Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/          # Painel principal do jogo (DashboardGrid.tsx)
│   │   │   ├── Viewport/           # Renderizador Canvas 2D (GameViewport.ts, GameCanvas.tsx)
│   │   │   ├── Expedition/         # Modal do Mapa do Mundo e Seletor de Regiões
│   │   │   │   ├── ExpeditionSelectionModal.tsx  # Modal expansível com Tiers e Loot Previews
│   │   │   │   └── ExpeditionRegionSelector.tsx # Card de expedição ativa e barra de fases
│   │   │   ├── Inventory/          # Grid de equipamentos estilo Tibia (11 slots)
│   │   │   └── Onboarding/         # Ajuda informativa dos estilos classless
│   │   ├── game/                   # Registries e renderers Canvas 2D por domínio
│   │   │   ├── registries/         # Biomas, heróis, monstros, itens e recursos
│   │   │   └── renderers/          # Arenas, efeitos, construções e sprites
│   │   └── hooks/
│   │       └── useGameSocket.ts    # Hook WebSocket para sincronização em tempo real (envio de region_id)
└── docs/                           # Documentação técnica do projeto
    └── KNOWLEDGE_BASE.md           # Este documento (Base de Conhecimento viva)
```

---

## ⚙️ 3. Motor de Combate & Simulação Tática

### Grid de Combate (24x18)
- A arena autoritativa usa uma grade regional de **24 colunas por 18 linhas**; o frontend converte as coordenadas para a projeção isométrica e interpola o deslocamento.
- A posição do herói, os pontos de spawn e as rotas não são mais fixos em uma única coluna. Os spawns são distribuídos pela definição da arena, incluindo os quatro cantos quando aplicável.
- Floresta e Vila do Shereque possuem terreno, obstáculos e colisão próprios; o acampamento usa a mesma geometria isométrica para sua cena.
- Regiões ainda não convertidas preservam o renderer legado até receberem geometria e terreno equivalentes.

### Máquina de Estados dos Monstros (`State`)
1. `CHASE`: O monstro avança em direção ao herói (`GridX--`).
2. `ATTACK`: Posição de combate corpo-a-corpo (`GridX <= 3`).
3. `KITE`: Posição de combate à distância (`GridX = 9`) adotada por monstros Ranged/Magos.
4. `FLEE`: Quando a vida do monstro cai abaixo de 20%, ele vira na direção oposta e tenta fugir até `GridX = 14`.

### Regra de Colisão & Vantagem de Distância (Melee vs Ranged)
- **Monstros Melee**: SÓ causam dano ao herói quando atingem a adjacência de ataque (`State == "ATTACK"` ou `GridX <= 3`).
- **Vantagem de Distância**: Heróis de distância (Arqueiros e Magos) atacam e eliminam monstros Melee enquanto eles ainda estão marchando de longe, sem sofrer dano até a aproximação física!
- **Monstros Ranged**: Disparam projéteis à distância (`State == "KITE"` ou `GridX <= 9`).

---

## ⚔️ 4. Armas, Velocidade de Ataque & Cálculo de DPS

### Multiplicadores de Cadência por Arquetipo
O jogo calcula o DPS (Dano por Segundo) combinando o Ataque Total, Atributos Primários (`STR`, `DEX`, `INT`), Maestrias e a velocidade de ataque do tipo de arma equipada no `MainHand`:

$$\text{DPS} = \left( \frac{\text{AtaqueTotal}}{0.75\text{s}} \right) \times \text{MultiplicadorVelocidade}$$

| Arquetipo de Arma | Multiplicador de Velocidade | Características Táticas |
|---|---|---|
| 🏹 **`bow` (Arcos / Bestas)** | **`1.40x`** (Rápido) | Altíssima cadência à distância. Escudo no `OffHand` não permitido. |
| 🔮 **`wand` (Cajados / Varinhas)** | **`1.25x`** (Média/Rápida) | Cadência mágica com consumo de Mana e ataques elementais. |
| ⚔️ **`sword` / `axe` / `club` (Melee)** | **`1.00x`** (Cadenciado) | Golpes pesados cadenciados, com capacidade de equipar **Escudo (`OffHand`)** para mitigar dano. |

---

## 🎯 5. Tabelas de Loot, Tiers e Requisitos de Nível (REFACT V3)

### Requisitos de Nível (`RequiredLevel`) & Atributos Bônus
Todo equipamento possui um **Nível Mínimo para Equipar (`required_level`)**. Heróis que não atingirem o nível exigido recebem um aviso visual `🔒 Requer Nível X` e têm a ação travada pelo servidor Go (`EquipItem`).

Além dos atributos primários de Ataque e Defesa, os equipamentos agora concedem **Bônus Ativos & Passivos**:
- **Atributos Primários**: `BonusSTR` (💪), `BonusDEX` (🎯), `BonusINT` (🔮) (aumentam os atributos do herói e o dano).
- **Vida & Mana**: `BonusHP` (❤️), `BonusMP` (💙) (aumentam MaxHP e MaxMP diretamente no `CalculateStats`).
- **Passivas Especiais**: `GoldBonus` (💰 % Ouro extra em drops), `Lifesteal` (🩸 % Cura ao causar dano), `ManaRegen` (💧 MP/s extra no tick) e `CritChance` (⚡ % Acerto Crítico extra).

### Progressão em 5 Tiers de Nível
1. **Tier 1 (Nível 1+)**: Espada do Aprendiz, Túnica de Couro (+5 HP), Pequena Bolsa, Flechas de Madeira. *(Monstros: Goblin, Lobo, Aranha)*
2. **Tier 2 (Nível 8+)**: Sabre de Bronze (+1 STR), Cota de Malha (+15 HP), Mochila de Aventureiro (+15 HP, +5% Ouro), Colar de Prata (+15 MP). *(Monstros: Pirata, Alma Negra)*
3. **Tier 3 (Nível 20+)**: Espada de Aço (+3 STR), Elmo Rúnico (+20 HP, +2 STR), Bolsa Rúnica (+30 MP, +3 INT, +10% Ouro). *(Monstros: Orc, Esqueleto)*
4. **Tier 4 (Nível 35+)**: Katana da Fúria (+5 STR, +3% Crit), Marreta Biônica (+5 STR, +2% Lifesteal), Mochila Dragônica (+50 HP, +4 STR, +15% Ouro). *(Monstros: Dementador, Voldemorte)*
5. **Tier 5 (Nível 50+)**: Espada Mítica do Vingador (+12 STR, +6% Crit), Armadura de Ouro (+80 HP, +6 STR), Mochila do Zodíaco (+80 HP, +60 MP, +5 All Stats, +25% Ouro). *(Monstros: Atenas, Espectro, Dragão)*

### Os 11 Slots de Equipamento Estilo Tibia
1. `head` (Capacetes, Elmos, Coroas de Ouro)
2. `chest` (Túnicas, Cotas, Peitorais, Armaduras de Ouro)
3. `legs` (Calças, Grevas, Saiotes dos Magos)
4. `boots` (Sandálias Ágeis, Botas de Couro, Botas de Ferro, Botas Celestiais)
5. `mainhand` (Espadas, Machados, Clavas, Arcos, Varinhas, Cajados)
6. `offhand` (Broquéis, Escudos de Batalha, Orbes, Escudo do Zodíaco)
7. `bag` (Pequena Bolsa, Mochila de Aventureiro, Bolsa Rúnica, Mochila Dragônica, Mochila do Zodíaco)
8. `ammo` (Flechas de Madeira, Flechas de Aço, Flechas Incendiárias, Flechas Divinas, Virotes Perfurantes)
9. `necklace` (Amuleto do Lobo, Colar de Rubi, Amuleto Dragônico, Amuleto do Zodíaco)
10. `ring` (Anel de Cobre, Anel de Prata, Anel de Ouro, Anel Místico)
11. `skill_book` (Livros de Habilidade: Golpe Giratório, Tiro Quádruplo, Bola de Fogo, Cura Divina)

---

## 🗺️ 6. Sistema de Expedições, 5 Estágios & Chefões (Bosses)

### Estrutura de Fases da Expedição
Chada região possui **5 Fases (Stages)**:
- **Estágios 1 a 4**: O jogador enfrenta hordas de monstros normais da região. Ao eliminar a horda, o indicador avança (`Fase 1/5 → 2/5 → 3/5 → 4/5`).
- **Estágio 5 (FASE FINAL - BOSS)**: Surge o **Chefão Final (Boss)** da região com sprite ampliado, borda dourada e stats elevados.
- **Troca de Região**: Ao trocar de região via `SetRegion(regionID)`, a sessão reseta automaticamente a expedição para `CurrentStage = 1` e `IsBossStage = false`.
- **Vitória contra o Boss**:
  1. Concede um **Baú de Recompensa de Boss (Raro/Lendário)** garantido.
  2. Emitir log e anúncio: `🏆 EXPEDIÇÃO CONCLUÍDA! O CHEFÃO FOI DERROTADO!`.
  3. **Desbloqueia a próxima expedição** na lista `unlocked_regions` salva no banco PostgreSQL!

### O Mapa do Mundo (9 Regiões Geek & Biomas Visuais)

| Tier | ID | Região | Boss & Nível | HP do Boss | Ataque do Boss | Atmosfera Cênica |
|---|---|---|---|---|---|---|
| **Tier 1** | `forest` | 🌲 **Floresta dos Aprendizes** | **Urso Ranzinza 🐻** (Nv. 5) | **520 HP** | **28 Atk** | Trilha de terra, floresta densa, montanhas. |
| **Tier 1** | `shereque` | 🍞 **Vila do Shereque** | **Fiona Arrazadora 🐸** (Nv. 5) | **560 HP** | **30 Atk** | Pântano verde, fogueira, chão de lama. |
| **Tier 1** | `chapolin` | 🎩 **Vila do Chapolin** | **Alma Negra 🏴‍☠️** (Nv. 5) | **600 HP** | **32 Atk** | Praia tropical ao pôr do sol, mar azul, coqueiros. |
| **Tier 2** | `orcruins` | 🏰 **Castelo de Greiscu** | **Esquelético Pacato 💀** (Nv. 12) | **1.100 HP** | **52 Atk** | Noite noturna, lua púrpura, ruínas de castelo. |
| **Tier 2** | `esgotos` | 🥷 **Esgotos Tartaruga** | **Destruidor Ranzinza 🥷** (Nv. 12) | **1.200 HP** | **55 Atk** | Subterrâneo de tijolos escuros, líquido verde neon. |
| **Tier 2** | `planalto` | 🏛️ **Planalto dos Três Poderes** | **Xandaum, o Soberano ⚖️** (Nv. 16) | **1.850 HP** | **72 Atk** | Esplanada monumental, Congresso, espelho d'água. |
| **Tier 3** | `rogartes` | 🧙‍♂️ **Escola de Rogartes** | **Voldemorte sem Nariz 🪄** (Nv. 20) | **2.600 HP** | **98 Atk** | Salão noturno místico, estrelas piscando. |
| **Tier 4** | `frozen` | 🛡️ **Santuário de Atenas** | **Mestre do Santuário 🌟** (Nv. 35) | **4.800 HP** | **155 Atk** | Picos congelados, geleira azul, Aurora Borealis. |
| **Tier 5** | `abyss` | 🌋 **Caverna do Dragão** | **Vingador de Chifres 🐲** (Nv. 85) | **12.500 HP** | **340 Atk** | Caverna vulcânica, rios de lava, obsidiana. |

### Cálculo Dinâmico de XP
O XP recebido por monstro/boss é calculado via:
$$\text{XP}_{final} = (\text{BaseXP} \times \text{NívelMonstro}) \times \text{FatorGlobal}$$
- **Multiplicadores**: Bosses concedem 3.5x XP base.
- **Scaling**: O nível do personagem atua como redutor se exceder o nível do monstro em +10.

---

## 🎨 7. Engine Gráfica & Viewport Canvas 2D (`GameViewport.ts`)

- **Tecnologia**: Renderizador 100% síncrono sobre HTML5 Canvas 2D a **60 FPS** sem depender de carregadores de textura assíncronos frágeis.
- **Renderers modulares de bioma**: `BiomeRegistry` roteia backgrounds, camadas dinâmicas, profundidade e geometria. Floresta e Vila do Shereque usam arenas isométricas 24x18 com efeitos; as demais regiões ainda usam seus renderers legados.
- **Gerador de Sprites Pixel Art (40 visuais)**: Renderiza sprites 2D em Canvas offscreen por `visual_key` para os 40 monstros/bosses catalogados. `PixelArtRenderer.ts` permanece como fachada de cache para monstros; novos visuais devem ser registrados nos módulos de tier.
- **Bosses Agigantados (64x64px)**: Bosses são renderizados com dimensões maiores (64x64px), auras elementais animadas e placa com coroa dourada/vermelha.
- **Placa de Status do Jogador**:
  - Exibe **Nome + Nível** (`Maguin Lv.61`).
  - **Barra de Vida (HP)** colorida (Verde >50%, Amarela 20-50%, Vermelha <20%).
  - **Barra de Mana** na cor ciano (`#38bdf8`).
- **Animações de Combate**: Animação de caminhada (*bobbing*), arcos de corte para armas melee, bolas de fogo mágicas, e projéteis de monstros à distância.

---

## 🔌 8. Comunicação WebSocket (`ws.go` & `useGameSocket.ts`)

### Payloads de Ação do Cliente (`ClientAction`)
O cliente WebSocket aceita os seguintes comandos estruturados no JSON de envio:
- `CHANGE_REGION`: Suporta ambos os campos `region` e `region_id` para garantir compatibilidade.
- `TOGGLE_EXPEDITION`: Pausa ou inicia a expedição.
- `SET_AUTO_RESUME`: Ativa/desativa o auto-retorno à expedição após recuperação total de HP/Mana no acampamento.
- `EQUIP_ITEM` / `UNEQUIP_ITEM` / `DISCARD_ITEM`: Gerenciamento do inventário de 11 slots.
- `ALLOCATE_STAT`: Distribuição de pontos de atributo (`STR`, `DEX`, `INT`, `VIT`).
- `TOGGLE_SKILL`: Ativação/desativação de feitiços e habilidades no combate.

---

## 💾 9. Persistência de Dados & PostgreSQL (`db.go`)

### Tabela `characters`
- `id`, `account_id`, `name`, `vocation`, `origin`, `level`, `experience`, `health`, `max_health`, `mana`, `max_mana`, `gold_bank`
- `str`, `dex`, `int_stat`, `vit`, `unspent_points`
- `auto_resume_expedition` (BOOLEAN DEFAULT false): Controle de retorno automático à expedição pós-derrota.
- `masteries` (JSONB): `{sword_mastery, axe_mastery, shield_mastery, distance_mastery, magic_mastery, club_mastery}`
- `learned_skills` (JSONB): Lista de skills aprendidas (`["whirlwind", "multishot", "fireball", "divine_heal"]`)
- `active_skills` (JSONB): Lista de skills ativas no painel
- `unlocked_regions` (JSONB): Lista de IDs das regiões desbloqueadas (`["forest", "shereque", "chapolin", "orcruins", ...]`)

### Tabela `character_inventories`
- `character_id` (PK / FK)
- `equipment` (JSONB): Objeto contendo os 11 slots (`head`, `chest`, `legs`, `boots`, `mainhand`, `offhand`, `necklace`, `ring`, `ammo`, `bag`)
- `backpack` (JSONB): Array de itens na mochila do jogador.

---

## 🔮 10. Diretrizes para Futuras Implementações

1. **Adição de Novas Regiões/Expedições**:
   - Registrar a nova região no mapa `ExpeditionRegions` em `backend/pkg/game/expeditions.go`, incluindo `BiomeKey`, níveis, fases e drops.
   - Expor somente os metadados públicos no `GameCatalog`; a UI não deve recriar uma lista `WORLD_REGIONS` independente.
   - Para um bioma novo, criar renderer modular em `frontend/src/game/renderers/biomes/`, registrá-lo em `BiomeRegistry.ts` e declarar a geometria/terreno correspondente quando for isométrico.
2. **Adição de Novos Itens & Equipamentos**:
   - Adicionar o template em `lootTemplates` em `backend/pkg/game/loot.go` e referenciá-lo nos perfis canônicos de loot.
3. **Novas Habilidades & Magias**:
   - Registrar a chave da skill no backend em `engine.go` e adicionar o `SkillBook` correspondente em `loot.go`.

### Sistema classless e ajuda de estilos

- Não existe seleção permanente de Guerreiro, Arqueiro ou Mago.
- Todo novo personagem recebe na mochila espada, escudo, arco, munição e varinha.
- O estilo ativo é derivado da arma equipada e dos atributos/maestrias utilizados.
- `CombatStylesHelpModal.tsx` apenas explica as diferenças; não envia mutação ao servidor.
- O comando legado `CHOOSE_STARTER_PACK` permanece reconhecido por compatibilidade, mas `starter_pack_claimed=true` impede duplicação de equipamentos.

### Expedições de profissão

- `START_GATHERING` recebe apenas a chave da expedição, duração permitida e `request_id`.
- Uma coleta e uma caçada não podem permanecer ativas simultaneamente.
- A coleta é idle: não exige movimentação manual no Canvas e continua pelo relógio autoritativo do servidor com o jogo fechado.
- O frontend só habilita `Iniciar · duração` após receber `EconomyState` e o nível profissional confirmado.
- Ausência de estado econômico é exibida como carregamento/erro sincronizável, nunca como profissão de nível insuficiente.
---

## ⚖️ 11. Sistema de Balanceamento de Equipamentos (versão atual de itens: 3)

### Princípios e invariantes

O poder de um equipamento é composto por duas dimensões independentes:

1. **Tier / RequiredLevel** define a base de progressão horizontal e o momento em que o item entra no jogo.
2. **Raridade** aplica um orçamento adicional de poder àquela base.

É aceitável que um item de muitos tiers acima substitua um raro antigo, mas os seguintes invariantes são obrigatórios:

- Para o **mesmo template**, `Comum < Incomum < Raro < Épico < Lendário` em `item_power`.
- Um raro não pode receber o mesmo valor bruto de um incomum devido a truncamento inteiro.
- Raros ou superiores recebem ganho garantido adequado ao slot; a raridade não depende apenas de um afixo aleatório.
- O campo `tier` sempre representa o tier real do template, nunca o nível do monstro que derrubou o item.
- Starters e itens persistidos usam a mesma tabela canônica de `loot.go`.

### Perfis de raridade

| Raridade | Multiplicador base | Multiplicador de bônus | Bônus primário fixo | Multiplicador de passivas |
|---|---:|---:|---:|---:|
| Comum | 1.00x | 1.00x | +0 | 1.00x |
| Incomum | 1.12x | 1.10x | +1 | 1.15x |
| Raro | 1.85x | 1.65x | +5 | 1.70x |
| Épico | 2.35x | 2.10x | +9 | 2.20x |
| Lendário | 3.10x | 2.80x | +14 | 3.00x |

O bônus fixo é aplicado por função do slot: ataque em armas/munições, defesa e HP em armaduras/escudos, capacidade econômica em bolsas e atributos/recursos em joias. Todos os arredondamentos positivos usam `math.Ceil`, evitando que atributos baixos recebam ganho zero.

### Comparador de poder

Todo item possui:

- `item_power`: métrica normalizada para comparação, preço e testes de regressão.
- `balance_version`: versão do conjunto de regras que gerou os atributos.

Ao carregar JSONB antigo, `RebalanceExistingItem` não gera outro item e não recalcula atributos. Ele acrescenta somente `source=legacy_drop`; ID, nome, raridade, stats, efeito, uso e valor permanecem intactos. A versão de balanceamento continua disponível como metadado para itens novos, mas nunca autoriza reroll de inventário persistido.

Exemplo corrigido:

| Item | Raridade | Def | HP | Peso | Item Power |
|---|---|---:|---:|---:|---:|
| Broquel de Madeira | Raro | 17 | 29 | 14 oz | 41 |
| Escudo de Madeira | Incomum | 12 | 15 | 30 oz | 28 |

A matriz completa gerada pelo comando `go run ./cmd/balanceaudit` está em `docs/EQUIPMENT_BALANCE_MATRIX.csv`.

### Faixas de progressão alinhadas

- Tier 1: níveis 1–7
- Tier 2: níveis 8–19
- Tier 3: níveis 20–34
- Tier 4: níveis 35–49
- Tier 5: níveis 50–99

As regiões, monstros, previews de drop e `RequiredLevel` dos equipamentos seguem as mesmas faixas.

---

## 🌙 12. Consistência da Expedição Offline (OFFLINE V2)

### Snapshot persistido

O estado mínimo necessário para reproduzir uma expedição é persistido em `characters`:

- `is_expedition_active`
- `active_region`
- `active_stance`
- `current_stage`
- `is_boss_stage`
- `state_revision`
- `last_logout`
- `offline_claimed_at`

`last_logout` é alterado **somente** na transição real de conexão para offline. Salvamentos de tick, equipamento, XP ou inventário nunca modificam esse timestamp.

### Claim idempotente e transacional

`db.ClaimOfflineProgress` é a única rotina autorizada a aplicar ganhos offline. O fluxo é:

1. Iniciar transação `SERIALIZABLE`.
2. Carregar personagem e inventário com `SELECT ... FOR UPDATE`.
3. Definir a janela como `max(last_logout, offline_claimed_at) → now`, limitada a 12 horas.
4. Simular com snapshot real de equipamento, postura, região, fase e nível.
5. Aplicar XP, múltiplos level-ups, ouro e loot no mesmo commit.
6. Respeitar peso e slots; excedentes são convertidos em 50% do valor do item.
7. Registrar relatório com `report_key` único.
8. Avançar `offline_claimed_at` para o final calculado.
9. Retornar `{ report, character, inventory }` autoritativo ao cliente.

Duas requisições concorrentes não podem aplicar a mesma janela. Repetir o claim imediatamente retorna uma janela abaixo do mínimo e não duplica recompensas.

### Simulação determinística

A seed é derivada do `report_id`, que por sua vez usa personagem, início, fim e `state_revision`. O mesmo snapshot sempre produz os mesmos abates, XP, ouro e loot.

A simulação percorre ondas inteiras: fases 1–4 possuem respectivamente 1–4 monstros e a fase 5 possui boss + 2 guardas. Uma onda só entrega recompensas e avança o estado quando o tempo restante é suficiente para concluí-la inteira. Ao derrotar o boss, a expedição volta à fase 1 e regiões dependentes são desbloqueadas.

A eficiência considera:

- DPS real do personagem e velocidade do arquétipo de arma;
- HP, ataque e nível de cada monstro gerado para a onda;
- mitigação assintótica de defesa;
- HP máximo, VIT, lifesteal e postura;
- bônus de ouro equipado.

XP, ouro e chance de drop compartilham as bases do loop online. O relatório materializa no máximo 50 itens para proteger memória e tamanho do JSON; drops além desse limite são convertidos em 50% do valor, sem perda silenciosa. Não existe mais o mínimo forçado de um abate. Se o poder ou o tempo forem insuficientes para concluir a fase, o relatório informa `stopped_reason` e preserva a fase inicial.

### Ordem de reconexão no frontend

O cliente segue obrigatoriamente esta ordem:

```text
Selecionar personagem
  → POST /api/v1/expedition/claim
  → receber personagem e inventário autoritativos
  → montar Dashboard
  → abrir WebSocket
```

O frontend não executa mais `setCharacter` antes do claim. Isso elimina a corrida em que uma sessão WebSocket carregada com dados antigos sobrescrevia o progresso recém-calculado no PostgreSQL.

### Barreira de ciclo de vida no servidor

Claim, abertura de WebSocket e fechamento da sessão são serializados por personagem por meio de uma trava de ciclo de vida. No teardown, a conexão é fechada, o leitor de ações é aguardado e o ticker precisa encerrar antes do snapshot. Personagem, inventário e a nova fronteira `last_logout/offline_claimed_at` são persistidos na mesma transação antes que outro claim ou WebSocket seja autorizado. Persistências transitórias recebem três tentativas; conflitos serializáveis `40001` do claim também são repetidos para suportar múltiplas instâncias.

### Relatório auditável

O modal exibe `report_id`, início/fim, região, fase inicial/final, ondas, chefes, ciclos completos, desbloqueios, eficiência, XP, ouro, nível antes/depois, itens guardados e itens convertidos. Um relatório antigo pode ser identificado e comparado diretamente com `expedition_logs`.

---

## 🎒 12. Arquitetura de UI/UX de Inventário & Equipamentos

### Padronização de Raridades (`getRarityStyle`)
O sistema adota uma paleta determinística unificada entre a tela principal (`TibiaEquipmentGrid`) e o modal de inventário (`TibiaBackpackModal`):

| Raridade | Borda / Contorno | Fundo do Slot | Cor do Texto / Brilho |
|---|---|---|---|
| **`Comum`** | `border-slate-800` | `bg-slate-900/60` | `text-slate-300` |
| **`Incomum`** | `border-emerald-500/60` | `bg-emerald-950/30` | `text-emerald-300` (Emerald Glow) |
| **`Raro`** | `border-sky-500/60` | `bg-sky-950/30` | `text-sky-300` (Sky Glow) |
| **`Épico`** | `border-purple-500/60` | `bg-purple-950/30` | `text-purple-300` (Purple Glow) |
| **`Lendário`** | `border-orange-500/60` | `bg-orange-950/30` | `text-orange-300` (Orange Glow) |
| **`Mítico`** | `border-rose-500/70` | `bg-rose-950/30` | `text-rose-300` (Rose Glow) |
| **`Divino`** | `border-amber-400/80` | `bg-amber-950/40` | `text-amber-300` (Divine Gold Glow) |

### Super Tooltip Rico nos Slots de Equipamento
Ao passar o mouse sobre qualquer slot equipado na tela principal ou dentro da mochila, o tooltip renderiza:
1. **Cabeçalho com Cor da Raridade**: Nome limpo do item (`getCleanItemName`) e badge colorido de raridade.
2. **Identificação de Slot**: Rótulo oficial do slot (`Head`, `Weapon`, `Shield`, `Chest`, `Legs`, `Boots`, `Necklace`, `Ring`, `Ammo`, `Bag`).
3. **Requisito de Nível Dinâmico**: Validação em tempo real com ícones (`✅ Requer Nível X` se atendido, `🔒 Requer Nível X` se insuficiente).
4. **Estatísticas Primárias**: `Atk: +X`, `Def: +Y` e `Peso: Z oz`.
5. **Badges Coloridos de Atributos**:
   - `+STR` (Amber), `+DEX` (Emerald), `+INT` (Sky), `+HP` (Rose), `+MP` (Blue).
   - `+Ouro %` (Yellow), `Lifesteal %` (Red), `Regen MP /s` (Cyan), `Crítico %` (Purple).
6. **Efeito Especial & Ação Rápida**: Texto em itálico roxo para habilidades únicas e indicação `(Clique para desequipar)`.

### Filtros e Gerenciamento do "Conteúdo da Mochila"
Para suportar inventários em larga escala, a mochila conta com:
- **Filtro de Categoria por Tipo de Slot**: Abas com ícones e contadores (`Todos`, `Armas ⚔️`, `Escudos 🛡️`, `Elmos 🪖`, `Armaduras 🥋`, `Calças 👖`, `Botas 🥾`, `Acessórios 📿`, `Mochilas 🎒`). Dentro de **Acessórios**, subcategorias separam `Anéis`, `Amuletos/Colares` e `Munições`.
- **Filtro por Raridade**: Botões rápidos para isolar tiers de raridade específicos.
- **Busca por Nome em Tempo Real**: Campo de pesquisa dinâmico com botão de limpeza rápida.
- **Seleção Inteligente para Venda**: O botão `Selecionar Todos` opera sobre os itens filtrados, facilitando a venda em lote por tipo ou raridade (ex: filtrar por "Comum" e vender todos os comuns em um único clique).

---

## 🏕️ 13. Sistema de Acampamento, Recursos & Construções (Camp Progression & Gold Sink)

### Filosofia e Propósito do Sistema
O Sistema de Acampamento introduz um ciclo completo de **Progressão Meta**, **Economia de Recursos** e **Utilidade Contínua para o Ouro (Gold Sink)**:
1. **Recursos Coletados em Combate**: Ao derrotar monstros em tempo real ou no descanso offline, o jogador obtém materiais básicos e troféus de boss independentemente da rolagem de equipamentos.
2. **Construção & Upgrades com Custos Múltiplos**: Toda melhoria de construção consome **Ouro da Conta (`gold_bank`)**, **Recursos Naturais** e, nos níveis superiores, **Troféus de Chefões**.
3. **Efeitos Autoritativos no Backend Go**: Os bônus do acampamento afetam diretamente a regeneração de HP/MP, a capacidade do armazém e a taxa de recuperação ao desmontar itens.

### Tabela Canônica dos 7 Recursos Básicos + 9 Troféus de Boss

| Recurso | Chave (`key`) | Ícone | Raridade | Categoria | Ocupa Armazém? | Descartável? |
|---|---|---|---|---|---|---|
| 🪵 **Madeira** | `wood` | 🪵 | Comum | `material` | Sim (1 esp./un.) | Sim |
| 🪨 **Pedra** | `stone` | 🪨 | Comum | `material` | Sim (1 esp./un.) | Sim |
| 🌾 **Fibra** | `fiber` | 🌾 | Comum | `material` | Sim (1 esp./un.) | Sim |
| ⛓️ **Ferro** | `iron` | ⛓️ | Incomum | `material` | Sim (1 esp./un.) | Sim |
| 🔮 **Essência Arcana** | `arcane_essence` | 🔮 | Raro | `material` | Sim (1 esp./un.) | Sim |
| ❄️ **Cristal Glacial** | `glacial_crystal` | ❄️ | Épico | `material` | Sim (1 esp./un.) | Sim |
| 🔥 **Brasa Abissal** | `abyssal_ember` | 🔥 | Lendário | `material` | Sim (1 esp./un.) | Sim |
| 🏆 **Troféus de Chefão (9)** | `trophy_*` | 🏆 | Mítico | `trophy` | **Não (Livre)** | **Não** |

### Recursos Especiais: Catalisadores e Essência Arcana

Estes recursos têm impacto direto na progressão e não devem ser tratados como materiais comuns:

| Recurso | Como obter | Para que serve | Impacto estratégico |
|---|---|---|---|
| ✨ **Pó de Qualidade** (`quality_dust`) | Drop de chefes com chance de 10%; também pode ser produzido em **Purificar Emblema Negro** com 1 Lasca do Brasão da Alma Negra + 2 Fibra, 50 ouro e Alquimista Nv. 1. | Catalisador de craft: 1 unidade por item/tentativa. Move parte da chance de Comum para Incomum, Raro e Épico. | Opção intermediária para buscar melhorias sem depender do Núcleo Prismático. Não garante raridade. |
| 💠 **Núcleo Prismático** (`prismatic_core`) | Drop raro de **Mestre do Santuário** e **Vingador de Chifres**, com chance de 5%. | Catalisador avançado: 1 unidade por item/tentativa. Aumenta fortemente as chances de Raro, Épico e Lendário. | Recurso de alto risco/alto valor para crafts avançados. Não garante raridade. |
| 🟣 **Pó Arcano Residual** (`arcane_scrap`) | Recuperado ao desmontar equipamentos. | Ingrediente de **Refinar Resíduo Arcano**: 8 unidades + 2 Ervas + 90 ouro produzem 1 Essência Arcana em 45s, exigindo Alquimista Nv. 5. | Converte excedentes de equipamentos em progresso de acampamento. |
| 🔮 **Essência Arcana** (`arcane_essence`) | Resultado de **Refinar Resíduo Arcano**. | Material de construções: alimenta principalmente a **Fonte Arcana** e também upgrades avançados de Fogueira, Armazém, Cozinha e outras estruturas. | Recurso de progressão de alto nível; guardar para upgrades evita bloquear a evolução do assentamento. |

#### Distribuição de raridade dos catalisadores

| Configuração | Comum | Incomum | Raro | Épico | Lendário |
|---|---:|---:|---:|---:|---:|
| Sem catalisador | 70% | 25% | 5% | 0% | 0% |
| Pó de Qualidade | 45% | 35% | 17% | 3% | 0% |
| Núcleo Prismático | 15% | 35% | 35% | 13% | 2% |

O resultado é sempre limitado pela raridade mínima/máxima da receita. Profissão e estação também alteram as chances; catalisadores não transformam o craft em uma garantia.

### As 6 Construções do Acampamento (Níveis 1 a 3)

| Construção | Slot | Efeito Nível 1 | Efeito Nível 2 (Exige Armazém Nv. 1) | Efeito Nível 3 (Exige Armazém Nv. 2) |
|---|---|---|---|---|
| 🔥 **Fogueira** (`campfire`) | `center` | +25% Regen HP (100 Gold, 30 Madeira, 10 Pedra) | +50% Regen HP (350 Gold, 80 Madeira, 50 Pedra, 20 Fibra) | +85% Regen HP (1.000 Gold, 150 Madeira, 100 Pedra, 30 Ferro, 1 Troféu) |
| 💧 **Fonte Arcana** (`arcane_spring`) | `north` | +25% Regen MP (150 Gold, 30 Pedra, 15 Essência) | +55% Regen MP (500 Gold, 80 Pedra, 50 Essência) | +100% Regen MP (1.500 Gold, 140 Pedra, 100 Essência, 10 Cristal) |
| ⛺ **Cabana do Aventureiro** (`adventurer_hut`) | `west` | +10% Regen Geral (120 Gold, 50 Madeira, 25 Fibra) | +20% Regen Geral (400 Gold, 120 Madeira, 60 Fibra, 30 Pedra) | +35% Regen Geral (1.200 Gold, 250 Madeira, 100 Fibra, 50 Ferro) |
| 📦 **Armazém** (`warehouse`) | `east` | Capacidade total de **30.000** materiais | Capacidade total de **100.000** materiais | Capacidade total de **500.000** materiais |
| ⚒️ **Bancada de Desmontagem** (`workbench`) | `south` | Desbloqueia Reciclagem (200 Gold, 50 Madeira, 20 Pedra, 15 Ferro) | +15% Rendimento na Reciclagem (600 Gold, 120 Madeira, 60 Pedra, 50 Ferro) | +30% Rendimento na Reciclagem (2.000 Gold, 220 Madeira, 100 Pedra, 100 Ferro, 30 Essência) |
| 🧪 **Bancada de Alquimia** (`alchemy_bench`) | `free` | Desbloqueia poções básicas (2.500 Gold, 100 Madeira, 50 Pedra) | Poções intermediárias e +10% velocidade (25.000 Gold, 450 Madeira, 250 Pedra, 120 Ferro) | Elixires avançados e +20% velocidade (125.000 Gold, 1.400 Madeira, 900 Pedra, 600 Ferro, 120 Essência) |

*Nota: O acampamento inicial (Nv. 0) possui um **Depósito Improvisado de 10.000 unidades**. Os custos, pré-requisitos e tempos canônicos de cada melhoria ficam no `BuildingRegistry`.*

### Depósito de Recursos & Gestão Autoritativa (V2)
1. **Contrato de Snapshot Autoritativo (`ResourceInventorySnapshot`)**:
   - Fornece `items`, `storage_used`, `storage_capacity` e `revision`.
   - Atualizado instantaneamente em tempo real sem necessidade de recarregar a página.
2. **Cálculo de Armazenamento Exclusivo para Materiais (`GetStorageUsed`)**:
   - Troféus de Chefão nunca contam para a ocupação do armazém.
3. **Descarte Seguro de Materiais (`DISCARD_RESOURCE`)**:
   - Permite ao jogador liberar espaço no armazém descartando materiais excedentes através de diálogo seguro de confirmação.
4. **Desmonte Atômico "Tudo ou Nada" (`SalvageItemAtomically`)**:
   - Executado em transação `SERIALIZABLE`. Se o volume de materiais gerados exceder o espaço livre no armazém, o desmonte é rejeitado e o equipamento permanece intacto na mochila.
5. **Modal Ergonômico de Depósito (`ResourceDepotModal`)**:
   - Acessado pelo botão `ResourceDepotButton` no painel de equipamentos (abaixo da mochila).
   - Renderiza exclusivamente itens possuídos (`quantity > 0`), com busca instantânea, abas por categoria e filtro por raridade.

---

## 🎭 10. Sistema Modular de Skins & Guarda-Roupa do Herói

O sistema visual de heróis do Atlas é construído sobre uma arquitetura **100% cosmética e desacoplada do combate**, permitindo que o jogador personalize a aparência do seu aventureiro mantendo total fidelidade às armas empunhadas.

### A. Grade Canônica de Sprites Pixel-Art (48×48px)
- Todos os renderizadores em `HeroRenderers.ts` desenham nativamente numa grade retangular de **48×48 pixels**, com **linha de solo calibrada em `Y = 44`** e **sombra elíptica projetada em `(24, 44)`**.
- A função de cache `getOffscreenCanvas(key, size, drawFn)` renderiza primeiro no canvas canônico 48x48 e efetua escalonamento por vizinho mais próximo (`nearest-neighbor`), garantindo nitidez e proporcionalidade em qualquer resolução (48px na arena, 96px ou 120px no modal).

### B. Catálogo de Skins no `SkinRegistry.ts`

| Skin ID | Nome Visual | Raridade | Descrição Temática | Status |
|---|---|---|---|---|
| `peasant` | 🌾 **Camponês Aventureiro** | **Comum** | Camisa de linho marfim com gola em V, colete preto com debrum carmim, culote ocre e botas pretas de cano alto. | **Skin Padrão Inicial de todo novo personagem** |
| `wanderer` | 🎒 **Andarilho Mochileiro** | **Raro** | Jaqueta esportiva vermelha, calça jeans, botas de trilha e mochila cargueira com esteira e cantil. | Desbloqueada |
| `knight` | ⚔️ **Cavaleiro Templário** | **Épico** | Armadura de placas de aço polido, elmo fechado, capa carmim com broche dourado e escudo cruzado. | Desbloqueada |
| `archer` | 🏹 **Patrulheiro dos Bosques** | **Épico** | Túnica verde com bordado dourado, capuz de caça, aljava de flechas e arco longo recurvo. | Desbloqueada |
| `mage` | 🔮 **Arcanista Elemental** | **Lendário** | Robe azul-índigo, manto púrpura, chapéu pontudo e cajado de madeira com cristal arcano azul. | Desbloqueada |

### C. Regras de Isolamento e Desacoplamento de Combate
1. **Armazenamento Isolado por Personagem (`atlas_active_skin_${characterId}`)**:
   - Cada personagem da conta tem sua própria chave de armazenamento no `localStorage`.
   - Novos personagens ou personagens sem skin personalizada iniciam automaticamente com a skin **Camponês Aventureiro** (`peasant`).
2. **Desacoplamento de Ataque Visual (`GameViewport.ts`)**:
   - A animação de ataque (golpe físico corpo a corpo, disparo de flecha ou esfera mágica) é determinada **estritamente pela arma empunhada** no slot `MainHand` (`derived_stats.primary_archetype` / `inventory.equipment.mainhand.weapon_type`), nunca pela skin cosmética.

---

## 🎒 11. Kit Inicial de Treinamento Completo (Onboarding)

Ao criar um novo personagem em `CreateCharacter` (`db.go`), o aventureiro recebe diretamente na mochila um kit completo para experimentar os 3 estilos de combate desde o primeiro minuto:
1. ⚔️ **Espada do Aprendiz** (`SlotMainHand`, Melee, Requer Nível 1)
2. 🛡️ **Broquel de Madeira** (`SlotOffHand`, Escudo, Requer Nível 1)
3. 🏹 **Arco Curvo** (`SlotMainHand`, 2 Mãos, Distância, Requer Nível 1)
4. 🎯 **Flechas de Madeira** (`SlotAmmo`, Munição Inicial, Requer Nível 1)
5. 🔮 **Varinha do Aprendiz** (`SlotMainHand`, Magia, Requer Nível 1)

Todos os itens iniciais vêm devidamente identificados com a propriedade `SpecialEffect = "Arma Inicial"` / `"Escudo Inicial"` e podem ser equipados e trocados livremente pelo jogador.

---

## 📈 12. Mecânica de Experiência, Level-Up e Resgate Offline Seguro

### A. Experiência Relativa ao Nível Atual
- A experiência de cada personagem no Atlas é **relativa ao nível atual** (começa em `0` e é consumida ao atingir o montante necessário para o próximo nível).
- **Fórmula do XP Requerido para o Nível $L$**:
  $$\text{GetRequiredXPForLevel}(L) = \begin{cases} 250 & \text{se } L \le 1 \\ \lfloor 250 \times L^{1.95} \rfloor & \text{se } L > 1 \end{cases}$$
- **Fórmula da Porcentagem Visual**:
  $$\text{XP Percent} = \max\left(0, \min\left(100, \left\lfloor \frac{\text{XP Atual}}{\text{XP Próximo Nível}} \times 100 \right\rfloor \right)\right)$$

### B. Consumo Rigoroso de XP em Simulações Offline (`offline.go`)
- Durante o cálculo da progressão offline, ao acumular XP suficiente para avançar de nível, o loop de simulação **subtrai obrigatoriamente** o custo de XP do nível antes de incrementar o nível simulado:
  ```go
  for simulatedExperience >= GetRequiredXPForLevel(simulatedLevel) {
      simulatedExperience -= GetRequiredXPForLevel(simulatedLevel)
      simulatedLevel++
  }
  ```
- Isso previne distorções no cálculo offline e assegura que os ganhos de XP e níveis sejam proporcionais ao tempo decorrido.

### C. Auto-Higienização no Banco de Dados (`scanLockedCharacter`)
- Ao carregar dados de personagens em `db.go`, se valores anômalos forem detectados (`experience < 0` ou `level > 100`), o servidor ajusta automaticamente o personagem para limites saudáveis e sincroniza com o banco PostgreSQL.

---

## 🧰 13. Baú de Achados (Overflow Chest), Venda em Lote & Regras de Progressão

### A. Baú de Achados (20 Slots de Transbordo Seguro)
- Armazena até **20 itens excedentes** encontrados durante expedições quando a mochila do jogador está cheia.
- Suporta resgate individual para a mochila, venda unitária e **Venda em Lote de Todo o Baú (`SELL_OVERFLOW_CHEST_ALL`)**.
- A tabela `character_overflow_chests` persiste os itens protegidos com isolamento transacional.

### B. Venda Universal de Equipamentos
- Equipamentos do tipo **Mochila** podem ser vendidos normalmente pelo jogador individualmente ou em lote, sem travas arbitrárias de interface.

### C. Desbloqueio Progressivo de Fases por Derrota de Chefões (Boss Gatekeeper)
- As fases de expedição de um determinado Tier só são liberadas para navegação após a derrota comprovada de todos os chefões dos biomas pertencentes ao Tier anterior.

---

## ⏳ 14. Motor de Simulação Reconciliada Offline (Deterministic Catch-Up & Auto-Retorno)

### A. Arquitetura de Reconciliação por Snapshot e Timestamp Delta
- Ao desconectar (fechar a aba ou logout), o backend salva um snapshot imutável com a hora de saída (`PeriodStart`), atributos, equipamentos, vida e região ativa.
- Durante a ausência, **nenhum processo fica gastando CPU no servidor**.
- Ao fazer login, o servidor calcula o delta de tempo decorrido e executa em menos de 5ms uma simulação matemática determinística alimentada por uma semente criptográfica baseada no ID do personagem e na hora de saída.

### B. Ciclo de Auto-Retorno & Recuperação Escalonada na Fogueira (`offlineCampRecoverySeconds`)
- Quando o herói sofre dano letal durante uma ausência offline com o auto-retorno habilitado:
  1. A simulação não é abortada (`break` removido); o herói retorna ao acampamento.
  2. O herói descansa na fogueira consumindo tempo do total offline, restaurando 100% de HP e Mana.
  3. O tempo de descanso é escalonado dinamicamente pela Vida Máxima, Nível e Vitalidade (`math.Max(30.0, math.Min(180.0, float64(maxHealth)/hpRegenPerSec))`), variando de ~30s para iniciantes a ~2m30s para personagens de nível 50+.
  4. A expedição reinicia na Fase 1 e **continua a farmar normalmente** durante todo o restante das horas ausentes.
- **Ritmo de Combate e DPS Real**: A duração de combate contra cada monstro respeita o DPS físico real do personagem (`math.Max(1.0, float64(monsterHP)/dps) + 1.5s`).
- **Regeneração Passiva Natural entre Fases**: Aplica recuperação out-of-combat entre uma fase e outra baseada na Vitalidade do aventureiro.

---

## 🎨 15. Renderização Visual Canvas 2D & Locomoção Procedural

### A. Animações Procedurais de Combate e Braços dos Heróis
- Cada golpe em combate anima proceduralmente o braço e a arma do herói de acordo com a arma equipada (arco, cajado, espada, machado, clava).
- Animação de passada das pernas (`walkStep`) sincronizada com a velocidade de deslocamento no acampamento e nas expedições.

### B. Redesenho dos Monstros da Floresta (Tier 1)
- 🐺 **Lobo da Floresta (`forest_wolf`)**: Pelagem cinza-ardósia e peitoral marfim, olhos âmbar, ciclo de 4 patas independentes e cauda oscilante.
- 👺 **Goblin Espreitador (`forest_goblin`)**: Pele verde-oliva, barriga saliente, orelhas pontudas, nariz bulboso, presas e lança de ponta de osso.
- 🕷️ **Aranha Tecelã (`forest_spider`)**: Viúva-negra lustrosa com marcação de ampulheta vermelha no abdômen, quelíceras e 8 patas em onda senoidal (`spiderLegWave`).
- 🐻 **Ursinho Zangado (`forest_boss_bear`)**: Chefe de 64px azul-celeste (Care Bear) com sobrancelhas de fúria, focinho de coração escuro, insígnia na barriga (nuvem de tempestade com chuva e coração rosa) e almofadas de pata nas mãos e pés.

### C. Movimentação Contínua Suave de Monstros
- A movimentação de monstros pelo grid foi convertida de saltos interpolados para avanço contínuo por delta-time (`moveSpeed * _dt`), eliminando caminhadas espaçadas e sincronizando os passos dos monstros (`walkDistance / 5.5`) de forma idêntica aos trabalhadores do acampamento.
---

## 🏘️ 16. Settlement View V3 — Layout Livre, Escala e Densidade Visual

### A. Grade autoritativa 24x18
- `backend/pkg/game/camp_layout.go` e `frontend/src/game/camp/CampLayoutRegistry.ts` devem manter os mesmos limites: **24 colunas x 18 linhas**.
- `tile_x`, `tile_y` e `rotation` continuam sendo persistidos pelo backend; o frontend nunca decide sozinho se uma posição é válida.
- O layout V2 16x12 é migrado para V3 com deslocamento +4/+3. Não recalcular posições por `slot_key` em saves já personalizados.

### B. Footprint lógico != tamanho do sprite
- `BuildingGridFootprints` define colisão e ocupação do terreno.
- `BuildingVisualProfiles` define `sceneScale`, silhueta aproximada e offset visual.
- Aumentar detalhes visuais de um prédio **não** deve aumentar automaticamente seu footprint lógico.
- Cards e modais devem preferir `BuildingScenePreview`, que reutiliza `CampBuildingRegistry`, para evitar uma segunda identidade visual divergente.

### C. Densidade de moradores
- A população autoritativa permanece completa no estado do assentamento; o limite de 10 é apenas de **representação visual simultânea**.
- Moradores com status `collecting` não são desenhados na vila.
- Moradores em `crafting` têm prioridade visual; ociosos são rotacionados em janelas de 30s para que toda a população apareça ao longo do tempo.
- Prédios e moradores compartilham o mesmo z-order pelo ponto de contato com o chão.

### D. Regra Game-First da interface
- Em telas `xl`, o dashboard deve priorizar a cena central em 8/12 colunas e usar 2/12 para cada lateral.
- Informações secundárias devem ser recolhíveis/compactas sem remover acesso funcional.
- O canvas lógico padrão é **960x420**; conversão de pointer deve sempre levar em conta o tamanho CSS real para drag-and-drop continuar preciso.

---

## 🗺️ 17. Arenas Vivas — Grade de Terreno e Colisão Autoritativa

### A. Grade compilada por região
- Os objetos da arena continuam declarados como retângulos legíveis, mas são
  compilados uma única vez no startup para uma grade plana compartilhada.
- A consulta `cells[y*width+x]` é `O(1)`, sem varrer a lista de árvores, casas e
  pedras a cada passo ou nó visitado pelo pathfinding.
- A grade pertence à região, não ao jogador. Todas as sessões reutilizam a
  mesma estrutura imutável.

### B. Terrenos que constroem identidade
- `Solid` já bloqueia árvores, casas, pedras, fogueiras e placas cadastradas.
- O contrato também prevê água, lama, fogo, veneno, caminhos preferenciais e
  portais. Essas flags só devem afetar o jogador quando engine, IA, feedback
  visual e testes forem implementados em conjunto.
- As fases podem declarar dimensões próprias. `24x18` permanece como fallback
  compatível para regiões ainda não convertidas.

### C. Regra visual
- Footprint físico e tamanho do sprite são independentes.
- Copas e telhados usam profundidade pelo ponto de contato com o chão; não se
  tornam sólidos em toda a área visual.
- O backend decide ocupação; o frontend apenas projeta, interpola e desenha.

Documento completo: [`docs/ARENA_TERRAIN_SYSTEM.md`](ARENA_TERRAIN_SYSTEM.md).