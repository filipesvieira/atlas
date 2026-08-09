package game

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"sort"
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
	ID            string         `json:"id"`
	Key           string         `json:"key"`
	VisualKey     string         `json:"visual_key"`
	IsBoss        bool           `json:"is_boss"`
	Name          string         `json:"name"`
	Level         int            `json:"level"`
	Health        int            `json:"health"`
	MaxHealth     int            `json:"max_health"`
	Attack        int            `json:"attack"`
	AttackType    AttackType     `json:"attack_type"` // "melee" | "ranged"
	GridX         int            `json:"grid_x"`      // Posição horizontal no grid (0-14)
	GridY         int            `json:"grid_y"`      // Posição vertical no grid (0-7)
	State         string         `json:"state"`       // "CHASE", "ATTACK", "KITE", "FLEE"
	StatusEffects []StatusEffect `json:"status_effects,omitempty"`
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
	ID                   string        `json:"id"`
	AccountID            string        `json:"account_id"`
	Name                 string        `json:"name"`
	Vocation             string        `json:"vocation"`
	Origin               string        `json:"origin"`
	Level                int           `json:"level"`
	Experience           int64         `json:"experience"`
	Health               int           `json:"health"`
	MaxHealth            int           `json:"max_health"`
	Mana                 int           `json:"mana"`
	MaxMana              int           `json:"max_mana"`
	GoldBank             int64         `json:"gold_bank"`
	STR                  int           `json:"str"`
	DEX                  int           `json:"dex"`
	INT                  int           `json:"int_stat"`
	VIT                  int           `json:"vit"`
	UnspentPoints        int           `json:"unspent_points"`
	Masteries            MasteriesData `json:"masteries"`
	LearnedSkills        []string      `json:"learned_skills"`
	ActiveSkills         []string      `json:"active_skills"`
	UnlockedRegions      []string      `json:"unlocked_regions"`
	IsExpeditionActive   bool          `json:"is_expedition_active"`
	ActiveRegion         string        `json:"active_region"`
	ActiveStance         string        `json:"active_stance"`
	CurrentStage         int           `json:"current_stage"`
	IsBossStage          bool          `json:"is_boss_stage"`
	StateRevision        int64         `json:"state_revision"`
	LastLogin            time.Time     `json:"last_login"`
	LastLogout           time.Time     `json:"last_logout"`
	AutoResumeExpedition bool          `json:"auto_resume_expedition"`
}

// CombatEffectEvent transporta os efeitos visuais e de impacto para o cliente.
type CombatEffectEvent struct {
	Kind      string   `json:"kind"`      // "skill", "attack", "heal", "status"
	Key       string   `json:"key"`       // "whirlwind", "brutal_strike", "multishot", "sniper_shot", "fireball", "ice_shard", "divine_heal"
	SourceID  string   `json:"source_id"` // "hero" ou mobID
	TargetIDs []string `json:"target_ids"`
	Amount    int      `json:"amount"`
	IsCrit    bool     `json:"is_crit"`
	StatusKey string   `json:"status_key,omitempty"`
}

type CombatMessage struct {
	Type          string              `json:"type"` // TICK_UPDATE, COMBAT_EVENT, LOOT_DROP, LEVEL_UP, EQUIPMENT_UPDATE, STANCE_UPDATE, SKILL_CAST
	Timestamp     string              `json:"timestamp"`
	Character     *CharacterData      `json:"character"`
	Inventory     *InventoryData      `json:"inventory,omitempty"`
	Monsters      []Monster           `json:"monsters,omitempty"`
	DamageDealt   int                 `json:"damage_dealt,omitempty"`
	DamageTaken   int                 `json:"damage_taken,omitempty"`
	DPS           int                 `json:"dps,omitempty"`
	TotalAttack   int                 `json:"total_attack"`
	TotalDefense  int                 `json:"total_defense"`
	DerivedStats   DerivedStats        `json:"derived_stats"`
	CombatEffects  []CombatEffectEvent `json:"combat_effects,omitempty"`
	SkillCooldowns map[string]int      `json:"skill_cooldowns,omitempty"`
	ActiveRegion   string              `json:"active_region,omitempty"`
	ActiveBiome    string              `json:"active_biome,omitempty"`
	ActiveStance   string              `json:"active_stance,omitempty"`
	CurrentStage   int                 `json:"current_stage"`
	MaxStages      int                 `json:"max_stages"`
	IsBossStage    bool                `json:"is_boss_stage"`
	LogText        string              `json:"log_text"`
	ItemFound      *Item               `json:"item_found,omitempty"`
	IsActive       bool                `json:"is_active"`
}

type GameSession struct {
	Mu                   sync.Mutex
	Character            *CharacterData
	Inventory            *InventoryData
	IsExpeditionActive   bool
	HasBroadcastRestLog  bool
	RecoveringFromDefeat bool
	AutoResumePending    bool
	ActiveRegion         string
	ActiveStance         string
	CurrentStage         int
	MaxStages            int
	IsBossStage          bool
	CurrentMonsters      []Monster
	SkillCooldowns       map[string]int
	ManaFractionAcc      float64
	SendChannel          chan CombatMessage
	StopChan             chan struct{}
	TickerDone           chan struct{}
	SaveInvFunc          func(charID string, inv *InventoryData) error
	SaveCharFunc         func(char *CharacterData) error
	GetLootFunc          func(playerLevel int) *Item
	GetMonsterFunc       func(region string, playerLevel int) Monster
}

func GetRequiredXPForLevel(level int) int64 {
	if level <= 1 {
		return 250
	}
	return int64(math.Floor(250.0 * math.Pow(float64(level), 1.95)))
}

// CalculateKillXP calcula a experiência ganha ao abater um monstro seguindo
// os pilares clássicos de MMORPG: base proporcional ao nível e HP do monstro,
// multiplicador de 2.5x para Bosses, bônus de desafio heroico (underdog) e
// penalidade suave para monstros triviais de baixo nível.
func CalculateKillXP(playerLevel, monsterLevel, maxHealth int, isBoss bool) int64 {
	if monsterLevel < 1 {
		monsterLevel = 1
	}
	if maxHealth < 10 {
		maxHealth = 10
	}
	baseXP := float64(monsterLevel*45) + float64(maxHealth)/6.0
	if isBoss {
		baseXP *= 2.5
	}
	levelDiff := monsterLevel - playerLevel
	multiplier := 1.0
	if levelDiff > 0 {
		// Bônus de Desafio: +10% por nível de diferença acima (teto de +80% / 1.8x)
		bonus := float64(levelDiff) * 0.10
		if bonus > 0.80 {
			bonus = 0.80
		}
		multiplier += bonus
	} else if levelDiff < -2 {
		// Penalidade Suave: -15% por nível de diferença além de 2 (piso de 5%)
		penalty := float64(-levelDiff-2) * 0.15
		multiplier = 1.0 - penalty
		if multiplier < 0.05 {
			multiplier = 0.05
		}
	}
	return int64(math.Max(1.0, math.Round(baseXP*multiplier)))
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
		char.LearnedSkills = []string{}
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

	isExpeditionActive := char.IsExpeditionActive
	recovering := false
	autoResumePending := false

	if char.AutoResumeExpedition {
		if char.Health >= char.MaxHealth && char.Mana >= char.MaxMana {
			isExpeditionActive = true
			char.IsExpeditionActive = true
		} else {
			recovering = true
			autoResumePending = true
		}
	}

	return &GameSession{
		Character:            char,
		Inventory:            inv,
		IsExpeditionActive:   isExpeditionActive,
		RecoveringFromDefeat: recovering,
		AutoResumePending:    autoResumePending,
		ActiveRegion:         activeReg,
		ActiveStance:         activeStance,
		CurrentStage:         currentStage,
		MaxStages:            maxStages,
		IsBossStage:          char.IsBossStage,
		CurrentMonsters:      []Monster{},
		SkillCooldowns:       make(map[string]int),
		SendChannel:          make(chan CombatMessage, 100),
		StopChan:             make(chan struct{}),
		TickerDone:           make(chan struct{}),
		SaveInvFunc:          saveInv,
		SaveCharFunc:         saveChar,
		GetLootFunc:          getLoot,
		GetMonsterFunc:       getMonster,
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
	stats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)
	s.Character.MaxHealth = stats.MaxHealth
	s.Character.MaxMana = stats.MaxMana
	return stats.TotalAttack, stats.TotalDefense
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
				stats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)

				// Regeneração no acampamento orgânica e balanceada:
				// HP: base suave (6 HP) + bônus de Vitalidade (VIT * 0.12) por tick de 750ms
				hpRegen := int(math.Max(6.0, 6.0+float64(s.Character.VIT)*0.12))

				// Mana: base suave (4 MP) + bônus de Inteligência/Itens (ManaRegenPerSecond * 0.75) por tick de 750ms
				mpRegen := int(math.Max(4.0, 4.0+float64(stats.ManaRegenPerSecond)*0.75))

				if s.Character.Health < s.Character.MaxHealth {
					s.Character.Health += hpRegen
					if s.Character.Health > s.Character.MaxHealth {
						s.Character.Health = s.Character.MaxHealth
					}
				}
				if s.Character.Mana < s.Character.MaxMana {
					s.Character.Mana += mpRegen
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
				m.GridX = (GridWidth - 2) + (i * 3) // Guarda-costas na vanguarda espaçados (ex: 13, 16)
				laneY := HeroGridY
				if i%2 == 0 {
					laneY = HeroGridY - 1 // Flanco superior
				} else {
					laneY = HeroGridY + 1 // Flanco inferior
				}
				m.GridY = laneY
				m.State = "CHASE"
				s.CurrentMonsters = append(s.CurrentMonsters, m)
			}

			// 2. Boss entra na retaguarda direita da arena
			bossMob := regInfo.Boss
			bossMob.ID = fmt.Sprintf("boss_%d", time.Now().UnixNano())
			bossMob.GridX = GridWidth - 1 // Surge na borda direita da arena (GridX = 14)
			bossMob.GridY = HeroGridY     // Linha central de comando (GridY = 4)
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
			// ESTÁGIOS 1 A 4: SPAWN DE MONSTROS EM FORMAÇÃO TÁTICA E ESPAÇADA
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
				// Espaçamento tático: monstros chegam escalonados em marcha rápida (1 tile de distância entre si)
				m.GridX = (GridWidth - 1) + i
				if m.GridX < HeroGridX+2 {
					m.GridX = HeroGridX + 2
				}
				// Distribuição por faixas (Lanes) para visibilidade limpa de placas de vida
				laneY := HeroGridY
				if count > 1 {
					if i == 1 {
						laneY = HeroGridY - 1 // Flanco superior
					} else if i == 2 {
						laneY = HeroGridY + 1 // Flanco inferior
					} else if i == 3 {
						laneY = HeroGridY - 2 // Flanco extremo superior
					}
				}
				m.GridY = laneY
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

		// Se estiver sob efeito de Slow, pode perder passos no avanço pelo grid
		speedMod := GetStatusSpeedModifier(mob.StatusEffects)
		if speedMod < 1.0 && r.Float64() > speedMod {
			// Perde o passo deste tick
		} else {
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
				mob.State = "KITE"

			case "ATTACK":
				mob.State = "ATTACK"
			}
		}
	}

	// Estatísticas derivadas autoritativas
	derivedStats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)
	s.Character.MaxHealth = derivedStats.MaxHealth
	s.Character.MaxMana = derivedStats.MaxMana
	totalAtk = derivedStats.TotalAttack
	totalDef = derivedStats.TotalDefense

	// Regeneração contínua de HP
	if s.Character.Health < s.Character.MaxHealth {
		s.Character.Health += 1
		if s.Character.Health > s.Character.MaxHealth {
			s.Character.Health = s.Character.MaxHealth
		}
	}

	// Regeneração contínua e precisa de Mana por segundo com acumulador fracionário
	s.ManaFractionAcc += derivedStats.ManaRegenPerSecond * 0.75
	if s.ManaFractionAcc >= 1.0 {
		addMP := int(s.ManaFractionAcc)
		s.Character.Mana += addMP
		s.ManaFractionAcc -= float64(addMP)
		if s.Character.Mana > s.Character.MaxMana {
			s.Character.Mana = s.Character.MaxMana
			s.ManaFractionAcc = 0
		}
	}

	targetMonster := &s.CurrentMonsters[0]
	totalDamageDealt := 0
	combatEffects := []CombatEffectEvent{}
	skillCastLog := ""

	// Atualiza cooldowns de habilidades do herói em 1 tick
	if s.SkillCooldowns == nil {
		s.SkillCooldowns = make(map[string]int)
	}
	for k, cd := range s.SkillCooldowns {
		if cd > 0 {
			s.SkillCooldowns[k] = cd - 1
		}
	}

	// FASE 4: Execução Modular de Habilidades via SkillRegistry com Cooldowns e Gatilhos Inteligentes
	validSkills := FilterActiveSkillsForArchetype(s.Character.ActiveSkills, derivedStats.PrimaryArchetype)
	readySkills := make([]string, 0, len(validSkills))
	monsterPtrs := make([]*Monster, 0, len(s.CurrentMonsters))
	for idx := range s.CurrentMonsters {
		monsterPtrs = append(monsterPtrs, &s.CurrentMonsters[idx])
	}
	skillCtx := &SkillContext{
		Character:       s.Character,
		DerivedStats:    &derivedStats,
		Equipment:       &s.Inventory.Equipment,
		Monsters:        monsterPtrs,
		Random:          r,
		WeaponType:      GetItemWeaponType(s.Inventory.Equipment.MainHand),
		MagicMasteryLvl: GetMasteryLevel(s.Character.Masteries.MagicMastery),
	}

	for _, key := range validSkills {
		if def, exists := GetSkillDefinition(key); exists {
			if s.SkillCooldowns[key] == 0 && s.Character.Mana >= def.ManaCost && s.Character.Level >= def.MinLevel {
				if def.CanExecute == nil || def.CanExecute(skillCtx) {
					readySkills = append(readySkills, key)
				}
			}
		}
	}

	if len(readySkills) > 0 {
		chosenKey := readySkills[r.Intn(len(readySkills))]
		def, _ := GetSkillDefinition(chosenKey)
		s.Character.Mana -= def.ManaCost
		s.SkillCooldowns[chosenKey] = def.CooldownTicks
		res := def.Execute(skillCtx)
		if res != nil {
			totalDamageDealt += res.DamageDealt
			skillCastLog = res.LogMessage
			combatEffects = append(combatEffects, CombatEffectEvent{
				Kind:      "skill",
				Key:       res.VisualKey,
				SourceID:  "hero",
				TargetIDs: res.TargetIDs,
				Amount:    res.DamageDealt,
				IsCrit:    res.IsCritical,
			})

			// Aplica status effects retornados pela skill
			for _, st := range res.AppliedStatuses {
				for idx := range s.CurrentMonsters {
					if s.CurrentMonsters[idx].ID == st.TargetID {
						s.CurrentMonsters[idx].StatusEffects = ApplyStatusEffect(s.CurrentMonsters[idx].StatusEffects, st.Key, st.Ticks, st.Magnitude)
					}
				}
			}

			// Concede Tries nas maestrias correspondentes
			for mastery, tries := range res.MasteryTries {
				switch mastery {
				case "axe":
					s.Character.Masteries.AxeMastery += tries
				case "club":
					s.Character.Masteries.ClubMastery += tries
				case "sword":
					s.Character.Masteries.SwordMastery += tries
				case "distance":
					s.Character.Masteries.DistanceMastery += tries
				case "magic":
					s.Character.Masteries.MagicMastery += tries
				}
			}
		}
	}

	// 1. Dano do Aventureiro com Variância (±15%) e Chance de Crítico autoritativa (stats.go)
	baseAtkFuzz := int(float64(totalAtk) * (0.85 + r.Float64()*0.30))
	isCrit := r.Float64() <= (derivedStats.CritChance / 100.0)

	playerAtk := baseAtkFuzz
	critText := ""
	if isCrit {
		playerAtk = int(float64(baseAtkFuzz) * 1.50)
		critText = " ⚡ DANO CRÍTICO!"
	}

	targetMonster.Health -= playerAtk
	totalDamageDealt += playerAtk
	combatEffects = append(combatEffects, CombatEffectEvent{
		Kind:      "attack",
		Key:       "basic_attack",
		SourceID:  "hero",
		TargetIDs: []string{targetMonster.ID},
		Amount:    playerAtk,
		IsCrit:    isCrit,
	})

	logMsg := fmt.Sprintf("Você atacou %s causando %d de dano!%s", targetMonster.Name, playerAtk, critText) + skillCastLog

	// DPS dinâmico
	currentDPS := int((float64(totalDamageDealt) / 0.75) * derivedStats.SpeedMultiplier)

	// Incremento de maestria por uso de arma
	if s.Inventory.Equipment.MainHand != nil {
		wType := GetItemWeaponType(s.Inventory.Equipment.MainHand)
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

	if s.Inventory.Equipment.OffHand != nil {
		s.Character.Masteries.ShieldMastery += 1
	}

	// Avança os status effects dos monstros em 1 tick
	for idx := range s.CurrentMonsters {
		s.CurrentMonsters[idx].StatusEffects = TickStatusEffects(s.CurrentMonsters[idx].StatusEffects)
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

	// 3. Lifesteal Application
	eq := s.Inventory.Equipment
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
			// Recompensa XP & Ouro usando a fórmula dinâmica de MMORPG
			xpGained := CalculateKillXP(s.Character.Level, mob.Level, mob.MaxHealth, mob.IsBoss)
			baseGold := float64(15 + r.Intn(25))
			if mob.IsBoss {
				baseGold = float64(80 + r.Intn(120)) // Boss concede ouro massivo
			}

			goldBonusPct := 0.0
			eqList := []*Item{
				eq.Head, eq.Chest, eq.Legs, eq.Boots,
				eq.MainHand, eq.OffHand, eq.Necklace, eq.Ring,
				eq.Ammo, eq.Bag,
			}
			for _, it := range eqList {
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
					maxWeight := s.GetMaxWeightCapacity()
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
		Type:          "COMBAT_EVENT",
		Timestamp:     time.Now().Format("15:04:05"),
		Character:     s.Character,
		Inventory:     s.Inventory,
		Monsters:      s.CurrentMonsters,
		DamageDealt:   totalDamageDealt,
		DamageTaken:   totalDamageTaken,
		DPS:           currentDPS,
		TotalAttack:   totalAtk,
		TotalDefense:  totalDef,
		DerivedStats:   derivedStats,
		CombatEffects:  combatEffects,
		SkillCooldowns: s.SkillCooldowns,
		ActiveRegion:   s.ActiveRegion,
		ActiveStance:   s.ActiveStance,
		LogText:        logMsg,
		IsActive:       true,
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
			}

			// Autoativa apenas se for compatível com o arquétipo atual e houver espaço (até 2)
			stats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)
			if IsSkillAllowedForArchetype(skillKey, stats.PrimaryArchetype) {
				hasActive := false
				for _, sk := range s.Character.ActiveSkills {
					if sk == skillKey {
						hasActive = true
						break
					}
				}
				if !hasActive && len(s.Character.ActiveSkills) < 2 {
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
		// Filtra as habilidades ativas para manter apenas as compatíveis com o novo arquétipo
		stats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)
		s.Character.ActiveSkills = FilterActiveSkillsForArchetype(s.Character.ActiveSkills, stats.PrimaryArchetype)
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
		s.Character.Vocation = "Andarilho"
		stats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)
		s.Character.ActiveSkills = FilterActiveSkillsForArchetype(s.Character.ActiveSkills, stats.PrimaryArchetype)
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
		if s.SaveCharFunc != nil {
			_ = s.SaveCharFunc(s.Character)
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
	itemsToSellMap := make(map[string]bool)
	for _, id := range itemIDs {
		itemsToSellMap[id] = true
	}

	for _, item := range s.Inventory.Backpack {
		if itemsToSellMap[item.ID] {
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
		LogText:      fmt.Sprintf("💰 Você vendeu %d itens e recebeu %d de ouro!", itemsSold, totalGoldGained),
		IsActive:     s.IsExpeditionActive,
	})
}

func (s *GameSession) GetMaxWeightCapacity() float64 {
	stats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)
	return float64(stats.TotalCapacity)
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
	sort.Strings(unlocked)
	char.UnlockedRegions = unlocked
}

func (s *GameSession) SelectRegion(regionID string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	region, exists := GetExpeditionRegion(regionID)
	if !exists {
		return
	}

	if s.Character.Level < region.MinLevel {
		return
	}

	s.ActiveRegion = region.ID
	s.CurrentStage = 1
	s.MaxStages = region.MaxStages
	s.IsBossStage = false
	s.Character.ActiveRegion = region.ID
	s.Character.CurrentStage = 1
	s.Character.IsBossStage = false
	s.Character.StateRevision++
	s.CurrentMonsters = []Monster{}
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
		Monsters:     s.CurrentMonsters,
		TotalAttack:  totalAtk,
		TotalDefense: totalDef,
		ActiveRegion: s.ActiveRegion,
		ActiveBiome:  region.BiomeKey,
		ActiveStance: s.ActiveStance,
		CurrentStage: s.CurrentStage,
		MaxStages:    s.MaxStages,
		IsBossStage:  s.IsBossStage,
		LogText:      fmt.Sprintf("🗺️ Região de expedição alterada para [%s]!", region.Name),
		IsActive:     s.IsExpeditionActive,
	})
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
	msg.DerivedStats = CalculateDerivedStats(msg.Character, msg.Inventory, s.ActiveStance)

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

	// Verifica compatibilidade com o arquétipo da arma atual
	stats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)
	if !IsSkillAllowedForArchetype(skillKey, stats.PrimaryArchetype) {
		s.broadcastMessage(CombatMessage{
			Type:      "SKILL_ERROR",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("A habilidade [%s] não pode ser usada com o arquétipo atual (%s)!", skillKey, stats.PrimaryArchetype),
		})
		return
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
			LogText:   fmt.Sprintf("Habilidade ativada: %s!", skillKey),
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

	// Se o jogador já possuía itens equipados nesses slots de arma, move para a mochila em vez de deletar
	if s.Inventory.Equipment.MainHand != nil {
		s.Inventory.Backpack = append([]Item{*s.Inventory.Equipment.MainHand}, s.Inventory.Backpack...)
	}
	if s.Inventory.Equipment.OffHand != nil {
		s.Inventory.Backpack = append([]Item{*s.Inventory.Equipment.OffHand}, s.Inventory.Backpack...)
	}
	if s.Inventory.Equipment.Ammo != nil {
		s.Inventory.Backpack = append([]Item{*s.Inventory.Equipment.Ammo}, s.Inventory.Backpack...)
	}

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
