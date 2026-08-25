package config

import (
	"fmt"
	"os"
	"strings"
)

// Config centraliza as configurações da aplicação com validação de ambiente.
type Config struct {
	Environment      string
	Port             string
	JWTSecret        []byte
	DatabaseURL      string
	AllowedOrigins   []string
	DevToolsEnabled  bool
	DevAdminEmail    string
	DevAdminPassword string
}

// LoadConfig carrega as configurações das variáveis de ambiente e valida restrições.
func LoadConfig() (*Config, error) {
	env := getEnv("ENVIRONMENT", "development")
	port := getEnv("PORT", "8080")

	secretStr := os.Getenv("JWT_SECRET")
	if secretStr == "" {
		if env == "production" || env == "staging" {
			return nil, fmt.Errorf("JWT_SECRET é obrigatório em ambiente %s", env)
		}
		secretStr = "atlas_dev_secret_key_minimum_32_bytes_long_2026"
	}

	if len(secretStr) < 32 && (env == "production" || env == "staging") {
		return nil, fmt.Errorf("JWT_SECRET deve possuir pelo menos 32 bytes de entropia em %s", env)
	}

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "atlas")
	dbPass := getEnv("DB_PASSWORD", "atlas_password")
	dbName := getEnv("DB_NAME", "atlas_db")
	dbSSL := getEnv("DB_SSLMODE", "disable")

	dbURL := getEnv("DATABASE_URL", "")
	if dbURL == "" {
		dbURL = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", dbHost, dbPort, dbUser, dbPass, dbName, dbSSL)
	}

	originsRaw := getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://tauri.localhost,tauri://localhost")
	var allowedOrigins []string
	for _, o := range strings.Split(originsRaw, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	devToolsEnabled := strings.EqualFold(getEnv("ATLAS_DEV_TOOLS_ENABLED", "true"), "true")
	devAdminEmail := strings.ToLower(strings.TrimSpace(getEnv("ATLAS_DEV_ADMIN_EMAIL", "atlas-admin@local.test")))
	devAdminPassword := getEnv("ATLAS_DEV_ADMIN_PASSWORD", "AtlasTest!2026")
	if env == "production" || env == "staging" {
		if strings.EqualFold(os.Getenv("ATLAS_DEV_TOOLS_ENABLED"), "true") {
			return nil, fmt.Errorf("ATLAS_DEV_TOOLS_ENABLED não pode ser usado em %s", env)
		}
		devToolsEnabled = false
		devAdminEmail = ""
		devAdminPassword = ""
	} else if devToolsEnabled {
		if devAdminEmail == "" || len(devAdminPassword) < 12 {
			return nil, fmt.Errorf("ferramentas de teste exigem ATLAS_DEV_ADMIN_EMAIL e senha com ao menos 12 caracteres")
		}
	}

	return &Config{
		Environment:      env,
		Port:             port,
		JWTSecret:        []byte(secretStr),
		DatabaseURL:      dbURL,
		AllowedOrigins:   allowedOrigins,
		DevToolsEnabled:  devToolsEnabled,
		DevAdminEmail:    devAdminEmail,
		DevAdminPassword: devAdminPassword,
	}, nil
}

// IsOriginAllowed valida se a origem da requisição HTTP ou WebSocket está autorizada.
func (c *Config) IsOriginAllowed(origin string) bool {
	if origin == "" {
		// Requisições sem header Origin (Mobile nativo, curl, testes) são aceitas em desenvolvimento
		return c.Environment != "production"
	}
	origin = strings.TrimRight(strings.ToLower(strings.TrimSpace(origin)), "/")
	for _, allowed := range c.AllowedOrigins {
		allowedTrimmed := strings.TrimRight(strings.ToLower(strings.TrimSpace(allowed)), "/")
		if allowedTrimmed == "*" || allowedTrimmed == origin {
			return true
		}
	}
	return false
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}