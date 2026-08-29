# ATLAS M4-A — Arena Ranqueada Sazonal

1. Aplique estes arquivos sobre o repositório que já contém a M3F.
2. Remova `frontend/src/components/Social/WorldChatPanel.tsx` se ele ainda existir; o `CommunicationConsole` é o console ativo.
3. Execute a migration `000030_pvp_ranked_seasons.sql` antes de iniciar o backend.
4. Rode `go test -race ./...` no backend real.
5. Rode `npm install`/`npm run build` no frontend real.

A M4-A adiciona fila ranqueada separada, temporadas de 28 dias, placements, tiers, ladder, honra, recompensas sazonais persistentes e proteção inicial anti-win-trading. A M4-B permanece pendente para abandono/desconexão ranqueado, snapshot defensivo assíncrono opcional, telemetria competitiva e equip/render final dos cosméticos.
