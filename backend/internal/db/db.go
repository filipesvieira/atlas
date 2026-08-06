package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
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

	// Cria o inventário padrão Tibia
	defaultEquip := EquipmentSlots{}
	defaultBackpack := []game.Item{
		{
			ID:            "starter_sword",
			Name:          "Espada do Aprendiz",
			Attack:        12,
			PhysicalAttack: 12,
			MagicAttack:    0,
			Hands:          1,
			ValueGold:      10,
			Defense:       4,
			Rarity:        "Comum",
			SpecialEffect: "Arma Inicial",
		},
		{
			ID:            "starter_shield",
			Name:          "Escudo de Madeira",
			Attack:        0,
			PhysicalAttack: 0,
			MagicAttack:    0,
			Hands:          1,
			ValueGold:      10,
			Defense:       8,
			Rarity:        "Comum",
			SpecialEffect: "Escudo Inicial",
		},
	}

	equipJSON, _ := json.Marshal(defaultEquip)
	backpackJSON, _ := json.Marshal(defaultBackpack)

	invQuery := `INSERT INTO character_inventories (character_id, equipment, backpack) VALUES ($1, $2, $3)`
	_, _ = DB.Exec(invQuery, char.ID, string(equipJSON), string(backpackJSON))

	return char, nil
}

func GetCharactersByAccountID(accountID string) ([]*Character, error) {
	query := `
		SELECT id, account_id, name, vocation, COALESCE(origin, 'wanderer'), level, experience, health, max_health, mana, max_mana, gold_bank, COALESCE(str, 5), COALESCE(dex, 5), COALESCE(int_stat, 5), COALESCE(vit, 5), COALESCE(unspent_points, 0), COALESCE(masteries, '{}'::jsonb), COALESCE(learned_skills, '[]'::jsonb), COALESCE(active_skills, '[]'::jsonb), COALESCE(unlocked_regions, '["forest", "shereque", "chapolin"]'::jsonb), COALESCE(is_expedition_active, false), COALESCE(active_region, 'forest'), last_login, last_logout
		FROM characters WHERE account_id = $1
	`
	rows, err := DB.Query(query, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chars []*Character
	for rows.Next() {
		c := &Character{}
		var masteriesRaw, skillsRaw, activeRaw, unlockedRaw string
		if err := rows.Scan(
			&c.ID, &c.AccountID, &c.Name, &c.Vocation, &c.Origin,
			&c.Level, &c.Experience, &c.Health, &c.MaxHealth,
			&c.Mana, &c.MaxMana, &c.GoldBank, &c.STR, &c.DEX, &c.INT, &c.VIT, &c.UnspentPoints,
			&masteriesRaw, &skillsRaw, &activeRaw, &unlockedRaw, &c.IsExpeditionActive, &c.ActiveRegion, &c.LastLogin, &c.LastLogout,
		); err != nil {
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
		chars = append(chars, c)
	}
	return chars, nil
}

func GetCharacterByID(id string) (*Character, error) {
	query := `
		SELECT id, account_id, name, vocation, COALESCE(origin, 'wanderer'), level, experience, health, max_health, mana, max_mana, gold_bank, COALESCE(str, 5), COALESCE(dex, 5), COALESCE(int_stat, 5), COALESCE(vit, 5), COALESCE(unspent_points, 0), COALESCE(masteries, '{}'::jsonb), COALESCE(learned_skills, '[]'::jsonb), COALESCE(active_skills, '[]'::jsonb), COALESCE(unlocked_regions, '["forest", "shereque", "chapolin"]'::jsonb), COALESCE(is_expedition_active, false), COALESCE(active_region, 'forest'), last_login, last_logout
		FROM characters WHERE id = $1
	`
	c := &Character{}
	var masteriesRaw, skillsRaw, activeRaw, unlockedRaw string
	err := DB.QueryRow(query, id).Scan(
		&c.ID, &c.AccountID, &c.Name, &c.Vocation, &c.Origin,
		&c.Level, &c.Experience, &c.Health, &c.MaxHealth,
		&c.Mana, &c.MaxMana, &c.GoldBank, &c.STR, &c.DEX, &c.INT, &c.VIT, &c.UnspentPoints,
		&masteriesRaw, &skillsRaw, &activeRaw, &unlockedRaw, &c.IsExpeditionActive, &c.ActiveRegion, &c.LastLogin, &c.LastLogout,
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

func GetCharacterInventory(charID string) (*Inventory, error) {
	query := `SELECT equipment, backpack FROM character_inventories WHERE character_id = $1`
	var equipRaw, backpackRaw string
	err := DB.QueryRow(query, charID).Scan(&equipRaw, &backpackRaw)

	inv := &Inventory{
		Equipment: EquipmentSlots{},
		Backpack:  []game.Item{},
		Cap:       1500,
	}

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

	// Backwards compatibility for old items without weight
	for i := range inv.Backpack {
		if inv.Backpack[i].Weight == 0 {
			inv.Backpack[i].Weight = 15.0 // fallback default weight
		}
	}
	items := []*game.Item{
		inv.Equipment.Head, inv.Equipment.Chest, inv.Equipment.Legs, inv.Equipment.Boots,
		inv.Equipment.MainHand, inv.Equipment.OffHand, inv.Equipment.Necklace, inv.Equipment.Ring,
		inv.Equipment.Ammo, inv.Equipment.Bag,
	}
	for _, it := range items {
		if it != nil && it.Weight == 0 {
			it.Weight = 15.0
		}
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

func UpdateCharacterState(c *Character) error {
	masteriesJSON, _ := json.Marshal(c.Masteries)
	skillsJSON, _ := json.Marshal(c.LearnedSkills)
	activeJSON, _ := json.Marshal(c.ActiveSkills)
	unlockedJSON, _ := json.Marshal(c.UnlockedRegions)
	query := `
		UPDATE characters
		SET vocation=$2, level=$3, experience=$4, health=$5, max_health=$6, mana=$7, max_mana=$8, gold_bank=$9, str=$10, dex=$11, int_stat=$12, vit=$13, unspent_points=$14, masteries=$15, learned_skills=$16, active_skills=$17, unlocked_regions=$18, is_expedition_active=$19, active_region=$20, last_logout=$21
		WHERE id=$1
	`
	lastLogout := c.LastLogout
	if lastLogout.IsZero() {
		lastLogout = time.Now()
	}
	_, err := DB.Exec(query, c.ID, c.Vocation, c.Level, c.Experience, c.Health, c.MaxHealth, c.Mana, c.MaxMana, c.GoldBank, c.STR, c.DEX, c.INT, c.VIT, c.UnspentPoints, masteriesJSON, skillsJSON, activeJSON, unlockedJSON, c.IsExpeditionActive, c.ActiveRegion, lastLogout)
	return err
}

func SetCharacterOffline(charID string, isExpeditionActive bool, activeRegion string) error {
	query := `
		UPDATE characters
		SET last_logout = NOW(), is_expedition_active = $2, active_region = $3
		WHERE id = $1
	`
	_, err := DB.Exec(query, charID, isExpeditionActive, activeRegion)
	return err
}

func RecordExpeditionLog(charID string, minutes int, xp int64, gold int64, items interface{}) error {
	itemsJSON, _ := json.Marshal(items)
	query := `
		INSERT INTO expedition_logs (character_id, minutes_offline, xp_gained, gold_gained, items_found)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := DB.Exec(query, charID, minutes, xp, gold, string(itemsJSON))
	return err
}
