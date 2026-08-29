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
	case "MOVE_HERO":
		return 30, time.Second, true
	case "REQUEST_CRAFT_PREVIEW", "REQUEST_ECONOMY_SYNC", "REQUEST_STATE_SYNC", "SALVAGE_PREVIEW", "REQUEST_AUTO_SELL_PREVIEW":
		return 8, time.Second, true
	case "CRAFT_ITEM":
		return 4, 2 * time.Second, true
	case "CHAT_SEND":
		return 8, 10 * time.Second, true
	case "CHAT_BLOCK", "CHAT_UNBLOCK", "CHAT_REPORT", "REQUEST_PUBLIC_PROFILE", "CREATE_DUEL_CHALLENGE", "RESPOND_DUEL_CHALLENGE", "CANCEL_DUEL_CHALLENGE", "CONFIRM_PVP_MATCH", "REQUEST_PVP_HISTORY", "REQUEST_PVP_REPLAY", "JOIN_PVP_MATCHMAKING", "LEAVE_PVP_MATCHMAKING", "REQUEST_PVP_MATCHMAKING_STATUS", "JOIN_PVP_RANKED", "LEAVE_PVP_RANKED", "REQUEST_PVP_SEASON_STATUS", "REQUEST_PVP_LADDER", "CLAIM_PVP_SEASON_REWARDS":
		return 6, 10 * time.Second, true
	case "START_GATHERING", "CANCEL_GATHERING", "CLAIM_GATHERING_REWARDS", "CLAIM_PENDING_CRAFT", "CLAIM_PENDING_RESOURCES", "CREATE_HERO_DESIRE", "CANCEL_HERO_DESIRE", "CLAIM_ARMORY_ITEM", "TRANSFER_TREASURY_GOLD", "UPDATE_TREASURY_POLICY", "MOVE_CAMP_BUILDING", "START_BUILDING_UPGRADE", "DISCARD_RESOURCE", "SALVAGE_ITEM", "SALVAGE_BATCH", "LEARN_BUILDING_BLUEPRINT", "CONSUME_FOOD":
		return 6, 2 * time.Second, true
	default:
		// Toda ação conhecida tem uma barreira global. Isso impede que comandos
		// baratos individualmente sejam combinados para criar um flood caro.
		return 30, time.Second, true
	}
}

func allowEconomyCommand(charID, action string, now time.Time) bool {
	limit, window, limited := economyCommandLimit(action)
	if !limited {
		return true
	}
	economyCommandLimiter.Lock()
	defer economyCommandLimiter.Unlock()

	allowKey := func(key string, keyLimit int, keyWindow time.Duration) bool {
		cutoff := now.Add(-keyWindow)
		recent := economyCommandLimiter.hits[key][:0]
		for _, hit := range economyCommandLimiter.hits[key] {
			if hit.After(cutoff) {
				recent = append(recent, hit)
			}
		}
		if len(recent) >= keyLimit {
			economyCommandLimiter.hits[key] = recent
			return false
		}
		economyCommandLimiter.hits[key] = append(recent, now)
		return true
	}

	// Bucket realmente global por personagem/conexão: combinar várias ações
	// diferentes não pode contornar os limites específicos de cada comando.
	if !allowKey(charID+":*", 60, time.Second) {
		return false
	}
	if !allowKey(charID+":"+action, limit, window) {
		return false
	}

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
	"TOGGLE_EXPEDITION":              handleToggleExpedition,
	"RETURN_TO_CAMP":                 handleReturnToCamp,
	"MOVE_HERO":                      handleMoveHero,
	"EQUIP_ITEM":                     handleEquipItem,
	"UNEQUIP_ITEM":                   handleUnequipItem,
	"CHANGE_REGION":                  handleChangeRegion,
	"SET_STANCE":                     handleSetStance,
	"DISCARD_ITEM":                   handleDiscardItem,
	"TOGGLE_SKILL":                   handleToggleSkill,
	"ALLOCATE_STAT":                  handleAllocateStat,
	"CHOOSE_STARTER_PACK":            handleChooseStarterPack,
	"BULK_SELL":                      handleBulkSell,
	"SET_AUTO_RESUME":                handleSetAutoResume,
	"START_BUILDING_UPGRADE":         handleStartBuildingUpgrade,
	"MOVE_CAMP_BUILDING":             handleMoveCampBuilding,
	"DISCARD_RESOURCE":               handleDiscardResource,
	"SALVAGE_PREVIEW":                handleSalvagePreview,
	"SALVAGE_ITEM":                   handleSalvageItem,
	"LEARN_BUILDING_BLUEPRINT":       handleLearnBuildingBlueprint,
	"SALVAGE_BATCH":                  handleSalvageBatch,
	"UPDATE_AUTO_SELL_SETTINGS":      handleUpdateAutoSellSettings,
	"UPDATE_AUTO_POTION_SETTINGS":    handleUpdateAutoPotionSettings,
	"REQUEST_AUTO_SELL_PREVIEW":      handleRequestAutoSellPreview,
	"CLAIM_OVERFLOW_ITEM":            handleClaimOverflowItem,
	"SELL_OVERFLOW_ITEM":             handleSellOverflowItem,
	"SELL_ALL_OVERFLOW":              handleSellAllOverflow,
	"REQUEST_STATE_SYNC":             handleRequestStateSync,
	"START_GATHERING":                handleStartGathering,
	"CANCEL_GATHERING":               handleCancelGathering,
	"CLAIM_GATHERING_REWARDS":        handleClaimGathering,
	"REQUEST_CRAFT_PREVIEW":          handleCraftPreview,
	"CRAFT_ITEM":                     handleCraftItem,
	"REQUEST_ECONOMY_SYNC":           handleEconomySync,
	"CLAIM_PENDING_CRAFT":            handleClaimPendingCraft,
	"CLAIM_PENDING_RESOURCES":        handleClaimPendingResources,
	"CREATE_HERO_DESIRE":             handleCreateHeroDesire,
	"CANCEL_HERO_DESIRE":             handleCancelHeroDesire,
	"CLAIM_ARMORY_ITEM":              handleClaimArmoryItem,
	"TRANSFER_TREASURY_GOLD":         handleTransferTreasuryGold,
	"UPDATE_TREASURY_POLICY":         handleUpdateTreasuryPolicy,
	"CONSUME_FOOD":                   handleConsumeFood,
	"CHAT_SEND":                      handleChatSend,
	"CHAT_BLOCK":                     handleChatBlock,
	"CHAT_UNBLOCK":                   handleChatUnblock,
	"CHAT_REPORT":                    handleChatReport,
	"REQUEST_PUBLIC_PROFILE":         handleRequestPublicProfile,
	"CREATE_DUEL_CHALLENGE":          handleCreateDuelChallenge,
	"RESPOND_DUEL_CHALLENGE":         handleRespondDuelChallenge,
	"CANCEL_DUEL_CHALLENGE":          handleCancelDuelChallenge,
	"CONFIRM_PVP_MATCH":              handleConfirmPvPMatch,
	"SET_EQUIPPED_SKIN":              handleSetEquippedSkin,
	"REQUEST_PVP_HISTORY":            handleRequestPvPHistory,
	"REQUEST_PVP_REPLAY":             handleRequestPvPReplay,
	"JOIN_PVP_MATCHMAKING":           handleJoinPvPMatchmaking,
	"LEAVE_PVP_MATCHMAKING":          handleLeavePvPMatchmaking,
	"REQUEST_PVP_MATCHMAKING_STATUS": handleRequestPvPMatchmakingStatus,
	"JOIN_PVP_RANKED":                handleJoinPvPRanked,
	"LEAVE_PVP_RANKED":               handleLeavePvPRanked,
	"REQUEST_PVP_SEASON_STATUS":      handleRequestPvPSeasonStatus,
	"REQUEST_PVP_LADDER":             handleRequestPvPLadder,
	"CLAIM_PVP_SEASON_REWARDS":       handleClaimPvPSeasonRewards,
}

func validateClientAction(action ClientAction) error {
	if len(action.Action) == 0 || len(action.Action) > 40 || len(action.RequestID) > 100 ||
		len(action.ItemID) > 80 || len(action.Slot) > 32 || len(action.RegionID) > 80 || len(action.Region) > 80 ||
		len(action.Stance) > 24 || len(action.Skill) > 80 || len(action.Stat) > 24 || len(action.Pack) > 80 ||
		len(action.ExpeditionKey) > 80 || len(action.RecipeKey) > 160 || len(action.CatalystKey) > 80 ||
		len(action.ActivityID) > 64 || len(action.DesireID) > 64 || len(action.ArmoryID) > 64 ||
		len(action.TargetRarity) > 30 || len(action.Direction) > 16 || len(action.SlotKey) > 40 ||
		len(action.BuildingKey) > 80 || len(action.ResourceKey) > 80 || len(action.ItemIDs) > 200 ||
		len(action.Channel) > 24 || len([]rune(action.Text)) > 200 || len(action.TargetCharacterID) > 80 ||
		len(action.MessageID) > 80 || len(action.DuelChallengeID) > 80 || len(action.PvPMatchID) > 80 || len(action.SkinKey) > 32 || len([]rune(action.Reason)) > 240 {
		return fmt.Errorf("payload excede os limites permitidos")
	}
	for _, itemID := range action.ItemIDs {
		if len(itemID) == 0 || len(itemID) > 80 {
			return fmt.Errorf("lista de itens contém identificador inválido")
		}
	}
	if action.Quantity < 0 || action.Quantity > 1_000_000_000 {
		return fmt.Errorf("quantidade fora dos limites permitidos")
	}
	return nil
}

func heroCommandBlockedDuringPvP(action string) bool {
	switch action {
	case "TOGGLE_EXPEDITION", "RETURN_TO_CAMP", "MOVE_HERO", "EQUIP_ITEM", "UNEQUIP_ITEM", "CHANGE_REGION", "SET_STANCE", "TOGGLE_SKILL", "ALLOCATE_STAT", "CONSUME_FOOD", "SET_EQUIPPED_SKIN":
		return true
	default:
		return false
	}
}

// DispatchCommand executa o handler apropriado para a ação recebida.
func DispatchCommand(ctx *CommandContext) error {
	if ctx == nil || ctx.Session == nil {
		return fmt.Errorf("contexto ou sessão inválida")
	}
	// Validação e bucket global vêm antes do lookup. Assim ações desconhecidas
	// não viram um caminho gratuito para flood de logs ou payloads excessivos.
	if err := validateClientAction(ctx.Action); err != nil {
		return sendEconomyError(ctx, err)
	}
	if !allowEconomyCommand(ctx.CharID, ctx.Action.Action, time.Now().UTC()) {
		return sendEconomyError(ctx, fmt.Errorf("muitas operações em sequência; aguarde um instante"))
	}
	if ctx.Session.IsPvPActive() && heroCommandBlockedDuringPvP(ctx.Action.Action) {
		return sendEconomyError(ctx, fmt.Errorf("o herói está em uma Arena PvP; esta ação fica bloqueada até o fim do duelo"))
	}
	handler, exists := commandHandlers[ctx.Action.Action]
	if !exists {
		log.Printf("⚠️ Ação WebSocket desconhecida ou não registrada: %q (char: %s)", ctx.Action.Action, ctx.CharID)
		ctx.Session.SendMessage(game.CombatMessage{Type: "COMMAND_REJECTED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), LogText: "❌ Ação desconhecida."})
		return nil
	}
	return handler(ctx)
}

func handleToggleExpedition(ctx *CommandContext) error {
	ctx.Session.ToggleExpedition()
	return nil
}

func handleReturnToCamp(ctx *CommandContext) error {
	ctx.Session.ReturnToCamp()
	return nil
}

func handleSetEquippedSkin(ctx *CommandContext) error {
	normalized := game.NormalizeHeroSkinKey(ctx.Action.SkinKey)
	if normalized != ctx.Action.SkinKey {
		return sendEconomyError(ctx, fmt.Errorf("skin inválida"))
	}
	revision, err := db.SetCharacterEquippedSkin(ctx.CharID, normalized)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	ctx.Session.Mu.Lock()
	if ctx.Session.Character != nil {
		ctx.Session.Character.EquippedSkinKey = normalized
		if revision > ctx.Session.Character.StateRevision {
			ctx.Session.Character.StateRevision = revision
		}
	}
	character := game.CloneCharacterSnapshot(ctx.Session.Character)
	ctx.Session.Mu.Unlock()
	ctx.Session.SendMessage(game.CombatMessage{Type: "SKIN_UPDATED", Timestamp: time.Now().Format("15:04:05"), Character: character, LogText: "🎭 Visual do herói atualizado."})
	return nil
}

func handleMoveHero(ctx *CommandContext) error {
	// A velocidade é calculada dentro do lock da sessão para que o comando
	// manual use exatamente os bônus de equipamento vigentes e publique a nova
	// posição sem esperar o próximo tick de combate.
	ctx.Session.ApplyManualMovement(ctx.Action.Direction, ctx.Action.Pressed, 0, ctx.Action.RequestID)
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

func handleMoveCampBuilding(ctx *CommandContext) error {
	updatedCamp, err := db.MoveCampBuilding(ctx.AccountID, ctx.CharID, ctx.Action.SlotKey, ctx.Action.TileX, ctx.Action.TileY, ctx.Action.Rotation, ctx.Action.ExpectedRevision)
	if err != nil {
		ctx.Session.SendMessage(game.CombatMessage{Type: "CAMP_LAYOUT_ERROR", Timestamp: time.Now().Format("15:04:05"), LogText: fmt.Sprintf("❌ Não foi possível mover a construção: %v", err)})
		return err
	}
	ctx.Session.Mu.Lock()
	ctx.Session.Camp = updatedCamp
	ctx.Session.SendMessageLocked(game.CombatMessage{Type: "CAMP_LAYOUT_UPDATED", Timestamp: time.Now().Format("15:04:05"), Camp: game.CloneCampSnapshot(updatedCamp), LogText: "🏘️ Layout do assentamento atualizado."})
	ctx.Session.Mu.Unlock()
	return nil
}

func handleStartBuildingUpgrade(ctx *CommandContext) error {
	slotKey := ctx.Action.SlotKey
	buildingKey := ctx.Action.BuildingKey
	if slotKey == "" && buildingKey != "" {
		slotKey = game.CampBuildingInstanceKey(buildingKey)
	}
	if buildingKey == "" && slotKey != "" {
		ctx.Session.Mu.Lock()
		if ctx.Session.Camp != nil {
			if slot, ok := ctx.Session.Camp.Buildings[slotKey]; ok {
				buildingKey = slot.BuildingKey
			}
		}
		ctx.Session.Mu.Unlock()
		if buildingKey == "" {
			buildingKey = game.SlotToBuildingMap[slotKey]
		}
	}

	// A mutação e as leituras seguintes são I/O de PostgreSQL e acontecem sem
	// Session.Mu. O lock protege somente a troca do snapshot em memória.
	updatedCamp, err := db.StartBuildingUpgrade(ctx.AccountID, ctx.CharID, slotKey, buildingKey)
	if err != nil {
		ctx.Session.SendMessage(game.CombatMessage{Type: "CAMP_ERROR", Timestamp: time.Now().Format("15:04:05"), LogText: fmt.Sprintf("❌ Erro na construção: %v", err)})
		return err
	}
	updatedRes, resourcesErr := db.GetCharacterResources(ctx.CharID)
	updatedChar, characterErr := db.GetCharacterByID(ctx.CharID)
	updatedResSnap, snapshotErr := db.GetCharacterResourceSnapshot(ctx.CharID)
	if resourcesErr != nil {
		log.Printf("erro ao recarregar recursos após obra do personagem %s: %v", ctx.CharID, resourcesErr)
	}
	if characterErr != nil {
		log.Printf("erro ao recarregar personagem após obra %s: %v", ctx.CharID, characterErr)
	}
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
	goldSpent := int64(0)
	if definition, exists := game.GetBuildingDefinition(buildingKey); exists && targetLevel > 0 && targetLevel <= len(definition.Levels) {
		goldSpent = definition.Levels[targetLevel-1].GoldCost
	}

	ctx.Session.Mu.Lock()
	ctx.Session.Camp = updatedCamp
	if resourcesErr == nil {
		ctx.Session.Resources = updatedRes
	}
	if updatedResSnap != nil && ctx.Session.Camp != nil {
		ctx.Session.Camp.StorageUsed = updatedResSnap.StorageUsed
		ctx.Session.Camp.StorageCapacity = updatedResSnap.StorageCapacity
		ctx.Session.Camp.StateRevision = updatedResSnap.Revision
	}
	if updatedChar != nil && ctx.Session.Character != nil && updatedChar.StateRevision >= ctx.Session.Character.StateRevision {
		// O DB debitou somente o custo desta obra. Aplicar o delta preserva ouro
		// de combate que ainda esteja aguardando o checkpoint periódico.
		ctx.Session.Character.GoldBank -= goldSpent
		ctx.Session.Character.StateRevision = updatedChar.StateRevision
	}
	characterSnapshot := game.CloneCharacterSnapshot(ctx.Session.Character)
	campSnapshot := game.CloneCampSnapshot(ctx.Session.Camp)
	ctx.Session.Mu.Unlock()

	logText := fmt.Sprintf("🔨 Melhoria de %s para o nível %d iniciada com sucesso!", buildingName, targetLevel)
	if completedImmediately {
		logText = fmt.Sprintf("🔨 Melhoria de %s para o nível %d concluída imediatamente!", buildingName, targetLevel)
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "BUILDING_UPGRADE_STARTED", Timestamp: time.Now().Format("15:04:05"), Character: characterSnapshot, Camp: campSnapshot, ResourceInventory: updatedResSnap, LogText: logText})
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

func handleUpdateAutoPotionSettings(ctx *CommandContext) error {
	if ctx.Action.AutoPotionSettings != nil {
		ctx.Session.UpdateAutoPotionSettings(*ctx.Action.AutoPotionSettings)
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

func sendSocialError(ctx *CommandContext, err error) error {
	ctx.Session.SendSocial(game.SocialMessage{Type: "SOCIAL_ERROR", RequestID: ctx.Action.RequestID, Error: err.Error()})
	return err
}

func handleChatSend(ctx *CommandContext) error {
	channel := ctx.Action.Channel
	if channel == "" {
		channel = game.ChatChannelWorld
	}
	if channel != game.ChatChannelWorld {
		return sendSocialError(ctx, fmt.Errorf("canal ainda não disponível nesta versão"))
	}
	if err := multiplayerHub.SendWorld(ctx.CharID, ctx.Action.RequestID, ctx.Action.Text); err != nil {
		return sendSocialError(ctx, err)
	}
	return nil
}

func handleChatBlock(ctx *CommandContext) error {
	if err := multiplayerHub.Block(ctx.CharID, ctx.Action.TargetCharacterID); err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "CHAT_BLOCK_UPDATED", RequestID: ctx.Action.RequestID})
	return nil
}

func handleChatUnblock(ctx *CommandContext) error {
	if err := multiplayerHub.Unblock(ctx.CharID, ctx.Action.TargetCharacterID); err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "CHAT_BLOCK_UPDATED", RequestID: ctx.Action.RequestID})
	return nil
}

func handleChatReport(ctx *CommandContext) error {
	if err := multiplayerHub.Report(ctx.CharID, ctx.Action.MessageID, ctx.Action.Reason); err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "CHAT_REPORT_RECEIVED", RequestID: ctx.Action.RequestID})
	return nil
}

func handleRequestPublicProfile(ctx *CommandContext) error {
	profile, err := multiplayerHub.PublicProfile(ctx.Action.TargetCharacterID)
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PUBLIC_PROFILE", RequestID: ctx.Action.RequestID, PublicProfile: &profile})
	return nil
}

func handleCreateDuelChallenge(ctx *CommandContext) error {
	challenge, err := multiplayerHub.CreateDuelChallenge(ctx.CharID, ctx.Action.TargetCharacterID, ctx.Action.RequestID)
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "DUEL_CHALLENGE_CREATED", RequestID: ctx.Action.RequestID, DuelChallenge: &challenge})
	return nil
}

func handleRespondDuelChallenge(ctx *CommandContext) error {
	challenge, err := multiplayerHub.RespondDuelChallenge(ctx.CharID, ctx.Action.DuelChallengeID, ctx.Action.Enabled)
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "DUEL_CHALLENGE_UPDATED", RequestID: ctx.Action.RequestID, DuelChallenge: &challenge})
	if ctx.Action.Enabled && challenge.Status == "accepted" {
		if _, err := multiplayerHub.CreatePvPMatchFromAcceptedDuel(challenge); err != nil {
			return sendSocialError(ctx, err)
		}
	}
	return nil
}

func handleCancelDuelChallenge(ctx *CommandContext) error {
	challenge, err := multiplayerHub.CancelDuelChallenge(ctx.CharID, ctx.Action.DuelChallengeID)
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "DUEL_CHALLENGE_UPDATED", RequestID: ctx.Action.RequestID, DuelChallenge: &challenge})
	return nil
}

func handleConfirmPvPMatch(ctx *CommandContext) error {
	if _, _, err := multiplayerHub.ConfirmPvPMatchParticipant(ctx.CharID, ctx.Action.PvPMatchID, ctx.Action.PvPTacticalStrategy, ctx.Action.PvPStrategyVersion); err != nil {
		return sendSocialError(ctx, err)
	}
	return nil
}

func handleRequestPvPHistory(ctx *CommandContext) error {
	history, err := db.ListPvPMatchHistory(ctx.CharID, 20)
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_HISTORY", RequestID: ctx.Action.RequestID, PvPHistory: history})
	return nil
}

func handleRequestPvPReplay(ctx *CommandContext) error {
	replay, err := db.GetPvPMatchReplay(ctx.CharID, ctx.Action.PvPMatchID)
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_REPLAY", RequestID: ctx.Action.RequestID, PvPReplay: &replay})
	return nil
}

func handleJoinPvPMatchmaking(ctx *CommandContext) error {
	status, err := db.JoinPvPMatchmaking(ctx.CharID, ctx.Action.PvPTacticalStrategy, ctx.Action.PvPStrategyVersion, time.Now().UTC())
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_MATCHMAKING_STATUS", RequestID: ctx.Action.RequestID, Matchmaking: &status})
	return nil
}

func handleLeavePvPMatchmaking(ctx *CommandContext) error {
	if err := db.LeavePvPMatchmaking(ctx.CharID); err != nil {
		return sendSocialError(ctx, err)
	}
	status := game.PvPMatchmakingStatus{}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_MATCHMAKING_STATUS", RequestID: ctx.Action.RequestID, Matchmaking: &status})
	return nil
}

func handleRequestPvPMatchmakingStatus(ctx *CommandContext) error {
	status, err := db.GetPvPMatchmakingStatus(ctx.CharID)
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_MATCHMAKING_STATUS", RequestID: ctx.Action.RequestID, Matchmaking: &status})
	return nil
}

func handleJoinPvPRanked(ctx *CommandContext) error {
	status, err := db.JoinPvPRankedMatchmaking(ctx.CharID, ctx.Action.PvPTacticalStrategy, ctx.Action.PvPStrategyVersion, time.Now().UTC())
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_MATCHMAKING_STATUS", RequestID: ctx.Action.RequestID, Matchmaking: &status})
	return nil
}

func handleLeavePvPRanked(ctx *CommandContext) error {
	return handleLeavePvPMatchmaking(ctx)
}

func handleRequestPvPSeasonStatus(ctx *CommandContext) error {
	status, err := db.GetPvPSeasonStatus(ctx.CharID, time.Now().UTC())
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_SEASON_STATUS", RequestID: ctx.Action.RequestID, PvPSeason: &status})
	return nil
}

func handleRequestPvPLadder(ctx *CommandContext) error {
	ladder, err := db.ListPvPLadder(ctx.CharID, time.Now().UTC(), 50)
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_LADDER", RequestID: ctx.Action.RequestID, PvPLadder: ladder})
	return nil
}

func handleClaimPvPSeasonRewards(ctx *CommandContext) error {
	rewards, err := db.ClaimPvPSeasonRewards(ctx.CharID, time.Now().UTC())
	if err != nil {
		return sendSocialError(ctx, err)
	}
	ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_SEASON_REWARDS_CLAIMED", RequestID: ctx.Action.RequestID, PvPRewards: rewards})
	status, err := db.GetPvPSeasonStatus(ctx.CharID, time.Now().UTC())
	if err == nil {
		ctx.Session.SendSocial(game.SocialMessage{Type: "PVP_SEASON_STATUS", PvPSeason: &status})
	}
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
	if updatedCharacter, loadErr := db.GetCharacterByID(ctx.CharID); loadErr == nil {
		ctx.Session.Mu.Lock()
		if ctx.Session.Character != nil && updatedCharacter.StateRevision >= ctx.Session.Character.StateRevision {
			ctx.Session.Character.GoldBank += activity.HeroGoldDelta
			ctx.Session.Character.StateRevision = updatedCharacter.StateRevision
		}
		ctx.Session.Mu.Unlock()
	}
	ctx.Session.Mu.Lock()
	characterSnapshot := game.CloneCharacterSnapshot(ctx.Session.Character)
	ctx.Session.Mu.Unlock()
	logText := fmt.Sprintf("🧭 %s foi enviado para a coleta. Retorno em %s; a caçada do herói continua normalmente.", activity.ResidentName, activity.EndsAt.Local().Format("15:04"))
	if activity.WageReserved > 0 {
		logText += fmt.Sprintf(" Salário reservado automaticamente: %d ouro.", activity.WageReserved)
	} else {
		logText += " A folha ainda é subsidiada durante a formação do acampamento."
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "GATHERING_STARTED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Character: characterSnapshot, Economy: economy, LogText: logText})
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
	if result.WagePaid > 0 || result.WageRefunded > 0 {
		logText += fmt.Sprintf(" Folha: %d ouro pago e %d devolvido à Tesouraria.", result.WagePaid, result.WageRefunded)
	}
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
	if result.WagePaid > 0 {
		logText += fmt.Sprintf(" Salário liquidado automaticamente: %d ouro.", result.WagePaid)
	}
	if len(result.Pending) > 0 {
		logText += " Parte dos recursos ficou pendente por falta de espaço."
	}
	ctx.Session.SendMessageLocked(game.CombatMessage{Type: "GATHERING_CLAIMED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy, GatheringResult: result, ResourceInventory: snapshot, Camp: game.CloneCampSnapshot(ctx.Session.Camp), LogText: logText})
	return nil
}

func handleTransferTreasuryGold(ctx *CommandContext) error {
	settlement, _, err := db.TransferSettlementGold(ctx.CharID, ctx.Action.Direction, ctx.Action.Quantity, ctx.Action.RequestID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	updatedCharacter, loadErr := db.GetCharacterByID(ctx.CharID)
	goldDelta := -ctx.Action.Quantity
	if ctx.Action.Direction == "withdraw" {
		goldDelta = ctx.Action.Quantity
	}
	ctx.Session.Mu.Lock()
	if loadErr == nil && ctx.Session.Character != nil && updatedCharacter.StateRevision >= ctx.Session.Character.StateRevision {
		ctx.Session.Character.GoldBank += goldDelta
		ctx.Session.Character.StateRevision = updatedCharacter.StateRevision
	}
	character := game.CloneCharacterSnapshot(ctx.Session.Character)
	ctx.Session.Mu.Unlock()
	economy, err := db.GetCharacterEconomyState(ctx.CharID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	if economy != nil {
		economy.Settlement = settlement
	}
	actionText := "depositado na"
	if ctx.Action.Direction == "withdraw" {
		actionText = "retirado da"
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "TREASURY_UPDATED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Character: character, Economy: economy, LogText: fmt.Sprintf("🏦 %d ouro %s Tesouraria.", ctx.Action.Quantity, actionText)})
	return nil
}

func handleUpdateTreasuryPolicy(ctx *CommandContext) error {
	settlement, err := db.UpdateSettlementTreasuryPolicy(ctx.CharID, ctx.Action.Enabled, ctx.Action.PersonalReserve, ctx.Action.RequestID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	economy, err := db.GetCharacterEconomyState(ctx.CharID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	if economy != nil {
		economy.Settlement = settlement
	}
	status := "desabilitado"
	if ctx.Action.Enabled {
		status = "habilitado"
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "TREASURY_POLICY_UPDATED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Economy: economy, LogText: fmt.Sprintf("🏦 Financiamento automático %s; reserva pessoal definida em %d ouro.", status, ctx.Action.PersonalReserve)})
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
	if ctx.Action.RequestID == "" {
		return sendEconomyError(ctx, fmt.Errorf("request_id obrigatório para produção em lote"))
	}
	requested := int(ctx.Action.Quantity)
	if requested < 1 {
		requested = 1
	}
	if requested > 20 {
		requested = 20
	}
	result, batch, err := db.CraftBatch(ctx.CharID, ctx.Action.RecipeKey, ctx.Action.CatalystKey, ctx.Action.RequestID, requested, ctx.Action.PreviewRevision)
	if err != nil {
		return sendEconomyError(ctx, err)
	}

	// Releituras acontecem fora de Session.Mu. O lote já foi confirmado em um único COMMIT.
	var refreshedInventory *game.InventoryData
	if updatedInventory, loadErr := db.GetCharacterInventory(ctx.CharID); loadErr == nil {
		refreshedInventory = db.ConvertDBInvToGameInv(updatedInventory)
	} else {
		log.Printf("erro ao recarregar inventário após CraftBatch do personagem %s: %v", ctx.CharID, loadErr)
	}
	updatedCharacter, characterErr := db.GetCharacterByID(ctx.CharID)
	if characterErr != nil {
		log.Printf("erro ao recarregar personagem após CraftBatch %s: %v", ctx.CharID, characterErr)
	}
	economy, economyErr := db.GetCharacterEconomyState(ctx.CharID)
	if economyErr != nil {
		log.Printf("erro ao sincronizar economia após CraftBatch do personagem %s: %v", ctx.CharID, economyErr)
	}

	goldSpent := int64(0)
	if recipe, exists := game.GetRecipeDefinition(ctx.Action.RecipeKey); exists && batch != nil {
		goldSpent = int64(batch.Completed) * recipe.GoldCost
	}
	ctx.Session.Mu.Lock()
	if refreshedInventory != nil {
		ctx.Session.Inventory = refreshedInventory
	}
	if updatedCharacter != nil && ctx.Session.Character != nil && updatedCharacter.StateRevision >= ctx.Session.Character.StateRevision {
		// Preserve ouro de combate ainda em RAM aplicando apenas o delta confirmado pelo batch.
		ctx.Session.Character.GoldBank -= goldSpent
		ctx.Session.Character.StateRevision = updatedCharacter.StateRevision
	}
	var resourceInventory *game.ResourceInventorySnapshot
	if result != nil {
		resourceInventory = &result.ResourceInventory
		ctx.Session.Resources = map[string]int64{}
		for _, resource := range result.ResourceInventory.Items {
			ctx.Session.Resources[resource.Key] = resource.Quantity
		}
		if ctx.Session.Camp != nil {
			ctx.Session.Camp.StorageUsed = result.ResourceInventory.StorageUsed
			ctx.Session.Camp.StorageCapacity = result.ResourceInventory.StorageCapacity
			ctx.Session.Camp.StateRevision = result.ResourceInventory.Revision
		}
	}
	characterSnapshot := game.CloneCharacterSnapshot(ctx.Session.Character)
	inventorySnapshot := game.CloneInventorySnapshot(ctx.Session.Inventory)
	campSnapshot := game.CloneCampSnapshot(ctx.Session.Camp)
	ctx.Session.Mu.Unlock()

	eventType := "CRAFT_BATCH_COMPLETED"
	if batch != nil && batch.Requested == 1 && batch.Completed == 1 {
		eventType = "CRAFT_COMPLETED"
	}
	logText := fmt.Sprintf("⚒️ Lote transacional: %d/%d produção(ões) concluída(s).", batch.Completed, batch.Requested)
	if batch.StopReason != "" {
		logText += " " + batch.StopReason + "."
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: eventType, RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Character: characterSnapshot, Inventory: inventorySnapshot, Camp: campSnapshot, Economy: economy, CraftResult: result, CraftBatchResult: batch, ResourceInventory: resourceInventory, LogText: logText})
	return nil
}

func handleConsumeFood(ctx *CommandContext) error {
	result, err := db.ConsumeCharacterConsumable(ctx.AccountID, ctx.CharID, ctx.Action.ResourceKey, ctx.Action.RequestID, ctx.Action.ExpectedRevision)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	economy, err := db.GetCharacterEconomyState(ctx.CharID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}

	ctx.Session.Mu.Lock()
	ctx.Session.ActiveBuffs = append([]game.ActiveBuff(nil), economy.ActiveBuffs...)
	ctx.Session.Resources = map[string]int64{}
	for _, resource := range result.ResourceInventory.Items {
		ctx.Session.Resources[resource.Key] = resource.Quantity
	}
	if ctx.Session.Camp != nil {
		ctx.Session.Camp.StorageUsed = result.ResourceInventory.StorageUsed
		ctx.Session.Camp.StorageCapacity = result.ResourceInventory.StorageCapacity
		ctx.Session.Camp.StateRevision = result.ResourceInventory.Revision
	}
	stats := ctx.Session.CalculateDerivedStats()
	characterSnapshot := game.CloneCharacterSnapshot(ctx.Session.Character)
	campSnapshot := game.CloneCampSnapshot(ctx.Session.Camp)
	ctx.Session.Mu.Unlock()

	consumableIcon := "🍽️"
	if result.ActiveBuff.Category == game.BuffCategoryPotion {
		consumableIcon = "🧪"
	}
	logText := fmt.Sprintf("%s %s consumido: efeito ativo até %s.", consumableIcon, result.ActiveBuff.SourceName, result.ActiveBuff.ExpiresAt.Local().Format("02/01 15:04"))
	if result.ReplacedBuff != nil {
		logText = fmt.Sprintf("%s %s substituiu %s. Novo efeito ativo até %s.", consumableIcon, result.ActiveBuff.SourceName, result.ReplacedBuff.SourceName, result.ActiveBuff.ExpiresAt.Local().Format("02/01 15:04"))
	}
	ctx.Session.SendMessage(game.CombatMessage{
		Type: "CONSUMABLE_USED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"),
		Character: characterSnapshot, Economy: economy, ConsumeResult: result,
		ResourceInventory: &result.ResourceInventory, Camp: campSnapshot,
		TotalAttack: stats.TotalAttack, TotalDefense: stats.TotalDefense, DerivedStats: stats, LogText: logText,
	})
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
	ctx.Session.Mu.Lock()
	inventorySnapshot := game.CloneInventorySnapshot(ctx.Session.Inventory)
	ctx.Session.Mu.Unlock()
	logText := "👑 Nova Ambição registrada. Os moradores organizarão materiais, artesão e tempo de produção automaticamente."
	if automation != nil && automation.LogText != "" {
		logText += " " + automation.LogText
	}
	ctx.Session.SendMessage(game.CombatMessage{Type: "HERO_DESIRE_CREATED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"), Inventory: inventorySnapshot, Economy: economy, LogText: logText})
	return nil
}

func handleCancelHeroDesire(ctx *CommandContext) error {
	result, err := db.CancelHeroDesire(ctx.CharID, ctx.Action.DesireID, ctx.Action.RequestID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	applySettlementAutomationUpdate(ctx.Session, result)
	economy, err := db.GetCharacterEconomyState(ctx.CharID)
	if err != nil {
		return sendEconomyError(ctx, err)
	}
	ctx.Session.Mu.Lock()
	characterSnapshot := game.CloneCharacterSnapshot(ctx.Session.Character)
	campSnapshot := game.CloneCampSnapshot(ctx.Session.Camp)
	ctx.Session.Mu.Unlock()
	logText := "🧹 Ambição cancelada."
	if result != nil && result.LogText != "" {
		logText = "🧹 " + result.LogText
	}
	ctx.Session.SendMessage(game.CombatMessage{
		Type: "HERO_DESIRE_CANCELLED", RequestID: ctx.Action.RequestID, Timestamp: time.Now().Format("15:04:05"),
		Character: characterSnapshot, Economy: economy, Camp: campSnapshot,
		ResourceInventory: result.ResourceInventory, LogText: logText,
	})
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
		// Automação altera ouro apenas quando GoldDelta é explícito. Resultados
		// que apenas finalizam/recatalogam uma ordem não podem substituir ouro
		// de combate ainda aguardando checkpoint pelo valor absoluto do DB.
		if update.GoldDelta != 0 {
			session.Character.GoldBank += update.GoldDelta
		}
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
	if update.Inventory != nil && (session.Inventory == nil || update.Inventory.Revision >= session.Inventory.Revision) {
		session.Inventory = game.CloneInventorySnapshot(update.Inventory)
	}
}
