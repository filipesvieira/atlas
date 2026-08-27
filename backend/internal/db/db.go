package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"math/rand"
	"strings"
	"time"

	"github.com/atlas/backend/pkg/game"
	_ "github.com/lib/pq"
)

type Account struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type Character struct {
	ID                        string             `json:"id"`
	AccountID                 string             `json:"account_id"`
	Name                      string             `json:"name"`
	Vocation                  string             `json:"vocation"`
	Origin                    string             `json:"origin"`
	Level                     int                `json:"level"`
	Experience                int64              `json:"experience"`
	Health                    int                `json:"health"`
	MaxHealth                 int                `json:"max_health"`
	Mana                      int                `json:"mana"`
	MaxMana                   int                `json:"max_mana"`
	GoldBank                  int64              `json:"gold_bank"`
	STR                       int                `json:"str"`
	DEX                       int                `json:"dex"`
	INT                       int                `json:"int_stat"`
	VIT                       int                `json:"vit"`
	UnspentPoints             int                `json:"unspent_points"`
	Masteries                 game.MasteriesData `json:"masteries"`
	LearnedSkills             []string           `json:"learned_skills"`
	ActiveSkills              []string           `json:"active_skills"`
	UnlockedRegions           []string           `json:"unlocked_regions"`
	IsExpeditionActive        bool               `json:"is_expedition_active"`
	ActiveRegion              string             `json:"active_region"`
	LastLogin                 time.Time          `json:"last_login"`
	LastLogout                time.Time          `json:"last_logout"`
	OfflineClaimedAt          time.Time          `json:"offline_claimed_at"`
	ActiveStance              string             `json:"active_stance"`
	CurrentStage              int                `json:"current_stage"`
	IsBossStage               bool               `json:"is_boss_stage"`
	ExpeditionsCompletedTotal int64              `json:"expeditions_completed_total"`
	BossesDefeatedTotal       int64              `json:"bosses_defeated_total"`
	ExpeditionDeathsTotal     int64              `json:"expedition_deaths_total"`
	HighestStageReached       int                `json:"highest_stage_reached"`
	LastExpeditionDeathStage  int                `json:"last_expedition_death_stage,omitempty"`
	ExpeditionRecoveryUntil   time.Time          `json:"expedition_recovery_until,omitempty"`
	StateRevision             int64              `json:"state_revision"`
	ProgressionVersion        int                `json:"progression_version"`
	LifetimeExperience        int64              `json:"lifetime_experience"`
	HighestLevelEver          int                `json:"highest_level_ever"`
	AutoResumeExpedition      bool               `json:"auto_resume_expedition"`
	StarterPackClaimed        bool               `json:"starter_pack_claimed"`
	StarterPackKey            string             `json:"starter_pack_key,omitempty"`
	ProgressionBlocked        bool               `json:"progression_blocked,omitempty"`
	ProgressionBlockReason    string             `json:"progression_block_reason,omitempty"`
}

type EquipmentSlots struct {
	Head     *game.Item `json:"head"`
	Necklace *game.Item `json:"necklace"`
	Chest    *game.Item `json:"chest"`
	MainHand *game.Item `json:"mainhand"`
	OffHand  *game.Item `json:"offhand"`
	Legs     *game.Item `json:"legs"`
	Boots    *game.Item `json:"boots"`
	Ring     *game.Item `json:"ring"`
	Ammo     *game.Item `json:"ammo"`
	Bag      *game.Item `json:"bag"`
}

type Inventory struct {
	Equipment EquipmentSlots `json:"equipment"`
	Backpack  []game.Item    `json:"backpack"`
	Cap       int            `json:"cap"`
	Revision  int64          `json:"revision"`
}

func ConvertDBInvToGameInv(inv *Inventory) *game.InventoryData {
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

func ConvertGameInvToDBInv(inv *game.InventoryData) *Inventory {
	if inv == nil {
		return &Inventory{Cap: 1500}
	}
	return &Inventory{
		Equipment: EquipmentSlots(inv.Equipment),
		Backpack:  inv.Backpack,
		Cap:       inv.Cap,
		Revision:  inv.Revision,
	}
}

var DB *sql.DB

var (
	ErrInvalidProgression  = errors.New("snapshot de progressão inválido; dados não foram alterados")
	ErrProgressionConflict = errors.New("conflito de progressão: o banco possui um estado mais novo")
	ErrInventoryConflict   = errors.New("conflito de inventário: o banco possui uma versão mais nova")
)

func validateProgressionSnapshot(c *Character) error {
	if c == nil || c.Level < 1 || c.Experience < 0 || c.LifetimeExperience < 0 {
		return ErrInvalidProgression
	}
	if c.HighestLevelEver == 0 {
		c.HighestLevelEver = c.Level
	}
	if c.HighestLevelEver < c.Level {
		return ErrInvalidProgression
	}
	if c.ProgressionVersion < 1 || (c.Level < game.MaxCharacterLevel && c.Experience >= game.GetRequiredXPForLevel(c.Level)) {
		return fmt.Errorf("%w: personagem requer revisão da migração de XP", ErrInvalidProgression)
	}
	return nil
}

func InitDB(connStr string) (*sql.DB, error) {
	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("erro abrindo postgres: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err := DB.Ping(); err != nil {
		return nil, fmt.Errorf("banco de dados indisponível: %w", err)
	}
	if err := RunMigrations(DB); err != nil {
		return nil, err
	}
	if err := ClassifyLegacyProgression(DB); err != nil {
		return nil, err
	}

	// O schema é alterado exclusivamente pelas migrations embutidas. Qualquer
	// incompatibilidade interrompe o startup em vez de ser ignorada.

	if err := BootstrapStaticData(DB); err != nil {
		return nil, err
	}
	LoadCache()

	return DB, nil
}

func CreateAccount(email, passwordHash string) (*Account, error) {
	query := `INSERT INTO accounts (email, password_hash) VALUES ($1, $2) RETURNING id, email, role, created_at`
	acc := &Account{}
	err := DB.QueryRow(query, email, passwordHash).Scan(&acc.ID, &acc.Email, &acc.Role, &acc.CreatedAt)
	if err != nil {
		return nil, err
	}
	return acc, nil
}

func GetAccountByEmail(email string) (*Account, error) {
	query := `SELECT id, email, password_hash, role, created_at FROM accounts WHERE email = $1`
	acc := &Account{}
	err := DB.QueryRow(query, email).Scan(&acc.ID, &acc.Email, &acc.PasswordHash, &acc.Role, &acc.CreatedAt)
	if err != nil {
		return nil, err
	}
	return acc, nil
}

func CreateCharacter(accountID, name, vocation, origin string) (*Character, error) {
	if vocation == "" {
		vocation = "Aprendiz"
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	query := `
		INSERT INTO characters (account_id, name, vocation, origin, level, experience, health, max_health, mana, max_mana, gold_bank, str, dex, int_stat, vit, unspent_points, masteries, learned_skills, active_skills, unlocked_regions, starter_pack_claimed, starter_pack_key, progression_version, lifetime_experience, highest_level_ever)
		VALUES ($1, $2, $3, $4, 1, 0, 225, 225, 115, 115, 100, 5, 5, 5, 5, 0, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, true, 'classless_all', 1, 0, 1)
		RETURNING id, account_id, name, vocation, origin, level, experience, health, max_health, mana, max_mana, gold_bank, COALESCE(str, 5), COALESCE(dex, 5), COALESCE(int_stat, 5), COALESCE(vit, 5), COALESCE(unspent_points, 0), COALESCE(masteries, '{}'::jsonb), COALESCE(learned_skills, '[]'::jsonb), COALESCE(active_skills, '[]'::jsonb), last_login, last_logout, COALESCE(starter_pack_claimed, false), COALESCE(starter_pack_key, '')
	`
	char := &Character{}
	var masteriesRaw, skillsRaw, activeRaw string
	err = tx.QueryRow(query, accountID, name, vocation, origin).Scan(
		&char.ID, &char.AccountID, &char.Name, &char.Vocation, &char.Origin,
		&char.Level, &char.Experience, &char.Health, &char.MaxHealth,
		&char.Mana, &char.MaxMana, &char.GoldBank, &char.STR, &char.DEX, &char.INT, &char.VIT, &char.UnspentPoints,
		&masteriesRaw, &skillsRaw, &activeRaw, &char.LastLogin, &char.LastLogout,
		&char.StarterPackClaimed, &char.StarterPackKey,
	)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(masteriesRaw), &char.Masteries); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(skillsRaw), &char.LearnedSkills); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(activeRaw), &char.ActiveSkills); err != nil {
		return nil, err
	}
	char.UnlockedRegions = []string{"forest", "shereque", "chapolin"}
	char.ActiveRegion = "forest"
	char.ActiveStance = "balanced"
	char.CurrentStage = 1
	char.ProgressionVersion = 1
	char.LifetimeExperience = 0
	char.HighestLevelEver = 1
	char.StateRevision = 0

	// Todos os starters vêm dos mesmos templates usados pelo loot.
	defaultEquip := EquipmentSlots{}
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	starterSword := game.GenerateItemFromTemplate("Espada do Aprendiz", "Comum", rng)
	starterShield := game.GenerateItemFromTemplate("Broquel de Madeira", "Comum", rng)
	starterBow := game.GenerateItemFromTemplate("Arco Curvo", "Comum", rng)
	starterArrows := game.GenerateItemFromTemplate("Flechas de Madeira", "Comum", rng)
	starterWand := game.GenerateItemFromTemplate("Varinha do Aprendiz", "Comum", rng)
	starterHead := game.GenerateItemFromTemplate("Capacete de Couro", "Comum", rng)
	starterChest := game.GenerateItemFromTemplate("Túnica de Couro", "Comum", rng)
	starterLegs := game.GenerateItemFromTemplate("Calça de Couro do Pioneiro", "Comum", rng)
	starterBoots := game.GenerateItemFromTemplate("Botas de Couro do Pioneiro", "Comum", rng)
	starterBag := game.GenerateItemFromTemplate("Pequena Bolsa", "Comum", rng)
	for _, starter := range []*game.Item{starterSword, starterShield, starterBow, starterArrows, starterWand, starterHead, starterChest, starterLegs, starterBoots, starterBag} {
		if starter != nil {
			starter.Source = game.ItemSourceStarter
		}
	}
	defaultBackpack := []game.Item{}
	if starterSword != nil {
		starterSword.SpecialEffect = "Arma Inicial"
		defaultEquip.MainHand = starterSword
	}
	if starterShield != nil {
		starterShield.SpecialEffect = "Escudo Inicial"
		defaultEquip.OffHand = starterShield
	}
	if starterHead != nil {
		starterHead.SpecialEffect = "Kit de Couro do Pioneiro"
		defaultEquip.Head = starterHead
	}
	if starterChest != nil {
		starterChest.SpecialEffect = "Kit de Couro do Pioneiro"
		defaultEquip.Chest = starterChest
	}
	if starterLegs != nil {
		starterLegs.SpecialEffect = "Kit de Couro do Pioneiro"
		defaultEquip.Legs = starterLegs
	}
	if starterBoots != nil {
		starterBoots.SpecialEffect = "Kit de Couro do Pioneiro"
		defaultEquip.Boots = starterBoots
	}
	if starterBag != nil {
		starterBag.SpecialEffect = "Bolsa Inicial"
		defaultEquip.Bag = starterBag
	}
	if starterBow != nil {
		starterBow.SpecialEffect = "Arma Inicial"
		defaultBackpack = append(defaultBackpack, *starterBow)
	}
	if starterArrows != nil {
		starterArrows.SpecialEffect = "Munição Inicial"
		defaultBackpack = append(defaultBackpack, *starterArrows)
	}
	if starterWand != nil {
		starterWand.SpecialEffect = "Arma Inicial"
		defaultBackpack = append(defaultBackpack, *starterWand)
	}

	equipJSON, _ := json.Marshal(defaultEquip)
	backpackJSON, _ := json.Marshal(defaultBackpack)

	invQuery := `INSERT INTO character_inventories (character_id, equipment, backpack) VALUES ($1, $2, $3)`
	if _, err := tx.Exec(invQuery, char.ID, string(equipJSON), string(backpackJSON)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return char, nil
}

func GetCharactersByAccountID(accountID string) ([]*Character, error) {
	rows, err := DB.Query(`SELECT `+characterSnapshotColumns+` FROM characters WHERE account_id=$1`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var characters []*Character
	validIDs := make(map[string]struct{})
	var blockedScan bool
	for rows.Next() {
		c, err := scanLockedCharacter(rows)
		if err != nil {
			if !errors.Is(err, ErrInvalidProgression) {
				return nil, err
			}
			// Um save legado ambíguo não deve esconder as demais personagens da
			// conta. Ele será anexado abaixo como bloqueado para revisão, sem
			// alterar XP ou nível automaticamente.
			blockedScan = true
			log.Printf("personagem legado bloqueado ao listar conta %s: %v", accountID, err)
			continue
		}
		characters = append(characters, c)
		validIDs[c.ID] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if !blockedScan {
		return characters, nil
	}

	blockedRows, err := DB.Query(`
		SELECT id, account_id, name, vocation, COALESCE(origin,'wanderer'), level,
		       experience, health, max_health, mana, max_mana, gold_bank
		FROM characters
		WHERE account_id=$1
		ORDER BY name`, accountID)
	if err != nil {
		return nil, err
	}
	defer blockedRows.Close()
	for blockedRows.Next() {
		c := &Character{ProgressionBlocked: true, ProgressionBlockReason: "xp_ambiguous_for_current_level"}
		if err := blockedRows.Scan(
			&c.ID, &c.AccountID, &c.Name, &c.Vocation, &c.Origin, &c.Level,
			&c.Experience, &c.Health, &c.MaxHealth, &c.Mana, &c.MaxMana, &c.GoldBank,
		); err != nil {
			return nil, err
		}
		if _, exists := validIDs[c.ID]; !exists {
			characters = append(characters, c)
		}
	}
	if err := blockedRows.Err(); err != nil {
		return nil, err
	}
	return characters, nil
}

func GetCharacterByID(id string) (*Character, error) {
	return scanLockedCharacter(DB.QueryRow(`SELECT `+characterSnapshotColumns+` FROM characters WHERE id=$1`, id))
}

func GetCharacterInventory(charID string) (*Inventory, error) {
	query := `SELECT equipment, backpack, revision FROM character_inventories WHERE character_id = $1`
	return scanInventory(DB.QueryRow(query, charID))
}

func GetCharacterInventoryTx(tx *sql.Tx, charID string, forUpdate bool) (*Inventory, error) {
	query := `SELECT equipment, backpack, revision FROM character_inventories WHERE character_id = $1`
	if forUpdate {
		query += ` FOR UPDATE`
	}
	return scanInventory(tx.QueryRow(query, charID))
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanInventory(row rowScanner) (*Inventory, error) {
	var equipRaw, backpackRaw string
	inv := &Inventory{Equipment: EquipmentSlots{}, Backpack: []game.Item{}, Cap: 1500}
	err := row.Scan(&equipRaw, &backpackRaw, &inv.Revision)
	if err != nil {
		if err == sql.ErrNoRows {
			return inv, nil
		}
		return nil, err
	}
	if err := json.Unmarshal([]byte(equipRaw), &inv.Equipment); err != nil {
		return nil, fmt.Errorf("equipamento persistido corrompido: %w", err)
	}
	if err := json.Unmarshal([]byte(backpackRaw), &inv.Backpack); err != nil {
		return nil, fmt.Errorf("mochila persistida corrompida: %w", err)
	}
	if inv.Backpack == nil {
		inv.Backpack = []game.Item{}
	}
	for i := range inv.Backpack {
		inv.Backpack[i] = game.RebalanceExistingItem(inv.Backpack[i])
	}
	items := []*game.Item{inv.Equipment.Head, inv.Equipment.Chest, inv.Equipment.Legs, inv.Equipment.Boots, inv.Equipment.MainHand, inv.Equipment.OffHand, inv.Equipment.Necklace, inv.Equipment.Ring, inv.Equipment.Ammo, inv.Equipment.Bag}
	for _, item := range items {
		if item == nil {
			continue
		}
		rebalanced := game.RebalanceExistingItem(*item)
		*item = rebalanced
	}
	return inv, nil
}

func SaveCharacterInventory(charID string, inv *Inventory) error {
	if inv == nil {
		return errors.New("inventário nulo")
	}
	equipJSON, _ := json.Marshal(inv.Equipment)
	backpackJSON, _ := json.Marshal(inv.Backpack)
	query := `
		INSERT INTO character_inventories (character_id, equipment, backpack, revision, updated_at)
		VALUES ($1, $2, $3, 1, NOW())
		ON CONFLICT (character_id) DO UPDATE
		SET equipment = EXCLUDED.equipment, backpack = EXCLUDED.backpack,
			revision = character_inventories.revision + 1, updated_at = NOW()
		WHERE character_inventories.revision = $4
		RETURNING revision
	`
	err := DB.QueryRow(query, charID, string(equipJSON), string(backpackJSON), inv.Revision).Scan(&inv.Revision)
	if err == sql.ErrNoRows {
		game.IncrementTelemetry("inventory_conflict_total")
		return ErrInventoryConflict
	}
	return err
}

func SaveCharacterInventoryTx(tx *sql.Tx, charID string, inv *Inventory) error {
	if inv == nil {
		return errors.New("inventário nulo")
	}
	equipJSON, _ := json.Marshal(inv.Equipment)
	backpackJSON, _ := json.Marshal(inv.Backpack)
	query := `
		INSERT INTO character_inventories (character_id, equipment, backpack, revision, updated_at)
		VALUES ($1, $2, $3, 1, NOW())
		ON CONFLICT (character_id) DO UPDATE
		SET equipment = EXCLUDED.equipment, backpack = EXCLUDED.backpack,
			revision = character_inventories.revision + 1, updated_at = NOW()
		WHERE character_inventories.revision = $4
		RETURNING revision
	`
	err := tx.QueryRow(query, charID, string(equipJSON), string(backpackJSON), inv.Revision).Scan(&inv.Revision)
	if err == sql.ErrNoRows {
		game.IncrementTelemetry("inventory_conflict_total")
		return ErrInventoryConflict
	}
	return err
}

// UpdateCharacterState salva o estado vivo, mas deliberadamente NÃO altera
// last_logout/offline_claimed_at. Timestamps offline só mudam em transições de conexão.
func UpdateCharacterState(c *Character) error {
	if err := validateProgressionSnapshot(c); err != nil {
		return err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	masteriesJSON, _ := json.Marshal(c.Masteries)
	skillsJSON, _ := json.Marshal(c.LearnedSkills)
	activeJSON, _ := json.Marshal(c.ActiveSkills)
	unlockedJSON, _ := json.Marshal(c.UnlockedRegions)
	query := `
		UPDATE characters AS target
		SET vocation=$2, level=$3, experience=$4, health=$5, max_health=$6,
			mana=$7, max_mana=$8, gold_bank=$9, str=$10, dex=$11,
			int_stat=$12, vit=$13, unspent_points=$14, masteries=$15,
			learned_skills=$16, active_skills=$17, unlocked_regions=$18,
			is_expedition_active=$19, active_region=$20, active_stance=$21,
			current_stage=$22, is_boss_stage=$23,
			state_revision=COALESCE(target.state_revision,0)+1,
			auto_resume_expedition=$25, starter_pack_claimed=$26, starter_pack_key=$27,
			progression_version=$28, lifetime_experience=GREATEST(lifetime_experience,$29),
			highest_level_ever=GREATEST(highest_level_ever,$30,$3),
			expeditions_completed_total=$31, bosses_defeated_total=$32,
			expedition_deaths_total=$33, highest_stage_reached=GREATEST(highest_stage_reached,$34),
			last_expedition_death_stage=$35, expedition_recovery_until=$36
		FROM (SELECT id,level AS previous_level,experience AS previous_experience,lifetime_experience AS previous_lifetime FROM characters WHERE id=$1) AS previous
		WHERE target.id=$1 AND previous.id=target.id
		  AND COALESCE(target.state_revision,0)=$24
		  AND (target.level < $3 OR (target.level = $3 AND target.experience <= $4))
		RETURNING target.state_revision,previous.previous_level,previous.previous_experience,previous.previous_lifetime
	`
	var previousLevel int
	var previousExperience int64
	var previousLifetime int64
	var nextRevision int64
	err = tx.QueryRow(query, c.ID, c.Vocation, c.Level, c.Experience, c.Health, c.MaxHealth, c.Mana, c.MaxMana, c.GoldBank, c.STR, c.DEX, c.INT, c.VIT, c.UnspentPoints, masteriesJSON, skillsJSON, activeJSON, unlockedJSON, c.IsExpeditionActive, c.ActiveRegion, c.ActiveStance, c.CurrentStage, c.IsBossStage, c.StateRevision, c.AutoResumeExpedition, c.StarterPackClaimed, c.StarterPackKey, c.ProgressionVersion, c.LifetimeExperience, c.HighestLevelEver, c.ExpeditionsCompletedTotal, c.BossesDefeatedTotal, c.ExpeditionDeathsTotal, c.HighestStageReached, c.LastExpeditionDeathStage, c.ExpeditionRecoveryUntil).Scan(&nextRevision, &previousLevel, &previousExperience, &previousLifetime)
	if err == sql.ErrNoRows {
		game.IncrementTelemetry("progression_conflict_total")
		return ErrProgressionConflict
	}
	if err != nil {
		return err
	}
	if c.Level > previousLevel || (c.Level == previousLevel && c.Experience > previousExperience) {
		xpDelta := c.LifetimeExperience - previousLifetime
		if xpDelta < 0 {
			xpDelta = 0
		}
		if _, err := tx.Exec(`INSERT INTO character_progression_events(character_id,event_key,source_kind,level_before,level_after,experience_before,experience_after,xp_delta,state_revision) VALUES($1,$2,'online_session',$3,$4,$5,$6,$7,$8) ON CONFLICT(character_id,event_key) DO NOTHING`, c.ID, fmt.Sprintf("online:%d", nextRevision), previousLevel, c.Level, previousExperience, c.Experience, xpDelta, nextRevision); err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	c.StateRevision = nextRevision
	return nil
}

// SaveCharacterAndInventoryAtomic persiste o estado do personagem e seu inventário
// em uma única transação atômica, evitando divergência entre ouro e itens.
func SaveCharacterAndInventoryAtomic(c *Character, inv *Inventory) error {
	if c == nil || inv == nil {
		return errors.New("personagem ou inventário nulo")
	}
	if err := validateProgressionSnapshot(c); err != nil {
		return err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback()

	masteriesJSON, _ := json.Marshal(c.Masteries)
	skillsJSON, _ := json.Marshal(c.LearnedSkills)
	activeJSON, _ := json.Marshal(c.ActiveSkills)
	unlockedJSON, _ := json.Marshal(c.UnlockedRegions)
	queryChar := `
		UPDATE characters
		SET vocation=$2, level=$3, experience=$4, health=$5, max_health=$6,
			mana=$7, max_mana=$8, gold_bank=$9, str=$10, dex=$11,
			int_stat=$12, vit=$13, unspent_points=$14, masteries=$15,
			learned_skills=$16, active_skills=$17, unlocked_regions=$18,
			is_expedition_active=$19, active_region=$20, active_stance=$21,
			current_stage=$22, is_boss_stage=$23,
			state_revision=COALESCE(state_revision,0)+1,
			auto_resume_expedition=$25, starter_pack_claimed=$26, starter_pack_key=$27,
			progression_version=$28, lifetime_experience=GREATEST(lifetime_experience,$29),
			highest_level_ever=GREATEST(highest_level_ever,$30,$3),
			expeditions_completed_total=GREATEST(expeditions_completed_total,$31),
			bosses_defeated_total=GREATEST(bosses_defeated_total,$32),
			expedition_deaths_total=GREATEST(expedition_deaths_total,$33),
			highest_stage_reached=GREATEST(highest_stage_reached,$34),
			last_expedition_death_stage=CASE WHEN $35 > 0 THEN $35 ELSE last_expedition_death_stage END,
			expedition_recovery_until=$36
		WHERE id=$1 AND COALESCE(state_revision,0)=$24
		  AND (level < $3 OR (level = $3 AND experience <= $4))
		RETURNING state_revision
	`
	var nextRevision int64
	if err := tx.QueryRow(queryChar, c.ID, c.Vocation, c.Level, c.Experience, c.Health, c.MaxHealth, c.Mana, c.MaxMana, c.GoldBank, c.STR, c.DEX, c.INT, c.VIT, c.UnspentPoints, masteriesJSON, skillsJSON, activeJSON, unlockedJSON, c.IsExpeditionActive, c.ActiveRegion, c.ActiveStance, c.CurrentStage, c.IsBossStage, c.StateRevision, c.AutoResumeExpedition, c.StarterPackClaimed, c.StarterPackKey, c.ProgressionVersion, c.LifetimeExperience, c.HighestLevelEver, c.ExpeditionsCompletedTotal, c.BossesDefeatedTotal, c.ExpeditionDeathsTotal, c.HighestStageReached, c.LastExpeditionDeathStage, c.ExpeditionRecoveryUntil).Scan(&nextRevision); err != nil {
		if err == sql.ErrNoRows {
			game.IncrementTelemetry("progression_conflict_total")
			return ErrProgressionConflict
		}
		return err
	}

	equipJSON, _ := json.Marshal(inv.Equipment)
	backpackJSON, _ := json.Marshal(inv.Backpack)
	queryInv := `
		INSERT INTO character_inventories (character_id, equipment, backpack, revision, updated_at)
		VALUES ($1, $2, $3, 1, NOW())
		ON CONFLICT (character_id) DO UPDATE
		SET equipment = EXCLUDED.equipment, backpack = EXCLUDED.backpack,
			revision = character_inventories.revision + 1, updated_at = NOW()
		WHERE character_inventories.revision = $4
		RETURNING revision
	`
	var nextInventoryRevision int64
	if err := tx.QueryRow(queryInv, c.ID, string(equipJSON), string(backpackJSON), inv.Revision).Scan(&nextInventoryRevision); err != nil {
		if err == sql.ErrNoRows {
			game.IncrementTelemetry("inventory_conflict_total")
			return ErrInventoryConflict
		}
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	c.StateRevision = nextRevision
	inv.Revision = nextInventoryRevision
	return nil
}

// SetCharacterOffline salva personagem, inventário e a fronteira offline na
// mesma transação. Assim, nenhum claim observa equipamento de uma versão e
// atributos/timestamps de outra.
func SetCharacterOffline(c *Character, inv *Inventory) error {
	if c == nil || inv == nil {
		return errors.New("snapshot offline incompleto")
	}
	if err := validateProgressionSnapshot(c); err != nil {
		return err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback()

	masteriesJSON, _ := json.Marshal(c.Masteries)
	skillsJSON, _ := json.Marshal(c.LearnedSkills)
	activeJSON, _ := json.Marshal(c.ActiveSkills)
	unlockedJSON, _ := json.Marshal(c.UnlockedRegions)
	query := `
		UPDATE characters
		SET vocation=$2, level=$3, experience=$4, health=$5, max_health=$6,
			mana=$7, max_mana=$8, gold_bank=$9, str=$10, dex=$11,
			int_stat=$12, vit=$13, unspent_points=$14, masteries=$15,
			learned_skills=$16, active_skills=$17, unlocked_regions=$18,
			is_expedition_active=$19, active_region=$20, active_stance=$21,
			current_stage=$22, is_boss_stage=$23,
			state_revision=COALESCE(state_revision,0)+1,
			auto_resume_expedition=$25,
			progression_version=$26,
			lifetime_experience=GREATEST(lifetime_experience,$27),
			highest_level_ever=GREATEST(highest_level_ever,$28,$3),
			expeditions_completed_total=GREATEST(expeditions_completed_total,$29),
			bosses_defeated_total=GREATEST(bosses_defeated_total,$30),
			expedition_deaths_total=GREATEST(expedition_deaths_total,$31),
			highest_stage_reached=GREATEST(highest_stage_reached,$32),
			last_expedition_death_stage=CASE WHEN $33 > 0 THEN $33 ELSE last_expedition_death_stage END,
			expedition_recovery_until=$34,
			last_logout=NOW(), offline_claimed_at=NOW()
		WHERE id=$1 AND COALESCE(state_revision,0)=$24
		  AND (level < $3 OR (level = $3 AND experience <= $4))
		RETURNING last_logout, offline_claimed_at, state_revision
	`
	var nextLogout, nextOfflineClaim time.Time
	var nextRevision int64
	if err := tx.QueryRow(query, c.ID, c.Vocation, c.Level, c.Experience, c.Health, c.MaxHealth, c.Mana, c.MaxMana, c.GoldBank, c.STR, c.DEX, c.INT, c.VIT, c.UnspentPoints, masteriesJSON, skillsJSON, activeJSON, unlockedJSON, c.IsExpeditionActive, c.ActiveRegion, c.ActiveStance, c.CurrentStage, c.IsBossStage, c.StateRevision, c.AutoResumeExpedition, c.ProgressionVersion, c.LifetimeExperience, c.HighestLevelEver, c.ExpeditionsCompletedTotal, c.BossesDefeatedTotal, c.ExpeditionDeathsTotal, c.HighestStageReached, c.LastExpeditionDeathStage, c.ExpeditionRecoveryUntil).Scan(&nextLogout, &nextOfflineClaim, &nextRevision); err != nil {
		if err == sql.ErrNoRows {
			game.IncrementTelemetry("progression_conflict_total")
			return ErrProgressionConflict
		}
		return err
	}

	equipJSON, _ := json.Marshal(inv.Equipment)
	backpackJSON, _ := json.Marshal(inv.Backpack)
	var nextInventoryRevision int64
	if err := tx.QueryRow(`
		INSERT INTO character_inventories(character_id,equipment,backpack,revision,updated_at)
		VALUES($1,$2,$3,1,NOW())
		ON CONFLICT(character_id) DO UPDATE
		SET equipment=EXCLUDED.equipment,backpack=EXCLUDED.backpack,
			revision=character_inventories.revision+1,updated_at=NOW()
		WHERE character_inventories.revision=$4
		RETURNING revision
	`, c.ID, string(equipJSON), string(backpackJSON), inv.Revision).Scan(&nextInventoryRevision); err != nil {
		if err == sql.ErrNoRows {
			game.IncrementTelemetry("inventory_conflict_total")
			return ErrInventoryConflict
		}
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	c.LastLogout = nextLogout
	c.OfflineClaimedAt = nextOfflineClaim
	c.StateRevision = nextRevision
	inv.Revision = nextInventoryRevision
	return nil
}

func SetCharacterOnline(charID string) error {
	_, err := DB.Exec(`UPDATE characters SET last_login=NOW() WHERE id=$1`, charID)
	return err
}

func RecordExpeditionLog(charID string, result game.OfflineResult) error {
	itemsJSON, _ := json.Marshal(result.ItemsFound)
	reportJSON, _ := json.Marshal(result)
	_, err := DB.Exec(`
		INSERT INTO expedition_logs
		(character_id, minutes_offline, xp_gained, gold_gained, items_found,
		 report_key, period_start, period_end, region_id, region_name,
		 level_before, level_after, kills, efficiency, state_revision, report_payload)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		ON CONFLICT (report_key) WHERE report_key IS NOT NULL DO NOTHING
	`, charID, result.MinutesOffline, result.XPGained, result.GoldGained, string(itemsJSON), result.ReportID, result.PeriodStart, result.PeriodEnd, result.RegionID, result.RegionName, result.LevelBefore, result.LevelAfter, result.Kills, result.Efficiency, result.StateRevision, string(reportJSON))
	if err != nil {
		_, _ = DB.Exec(`
			INSERT INTO expedition_logs
			(character_id, minutes_offline, xp_gained, gold_gained, items_found,
			 report_key, period_start, period_end, region_id, region_name,
			 level_before, level_after, kills, efficiency, state_revision, report_payload)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
			ON CONFLICT DO NOTHING
		`, charID, result.MinutesOffline, result.XPGained, result.GoldGained, string(itemsJSON), result.ReportID, result.PeriodStart, result.PeriodEnd, result.RegionID, result.RegionName, result.LevelBefore, result.LevelAfter, result.Kills, result.Efficiency, result.StateRevision, string(reportJSON))
	}
	return nil
}

type OfflineClaimResponse struct {
	Report    game.OfflineResult `json:"report"`
	Character *Character         `json:"character"`
	Inventory *Inventory         `json:"inventory"`
}

func characterToGame(c *Character) *game.CharacterData {
	result := &game.CharacterData{
		ID: c.ID, AccountID: c.AccountID, Name: c.Name, Vocation: c.Vocation, Origin: c.Origin,
		Level: c.Level, Experience: c.Experience, Health: c.Health, MaxHealth: c.MaxHealth,
		Mana: c.Mana, MaxMana: c.MaxMana, GoldBank: c.GoldBank, STR: c.STR, DEX: c.DEX,
		INT: c.INT, VIT: c.VIT, UnspentPoints: c.UnspentPoints, Masteries: c.Masteries,
		LearnedSkills: c.LearnedSkills, ActiveSkills: c.ActiveSkills, UnlockedRegions: c.UnlockedRegions,
		IsExpeditionActive: c.IsExpeditionActive, ActiveRegion: c.ActiveRegion, ActiveStance: c.ActiveStance,
		CurrentStage: c.CurrentStage, IsBossStage: c.IsBossStage, StateRevision: c.StateRevision,
		LastLogin: c.LastLogin, LastLogout: c.LastLogout, AutoResumeExpedition: c.AutoResumeExpedition,
		ExpeditionsCompletedTotal: c.ExpeditionsCompletedTotal, BossesDefeatedTotal: c.BossesDefeatedTotal,
		ExpeditionDeathsTotal: c.ExpeditionDeathsTotal, HighestStageReached: c.HighestStageReached,
		LastExpeditionDeathStage: c.LastExpeditionDeathStage, ExpeditionRecoveryUntil: c.ExpeditionRecoveryUntil,
		StarterPackClaimed: c.StarterPackClaimed, StarterPackKey: c.StarterPackKey,
		ProgressionVersion: c.ProgressionVersion, LifetimeExperience: c.LifetimeExperience,
		HighestLevelEver: c.HighestLevelEver,
	}
	game.RefreshProgressionView(result)
	return result
}

func inventoryToGame(inv *Inventory) *game.InventoryData {
	return &game.InventoryData{Equipment: game.EquipmentSlots(inv.Equipment), Backpack: inv.Backpack, Cap: inv.Cap, Revision: inv.Revision}
}

func scanLockedCharacter(row rowScanner) (*Character, error) {
	c := &Character{}
	var masteriesRaw, skillsRaw, activeRaw, unlockedRaw string
	var recoveryUntil sql.NullTime
	err := row.Scan(
		&c.ID, &c.AccountID, &c.Name, &c.Vocation, &c.Origin,
		&c.Level, &c.Experience, &c.Health, &c.MaxHealth, &c.Mana, &c.MaxMana,
		&c.GoldBank, &c.STR, &c.DEX, &c.INT, &c.VIT, &c.UnspentPoints,
		&masteriesRaw, &skillsRaw, &activeRaw, &unlockedRaw,
		&c.IsExpeditionActive, &c.ActiveRegion, &c.ActiveStance, &c.CurrentStage,
		&c.IsBossStage, &c.LastLogin, &c.LastLogout, &c.OfflineClaimedAt, &c.StateRevision,
		&c.AutoResumeExpedition, &c.StarterPackClaimed, &c.StarterPackKey,
		&c.ProgressionVersion, &c.LifetimeExperience, &c.HighestLevelEver,
		&c.ExpeditionsCompletedTotal, &c.BossesDefeatedTotal, &c.ExpeditionDeathsTotal,
		&c.HighestStageReached, &c.LastExpeditionDeathStage, &recoveryUntil,
	)
	if err != nil {
		return nil, err
	}
	if recoveryUntil.Valid {
		c.ExpeditionRecoveryUntil = recoveryUntil.Time
	}
	if err := json.Unmarshal([]byte(masteriesRaw), &c.Masteries); err != nil {
		return nil, fmt.Errorf("maestrias persistidas corrompidas: %w", err)
	}
	if err := json.Unmarshal([]byte(skillsRaw), &c.LearnedSkills); err != nil {
		return nil, fmt.Errorf("habilidades persistidas corrompidas: %w", err)
	}
	if err := json.Unmarshal([]byte(activeRaw), &c.ActiveSkills); err != nil {
		return nil, fmt.Errorf("habilidades ativas persistidas corrompidas: %w", err)
	}
	if err := json.Unmarshal([]byte(unlockedRaw), &c.UnlockedRegions); err != nil {
		return nil, fmt.Errorf("regiões persistidas corrompidas: %w", err)
	}
	if c.LearnedSkills == nil {
		c.LearnedSkills = []string{}
	}
	if len(c.UnlockedRegions) == 0 {
		c.UnlockedRegions = []string{}
	}
	if err := validateProgressionSnapshot(c); err != nil {
		return nil, err
	}
	return c, nil

}

const characterSnapshotColumns = `
	id, account_id, name, vocation, COALESCE(origin,'wanderer'), level,
	experience, health, max_health, mana, max_mana, gold_bank,
	COALESCE(str,5), COALESCE(dex,5), COALESCE(int_stat,5), COALESCE(vit,5),
	COALESCE(unspent_points,0), COALESCE(masteries,'{}'::jsonb),
	COALESCE(learned_skills,'[]'::jsonb), COALESCE(active_skills,'[]'::jsonb),
	COALESCE(unlocked_regions,'[]'::jsonb),
	COALESCE(is_expedition_active,false), COALESCE(active_region,'forest'),
	COALESCE(active_stance,'balanced'), COALESCE(current_stage,1),
	COALESCE(is_boss_stage,false), last_login, last_logout,
	COALESCE(offline_claimed_at,last_logout), COALESCE(state_revision,0),
	COALESCE(auto_resume_expedition,false),
	COALESCE(starter_pack_claimed,false), COALESCE(starter_pack_key,''),
	COALESCE(progression_version,0), COALESCE(lifetime_experience,experience),
	GREATEST(COALESCE(highest_level_ever,level),level),
	COALESCE(expeditions_completed_total,0), COALESCE(bosses_defeated_total,0),
	COALESCE(expedition_deaths_total,0), GREATEST(COALESCE(highest_stage_reached,1),1),
	COALESCE(last_expedition_death_stage,0), expedition_recovery_until`

// ClaimOfflineProgress é a única porta de entrada para aplicar progresso offline.
// SELECT FOR UPDATE + cursor offline_claimed_at tornam o claim idempotente e impedem
// que dois logins apliquem a mesma janela. Falhas de serialização são repetidas,
// requisito importante quando houver mais de uma instância do backend.
func ClaimOfflineProgress(accountID, charID string, now time.Time) (*OfflineClaimResponse, error) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		response, err := claimOfflineProgressOnce(accountID, charID, now)
		if err == nil {
			return response, nil
		}
		lastErr = err
		message := strings.ToLower(err.Error())
		if !strings.Contains(message, "could not serialize") && !strings.Contains(message, "sqlstate 40001") {
			return nil, err
		}
		time.Sleep(time.Duration(attempt+1) * 20 * time.Millisecond)
	}
	return nil, lastErr
}

func claimOfflineProgressOnce(accountID, charID string, now time.Time) (*OfflineClaimResponse, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	character, err := scanLockedCharacter(tx.QueryRow(`SELECT `+characterSnapshotColumns+` FROM characters WHERE id=$1 AND account_id=$2 FOR UPDATE`, charID, accountID))
	if err != nil {
		return nil, err
	}
	if leased, leaseErr := HasActiveCharacterSessionLeaseTx(tx, charID); leaseErr != nil {
		return nil, leaseErr
	} else if leased {
		return nil, fmt.Errorf("não é possível reconciliar progresso offline enquanto há uma sessão ativa")
	}
	levelBeforeClaim := character.Level
	experienceBeforeClaim := character.Experience
	inventory, err := scanInventory(tx.QueryRow(`SELECT equipment, backpack, revision FROM character_inventories WHERE character_id=$1 FOR UPDATE`, charID))
	if err != nil {
		return nil, err
	}

	start := character.OfflineClaimedAt
	if start.IsZero() || character.LastLogout.After(start) {
		start = character.LastLogout
	}
	gameChar := characterToGame(character)
	gameInv := inventoryToGame(inventory)
	autoSellSettings, _ := GetCharacterAutoSellSettings(charID)
	autoPotionSettings, _ := GetCharacterAutoPotionSettings(charID)
	autoPotionState, autoPotionStateErr := getCharacterAutoPotionStateTx(tx, charID, true)
	if autoPotionStateErr != nil {
		return nil, autoPotionStateErr
	}
	activeBuffs, err := getCharacterBuffsOverlappingTx(tx, charID, start, now)
	if err != nil {
		return nil, err
	}

	result := game.CalculateOfflineProgress(game.OfflineSimulationInput{
		Character: gameChar, Inventory: gameInv, IsExpeditionActive: character.IsExpeditionActive,
		ActiveRegion: character.ActiveRegion, ActiveStance: character.ActiveStance,
		CurrentStage: character.CurrentStage, IsBossStage: character.IsBossStage,
		PeriodStart: start, PeriodEnd: now, StateRevision: character.StateRevision,
		AutoSellSettings: autoSellSettings, AutoPotionSettings: autoPotionSettings,
		AutoPotionState: autoPotionState, ActiveBuffs: activeBuffs,
	})

	if result.MinutesOffline >= game.MinimumOfflineMinutes {
		character.Experience += result.XPGained
		character.GoldBank += result.GoldGained - result.AutoPotionGoldSpent
		character.ExpeditionsCompletedTotal += int64(result.ExpeditionsCompleted)
		character.BossesDefeatedTotal += int64(result.BossesDefeated)
		if result.HighestStageReached > character.HighestStageReached {
			character.HighestStageReached = result.HighestStageReached
		}
		character.CurrentStage = result.FinalStage
		character.IsBossStage = result.IsBossStageAfter
		if result.Defeated {
			character.ExpeditionDeathsTotal++
			character.LastExpeditionDeathStage = result.FailureStage
			stats := game.CalculateDerivedStats(gameChar, gameInv, character.ActiveStance)
			recoverySeconds := 30.0
			if stats.MaxHealth > 0 {
				recoverySeconds = math.Max(30, math.Min(180, float64(stats.MaxHealth)/(math.Max(6, 6+float64(gameChar.VIT)*0.15+float64(gameChar.Level)*0.08))))
			}
			character.ExpeditionRecoveryUntil = now.Add(time.Duration(recoverySeconds * float64(time.Second)))
			character.IsExpeditionActive = false
			character.CurrentStage = 1
			character.IsBossStage = false
		} else if !character.ExpeditionRecoveryUntil.IsZero() && !character.ExpeditionRecoveryUntil.After(now) {
			character.ExpeditionRecoveryUntil = time.Time{}
		}
		for _, unlockedID := range result.RegionsUnlocked {
			alreadyUnlocked := false
			for _, currentID := range character.UnlockedRegions {
				if currentID == unlockedID {
					alreadyUnlocked = true
					break
				}
			}
			if !alreadyUnlocked {
				character.UnlockedRegions = append(character.UnlockedRegions, unlockedID)
			}
		}
		if result.XPGained > 0 {
			game.ApplyExperienceGain(gameChar, result.XPGained)
			character.Level = gameChar.Level
			character.Experience = gameChar.Experience
			character.LifetimeExperience = gameChar.LifetimeExperience
			character.HighestLevelEver = gameChar.HighestLevelEver
			character.ProgressionVersion = gameChar.ProgressionVersion
			character.UnspentPoints = gameChar.UnspentPoints
		}
		if result.ShieldMasteryTries > 0 {
			gameChar.Masteries.ShieldMastery += result.ShieldMasteryTries
			character.Masteries = gameChar.Masteries
		}
		result.LevelAfter = character.Level
		game.EnsureUnlockedRegionsForLevel(gameChar)
		character.UnlockedRegions = gameChar.UnlockedRegions

		session := &game.GameSession{Character: gameChar, Inventory: gameInv, ActiveStance: character.ActiveStance}
		accepted := make([]game.Item, 0, len(result.ItemsFound))
		converted := make([]game.Item, 0)
		for _, item := range result.ItemsFound {
			if len(gameInv.Backpack) < session.GetMaxSlotCapacity() && session.GetTotalWeight()+item.Weight <= session.GetMaxWeightCapacity() {
				gameInv.Backpack = append(gameInv.Backpack, item)
				accepted = append(accepted, item)
			} else if game.IsOverflowProtectedItem(item, autoSellSettings) {
				result.ItemsPending = append(result.ItemsPending, item)
				game.IncrementTelemetry("inventory_overflow_total{source=offline_protected_drop}")
			} else {
				converted = append(converted, item)
				convertedValue := item.ValueGold / 2
				if convertedValue < 1 {
					convertedValue = 1
				}
				result.ConvertedGold += convertedValue
			}
		}
		for _, item := range append([]game.Item(nil), result.ItemsPending...) {
			// Itens já encaminhados acima aparecem na mesma lista. ON CONFLICT
			// garante idempotência pelo ID do item.
			if err := queuePendingItemTx(tx, charID, item, "offline_protected_drop", result.ReportID); err != nil {
				return nil, err
			}
		}
		result.ItemsFound = accepted
		result.ItemsConverted = converted
		result.GoldGained += result.ConvertedGold
		character.GoldBank += result.ConvertedGold
		inventory.Backpack = gameInv.Backpack

		// Persistir recursos e troféus coletados na mesma transação atômica
		allOfflineResources := append([]game.ResourceAmount{}, result.ResourcesFound...)
		allOfflineResources = append(allOfflineResources, result.BossTrophies...)
		if len(allOfflineResources) > 0 {
			var campCap int64 = game.DefaultBaseResourceStorage
			var whLevel int
			if err := tx.QueryRow(`SELECT level FROM character_camp_buildings WHERE character_id = $1 AND slot_key = 'east'`, charID).Scan(&whLevel); err != nil && err != sql.ErrNoRows {
				return nil, err
			}
			if whLevel > 0 {
				if bDef, ok := game.GetBuildingDefinition("warehouse"); ok && whLevel <= len(bDef.Levels) {
					for _, eff := range bDef.Levels[whLevel-1].Effects {
						if eff.Key == "resource_storage" && int64(eff.Value) > campCap {
							campCap = int64(eff.Value)
						}
					}
				}
			}
			mutRes, err := AddCharacterResourcesTx(tx, charID, allOfflineResources, campCap)
			if err != nil {
				return nil, err
			}
			if err := recordResourceLedgerTx(tx, charID, result.ReportID, "offline_monster_drop", character.ActiveRegion, mutRes.Accepted); err != nil {
				return nil, err
			}
			if err := storePendingResourcesTx(tx, charID, "offline_monster_drop", result.ReportID, mutRes.Overflow); err != nil {
				return nil, err
			}
			result.ResourcesFound = mutRes.Accepted
		}

		_, _ = session.CalculateStats()
		character.MaxHealth = gameChar.MaxHealth
		character.MaxMana = gameChar.MaxMana
		if result.Defeated {
			character.Health = result.HealthAfter
			if character.Health < 1 {
				character.Health = int(math.Max(1, math.Floor(float64(character.MaxHealth)*0.40)))
			}
			gameChar.Health = character.Health
		} else if character.Level > result.LevelBefore {
			character.Health = character.MaxHealth
			character.Mana = character.MaxMana
		} else {
			// A simulação já aplicou regeneração, dano e frascos de vida. Manter
			// o HP de logout aqui faria a expedição offline divergir do combate
			// autoritativo e tornaria a cura automática apenas aparente.
			character.Health = int(math.Max(1, math.Min(float64(character.MaxHealth), float64(result.HealthAfter))))
			if character.Mana > character.MaxMana {
				character.Mana = character.MaxMana
			}
		}
	}

	if result.MinutesOffline >= game.MinimumOfflineMinutes && autoPotionSettings.Enabled {
		updatedPotionState, err := saveCharacterAutoPotionStateTx(tx, charID, result.AutoPotionState)
		if err != nil {
			return nil, err
		}
		result.AutoPotionState = updatedPotionState
	}

	character.LastLogin = now
	character.OfflineClaimedAt = now
	// Uma aplicação offline confirmada representa uma única nova versão do
	// agregado, independentemente da quantidade de ondas simuladas.
	character.StateRevision++
	result.StateRevision = character.StateRevision
	masteriesJSON, _ := json.Marshal(character.Masteries)
	skillsJSON, _ := json.Marshal(character.LearnedSkills)
	activeJSON, _ := json.Marshal(character.ActiveSkills)
	unlockedJSON, _ := json.Marshal(character.UnlockedRegions)
	updateResult, err := tx.Exec(`UPDATE characters SET vocation=$2,level=$3,experience=$4,health=$5,max_health=$6,mana=$7,max_mana=$8,gold_bank=$9,str=$10,dex=$11,int_stat=$12,vit=$13,unspent_points=$14,masteries=$15,learned_skills=$16,active_skills=$17,unlocked_regions=$18,is_expedition_active=$19,active_region=$20,active_stance=$21,current_stage=$22,is_boss_stage=$23,state_revision=$24,auto_resume_expedition=$25,last_login=$26,offline_claimed_at=$27,progression_version=$28,lifetime_experience=GREATEST(lifetime_experience,$29),highest_level_ever=GREATEST(highest_level_ever,$30,$3),expeditions_completed_total=$31,bosses_defeated_total=$32,expedition_deaths_total=$33,highest_stage_reached=GREATEST(highest_stage_reached,$34),last_expedition_death_stage=$35,expedition_recovery_until=$36 WHERE id=$1 AND (level < $3 OR (level=$3 AND experience <= $4))`, character.ID, character.Vocation, character.Level, character.Experience, character.Health, character.MaxHealth, character.Mana, character.MaxMana, character.GoldBank, character.STR, character.DEX, character.INT, character.VIT, character.UnspentPoints, masteriesJSON, skillsJSON, activeJSON, unlockedJSON, character.IsExpeditionActive, character.ActiveRegion, character.ActiveStance, character.CurrentStage, character.IsBossStage, character.StateRevision, character.AutoResumeExpedition, now, now, character.ProgressionVersion, character.LifetimeExperience, character.HighestLevelEver, character.ExpeditionsCompletedTotal, character.BossesDefeatedTotal, character.ExpeditionDeathsTotal, character.HighestStageReached, character.LastExpeditionDeathStage, character.ExpeditionRecoveryUntil)
	if err != nil {
		return nil, err
	}
	if affected, rowsErr := updateResult.RowsAffected(); rowsErr != nil || affected != 1 {
		game.IncrementTelemetry("progression_conflict_total")
		return nil, ErrProgressionConflict
	}
	if result.XPGained > 0 {
		metadataJSON, _ := json.Marshal(map[string]any{"report_id": result.ReportID, "minutes_offline": result.MinutesOffline, "region_id": result.RegionID})
		if _, err := tx.Exec(`
			INSERT INTO character_progression_events(character_id,event_key,source_kind,source_key,level_before,level_after,experience_before,experience_after,xp_delta,state_revision,metadata)
			VALUES($1,$2,'offline_expedition',$3,$4,$5,$6,$7,$8,$9,$10)
			ON CONFLICT(character_id,event_key) DO NOTHING`, charID, "offline:"+result.ReportID, result.RegionID, levelBeforeClaim, character.Level, experienceBeforeClaim, character.Experience, result.XPGained, character.StateRevision, string(metadataJSON)); err != nil {
			if _, fallbackErr := tx.Exec(`
				INSERT INTO character_progression_events(character_id,event_key,source_kind,source_key,level_before,level_after,experience_before,experience_after,xp_delta,state_revision,metadata)
				VALUES($1,$2,'offline_expedition',$3,$4,$5,$6,$7,$8,$9,$10)
				ON CONFLICT DO NOTHING`, charID, "offline:"+result.ReportID, result.RegionID, levelBeforeClaim, character.Level, experienceBeforeClaim, character.Experience, result.XPGained, character.StateRevision, string(metadataJSON)); fallbackErr != nil {
				log.Printf("Aviso ao registrar evento de progressão: %v", fallbackErr)
			}
		}
	}

	equipJSON, _ := json.Marshal(inventory.Equipment)
	backpackJSON, _ := json.Marshal(inventory.Backpack)
	err = tx.QueryRow(`INSERT INTO character_inventories(character_id,equipment,backpack,revision,updated_at) VALUES($1,$2,$3,1,NOW()) ON CONFLICT(character_id) DO UPDATE SET equipment=EXCLUDED.equipment,backpack=EXCLUDED.backpack,revision=character_inventories.revision+1,updated_at=NOW() RETURNING revision`, charID, string(equipJSON), string(backpackJSON)).Scan(&inventory.Revision)
	if err != nil {
		return nil, err
	}

	if result.MinutesOffline >= game.MinimumOfflineMinutes {
		itemsJSON, _ := json.Marshal(result.ItemsFound)
		reportJSON, _ := json.Marshal(result)
		_, err = tx.Exec(`INSERT INTO expedition_logs(character_id,minutes_offline,xp_gained,gold_gained,items_found,report_key,period_start,period_end,region_id,region_name,level_before,level_after,kills,efficiency,state_revision,report_payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (report_key) WHERE report_key IS NOT NULL DO NOTHING`, charID, result.MinutesOffline, result.XPGained, result.GoldGained, string(itemsJSON), result.ReportID, result.PeriodStart, result.PeriodEnd, result.RegionID, result.RegionName, result.LevelBefore, result.LevelAfter, result.Kills, result.Efficiency, result.StateRevision, string(reportJSON))
		if err != nil {
			_, _ = tx.Exec(`INSERT INTO expedition_logs(character_id,minutes_offline,xp_gained,gold_gained,items_found,report_key,period_start,period_end,region_id,region_name,level_before,level_after,kills,efficiency,state_revision,report_payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING`, charID, result.MinutesOffline, result.XPGained, result.GoldGained, string(itemsJSON), result.ReportID, result.PeriodStart, result.PeriodEnd, result.RegionID, result.RegionName, result.LevelBefore, result.LevelAfter, result.Kills, result.Efficiency, result.StateRevision, string(reportJSON))
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &OfflineClaimResponse{Report: result, Character: character, Inventory: inventory}, nil
}

// GetCharacterDiscoveredLoot retorna a lista de nomes/chaves de itens descobertos pelo personagem.
func GetCharacterDiscoveredLoot(charID string) ([]string, error) {
	rows, err := DB.Query(`SELECT item_template_key, COALESCE(first_region_key, '') FROM character_loot_discoveries WHERE character_id = $1 ORDER BY first_discovered_at ASC`, charID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []string
	seen := make(map[string]bool)
	for rows.Next() {
		var key, reg string
		if err := rows.Scan(&key, &reg); err == nil {
			if reg != "" {
				rKey := reg + ":" + key
				if !seen[rKey] {
					seen[rKey] = true
					items = append(items, rKey)
				}
			}
			if !seen[key] {
				seen[key] = true
				items = append(items, key)
			}
		}
	}
	if items == nil {
		items = []string{}
	}
	return items, rows.Err()
}

// RecordLootDiscovery insere ou atualiza o registro de um item descoberto no compêndio.
// Retorna true se for a primeira vez que o personagem encontrou o item.
func RecordLootDiscovery(charID string, itemName, rarity, regionKey, monsterKey string) (bool, error) {
	if charID == "" || itemName == "" {
		return false, nil
	}
	if rarity == "" {
		rarity = "Comum"
	}
	regKey := strings.TrimSpace(regionKey)

	// Tenta primeiro atualizar o registro existente para evitar falha de ON CONFLICT em esquemas legados
	res, err := DB.Exec(`
		UPDATE character_loot_discoveries 
		SET times_found = times_found + 1, last_found_at = NOW()
		WHERE character_id = $1 AND item_template_key = $2 AND (first_region_key = $3 OR first_region_key = '' OR $3 = '')
	`, charID, itemName, regKey)

	if err == nil {
		if rows, _ := res.RowsAffected(); rows > 0 {
			return false, nil
		}
	}

	// Se não existia registro anterior, insere um novo registro de forma segura
	query := `
		INSERT INTO character_loot_discoveries (character_id, item_template_key, first_region_key, first_monster_key, highest_rarity, times_found, first_discovered_at, last_found_at)
		VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW())
		ON CONFLICT DO NOTHING
	`
	if _, insertErr := DB.Exec(query, charID, itemName, regKey, monsterKey, rarity); insertErr != nil {
		// Log suave sem derrubar o fluxo de claim da expedição
		return false, nil
	}
	return true, nil
}

// BackfillInventoryDiscoveries preserva retrocompatibilidade sem vazar itens iniciais para regiões não exploradas.
func BackfillInventoryDiscoveries(charID string, inv *Inventory) {
	// Intencionalmente mantido sem forçar descobertas de regiões selvagens para itens iniciais do jogador
}

// GetCharacterAutoSellSettings obtém as configurações de venda automática do personagem.
func GetCharacterAutoSellSettings(charID string) (game.AutoSellSettings, error) {
	query := `
		SELECT enabled, online_enabled, offline_enabled, trigger_percent, target_percent,
		       sell_rarities, sell_slot_types, only_duplicates, keep_first_discovered_copy,
		       keep_best_per_template, protected_template_keys, sell_crafted_items, revision
		FROM character_auto_sell_settings
		WHERE character_id = $1
	`
	var s game.AutoSellSettings
	var raritiesJSON, slotsJSON, protectedJSON []byte

	err := DB.QueryRow(query, charID).Scan(
		&s.Enabled, &s.OnlineEnabled, &s.OfflineEnabled, &s.TriggerPercent, &s.TargetPercent,
		&raritiesJSON, &slotsJSON, &s.OnlyDuplicates, &s.KeepFirstDiscoveredCopy,
		&s.KeepBestPerTemplate, &protectedJSON, &s.SellCraftedItems, &s.Revision,
	)
	if err == sql.ErrNoRows {
		return game.DefaultAutoSellSettings(), nil
	}
	if err != nil {
		return game.DefaultAutoSellSettings(), err
	}

	if err := json.Unmarshal(raritiesJSON, &s.SellRarities); err != nil {
		return game.DefaultAutoSellSettings(), fmt.Errorf("raridades da venda automática corrompidas: %w", err)
	}
	if err := json.Unmarshal(slotsJSON, &s.SellSlotTypes); err != nil {
		return game.DefaultAutoSellSettings(), fmt.Errorf("slots da venda automática corrompidos: %w", err)
	}
	if err := json.Unmarshal(protectedJSON, &s.ProtectedTemplateKeys); err != nil {
		return game.DefaultAutoSellSettings(), fmt.Errorf("proteções da venda automática corrompidas: %w", err)
	}
	return s, nil
}

// SaveCharacterAutoSellSettings persiste as configurações de auto-venda do personagem.
func SaveCharacterAutoSellSettings(charID string, s game.AutoSellSettings) error {
	raritiesJSON, _ := json.Marshal(s.SellRarities)
	slotsJSON, _ := json.Marshal(s.SellSlotTypes)
	protectedJSON, _ := json.Marshal(s.ProtectedTemplateKeys)

	query := `
		INSERT INTO character_auto_sell_settings (
			character_id, enabled, online_enabled, offline_enabled, trigger_percent, target_percent,
			sell_rarities, sell_slot_types, only_duplicates, keep_first_discovered_copy,
			keep_best_per_template, protected_template_keys, sell_crafted_items, revision, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
		ON CONFLICT (character_id) DO UPDATE SET
			enabled = EXCLUDED.enabled,
			online_enabled = EXCLUDED.online_enabled,
			offline_enabled = EXCLUDED.offline_enabled,
			trigger_percent = EXCLUDED.trigger_percent,
			target_percent = EXCLUDED.target_percent,
			sell_rarities = EXCLUDED.sell_rarities,
			sell_slot_types = EXCLUDED.sell_slot_types,
			only_duplicates = EXCLUDED.only_duplicates,
			keep_first_discovered_copy = EXCLUDED.keep_first_discovered_copy,
			keep_best_per_template = EXCLUDED.keep_best_per_template,
			protected_template_keys = EXCLUDED.protected_template_keys,
			sell_crafted_items = EXCLUDED.sell_crafted_items,
			revision = character_auto_sell_settings.revision + 1,
			updated_at = NOW()
	`
	_, err := DB.Exec(query, charID, s.Enabled, s.OnlineEnabled, s.OfflineEnabled, s.TriggerPercent, s.TargetPercent, string(raritiesJSON), string(slotsJSON), s.OnlyDuplicates, s.KeepFirstDiscoveredCopy, s.KeepBestPerTemplate, string(protectedJSON), s.SellCraftedItems, s.Revision)
	return err
}

// GetCharacterAutoPotionSettings recupera a preferência persistente de
// suprimentos de emergência. A ausência da linha é compatível com personagens
// anteriores à feature e retorna a configuração desligada.
func GetCharacterAutoPotionSettings(charID string) (game.AutoPotionSettings, error) {
	var settings game.AutoPotionSettings
	err := DB.QueryRow(`
		SELECT enabled, health_threshold_percent, mana_threshold_percent,
		       max_gold_per_expedition, revision
		FROM character_auto_potion_settings
		WHERE character_id=$1
	`, charID).Scan(
		&settings.Enabled,
		&settings.HealthThresholdPercent,
		&settings.ManaThresholdPercent,
		&settings.MaxGoldPerExpedition,
		&settings.Revision,
	)
	if err == sql.ErrNoRows {
		return game.DefaultAutoPotionSettings(), nil
	}
	if err != nil {
		return game.DefaultAutoPotionSettings(), err
	}
	return game.NormalizeAutoPotionSettings(settings), nil
}

// SaveCharacterAutoPotionSettings atualiza somente preferências; o ouro e o
// orçamento de uma expedição são tratados em transações separadas.
func SaveCharacterAutoPotionSettings(charID string, settings game.AutoPotionSettings) error {
	settings = game.NormalizeAutoPotionSettings(settings)
	_, err := DB.Exec(`
		INSERT INTO character_auto_potion_settings(
			character_id, enabled, health_threshold_percent, mana_threshold_percent,
			max_gold_per_expedition, revision, updated_at
		) VALUES($1,$2,$3,$4,$5,1,NOW())
		ON CONFLICT(character_id) DO UPDATE SET
			enabled=EXCLUDED.enabled,
			health_threshold_percent=EXCLUDED.health_threshold_percent,
			mana_threshold_percent=EXCLUDED.mana_threshold_percent,
			max_gold_per_expedition=EXCLUDED.max_gold_per_expedition,
			revision=character_auto_potion_settings.revision+1,
			updated_at=NOW()
	`, charID, settings.Enabled, settings.HealthThresholdPercent, settings.ManaThresholdPercent, settings.MaxGoldPerExpedition)
	return err
}

func scanAutoPotionState(row *sql.Row) (game.AutoPotionState, error) {
	state := game.DefaultAutoPotionState()
	var healthCooldown, manaCooldown sql.NullTime
	err := row.Scan(&state.GoldSpent, &healthCooldown, &manaCooldown, &state.BudgetExhausted, &state.Revision)
	if err != nil {
		return state, err
	}
	if healthCooldown.Valid {
		state.HealthCooldownUntil = healthCooldown.Time.UTC()
	}
	if manaCooldown.Valid {
		state.ManaCooldownUntil = manaCooldown.Time.UTC()
	}
	return state, nil
}

func getCharacterAutoPotionStateTx(tx *sql.Tx, charID string, forUpdate bool) (game.AutoPotionState, error) {
	query := `SELECT gold_spent, health_cooldown_until, mana_cooldown_until, budget_exhausted, revision FROM character_auto_potion_state WHERE character_id=$1`
	if forUpdate {
		query += ` FOR UPDATE`
	}
	state, err := scanAutoPotionState(tx.QueryRow(query, charID))
	if err == sql.ErrNoRows {
		return game.DefaultAutoPotionState(), nil
	}
	return state, err
}

// GetCharacterAutoPotionState recupera o orçamento da caçada que está em
// andamento. A linha pode não existir em personagens que nunca ativaram a
// função.
func GetCharacterAutoPotionState(charID string) (game.AutoPotionState, error) {
	state, err := scanAutoPotionState(DB.QueryRow(`
		SELECT gold_spent, health_cooldown_until, mana_cooldown_until, budget_exhausted, revision
		FROM character_auto_potion_state WHERE character_id=$1
	`, charID))
	if err == sql.ErrNoRows {
		return game.DefaultAutoPotionState(), nil
	}
	return state, err
}

func saveCharacterAutoPotionStateTx(tx *sql.Tx, charID string, state game.AutoPotionState) (game.AutoPotionState, error) {
	var revision int64
	err := tx.QueryRow(`
		INSERT INTO character_auto_potion_state(
			character_id, gold_spent, health_cooldown_until, mana_cooldown_until,
			budget_exhausted, revision, updated_at
		) VALUES($1,$2,$3,$4,$5,1,NOW())
		ON CONFLICT(character_id) DO UPDATE SET
			gold_spent=EXCLUDED.gold_spent,
			health_cooldown_until=EXCLUDED.health_cooldown_until,
			mana_cooldown_until=EXCLUDED.mana_cooldown_until,
			budget_exhausted=EXCLUDED.budget_exhausted,
			revision=character_auto_potion_state.revision+1,
			updated_at=NOW()
		RETURNING revision
	`, charID, state.GoldSpent, nullableTime(state.HealthCooldownUntil), nullableTime(state.ManaCooldownUntil), state.BudgetExhausted).Scan(&revision)
	if err != nil {
		return state, err
	}
	state.Revision = revision
	return state, nil
}

func nullableTime(value time.Time) interface{} {
	if value.IsZero() {
		return nil
	}
	return value.UTC()
}

// SaveCharacterAutoPotionState é usado após a simulação offline, que já
// calculou de forma determinística o estado final da expedição.
func SaveCharacterAutoPotionState(charID string, state game.AutoPotionState) (game.AutoPotionState, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return state, err
	}
	defer tx.Rollback()
	updated, err := saveCharacterAutoPotionStateTx(tx, charID, state)
	if err != nil {
		return state, err
	}
	if err := tx.Commit(); err != nil {
		return state, err
	}
	return updated, nil
}

// ResetCharacterAutoPotionState começa um novo orçamento quando o jogador
// inicia explicitamente outra expedição. Reconexões nunca chamam esta função.
func ResetCharacterAutoPotionState(charID string) (game.AutoPotionState, error) {
	return SaveCharacterAutoPotionState(charID, game.DefaultAutoPotionState())
}

// SpendCharacterAutoPotion debita ouro e avança o orçamento em uma única
// transação. Assim uma queda de conexão não pode conceder cura sem cobrança.
func SpendCharacterAutoPotion(charID string, settings game.AutoPotionSettings, kind string, now time.Time) (game.AutoPotionSpendResult, error) {
	result := game.AutoPotionSpendResult{PotionKey: kind}
	settings = game.NormalizeAutoPotionSettings(settings)
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return result, err
	}
	defer tx.Rollback()

	state, err := getCharacterAutoPotionStateTx(tx, charID, true)
	if err != nil {
		return result, err
	}
	var goldBank, characterRevision int64
	if err := tx.QueryRow(`SELECT gold_bank,state_revision FROM characters WHERE id=$1 FOR UPDATE`, charID).Scan(&goldBank, &characterRevision); err != nil {
		return result, err
	}

	result.Reason = game.CanSpendAutoPotion(settings, state, kind, goldBank, now.UTC())
	if result.Reason != "" {
		if result.Reason == "budget_exhausted" && !state.BudgetExhausted {
			state.BudgetExhausted = true
			state, err = saveCharacterAutoPotionStateTx(tx, charID, state)
			if err != nil {
				return result, err
			}
		}
		result.GoldBank = goldBank
		result.CharacterRevision = characterRevision
		result.State = state
		if err := tx.Commit(); err != nil {
			return result, err
		}
		return result, nil
	}

	cost := game.AutoPotionCost(kind)
	if err := tx.QueryRow(`UPDATE characters SET gold_bank=gold_bank-$2,state_revision=state_revision+1 WHERE id=$1 RETURNING state_revision`, charID, cost).Scan(&characterRevision); err != nil {
		return result, err
	}
	state = game.ApplyAutoPotionSpend(state, kind, now.UTC())
	state, err = saveCharacterAutoPotionStateTx(tx, charID, state)
	if err != nil {
		return result, err
	}
	if err := tx.Commit(); err != nil {
		return result, err
	}
	result.Applied = true
	result.GoldBank = goldBank - cost
	result.GoldDelta = -cost
	result.CharacterRevision = characterRevision
	result.State = state
	return result, nil
}

// GetCharacterOverflowChest obtém a lista de itens protegidos no Baú de Achados (overflow de 20 slots).
func GetCharacterOverflowChest(charID string) ([]game.Item, error) {
	var itemsJSON []byte
	err := DB.QueryRow(`SELECT items FROM character_overflow_chests WHERE character_id = $1`, charID).Scan(&itemsJSON)
	if err == sql.ErrNoRows {
		return []game.Item{}, nil
	}
	if err != nil {
		return []game.Item{}, err
	}
	var items []game.Item
	if err := json.Unmarshal(itemsJSON, &items); err != nil {
		return []game.Item{}, err
	}
	return items, nil
}

// SaveCharacterOverflowChest salva o estado do Baú de Achados.
func SaveCharacterOverflowChest(charID string, items []game.Item) error {
	if items == nil {
		items = []game.Item{}
	}
	itemsJSON, _ := json.Marshal(items)
	query := `
		INSERT INTO character_overflow_chests (character_id, items, max_slots, updated_at)
		VALUES ($1, $2, 20, NOW())
		ON CONFLICT (character_id) DO UPDATE SET
			items = EXCLUDED.items,
			updated_at = NOW()
	`
	_, err := DB.Exec(query, charID, string(itemsJSON))
	return err
}

// AddOverflowChestItem adiciona um item protegido ao Baú de Achados caso haja espaço (máx 20 slots).
func AddOverflowChestItem(charID string, item game.Item) (bool, error) {
	currentItems, err := GetCharacterOverflowChest(charID)
	if err != nil {
		return false, err
	}
	if len(currentItems) >= 20 {
		return false, nil // Baú cheio
	}
	currentItems = append(currentItems, item)
	err = SaveCharacterOverflowChest(charID, currentItems)
	return err == nil, err
}
