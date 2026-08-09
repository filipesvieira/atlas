package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
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
	ID                 string             `json:"id"`
	AccountID          string             `json:"account_id"`
	Name               string             `json:"name"`
	Vocation           string             `json:"vocation"`
	Origin             string             `json:"origin"`
	Level              int                `json:"level"`
	Experience         int64              `json:"experience"`
	Health             int                `json:"health"`
	MaxHealth          int                `json:"max_health"`
	Mana               int                `json:"mana"`
	MaxMana            int                `json:"max_mana"`
	GoldBank           int64              `json:"gold_bank"`
	STR                int                `json:"str"`
	DEX                int                `json:"dex"`
	INT                int                `json:"int_stat"`
	VIT                int                `json:"vit"`
	UnspentPoints      int                `json:"unspent_points"`
	Masteries          game.MasteriesData `json:"masteries"`
	LearnedSkills      []string           `json:"learned_skills"`
	ActiveSkills       []string           `json:"active_skills"`
	UnlockedRegions    []string           `json:"unlocked_regions"`
	IsExpeditionActive bool               `json:"is_expedition_active"`
	ActiveRegion       string             `json:"active_region"`
	LastLogin          time.Time          `json:"last_login"`
	LastLogout         time.Time          `json:"last_logout"`
	OfflineClaimedAt   time.Time          `json:"offline_claimed_at"`
	ActiveStance       string             `json:"active_stance"`
	CurrentStage       int                `json:"current_stage"`
	IsBossStage        bool               `json:"is_boss_stage"`
	StateRevision      int64              `json:"state_revision"`
	AutoResumeExpedition bool             `json:"auto_resume_expedition"`
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
}

var DB *sql.DB

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
		log.Printf("Aviso: Banco de dados indisponível no ping imediato: %v", err)
	}

	// Migrations dinâmicas
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS origin VARCHAR(30) DEFAULT 'wanderer';`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS masteries JSONB DEFAULT '{}'::jsonb;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS learned_skills JSONB DEFAULT '[]'::jsonb;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_skills JSONB DEFAULT '[]'::jsonb;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS unlocked_regions JSONB DEFAULT '["forest", "shereque", "chapolin"]'::jsonb;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_expedition_active BOOLEAN DEFAULT false;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_region VARCHAR(50) DEFAULT 'forest';`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS str INT DEFAULT 5;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS dex INT DEFAULT 5;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS int_stat INT DEFAULT 5;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS vit INT DEFAULT 5;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS unspent_points INT DEFAULT 0;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_stance VARCHAR(20) DEFAULT 'balanced';`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS current_stage INT DEFAULT 1;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_boss_stage BOOLEAN DEFAULT false;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS auto_resume_expedition BOOLEAN NOT NULL DEFAULT false;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS offline_claimed_at TIMESTAMP WITH TIME ZONE;`)
	_, _ = DB.Exec(`ALTER TABLE characters ADD COLUMN IF NOT EXISTS state_revision BIGINT DEFAULT 0;`)
	// O last_logout legado era contaminado por saves comuns; usar NOW() evita
	// reapresentar janelas históricas incorretas na primeira implantação.
	_, _ = DB.Exec(`UPDATE characters SET offline_claimed_at=NOW() WHERE offline_claimed_at IS NULL;`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS report_key VARCHAR(64);`)
	_, _ = DB.Exec(`DROP INDEX IF EXISTS expedition_logs_report_key_uidx;`)
	_, _ = DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS expedition_logs_report_key_uidx ON expedition_logs(report_key);`)
	_, _ = DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS character_inventories_character_id_uidx ON character_inventories(character_id);`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS period_start TIMESTAMP WITH TIME ZONE;`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS period_end TIMESTAMP WITH TIME ZONE;`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS region_id VARCHAR(50);`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS region_name VARCHAR(120);`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS level_before INT;`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS level_after INT;`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS kills INT DEFAULT 0;`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS efficiency DOUBLE PRECISION DEFAULT 0;`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS state_revision BIGINT DEFAULT 0;`)
	_, _ = DB.Exec(`ALTER TABLE expedition_logs ADD COLUMN IF NOT EXISTS report_payload JSONB DEFAULT '{}'::jsonb;`)
	_, _ = DB.Exec(`ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_vocation_check;`)

	BootstrapStaticData(DB)
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
	query := `
		INSERT INTO characters (account_id, name, vocation, origin, level, experience, health, max_health, mana, max_mana, gold_bank, str, dex, int_stat, vit, unspent_points, masteries, learned_skills, active_skills)
		VALUES ($1, $2, $3, $4, 1, 0, 225, 225, 115, 115, 100, 5, 5, 5, 5, 0, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb)
		RETURNING id, account_id, name, vocation, origin, level, experience, health, max_health, mana, max_mana, gold_bank, COALESCE(str, 5), COALESCE(dex, 5), COALESCE(int_stat, 5), COALESCE(vit, 5), COALESCE(unspent_points, 0), COALESCE(masteries, '{}'::jsonb), COALESCE(learned_skills, '[]'::jsonb), COALESCE(active_skills, '[]'::jsonb), last_login, last_logout
	`
	char := &Character{}
	var masteriesRaw, skillsRaw, activeRaw string
	err := DB.QueryRow(query, accountID, name, vocation, origin).Scan(
		&char.ID, &char.AccountID, &char.Name, &char.Vocation, &char.Origin,
		&char.Level, &char.Experience, &char.Health, &char.MaxHealth,
		&char.Mana, &char.MaxMana, &char.GoldBank, &char.STR, &char.DEX, &char.INT, &char.VIT, &char.UnspentPoints,
		&masteriesRaw, &skillsRaw, &activeRaw, &char.LastLogin, &char.LastLogout,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(masteriesRaw), &char.Masteries)
	_ = json.Unmarshal([]byte(skillsRaw), &char.LearnedSkills)
	_ = json.Unmarshal([]byte(activeRaw), &char.ActiveSkills)

	// Todos os starters vêm dos mesmos templates usados pelo loot.
	defaultEquip := EquipmentSlots{}
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	starterSword := game.GenerateItemFromTemplate("Espada do Aprendiz", "Comum", rng)
	starterShield := game.GenerateItemFromTemplate("Broquel de Madeira", "Comum", rng)
	defaultBackpack := []game.Item{}
	if starterSword != nil {
		starterSword.SpecialEffect = "Arma Inicial"
		defaultBackpack = append(defaultBackpack, *starterSword)
	}
	if starterShield != nil {
		starterShield.SpecialEffect = "Escudo Inicial"
		defaultBackpack = append(defaultBackpack, *starterShield)
	}

	equipJSON, _ := json.Marshal(defaultEquip)
	backpackJSON, _ := json.Marshal(defaultBackpack)

	invQuery := `INSERT INTO character_inventories (character_id, equipment, backpack) VALUES ($1, $2, $3)`
	_, _ = DB.Exec(invQuery, char.ID, string(equipJSON), string(backpackJSON))

	return char, nil
}

func GetCharactersByAccountID(accountID string) ([]*Character, error) {
	rows, err := DB.Query(`SELECT `+characterSnapshotColumns+` FROM characters WHERE account_id=$1`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var characters []*Character
	for rows.Next() {
		c, err := scanLockedCharacter(rows)
		if err != nil {
			return nil, err
		}
		characters = append(characters, c)
	}
	return characters, rows.Err()
}

func GetCharacterByID(id string) (*Character, error) {
	return scanLockedCharacter(DB.QueryRow(`SELECT `+characterSnapshotColumns+` FROM characters WHERE id=$1`, id))
}

func GetCharacterInventory(charID string) (*Inventory, error) {
	query := `SELECT equipment, backpack FROM character_inventories WHERE character_id = $1`
	return scanInventory(DB.QueryRow(query, charID))
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanInventory(row rowScanner) (*Inventory, error) {
	var equipRaw, backpackRaw string
	err := row.Scan(&equipRaw, &backpackRaw)
	inv := &Inventory{Equipment: EquipmentSlots{}, Backpack: []game.Item{}, Cap: 1500}
	if err != nil {
		if err == sql.ErrNoRows {
			return inv, nil
		}
		return nil, err
	}
	_ = json.Unmarshal([]byte(equipRaw), &inv.Equipment)
	_ = json.Unmarshal([]byte(backpackRaw), &inv.Backpack)
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
	equipJSON, _ := json.Marshal(inv.Equipment)
	backpackJSON, _ := json.Marshal(inv.Backpack)
	query := `
		INSERT INTO character_inventories (character_id, equipment, backpack, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (character_id) DO UPDATE
		SET equipment = EXCLUDED.equipment, backpack = EXCLUDED.backpack, updated_at = NOW()
	`
	_, err := DB.Exec(query, charID, string(equipJSON), string(backpackJSON))
	return err
}

// UpdateCharacterState salva o estado vivo, mas deliberadamente NÃO altera
// last_logout/offline_claimed_at. Timestamps offline só mudam em transições de conexão.
func UpdateCharacterState(c *Character) error {
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
			current_stage=$22, is_boss_stage=$23, state_revision=$24,
			auto_resume_expedition=$25
		WHERE id=$1
	`
	_, err := DB.Exec(query, c.ID, c.Vocation, c.Level, c.Experience, c.Health, c.MaxHealth, c.Mana, c.MaxMana, c.GoldBank, c.STR, c.DEX, c.INT, c.VIT, c.UnspentPoints, masteriesJSON, skillsJSON, activeJSON, unlockedJSON, c.IsExpeditionActive, c.ActiveRegion, c.ActiveStance, c.CurrentStage, c.IsBossStage, c.StateRevision, c.AutoResumeExpedition)
	return err
}

// SetCharacterOffline salva personagem, inventário e a fronteira offline na
// mesma transação. Assim, nenhum claim observa equipamento de uma versão e
// atributos/timestamps de outra.
func SetCharacterOffline(c *Character, inv *Inventory) error {
	if c == nil || inv == nil {
		return errors.New("snapshot offline incompleto")
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
			state_revision=GREATEST(COALESCE(state_revision,0),$24)+1,
			auto_resume_expedition=$25,
			last_logout=NOW(), offline_claimed_at=NOW()
		WHERE id=$1
		RETURNING last_logout, offline_claimed_at, state_revision
	`
	if err := tx.QueryRow(query, c.ID, c.Vocation, c.Level, c.Experience, c.Health, c.MaxHealth, c.Mana, c.MaxMana, c.GoldBank, c.STR, c.DEX, c.INT, c.VIT, c.UnspentPoints, masteriesJSON, skillsJSON, activeJSON, unlockedJSON, c.IsExpeditionActive, c.ActiveRegion, c.ActiveStance, c.CurrentStage, c.IsBossStage, c.StateRevision, c.AutoResumeExpedition).Scan(&c.LastLogout, &c.OfflineClaimedAt, &c.StateRevision); err != nil {
		return err
	}

	equipJSON, _ := json.Marshal(inv.Equipment)
	backpackJSON, _ := json.Marshal(inv.Backpack)
	if _, err := tx.Exec(`
		INSERT INTO character_inventories(character_id,equipment,backpack,updated_at)
		VALUES($1,$2,$3,NOW())
		ON CONFLICT(character_id) DO UPDATE
		SET equipment=EXCLUDED.equipment,backpack=EXCLUDED.backpack,updated_at=NOW()
	`, c.ID, string(equipJSON), string(backpackJSON)); err != nil {
		return err
	}
	return tx.Commit()
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
		ON CONFLICT (report_key) DO NOTHING
	`, charID, result.MinutesOffline, result.XPGained, result.GoldGained, string(itemsJSON), result.ReportID, result.PeriodStart, result.PeriodEnd, result.RegionID, result.RegionName, result.LevelBefore, result.LevelAfter, result.Kills, result.Efficiency, result.StateRevision, string(reportJSON))
	return err
}

type OfflineClaimResponse struct {
	Report    game.OfflineResult `json:"report"`
	Character *Character         `json:"character"`
	Inventory *Inventory         `json:"inventory"`
}

func characterToGame(c *Character) *game.CharacterData {
	return &game.CharacterData{
		ID: c.ID, AccountID: c.AccountID, Name: c.Name, Vocation: c.Vocation, Origin: c.Origin,
		Level: c.Level, Experience: c.Experience, Health: c.Health, MaxHealth: c.MaxHealth,
		Mana: c.Mana, MaxMana: c.MaxMana, GoldBank: c.GoldBank, STR: c.STR, DEX: c.DEX,
		INT: c.INT, VIT: c.VIT, UnspentPoints: c.UnspentPoints, Masteries: c.Masteries,
		LearnedSkills: c.LearnedSkills, ActiveSkills: c.ActiveSkills, UnlockedRegions: c.UnlockedRegions,
		IsExpeditionActive: c.IsExpeditionActive, ActiveRegion: c.ActiveRegion, ActiveStance: c.ActiveStance,
		CurrentStage: c.CurrentStage, IsBossStage: c.IsBossStage, StateRevision: c.StateRevision,
		LastLogin: c.LastLogin, LastLogout: c.LastLogout, AutoResumeExpedition: c.AutoResumeExpedition,
	}
}

func inventoryToGame(inv *Inventory) *game.InventoryData {
	return &game.InventoryData{Equipment: game.EquipmentSlots(inv.Equipment), Backpack: inv.Backpack, Cap: inv.Cap}
}

func scanLockedCharacter(row rowScanner) (*Character, error) {
	c := &Character{}
	var masteriesRaw, skillsRaw, activeRaw, unlockedRaw string
	err := row.Scan(
		&c.ID, &c.AccountID, &c.Name, &c.Vocation, &c.Origin,
		&c.Level, &c.Experience, &c.Health, &c.MaxHealth, &c.Mana, &c.MaxMana,
		&c.GoldBank, &c.STR, &c.DEX, &c.INT, &c.VIT, &c.UnspentPoints,
		&masteriesRaw, &skillsRaw, &activeRaw, &unlockedRaw,
		&c.IsExpeditionActive, &c.ActiveRegion, &c.ActiveStance, &c.CurrentStage,
		&c.IsBossStage, &c.LastLogin, &c.LastLogout, &c.OfflineClaimedAt, &c.StateRevision,
		&c.AutoResumeExpedition,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(masteriesRaw), &c.Masteries)
	_ = json.Unmarshal([]byte(skillsRaw), &c.LearnedSkills)
	_ = json.Unmarshal([]byte(activeRaw), &c.ActiveSkills)
	_ = json.Unmarshal([]byte(unlockedRaw), &c.UnlockedRegions)
	if c.LearnedSkills == nil {
		c.LearnedSkills = []string{}
	}
	if len(c.UnlockedRegions) == 0 {
		c.UnlockedRegions = []string{"forest", "shereque", "chapolin"}
	}
	return c, nil
}

const characterSnapshotColumns = `
	id, account_id, name, vocation, COALESCE(origin,'wanderer'), level,
	experience, health, max_health, mana, max_mana, gold_bank,
	COALESCE(str,5), COALESCE(dex,5), COALESCE(int_stat,5), COALESCE(vit,5),
	COALESCE(unspent_points,0), COALESCE(masteries,'{}'::jsonb),
	COALESCE(learned_skills,'[]'::jsonb), COALESCE(active_skills,'[]'::jsonb),
	COALESCE(unlocked_regions,'["forest","shereque","chapolin"]'::jsonb),
	COALESCE(is_expedition_active,false), COALESCE(active_region,'forest'),
	COALESCE(active_stance,'balanced'), COALESCE(current_stage,1),
	COALESCE(is_boss_stage,false), last_login, last_logout,
	COALESCE(offline_claimed_at,last_logout), COALESCE(state_revision,0),
	COALESCE(auto_resume_expedition,false)`

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
	inventory, err := scanInventory(tx.QueryRow(`SELECT equipment, backpack FROM character_inventories WHERE character_id=$1 FOR UPDATE`, charID))
	if err != nil {
		return nil, err
	}

	start := character.OfflineClaimedAt
	if start.IsZero() || character.LastLogout.After(start) {
		start = character.LastLogout
	}
	gameChar := characterToGame(character)
	gameInv := inventoryToGame(inventory)
	result := game.CalculateOfflineProgress(game.OfflineSimulationInput{
		Character: gameChar, Inventory: gameInv, IsExpeditionActive: character.IsExpeditionActive,
		ActiveRegion: character.ActiveRegion, ActiveStance: character.ActiveStance,
		CurrentStage: character.CurrentStage, IsBossStage: character.IsBossStage,
		PeriodStart: start, PeriodEnd: now, StateRevision: character.StateRevision,
	})

	if result.MinutesOffline >= game.MinimumOfflineMinutes {
		character.Experience += result.XPGained
		character.GoldBank += result.GoldGained
		character.CurrentStage = result.FinalStage
		character.IsBossStage = result.IsBossStageAfter
		if result.WavesCompleted > 0 {
			character.StateRevision += int64(result.WavesCompleted)
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
		for character.Experience >= game.GetRequiredXPForLevel(character.Level) {
			character.Level++
			character.UnspentPoints += 3
		}
		result.LevelAfter = character.Level
		gameChar.Level = character.Level
		gameChar.Experience = character.Experience
		gameChar.UnspentPoints = character.UnspentPoints
		game.EnsureUnlockedRegionsForLevel(gameChar)
		character.UnlockedRegions = gameChar.UnlockedRegions

		session := &game.GameSession{Character: gameChar, Inventory: gameInv, ActiveStance: character.ActiveStance}
		accepted := make([]game.Item, 0, len(result.ItemsFound))
		converted := make([]game.Item, 0)
		for _, item := range result.ItemsFound {
			if len(gameInv.Backpack) < session.GetMaxSlotCapacity() && session.GetTotalWeight()+item.Weight <= session.GetMaxWeightCapacity() {
				gameInv.Backpack = append(gameInv.Backpack, item)
				accepted = append(accepted, item)
			} else {
				converted = append(converted, item)
				convertedValue := item.ValueGold / 2
				if convertedValue < 1 {
					convertedValue = 1
				}
				result.ConvertedGold += convertedValue
			}
		}
		result.ItemsFound = accepted
		result.ItemsConverted = converted
		result.GoldGained += result.ConvertedGold
		character.GoldBank += result.ConvertedGold
		inventory.Backpack = gameInv.Backpack

		_, _ = session.CalculateStats()
		character.MaxHealth = gameChar.MaxHealth
		character.MaxMana = gameChar.MaxMana
		if character.Level > result.LevelBefore {
			character.Health = character.MaxHealth
			character.Mana = character.MaxMana
		} else {
			if character.Health > character.MaxHealth {
				character.Health = character.MaxHealth
			}
			if character.Mana > character.MaxMana {
				character.Mana = character.MaxMana
			}
		}
	}

	character.LastLogin = now
	character.OfflineClaimedAt = now
	masteriesJSON, _ := json.Marshal(character.Masteries)
	skillsJSON, _ := json.Marshal(character.LearnedSkills)
	activeJSON, _ := json.Marshal(character.ActiveSkills)
	unlockedJSON, _ := json.Marshal(character.UnlockedRegions)
	_, err = tx.Exec(`UPDATE characters SET vocation=$2,level=$3,experience=$4,health=$5,max_health=$6,mana=$7,max_mana=$8,gold_bank=$9,str=$10,dex=$11,int_stat=$12,vit=$13,unspent_points=$14,masteries=$15,learned_skills=$16,active_skills=$17,unlocked_regions=$18,is_expedition_active=$19,active_region=$20,active_stance=$21,current_stage=$22,is_boss_stage=$23,state_revision=$24,auto_resume_expedition=$25,last_login=$26,offline_claimed_at=$27 WHERE id=$1`, character.ID, character.Vocation, character.Level, character.Experience, character.Health, character.MaxHealth, character.Mana, character.MaxMana, character.GoldBank, character.STR, character.DEX, character.INT, character.VIT, character.UnspentPoints, masteriesJSON, skillsJSON, activeJSON, unlockedJSON, character.IsExpeditionActive, character.ActiveRegion, character.ActiveStance, character.CurrentStage, character.IsBossStage, character.StateRevision, character.AutoResumeExpedition, now, now)
	if err != nil {
		return nil, err
	}

	equipJSON, _ := json.Marshal(inventory.Equipment)
	backpackJSON, _ := json.Marshal(inventory.Backpack)
	_, err = tx.Exec(`INSERT INTO character_inventories(character_id,equipment,backpack,updated_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(character_id) DO UPDATE SET equipment=EXCLUDED.equipment,backpack=EXCLUDED.backpack,updated_at=NOW()`, charID, string(equipJSON), string(backpackJSON))
	if err != nil {
		return nil, err
	}

	if result.MinutesOffline >= game.MinimumOfflineMinutes {
		itemsJSON, _ := json.Marshal(result.ItemsFound)
		reportJSON, _ := json.Marshal(result)
		_, err = tx.Exec(`INSERT INTO expedition_logs(character_id,minutes_offline,xp_gained,gold_gained,items_found,report_key,period_start,period_end,region_id,region_name,level_before,level_after,kills,efficiency,state_revision,report_payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT(report_key) DO NOTHING`, charID, result.MinutesOffline, result.XPGained, result.GoldGained, string(itemsJSON), result.ReportID, result.PeriodStart, result.PeriodEnd, result.RegionID, result.RegionName, result.LevelBefore, result.LevelAfter, result.Kills, result.Efficiency, result.StateRevision, string(reportJSON))
		if err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &OfflineClaimResponse{Report: result, Character: character, Inventory: inventory}, nil
}
