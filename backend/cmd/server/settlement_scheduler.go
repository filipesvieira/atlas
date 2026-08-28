package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
)

const (
	settlementSchedulerInterval = 3 * time.Second
	settlementSchedulerRetry    = 5 * time.Second
)

func startSettlementScheduler() {
	go func() {
		for {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			leadership, acquired, err := db.TryAcquireSettlementSchedulerLeadership(ctx)
			cancel()
			if err != nil {
				log.Printf("scheduler do assentamento: erro ao disputar liderança: %v", err)
				time.Sleep(settlementSchedulerRetry)
				continue
			}
			if !acquired {
				time.Sleep(settlementSchedulerRetry)
				continue
			}
			log.Printf("🟢 Scheduler global do assentamento assumido por esta réplica")
			runSettlementSchedulerLeader(leadership)
			releaseCtx, releaseCancel := context.WithTimeout(context.Background(), 3*time.Second)
			if err := leadership.Release(releaseCtx); err != nil {
				log.Printf("scheduler do assentamento: erro ao liberar liderança: %v", err)
			}
			releaseCancel()
		}
	}()
}

func runSettlementSchedulerLeader(leadership *db.SettlementSchedulerLeadership) {
	ticker := time.NewTicker(settlementSchedulerInterval)
	defer ticker.Stop()
	for now := range ticker.C {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		err := leadership.Ping(ctx)
		cancel()
		if err != nil {
			log.Printf("scheduler do assentamento: liderança perdida: %v", err)
			return
		}
		candidates, err := db.ListSettlementAutomationCandidates(now.UTC(), 200)
		if err != nil {
			log.Printf("scheduler do assentamento: %v", err)
			continue
		}
		for _, charID := range candidates {
			processSettlementAutomationCandidate(charID, now.UTC())
		}
	}
}

func processSettlementAutomationCandidate(charID string, now time.Time) {
	gathered, gatheringErr := db.ReconcileCompletedGatherings(charID, now, 24)
	if gatheringErr != nil {
		log.Printf("scheduler: erro na coleta de %s: %v", charID, gatheringErr)
	}
	camp, campChanged, campErr := db.ReconcileCampUpgrades(charID, now)
	if campErr != nil {
		log.Printf("scheduler: erro ao concluir obra de %s: %v", charID, campErr)
	}
	automation, automationErr := db.AdvanceHeroDesires(charID, now)
	if automationErr != nil {
		log.Printf("scheduler: erro na Ambição de %s: %v", charID, automationErr)
	}
	gatheringChanged := gatheringErr == nil && len(gathered) > 0
	automationChanged := automation != nil && automation.Changed
	if !gatheringChanged && !automationChanged && !campChanged {
		return
	}
	eventType := "SETTLEMENT_UPDATED"
	logText := ""
	if campChanged && camp != nil {
		eventType = "BUILDING_UPGRADE_COMPLETED"
		logText = "🏗️ Uma obra do assentamento foi concluída."
	}
	if gatheringChanged {
		eventType = "GATHERING_AUTO_CLAIMED"
		if logText != "" {
			logText += " "
		}
		logText += fmt.Sprintf("🏡 %d trabalhador(es) retornaram sozinho(s) e entregaram a produção.", len(gathered))
	}
	var craftResult *game.CraftResult
	if automationChanged {
		eventType = automation.EventType
		craftResult = automation.CraftResult
		if logText != "" && automation.LogText != "" {
			logText += " "
		}
		logText += automation.LogText
	}
	event := settlementSchedulerEvent{
		CharacterID:      charID,
		EventType:        eventType,
		LogText:          logText,
		CampChanged:      campChanged,
		ResourcesChanged: gatheringChanged || automationChanged,
		InventoryChanged: automationChanged && automation.Inventory != nil,
		CraftResult:      craftResult,
	}
	if automationChanged {
		event.GoldDelta = automation.GoldDelta
		event.CharacterRevision = automation.CharacterRevision
	}
	if err := publishSettlementSchedulerEvent(event); err != nil {
		log.Printf("scheduler: erro ao publicar atualização de %s: %v", charID, err)
	}
}