package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config centraliza as configurações da aplicação com validação de ambiente.
type Config struct {
	Environment       string
	Port              string
	JWTSecret         []byte
	DatabaseURL       string
	RedisAddr         string
	RedisPassword     string
	RedisDB           int
	RedisRequired     bool
	AllowedOrigins    []string
	TrustProxyHeaders bool
	DevToolsEnabled   bool
	DevAdminEmail     string
	DevAdminPassword  string
	DevPvPQAEmailA    string
	DevPvPQAPasswordA string
	DevPvPQAEmailB    string
	DevPvPQAPasswordB string
	DevPvPQAEmailC    string
	DevPvPQAPasswordC string
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

	redisHost := getEnv("REDIS_HOST", "localhost")
	redisPort := getEnv("REDIS_PORT", "6379")
	redisDB, err := strconv.Atoi(getEnv("REDIS_DB", "0"))
	if err != nil || redisDB < 0 {
		return nil, fmt.Errorf("REDIS_DB deve ser um inteiro não negativo")
	}

	originsRaw := getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://tauri.localhost,tauri://localhost")
	var allowedOrigins []string
	for _, o := range strings.Split(originsRaw, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}
	if env == "production" || env == "staging" {
		if strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")) == "" {
			return nil, fmt.Errorf("ALLOWED_ORIGINS é obrigatório em ambiente %s", env)
		}
		for _, allowed := range allowedOrigins {
			if strings.TrimSpace(allowed) == "*" {
				return nil, fmt.Errorf("ALLOWED_ORIGINS não pode conter '*' em ambiente %s", env)
			}
		}
	}

	trustProxyHeaders := strings.EqualFold(getEnv("TRUST_PROXY_HEADERS", "false"), "true")
	devToolsEnabled := strings.EqualFold(getEnv("ATLAS_DEV_TOOLS_ENABLED", "true"), "true")
	devAdminEmail := strings.ToLower(strings.TrimSpace(getEnv("ATLAS_DEV_ADMIN_EMAIL", "atlas-admin@local.test")))
	devAdminPassword := getEnv("ATLAS_DEV_ADMIN_PASSWORD", "AtlasTest!2026")
	devPvPQAEmailA := strings.ToLower(strings.TrimSpace(getEnv("ATLAS_DEV_PVP_QA_A_EMAIL", "pvp-qa-a@local.test")))
	devPvPQAPasswordA := getEnv("ATLAS_DEV_PVP_QA_A_PASSWORD", "PvPQAAlpha!2026")
	devPvPQAEmailB := strings.ToLower(strings.TrimSpace(getEnv("ATLAS_DEV_PVP_QA_B_EMAIL", "pvp-qa-b@local.test")))
	devPvPQAPasswordB := getEnv("ATLAS_DEV_PVP_QA_B_PASSWORD", "PvPQABravo!2026")
	devPvPQAEmailC := strings.ToLower(strings.TrimSpace(getEnv("ATLAS_DEV_PVP_QA_C_EMAIL", "pvp-qa-c@local.test")))
	devPvPQAPasswordC := getEnv("ATLAS_DEV_PVP_QA_C_PASSWORD", "PvPQAMage!2026")
	if env == "production" || env == "staging" {
		if strings.EqualFold(os.Getenv("ATLAS_DEV_TOOLS_ENABLED"), "true") {
			return nil, fmt.Errorf("ATLAS_DEV_TOOLS_ENABLED não pode ser usado em %s", env)
		}
		devToolsEnabled = false
		devAdminEmail = ""
		devAdminPassword = ""
		devPvPQAEmailA = ""
		devPvPQAPasswordA = ""
		devPvPQAEmailB = ""
		devPvPQAPasswordB = ""
		devPvPQAEmailC = ""
		devPvPQAPasswordC = ""
	} else if devToolsEnabled {
		if devAdminEmail == "" || len(devAdminPassword) < 12 {
			return nil, fmt.Errorf("ferramentas de teste exigem ATLAS_DEV_ADMIN_EMAIL e senha com ao menos 12 caracteres")
		}
		if devPvPQAEmailA == "" || devPvPQAEmailB == "" || devPvPQAEmailC == "" ||
			devPvPQAEmailA == devPvPQAEmailB || devPvPQAEmailA == devPvPQAEmailC || devPvPQAEmailB == devPvPQAEmailC ||
			len(devPvPQAPasswordA) < 12 || len(devPvPQAPasswordB) < 12 || len(devPvPQAPasswordC) < 12 {
			return nil, fmt.Errorf("perfis PvP de QA exigem três emails distintos e senhas com ao menos 12 caracteres")
		}
	}

	return &Config{
		Environment:       env,
		Port:              port,
		JWTSecret:         []byte(secretStr),
		DatabaseURL:       dbURL,
		RedisAddr:         redisHost + ":" + redisPort,
		RedisPassword:     os.Getenv("REDIS_PASSWORD"),
		RedisDB:           redisDB,
		RedisRequired:     env == "production" || env == "staging",
		AllowedOrigins:    allowedOrigins,
		TrustProxyHeaders: trustProxyHeaders,
		DevToolsEnabled:   devToolsEnabled,
		DevAdminEmail:     devAdminEmail,
		DevAdminPassword:  devAdminPassword,
		DevPvPQAEmailA:    devPvPQAEmailA,
		DevPvPQAPasswordA: devPvPQAPasswordA,
		DevPvPQAEmailB:    devPvPQAEmailB,
		DevPvPQAPasswordB: devPvPQAPasswordB,
		DevPvPQAEmailC:    devPvPQAEmailC,
		DevPvPQAPasswordC: devPvPQAPasswordC,
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
