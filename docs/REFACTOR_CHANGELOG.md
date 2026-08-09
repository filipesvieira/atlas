# Refatoração modular — changelog

## Adicionado

- Registries genéricos de frontend (`Registry`, `BiomeRegistry`,
  `MonsterRegistry`, `HeroRegistry`).
- Renderers separados por domínio e tier.
- `MonsterContentRegistry` e `ItemTemplateRegistry` no backend.
- Catálogo declarativo de starter packs.
- Endpoint público `GET /api/v1/game/catalog`.
- `biome_key` nas expedições e `active_biome` no realtime.
- Testes de consistência entre loot, tier, nível, preview e starter templates.
- Configuração central de URLs HTTP/WebSocket.
- **UX/UI de Equipamentos & Mochila**:
  - Padronização de cores e estilos de raridade unificada (`getRarityStyle`) cobrindo `Comum`, `Incomum`, `Raro`, `Épico`, `Lendário`, `Mítico`, `Divino`.
  - Tooltips ricos nos equipamentos da tela principal com badges de bônus (+STR, +DEX, +INT, +HP, +MP, +Ouro, Lifesteal, Regen MP, Crítico), slot label e requisitos de nível dinâmicos (`✅/🔒 Requer Nível X`).
  - Barra avançada de filtros no "Conteúdo da Mochila":
    - Filtro por Tipo de Equipamento (Armas ⚔️, Escudos 🛡️, Elmos 🪖, Armaduras 🥋, Calças 👖, Botas 🥾, Acessórios 📿, Mochilas 🎒, Munições 🏹).
    - Filtro por Raridade com chips coloridos temáticos.
    - Campo de busca instantânea por nome do item com botão de limpeza rápida.
    - Contadores dinâmicos de itens por categoria e mensagem de estado vazio amigável com reset de filtros.
    - Integração de seleção em lote inteligente com os itens filtrados.

## [Unreleased] - 2026-08-08 (Refatoração Modular V2 & Balanceamento)

### Atributos Autoritativos & Diminishing Returns (`stats.go`)
- **Curva de Crítico Assintótica**: Substituído o cálculo linear desbalanceado por uma curva com rendimentos decrescentes:
  $$\text{Crit}_{\text{DEX}} = \frac{\text{EffectiveDEX}}{\text{EffectiveDEX} + 300} \times 25\%$$
  - Exemplo: 392 de DES resulta em $\approx 14.16\%$ de bônus base (+5% base global = $19.16\%$), eliminando o exploit de 100% de dano crítico permanente.
  - **Hard Cap Global de Crítico**: Travado estritamente em **$50.0\%$** nos ataques normais, preservando a raridade do golpe crítico.
- **Regeneração Contínua de Mana (MP/s)**:
  $$\text{Regen}_{\text{INT}} = \frac{\text{EffectiveINT}}{\text{EffectiveINT} + 300} \times 6.0\text{ MP/s}$$
  - Suporte balanceado a conjuradores sem quebrar a economia de mana.
- **Capacidade Autoritativa**: `1000 + (Level * 10) + (STR * 15) + Bônus de Itens`.
- **Primary Archetype**: Resolução autoritativa no servidor (`melee`, `distance` ou `magic`) baseada na arma equipada no `mainhand`.

### Sistema de Habilidades Classless & Status Effects (`skill_registry.go` & `status_effects.go`)
- **Arquitetura Declarativa & Executável**: As 7 habilidades do jogo migradas para o `SkillRegistry`, eliminando código hardcoded em `engine.go`.
- **Compatibilidade por Arquétipo de Arma**: Em vez de travas por nome de classe, as habilidades exigem arquétipos de combate compatíveis:
  - `whirlwind` (Melee): Dano físico em área com arco $360^\circ$ e faíscas de aço.
  - `brutal_strike` (Melee): Dano concentrado massivo com tremor de impacto.
  - `multishot` (Distance): 4 flechas douradas disparadas em leque atingindo alvos simultâneos.
  - `sniper_shot` (Distance): Projétil perfurante veloz com crítico garantido.
  - `fireball` (Magic): Orbe ígneo com explosão e brasas incandescentes.
  - `ice_shard` (Magic): Estilhaço glacial ciano aplicando debuff `slow: 30%` por 4 ticks.
  - `divine_heal` (Universal): Cura sagrada restaurando $+100\text{ HP}$ instantaneamente.
- **Status Effects Engine**: Sistema genérico no backend processando debuffs por ticks e modificando a velocidade de aproximação dos monstros.

### Novos Livros de Drop & Catálogo Público (`loot.go`, `expeditions.go`, `game_catalog.go`)
- **Novos Tomes de Habilidade**:
  - *Tome: Golpe Brutal* (Drop exclusivo do Boss do Planalto).
  - *Manual: Tiro Preciso* (Drop exclusivo do Boss dos Esgotos).
  - *Livro: Estilhaço de Gelo* (Drop exclusivo do Boss do Santuário Congelado).
- **Endpoint `GET /api/v1/game/catalog` V2**: Exporta metadados completos de todas as habilidades para o frontend.

### Frontend Modular de Efeitos no Canvas 2D (`frontend/src/game/effects/`)
- **`CombatEffectRegistry.ts`**: Gerenciador de ciclo de vida desacoplado do `GameViewport.ts`.
- **Renderizadores por Domínio**:
  - `meleeEffects.ts`: Arcos cortantes prateados e impactos vermelhos/dourados pesados.
  - `rangedEffects.ts`: Leque de 4 flechas e traçador de alta velocidade.
  - `magicEffects.ts`: Esferas de fogo com anéis de onda de choque e cristais glaciais.
  - `commonEffects.ts`: Coluna de luz sagrada esmeralda/dourada com cruzes ascendentes.
- **Dano Crítico Dourado & Slow**:
  - `FloatingText.scale` ampliado para $1.45\times$ em amarelo dourado (`#fde047`) exibindo `⚡ CRIT! -Dano`.
  - Badge visual `❄️ SLOW` nas placas de identificação dos monstros sob efeito de lentidão.

### Revisão Completa do Retorno Automático para a Expedição (`AutoResumeExpedition`)
- **Aceleração Dinâmica da Recuperação no Acampamento (`engine.go`)**:
  - Substituída a regeneração linear fixa (+3 HP e +2 Mana por tick, que demorava até 56 minutos em níveis altos) por uma recuperação percentual ágil de **10% do HP Máximo e 10% da Mana Máxima por tick**.
  - O herói agora recupera 100% de vida e mana no acampamento em apenas **$\approx 7.5$ a $10$ segundos**.
- **Preservação de Auto-Retorno na Inicialização de Sessão (`NewGameSession`)**:
  - Se `char.AutoResumeExpedition` estiver ativo:
    - Se o personagem logar com vida/mana cheias, a expedição é ativada imediatamente (`IsExpeditionActive = true`).
    - Se estiver ferido, marca `RecoveringFromDefeat = true` e `AutoResumePending = true`, fazendo com que retorne automaticamente à expedição em poucos segundos após a recuperação no acampamento.
- **Simulação e Progresso Offline com Auto-Retorno (`offline.go` & `db.go`)**:
  - `CalculateOfflineProgress` agora processa a simulação offline mesmo se o personagem deslogou durante o descanso pós-derrota (`IsExpeditionActive == false`), desde que `AutoResumeExpedition` esteja ativo.
  - `ClaimOfflineProgress` garante a persistência de `is_expedition_active = true` e restauração de 100% de HP/Mana no login.

### Ajuste de Visibilidade & UX/UI (Fade-In & Culling de Monstros na Arena)
- **Eliminação do Empilhamento na Borda da Tela**: Removido o clamping artificial (`Math.min(440, ...)`) que forçava monstros fora do campo de visão a renderizarem suas barras de vida na borda direita.
- **Culling & Fade-In Suave**: Monstros marchando fora da arena (`x > 500px`) permanecem ocultos e ganham opacidade gradual e fluida à medida que entram na tela.
- **Ancoragem Direta na Cabeça**: Placas de identificação e barras de HP agora acompanham diretamente a posição X de cada monstro (`x = m.currentX`).
- **Design Moderno e Compacto**: Placas translúcidas elegantes com bordas discretas, destaque em ouro/carmesim com coroa 👑 para Bosses e barras de vida limpas.
- **Fórmula Canônica de XP (`CalculateKillXP`)**: Unificada no backend Go para tempo real e offline determinístico:
  - $\text{XP Base} = (\text{Nível do Monstro} \times 45) + (\text{MaxHealth} / 6)$, com multiplicador de **2.5x para Bosses**.
  - **Bônus de Desafio (Underdog)**: Até $+80\%$ de XP extra para heróis que derrotam monstros mais fortes ($\Delta L > 0$).
  - **Penalidade Suave de Caça Trivial**: Redução progressiva até o piso de $5\%$ para incentivar a progressão natural de Tiers.
- **Rebalanceamento dos 9 Bosses (Fase 5 de todas as regiões)**:
  - Vida elevada em **2.5x a 3.0x** (*Urso* para 520 HP, *Esquelético* para 1.100 HP, *Xandaum* para 1.850 HP, *Voldemorte* para 2.600 HP, *Mestre do Santuário* para 4.800 HP e *Vingador de Chifres* para 12.500 HP).
  - Ataque e dano ajustados para exigir sustain e equipamentos do patamar da região.
  - Recompensa de ouro de Bosses aumentada (80 a 200 de ouro).
- **Nova Expedição**: `Planalto dos Três Poderes` (`planalto`, Níveis 8 a 19, Tier 2) no `expeditions.go`.
- **Novo Bioma Cênico**: `renderPlanaltoBiome` com Congresso Nacional (torres gêmeas, cúpula do Senado, cúpula da Câmara, rampa monumental, espelho d'água e gramado da esplanada).
- **Novos Monstros & Boss**:
  - `planalto_militante` (*Militante do Treze ⭐️* - Camiseta vermelha com estrela do PT e sinal do "L").
  - `planalto_patriota` (*Patriota do Caminhão 🇧🇷* - Enrolado na bandeira do Brasil com pintura facial).
  - `planalto_pulica` (*Puliça de Choque 👮* - Boina preta tática, colete balístico e cassetete).
  - `planalto_boss_xandaum` (*Xandaum, o Soberano da Toga ⚖️* - Careca imponente, toga preta esvoaçante de magistrado, relógio de ouro e caneta de despachos).
- **Catálogo Exclusivo de Loot (11 novos templates balanceados)**:
  - *Martelo Constitucional* (Clava Melee), *Caneta Esferográfica Suprema* (Varinha Mágica), *Megafone do Povo* (Arco Ranged), *Boina Tática da Puliça* (Head), *Toga da Inviolabilidade* (Chest), *Calça Social Engomada* (Legs), *Coturno da Lei* (Boots), *Cordão da Estrela Rubra* (Necklace), *Anel do Supremo Relator* (Ring), *Pasta Executiva Presidencial* (Bag) e *Virotes da Notificação* (Ammo).
- **Auditoria de Conteúdo**: 9 regiões, 39 monstros/bosses, 39 perfis de loot, 84 templates de itens e 0 inconsistências.

## Removido / substituído

- `WORLD_REGIONS` duplicado no React.
- Switch gigante de monstros em `PixelArtRenderer`.
- Cadeia de background e inferência região-por-nome em `GameViewport`.
- Inferência de loot por substring do nome do monstro.
- Inferência de skill book/skill pelo nome do item.
- Kits iniciais hardcoded em `ChooseStarterPack` e no modal.
- `SpriteGenerator.ts` legado sem consumidores.
- Assunções do engine de que toda expedição possui exatamente cinco fases.
- **Botão `Descartar Selecionados`** no inventário/mochila, centralizando o fluxo econômico na venda de itens (`Vender Selecionados` e `Vender Tudo`).

