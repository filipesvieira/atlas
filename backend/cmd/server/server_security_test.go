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