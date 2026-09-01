# Reino do Avesso — Plano Mestre Multiplayer & PvP V1

Data: 2026-08-27

## Princípios

1. O servidor continua autoritativo. O cliente envia intenções; nunca informa dano, vitória, saque ou captura.
2. Chat/social usam stream WebSocket independente de `state_revision` e da sequência econômica.
3. PvP deve premiar preparação/build e decisões táticas, não reflexos de 60 ações por segundo.
4. Duelo não destrói patrimônio. Saque e captura pertencem somente a Reino vs Reino e possuem limites/proteções.
5. Toda transferência PvP futura precisa ser transacional, idempotente e auditável por ledger.

## Etapa M1 — Multiplayer Foundation V1 (concluída)

- `SocialMessage` e `SocialChannel` separados do tick do jogo.
- MessageBus abstrato com implementação local; adapter Redis será plugável sem reescrever o chat.
- Chat Mundial persistente com histórico curto.
- presença online local ao processo;
- rate-limit, normalização de texto, mute, block e report;
- perfil público sem dados de conta;
- `pvp_profiles` com rating inicial 1000;
- contratos `CombatActor`, `CombatTeam` e `CombatInstance` preparados;
- UI de chat e inspeção básica de perfil.

## Etapa M2 — Redis & multi-instância (M2A + M2B concluídas)

- concluído: adapter Redis Pub/Sub para `socialMessageBus`;
- concluído: presença por personagem com TTL de 60 s (`atlas:presence:character:v1:<id>`) e contador global em sorted set;
- concluído: ticket WebSocket single-use no Redis por `GETDEL`, compartilhado entre réplicas;
- já existente e preservado: ownership exclusivo do personagem via lease no PostgreSQL;
- concluído: o scheduler do assentamento elege uma única líder pelo advisory lock PostgreSQL `atlas_settlement_scheduler_v1`;
- concluído: os resultados do scheduler são publicados em `atlas.settlement.scheduler.v1`; cada gateway recarrega o snapshot autoritativo somente para as sessões que hospeda;
- pendente: routing explícito request/response entre gateways para ações interativas futuras que não possam ser modeladas como evento Pub/Sub.

Em desenvolvimento há fallback local quando Redis não responde. Em `staging` e `production`, Redis é obrigatório; o servidor não inicia com social, tickets ou sincronização de scheduler fragmentados.

## Etapa M3 — Duelo Hero vs Hero

- M3A concluída: desafios diretos persistentes com expiração de 90 segundos, criação idempotente por `request_id`, aceite/recusa/cancelamento e entrega cross-réplica pelo Pub/Sub social;
- M3A concluída: convites respeitam bloqueios de chat e nunca transportam inventário, atributos ou recursos;
- M3A concluída: o perfil e o chat já mostram o convite em estética pixelada;
- M3B concluída: ao aceitar, `pvp_matches`, `pvp_match_participants` e `pvp_match_events` registram uma única partida `ready`, idempotente pelo desafio;
- M3B concluída: atributos derivados, equipamento, skills e buffs ativos são congelados em JSONB no instante da criação. Vida e mana iniciam recuperadas, sem alterar o estado PvE persistido;
- M3B concluída: o cliente recebe apenas um aviso seguro de arena preparada. Snapshots internos nunca trafegam para o adversário;
- M3C concluída: os dois jogadores precisam confirmar presença em até 90 segundos. A promoção de `ready` para `active` é transacional e nenhuma réplica a decide só em memória;
- M3C concluída: `PvPCombatInstance` isolada executa ataques básicos automáticos a cada 250 ms, com regras de dano PvP próprias, empate simultâneo e sem XP, item, ouro ou alteração da expedição;
- M3C concluída: uma líder global de arena, escolhida por advisory lock PostgreSQL, persiste cada pulso, eventos e o estado necessário para retomar o duelo após falha de processo;
- M3C concluída: reconexão recompõe a confirmação pendente e o stream social entrega apenas vida, mana, posição, estado e eventos seguros dos dois combatentes;
- M3D concluída: `PvPArenaViewport` sobrepõe o `GameCanvas` com uma arena isométrica pixel art de runas, tochas, profundidade, avatares genéricos por arquétipo, placas de vida, dano e resultado;
- M3D concluída: o Canvas PvP consome somente `PvPCombatSnapshot`; não recebe inventário, equipamento, buffs ou atributos internos e não substitui o viewport PvE que continua ativo abaixo dele;
- M3E-A concluída: duelos novos usam `rules_version = 2` e executam uma rotação automática das até duas skills ativas que foram seladas no aceite; regras, mana, cooldown, cura e dano PvP são independentes do PvE e persistem para recuperação da liderança;
- M3E-A concluída: o Canvas recebe apenas a chave visual e o tipo de cura de cada cast confirmado, preservando loadout, atributos, mana de origem e cooldowns como estado privado do servidor;
- M3E-A.1 concluída: ataques e skills da arena passam a animar por eventos autoritativos; ataques básicos distance/magic possuem projéteis, impactos e HP visual sincronizados, com morte somente após o impacto confirmado;
- M3E-A.1 concluída: PvP ativo reserva o herói de forma persistente, congela expedição/ações do herói e retoma a expedição anterior atomicamente ao encerrar a partida; assentamento e trabalhadores continuam independentes;
- M3E-A.1 concluída: `equipped_skin_key` passa a ser persistido e selado no snapshot PvP, incluindo migração transparente das escolhas legadas que existiam somente em `localStorage`;
- M3E-A.1 concluída: cooldown do ataque básico agora é decrementado antes da resolução de skills, evitando consumir 250 ms do GCD no mesmo tick do cast;
- matchmaking por rating + Combat Power;
- desafio direto por perfil/chat;
- M3E-B concluída (núcleo tático v1): novos duelos usam `rules_version = 3`, estratégia pré-duelo versionada (`aggressive`, `balanced`, `defensive`) é selada na confirmação e o runtime executa CHASE/KITE/spacing autoritativos por arquétipo;
- M3E-B concluída: backpedal ranged é limitado para impedir kite infinito, skills ofensivas exigem janela de cast parada, ataques básicos em movimento têm penalidade e melee recebe pressão de aproximação suficiente para alcançar o alvo;
- sem perda de item/recurso;
- M3F concluída: resultado aplica rating/wins/losses/draws uma única vez por `rating_applied_at`, preservando retries e recuperação de liderança;
- M3F concluída: histórico recente e replay resumido são lidos de `pvp_match_events`, sem gravar vídeo ou expor snapshots privados;
- M3F concluída: matchmaking usa Rating + Combat Power calculado no servidor, com tolerância progressiva por tempo de fila e confirmação explícita antes de `active`;
- M3F concluída: interações PvP saem do `WorldChatPanel` e usam camada própria de convites/arena, preparada para futuros convites de trading.

O duelo já começa automaticamente depois da confirmação dos dois participantes. Enquanto a partida estiver `active`, a atividade do herói é exclusiva da arena: a expedição fica congelada e é retomada no encerramento quando aplicável; atividades independentes do assentamento continuam. A M3 está funcionalmente fechada: desafio direto, runtime autoritativo, skills, tática CHASE/KITE, histórico/replay e matchmaking casual por Rating + Combat Power já existem. A evolução competitiva segue na M4.

## Etapa M4 — Arena ranqueada (concluída: M4-A + M4-B)

- M4-A concluída: fila Casual e Ranqueada são separadas; somente `ranked_matchmaking` altera a temporada;
- M4-A concluída: temporadas de 28 dias, 5 placements, soft reset, tiers Bronze/Prata/Ouro/Platina/Diamante/Mestre e ladder server-authoritative;
- M4-A concluída: honra sazonal e bundles persistentes de título/banner/cosmético por tier, com claim idempotente em `pvp_cosmetic_unlocks`;
- M4-A concluída: proteção inicial anti-win-trading impede pareamento entre personagens da mesma conta e aplica retorno decrescente por dupla em 24h até zerar rating/honra;
- M4-A concluída: histórico identifica partidas ranqueadas, honra e multiplicador de repetição;
- M4-B concluída: desconexão do cliente não concede derrota automática porque a simulação autoritativa continua no servidor; desistência explícita vira `forfeit` persistido e é materializada pela líder da arena no mesmo pipeline de resultado/rating;
- M4-B concluída: confirmação `ready` expirada ou recusada cancela sem rating; falha de processo continua coberta pelo restore do último runtime persistido;
- M4-B concluída: runtime persiste telemetria de dano, cura, básicos, skills, críticos, CHASE/KITE, primeiro contato melee e dano pré-contato para balanceamento e failover;
- M4-B concluída: desconexões, duração, motivo de término e flags de integridade (`repeat_opponent`, `zero_return_pair`, `repeat_forfeit_pair`) são auditáveis sem ban automático;
- M4-B concluída: a Central da Arena expõe distribuição por tier/saúde competitiva e permite equipar os entitlements de título/banner/cosmético; a apresentação artística final continua reservada ao refinamento visual;
- M4-B decisão de escopo: o snapshot defensivo assíncrono offline permanece opcional e foi adiado. Ele é um modo de jogo distinto do PvP síncrono já fechado e deve ser retomado apenas se houver necessidade de produto antes de Reino vs Reino.

## Gate de balanceamento PvP antes da M5 (concluído)

- novos duelos usam `rules_version = 4`, preservando partidas históricas nas regras anteriores;
- matriz QA determinística de 100 seeds usa CP idêntico e falha se matchup recorrente ultrapassar aproximadamente 60/40;
- starter loadouts são relatórios diagnósticos separados e não são confundidos com gate mecânico quando o gap de Combat Power ultrapassa 2%;
- telemetria separa dano básico/skills, dano/cura por habilidade, HP/MP final e passos/distância reais de CHASE/KITE;
- `Sniper Shot` deixa de ter crítico 100% garantido na rotação automática;
- mago recebe identidade PvP isolada: `Ice Shard` aplica slow autoritativo, `Fireball` assume burst e `Arcane Nova` aplica knockback;
- mitigação PvP v4 usa curva percentual para impedir builds defensivas de reduzirem quase todo dano para 1;
- partidas por forfeit, sem `ended_at` válido ou com gap de CP >2% são excluídas do conjunto QA;
- migration `000032_pvp_balance_qa.sql` corrige terminais históricos sem `ended_at` e impede nova regressão.

## Etapa M5 — Acampamento -> Reino defensável (M5-B concluída; M5-C próxima)

### M5-A — Progressão territorial e fundação defensiva (concluída)

- progressão formalizada como `Acampamento -> Posto -> Vilarejo -> Vila -> Cidade -> Reino`;
- estágio é marco permanente e monotônico, conciliado pelo backend a partir de Prosperidade, população e construções;
- promoções ficam auditadas em `settlement_stage_history`;
- Posto/Vilarejo/Vila usam a infraestrutura já existente; Cidade/Reino exigem as fortificações da M5-B, impedindo salto prematuro;
- `settlement_pvp_settings` nasce com raids desabilitadas e estratégia defensiva versionável;
- `settlement_defense_snapshots` prepara snapshots autoritativos para M6/M7 sem habilitar ataque ou saque;
- a UI do assentamento mostra estágio atual, próxima etapa e requisitos faltantes.

### M5-A.1 — Expansão Territorial V4 (concluída)

- arena PvE/PvP permanece em `24x18`; o assentamento ganha geometria própria e independente;
- mundo territorial máximo passa a `44x32`, com área construtiva central desbloqueada por estágio: `24x18 -> 28x20 -> 32x22 -> 36x24 -> 40x28 -> 44x32`;
- layouts V3 existentes migram uma única vez por `+10 X / +7 Y`, preservando todas as relações espaciais do jogador;
- placement/drag-and-drop continuam server-authoritative, agora validados contra os limites do estágio atual;
- câmera do assentamento ganha `fit`, zoom até `0.65x` e pan por botão do meio ou `Alt+arrastar`, sem alterar a câmera das arenas;
- moradores visíveis são limitados e distribuídos por rotas territoriais para impedir poluição visual conforme a população cresce;
- QA ganha presets `progress`, `city`, `kingdom` e `kingdom_stress`; os três últimos constroem automaticamente o catálogo disponível e escalam a população para avaliação visual;
- auditoria do acampamento valida simultaneamente arena `24x18`, território `44x32`, Layout V4 e os seis estágios.

### CFF-A — Combat Feel Presentation Foundation (concluída antes da M5-B)

- `CombatPresentationSystem` centraliza hit stop visual, sparks/bursts, screen shake, critical/death impact e reações visuais;
- hit stop congela apenas o relógio de apresentação local, nunca backend, WebSocket, cooldown autoritativo ou posição em grid;
- visual stagger/knockback usa deslocamento temporário em pixels e nunca altera tiles;
- PvE e PvP compartilham a fundação, preservando `CombatEffectRegistry` para VFX especializados;
- profiles de impacto distinguem light/medium/heavy/finisher e flavors de arma/magia sem alterar dano;
- tremor possui `normal`, `low` e `off`, respeitando `prefers-reduced-motion`;
- a implementação completa e as decisões de escopo estão em `COMBAT_FEEL_MASTER_PLAN.md`;
- CFF-B/C permanecem depois de M7 porque status/CC autoritativos exigirão nova `rules_version` e novo balance gate.

### M5-B — Fortificações e defesa ativa (concluída)

- catálogo ampliado de 7 para 17 construções com Muralha, Portão, Torre de Vigia, Quartel, Cofre, Enfermaria, Cárcere, Oficina do Engenheiro, Sala de Guerra e Ressonador;
- Muralha e Portão usam `placement_mode=perimeter`: possuem custo, nível e timer autoritativos, mas o renderer materializa o cinturão no limite territorial em vez de ocupar um lote arrastável;
- Torre/Quartel/Cofre/Enfermaria/Cárcere/Oficina/Sala de Guerra/Ressonador usam footprints reais e continuam no drag-and-drop server-authoritative;
- desbloqueio territorial evita circularidade: Vila libera Muralha/Torre para alcançar Cidade; Cidade libera Portão/Quartel/Cofre/Sala de Guerra e as demais estruturas para alcançar Reino;
- cada nível também possui `required_settlement_stage`, impedindo maximizar fortificações de Reino ainda na Cidade;
- upgrades e movimentações invalidam qualquer snapshot defensivo ativo e incrementam a revisão defensiva, sem criar snapshot novo e sem habilitar raids;
- efeitos defensivos já possuem metadados (`wall_integrity`, capacidade de guardas, proteção de estoque, reparo, scouting, escudo arcano etc.), mas o cálculo agregado de `Defense Power` pertence à M5-C;
- `city`, `kingdom` e `kingdom_stress` passam a materializar automaticamente o catálogo M5-B; o preset Cidade respeita o maior nível permitido pelo estágio;
- renderer do perímetro cresce junto com o território atual; a expansão do cinturão na promoção representa a reconfiguração abstrata da fortificação, enquanto o nível representa sua qualidade/resistência;
- raids continuam `FALSE` durante toda a M5-B.

### M5-C — Engenheiro, Defense Power e snapshot defensivo (próxima)

- consolidar efeitos das fortificações em `Defense Power` explicável e auditável;
- especialização/atribuição do Engenheiro para reparos, armadilhas e infraestrutura militar;
- guarnição derivada do Quartel e moradores mobilizados;
- cálculo de proteção de Armazém/Tesouraria, recuperação, integridade e barreira;
- gerar `settlement_defense_snapshots` versionados e imutáveis para consumo de M6/M7;
- qualquer mutação relevante invalida o snapshot anterior;
- preparar UI de prontidão defensiva sem ativar raids antes da etapa apropriada.

## Etapa M6 — Scouting

- Rastreador/batedor revela poder estimado, defesas, estoque exposto e composição militar;
- informação parcial por padrão;
- contraespionagem por Torre de Vigia e especialistas;
- scouting possui duração/custo e não lê diretamente tabelas privadas do alvo no cliente.

## Etapa M7 — Raid assíncrona Reino vs Reino

No início da raid são congelados:

- `attacker_snapshot`;
- `defender_snapshot`;
- layout e níveis de construções;
- guardas/moradores mobilizados;
- recursos expostos;
- buffs e regras da temporada.

Objetivos possíveis:

- saquear Armazém;
- alcançar Tesouraria/Cofre;
- capturar temporariamente um morador;
- sabotar temporariamente uma estrutura.

Construções nunca perdem níveis permanentemente por ataque. Danos geram debuff/reparo temporário.

## Pós-M7 — Combat Feel Mechanics

### CFF-B — Authoritative Combat Mechanics

- Status Registry robusto;
- Slow/Root/Bleed/Burn/Poison;
- knockback/stagger autoritativos;
- Super Armor;
- Cast/Channel/Interrupt;
- Barrier/Vulnerability/Armor Break/Mark/Execute;
- nova `rules_version` PvP, diminishing returns de hard CC e balance gate obrigatório.

### CFF-C — Advanced Combat Identity

- status stacks;
- Freeze/Hemorrhage/Intoxication e identidades derivadas;
- reações elementais selecionadas;
- Overkill/Boss Finisher/death reactions especiais;
- telegraphs avançados sem transformar o loop principal em combate frame-perfect.

Sistemas como parry frame-perfect, dodge manual com i-frames obrigatório, headshot por mira, physics engine de wall/ground bounce e slow motion real do servidor não pertencem à fundação do design atual. Consulte `COMBAT_FEEL_MASTER_PLAN.md`.

## Regras de saque propostas

- Ouro pessoal (`GoldBank`) nunca é saqueável.
- Apenas parcela explícita da Tesouraria pode ficar exposta.
- Armazém possui percentual protegido por nível.
- Cada raid tem teto absoluto de saque.
- Após sofrer raid: shield temporário.
- Mesma dupla atacante/defensor: cooldown e retorno decrescente.
- Jogadores novos ou abaixo do marco de cidade ficam protegidos.

## Captura de moradores

- captura é temporária e nunca remove NPC permanentemente;
- inicialmente máximo de um morador;
- opções: esperar, pagar resgate ou missão de resgate;
- pioneiros/essenciais têm imunidade ou duração reduzida;
- Cárcere aumenta capacidade apenas em tiers avançados;
- finalização/cancelamento/resgate disputam locks e são idempotentes.

## Modelo de dados futuro

Além das tabelas da M1:

- `pvp_matches`, `pvp_match_participants`, `pvp_match_events`;
- `pvp_seasons`, `pvp_rewards`;
- `settlement_pvp_settings`, `settlement_defense_snapshots`;
- `kingdom_raids`, `kingdom_raid_participants`, `kingdom_raid_loot`, `kingdom_raid_events`;
- `resident_captures`, `kingdom_protection_windows`;
- ledgers de transferência de raid.

## Gates obrigatórios antes de liberar saque

- Redis/multi-instância homologado;
- load test com chat + combate concorrente;
- testes de corrida `raid resolve x retry x disconnect`;
- idempotência de claim;
- backup/restore;
- auditor de saldo zero-sum para cada recurso roubado;
- observabilidade de reports/mutes/chat flood;
- limites de matchmaking e proteção a novato aprovados em playtest.