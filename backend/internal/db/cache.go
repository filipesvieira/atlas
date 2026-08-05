package db

import (
	"log"
	"math/rand"
	"time"
	"fmt"

	"github.com/atlas/backend/pkg/game"
)

var (
	BaseItems    []*game.Item
	BaseMonsters []*game.Monster
)

// BaseMonster é a estrutura no DB antes de instanciar pro game
type BaseMonster struct {
	ID         string
	Name       string
	BaseHealth int
	BaseAttack int
	MinLevel   int
	MaxLevel   int
	RegionID   string
}

func LoadCache() {
	LoadBaseItems()
	LoadBaseMonsters()
}

func LoadBaseItems() {
	query := `SELECT id, name, slot, base_atk, base_def, base_weight, tier, COALESCE(special_effect, '') FROM base_items`
	rows, err := DB.Query(query)
	if err != nil {
		log.Fatalf("Erro ao carregar itens base: %v", err)
	}
	defer rows.Close()

	BaseItems = make([]*game.Item, 0)
	for rows.Next() {
		var id string
		var name string
		var slot string
		var atk int
		var def int
		var weight float64
		var tier int
		var effect string

		if err := rows.Scan(&id, &name, &slot, &atk, &def, &weight, &tier, &effect); err != nil {
			log.Printf("Erro no scan do item base: %v", err)
			continue
		}

		rarity := "Comum"
		if tier == 2 {
			rarity = "Incomum"
		} else if tier > 2 {
			rarity = "Raro"
		}

		item := &game.Item{
			ID:            id, // We'll override this when spawning so they don't stack perfectly, or keep base ID + random suffix
			Name:          name,
			Attack:        atk,
			Defense:       def,
			Weight:        weight,
			Rarity:        rarity,
			SpecialEffect: effect,
			SlotType:      slot,
			Tier:          tier,
		}
		BaseItems = append(BaseItems, item)
	}
	log.Printf("Carregados %d Itens Base no Cache", len(BaseItems))
}

var DBBaseMonsters []*BaseMonster

func LoadBaseMonsters() {
	query := `SELECT id, name, base_health, base_attack, min_level, max_level, region_id FROM base_monsters`
	rows, err := DB.Query(query)
	if err != nil {
		log.Fatalf("Erro ao carregar monstros base: %v", err)
	}
	defer rows.Close()

	DBBaseMonsters = make([]*BaseMonster, 0)
	for rows.Next() {
		m := &BaseMonster{}
		if err := rows.Scan(&m.ID, &m.Name, &m.BaseHealth, &m.BaseAttack, &m.MinLevel, &m.MaxLevel, &m.RegionID); err != nil {
			log.Printf("Erro no scan do monstro base: %v", err)
			continue
		}
		DBBaseMonsters = append(DBBaseMonsters, m)
	}
	log.Printf("Carregados %d Monstros Base no Cache", len(DBBaseMonsters))
}

func GetRandomMonsterForRegion(regionID string, playerLevel int, r *rand.Rand) game.Monster {
	var validMonsters []*BaseMonster
	for _, m := range DBBaseMonsters {
		if m.RegionID == regionID {
			validMonsters = append(validMonsters, m)
		}
	}

	// Fallback se a tabela base do banco não possuir monstros cadastrados para esta região
	if len(validMonsters) == 0 {
		return game.GetRandomMonsterForRegion(regionID, playerLevel, r)
	}

	chosen := validMonsters[r.Intn(len(validMonsters))]

	// Limites da região de expedição
	minLvl := chosen.MinLevel
	maxLvl := chosen.MaxLevel

	reg, exists := game.ExpeditionRegions[regionID]
	if exists {
		minLvl = reg.MinLevel
		maxLvl = reg.MaxLevel
	}

	// TRAVA RIGOROSA DO NÍVEL DO MONSTRO AOS LIMITES DA EXPEDIÇÃO (MinLevel a MaxLevel)
	mobLevel := playerLevel
	if maxLvl > 0 && mobLevel > maxLvl {
		mobLevel = maxLvl
	}
	if mobLevel < minLvl {
		mobLevel = minLvl
	}

	// Pequena variação +/- 1 dentro da faixa permitida da região
	if minLvl < maxLvl {
		fuzz := r.Intn(3) - 1
		mobLevel += fuzz
		if mobLevel > maxLvl {
			mobLevel = maxLvl
		}
		if mobLevel < minLvl {
			mobLevel = minLvl
		}
	}

	// Atributos escalados com o nível da região
	healthFuzz := chosen.BaseHealth + (mobLevel * 8) + r.Intn(10)
	attackFuzz := chosen.BaseAttack + (mobLevel * 2) + r.Intn(4)

	// Inferência de AttackType por nome do monstro
	attackType := inferAttackType(chosen.Name)

	return game.Monster{
		ID:         chosen.ID, // Vai ser modificado com UUID na engine
		Name:       chosen.Name,
		Level:      mobLevel,  // Nível estritamente travado na expedição!
		Health:     healthFuzz,
		MaxHealth:  healthFuzz,
		Attack:     attackFuzz,
		AttackType: attackType,
	}
}

// inferAttackType determina o tipo de ataque pelo nome do monstro via heurística.
// Evita necessidade de coluna attack_type no banco de dados.
func inferAttackType(name string) game.AttackType {
	name = fmt.Sprintf("%s", name) // evita import não utilizado
	nLower := []byte(name)
	_ = nLower
	// Palavras-chave que indicam ataque à distância / magia / projétil
	rangedKeywords := []string{
		"aranha", "esqueleto", "espectro", "quimera", "dragão",
		"demônio", "lorde", "arqueiro", "mago", "frost",
		"cinderino", "chamas", "ancestral", "vampiro", "bruxo", "feiticeiro",
	}
	for _, kw := range rangedKeywords {
		if containsInsensitive(name, kw) {
			return game.AttackTypeRanged
		}
	}
	return game.AttackTypeMelee
}

func containsInsensitive(s, substr string) bool {
	sl := len(s)
	subl := len(substr)
	if subl > sl {
		return false
	}
	for i := 0; i <= sl-subl; i++ {
		match := true
		for j := 0; j < subl; j++ {
			sc := s[i+j]
			pc := substr[j]
			if sc >= 'A' && sc <= 'Z' {
				sc += 32
			}
			if pc >= 'A' && pc <= 'Z' {
				pc += 32
			}
			if sc != pc {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

func GetRandomLoot(playerLevel int, r *rand.Rand) *game.Item {
	targetTier := 1
	if playerLevel >= 15 && playerLevel < 40 {
		targetTier = 2
	} else if playerLevel >= 40 {
		targetTier = 3
	}

	var validItems []*game.Item
	for _, item := range BaseItems {
		// Pega itens de tier exato ou menor
		if item.Tier <= targetTier {
			validItems = append(validItems, item)
		}
	}

	if len(validItems) == 0 {
		return nil
	}

	chosen := validItems[r.Intn(len(validItems))]
	
	// Create a copy to give a unique ID
	newItem := *chosen
	newItem.ID = fmt.Sprintf("%s-%d-%d", chosen.ID, time.Now().UnixNano(), r.Intn(10000))
	
	// Sorteia raridade (prefixo/sufixo) simulado
	rarityRoll := r.Float64()
	if rarityRoll < 0.05 {
		newItem.Name = "Lendário " + newItem.Name
		newItem.Attack = int(float64(newItem.Attack) * 1.5)
		newItem.Defense = int(float64(newItem.Defense) * 1.5)
		newItem.Rarity = "Lendário"
	} else if rarityRoll < 0.20 {
		newItem.Name = "Raro " + newItem.Name
		newItem.Attack = int(float64(newItem.Attack) * 1.25)
		newItem.Defense = int(float64(newItem.Defense) * 1.25)
		newItem.Rarity = "Raro"
	} else if rarityRoll < 0.50 {
		newItem.Name = "Incomum " + newItem.Name
		newItem.Attack = int(float64(newItem.Attack) * 1.1)
		newItem.Defense = int(float64(newItem.Defense) * 1.1)
		newItem.Rarity = "Incomum"
	}

	return &newItem
}
