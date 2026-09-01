# Security Review — 2026-09-01

## Escopo

Revisão estática geral do backend Go, HTTP/WebSocket, configuração, persistência, scheduler, Docker/Tauri e contratos recentes M5-D/M6.

## Corrigido nesta revisão

### P1 — ferramentas QA opt-out com credenciais conhecidas
`ATLAS_DEV_TOOLS_ENABLED` agora é `false` por padrão. Quando ativado em development, todas as credenciais precisam ser fornecidas explicitamente. Production/staging continuam recusando QA.

### P1 — spoof de `X-Forwarded-For`
`TRUST_PROXY_HEADERS=true` agora exige `TRUSTED_PROXY_CIDRS` em staging/production. O IP só é derivado de headers quando o peer TCP imediato pertence a uma rede confiável. O Compose fixa o Caddy em `172.30.0.10`.

### P1 — Origin vazio em staging
`IsOriginAllowed("")` passa a aceitar ausência de Origin somente em development. WebSocket sem configuração agora falha fechado.

### P1 — ticket WebSocket em access log
O logger genérico foi substituído por logger que registra apenas `URL.Path`, nunca query string. Isso impede registro do ticket efêmero de `/ws?ticket=...`.

### P1 — crescimento de `characterLifecycleLocks`
O claim offline validava/armazenava lock antes de confirmar ownership. Agora `character_id` é validado e a propriedade da conta é confirmada antes de criar a trava.

### P2 — enumeração de login por timing
Login de conta inexistente agora executa um compare bcrypt de preenchimento antes de responder, aproximando o custo do caminho de senha incorreta.

### P2 — criação de personagem
Nome é normalizado/limitado e rejeita caracteres de controle/injeção. `origin` e `vocation` são server-authoritative.

### P2 — container backend como root
A imagem final agora cria e executa com usuário `atlas` sem privilégios.

### Prevenção de regressão
- `tools/audit-security.mjs`;
- `.github/workflows/quality-gate.yml` com testes Go/race, auditores e build frontend.

## Pontos já bons encontrados

- JWT restringe algoritmo a HS256, issuer e audience;
- PasswordHash usa `json:"-"`;
- ticket WebSocket é aleatório, curto, single-use e Redis-backed no multiplayer;
- WebSocket possui read limit, deadlines e ping/pong;
- CORS de staging/production exige origens explícitas e recusa `*`;
- economia usa transações/locks/idempotência em operações críticas;
- M5-D não expõe defesa privada;
- M6 persiste no JSON público apenas estimativas sanitizadas.

## Riscos restantes — não bloqueiam M7, mas merecem backlog

### P2 — rate limiting de auth por processo
Os limites de login/cadastro ficam em memória local. Em múltiplas réplicas, um atacante pode distribuir tentativas. Migrar contadores críticos para Redis antes de exposição pública de grande escala.

### P2 — revogação de JWT/role
JWT dura até 24h. Alterar role ou bloquear conta não invalida imediatamente um token já emitido. Introduzir `token_version`/revocation para operação pública madura.

### P2 — locks de dependência
O pacote analisado não contém `go.sum` nem `package-lock.json`. Gerar e versionar locks no repositório real para builds reproduzíveis e melhor rastreabilidade de supply chain.

### P2 — CSP Tauri ampla em `connect-src`
A CSP permite `https:` e `wss:` genericamente. Quando o domínio de produção estiver estabilizado, restringir aos endpoints oficiais do jogo.

### P3 — Redis sem senha no Compose
Hoje Redis não é publicado fora da rede Docker interna. Para infraestrutura compartilhada/externa, habilitar autenticação/TLS e ACL.
