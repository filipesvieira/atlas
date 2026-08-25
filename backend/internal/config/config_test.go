package config

import (
	"os"
	"testing"
)

func TestLoadConfig_DevelopmentDefaults(t *testing.T) {
	_ = os.Unsetenv("JWT_SECRET")
	_ = os.Unsetenv("ATLAS_DEV_TOOLS_ENABLED")
	_ = os.Setenv("ENVIRONMENT", "development")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("Erro inesperado ao carregar config em desenvolvimento: %v", err)
	}

	if cfg.Environment != "development" {
		t.Errorf("Esperado development, obtido %s", cfg.Environment)
	}
	if len(cfg.JWTSecret) == 0 {
		t.Errorf("JWTSecret não deveria estar vazio em desenvolvimento")
	}
}

func TestLoadConfig_ProductionRequiresSecret(t *testing.T) {
	_ = os.Unsetenv("JWT_SECRET")
	_ = os.Unsetenv("ATLAS_DEV_TOOLS_ENABLED")
	_ = os.Setenv("ENVIRONMENT", "production")

	_, err := LoadConfig()
	if err == nil {
		t.Errorf("Esperava erro ao carregar config de produção sem JWT_SECRET")
	}
}

func TestLoadConfigRejectsDeveloperToolsOutsideDevelopment(t *testing.T) {
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("JWT_SECRET", "production_secret_with_at_least_32_characters")
	t.Setenv("ATLAS_DEV_TOOLS_ENABLED", "true")
	t.Setenv("ATLAS_DEV_ADMIN_EMAIL", "admin@example.test")
	t.Setenv("ATLAS_DEV_ADMIN_PASSWORD", "very-secure-test-password")
	if _, err := LoadConfig(); err == nil {
		t.Fatal("ferramentas de QA foram aceitas em production")
	}
}

func TestIsOriginAllowed(t *testing.T) {
	cfg := &Config{
		Environment: "development",
		AllowedOrigins: []string{
			"http://localhost:3000",
			"https://play.atlas.com",
		},
	}

	if !cfg.IsOriginAllowed("http://localhost:3000") {
		t.Errorf("Origem http://localhost:3000 deveria ser permitida")
	}
	if !cfg.IsOriginAllowed("https://play.atlas.com") {
		t.Errorf("Origem https://play.atlas.com deveria ser permitida")
	}
	if cfg.IsOriginAllowed("http://evil-attacker.com") {
		t.Errorf("Origem http://evil-attacker.com NÃO deveria ser permitida")
	}
}