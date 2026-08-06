# Atlas MMORPG Idle — Base de Conhecimento & Arquitetura Técnica do Projeto

Este documento serve como a **Fonte da Verdade (Single Source of Truth)** do projeto **Atlas MMORPG Idle**. Ele documenta em detalhes a arquitetura técnica, as regras de negócio, as mecânicas de combate, a estrutura do banco de dados, as tabelas de loot e a organização do código para orientar futuras implementações e guiar assistentes de IA.

---

## 📌 1. Visão Geral do Projeto

**Atlas MMORPG Idle** é um jogo MMORPG Idle web de inspiração clássica (estilo Tibia e retro-RPGs), com:
- **Engine de Combate em Tempo Real**: Desenvolvida em **Go (Gorilla WebSockets)** com simulação tática em grid (15x8) a 750ms por tick.
- **Viewport 2D Ultra-Fluido**: Renderizador HTML5 Canvas 2D customizado a 60 FPS com fundos cênicos por bioma, efeitos de ataque, feitiços, projéteis e barras de status flutuantes sobre o herói e os monstros.
- **Sistemas de RPG Profundos**: 11 slots de equipamentos estilo Tibia, 6 maestrias por uso (`Sword`, `Axe`, `Shield`, `Distance`, `Magic`, `Club`), tabela de drops por monstro com *Rarity Caps*, expedições de 5 fases com chefões (*Bosses*) e mapas temáticos inspirados na cultura pop geek nostálgica.

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
│   │   ├── expeditions.go          # Mapa do mundo, 5 Tiers, 8 regiões geek, fases e Bosses
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
│   │   │   └── Onboarding/         # Modal de escolha da vocação inicial (Guerreiro, Arqueiro, Mago)
│   │   ├── game/
│   │   │   └── PixelArtRenderer.ts # Renderizador de cenários por bioma e sprites Pixel Art 2D
│   │   └── hooks/
│   │       └── useGameSocket.ts    # Hook WebSocket para sincronização em tempo real (envio de region_id)
└── docs/                           # Documentação técnica do projeto
    └── KNOWLEDGE_BASE.md           # Este documento (Base de Conhecimento viva)
```

---

## ⚙️ 3. Motor de Combate & Simulação Tática

### Grid de Combate (15x8)
- A arena é representada por um grid retangular de **15 colunas por 8 linhas** (32x32px por tile).
- **Posição do Herói**: Fixa na coluna `GridX = 2`, `GridY = 4`.
- **Spawn de Monstros**: Monstros surgem na borda direita (`GridX = 14`) escalonados em linhas diferentes (`GridY = 2, 4, 6`).

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

### O Mapa do Mundo (8 Regiões Geek & Biomas Visuais)

| Tier | Região ID | Nome da Região | Boss Final | Visual / Bioma Renderizado (`PixelArtRenderer`) |
|---|---|---|---|---|
| **Tier 1** | `forest` | 🌲 **Floresta dos Aprendizes** | **Urso Ranzinza 🐻** | Crepúsculo ensolarado, árvores verdes, solo de terra. |
| **Tier 1** | `shereque` | 🍞 **Vila do Shereque** | **Fiona Arrazadora 🐸** | Pântano tenebroso, lama esmeralda, cogumelos gigantes. |
| **Tier 1** | `chapolin` | 🎩 **Vila do Chapolin** | **Alma Negra 🏴‍☠️** | Praia tropical ao pôr do sol, mar azul, coqueiros. |
| **Tier 2** | `orcruins` | 🏰 **Castelo de Greiscu** | **Esquelético Pacato 💀** | Noite noturna, lua púrpura, ruínas de castelo e lajotas. |
| **Tier 2** | `esgotos` | 🥷 **Esgotos Tartaruga** | **Destruidor Ranzinza 🥷** | Subterrâneo de tijolos escuros, tubos e líquido verde neon. |
| **Tier 3** | `rogartes` | 🧙‍♂️ **Escola de Rogartes** | **Voldemorte sem Nariz 🪄** | Salão noturno místico, estrelas piscando, círculo rúnico. |
| **Tier 4** | `frozen` | 🛡️ **Santuário de Atenas** | **Mestre do Santuário 🌟** | Picos congelados, geleira azul e Aurora Borealis no céu. |
| **Tier 5** | `abyss` | 🌋 **Caverna do Dragão Perdido** | **Vingador de Chifres 🐲** | Caverna vulcânica, rios de lava fervente, obsidiana. |

---

## 🎨 7. Engine Gráfica & Viewport 2D (`GameViewport.ts`)

- **Tecnologia**: Renderizador 100% síncrono sobre HTML5 Canvas 2D a **60 FPS** sem depender de carregadores de textura assíncronos frágeis.
- **Gerador de Cenários Dinâmicos (`PixelArtRenderer.ts`)**: Renderiza os 8 biomas distintos em canvas offscreen com alternância síncrona acionada por `this.regionId` em `GameViewport.ts`.
- **Gerador de Sprites Pixel Art**: Gera sprites 2D em Pixel Art dinâmicos em canvas offscreen para mais de 10 tipos de monstros (Vampiro, Aranha, Orc Arqueiro, Golem, Demônio, Dragão, etc.).
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
- `EQUIP_ITEM` / `UNEQUIP_ITEM` / `DISCARD_ITEM`: Gerenciamento do inventário de 11 slots.
- `ALLOCATE_STAT`: Distribuição de pontos de atributo (`STR`, `DEX`, `INT`, `VIT`).
- `TOGGLE_SKILL`: Ativação/desativação de feitiços e habilidades no combate.

---

## 💾 9. Persistência de Dados & PostgreSQL (`db.go`)

### Tabela `characters`
- `id`, `account_id`, `name`, `vocation`, `origin`, `level`, `experience`, `health`, `max_health`, `mana`, `max_mana`, `gold_bank`
- `str`, `dex`, `int_stat`, `vit`, `unspent_points`
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
   - Registrar a nova região no mapa `ExpeditionRegions` em [`expeditions.go`](file:///Users/filipevieira/Documents/atlas/backend/pkg/game/expeditions.go).
   - Adicionar o card visual correspondente no array `WORLD_REGIONS` em [`ExpeditionSelectionModal.tsx`](file:///Users/filipevieira/Documents/atlas/frontend/src/components/Expedition/ExpeditionSelectionModal.tsx).
   - Criar a função geradora de bioma `getNewRegionBackground()` em [`PixelArtRenderer.ts`](file:///Users/filipevieira/Documents/atlas/frontend/src/game/PixelArtRenderer.ts) e mapear em [`GameViewport.ts`](file:///Users/filipevieira/Documents/atlas/frontend/src/components/Viewport/GameViewport.ts).
2. **Adição de Novos Itens & Equipamentos**:
   - Adicionar o template em `lootTemplates` em [`loot.go`](file:///Users/filipevieira/Documents/atlas/backend/pkg/game/loot.go) e incluir nas tabelas dos monstros desejados em `GenerateLootForMonster`.
3. **Novas Habilidades & Magias**:
   - Registrar a chave da skill no backend em `engine.go` e adicionar o `SkillBook` correspondente em `loot.go`.
