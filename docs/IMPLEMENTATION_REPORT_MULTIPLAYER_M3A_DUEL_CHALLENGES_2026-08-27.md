# Relatório de implementação — Multiplayer M3A: desafios de duelo

Data: 2026-08-27

## Escopo entregue

- Migration aditiva `000024_pvp_duel_challenges.sql`.
- Convite direto criado a partir do perfil público.
- Convites expiram em 90 segundos e são persistidos para sobreviver a reconexão.
- `request_id` impede que retry do cliente duplique desafio.
- Aceite, recusa e cancelamento são transacionais; bloqueios de chat impedem o envio de desafios entre a dupla bloqueada.
- Redis reutiliza o stream social para entregar o convite ou a resposta somente ao WebSocket do destinatário, inclusive em outra réplica.

## Limite proposital desta fatia

Aceitar o convite **não inicia combate ainda**. Não há `PvPCombatInstance`, consumo de recursos, alteração de rating, perda de item ou mudança na expedição. A separação impede que uma interface aparente um combate que ainda não possui snapshot autoritativo, tick isolado, regras de dano e reconexão.

## Próxima fatia: M3B

1. criar `pvp_matches`, participantes e eventos resumidos;
2. congelar snapshot de atributos, equipamento, skills e buffs no aceite;
3. criar arena isométrica de duelo e loop 200–250 ms separado do PvE;
4. transmitir snapshots/deltas de partida sem afetar `GameSession` da expedição;
5. encerrar sem saque e registrar resultado para rating futuro.

## Validação

```bash
cd backend
go test -race ./...

cd ../frontend
npm run build
```