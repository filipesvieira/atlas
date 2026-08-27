package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/atlas/backend/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

func init() {
	appConfig, _ = config.LoadConfig()
}

func TestSecurity_HealthLive(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	w := httptest.NewRecorder()

	HandleHealthLive(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Esperava status 200, obtido %d", resp.StatusCode)
	}

	var body map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&body)
	if body["status"] != "alive" {
		t.Errorf("Esperava status alive, obtido %v", body["status"])
	}
}

func TestSecurity_AdminMiddleware_RejectsNonAdmin(t *testing.T) {
	appConfig, _ = config.LoadConfig()

	// Gera token para jogador comum
	tokenStr, err := generateJWT("player-1", "player@atlas.com", "player")
	if err != nil {
		t.Fatalf("Erro gerando JWT: %v", err)
	}

	adminHandler := AuthMiddleware(AdminMiddleware(func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]string{"result": "ok"})
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/telemetry", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()

	adminHandler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("Esperava 403 Forbidden para jogador comum, obtido %d", resp.StatusCode)
	}
}

func TestSecurity_AdminMiddleware_AcceptsAdmin(t *testing.T) {
	appConfig, _ = config.LoadConfig()

	// Gera token para administrador
	tokenStr, err := generateJWT("admin-1", "admin@atlas.com", "admin")
	if err != nil {
		t.Fatalf("Erro gerando JWT: %v", err)
	}

	adminHandler := AuthMiddleware(AdminMiddleware(func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]string{"result": "ok"})
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/telemetry", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()

	adminHandler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Esperava 200 OK para administrador, obtido %d", resp.StatusCode)
	}
}

func TestSecurity_JWTAlgorithmForgedTokenRejected(t *testing.T) {
	appConfig, _ = config.LoadConfig()

	// Cria token assinado com método incorreto / 'none'
	claims := &Claims{
		AccountID: "hacker-1",
		Email:     "hacker@atlas.com",
		Role:      "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
	tokenStr, _ := token.SignedString(jwt.UnsafeAllowNoneSignatureType)

	protectedHandler := AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/characters", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()

	protectedHandler.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Esperava 401 Unauthorized para token forjado com signing method none, obtido %d", resp.StatusCode)
	}
}
func TestSecurity_AuthMiddlewareRejectsJWTInQueryString(t *testing.T) {
	appConfig, _ = config.LoadConfig()
	tokenStr, err := generateJWT("player-query", "player@atlas.com", "player")
	if err != nil {
		t.Fatalf("Erro gerando JWT: %v", err)
	}
	protected := AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/characters?token="+tokenStr, nil)
	w := httptest.NewRecorder()
	protected.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusUnauthorized {
		t.Fatalf("JWT em query string deve ser rejeitado; status=%d", w.Result().StatusCode)
	}
}

func TestSecurity_WSTicketIsSingleUseAndExpires(t *testing.T) {
	now := time.Date(2026, 8, 26, 20, 0, 0, 0, time.UTC)
	ticket, expiresAt, err := issueWSTicket("account-1", "character-1", now)
	if err != nil {
		t.Fatalf("emitir ticket: %v", err)
	}
	if !expiresAt.Equal(now.Add(wsTicketTTL)) {
		t.Fatalf("expiração inesperada: %v", expiresAt)
	}
	record, ok := consumeWSTicket(ticket, now.Add(time.Second))
	if !ok || record.AccountID != "account-1" || record.CharacterID != "character-1" {
		t.Fatalf("ticket válido não foi consumido corretamente: %+v ok=%v", record, ok)
	}
	if _, ok := consumeWSTicket(ticket, now.Add(2*time.Second)); ok {
		t.Fatal("ticket WebSocket não pode ser reutilizado")
	}

	expired, _, err := issueWSTicket("account-2", "character-2", now)
	if err != nil {
		t.Fatalf("emitir ticket expirável: %v", err)
	}
	if _, ok := consumeWSTicket(expired, now.Add(wsTicketTTL+time.Second)); ok {
		t.Fatal("ticket expirado não pode ser aceito")
	}
}

func TestSecurity_WSTicketIssueIsRateLimited(t *testing.T) {
	authLimiter = newSlidingWindowLimiter()
	now := time.Date(2026, 8, 26, 20, 0, 0, 0, time.UTC)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/ws-ticket", nil)
	req.RemoteAddr = "203.0.113.10:40000"
	for attempt := 0; attempt < 20; attempt++ {
		if !allowWSTicketIssue(req, "account-rate-test", now.Add(time.Duration(attempt)*time.Millisecond)) {
			t.Fatalf("tentativa normal %d foi bloqueada antes do limite", attempt+1)
		}
	}
	if allowWSTicketIssue(req, "account-rate-test", now.Add(21*time.Millisecond)) {
		t.Fatal("emissão de ticket deveria ser bloqueada após o limite por conta")
	}
}