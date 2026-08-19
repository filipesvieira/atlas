package main

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
)

// CommandContext contém o contexto seguro e referências necessárias para executar um comando.
type CommandContext struct {
	AccountID string
	CharID    string
	Session   *game.GameSession
	Action    ClientAction
}

// CommandHandler define a assinatura de uma função que processa um comando WebSocket.
type CommandHandler func(ctx *CommandContext) error

var economyCommandLimiter = struct {
	sync.Mutex
	hits  map[string][]time.Time
	calls uint64
}{hits: make(map[string][]time.Time)}

func economyCommandLimit(action string) (int, time.Duration, bool) {
	switch action {
	case "REQUEST_CRAFT_PREVIEW":
		return 20, time.Second, true
	case "REQUEST_ECONOMY_SYNC":
		return 10, time.Second, true
	case "CRAFT_ITEM":
		return 50, 2 * time.Second, true
	case "START_GATHERING", "CANCEL_GATHERING", "CLAIM_GATHERING_REWARDS", "CLAIM_PENDING_CRAFT", "CLAIM_PENDING_RESOURCES", "CREATE_HERO_DESIRE", "CANCEL_HERO_DESIRE", "CLAIM_ARMORY_ITEM":
		return 10, 2 * time.Second, true
	default:
		return 0, 0, false
	}
}

func allowEconomyCommand(charID, action string, now time.Time) bool {
	limit, window, limited := economyCommandLimit(action)
	if !limited {
		return true
	}
	key := charID + ":" + action
	economyCommandLimiter.Lock()
	defer economyCommandLimiter.Unlock()
	cutoff := now.Add(-window)
	recent := economyCommandLimiter.hits[key][:0]
	for _, hit := range economyCommandLimiter.hits[key] {
		if hit.After(cutoff) {
			recent = append(recent, hit)
		}
	}
	if len(recent) >= limit {
		economyCommandLimiter.hits[key] = recent
		return false
	}
	economyCommandLimiter.hits[key] = append(recent, now)
	economyCommandLimiter.calls++
	if economyCommandLimiter.calls%256 == 0 {
		stale := now.Add(-10 * time.Minute)
		for candidate, hits := range economyCommandLimiter.hits {
			if len(hits) == 0 || hits[len(hits)-1].Before(stale) {
				delete(economyCommandLimiter.hits, candidate)
			}
		}
	}
	return true
}

var commandHandlers = map[string]CommandHandler{
	"TOGGLE_EXPEDITION":         handleToggleExpedition,
	"EQUIP_ITEM":                handleEquipItem,
	"UNEQUIP_ITEM":              handleUnequipItem,
	"CHANGE_REGION":             handleChangeRegion,
	"SET_STANCE":                handleSetStance,
	"DISCARD_ITEM":              handleDiscardItem,
	"TOGGLE_SKILL":              handleToggleSkill,
	"ALLOCATE_STAT":             handleAllocateStat,
	"CHOOSE_STARTER_PACK":       handleChooseStarterPack,
	"BULK_SELL":                 handleBulkSell,
	"SET_AUTO_RESUME":           handleSetAutoResume,
	"START_BUILDING_UPGRADE":    handleStartBuildingUpgrade,
	"DISCARD_RESOURCE":          handleDiscardResource,
	"SALVAGE_PREVIEW":           handleSalvagePreview,
	"SALVAGE_ITEM":              handleSalvageItem,
	"LEARN_BUILDING_BLUEPRINT":  handleLearnBuildingBlueprint,
	"SALVAGE_BATCH":             handleSalvageBatch,
	"UPDATE_AUTO_SELL_SETTINGS": handleUpdateAutoSellSettings,
	"REQUEST_AUTO_SELL_PREVIEW": handleRequestAutoSellPreview,
	"CLAIM_OVERFLOW_ITEM":       handleClaimOverflowItem,
	"SELL_OVERFLOW_ITEM":        handleSellOverflowItem,
	"SELL_ALL_OVERFLOW":         handleSellAllOverflow,
	"REQUEST_STATE_SYNC":        handleRequestStateSync,
	"START_GATHERING":           handleStartGathering,
	"CANCEL_GATHERING":          handleCancelGathering,
	"CLAIM_GATHERING_REWARDS":   handleClaimGathering,
	"REQUEST_CRAFT_PREVIEW":     handleCraftPreview,
	"CRAFT_ITEM":                handleCraftItem,
	"REQUEST_ECONOMY_SYNC":      handleEconomySync,
	"CLAIM_PENDING_CRAFT":       handleClaimPendingCraft,
	"CLAIM_PENDING_RESOURCES":   handleClaimPendingResources,
	"CREATE_HERO_DESIRE":        handleCreateHeroDesire,
	"CANCEL_HERO_DESIRE":        handleCancelHeroDesire,
	"CLAIM_ARMORY_ITEM":         handleClaimArmoryItem,
}

// DispatchCommand executa o handler apropriado para a ação recebida.
func DispatchCommand(ctx *CommandContext) error {
	if ctx == nil || ctx.Session == nil {
		return fmt.Errorf("contexto ou sessão inválida")
	}
	handler, exists := commandHandlers[ctx.Action.Action]
	if !exists {
		log.Printf("⚠️ Ação WebSocket desconhecida ou não registrada: %s (char: %s)", ctx.Action.Action, ctx.CharID)
		return nil
	}
	if len(ctx.Action.RequestID) > 100 || len(ctx.Action.ExpeditionKey) > 80 || len(ctx.Action.RecipeKey) > 160 || len(ctx.Action.CatalystKey) > 80 || len(ctx.Action.ActivityID) > 64 || len(ctx.Action.DesireID) > 64 || len(ctx.Action.ArmoryID) > 64 || len(ctx.Action.TargetRarity) > 30 || len(ctx.Action.ItemIDs) > 1000 {
		return sendEconomyError(ctx, fmt.Errorf("payload econômico excede os limites permitidos"))
	}
	if !allowEconomyCommand(ctx.CharID, ctx.Action.Action, time.Now().UTC()) {
		return sendEconomyError(ctx, fmt.Errorf("muitas operações em sequência; aguarde um instante"))
	}
	return handler(ctx)
}

func handleToggleExpedition(ctx *CommandContext) error {
	ctx.Session.ToggleExpedition()
	return nil
}

func handleEquipItem(ctx *CommandContext) error {
	ctx.Session.EquipItem(ctx.Action.ItemID, ctx.Action.Slot)
	return nil
}

func handleUnequipItem(ctx *CommandContext) error {
	ctx.Session.UnequipItem(ctx.Action.Slot)
	return nil
}

func handleChangeRegion(ctx *CommandContext) error {
	targetReg := ctx.Action.RegionID
	if targetReg == "" {
		targetReg = ctx.Action.Region
	}
	ctx.Session.SelectRegion(targetReg)
	return nil
}

func handleSetStance(ctx *CommandContext) error {
	ctx.Session.SetStance(ctx.Action.Stance)
	return nil
}

func handleDiscardItem(ctx *CommandContext) error {
	ctx.Session.DiscardItem(ctx.Action.ItemID)
	return nil
}

func handleToggleSkill(ctx *CommandContext) error {
	ctx.Session.ToggleSkill(ctx.Action.Skill)
	return nil
}

func handleAllocateStat(ctx *CommandContext) error {
	ctx.Session.AllocateStat(ctx.Action.Stat)
	return nil
}

func handleChooseStarterPack(ctx *CommandContext) error {
	ctx.Session.ChooseStarterPack(ctx.Action.Pack)
	return nil
}

func handleBulkSell(ctx *CommandContext) error {
	ctx.Session.BulkSell(ctx.Action.ItemIDs)
	return nil
}

func handleSetAutoResume(ctx *CommandContext) error {
	ctx.Session.SetAutoResumeExpedition(ctx.Action.Enabled)
	return nil
}

func handleStartBuildingUpgrade(ctx *CommandContext) error {
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()
	slotKey := ctx.Action.SlotKey
	buildingKey := ctx.Action.BuildingKey
	if slotKey == "" && buildingKey != "" {
		if bDef, ok := game.GetBuildingDefinition(buildingKey); ok {
			slotKey = bDef.SlotType
		}
	}
	if buildingKey == "" && slotKey != "" {
		buildingKey = game.SlotToBuildingMap[slotKey]
	}
	updatedCamp, err := db.StartBuildingUpgrade(ctx.AccountID, ctx.CharID, slotKey, buildingKey)
	if err != nil {
		ctx.Session.SendMessageLocked(game.CombatMessage{
			Type:      "CAMP_ERROR",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("❌ Erro na construção: %v", err),
		})
		return err
	}
	ctx.Session.Camp = updatedCamp
	updatedRes, resourcesErr := db.GetCharacterResources(ctx.CharID)
	if resourcesErr != nil {
		log.Printf("erro ao recarregar recursos após obra do personagem %s: %v", ctx.CharID, resourcesErr)
	} else {
		ctx.Session.Resources = updatedRes
	}
	if updatedChar, err := db.GetCharacterByID(ctx.CharID); err == nil {
		ctx.Session.Character.GoldBank = updatedChar.GoldBank
		ctx.Session.Character.StateRevision = updatedChar.StateRevision
	} else {
		log.Printf("erro ao recarregar personagem após obra %s: %v", ctx.CharID, err)
	}
	updatedResSnap, snapshotErr := db.GetCharacterResourceSnapshot(ctx.CharID)
	if snapshotErr != nil {
		log.Printf("erro ao recarregar depósito após obra do personagem %s: %v", ctx.CharID, snapshotErr)
	}
	buildingName := buildingKey
	if definition, exists := game.GetBuildingDefinition(buildingKey); exists && definition.Name != "" {
		buildingName = definition.Name
	}
	targetLevel := 0
	completedImmediately := false
	if updatedCamp != nil {
		if slot, exists := updatedCamp.Buildings[slotKey]; exists {
			targetLevel = slot.UpgradeTargetLevel
			if targetLevel == 0 {
				targetLevel = slot.Level
				completedImmediately = true
			}
		}
	}
	logText := fmt.Sprintf("🔨 Melhoria de %s para o nível %d iniciada com sucesso!", buildingName, targetLevel)
	if completedImmediately {
		logText = fmt.Sprintf("🔨 Melhoria de %s para o nível %d concluída instantaneamente no modo QA!", buildingName, targetLevel)
	}
	ctx.Session.SendMessageLocked(game.CombatMessage{
		Type:              "BUILDING_UPGRADE_STARTED",
		Timestamp:         time.Now().Format("15:04:05"),
		Character:         game.CloneCharacterSnapshot(ctx.Session.Character),
		Camp:              game.CloneCampSnapshot(ctx.Session.Camp),
		ResourceInventory: updatedResSnap,
		LogText:           logText,
	})
	return nil
}

func handleDiscardResource(ctx *CommandContext) error {
	snap, err := db.DiscardCharacterResource(ctx.CharID, ctx.Action.ResourceKey, ctx.Action.Quantity, ctx.Action.ExpectedRevision)
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()
	if err != nil {
		ctx.Session.SendMessageLocked(game.CombatMessage{
			Type:      "CAMP_ERROR",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("❌ Erro ao descartar material: %v", err),
		})
		return err
	}
	ctx.Session.Resources = make(map[string]int64)
	for _, it := range snap.Items {
		ctx.Session.Resources[it.Key] = it.Quantity
	}
	if ctx.Session.Camp != nil {
		ctx.Session.Camp.StorageUsed = snap.StorageUsed
		ctx.Session.Camp.StateRevision = snap.Revision
	}
	resDef, _ := game.GetResourceDefinition(ctx.Action.ResourceKey)
	resName := ctx.Action.ResourceKey
	if resDef.Name != "" {
		resName = resDef.Name
	}
	ctx.Session.SendMessageLocked(game.CombatMessage{
		Type:              "RESOURCE_DISCARDED",
		Timestamp:         time.Now().Format("15:04:05"),
		Character:         game.CloneCharacterSnapshot(ctx.Session.Character),
		Camp:              game.CloneCampSnapshot(ctx.Session.Camp),
		ResourceInventory: snap,
		LogText:           fmt.Sprintf("🗑️ %d unidades de %s descartadas.", ctx.Action.Quantity, resName),
	})
	return nil
}

func handleSalvagePreview(ctx *CommandContext) error {
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()

	var targetItem *game.Item
	if ctx.Session.Inventory != nil {
		for _, it := range ctx.Session.Inventory.Backpack {
			if it.ID == ctx.Action.ItemID {
				itemCopy := it
				targetItem = &itemCopy
				break
			}
		}
	}
	var efficiency float64
	if ctx.Session.Camp != nil {
		bonuses := game.CalculateCampBonuses(ctx.Session.Camp.Buildings)
		efficiency = bonuses.SalvageEfficiencyPercent
	}
	if targetItem != nil {
		yield, err := game.CalculateSalvageYield(targetItem, efficiency)
		if err == nil {
			ctx.Session.SendMessageLocked(game.CombatMessage{
				Type:          "SALVAGE_PREVIEW",
				Timestamp:     time.Now().Format("15:04:05"),
				ItemFound:     targetItem,
				ResourceDrops: yield,
			})
		}
	}
	return nil
}

func handleSalvageItem(ctx *CommandContext) error {
	var efficiency float64
	ctx.Session.Mu.Lock()
	if ctx.Session.Camp != nil {
		bonuses := game.CalculateCampBonuses(ctx.Session.Camp.Buildings)
		efficiency = bonuses.SalvageEfficiencyPercent
	}
	ctx.Session.Mu.Unlock()

	salvagedItem, yield, updatedSnap, err := db.SalvageItemAtomically(ctx.CharID, ctx.Action.ItemID, efficiency)
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()
	if err != nil {
		ctx.Session.SendMessageLocked(game.CombatMessage{
			Type:      "CAMP_ERROR",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("❌ %v", err),
		})
		return err
	}
	invDB, inventoryErr := db.GetCharacterInventory(ctx.CharID)
	if inventoryErr != nil {
		log.Printf("erro ao recarregar inventário após desmonte do personagem %s: %v", ctx.CharID, inventoryErr)
	} else {
		ctx.Session.Inventory = convertDBInvToGameInv(invDB)
	}
	ctx.Session.Resources = make(map[string]int64)
	for _, it := range updatedSnap.Items {
		ctx.Session.Resources[it.Key] = it.Quantity
	}
	if ctx.Session.Camp != nil {
		ctx.Session.Camp.StorageUsed = updatedSnap.StorageUsed
		ctx.Session.Camp.StateRevision = updatedSnap.Revision
	}
	ctx.Session.SendMessageLocked(game.CombatMessage{
		Type:              "SALVAGE_COMPLETED",
		Timestamp:         time.Now().Format("15:04:05"),
		Character:         game.CloneCharacterSnapshot(ctx.Session.Character),
		Inventory:         game.CloneInventorySnapshot(ctx.Session.Inventory),
		Camp:              game.CloneCampSnapshot(ctx.Session.Camp),
		ItemFound:         salvagedItem,
		ResourceDrops:     yield,
		ResourceInventory: updatedSnap,
		LogText:           fmt.Sprintf("⚒️ [%s] desmontado com sucesso em materiais na Bancada!", salvagedItem.Name),
	})
	return nil
}

func handleLearnBuildingBlueprint(ctx *CommandContext) error {
	updatedInv, updatedCamp, err := db.LearnBuildingBlueprint(ctx.CharID, ctx.Action.ItemID)
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()
	if err != nil {
		ctx.Session.SendMessageLocked(game.CombatMessage{
			Type:      "CAMP_ERROR",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("❌ %v", err),
		})
		return err
	}
	ctx.Session.Inventory = updatedInv
	ctx.Session.Camp = updatedCamp
	ctx.Session.SendMessageLocked(game.CombatMessage{
		Type:      "BLUEPRINT_LEARNED",
		Timestamp: time.Now().Format("15:04:05"),
		Character: game.CloneCharacterSnapshot(ctx.Session.Character),
		Inventory: game.CloneInventorySnapshot(ctx.Session.Inventory),
		Camp:      game.CloneCampSnapshot(ctx.Session.Camp),
		LogText:   "📜 Projeto arquitetônico estudado com sucesso! Nova construção desbloqueada no acampamento.",
	})
	return nil
}

func handleSalvageBatch(ctx *CommandContext) error {
	batchResult, err := db.SalvageBatchAtomically(ctx.CharID, ctx.Action.RequestID, ctx.Action.ItemIDs, ctx.Action.SafeMode)
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()
	if err != nil {
		ctx.Session.SendMessageLocked(game.CombatMessage{
			Type:      "CAMP_ERROR",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("❌ %v", err),
		})
		return err
	}
	ctx.Session.Inventory = &batchResult.Inventory
	ctx.Session.Resources = make(map[string]int64)
	for _, it := range batchResult.Resources.Items {
		ctx.Session.Resources[it.Key] = it.Quantity
	}
	if ctx.Session.Camp != nil {
		ctx.Session.Camp.StorageUsed = batchResult.Resources.StorageUsed
		ctx.Session.Camp.StateRevision = batchResult.Resources.Revision
	}
	ctx.Session.SendMessageLocked(game.CombatMessage{
		Type:              "SALVAGE_BATCH_COMPLETED",
		Timestamp:         time.Now().Format("15:04:05"),
		Character:         game.CloneCharacterSnapshot(ctx.Session.Character),
		Inventory:         game.CloneInventorySnapshot(ctx.Session.Inventory),
		Camp:              game.CloneCampSnapshot(ctx.Session.Camp),
		ResourceDrops:     batchResult.TotalYield,
		ResourceInventory: &batchResult.Resources,
		LogText:           fmt.Sprintf("⚒️ Desmonte em lote concluído (%d itens processados)!", len(batchResult.Outcomes)),
	})
	return nil
}

func handleUpdateAutoSellSettings(ctx *CommandContext) error {
	if ctx.Action.AutoSellSettings != nil {
		ctx.Session.UpdateAutoSellSettings(*ctx.Action.AutoSellSettings)
	}
	return nil
}

func handleRequestAutoSellPreview(ctx *CommandContext) error {
	if ctx.Action.AutoSellSettings != nil {
		ctx.Session.RequestAutoSellPreview(*ctx.Action.AutoSellSettings)
	}
	return nil
}

func handleClaimOverflowItem(ctx *CommandContext) error {
	ctx.Session.ClaimOverflowItem(ctx.Action.ItemID)
	return nil
}

func handleSellOverflowItem(ctx *CommandContext) error {
	ctx.Session.SellOverflowItem(ctx.Action.ItemID)
	return nil
}

func handleSellAllOverflow(ctx *CommandContext) error {
	ctx.Session.SellAllOverflow()
	return nil
}

func handleRequestStateSync(ctx *CommandContext) error {
	ctx.Session.RequestStateSync()
	return nil
}

func sendEconomyError(ctx *CommandContext, err error) error {
	ctx.Session.SendMessage(game.CombatMessage{Type: "CAMP_ERROR", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), LogText: fmt.Sprintf("❌ %v", err)})
	return err
}

func sendEconomyErrorLocked(ctx *CommandContext, err error) error {
	ctx.Session.SendMessageLocked(game.CombatMessage{Type: "CAMP_ERROR", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), LogText: fmt.Sprintf("❌ %v", err)})
	return err
}

func handleStartGathering(ctx *CommandContext) error {
	activity, err := db.StartGatheringActivity(ctx.CharID, ctx.Action.ExpeditionKey, ctx.Action.DurationSeconds, ctx.Action.RequestID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	economy, economyErr := db.GetCharacterEconomyState(ctx.CharID)
	if economyErr != nil {
		log.Printf("erro ao sincronizar economia após iniciar coleta do personagem %s: %v", ctx.CharID, economyErr)
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "GATHERING_STARTED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy, LogText: fmt.Sprintf("🧭 %s foi enviado para a coleta. Retorno em %s; a caçada do herói continua normalmente.", activity.ResidentName, activity.EndsAt.Local().Format("15:04"))})
	return nil
}

func handleCancelGathering(ctx *CommandContext) error {
	result, err := db.CancelGatheringActivity(ctx.CharID, ctx.Action.ActivityID, ctx.Action.RequestID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	economy, economyErr := db.GetCharacterEconomyState(ctx.CharID)
	if economyErr != nil {
		log.Printf("erro ao sincronizar economia após cancelar coleta do personagem %s: %v", ctx.CharID, economyErr)
	}
	logText := fmt.Sprintf("🛑 Coleta cancelada: %d ciclos completos preservados e +%d XP de profissão.", result.CompletedCycles, result.ProfessionXP)
	if len(result.Pending) > 0 {
		logText += " Parte dos recursos aguarda espaço no depósito."
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "GATHERING_CANCELLED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy, GatheringResult: result, LogText: logText})
	return nil
}

func handleClaimGathering(ctx *CommandContext) error {
	result, err := db.ClaimGatheringActivity(ctx.CharID, ctx.Action.ActivityID, ctx.Action.RequestID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	snapshot, snapshotErr := db.GetCharacterResourceSnapshot(ctx.CharID)
	if snapshotErr != nil {
		log.Printf("erro ao sincronizar depósito após coleta do personagem %s: %v", ctx.CharID, snapshotErr)
	}
	economy, economyErr := db.GetCharacterEconomyState(ctx.CharID)
	if economyErr != nil {
		log.Printf("erro ao sincronizar economia após coleta do personagem %s: %v", ctx.CharID, economyErr)
	}
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()
	if snapshot != nil {
		ctx.Session.Resources = map[string]int64{}
		for _, resource := range snapshot.Items {
			ctx.Session.Resources[resource.Key] = resource.Quantity
		}
		if ctx.Session.Camp != nil {
			ctx.Session.Camp.StorageUsed = snapshot.StorageUsed
			ctx.Session.Camp.StateRevision = snapshot.Revision
		}
	}
	logText := fmt.Sprintf("📦 Coleta concluída: %d ciclos e +%d XP de profissão.", result.CompletedCycles, result.ProfessionXP)
	if len(result.Pending) > 0 {
		logText += " Parte dos recursos ficou pendente por falta de espaço."
	}
	ctx.Session.SendMessageLocked(game.CombatMessage{Type: "GATHERING_CLAIMED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy, GatheringResult: result, ResourceInventory: snapshot, Camp: game.CloneCampSnapshot(ctx.Session.Camp), LogText: logText})
	return nil
}

func handleCraftPreview(ctx *CommandContext) error {
	preview, err := db.GetCraftPreview(ctx.CharID, ctx.Action.RecipeKey, ctx.Action.CatalystKey)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "CRAFT_PREVIEW", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), CraftPreview: preview})
	return nil
}

func handleCraftItem(ctx *CommandContext) error {
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()
	if ctx.Action.RequestID == "" {
		return sendEconomyErrorLocked(ctx, fmt.Errorf("request_id obrigatório para produção em lote"))
	}
	requested := int(ctx.Action.Quantity)
	if requested < 1 {
		requested = 1
	}
	if requested > 50 {
		requested = 50
	}
	batch := &game.CraftBatchResult{
		RequestID:      ctx.Action.RequestID,
		RecipeKey:      ctx.Action.RecipeKey,
		Requested:      requested,
		RarityCounts:   map[string]int{},
		RandomFailures: 0,
	}
	requestPrefix := ctx.Action.RequestID
	if len(requestPrefix) > 88 {
		requestPrefix = requestPrefix[:88]
	}
	var result *game.CraftResult
	for index := 0; index < requested; index++ {
		previewRevision := int64(0)
		if index == 0 {
			previewRevision = ctx.Action.PreviewRevision
		}
		individualRequestID := fmt.Sprintf("%s:%02d", requestPrefix, index+1)
		crafted, craftErr := db.CraftItem(ctx.CharID, ctx.Action.RecipeKey, ctx.Action.CatalystKey, individualRequestID, previewRevision)
		if craftErr != nil {
			batch.StopReason = craftErr.Error()
			break
		}
		result = crafted
		batch.Completed++
		if crafted.Rarity != "" {
			batch.RarityCounts[crafted.Rarity]++
		}
		if crafted.SentToPending || crafted.SentToOverflow {
			batch.PendingCount++
		}
	}
	batch.NotCompleted = batch.Requested - batch.Completed
	if updatedInventory, loadErr := db.GetCharacterInventory(ctx.CharID); loadErr == nil {
		ctx.Session.Inventory = db.ConvertDBInvToGameInv(updatedInventory)
	} else {
		log.Printf("erro ao recarregar inventário após craft do personagem %s: %v", ctx.CharID, loadErr)
	}
	if updatedCharacter, loadErr := db.GetCharacterByID(ctx.CharID); loadErr == nil {
		ctx.Session.Character.GoldBank = updatedCharacter.GoldBank
		ctx.Session.Character.StateRevision = updatedCharacter.StateRevision
	} else {
		log.Printf("erro ao recarregar personagem após craft %s: %v", ctx.CharID, loadErr)
	}
	economy, economyErr := db.GetCharacterEconomyState(ctx.CharID)
	if economyErr != nil {
		log.Printf("erro ao sincronizar economia após craft do personagem %s: %v", ctx.CharID, economyErr)
	}
	var resourceInventory *game.ResourceInventorySnapshot
	if result != nil {
		resourceInventory = &result.ResourceInventory
	}
	eventType := "CRAFT_BATCH_COMPLETED"
	if requested == 1 && batch.Completed == 1 {
		eventType = "CRAFT_COMPLETED"
	}
	logText := fmt.Sprintf("⚒️ Lote processado: %d/%d produção(ões) concluída(s). Não existe falha aleatória total; cada unidade concluída gerou seu resultado.", batch.Completed, batch.Requested)
	if batch.StopReason != "" {
		logText += " O restante não foi produzido: " + batch.StopReason + "."
	}
	ctx.Session.SendMessageLocked(game.CombatMessage{Type: eventType, RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Character: game.CloneCharacterSnapshot(ctx.Session.Character), Inventory: game.CloneInventorySnapshot(ctx.Session.Inventory), Economy: economy, CraftResult: result, CraftBatchResult: batch, ResourceInventory: resourceInventory, LogText: logText})
	return nil
}

func handleEconomySync(ctx *CommandContext) error {
	autoResults, err := db.ReconcileCompletedGatherings(ctx.CharID, time.Now().UTC(), 24)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	economy, err := db.GetCharacterEconomyState(ctx.CharID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	message := game.CombatMessage{Type: "ECONOMY_SYNC", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy}
	if len(autoResults) > 0 {
		snapshot, snapshotErr := db.GetCharacterResourceSnapshot(ctx.CharID)
		if snapshotErr != nil {
			return sendEconomyError(ctx, snapshotErr)
		}
		lastResult := autoResults[len(autoResults)-1]
		message.Type = "GATHERING_AUTO_CLAIMED"
		message.GatheringResult = &lastResult
		message.ResourceInventory = snapshot
		message.LogText = fmt.Sprintf("🏡 %d trabalhador(es) retornaram sozinho(s). A produção foi enviada ao Depósito; excedentes permanecem em carga segura.", len(autoResults))
		ctx.Session.Mu.Lock()
		ctx.Session.Resources = map[string]int64{}
		for _, resource := range snapshot.Items {
			ctx.Session.Resources[resource.Key] = resource.Quantity
		}
		if ctx.Session.Camp != nil {
			ctx.Session.Camp.StorageUsed = snapshot.StorageUsed
			ctx.Session.Camp.StorageCapacity = snapshot.StorageCapacity
			ctx.Session.Camp.StateRevision = snapshot.Revision
			message.Camp = game.CloneCampSnapshot(ctx.Session.Camp)
		}
		ctx.Session.Mu.Unlock()
	}
	ctx.Session.SendMessage(message)
	return nil
}

func handleClaimPendingCraft(ctx *CommandContext) error {
	item, inventory, err := db.ClaimPendingCraftedItem(ctx.CharID, ctx.Action.ItemID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	ctx.Session.Mu.Lock()
	ctx.Session.Inventory = db.ConvertDBInvToGameInv(inventory)
	inventorySnapshot := game.CloneInventorySnapshot(ctx.Session.Inventory)
	ctx.Session.Mu.Unlock()
	economy, economyErr := db.GetCharacterEconomyState(ctx.CharID)
	if economyErr != nil {
		log.Printf("erro ao sincronizar economia após resgate de craft do personagem %s: %v", ctx.CharID, economyErr)
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "PENDING_CRAFT_CLAIMED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Inventory: inventorySnapshot, Economy: economy, ItemFound: item, LogText: fmt.Sprintf("📦 %s foi movido para a mochila.", item.Name)})
	return nil
}

func handleClaimPendingResources(ctx *CommandContext) error {
	mutation, err := db.ClaimPendingResources(ctx.CharID, ctx.Action.RequestID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	economy, economyErr := db.GetCharacterEconomyState(ctx.CharID)
	if economyErr != nil {
		log.Printf("erro ao sincronizar economia após resgate de recursos do personagem %s: %v", ctx.CharID, economyErr)
	}
	ctx.Session.Mu.Lock()
	defer ctx.Session.Mu.Unlock()
	ctx.Session.Resources = map[string]int64{}
	for _, resource := range mutation.Inventory.Items {
		ctx.Session.Resources[resource.Key] = resource.Quantity
	}
	if ctx.Session.Camp != nil {
		ctx.Session.Camp.StorageUsed = mutation.Inventory.StorageUsed
		ctx.Session.Camp.StateRevision = mutation.Inventory.Revision
	}
	ctx.Session.SendMessageLocked(game.CombatMessage{Type: "PENDING_RESOURCES_CLAIMED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy, ResourceInventory: &mutation.Inventory, Camp: game.CloneCampSnapshot(ctx.Session.Camp), LogText: fmt.Sprintf("📦 %d tipos de recurso foram processados da carga pendente.", len(mutation.Accepted))})
	return nil
}

func handleCreateHeroDesire(ctx *CommandContext) error {
	if _, err := db.CreateHeroDesire(ctx.CharID, ctx.Action.RecipeKey, ctx.Action.TargetRarity, ctx.Action.CatalystKey, ctx.Action.MaxAttempts, ctx.Action.Priority, ctx.Action.RequestID); err != nil {
		return sendEconomyError(ctx, err)
	}
	automation, err := db.AdvanceHeroDesires(ctx.CharID, time.Now().UTC())
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	if automation != nil && automation.Changed {
		applySettlementAutomationUpdate(ctx.Session, automation)
	}
	economy, err := db.GetCharacterEconomyState(ctx.CharID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	logText := "👑 Nova Ambição registrada. Os moradores organizarão materiais, artesão e tempo de produção automaticamente."
	if automation != nil && automation.LogText != "" {
		logText += " " + automation.LogText
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "HERO_DESIRE_CREATED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy, LogText: logText})
	return nil
}

func handleCancelHeroDesire(ctx *CommandContext) error {
	if _, err := db.CancelHeroDesire(ctx.CharID, ctx.Action.DesireID); err != nil {
		return sendEconomyError(ctx, err)
	}
	economy, err := db.GetCharacterEconomyState(ctx.CharID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "HERO_DESIRE_CANCELLED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy, LogText: "🧹 Ambição removida da fila. Resultados já produzidos continuam protegidos no Arsenal."})
	return nil
}

func handleClaimArmoryItem(ctx *CommandContext) error {
	item, inventory, _, err := db.ClaimSettlementArmoryItem(ctx.CharID, ctx.Action.ArmoryID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	ctx.Session.Mu.Lock()
	ctx.Session.Inventory = db.ConvertDBInvToGameInv(inventory)
	inventorySnapshot := game.CloneInventorySnapshot(ctx.Session.Inventory)
	ctx.Session.Mu.Unlock()
	economy, err := db.GetCharacterEconomyState(ctx.CharID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "ARMORY_ITEM_CLAIMED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Inventory: inventorySnapshot, Economy: economy, ItemFound: item, LogText: fmt.Sprintf("🏰 %s saiu do Arsenal e foi enviado para a mochila.", item.Name)})
	return nil
}

func applySettlementAutomationUpdate(session *game.GameSession, update *game.SettlementAutomationResult) {
	if session == nil || update == nil || !update.Changed {
		return
	}
	session.Mu.Lock()
	defer session.Mu.Unlock()
	if session.Character != nil && update.CharacterRevision >= session.Character.StateRevision {
		session.Character.GoldBank = update.GoldBank
		session.Character.StateRevision = update.CharacterRevision
	}
	if update.ResourceInventory != nil {
		if session.Camp != nil && update.ResourceInventory.Revision < session.Camp.StateRevision {
			return
		}
		session.Resources = map[string]int64{}
		for _, resource := range update.ResourceInventory.Items {
			session.Resources[resource.Key] = resource.Quantity
		}
		if session.Camp != nil {
			session.Camp.StorageUsed = update.ResourceInventory.StorageUsed
			session.Camp.StorageCapacity = update.ResourceInventory.StorageCapacity
			session.Camp.StateRevision = update.ResourceInventory.Revision
		}
	}
}
