# IMPLEMENTATION REPORT — Multiplayer M3E-A.1 Integration Hardening

Data: 2026-08-27

## Objetivo

Fechar as regressões observadas após M3E-A antes de avançar para M3E-B: sincronização visual do combate, projéteis, exclusividade da atividade do herói, skin correta no PvP, consistência de cooldown e recuperação segura após falhas/reconexão.

## Entregas

### 1. Arena orientada a eventos autoritativos

- `PvPArenaViewport` não interpreta mais `actor.state = ATTACK` como um novo golpe.
- `basic_attack` e `skill` são as fontes de animação.
- arqueiro recebe flecha visível com trajetória;
- ataque mágico básico recebe projétil arcano visível;
- skills reutilizam `CombatEffectRegistry` já utilizado pelo jogo;
- dano, crítico, cura e hit flash são aplicados no instante visual do impacto;
- primeiro snapshot de uma reconexão não reaplica o dano do tick já materializado;
- atacante conclui a interpolação antes da animação, evitando atacar deslizando;
- resultado só aparece após impactos pendentes;
- combatente com HP visual zero recebe pose de derrota e backend marca `DEAD`.

### 2. Cooldown/GCD

O cooldown de ataque básico agora é decrementado uma única vez no começo do pulso. Uma skill que cria GCD não perde imediatamente os 250 ms do mesmo tick.

Foi incluído teste específico para essa invariável.

### 3. Atividade exclusiva do herói

Migration `000027_pvp_activity_skin.sql` adiciona:

- `active_pvp_match_id`;
- `resume_expedition_after_pvp`;
- `equipped_skin_key`.

Quando o segundo participante confirma a arena, a mesma transação que promove a partida para `active`:

1. registra se cada herói estava em expedição;
2. congela `is_expedition_active`;
3. reserva o herói pela partida;
4. incrementa `state_revision`.

Enquanto existe `active_pvp_match_id`, o ticker da `GameSession` não processa combate PvE nem regeneração de acampamento do herói. Schedulers independentes de assentamento continuam funcionando.

Ações diretamente ligadas ao herói ficam bloqueadas durante a arena: movimento, expedição, equipamento, região, stance, skills, atributos, comida e troca de skin.

### 4. Finalização atômica

A transação que persiste `pvp_matches.status = completed` também:

- libera `active_pvp_match_id`;
- restaura `is_expedition_active` se ela estava ativa antes do duelo;
- limpa `resume_expedition_after_pvp`;
- avança `offline_claimed_at` até o término da luta;
- incrementa `state_revision`.

Isso elimina a janela em que uma queda do processo poderia encerrar a partida e deixar o personagem preso na arena, além de impedir que o intervalo do PvP seja convertido em progresso offline PvE.

### 5. Reconexão

`GetPendingPvPMatchNotice` agora recompõe tanto partidas `ready` quanto `active`. Uma nova `GameSession` carrega o lock persistido e permanece congelada no PvE até a liberação autoritativa.

### 6. Skin persistida

- o frontend envia `SET_EQUIPPED_SKIN`;
- o backend valida uma chave cosmética conhecida e persiste a escolha;
- o snapshot privado do participante sela a skin no aceite;
- o snapshot público de combate transmite apenas `skin_key` sanitizada;
- `PvPArenaViewport` usa a skin escolhida e deixa o arquétipo/arma apenas como fallback;
- personagens existentes usam sentinel vazio na migration para promover uma única vez a escolha legada do `localStorage` ao backend, sem resetar todos para `peasant`.

## Testes executados

- `go test ./pkg/game` — aprovado.
- `go test ./internal/db -run '^$'` com stub local somente para o driver `lib/pq` — compilação do pacote DB aprovada.
- transpile/syntax check TypeScript dos cinco arquivos frontend alterados — aprovado.

A suíte completa `go test ./cmd/server ./internal/db` não pôde ser executada neste ambiente porque o Repomix fornecido não inclui `go.sum` e o ambiente não possui acesso de rede para baixar módulos externos. Da mesma forma, o `npm build` completo não pode ser executado porque `node_modules` não acompanha o Repomix. Isso é uma limitação de validação do pacote reconstruído, não um erro confirmado do código.

## Próxima etapa

M3E-B permanece a próxima fatia funcional:

- estratégia pré-duelo;
- intenções táticas versionadas;
- movimentação/controle PvP;
- pathfinding e comportamento por arquétipo.

Antes de iniciar M3E-B em produção, recomenda-se rodar no repositório real:

- `go test ./...`;
- `npm ci && npm run build`;
- dois clientes Tauri reais em duelo com melee, distance e magic;
- teste de queda/reconexão durante arena;
- teste de expedição ativa antes do duelo e retomada posterior.
