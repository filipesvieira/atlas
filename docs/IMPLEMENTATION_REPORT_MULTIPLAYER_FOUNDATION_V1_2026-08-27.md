# Reino do Avesso — Multiplayer Foundation V1

Esta entrega inicia a camada social/multiplayer sem permitir ainda transferência hostil de economia.

Implementado:

- stream social WebSocket separado do protocolo de estado econômico;
- fila `SocialChannel` independente do `SendChannel` de combate;
- chat mundial persistente com 40 mensagens de histórico no login;
- presença online local ao processo;
- limite de 200 caracteres, remoção de controles, colapso de whitespace e rate-limit;
- mute persistente, block por jogador e report idempotente;
- perfil público com nome, nível, região e rating PvP, sem account/email;
- perfil PvP persistente inicial (`rating=1000`);
- message bus abstrato com adapter in-memory nesta fase;
- contratos de domínio `CombatActor` e `CombatInstance` para a migração PvP futura;
- UI flutuante de Chat Mundial, contador online, bloquear/denunciar e inspeção de perfil;
- migration `000023_multiplayer_foundation.sql`.

Limitação intencional: presença e bus são locais a uma única instância. O próximo passo é adapter Redis Pub/Sub + presença TTL antes de horizontalizar o backend.