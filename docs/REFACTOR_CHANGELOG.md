- Multiplayer M3E-B adiciona `rules_version = 3`, estratégia pré-duelo versionada e movimentação tática autoritativa com CHASE/KITE/spacing, além de contrapesos de backpedal e pressão melee; corrige também a finalização que comparava `TEXT` com `UUID` no lock de atividade PvP.
# Refatoração modular — changelog

## [Unreleased] - 2026-08-27 (Performance V2, Identidade de Equipamentos & Documentação)

- Multiplayer M2A ativou Redis no backend: Pub/Sub do chat mundial, presença global com TTL/ownership de sessão e tickets WebSocket single-use consumidos atomicamente entre réplicas. Redis é obrigatório em staging/produção e possui fallback local apenas em desenvolvimento.
- Multiplayer M2B tornou o scheduler do assentamento seguro para múltiplas réplicas: advisory lock PostgreSQL elege uma única líder e `atlas.settlement.scheduler.v1` propaga resultados para a instância que hospeda a sessão, sempre recarregando PostgreSQL antes de emitir o snapshot ao cliente.
- Multiplayer M3A adicionou desafios diretos de duelo persistentes, expiráveis e idempotentes. Convites respeitam bloqueios, atravessam réplicas pelo stream social e ainda não iniciam combate, preservando a separação entre PvP futuro e PvE atual.
- Multiplayer M3B adicionou a partida PvP persistente: o aceite cria uma `pvp_matches` `ready` com snapshots autoritativos dos participantes e evento inicial auditável. O cliente recebe apenas um aviso de arena preparada; atributos, equipamentos, skills e buffs congelados não são expostos pelo WebSocket.
- Multiplayer M3C torna o duelo executável: confirmação bilateral expira em 90 segundos, uma líder global de arena roda `PvPCombatInstance` isolada a cada 250 ms e persiste cada pulso para retomar após queda. O cliente recebe apenas estado seguro de combate; não há perda, recompensa ou interferência no PvE.
- A reconexão recupera a confirmação pendente da arena e a líder global limpa partidas `ready` que venceram, registrando o timeout no histórico auditável.
- Multiplayer M3D conecta o estado seguro do duelo ao `GameCanvas`: uma arena isométrica pixelada exibe os dois combatentes, profundidade, impacto, vida e resultado, sobreposta ao mundo sem interromper a expedição. Os dois avatares são genéricos por arquétipo, mantendo equipamento e buffs privados.
- Multiplayer M3E-A versiona a arena em `rules_version = 2`: as até duas habilidades ativas seladas no aceite entram em rotação automática sob regras exclusivas de PvP, com mana, cooldown, dano/cura e recuperação determinística independentes do PvE. Eventos públicos agora carregam somente a chave visual da habilidade e a indicação de cura para o Canvas.
- O HUD recebeu uma organização de jogo: HP/MP ficam sobre o Canvas, enquanto habilidades, posturas e suprimentos permanecem dentro da arena. Logs e chat global foram unificados em um console por abas, pronto para canais de Clã/Reino e conversas privadas fecháveis quando os respectivos protocolos existirem.
- O catálogo atual passou a ser `2026.08-performance-v2-equipment-identity-v1`, com 9 regiões, 40 monstros/bosses, 40 perfis de loot, 111 templates e 40 visuais validados pelos auditores.
- O WebSocket usa `character_delta` nos caminhos quentes, tickets curtos single-use para a conexão e fila serial de persistência para loot, inventário, cargas pendentes e descobertas.
- `CraftBatch` processa até 20 unidades em uma transação idempotente; a migration `000022_crafting_batch_transactions.sql` mantém o contrato persistente.
- A identidade visual dos equipamentos foi ampliada com `visual_key`, `set_key`, paletas coerentes e renderers pixel art para os conjuntos e o Cajado de Pirulito.
- A Vila do Shereque foi registrada como arena isométrica, junto da Floresta, com geometria 24x18, camadas dinâmicas, profundidade e terreno/colisão próprios. As demais regiões continuam legadas até sua conversão.
- A documentação canônica foi sincronizada com o código atual e passou a separar planos/relatórios históricos de instruções operacionais.

## [Unreleased] - 2026-08-26 (Alpha Hardening V1)

- Rotas HTTP/WebSocket receberam validação de ambiente, limites de payload, deadlines, rate limits e autenticação por ticket efêmero.
- Checkpoints de personagem e scheduler do assentamento reduziram persistência por tick e retiraram I/O pesado de locks de sessão nos fluxos principais.
- As sete construções básicas permanecem liberadas na alpha, preservando o sistema de manuais para conteúdo futuro; cancelamento de Ambição em fabricação devolve recursos e ouro de forma transacional.
- O ciclo econômico ganhou Lingote de Cobre e Farinha de Osso, com auditoria de origem e destino para evitar recursos obtíveis sem utilidade.

## [V7.6.0] - 2026-08-21 (Histórico de Expedição e Recuperação Offline)

- A simulação e o combate online passam a persistir expedições concluídas, bosses derrotados, mortes, maior fase alcançada e a fase da última derrota.
- A migration `000019_expedition_history.sql` adiciona os campos com defaults compatíveis para personagens existentes.
- A recuperação pós-derrota possui uma fronteira persistida; o auto-retorno offline só começa após o término do descanso.
- Relatórios offline preservam `failure_stage`, sem confundir a fase em que a morte ocorreu com a fase 1 usada no reset.

## [V7.5.0] - 2026-08-20 (Cozinha, Refeições Persistentes & Layout Personalizável)

- Nova profissão `cook` (Cozinheiro) e nova construção livre `kitchen` (Cozinha de Campanha), criada como fundação nível 0 para poder ser posicionada antes da primeira obra.
- Cozinha possui três níveis, footprint 3x2 e renderer pixel-art próprio; receitas exigem nível da profissão e da Cozinha.
- Seis refeições iniciais transformam peixe, carne, trigo/farinha, ervas e flor arcana em bônus de preparação: Peixe Assado, Espeto do Caçador, Ensopado do Explorador, Torta do Rastreador, Banquete Arcano e Banquete do Guerreiro.
- Refeições usam efeitos de 20 minutos, 5 horas e 24 horas em tempo real; inicialmente existe uma categoria exclusiva `meal`, então uma nova refeição substitui a anterior mediante confirmação do cliente.
- Migration `000016_character_food_buffs.sql` mantém histórico dos intervalos de buffs e transações idempotentes de consumo. O histórico permite aplicar corretamente apenas a parte do bônus que realmente esteve ativa durante progresso offline.
- O motor de combate aplica bônus de XP/ataque online; a simulação offline recalcula o efeito no instante de cada onda/abate em vez de congelar o buff ao desconectar.
- `CONSUME_FOOD` consome recurso, avança revisão do acampamento, registra ledger e persiste o resultado por `request_id`; retries simultâneos são serializados pelo lock do personagem.
- O grid isométrico ganhou rotação durante drag-and-drop (`R`), trocando footprints 3x2/2x3 e validando limites/colisões no frontend e novamente no backend.
- Financiamento automático da Tesouraria passa a ser opt-in para novos assentamentos (`000017_treasury_auto_fund_opt_in.sql`), sem sobrescrever a configuração de saves existentes.
- Catálogo expõe consumíveis e efeitos para a UI; o Hub Econômico recebe aba `Cozinha`, despensa, refeição ativa e consumo com confirmação de substituição.
- Sprites dedicados para as seis refeições complementam a identidade visual por recurso/material e preservam a leitura de materiais dos equipamentos.
- Auditorias de conteúdo, acampamento e economia permanecem zeradas; testes puros de layout e buffs passam.

## [V7.4.0] - 2026-08-20 (Tauri Hardening, Layout Isométrico Livre & Identidade Visual)

- Cliente Tauri deixa de inferir o backend por `window.location`; releases exigem `VITE_API_BASE_URL`/`VITE_WS_BASE_URL` e o workflow aceita as variáveis `ATLAS_API_BASE_URL`/`ATLAS_WS_BASE_URL`.
- Removidos Google Fonts e Tailwind CDN do HTML empacotado; Tailwind passa a usar o pipeline local e o Tauri recebe CSP explícita.
- Origem de desenvolvimento do Tauri adicionada à allowlist padrão sem abrir CORS para `*`.
- Falha ao carregar o Baú de Achados agora interrompe a criação da sessão, evitando que um erro transitório de leitura seja salvo como baú vazio no logout.
- Migration `000015_isometric_camp_layout.sql` adiciona `tile_x`, `tile_y` e `rotation`, migrando os cinco prédios atuais para posições equivalentes sem alterar nível, recursos ou timers.
- `slot_key` deixa de ser tratado como posição física no fluxo de upgrade e passa a funcionar como identificador legado/instância; novos projetos podem receber fundações nível 0 no grid.
- Ao aprender um novo blueprint de construção, a fundação é posicionada automaticamente em um espaço livre e pode ser arrastada antes da primeira obra; se a posição legada estiver ocupada, ela é realocada com segurança.
- Novo comando `MOVE_CAMP_BUILDING` valida ownership, `state_revision`, limites 16x12, footprint, colisão e bloqueia mudanças durante obras.
- Cena do acampamento recebe terreno isométrico e drag-and-drop com prévia verde/vermelha; a posição só é confirmada após validação autoritativa do backend.
- `PixelItemSprite` volta a respeitar raridade e diferencia materiais como madeira, couro, tecido, osso, pedra, cobre, bronze, prata e ferro. Broquéis/escudos de madeira possuem silhueta e tábuas próprias.
- Novo `PixelResourceSprite` cria identidade dedicada para peixes, carnes, trigo, farinha, madeira, minério, carvão, ervas, couro, troféus e partes de monstros, reutilizado no depósito, custos, descarte, crafting e desmonte.
- `image-rendering: pixelated` deixa de ser global e passa a se aplicar apenas aos sprites/canvas.
- Auditorias de conteúdo, acampamento e economia permanecem com zero erros; testes puros de layout do backend passam.

## [V7.3.0] - 2026-08-20 (Tesouraria, Folha Automática & Progressão Segura)

- Tesouraria do assentamento separada do ouro pessoal, com depósito, retirada, saldo disponível e folha reservada.
- Financiamento automático transfere somente o déficit necessário e preserva uma reserva pessoal configurável do herói.
- Salários de coleta são calculados por duração, nível profissional e tier, salvos no snapshot e reservados antes da saída.
- O início permanece protegido: a folha só é desbloqueada em 25 de Prosperidade; ordens existentes e saves legados custam zero.
- Retorno online/offline liquida salário automaticamente; cancelamento paga somente o tempo trabalhado e devolve o restante.
- Ledger de ouro e folha idempotente impedem duplicação em reconexões e repetição de comandos.
- Novo painel `Tesouraria & Folha` explica saldos, política automática e custo de cada turno antes da confirmação.
- Turno curto de 3 minutos foi adicionado ao onboarding de coleta sem remover opções de 15 min, 1 h, 4 h e 8 h.
- Novos personagens já entram com espada e broquel equipados, evitando a primeira expedição sem atributos de equipamento; os demais estilos continuam na mochila.
- Política `crafting-first` corrigida: monstros comuns voltam a entregar materiais por padrão e chefes mantêm somente uma chance pequena de artefato direto, preservando valor da produção do acampamento.
- Bônus de construções passam a usar o total do nível atual, corrigindo a soma indevida de níveis anteriores.
- Migrador agora usa advisory lock e checksum SHA-256 para impedir execução concorrente e alteração silenciosa de SQL publicado.
- Eventos econômicos completam campos não opcionais com o snapshot autoritativo da sessão, evitando zerar atributos, expedição ou carga segura ao movimentar a Tesouraria.
- Migration aditiva `000014_settlement_treasury_payroll.sql`; nenhum ouro, recurso, morador ou progresso existente é convertido.
- Catálogo atualizado para `2026.08-settlement-v1.2-treasury-payroll`.

## [V7.2.0] - 2026-08-18 (Profissões Especializadas, Raridade de Trabalhadores & Simulação Offline Contínua)

- **Profissões Especializadas de Artesanato**: Registradas as 6 profissões de manufatura (`blacksmith`, `jeweler`, `leatherworker`, `tailor`, `woodworker`, `alchemist`) separadas das 6 profissões de coleta bruta.
- **Mapeamento de Receitas Canônico**: Receitas de armas, escudos, anéis, armaduras, calças, capacetes, botas, mochilas e munições agora demandam estritamente o artesão correspondente (ex: Joalheiro para anéis e amuletos, Coureiro para sandálias e mochilas, Ferreiro para espadas e escudos).
- **Pioneiros com Dupla Profissão**: Os 7 pioneiros iniciais cobrem 100% das 6 coletas e 6 artesanatos desde o nível 1, impedindo que jogadores fiquem travados no início do jogo.
- **Raridade Procedimental de Trabalhadores (*Arrivals*)**: Novos moradores que chegam por moradia e prosperidade são sorteados com chances de raridade determinística por conta: Comum (65%, 1 profissão), Raro (25%, 2 profissões), Épico (8%, 2 profissões Nv. 2) e Lendário (2%, 2 profissões Grão-Mestre Nv. 3).
- **Mensagens Humanizadas de Ambição**: O herói exibe mensagens claras de requisitos (ex: *"Nenhum morador especializado em Joalheiro está livre"*).
- **Correção da Simulação Offline Contínua**: Removido o encerramento prematuro (`break`) que descartava horas offline após uma derrota inicial. O motor agora consome tempo de descanso na fogueira (`offlineCampRecoverySeconds`) e reinicia na Fase 1 em loop contínuo durante todo o período offline.
- **Tempo de Descanso Dinâmico na Fogueira**: Escalonamento por HP Máximo, Nível e Vitalidade (piso de 30s para iniciantes e teto de 180s para end-game), valorizando construções do acampamento e o atributo Vitalidade.
- **Alinhamento do DPS e Ritmo Offline**: Duração de combate contra monstros offline sincronizada com o DPS real do herói, sem penalidade artificial de dilatação por eficiência.
- **Renderização Visual e Locomoção Canvas 2D**:
  - Animação de braços/armas e pernas (`walkStep`) dos heróis em combate e locomoção.
  - Redesenho completo e animações procedurais dos 4 monstros da Floresta (Lobo com 4 patas e cauda, Goblin com lança, Aranha Viúva-Negra em 8 patas senoidais e Boss Ursinho Zangado Care Bear).
  - Movimentação suave contínua dos monstros no viewport com sincronia de velocidade e passos (`walkDistance`).

- Livros de habilidade agora são estudados independentemente da arma equipada; compatibilidade permanece autoritativa somente na ativação e execução.
- O frontend deixa de confundir livros cujo nome começa com `Manual:` com manuais de construção e passa a usar `item_kind`/`slot_type` canônicos.
- Livros duplicados não são consumidos e informam que a habilidade já foi aprendida.
- Craft manual em lote passa a ser uma única ordem ao servidor, limitada a 50 unidades, com quantidade concluída, raridades, carga segura e motivo de interrupção reais.
- A interface documenta que não há falha aleatória total no craft manual: a variação de equipamento é a raridade.
- `Prioridade` ganhou semântica visível e inequívoca: ordena Ambições, sem alterar chance, raridade ou velocidade.
- O botão `Limpar` remove Ambições concluídas ou esgotadas e preserva todos os itens independentes do Arsenal.
- Moradores retornam automaticamente de coletas concluídas, depositam o que couber e ficam livres; excedentes permanecem protegidos sem prender o trabalhador.
- Prosperidade tornou-se reputação produtiva permanente, com fontes explícitas e marcos populacionais; novas chegadas exigem simultaneamente Prosperidade e vaga de moradia.
- Nove perfis de chegada foram adicionados com nomes determinísticos por personagem, elevando a etapa atual a até 16 moradores.
- O cenário do refúgio recebeu estações visuais exclusivas para todos os 16 moradores e rótulos de estado localizados.
- Logs de obra usam o nome localizado da construção e o nível alvo, removendo chaves internas como `workbench`.
- Catálogo atualizado para `2026.08-settlement-v1.1-usability-growth` sem migration destrutiva.

## [V7.0.0] - 2026-08-13 (Assentamento Vivo, Moradores & Ambições)

- Profissões deixam de retirar o herói do combate: três moradores pioneiros executam coletas persistentes e paralelas.
- Nova migration `000013` preserva saves e converte ordens legadas para trabalhadores compatíveis.
- Nova fila autoritativa de Ambições do Herói com raridade mínima, prioridade, tentativas, catalisador e estados bloqueados recuperáveis.
- Reserva transacional impede gasto duplo de ouro/materiais; resultados automáticos ficam protegidos no Arsenal.
- Cabana passa a controlar capacidade populacional, enquanto construções continuam exclusivamente manuais.
- Hub econômico foi reorganizado em Ordens de Trabalho, Ambições & Arsenal, Oficina Manual e Moradores.
- Catálogo atualizado para `2026.08-settlement-v1-residents-desires`.

## [V6.0.0] - 2026-08-13 (Progressão Protegida, Profissões, Coleta & Crafting)

- Adicionado migrador versionado embutido, classificação conservadora de XP legado e bloqueio auditável de snapshots ambíguos.
- Progressão agora mantém `lifetime_experience`, `highest_level_ever`, `progression_version` e eventos monotônicos; morte/troca de região comunicam explicitamente que apenas a fase reinicia.
- Lease distribuído impede duas sessões simultâneas e claim offline concorrente para o mesmo personagem.
- Criados registries declarativos para seis profissões, seis expedições de coleta, recursos econômicos e receitas.
- Coleta idle usa seed/snapshot persistidos, claim idempotente e carga pendente sem expiração quando o depósito está cheio.
- Todos os 39 monstros/chefes entregam partes temáticas em vez de matéria-prima profissional.
- Equipamentos genéricos possuem receita equivalente; monstros comuns não entregam equipamento pronto por padrão e chefes mantêm chance pequena de artefato/manual.
- Itens antigos recebem apenas `source=legacy_drop`, sem reroll. Crafts recebem `source=crafted` e proteção contra auto-venda por 24 horas.
- Crafting possui preview autoritativo, locks, request ID, ledger, piso/teto de raridade, bônus limitados de profissão/estação e catalisadores.
- Excedentes de caça, offline e coleta viram carga pendente; nenhum recurso é truncado silenciosamente.
- Frontend ganhou Hub de Profissões & Oficina, estimativas de coleta, filtros completos do depósito e sincronização imediata da capacidade.
- Novo `tools/audit-economy.mjs` verifica políticas, cobertura, migrations e ausência de reroll legado.
- Seeds de coleta e crafting agora usam `crypto/rand` no servidor e são persistidos; `request_id` não influencia resultado econômico.
- Cancelamento de coleta preserva ciclos completos, seus recursos e XP profissional; apenas a fração de ciclo incompleta é perdida.
- Migrations `000008`–`000010` consolidam schemas legados, revisões, catálogos estáticos e unicidade regional do compêndio.
- Erros de leitura JSON deixam de ser convertidos silenciosamente em estado vazio; snapshots corrompidos bloqueiam a operação com erro explícito.
- Conflitos otimistas recarregam na sessão o snapshot vencedor do banco e ficam disponíveis na telemetria administrativa.
- Configurações de venda automática só são confirmadas no frontend após persistência bem-sucedida.
- Migration `000011` generaliza a fila de resgate: artefatos, manuais e demais itens protegidos que não caibam na mochila/baú são persistidos sem conversão ou descarte, inclusive no offline.
- Corrigida a inferência PostgreSQL conflitante do troféu (`source_key VARCHAR(120)` versus `resource_key VARCHAR(80)`), que impedia carregar economia, iniciar caçadas e habilitar coletas.
- A grade de coleta agora diferencia carregamento de bloqueio real, explica o fluxo idle e oferece CTAs explícitos `Iniciar · duração`.
- Removida a escolha obrigatória de classe/kit. A migration `000012` conclui o onboarding legado e o botão `❔ Estilos` passa a ser somente ajuda classless.

## [V5.1.0] - 2026-08-11 (Correções e Endurecimento Crítico do Code Review Atlas V5)

### Gate 0: Bloqueio de Exploração e Segurança
- **P0-01 (Starter Pack One-Shot)**:
  - Adicionadas colunas `starter_pack_claimed` (boolean) e `starter_pack_key` (varchar) na migration `000005_starter_pack_claimed.sql`.
  - `ChooseStarterPack` em `engine.go` agora rejeita tentativas subsequentes e marca o resgate antes de salvar.
  - Sincronização completa de campos em `db.Character`, `game.CharacterData`, queries SQL e converters do WebSocket.
- **P0-02 (Validação de Slot Autoritativa)**:
  - `EquipItem` em `engine.go` valida o slot canônico com `GetItemSlotType(&targetItem)`. Rejeita qualquer tentativa de equipar itens em slots incompatíveis antes de qualquer mutação.
  - Rejeita tentativa de equipar munição sem arco ou besta equipados.
- **P0-04 (Preservação Absoluta de Itens Protegidos)**:
  - No fluxo de overflow com baú cheio, itens protegidos (raridades raras+, mochilas, livros, manuais e quests) nunca são convertidos em ouro forçadamente.
- **P1-05 (Paridade de XP e Níveis)**:
  - `ApplyExperienceGain` agora é a única fonte da verdade de ganho de XP e subida de nível em combate online (`engine.go`) e offline (`db.go`), garantindo cálculo canônico de experiência restante e pontos não gastos.
- **P1-10 (Hardening JWT e Endpoints)**:
  - `AuthMiddleware` e WebSocket usam `jwt.WithValidMethods([]string{"HS256"})`, `jwt.WithIssuer("atlas-server")`, `jwt.WithAudience("atlas-client")`.
  - `http.MaxBytesReader` de 1MB aplicado em `HandleRegister`, `HandleLogin` e `HandleCreateCharacter`.
  - Normalização estrita de e-mails (`strings.ToLower(strings.TrimSpace(req.Email))`).

### Gate 1: Progressão, Identidade e Governança
- **P1-01 (Desbloqueio de Regiões por Chefe)**:
  - `EnsureUnlockedRegionsForLevel` atualizado para não desbloquear automaticamente regiões encadeadas que exigem vitória contra chefe (`RequiresUnlockFrom`).
  - `CheckRegionAvailability` e modal do frontend `ExpeditionSelectionModal.tsx` agora exigem `isLevelMet && isUnlockedByBoss`.
- **P1-03 (Chaves Canônicas Explícitas em Itens)**:
  - Todos os templates de `lootTemplates` em `loot.go` agora possuem `Key` explícito em `snake_case`.
  - `ItemTemplateRegistry` verifica duplicidade e garante integridade das chaves.
- **P2-01 (Allowlist de Origin Estrita)**:
  - `IsOriginAllowed` em `config.go` utiliza correspondência exata sem prefixos corrompíveis.
- **P2-02 (Telemetria Real)**:
  - `HandleAdminTelemetry` agora reporta uso real de memória via `runtime.ReadMemStats`, uptime real desde inicialização do processo e status real de ping no banco.
- **P2-04 (Integridade do Catálogo Estendida)**:
  - `ValidateIntegrity` agora valida ordens únicas de expedição, detecta ciclos de dependência de regiões via DFS, valida profiles de boss e integridade de todos os templates.

### Gate 2: Venda Automática e Paridade Offline
- **P0-03 (Motor de Auto-Venda Aprimorado e Paridade Offline)**:
  - `EvaluateAutoSell` em `autosell.go` agora agrupa itens por `TemplateKey`, respeita `SellSlotTypes`, protege `ItemKindQuest`, ordena deterministicamente grupos e candidatos e avalia qualidade do item de forma holística (`ItemPower` + stats derivados + valor).
  - Gatilho no motor online (`engine.go`) avalia ocupação projetada considerando o item entrante (`len(backpack)+1` e peso projetado) em relação ao `TriggerPercent` (75%).
  - `CalculateOfflineProgress` (`offline.go`) agora recebe `AutoSellSettings` e higieniza a mochila offline usando `EvaluateAutoSell` com o mesmo comportamento.
  - `UpdateAutoSellSettings` valida limites dos parâmetros (`TriggerPercent`, `TargetPercent`, limite de templates protegidos).

---

## [Unreleased] - 2026-08-11 (Execução do Plano Mestre V5 — Fases 0, 1 e 2: Baseline, Segurança e Governança)

### Fase 0: Baseline & Testes de Caracterização (PR 01)
- **Congelamento de Fórmulas e Regras Críticas**: Criado `characterization_test.go` cobrindo cálculo de atributos derivados (HP por VIT, Mana por INT, Capacidade total por STR, Slots por raridade de mochila, Attack e Defense), além da integridade da matriz de expedições e chefes.
- **Cobertura Contínua**: 100% de aprovação na suíte de 39 testes automatizados em `pkg/game` e `internal/config`.

### Fase 1: Segurança Operacional, Configuração e Admin (PR 02 & PR 03)
- **Centralização com `AppConfig` (`internal/config/config.go`)**:
  - Remoção de segredos hardcoded e suporte a carregamento estruturado de ambiente (`ENVIRONMENT`, `PORT`, `JWT_SECRET`, `DATABASE_URL`, `ALLOWED_ORIGINS`).
  - Validação fail-fast no startup para ambientes `production` e `staging` (exigência mínima de 32 bytes de segredo).
- **CORS e WebSocket Origin Control**:
  - Restrição de origens no CORS HTTP e no `websocket.Upgrader.CheckOrigin` via `appConfig.IsOriginAllowed()`, eliminando aceitação irrestrita de conexões cross-origin maliciosas.
- **Autenticação & Autorização Reforçadas**:
  - Inclusão do campo `Role` nas claims do JWT com validação estrita do algoritmo de assinatura `HS256`.
  - `AdminMiddleware` ativo com validação real de `claims.Role == "admin"`, bloqueando acessos não autorizados a rotas de telemetria com `403 Forbidden`.
- **Health e Readiness Probes**:
  - `/health/live`: verificação de processo vivo.
  - `/health/ready`: checagem real de conectividade no PostgreSQL com `db.DB.PingContext()`.
### Fase 3: Progressão Única & Transações Atômicas (PR 05, PR 06 & PR 07)
- **Regra Única e Autoritativa de Acesso a Regiões (`CheckRegionAvailability`)**:
  - Implementada verificação autoritativa em `expeditions.go` validando simultaneamente nível do aventureiro e pré-requisitos de desbloqueio de chefes anteriores (`RequiresUnlockFrom`).
  - `SelectRegion` no motor de jogo agora valida com `CheckRegionAvailability`, emitindo mensagem de bloqueio explicativa caso os requisitos não sejam cumpridos (`🔒 Região Bloqueada: Derrote o Chefe de [Região] para desbloquear`).
- **Persistência Atômica de Economia (`SaveCharacterAndInventoryAtomic`)**:
  - Criada mutação transacional PostgreSQL unindo atualização de ouro/atributos do personagem e do inventário na mesma transação.
  - `BulkSell` agora persiste ouro e inventário atomicamente via `SaveCharAndInvFunc`, eliminando riscos de duplicação ou descompasso em falhas de rede/banco.
- **Suíte de Testes de Progressão**:
  - `TestCheckRegionAvailability_Rules` cobrindo regiões iniciais, encadeadas, regras de chefes e níveis mínimos com 100% de cobertura.

### Fase 8: Compêndio de Exploração & Descoberta Progressiva de Loot (PR 17 & PR 18 — Frente L)
- **Persistência de Descobertas (`character_loot_discoveries`)**:
  - Tabela PostgreSQL indexada com data da 1ª descoberta, última obtenção, contador cumulativo e maior raridade já obtida por personagem.
  - Função `BackfillInventoryDiscoveries` idempotente no login para garantir retrocompatibilidade com aventureiros veteranos.
- **Registro em Tempo Real em Combate**:
  - Drop de loot em combate online agora dispara descoberta no compêndio e anuncia evento especial (`✨ COMPÊNDIO: Você descobriu [Item]!`).
  - Sincronização via WebSocket em `WELCOME_EVENT` (`discovered_loot`).
- **Interface do Mapa do Mundo com Névoa de Guerra no Loot (`ExpeditionSelectionModal.tsx`)**:
  - Barra de progresso do Compêndio por Região e Contador Geral Global/Tier (`🔍 Compêndio de Loot: X/Y (Z%)`).
  - Selo especial `✨ 100% Explorada` ao completar todos os drops de uma região.
  - Cards misteriosos `❓ ???` com tooltips imersivos para itens ainda não descobertos, preservando o elemento de surpresa e estímulo à caça e progressão.

### Fase 9 & 10: Venda Automática Customizável & Shadow Evaluation (PR 19 & PR 20 — Frente M)
- **Persistência de Regras (`character_auto_sell_settings`)**:
  - Tabela PostgreSQL com colunas `enabled`, `online_enabled`, `offline_enabled`, `trigger_percent` (padrão 75%), `target_percent` (padrão 60%), `sell_rarities`, `sell_slot_types`, `only_duplicates`, `keep_best_per_template`, `protected_template_keys` e `revision`.
  - Funções de banco `GetCharacterAutoSellSettings` e `SaveCharacterAutoSellSettings`.
- **Motor Autoritativo de Avaliação (`pkg/game/autosell.go`)**:
  - `EvaluateAutoSell` com cálculo de ocupação ponderada (maior valor entre slots e peso).
  - Preço de venda autoritativo com taxa de 80% do valor comercial do item (`CalculateAutoSellItemPrice`).
  - **Proteções Rígidas Inquebráveis**: Mochilas (`SlotBag`), Manuais de Construção (`ItemKindConstructionManual`), Livros de Habilidades (`ItemKindSkillBook`), raridades não marcadas e melhores cópias de cada template são estritamente preservados.
  - Limpeza gradual até a meta (`target_percent`), sem esvaziar a mochila desnecessariamente.
- **Shadow Evaluation em Tempo Real & Modal de Configuração (`AutoSellModal.tsx`)**:
  - Modal rico estilo Tibia-dark com sliders de gatilho e meta, toggles de raridades e preservação de duplicatas.
  - Painel de prévia em tempo real (`🔍 Prévia de Venda com sua Mochila Atual`) informando exatamente quantos itens seriam vendidos, quantos preservados, ouro estimado e itens protegidos antes de salvar.

### Fase 11: Baú de Achados / Overflow de Expedição (PR 21 & PR 22)
- **Persistência de Itens Excedentes (`character_overflow_chests`)**:
  - Tabela PostgreSQL com 20 slots de armazenamento seguro sem expiração para itens protegidos encontrados com a mochila cheia.
  - Funções `GetCharacterOverflowChest`, `SaveCharacterOverflowChest`, `AddOverflowChestItem`.
- **Integração no Motor Online & Offline**:
  - Quando a mochila atinge a capacidade máxima e a auto-venda não libera espaço, itens protegidos (Raros, Épicos, Lendários, Mochilas, Manuais, Livros) são automaticamente direcionados para o **Baú de Achados**.
  - Log informativo em tempo real: `📦 BAÚ DE ACHADOS: Mochila cheia! O item protegido [Item] foi guardado no Baú de Achados!`.
- **Interface e Resgate (`OverflowChestModal.tsx`)**:
  - Modal acessível pelo inventário com contagem de slots (`X/20`), cards de itens detalhados e botão de resgate instantâneo para a mochila quando houver espaço.
  - Indicador visual animado `📦 Baú (X)` no cabeçalho do inventário quando houver itens guardados.

### Fase 4: Protocolo WebSocket V2, Handlers Tipados & Confiabilidade (PR 08 & PR 09 — Frente H)
- **Envelope Padronizado e Sequenciamento Monotônico (`ws_envelope.go`)**:
  - Implementado envelope WebSocket V2 (`WsEnvelope`) com suporte a `seq` monotônico crescente, `request_id`, `state_revision` e categorização de criticidade (`EventCategoryCritical`, `EventCategoryState`, `EventCategoryEphemeral`).
  - **Zero Event Loss para Eventos Econômicos**: Drops de loot, subidas de nível, transações de ouro, desmontes e avanços de construção são imunes a descarte silencioso em momentos de sobrecarga do buffer.
- **Roteador Modular de Comandos (`command_router.go`)**:
  - Decomposição do bloco monolítico `switch` de `ws.go` (~656 linhas) em uma tabela de despacho tipada e desacoplada (`DispatchCommand`), simplificando a manutenção e reduzindo acoplamento.
- **Mecanismo de Resync Autoritativo (`REQUEST_STATE_SYNC` & `STATE_SNAPSHOT`)**:
  - Endpoint dedicado para solicitação instantânea de snapshot pelo cliente em caso de detecção de lacunas de sequência de rede.
  - Hook do frontend `useGameSocket.ts` atualizado para detectar saltos de sequência e disparar auto-reconciliação sem recarregar a página.

### Fase 5: Motor Modular, State Machine & Paridade Online/Offline (PR 10, PR 11 & PR 12 — Frentes F & G)
- **Calculadores Puros Compartilhados (`reward_calculator.go`)**:
  - Fórmulas de XP (`CalculateKillXP`), Ouro (`CalculateKillGold`) e Level-Up (`ApplyExperienceGain`) 100% unificadas e determinísticas entre o motor online e o simulador de progresso offline (`offline.go`).
- **State Machine de Expedição (`expedition_state_machine.go`)**:
  - Máquina de estados formal com transições estritas (`StateCampResting`, `StateRecovering`, `StateExpeditionStarting`, `StateWaveSpawning`, `StateCombatActive`, `StateWaveCompleted`, `StateBossSpawning`, `StateExpeditionVictory`, `StateDefeated`), eliminando combinações inconsistentes de flags em memória.
### Fase 6: Conteúdo Canônico Data-Driven, Template Keys & ContentRegistry Agregado (PR 13 & PR 14 — Frente C)
- **Identidade Estável e Imutável (`TemplateKey`)**:
  - Adicionado `TemplateKey` permanente a `Item` e `Key` a `LootTemplate` em `loot.go`, eliminando inferências por string no catálogo.
  - `ItemTemplateRegistry` atualizado para indexação e busca dupla por chave normalizada e nome de exibição (`Get(keyOrName)`).
- **Validador de Integridade do Catálogo (`content_registry.go`)**:
  - Criação de `ContentRegistry` agregado unindo Regiões, Monstros, Itens, Recursos, Construções e Habilidades.
  - Método autoritativo `ValidateIntegrity()` executado no startup e suíte automatizada `content_audit_test.go` garantindo zero referências quebradas, ausência de ciclos de desbloqueio em regiões e cobertura total de drops e recursos por monstro.

### Fase 7: Modularização do Frontend & Decomposição de Monólitos (PR 15 & PR 16 — Frentes I & J)
- **Decomposição dos Renderers de Biomas (`renderers/biomes/`)**:
  - `BiomeRenderers.ts` (~1.264 linhas) decomposto em módulos de alta coesão:
    - `canvasCache.ts`: Helper de offscreen canvas com cache de alta performance.
    - `forest.ts`: Floresta dos Aprendizes e Acampamento Seguro.
    - `swamp.ts`: Vila do Shereque e pântano temático.
    - `sea.ts`: Vila do Chapolin e pátio da vila.
    - `orcRuins.ts`: Ruínas Orcs e Castle Grayskull.
    - `city.ts`: Esgotos Arcade e Planalto Central de Brasília.
    - `castle.ts`: Escola de Rogartes e biblioteca gótica.
    - `frozen.ts`: Santuário de Atenas e 12 Casas.
    - `abyss.ts`: Caverna do Dragão e portal dimensional.
- **Decomposição do Modal de Inventário (`TibiaBackpackModal.tsx`)**:
  - Extraídos `BackpackCapacityBar.tsx` (peso, slots e atalhos rápidos de auto-venda/baú) e `BackpackFilterBar.tsx` (categorias, busca instantânea e filtros de raridade).
  - Remoção de inferências por nome (`i.name.includes("Mochila")`) substituídas por verificação canônica de slot (`slot_type !== 'bag'`).

### Fase 12: Auditoria Global de Performance, Zero Race Conditions & Fechamento do Plano V5 (PR 22)
- **Conformidade de Performance**:
  - 100% de aprovação na suíte de testes em Go com race detector ativo (`go test -race ./...`).
  - Frontend validado com 0 erros de TypeScript e compilação de produção via Vite (`npm run build`).
  - Todos os 22 PRs e todas as 12 Frentes do Plano Mestre V5 foram implementadas, testadas e documentadas com sucesso.

---

## [V3.0.0] - 2026-08-10 (Refatoração do Acampamento Visual, Manuais de Construção, Obras e Desmontagem V3)

### Correção e Limpeza Visual do Cenário 2D (P0)
- **Eliminação de Elementos Legados do Background**: Removida a cabana fixa, a fogueira estática e os suportes decorativos duplicados do fundo de `BiomeRenderers.ts`. O background preserva exclusivamente o céu estrelado noturno, a lua reluzente, as montanhas distantes e a grama do solo.
- **Sistema de Coordenadas Ancoradas no Chão**: Estruturas posicionadas no centro da base inferior `(anchorX, groundY)` com ordenação de profundidade dinâmica por `sortY`.
- **Redimensionamento da Cabana do Aventureiro**:
  - Nível 1: 88x56px (tenda rústica com estacas e tecido).
  - Nível 2: 110x76px (cabana de madeira maciça com telhado reforçado).
  - Nível 3: 140x96px (chalé de dois volumes com chaminé, fumaça animada e vitral iluminado).
- **Novo Sistema de Andaimes e Martelo Pixel Art (`ConstructionOverlayRenderer.ts` & `PixelHammerRenderer.ts`)**:
  - Andaimes proporcionais ao footprint real de cada construção com tábuas transversais, esteios de amarração e poeira de faíscas.
  - Martelo em pixel art puro desenhado no canvas via arcos e retângulos vetoriais, eliminando emojis de fontes do sistema.
  - Renderização do nível atual do edifício por baixo da estrutura de obra, mantendo o acampamento visualmente vivo durante as construções.
- **Modal Dedicado de Gestão do Acampamento (`CampManagementModal.tsx` & `CampButton.tsx`)**:
  - Removido o painel fixo de construções que ocupava a coluna central do Dashboard, liberando o espaço visual para o Canvas 2D e o Log de Batalha em tempo real.
  - Botão estilizado `🏕️ Gestão do Acampamento` integrado na coluna de equipamentos com contador de equipes de obras `[👷 Obras: X/Y]`.
  - Abertura com 1 clique a qualquer momento (em descanso ou durante expedições) com suporte à tecla ESC e visual limpo.

### Sistema de Manuais de Construção & Blueprints (P1)
- **Manuais como Drop de Chefes (`ItemKindConstructionManual`)**:
  - *Manual: Armazém de Recursos* (Drop do Urso Ranzinza na Floresta).
  - *Manual: Cabana do Aventureiro* (Drop da Fiona no Pântano de Shereque).
  - *Manual: Fonte Arcana* (Drop da Alma Negra nos Mares de Chapolin).
  - *Manual: Bancada de Desmontagem* (Drop do Esqueleto nas Ruínas Orc).
  - *Manual do Mestre de Obras* (Drop do Soberano Xandaum no Planalto Central).
- **Tabela `character_building_blueprints`**: Persistência autoritativa de projetos descobertos pelo jogador. A Fogueira é liberada por padrão; as demais estruturas só aparecem no painel e na cena 2D após o estudo do respectivo manual.
- **Ação `LEARN_BUILDING_BLUEPRINT`**: Consumo transacional do manual da mochila com aprendizado do projeto no banco de dados.

### Rebalanceamento Econômico com Múltiplos Troféus e Prazos Realistas (P2)
- **Troféus Múltiplos de Chefões**:
  - Fogueira Nv 2 exige 5 Garras do Urso; Nv 3 exige 12 Crânios do Esqueleto.
  - Armazém Nv 2 exige 8 Lâminas do Destruidor; Nv 3 exige 15 Martelos de Xandaum.
  - Cabana Nv 2 exige 8 Tiaras da Fiona; Nv 3 exige 15 Martelos de Xandaum.
  - Fonte Arcana Nv 2 exige 8 Brasões da Alma Negra; Nv 3 exige 15 Coroas do Santuário.
  - Bancada Nv 2 exige 8 Brasões da Alma Negra; Nv 3 exige 18 Varinhas do Voldemorte.
- **Durações Realistas de Obras**: Nível 1 (10-30 min), Nível 2 (2-6 h), Nível 3 (18-30 h).
- **Equipes de Obras (`MaxConstructionSlots`)**: Limite de 1 obra ativa por padrão, expansível para 2 ao aprender o *Manual do Mestre de Obras*.

### Desmonte em Lote Atômico com Risco e Modo Seguro (P3)
- **Transação Totalmente Atômica**: `GetCharacterInventoryTx` e `SaveCharacterInventoryTx` compartilham a mesma transação `*sql.Tx` do acampamento e recursos, com lock `FOR UPDATE`.
- **Cálculo Determinístico de Chances**:
  - Nível 1: 65% base (50% a 70% conforme raridade). Lote máx: 5 itens.
  - Nível 2: 80% base (72% a 85% conforme raridade). Lote máx: 15 itens.
  - Nível 3: 92% base (84% a 97% conforme raridade). Lote máx: 50 itens.
- **Modo Seguro (`SafeMode`)**: Desbloqueado na Bancada Nível 3, concede 100% de taxa de sucesso na reciclagem em lote.
- **Interface `RollSource`**: Motor de RNG desacoplado no backend Go permitindo auditoria e testes unitários 100% determinísticos.

## [Unreleased] - 2026-08-10 (Ajustes Cirúrgicos V2: Depósito de Recursos, Snapshot Autoritativo e Descarte Seguro)

### Correção de Capacidade & Troféus de Boss (P0)
- **Metadados Declarativos de Recursos**: Adicionadas propriedades `Category` (`material` / `trophy`), `CountsTowardStorage: bool` e `Discardable: bool` em `backend/pkg/game/resources.go` e `resource_registry.go`.
- **Exclusão de Troféus do Armazém**: `GetStorageUsed` computa unicamente materiais armazenáveis. Troféus de chefe nunca ocupam espaço de armazenamento.
- **Elevação da Capacidade Base**: Capacidade base do armazém elevada de 200 para **500 unidades** (`DefaultBaseResourceStorage = 500`).
- **Nova Escala de Capacidade do Armazém**:
  - Nível 1: 2.000 unidades (Custo: 60 Madeira, 30 Pedra, 100 Gold).
  - Nível 2: 7.500 unidades (Custo: 140 Madeira, 80 Pedra, 30 Ferro, 450 Gold).
  - Nível 3: 25.000 unidades (Custo: 250 Madeira, 150 Pedra, 80 Ferro, 1.400 Gold, Troféu do Destruidor).

### Snapshot Autoritativo & Realtime sem Refresh (P0 & P1)
- **Contrato `ResourceInventorySnapshot`**: Estrutura contendo `items`, `storage_used`, `storage_capacity` e `revision`, emitida autoritativamente em todas as mutações (`WELCOME_EVENT`, `RESOURCE_DROP`, `BUILDING_UPGRADE_STARTED`, `SALVAGE_COMPLETED`, `RESOURCE_DISCARDED`).
- **Sincronização Atômica na Engine**: A engine Go substitui o cache em memória diretamente pelo resultado persistido no banco de dados, prevenindo qualquer dessincronização ou necessidade de recarregar a página.

### Descarte Seguro & Desmonte Atômico "Tudo ou Nada" (P0 & P1)
- **Ação `DISCARD_RESOURCE`**: Comando WebSocket permitindo descarte transacional de materiais selecionados pelo jogador com validação de saldo e integridade de revisão.
- **Desmonte Atômico (`SalvageItemAtomically`)**: Transação `SERIALIZABLE` que calcula o rendimento e aborta com erro caso o armazém não tenha espaço livre para 100% dos materiais gerados, mantendo o equipamento intacto na mochila.

### Novo Depósito de Recursos & UX Ergonômica (P2, P3 & P4)
- **Remoção da `ResourceBar` Central**: Limpeza da coluna central do Dashboard, liberando espaço visual para a cena 2D e o log de combate.
- **Botão `ResourceDepotButton`**: Integrado na grade de equipamentos clássica do Tibia (logo abaixo do botão da mochila) exibindo ocupação e porcentagem em tempo real.
- **Modal `ResourceDepotModal`**: Exibe exclusivamente recursos possuídos (`quantity > 0`), com busca em tempo real, abas de categoria (Todos / Materiais / Troféus), filtro por raridade e diálogo `ResourceDiscardDialog`.
- **Pré-requisitos de Construção**: Edifícios de níveis 2 e 3 agora exigem Armazém de nível correspondente (`RequiredBuildings`), devidamente validados no backend e exibidos no `BuildingUpgradeModal`.

## [Unreleased] - 2026-08-09 (Sistema de Acampamento, Recursos, Construções & Gold Sink)

### Sistema de Recursos & Troféus de Boss
- **7 Recursos Naturais Declarativos**: `wood`, `stone`, `fiber`, `iron`, `arcane_essence`, `glacial_crystal`, `abyssal_ember` registrados em `backend/pkg/game/resource_registry.go`.
- **9 Troféus Exclusivos de Boss**: Drop garantido (100%) dos chefões regionais para requisitos de melhorias avançadas.
- **Tabela de Recursos por Monstro**: Mapeamento declarativo dos 39 monstros e chefões em `backend/pkg/game/resource_profiles.go`.
- **Rolagem Autoritativa Independente**: Recursos coletados em combate em tempo real e simulação offline sem interferir na rolagem de equipamentos nem no peso (`cap`) do personagem.
- **Persistência Transacional no Banco**: Tabelas `character_resources`, `character_camps` e `character_camp_buildings` criadas via migração `000002_camp_system.sql` e auto-provisionamento em `db.go`.

### Sistema de Construções & Economia (Gold Sink)
- **5 Construções do Acampamento (Níveis 1 a 3)**:
  - 🔥 **Fogueira** (`center`): Aumenta a taxa de regeneração de HP no acampamento (+15%, +35%, +70%).
  - 💧 **Fonte Arcana** (`north`): Aumenta a taxa de regeneração de MP no acampamento (+15%, +35%, +70%).
  - ⛺ **Cabana do Aventureiro** (`west`): Acelera a regeneração de HP e MP global simultaneamente (+10%, +25%, +50%).
  - 📦 **Armazém** (`east`): Expande a capacidade de armazenamento de materiais (500, 1.500, 5.000 unidades).
  - ⚒️ **Bancada de Desmontagem** (`south`): Desbloqueia a reciclagem de equipamentos sobressalentes (+0%, +20%, +50% de eficiência).
- **Consumo Obrigatório de Ouro da Conta (`gold_bank`)**: Todas as construções e níveis requerem ouro além de materiais, atuando como Gold Sink contínuo.
- **Atualização Transacional com Locks**: `StartBuildingUpgrade` roda em `SERIALIZABLE` com `FOR UPDATE`, garantindo idempotência e consistência financeira.

### Frontend & Renderização Canvas 2D a 60 FPS
- **Barra de Recursos do Acampamento (`ResourceBar.tsx`)**: Exibição dos 7 recursos, troféus de boss e capacidade do armazém.
- **Painel de Gestão do Acampamento (`CampPanel.tsx` & `BuildingCard.tsx`)**: Cards informativos com contagem regressiva de construção em tempo real e modal detalhado de confirmação (`BuildingUpgradeModal.tsx`).
- **Modal de Desmontagem (`SalvageModal.tsx`)**: Seleção de itens da mochila com pré-visualização de rendimento calculada no backend.
- **Cena 2D Modular do Acampamento (`CampSceneRenderer.ts`)**: Renderizadores dedicados para cada construção (`CampfireRenderer`, `ArcaneSpringRenderer`, `HutRenderer`, `WarehouseRenderer`, `WorkbenchRenderer`) com evolução visual por níveis e animações de fogo, água, cristais, fumaça e faíscas.
- **Auditoria Automatizada (`tools/audit-camp-content.mjs`)**: Validação de 16 recursos, 39 perfis de monstros, 5 construções, 5 renderizadores e 5 slots.

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

---

## 🚀 Ciclo Recente — Sistema de Skins, Kit Inicial, Baú de Achados & Estabilidade

### Sistema Modular de Guarda-Roupa & Skins do Herói
- **5 Skins Registradas Declarativamente (`SkinRegistry.ts`)**:
  - 🌾 `peasant` (Camponês Aventureiro - Imagem 3): Camisa marfim de linho, colete preto carmim, culote ocre e botas pretas de cano alto. **Definida como skin padrão inicial de todo novo personagem**.
  - 🎒 `wanderer` (Andarilho Mochileiro): Jaqueta vermelha, mochila de expedição com isolante térmico e cantil.
  - ⚔️ `knight` (Cavaleiro Templário): Armadura de placas de aço, capa carmim com caimento harmonioso no solo e escudo cruzado.
  - 🏹 `archer` (Patrulheiro dos Bosques): Túnica verde floresta, capuz de caça, aljava e arco recurvo.
  - 🔮 `mage` (Arcanista Elemental): Robe azul-índigo, manto púrpura, chapéu pontudo e cajado arcano.
- **Padronização Canônica de Sprites (`HeroRenderers.ts`)**:
  - Todos os 5 heróis desenhados na grade 48×48px com linha de solo uniforme em `Y = 44` e sombra de solo em `(24, 44)`.
  - Escalonamento nítido nearest-neighbor via `getOffscreenCanvas`, garantindo proporções perfeitas sem distorções ou heróis flutuando.
- **Desacoplamento Visual vs Combate (`GameViewport.ts`)**:
  - A animação e tipo de ataque (Melee, Ranged/Flecha, Magic/Orbe) é derivada exclusivamente da **Arma Empunhada** (`derived_stats.primary_archetype` / `mainhand.weapon_type`).
- **Isolamento de Preferência por Personagem**:
  - As escolhas cosméticas são salvas individualmente por ID de personagem (`atlas_active_skin_${characterId}`), sem vazar seleções entre diferentes personagens da mesma conta.
- **Modal de Guarda-Roupa (`SkinSelectionModal.tsx`)**:
  - Pré-visualização ao vivo em Canvas 2D animado, seleção instantânea e descrições temáticas.

### Onboarding & Kit Inicial de Treinamento
- Todo novo personagem criado no banco (`CreateCharacter` em `db.go`) recebe na mochila o kit completo para testar os 3 estilos de combate desde o primeiro minuto:
  - ⚔️ *Espada do Aprendiz* (Melee)
  - 🛡️ *Broquel de Madeira* (Escudo)
  - 🏹 *Arco Curvo* (Distância) + 🎯 *Flechas de Madeira* (Munição)
  - 🔮 *Varinha do Aprendiz* (Magia)

### Estabilidade da Simulação Offline & Barra de XP
- **Consumo de XP Offline (`offline.go`)**: Corrigido o loop de simulação offline (`simulatedExperience -= GetRequiredXPForLevel(simulatedLevel)`), eliminando o bug de subida exponencial de níveis e experiência negativa.
- **Alinhamento do Cálculo de XP (`DashboardGrid.tsx`)**: Exibição da experiência relativa ao nível atual com valores formatados e porcentagem positiva.
- **Auto-Higienização no Banco (`db.go`)**: Saneamento automático de personagens com atributos corrompidos durante o login.

### Baú de Achados (Overflow Chest) & Venda
- **Baú de Achados**: Capacidade para até 20 slots de itens protegidos com suporte a resgate e venda em lote (`SELL_OVERFLOW_CHEST_ALL`).
- **Venda de Mochilas**: Remoção de restrições arbitrárias de interface, permitindo que mochilas sejam vendidas normalmente.

### Acampamento & Desmonte
- **Acúmulo de Efeitos na Bancada (`camp_bonus_calculator.go`)**: Desbloqueio de desmonte garantido a partir do Nível 1 da Bancada.
- **Formatação de Recursos**: Formatação compacta para quantidades $\ge 1000$ (`1.4k`, `10k`, `1.4M`).
# 2026-08-14 — Progressão, economia offline e assentamento (P0)

## Capacidade de recursos

- O Depósito Improvisado inicial passou de 500 para **10.000** unidades para suportar um ciclo longo de combate e coleta antes da descoberta do manual de Armazém.
- O Armazém agora comporta **30.000 / 100.000 / 500.000** unidades nos níveis 1, 2 e 3.
- Troféus continuam fora da capacidade, preservando itens de progressão sem bloquear recursos de produção.

## Economia e progresso offline

- A simulação offline agora projeta dano recebido, roubo de vida e regeneração. Uma onda fatal é atômica: não concede seus drops e envia o herói ao acampamento com 40% de HP.
- Pacotes especiais de chefe offline foram limitados a um por hora, no máximo 12 por relatório. Chefes adicionais ainda contam como abate e concedem recompensa comum, mas não duplicam troféus/artefatos.
- A chance de partes comuns de monstro caiu de 72% para 30%; partes de chefes passaram de 3–6 para 1–2. O objetivo é que partes sejam insumos, não enchimento de depósito.
- Cargas seguras preservam `source_kind` e `source_key` após uma tentativa parcial de resgate. O frontend exibe os lotes separados por procedência.
- A consulta de desbloqueio por troféu usa casts PostgreSQL explícitos, eliminando o erro `inconsistent types deduced for parameter`.

## Assentamento e QA

- Os pioneiros recebem nomes determinísticos por personagem e aparecem no Canvas do acampamento com visuais de pescador, extrator e cultivadora.
- O ambiente Docker local oferece conta de QA protegida por papel `admin` e feature flag. O preset de testes libera conteýo e recursos usando as tabelas reais e é recusado em staging/produção.
---

## 2026-08-21 — Settlement View V3: HUD Game-First, Terreno 24x18 e Escala Visual

### HUD / Viewport
- O dashboard passa a usar, em telas `xl`, **2/12 + 8/12 + 2/12** para painéis esquerdo, jogo e painel direito. O breakpoint intermediário continua 3/12 + 6/12 + 3/12 para não quebrar notebooks menores.
- O canvas lógico foi ampliado de **680x300 para 960x420**, preservando mapeamento de ponteiro para drag-and-drop.
- `Dados do Aventureiro` mantém nível, XP, ataque e defesa sempre visíveis; atributos primários ficam recolhíveis.
- `Maestrias & Habilidades` possui resumo compacto com expansão sob demanda. Equipamentos, expedição e botões laterais usam espaçamento reduzido.
- O painel de notificações foi reduzido para não competir verticalmente com a cena principal.

### Vila Isométrica V3
- Terreno autoritativo ampliado de **16x12 para 24x18 tiles** no backend e frontend.
- Migration `000018_expand_settlement_space.sql` expande constraints e desloca layouts V2 em **+4 X / +3 Y**, preservando a disposição relativa montada por cada jogador.
- Novos projetos procuram espaço livre a partir do centro do assentamento, e não mais do canto superior.
- Construções usam `BuildingVisualProfiles`: footprint de colisão e escala visual são conceitos separados. Isso permite reduzir Cabana/Armazém/etc. sem alterar regras de posicionamento ou quebrar saves.
- Os renderers Canvas passaram a respeitar `scale`, e a miniatura dos cards de construção usa o **mesmo renderer da vila** (`BuildingScenePreview`).

### Moradores / Profundidade
- Prédios e moradores são enviados para uma fila única ordenada por profundidade do chão (`depth`), permitindo que NPCs passem atrás de construções.
- No máximo **10 moradores** são desenhados simultaneamente; trabalhadores em coleta permanecem fora da vila e moradores ociosos revezam visualmente a cada 30 segundos.
- Rotas foram redistribuídas pelo novo terreno 24x18. Trabalhadores em produção se aproximam da Cozinha, Fonte Arcana ou Bancada conforme sua profissão.
- Nameplates deixam de aparecer durante caminhada normal, reduzindo sobreposição de texto.

### Validação
- `go test ./pkg/game`: OK.
- `tools/audit-content.mjs`: 0 erros.
- `tools/audit-camp-content.mjs`: 0 erros e verificação explícita de grid 24x18 frontend/backend.
- `tools/audit-economy.mjs`: 0 erros.
- Checagem sintática TypeScript/TSX via TypeScript `transpileModule`: 88 arquivos, 0 erros de sintaxe.
- `go test ./...` continua bloqueado pela ausência de `backend/go.sum` no pacote de origem.
- `npm run build` não foi homologado porque o pacote de origem não contém `node_modules`/`package-lock.json`; tentativa de `npm install` excedeu o tempo disponível sem gerar lockfile.

---

## 2026-08-21 — Primeira arena isométrica de expedição

- A Floresta passou a reutilizar a malha 24x18 do acampamento, com grama,
  caminhos, árvores, pedras, fogueira ornamental e rio animado.
- O protocolo WebSocket ganhou `arena`, contendo dimensões, posição do herói,
  estado de movimento e alvo atual. A interpolação permanece no cliente; a
  decisão de alcance e movimento permanece no backend.
- O motor passou a mover herói e monstros em X/Y: melee persegue, distância
  faz kite, monstros ranged mantêm faixa e criaturas feridas fogem.
- O renderer da floresta ordena os atores pelo pé projetado no terreno e os
  projéteis continuam acompanhando `target_id` em tempo real.
- As demais regiões permanecem no renderer legado. Colisões ambientais,
  obstáculos, pontes e linha de visão serão adicionados junto ao catálogo de
  mapas, antes de converter os outros biomas.
- Validação: `GOCACHE=/tmp/atlas-go-cache go test ./...` e `npm run build` OK.

## 2026-08-21 — Arena: formação, kite de borda e reaquisição

- Pontos de spawn autoritativos foram distribuídos pelos quatro cantos da
  malha, evitando o nascimento de toda a horda na mesma faixa visual.
- O kite do herói possui fallback lateral/diagonal quando o vetor contrário
  encontra uma borda, mantendo o movimento sem sair do cenário.
- O alvo vivo em fuga ou com pouca vida mantém prioridade de finalização; se o
  alvo anterior morrer, o motor reaquisição automaticamente outro monstro vivo.
- Dano recebido passou a usar a posição interpolada atual do herói, aparecendo
  acima da cabeça também na projeção isométrica.
- Validação: `GOCACHE=/tmp/atlas-go-cache go test ./...` e `npm run build` OK.

## 2026-08-21 — Combate isométrico: perseguição, dispersão e teleporte

- Alvos em fuga agora são perseguidos também por arqueiros e magos; o guerreiro
  recebe margem de alcance durante a perseguição para não perder ataques quando
  o monstro se move no mesmo tick.
- A fuga de monstros é encerrada quando a criatura é encurralada ou alcança o
  limite da arena. O estado não é rearmado a cada tick, evitando combates
  presos com inimigos de pouca vida.
- Habilidades ofensivas só consomem mana quando existe alvo alcançável; a lista
  é ordenada pelo inimigo mais próximo. Tiles duplicados são separados após o
  movimento para manter leitura das áreas e dos grupos.
- O spawn visual deixou de entrar pela lateral: cada monstro nasce no tile
  autoritativo com portal azul, escala e partículas de teleporte.
- O herói do acampamento passou a usar uma rota isométrica compartilhada com os
  moradores. Eventos atrasados de combate são descartados ao retornar ao
  acampamento, evitando investidas diagonais e projéteis fora de contexto.
- Validação: `GOCACHE=/tmp/atlas-go-cache go test ./...` e `npm run build` OK.

## 2026-08-21 — Combate: recuperação automática do ataque básico

- O alcance usado para decidir `ATTACK` agora é o mesmo alcance efetivo do
  ataque básico, eliminando estados visuais de ataque sem golpe possível.
- Arqueiros e magos avançam contra alvos ranged fora do próprio alcance; o kite
  só assume prioridade quando existe uma ameaça melee próxima.
- O ataque básico procura o inimigo vivo mais próximo que esteja alcançável no
  tick. Um alvo ferido/em fuga continua sendo prioridade de perseguição, mas
  não bloqueia o dano em outro monstro que já esteja ao alcance.
- Foram adicionados testes para a faixa morta do mago contra inimigo ranged e
  para a retomada do ataque quando o alvo de finalização está distante.
- Validação: `GOCACHE=/tmp/atlas-go-cache go test ./...` e `npm run build` OK.

## 2026-08-21 — Arena: orientação visual dos atores

- O herói agora espelha para o lado do alvo atual na projeção isométrica, em
  vez de permanecer sempre voltado para a direita.
- Cada monstro passa a olhar para o herói durante perseguição e ataque; no
  estado `FLEE`, ele inverte a orientação para correr de costas para o herói.
- Flechas e projéteis mágicos nascem no lado da arma correspondente à direção
  atual do ator, evitando disparos visuais pelas costas.
- Validação: `npm run build` OK.

## 2026-08-21 — Combate: último golpe mantém o alvo correto

- A posição do alvo é preservada durante o evento em que ele morre, permitindo
  que dash, magia, impacto e texto de dano terminem no monstro correto.
- Um `target_id` explícito não pode mais cair no primeiro monstro sobrevivente
  como fallback visual, evitando ataques fictícios em alvos distantes.
- Ataques básicos não herdam a animação de uma magia emitida anteriormente no
  mesmo tick.
- A fuga de criaturas próximas não é mais cancelada por distância curta; Lobo
  e Aranha continuam abrindo espaço até a malha realmente bloquear o recuo.
- Validação: `npm run build` OK.

## 2026-08-21 — Arena: comportamento de fuga por espécie

- A regra de vida crítica passou a ser configurável por monstro, com
  `low_health_behavior: "flee"` ou `"stand_ground"`.
- Na Floresta, o Lobo e a Aranha fogem ao atingir 20% de vida; o Goblin e o
  Urso chefe permanecem lutando até morrer.
- A transição para `FLEE` ocorre no mesmo tick em que o dano cruza o limiar,
  evitando que um golpe forte mate a criatura antes de o estado ser emitido.
- Valores vazios mantêm o comportamento legado de fuga, permitindo configurar
  novos monstros gradualmente sem alterar regiões existentes.
- Validação: `GOCACHE=/tmp/atlas-go-cache go test ./...` e `npm run build` OK.
## 2026-08-28 — Multiplayer M4-A Ranked

- revisão do `CommunicationConsole`/HUD social e remoção do `WorldChatPanel` legado;
- `PlayerInteractionLayer` refatorada para Casual, Ranqueada e Histórico;
- migration `000030_pvp_ranked_seasons.sql`;
- temporadas, placements, tiers, ladder, honra e rewards sazonais;
- anti-win-trading inicial por conta + retorno decrescente da mesma dupla;
- correção de reconnect de matchmaking com `challenge_id` nulo;
- M4-B permanece pendente para abandono/desconexão, snapshot defensivo assíncrono opcional, telemetria e apresentação final dos cosméticos.

