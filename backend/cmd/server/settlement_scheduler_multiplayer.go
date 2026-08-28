package main

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
)

const settlementSchedulerTopic = "atlas.settlement.scheduler.v1"

// settlementSchedulerEvent é pequeno de propósito: o banco permanece a fonte
// autoritativa e cada réplica recarrega apenas o snapshot da sessão que ela
// possui localmente. Assim não replicamos estado de combate nem inventários
// mutáveis via Pub/Sub.
type settlementSchedulerEvent struct {
	CharacterID       string            `json:"character_id"`
	EventType         string            `json:"event_type"`
	LogText           string            `json:"log_text,omitempty"`
	CampChanged       bool              `json:"camp_changed,omitempty"`
	ResourcesChanged  bool              `json:"resources_changed,omitempty"`
	InventoryChanged  bool              `json:"inventory_changed,omitempty"`
	GoldDelta         int64             `json:"gold_delta,omitempty"`
	CharacterRevision int64             `json:"character_revision,omitempty"`
	CraftResult       *game.CraftResult `json:"craft_result,omitempty"`
}

type settlementSchedulerBus interface {
	Publish(topic string, event settlementSchedulerEvent) error
	Subscribe(topic string, handler func(settlementSchedulerEvent)) (func(), error)
}

type inMemorySettlementSchedulerBus struct {
	mu          sync.RWMutex
	subscribers map[string]map[uint64]func(settlementSchedulerEvent)
	nextID      uint64
}

func newInMemorySettlementSchedulerBus() *inMemorySettlementSchedulerBus {
	return &inMemorySettlementSchedulerBus{subscribers: map[string]map[uint64]func(settlementSchedulerEvent){}}
}

func (b *inMemorySettlementSchedulerBus) Publish(topic string, event settlementSchedulerEvent) error {
	b.mu.RLock()
	handlers := make([]func(settlementSchedulerEvent), 0, len(b.subscribers[topic]))
	for _, handler := range b.subscribers[topic] {
		handlers = append(handlers, handler)
	}
	b.mu.RUnlock()
	for _, handler := range handlers {
		handler(event)
	}
	return nil
}

func (b *inMemorySettlementSchedulerBus) Subscribe(topic string, handler func(settlementSchedulerEvent)) (func(), error) {
	if handler == nil {
		return nil, fmt.Errorf("assinatura do scheduler inválida")
	}
	b.mu.Lock()
	b.nextID++
	id := b.nextID
	if b.subscribers[topic] == nil {
		b.subscribers[topic] = map[uint64]func(settlementSchedulerEvent){}
	}
	b.subscribers[topic][id] = handler
	b.mu.Unlock()
	var once sync.Once
	return func() {
		once.Do(func() {
			b.mu.Lock()
			delete(b.subscribers[topic], id)
			b.mu.Unlock()
		})
	}, nil
}

var (
	settlementSchedulerBusMu sync.RWMutex
	settlementUpdatesBus     settlementSchedulerBus = newInMemorySettlementSchedulerBus()
	settlementUpdatesStop    func()
)

func init() {
	if err := configureSettlementSchedulerBus(settlementUpdatesBus); err != nil {
		panic(err)
	}
}

func configureSettlementSchedulerBus(bus settlementSchedulerBus) error {
	if bus == nil {
		return fmt.Errorf("barramento do scheduler ausente")
	}
	stop, err := bus.Subscribe(settlementSchedulerTopic, synchronizeSettlementSchedulerEvent)
	if err != nil {
		return err
	}
	settlementSchedulerBusMu.Lock()
	previousStop := settlementUpdatesStop
	settlementUpdatesBus = bus
	settlementUpdatesStop = stop
	settlementSchedulerBusMu.Unlock()
	if previousStop != nil {
		previousStop()
	}
	return nil
}

func publishSettlementSchedulerEvent(event settlementSchedulerEvent) error {
	settlementSchedulerBusMu.RLock()
	bus := settlementUpdatesBus
	settlementSchedulerBusMu.RUnlock()
	return bus.Publish(settlementSchedulerTopic, event)
}

// synchronizeSettlementSchedulerEvent atualiza somente a sessão que está
// hospedada nesta réplica. A notificação pode ser consumida também pela líder;
// a recarga por revisões torna isso idempotente.
func synchronizeSettlementSchedulerEvent(event settlementSchedulerEvent) {
	if event.CharacterID == "" {
		return
	}
	sessionsMu.Lock()
	session := activeSessions[event.CharacterID]
	sessionsMu.Unlock()
	if session == nil {
		return
	}

	economy, err := db.GetCharacterEconomyState(event.CharacterID)
	if err != nil {
		log.Printf("scheduler: erro ao sincronizar economia de %s: %v", event.CharacterID, err)
		return
	}

	var camp *game.CampState
	if event.CampChanged {
		camp, err = db.GetCharacterCamp(event.CharacterID)
		if err != nil {
			log.Printf("scheduler: erro ao sincronizar acampamento de %s: %v", event.CharacterID, err)
			return
		}
	}

	var resources *game.ResourceInventorySnapshot
	if event.ResourcesChanged {
		resources, err = db.GetCharacterResourceSnapshot(event.CharacterID)
		if err != nil {
			log.Printf("scheduler: erro ao sincronizar depósito de %s: %v", event.CharacterID, err)
			return
		}
	}

	var inventory *game.InventoryData
	if event.InventoryChanged {
		var stored *db.Inventory
		stored, err = db.GetCharacterInventory(event.CharacterID)
		if err != nil {
			log.Printf("scheduler: erro ao sincronizar mochila de %s: %v", event.CharacterID, err)
			return
		}
		inventory = db.ConvertDBInvToGameInv(stored)
	}

	session.Mu.Lock()
	if event.CampChanged && camp != nil && (session.Camp == nil || camp.StateRevision >= session.Camp.StateRevision) {
		session.Camp = camp
	}
	if resources != nil && (session.Camp == nil || resources.Revision >= session.Camp.StateRevision) {
		session.Resources = map[string]int64{}
		for _, resource := range resources.Items {
			session.Resources[resource.Key] = resource.Quantity
		}
		if session.Camp != nil {
			session.Camp.StorageUsed = resources.StorageUsed
			session.Camp.StorageCapacity = resources.StorageCapacity
			session.Camp.StateRevision = resources.Revision
		}
	}
	if inventory != nil && (session.Inventory == nil || inventory.Revision >= session.Inventory.Revision) {
		session.Inventory = game.CloneInventorySnapshot(inventory)
	}
	if session.Character != nil && event.CharacterRevision >= session.Character.StateRevision {
		if event.GoldDelta != 0 {
			session.Character.GoldBank += event.GoldDelta
		}
		session.Character.StateRevision = event.CharacterRevision
	}
	message := game.CombatMessage{
		Type:              event.EventType,
		Timestamp:         time.Now().Format("15:04:05"),
		Character:         game.CloneCharacterSnapshot(session.Character),
		Economy:           economy,
		Inventory:         game.CloneInventorySnapshot(session.Inventory),
		ResourceInventory: resources,
		CraftResult:       event.CraftResult,
		Camp:              game.CloneCampSnapshot(session.Camp),
		LogText:           event.LogText,
	}
	session.SendMessageLocked(message)
	session.Mu.Unlock()
}