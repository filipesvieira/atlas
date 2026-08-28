# ATLAS M3F

1. Aplique estes arquivos sobre o repositório que já contém M3E-B.
2. Execute a migration `000029_pvp_m3f_closure.sql` antes de iniciar o backend.
3. Rode `go test -race ./...` no backend real.
4. Rode `npm install`/`npm run build` no frontend real.

Esta etapa fecha a M3 com rating idempotente, histórico/replay resumido, matchmaking Rating + Combat Power e Player Interaction Layer desacoplada do chat.
