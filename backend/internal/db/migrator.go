package db

import (
	"context"
	"database/sql"
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
	if _, err := database.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(180) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`); err != nil {
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
		var applied bool
		if err := database.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)`, name).Scan(&applied); err != nil {
			return err
		}
		if applied {
			continue
		}
		sqlBody, err := migrations.Files.ReadFile(name)
		if err != nil {
			return fmt.Errorf("ler migração %s: %w", name, err)
		}
		tx, err := database.BeginTx(ctx, &sql.TxOptions{})
		if err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, string(sqlBody)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("aplicar migração %s: %w", name, err)
		}
		if _, err = tx.ExecContext(ctx, `INSERT INTO schema_migrations(version) VALUES($1)`, name); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("registrar migração %s: %w", name, err)
		}
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("commit da migração %s: %w", name, err)
		}
	}
	return nil
}
