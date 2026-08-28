package game

import "time"

const (
	SocialStream       = "social"
	ChatChannelWorld   = "world"
	DefaultHeroSkinKey = "peasant"
)

// NormalizeHeroSkinKey mantém o contrato cosmético pequeno e seguro. O cliente
// pode pedir uma skin, mas o backend decide quais chaves podem entrar em snapshots
// públicos do PvP.
func NormalizeHeroSkinKey(key string) string {
	switch key {
	case "peasant", "wanderer", "knight", "archer", "mage":
		return key
	default:
		return DefaultHeroSkinKey
	}
}

// ChatMessage é deliberadamente pequeno: nunca carrega account_id, email ou
// qualquer outro dado privado. A identidade pública é materializada pelo servidor.
type ChatMessage struct {
	ID          string    `json:"id"`
	Channel     string    `json:"channel"`
	SenderID    string    `json:"sender_id"`
	SenderName  string    `json:"sender_name"`
	SenderLevel int       `json:"sender_level"`
	Text        string    `json:"text"`
	CreatedAt   time.Time `json:"created_at"`
}

type PresenceSnapshot struct {
	OnlineCount int `json:"online_count"`
}

type PublicPlayerProfile struct {
	CharacterID string `json:"character_id"`
	Name        string `json:"name"`
	Level       int    `json:"level"`
	Region      string `json:"region,omitempty"`
	Rating      int    `json:"rating"`
	Wins        int    `json:"wins"`
	Losses      int    `json:"losses"`
	CombatPower int    `json:"combat_power,omitempty"`
}

type PvPProfile struct {
	CharacterID string    `json:"character_id"`
	Rating      int       `json:"rating"`
	Wins        int       `json:"wins"`
	Losses      int       `json:"losses"`
	Draws       int       `json:"draws"`
	Season      int       `json:"season"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// DuelChallenge é o convite persistente para um duelo direto. Ele não carrega
// inventário, atributos ou qualquer estado privado; tais snapshots são
// congelados internamente quando o convite é aceito.
type DuelChallenge struct {
	ID          string              `json:"id"`
	RequestID   string              `json:"request_id,omitempty"`
	Status      string              `json:"status"`
	Challenger  PublicPlayerProfile `json:"challenger"`
	Target      PublicPlayerProfile `json:"target"`
	CreatedAt   time.Time           `json:"created_at"`
	ExpiresAt   time.Time           `json:"expires_at"`
	RespondedAt *time.Time          `json:"responded_at,omitempty"`
}

type PvPMatchStatus string

const (
	PvPMatchReady     PvPMatchStatus = "ready"
	PvPMatchActive    PvPMatchStatus = "active"
	PvPMatchCompleted PvPMatchStatus = "completed"
	PvPMatchCancelled PvPMatchStatus = "cancelled"
)

// PvPParticipantSnapshot congela somente os dados que o motor PvP poderá
// usar. Mochila, ouro, recursos e o estado mutável da expedição ficam fora.
type PvPParticipantSnapshot struct {
	CharacterID      string              `json:"character_id"`
	Name             string              `json:"name"`
	Level            int                 `json:"level"`
	Team             CombatTeam          `json:"team"`
	Stance           string              `json:"stance"`
	Health           int                 `json:"health"`
	MaxHealth        int                 `json:"max_health"`
	Mana             int                 `json:"mana"`
	MaxMana          int                 `json:"max_mana"`
	DerivedStats     DerivedStats        `json:"derived_stats"`
	Equipment        EquipmentSlots      `json:"equipment"`
	ActiveSkills     []string            `json:"active_skills"`
	ActiveBuffs      []ActiveBuff        `json:"active_buffs"`
	SkinKey          string              `json:"skin_key"`
	TacticalStrategy PvPTacticalStrategy `json:"tactical_strategy"`
	StrategyVersion  int                 `json:"strategy_version"`
	CombatPower      int                 `json:"combat_power"`
	SnapshotAt       time.Time           `json:"snapshot_at"`
}

type PvPMatch struct {
	ID             string                   `json:"id"`
	ChallengeID    string                   `json:"challenge_id"`
	Mode           CombatInstanceMode       `json:"mode"`
	ArenaKey       string                   `json:"arena_key"`
	Status         PvPMatchStatus           `json:"status"`
	RulesVersion   int                      `json:"rules_version"`
	Seed           int64                    `json:"seed"`
	CreatedAt      time.Time                `json:"created_at"`
	ReadyExpiresAt time.Time                `json:"ready_expires_at"`
	StartedAt      *time.Time               `json:"started_at,omitempty"`
	EndedAt        *time.Time               `json:"ended_at,omitempty"`
	Participants   []PvPParticipantSnapshot `json:"participants"`
	LastTick       uint64                   `json:"-"`
	MatchOrigin    string                   `json:"match_origin,omitempty"`
	RuntimeState   *PvPCombatRuntimeState   `json:"-"`
}

// PvPMatchNotice é a visão segura entregue ao cliente. Os snapshots completos
// de atributos, equipamentos, habilidades e buffs ficam somente no servidor.
type PvPMatchNotice struct {
	ID               string              `json:"id"`
	ChallengeID      string              `json:"challenge_id"`
	ArenaKey         string              `json:"arena_key"`
	Status           PvPMatchStatus      `json:"status"`
	RulesVersion     int                 `json:"rules_version"`
	CreatedAt        time.Time           `json:"created_at"`
	PlayerConfirmed  bool                `json:"player_confirmed"`
	TacticalStrategy PvPTacticalStrategy `json:"tactical_strategy"`
	StrategyVersion  int                 `json:"strategy_version"`
}

type PvPMatchHistoryEntry struct {
	MatchID       string    `json:"match_id"`
	Origin        string    `json:"origin"`
	OpponentID    string    `json:"opponent_id"`
	OpponentName  string    `json:"opponent_name"`
	Result        string    `json:"result"`
	RatingBefore  int       `json:"rating_before"`
	RatingAfter   int       `json:"rating_after"`
	RatingDelta   int       `json:"rating_delta"`
	CombatPower   int       `json:"combat_power"`
	OpponentPower int       `json:"opponent_power"`
	StartedAt     time.Time `json:"started_at"`
	EndedAt       time.Time `json:"ended_at"`
}

type PvPReplayEvent struct {
	Sequence  int            `json:"sequence"`
	EventType string         `json:"event_type"`
	Payload   map[string]any `json:"payload"`
	CreatedAt time.Time      `json:"created_at"`
}

type PvPMatchReplay struct {
	MatchID string           `json:"match_id"`
	Events  []PvPReplayEvent `json:"events"`
}

type PvPMatchmakingStatus struct {
	Queued      bool      `json:"queued"`
	Rating      int       `json:"rating"`
	CombatPower int       `json:"combat_power"`
	QueuedAt    time.Time `json:"queued_at,omitempty"`
}

// SocialMessage usa o mesmo socket físico, mas um stream e fila separados do
// estado do jogo. Eventos sociais nunca incrementam SequenceCounter/StateRevision.
type SocialMessage struct {
	ProtocolVersion int                    `json:"protocol_version"`
	Stream          string                 `json:"stream"`
	Type            string                 `json:"type"`
	Timestamp       string                 `json:"timestamp"`
	RequestID       string                 `json:"request_id,omitempty"`
	ChatMessage     *ChatMessage           `json:"chat_message,omitempty"`
	ChatHistory     []ChatMessage          `json:"chat_history,omitempty"`
	Presence        *PresenceSnapshot      `json:"presence,omitempty"`
	PublicProfile   *PublicPlayerProfile   `json:"public_profile,omitempty"`
	DuelChallenge   *DuelChallenge         `json:"duel_challenge,omitempty"`
	DuelChallenges  []DuelChallenge        `json:"duel_challenges,omitempty"`
	PvPMatchNotice  *PvPMatchNotice        `json:"pvp_match_notice,omitempty"`
	PvPCombat       *PvPCombatSnapshot     `json:"pvp_combat,omitempty"`
	PvPHistory      []PvPMatchHistoryEntry `json:"pvp_history,omitempty"`
	PvPReplay       *PvPMatchReplay        `json:"pvp_replay,omitempty"`
	Matchmaking     *PvPMatchmakingStatus  `json:"pvp_matchmaking,omitempty"`
	Error           string                 `json:"error,omitempty"`
}

// Tipos abaixo são contratos preparatórios. O PvE atual continua usando
// GameSession/Monster; a migração para CombatInstance será incremental.
type CombatActorType string
type CombatTeam string
type CombatInstanceMode string

const (
	CombatActorHero     CombatActorType = "hero"
	CombatActorMonster  CombatActorType = "monster"
	CombatActorResident CombatActorType = "resident"
	CombatActorGuard    CombatActorType = "guard"

	CombatTeamA CombatTeam = "a"
	CombatTeamB CombatTeam = "b"

	CombatModePvE     CombatInstanceMode = "pve"
	CombatModeDuel    CombatInstanceMode = "duel"
	CombatModeArena   CombatInstanceMode = "arena"
	CombatModeKingdom CombatInstanceMode = "kingdom_raid"
)

type CombatActor struct {
	ID        string          `json:"id"`
	Type      CombatActorType `json:"type"`
	Team      CombatTeam      `json:"team"`
	Name      string          `json:"name"`
	Level     int             `json:"level"`
	Health    int             `json:"health"`
	MaxHealth int             `json:"max_health"`
	Mana      int             `json:"mana"`
	MaxMana   int             `json:"max_mana"`
	GridX     int             `json:"grid_x"`
	GridY     int             `json:"grid_y"`
	State     string          `json:"state"`
	TargetID  string          `json:"target_id,omitempty"`
}

type CombatInstance struct {
	ID        string             `json:"id"`
	Mode      CombatInstanceMode `json:"mode"`
	ArenaKey  string             `json:"arena_key"`
	Actors    []CombatActor      `json:"actors"`
	StartedAt time.Time          `json:"started_at"`
	EndedAt   *time.Time         `json:"ended_at,omitempty"`
}
