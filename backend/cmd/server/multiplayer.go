package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
)

type chatRepository interface {
	SaveChatMessage(senderID, senderName string, senderLevel int, channel, text string) (game.ChatMessage, error)
	ListRecentChatMessages(channel string, limit int) ([]game.ChatMessage, error)
	ListBlockedCharacterIDs(characterID string) (map[string]bool, error)
	BlockChatCharacter(characterID, targetID string) error
	UnblockChatCharacter(characterID, targetID string) error
	IsCharacterChatMuted(characterID string, now time.Time) (bool, error)
	ReportChatMessage(reporterID, messageID, reason string) error
	EnsurePvPProfile(characterID string) (game.PvPProfile, error)
	GetPublicPlayerProfile(characterID string) (game.PublicPlayerProfile, error)
	CreateDuelChallenge(challengerID, targetID, requestID string, now time.Time) (game.DuelChallenge, error)
	ListPendingDuelChallenges(characterID string, now time.Time) ([]game.DuelChallenge, error)
	RespondDuelChallenge(targetID, challengeID string, accept bool, now time.Time) (game.DuelChallenge, error)
	CancelDuelChallenge(challengerID, challengeID string, now time.Time) (game.DuelChallenge, error)
	CreatePvPMatchFromAcceptedDuel(challengeID string, now time.Time) (game.PvPMatch, error)
	ConfirmPvPMatchParticipant(matchID, characterID, tacticalStrategy string, strategyVersion int, now time.Time) (game.PvPMatch, bool, error)
	GetPendingPvPMatchNotice(characterID string, now time.Time) (*game.PvPMatchNotice, error)
}

type dbChatRepository struct{}

func (dbChatRepository) SaveChatMessage(senderID, senderName string, senderLevel int, channel, text string) (game.ChatMessage, error) {
	return db.SaveChatMessage(senderID, senderName, senderLevel, channel, text)
}
func (dbChatRepository) ListRecentChatMessages(channel string, limit int) ([]game.ChatMessage, error) {
	return db.ListRecentChatMessages(channel, limit)
}
func (dbChatRepository) ListBlockedCharacterIDs(characterID string) (map[string]bool, error) {
	return db.ListBlockedCharacterIDs(characterID)
}
func (dbChatRepository) BlockChatCharacter(characterID, targetID string) error {
	return db.BlockChatCharacter(characterID, targetID)
}
func (dbChatRepository) UnblockChatCharacter(characterID, targetID string) error {
	return db.UnblockChatCharacter(characterID, targetID)
}
func (dbChatRepository) IsCharacterChatMuted(characterID string, now time.Time) (bool, error) {
	return db.IsCharacterChatMuted(characterID, now)
}
func (dbChatRepository) ReportChatMessage(reporterID, messageID, reason string) error {
	return db.ReportChatMessage(reporterID, messageID, reason)
}
func (dbChatRepository) EnsurePvPProfile(characterID string) (game.PvPProfile, error) {
	return db.EnsurePvPProfile(characterID)
}
func (dbChatRepository) GetPublicPlayerProfile(characterID string) (game.PublicPlayerProfile, error) {
	return db.GetPublicPlayerProfile(characterID)
}
func (dbChatRepository) CreateDuelChallenge(challengerID, targetID, requestID string, now time.Time) (game.DuelChallenge, error) {
	return db.CreateDuelChallenge(challengerID, targetID, requestID, now)
}
func (dbChatRepository) ListPendingDuelChallenges(characterID string, now time.Time) ([]game.DuelChallenge, error) {
	return db.ListPendingDuelChallenges(characterID, now)
}
func (dbChatRepository) RespondDuelChallenge(targetID, challengeID string, accept bool, now time.Time) (game.DuelChallenge, error) {
	return db.RespondDuelChallenge(targetID, challengeID, accept, now)
}
func (dbChatRepository) CancelDuelChallenge(challengerID, challengeID string, now time.Time) (game.DuelChallenge, error) {
	return db.CancelDuelChallenge(challengerID, challengeID, now)
}
func (dbChatRepository) CreatePvPMatchFromAcceptedDuel(challengeID string, now time.Time) (game.PvPMatch, error) {
	return db.CreatePvPMatchFromAcceptedDuel(challengeID, now)
}
func (dbChatRepository) ConfirmPvPMatchParticipant(matchID, characterID, tacticalStrategy string, strategyVersion int, now time.Time) (game.PvPMatch, bool, error) {
	return db.ConfirmPvPMatchParticipant(matchID, characterID, tacticalStrategy, strategyVersion, now)
}
func (dbChatRepository) GetPendingPvPMatchNotice(characterID string, now time.Time) (*game.PvPMatchNotice, error) {
	return db.GetPendingPvPMatchNotice(characterID, now)
}

const (
	worldChatTopic      = "atlas.social.world.v1"
	socialEventChat     = "chat"
	socialEventPresence = "presence"
	socialEventDuel     = "duel_challenge"
)

type socialBusEvent struct {
	Type            string                  `json:"type"`
	Chat            *game.ChatMessage       `json:"chat,omitempty"`
	Presence        *game.PresenceSnapshot  `json:"presence,omitempty"`
	RecipientID     string                  `json:"recipient_id,omitempty"`
	DuelMessageType string                  `json:"duel_message_type,omitempty"`
	DuelChallenge   *game.DuelChallenge     `json:"duel_challenge,omitempty"`
	PvPMatchNotice  *game.PvPMatchNotice    `json:"pvp_match_notice,omitempty"`
	PvPCombat       *game.PvPCombatSnapshot `json:"pvp_combat,omitempty"`
}

type socialMessageBus interface {
	Publish(topic string, event socialBusEvent) error
	Subscribe(topic string, handler func(socialBusEvent)) (func(), error)
	Close() error
}

type inMemorySocialBus struct {
	mu          sync.RWMutex
	subscribers map[string]map[uint64]func(socialBusEvent)
	nextID      uint64
}

func newInMemorySocialBus() *inMemorySocialBus {
	return &inMemorySocialBus{subscribers: map[string]map[uint64]func(socialBusEvent){}}
}

func (b *inMemorySocialBus) Publish(topic string, event socialBusEvent) error {
	b.mu.RLock()
	handlers := make([]func(socialBusEvent), 0, len(b.subscribers[topic]))
	for _, handler := range b.subscribers[topic] {
		handlers = append(handlers, handler)
	}
	b.mu.RUnlock()
	for _, handler := range handlers {
		handler(event)
	}
	return nil
}

func (b *inMemorySocialBus) Subscribe(topic string, handler func(socialBusEvent)) (func(), error) {
	b.mu.Lock()
	b.nextID++
	id := b.nextID
	if b.subscribers[topic] == nil {
		b.subscribers[topic] = map[uint64]func(socialBusEvent){}
	}
	b.subscribers[topic][id] = handler
	b.mu.Unlock()
	return func() {
		b.mu.Lock()
		delete(b.subscribers[topic], id)
		b.mu.Unlock()
	}, nil
}

func (*inMemorySocialBus) Close() error { return nil }

// presenceStore mantém presença como dado efêmero. A identidade da sessão é
// usada para que o cleanup de uma conexão antiga nunca apague a presença de
// uma reconexão já assumida por outro processo.
type presenceStore interface {
	Register(characterID, ownerToken string, now time.Time) (int, error)
	Refresh(characterID, ownerToken string, now time.Time) (int, error)
	Unregister(characterID, ownerToken string, now time.Time) (int, error)
}

type localPresenceStore struct {
	mu     sync.Mutex
	owners map[string]string
}

func newLocalPresenceStore() *localPresenceStore {
	return &localPresenceStore{owners: map[string]string{}}
}

func (s *localPresenceStore) Register(characterID, ownerToken string, _ time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.owners[characterID] = ownerToken
	return len(s.owners), nil
}

func (s *localPresenceStore) Refresh(characterID, ownerToken string, _ time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.owners[characterID] == ownerToken {
		return len(s.owners), nil
	}
	return len(s.owners), fmt.Errorf("presença da sessão foi substituída")
}

func (s *localPresenceStore) Unregister(characterID, ownerToken string, _ time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.owners[characterID] == ownerToken {
		delete(s.owners, characterID)
	}
	return len(s.owners), nil
}

type socialClient struct {
	Session       *game.GameSession
	Profile       game.PublicPlayerProfile
	Blocked       map[string]bool
	PresenceToken string
}

type worldChatHub struct {
	mu          sync.RWMutex
	repo        chatRepository
	bus         socialMessageBus
	presence    presenceStore
	clients     map[string]*socialClient
	limiter     *slidingWindowLimiter
	unsubscribe func()
	onlineCount int
}

func newWorldChatHub(repo chatRepository) *worldChatHub {
	hub, err := newWorldChatHubWithDependencies(repo, newInMemorySocialBus(), newLocalPresenceStore())
	if err != nil {
		panic(err)
	}
	return hub
}

func newWorldChatHubWithBus(repo chatRepository, bus socialMessageBus) *worldChatHub {
	hub, err := newWorldChatHubWithDependencies(repo, bus, newLocalPresenceStore())
	if err != nil {
		panic(err)
	}
	return hub
}

func newWorldChatHubWithDependencies(repo chatRepository, bus socialMessageBus, presence presenceStore) (*worldChatHub, error) {
	if repo == nil || bus == nil || presence == nil {
		return nil, fmt.Errorf("dependências sociais inválidas")
	}
	hub := &worldChatHub{repo: repo, bus: bus, presence: presence, clients: map[string]*socialClient{}, limiter: newSlidingWindowLimiter()}
	unsubscribe, err := bus.Subscribe(worldChatTopic, hub.handleBusEvent)
	if err != nil {
		return nil, err
	}
	hub.unsubscribe = unsubscribe
	return hub, nil
}

var multiplayerHub = newWorldChatHub(dbChatRepository{})

func newPresenceToken() (string, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func cleanChatText(input string) string {
	input = strings.TrimSpace(input)
	var b strings.Builder
	b.Grow(len(input))
	lastSpace := false
	for _, r := range input {
		if unicode.IsControl(r) {
			continue
		}
		if unicode.IsSpace(r) {
			if lastSpace {
				continue
			}
			r = ' '
			lastSpace = true
		} else {
			lastSpace = false
		}
		b.WriteRune(r)
	}
	return strings.TrimSpace(b.String())
}

func (h *worldChatHub) Register(session *game.GameSession, characterID string) error {
	if h == nil || session == nil || characterID == "" {
		return fmt.Errorf("sessão social inválida")
	}
	profile, err := h.repo.GetPublicPlayerProfile(characterID)
	if err != nil {
		return err
	}
	pvp, err := h.repo.EnsurePvPProfile(characterID)
	if err != nil {
		return err
	}
	profile.Rating, profile.Wins, profile.Losses = pvp.Rating, pvp.Wins, pvp.Losses
	blocked, err := h.repo.ListBlockedCharacterIDs(characterID)
	if err != nil {
		return err
	}
	history, err := h.repo.ListRecentChatMessages(game.ChatChannelWorld, 40)
	if err != nil {
		return err
	}
	visible := make([]game.ChatMessage, 0, len(history))
	for _, msg := range history {
		if !blocked[msg.SenderID] {
			visible = append(visible, msg)
		}
	}
	pendingDuels, err := h.repo.ListPendingDuelChallenges(characterID, time.Now().UTC())
	if err != nil {
		return err
	}
	pendingArena, err := h.repo.GetPendingPvPMatchNotice(characterID, time.Now().UTC())
	if err != nil {
		return err
	}
	presenceToken, err := newPresenceToken()
	if err != nil {
		return err
	}
	count, err := h.presence.Register(characterID, presenceToken, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("não foi possível registrar presença: %w", err)
	}
	h.mu.Lock()
	h.clients[characterID] = &socialClient{Session: session, Profile: profile, Blocked: blocked, PresenceToken: presenceToken}
	h.onlineCount = count
	h.mu.Unlock()
	session.SendSocial(game.SocialMessage{Type: "SOCIAL_READY", ChatHistory: visible, Presence: &game.PresenceSnapshot{OnlineCount: count}, PublicProfile: &profile, DuelChallenges: pendingDuels, PvPMatchNotice: pendingArena})
	if err := h.publishPresence(count); err != nil {
		h.mu.Lock()
		if client := h.clients[characterID]; client != nil && client.Session == session {
			delete(h.clients, characterID)
		}
		h.mu.Unlock()
		_, _ = h.presence.Unregister(characterID, presenceToken, time.Now().UTC())
		return err
	}
	return nil
}

func (h *worldChatHub) Unregister(characterID string, session *game.GameSession) {
	if h == nil || characterID == "" {
		return
	}
	h.mu.Lock()
	client, ok := h.clients[characterID]
	if ok && client.Session == session {
		delete(h.clients, characterID)
	}
	h.mu.Unlock()
	if ok && client.Session == session {
		if count, err := h.presence.Unregister(characterID, client.PresenceToken, time.Now().UTC()); err == nil {
			_ = h.publishPresence(count)
		}
	}
}

func (h *worldChatHub) Heartbeat(characterID string, session *game.GameSession) error {
	if h == nil || characterID == "" || session == nil {
		return fmt.Errorf("sessão social inválida")
	}
	h.mu.RLock()
	client := h.clients[characterID]
	h.mu.RUnlock()
	if client == nil || client.Session != session {
		return fmt.Errorf("sessão social não registrada")
	}
	count, err := h.presence.Refresh(characterID, client.PresenceToken, time.Now().UTC())
	if err != nil {
		return err
	}
	h.mu.RLock()
	changed := h.onlineCount != count
	h.mu.RUnlock()
	if changed {
		return h.publishPresence(count)
	}
	return nil
}

func (h *worldChatHub) publishPresence(count int) error {
	h.mu.Lock()
	h.onlineCount = count
	h.mu.Unlock()
	return h.bus.Publish(worldChatTopic, socialBusEvent{Type: socialEventPresence, Presence: &game.PresenceSnapshot{OnlineCount: count}})
}

func (h *worldChatHub) broadcastPresence(count int) {
	h.mu.RLock()
	clients := make([]*socialClient, 0, count)
	for _, client := range h.clients {
		clients = append(clients, client)
	}
	h.mu.RUnlock()
	msg := game.SocialMessage{Type: "PRESENCE_UPDATE", Presence: &game.PresenceSnapshot{OnlineCount: count}}
	for _, client := range clients {
		client.Session.SendSocial(msg)
	}
}

func syncLocalPvPActivity(session *game.GameSession, characterID string) {
	if session == nil || characterID == "" || db.DB == nil {
		return
	}
	state, err := db.GetCharacterPvPActivityState(characterID)
	if err != nil {
		return
	}
	session.ApplyPvPActivityState(state.ActiveMatchID, state.ResumeExpedition, state.IsExpeditionActive, state.StateRevision)
}

func (h *worldChatHub) handleBusEvent(event socialBusEvent) {
	switch event.Type {
	case socialEventChat:
		if event.Chat != nil {
			h.broadcastWorldLocal(*event.Chat)
		}
	case socialEventPresence:
		if event.Presence != nil {
			h.mu.Lock()
			h.onlineCount = event.Presence.OnlineCount
			h.mu.Unlock()
			h.broadcastPresence(event.Presence.OnlineCount)
		}
	case socialEventDuel:
		if event.RecipientID != "" {
			h.mu.RLock()
			client := h.clients[event.RecipientID]
			h.mu.RUnlock()
			if client != nil && event.DuelChallenge != nil {
				challenge := *event.DuelChallenge
				client.Session.SendSocial(game.SocialMessage{Type: event.DuelMessageType, DuelChallenge: &challenge})
			}
			if client != nil && event.PvPMatchNotice != nil {
				notice := *event.PvPMatchNotice
				if notice.Status == game.PvPMatchActive || event.DuelMessageType == "PVP_MATCH_ACTIVE" {
					syncLocalPvPActivity(client.Session, event.RecipientID)
				}
				client.Session.SendSocial(game.SocialMessage{Type: event.DuelMessageType, PvPMatchNotice: &notice})
			}
			if client != nil && event.PvPCombat != nil {
				if event.PvPCombat.Status == game.PvPMatchCompleted || event.PvPCombat.Status == game.PvPMatchCancelled || !client.Session.IsPvPActive() {
					syncLocalPvPActivity(client.Session, event.RecipientID)
				}
				combat := clonePvPCombatSnapshot(*event.PvPCombat)
				client.Session.SendSocial(game.SocialMessage{Type: event.DuelMessageType, PvPCombat: &combat})
			}
		}
	}
}

func (h *worldChatHub) Close() error {
	if h == nil {
		return nil
	}
	if h.unsubscribe != nil {
		h.unsubscribe()
	}
	if h.bus != nil {
		return h.bus.Close()
	}
	return nil
}

func (h *worldChatHub) SendWorld(characterID, requestID, text string) error {
	if h == nil {
		return fmt.Errorf("chat indisponível")
	}
	text = cleanChatText(text)
	if text == "" || len([]rune(text)) > 200 {
		return fmt.Errorf("a mensagem deve ter entre 1 e 200 caracteres")
	}
	now := time.Now().UTC()
	if !h.limiter.Allow("chat:"+characterID, 6, 10*time.Second, now) {
		return fmt.Errorf("você está enviando mensagens rápido demais")
	}
	muted, err := h.repo.IsCharacterChatMuted(characterID, now)
	if err != nil {
		return fmt.Errorf("não foi possível validar o chat")
	}
	if muted {
		return fmt.Errorf("seu personagem está silenciado no chat")
	}
	h.mu.RLock()
	sender := h.clients[characterID]
	h.mu.RUnlock()
	if sender == nil {
		return fmt.Errorf("sessão social não registrada")
	}
	persisted, err := h.repo.SaveChatMessage(characterID, sender.Profile.Name, sender.Profile.Level, game.ChatChannelWorld, text)
	if err != nil {
		return err
	}
	if err := h.bus.Publish(worldChatTopic, socialBusEvent{Type: socialEventChat, Chat: &persisted}); err != nil {
		return fmt.Errorf("mensagem registrada, mas o chat em tempo real está indisponível: %w", err)
	}
	game.IncrementTelemetry("chat_messages_total")
	return nil
}

func (h *worldChatHub) broadcastWorldLocal(message game.ChatMessage) {
	h.mu.RLock()
	clients := make([]*socialClient, 0, len(h.clients))
	for _, client := range h.clients {
		clients = append(clients, client)
	}
	h.mu.RUnlock()
	for _, client := range clients {
		if client.Blocked[message.SenderID] {
			continue
		}
		copyMessage := message
		client.Session.SendSocial(game.SocialMessage{Type: "CHAT_MESSAGE", ChatMessage: &copyMessage})
	}
}

func (h *worldChatHub) Block(characterID, targetID string) error {
	if targetID == "" || targetID == characterID {
		return fmt.Errorf("personagem inválido para bloqueio")
	}
	if err := h.repo.BlockChatCharacter(characterID, targetID); err != nil {
		return err
	}
	h.mu.Lock()
	if client := h.clients[characterID]; client != nil {
		client.Blocked[targetID] = true
	}
	h.mu.Unlock()
	return nil
}

func (h *worldChatHub) Unblock(characterID, targetID string) error {
	if targetID == "" {
		return fmt.Errorf("personagem inválido para desbloqueio")
	}
	if err := h.repo.UnblockChatCharacter(characterID, targetID); err != nil {
		return err
	}
	h.mu.Lock()
	if client := h.clients[characterID]; client != nil {
		delete(client.Blocked, targetID)
	}
	h.mu.Unlock()
	return nil
}

func (h *worldChatHub) Report(characterID, messageID, reason string) error {
	if messageID == "" {
		return fmt.Errorf("mensagem inválida")
	}
	return h.repo.ReportChatMessage(characterID, messageID, cleanChatText(reason))
}

func (h *worldChatHub) PublicProfile(targetID string) (game.PublicPlayerProfile, error) {
	if targetID == "" {
		return game.PublicPlayerProfile{}, fmt.Errorf("personagem inválido")
	}
	return h.repo.GetPublicPlayerProfile(targetID)
}

func (h *worldChatHub) CreateDuelChallenge(challengerID, targetID, requestID string) (game.DuelChallenge, error) {
	if challengerID == "" || targetID == "" || challengerID == targetID {
		return game.DuelChallenge{}, fmt.Errorf("personagem inválido para duelo")
	}
	challengerBlocks, err := h.repo.ListBlockedCharacterIDs(challengerID)
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if challengerBlocks[targetID] {
		return game.DuelChallenge{}, fmt.Errorf("desbloqueie este personagem no chat antes de enviar um desafio")
	}
	targetBlocks, err := h.repo.ListBlockedCharacterIDs(targetID)
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if targetBlocks[challengerID] {
		return game.DuelChallenge{}, fmt.Errorf("este personagem não aceita desafios seus")
	}
	challenge, err := h.repo.CreateDuelChallenge(challengerID, targetID, requestID, time.Now().UTC())
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if err := h.publishDuel(challenge.Target.CharacterID, "DUEL_CHALLENGE_RECEIVED", challenge); err != nil {
		return game.DuelChallenge{}, fmt.Errorf("desafio registrado, mas o convite em tempo real está indisponível: %w", err)
	}
	return challenge, nil
}

func (h *worldChatHub) RespondDuelChallenge(targetID, challengeID string, accept bool) (game.DuelChallenge, error) {
	challenge, err := h.repo.RespondDuelChallenge(targetID, challengeID, accept, time.Now().UTC())
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if err := h.publishDuel(challenge.Challenger.CharacterID, "DUEL_CHALLENGE_UPDATED", challenge); err != nil {
		return game.DuelChallenge{}, fmt.Errorf("resposta registrada, mas o aviso em tempo real está indisponível: %w", err)
	}
	return challenge, nil
}

// CreatePvPMatchFromAcceptedDuel cria uma única partida pronta por convite
// aceito e notifica os dois participantes sem expor o snapshot interno.
func (h *worldChatHub) CreatePvPMatchFromAcceptedDuel(challenge game.DuelChallenge) (game.PvPMatch, error) {
	match, err := h.repo.CreatePvPMatchFromAcceptedDuel(challenge.ID, time.Now().UTC())
	if err != nil {
		return game.PvPMatch{}, err
	}
	if err := h.publishPvPMatch(challenge.Challenger.CharacterID, match); err != nil {
		return game.PvPMatch{}, fmt.Errorf("partida registrada, mas o desafiante não foi notificado: %w", err)
	}
	if err := h.publishPvPMatch(challenge.Target.CharacterID, match); err != nil {
		return game.PvPMatch{}, fmt.Errorf("partida registrada, mas o desafiado não foi notificado: %w", err)
	}
	return match, nil
}

// ConfirmPvPMatchParticipant só registra a confirmação do próprio personagem.
// O PostgreSQL promove a arena para active quando os dois participantes já
// confirmaram, permitindo que a líder global a inicie em qualquer réplica.
func (h *worldChatHub) ConfirmPvPMatchParticipant(characterID, matchID, tacticalStrategy string, strategyVersion int) (game.PvPMatch, bool, error) {
	match, started, err := h.repo.ConfirmPvPMatchParticipant(matchID, characterID, tacticalStrategy, strategyVersion, time.Now().UTC())
	if err != nil {
		return game.PvPMatch{}, false, err
	}
	notice := game.PvPMatchNotice{
		ID: match.ID, ChallengeID: match.ChallengeID, ArenaKey: match.ArenaKey,
		Status: match.Status, RulesVersion: match.RulesVersion, CreatedAt: match.CreatedAt,
		Ranked: match.Ranked, MatchOrigin: match.MatchOrigin,
	}
	for _, participant := range match.Participants {
		participantNotice := notice
		participantNotice.TacticalStrategy = game.NormalizePvPTacticalStrategy(string(participant.TacticalStrategy))
		participantNotice.StrategyVersion = participant.StrategyVersion
		if participantNotice.StrategyVersion <= 0 {
			participantNotice.StrategyVersion = game.PvPTacticalStrategyVersion
		}
		participantNotice.PlayerConfirmed = started || match.Status == game.PvPMatchActive || participant.CharacterID == characterID
		messageType := "PVP_MATCH_READY"
		if participant.CharacterID == characterID {
			messageType = "PVP_MATCH_WAITING"
		}
		if started || match.Status == game.PvPMatchActive {
			messageType = "PVP_MATCH_ACTIVE"
		}
		if err := h.publishPvPMatchNotice(participant.CharacterID, messageType, participantNotice); err != nil {
			return game.PvPMatch{}, false, err
		}
	}
	return match, started, nil
}

func (h *worldChatHub) CancelDuelChallenge(challengerID, challengeID string) (game.DuelChallenge, error) {
	challenge, err := h.repo.CancelDuelChallenge(challengerID, challengeID, time.Now().UTC())
	if err != nil {
		return game.DuelChallenge{}, err
	}
	if err := h.publishDuel(challenge.Target.CharacterID, "DUEL_CHALLENGE_UPDATED", challenge); err != nil {
		return game.DuelChallenge{}, fmt.Errorf("cancelamento registrado, mas o aviso em tempo real está indisponível: %w", err)
	}
	return challenge, nil
}

func (h *worldChatHub) publishDuel(recipientID, messageType string, challenge game.DuelChallenge) error {
	if recipientID == "" {
		return fmt.Errorf("destinatário de duelo inválido")
	}
	copyChallenge := challenge
	return h.bus.Publish(worldChatTopic, socialBusEvent{
		Type: socialEventDuel, RecipientID: recipientID, DuelMessageType: messageType, DuelChallenge: &copyChallenge,
	})
}

func (h *worldChatHub) publishPvPMatch(recipientID string, match game.PvPMatch) error {
	if recipientID == "" || match.ID == "" {
		return fmt.Errorf("partida PvP ou destinatário inválido")
	}
	notice := game.PvPMatchNotice{
		ID: match.ID, ChallengeID: match.ChallengeID, ArenaKey: match.ArenaKey,
		Status: match.Status, RulesVersion: match.RulesVersion, CreatedAt: match.CreatedAt,
		TacticalStrategy: game.PvPStrategyBalanced, StrategyVersion: game.PvPTacticalStrategyVersion,
		Ranked: match.Ranked, MatchOrigin: match.MatchOrigin,
	}
	for _, participant := range match.Participants {
		if participant.CharacterID != recipientID {
			continue
		}
		notice.TacticalStrategy = game.NormalizePvPTacticalStrategy(string(participant.TacticalStrategy))
		if participant.StrategyVersion > 0 {
			notice.StrategyVersion = participant.StrategyVersion
		}
		break
	}
	return h.publishPvPMatchNotice(recipientID, "PVP_MATCH_READY", notice)
}

func (h *worldChatHub) publishPvPMatchNotice(recipientID, messageType string, notice game.PvPMatchNotice) error {
	if recipientID == "" || notice.ID == "" {
		return fmt.Errorf("partida PvP ou destinatário inválido")
	}
	copyNotice := notice
	return h.bus.Publish(worldChatTopic, socialBusEvent{
		Type: socialEventDuel, RecipientID: recipientID, DuelMessageType: messageType, PvPMatchNotice: &copyNotice,
	})
}

func (h *worldChatHub) publishPvPCombat(participantIDs []string, snapshot game.PvPCombatSnapshot) error {
	if snapshot.MatchID == "" || len(participantIDs) != 2 {
		return fmt.Errorf("snapshot PvP inválido")
	}
	for _, characterID := range participantIDs {
		if characterID == "" {
			return fmt.Errorf("participante PvP inválido")
		}
		copySnapshot := clonePvPCombatSnapshot(snapshot)
		if err := h.bus.Publish(worldChatTopic, socialBusEvent{
			Type: socialEventDuel, RecipientID: characterID, DuelMessageType: "PVP_COMBAT_STATE", PvPCombat: &copySnapshot,
		}); err != nil {
			return err
		}
	}
	return nil
}

func clonePvPCombatSnapshot(snapshot game.PvPCombatSnapshot) game.PvPCombatSnapshot {
	snapshot.Actors = append([]game.PvPCombatActor(nil), snapshot.Actors...)
	snapshot.Events = append([]game.PvPCombatEvent(nil), snapshot.Events...)
	return snapshot
}
