# Aplicação — M5-B.1 Kingdom Scale & Usability Hardening

Base utilizada: `repomix-output(20260830-162535).xml`.

## 1. Banco

Aplique a nova migration depois das migrations já existentes:

```text
000036_settlement_territory_v5.sql
```

Ela:
- amplia o mundo do assentamento para 52x38;
- desloca somente saves `layout_version = 4` por `+4 X / +3 Y`;
- define `layout_version = 5`;
- invalida snapshots defensivos antigos.

Não reaplique manualmente migrations já registradas pelo migrator.

## 2. Backend

No repositório real:

```bash
cd backend
go test -race ./...
go run ./cmd/pvpbalance -scenario mechanics_equal_cp -seeds 100
```

## 3. Frontend

```bash
cd frontend
npm install
npm run build
```

## 4. Auditores

A partir da raiz:

```bash
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
node tools/audit-economy.mjs
node tools/audit-resource-usage.mjs
node tools/audit-settlement-viewport.mjs
```

## 5. QA manual recomendado

- Cidade 40x28 e Reino 52x38 em janela e fullscreen;
- Assentamento → PvE → Assentamento, verificando zoom/bordas;
- hover/click/drag das construções;
- Muralha e Portão clicáveis e não arrastáveis;
- Cozinha/Alquimia/Armazém deep-linkando para suas funções;
- F8 no Reino/Stress para observar FPS e frame time;
- QA Reino com todas as estruturas M5-B.

Próxima etapa: **M5-C**. Scouting permanece M6 e raids reais M7.
