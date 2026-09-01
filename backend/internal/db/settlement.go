package db

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/atlas/backend/pkg/game"
)

type pioneerSeed struct {
	Key    string
	Name   string
	Icon   string
	Title  string
	Traits []string
	Skills []string
}

var pioneerSeeds = []pioneerSeed{
	{Key: "tonho_three_axes", Name: "Tonho Três-Machados", Icon: "🪓", Title: "Lenhador & Ferreiro", Traits: []string{"Braço pesado", "Mestre da forja"}, Skills: []string{"lumberjack", "blacksmith"}},
	{Key: "jurema_net_pull", Name: "Jurema Puxa-Rede", Icon: "🎣", Title: "Pescadora & Coureira", Traits: []string{"Olho para cardumes", "Curtume de precisão"}, Skills: []string{"fisher", "leatherworker"}},
	{Key: "cida_suspicious_tea", Name: "Dona Cida do Chá Suspeito", Icon: "🌿", Title: "Agricultora & Joalheira", Traits: []string{"Mão boa para plantio", "Lapidação de joias finas"}, Skills: []string{"farmer", "jeweler"}},
	{Key: "alencastro_forge", Name: "Mestre Alencastro", Icon: "⚒️", Title: "Minerador & Alfaiate", Traits: []string{"Conhece minério bruto", "Ponto e costura de armaduras"}, Skills: []string{"miner", "tailor"}},
	{Key: "barnabe_wood", Name: "Seu Barnabé das Vigas", Icon: "🪵", Title: "Rastreador & Marceneiro", Traits: []string{"Entalhe perfeito de arcos", "Rastreia animais da mata"}, Skills: []string{"tracker", "woodworker"}},
	{Key: "aurora_alchemy", Name: "Aurora dos Elixires", Icon: "🧪", Title: "Herbalista, Alquimista & Cozinheira", Traits: []string{"Mente investigativa", "Destilação, ervas e cozinha"}, Skills: []string{"herbalist", "alchemist", "cook"}},
	{Key: "elena_gems", Name: "Dona Elena Pé-de-Trilha", Icon: "🐾", Title: "Pescadora & Rastreadora", Traits: []string{"Olhos de águia", "Coleta rápida de sustento"}, Skills: []string{"fisher", "tracker"}},
}

// arrivalSeeds são moradores progressivos. Eles não substituem os pioneiros:
// chegam somente quando prosperidade e moradia comportam uma nova pessoa.
var arrivalSeeds = []pioneerSeed{
	{Key: "arrival_fieldhand", Name: "Ajudante da Roça", Icon: "🌾", Title: "Agricultor Recém-chegado", Traits: []string{"Chegou com sementes", "Não teme boleto de safra"}, Skills: []string{"farmer"}},
	{Key: "arrival_stoneworker", Name: "Ajudante da Pedreira", Icon: "⛏️", Title: "Minerador Recém-chegado", Traits: []string{"Escuta minério", "Capacete quase novo"}, Skills: []string{"miner"}},
	{Key: "arrival_fisher", Name: "Ajudante do Lago", Icon: "🎣", Title: "Pescador Recém-chegado", Traits: []string{"Paciência de margem", "Desconfia de todo bagre"}, Skills: []string{"fisher"}},
	{Key: "arrival_lumberjack", Name: "Ajudante do Bosque", Icon: "🪓", Title: "Lenhador Recém-chegado", Traits: []string{"Passo firme", "Conta anéis de árvore"}, Skills: []string{"lumberjack"}},
	{Key: "arrival_forgehand", Name: "Aprendiz da Forja", Icon: "⚒️", Title: "Ferreiro Aprendiz", Traits: []string{"Fole incansável", "Ainda tem as sobrancelhas"}, Skills: []string{"blacksmith"}},
	{Key: "arrival_herbalist", Name: "Aprendiz de Ervas", Icon: "🌿", Title: "Herborista Recém-chegada", Traits: []string{"Catálogo de folhas", "Chá sem garantia"}, Skills: []string{"herbalist"}},
	{Key: "arrival_tracker", Name: "Batedor da Trilha", Icon: "🐾", Title: "Rastreador Recém-chegado", Traits: []string{"Lê pegadas", "Marketing de caça"}, Skills: []string{"tracker", "leatherworker"}},
	{Key: "arrival_tailor", Name: "Aprendiz do Tear", Icon: "🧵", Title: "Alfaiate Recém-chegada", Traits: []string{"Ponto reforçado", "Mede duas vezes"}, Skills: []string{"tailor"}},
	{Key: "arrival_jeweler", Name: "Aprendiz da Lapidação", Icon: "💎", Title: "Ourives Recém-chegado", Traits: []string{"Olho para brilho", "Não perde pó de gema"}, Skills: []string{"jeweler"}},
}

var arrivalFirstNames = []string{"Adélia", "Agenor", "Bia", "Cássio", "Doralice", "Edivaldo", "Fátima", "Genésio", "Iara", "Januário", "Luzia", "Maurício", "Nazaré", "Olavo", "Quitéria", "Raimundo", "Sueli", "Valdomiro"}
var arrivalAliases = []string{"Mão-Cheia", "Passo Curto", "Fala Baixo", "Chapéu Torto", "Conta Certa", "Café Forte", "Olho Vivo", "Prego Fino", "Saco de Pano", "Bota Nova", "Três Turnos", "Sem Pressa", "Boa Praça", "Pé de Serra", "Lua Cheia", "Dois Baldes"}

var pioneerNamePools = map[string]struct {
	First []string
	Alias []string
}{
	"tonho_three_axes": {
		First: []string{"Tonho", "Zeca", "Bento", "Naldo", "Tião", "Chico", "Damião", "Anselmo", "Geraldo", "Odair", "Valdir", "Joca"},
		Alias: []string{"Três-Machados", "Tora-Torta", "Picareta Fina", "Pedra-Oca", "Serrote Nervoso", "Braço de Cedro", "Ferro-Velho", "Quebra-Rocha", "Lasca-Larga", "Martelo Manso", "Prego Torto", "Tronco Solto"},
	},
	"jurema_net_pull": {
		First: []string{"Jurema", "Nair", "Dalva", "Iolanda", "Carmem", "Zuleica", "Neide", "Marlene", "Lurdes", "Selma", "Rita", "Tereza"},
		Alias: []string{"Puxa-Rede", "Isca Curta", "Bagre Manso", "Linha Torta", "Anzol de Ouro", "Olho de Traíra", "Maré Cheia", "Rede Fina", "Peixe-Pedra", "Remo Rápido", "Lagoa Funda", "Bóia Solta"},
	},
	"cida_suspicious_tea": {
		First: []string{"Cida", "Naná", "Conceição", "Dirce", "Berenice", "Madalena", "Quitéria", "Odete", "Eunice", "Rosália", "Zilda", "Margarida"},
		Alias: []string{"do Chá Suspeito", "Mão de Horta", "da Erva Brava", "Sementeira", "Folha Miúda", "do Vaso Torto", "Hortelã Nervosa", "Raiz Profunda", "da Colheita", "Flor de Sal", "Muda-Certa", "Terra Boa"},
	},
	"alencastro_forge": {
		First: []string{"Alencastro", "Brás", "Gaspar", "Galdino", "Inácio", "Severino", "Custódio", "Baltazar"},
		Alias: []string{"da Bigorna", "Fogo Alto", "Aço Rápido", "Brasa Viva", "Fole Pesado", "do Martelo", "Ferro Quente"},
	},
	"elena_gems": {
		First: []string{"Elena", "Clarice", "Celeste", "Aurora", "Gema", "Flora", "Irene", "Safira"},
		Alias: []string{"das Joias", "Lapidada", "do Quartzo", "Rubi Vivo", "Olho de Lince", "da Faceta", "do Brilho"},
	},
	"barnabe_wood": {
		First: []string{"Barnabé", "Tibúrcio", "Honório", "Virgílio", "Afrânio", "Belchior", "Salustiano"},
		Alias: []string{"das Vigas", "do Encaixe", "Tora Nobre", "Plaina Mansa", "do Formão", "da Cavilha"},
	},
	"aurora_alchemy": {
		First: []string{"Aurora", "Morgana", "Lavínia", "Penélope", "Solange", "Helena", "Isolda"},
		Alias: []string{"dos Elixires", "da Destilação", "do Frasco", "do Alambique", "Gota de Orvalho", "Essência Pura"},
	},
}

func generatedPioneerName(charID string, pioneer pioneerSeed) string {
	pool, exists := pioneerNamePools[pioneer.Key]
	if !exists || len(pool.First) == 0 || len(pool.Alias) == 0 {
		return pioneer.Name
	}
	hash := sha256.Sum256([]byte(charID + ":" + pioneer.Key))
	first := pool.First[int(hash[0])%len(pool.First)]
	alias := pool.Alias[int(hash[1])%len(pool.Alias)]
	return first + " " + alias
}

func generatedArrivalName(charID string, resident pioneerSeed) string {
	hash := sha256.Sum256([]byte(charID + ":arrival:" + resident.Key))
	first := arrivalFirstNames[int(hash[0])%len(arrivalFirstNames)]
	alias := arrivalAliases[int(hash[1])%len(arrivalAliases)]
	return first + " " + alias
}

func ensureResidentSeedTx(tx *sql.Tx, settlementID, charID string, resident pioneerSeed, residentName string) error {
	traits, err := json.Marshal(resident.Traits)
	if err != nil {
		return err
	}
	var residentID string
	if err := tx.QueryRow(`
		INSERT INTO settlement_residents(settlement_id,resident_key,name,icon,title,traits)
		VALUES($1,$2,$3,$4,$5,$6)
		ON CONFLICT(settlement_id,resident_key) DO UPDATE SET name=EXCLUDED.name,icon=EXCLUDED.icon,title=EXCLUDED.title,traits=EXCLUDED.traits
		RETURNING id`, settlementID, resident.Key, residentName, resident.Icon, resident.Title, string(traits)).Scan(&residentID); err != nil {
		return err
	}
	for _, skillKey := range resident.Skills {
		if _, err := tx.Exec(`
			INSERT INTO settlement_resident_skills(resident_id,skill_key,level,experience,lifetime_experience)
			VALUES($1::uuid,$2::text,1,0,0)
			ON CONFLICT(resident_id,skill_key) DO NOTHING`, residentID, skillKey); err != nil {
			return err
		}
	}
	return nil
}

func ensureSettlementRows(charID string) error {
	if charID == "" {
		return fmt.Errorf("personagem obrigatório para inicializar assentamento")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var settlementID string
	if err := tx.QueryRow(`
		INSERT INTO settlements(character_id,name)
		SELECT id,CONCAT('Refúgio de ',name) FROM characters WHERE id=$1
		ON CONFLICT(character_id) DO UPDATE SET character_id=EXCLUDED.character_id
		RETURNING id`, charID).Scan(&settlementID); err != nil {
		return err
	}
	for _, pioneer := range pioneerSeeds {
		if err := ensureResidentSeedTx(tx, settlementID, charID, pioneer, generatedPioneerName(charID, pioneer)); err != nil {
			return err
		}
	}

	var prosperity int64
	if err := tx.QueryRow(`SELECT prosperity FROM settlements WHERE id=$1 FOR UPDATE`, settlementID).Scan(&prosperity); err != nil {
		return err
	}
	var hutLevel int
	if err := tx.QueryRow(`SELECT COALESCE((SELECT level FROM character_camp_buildings WHERE character_id=$1 AND building_key='adventurer_hut'),0)`, charID).Scan(&hutLevel); err != nil {
		return err
	}
	populationTarget := game.SettlementPopulationTarget(prosperity, settlementHousingCapacityForLevel(hutLevel))
	arrivalCount := populationTarget - game.SettlementPioneerCount
	if arrivalCount < 0 {
		arrivalCount = 0
	}

	allSkills := []string{
		"lumberjack", "miner", "fisher", "farmer", "tracker", "herbalist",
		"blacksmith", "jeweler", "leatherworker", "tailor", "woodworker", "alchemist", "cook",
	}

	for index := 0; index < arrivalCount; index++ {
		residentKey := fmt.Sprintf("arrival_resident_%d", index+1)
		hash := sha256.Sum256([]byte(fmt.Sprintf("%s:arrival:%d", charID, index)))
		roll := int(hash[0]) % 100

		var rarity string
		var skillCount int
		var startLevel int
		var rarityTitle string

		switch {
		case roll < 65: // 65% Comum
			rarity = "comum"
			skillCount = 1
			startLevel = 1
			rarityTitle = "Especialista"
		case roll < 90: // 25% Raro
			rarity = "raro"
			skillCount = 2
			startLevel = 1
			rarityTitle = "Versátil"
		case roll < 98: // 8% Épico
			rarity = "epico"
			skillCount = 2
			startLevel = 2
			rarityTitle = "Habilidoso"
		default: // 2% Lendário
			rarity = "lendario"
			skillCount = 2
			startLevel = 3
			rarityTitle = "Grão-Mestre"
		}

		skill1 := allSkills[int(hash[1])%len(allSkills)]
		chosenSkills := []string{skill1}
		if skillCount == 2 {
			skill2 := allSkills[int(hash[2])%len(allSkills)]
			if skill2 == skill1 {
				skill2 = allSkills[(int(hash[2])+1)%len(allSkills)]
			}
			chosenSkills = append(chosenSkills, skill2)
		}

		prof1, _ := game.GetProfessionDefinition(skill1)
		icon := prof1.Icon
		if icon == "" {
			icon = "👤"
		}

		first := arrivalFirstNames[int(hash[3])%len(arrivalFirstNames)]
		alias := arrivalAliases[int(hash[4])%len(arrivalAliases)]
		name := first + " " + alias

		var title string
		if len(chosenSkills) == 2 {
			prof2, _ := game.GetProfessionDefinition(chosenSkills[1])
			if rarity == "lendario" {
				title = fmt.Sprintf("Grão-Mestre (%s & %s)", prof1.Name, prof2.Name)
			} else if rarity == "epico" {
				title = fmt.Sprintf("%s & %s Habilidoso(a)", prof1.Name, prof2.Name)
			} else {
				title = fmt.Sprintf("%s & %s", prof1.Name, prof2.Name)
			}
		} else {
			if rarity == "comum" {
				title = fmt.Sprintf("%s Recém-chegado(a)", prof1.Name)
			} else {
				title = fmt.Sprintf("%s %s", prof1.Name, rarityTitle)
			}
		}

		traits := []string{fmt.Sprintf("Raridade: %s", rarity)}
		if rarity == "lendario" {
			traits = append(traits, "Mestre das Profissões", "Eficiência Inabalável")
		} else if rarity == "epico" {
			traits = append(traits, "Mão Habilidosa", "Técnica Refinada")
		} else if rarity == "raro" {
			traits = append(traits, "Dupla Especialidade", "Polivalente")
		} else {
			traits = append(traits, "Dedicado ao Ofício", "Focado na Produção")
		}

		resident := pioneerSeed{
			Key:    residentKey,
			Name:   name,
			Icon:   icon,
			Title:  title,
			Traits: traits,
			Skills: chosenSkills,
		}

		if err := ensureResidentSeedTx(tx, settlementID, charID, resident, name); err != nil {
			return err
		}

		if startLevel > 1 {
			for _, sk := range chosenSkills {
				if _, err := tx.Exec(`
					UPDATE settlement_resident_skills
					SET level=GREATEST(level,$1)
					WHERE resident_id=(SELECT id FROM settlement_residents WHERE settlement_id=$2 AND resident_key=$3)
					  AND skill_key=$4`, startLevel, settlementID, residentKey, sk); err != nil {
					return err
				}
			}
		}
	}
	if _, err := ensureSettlementWorldLocationTx(tx, settlementID, time.Now().UTC()); err != nil {
		return err
	}
	return tx.Commit()
}

func settlementBuildingLevelsTx(tx *sql.Tx, charID string) (map[string]int, error) {
	rows, err := tx.Query(`SELECT building_key,level FROM character_camp_buildings WHERE character_id=$1`, charID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	levels := map[string]int{}
	for rows.Next() {
		var key string
		var level int
		if err := rows.Scan(&key, &level); err != nil {
			return nil, err
		}
		levels[key] = level
	}
	return levels, rows.Err()
}

func settlementBuildingLevels(charID string) (map[string]int, error) {
	rows, err := DB.Query(`SELECT building_key,level FROM character_camp_buildings WHERE character_id=$1`, charID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	levels := map[string]int{}
	for rows.Next() {
		var key string
		var level int
		if err := rows.Scan(&key, &level); err != nil {
			return nil, err
		}
		levels[key] = level
	}
	return levels, rows.Err()
}

// reconcileSettlementStage promove de forma monotônica. Downgrade nunca ocorre
// quando o jogador move/desmonta alguma estrutura: o estágio representa um
// marco histórico da comunidade, enquanto a defesa atual será calculada em
// snapshots separados nas próximas fatias da M5.
func reconcileSettlementStage(charID string, now time.Time) error {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var settlementID, currentStage string
	var prosperity int64
	if err := tx.QueryRow(`SELECT id,stage_key,prosperity FROM settlements WHERE character_id=$1 FOR UPDATE`, charID).Scan(&settlementID, &currentStage, &prosperity); err != nil {
		return err
	}
	var population int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM settlement_residents WHERE settlement_id=$1`, settlementID).Scan(&population); err != nil {
		return err
	}
	levels, err := settlementBuildingLevelsTx(tx, charID)
	if err != nil {
		return err
	}
	target := game.SettlementHighestEligibleStage(prosperity, population, levels)
	if game.SettlementStageIndex(target.Key) > game.SettlementStageIndex(currentStage) {
		requirementsRaw, _ := json.Marshal(target)
		if _, err := tx.Exec(`
			UPDATE settlements SET stage_key=$2,stage_updated_at=$3,revision=revision+1,updated_at=$3
			WHERE id=$1`, settlementID, target.Key, now.UTC()); err != nil {
			return err
		}
		if _, err := tx.Exec(`
			INSERT INTO settlement_stage_history(settlement_id,from_stage,to_stage,prosperity,population,requirements_snapshot,promoted_at)
			VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)
			ON CONFLICT(settlement_id,to_stage) DO NOTHING`, settlementID, currentStage, target.Key, prosperity, population, string(requirementsRaw), now.UTC()); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(`INSERT INTO settlement_pvp_settings(settlement_id) VALUES($1) ON CONFLICT(settlement_id) DO NOTHING`, settlementID); err != nil {
		return err
	}
	return tx.Commit()
}

func invalidateSettlementDefenseSnapshotTx(tx *sql.Tx, charID string, now time.Time) error {
	if charID == "" {
		return nil
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if _, err := tx.Exec(`
		UPDATE settlement_defense_snapshots snapshot
		SET invalidated_at=COALESCE(snapshot.invalidated_at,$2)
		FROM settlements settlement
		WHERE snapshot.settlement_id=settlement.id AND settlement.character_id=$1 AND snapshot.invalidated_at IS NULL`, charID, now.UTC()); err != nil {
		return err
	}
	_, err := tx.Exec(`
		UPDATE settlement_pvp_settings settings
		SET revision=settings.revision+1,updated_at=$2
		FROM settlements settlement
		WHERE settings.settlement_id=settlement.id AND settlement.character_id=$1`, charID, now.UTC())
	return err
}

func settlementHousingCapacityForLevel(level int) int {
	if level < 0 {
		level = 0
	}
	if level > 3 {
		level = 3
	}
	return 7 + level*3
}

func settlementHousingCapacity(charID string) (int, error) {
	level := 0
	err := DB.QueryRow(`SELECT level FROM character_camp_buildings WHERE character_id=$1 AND building_key='adventurer_hut'`, charID).Scan(&level)
	if err != nil && err != sql.ErrNoRows {
		return 0, err
	}
	return settlementHousingCapacityForLevel(level), nil
}

func GetSettlementState(charID string) (*game.SettlementState, error) {
	if err := ensureEconomyRows(charID); err != nil {
		return nil, err
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	if err := reconcileSettlementStage(charID, now); err != nil {
		return nil, err
	}
	if err := reconcileSettlementDefenseSnapshot(charID, now); err != nil {
		return nil, err
	}
	state := &game.SettlementState{Residents: []game.SettlementResident{}, Desires: []game.HeroDesire{}, Armory: []game.SettlementArmoryItem{}}
	if err := DB.QueryRow(`
		SELECT settlement.id,settlement.name,settlement.stage_key,settlement.reputation,settlement.prosperity,settlement.revision,
		       settlement.treasury_balance,settlement.treasury_reserved_payroll,settlement.treasury_lifetime_income,
		       settlement.treasury_lifetime_expenses,settlement.treasury_auto_fund_enabled,
		       settlement.treasury_personal_gold_reserve,settlement.economy_version,
		       world.id::text,world.key,world.name,settlement.world_x,settlement.world_y,settlement.world_assigned_at
		FROM settlements settlement
		JOIN worlds world ON world.id=settlement.world_id
		WHERE settlement.character_id=$1`, charID).Scan(
		&state.ID, &state.Name, &state.StageKey, &state.Reputation, &state.Prosperity, &state.Revision,
		&state.Treasury.Balance, &state.Treasury.ReservedPayroll, &state.Treasury.LifetimeIncome,
		&state.Treasury.LifetimeExpenses, &state.Treasury.AutoFundEnabled,
		&state.Treasury.PersonalGoldReserve, &state.Treasury.EconomyVersion,
		&state.World.WorldID, &state.World.WorldKey, &state.World.WorldName, &state.World.X, &state.World.Y, &state.World.AssignedAt); err != nil {
		return nil, err
	}
	state.Treasury.PayrollUnlocked = state.Prosperity >= game.SettlementPayrollUnlockProsperity
	state.Treasury.UnlockProsperity = game.SettlementPayrollUnlockProsperity
	state.Treasury.BaseHourlyWage = game.SettlementBaseHourlyWage
	capacity, err := settlementHousingCapacity(charID)
	if err != nil {
		return nil, err
	}
	state.PopulationCapacity = capacity

	rows, err := DB.Query(`SELECT id,resident_key,name,icon,title,traits,happiness,state FROM settlement_residents WHERE settlement_id=$1 ORDER BY arrived_at,resident_key`, state.ID)
	if err != nil {
		return nil, err
	}
	residentIndex := map[string]int{}
	for rows.Next() {
		resident := game.SettlementResident{Skills: []game.SettlementResidentSkill{}}
		var traitsJSON string
		if err := rows.Scan(&resident.ID, &resident.ResidentKey, &resident.Name, &resident.Icon, &resident.Title, &traitsJSON, &resident.Happiness, &resident.Status); err != nil {
			rows.Close()
			return nil, err
		}
		if err := json.Unmarshal([]byte(traitsJSON), &resident.Traits); err != nil {
			rows.Close()
			return nil, fmt.Errorf("traços do morador %s corrompidos: %w", resident.Name, err)
		}
		residentIndex[resident.ID] = len(state.Residents)
		state.Residents = append(state.Residents, resident)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	state.Population = len(state.Residents)
	state.ProsperityPermanent = true
	buildingLevels, err := settlementBuildingLevels(charID)
	if err != nil {
		return nil, err
	}
	state.StageProgress = game.SettlementStageProgressFor(state.StageKey, state.Prosperity, state.Population, buildingLevels)
	state.Territory = game.SettlementBuildBounds(state.StageKey)
	defense, err := loadSettlementDefenseFoundation(state.ID)
	if err != nil {
		return nil, err
	}
	state.Defense = defense
	promotion, err := pendingSettlementPromotion(state.ID)
	if err != nil {
		return nil, err
	}
	state.PendingPromotion = promotion
	if state.Population >= state.PopulationCapacity {
		state.GrowthBlockedReason = "Moradia lotada: melhore a Cabana do Aventureiro para abrir novas vagas"
	} else if nextMilestone, exists := game.NextSettlementResidentMilestone(state.Population); exists {
		state.NextResidentProsperity = nextMilestone
		if state.Prosperity < nextMilestone {
			state.GrowthBlockedReason = fmt.Sprintf("A comunidade precisa alcançar %d de Prosperidade para atrair o próximo morador", nextMilestone)
		} else {
			state.GrowthBlockedReason = "A chegada do próximo morador será conciliada na próxima atualização do assentamento"
		}
	} else {
		state.GrowthBlockedReason = "Todos os perfis de moradores desta etapa já foram atraídos"
	}

	rows, err = DB.Query(`
		SELECT skill.resident_id,skill.skill_key,skill.skill_kind,skill.level,skill.experience
		FROM settlement_resident_skills skill
		JOIN settlement_residents resident ON resident.id=skill.resident_id
		WHERE resident.settlement_id=$1
		ORDER BY skill.resident_id,skill.skill_key`, state.ID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var residentID string
		var skill game.SettlementResidentSkill
		if err := rows.Scan(&residentID, &skill.SkillKey, &skill.SkillKind, &skill.Level, &skill.Experience); err != nil {
			rows.Close()
			return nil, err
		}
		skill.XPRequired = game.GetRequiredProfessionXP(skill.Level)
		if index, exists := residentIndex[residentID]; exists {
			state.Residents[index].Skills = append(state.Residents[index].Skills, skill)
		}
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`
		SELECT resident_id,'collecting' FROM character_activities
		WHERE character_id=$1 AND resident_id IS NOT NULL AND state IN ('running','claimable')
		UNION ALL
		SELECT desire.assigned_resident_id,'crafting'
		FROM hero_desires desire JOIN settlements settlement ON settlement.id=desire.settlement_id
		WHERE settlement.character_id=$1 AND desire.assigned_resident_id IS NOT NULL AND desire.state='crafting'`, charID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var residentID, status string
		if err := rows.Scan(&residentID, &status); err != nil {
			rows.Close()
			return nil, err
		}
		if index, exists := residentIndex[residentID]; exists {
			state.Residents[index].Status = status
		}
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`
		SELECT desire.id,desire.recipe_key,desire.target_rarity,desire.catalyst_key,desire.priority,
		       desire.max_attempts,desire.attempts_completed,desire.state,desire.blocked_reason,
		       COALESCE(desire.assigned_resident_id::text,''),COALESCE(resident.name,''),
		       desire.current_order_started_at,desire.current_order_ready_at,desire.reserved_gold,
		       desire.result_item_id,desire.revision,desire.created_at,desire.updated_at
		FROM hero_desires desire
		LEFT JOIN settlement_residents resident ON resident.id=desire.assigned_resident_id
		WHERE desire.settlement_id=$1 AND desire.state != 'cancelled'
		ORDER BY CASE desire.state WHEN 'crafting' THEN 0 WHEN 'queued' THEN 1 WHEN 'blocked' THEN 2 ELSE 3 END,
		         desire.priority DESC,desire.created_at DESC`, state.ID)
	if err != nil {
		return nil, err
	}
	desireIndex := map[string]int{}
	for rows.Next() {
		var desire game.HeroDesire
		var startedAt, readyAt sql.NullTime
		if err := rows.Scan(&desire.ID, &desire.RecipeKey, &desire.TargetRarity, &desire.CatalystKey, &desire.Priority,
			&desire.MaxAttempts, &desire.AttemptsCompleted, &desire.State, &desire.BlockedReason,
			&desire.AssignedResidentID, &desire.AssignedResidentName, &startedAt, &readyAt,
			&desire.ReservedGold, &desire.ResultItemID, &desire.Revision, &desire.CreatedAt, &desire.UpdatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		if recipe, exists := game.GetRecipeDefinition(desire.RecipeKey); exists {
			desire.RecipeName = recipe.Name
		} else {
			desire.RecipeName = desire.RecipeKey
		}
		if startedAt.Valid {
			desire.CurrentOrderStartedAt = &startedAt.Time
		}
		if readyAt.Valid {
			desire.CurrentOrderReadyAt = &readyAt.Time
		}
		desire.ReservedResources = []game.ResourceAmount{}
		desireIndex[desire.ID] = len(state.Desires)
		state.Desires = append(state.Desires, desire)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`SELECT desire_id,resource_key,quantity FROM hero_desire_resource_reservations WHERE desire_id IN (SELECT id FROM hero_desires WHERE settlement_id=$1) ORDER BY resource_key`, state.ID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var desireID string
		var resource game.ResourceAmount
		if err := rows.Scan(&desireID, &resource.Key, &resource.Quantity); err != nil {
			rows.Close()
			return nil, err
		}
		if index, exists := desireIndex[desireID]; exists {
			state.Desires[index].ReservedResources = append(state.Desires[index].ReservedResources, resource)
		}
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`SELECT id,item,source_kind,reference_key,stored_at FROM settlement_armory WHERE settlement_id=$1 AND claimed_at IS NULL ORDER BY stored_at DESC`, state.ID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var armoryItem game.SettlementArmoryItem
		var raw string
		if err := rows.Scan(&armoryItem.ID, &raw, &armoryItem.SourceKind, &armoryItem.ReferenceKey, &armoryItem.StoredAt); err != nil {
			rows.Close()
			return nil, err
		}
		if err := json.Unmarshal([]byte(raw), &armoryItem.Item); err != nil {
			rows.Close()
			return nil, fmt.Errorf("item do arsenal corrompido: %w", err)
		}
		state.Armory = append(state.Armory, armoryItem)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	return state, nil
}

func CreateHeroDesire(charID, recipeKey, targetRarity, catalystKey string, maxAttempts, priority int, requestID string) (*game.SettlementState, error) {
	if requestID == "" || len(requestID) > 100 {
		return nil, fmt.Errorf("request_id obrigatório ou muito longo")
	}
	recipe, exists := game.GetRecipeDefinition(recipeKey)
	if !exists {
		return nil, fmt.Errorf("receita de ambição não encontrada")
	}
	if !game.IsRecipeReleased(recipe) {
		return nil, fmt.Errorf("esta receita pertence a uma fase futura e ainda não está disponível")
	}
	if recipe.Kind == game.RecipeKindEquipment {
		normalizedTarget, valid := game.NormalizeSettlementRarity(targetRarity)
		if !valid {
			return nil, fmt.Errorf("raridade desejada inválida")
		}
		targetRarity = normalizedTarget
		maximum := recipe.MaximumRarity
		if maximum == "" {
			maximum = "Lendário"
		}
		if !game.RarityMeetsTarget(maximum, targetRarity) {
			return nil, fmt.Errorf("%s não pode alcançar raridade %s", recipe.Name, targetRarity)
		}
	} else {
		// A coluna é obrigatória por compatibilidade com as migrations antigas,
		// mas recursos processados, alimentos e poções não possuem raridade.
		targetRarity = "Comum"
		if catalystKey != "" {
			return nil, fmt.Errorf("catalisadores só podem ser usados em equipamentos")
		}
	}
	if catalystKey != "" && game.CatalystCost(catalystKey) == 0 {
		return nil, fmt.Errorf("catalisador inválido")
	}
	if maxAttempts < 1 {
		maxAttempts = 1
	}
	if maxAttempts > 20 {
		maxAttempts = 20
	}
	if priority < 1 {
		priority = 1
	}
	if priority > 100 {
		priority = 100
	}
	recipeSnapshot, err := json.Marshal(recipe)
	if err != nil {
		return nil, err
	}
	if err := ensureEconomyRows(charID); err != nil {
		return nil, err
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var settlementID string
	if err := tx.QueryRow(`SELECT id FROM settlements WHERE character_id=$1 FOR UPDATE`, charID).Scan(&settlementID); err != nil {
		return nil, err
	}
	var unlocked bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM character_recipe_unlocks WHERE character_id=$1 AND recipe_key=$2)`, charID, recipeKey).Scan(&unlocked); err != nil {
		return nil, err
	}
	if !unlocked {
		return nil, fmt.Errorf("receita ainda não descoberta")
	}
	var repeatedRequest bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM hero_desires WHERE settlement_id=$1 AND request_id=$2)`, settlementID, requestID).Scan(&repeatedRequest); err != nil {
		return nil, err
	}
	if repeatedRequest {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetSettlementState(charID)
	}
	var activeDesires int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM hero_desires WHERE settlement_id=$1 AND state IN ('queued','blocked','crafting')`, settlementID).Scan(&activeDesires); err != nil {
		return nil, err
	}
	if activeDesires >= 12 {
		return nil, fmt.Errorf("o assentamento já possui 12 Ambições ativas; conclua ou cancele uma antes")
	}
	var activeRecipe bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM hero_desires WHERE settlement_id=$1 AND recipe_key=$2 AND state IN ('queued','blocked','crafting'))`, settlementID, recipeKey).Scan(&activeRecipe); err != nil {
		return nil, err
	}
	if activeRecipe {
		return nil, fmt.Errorf("já existe uma Ambição ativa para %s", recipe.Name)
	}
	if _, err := tx.Exec(`
		INSERT INTO hero_desires(settlement_id,request_id,recipe_key,recipe_snapshot,target_rarity,catalyst_key,priority,max_attempts)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT(settlement_id,request_id) DO NOTHING`, settlementID, requestID, recipeKey, string(recipeSnapshot), targetRarity, catalystKey, priority, maxAttempts); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE settlements SET revision=revision+1,updated_at=NOW() WHERE id=$1`, settlementID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		DELETE FROM hero_desires WHERE id IN (
			SELECT id FROM hero_desires
			WHERE settlement_id=$1 AND state IN ('completed','exhausted','cancelled')
			ORDER BY updated_at DESC OFFSET 100
		)`, settlementID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetSettlementState(charID)
}

func markDesireBlockedTx(tx *sql.Tx, desireID, reason string) (bool, error) {
	result, err := tx.Exec(`
		UPDATE hero_desires SET state='blocked',blocked_reason=$2,revision=revision+1,updated_at=NOW()
		WHERE id=$1 AND (state<>'blocked' OR blocked_reason<>$2)`, desireID, reason)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	return affected > 0, err
}

func blockedAutomationResult(changed bool, reason string) *game.SettlementAutomationResult {
	result := &game.SettlementAutomationResult{Changed: changed}
	if changed {
		result.EventType = "HERO_DESIRE_BLOCKED"
		result.LogText = "⏳ Ambição aguardando: " + reason + "."
	}
	return result
}

func mergedDesireCosts(recipe game.RecipeDefinition, catalystKey string) []game.ResourceAmount {
	totals := map[string]int64{}
	for _, cost := range recipe.Ingredients {
		totals[cost.Key] += cost.Quantity
	}
	if catalystCost := game.CatalystCost(catalystKey); catalystCost > 0 {
		totals[catalystKey] += catalystCost
	}
	keys := make([]string, 0, len(totals))
	for key := range totals {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	result := make([]game.ResourceAmount, 0, len(keys))
	for _, key := range keys {
		result = append(result, game.ResourceAmount{Key: key, Quantity: totals[key]})
	}
	return result
}

func startNextHeroDesire(charID string, now time.Time) (*game.SettlementAutomationResult, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	type desireCandidate struct {
		id, settlementID, recipeKey, recipeSnapshot, targetRarity, catalystKey, currentState, currentReason string
		maxAttempts, attempts                                                                               int
	}

	rows, err := tx.Query(`
		SELECT desire.id,desire.settlement_id,desire.recipe_key,desire.recipe_snapshot,desire.target_rarity,desire.catalyst_key,
		       desire.max_attempts,desire.attempts_completed,desire.state,desire.blocked_reason
		FROM hero_desires desire
		JOIN settlements settlement ON settlement.id=desire.settlement_id
		WHERE settlement.character_id=$1 AND desire.state IN ('queued','blocked')
		ORDER BY desire.priority DESC,desire.created_at
		LIMIT 10 FOR UPDATE OF desire SKIP LOCKED`, charID)
	if err != nil {
		return nil, err
	}

	var candidates []desireCandidate
	for rows.Next() {
		var c desireCandidate
		if err := rows.Scan(&c.id, &c.settlementID, &c.recipeKey, &c.recipeSnapshot, &c.targetRarity, &c.catalystKey, &c.maxAttempts, &c.attempts, &c.currentState, &c.currentReason); err != nil {
			rows.Close()
			return nil, err
		}
		candidates = append(candidates, c)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	if len(candidates) == 0 {
		return &game.SettlementAutomationResult{}, tx.Commit()
	}

	var anyChanged bool

	for _, c := range candidates {
		desireID := c.id
		settlementID := c.settlementID
		recipeKey := c.recipeKey
		catalystKey := c.catalystKey
		attempts := c.attempts
		maxAttempts := c.maxAttempts

		var recipe game.RecipeDefinition
		exists := json.Unmarshal([]byte(c.recipeSnapshot), &recipe) == nil && recipe.Key != ""
		if !exists {
			recipe, exists = game.GetRecipeDefinition(recipeKey)
		}
		if !exists || (recipe.Kind != game.RecipeKindEquipment && recipe.Kind != game.RecipeKindProcessing && recipe.Kind != game.RecipeKindConsumable) {
			changed, _ := markDesireBlockedTx(tx, desireID, "Receita removida ou incompatível com produção automática")
			if changed {
				anyChanged = true
			}
			continue
		}
		if attempts >= maxAttempts {
			if _, err := tx.Exec(`UPDATE hero_desires SET state='exhausted',blocked_reason='Limite de tentativas atingido',revision=revision+1,updated_at=NOW() WHERE id=$1`, desireID); err == nil {
				anyChanged = true
			}
			continue
		}

		// Mantém a mesma ordem de locks da Tesouraria/coleta antes de tocar o
		// ouro pessoal e o morador selecionado.
		var lockedSettlementID string
		if err := tx.QueryRow(`SELECT id::text FROM settlements WHERE id=$1 FOR UPDATE`, settlementID).Scan(&lockedSettlementID); err != nil {
			return nil, err
		}
		var gold int64
		if err := tx.QueryRow(`SELECT gold_bank FROM characters WHERE id=$1 FOR UPDATE`, charID).Scan(&gold); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
			return nil, err
		}
		var campRevision int64
		if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id=$1 FOR UPDATE`, charID).Scan(&campRevision); err != nil {
			return nil, err
		}

		var residentID, residentName string
		var residentLevel int
		err = tx.QueryRow(`
			SELECT resident.id,resident.name,skill.level
			FROM settlement_residents resident
			JOIN settlement_resident_skills skill ON skill.resident_id=resident.id AND skill.skill_key=$2
			WHERE resident.settlement_id=$1
			  AND resident.state='idle'
			  AND NOT EXISTS(SELECT 1 FROM character_activities activity WHERE activity.resident_id=resident.id AND activity.state IN ('running','claimable'))
			  AND NOT EXISTS(SELECT 1 FROM hero_desires other WHERE other.assigned_resident_id=resident.id AND other.state='crafting')
			ORDER BY skill.level DESC,resident.arrived_at
			LIMIT 1 FOR UPDATE OF resident`, settlementID, recipe.ProfessionKey).Scan(&residentID, &residentName, &residentLevel)
		if err == sql.ErrNoRows {
			profDef, _ := game.GetProfessionDefinition(recipe.ProfessionKey)
			profName := profDef.Name
			if profName == "" {
				profName = formatProfessionName(recipe.ProfessionKey)
			}
			reason := fmt.Sprintf("Nenhum morador especializado em %s está livre", profName)
			changed, _ := markDesireBlockedTx(tx, desireID, reason)
			if changed {
				anyChanged = true
			}
			continue
		}
		if err != nil {
			return nil, err
		}
		if residentLevel < recipe.RequiredProfessionLevel {
			profName := formatProfessionName(recipe.ProfessionKey)
			reason := fmt.Sprintf("%s precisa alcançar nível %d em %s", residentName, recipe.RequiredProfessionLevel, profName)
			changed, _ := markDesireBlockedTx(tx, desireID, reason)
			if changed {
				anyChanged = true
			}
			continue
		}
		var unlocked bool
		if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM character_recipe_unlocks WHERE character_id=$1 AND recipe_key=$2)`, charID, recipeKey).Scan(&unlocked); err != nil {
			return nil, err
		}
		if !unlocked {
			changed, _ := markDesireBlockedTx(tx, desireID, "Receita ainda não descoberta")
			if changed {
				anyChanged = true
			}
			continue
		}
		stationLevel := 0
		if recipe.RequiredStationLevel > 0 {
			err := tx.QueryRow(`SELECT level FROM character_camp_buildings WHERE character_id=$1 AND building_key=$2`, charID, recipe.StationKey).Scan(&stationLevel)
			if err != nil && err != sql.ErrNoRows {
				return nil, err
			}
			if stationLevel < recipe.RequiredStationLevel {
				stationName := formatBuildingName(recipe.StationKey)
				reason := fmt.Sprintf("Construa ou melhore %s para o nível %d", stationName, recipe.RequiredStationLevel)
				changed, _ := markDesireBlockedTx(tx, desireID, reason)
				if changed {
					anyChanged = true
				}
				continue
			}
		}
		if gold < recipe.GoldCost {
			reason := fmt.Sprintf("Faltam %d de ouro", recipe.GoldCost-gold)
			changed, _ := markDesireBlockedTx(tx, desireID, reason)
			if changed {
				anyChanged = true
			}
			continue
		}

		costs := mergedDesireCosts(recipe, catalystKey)
		balances := map[string]int64{}
		hasMissingResource := false
		missingReason := ""
		for _, cost := range costs {
			var balance int64
			err := tx.QueryRow(`SELECT quantity FROM character_resources WHERE character_id=$1 AND resource_key=$2 FOR UPDATE`, charID, cost.Key).Scan(&balance)
			if err != nil && err != sql.ErrNoRows {
				return nil, err
			}
			balances[cost.Key] = balance
			if balance < cost.Quantity {
				resDef, _ := game.GetResourceDefinition(cost.Key)
				resName := resDef.Name
				if resName == "" {
					resName = cost.Key
				}
				missingReason = fmt.Sprintf("Aguardando %s: %d/%d", resName, balance, cost.Quantity)
				hasMissingResource = true
				break
			}
		}
		if hasMissingResource {
			changed, _ := markDesireBlockedTx(tx, desireID, missingReason)
			if changed {
				anyChanged = true
			}
			continue
		}

		attemptNumber := attempts + 1
		requestKey := fmt.Sprintf("desire:%s:%d", desireID, attemptNumber)
		for _, cost := range costs {
			newBalance := balances[cost.Key] - cost.Quantity
			if _, err := tx.Exec(`UPDATE character_resources SET quantity=$3,updated_at=NOW() WHERE character_id=$1 AND resource_key=$2`, charID, cost.Key, newBalance); err != nil {
				return nil, err
			}
			if _, err := tx.Exec(`INSERT INTO hero_desire_resource_reservations(desire_id,resource_key,quantity) VALUES($1,$2,$3) ON CONFLICT(desire_id,resource_key) DO UPDATE SET quantity=EXCLUDED.quantity`, desireID, cost.Key, cost.Quantity); err != nil {
				return nil, err
			}
			if _, err := tx.Exec(`INSERT INTO character_resource_ledger(character_id,request_id,reason,reference_key,resource_key,delta,balance_after) VALUES($1,$2,'hero_desire_reserve',$3,$4,$5,$6)`, charID, requestKey, desireID, cost.Key, -cost.Quantity, newBalance); err != nil {
				return nil, err
			}
		}
		if _, err := tx.Exec(`UPDATE character_camps SET state_revision=state_revision+1,updated_at=NOW() WHERE character_id=$1`, charID); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`UPDATE characters SET gold_bank=gold_bank-$2,state_revision=state_revision+1 WHERE id=$1`, charID, recipe.GoldCost); err != nil {
			return nil, err
		}
		readyAt := now.Add(time.Duration(recipe.CraftSeconds) * time.Second)
		if _, err := tx.Exec(`
			UPDATE hero_desires
			SET state='crafting',blocked_reason='',assigned_resident_id=$2,current_order_started_at=$3,
			    current_order_ready_at=$4,reserved_gold=$5,revision=revision+1,updated_at=NOW()
			WHERE id=$1`, desireID, residentID, now, readyAt, recipe.GoldCost); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`UPDATE settlement_residents SET state='crafting',updated_at=NOW() WHERE id=$1`, residentID); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`UPDATE settlements SET revision=revision+1,updated_at=NOW() WHERE id=$1`, settlementID); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &game.SettlementAutomationResult{
			Changed: true, EventType: "HERO_DESIRE_STARTED",
			LogText:  fmt.Sprintf("🔨 %s começou a trabalhar em %s. Materiais reservados com segurança.", residentName, recipe.Name),
			GoldBank: gold - recipe.GoldCost, GoldDelta: -recipe.GoldCost,
		}, nil
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &game.SettlementAutomationResult{Changed: anyChanged}, nil
}

func finalizeReadyHeroDesire(charID string, now time.Time) (*game.SettlementAutomationResult, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var desireID, settlementID, recipeKey, recipeSnapshot, targetRarity, catalystKey, residentID, residentName string
	var maxAttempts, attempts int
	err = tx.QueryRow(`
		SELECT desire.id,desire.settlement_id,desire.recipe_key,desire.recipe_snapshot,desire.target_rarity,desire.catalyst_key,
		       desire.max_attempts,desire.attempts_completed,desire.assigned_resident_id,resident.name
		FROM hero_desires desire
		JOIN settlements settlement ON settlement.id=desire.settlement_id
		JOIN settlement_residents resident ON resident.id=desire.assigned_resident_id
		WHERE settlement.character_id=$1 AND desire.state='crafting' AND desire.current_order_ready_at<=$2
		ORDER BY desire.current_order_ready_at
		LIMIT 1 FOR UPDATE OF desire SKIP LOCKED`, charID, now).Scan(&desireID, &settlementID, &recipeKey, &recipeSnapshot, &targetRarity, &catalystKey, &maxAttempts, &attempts, &residentID, &residentName)
	if err == sql.ErrNoRows {
		return &game.SettlementAutomationResult{}, tx.Commit()
	}
	if err != nil {
		return nil, err
	}
	var recipe game.RecipeDefinition
	exists := json.Unmarshal([]byte(recipeSnapshot), &recipe) == nil && recipe.Key != ""
	if !exists {
		recipe, exists = game.GetRecipeDefinition(recipeKey)
	}
	if !exists {
		return nil, fmt.Errorf("receita %s desapareceu durante a produção", recipeKey)
	}
	var residentProgress game.ProfessionProgress
	residentProgress.ProfessionKey = recipe.ProfessionKey
	if err := tx.QueryRow(`SELECT level,experience,revision FROM settlement_resident_skills WHERE resident_id=$1 AND skill_key=$2 FOR UPDATE`, residentID, recipe.ProfessionKey).Scan(&residentProgress.Level, &residentProgress.Experience, &residentProgress.Revision); err != nil {
		return nil, err
	}
	stationLevel := 0
	if recipe.RequiredStationLevel > 0 {
		if err := tx.QueryRow(`SELECT level FROM character_camp_buildings WHERE character_id=$1 AND building_key=$2`, charID, recipe.StationKey).Scan(&stationLevel); err != nil {
			return nil, err
		}
	}
	seed, err := secureServerSeed()
	if err != nil {
		return nil, err
	}
	attemptNumber := attempts + 1
	isEquipment := recipe.Kind == game.RecipeKindEquipment
	var item *game.Item
	rarity := ""
	var outputResources []game.ResourceAmount
	if isEquipment {
		item, rarity, err = game.GenerateCraftedItem(recipe, catalystKey, seed, residentProgress.Level, stationLevel)
		if err != nil {
			return nil, err
		}
	} else {
		if recipe.OutputResourceKey == "" || recipe.OutputQuantity <= 0 {
			return nil, fmt.Errorf("receita %s não possui uma saída de recurso válida", recipeKey)
		}
		outputResources = []game.ResourceAmount{{Key: recipe.OutputResourceKey, Quantity: recipe.OutputQuantity}}
	}

	// Equipamentos seguem a regra original: a raridade desejada encerra a
	// Ambição e os demais resultados ficam protegidos no Arsenal. Produções de
	// recursos, alimentos e poções são unidades válidas da ordem e são
	// entregues ao Depósito (ou preservadas como pendência se ele estiver cheio).
	reachedTarget := isEquipment && game.RarityMeetsTarget(rarity, targetRarity)
	deliveredToBackpack := false
	var deliveredInventory *game.InventoryData
	if isEquipment && reachedTarget {
		// O inventário é travado antes do personagem, mesma ordem usada pelo
		// fluxo de craft/resgate, para que slots e capacidade sejam avaliados
		// contra o estado persistido mais recente.
		lockedInventory, err := GetCharacterInventoryTx(tx, charID, true)
		if err != nil {
			return nil, err
		}
		lockedCharacter, err := scanLockedCharacter(tx.QueryRow(`SELECT `+characterSnapshotColumns+` FROM characters WHERE id=$1 FOR UPDATE`, charID))
		if err != nil {
			return nil, err
		}
		capacitySession := &game.GameSession{
			Character:    characterToGame(lockedCharacter),
			Inventory:    inventoryToGame(lockedInventory),
			ActiveStance: lockedCharacter.ActiveStance,
		}
		if len(lockedInventory.Backpack) < capacitySession.GetMaxSlotCapacity() &&
			capacitySession.GetTotalWeight()+item.Weight <= capacitySession.GetMaxWeightCapacity() {
			lockedInventory.Backpack = append(lockedInventory.Backpack, *item)
			if err := SaveCharacterInventoryTx(tx, charID, lockedInventory); err != nil {
				return nil, err
			}
			deliveredToBackpack = true
			deliveredInventory = game.CloneInventorySnapshot(inventoryToGame(lockedInventory))
		}
	}
	if isEquipment && !deliveredToBackpack {
		itemJSON, err := json.Marshal(item)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`INSERT INTO settlement_armory(settlement_id,item,source_kind,reference_key) VALUES($1,$2,'hero_desire',$3) ON CONFLICT DO NOTHING`, settlementID, string(itemJSON), desireID); err != nil {
			return nil, err
		}
	}
	var resourceInventory game.ResourceInventorySnapshot
	sentToPending := false
	if !isEquipment {
		capacity, err := campStorageCapacityTx(tx, charID)
		if err != nil {
			return nil, err
		}
		mutation, err := AddCharacterResourcesTx(tx, charID, outputResources, capacity)
		if err != nil {
			return nil, err
		}
		if len(mutation.Overflow) > 0 {
			if err := storePendingResourcesTx(tx, charID, "hero_desire", desireID, mutation.Overflow); err != nil {
				return nil, err
			}
			sentToPending = true
		}
		resourceInventory = mutation.Inventory
		if err := recordResourceLedgerTx(tx, charID, fmt.Sprintf("desire:%s:%d:output", desireID, attemptNumber), "hero_desire_output", desireID, mutation.Accepted); err != nil {
			return nil, err
		}
	}

	rows, err := tx.Query(`SELECT resource_key,quantity FROM hero_desire_resource_reservations WHERE desire_id=$1 ORDER BY resource_key FOR UPDATE`, desireID)
	if err != nil {
		return nil, err
	}
	costs := []game.ResourceAmount{}
	for rows.Next() {
		var cost game.ResourceAmount
		if err := rows.Scan(&cost.Key, &cost.Quantity); err != nil {
			rows.Close()
			return nil, err
		}
		costs = append(costs, cost)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	xpGained := int64(12 * recipe.Tier)
	residentProgress = game.ApplyProfessionExperience(residentProgress, xpGained)
	if _, err := tx.Exec(`UPDATE settlement_resident_skills SET level=$3,experience=$4,lifetime_experience=lifetime_experience+$5,revision=revision+1,updated_at=NOW() WHERE resident_id=$1 AND skill_key=$2`, residentID, recipe.ProfessionKey, residentProgress.Level, residentProgress.Experience, xpGained); err != nil {
		return nil, err
	}
	var collective game.ProfessionProgress
	collective.ProfessionKey = recipe.ProfessionKey
	if err := tx.QueryRow(`SELECT level,experience,revision FROM character_professions WHERE character_id=$1 AND profession_key=$2 FOR UPDATE`, charID, recipe.ProfessionKey).Scan(&collective.Level, &collective.Experience, &collective.Revision); err != nil {
		return nil, err
	}
	collective = game.ApplyProfessionExperience(collective, xpGained)
	if _, err := tx.Exec(`UPDATE character_professions SET level=$3,experience=$4,lifetime_experience=lifetime_experience+$5,revision=revision+1,updated_at=NOW() WHERE character_id=$1 AND profession_key=$2`, charID, recipe.ProfessionKey, collective.Level, collective.Experience, xpGained); err != nil {
		return nil, err
	}

	result := &game.CraftResult{
		RequestID:          fmt.Sprintf("desire:%s:%d", desireID, attemptNumber),
		RecipeKey:          recipeKey,
		Item:               item,
		Resources:          outputResources,
		Rarity:             rarity,
		SentToPending:      sentToPending,
		SentToArmory:       isEquipment && !deliveredToBackpack,
		SentToBackpack:     deliveredToBackpack,
		ProfessionProgress: residentProgress,
		ResourceInventory:  resourceInventory,
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	costsJSON, err := json.Marshal(costs)
	if err != nil {
		return nil, err
	}
	var transactionID string
	if err := tx.QueryRow(`
		INSERT INTO crafting_transactions(character_id,request_id,recipe_key,recipe_version,catalyst_key,preview_revision,costs,gold_cost,result,deterministic_seed,rarity_table_version,profession_level_snapshot,station_level_snapshot)
		VALUES($1,$2,$3,$4,$5,0,$6,$7,$8,$9,1,$10,$11)
		ON CONFLICT(character_id,request_id) DO UPDATE SET request_id=EXCLUDED.request_id
		RETURNING id`, charID, result.RequestID, recipeKey, recipe.ContentVersion, catalystKey, string(costsJSON), recipe.GoldCost, string(resultJSON), seed, residentProgress.Level, stationLevel).Scan(&transactionID); err != nil {
		return nil, err
	}
	result.TransactionID = transactionID
	resultJSON, err = json.Marshal(result)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE crafting_transactions SET result=$2 WHERE id=$1`, transactionID, string(resultJSON)); err != nil {
		return nil, err
	}

	nextState := game.SettlementDesireQueued
	blockedReason := ""
	resultItemID := ""
	if item != nil {
		resultItemID = item.ID
	}
	if reachedTarget || (!isEquipment && attemptNumber >= maxAttempts) {
		nextState = game.SettlementDesireCompleted
	} else if attemptNumber >= maxAttempts {
		nextState = game.SettlementDesireExhausted
		blockedReason = "Limite de tentativas atingido; os resultados continuam protegidos no Arsenal"
	}
	if _, err := tx.Exec(`
		UPDATE hero_desires
		SET attempts_completed=$2,state=$3,blocked_reason=$4,result_item_id=$5,assigned_resident_id=NULL,
		    current_order_started_at=NULL,current_order_ready_at=NULL,reserved_gold=0,revision=revision+1,updated_at=NOW()
		WHERE id=$1`, desireID, attemptNumber, nextState, blockedReason, resultItemID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE settlement_residents SET state='idle',updated_at=NOW() WHERE id=$1`, residentID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`DELETE FROM hero_desire_resource_reservations WHERE desire_id=$1`, desireID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE settlements SET prosperity=prosperity+$2,revision=revision+1,updated_at=NOW() WHERE id=$1`, settlementID, int64(10*recipe.Tier)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	logText := fmt.Sprintf("⚒️ %s concluiu %s.", residentName, recipe.Name)
	if isEquipment && rarity != "" {
		logText = fmt.Sprintf("⚒️ %s concluiu %s (%s).", residentName, recipe.Name, rarity)
	}
	if !isEquipment {
		outputName := recipe.OutputResourceKey
		if resource, ok := game.GetResourceDefinition(recipe.OutputResourceKey); ok && resource.Name != "" {
			outputName = resource.Name
		}
		logText += fmt.Sprintf(" +%d %s foi entregue ao Depósito.", recipe.OutputQuantity, outputName)
		if sentToPending {
			logText += " O excedente foi preservado nas cargas pendentes por falta de espaço."
		}
	} else if deliveredToBackpack {
		logText += " O item desejado foi enviado diretamente para a mochila."
	} else if isEquipment {
		logText += " O resultado está protegido no Arsenal."
		if reachedTarget {
			logText += " A mochila estava sem espaço ou capacidade suficiente."
		}
	}
	if nextState == game.SettlementDesireQueued {
		if isEquipment {
			logText += fmt.Sprintf(" A raridade desejada é %s; a cidade tentará novamente quando houver recursos.", targetRarity)
		} else {
			logText += " A cidade continuará a produção até concluir a quantidade solicitada."
		}
	}
	return &game.SettlementAutomationResult{Changed: true, EventType: "HERO_DESIRE_ATTEMPT_COMPLETED", LogText: logText, CraftResult: result, Inventory: deliveredInventory}, nil
}

func AdvanceHeroDesires(charID string, now time.Time) (*game.SettlementAutomationResult, error) {
	if err := ensureEconomyRows(charID); err != nil {
		return nil, err
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}
	result, err := finalizeReadyHeroDesire(charID, now.UTC())
	if err != nil {
		return nil, err
	}
	if !result.Changed {
		result, err = startNextHeroDesire(charID, now.UTC())
		if err != nil {
			return nil, err
		}
	}
	if !result.Changed {
		return result, nil
	}
	settlement, err := GetSettlementState(charID)
	if err != nil {
		return nil, err
	}
	snapshot, err := GetCharacterResourceSnapshot(charID)
	if err != nil {
		return nil, err
	}
	var gold, characterRevision int64
	if err := DB.QueryRow(`SELECT gold_bank,state_revision FROM characters WHERE id=$1`, charID).Scan(&gold, &characterRevision); err != nil {
		return nil, err
	}
	result.Settlement = settlement
	result.ResourceInventory = snapshot
	result.GoldBank = gold
	result.CharacterRevision = characterRevision
	return result, nil
}

func hydrateSettlementAutomationResult(charID string, result *game.SettlementAutomationResult) (*game.SettlementAutomationResult, error) {
	if result == nil {
		result = &game.SettlementAutomationResult{}
	}
	settlement, err := GetSettlementState(charID)
	if err != nil {
		return nil, err
	}
	snapshot, err := GetCharacterResourceSnapshot(charID)
	if err != nil {
		return nil, err
	}
	var gold, characterRevision int64
	if err := DB.QueryRow(`SELECT gold_bank,state_revision FROM characters WHERE id=$1`, charID).Scan(&gold, &characterRevision); err != nil {
		return nil, err
	}
	result.Settlement = settlement
	result.ResourceInventory = snapshot
	result.GoldBank = gold
	result.CharacterRevision = characterRevision
	return result, nil
}

func CancelHeroDesire(charID, desireID, requestID string) (*game.SettlementAutomationResult, error) {
	if desireID == "" {
		return nil, fmt.Errorf("ambição obrigatória")
	}
	if requestID == "" {
		return nil, fmt.Errorf("request_id obrigatório para cancelar a ambição")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var settlementID, state string
	var residentID sql.NullString
	var reservedGold int64
	if err := tx.QueryRow(`
		SELECT desire.settlement_id::text,desire.state,desire.assigned_resident_id::text,desire.reserved_gold
		FROM hero_desires desire
		JOIN settlements settlement ON settlement.id=desire.settlement_id
		WHERE settlement.character_id=$1 AND desire.id=$2
		FOR UPDATE OF desire`, charID, desireID).Scan(&settlementID, &state, &residentID, &reservedGold); err != nil {
		return nil, fmt.Errorf("ambição não encontrada")
	}

	cancelResult := &game.SettlementAutomationResult{
		EventType: "HERO_DESIRE_CANCELLED",
		LogText:   "Ambição cancelada.",
	}

	// Retry idempotente: a primeira transação já devolveu tudo. O registro
	// cancelado permanece justamente para que repetir o request nunca devolva
	// recursos ou ouro uma segunda vez.
	if state == game.SettlementDesireCancelled {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		cancelResult.Changed = false
		return hydrateSettlementAutomationResult(charID, cancelResult)
	}

	if state == game.SettlementDesireCompleted || state == game.SettlementDesireExhausted {
		// Limpar a ficha não remove resultados concluídos: o Arsenal é
		// independente. Não existe reembolso porque a tentativa já terminou.
		if _, err := tx.Exec(`DELETE FROM hero_desires WHERE id=$1`, desireID); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`UPDATE settlements SET revision=revision+1,updated_at=NOW() WHERE id=$1`, settlementID); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		cancelResult.Changed = true
		cancelResult.LogText = "Ambição concluída removida da fila. O resultado já produzido permanece protegido."
		return hydrateSettlementAutomationResult(charID, cancelResult)
	}

	if state == game.SettlementDesireCrafting {
		// O finalizador usa o mesmo FOR UPDATE em hero_desires. Cancelar e
		// concluir são mutuamente exclusivos: nunca produzimos o item e também
		// devolvemos os insumos da mesma tentativa.
		rows, err := tx.Query(`SELECT resource_key,quantity FROM hero_desire_resource_reservations WHERE desire_id=$1 ORDER BY resource_key FOR UPDATE`, desireID)
		if err != nil {
			return nil, err
		}
		reserved := make([]game.ResourceAmount, 0, 8)
		for rows.Next() {
			var amount game.ResourceAmount
			if err := rows.Scan(&amount.Key, &amount.Quantity); err != nil {
				rows.Close()
				return nil, err
			}
			reserved = append(reserved, amount)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, err
		}
		if err := rows.Close(); err != nil {
			return nil, err
		}

		if len(reserved) > 0 {
			capacity, err := campStorageCapacityTx(tx, charID)
			if err != nil {
				return nil, err
			}
			mutation, err := AddCharacterResourcesTx(tx, charID, reserved, capacity)
			if err != nil {
				return nil, err
			}
			ledgerID := "desire_cancel:" + desireID
			if err := recordResourceLedgerTx(tx, charID, ledgerID, "hero_desire_cancel_refund", desireID, mutation.Accepted); err != nil {
				return nil, err
			}
			if err := storePendingResourcesTx(tx, charID, "hero_desire_cancel", desireID, mutation.Overflow); err != nil {
				return nil, err
			}
			cancelResult.ResourceInventory = &mutation.Inventory
		}
		if reservedGold > 0 {
			if _, err := tx.Exec(`UPDATE characters SET gold_bank=gold_bank+$2,state_revision=state_revision+1 WHERE id=$1`, charID, reservedGold); err != nil {
				return nil, err
			}
			// A sessão pode ter ganhos ainda não checkpointados. O handler aplica
			// apenas este delta e avança a revisão, em vez de substituir seu saldo
			// pelo snapshot absoluto do PostgreSQL.
			cancelResult.GoldDelta = reservedGold
		}
		if residentID.Valid && residentID.String != "" {
			if _, err := tx.Exec(`UPDATE settlement_residents SET state='idle',updated_at=NOW() WHERE id=$1`, residentID.String); err != nil {
				return nil, err
			}
		}
		if _, err := tx.Exec(`DELETE FROM hero_desire_resource_reservations WHERE desire_id=$1`, desireID); err != nil {
			return nil, err
		}
		cancelResult.LogText = "Produção interrompida. Recursos e ouro reservados foram devolvidos; excedentes ficaram protegidos em Cargas Pendentes."
	}

	if _, err := tx.Exec(`
		UPDATE hero_desires
		SET state='cancelled',blocked_reason='',assigned_resident_id=NULL,current_order_started_at=NULL,
		    current_order_ready_at=NULL,reserved_gold=0,revision=revision+1,updated_at=NOW()
		WHERE id=$1`, desireID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE settlements SET revision=revision+1,updated_at=NOW() WHERE id=$1`, settlementID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	game.IncrementTelemetry("hero_desire_cancelled_total{state=" + state + "}")
	cancelResult.Changed = true
	return hydrateSettlementAutomationResult(charID, cancelResult)
}

func ClaimSettlementArmoryItem(charID, armoryID string) (*game.Item, *Inventory, *game.SettlementState, error) {
	if armoryID == "" {
		return nil, nil, nil, fmt.Errorf("item do Arsenal obrigatório")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, nil, nil, err
	}
	defer tx.Rollback()
	inventory, err := GetCharacterInventoryTx(tx, charID, true)
	if err != nil {
		return nil, nil, nil, err
	}
	character, err := scanLockedCharacter(tx.QueryRow(`SELECT `+characterSnapshotColumns+` FROM characters WHERE id=$1 FOR UPDATE`, charID))
	if err != nil {
		return nil, nil, nil, err
	}
	var raw string
	err = tx.QueryRow(`
		SELECT armory.item FROM settlement_armory armory
		JOIN settlements settlement ON settlement.id=armory.settlement_id
		WHERE settlement.character_id=$1 AND armory.id=$2 AND armory.claimed_at IS NULL
		FOR UPDATE OF armory`, charID, armoryID).Scan(&raw)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("item não encontrado no Arsenal")
	}
	var item game.Item
	if err := json.Unmarshal([]byte(raw), &item); err != nil {
		return nil, nil, nil, err
	}
	capacitySession := &game.GameSession{Character: characterToGame(character), Inventory: inventoryToGame(inventory), ActiveStance: character.ActiveStance}
	if len(inventory.Backpack) >= capacitySession.GetMaxSlotCapacity() || capacitySession.GetTotalWeight()+item.Weight > capacitySession.GetMaxWeightCapacity() {
		return nil, nil, nil, fmt.Errorf("a mochila não possui espaço ou capacidade para este item")
	}
	inventory.Backpack = append(inventory.Backpack, item)
	if err := SaveCharacterInventoryTx(tx, charID, inventory); err != nil {
		return nil, nil, nil, err
	}
	if _, err := tx.Exec(`UPDATE settlement_armory SET claimed_at=NOW() WHERE id=$1`, armoryID); err != nil {
		return nil, nil, nil, err
	}
	if _, err := tx.Exec(`UPDATE settlements SET revision=revision+1,updated_at=NOW() WHERE character_id=$1`, charID); err != nil {
		return nil, nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, nil, err
	}
	settlement, err := GetSettlementState(charID)
	return &item, inventory, settlement, err
}

func formatProfessionName(key string) string {
	if def, exists := game.GetProfessionDefinition(key); exists && def.Name != "" {
		return def.Name
	}
	switch key {
	case "miner":
		return "Minerador"
	case "tracker":
		return "Rastreador"
	case "fisher":
		return "Pescador"
	case "lumberjack":
		return "Lenhador"
	case "farmer":
		return "Agricultor"
	case "blacksmith":
		return "Ferreiro"
	case "jeweler":
		return "Joalheiro"
	case "leatherworker":
		return "Coureiro"
	case "tailor":
		return "Alfaiate"
	case "woodworker":
		return "Marceneiro"
	case "alchemist":
		return "Alquimista"
	case "herbalist":
		return "Herbalista"
	default:
		return key
	}
}

func formatBuildingName(key string) string {
	bDef, ok := game.GetBuildingDefinition(key)
	if ok && bDef.Name != "" {
		return bDef.Name
	}
	switch key {
	case "workbench":
		return "Bancada de Trabalho"
	case "warehouse":
		return "Armazém de Recursos"
	case "campfire":
		return "Fogueira do Acampamento"
	case "adventurer_hut":
		return "Cabana do Aventureiro"
	case "arcane_spring":
		return "Fonte Arcana"
	default:
		return key
	}
}

// ListSettlementAutomationCandidates alimenta um único scheduler global. Ele
// retorna apenas personagens com coleta vencida, craft automático pronto,
// Ambição recém-enfileirada ou obra concluída; conexões sem trabalho não
// consultam o banco periodicamente. Estados bloqueados voltam a ser avaliados
// pelas mutações que podem fornecer recursos, sem polling permanente.
func ListSettlementAutomationCandidates(now time.Time, limit int) ([]string, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := DB.Query(`
		SELECT character_id::text FROM (
			SELECT activity.character_id
			FROM character_activities activity
			WHERE activity.state IN ('running','claimable') AND activity.ends_at <= $1
			UNION
			SELECT settlement.character_id
			FROM hero_desires desire
			JOIN settlements settlement ON settlement.id=desire.settlement_id
			WHERE (desire.state='crafting' AND desire.current_order_ready_at <= $1)
			   OR (desire.state='queued' AND desire.updated_at <= $1 - INTERVAL '3 seconds')
			UNION
			SELECT building.character_id
			FROM character_camp_buildings building
			WHERE building.upgrade_target_level IS NOT NULL AND building.upgrade_ends_at <= $1
		) candidates
		LIMIT $2`, now.UTC(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]string, 0, limit)
	for rows.Next() {
		var charID string
		if err := rows.Scan(&charID); err != nil {
			return nil, err
		}
		result = append(result, charID)
	}
	return result, rows.Err()
}
