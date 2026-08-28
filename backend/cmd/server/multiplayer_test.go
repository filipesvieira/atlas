package main

import (
	"sync"
	"testing"
	"time"

	"github.com/atlas/backend/pkg/game"
)

type fakeChatRepo struct {
	mu         sync.Mutex
	profiles   map[string]game.PublicPlayerProfile
	blocks     map[string]map[string]bool
	messages   []game.ChatMessage
	confirmed  map[string]map[string]bool
	pendingPvP map[string]game.PvPMatchNotice
}

func newFakeChatRepo() *fakeChatRepo {
	return &fakeChatRepo{profiles: map[string]game.PublicPlayerProfile{}, blocks: map[string]map[string]bool{}, confirmed: map[string]map[string]bool{}, pendingPvP: map[string]game.PvPMatchNotice{}}
}
func (f *fakeChatRepo) SaveChatMessage(senderID, senderName string, senderLevel int, channel, text string) (game.ChatMessage, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	msg := game.ChatMessage{ID: "msg-1", Channel: channel, SenderID: senderID, SenderName: senderName, SenderLevel: senderLevel, Text: text, CreatedAt: time.Now().UTC()}
	f.messages = append(f.messages, msg)
	return msg, nil
}
func (f *fakeChatRepo) ListRecentChatMessages(channel string, limit int) ([]game.ChatMessage, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]game.ChatMessage(nil), f.messages...), nil
}
func (f *fakeChatRepo) ListBlockedCharacterIDs(characterID string) (map[string]bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := map[string]bool{}
	for id := range f.blocks[characterID] {
		out[id] = true
	}
	return out, nil
}
func (f *fakeChatRepo) BlockChatCharacter(characterID, targetID string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.blocks[characterID] == nil {
		f.blocks[characterID] = map[string]bool{}
	}
	f.blocks[characterID][targetID] = true
	return nil
}
func (f *fakeChatRepo) UnblockChatCharacter(characterID, targetID string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.blocks[characterID], targetID)
	return nil
}
func (f *fakeChatRepo) IsCharacterChatMuted(characterID string, now time.Time) (bool, error) {
	return false, nil
}
func (f *fakeChatRepo) ReportChatMessage(reporterID, messageID, reason string) error { return nil }
func (f *fakeChatRepo) EnsurePvPProfile(characterID string) (game.PvPProfile, error) {
	return game.PvPProfile{CharacterID: characterID, Rating: 1000, Season: 1}, nil
}
func (f *fakeChatRepo) GetPublicPlayerProfile(characterID string) (game.PublicPlayerProfile, error) {
	return f.profiles[characterID], nil
}
func (f *fakeChatRepo) CreateDuelChallenge(challengerID, targetID, requestID string, now time.Time) (game.DuelChallenge, error) {
	return game.DuelChallenge{ID: "duel-1", RequestID: requestID, Status: "pending", Challenger: f.profiles[challengerID], Target: f.profiles[targetID], CreatedAt: now, ExpiresAt: now.Add(90 * time.Second)}, nil
}
func (f *fakeChatRepo) ListPendingDuelChallenges(characterID string, now time.Time) ([]game.DuelChallenge, error) {
	return nil, nil
}
func (f *fakeChatRepo) RespondDuelChallenge(targetID, challengeID string, accept bool, now time.Time) (game.DuelChallenge, error) {
	status := "declined"
	if accept {
		status = "accepted"
	}
	return game.DuelChallenge{ID: challengeID, Status: status, Challenger: f.profiles["a"], Target: f.profiles[targetID], RespondedAt: &now}, nil
}
func (f *fakeChatRepo) CancelDuelChallenge(challengerID, challengeID string, now time.Time) (game.DuelChallenge, error) {
	return game.DuelChallenge{ID: challengeID, Status: "cancelled", Challenger: f.profiles[challengerID], Target: f.profiles["b"], RespondedAt: &now}, nil
}
func (f *fakeChatRepo) CreatePvPMatchFromAcceptedDuel(challengeID string, now time.Time) (game.PvPMatch, error) {
	return game.PvPMatch{
		ID: "match-1", ChallengeID: challengeID, Mode: game.CombatModeDuel, ArenaKey: "duel_arena",
		Status: game.PvPMatchReady, RulesVersion: 1, Seed: 42, CreatedAt: now,
		Participants: []game.PvPParticipantSnapshot{
			{CharacterID: "a", Name: "Alice", Team: game.CombatTeamA, Health: 100, MaxHealth: 100, Mana: 50, MaxMana: 50},
			{CharacterID: "b", Name: "Bob", Team: game.CombatTeamB, Health: 100, MaxHealth: 100, Mana: 50, MaxMana: 50},
		},
	}, nil
}
func (f *fakeChatRepo) ConfirmPvPMatchParticipant(matchID, characterID, tacticalStrategy string, strategyVersion int, now time.Time) (game.PvPMatch, bool, error) {
	f.mu.Lock()
	if f.confirmed[matchID] == nil {
		f.confirmed[matchID] = map[string]bool{}
	}
	f.confirmed[matchID][characterID] = true
	started := f.confirmed[matchID]["a"] && f.confirmed[matchID]["b"]
	f.mu.Unlock()
	match, err := f.CreatePvPMatchFromAcceptedDuel("duel-1", now)
	if err != nil {
		return game.PvPMatch{}, false, err
	}
	match.ID = matchID
	if started {
		match.Status = game.PvPMatchActive
		match.StartedAt = &now
	}
	return match, started, nil
}
func (f *fakeChatRepo) GetPendingPvPMatchNotice(characterID string, now time.Time) (*game.PvPMatchNotice, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	notice, ok := f.pendingPvP[characterID]
	if !ok {
		return nil, nil
	}
	return &notice, nil
}

func TestCleanChatTextCollapsesWhitespaceAndControls(t *testing.T) {
	got := cleanChatText("  oi\n\t  reino\x00  ")
	if got != "oi reino" {
		t.Fatalf("texto normalizado=%q", got)
	}
}

func TestWorldChatBroadcastHonorsBlock(t *testing.T) {
	repo := newFakeChatRepo()
	repo.profiles["a"] = game.PublicPlayerProfile{CharacterID: "a", Name: "Alice", Level: 10}
	repo.profiles["b"] = game.PublicPlayerProfile{CharacterID: "b", Name: "Bob", Level: 11}
	bus := newInMemorySocialBus()
	hub := newWorldChatHubWithBus(repo, bus)
	sa := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	sb := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	if err := hub.Register(sa, "a"); err != nil {
		t.Fatal(err)
	}
	if err := hub.Register(sb, "b"); err != nil {
		t.Fatal(err)
	}
	// limpa SOCIAL_READY/PRESENCE_UPDATE
	for len(sa.SocialChannel) > 0 {
		<-sa.SocialChannel
	}
	for len(sb.SocialChannel) > 0 {
		<-sb.SocialChannel
	}
	if err := hub.Block("b", "a"); err != nil {
		t.Fatal(err)
	}
	if err := hub.SendWorld("a", "req", "olá mundo"); err != nil {
		t.Fatal(err)
	}
	select {
	case msg := <-sa.SocialChannel:
		if msg.ChatMessage == nil || msg.ChatMessage.Text != "olá mundo" {
			t.Fatalf("mensagem própria inválida: %+v", msg)
		}
	case <-time.After(time.Second):
		t.Fatal("remetente não recebeu a mensagem")
	}
	select {
	case msg := <-sb.SocialChannel:
		t.Fatalf("destinatário que bloqueou remetente recebeu mensagem: %+v", msg)
	case <-time.After(30 * time.Millisecond):
	}
}

func TestDuelChallengeIsDeliveredOnlyToTarget(t *testing.T) {
	repo := newFakeChatRepo()
	repo.profiles["a"] = game.PublicPlayerProfile{CharacterID: "a", Name: "Alice", Level: 10}
	repo.profiles["b"] = game.PublicPlayerProfile{CharacterID: "b", Name: "Bob", Level: 11}
	hub := newWorldChatHubWithBus(repo, newInMemorySocialBus())
	challenger := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	target := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	if err := hub.Register(challenger, "a"); err != nil {
		t.Fatal(err)
	}
	if err := hub.Register(target, "b"); err != nil {
		t.Fatal(err)
	}
	for len(challenger.SocialChannel) > 0 {
		<-challenger.SocialChannel
	}
	for len(target.SocialChannel) > 0 {
		<-target.SocialChannel
	}
	if _, err := hub.CreateDuelChallenge("a", "b", "challenge-1"); err != nil {
		t.Fatal(err)
	}
	select {
	case message := <-target.SocialChannel:
		if message.Type != "DUEL_CHALLENGE_RECEIVED" || message.DuelChallenge == nil || message.DuelChallenge.Challenger.CharacterID != "a" {
			t.Fatalf("convite inválido: %+v", message)
		}
	case <-time.After(time.Second):
		t.Fatal("alvo não recebeu convite")
	}
	select {
	case unexpected := <-challenger.SocialChannel:
		t.Fatalf("desafiante não deveria receber o próprio convite: %+v", unexpected)
	case <-time.After(30 * time.Millisecond):
	}
}

func TestAcceptedDuelPublishesSafeMatchNoticeToBothParticipants(t *testing.T) {
	repo := newFakeChatRepo()
	repo.profiles["a"] = game.PublicPlayerProfile{CharacterID: "a", Name: "Alice", Level: 10}
	repo.profiles["b"] = game.PublicPlayerProfile{CharacterID: "b", Name: "Bob", Level: 11}
	hub := newWorldChatHubWithBus(repo, newInMemorySocialBus())
	defer hub.Close()
	challenger := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	target := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	if err := hub.Register(challenger, "a"); err != nil {
		t.Fatal(err)
	}
	if err := hub.Register(target, "b"); err != nil {
		t.Fatal(err)
	}
	for len(challenger.SocialChannel) > 0 {
		<-challenger.SocialChannel
	}
	for len(target.SocialChannel) > 0 {
		<-target.SocialChannel
	}
	challenge := game.DuelChallenge{ID: "duel-1", Status: "accepted", Challenger: repo.profiles["a"], Target: repo.profiles["b"]}
	if _, err := hub.CreatePvPMatchFromAcceptedDuel(challenge); err != nil {
		t.Fatal(err)
	}
	assertReady := func(label string, messages <-chan game.SocialMessage) {
		t.Helper()
		select {
		case message := <-messages:
			if message.Type != "PVP_MATCH_READY" || message.PvPMatchNotice == nil || message.PvPMatchNotice.ID != "match-1" {
				t.Fatalf("%s recebeu aviso inválido: %+v", label, message)
			}
		case <-time.After(time.Second):
			t.Fatalf("%s não recebeu aviso da partida pronta", label)
		}
	}
	assertReady("desafiante", challenger.SocialChannel)
	assertReady("desafiado", target.SocialChannel)
}

func TestPvPConfirmationKeepsArenaButtonForOtherParticipant(t *testing.T) {
	repo := newFakeChatRepo()
	repo.profiles["a"] = game.PublicPlayerProfile{CharacterID: "a", Name: "Alice", Level: 10}
	repo.profiles["b"] = game.PublicPlayerProfile{CharacterID: "b", Name: "Bob", Level: 11}
	hub := newWorldChatHubWithBus(repo, newInMemorySocialBus())
	defer hub.Close()
	first := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	second := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	if err := hub.Register(first, "a"); err != nil {
		t.Fatal(err)
	}
	if err := hub.Register(second, "b"); err != nil {
		t.Fatal(err)
	}
	for len(first.SocialChannel) > 0 {
		<-first.SocialChannel
	}
	for len(second.SocialChannel) > 0 {
		<-second.SocialChannel
	}
	if _, started, err := hub.ConfirmPvPMatchParticipant("a", "match-1", "balanced", game.PvPTacticalStrategyVersion); err != nil || started {
		t.Fatalf("primeira confirmação inválida: started=%v err=%v", started, err)
	}
	firstNotice := <-first.SocialChannel
	secondNotice := <-second.SocialChannel
	if firstNotice.Type != "PVP_MATCH_WAITING" || secondNotice.Type != "PVP_MATCH_READY" {
		t.Fatalf("avisos da primeira confirmação inválidos: %s/%s", firstNotice.Type, secondNotice.Type)
	}
	if _, started, err := hub.ConfirmPvPMatchParticipant("b", "match-1", "aggressive", game.PvPTacticalStrategyVersion); err != nil || !started {
		t.Fatalf("segunda confirmação inválida: started=%v err=%v", started, err)
	}
	firstActive := <-first.SocialChannel
	secondActive := <-second.SocialChannel
	if firstActive.Type != "PVP_MATCH_ACTIVE" || secondActive.Type != "PVP_MATCH_ACTIVE" {
		t.Fatalf("arena deveria ficar ativa: %s/%s", firstActive.Type, secondActive.Type)
	}
}

func TestWorldChatRegisterRestoresPendingArenaConfirmation(t *testing.T) {
	repo := newFakeChatRepo()
	repo.profiles["a"] = game.PublicPlayerProfile{CharacterID: "a", Name: "Alice", Level: 10}
	repo.pendingPvP["a"] = game.PvPMatchNotice{ID: "match-1", ArenaKey: "duel_arena", Status: game.PvPMatchReady, PlayerConfirmed: true}
	hub := newWorldChatHubWithBus(repo, newInMemorySocialBus())
	defer hub.Close()
	session := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	if err := hub.Register(session, "a"); err != nil {
		t.Fatal(err)
	}
	message := <-session.SocialChannel
	if message.Type != "SOCIAL_READY" || message.PvPMatchNotice == nil || !message.PvPMatchNotice.PlayerConfirmed {
		t.Fatalf("reconexão deve recompor arena pendente sem expor snapshot: %+v", message)
	}
}

func TestLocalPresenceOwnershipPreventsStaleDisconnect(t *testing.T) {
	presence := newLocalPresenceStore()
	now := time.Date(2026, 8, 27, 18, 0, 0, 0, time.UTC)
	if count, err := presence.Register("hero-1", "session-a", now); err != nil || count != 1 {
		t.Fatalf("registro inicial inválido: count=%d err=%v", count, err)
	}
	if count, err := presence.Register("hero-1", "session-b", now); err != nil || count != 1 {
		t.Fatalf("reconexão deve substituir sem duplicar: count=%d err=%v", count, err)
	}
	if count, err := presence.Unregister("hero-1", "session-a", now); err != nil || count != 1 {
		t.Fatalf("cleanup antigo não pode apagar sessão nova: count=%d err=%v", count, err)
	}
	if _, err := presence.Refresh("hero-1", "session-a", now); err == nil {
		t.Fatal("heartbeat antigo deveria detectar substituição")
	}
	if count, err := presence.Unregister("hero-1", "session-b", now); err != nil || count != 0 {
		t.Fatalf("cleanup da sessão dona inválido: count=%d err=%v", count, err)
	}
}

func TestWorldChatPresenceUsesStoreCount(t *testing.T) {
	repo := newFakeChatRepo()
	repo.profiles["a"] = game.PublicPlayerProfile{CharacterID: "a", Name: "Alice", Level: 10}
	repo.profiles["b"] = game.PublicPlayerProfile{CharacterID: "b", Name: "Bob", Level: 11}
	hub, err := newWorldChatHubWithDependencies(repo, newInMemorySocialBus(), newLocalPresenceStore())
	if err != nil {
		t.Fatal(err)
	}
	defer hub.Close()
	sa := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	sb := &game.GameSession{SocialChannel: make(chan game.SocialMessage, 16)}
	if err := hub.Register(sa, "a"); err != nil {
		t.Fatal(err)
	}
	if err := hub.Register(sb, "b"); err != nil {
		t.Fatal(err)
	}
	if err := hub.Heartbeat("a", sa); err != nil {
		t.Fatal(err)
	}
	if hub.onlineCount != 2 {
		t.Fatalf("presença global esperada=2, recebida=%d", hub.onlineCount)
	}
	hub.Unregister("b", sb)
	if hub.onlineCount != 1 {
		t.Fatalf("presença após desconexão esperada=1, recebida=%d", hub.onlineCount)
	}
}
