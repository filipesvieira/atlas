-- Compatibilidade documental.
--
-- O schema do Atlas é controlado exclusivamente pelo migrator embutido no
-- backend (backend/migrations/*.sql). Este arquivo não deve ser montado em
-- /docker-entrypoint-initdb.d nem executado manualmente, pois isso criaria uma
-- segunda autoridade de schema. `docker compose up --build` aplica todas as
-- migrations versionadas e popula os catálogos estáticos de modo idempotente.
SELECT 1;