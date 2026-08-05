package main

import (
	"log"
	"net/http"
	"sync"
	"time"
	"math/rand"

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
	activeSessions = make(map[string]*game.GameSession)
	sessionsMu     sync.Mutex
)

type ClientAction struct {
	Action   string `json:"action"`
	ItemID   string `json:"item_id"`
	Slot     string `json:"slot"`
	RegionID string `json:"region_id"`
	Region   string `json:"region"`
	Stance   string `json:"stance"`
	Skill    string `json:"skill"`
	Stat     string `json:"stat"`
	Pack     string `json:"pack"`
}


func convertDBCharToGameChar(c *db.Character) *game.CharacterData {
	if c == nil {
		return nil
	}
	return &game.CharacterData{
		ID:         c.ID,
		AccountID:  c.AccountID,
		Name:       c.Name,
		Vocation:   c.Vocation,
		Origin:     c.Origin,
		Level:      c.Level,
		Experience: c.Experience,
		Health:     c.Health,
		MaxHealth:  c.MaxHealth,
		Mana:       c.Mana,
		MaxMana:    c.MaxMana,
		GoldBank:      c.GoldBank,
		STR:           c.STR,
		DEX:           c.DEX,
		INT:           c.INT,
		VIT:           c.VIT,
		UnspentPoints: c.UnspentPoints,
		Masteries:     c.Masteries,
		LearnedSkills: c.LearnedSkills,
		ActiveSkills:  c.ActiveSkills,
		LastLogin:     c.LastLogin,
		LastLogout:    c.LastLogout,
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
		ID:         c.ID,
		AccountID:  c.AccountID,
		Name:       c.Name,
		Vocation:   c.Vocation,
		Origin:     c.Origin,
		Level:      c.Level,
		Experience: c.Experience,
		Health:     c.Health,
		MaxHealth:  c.MaxHealth,
		Mana:       c.Mana,
		MaxMana:    c.MaxMana,
		GoldBank:      c.GoldBank,
		STR:           c.STR,
		DEX:           c.DEX,
		INT:           c.INT,
		VIT:           c.VIT,
		UnspentPoints: c.UnspentPoints,
		Masteries:     c.Masteries,
		LearnedSkills: c.LearnedSkills,
		ActiveSkills:  c.ActiveSkills,
		LastLogin:     c.LastLogin,
		LastLogout:    c.LastLogout,
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

	char, err := db.GetCharacterByID(charID)
	if err != nil || char.AccountID != claims.AccountID {
		http.Error(w, "Personagem não encontrado ou não pertence a esta conta", http.StatusForbidden)
		return
	}

	dbInv, _ := db.GetCharacterInventory(charID)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Erro ao fazer upgrade para WebSocket: %v", err)
		return
	}
	defer conn.Close()

	sessionsMu.Lock()
	session, exists := activeSessions[charID]
	if !exists {
		gameChar := convertDBCharToGameChar(char)
		gameInv := convertDBInvToGameInv(dbInv)

		saveInvWrapper := func(cid string, gInv *game.InventoryData) error {
			return db.SaveCharacterInventory(cid, convertGameInvToDBInv(gInv))
		}
		saveCharWrapper := func(gChar *game.CharacterData) error {
			return db.UpdateCharacterState(convertGameCharToDBChar(gChar))
		}
		
		getLootWrapper := func(level int) *game.Item {
			// random source created per call or you could persist one
			r := rand.New(rand.NewSource(time.Now().UnixNano()))
			return db.GetRandomLoot(level, r)
		}
		
		getMonsterWrapper := func(region string, level int) game.Monster {
			r := rand.New(rand.NewSource(time.Now().UnixNano()))
			return game.GetRandomMonsterForRegion(region, level, r)
		}

		session = game.NewGameSession(gameChar, gameInv, saveInvWrapper, saveCharWrapper, getLootWrapper, getMonsterWrapper)
		activeSessions[charID] = session
		go session.StartTicker()
	}
	sessionsMu.Unlock()

	// Goroutine de Leitura de Ações do Cliente (Ações do Inventário / Expedição)
	go func() {
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
				session.SetRegion(targetReg)
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
			}
		}
	}()

	// Envio do Estado Inicial / Boas Vindas
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
		LogText:      welcomeMsg,
		IsActive:     session.IsExpeditionActive,
	}
	_ = conn.WriteJSON(initialMsg)

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
