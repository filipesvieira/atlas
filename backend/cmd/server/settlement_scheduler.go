package main

import (
	"fmt"
	"log"
	"time"

	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
)

func startSettlementScheduler() {
	go func() {
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()
		for now := range ticker.C {
			candidates, err := db.ListSettlementAutomationCandidates(now.UTC(), 200)
			if err != nil {
				log.Printf("scheduler do assentamento: %v", err)
				continue
			}
			for _, charID := range candidates {
				processSettlementAutomationCandidate(charID, now.UTC())
			}
		}
	}()
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

	sessionsMu.Lock()
	session := activeSessions[charID]
	sessionsMu.Unlock()
	if session == nil {
		return // estado já foi persistido; será carregado no próximo login
	}
	if automationChanged {
		applySettlementAutomationUpdate(session, automation)
	}
	economy, err := db.GetCharacterEconomyState(charID)
	if err != nil {
		log.Printf("scheduler: erro ao sincronizar economia de %s: %v", charID, err)
		return
	}
	var resourceInventory *game.ResourceInventorySnapshot
	if gatheringChanged {
		resourceInventory, err = db.GetCharacterResourceSnapshot(charID)
		if err != nil {
			log.Printf("scheduler: erro ao sincronizar depósito de %s: %v", charID, err)
			return
		}
	} else if automation != nil {
		resourceInventory = automation.ResourceInventory
	}

	session.Mu.Lock()
	if campChanged && camp != nil {
		session.Camp = camp
	}
	if resourceInventory != nil {
		session.Resources = map[string]int64{}
		for _, resource := range resourceInventory.Items {
			session.Resources[resource.Key] = resource.Quantity
		}
		if session.Camp != nil {
			session.Camp.StorageUsed = resourceInventory.StorageUsed
			session.Camp.StorageCapacity = resourceInventory.StorageCapacity
			session.Camp.StateRevision = resourceInventory.Revision
		}
	}
	eventType := "SETTLEMENT_UPDATED"
	logText := ""
	var craftResult *game.CraftResult
	if campChanged {
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
	if automationChanged {
		eventType = automation.EventType
		craftResult = automation.CraftResult
		if logText != "" && automation.LogText != "" {
			logText += " "
		}
		logText += automation.LogText
	}
	message := game.CombatMessage{
		Type: eventType, Timestamp: time.Now().Format("15:04:05"),
		Character: game.CloneCharacterSnapshot(session.Character), Economy: economy,
		Inventory:         game.CloneInventorySnapshot(session.Inventory),
		ResourceInventory: resourceInventory, CraftResult: craftResult,
		Camp: game.CloneCampSnapshot(session.Camp), LogText: logText,
	}
	session.SendMessageLocked(message)
	session.Mu.Unlock()
}