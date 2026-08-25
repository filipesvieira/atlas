package main

import (
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if appConfig != nil {
			return appConfig.IsOriginAllowed(origin)
		}
		return true
	},
}

var (
	activeSessions          = make(map[string]*game.GameSession)
	sessionsMu              sync.Mutex
	characterLifecycleLocks sync.Map
)

var processServerID = fmt.Sprintf("atlas-%d", os.Getpid())

// getCharacterLifecycleLock serializa claim, abertura de WebSocket e fechamento
// para um mesmo personagem. Assim não existe intervalo em que o claim leia um
// snapshot enquanto a sessão ainda está sendo criada ou ainda não terminou de
// persistir a fronteira de logout.
func getCharacterLifecycleLock(characterID string) *sync.Mutex {
	lock, _ := characterLifecycleLocks.LoadOrStore(characterID, &sync.Mutex{})
	return lock.(*sync.Mutex)
}

type ClientAction struct {
	Action             string                   `json:"action"`
	ItemID             string                   `json:"item_id"`
	Slot               string                   `json:"slot"`
	RegionID           string                   `json:"region_id"`
	Region             string                   `json:"region"`
	Stance             string                   `json:"stance"`
	Skill              string                   `json:"skill"`
	Stat               string                   `json:"stat"`
	Pack               string                   `json:"pack"`
	ItemIDs            []string                 `json:"item_ids"`
	Enabled            bool                     `json:"enabled"`
	BuildingKey        string                   `json:"building_key"`
	SlotKey            string                   `json:"slot_key"`
	ResourceKey        string                   `json:"resource_key"`
	Quantity           int64                    `json:"quantity"`
	ExpectedRevision   int64                    `json:"expected_revision"`
	RequestID          string                   `json:"request_id"`
	SafeMode           bool                     `json:"safe_mode"`
	AutoSellSettings   *game.AutoSellSettings   `json:"auto_sell_settings,omitempty"`
	AutoPotionSettings *game.AutoPotionSettings `json:"auto_potion_settings,omitempty"`
	ExpeditionKey      string                   `json:"expedition_key"`
	DurationSeconds    int64                    `json:"duration_seconds"`
	RecipeKey          string                   `json:"recipe_key"`
	CatalystKey        string                   `json:"catalyst_key"`
	PreviewRevision    int64                    `json:"preview_revision"`
	ActivityID         string                   `json:"activity_id"`
	DesireID           string                   `json:"desire_id"`
	ArmoryID           string                   `json:"armory_id"`
	TargetRarity       string                   `json:"target_rarity"`
	MaxAttempts        int                      `json:"max_attempts"`
	Priority           int                      `json:"priority"`
	Direction          string                   `json:"direction"`
	Pressed            bool                     `json:"pressed"`
	PersonalReserve    int64                    `json:"personal_reserve"`
	TileX              int                      `json:"tile_x"`
	TileY              int                      `json:"tile_y"`
	Rotation           int                      `json:"rotation"`
}

func convertDBCharToGameChar(c *db.Character) *game.CharacterData {
	if c == nil {
		return nil
	}
	return &game.CharacterData{
		ID:                   c.ID,
		AccountID:            c.AccountID,
		Name:                 c.Name,
		Vocation:             c.Vocation,
		Origin:               c.Origin,
		Level:                c.Level,
		Experience:           c.Experience,
		Health:               c.Health,
		MaxHealth:            c.MaxHealth,
		Mana:                 c.Mana,
		MaxMana:              c.MaxMana,
		GoldBank:             c.GoldBank,
		STR:                  c.STR,
		DEX:                  c.DEX,
		INT:                  c.INT,
		VIT:                  c.VIT,
		UnspentPoints:        c.UnspentPoints,
		Masteries:            c.Masteries,
		LearnedSkills:        c.LearnedSkills,
		ActiveSkills:         c.ActiveSkills,
		UnlockedRegions:      c.UnlockedRegions,
		IsExpeditionActive:   c.IsExpeditionActive,
		ActiveRegion:         c.ActiveRegion,
		ActiveStance:         c.ActiveStance,
		CurrentStage:         c.CurrentStage,
		IsBossStage:          c.IsBossStage,
		StateRevision:        c.StateRevision,
		ProgressionVersion:   c.ProgressionVersion,
		LifetimeExperience:   c.LifetimeExperience,
		HighestLevelEver:     c.HighestLevelEver,
		LastLogin:            c.LastLogin,
		LastLogout:           c.LastLogout,
		AutoResumeExpedition: c.AutoResumeExpedition,
		StarterPackClaimed:   c.StarterPackClaimed,
		StarterPackKey:       c.StarterPackKey,
	}
}

func convertDBInvToGameInv(inv *db.Inventory) *game.InventoryData {
	if inv == nil {
		return &game.InventoryData{Cap: 1500}
	}
	return &game.InventoryData{
		Equipment: game.EquipmentSlots(inv.Equipment),
		Backpack:  inv.Backpack,
		Cap:       inv.Cap,
		Revision:  inv.Revision,
	}
}

func convertGameInvToDBInv(inv *game.InventoryData) *db.Inventory {
	if inv == nil {
		return &db.Inventory{Cap: 1500}
	}
	return &db.Inventory{
		Equipment: db.EquipmentSlots(inv.Equipment),
		Backpack:  inv.Backpack,
		Cap:       inv.Cap,
		Revision:  inv.Revision,
	}
}

func convertGameCharToDBChar(c *game.CharacterData) *db.Character {
	if c == nil {
		return nil
	}
	return &db.Character{
		ID:                   c.ID,
		AccountID:            c.AccountID,
		Name:                 c.Name,
		Vocation:             c.Vocation,
		Origin:               c.Origin,
		Level:                c.Level,
		Experience:           c.Experience,
		Health:               c.Health,
		MaxHealth:            c.MaxHealth,
		Mana:                 c.Mana,
		MaxMana:              c.MaxMana,
		GoldBank:             c.GoldBank,
		STR:                  c.STR,
		DEX:                  c.DEX,
		INT:                  c.INT,
		VIT:                  c.VIT,
		UnspentPoints:        c.UnspentPoints,
		Masteries:            c.Masteries,
		LearnedSkills:        c.LearnedSkills,
		ActiveSkills:         c.ActiveSkills,
		UnlockedRegions:      c.UnlockedRegions,
		IsExpeditionActive:   c.IsExpeditionActive,
		ActiveRegion:         c.ActiveRegion,
		ActiveStance:         c.ActiveStance,
		CurrentStage:         c.CurrentStage,
		IsBossStage:          c.IsBossStage,
		StateRevision:        c.StateRevision,
		ProgressionVersion:   c.ProgressionVersion,
		LifetimeExperience:   c.LifetimeExperience,
		HighestLevelEver:     c.HighestLevelEver,
		LastLogin:            c.LastLogin,
		LastLogout:           c.LastLogout,
		AutoResumeExpedition: c.AutoResumeExpedition,
		StarterPackClaimed:   c.StarterPackClaimed,
		StarterPackKey:       c.StarterPackKey,
	}
}

// resyncCharacterSnapshot e resyncInventorySnapshot transformam um conflito
// otimista em uma recuperação segura: o estado vencedor do PostgreSQL volta a
// ser a fonte de verdade da sessão. O erro original continua sendo retornado
// para que o chamador não confunda o conflito com um commit bem-sucedido.
func resyncCharacterSnapshot(target *game.CharacterData, characterID string) {
	fresh, err := db.GetCharacterByID(characterID)
	if err != nil {
		log.Printf("erro ao ressincronizar personagem %s: %v", characterID, err)
		return
	}
	converted := convertDBCharToGameChar(fresh)
	if converted != nil && target != nil {
		*target = *converted
	}
}

func resyncInventorySnapshot(target *game.InventoryData, characterID string) {
	fresh, err := db.GetCharacterInventory(characterID)
	if err != nil {
		log.Printf("erro ao ressincronizar inventário %s: %v", characterID, err)
		return
	}
	converted := convertDBInvToGameInv(fresh)
	if converted != nil && target != nil {
		*target = *converted
	}
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	tokenStr := r.URL.Query().Get("token")
	charID := r.URL.Query().Get("character_id")

	if tokenStr == "" || charID == "" {
		http.Error(w, "Token ou character_id ausente", http.StatusUnauthorized)
		return
	}

	claims := &Claims{}
	tkn, err := jwt.ParseWithClaims(
		tokenStr,
		claims,
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("algoritmo de assinatura inesperado: %v", token.Header["alg"])
			}
			return appConfig.JWTSecret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer("atlas-server"),
		jwt.WithAudience("atlas-client"),
	)
	if err != nil || !tkn.Valid {
		http.Error(w, "Token inválido", http.StatusUnauthorized)
		return
	}

	lifecycleLock := getCharacterLifecycleLock(charID)
	lifecycleLock.Lock()

	// Claim e abertura da sessão usam a mesma trava por personagem. O check não
	// fica separado da leitura do banco e da publicação em activeSessions.
	sessionsMu.Lock()
	_, sessionAlreadyActive := activeSessions[charID]
	sessionsMu.Unlock()
	if sessionAlreadyActive {
		// Se a sessão ainda consta como ativa (ex: reconexão ou remount rápido do React),
		// libera temporariamente a trava para permitir que a rotina de desconexão anterior
		// salve o snapshot offline e conclua a remoção da sessão.
		lifecycleLock.Unlock()
		for attempt := 0; attempt < 10; attempt++ {
			time.Sleep(50 * time.Millisecond)
			sessionsMu.Lock()
			_, stillActive := activeSessions[charID]
			sessionsMu.Unlock()
			if !stillActive {
				break
			}
		}
		lifecycleLock.Lock()

		sessionsMu.Lock()
		_, sessionAlreadyActive = activeSessions[charID]
		sessionsMu.Unlock()
		if sessionAlreadyActive {
			lifecycleLock.Unlock()
			http.Error(w, "Já existe uma conexão ativa para este personagem", http.StatusConflict)
			return
		}
	}

	char, err := db.GetCharacterByID(charID)
	if err != nil || char.AccountID != claims.AccountID {
		lifecycleLock.Unlock()
		http.Error(w, "Personagem não encontrado ou não pertence a esta conta", http.StatusForbidden)
		return
	}
	leaseID, err := db.AcquireCharacterSessionLease(charID, processServerID)
	if err != nil {
		lifecycleLock.Unlock()
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}
	defer func() {
		if err := db.ReleaseCharacterSessionLease(charID, leaseID); err != nil {
			log.Printf("erro ao liberar lease da sessão %s: %v", charID, err)
		}
	}()

	dbInv, err := db.GetCharacterInventory(charID)
	if err != nil {
		_ = db.ReleaseCharacterSessionLease(charID, leaseID)
		lifecycleLock.Unlock()
		http.Error(w, "Inventário do personagem não encontrado", http.StatusInternalServerError)
		return
	}
	if err := db.SaveCharacterInventory(charID, dbInv); err != nil { // persiste migração de balance_version
		_ = db.ReleaseCharacterSessionLease(charID, leaseID)
		lifecycleLock.Unlock()
		http.Error(w, "Não foi possível reconciliar o inventário", http.StatusInternalServerError)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		_ = db.ReleaseCharacterSessionLease(charID, leaseID)
		lifecycleLock.Unlock()
		log.Printf("Erro ao fazer upgrade para WebSocket: %v", err)
		return
	}

	gameChar := convertDBCharToGameChar(char)
	game.RefreshProgressionView(gameChar)
	gameInv := convertDBInvToGameInv(dbInv)
	saveInvWrapper := func(cid string, gInv *game.InventoryData) error {
		dbInventory := convertGameInvToDBInv(gInv)
		if err := db.SaveCharacterInventory(cid, dbInventory); err != nil {
			log.Printf("erro ao persistir inventário de %s: %v", cid, err)
			if errors.Is(err, db.ErrInventoryConflict) {
				game.IncrementTelemetry("stale_snapshot_rejected_total")
				resyncInventorySnapshot(gInv, cid)
			}
			return err
		}
		gInv.Revision = dbInventory.Revision
		return nil
	}
	saveCharWrapper := func(gChar *game.CharacterData) error {
		dbCharacter := convertGameCharToDBChar(gChar)
		if err := db.UpdateCharacterState(dbCharacter); err != nil {
			log.Printf("erro ao persistir progressão de %s: %v", gChar.ID, err)
			if errors.Is(err, db.ErrProgressionConflict) {
				game.IncrementTelemetry("stale_snapshot_rejected_total")
				resyncCharacterSnapshot(gChar, gChar.ID)
			}
			return err
		}
		gChar.StateRevision = dbCharacter.StateRevision
		return nil
	}
	getLootWrapper := func(level int) *game.Item {
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		return db.GetRandomLoot(level, r)
	}
	getMonsterWrapper := func(region string, level int) game.Monster {
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		return game.GetRandomMonsterForRegion(region, r)
	}

	campState, err := db.GetCharacterCamp(charID)
	if err != nil {
		log.Printf("Aviso ao carregar acampamento: %v", err)
	}
	resourcesMap, err := db.GetCharacterResources(charID)
	if err != nil {
		log.Printf("Aviso ao carregar recursos: %v", err)
	}

	// Compêndio de Exploração: backfill de retrocompatibilidade e carregamento inicial
	db.BackfillInventoryDiscoveries(charID, dbInv)
	discoveredList, err := db.GetCharacterDiscoveredLoot(charID)
	if err != nil {
		log.Printf("Aviso ao carregar compêndio de descobertas: %v", err)
		discoveredList = []string{}
	}
	discoveredMap := make(map[string]bool)
	for _, itKey := range discoveredList {
		discoveredMap[itKey] = true
	}

	autoSellSettings, autoSellErr := db.GetCharacterAutoSellSettings(charID)
	if autoSellErr != nil {
		log.Printf("aviso ao carregar venda automática de %s: %v", charID, autoSellErr)
	}
	autoPotionSettings, autoPotionSettingsErr := db.GetCharacterAutoPotionSettings(charID)
	if autoPotionSettingsErr != nil {
		log.Printf("aviso ao carregar suprimentos automáticos de %s: %v", charID, autoPotionSettingsErr)
	}
	autoPotionState, autoPotionStateErr := db.GetCharacterAutoPotionState(charID)
	if autoPotionStateErr != nil {
		log.Printf("aviso ao carregar estado dos suprimentos automáticos de %s: %v", charID, autoPotionStateErr)
	}
	overflowItems, overflowErr := db.GetCharacterOverflowChest(charID)
	if overflowErr != nil {
		// Estado persistente crítico é fail-closed: nunca transforme falha de leitura
		// em snapshot vazio que poderia sobrescrever o Baú de Achados no logout.
		log.Printf("erro crítico ao carregar baú de achados de %s: %v", charID, overflowErr)
		lifecycleLock.Unlock()
		_ = conn.WriteJSON(map[string]string{"error": "Não foi possível carregar o inventário protegido. Tente entrar novamente."})
		_ = conn.Close()
		return
	}

	activeBuffs, buffErr := db.GetCharacterActiveBuffs(charID, time.Now().UTC())
	if buffErr != nil {
		log.Printf("erro crítico ao carregar buffs persistentes de %s: %v", charID, buffErr)
		lifecycleLock.Unlock()
		_ = conn.WriteJSON(map[string]string{"error": "Não foi possível carregar os efeitos ativos do personagem. Tente entrar novamente."})
		_ = conn.Close()
		return
	}

	session := game.NewGameSession(gameChar, gameInv, saveInvWrapper, saveCharWrapper, getLootWrapper, getMonsterWrapper)
	session.SaveCharAndInvFunc = func(gChar *game.CharacterData, gInv *game.InventoryData) error {
		dbCharacter := convertGameCharToDBChar(gChar)
		dbInventory := convertGameInvToDBInv(gInv)
		if err := db.SaveCharacterAndInventoryAtomic(dbCharacter, dbInventory); err != nil {
			log.Printf("erro ao persistir personagem e inventário de %s atomicamente: %v", gChar.ID, err)
			if errors.Is(err, db.ErrProgressionConflict) || errors.Is(err, db.ErrInventoryConflict) {
				game.IncrementTelemetry("stale_snapshot_rejected_total")
				resyncCharacterSnapshot(gChar, gChar.ID)
				resyncInventorySnapshot(gInv, gChar.ID)
			}
			return err
		}
		gChar.StateRevision = dbCharacter.StateRevision
		gInv.Revision = dbInventory.Revision
		return nil
	}
	session.Camp = campState
	session.Resources = resourcesMap
	session.DiscoveredLoot = discoveredMap
	session.RecordLootDiscoveryFunc = db.RecordLootDiscovery
	session.AutoSellSettings = autoSellSettings
	session.AutoPotionSettings = autoPotionSettings
	session.AutoPotionState = autoPotionState
	session.OverflowChest = overflowItems
	session.ActiveBuffs = activeBuffs
	session.SaveAutoSellSettingsFunc = db.SaveCharacterAutoSellSettings
	session.SaveAutoPotionSettingsFunc = db.SaveCharacterAutoPotionSettings
	session.ResetAutoPotionStateFunc = db.ResetCharacterAutoPotionState
	session.SpendAutoPotionFunc = db.SpendCharacterAutoPotion
	session.SaveOverflowChestFunc = db.SaveCharacterOverflowChest
	session.SavePendingItemFunc = db.QueuePendingItem
	session.SaveResourcesFunc = func(cid string, drops []game.ResourceAmount, maxCap int64, reason, referenceKey string) (game.ResourceMutationResult, error) {
		return db.AddCharacterResourcesWithLedger(cid, drops, maxCap, reason, referenceKey)
	}
	session.ReconcileCampFunc = db.ReconcileCampUpgrades
	sessionsMu.Lock()
	activeSessions[charID] = session
	sessionsMu.Unlock()
	if err := db.SetCharacterOnline(charID); err != nil {
		sessionsMu.Lock()
		delete(activeSessions, charID)
		sessionsMu.Unlock()
		lifecycleLock.Unlock()
		_ = conn.WriteJSON(map[string]string{"error": "Não foi possível marcar o personagem como online"})
		_ = conn.Close()
		return
	}
	autoGatheredOnLogin := 0
	if gathered, gatheringErr := db.ReconcileCompletedGatherings(charID, time.Now().UTC(), 100); gatheringErr != nil {
		log.Printf("erro ao conciliar coletas automáticas de %s no login: %v", charID, gatheringErr)
	} else {
		autoGatheredOnLogin = len(gathered)
	}
	if automation, automationErr := db.AdvanceHeroDesires(charID, time.Now().UTC()); automationErr != nil {
		log.Printf("erro ao reconciliar Ambições do assentamento de %s no login: %v", charID, automationErr)
	} else if automation != nil && automation.Changed {
		applySettlementAutomationUpdate(session, automation)
	}
	go session.StartTicker()
	lifecycleLock.Unlock()
	readerDone := make(chan struct{})
	leaseHeartbeatDone := make(chan struct{})
	settlementAutomationDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := db.HeartbeatCharacterSessionLease(charID, leaseID); err != nil {
					log.Printf("Lease perdido para %s: %v", charID, err)
					_ = conn.Close()
					return
				}
			case <-leaseHeartbeatDone:
				return
			}
		}
	}()
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				gathered, gatheringErr := db.ReconcileCompletedGatherings(charID, time.Now().UTC(), 24)
				if gatheringErr != nil {
					log.Printf("erro na entrega automática de coletas de %s: %v", charID, gatheringErr)
				}
				automation, err := db.AdvanceHeroDesires(charID, time.Now().UTC())
				if err != nil {
					log.Printf("erro na automação do assentamento de %s: %v", charID, err)
				}
				gatheringChanged := gatheringErr == nil && len(gathered) > 0
				automationChanged := automation != nil && automation.Changed
				if !gatheringChanged && !automationChanged {
					continue
				}
				if automationChanged {
					applySettlementAutomationUpdate(session, automation)
				}
				economy, economyErr := db.GetCharacterEconomyState(charID)
				if economyErr != nil {
					log.Printf("erro ao sincronizar assentamento de %s: %v", charID, economyErr)
					continue
				}
				var resourceInventory *game.ResourceInventorySnapshot
				if gatheringChanged {
					resourceInventory, economyErr = db.GetCharacterResourceSnapshot(charID)
					if economyErr != nil {
						log.Printf("erro ao sincronizar depósito após retorno dos trabalhadores de %s: %v", charID, economyErr)
						continue
					}
				} else if automation != nil {
					resourceInventory = automation.ResourceInventory
				}
				session.Mu.Lock()
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
				if gatheringChanged {
					eventType = "GATHERING_AUTO_CLAIMED"
					logText = fmt.Sprintf("🏡 %d trabalhador(es) retornaram sozinho(s) e entregaram a produção.", len(gathered))
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
			case <-settlementAutomationDone:
				return
			}
		}
	}()

	defer func() {
		close(leaseHeartbeatDone)
		close(settlementAutomationDone)
		// Interrompe e aguarda o leitor para que nenhuma ação de inventário,
		// postura ou expedição possa atravessar a captura do snapshot final.
		_ = conn.Close()
		<-readerDone

		// A trava permanece até o ticker encerrar e o snapshot completo ser salvo.
		// Um claim concorrente só pode começar depois da nova fronteira de logout.
		lifecycleLock.Lock()
		defer lifecycleLock.Unlock()

		sessionsMu.Lock()
		currentSess, ok := activeSessions[charID]
		if ok && currentSess == session {
			delete(activeSessions, charID)
		}
		sessionsMu.Unlock()
		if !ok || currentSess != session {
			return
		}

		session.StopTicker()
		session.Mu.Lock()
		snapshot := convertGameCharToDBChar(session.Character)
		snapshot.IsExpeditionActive = session.IsExpeditionActive
		snapshot.ActiveRegion = session.ActiveRegion
		snapshot.ActiveStance = session.ActiveStance
		snapshot.CurrentStage = session.CurrentStage
		snapshot.IsBossStage = session.IsBossStage
		inventorySnapshot := convertGameInvToDBInv(session.Inventory)
		overflowSnapshot := append([]game.Item(nil), session.OverflowChest...)
		session.Mu.Unlock()

		var offlineSaveErr error
		for attempt := 0; attempt < 3; attempt++ {
			offlineSaveErr = db.SetCharacterOffline(snapshot, inventorySnapshot)
			if offlineSaveErr == nil {
				break
			}
			time.Sleep(time.Duration(attempt+1) * 25 * time.Millisecond)
		}
		if offlineSaveErr != nil {
			log.Printf("Erro ao estabelecer fronteira offline de %s após 3 tentativas: %v", charID, offlineSaveErr)
			_ = db.ReleaseCharacterSessionLease(charID, leaseID)
			return
		}
		var overflowSaveErr error
		for attempt := 0; attempt < 3; attempt++ {
			overflowSaveErr = db.SaveCharacterOverflowChest(charID, overflowSnapshot)
			if overflowSaveErr == nil {
				break
			}
			time.Sleep(time.Duration(attempt+1) * 25 * time.Millisecond)
		}
		if overflowSaveErr != nil {
			log.Printf("erro ao persistir reserva de overflow de %s após 3 tentativas: %v", charID, overflowSaveErr)
		}
		_ = db.ReleaseCharacterSessionLease(charID, leaseID)
		log.Printf("🔌 Cliente %s desconectado. Snapshot offline salvo (Expedição: %v, Região: %s, Fase: %d).", charID, snapshot.IsExpeditionActive, snapshot.ActiveRegion, snapshot.CurrentStage)
	}()

	// Goroutine de Leitura de Ações do Cliente (Ações do Inventário / Expedição)
	go func() {
		defer close(readerDone)
		for {
			var act ClientAction
			err := conn.ReadJSON(&act)
			if err != nil {
				break
			}
			cmdCtx := &CommandContext{
				AccountID: claims.AccountID,
				CharID:    charID,
				Session:   session,
				Action:    act,
			}
			_ = DispatchCommand(cmdCtx)
		}
	}()

	// Envio do Estado Inicial / Boas Vindas. Mantém o lock até a serialização
	// terminar para que ticker e ações não alterem ponteiros durante o primeiro frame.
	session.Mu.Lock()
	initialDerivedStats := session.CalculateDerivedStats()
	welcomeMsg := "Bem-vindo de volta ao acampamento. Pronto para a próxima expedição."
	if session.IsExpeditionActive {
		welcomeMsg = "Sua expedição continua em andamento!"
	}
	if autoGatheredOnLogin > 0 {
		welcomeMsg += fmt.Sprintf(" 🏡 %d trabalhador(es) retornaram e entregaram a produção automaticamente.", autoGatheredOnLogin)
	}
	initialResourceSnap, initialResourceErr := db.GetCharacterResourceSnapshot(charID)
	if initialResourceErr != nil {
		log.Printf("aviso ao carregar snapshot inicial do depósito de %s: %v", charID, initialResourceErr)
	} else if initialResourceSnap != nil {
		// A conciliação de coletas acontece depois da criação da sessão. Atualiza
		// também o cache em memória para que os ticks seguintes não anunciem um
		// snapshot anterior ao retorno automático dos trabalhadores.
		session.Resources = map[string]int64{}
		for _, resource := range initialResourceSnap.Items {
			session.Resources[resource.Key] = resource.Quantity
		}
		if session.Camp != nil {
			session.Camp.StorageUsed = initialResourceSnap.StorageUsed
			session.Camp.StorageCapacity = initialResourceSnap.StorageCapacity
			session.Camp.StateRevision = initialResourceSnap.Revision
		}
	}
	initialEconomy, economyErr := db.GetCharacterEconomyState(charID)
	if economyErr != nil {
		log.Printf("Aviso ao carregar economia do personagem: %v", economyErr)
	}
	initialMsg := game.CombatMessage{
		Type:               "WELCOME_EVENT",
		Timestamp:          time.Now().Format("15:04:05"),
		Character:          session.Character,
		Inventory:          session.Inventory,
		Camp:               session.Camp,
		ResourceInventory:  initialResourceSnap,
		TotalAttack:        initialDerivedStats.TotalAttack,
		TotalDefense:       initialDerivedStats.TotalDefense,
		DerivedStats:       initialDerivedStats,
		ActiveRegion:       session.ActiveRegion,
		ActiveStance:       session.ActiveStance,
		CurrentStage:       session.CurrentStage,
		MaxStages:          session.MaxStages,
		IsBossStage:        session.IsBossStage,
		LogText:            welcomeMsg,
		IsActive:           session.IsExpeditionActive,
		DiscoveredLoot:     discoveredList,
		AutoSellSettings:   &session.AutoSellSettings,
		AutoPotionSettings: &session.AutoPotionSettings,
		AutoPotionState:    &session.AutoPotionState,
		OverflowChest:      session.OverflowChest,
		Economy:            initialEconomy,
		ActiveBuffs:        append([]game.ActiveBuff(nil), session.ActiveBuffs...),
	}
	writeErr := conn.WriteJSON(initialMsg)
	session.Mu.Unlock()
	if writeErr != nil {
		log.Printf("Erro enviando estado inicial do WebSocket: %v", writeErr)
		return
	}

	// Loop Principal de Envio de Eventos do Jogo via WebSocket
	for {
		select {
		case <-readerDone:
			// O navegador já encerrou a leitura (rebuild, troca de personagem ou
			// fechamento da aba). Não tente escrever um frame depois do close.
			return
		case msg, ok := <-session.SendChannel:
			if !ok {
				return
			}
			if err := conn.WriteJSON(msg); err != nil {
				// A leitura pode ter detectado o fechamento entre o select e a
				// escrita. É um desligamento normal, não uma falha do jogo.
				select {
				case <-readerDone:
					return
				default:
				}
				log.Printf("Erro enviando WebSocket frame: %v", err)
				return
			}
		}
	}
}
