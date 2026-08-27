package game

import (
	"encoding/json"
	"testing"
)

func TestGetEventCategory(t *testing.T) {
	criticalEvents := []string{
		"LOOT_DROP", "LEVEL_UP", "EQUIPMENT_UPDATE", "BULK_SELL_COMPLETED",
		"SALVAGE_COMPLETED", "SALVAGE_BATCH_COMPLETED", "BLUEPRINT_LEARNED",
		"BUILDING_UPGRADE_STARTED", "BUILDING_UPGRADE_COMPLETED", "RESOURCE_DISCARDED",
		"DISCOVERY_EVENT", "OVERFLOW_ITEM_CLAIMED", "AUTO_SELL_COMPLETED",
		"AUTO_SELL_SETTINGS_UPDATED", "STATE_SNAPSHOT", "WELCOME_EVENT", "REGION_UNLOCKED",
		"CAMP_ERROR", "ERROR", "UNKNOWN_FUTURE_ACTION",
	}
	for _, ev := range criticalEvents {
		cat := GetEventCategory(ev)
		if cat != EventCategoryCritical {
			t.Errorf("Esperado EventCategoryCritical para %s, mas obteve %v", ev, cat)
		}
	}

	stateEvents := []string{"TICK_UPDATE", "STANCE_UPDATE", "EXPEDITION_STATUS", "AUTO_SELL_PREVIEW", "STAGE_ADVANCE"}
	for _, ev := range stateEvents {
		cat := GetEventCategory(ev)
		if cat != EventCategoryState {
			t.Errorf("Esperado EventCategoryState para %s, mas obteve %v", ev, cat)
		}
	}

	ephemeralEvents := []string{"COMBAT_EVENT", "SKILL_CAST", "FLOATER_TEXT", "HEAL_EVENT"}
	for _, ev := range ephemeralEvents {
		cat := GetEventCategory(ev)
		if cat != EventCategoryEphemeral {
			t.Errorf("Esperado EventCategoryEphemeral para %s, mas obteve %v", ev, cat)
		}
	}
}

func TestNewWsEnvelope(t *testing.T) {
	type SamplePayload struct {
		Gold int64 `json:"gold"`
	}
	payload := SamplePayload{Gold: 1500}
	env, err := NewWsEnvelope(42, "GOLD_UPDATED", "req-123", 5, payload)
	if err != nil {
		t.Fatalf("Erro inesperado ao criar envelope: %v", err)
	}

	if env.ProtocolVersion != 3 {
		t.Errorf("Esperado ProtocolVersion 3, obteve %d", env.ProtocolVersion)
	}
	if env.Sequence != 42 {
		t.Errorf("Esperado Sequence 42, obteve %d", env.Sequence)
	}
	if env.RequestID != "req-123" {
		t.Errorf("Esperado RequestID req-123, obteve %s", env.RequestID)
	}
	if env.StateRevision != 5 {
		t.Errorf("Esperado StateRevision 5, obteve %d", env.StateRevision)
	}

	bytes, err := json.Marshal(env)
	if err != nil {
		t.Fatalf("Erro ao serializar envelope: %v", err)
	}

	var roundtrip WsEnvelope
	if err := json.Unmarshal(bytes, &roundtrip); err != nil {
		t.Fatalf("Erro ao deserializar envelope: %v", err)
	}

	if roundtrip.Type != "GOLD_UPDATED" || roundtrip.Sequence != 42 {
		t.Errorf("Valores corrompidos no roundtrip: %+v", roundtrip)
	}
}
