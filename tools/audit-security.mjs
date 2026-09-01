import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const config = read('backend/internal/config/config.go');
const security = read('backend/cmd/server/security.go');
const main = read('backend/cmd/server/main.go');
const ws = read('backend/cmd/server/ws.go');
const account = read('backend/internal/db/db.go');
const scouting = read('backend/pkg/game/scouting.go');
const dockerfile = read('backend/Dockerfile');
const compose = read('docker-compose.prod.yml');

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(config.includes('ATLAS_DEV_TOOLS_ENABLED", "false"'), 'dev tools não são opt-in por padrão');
assert(config.includes('TRUSTED_PROXY_CIDRS'), 'allowlist de proxies confiáveis ausente');
assert(config.includes('return c.Environment == "development"'), 'Origin vazio ainda é aceito fora de development');
assert(security.includes('isTrustedProxyIP(direct)'), 'X-Forwarded-* ainda pode ser confiado sem validar proxy imediato');
assert(security.includes('r.URL.Path') && !main.includes('middleware.Logger)'), 'access log pode registrar query string/ticket WebSocket');
assert(ws.includes('return false') && ws.includes('appConfig.IsOriginAllowed'), 'WebSocket não falha fechado quando configuração está ausente');
assert(main.includes('loginTimingPaddingHash') && main.includes('CompareHashAndPassword(loginTimingPaddingHash'), 'padding bcrypt contra enumeração por timing ausente');
assert(main.includes('SELECT EXISTS(SELECT 1 FROM characters WHERE id=$1 AND account_id=$2)') && main.indexOf('ownsCharacter') < main.indexOf('getCharacterLifecycleLock(charID)'), 'claim offline cria lock antes de validar ownership');
assert(account.includes('PasswordHash string') && account.includes('`json:"-"`'), 'hash de senha não está explicitamente oculto do JSON');
assert(scouting.includes('DefenderSnapshotHash string') && scouting.includes('`json:"-"`'), 'hash/snapshot privado de scouting pode vazar ao cliente');
assert(dockerfile.includes('USER atlas'), 'container backend ainda executa como root');
assert(compose.includes('TRUSTED_PROXY_CIDRS') && compose.includes('ipv4_address: 172.30.0.10'), 'proxy confiável de produção não está fixado/configurado');

console.log(JSON.stringify({
  checks: 12,
  errors,
}, null, 2));

if (errors.length) {
  console.error(`Security audit FAILED: ${errors.length} problema(s).`);
  process.exit(1);
}
console.log('Security audit OK: hardening essencial de auth/proxy/WebSocket/QA/container está presente.');
