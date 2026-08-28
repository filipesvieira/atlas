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

O duelo já começa automaticamente depois da confirmação dos dois participantes. Enquanto a partida estiver `active`, a atividade do herói é exclusiva da arena: a expedição fica congelada e é retomada no encerramento quando aplicável; atividades independentes do assentamento continuam. O card social continua como transmissão resumida, enquanto a arena é visualizada no `GameCanvas`. A M3E-B tática está implementada. A próxima fatia da M3 deve consolidar telemetria/balanceamento, histórico/replay resumido e matchmaking por Rating + Combat Power antes da Arena Ranqueada M4.

## Etapa M4 — Arena ranqueada

- filas por faixa de poder/rating;
- temporadas;
- honra, títulos, banners e cosméticos;
- snapshot defensivo assíncrono opcional para partidas quando o oponente estiver offline;
- anti-win-trading e retorno decrescente para confrontos repetidos.

## Etapa M5 — Acampamento -> Reino defensável

Progressão sugerida:

`Acampamento -> Posto -> Vilarejo -> Vila -> Cidade -> Reino`

Novas estruturas:

- Muralha;
- Portão;
- Torre de Vigia;
- Quartel;
- Cofre;
- Enfermaria;
- Cárcere;
- Oficina do Engenheiro;
- Sala de Guerra;
- Ressonador.

O Engenheiro passa a cuidar de fortificações, reparos, armadilhas, cerco e infraestrutura avançada; nunca é barreira para Fogueira/Cabana/Cozinha de onboarding.

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