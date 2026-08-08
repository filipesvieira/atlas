package game

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"strings"
	"sync"
	"time"
)

type AttackType string

const (
	AttackTypeMelee  AttackType = "melee"
	AttackTypeRanged AttackType = "ranged"
)

// GridWidth e GridHeight definem o tamanho da arena em tiles (32×32px)
// Arena: 500px × 260px → 15 cols × 8 rows
const (
	GridWidth  = 15
	GridHeight = 8
	HeroGridX  = 2
	HeroGridY  = 4
)

type Monster struct {
	ID         string     `json:"id"`
	Key        string     `json:"key"`
	VisualKey  string     `json:"visual_key"`
	IsBoss     bool       `json:"is_boss"`
	Name       string     `json:"name"`
	Level      int        `json:"level"`
	Health     int        `json:"health"`
	MaxHealth  int        `json:"max_health"`
	Attack     int        `json:"attack"`
	AttackType AttackType `json:"attack_type"` // "melee" | "ranged"
	GridX      int        `json:"grid_x"`      // Posição horizontal no grid (0-14)
	GridY      int        `json:"grid_y"`      // Posição vertical no grid (0-7)
	State      string     `json:"state"`       // "CHASE", "ATTACK", "KITE", "FLEE"
}

type EquipmentSlots struct {
	Head     *Item `json:"head"`
	Necklace *Item `json:"necklace"`
	Chest    *Item `json:"chest"`
	MainHand *Item `json:"mainhand"`
	OffHand  *Item `json:"offhand"`
	Legs     *Item `json:"legs"`
	Boots    *Item `json:"boots"`
	Ring     *Item `json:"ring"`
	Ammo     *Item `json:"ammo"`
	Bag      *Item `json:"bag"`
}

type InventoryData struct {
	Equipment EquipmentSlots `json:"equipment"`
	Backpack  []Item         `json:"backpack"`
	Cap       int            `json:"cap"`
}

type MasteriesData struct {
	SwordMastery    int `json:"sword_mastery"`
	AxeMastery      int `json:"axe_mastery"`
	ShieldMastery   int `json:"shield_mastery"`
	DistanceMastery int `json:"distance_mastery"`
	MagicMastery    int `json:"magic_mastery"`
	ClubMastery     int `json:"club_mastery"`
}

type CharacterData struct {
	ID                 string        `json:"id"`
	AccountID          string        `json:"account_id"`
	Name               string        `json:"name"`
	Vocation           string        `json:"vocation"`
	Origin             string        `json:"origin"`
	Level              int           `json:"level"`
	Experience         int64         `json:"experience"`
	Health             int           `json:"health"`
	MaxHealth          int           `json:"max_health"`
	Mana               int           `json:"mana"`
	MaxMana            int           `json:"max_mana"`
	GoldBank           int64         `json:"gold_bank"`
	STR                int           `json:"str"`
	DEX                int           `json:"dex"`
	INT                int           `json:"int_stat"`
	VIT                int           `json:"vit"`
	UnspentPoints      int           `json:"unspent_points"`
	Masteries          MasteriesData `json:"masteries"`
	LearnedSkills      []string      `json:"learned_skills"`
	ActiveSkills       []string      `json:"active_skills"`
	UnlockedRegions    []string      `json:"unlocked_regions"`
	IsExpeditionActive bool          `json:"is_expedition_active"`
	ActiveRegion       string        `json:"active_region"`
	ActiveStance       string        `json:"active_stance"`
	CurrentStage       int           `json:"current_stage"`
	IsBossStage        bool          `json:"is_boss_stage"`
	StateRevision      int64         `json:"state_revision"`
	LastLogin          time.Time     `json:"last_login"`
	LastLogout         time.Time     `json:"last_logout"`
	AutoResumeExpedition bool        `json:"auto_resume_expedition"`
}

type CombatMessage struct {
	Type         string         `json:"type"` // TICK_UPDATE, COMBAT_EVENT, LOOT_DROP, LEVEL_UP, EQUIPMENT_UPDATE, STANCE_UPDATE, SKILL_CAST
	Timestamp    string         `json:"timestamp"`
	Character    *CharacterData `json:"character"`
	Inventory    *InventoryData `json:"inventory,omitempty"`
	Monsters     []Monster      `json:"monsters,omitempty"`
	DamageDealt  int            `json:"damage_dealt,omitempty"`
	DamageTaken  int            `json:"damage_taken,omitempty"`
	DPS          int            `json:"dps,omitempty"`
	TotalAttack  int            `json:"total_attack"`
	TotalDefense int            `json:"total_defense"`
	ActiveRegion string         `json:"active_region,omitempty"`
	ActiveBiome  string         `json:"active_biome,omitempty"`
	ActiveStance string         `json:"active_stance,omitempty"`
	CurrentStage int            `json:"current_stage"`
	MaxStages    int            `json:"max_stages"`
	IsBossStage  bool           `json:"is_boss_stage"`
	LogText      string         `json:"log_text"`
	ItemFound    *Item          `json:"item_found,omitempty"`
	IsActive     bool           `json:"is_active"`
}

type GameSession struct {
	Mu                  sync.Mutex
	Character           *CharacterData
	Inventory           *InventoryData
	IsExpeditionActive  bool
	HasBroadcastRestLog bool
	ActiveRegion        string
	ActiveStance        string
	CurrentStage        int
	MaxStages           int
	IsBossStage         bool
	CurrentMonsters     []Monster
	SendChannel         chan CombatMessage
	StopChan            chan struct{}
	TickerDone          chan struct{}
	SaveInvFunc         func(charID string, inv *InventoryData) error
	SaveCharFunc        func(char *CharacterData) error
	GetLootFunc         func(playerLevel int) *Item
	GetMonsterFunc      func(region string, playerLevel int) Monster
	AutoResumePending   bool
	RecoveringFromDefeat bool
}

func GetRequiredXPForLevel(level int) int64 {
	if level <= 1 {
		return 250
	}
	return int64(math.Floor(250.0 * math.Pow(float64(level), 1.95)))
}

func NewGameSession(char *CharacterData, inv *InventoryData, saveInv func(string, *InventoryData) error, saveChar func(*CharacterData) error, getLoot func(int) *Item, getMonster func(string, int) Monster) *GameSession {
	if inv == nil {
		inv = &InventoryData{
			Equipment: EquipmentSlots{},
			Backpack:  []Item{},
			Cap:       1500,
		}
	} else if inv.Backpack == nil {
		inv.Backpack = []Item{}
	}
	if char.LearnedSkills == nil {
		char.LearnedSkills = []string{"whirlwind"}
	}
	EnsureUnlockedRegionsForLevel(char)

	activeReg := char.ActiveRegion
	if activeReg == "" {
		activeReg = DefaultExpeditionRegionID
	}
	activeRegionDefinition, exists := GetExpeditionRegion(activeReg)
	if !exists {
		activeReg = DefaultExpeditionRegionID
		activeRegionDefinition, _ = GetExpeditionRegion(activeReg)
	}
	maxStages := activeRegionDefinition.MaxStages
	if maxStages <= 0 {
		maxStages = DefaultExpeditionMaxStages
	}

	activeStance := char.ActiveStance
	if activeStance != "offensive" && activeStance != "defensive" && activeStance != "balanced" {
		activeStance = "balanced"
	}
	currentStage := char.CurrentStage
	if currentStage < 1 || currentStage > maxStages {
		currentStage = 1
	}

	return &GameSession{
		Character:          char,
		Inventory:          inv,
		IsExpeditionActive: char.IsExpeditionActive,
		ActiveRegion:       activeReg,
		ActiveStance:       activeStance,
		CurrentStage:       currentStage,
		MaxStages:          maxStages,
		IsBossStage:        char.IsBossStage,
		CurrentMonsters:    []Monster{},
		SendChannel:        make(chan CombatMessage, 100),
		StopChan:           make(chan struct{}),
		TickerDone:         make(chan struct{}),
		SaveInvFunc:        saveInv,
		SaveCharFunc:       saveChar,
		GetLootFunc:        getLoot,
		GetMonsterFunc:     getMonster,
	}
}

func (s *GameSession) syncPersistentExpeditionState() {
	if s == nil || s.Character == nil {
		return
	}
	s.Character.IsExpeditionActive = s.IsExpeditionActive
	s.Character.ActiveRegion = s.ActiveRegion
	s.Character.ActiveStance = s.ActiveStance
	s.Character.CurrentStage = s.CurrentStage
	s.Character.IsBossStage = s.IsBossStage
}

func GetMasteryLevel(tries int) int {
	if tries <= 0 {
		return 10
	}
	return 10 + int(math.Floor(math.Pow(float64(tries)/10.0, 0.45)))
}

func (s *GameSession) CalculateStats() (int, int) {
	if s.Character.STR <= 0 {
		s.Character.STR = 5
	}
	if s.Character.DEX <= 0 {
		s.Character.DEX = 5
	}
	if s.Character.INT <= 0 {
		s.Character.INT = 5
	}
	if s.Character.VIT <= 0 {
		s.Character.VIT = 5
	}

	// Max HP & Max Mana derivados dos Atributos Primários VIT, INT e Level
	eq := s.Inventory.Equipment
	bonusSTR, bonusDEX, bonusINT, bonusHP, bonusMP := 0, 0, 0, 0, 0

	equippedList := []*Item{
		eq.Head, eq.Chest, eq.Legs, eq.Boots,
		eq.MainHand, eq.OffHand, eq.Necklace, eq.Ring,
		eq.Ammo, eq.Bag,
	}

	for _, item := range equippedList {
		if item != nil {
			bonusSTR += item.BonusSTR
			bonusDEX += item.BonusDEX
			bonusINT += item.BonusINT
			bonusHP += item.BonusHP
			bonusMP += item.BonusMP
		}
	}

	effectiveSTR := s.Character.STR + bonusSTR
	effectiveDEX := s.Character.DEX + bonusDEX
	effectiveINT := s.Character.INT + bonusINT

	s.Character.MaxHealth = 100 + (s.Character.VIT * 25) + (s.Character.Level * 10) + bonusHP
	s.Character.MaxMana = 30 + (effectiveINT * 15) + (s.Character.Level * 5) + bonusMP

	totalAtk := 0

	// Ataque usa os campos separados. `Attack` é apenas fallback para itens legados;
	// somá-lo aos campos novos duplicava o dano de todo item recém-gerado.
	if eq.MainHand != nil {
		wType := GetItemWeaponType(eq.MainHand)
		physical := eq.MainHand.PhysicalAttack
		magic := eq.MainHand.MagicAttack
		if physical == 0 && magic == 0 {
			physical = eq.MainHand.Attack
		}
		switch wType {
		case WeaponTypeBow:
			ammoAtk := 0
			if eq.Ammo != nil {
				ammoAtk = eq.Ammo.PhysicalAttack
				if ammoAtk == 0 && eq.Ammo.MagicAttack == 0 {
					ammoAtk = eq.Ammo.Attack
				}
			}
			baseDmg := math.Max(1, float64(physical+ammoAtk))
			totalAtk = int(baseDmg * (1.0 + (float64(effectiveDEX) / 100.0)))
		case WeaponTypeWand:
			if magic == 0 {
				magic = eq.MainHand.Attack
			}
			baseDmg := math.Max(1, float64(magic))
			totalAtk = int(baseDmg * (1.0 + (float64(effectiveINT) / 100.0)))
		default:
			baseDmg := math.Max(1, float64(physical))
			totalAtk = int(baseDmg * (1.0 + (float64(effectiveSTR) / 100.0)))
		}
	} else {
		totalAtk = int(5.0 * (1.0 + (float64(effectiveSTR) / 100.0)))
	}

	// Aplica Bônus de Maestria (1 ponto de Atk a cada 4 níveis de maestria acima de 10)
	var masteryLevel int
	if eq.MainHand != nil {
		wType := GetItemWeaponType(eq.MainHand)
		switch wType {
		case WeaponTypeAxe:
			masteryLevel = GetMasteryLevel(s.Character.Masteries.AxeMastery)
		case WeaponTypeBow:
			masteryLevel = GetMasteryLevel(s.Character.Masteries.DistanceMastery)
		case WeaponTypeWand:
			masteryLevel = GetMasteryLevel(s.Character.Masteries.MagicMastery)
		case WeaponTypeClub:
			masteryLevel = GetMasteryLevel(s.Character.Masteries.ClubMastery)
		default:
			masteryLevel = GetMasteryLevel(s.Character.Masteries.SwordMastery)
		}
	} else {
		masteryLevel = GetMasteryLevel(s.Character.Masteries.SwordMastery)
	}

	if masteryLevel > 10 {
		totalAtk += (masteryLevel - 10) / 4
	}

	// Defesa Física Total: (VIT * 0.5) + Equipamentos
	totalDef := int(float64(s.Character.VIT) * 0.5)
	for _, item := range equippedList {
		if item != nil {
			totalDef += item.Defense
		}
	}
	if eq.OffHand != nil {
		shieldLevel := GetMasteryLevel(s.Character.Masteries.ShieldMastery)
		if shieldLevel > 10 {
			totalDef += (shieldLevel - 10) / 4
		}
	}

	// Modificadores de Postura Tática
	switch s.ActiveStance {
	case "offensive":
		totalAtk = int(float64(totalAtk) * 1.35)
		totalDef = int(float64(totalDef) * 0.80)
	case "defensive":
		totalDef = int(float64(totalDef) * 1.50)
		totalAtk = int(float64(totalAtk) * 0.75)
	}

	return totalAtk, totalDef
}

func (s *GameSession) StartTicker() {
	ticker := time.NewTicker(750 * time.Millisecond)
	done := s.TickerDone
	defer ticker.Stop()
	defer close(done)

	for {
		select {
		case <-s.StopChan:
			return
		case <-ticker.C:
			s.Mu.Lock()
			if s.IsExpeditionActive {
				s.HasBroadcastRestLog = false
				s.processTick()
			} else {
				if s.Character.Health < s.Character.MaxHealth {
					s.Character.Health += 3
					if s.Character.Health > s.Character.MaxHealth {
						s.Character.Health = s.Character.MaxHealth
					}
				}
				if s.Character.Mana < s.Character.MaxMana {
					s.Character.Mana += 2
					if s.Character.Mana > s.Character.MaxMana {
						s.Character.Mana = s.Character.MaxMana
					}
				}
				totalAtk, totalDef := s.CalculateStats()

				if s.RecoveringFromDefeat && s.AutoResumePending && s.Character.AutoResumeExpedition && s.Character.Health >= s.Character.MaxHealth && s.Character.Mana >= s.Character.MaxMana {
					s.IsExpeditionActive = true
					s.Character.IsExpeditionActive = true
					s.RecoveringFromDefeat = false
					s.AutoResumePending = false
					s.syncPersistentExpeditionState()
					if s.SaveCharFunc != nil {
						_ = s.SaveCharFunc(s.Character)
					}
					regName := s.ActiveRegion
					if reg, exists := GetExpeditionRegion(s.ActiveRegion); exists {
						regName = reg.Name
					}
					s.broadcastMessage(CombatMessage{
						Type:         "EXPEDITION_STATUS",
						Timestamp:    time.Now().Format("15:04:05"),
						Character:    s.Character,
						Inventory:    s.Inventory,
						ActiveRegion: s.ActiveRegion,
						ActiveStance: s.ActiveStance,
						CurrentStage: s.CurrentStage,
						MaxStages:    s.MaxStages,
						IsBossStage:  s.IsBossStage,
						LogText:      fmt.Sprintf("❤️ Vida e mana totalmente recuperadas. Retornando automaticamente para %s...", regName),
						IsActive:     true,
					})
				} else {
					restLog := ""
					if !s.HasBroadcastRestLog {
						restLog = "Em descanso no acampamento."
						s.HasBroadcastRestLog = true
					}

					s.broadcastMessage(CombatMessage{
						Type:         "TICK_UPDATE",
						Timestamp:    time.Now().Format("15:04:05"),
						Character:    s.Character,
						Inventory:    s.Inventory,
						TotalAttack:  totalAtk,
						TotalDefense: totalDef,
						ActiveRegion: s.ActiveRegion,
						ActiveStance: s.ActiveStance,
						LogText:      restLog,
						IsActive:     false,
					})
				}
			}
			s.Mu.Unlock()
		}
	}
}

func (s *GameSession) StopTicker() {
	s.Mu.Lock()
	select {
	case <-s.StopChan:
	default:
		close(s.StopChan)
	}
	done := s.TickerDone
	s.Mu.Unlock()

	// Aguarda o loop encerrar para que nenhum tick posterior possa alterar o
	// snapshot que será marcado como fronteira da próxima janela offline.
	if done != nil {
		<-done
	}
}

func (s *GameSession) EnsureTickerRunning() {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	select {
	case <-s.StopChan:
		s.StopChan = make(chan struct{})
		s.TickerDone = make(chan struct{})
		go s.StartTicker()
	default:
		// Ticker está ativo e rodando
	}
}

func (s *GameSession) processTick() {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	totalAtk, totalDef := s.CalculateStats()

	// FASE 2: Controle de Estágios e Spawn (Estágios 1 a 4 = Monstros Normais, Estágio 5 = BOSS)
	regInfo, regExists := GetExpeditionRegion(s.ActiveRegion)
	if !regExists {
		regInfo, _ = GetExpeditionRegion(DefaultExpeditionRegionID)
	}

	if s.CurrentStage <= 0 {
		s.CurrentStage = 1
	}
	s.MaxStages = regInfo.MaxStages

	if len(s.CurrentMonsters) == 0 {
		if s.CurrentStage >= s.MaxStages {
			// FASE FINAL 5: SPAWN DO BOSS (Fila Indiana: Guarda-costas na frente, Boss entra POR ÚLTIMO)
			s.IsBossStage = true
			s.CurrentMonsters = make([]Monster, 0, 3)

			// 1. Guarda-costas entram primeiro na frente da fila (GridX menor)
			for i := 0; i < 2; i++ {
				var m Monster
				if s.GetMonsterFunc != nil {
					m = s.GetMonsterFunc(s.ActiveRegion, s.Character.Level)
				} else {
					m = Monster{Name: "Guarda-Costas", Level: 1, Health: 60, MaxHealth: 60, Attack: 7, AttackType: AttackTypeMelee}
				}
				m.ID = fmt.Sprintf("mob_%d_%d", time.Now().UnixNano(), i)
				m.GridX = (GridWidth - 3) + i // ex: GridX = 12, 13
				m.GridY = HeroGridY            // Fila indiana central (GridY = 4)
				m.State = "CHASE"
				s.CurrentMonsters = append(s.CurrentMonsters, m)
			}

			// 2. Boss entra POR ÚLTIMO no final da fila (GridX maior, retaguarda da marcha)
			bossMob := regInfo.Boss
			bossMob.ID = fmt.Sprintf("boss_%d", time.Now().UnixNano())
			bossMob.GridX = GridWidth - 1 // Entra pela extrema direita (GridX = 14)
			bossMob.GridY = HeroGridY     // Fila indiana central (GridY = 4)
			bossMob.State = "CHASE"
			s.CurrentMonsters = append(s.CurrentMonsters, bossMob)

			s.broadcastMessage(CombatMessage{
				Type:         "COMBAT_EVENT",
				Timestamp:    time.Now().Format("15:04:05"),
				Character:    s.Character,
				Inventory:    s.Inventory,
				Monsters:     s.CurrentMonsters,
				TotalAttack:  totalAtk,
				TotalDefense: totalDef,
				ActiveRegion: s.ActiveRegion,
				ActiveStance: s.ActiveStance,
				CurrentStage: s.CurrentStage,
				MaxStages:    s.MaxStages,
				IsBossStage:  true,
				LogText:      fmt.Sprintf("🔥 FASE FINAL 5/5! O CHEFÃO [%s] APARECEU EM %s!", bossMob.Name, regInfo.Name),
				IsActive:     true,
			})
			return
		} else {
			// ESTÁGIOS 1 A 4: SPAWN DE MONSTROS NORMAIS EM FILA INDIANA
			s.IsBossStage = false
			count := s.CurrentStage
			if count < 1 {
				count = 1
			}
			s.CurrentMonsters = make([]Monster, 0, count)
			for i := 0; i < count; i++ {
				var m Monster
				if s.GetMonsterFunc != nil {
					m = s.GetMonsterFunc(s.ActiveRegion, s.Character.Level)
				} else {
					m = Monster{Name: "Goblin Salteador", Level: 1, Health: 60, MaxHealth: 60, Attack: 7, AttackType: AttackTypeMelee}
				}
				m.ID = fmt.Sprintf("mob_%d_%d", time.Now().UnixNano(), i)
				m.GridX = (GridWidth - count) + i // Espaçados horizontalmente em fila indiana
				if m.GridX < HeroGridX+1 {
					m.GridX = HeroGridX + 1
				}
				m.GridY = HeroGridY // Fila indiana central (GridY = 4)
				m.State = "CHASE"
				s.CurrentMonsters = append(s.CurrentMonsters, m)
			}

			s.broadcastMessage(CombatMessage{
				Type:         "COMBAT_EVENT",
				Timestamp:    time.Now().Format("15:04:05"),
				Character:    s.Character,
				Inventory:    s.Inventory,
				Monsters:     s.CurrentMonsters,
				TotalAttack:  totalAtk,
				TotalDefense: totalDef,
				ActiveRegion: s.ActiveRegion,
				ActiveStance: s.ActiveStance,
				CurrentStage: s.CurrentStage,
				MaxStages:    s.MaxStages,
				IsBossStage:  false,
				LogText:      fmt.Sprintf("⚔️ FASE %d/5: Horda inimiga apareceu em %s!", s.CurrentStage, regInfo.Name),
				IsActive:     true,
			})
			return
		}
	}

	// FASE TÁTICA: Movimentação por Grid antes do combate
	// Cada tick avança 1 tile na direção do confronto
	for i := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[i]

		// Transição para FLEE se HP estiver crítico (< 20%)
		if mob.Health < int(float64(mob.MaxHealth)*0.20) && mob.State != "FLEE" {
			mob.State = "FLEE"
		}

		switch mob.State {
		case "FLEE":
			// Foge para a direita (aumenta GridX)
			if mob.GridX < GridWidth-1 {
				mob.GridX++
			}

		case "CHASE":
			if mob.AttackType == AttackTypeRanged {
				// Ranged: avança até GridX = 9 (distância segura de 7 tiles do herói)
				if mob.GridX > 9 {
					mob.GridX--
				} else {
					mob.State = "KITE"
				}
			} else {
				// Melee: avança até GridX = 3 (adjacente ao herói em GridX = 2)
				if mob.GridX > HeroGridX+1 {
					mob.GridX--
				} else {
					mob.State = "ATTACK"
				}
			}

		case "KITE":
			// Ranged em posição de tiro — mantém distância; se herói "avançar", recua
			// (Neste jogo o herói é fixo, então KITE = estado de ataque à distância)
			mob.State = "KITE" // Permanece aqui até FLEE

		case "ATTACK":
			// Melee em combate corpo-a-corpo — permanece adjacente
			mob.State = "ATTACK"
		}
	}

	// Regeneração contínua de HP e Mana durante a expedição
	eq := s.Inventory.Equipment
	manaRegenExtra := 0
	equippedListForTick := []*Item{
		eq.Head, eq.Chest, eq.Legs, eq.Boots,
		eq.MainHand, eq.OffHand, eq.Necklace, eq.Ring,
		eq.Ammo, eq.Bag,
	}
	for _, it := range equippedListForTick {
		if it != nil {
			manaRegenExtra += it.ManaRegen
		}
	}

	if s.Character.Health < s.Character.MaxHealth {
		s.Character.Health += 1
		if s.Character.Health > s.Character.MaxHealth {
			s.Character.Health = s.Character.MaxHealth
		}
	}
	if s.Character.Mana < s.Character.MaxMana {
		s.Character.Mana += 3 + manaRegenExtra
		if s.Character.Mana > s.Character.MaxMana {
			s.Character.Mana = s.Character.MaxMana
		}
	}

	targetMonster := &s.CurrentMonsters[0]

	totalDamageDealt := 0
	// FASE 4: Consumo Ativo de Mana & Habilidades Especiais Aprendidas (Apenas Ativas)
	skillCastLog := ""

	if len(s.Character.ActiveSkills) > 0 {
		skillKey := s.Character.ActiveSkills[r.Intn(len(s.Character.ActiveSkills))]
		magicLevel := GetMasteryLevel(s.Character.Masteries.MagicMastery)

		switch skillKey {
		case "whirlwind":
			if s.Character.Mana >= 18 {
				s.Character.Mana -= 18
				bonusDmg := int(float64(totalAtk) * 0.9)
				for i := range s.CurrentMonsters {
					s.CurrentMonsters[i].Health -= bonusDmg
					totalDamageDealt += bonusDmg
				}
				skillCastLog = fmt.Sprintf(" [HABILIDADE: Golpe Giratório] Custo: 18 Mana | Dano em Área: %d!", bonusDmg)
				// Concede 1 Try na maestria da arma corporal equipada
				if eq.MainHand != nil {
					switch GetItemWeaponType(eq.MainHand) {
					case WeaponTypeAxe:
						s.Character.Masteries.AxeMastery += 1
					case WeaponTypeClub:
						s.Character.Masteries.ClubMastery += 1
					default:
						s.Character.Masteries.SwordMastery += 1
					}
				} else {
					s.Character.Masteries.SwordMastery += 1
				}
			}
		case "fireball":
			if s.Character.Mana >= 25 {
				s.Character.Mana -= 25
				// Dano estilo Tibia: Base + (MagicLevel * 2.5) + (CharLevel / 4)
				magicDmg := 25 + int(float64(magicLevel)*2.5) + (s.Character.Level / 4)
				targetMonster.Health -= magicDmg
				totalDamageDealt += magicDmg
				skillCastLog = fmt.Sprintf(" [MAGIA: Bola de Fogo] Custo: 25 Mana | Dano Mágico: %d!", magicDmg)
				// Try System: 25 MP = 2 Tries em MagicMastery
				s.Character.Masteries.MagicMastery += 2
			}
		case "multishot":
			if s.Character.Mana >= 15 {
				s.Character.Mana -= 15
				arrowDmg := int(float64(totalAtk) * 0.8)
				for i := range s.CurrentMonsters {
					s.CurrentMonsters[i].Health -= arrowDmg
					totalDamageDealt += arrowDmg
				}
				skillCastLog = fmt.Sprintf(" [HABILIDADE: Tiro Quádruplo] Custo: 15 Mana | Dano: %d!", arrowDmg)
				// Try System: 15 MP = 1 Try em DistanceMastery
				s.Character.Masteries.DistanceMastery += 1
			}
		case "divine_heal":
			if s.Character.Mana >= 30 && s.Character.Health < s.Character.MaxHealth {
				s.Character.Mana -= 30
				healAmount := 80 + (magicLevel * 3)
				s.Character.Health += healAmount
				if s.Character.Health > s.Character.MaxHealth {
					s.Character.Health = s.Character.MaxHealth
				}
				skillCastLog = fmt.Sprintf(" [FEITIÇO: Cura Divina] Custo: 30 Mana | +%d HP!", healAmount)
				// Try System: 30 MP = 3 Tries em MagicMastery
				s.Character.Masteries.MagicMastery += 3
			}
		}
	}

	// 1. Dano do Aventureiro com Variância (±15%) e Chance de Crítico por DEX + Equipamento
	extraCritChance := 0.0
	for _, it := range equippedListForTick {
		if it != nil {
			extraCritChance += it.CritChance
		}
	}
	critChance := 0.05 + (float64(s.Character.DEX) * 0.0025) + (extraCritChance / 100.0)
	baseAtkFuzz := int(float64(totalAtk) * (0.85 + r.Float64()*0.30))
	isCrit := r.Float64() <= critChance

	playerAtk := baseAtkFuzz
	critText := ""
	if isCrit {
		playerAtk = int(float64(baseAtkFuzz) * 1.50)
		critText = " ⚡ DANO CRÍTICO!"
	}

	targetMonster.Health -= playerAtk
	totalDamageDealt += playerAtk
	logMsg := fmt.Sprintf("Você atacou %s causando %d de dano!%s", targetMonster.Name, playerAtk, critText) + skillCastLog

	// Multiplicador de Velocidade de Ataque por Tipo de Arma
	speedMultiplier := 1.00
	if eq.MainHand != nil {
		wType := GetItemWeaponType(eq.MainHand)
		switch wType {
		case WeaponTypeBow:
			speedMultiplier = 1.40 // Arqueiro: Alta cadência à distância
		case WeaponTypeWand:
			speedMultiplier = 1.25 // Mago: Cadência média/rápida com dano mágico
		default:
			speedMultiplier = 1.00 // Melee: Golpe cadenciado mais pesado + uso de escudo
		}
	}

	// Calcula o DPS dinâmico (Dano por segundo = Dano por tick / 0.75s * Multiplicador de Velocidade)
	currentDPS := int((float64(totalDamageDealt) / 0.75) * speedMultiplier)

	// FASE 3: Incrementar Maestria por uso da arma (+1 Try)
	if eq.MainHand != nil {
		wType := GetItemWeaponType(eq.MainHand)
		switch wType {
		case WeaponTypeAxe:
			s.Character.Masteries.AxeMastery += 1
		case WeaponTypeBow:
			s.Character.Masteries.DistanceMastery += 1
		case WeaponTypeWand:
			s.Character.Masteries.MagicMastery += 1
		case WeaponTypeClub:
			s.Character.Masteries.ClubMastery += 1
		default:
			s.Character.Masteries.SwordMastery += 1
		}
	} else {
		s.Character.Masteries.SwordMastery += 1
	}

	if eq.OffHand != nil {
		s.Character.Masteries.ShieldMastery += 1
	}

	// 2. Dano dos Monstros Ativos na Arena com Checagem de Proximidade / Colisão
	// Regra de Vantagem à Distância: Monstros Melee SÓ causam dano quando encostam no herói (GridX <= HeroGridX + 1)
	totalDamageTaken := 0
	for i := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[i]
		if mob.Health > 0 {
			canHitHero := false
			if mob.AttackType == AttackTypeRanged {
				// Ranged: Ataca a partir da distância de tiro
				if mob.State == "KITE" || mob.GridX <= 9 {
					canHitHero = true
				}
			} else {
				// Melee: SÓ ataca quando chega em adjacência/colisão com o herói
				if mob.State == "ATTACK" || mob.GridX <= HeroGridX+1 {
					canHitHero = true
				}
			}

			if canHitHero {
				mitigationPct := float64(totalDef) / (float64(totalDef) + float64(20*mob.Level))
				rawMonsterAtk := float64(mob.Attack + r.Intn(4))
				mAtk := int(math.Max(1.0, math.Round(rawMonsterAtk*(1.0-mitigationPct))))
				totalDamageTaken += mAtk
			}
		}
	}
	s.Character.Health -= totalDamageTaken
	if totalDamageTaken > 0 {
		logMsg += fmt.Sprintf(" Horda inimiga contra-atacou causando %d de dano total!", totalDamageTaken)
	} else {
		logMsg += " (Monstros Melee avançando... herói mantém vantagem à distância!)"
	}

	// 3. Autocura de emergência se HP < 35%
	hpThreshold := 0.35
	if s.ActiveStance == "defensive" {
		hpThreshold = 0.50
	}
	if s.Character.Health < int(float64(s.Character.MaxHealth)*hpThreshold) && s.Character.Mana >= 15 {
		s.Character.Mana -= 15
		healAmt := 45 + (GetMasteryLevel(s.Character.Masteries.MagicMastery) * 2)
		s.Character.Health += healAmt
		if s.Character.Health > s.Character.MaxHealth {
			s.Character.Health = s.Character.MaxHealth
		}
		logMsg += fmt.Sprintf(" [EMERGÊNCIA/CURA] +%d HP!", healAmt)
	}

	// 3.5 Lifesteal Application
	lifestealPct := 0.0
	if eq.MainHand != nil {
		lifestealPct += eq.MainHand.Lifesteal
	}
	if eq.OffHand != nil {
		lifestealPct += eq.OffHand.Lifesteal
	}
	if eq.Head != nil {
		lifestealPct += eq.Head.Lifesteal
	}
	if eq.Chest != nil {
		lifestealPct += eq.Chest.Lifesteal
	}
	if eq.Legs != nil {
		lifestealPct += eq.Legs.Lifesteal
	}
	if eq.Boots != nil {
		lifestealPct += eq.Boots.Lifesteal
	}
	if eq.Necklace != nil {
		lifestealPct += eq.Necklace.Lifesteal
	}
	if eq.Ring != nil {
		lifestealPct += eq.Ring.Lifesteal
	}

	if lifestealPct > 0 && playerAtk > 0 {
		heal := int(float64(playerAtk) * (lifestealPct / 100.0))
		if heal > 0 {
			s.Character.Health += heal
			if s.Character.Health > s.Character.MaxHealth {
				s.Character.Health = s.Character.MaxHealth
			}
			logMsg += fmt.Sprintf(" 🩸 Roubo de Vida (+%d HP)", heal)
		}
	}

	// 4. Morte do Aventureiro
	if s.Character.Health <= 0 {
		s.Character.Health = int(float64(s.Character.MaxHealth) * 0.4)
		s.RecoveringFromDefeat = true
		s.AutoResumePending = s.Character.AutoResumeExpedition
		s.IsExpeditionActive = false
		s.CurrentStage = 1
		s.IsBossStage = false
		s.CurrentMonsters = []Monster{}
		s.syncPersistentExpeditionState()
		if s.SaveCharFunc != nil {
			_ = s.SaveCharFunc(s.Character)
		}
		s.broadcastMessage(CombatMessage{
			Type:         "COMBAT_EVENT",
			Timestamp:    time.Now().Format("15:04:05"),
			Character:    s.Character,
			Inventory:    s.Inventory,
			DamageTaken:  totalDamageTaken,
			DamageDealt:  playerAtk,
			TotalAttack:  totalAtk,
			TotalDefense: totalDef,
			ActiveRegion: s.ActiveRegion,
			ActiveStance: s.ActiveStance,
			LogText:      "Você foi gravemente ferido e resgatado para o acampamento. A expedição foi reiniciada.",
			IsActive:     false,
		})
		return
	}

	// Remove monstros mortos e processa recompensas/loot
	aliveMonsters := []Monster{}
	for _, mob := range s.CurrentMonsters {
		if mob.Health > 0 {
			aliveMonsters = append(aliveMonsters, mob)
		} else {
			// Recompensa XP & Ouro
			rawXP := float64(60 + mob.Level*30)
			levelDiff := s.Character.Level - mob.Level
			xpMult := 1.0
			if levelDiff > 3 {
				xpMult = 1.0 - (0.15 * float64(levelDiff-3))
				if xpMult < 0.10 {
					xpMult = 0.10
				}
			}
			xpGained := int64(rawXP * xpMult)
			baseGold := float64(15 + r.Intn(25))

			goldBonusPct := 0.0
			for _, it := range equippedListForTick {
				if it != nil {
					goldBonusPct += it.GoldBonus
				}
			}
			goldGained := int64(baseGold * (1.0 + (goldBonusPct / 100.0)))

			s.Character.Experience += xpGained
			s.Character.GoldBank += goldGained

			logMsg += fmt.Sprintf(" %s derrotado! +%d XP e +%d Ouro!", mob.Name, xpGained, goldGained)

			// Roll de Loot Target (Tabela de Drop do Monstro)
			dropChance := 0.35
			if mob.IsBoss {
				dropChance = 1.00 // Boss sempre dropa loot de boss!
			}

			if r.Float64() < dropChance {
				itemKey := mob.Key
				if itemKey == "" {
					itemKey = mob.Name
				}
				item := GenerateLootForMonsterWithRand(itemKey, mob.Level, r)
				if item != nil {
					currentWeight := s.GetTotalWeight()
					maxWeight := s.GetTotalCapacity()
					maxSlots := s.GetMaxSlotCapacity()

					if currentWeight+item.Weight > maxWeight || len(s.Inventory.Backpack) >= maxSlots {
						goldValue := item.ValueGold
						if goldValue < 10 {
							goldValue = 10
						}
						s.Character.GoldBank += goldValue

						if len(s.Inventory.Backpack) >= maxSlots {
							logMsg += fmt.Sprintf(" 💰 SUPLENTO: Mochila cheia (%d/%d slots)! [%s] foi convertido em %d de ouro!", len(s.Inventory.Backpack), maxSlots, item.Name, goldValue)
						} else {
							logMsg += fmt.Sprintf(" 💰 SUPLENTO: Capacidade de peso excedida! [%s] foi convertido em %d de ouro!", item.Name, goldValue)
						}
					} else {
						s.Inventory.Backpack = append([]Item{*item}, s.Inventory.Backpack...)
						logMsg += fmt.Sprintf(" 🎁 LOOT: [%s] adicionado à mochila!", item.Name)
						if s.SaveInvFunc != nil {
							_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
						}
					}
				}
			}
		}
	}

	// Se a horda do estágio atual foi totalmente destruída:
	if len(aliveMonsters) == 0 {
		if s.IsBossStage {
			// VITÓRIA CONTRA O BOSS!
			logMsg += fmt.Sprintf(" 🏆 EXPEDIÇÃO CONCLUÍDA! O CHEFÃO DE %s FOI DERROTADO!", regInfo.Name)

			// Desbloquear a próxima expedição
			for _, reg := range ListExpeditionRegions() {
				if reg.RequiresUnlockFrom == s.ActiveRegion {
					alreadyUnlocked := false
					for _, unl := range s.Character.UnlockedRegions {
						if unl == reg.ID {
							alreadyUnlocked = true
							break
						}
					}
					if !alreadyUnlocked {
						s.Character.UnlockedRegions = append(s.Character.UnlockedRegions, reg.ID)
						logMsg += fmt.Sprintf(" 🔓 NOVA EXPEDIÇÃO DESBLOQUEADA: [%s]!", reg.Name)
					}
				}
			}

			// Reiniciar ciclo para a Fase 1
			s.CurrentStage = 1
			s.IsBossStage = false
		} else {
			// Avançar para a próxima Fase (Stage)
			s.CurrentStage++
			logMsg += fmt.Sprintf(" 🚩 FASE CONCLUÍDA! Avançando para a Fase %d/5...", s.CurrentStage)
		}
	}

	s.CurrentMonsters = aliveMonsters

	// Level Up Check: processa múltiplos níveis no mesmo tick/claim.
	levelsGained := 0
	for s.Character.Experience >= GetRequiredXPForLevel(s.Character.Level) {
		s.Character.Level++
		s.Character.UnspentPoints += 3
		levelsGained++
	}
	if levelsGained > 0 {
		s.CalculateStats()
		s.Character.Health = s.Character.MaxHealth
		s.Character.Mana = s.Character.MaxMana
		EnsureUnlockedRegionsForLevel(s.Character)
		logMsg += fmt.Sprintf(" 🌟 LEVEL UP! Você avançou %d nível(is) e chegou ao Nível %d!", levelsGained, s.Character.Level)
	}

	s.syncPersistentExpeditionState()
	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}

	s.broadcastMessage(CombatMessage{
		Type:         "COMBAT_EVENT",
		Timestamp:    time.Now().Format("15:04:05"),
		Character:    s.Character,
		Inventory:    s.Inventory,
		Monsters:     s.CurrentMonsters,
		DamageDealt:  totalDamageDealt,
		DamageTaken:  totalDamageTaken,
		DPS:          currentDPS,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: s.ActiveRegion,
		ActiveStance: s.ActiveStance,
		LogText:      logMsg,
		IsActive:     true,
	})
}

func (s *GameSession) EquipItem(itemID string, slot string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	itemIdx := -1
	var targetItem Item
	for i, item := range s.Inventory.Backpack {
		if item.ID == itemID {
			itemIdx = i
			targetItem = item
			break
		}
	}

	if itemIdx == -1 {
		return
	}

	// Skill books usam metadados canônicos; o nome do item é apenas apresentação.
	isSkillBook := slot == string(SlotSkillBook) || GetItemSlotType(&targetItem) == string(SlotSkillBook)

	if isSkillBook {
		skillKey := GetItemSkillKey(&targetItem)

		if skillKey != "" {
			hasSkill := false
			for _, sk := range s.Character.LearnedSkills {
				if sk == skillKey {
					hasSkill = true
					break
				}
			}
			if !hasSkill {
				s.Character.LearnedSkills = append(s.Character.LearnedSkills, skillKey)
				// Ativa automaticamente se o deck de magias tiver espaço (até 2)
				if len(s.Character.ActiveSkills) < 2 {
					s.Character.ActiveSkills = append(s.Character.ActiveSkills, skillKey)
				}
			}

			// Remove da mochila
			s.Inventory.Backpack = append(s.Inventory.Backpack[:itemIdx], s.Inventory.Backpack[itemIdx+1:]...)

			if s.SaveInvFunc != nil {
				_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
			}
			if s.SaveCharFunc != nil {
				_ = s.SaveCharFunc(s.Character)
			}

			totalAtk, totalDef := s.CalculateStats()
			s.broadcastMessage(CombatMessage{
				Type:         "SKILL_LEARNED",
				Timestamp:    time.Now().Format("15:04:05"),
				Character:    s.Character,
				Inventory:    s.Inventory,
				TotalAttack:  totalAtk,
				TotalDefense: totalDef,
				ActiveRegion: s.ActiveRegion,
				ActiveStance: s.ActiveStance,
				LogText:      fmt.Sprintf("📖 Você aprendeu a habilidade [%s]!", targetItem.Name),
				IsActive:     s.IsExpeditionActive,
			})
			return
		}
	}

	// Validação de Nível Mínimo para Equipar
	if targetItem.RequiredLevel > 0 && s.Character.Level < targetItem.RequiredLevel {
		totalAtk, totalDef := s.CalculateStats()
		s.broadcastMessage(CombatMessage{
			Type:         "INVENTORY_UPDATE",
			Timestamp:    time.Now().Format("15:04:05"),
			Character:    s.Character,
			Inventory:    s.Inventory,
			TotalAttack:  totalAtk,
			TotalDefense: totalDef,
			ActiveRegion: s.ActiveRegion,
			ActiveStance: s.ActiveStance,
			LogText:      fmt.Sprintf("🔒 Nível insuficiente! Requer Nível %d para equipar [%s].", targetItem.RequiredLevel, targetItem.Name),
			IsActive:     s.IsExpeditionActive,
		})
		return
	}

	// Validação do slot Ammo: só pode equipar se estiver usando arma de distância
	eq := &s.Inventory.Equipment
	if slot == "ammo" {
		if eq.MainHand == nil {
			log.Printf("Tentativa de equipar munição sem arma principal")
		} else {
			if GetItemWeaponType(eq.MainHand) != WeaponTypeBow {
				// Impede equipar munição se estiver com arma melee ou cajado
				totalAtk, totalDef := s.CalculateStats()
				s.broadcastMessage(CombatMessage{
					Type:         "INVENTORY_UPDATE",
					Timestamp:    time.Now().Format("15:04:05"),
					Character:    s.Character,
					Inventory:    s.Inventory,
					TotalAttack:  totalAtk,
					TotalDefense: totalDef,
					ActiveRegion: s.ActiveRegion,
					ActiveStance: s.ActiveStance,
					LogText:      "⚠️ Munição só pode ser equipada se você estiver usando um Arco ou Besta!",
					IsActive:     s.IsExpeditionActive,
				})
				return
			}
		}
	}

	// Remove o item da mochila
	s.Inventory.Backpack = append(s.Inventory.Backpack[:itemIdx], s.Inventory.Backpack[itemIdx+1:]...)

	var oldItem *Item

	if slot == "mainhand" {
		if targetItem.Hands == 2 {
			if eq.OffHand != nil {
				s.Inventory.Backpack = append([]Item{*eq.OffHand}, s.Inventory.Backpack...)
				eq.OffHand = nil
			}
		}

		// Se trocou para arma melee ou cajado, desequipa munição automaticamente
		if targetItem.Hands == 1 || (GetItemWeaponType(&targetItem) != WeaponTypeBow) {
			if eq.Ammo != nil {
				s.Inventory.Backpack = append([]Item{*eq.Ammo}, s.Inventory.Backpack...)
				eq.Ammo = nil
			}
		}
	}
	if slot == "offhand" {
		if eq.MainHand != nil && eq.MainHand.Hands == 2 {
			s.Inventory.Backpack = append([]Item{*eq.MainHand}, s.Inventory.Backpack...)
			eq.MainHand = nil
		}
	}

	switch slot {
	case "head":
		oldItem = eq.Head
		eq.Head = &targetItem
	case "necklace":
		oldItem = eq.Necklace
		eq.Necklace = &targetItem
	case "chest":
		oldItem = eq.Chest
		eq.Chest = &targetItem
	case "mainhand":
		oldItem = eq.MainHand
		eq.MainHand = &targetItem
	case "offhand":
		oldItem = eq.OffHand
		eq.OffHand = &targetItem
	case "legs":
		oldItem = eq.Legs
		eq.Legs = &targetItem
	case "boots":
		oldItem = eq.Boots
		eq.Boots = &targetItem
	case "ring":
		oldItem = eq.Ring
		eq.Ring = &targetItem
	case "ammo":
		oldItem = eq.Ammo
		eq.Ammo = &targetItem
	case "bag":
		oldItem = eq.Bag
		eq.Bag = &targetItem
	}

	if oldItem != nil {
		s.Inventory.Backpack = append([]Item{*oldItem}, s.Inventory.Backpack...)
	}

	// Atualização Dinâmica da Vocação com base na arma principal equipada (GetItemWeaponType)
	if slot == "mainhand" {
		wType := GetItemWeaponType(&targetItem)
		switch wType {
		case WeaponTypeBow:
			s.Character.Vocation = "Arqueiro"
		case WeaponTypeWand:
			s.Character.Vocation = "Mago"
		default:
			s.Character.Vocation = "Guerreiro"
		}
		if s.SaveCharFunc != nil {
			_ = s.SaveCharFunc(s.Character)
		}
	}

	// Duas Mãos logic is now handled before adding to equipment slots.

	if s.SaveInvFunc != nil {
		_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
	}

	totalAtk, totalDef := s.CalculateStats()
	s.broadcastMessage(CombatMessage{
		Type:         "EQUIPMENT_UPDATE",
		Timestamp:    time.Now().Format("15:04:05"),
		Character:    s.Character,
		Inventory:    s.Inventory,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: s.ActiveRegion,
		ActiveStance: s.ActiveStance,
		LogText:      fmt.Sprintf("Você equipou [%s] no slot %s!", targetItem.Name, slot),
		IsActive:     s.IsExpeditionActive,
	})
}

func (s *GameSession) UnequipItem(slot string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	eq := &s.Inventory.Equipment
	var itemToUnequip *Item

	switch slot {
	case "head":
		itemToUnequip = eq.Head
		eq.Head = nil
	case "necklace":
		itemToUnequip = eq.Necklace
		eq.Necklace = nil
	case "chest":
		itemToUnequip = eq.Chest
		eq.Chest = nil
	case "mainhand":
		itemToUnequip = eq.MainHand
		eq.MainHand = nil
	case "offhand":
		itemToUnequip = eq.OffHand
		eq.OffHand = nil
	case "legs":
		itemToUnequip = eq.Legs
		eq.Legs = nil
	case "boots":
		itemToUnequip = eq.Boots
		eq.Boots = nil
	case "ring":
		itemToUnequip = eq.Ring
		eq.Ring = nil
	case "ammo":
		itemToUnequip = eq.Ammo
		eq.Ammo = nil
	case "bag":
		itemToUnequip = eq.Bag
		eq.Bag = nil
	}

	if itemToUnequip != nil {
		s.Inventory.Backpack = append([]Item{*itemToUnequip}, s.Inventory.Backpack...)
		if s.SaveInvFunc != nil {
			_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
		}

		totalAtk, totalDef := s.CalculateStats()
		s.broadcastMessage(CombatMessage{
			Type:         "EQUIPMENT_UPDATE",
			Timestamp:    time.Now().Format("15:04:05"),
			Character:    s.Character,
			Inventory:    s.Inventory,
			TotalAttack:  totalAtk,
			TotalDefense: totalDef,
			ActiveRegion: s.ActiveRegion,
			ActiveStance: s.ActiveStance,
			LogText:      fmt.Sprintf("Você desequipou [%s]!", itemToUnequip.Name),
			IsActive:     s.IsExpeditionActive,
		})
	}
}

func (s *GameSession) DiscardItem(itemID string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	foundIdx := -1
	var discardedItemName string

	for i, item := range s.Inventory.Backpack {
		if item.ID == itemID {
			foundIdx = i
			discardedItemName = item.Name
			break
		}
	}

	if foundIdx == -1 {
		return
	}

	// Removendo item da mochila
	s.Inventory.Backpack = append(s.Inventory.Backpack[:foundIdx], s.Inventory.Backpack[foundIdx+1:]...)

	if s.SaveInvFunc != nil {
		_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
	}

	totalAtk, totalDef := s.CalculateStats()
	s.broadcastMessage(CombatMessage{
		Type:         "INVENTORY_UPDATE",
		Timestamp:    time.Now().Format("15:04:05"),
		Character:    s.Character,
		Inventory:    s.Inventory,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: s.ActiveRegion,
		ActiveStance: s.ActiveStance,
		LogText:      fmt.Sprintf("Você descartou [%s] da mochila.", discardedItemName),
		IsActive:     s.IsExpeditionActive,
	})
}

func (s *GameSession) BulkSell(itemIDs []string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	newBackpack := make([]Item, 0)
	var totalGoldGained int64
	var itemsSold int

	// Convertendo slice de strings em mapa (Set) para busca O(1)
	sellSet := make(map[string]bool)
	for _, id := range itemIDs {
		sellSet[id] = true
	}

	for _, item := range s.Inventory.Backpack {
		if sellSet[item.ID] {
			totalGoldGained += item.ValueGold
			itemsSold++
		} else {
			newBackpack = append(newBackpack, item)
		}
	}

	if itemsSold == 0 {
		return
	}

	s.Inventory.Backpack = newBackpack
	s.Character.GoldBank += totalGoldGained

	if s.SaveInvFunc != nil {
		_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
	}
	s.syncPersistentExpeditionState()
	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}

	totalAtk, totalDef := s.CalculateStats()
	s.broadcastMessage(CombatMessage{
		Type:         "INVENTORY_UPDATE",
		Timestamp:    time.Now().Format("15:04:05"),
		Character:    s.Character,
		Inventory:    s.Inventory,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: s.ActiveRegion,
		ActiveStance: s.ActiveStance,
		LogText:      fmt.Sprintf("Você vendeu %d item(ns) por %d de ouro!", itemsSold, totalGoldGained),
		IsActive:     s.IsExpeditionActive,
	})
}

func (s *GameSession) GetTotalCapacity() float64 {
	baseCap := float64(1000 + (s.Character.Level * 10))
	if s.Character.STR > 0 {
		baseCap += float64(s.Character.STR * 15)
	}
	if s.Inventory.Equipment.Bag != nil {
		switch s.Inventory.Equipment.Bag.Rarity {
		case "Comum":
			baseCap += 200.0
		case "Incomum":
			baseCap += 350.0
		case "Raro":
			baseCap += 500.0
		case "Lendário":
			baseCap += 800.0
		default:
			baseCap += 300.0
		}
	}
	return baseCap
}

func (s *GameSession) GetMaxSlotCapacity() int {
	baseSlots := 20
	if s.Inventory.Equipment.Bag != nil {
		switch s.Inventory.Equipment.Bag.Rarity {
		case "Comum":
			baseSlots += 4 // 24 slots
		case "Incomum":
			baseSlots += 6 // 26 slots
		case "Raro":
			baseSlots += 8 // 28 slots
		case "Lendário":
			baseSlots += 12 // 32 slots
		default:
			baseSlots += 8 // 28 slots
		}
	}
	return baseSlots
}

func (s *GameSession) GetTotalWeight() float64 {
	weight := 0.0
	eq := s.Inventory.Equipment

	items := []*Item{
		eq.Head, eq.Chest, eq.Legs, eq.Boots,
		eq.MainHand, eq.OffHand, eq.Necklace, eq.Ring, eq.Ammo, eq.Bag,
	}

	for _, it := range items {
		if it != nil {
			weight += it.Weight
		}
	}

	for _, it := range s.Inventory.Backpack {
		weight += it.Weight
	}

	return weight
}

func EnsureUnlockedRegionsForLevel(char *CharacterData) {
	if char == nil {
		return
	}
	existing := make(map[string]bool)
	for _, id := range char.UnlockedRegions {
		existing[id] = true
	}
	// Sempre desbloqueia regiões cujo MinLevel <= char.Level
	for _, reg := range ListExpeditionRegions() {
		if char.Level >= reg.MinLevel {
			existing[reg.ID] = true
		}
	}
	// Conteúdo introdutório é definido pelo catálogo, não pelo engine.
	for _, reg := range ListExpeditionRegions() {
		if reg.Tier == 1 && reg.RequiresUnlockFrom == "" {
			existing[reg.ID] = true
		}
	}

	unlocked := make([]string, 0, len(existing))
	for id := range existing {
		unlocked = append(unlocked, id)
	}
	char.UnlockedRegions = unlocked
}

func (s *GameSession) SetRegion(regionID string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	if region, exists := GetExpeditionRegion(regionID); exists {
		s.ActiveRegion = regionID
		s.CurrentMonsters = []Monster{} // Reseta horda ao mudar de região
		s.CurrentStage = 1
		s.MaxStages = region.MaxStages
		s.IsBossStage = false
		s.Character.StateRevision++
		s.syncPersistentExpeditionState()
		if s.SaveCharFunc != nil {
			_ = s.SaveCharFunc(s.Character)
		}
		totalAtk, totalDef := s.CalculateStats()
		s.broadcastMessage(CombatMessage{
			Type:         "REGION_UPDATE",
			Timestamp:    time.Now().Format("15:04:05"),
			Character:    s.Character,
			Inventory:    s.Inventory,
			TotalAttack:  totalAtk,
			TotalDefense: totalDef,
			ActiveRegion: s.ActiveRegion,
			ActiveStance: s.ActiveStance,
			CurrentStage: s.CurrentStage,
			MaxStages:    s.MaxStages,
			IsBossStage:  s.IsBossStage,
			LogText:      fmt.Sprintf("🗺️ Região de expedição alterada para [%s]!", region.Name),
			IsActive:     s.IsExpeditionActive,
		})
	}
}

func (s *GameSession) SetStance(stance string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	if stance == "offensive" || stance == "defensive" || stance == "balanced" {
		s.ActiveStance = stance
		s.Character.StateRevision++
		s.syncPersistentExpeditionState()
		if s.SaveCharFunc != nil {
			_ = s.SaveCharFunc(s.Character)
		}
		totalAtk, totalDef := s.CalculateStats()
		s.broadcastMessage(CombatMessage{
			Type:         "STANCE_UPDATE",
			Timestamp:    time.Now().Format("15:04:05"),
			Character:    s.Character,
			Inventory:    s.Inventory,
			TotalAttack:  totalAtk,
			TotalDefense: totalDef,
			ActiveRegion: s.ActiveRegion,
			ActiveStance: s.ActiveStance,
			LogText:      fmt.Sprintf("Postura tática alterada para [%s]!", stance),
			IsActive:     s.IsExpeditionActive,
		})
	}
}

func cloneItem(item *Item) *Item {
	if item == nil {
		return nil
	}
	copyItem := *item
	return &copyItem
}

func cloneCharacterData(character *CharacterData) *CharacterData {
	if character == nil {
		return nil
	}
	copyCharacter := *character
	copyCharacter.LearnedSkills = append([]string(nil), character.LearnedSkills...)
	copyCharacter.ActiveSkills = append([]string(nil), character.ActiveSkills...)
	copyCharacter.UnlockedRegions = append([]string(nil), character.UnlockedRegions...)
	return &copyCharacter
}

func cloneInventoryData(inventory *InventoryData) *InventoryData {
	if inventory == nil {
		return nil
	}
	copyInventory := *inventory
	copyInventory.Backpack = append([]Item(nil), inventory.Backpack...)
	copyInventory.Equipment = EquipmentSlots{
		Head: cloneItem(inventory.Equipment.Head), Necklace: cloneItem(inventory.Equipment.Necklace),
		Chest: cloneItem(inventory.Equipment.Chest), MainHand: cloneItem(inventory.Equipment.MainHand),
		OffHand: cloneItem(inventory.Equipment.OffHand), Legs: cloneItem(inventory.Equipment.Legs),
		Boots: cloneItem(inventory.Equipment.Boots), Ring: cloneItem(inventory.Equipment.Ring),
		Ammo: cloneItem(inventory.Equipment.Ammo), Bag: cloneItem(inventory.Equipment.Bag),
	}
	return &copyInventory
}

func (s *GameSession) broadcastMessage(msg CombatMessage) {
	s.syncPersistentExpeditionState()
	if msg.ActiveBiome == "" {
		if region, exists := GetExpeditionRegion(s.ActiveRegion); exists {
			msg.ActiveBiome = region.BiomeKey
		}
	}
	msg.Character = cloneCharacterData(msg.Character)
	msg.Inventory = cloneInventoryData(msg.Inventory)
	msg.Monsters = append([]Monster(nil), msg.Monsters...)
	if msg.CurrentStage <= 0 {
		if s.CurrentStage <= 0 {
			s.CurrentStage = 1
		}
		msg.CurrentStage = s.CurrentStage
	}
	if msg.MaxStages <= 0 {
		if region, exists := GetExpeditionRegion(s.ActiveRegion); exists && region.MaxStages > 0 {
			s.MaxStages = region.MaxStages
		} else if s.MaxStages <= 0 {
			s.MaxStages = DefaultExpeditionMaxStages
		}
		msg.MaxStages = s.MaxStages
	}
	if !msg.IsBossStage && s.IsBossStage {
		msg.IsBossStage = s.IsBossStage
	}

	select {
	case s.SendChannel <- msg:
	default:
	}
}

func (s *GameSession) ToggleExpedition() bool {
	s.Mu.Lock()
	s.IsExpeditionActive = !s.IsExpeditionActive
	s.Character.StateRevision++
	s.RecoveringFromDefeat = false
	s.AutoResumePending = false
	if !s.IsExpeditionActive {
		s.CurrentMonsters = []Monster{}
	}
	s.syncPersistentExpeditionState()
	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}

	totalAtk, totalDef := s.CalculateStats()
	logMsg := "⚔️ Expedição iniciada! Caçando em marcha pelo mapa..."
	if !s.IsExpeditionActive {
		logMsg = "⛺ Expedição pausada. Personagem descansando no acampamento."
	}
	s.Mu.Unlock()

	s.EnsureTickerRunning()

	s.broadcastMessage(CombatMessage{
		Type:         "EXPEDITION_STATUS",
		Timestamp:    time.Now().Format("15:04:05"),
		Character:    s.Character,
		Inventory:    s.Inventory,
		Monsters:     s.CurrentMonsters,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: s.ActiveRegion,
		ActiveStance: s.ActiveStance,
		CurrentStage: s.CurrentStage,
		MaxStages:    s.MaxStages,
		IsBossStage:  s.IsBossStage,
		LogText:      logMsg,
		IsActive:     s.IsExpeditionActive,
	})

	return s.IsExpeditionActive
}

func (s *GameSession) SetAutoResumeExpedition(enabled bool) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	s.Character.AutoResumeExpedition = enabled
	if !enabled {
		s.AutoResumePending = false
	} else if s.RecoveringFromDefeat {
		s.AutoResumePending = true
	}
	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}
}

func (s *GameSession) ToggleSkill(skillKey string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	// Verifica se a skill já está ativa
	for i, active := range s.Character.ActiveSkills {
		if active == skillKey {
			// Remove se já estiver ativa
			s.Character.ActiveSkills = append(s.Character.ActiveSkills[:i], s.Character.ActiveSkills[i+1:]...)
			if s.SaveCharFunc != nil {
				_ = s.SaveCharFunc(s.Character)
			}
			s.broadcastMessage(CombatMessage{
				Type:      "SKILL_TOGGLED",
				Timestamp: time.Now().Format("15:04:05"),
				Character: s.Character,
				LogText:   fmt.Sprintf("Habilidade desativada: %s", skillKey),
				IsActive:  s.IsExpeditionActive,
			})
			return
		}
	}

	// Se não estiver ativa, adiciona (limite de 2)
	if len(s.Character.ActiveSkills) >= 2 {
		s.broadcastMessage(CombatMessage{
			Type:      "SKILL_ERROR",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   "Você já possui 2 habilidades ativas! Desative uma antes.",
		})
		return
	}

	// Verifica se ele aprendeu a skill
	learned := false
	for _, learnedSkill := range s.Character.LearnedSkills {
		if learnedSkill == skillKey {
			learned = true
			break
		}
	}

	if learned {
		s.Character.ActiveSkills = append(s.Character.ActiveSkills, skillKey)
		if s.SaveCharFunc != nil {
			_ = s.SaveCharFunc(s.Character)
		}
		s.broadcastMessage(CombatMessage{
			Type:      "SKILL_TOGGLED",
			Timestamp: time.Now().Format("15:04:05"),
			Character: s.Character,
			LogText:   fmt.Sprintf("Habilidade equipada: %s", skillKey),
			IsActive:  s.IsExpeditionActive,
		})
	}
}

func (s *GameSession) AllocateStat(statKey string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	if s.Character.UnspentPoints <= 0 {
		return
	}

	allocated := false
	switch strings.ToLower(statKey) {
	case "str", "for", "força":
		s.Character.STR += 1
		allocated = true
	case "dex", "des", "destreza":
		s.Character.DEX += 1
		allocated = true
	case "int", "int_stat", "inteligência":
		s.Character.INT += 1
		allocated = true
	case "vit", "vitalidade":
		s.Character.VIT += 1
		allocated = true
	}

	if !allocated {
		return
	}

	s.Character.UnspentPoints -= 1
	totalAtk, totalDef := s.CalculateStats()

	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}

	s.broadcastMessage(CombatMessage{
		Type:         "CHARACTER_UPDATE",
		Timestamp:    time.Now().Format("15:04:05"),
		Character:    s.Character,
		Inventory:    s.Inventory,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: s.ActiveRegion,
		ActiveStance: s.ActiveStance,
		LogText:      fmt.Sprintf("✨ Atributo [%s] incrementado! Pontos restantes: %d.", strings.ToUpper(statKey), s.Character.UnspentPoints),
		IsActive:     s.IsExpeditionActive,
	})
}

func (s *GameSession) ChooseStarterPack(pack string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	s.Inventory.Equipment = EquipmentSlots{}
	s.Inventory.Backpack = []Item{}
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	equip := func(def *StarterItemDefinition, slot string) *Item {
		if def == nil {
			return nil
		}
		item := GenerateItemFromTemplate(def.TemplateName, def.Rarity, rng)
		if item == nil {
			return nil
		}
		item.ID = fmt.Sprintf("starter_%s_%d", strings.ReplaceAll(strings.ToLower(slot), " ", "_"), time.Now().UnixNano())
		item.SpecialEffect = def.SpecialEffect
		return item
	}

	packDefinition := ResolveStarterPack(pack)
	s.Inventory.Equipment.MainHand = equip(packDefinition.MainHand, "main_hand")
	s.Inventory.Equipment.OffHand = equip(packDefinition.OffHand, "off_hand")
	s.Inventory.Equipment.Ammo = equip(packDefinition.Ammo, "ammo")
	for index := range packDefinition.Backpack {
		item := equip(&packDefinition.Backpack[index], fmt.Sprintf("backpack_%d", index))
		if item != nil {
			s.Inventory.Backpack = append(s.Inventory.Backpack, *item)
		}
	}
	s.Character.Vocation = packDefinition.Vocation

	s.Character.StateRevision++
	s.syncPersistentExpeditionState()
	if s.SaveInvFunc != nil {
		_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
	}
	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}

	totalAtk, totalDef := s.CalculateStats()
	s.broadcastMessage(CombatMessage{
		Type:         "STARTER_PACK_SELECTED",
		Timestamp:    time.Now().Format("15:04:05"),
		Character:    s.Character,
		Inventory:    s.Inventory,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: s.ActiveRegion,
		ActiveStance: s.ActiveStance,
		LogText:      fmt.Sprintf("Pacote inicial [%s] selecionado com equipamentos canônicos.", pack),
		IsActive:     s.IsExpeditionActive,
	})
}
