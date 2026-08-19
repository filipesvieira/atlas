package game

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type AttackType string

const (
	AttackTypeMelee  AttackType = "melee"
	AttackTypeRanged AttackType = "ranged"
	// MaxCharacterLevel é um limite técnico contra overflow/loops, não um cap
	// de conteúdo divulgado. Ele jamais é usado para reduzir saves existentes.
	MaxCharacterLevel = 10000
)

// GridWidth e GridHeight definem o tamanho da arena em tiles (32×32px)
// Arena: 500px × 260px → 15 cols × 8 rows
const (
	GridWidth  = 15
	GridHeight = 8
	HeroGridX  = 2
	HeroGridY  = 4
)

const (
	DefaultMonsterAttackSpeed = 2.50 // Cadência padrão de ataque dos monstros em segundos
)

type Monster struct {
	ID                 string         `json:"id"`
	Key                string         `json:"key"`
	VisualKey          string         `json:"visual_key"`
	IsBoss             bool           `json:"is_boss"`
	Name               string         `json:"name"`
	Level              int            `json:"level"`
	Health             int            `json:"health"`
	MaxHealth          int            `json:"max_health"`
	Attack             int            `json:"attack"`
	AttackType         AttackType     `json:"attack_type"` // "melee" | "ranged"
	AttackSpeedSeconds float64        `json:"attack_speed_seconds,omitempty"` // Cadência de ataque do monstro (ex: 2.5s)
	AttackCooldownSec  float64        `json:"attack_cooldown_sec,omitempty"`  // Temporizador dinâmico até o próximo golpe
	GridX              int            `json:"grid_x"`      // Posição horizontal no grid (0-14)
	GridY              int            `json:"grid_y"`      // Posição vertical no grid (0-7)
	State              string         `json:"state"`       // "CHASE", "ATTACK", "KITE", "FLEE"
	StatusEffects      []StatusEffect `json:"status_effects,omitempty"`
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
	Revision  int64          `json:"revision"`
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
	ProgressionVersion   int           `json:"progression_version"`
	LifetimeExperience   int64         `json:"lifetime_experience"`
	HighestLevelEver     int           `json:"highest_level_ever"`
	XPRequired           int64         `json:"xp_required"`
	XPPercent            float64       `json:"xp_percent"`
	LastLogin            time.Time     `json:"last_login"`
	LastLogout           time.Time     `json:"last_logout"`
	AutoResumeExpedition bool          `json:"auto_resume_expedition"`
	StarterPackClaimed   bool          `json:"starter_pack_claimed"`
	StarterPackKey       string        `json:"starter_pack_key,omitempty"`
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
	ProtocolVersion   int                        `json:"protocol_version,omitempty"`
	RequestID         string                     `json:"request_id,omitempty"`
	Sequence          uint64                     `json:"seq,omitempty"`
	StateRevision     int64                      `json:"state_revision,omitempty"`
	Type              string                     `json:"type"` // TICK_UPDATE, COMBAT_EVENT, LOOT_DROP, LEVEL_UP, EQUIPMENT_UPDATE, STANCE_UPDATE, SKILL_CAST, STATE_SNAPSHOT
	Timestamp         string                     `json:"timestamp"`
	Character         *CharacterData             `json:"character"`
	Inventory         *InventoryData             `json:"inventory,omitempty"`
	Monsters          []Monster                  `json:"monsters,omitempty"`
	DamageDealt       int                        `json:"damage_dealt,omitempty"`
	DamageTaken       int                        `json:"damage_taken,omitempty"`
	DPS               int                        `json:"dps,omitempty"`
	TotalAttack       int                        `json:"total_attack"`
	TotalDefense            int                        `json:"total_defense"`
	DerivedStats            DerivedStats               `json:"derived_stats"`
	CombatEffects           []CombatEffectEvent        `json:"combat_effects,omitempty"`
	SkillCooldowns          map[string]int             `json:"skill_cooldowns,omitempty"`
	AttackCooldownRemaining float64                    `json:"attack_cooldown_remaining"`
	ActiveRegion            string                     `json:"active_region,omitempty"`
	ActiveBiome             string                     `json:"active_biome,omitempty"`
	ActiveStance            string                     `json:"active_stance,omitempty"`
	CurrentStage            int                        `json:"current_stage"`
	MaxStages               int                        `json:"max_stages"`
	IsBossStage             bool                       `json:"is_boss_stage"`
	LogText                 string                     `json:"log_text"`
	ItemFound               *Item                      `json:"item_found,omitempty"`
	IsActive                bool                       `json:"is_active"`
	Camp                    *CampState                 `json:"camp,omitempty"`
	Resources               []ResourceAmount           `json:"resources,omitempty"`
	ResourceDrops           []ResourceAmount           `json:"resource_drops,omitempty"`
	ResourceInventory       *ResourceInventorySnapshot `json:"resource_inventory,omitempty"`
	DiscoveredLoot          []string                   `json:"discovered_loot,omitempty"`
	AutoSellSettings        *AutoSellSettings          `json:"auto_sell_settings,omitempty"`
	OverflowChest           []Item                     `json:"overflow_chest"`
	AutoSellPreview         *AutoSellEvaluationResult  `json:"auto_sell_preview,omitempty"`
	Economy                 *EconomyState              `json:"economy,omitempty"`
	GatheringResult         *GatheringResult           `json:"gathering_result,omitempty"`
	CraftPreview            *CraftPreview              `json:"craft_preview,omitempty"`
	CraftResult             *CraftResult               `json:"craft_result,omitempty"`
	CraftBatchResult        *CraftBatchResult          `json:"craft_batch_result,omitempty"`
}

type GameSession struct {
	Mu                       sync.Mutex
	SequenceCounter          uint64
	Character                *CharacterData
	Inventory                *InventoryData
	IsExpeditionActive       bool
	HasBroadcastRestLog      bool
	RecoveringFromDefeat     bool
	AutoResumePending        bool
	ActiveRegion             string
	ActiveStance             string
	CurrentStage             int
	MaxStages                int
	IsBossStage              bool
	CurrentMonsters          []Monster
	SkillCooldowns           map[string]int
	BasicAttackCooldownSec   float64
	ManaFractionAcc          float64
	SendChannel              chan CombatMessage
	StopChan                 chan struct{}
	TickerDone               chan struct{}
	SaveInvFunc              func(charID string, inv *InventoryData) error
	SaveCharFunc             func(char *CharacterData) error
	SaveCharAndInvFunc       func(char *CharacterData, inv *InventoryData) error
	GetLootFunc              func(playerLevel int) *Item
	GetMonsterFunc           func(region string, playerLevel int) Monster
	Camp                     *CampState
	Resources                map[string]int64
	DiscoveredLoot           map[string]bool
	RecordLootDiscoveryFunc  func(charID, itemName, rarity, regionKey, monsterKey string) (bool, error)
	AutoSellSettings         AutoSellSettings
	OverflowChest            []Item
	SaveAutoSellSettingsFunc func(charID string, s AutoSellSettings) error
	SaveOverflowChestFunc    func(charID string, items []Item) error
	SavePendingItemFunc      func(charID string, item Item, sourceKind, referenceKey string) error
	SaveResourcesFunc        func(charID string, drops []ResourceAmount, maxCap int64, reason, referenceKey string) (ResourceMutationResult, error)
	ReconcileCampFunc        func(charID string, now time.Time) (*CampState, bool, error)
	LastCampReconcileAt      time.Time
}

func GetRequiredXPForLevel(level int) int64 {
	if level <= 1 {
		return 250
	}
	// Limite técnico defensivo: impede overflow da curva sem impor um cap de
	// conteúdo ao jogador. Novos tiers podem elevar este valor conscientemente.
	if level > MaxCharacterLevel {
		level = MaxCharacterLevel
	}
	return int64(math.Floor(250.0 * math.Pow(float64(level), 1.95)))
}

// RefreshProgressionView mantém os campos de apresentação calculados no backend,
// evitando que clientes diferentes reimplementem a curva de experiência.
func RefreshProgressionView(char *CharacterData) {
	if char == nil {
		return
	}
	if char.Level < 1 {
		char.Level = 1
	}
	if char.HighestLevelEver < char.Level {
		char.HighestLevelEver = char.Level
	}
	if char.ProgressionVersion < 1 {
		char.ProgressionVersion = 1
	}
	char.XPRequired = GetRequiredXPForLevel(char.Level)
	if char.XPRequired > 0 {
		char.XPPercent = math.Min(100, math.Max(0, float64(char.Experience)*100/float64(char.XPRequired)))
	}
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

				campBonuses := CampBonuses{}
				if s.Camp != nil {
					campBonuses = CalculateCampBonuses(s.Camp.Buildings)
					s.Camp.StorageCapacity = campBonuses.StorageCapacity
				}

				// Regeneração no acampamento amplificada pelas construções:
				baseHP := math.Max(6.0, 6.0+float64(s.Character.VIT)*0.12)
				hpMultiplier := 1.0 + (campBonuses.HPRegenBonusPercent / 100.0)
				hpRegen := int(math.Round(baseHP * hpMultiplier))

				baseMP := math.Max(4.0, 4.0+float64(stats.ManaRegenPerSecond)*0.75)
				mpMultiplier := 1.0 + (campBonuses.ManaRegenBonusPercent / 100.0)
				mpRegen := int(math.Round(baseMP * mpMultiplier))

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

				// Reconciliar upgrades de construções em tempo real
				now := time.Now().UTC()
				if s.ReconcileCampFunc != nil && s.Character != nil && (s.LastCampReconcileAt.IsZero() || now.Sub(s.LastCampReconcileAt) >= 5*time.Second) {
					s.LastCampReconcileAt = now
					if updatedCamp, changed, _ := s.ReconcileCampFunc(s.Character.ID, now); changed && updatedCamp != nil {
						s.Camp = updatedCamp
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
				if m.AttackSpeedSeconds <= 0 {
					m.AttackSpeedSeconds = DefaultMonsterAttackSpeed
				}
				m.AttackCooldownSec = 0.50
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
			if bossMob.AttackSpeedSeconds <= 0 {
				bossMob.AttackSpeedSeconds = DefaultMonsterAttackSpeed
			}
			bossMob.AttackCooldownSec = 0.50
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
				if m.AttackSpeedSeconds <= 0 {
					m.AttackSpeedSeconds = DefaultMonsterAttackSpeed
				}
				m.AttackCooldownSec = 0.50
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
		if s.CurrentMonsters[idx].Health > 0 {
			monsterPtrs = append(monsterPtrs, &s.CurrentMonsters[idx])
		}
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

	if len(readySkills) > 0 && len(monsterPtrs) > 0 {
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

	// 1. Temporizador Autoritativo de Ataque Básico (Intervalo em segundos com AttackSpeed)
	tickDt := 0.75
	s.BasicAttackCooldownSec -= tickDt

	// Encontrar dinamicamente o primeiro monstro VIVO
	var targetMonster *Monster
	for idx := range s.CurrentMonsters {
		if s.CurrentMonsters[idx].Health > 0 {
			targetMonster = &s.CurrentMonsters[idx]
			break
		}
	}

	shouldExecuteBasicAttack := s.BasicAttackCooldownSec <= 0 && targetMonster != nil

	logMsg := ""
	if shouldExecuteBasicAttack {
		s.BasicAttackCooldownSec = derivedStats.AttackSpeedSeconds

		// Dano do Aventureiro com Variância (±15%) e Chance de Crítico autoritativa (stats.go)
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

		logMsg = fmt.Sprintf("Você atacou %s causando %d de dano!%s", targetMonster.Name, playerAtk, critText) + skillCastLog

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
	} else if skillCastLog != "" {
		logMsg = skillCastLog
	} else {
		logMsg = "⚔️ Em combate contínuo..."
	}

	// DPS dinâmico autoritativo
	currentDPS := derivedStats.CurrentDPS

	// Avança os status effects dos monstros em 1 tick
	for idx := range s.CurrentMonsters {
		s.CurrentMonsters[idx].StatusEffects = TickStatusEffects(s.CurrentMonsters[idx].StatusEffects)
	}

	// 2. Dano dos Monstros Ativos na Arena com Checagem de Proximidade / Colisão e Velocidade de Ataque (Attack Speed)
	// Regra de Vantagem à Distância: Monstros Melee SÓ causam dano quando encostam no herói (GridX <= HeroGridX + 1)
	totalDamageTaken := 0
	for i := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[i]
		if mob.Health > 0 {
			if mob.AttackSpeedSeconds <= 0 {
				mob.AttackSpeedSeconds = DefaultMonsterAttackSpeed
			}
			mob.AttackCooldownSec -= tickDt

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

			if canHitHero && mob.AttackCooldownSec <= 0 {
				mob.AttackCooldownSec = mob.AttackSpeedSeconds

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

	if lifestealPct > 0 && totalDamageDealt > 0 {
		heal := int(float64(totalDamageDealt) * (lifestealPct / 100.0))
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
			DamageDealt:  totalDamageDealt,
			TotalAttack:  totalAtk,
			TotalDefense: totalDef,
			ActiveRegion: s.ActiveRegion,
			ActiveStance: s.ActiveStance,
			LogText:      "Você foi gravemente ferido e resgatado para o acampamento. Somente a fase desta caçada voltou para 1; nível, XP, ouro, equipamentos, recursos, receitas e profissões foram preservados.",
			IsActive:     false,
		})
		return
	}

	// Remove monstros mortos e processa recompensas/loot
	aliveMonsters := []Monster{}
	var totalXPGained int64
	for _, mob := range s.CurrentMonsters {
		if mob.Health > 0 {
			aliveMonsters = append(aliveMonsters, mob)
		} else {
			// Recompensa XP & Ouro usando a fórmula dinâmica de MMORPG
			xpGained := CalculateKillXP(s.Character.Level, mob.Level, mob.MaxHealth, mob.IsBoss)
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
			goldGained := CalculateKillGold(mob.IsBoss, goldBonusPct, r)

			s.Character.GoldBank += goldGained
			totalXPGained += xpGained

			logMsg += fmt.Sprintf(" %s derrotado! +%d XP e +%d Ouro!", mob.Name, xpGained, goldGained)

			// Loot direto da Economia V2. A chance vem do perfil canônico e
			// equipamentos genéricos são produzidos por crafting.
			{
				itemKey := mob.Key
				if itemKey == "" {
					itemKey = mob.Name
				}
				item := RollCombatDirectLoot(itemKey, mob.Level, mob.IsBoss, r)
				if item != nil {
					// Compêndio de Exploração: registra nova descoberta de loot vinculada à região
					if s.DiscoveredLoot == nil {
						s.DiscoveredLoot = make(map[string]bool)
					}
					regDiscoveryKey := s.ActiveRegion + ":" + item.Name
					isNewDiscovery := !s.DiscoveredLoot[regDiscoveryKey]
					if isNewDiscovery {
						s.DiscoveredLoot[regDiscoveryKey] = true
						s.DiscoveredLoot[item.Name] = true
						if s.RecordLootDiscoveryFunc != nil {
							go func(cID, name, rarity, reg, mKey string) {
								_, _ = s.RecordLootDiscoveryFunc(cID, name, rarity, reg, mKey)
							}(s.Character.ID, item.Name, item.Rarity, s.ActiveRegion, mob.Key)
						}
						logMsg += fmt.Sprintf(" ✨ COMPÊNDIO: Você descobriu [%s] em %s!", item.Name, regInfo.Name)
					}

					currentWeight := s.GetTotalWeight()
					maxWeight := s.GetMaxWeightCapacity()
					maxSlots := s.GetMaxSlotCapacity()

					// Auto-Venda Inteligente: dispara com ocupação projetada (incluindo o item entrante)
					// quando atinge o gatilho configurado pelo jogador (ex: 75%) ou se a mochila estiver lotada
					trigger := s.AutoSellSettings.TriggerPercent
					if trigger <= 0 {
						trigger = 75
					}
					projectedOcc := CalculateOccupancyPercent(len(s.Inventory.Backpack)+1, maxSlots, currentWeight+item.Weight, maxWeight)

					if (projectedOcc >= trigger || currentWeight+item.Weight > maxWeight || len(s.Inventory.Backpack) >= maxSlots) && s.AutoSellSettings.Enabled && s.AutoSellSettings.OnlineEnabled {
						eval := EvaluateAutoSell(s.AutoSellSettings, s.Inventory.Backpack, maxSlots, currentWeight, maxWeight)
						if len(eval.ItemsToSell) > 0 {
							s.Inventory.Backpack = eval.ItemsKept
							s.Character.GoldBank += eval.TotalGoldEstimated
							s.syncPersistentExpeditionState()
							if s.SaveCharAndInvFunc != nil {
								_ = s.SaveCharAndInvFunc(s.Character, s.Inventory)
							}
							logMsg += fmt.Sprintf(" 🧹 AUTO-VENDA: %d itens vendidos por %d de ouro (80%% valor)! Espaço liberado.", len(eval.ItemsToSell), eval.TotalGoldEstimated)
							currentWeight = s.GetTotalWeight()
						}
					}

					// Verifica se o item agora cabe na mochila
					if currentWeight+item.Weight <= maxWeight && len(s.Inventory.Backpack) < maxSlots {
						s.Inventory.Backpack = append([]Item{*item}, s.Inventory.Backpack...)
						logMsg += fmt.Sprintf(" 🎁 LOOT: [%s] adicionado à mochila!", item.Name)
						if s.SaveInvFunc != nil {
							_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
						}
					} else {
						// Mochila continua cheia: verifica se o item é protegido para encaminhar ao Baú de Achados
						isProtected := IsOverflowProtectedItem(*item, s.AutoSellSettings)
						if isProtected && len(s.OverflowChest) < 20 {
							s.OverflowChest = append(s.OverflowChest, *item)
							if s.SaveOverflowChestFunc != nil {
								_ = s.SaveOverflowChestFunc(s.Character.ID, s.OverflowChest)
							}
							logMsg += fmt.Sprintf(" 📦 BAÚ DE ACHADOS: Mochila cheia! O item protegido [%s] foi guardado no Baú de Achados!", item.Name)
						} else if isProtected {
							persisted := false
							if s.SavePendingItemFunc != nil {
								if err := s.SavePendingItemFunc(s.Character.ID, *item, "protected_drop", itemKey); err == nil {
									persisted = true
									IncrementTelemetry("inventory_overflow_total{source=protected_drop}")
									logMsg += fmt.Sprintf(" 📦 CARGA SEGURA: Baú lotado; [%s] foi guardado na fila de resgate, sem perda.", item.Name)
								}
							}
							if !persisted {
								// Reserva de emergência em memória, inclusive acima dos 20 slots
								// visuais. O fechamento da sessão tenta persistir novamente.
								s.OverflowChest = append(s.OverflowChest, *item)
								if s.SaveOverflowChestFunc != nil {
									_ = s.SaveOverflowChestFunc(s.Character.ID, s.OverflowChest)
								}
								logMsg += fmt.Sprintf(" 📦 RESERVA DE EMERGÊNCIA: [%s] permaneceu protegido para nova tentativa de persistência.", item.Name)
							}
						} else {
							// Conversão forçada de emergência apenas para itens NÃO protegidos (50% do valor comercial)
							goldValue := int64(math.Round(float64(item.ValueGold) * 0.50))
							if goldValue < 5 {
								goldValue = 5
							}
							s.Character.GoldBank += goldValue
							logMsg += fmt.Sprintf(" 💰 SUPLENTO: Sem espaço no inventário/baú! [%s] foi convertido em %d de ouro (50%% taxa emergencial)!", item.Name, goldValue)
							if s.SaveCharFunc != nil {
								_ = s.SaveCharFunc(s.Character)
							}
						}
					}
				}
			}

			// Rolagem Independente de Recursos do Acampamento & Troféus
			itemMobKey := mob.Key
			if itemMobKey == "" {
				itemMobKey = mob.Name
			}
			resDrops := RollMonsterResources(itemMobKey, r)
			if len(resDrops) > 0 {
				var storageCap int64 = DefaultBaseResourceStorage
				if s.Camp != nil && s.Camp.StorageCapacity > 0 {
					storageCap = s.Camp.StorageCapacity
				}
				if s.SaveResourcesFunc != nil {
					mutRes, err := s.SaveResourcesFunc(s.Character.ID, resDrops, storageCap, "monster_drop", itemMobKey)
					if err == nil {
						s.Resources = make(map[string]int64)
						for _, item := range mutRes.Inventory.Items {
							s.Resources[item.Key] = item.Quantity
						}
						if s.Camp != nil {
							s.Camp.StorageUsed = mutRes.Inventory.StorageUsed
							s.Camp.StateRevision = mutRes.Inventory.Revision
						}

						resNames := []string{}
						for _, acc := range mutRes.Accepted {
							resDef, ok := GetResourceDefinition(acc.Key)
							name := acc.Key
							if ok && resDef.Name != "" {
								name = resDef.Name
							}
							resNames = append(resNames, fmt.Sprintf("+%d %s", acc.Quantity, name))
						}
						if len(resNames) > 0 {
							logMsg += fmt.Sprintf(" 🪵 RECURSOS: [%s]!", strings.Join(resNames, ", "))
						}
						if len(mutRes.Overflow) > 0 {
							logMsg += " 📦 (Armazém cheio: o excedente foi guardado como carga pendente)"
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

			// Marcar este boss como derrotado: adicionar o ID da região atual a UnlockedRegions.
			// CheckRegionAvailability usa esta lista para validar RequiresTierComplete.
			alreadyMarked := false
			for _, unl := range s.Character.UnlockedRegions {
				if unl == s.ActiveRegion {
					alreadyMarked = true
					break
				}
			}
			if !alreadyMarked {
				s.Character.UnlockedRegions = append(s.Character.UnlockedRegions, s.ActiveRegion)
			}

			// Compatibilidade legada: desbloquear regiões com RequiresUnlockFrom apontando para esta.
			// Para regiões com RequiresTierComplete, o desbloqueio é implícito pela presença
			// de todos os IDs do tier anterior em UnlockedRegions (verificado em CheckRegionAvailability).
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

			// Verificar se completou o tier e anunciar se todas as regiões do tier foram concluídas
			currentTierRegions := GetRegionsByTier(regInfo.Tier)
			defeatedSet := make(map[string]bool, len(s.Character.UnlockedRegions))
			for _, id := range s.Character.UnlockedRegions {
				defeatedSet[id] = true
			}
			allTierDone := true
			for _, tr := range currentTierRegions {
				if !defeatedSet[tr.ID] {
					allTierDone = false
					break
				}
			}
			if allTierDone {
				nextTierRegions := GetRegionsByTier(regInfo.Tier + 1)
				if len(nextTierRegions) > 0 {
					logMsg += fmt.Sprintf(" 🔓✨ TIER %d COMPLETO! O Tier %d está agora disponível!", regInfo.Tier, regInfo.Tier+1)
				}
			}

			// Reiniciar ciclo para a Fase 1
			s.CurrentStage = 1
			s.IsBossStage = false
		} else {
			// Avançar para a próxima Fase (Stage)
			s.CurrentStage++
			logMsg += fmt.Sprintf(" 🚩 FASE CONCLUÍDA! Avançando para a Fase %d/%d...", s.CurrentStage, s.MaxStages)
		}
	}

	s.CurrentMonsters = aliveMonsters

	// Level Up Check: delega ao calculador canônico ApplyExperienceGain para
	// garantir paridade total entre motor online, offline e testes.
	if totalXPGained > 0 {
		leveledUp, newLevels, _ := ApplyExperienceGain(s.Character, totalXPGained)
		if leveledUp {
			s.CalculateStats()
			logMsg += fmt.Sprintf(" 🌟 LEVEL UP! Você avançou %d nível(is) e chegou ao Nível %d!", newLevels, s.Character.Level)
		}
	}

	s.syncPersistentExpeditionState()
	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}

	discoveredList := make([]string, 0, len(s.DiscoveredLoot))
	for k := range s.DiscoveredLoot {
		discoveredList = append(discoveredList, k)
	}

	s.broadcastMessage(CombatMessage{
		Type:           "COMBAT_EVENT",
		Timestamp:      time.Now().Format("15:04:05"),
		Character:      s.Character,
		Inventory:      s.Inventory,
		Monsters:       s.CurrentMonsters,
		DamageDealt:    totalDamageDealt,
		DamageTaken:    totalDamageTaken,
		DPS:            currentDPS,
		TotalAttack:    totalAtk,
		TotalDefense:   totalDef,
		DerivedStats:   derivedStats,
		CombatEffects:  combatEffects,
		SkillCooldowns: s.SkillCooldowns,
		ActiveRegion:   s.ActiveRegion,
		ActiveStance:   s.ActiveStance,
		DiscoveredLoot: discoveredList,
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
			// Aprendizado é independente da arma equipada. O único bloqueio de
			// progressão do livro é o nível mínimo; compatibilidade de arma será
			// verificada somente ao ativar e executar a habilidade.
			if targetItem.RequiredLevel > 0 && s.Character.Level < targetItem.RequiredLevel {
				s.broadcastMessage(CombatMessage{
					Type:      "SKILL_ERROR",
					Timestamp: time.Now().Format("15:04:05"),
					LogText:   fmt.Sprintf("🔒 %s requer nível %d para ser estudado. A arma equipada não interfere no aprendizado.", targetItem.Name, targetItem.RequiredLevel),
					IsActive:  s.IsExpeditionActive,
				})
				return
			}
			hasSkill := false
			for _, sk := range s.Character.LearnedSkills {
				if sk == skillKey {
					hasSkill = true
					break
				}
			}
			if hasSkill {
				s.broadcastMessage(CombatMessage{
					Type:      "SKILL_ERROR",
					Timestamp: time.Now().Format("15:04:05"),
					LogText:   fmt.Sprintf("📚 Você já conhece a habilidade de [%s]. O livro não foi consumido.", targetItem.Name),
					IsActive:  s.IsExpeditionActive,
				})
				return
			}
			s.Character.LearnedSkills = append(s.Character.LearnedSkills, skillKey)

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
				LogText:      fmt.Sprintf("📖 Você aprendeu [%s] permanentemente! Equipe uma arma compatível para ativar e usar a habilidade.", targetItem.Name),
				IsActive:     s.IsExpeditionActive,
			})
			return
		}
	}

	// P0-02: Validação Autoritativa de Slot — o backend resolve o slot canônico do item.
	// O cliente pode enviar uma "intenção", mas o slot real é determinado pelo item.
	canonicalSlot := GetItemSlotType(&targetItem)
	if canonicalSlot == string(SlotManual) {
		// Manuais de construção não são "equipáveis" via este fluxo
		s.broadcastMessage(CombatMessage{
			Type:      "COMBAT_LOG",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("⚠️ [%s] é um manual de construção e não pode ser equipado.", targetItem.Name),
			IsActive:  s.IsExpeditionActive,
		})
		return
	}
	// Rejeita se o slot enviado pelo cliente não corresponde ao slot canônico do item
	if slot != canonicalSlot {
		log.Printf("P0-02: Slot mismatch! Cliente enviou slot=%s mas item %s é slot=%s", slot, targetItem.Name, canonicalSlot)
		s.broadcastMessage(CombatMessage{
			Type:      "COMBAT_LOG",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("⚠️ [%s] não pode ser equipado no slot [%s]. Este item pertence ao slot [%s].", targetItem.Name, slot, canonicalSlot),
			IsActive:  s.IsExpeditionActive,
		})
		return
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
			s.broadcastMessage(CombatMessage{
				Type:      "COMBAT_LOG",
				Timestamp: time.Now().Format("15:04:05"),
				LogText:   "⚠️ Munição requer uma arma principal equipada!",
				IsActive:  s.IsExpeditionActive,
			})
			return
		}
		if GetItemWeaponType(eq.MainHand) != WeaponTypeBow {
			s.broadcastMessage(CombatMessage{
				Type:         "INVENTORY_UPDATE",
				Timestamp:    time.Now().Format("15:04:05"),
				Character:    s.Character,
				Inventory:    s.Inventory,
				ActiveRegion: s.ActiveRegion,
				ActiveStance: s.ActiveStance,
				LogText:      "⚠️ Munição só pode ser equipada se você estiver usando um Arco ou Besta!",
				IsActive:     s.IsExpeditionActive,
			})
			return
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
	s.syncPersistentExpeditionState()

	if s.SaveCharAndInvFunc != nil {
		if err := s.SaveCharAndInvFunc(s.Character, s.Inventory); err != nil {
			log.Printf("Aviso: erro na persistência atômica de BulkSell: %v", err)
		}
	} else {
		if s.SaveInvFunc != nil {
			_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
		}
		if s.SaveCharFunc != nil {
			_ = s.SaveCharFunc(s.Character)
		}
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

func (s *GameSession) GetCurrentInventoryWeight() float64 {
	return s.GetTotalWeight()
}

func (s *GameSession) GetMaxSlotCapacity() int {
	stats := CalculateDerivedStats(s.Character, s.Inventory, s.ActiveStance)
	return stats.MaxSlots
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
	// Nota: Não adicionamos automaticamente regiões do Tier 1 aqui.
	// Regiões sem RequiresUnlockFrom são acessíveis por nível via CheckRegionAvailability.
	// Personagens existentes já possuem os IDs do Tier 1 em UnlockedRegions (grandfathered),
	// e novos personagens iniciam sem IDs pré-semeados, desbloqueando após derrotar cada boss.
	unlocked := make([]string, 0, len(existing))
	for id := range existing {
		unlocked = append(unlocked, id)
	}
	sort.Strings(unlocked)
	char.UnlockedRegions = unlocked
}

func (s *GameSession) SelectRegion(regionID string) bool {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	region, exists := GetExpeditionRegion(regionID)
	if !exists {
		return false
	}

	avail := CheckRegionAvailability(s.Character.Level, s.Character.UnlockedRegions, region)
	if !avail.Available {
		s.broadcastMessage(CombatMessage{
			Type:      "COMBAT_LOG",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   fmt.Sprintf("🔒 Região Bloqueada: %s", avail.Reason),
			IsActive:  s.IsExpeditionActive,
		})
		return false
	}

	s.ActiveRegion = region.ID
	s.CurrentStage = 1
	s.MaxStages = region.MaxStages
	s.IsBossStage = false
	s.Character.ActiveRegion = region.ID
	s.Character.CurrentStage = 1
	s.Character.IsBossStage = false
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
		LogText:      fmt.Sprintf("🗺️ Você partiu para %s. A fase da caçada começou em 1/%d; toda a progressão permanente foi preservada.", region.Name, region.MaxStages),
		IsActive:     s.IsExpeditionActive,
	})
	return true
}

func (s *GameSession) SetStance(stance string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	if stance == "offensive" || stance == "defensive" || stance == "balanced" {
		s.ActiveStance = stance
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
			Monsters:     s.CurrentMonsters,
			TotalAttack:  totalAtk,
			TotalDefense: totalDef,
			ActiveRegion: s.ActiveRegion,
			ActiveStance: s.ActiveStance,
			LogText:      fmt.Sprintf("Postura tática alterada para [%s]!", stance),
			IsActive:     s.IsExpeditionActive,
		})
	}
}

func (s *GameSession) UpdateAutoSellSettings(newSettings AutoSellSettings) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	previousSettings := s.AutoSellSettings

	// Validação rigorosa dos parâmetros de auto-venda
	if newSettings.TriggerPercent <= 0 || newSettings.TriggerPercent > 100 {
		newSettings.TriggerPercent = 75
	}
	if newSettings.TargetPercent <= 0 || newSettings.TargetPercent >= newSettings.TriggerPercent {
		newSettings.TargetPercent = int(math.Max(10, float64(newSettings.TriggerPercent-15)))
	}
	if newSettings.KeepBestPerTemplate <= 0 {
		newSettings.KeepBestPerTemplate = 1
	}
	if len(newSettings.ProtectedTemplateKeys) > 50 {
		newSettings.ProtectedTemplateKeys = newSettings.ProtectedTemplateKeys[:50]
	}

	s.AutoSellSettings = newSettings
	if s.SaveAutoSellSettingsFunc != nil {
		if err := s.SaveAutoSellSettingsFunc(s.Character.ID, newSettings); err != nil {
			s.AutoSellSettings = previousSettings
			s.broadcastMessage(CombatMessage{
				Type:             "ECONOMY_ERROR",
				Timestamp:        time.Now().Format("15:04:05"),
				AutoSellSettings: &s.AutoSellSettings,
				LogText:          "Não foi possível salvar a venda automática. Nenhuma configuração foi alterada.",
				IsActive:         s.IsExpeditionActive,
			})
			return
		}
	}
	s.broadcastMessage(CombatMessage{
		Type:             "AUTO_SELL_SETTINGS_UPDATED",
		Timestamp:        time.Now().Format("15:04:05"),
		AutoSellSettings: &s.AutoSellSettings,
		LogText:          "⚙️ Configurações de venda automática atualizadas com sucesso!",
		IsActive:         s.IsExpeditionActive,
	})
}

func (s *GameSession) RequestAutoSellPreview(settings AutoSellSettings) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	maxSlots := s.GetMaxSlotCapacity()
	maxWeight := s.GetMaxWeightCapacity()
	currentWeight := s.GetTotalWeight()
	preview := EvaluateAutoSell(settings, s.Inventory.Backpack, maxSlots, currentWeight, maxWeight)
	s.broadcastMessage(CombatMessage{
		Type:            "AUTO_SELL_PREVIEW",
		Timestamp:       time.Now().Format("15:04:05"),
		AutoSellPreview: &preview,
		IsActive:        s.IsExpeditionActive,
	})
}

func (s *GameSession) ClaimOverflowItem(itemID string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	var targetItem *Item
	newChest := make([]Item, 0, len(s.OverflowChest))
	for _, it := range s.OverflowChest {
		if it.ID == itemID && targetItem == nil {
			targetItem = &it
		} else {
			newChest = append(newChest, it)
		}
	}

	if targetItem == nil {
		return
	}

	maxSlots := s.GetMaxSlotCapacity()
	maxWeight := s.GetMaxWeightCapacity()
	curWeight := s.GetTotalWeight()

	if len(s.Inventory.Backpack) >= maxSlots || curWeight+targetItem.Weight > maxWeight {
		s.broadcastMessage(CombatMessage{
			Type:      "COMBAT_LOG",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   "⚠️ Inventário cheio ou limite de peso excedido para resgatar este item!",
			IsActive:  s.IsExpeditionActive,
		})
		return
	}

	s.OverflowChest = newChest
	s.Inventory.Backpack = append([]Item{*targetItem}, s.Inventory.Backpack...)
	s.syncPersistentExpeditionState()

	if s.SaveInvFunc != nil {
		_ = s.SaveInvFunc(s.Character.ID, s.Inventory)
	}
	if s.SaveOverflowChestFunc != nil {
		_ = s.SaveOverflowChestFunc(s.Character.ID, s.OverflowChest)
	}

	totalAtk, totalDef := s.CalculateStats()
	s.broadcastMessage(CombatMessage{
		Type:          "OVERFLOW_CHEST_UPDATE",
		Timestamp:     time.Now().Format("15:04:05"),
		Character:     s.Character,
		Inventory:     s.Inventory,
		OverflowChest: s.OverflowChest,
		TotalAttack:   totalAtk,
		TotalDefense:  totalDef,
		LogText:       fmt.Sprintf("📦 Item [%s] resgatado do Baú de Achados para a mochila!", targetItem.Name),
		IsActive:      s.IsExpeditionActive,
	})
}

func (s *GameSession) SellOverflowItem(itemID string) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	var targetItem *Item
	newChest := make([]Item, 0, len(s.OverflowChest))
	for _, it := range s.OverflowChest {
		if it.ID == itemID && targetItem == nil {
			targetItem = &it
		} else {
			newChest = append(newChest, it)
		}
	}

	if targetItem == nil {
		return
	}

	goldGain := int64(targetItem.ValueGold)
	if goldGain <= 0 {
		goldGain = 1
	}

	s.OverflowChest = newChest
	s.Character.GoldBank += goldGain
	s.syncPersistentExpeditionState()

	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}
	if s.SaveOverflowChestFunc != nil {
		_ = s.SaveOverflowChestFunc(s.Character.ID, s.OverflowChest)
	}

	totalAtk, totalDef := s.CalculateStats()
	s.broadcastMessage(CombatMessage{
		Type:          "OVERFLOW_CHEST_UPDATE",
		Timestamp:     time.Now().Format("15:04:05"),
		Character:     s.Character,
		Inventory:     s.Inventory,
		OverflowChest: s.OverflowChest,
		TotalAttack:   totalAtk,
		TotalDefense:  totalDef,
		LogText:       fmt.Sprintf("💰 Item [%s] vendido diretamente do Baú por %d de ouro!", targetItem.Name, goldGain),
		IsActive:      s.IsExpeditionActive,
	})
}

func (s *GameSession) SellAllOverflow() {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	if len(s.OverflowChest) == 0 {
		return
	}

	var totalGold int64 = 0
	count := len(s.OverflowChest)
	for _, it := range s.OverflowChest {
		val := int64(it.ValueGold)
		if val <= 0 {
			val = 1
		}
		totalGold += val
	}

	s.OverflowChest = []Item{}
	s.Character.GoldBank += totalGold
	s.syncPersistentExpeditionState()

	if s.SaveCharFunc != nil {
		_ = s.SaveCharFunc(s.Character)
	}
	if s.SaveOverflowChestFunc != nil {
		_ = s.SaveOverflowChestFunc(s.Character.ID, s.OverflowChest)
	}

	totalAtk, totalDef := s.CalculateStats()
	s.broadcastMessage(CombatMessage{
		Type:          "OVERFLOW_CHEST_UPDATE",
		Timestamp:     time.Now().Format("15:04:05"),
		Character:     s.Character,
		Inventory:     s.Inventory,
		OverflowChest: s.OverflowChest,
		TotalAttack:   totalAtk,
		TotalDefense:  totalDef,
		LogText:       fmt.Sprintf("💰 Todos os %d itens do Baú de Achados foram vendidos por %d de ouro!", count, totalGold),
		IsActive:      s.IsExpeditionActive,
	})
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

// CloneCharacterSnapshot e CloneInventorySnapshot expõem cópias profundas
// para handlers externos enfileirarem mensagens sem compartilhar ponteiros com
// o ticker da sessão.
func CloneCharacterSnapshot(character *CharacterData) *CharacterData {
	return cloneCharacterData(character)
}

func CloneInventorySnapshot(inventory *InventoryData) *InventoryData {
	return cloneInventoryData(inventory)
}

func CloneCampSnapshot(camp *CampState) *CampState {
	if camp == nil {
		return nil
	}
	copyCamp := *camp
	copyCamp.Buildings = make(map[string]BuildingSlot, len(camp.Buildings))
	for key, slot := range camp.Buildings {
		copySlot := slot
		if slot.UpgradeStartedAt != nil {
			value := *slot.UpgradeStartedAt
			copySlot.UpgradeStartedAt = &value
		}
		if slot.UpgradeEndsAt != nil {
			value := *slot.UpgradeEndsAt
			copySlot.UpgradeEndsAt = &value
		}
		copyCamp.Buildings[key] = copySlot
	}
	copyCamp.Blueprints = make(map[string]BuildingBlueprintProgress, len(camp.Blueprints))
	for key, blueprint := range camp.Blueprints {
		copyCamp.Blueprints[key] = blueprint
	}
	return &copyCamp
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
	msg.AttackCooldownRemaining = math.Max(0, math.Round(s.BasicAttackCooldownSec*100)/100)

	if s.Camp != nil && msg.Camp == nil {
		msg.Camp = s.Camp
	}
	msg.Camp = CloneCampSnapshot(msg.Camp)
	if s.Resources != nil && msg.Resources == nil {
		resList := make([]ResourceAmount, 0, len(s.Resources))
		for k, v := range s.Resources {
			if v > 0 {
				resList = append(resList, ResourceAmount{Key: k, Quantity: v})
			}
		}
		sort.Slice(resList, func(i, j int) bool {
			return resList[i].Key < resList[j].Key
		})
		msg.Resources = resList
	}
	if msg.ResourceInventory == nil && s.Resources != nil {
		items := make([]ResourceAmount, 0, len(s.Resources))
		for k, v := range s.Resources {
			if v > 0 {
				items = append(items, ResourceAmount{Key: k, Quantity: v})
			}
		}
		sort.Slice(items, func(i, j int) bool {
			return items[i].Key < items[j].Key
		})
		var capVal int64 = DefaultBaseResourceStorage
		var rev int64 = 0
		var used int64 = GetStorageUsed(s.Resources)
		if s.Camp != nil {
			capVal = s.Camp.StorageCapacity
			rev = s.Camp.StateRevision
		}
		msg.ResourceInventory = &ResourceInventorySnapshot{
			Items:           items,
			StorageUsed:     used,
			StorageCapacity: capVal,
			Revision:        rev,
		}
	}

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

	// Atribuição de Metadados de Protocolo V2 e Sequenciamento Monotônico
	seq := atomic.AddUint64(&s.SequenceCounter, 1)
	msg.Sequence = seq
	msg.ProtocolVersion = 2
	if msg.Timestamp == "" {
		msg.Timestamp = time.Now().Format("15:04:05")
	}
	if msg.Character != nil {
		msg.StateRevision = msg.Character.StateRevision
	}

	category := GetEventCategory(msg.Type)
	if category == EventCategoryCritical {
		// Eventos Críticos (Loot, Ouro, Level Up, Obras) NUNCA são descartados silenciosamente
		select {
		case s.SendChannel <- msg:
		case <-time.After(300 * time.Millisecond):
			select {
			case s.SendChannel <- msg:
			default:
				log.Printf("⚠️ AVISO CRÍTICO: Buffer de envio lotado para evento crítico %s (seq: %d)", msg.Type, msg.Sequence)
			}
		}
	} else {
		// Eventos de Estado e Efêmeros (Tick, combate visual, etc.) podem coalescer
		select {
		case s.SendChannel <- msg:
		default:
		}
	}
}

// SendMessage é a porta segura para produtores externos ao loop da sessão.
// Ela serializa a leitura do agregado com o ticker antes de materializar o
// evento. Código que já possui Mu deve usar SendMessageLocked.
func (s *GameSession) SendMessage(msg CombatMessage) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	s.broadcastMessage(msg)
}

// SendMessageLocked evita deadlock quando o chamador já protege a sessão.
func (s *GameSession) SendMessageLocked(msg CombatMessage) {
	s.broadcastMessage(msg)
}

// RequestStateSync força a emissão de um snapshot autoritativo completo (STATE_SNAPSHOT).
func (s *GameSession) RequestStateSync() {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	totalAtk, totalDef := s.CalculateStats()
	discoveredList := make([]string, 0, len(s.DiscoveredLoot))
	for itKey := range s.DiscoveredLoot {
		discoveredList = append(discoveredList, itKey)
	}
	sort.Strings(discoveredList)

	s.broadcastMessage(CombatMessage{
		Type:             "STATE_SNAPSHOT",
		Timestamp:        time.Now().Format("15:04:05"),
		Character:        s.Character,
		Inventory:        s.Inventory,
		Monsters:         s.CurrentMonsters,
		TotalAttack:      totalAtk,
		TotalDefense:     totalDef,
		ActiveRegion:     s.ActiveRegion,
		ActiveStance:     s.ActiveStance,
		CurrentStage:     s.CurrentStage,
		MaxStages:        s.MaxStages,
		IsBossStage:      s.IsBossStage,
		IsActive:         s.IsExpeditionActive,
		Camp:             s.Camp,
		DiscoveredLoot:   discoveredList,
		AutoSellSettings: &s.AutoSellSettings,
		OverflowChest:    s.OverflowChest,
		LogText:          "🔄 Estado sincronizado com sucesso com o servidor autoritativo.",
	})
}

func (s *GameSession) ToggleExpedition() bool {
	s.Mu.Lock()
	s.IsExpeditionActive = !s.IsExpeditionActive
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

	// P0-01: Guard de idempotência — starter pack é one-shot.
	if s.Character.StarterPackClaimed {
		s.broadcastMessage(CombatMessage{
			Type:      "COMBAT_LOG",
			Timestamp: time.Now().Format("15:04:05"),
			LogText:   "⚠️ Você já selecionou um pacote inicial! Não é possível escolher novamente.",
			IsActive:  s.IsExpeditionActive,
		})
		return
	}

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
		item.Source = ItemSourceStarter
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

	// P0-01: Marca como reivindicado ANTES de persistir
	s.Character.StarterPackClaimed = true
	s.Character.StarterPackKey = pack

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
