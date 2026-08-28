package main

import "testing"

func TestInMemorySettlementSchedulerBusDeliversAndUnsubscribes(t *testing.T) {
	bus := newInMemorySettlementSchedulerBus()
	received := make(chan settlementSchedulerEvent, 1)
	stop, err := bus.Subscribe(settlementSchedulerTopic, func(event settlementSchedulerEvent) {
		received <- event
	})
	if err != nil {
		t.Fatal(err)
	}
	first := settlementSchedulerEvent{CharacterID: "hero-1", EventType: "GATHERING_AUTO_CLAIMED"}
	if err := bus.Publish(settlementSchedulerTopic, first); err != nil {
		t.Fatal(err)
	}
	if got := <-received; got != first {
		t.Fatalf("evento recebido=%+v, esperado=%+v", got, first)
	}

	stop()
	if err := bus.Publish(settlementSchedulerTopic, settlementSchedulerEvent{CharacterID: "hero-2"}); err != nil {
		t.Fatal(err)
	}
	select {
	case unexpected := <-received:
		t.Fatalf("assinatura removida recebeu evento: %+v", unexpected)
	default:
	}
}