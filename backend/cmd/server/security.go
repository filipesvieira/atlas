package main

import (
	"crypto/rand"
	"encoding/base64"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type slidingWindowLimiter struct {
	mu    sync.Mutex
	hits  map[string][]time.Time
	calls uint64
}

func newSlidingWindowLimiter() *slidingWindowLimiter {
	return &slidingWindowLimiter{hits: make(map[string][]time.Time)}
}

func (l *slidingWindowLimiter) Allow(key string, limit int, window time.Duration, now time.Time) bool {
	if l == nil || key == "" || limit <= 0 || window <= 0 {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := now.Add(-window)
	recent := l.hits[key][:0]
	for _, hit := range l.hits[key] {
		if hit.After(cutoff) {
			recent = append(recent, hit)
		}
	}
	if len(recent) >= limit {
		l.hits[key] = recent
		return false
	}
	l.hits[key] = append(recent, now)
	l.calls++
	if l.calls%256 == 0 {
		stale := now.Add(-2 * time.Hour)
		for candidate, hits := range l.hits {
			if len(hits) == 0 || hits[len(hits)-1].Before(stale) {
				delete(l.hits, candidate)
			}
		}
	}
	return true
}

var authLimiter = newSlidingWindowLimiter()

func requestClientIP(r *http.Request) string {
	if r == nil {
		return "unknown"
	}
	if appConfig != nil && appConfig.TrustProxyHeaders {
		if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
			if comma := strings.IndexByte(forwarded, ','); comma >= 0 {
				forwarded = forwarded[:comma]
			}
			if parsed := net.ParseIP(strings.TrimSpace(forwarded)); parsed != nil {
				return parsed.String()
			}
		}
		if realIP := net.ParseIP(strings.TrimSpace(r.Header.Get("X-Real-IP"))); realIP != nil {
			return realIP.String()
		}
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func allowLoginAttempt(r *http.Request, email string, now time.Time) bool {
	ip := requestClientIP(r)
	email = strings.ToLower(strings.TrimSpace(email))
	// Limite amplo por IP e mais rígido por identidade. O objetivo é proteger o
	// bcrypt de brute force sem bloquear uma rede doméstica com vários usuários.
	return authLimiter.Allow("login:ip:"+ip, 30, 5*time.Minute, now) &&
		authLimiter.Allow("login:identity:"+ip+":"+email, 8, 5*time.Minute, now)
}

func allowRegistrationAttempt(r *http.Request, now time.Time) bool {
	return authLimiter.Allow("register:ip:"+requestClientIP(r), 8, time.Hour, now)
}

func allowWSTicketIssue(r *http.Request, accountID string, now time.Time) bool {
	accountID = strings.TrimSpace(accountID)
	if accountID == "" {
		return false
	}
	// Um cliente saudável pede um ticket apenas no connect/reconnect. O limite
	// impede que uma conta autenticada encha o store efêmero ou force upgrades
	// repetidos sem bloquear reconexões normais em redes instáveis.
	return authLimiter.Allow("ws-ticket:account:"+accountID, 20, time.Minute, now) &&
		authLimiter.Allow("ws-ticket:ip:"+requestClientIP(r), 60, time.Minute, now)
}

type wsTicketRecord struct {
	AccountID   string
	CharacterID string
	ExpiresAt   time.Time
}

type wsTicketStore interface {
	Store(ticket string, record wsTicketRecord, ttl time.Duration) error
	Consume(ticket string, now time.Time) (wsTicketRecord, bool, error)
}

type inMemoryWSTicketStore struct {
	sync.Mutex
	tickets map[string]wsTicketRecord
	issues  uint64
}

func newInMemoryWSTicketStore() *inMemoryWSTicketStore {
	return &inMemoryWSTicketStore{tickets: make(map[string]wsTicketRecord)}
}

func (s *inMemoryWSTicketStore) Store(ticket string, record wsTicketRecord, _ time.Duration) error {
	s.Lock()
	s.tickets[ticket] = record
	s.issues++
	if s.issues%128 == 0 {
		for key, candidate := range s.tickets {
			if !candidate.ExpiresAt.After(time.Now().UTC()) {
				delete(s.tickets, key)
			}
		}
	}
	s.Unlock()
	return nil
}

func (s *inMemoryWSTicketStore) Consume(ticket string, now time.Time) (wsTicketRecord, bool, error) {
	s.Lock()
	defer s.Unlock()
	record, ok := s.tickets[ticket]
	if !ok {
		return wsTicketRecord{}, false, nil
	}
	delete(s.tickets, ticket) // single-use mesmo quando expirado
	if !record.ExpiresAt.After(now) {
		return wsTicketRecord{}, false, nil
	}
	return record, true, nil
}

var wsTickets wsTicketStore = newInMemoryWSTicketStore()

const wsTicketTTL = 20 * time.Second

func issueWSTicket(accountID, characterID string, now time.Time) (string, time.Time, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", time.Time{}, err
	}
	ticket := base64.RawURLEncoding.EncodeToString(raw)
	expiresAt := now.Add(wsTicketTTL)
	if err := wsTickets.Store(ticket, wsTicketRecord{AccountID: accountID, CharacterID: characterID, ExpiresAt: expiresAt}, wsTicketTTL); err != nil {
		return "", time.Time{}, err
	}
	return ticket, expiresAt, nil
}

func consumeWSTicket(ticket string, now time.Time) (wsTicketRecord, bool) {
	if ticket == "" {
		return wsTicketRecord{}, false
	}
	record, ok, err := wsTickets.Consume(ticket, now)
	if err != nil || !ok {
		return wsTicketRecord{}, false
	}
	return record, true
}