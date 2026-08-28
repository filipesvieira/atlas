package game

import (
	"encoding/json"
	"time"
)

// EventCategory classifica a criticidade de entrega de uma mensagem WebSocket.
type EventCategory int

const (
	// EventCategoryCritical: Mutações de inventário, ouro, XP/Level, itens e construções. NUNCA descartar.
	EventCategoryCritical EventCategory = iota
	// EventCategoryState: Atualizações regulares de estado (HP, Mana, Monstros, Fase). Podem coalescer.
	EventCategoryState
	// EventCategoryEphemeral: Efeitos puramente visuais (dano, floaters, sons). Podem ser descartados em sobrecarga.
	EventCategoryEphemeral
)

// WsEnvelope representa o contrato oficial padronizado do WebSocket V3.
type WsEnvelope struct {
	ProtocolVersion int             `json:"protocol_version"`
	RequestID       string          `json:"request_id,omitempty"`
	Sequence        uint64          `json:"seq"`
	Type            string          `json:"type"`
	Timestamp       string          `json:"timestamp"`
	StateRevision   int64           `json:"state_revision,omitempty"`
	Payload         json.RawMessage `json:"payload,omitempty"`
	Error           string          `json:"error,omitempty"`
}

// ClientMessageV2 representa uma intenção de comando enviada pelo cliente no protocolo V3.
type ClientMessageV2 struct {
	ProtocolVersion  int             `json:"protocol_version"`
	RequestID        string          `json:"request_id,omitempty"`
	Action           string          `json:"action"`
	ExpectedRevision int64           `json:"expected_revision,omitempty"`
	Payload          json.RawMessage `json:"payload,omitempty"`
}

// GetEventCategory mapeia o tipo da mensagem para sua criticidade correspondente.
func GetEventCategory(msgType string) EventCategory {
	switch msgType {
	case "LOOT_DROP",
		"LEVEL_UP",
		"EQUIPMENT_UPDATE",
		"BULK_SELL_COMPLETED",
		"SALVAGE_COMPLETED",
		"SALVAGE_BATCH_COMPLETED",
		"BLUEPRINT_LEARNED",
		"BUILDING_UPGRADE_STARTED",
		"BUILDING_UPGRADE_COMPLETED",
		"CAMP_LAYOUT_UPDATED",
		"RESOURCE_DISCARDED",
		"DISCOVERY_EVENT",
		"OVERFLOW_ITEM_CLAIMED",
		"AUTO_SELL_COMPLETED",
		"AUTO_SELL_SETTINGS_UPDATED",
		"GATHERING_STARTED",
		"GATHERING_CANCELLED",
		"GATHERING_CLAIMED",
		"CRAFT_PREVIEW",
		"CRAFT_COMPLETED",
		"PENDING_CRAFT_CLAIMED",
		"ECONOMY_SYNC",
		"STATE_SNAPSHOT",
		"WELCOME_EVENT",
		"REGION_UNLOCKED",
		"CAMP_ERROR",
		"ERROR":
		return EventCategoryCritical

	case "TICK_UPDATE",
		"STANCE_UPDATE",
		"EXPEDITION_STATUS",
		"AUTO_SELL_PREVIEW",
		"STAGE_ADVANCE",
		"HERO_MOVEMENT":
		return EventCategoryState

	case "COMBAT_EVENT",
		"SKILL_CAST",
		"FLOATER_TEXT",
		"HEAL_EVENT":
		return EventCategoryEphemeral

	default:
		// Por precaução e integridade econômica, tipos desconhecidos são tratados como críticos.
		return EventCategoryCritical
	}
}

// NewWsEnvelope cria um envelope estruturado a partir de dados tipados.
func NewWsEnvelope(seq uint64, msgType string, reqID string, rev int64, payload interface{}) (WsEnvelope, error) {
	var raw json.RawMessage
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return WsEnvelope{}, err
		}
		raw = b
	}
	return WsEnvelope{
		ProtocolVersion: 3,
		RequestID:       reqID,
		Sequence:        seq,
		Type:            msgType,
		Timestamp:       time.Now().Format("15:04:05"),
		StateRevision:   rev,
		Payload:         raw,
	}, nil
}