package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/atlas/backend/internal/config"
	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var appConfig *config.Config
var serverStartTime = time.Now()

type Claims struct {
	AccountID string `json:"account_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	jwt.RegisteredClaims
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type WSTicketRequest struct {
	CharacterID string `json:"character_id"`
}

type CreateCharacterRequest struct {
	Name     string `json:"name"`
	Vocation string `json:"vocation"`
	Origin   string `json:"origin"`
}

type DeveloperPresetRequest struct {
	CharacterID string `json:"character_id"`
}

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Erro fatal de configuração: %v", err)
	}
	appConfig = cfg

	log.Printf("Iniciando Atlas Server [%s] na porta :%s...", cfg.Environment, cfg.Port)

	// Validação de Integridade do Catálogo no Startup
	if violations := game.GlobalContentRegistry.ValidateIntegrity(); len(violations) > 0 {
		for _, v := range violations {
			log.Printf("⚠️ Violação de catálogo: %s", v)
		}
		log.Fatalf("Erro fatal: Catálogo de conteúdo possui %d violações", len(violations))
	} else {
		log.Printf("✅ Catálogo de conteúdo validado com 100%% de integridade (%d regiões, %d monstros, %d itens)",
			len(game.GlobalContentRegistry.Regions),
			len(game.GlobalContentRegistry.Monsters.List()),
			len(game.GlobalContentRegistry.Items.List()),
		)
	}

	log.Printf("Conectando ao PostgreSQL...")
	if _, err := db.InitDB(cfg.DatabaseURL); err != nil {
		// O jogo não pode operar com persistência parcial: migrations, leases,
		// claims e ledgers são parte das garantias econômicas também em dev.
		log.Fatalf("Erro fatal ao inicializar PostgreSQL: %v", err)
	}
	if cfg.Environment == "development" {
		// Um encerramento abrupto deixa apenas o lease efêmero no banco. Em
		// desenvolvimento há uma única instância local; limpá-los no startup
		// evita que um rebuild impeça o próximo login por até 60 segundos.
		if err := db.ClearDevelopmentSessionLeases(); err != nil {
			log.Fatalf("Erro fatal ao limpar leases de sessão locais: %v", err)
		}
		log.Printf("🧹 Leases de sessões locais anteriores foram limpos")
	}
	startSettlementScheduler()

	if cfg.DevToolsEnabled {
		if err := bootstrapDeveloperAdmin(cfg.DevAdminEmail, cfg.DevAdminPassword); err != nil {
			log.Fatalf("Erro fatal ao preparar administrador de testes: %v", err)
		}
		log.Printf("🧪 Ferramentas de QA habilitadas para %s", cfg.DevAdminEmail)
	}

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health/live", HandleHealthLive)
	r.Get("/health/ready", HandleHealthReady)
	r.Get("/api/v1/health", HandleHealthReady)
	r.Get("/api/v1/game/catalog", HandleGameCatalog)
	r.Post("/api/v1/auth/register", HandleRegister)
	r.Post("/api/v1/auth/login", HandleLogin)

	// WebSocket Endpoint
	r.Get("/ws", HandleWebSocket)

	// Rotas Protegidas do Jogador
	r.Group(func(r chi.Router) {
		r.Use(AuthMiddleware)
		r.Get("/api/v1/characters", HandleGetCharacters)
		r.Post("/api/v1/characters", HandleCreateCharacter)
		r.Post("/api/v1/auth/ws-ticket", HandleWSTicket)
		r.Post("/api/v1/expedition/claim", HandleClaimOfflineProgress)
		r.Get("/api/v1/admin/telemetry", AdminMiddleware(HandleAdminTelemetry))
		if cfg.DevToolsEnabled {
			r.Post("/api/v1/admin/test-preset", AdminMiddleware(HandleDeveloperPreset))
		}
	})

	log.Printf("Project Atlas Backend em Go ativo na porta :%s [Consumo ~20MB RAM]\n", cfg.Port)
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Erro no servidor: %v", err)
	}
}

func HandleGameCatalog(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, game.BuildGameCatalog())
}

func HandleHealthLive(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]any{
		"status":    "alive",
		"service":   "project-atlas-backend",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func HandleHealthReady(w http.ResponseWriter, r *http.Request) {
	if db.DB == nil {
		jsonError(w, http.StatusServiceUnavailable, "Banco de dados não inicializado")
		return
	}
	if err := db.DB.PingContext(r.Context()); err != nil {
		jsonError(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"status":    "ready",
		"service":   "project-atlas-backend",
		"database":  "connected",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func HandleRegister(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // Max 1MB
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		jsonError(w, http.StatusBadRequest, "Email e senha são obrigatórios")
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if len(req.Email) > 254 || len(req.Password) < 8 || len(req.Password) > 128 {
		jsonError(w, http.StatusBadRequest, "Email ou senha fora dos limites permitidos")
		return
	}
	if !allowRegistrationAttempt(r, time.Now().UTC()) {
		w.Header().Set("Retry-After", "3600")
		jsonError(w, http.StatusTooManyRequests, "Muitas tentativas de cadastro a partir desta conexão. Tente novamente mais tarde.")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Erro ao criptografar senha")
		return
	}

	acc, err := db.CreateAccount(req.Email, string(hash))
	if err != nil {
		jsonError(w, http.StatusConflict, "Email já cadastrado ou erro no banco")
		return
	}

	tokenStr, err := generateJWT(acc.ID, acc.Email, acc.Role)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Erro ao gerar token de autenticação")
		return
	}
	jsonResponse(w, http.StatusCreated, map[string]any{
		"message": "Conta criada com sucesso",
		"token":   tokenStr,
		"account": acc,
	})
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // Max 1MB
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		jsonError(w, http.StatusBadRequest, "Email e senha são obrigatórios")
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if len(req.Email) > 254 || len(req.Password) > 128 {
		jsonError(w, http.StatusUnauthorized, "Email ou senha incorretos")
		return
	}
	if !allowLoginAttempt(r, req.Email, time.Now().UTC()) {
		w.Header().Set("Retry-After", "300")
		jsonError(w, http.StatusTooManyRequests, "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.")
		return
	}
	acc, err := db.GetAccountByEmail(req.Email)
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "Email ou senha incorretos")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(acc.PasswordHash), []byte(req.Password)); err != nil {
		jsonError(w, http.StatusUnauthorized, "Email ou senha incorretos")
		return
	}

	tokenStr, err := generateJWT(acc.ID, acc.Email, acc.Role)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Erro ao gerar token")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"token":   tokenStr,
		"account": acc,
	})
}

func HandleWSTicket(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	var req WSTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.CharacterID) == "" || len(req.CharacterID) > 64 {
		jsonError(w, http.StatusBadRequest, "character_id inválido")
		return
	}
	claims, ok := r.Context().Value("claims").(*Claims)
	if !ok || claims.AccountID == "" {
		jsonError(w, http.StatusUnauthorized, "Sessão inválida")
		return
	}
	if !allowWSTicketIssue(r, claims.AccountID, time.Now().UTC()) {
		jsonError(w, http.StatusTooManyRequests, "Muitas tentativas de conexão em tempo real; aguarde alguns instantes")
		return
	}
	var ownsCharacter bool
	if err := db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM characters WHERE id=$1 AND account_id=$2)`, req.CharacterID, claims.AccountID).Scan(&ownsCharacter); err != nil {
		log.Printf("erro ao validar personagem para ticket websocket: %v", err)
		jsonError(w, http.StatusInternalServerError, "Não foi possível preparar a conexão em tempo real")
		return
	}
	if !ownsCharacter {
		jsonError(w, http.StatusForbidden, "Personagem não pertence à conta autenticada")
		return
	}
	ticket, expiresAt, err := issueWSTicket(claims.AccountID, req.CharacterID, time.Now().UTC())
	if err != nil {
		log.Printf("erro ao gerar ticket websocket: %v", err)
		jsonError(w, http.StatusInternalServerError, "Não foi possível preparar a conexão em tempo real")
		return
	}
	jsonResponse(w, http.StatusCreated, map[string]any{
		"ticket":     ticket,
		"expires_at": expiresAt,
	})
}

func HandleGetCharacters(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value("claims").(*Claims)
	chars, err := db.GetCharactersByAccountID(claims.AccountID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Erro buscando personagens")
		return
	}

	if chars == nil {
		chars = []*db.Character{}
	}
	jsonResponse(w, http.StatusOK, chars)
}

func HandleCreateCharacter(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // Max 1MB
	claims := r.Context().Value("claims").(*Claims)
	var req CreateCharacterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		jsonError(w, http.StatusBadRequest, "Nome do personagem é obrigatório")
		return
	}

	// O Atlas é classless: o cliente não escolhe uma classe permanente na
	// criação. O estilo atual passa a ser determinado pela arma equipada.
	req.Vocation = "Aprendiz"
	if req.Origin == "" {
		req.Origin = "wanderer"
	}

	char, err := db.CreateCharacter(claims.AccountID, req.Name, req.Vocation, req.Origin)
	if err != nil {
		jsonError(w, http.StatusConflict, "Nome de personagem já existe ou erro na criação")
		return
	}

	jsonResponse(w, http.StatusCreated, char)
}

func HandleClaimOfflineProgress(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value("claims").(*Claims)
	charID := r.URL.Query().Get("character_id")
	if charID == "" {
		jsonError(w, http.StatusBadRequest, "character_id é obrigatório")
		return
	}

	lifecycleLock := getCharacterLifecycleLock(charID)
	lifecycleLock.Lock()
	defer lifecycleLock.Unlock()

	sessionsMu.Lock()
	_, sessionAlreadyActive := activeSessions[charID]
	sessionsMu.Unlock()
	if sessionAlreadyActive {
		for attempt := 0; attempt < 10; attempt++ {
			time.Sleep(50 * time.Millisecond)
			sessionsMu.Lock()
			_, stillActive := activeSessions[charID]
			sessionsMu.Unlock()
			if !stillActive {
				sessionAlreadyActive = false
				break
			}
		}
		if sessionAlreadyActive {
			jsonError(w, http.StatusConflict, "A sessão em tempo real já está ativa; o progresso offline não pode ser reivindicado novamente")
			return
		}
	}

	claim, err := db.ClaimOfflineProgress(claims.AccountID, charID, time.Now().UTC())
	if err != nil {
		log.Printf("Erro no claim offline do personagem %s: %v", charID, err)
		if strings.Contains(strings.ToLower(err.Error()), "sessão ativa") {
			jsonError(w, http.StatusConflict, "Este personagem ainda possui uma sessão ativa. Feche a janela anterior e tente novamente.")
			return
		}
		jsonError(w, http.StatusInternalServerError, "Não foi possível reconciliar o progresso offline")
		return
	}
	jsonResponse(w, http.StatusOK, claim)
}

func HandleAdminTelemetry(w http.ResponseWriter, r *http.Request) {
	sessionsMu.Lock()
	activeCount := len(activeSessions)
	sessionsMu.Unlock()

	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	ramMb := float64(m.Alloc) / 1024.0 / 1024.0

	uptimeHours := time.Since(serverStartTime).Hours()

	dbStatus := "connected"
	if db.DB != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		if err := db.DB.PingContext(ctx); err != nil {
			dbStatus = "error: " + err.Error()
		}
		cancel()
	} else {
		dbStatus = "disconnected"
	}

	telemetry := map[string]any{
		"ram_usage_mb":     ramMb,
		"uptime_hours":     uptimeHours,
		"active_ccu":       activeCount,
		"db_status":        dbStatus,
		"active_sessions":  activeCount,
		"economy_counters": game.TelemetrySnapshot(),
	}
	jsonResponse(w, http.StatusOK, telemetry)
}

func bootstrapDeveloperAdmin(email, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	var accID string
	err = db.DB.QueryRow(`
		INSERT INTO accounts(email,password_hash,role)
		VALUES($1,$2,'admin')
		ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,role='admin'
		RETURNING id`, email, string(hash)).Scan(&accID)
	if err != nil {
		return err
	}

	// 1. Desbloquear todas as magias e habilidades nos personagens da conta admin de testes
	allSkillsJSON := `["whirlwind","multishot","brutal_strike","sniper_shot","fireball","ice_shard","divine_heal"]`
	_, _ = db.DB.Exec(`
		UPDATE characters
		SET learned_skills=$1::jsonb
		WHERE account_id=$2`, allSkillsJSON, accID)

	// 2. Garantir que os personagens da conta possuam varinha e cajado para testar projéteis
	rows, err := db.DB.Query(`SELECT id FROM characters WHERE account_id=$1`, accID)
	if err == nil {
		defer rows.Close()
		rng := rand.New(rand.NewSource(time.Now().UnixNano()))
		for rows.Next() {
			var charID string
			if err := rows.Scan(&charID); err == nil {
				inv, err := db.GetCharacterInventory(charID)
				if err == nil && inv != nil {
					hasWand := false
					hasStaff := false
					hasBow := false
					hasAmmo := false
					checkItem := func(name string) {
						nameLower := strings.ToLower(name)
						if strings.Contains(nameLower, "varinha") || strings.Contains(nameLower, "wand") {
							hasWand = true
						}
						if strings.Contains(nameLower, "cajado") || strings.Contains(nameLower, "staff") || strings.Contains(nameLower, "cetro") {
							hasStaff = true
						}
						if strings.Contains(nameLower, "arco") || strings.Contains(nameLower, "bow") || strings.Contains(nameLower, "besta") {
							hasBow = true
						}
						if strings.Contains(nameLower, "flecha") || strings.Contains(nameLower, "arrow") || strings.Contains(nameLower, "virote") {
							hasAmmo = true
						}
					}
					for _, item := range inv.Backpack {
						checkItem(item.Name)
					}
					if inv.Equipment.MainHand != nil {
						checkItem(inv.Equipment.MainHand.Name)
					}
					if inv.Equipment.Ammo != nil {
						checkItem(inv.Equipment.Ammo.Name)
					}

					changed := false
					if !hasWand {
						if wand := game.GenerateItemFromTemplate("Varinha das Relíquias", "Raro", rng); wand != nil {
							wand.SpecialEffect = "Arma Mágica de Teste (Varinha)"
							inv.Backpack = append(inv.Backpack, *wand)
							changed = true
						}
					}
					if !hasStaff {
						if staff := game.GenerateItemFromTemplate("Cajado Rúnico", "Raro", rng); staff != nil {
							staff.SpecialEffect = "Arma Mágica de Teste (Cajado)"
							inv.Backpack = append(inv.Backpack, *staff)
							changed = true
						}
					}
					if !hasBow {
						if bow := game.GenerateItemFromTemplate("Arco Longo", "Raro", rng); bow != nil {
							bow.SpecialEffect = "Arma de Distância de Teste (Arco)"
							inv.Backpack = append(inv.Backpack, *bow)
							changed = true
						}
					}
					if !hasAmmo {
						if ammo := game.GenerateItemFromTemplate("Flechas de Aço", "Raro", rng); ammo != nil {
							ammo.SpecialEffect = "Munição de Teste (Flechas)"
							inv.Backpack = append(inv.Backpack, *ammo)
							changed = true
						}
					}
					if changed {
						_ = db.SaveCharacterInventory(charID, inv)
					}
				}
			}
		}
	}

	return nil
}

func HandleDeveloperPreset(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var req DeveloperPresetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.CharacterID) == "" {
		jsonError(w, http.StatusBadRequest, "character_id é obrigatório")
		return
	}
	claims := r.Context().Value("claims").(*Claims)
	var ownsCharacter bool
	if err := db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM characters WHERE id=$1 AND account_id=$2)`, req.CharacterID, claims.AccountID).Scan(&ownsCharacter); err != nil || !ownsCharacter {
		jsonError(w, http.StatusForbidden, "o preset de QA só pode alterar personagens da própria conta")
		return
	}

	sessionsMu.Lock()
	_, sessionActive := activeSessions[req.CharacterID]
	sessionsMu.Unlock()
	if sessionActive {
		jsonError(w, http.StatusConflict, "saia do mundo antes de aplicar o preset de QA")
		return
	}

	result, err := db.ApplyDeveloperPreset(req.CharacterID, time.Now().UTC())
	if err != nil {
		log.Printf("erro ao aplicar preset de QA em %s: %v", req.CharacterID, err)
		jsonError(w, http.StatusInternalServerError, "não foi possível preparar o personagem de testes")
		return
	}
	jsonResponse(w, http.StatusOK, result)
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		tokenStr := ""
		if len(authHeader) > 7 && strings.EqualFold(authHeader[:7], "Bearer ") {
			tokenStr = strings.TrimSpace(authHeader[7:])
		}

		if tokenStr == "" {
			jsonError(w, http.StatusUnauthorized, "Token JWT não fornecido")
			return
		}

		claims := &Claims{}
		tkn, err := jwt.ParseWithClaims(
			tokenStr,
			claims,
			func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("algoritmo de assinatura inesperado: %v", token.Header["alg"])
				}
				return appConfig.JWTSecret, nil
			},
			jwt.WithValidMethods([]string{"HS256"}),
			jwt.WithIssuer("atlas-server"),
			jwt.WithAudience("atlas-client"),
		)

		if err != nil || !tkn.Valid {
			jsonError(w, http.StatusUnauthorized, "Token JWT inválido ou expirado")
			return
		}

		ctx := r.Context()
		ctx = context.WithValue(ctx, "claims", claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value("claims").(*Claims)
		if !ok || claims.Role != "admin" {
			jsonError(w, http.StatusForbidden, "Acesso restrito a administradores do sistema")
			return
		}
		next.ServeHTTP(w, r)
	}
}

func generateJWT(accID, email, role string) (string, error) {
	if role == "" {
		role = "player"
	}
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		AccountID: accID,
		Email:     email,
		Role:      role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "atlas-server",
			Subject:   accID,
			Audience:  jwt.ClaimStrings{"atlas-client"},
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(appConfig.JWTSecret)
}

func jsonResponse(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}

func jsonError(w http.ResponseWriter, code int, message string) {
	jsonResponse(w, code, map[string]string{"error": message})
}