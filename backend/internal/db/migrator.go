package db

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"

	"github.com/atlas/backend/migrations"
)

// RunMigrations aplica cada arquivo SQL exatamente uma vez. As migrations
// iniciais são idempotentes e também são executadas em bancos legados; não há
// baseline presumido capaz de marcar uma tabela ausente como já instalada.
func RunMigrations(database *sql.DB) error {
	if database == nil {
		return fmt.Errorf("banco nulo ao executar migrações")
	}
	ctx := context.Background()
	conn, err := database.Conn(ctx)
	if err != nil {
		return fmt.Errorf("obter conexão exclusiva para migrações: %w", err)
	}
	defer conn.Close()
	if _, err := conn.ExecContext(ctx, `SELECT pg_advisory_lock(hashtext('atlas_schema_migrations_v1'))`); err != nil {
		return fmt.Errorf("adquirir trava de migração: %w", err)
	}
	defer func() { _, _ = conn.ExecContext(context.Background(), `SELECT pg_advisory_unlock(hashtext('atlas_schema_migrations_v1'))`) }()

	if _, err := conn.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(180) PRIMARY KEY,
			checksum VARCHAR(64),
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)`); err != nil {
		return fmt.Errorf("criar schema_migrations: %w", err)
	}

	entries, err := migrations.Files.ReadDir(".")
	if err != nil {
		return fmt.Errorf("listar migrações embutidas: %w", err)
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)
	for _, name := range names {
		sqlBody, err := migrations.Files.ReadFile(name)
		if err != nil {
			return fmt.Errorf("ler migração %s: %w", name, err)
		}
		digest := sha256.Sum256(sqlBody)
		checksum := hex.EncodeToString(digest[:])
		var storedChecksum sql.NullString
		err = conn.QueryRowContext(ctx, `SELECT checksum FROM schema_migrations WHERE version=$1`, name).Scan(&storedChecksum)
		if err == nil {
			if storedChecksum.Valid && storedChecksum.String != "" && storedChecksum.String != checksum {
				return fmt.Errorf("migração aplicada %s foi alterada (checksum divergente); publique uma nova migration aditiva", name)
			}
			if !storedChecksum.Valid || storedChecksum.String == "" {
				if _, err := conn.ExecContext(ctx, `UPDATE schema_migrations SET checksum=$2 WHERE version=$1 AND checksum IS NULL`, name, checksum); err != nil {
					return fmt.Errorf("registrar checksum legado de %s: %w", name, err)
				}
			}
			continue
		}
		if err != sql.ErrNoRows {
			return fmt.Errorf("consultar migração %s: %w", name, err)
		}
		tx, err := conn.BeginTx(ctx, &sql.TxOptions{})
		if err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, string(sqlBody)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("aplicar migração %s: %w", name, err)
		}
		if _, err = tx.ExecContext(ctx, `INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)`, name, checksum); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("registrar migração %s: %w", name, err)
		}
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("commit da migração %s: %w", name, err)
		}
	}
	return nil
}