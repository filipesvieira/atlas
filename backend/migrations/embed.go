package migrations

import "embed"

// Files contém as migrações versionadas que acompanham o binário. Isso evita
// depender de um volume Docker montado corretamente para atualizar o schema.
//
//go:embed *.sql
var Files embed.FS