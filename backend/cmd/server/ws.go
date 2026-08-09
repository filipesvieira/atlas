package main

import (
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var (
	activeSessions          = make(map[string]*game.GameSession)
	sessionsMu              sync.Mutex
	characterLifecycleLocks sync.Map
)

// getCharacterLifecycleLock serializa claim, abertura de WebSocket e fechamento
// para um mesmo personagem. Assim não existe intervalo em que o claim leia um
// snapshot enquanto a sessão ainda está sendo criada ou ainda não terminou de
// persistir a fronteira de logout.
func getCharacterLifecycleLock(characterID string) *sync.Mutex {
	lock, _ := characterLifecycleLocks.LoadOrStore(characterID, &sync.Mutex{})
	return lock.(*sync.Mutex)
}

type ClientAction struct {
	Action   string   `json:"action"`
	ItemID   string   `json:"item_id"`
	Slot     string   `json:"slot"`
	RegionID string   `json:"region_id"`
	Region   string   `json:"region"`
	Stance   string   `json:"stance"`
	Skill    string   `json:"skill"`
	Stat     string   `json:"stat"`
	Pack     string   `json:"pack"`
	ItemIDs  []string `json:"item_ids"`
	Enabled  bool     `json:"enabled"`
}

func convertDBCharToGameChar(c *db.Character) *game.CharacterData {
	if c == nil {
		return nil
	}
	return &game.CharacterData{
		ID:                 c.ID,
		AccountID:          c.AccountID,
		Name:               c.Name,
		Vocation:           c.Vocation,
		Origin:             c.Origin,
		Level:              c.Level,
		Experience:         c.Experience,
		Health:             c.Health,
		MaxHealth:          c.MaxHealth,
		Mana:               c.Mana,
		MaxMana:            c.MaxMana,
		GoldBank:           c.GoldBank,
		STR:                c.STR,
		DEX:                c.DEX,
		INT:                c.INT,
		VIT:                c.VIT,
		UnspentPoints:      c.UnspentPoints,
		Masteries:          c.Masteries,
		LearnedSkills:      c.LearnedSkills,
		ActiveSkills:       c.ActiveSkills,
		UnlockedRegions:    c.UnlockedRegions,
		IsExpeditionActive: c.IsExpeditionActive,
		ActiveRegion:       c.ActiveRegion,
		ActiveStance:       c.ActiveStance,
		CurrentStage:       c.CurrentStage,
		IsBossStage:        c.IsBossStage,
		StateRevision:      c.StateRevision,
		LastLogin:          c.LastLogin,
		LastLogout:         c.LastLogout,
		AutoResumeExpedition: c.AutoResumeExpedition,
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
	}
}

func convertGameCharToDBChar(c *game.CharacterData) *db.Character {
	if c == nil {
		return nil
	}
	return &db.Character{
		ID:                 c.ID,
		AccountID:          c.AccountID,
		Name:               c.Name,
		Vocation:           c.Vocation,
		Origin:             c.Origin,
		Level:              c.Level,
		Experience:         c.Experience,
		Health:             c.Health,
		MaxHealth:          c.MaxHealth,
		Mana:               c.Mana,
		MaxMana:            c.MaxMana,
		GoldBank:           c.GoldBank,
		STR:                c.STR,
		DEX:                c.DEX,
		INT:                c.INT,
		VIT:                c.VIT,
		UnspentPoints:      c.UnspentPoints,
		Masteries:          c.Masteries,
		LearnedSkills:      c.LearnedSkills,
		ActiveSkills:       c.ActiveSkills,
		UnlockedRegions:    c.UnlockedRegions,
		IsExpeditionActive: c.IsExpeditionActive,
		ActiveRegion:       c.ActiveRegion,
		ActiveStance:       c.ActiveStance,
		CurrentStage:       c.CurrentStage,
		IsBossStage:        c.IsBossStage,
		StateRevision:      c.StateRevision,
		LastLogin:          c.LastLogin,
		LastLogout:         c.LastLogout,
		AutoResumeExpedition: c.AutoResumeExpedition,
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
	tkn, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
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

	dbInv, err := db.GetCharacterInventory(charID)
	if err != nil {
		lifecycleLock.Unlock()
		http.Error(w, "Inventário do personagem não encontrado", http.StatusInternalServerError)
		return
	}
	if err := db.SaveCharacterInventory(charID, dbInv); err != nil { // persiste migração de balance_version
		lifecycleLock.Unlock()
		http.Error(w, "Não foi possível reconciliar o inventário", http.StatusInternalServerError)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		lifecycleLock.Unlock()
		log.Printf("Erro ao fazer upgrade para WebSocket: %v", err)
		return
	}

	gameChar := convertDBCharToGameChar(char)
	gameInv := convertDBInvToGameInv(dbInv)
	saveInvWrapper := func(cid string, gInv *game.InventoryData) error {
		return db.SaveCharacterInventory(cid, convertGameInvToDBInv(gInv))
	}
	saveCharWrapper := func(gChar *game.CharacterData) error {
		return db.UpdateCharacterState(convertGameCharToDBChar(gChar))
	}
	getLootWrapper := func(level int) *game.Item {
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		return db.GetRandomLoot(level, r)
	}
	getMonsterWrapper := func(region string, level int) game.Monster {
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		return game.GetRandomMonsterForRegion(region, r)
	}

	session := game.NewGameSession(gameChar, gameInv, saveInvWrapper, saveCharWrapper, getLootWrapper, getMonsterWrapper)
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
	go session.StartTicker()
	lifecycleLock.Unlock()
	readerDone := make(chan struct{})

	defer func() {
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
			return
		}
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
			switch act.Action {
			case "TOGGLE_EXPEDITION":
				session.ToggleExpedition()
			case "EQUIP_ITEM":
				session.EquipItem(act.ItemID, act.Slot)
			case "UNEQUIP_ITEM":
				session.UnequipItem(act.Slot)
			case "CHANGE_REGION":
				targetReg := act.RegionID
				if targetReg == "" {
					targetReg = act.Region
				}
				session.SelectRegion(targetReg)
			case "SET_STANCE":
				session.SetStance(act.Stance)
			case "DISCARD_ITEM":
				session.DiscardItem(act.ItemID)
			case "TOGGLE_SKILL":
				session.ToggleSkill(act.Skill)
			case "ALLOCATE_STAT":
				session.AllocateStat(act.Stat)
			case "CHOOSE_STARTER_PACK":
				session.ChooseStarterPack(act.Pack)
			case "BULK_SELL":
				session.BulkSell(act.ItemIDs)
			case "SET_AUTO_RESUME":
				session.SetAutoResumeExpedition(act.Enabled)
			}
		}
	}()

	// Envio do Estado Inicial / Boas Vindas. Mantém o lock até a serialização
	// terminar para que ticker e ações não alterem ponteiros durante o primeiro frame.
	session.Mu.Lock()
	totalAtk, totalDef := session.CalculateStats()
	welcomeMsg := "Bem-vindo de volta ao acampamento. Pronto para a próxima expedição."
	if session.IsExpeditionActive {
		welcomeMsg = "Sua expedição continua em andamento!"
	}
	initialMsg := game.CombatMessage{
		Type:         "WELCOME_EVENT",
		Timestamp:    time.Now().Format("15:04:05"),
		Character:    session.Character,
		Inventory:    session.Inventory,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: session.ActiveRegion,
		ActiveStance: session.ActiveStance,
		CurrentStage: session.CurrentStage,
		MaxStages:    session.MaxStages,
		IsBossStage:  session.IsBossStage,
		LogText:      welcomeMsg,
		IsActive:     session.IsExpeditionActive,
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
		case msg, ok := <-session.SendChannel:
			if !ok {
				return
			}
			if err := conn.WriteJSON(msg); err != nil {
				log.Printf("Erro enviando WebSocket frame: %v", err)
				return
			}
			if msg.Character != nil {
				_ = db.UpdateCharacterState(convertGameCharToDBChar(msg.Character))
			}
		}
	}
}
