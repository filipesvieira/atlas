# GAME_SPECIFICATION.md

---

## 1. Executive Summary

**Project Atlas** é um MMORPG Idle/Incremental autoral para navegadores, desenvolvido do zero sem qualquer dependência do ecossistema OpenTibia ou engines legadas. O jogo combina a profundidade de progressão, itens e mundo dos RPGs clássicos com a conveniência de uma jogabilidade assíncrona orientada à estratégia.

O jogador atua como um estrategista e mentor que prepara seu aventureiro, define prioridades de combate e envia-o para expedições no mundo. A simulação de combate, coleta e exploração roda no servidor, continuando mesmo quando o jogador está offline. O projeto adota uma stack técnica ultraeficiente em **Go 1.22+**, **PostgreSQL 16**, **Redis 7**, **React 19**, **Tailwind CSS**, **`@dnd-kit`** e **PixiJS v8**, desenhada especificamente para rodar com baixíssimo consumo de memória (< 600 MB) em uma VPS modesta de 2 GB de RAM.

---

## 2. Vision

Redefinir o gênero Idle RPG eliminando mecânicas puramente numéricas ou de cliques repetitivos (*auto-clickers*). O objetivo do Project Atlas é fazer com que o jogador sinta que seu personagem habita um mundo vivo que continua evoluindo na sua ausência.

Ao retornar ao jogo, a sensação não deve ser a de apenas esvaziar um temporizador de recompensas, mas a de reconectar-se com uma expedição viva e ler um relatório narrativo com descobertas, batalhas árduas e loot procedural surpresa.

---

## 3. Design Philosophy

1. **Ajuste Estratégico > Execução Mecânica:** Vitória e eficiência dependem da preparação prévia (equipamentos, consumíveis, posturas e prioridades de IA), não da velocidade de clique.
2. **Histórias > Estatísticas:** Números servem apenas para dar suporte a momentos marcantes (sobreviver com 1% de HP, encontrar um item lendário único, descobrir uma ruína esquecida).
3. **Respeito Absoluto ao Tempo:** Progressão offline determinística por *delta-time*. O jogo se adapta à vida do jogador, sem punições por ausência ou mecânicas arbitrárias de login diário.
4. **Arquitetura Orientada a Eventos e Dados:** Todo o conteúdo de jogo (itens, monstros, habilidades, ruínas) é definido em arquivos de dados e interpretado pelo servidor central.

---

## 4. Core Pillars

* **Pilar 1 — Preparação Vence Batalhas:** O combate começa na escolha de suprimentos, equipamentos e perfis táticos.
* **Pilar 2 — Exploração É Progressão:** Descobrir novos biomas e ruínas desbloqueia oportunidades tão valiosas quanto subir de nível.
* **Pilar 3 — Decisões Criam Progresso:** Diferentes escolhas de atributos e modificadores devem funcionar melhor sob condições específicas.
* **Pilar 4 — O Mundo É Vivo:** Cidades mudam de estado, eventos globais ocorrem e mercadores viajam de forma autônoma.
* **Pilar 5 — Crescimento Horizontal:** Novas atualizações expandem opções de builds e regiões, sem invalidar conquistas passadas.

---

## 5. Core Gameplay Loop

```text
Observe (Analisar relatório de expedição e estado do mundo)
   ↓
Plan (Decidir próximo destino, contrato ou meta de craft)
   ↓
Prepare (Ajustar equipamentos, suprimentos e postura tática)
   ↓
Expedition (Aventureiro explora em tempo real via WebSockets ou via simulação offline)
   ↓
Resolve (Servidor processa eventos, combates e coletas determinísticas)
   ↓
Progress (Acúmulo de XP, Loot Procedural, Conhecimento e Reputação)
   ↓
Repeat

```

---

## 6. The World

* **Estrutura por Regiões:** O mundo é composto por regiões dinâmicas e biomas distintos (Florestas Ancestrais, Montanhas Congeladas, Terras Cinderinas, Ruínas Submersas).
* **Modificadores Ambientais:** Áreas possuem perigos intrínsecos (neblina tóxica, frio extremo, escuridão) que exigem preparação específica (resistências, tochas, poções).
* **Cidades Cúmulo (Safe Hubs):** Cidades atuam como centros de comércio, forja, contratos de guilda e interação social entre jogadores.
* **Conteúdo Oculto:** Locais não mapeados que só podem ser descobertos via expedições de exploração contínua ou pistas encontradas no bestiário.

---

## 7. The Player

* **Papel do Jogador:** O jogador é o **Guia/Mentor**. Ele gerencia o inventário, define perfis de comportamento e toma decisões de alto nível.
* **Papel do Aventureiro:** Entidade autônoma que executa as instruções de forma inteligente, calcula rotas de fuga, utiliza poções segundo os gatilhos configurados e coleta itens.
* **Perfis de Comportamento:**
* *Agressivo:* Prioriza dano máximo e caça de elites; ignora consumo de poções.
* *Defensivo:* Recua quando o HP atinge limiares baixos e foca em sobrevivência.
* *Coletor:* Evita combates contra alvos de alto nível e foca em nós de recursos.
* *Explorador:* Prioriza revelação de mapa e busca de ruínas.



---

## 8. Character Progression

Progresso distribuído em 5 pilares independentes:

1. **Knowledge (Conhecimento):** Desbloqueio de fraquezas de monstros, atalhos e lore. Permanecem para sempre.
2. **Masteries (Maestrias):** Evolução pelo uso de armas e escolas de magia.
3. **Equipment (Equipamentos):** Fonte primária de poder com modificadores procedurais.
4. **Professions (Profissões):** Mineração, Herbolaria, Forja, Alquimia, Caça.
5. **Reputation (Reputação):** Afinidade com facções e cidades que desbloqueiam itens e descontos exclusivos.

---

## 9. Classes

Project Atlas adota um sistema **sem classes fixas (Classless System)**:

* **Origens Iniciais:** Definem apenas o contexto inicial e atributos base (*Wanderer, Apprentice, Hunter, Squire, Acolyte*).
* **Identidade Emergente:** A classe do personagem é o resultado da combinação de suas armas equipadas, maestrias desenvolvidas e escolas de magia treinadas.
* **Exemplos de Builds:**
* *Espada Pesada + Magia da Natureza + Herbolaria* = Guardião Implacável.
* *Arco Longo + Magia das Sombras + Alquimia* = Caçador Noturno.



---

## 10. Skills

* **Aquisição por Prática e Descoberta:** Habilidades são aprendidas utilizando técnicas no combate, encontrando tomos antigos em ruínas ou treinando com mestres.
* **Gatilhos de Execução de IA:** Cada habilidade possui regras de prioridade configuráveis pelo jogador:
* Exemplo: *Usar "Cura da Natureza" apenas quando HP < 40%*.
* Exemplo: *Usar "Bola de Fogo" apenas se houver 3 ou mais inimigos engajados*.


* **Sinergias Elementais:** Inimigos molhados recebem mais dano de Trovão; inimigos congelados sofrem dano extra de acerto crítico físico.

---

## 11. Combat

* **Motor Simulado e Determinístico:** Todo o combate é processado no servidor em Go usando um loop baseado em *ticks* (200ms a 500ms).
* **Posicionamento e Alcance:** Cálculos de linha de visão, distância de ataque, alcance de magias e terreno.
* **Feedback Visual do Cliente:** O cliente (React + PixiJS v8) recebe eventos via WebSocket e reproduz animações de dano flutuante, efeitos visuais e movimentação de sprites sem interferir na autoridade do servidor.

---

## 12. Monsters

* **Perfís de IA Monstruosa:** Inimigos possuem comportamentos distintos (Hunters emboscam; Guardians protegem território; Cowards fogem ao ficarem feridos).
* **Afinidades e Resistências:** Elementos (Fogo, Gelo, Terra, Sagrado, Morte, Físico) influenciam a eficácia dos ataques.
* **Variantes Procedurais:** Monstros base podem gerar variantes *Elite*, *Mutado* ou *Ancestral*, com atributos inflados e habilidades extras.
* **Bestiário Ativo:** Enfrentar repetidamente uma espécie revela seus atributos exatos, taxas de drop e concede bônus de dano permanente.

---

## 13. Items

* **GeraçãoProcedural:** Sistema de itens baseado em **Base + Prefixo + Sufixo + Rolls Aleatórios**.
* **Categorias de Raridade:**
* `Comum` (Cinza) - Atributos base sem modificadores.
* `Raro` (Azul) - +1 ou +2 Atributos adicionais (ex: +5% Vel. Ataque).
* `Épico` (Roxo) - Atributos elevados + 1 Efeito Passivo.
* `Lendário` (Dourado) - Atributos máximos + Efeito Especial único.
* `Mítico` (Vermelho) - Itens únicos globais de eventos/world bosses.


* **Atributos Flexíveis (JSONB):** Guardados no banco como objetos JSON flexíveis para fácil expansão sem alterações de schema.

---

## 14. Equipment

* **Slots de Equipamento:** *Head, Chest, Legs, Boots, MainHand, OffHand, Ring I, Ring II, Necklace, Cloak*.
* **Arquetipos de Armadura:**
* *Leve:* Foco em esquiva, velocidade de movimento e recuperação de energia/mana.
* *Média:* Equilíbrio entre defesa física e resistência elemental.
* *Pesada:* Alta redução de dano físico e mitigação de controle de grupo.


* **Durabilidade:** Desgastada lentamente durante combates longos. Mantida via kits de reparo ou ferreiros nas cidades.

---

## 15. Expeditions

* **Ciclo de Expedição:** O jogador define o destino, aloca suprimentos (rações, poções, tochas) e escolhe uma condição de término (ex: *Retornar se o inventário estiver cheio ou HP < 20%*).
* **Consumo de Suprimentos:** Carregar mais suprimentos aumenta a duração da expedição, mas reduz o espaço na mochila para guardar loot.
* **Relatório de Expedição:** Histórico gerado com estatísticas de XP/hora, moedas coletadas, monstros derrotados e itens procedurais encontrados.

---

## 16. Dungeons

* **Estrutura por Fases:** Instâncias mais perigosas divididas em:
`Entrada → Câmaras Principais → Seções Secretas → Sala do Chefe → Escapada`.
* **Perigos Ambientais:** Desmoronamentos, gás venenoso e escuridão total exigem itens de suporte específicos.
* **Encontros com Chefes:** Batalhas de fases múltiplas que testam a estratégia configurada pelo jogador.

---

## 17. Offline Simulation

* **Cálculo por Delta-Time:** Quando o jogador se desconecta, o servidor armazena o *timestamp* do logout. Ao reconectar (ou via worker de fundo), o servidor calcula:

$$\text{Tempo Valido} = \min(\text{Agora} - \text{LastLogout}, 12 \text{ horas})$$


* **Processamento Determinístico:** O servidor calcula quantas batalhas ocorreriam no período, aplica o consumo de poções configurado, calcula a XP/Ouro e realiza os *rolls* de loot procedural.
* **Resumo de Retorno:** Modal em React exibido no login detalhando os ganhos durante a ausência.

---

## 18. Multiplayer

* **Mundo Persistente Assíncrono:** Todos os jogadores compartilham a mesma economia, cidades hubs e rankings.
* **Cidades como Social Hubs:** Jogadores se encontram em cidades para negociar no mercado, interagir no chat e formar companhias.
* **Campanhas Cooperativas:** Expedições em grupo onde jogadores combinam o poder *idle* de seus aventureiros para enfrentar World Bosses.

---

## 19. Guilds & Expedition Companies

* **Guildas de Aventureiros:** Organizações de jogadores focadas em desbloquear bônus passivos comunitários, pesquisas de tecnologias de expedição e controle de territórios.
* **Companhias de Comércio:** Guildas focadas na produção industrial de recursos, monopólio de rotas comerciais e abastecimento do mercado.

---

## 20. Economy

* **Moeda Principal (Gold):** Utilizada em todas as transações, taxas de mercado e serviços de NPCs.
* **Fontes de Moedas (Sources):** Recompensas de expedições, venda de itens e quests.
* **Ralos de Moedas (Sinks):** Taxas de leilão no mercado, custos de reparo, aprimoramento de equipamentos e viagens rápidas.
* **Mercado de Jogadores (Player Market):** Sistema de compra e venda livre em que os próprios jogadores definem os preços de recursos e equipamentos.

---

## 21. Crafting

* **Profissões de Coleta:** Mineração (Minérios), Herbolaria (Plantas/Ingredientes), Caça (Peles/Essências).
* **Profissões de Manufatura:** Ferramentaria/Forja (Armas e Armaduras), Alquimia (Poções e Elixires), Encantamento (Runas e Cristais).
* **Estações de Trabalho:** Instalações localizadas em cidades necessárias para receitas avançadas.

---

## 22. Quests

* **Contratos de Expedição:** Missões dinâmicas que pedem ao aventureiro para explorar determinada região ou coletar recursos específicos.
* **Quests de História:** Linhas de missões que revelam a história das ruínas e facções do mundo.
* **Missões de Facção:** Tarefas que aumentam a reputação com reinos locais em troca de equipamentos exclusivos.

---

## 23. NPCs & Factions

* **Simulação de Facções:** Reinos e facções possuem níveis de afinidade com o jogador (*Desconhecido, Reconhecido, Confiável, Lendário*).
* **Cidades Dinâmicas:** Cidades podem mudar de estado (*Prospera, Sob Ameaça, Em Crise*) com base em eventos globais concluídos pela comunidade.

---

## 24. UI / UX

* **Layout Modular Drag-and-Drop (`@dnd-kit`):** O painel do jogo permite que o jogador e o administrador arrastem, reordenem e redimensionem os widgets da interface (Status, Log de Combate, Controle de Expedição, Telemetria).
* **Estilização com Tailwind CSS:** Design retrô dark mode focado em alta legibilidade, contraste e responsividade (desktop e mobile).

---

## 25. Art Direction

* **Estética Retro 2D Isométrica:** Visual nostálgico em *pixel art* com sprites de 32x32 pixels.
* **Renderização com PixiJS v8:** Renderizador acelerado por WebGL/WebGPU que garante 60 FPS constantes para movimentação de sprites, iluminação de magias e textos flutuantes de dano.

---

## 26. Audio Direction

* **Sons Atmosféricos Retro:** Efeitos sonoros para impactos de armas, conjuração de magias e moedas caindo no inventário.
* **Trilha Sonora Adaptativa:** Músicas ambientais em estilo chiptune/sintetizador neoclássico que se alternam entre exploração e batalhas contra chefes.

---

## 27. Technical Architecture

### Stack de Tecnologia

* **Backend:** Go 1.22+ (REST API + WebSockets + Offline Worker)
* **Banco de Dados:** PostgreSQL 16 (Persistência com suporte JSONB)
* **Cache & Sessão:** Redis 7 (Tokens JWT e Filas em Memória)
* **Frontend:** React 19 + Tailwind CSS + `@dnd-kit` + PixiJS v8

### Orçamento de Memória (VPS 2 GB RAM)

| Serviço | Consumo de RAM Alocado |
| --- | --- |
| **Linux OS + Docker Engine** | ~250 MB |
| **PostgreSQL 16** *(Tuned)* | ~300 MB |
| **Redis 7** | ~50 MB |
| **Go Backend (Binary)** | **~25 MB** |
| **Buffer de Segurança** | ~1.375 MB |

---

## 28. Save System

* **Persistência Híbrida:** O estado atual do jogador (HP, Mana, Nível, Posição) fica em cache no Redis e é sincronizado com o PostgreSQL em intervalos regulares (a cada 5 minutos) ou em eventos críticos (fim de expedição, troca de equipamento, logout).
* **Transações Atômicas:** Mudanças de inventário e saldo bancário usam transações estritas no PostgreSQL para evitar duplicação de itens.

---

## 29. Networking

* **HTTP/2 REST API:** Para autenticação, gerenciamento de conta, consulta de inventário e ações de interface.
* **WebSockets (Gorilla WebSocket em Go):** Para streaming de dados de combate em tempo real, atualizações do canvas PixiJS e chat global.
* **Tokens JWT:** Armazenados em cookies `httpOnly` seguros com expiração curta e rotatividade via Refresh Token no Redis.

---

## 30. AI & Simulation Engine

* **Engine de Ticks em Go:** O backend roda um loop de simulação concorrente usando *Goroutines*. Cada goroutine processa o estado de combate de um aventureiro ativo.
* **Tomada de Decisão de IA:** Avaliação de regras configuradas pelo jogador em tempo de execução:

$$\text{Se } \text{HP}_{\text{Atual}} < 0.40 \times \text{HP}_{\text{Máx}} \implies \text{Executar "Cura"}$$



---

## 31. Content Pipeline

* **Conteúdo Orientado a Dados (Data-Driven):** Monstros, itens base, tabelas de experiência e receitas de craft são definidos em arquivos `JSON`/`YAML`.
* **Sem Necessidade de Recompilação:** Adicionar novos monstros ou equipamentos consiste em adicionar novas entradas nos arquivos de configuração do servidor em Go.

---

## 32. Balancing Philosophy

* **Curva de Experiência Exponencial:** Curva de ganho de nível projetada para rápido avanço nos níveis iniciais (1-30) e estabilização nos níveis altos (100+), onde o foco passa a ser *Masteries* e equipamentos.
* **Economia Anti-Inflação:** Taxas sobre transações no mercado de jogadores e custos de reparo que destroem moedas na mesma proporção em que são geradas.

---

## 33. Live Operations

* **Atualizações Semanais de Eventos:** Invasões globais e modificadores de regiões ativados via flags no backend Go sem necessidade de reiniciar o servidor.
* **Telemetria Administrativa:** Widget no painel de administração para monitorar uso de memória, conexões ativas e taxa de geração de itens em tempo real.

---

## 34. Monetization Philosophy

* **Modelo Ético & Sem Pay-to-Win:** Zero venda de equipamentos com atributos, poções diretas ou vantagens de poder no combate.
* **Monetização Focada em Cosméticos e QoL:**
* Skins visuais para o sprite do aventureiro.
* Molduras e auras personalizadas para a interface.
* Abas adicionais de organização de banco/mochila.



---

## 35. MVP Definition

O Produto Mínimo Viável (MVP) do Project Atlas consiste em:

1. Sistema de Cadastro e Login com JWT e persistência no PostgreSQL.
2. Criação de 1 Personagem por conta com escolha de Origem.
3. Tela Principal com Dashboard Drag-and-Drop React contendo widgets funcionais.
4. Canvas PixiJS v8 renderizando o sprite do aventureiro e animação de texto flutuante de dano.
5. Engine Offline em Go que calcula XP, Ouro e Loot Procedural após 5 minutos de ausência.

---

## 36. Post-MVP Roadmap

* **Fase 1:** Implementação das Árvores de Maestria de Armas e Escolas de Magia.
* **Fase 2:** Mercado de Jogadores (Auction House) e Sistema de Forja/Crafting.
* **Fase 3:** Instâncias de Dungeons em Grupo e World Bosses Cooperativos.
* **Fase 4:** Lançamento da expansão de Exploração Naval e Ilhas Misteriosas.

---

## 37. Technical Risks & Mitigations

| Risco Técnico | Mitigação |
| --- | --- |
| **Estouro de Memória (OOM) na VPS 2GB** | Uso do Go (binário estático ~20MB RAM) e tuning estrito do buffer pool do PostgreSQL. |
| **Vazamento de Memória WebGL no PixiJS** | Destruição adequada de texturas e limpeza de tickers no ciclo de vida dos componentes React. |
| **Trapaça/Modificação de Dados no Cliente** | Servidor 100% autoritativo em Go. O cliente é apenas uma camada visual. |

---

## 38. Final Vision

Project Atlas é a realização de um RPG persistente, nostálgico e profundamente tático, feito para ser jogado no navegador em qualquer lugar. Ele respeita a inteligência e o tempo do jogador, oferecendo um universo vivo onde cada expedição planejada se transforma em uma grande história.
