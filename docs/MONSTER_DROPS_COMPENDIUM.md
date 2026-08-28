# Compêndio de Drops de Monstros — Reino do Avesso

> **Status (2026-08-27):** compêndio editorial de referência. O código em
> `backend/pkg/game/loot.go` e os auditores são a autoridade final para drops,
> chances e conteúdo; este documento deve ser regenerado/revisado quando o
> catálogo mudar.

> **Documento de Referência de Drops e Balanceamento de Criaturas**
> *Catálogo atual: `2026.08-performance-v2-equipment-identity-v1`*
> *Finalidade: Fonte da verdade e compêndio de referência para expansões de monstros, loot tables, partes temáticas e economia de forja.*

---

## 📖 1. Estrutura e Regras de Drop no Atlas

No Atlas MMORPG Idle, o combate e o abate de criaturas fornecem **insumos temáticos de forja** para os artesãos do assentamento e **drops raros e valiosos de equipamentos, magias e manuais**:

1. **Troféus de Chefes (100% de Registro Histórico)**:
   - Todo Chefe de Bioma entrega **1 Troféu de Boss Garantido (100%)** em cada vitória.
   - O troféu serve como **referencial de prestígio e contagem de derrotas** (habilitando expansões futuras de títulos, missões de caçada, conquistas e marcos de assentamento).

2. **Partes Temáticas de Monstros (Insumos de Forja)**:
   - **Monstros Comuns (20% de Chance, 1x)**: Insumos brutos como *Orelha de Goblin*, *Presa de Lobo*, *Seda de Aranha*, *Língua de Rato*, etc.
   - **Chefões de Bioma (30% de Chance, 1x)**: Partes nobres de chefe como *Garra de Urso*, *Fragmento de Tiara*, *Lâmina do Destruidor*, *Caneta do Xandaum*, *Varinha das Trevas*, *Coroa do Santuário* e *Chifre do Vingador*.
   - **Catalisadores Especiais em Chefes**: *Pó de Qualidade* (**10%**) e *Núcleo Prismático* (**5%** nos Tiers 4 e 5).

3. **Equipamentos e Acessórios (Raridade Alta & Valorização do Craft)**:
   - **Monstros Humanoides / Armados (0.8% a 1.5% de Chance)**: Criaturas armadas possuem chance pequena (**0.8% a 1.5%**) de dropar diretamente 1 ou 2 equipamentos temáticos específicos.
   - **Bestas & Monstros Puros (0.0% de Equipamento)**: Monstros como *Aranha*, *Rato Mutante*, *Zumbi Congelado* e *Escorpião* **não dropam equipamentos prontos**, sendo fontes exclusivas de **materiais temáticos brutos** para artesanato.
   - **Chefões de Bioma (*Bosses*) (3.5% de Chance de Equipamento)**:
     - Os Chefes possuem **3.5% de chance** de dropar equipamentos de prestígio (muitos deles **exclusivos de Boss** como *Amuleto do Lobo*, *Cajado Rúnico*, *Mochila de Aventureiro*, *Toga da Inviolabilidade*, *Katana da Fúria*, *Mochila Dragônica*, *Espada Mítica do Vingador* e *Mochila do Zodíaco*).
     - Média de 1 equipamento a cada ~28 derrotas de chefe.
   - **Manuais de Construção & Tomes de Habilidade (1.8% de Chance)**:
     - Manuais e Livros em chefes possuem chance de **1.8%**, tornando o aprendizado de novas habilidades e projetos um evento épico e marcante.

4. **Faixa Dinâmica de Raridades (Comum → Lendário em Todas as Fases)**:
   Quando um monstro dropa um equipamento, o sorteio da raridade abrange todo o espectro do jogo:
   - 🟢 **Comum**: ~55% (equipamento base útil para reciclagem de sucata e uso inicial)
   - 🟢 **Incomum**: ~27% (+stats balanceados)
   - 🔵 **Raro**: ~13% (+stats aprimorados e efeitos secundários)
   - 🟣 **Épico**: ~4% (+stats de alto impacto)
   - 🟡 **Lendário**: ~1% (o drop dos sonhos que pode acontecer em qualquer batalha do jogo!)
   - **Chefões**: Possuem piso de qualidade elevado (**Raro a Lendário** nos Tiers 1–3, e **Épico a Lendário** nos Tiers 4–5).

---

## 🗺️ 2. Índice por Tiers e Regiões

- [Tier 1 (Nível 1–5): Floresta dos Aprendizes, Vila do Shereque, Vila do Chapolin](#-tier-1-nível-15)
- [Tier 2 (Nível 5–19): Castelo de Greiscu, Esgotos Tartaruga, Planalto dos Três Poderes](#-tier-2-nível-519)
- [Tier 3 (Nível 12–20): Escola de Rogartes](#-tier-3-nível-1220)
- [Tier 4 (Nível 20–35): Santuário de Atenas](#-tier-4-nível-2035)
- [Tier 5 (Nível 35–99): Caverna do Dragão Perdido (Abismo Vulcânico)](#-tier-5-nível-3599)

---

## 🌲 Tier 1 (Nível 1–5)

### 1.1 Floresta dos Aprendizes (`forest`)
*Bioma calmo e inicial para novos aventureiros.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 👺 **Goblin Salteador**<br>`forest_goblin` | 1 | 60 | 7 | Melee | 👂 **Orelha de Goblin** (20%, 1x) | • Espada do Aprendiz<br>• Capacete de Couro | **1.5%** | Comum → Lendário |
| 🐺 **Lobo Selvagem**<br>`forest_wolf` | 3 | 90 | 11 | Melee | 🦷 **Presa de Lobo** (20%, 1x) | • Sandálias Ágeis | **0.8%** | Comum → Lendário |
| 🕷️ **Aranha de Espinhos**<br>`forest_spider` | 4 | 110 | 13 | Ranged | 🕸️ **Seda de Aranha** (20%, 1x) | *(Apenas material de forja)* | **0.0%** | — |
| 🐻 **Urso Ranzinza dos Carinhosos 👑**<br>`forest_boss_bear` *(CHEFE)* | 5 | 520 | 28 | Melee | 🏆 **Troféu do Urso** (100%)<br>🐾 **Garra de Urso** (30%, 1x)<br>✨ **Pó de Qualidade** (10%) | • Arco Curvo<br>• Broquel de Madeira ⭐<br>• Amuleto do Lobo ⭐<br>📜 **Manual: Armazém de Recursos** | **3.5% Equip.**<br>+ 1.8% Manual | **Raro → Lendário** |

---

### 1.2 Vila do Shereque (`shereque`)
*Pântano rústico onde ogros e burros guardam tesouros.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 👹 **Ogre Verde**<br>`shereque_ogre` | 2 | 80 | 9 | Melee | 🧄 **Verruga de Ogre** (20%, 1x) | • Clava de Madeira<br>• Túnica de Couro | **1.5%** | Comum → Lendário |
| 🫏 **Burro Falante**<br>`shereque_donkey` | 4 | 100 | 12 | Melee | 🦷 **Dente de Burro** (20%, 1x) | • Sandálias Ágeis | **0.8%** | Comum → Lendário |
| 🐸 **Fiona Arrazadora 👑**<br>`shereque_boss_fiona` *(CHEFE)* | 5 | 560 | 30 | Melee | 🏆 **Troféu da Fiona** (100%)<br>👑 **Fragmento de Tiara** (30%, 1x)<br>✨ **Pó de Qualidade** (10%) | • Machadinha de Madeira ⭐<br>• Broquel de Madeira<br>📖 **Tome: Golpe Giratório**<br>📜 **Manual: Cabana do Aventureiro** | **3.5% Equip.**<br>+ 1.8% Livro | **Raro → Lendário** |

---

### 1.3 Vila do Chapolin (`chapolin`)
*Vila cômica infestada por piratas e bandidos.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 🏴‍☠️ **Pirata Alma Negra**<br>`chapolin_pirate` | 3 | 95 | 11 | Melee | 🪝 **Gancho Pirata** (20%, 1x) | • Espada do Aprendiz<br>• Broquel de Madeira | **1.5%** | Comum → Lendário |
| 🤠 **Tripa Seca**<br>`chapolin_tripa` | 4 | 105 | 13 | Melee | 🥋 **Cinto do Tripa** (20%, 1x) | • Machadinha de Madeira | **1.2%** | Comum → Lendário |
| 🥷 **Bandido dos Ermos**<br>`chapolin_bandit` | 4 | 110 | 14 | Melee | 🎭 **Máscara do Bandido** (20%, 1x) | • Arco Curvo<br>• Flechas de Madeira | **1.5%** | Comum → Lendário |
| ☠️ **Alma Negra de Greiscu 👑**<br>`chapolin_boss_alma` *(CHEFE)* | 5 | 600 | 32 | Melee | 🏆 **Troféu do Alma Negra** (100%)<br>🏴‍☠️ **Emblema da Alma Negra** (30%, 1x)<br>✨ **Pó de Qualidade** (10%) | • Anel de Cobre ⭐<br>📖 **Manual: Tiro Quádruplo**<br>📜 **Manual: Fonte Arcana** | **3.5% Equip.**<br>+ 1.8% Manual | **Raro → Lendário** |

---

## 🏰 Tier 2 (Nível 5–19)

### 2.1 Castelo de Greiscu (`orcruins`)
*Fortificação ancestral guardada por orcs e esqueletos.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 🧌 **Orc Guerreiro**<br>`orcruins_orc` | 6 | 140 | 16 | Melee | 🦷 **Presa de Orc** (20%, 1x) | • Machado Orc<br>• Cota de Malha | **1.5%** | Comum → Lendário |
| 🧙 **Orc Mago**<br>`orcruins_orc_mage` | 7 | 150 | 18 | Ranged | 🔮 **Runa Orc** (20%, 1x) | • Coifa de Prata | **1.2%** | Comum → Lendário |
| 💀 **Esqueleto Guardião**<br>`orcruins_skeleton` | 8 | 170 | 20 | Ranged | 🦴 **Osso de Esqueleto** (20%, 1x) | • Escudo de Madeira | **1.2%** | Comum → Lendário |
| 🏹 **Orc Arqueiro**<br>`orcruins_orc_archer` | 9 | 185 | 22 | Ranged | 🧵 **Corda de Arco Orc** (20%, 1x) | • Arco Longo<br>• Flechas de Aço | **1.5%** | Comum → Lendário |
| 🪓 **Orc Berserker**<br>`orcruins_berserker` | 10 | 210 | 26 | Melee | 🛡️ **Fivela Berserker** (20%, 1x) | • Sabre de Bronze | **1.5%** | Comum → Lendário |
| 💀 **Esquelético Pacato 👑**<br>`orcruins_boss_skeleton` *(CHEFE)* | 12 | 1100 | 52 | Ranged | 🏆 **Troféu do Esquelético** (100%)<br>🦴 **Osso de Esqueleto** (30%, 1x)<br>✨ **Pó de Qualidade** (10%) | • Cajado Rúnico ⭐<br>• Mochila de Aventureiro ⭐<br>📖 **Livro: Cura Divina**<br>📜 **Manual: Bancada de Desmontagem** | **3.5% Equip.**<br>+ 1.8% Livro | **Raro → Lendário** |

---

### 2.2 Esgotos Tartaruga (`esgotos`)
*Subterrâneo dominado pelo Clã do Pé e ratos mutantes.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 🥷 **Ninja do Clã do Pé**<br>`esgotos_ninja` | 7 | 150 | 17 | Ranged | 🥋 **Faixa Ninja** (20%, 1x) | • Sabre de Bronze<br>• Botas de Couro | **1.5%** | Comum → Lendário |
| 🐀 **Rato Mutante**<br>`esgotos_rat` | 10 | 200 | 23 | Melee | 👅 **Língua de Rato** (20%, 1x) | *(Apenas material de forja)* | **0.0%** | — |
| 🥷 **Destruidor Ranzinza 👑**<br>`esgotos_boss_destroyer` *(CHEFE)* | 12 | 1200 | 55 | Melee | 🏆 **Troféu do Destruidor** (100%)<br>🗡️ **Lâmina do Destruidor** (30%, 1x)<br>✨ **Pó de Qualidade** (10%) | • Maça de Batalha ⭐<br>• Calça de Couro<br>• Colar de Prata ⭐<br>• Virotes Perfurantes<br>📖 **Manual: Tiro Preciso** | **3.5% Equip.**<br>+ 1.8% Manual | **Raro → Lendário** |

---

### 2.3 Planalto dos Três Poderes (`planalto`)
*Cenário místico político onde se disputa a Suprema Caneta.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| ⭐ **Militante do Treze**<br>`planalto_militante` | 8 | 165 | 18 | Melee | 👕 **Camisa Militante** (20%, 1x) | • Martelo Constitucional<br>• Cordão da Estrela Rubra | **1.2%** | Comum → Lendário |
| 🇧🇷 **Patriota do Caminhão**<br>`planalto_patriota` | 10 | 195 | 22 | Ranged | 🚩 **Bandeira Patriota** (20%, 1x) | • Megafone do Povo<br>• Virotes da Notificação | **1.2%** | Comum → Lendário |
| 👮 **Puliça de Choque**<br>`planalto_pulica` | 12 | 235 | 26 | Melee | 🛡️ **Placa de Choque** (20%, 1x) | • Boina Tática da Puliça<br>• Coturno da Lei | **1.5%** | Comum → Lendário |
| ⚖️ **Xandaum, Soberano da Toga 👑**<br>`planalto_boss_xandaum` *(CHEFE)* | 16 | 1850 | 72 | Ranged | 🏆 **Troféu do Xandaum** (100%)<br>🖋️ **Caneta do Xandaum** (30%, 1x)<br>✨ **Pó de Qualidade** (10%) | • Caneta Esferográfica Suprema ⭐<br>• Toga da Inviolabilidade ⭐<br>• Anel do Supremo Relator ⭐<br>• Pasta Executiva Presidencial ⭐<br>📖 **Tome: Golpe Brutal**<br>📜 **Manual do Mestre de Obras** | **3.5% Equip.**<br>+ 1.8% Livro | **Raro → Lendário** |

---

## 🧙 Tier 3 (Nível 12–20)

### 3.1 Escola de Rogartes (`rogartes`)
*Escola arcana infestada por dementadores e bruxos sombrios.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 👤 **Dementador das Sombras**<br>`rogartes_dementor` | 13 | 260 | 29 | Ranged | 🧥 **Manto Dementador** (20%, 1x) | • Espada de Aço<br>• Elmo Rúnico | **1.5%** | Comum → Lendário |
| 🧌 **Trasgo das Cavernas**<br>`rogartes_troll` | 17 | 350 | 36 | Melee | 🪵 **Pele de Troll** (20%, 1x) | • Escudo de Batalha<br>• Grevas de Aço<br>• Botas de Ferro | **1.5%** | Comum → Lendário |
| 🪄 **Voldemorte sem Nariz 👑**<br>`rogartes_boss_darkmage` *(CHEFE)* | 20 | 2600 | 98 | Ranged | 🏆 **Troféu do Voldemorte** (100%)<br>🪄 **Varinha das Trevas** (30%, 1x)<br>✨ **Pó de Qualidade** (10%) | • Cetro do Esquelético ⭐<br>• Peitoral de Platina<br>• Bolsa Rúnica ⭐<br>📖 **Livro: Bola de Fogo** | **3.5% Equip.**<br>+ 1.8% Livro | **Raro → Lendário** |

---

## ❄️ Tier 4 (Nível 20–35)

### 4.1 Santuário de Atenas (`frozen`)
*Picos congelados guardados pelos Cavaleiros de Ouro e espectros.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 👻 **Lorde Espectro**<br>`frozen_specter` | 22 | 380 | 40 | Ranged | ❄️ **Alma Congelada** (20%, 1x) | • Orbe Protetor<br>• Coroa de Ouro | **1.2%** | Comum → Lendário |
| 🧟 **Zumbi Congelado**<br>`frozen_zombie` | 25 | 440 | 45 | Melee | 🧊 **Gelo Cadavérico** (20%, 1x) | *(Apenas material de forja)* | **0.0%** | — |
| 🗿 **Golem de Gelo**<br>`frozen_golem` | 28 | 530 | 52 | Melee | 💎 **Núcleo de Golem** (20%, 1x) | • Marreta Biônica<br>• Robe Místico | **1.5%** | Comum → Lendário |
| 🦁 **Quimera do Frost**<br>`frozen_chimera` | 33 | 680 | 62 | Ranged | 📯 **Chifre de Quimera** (20%, 1x) | • Arco dos Ventos<br>• Flechas Incendiárias | **1.2%** | Comum → Lendário |
| 🌟 **Mestre do Santuário 👑**<br>`frozen_boss_master` *(CHEFE)* | 35 | 4800 | 155 | Ranged | 🏆 **Troféu do Mestre** (100%)<br>👑 **Coroa do Santuário** (30%, 1x)<br>✨ **Pó de Qualidade** (10%)<br>🔮 **Núcleo Prismático** (5%) | • Katana da Fúria ⭐<br>• Varinha das Relíquias ⭐<br>• Botas de Aço Rúnico<br>• Saiote dos Magos<br>• Amuleto Dragônico ⭐<br>• Mochila Dragônica ⭐<br>📖 **Livro: Estilhaço de Gelo** | **3.5% Equip.**<br>+ 1.8% Livro | **Épico → Lendário** |

---

## 🌋 Tier 5 (Nível 35–99)

### 5.1 Caverna do Dragão Perdido (`abyss`)
*Abismo vulcânico lendário onde feras cósmicas guardam relíquias míticas.*

| Monstro / Chefe | Nv. | HP | Atk | Tipo | Material de Forja & Troféus | Equipamentos, Livros & Manuais | Chance de Equip. / Livro | Faixa de Raridade |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: | :---: |
| 🐉 **Dragão Cinderino**<br>`abyss_dragon` | 40 | 900 | 80 | Ranged | 🛡️ **Escama de Dragão** (20%, 1x) | • Lâmina de Greiscu<br>• Amuleto do Zodíaco | **1.5%** | Comum → Lendário |
| 😈 **Demônio Ancestral**<br>`abyss_demon` | 50 | 1250 | 105 | Ranged | 📯 **Chifre Demoníaco** (20%, 1x) | • Machado de Guerra Mítico<br>• Armadura de Ouro | **1.5%** | Comum → Lendário |
| 🧛 **Vampiro Ancestral**<br>`abyss_vampire` | 60 | 1550 | 125 | Ranged | 🦷 **Presa Vampírica** (20%, 1x) | • Cajado da Eternidade | **1.2%** | Comum → Lendário |
| 🧙‍♂️ **Necromante Sombrio**<br>`abyss_necromancer` | 65 | 1750 | 140 | Ranged | 🔮 **Runa Necromântica** (20%, 1x) | • Elmo do Zodíaco | **1.2%** | Comum → Lendário |
| 🦂 **Escorpião Infernal**<br>`abyss_scorpion` | 70 | 1950 | 155 | Melee | 🦂 **Ferrão Escorpião** (20%, 1x) | *(Apenas material de forja)* | **0.0%** | — |
| 🔥 **Lorde das Chamas**<br>`abyss_flame_lord` | 78 | 2400 | 175 | Ranged | ❤️‍🔥 **Coração Flamejante** (20%, 1x) | • Maça Celestial<br>• Flechas Divinas | **1.5%** | Comum → Lendário |
| 🐲 **Vingador de Chifres 👑**<br>`abyss_boss_avenger` *(CHEFE)* | 85 | 12500 | 340 | Ranged | 🏆 **Troféu do Vingador** (100%)<br>📯 **Chifre do Vingador** (30%, 1x)<br>✨ **Pó de Qualidade** (10%)<br>🔮 **Núcleo Prismático** (5%) | • Espada Mítica do Vingador ⭐<br>• Arco Apocalíptico ⭐<br>• Grevas Celestiais<br>• Botas Celestiais<br>• Escudo do Zodíaco ⭐<br>• Mochila do Zodíaco ⭐ | **3.5% Equip.**<br>+ Drops Especiais | **Épico → Lendário** |

---

## 🛠️ 3. Matriz de Utilização dos Insumos de Monstros na Forja

| Material Temático | Origem Principal | Receitas de Forja que Consomem o Item | Artesão |
| :--- | :--- | :--- | :--- |
| **Orelha de Goblin** | Goblin Salteador (Floresta) | Espada do Aprendiz, Túnica de Couro, Broquel de Madeira | ⚔️ Ferreiro / 🧵 Alfaiate |
| **Presa de Lobo** | Lobo Selvagem (Floresta) | Arco Curvo, Capacete de Couro, Sandálias Ágeis | 🪵 Marceneiro / 🧵 Alfaiate / 🧥 Coureiro |
| **Seda de Aranha** | Aranha de Espinhos (Floresta) | Varinha do Aprendiz, Calça de Tecido | 🪵 Marceneiro / 🧵 Alfaiate |
| **Garra de Urso** | Urso Ranzinza (Chefe Floresta) | Montante de Madeira | ⚔️ Ferreiro |
| **Verruga de Ogre** | Ogre Verde (Shereque) | Machadinha de Madeira | ⚔️ Ferreiro |
| **Dente de Burro** | Burro Falante (Shereque) | Clava de Madeira | ⚔️ Ferreiro |
| **Fragmento de Tiara** | Fiona (Chefe Shereque) | Pequena Bolsa | 🧥 Coureiro |
| **Gancho Pirata** | Pirata Alma Negra (Chapolin) | Flechas de Madeira | 🪵 Marceneiro |
| **Cinto do Tripa** | Tripa Seca (Chapolin) | Amuleto do Lobo | 💎 Joalheiro |
| **Máscara do Bandido** | Bandido dos Ermos (Chapolin) | Anel de Cobre | 💎 Joalheiro |
| **Emblema da Alma Negra**| Alma Negra (Chefe Chapolin) | Refino de Pó de Qualidade (`refine_black_soul`) | 🧪 Alquimista |
| **Presa de Orc** | Orc Guerreiro (Castelo) | Machado Orc, Anel de Prata | ⚔️ Ferreiro / 💎 Joalheiro |
| **Runa Orc** | Orc Mago (Castelo) | Cajado Rúnico | 🪵 Marceneiro |
| **Osso de Esqueleto** | Esqueleto Guardião (Castelo) | Coifa de Prata | 🧵 Alfaiate |
| **Corda de Arco Orc** | Orc Arqueiro (Castelo) | Arco Longo | 🪵 Marceneiro |
| **Fivela Berserker** | Orc Berserker (Castelo) | Cota de Malha | 🧵 Alfaiate |
| **Faixa Ninja** | Ninja do Pé (Esgotos) | Sabre de Bronze | ⚔️ Ferreiro |
| **Língua de Rato** | Rato Mutante (Esgotos) | Maça de Batalha, Botas de Couro | ⚔️ Ferreiro / 🧥 Coureiro |
| **Lâmina do Destruidor** | Destruidor (Chefe Esgotos) | Montante de Bronze | ⚔️ Ferreiro |
| **Camisa Militante** | Militante (Planalto) | Cordão da Estrela Rubra, Calça Social | 💎 Joalheiro / 🧵 Alfaiate |
| **Bandeira Patriota** | Patriota (Planalto) | Megafone do Povo | ⚔️ Ferreiro |
| **Placa de Choque** | Puliça de Choque (Planalto) | Boina Tática, Coturno da Lei | 🧵 Alfaiate / 🧥 Coureiro |
| **Caneta do Xandaum** | Xandaum (Chefe Planalto) | Caneta Esferográfica Suprema | ⚔️ Ferreiro |
| **Manto Dementador** | Dementador (Rogartes) | Cetro do Esquelético, Elmo Rúnico | 🪵 Marceneiro / 🧵 Alfaiate |
| **Pele de Troll** | Trasgo (Rogartes) | Escudo de Batalha, Grevas de Aço | ⚔️ Ferreiro / 🧵 Alfaiate |
| **Varinha das Trevas** | Voldemorte (Chefe Rogartes) | Espada de Aço, Bolsa Rúnica | ⚔️ Ferreiro / 🧥 Coureiro |
| **Alma Congelada** | Lorde Espectro (Santuário) | Coroa de Ouro | 🧵 Alfaiate |
| **Gelo Cadavérico** | Zumbi Congelado (Santuário) | Saiote dos Magos, Botas de Aço Rúnico | 🧵 Alfaiate / 🧥 Coureiro |
| **Núcleo de Golem** | Golem de Gelo (Santuário) | Marreta Biônica, Orbe Protetor | ⚔️ Ferreiro |
| **Chifre de Quimera** | Quimera (Santuário) | Arco dos Ventos, Flechas Incendiárias | 🪵 Marceneiro |
| **Coroa do Santuário** | Mestre (Chefe Santuário) | Katana da Fúria, Robe Místico, Mochila Dragônica | ⚔️ Ferreiro / 🧵 Alfaiate / 🧥 Coureiro |
| **Escama de Dragão** | Dragão Cinderino (Abismo) | Arco Apocalíptico, Amuleto do Zodíaco | 🪵 Marceneiro / 💎 Joalheiro |
| **Chifre Demoníaco** | Demônio Ancestral (Abismo) | Machado de Guerra Mítico, Armadura de Ouro | ⚔️ Ferreiro / 🧵 Alfaiate |
| **Presa Vampírica** | Vampiro Ancestral (Abismo) | Cajado da Eternidade | 🪵 Marceneiro |
| **Runa Necromântica** | Necromante (Abismo) | Elmo do Zodíaco | 🧵 Alfaiate |
| **Ferrão Escorpião** | Escorpião Infernal (Abismo) | Grevas Celestiais, Botas Celestiais | 🧵 Alfaiate / 🧥 Coureiro |
| **Coração Flamejante** | Lorde das Chamas (Abismo) | Maça Celestial, Flechas Divinas | ⚔️ Ferreiro / 🪵 Marceneiro |
| **Chifre do Vingador** | Vingador (Chefe Abismo) | Espada Mítica do Vingador, Escudo do Zodíaco, Mochila do Zodíaco | ⚔️ Ferreiro / 🧥 Coureiro |