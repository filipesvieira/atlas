package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/atlas/backend/pkg/game"
)

// DeveloperPresetResult resume as mutações deliberadamente explícitas do
// ambiente de testes. O recurso só é exposto pelo servidor quando os dev tools
// estão habilitados e o JWT pertence a um administrador.
type DeveloperPresetResult struct {
	CharacterID       string    `json:"character_id"`
	PresetMode        string    `json:"preset_mode"`
	SettlementStage   string    `json:"settlement_stage"`
	ResidentsPrepared int       `json:"residents_prepared"`
	ResourcesGranted  int       `json:"resources_granted"`
	RecipesUnlocked   int       `json:"recipes_unlocked"`
	Blueprints        int       `json:"blueprints_unlocked"`
	ProfessionLevel   int       `json:"profession_level"`
	TimersFinished    int64     `json:"timers_finished"`
	AppliedAt         time.Time `json:"applied_at"`
}

const (
	DeveloperPresetProgress      = "progress"
	DeveloperPresetCity          = "city"
	DeveloperPresetKingdom       = "kingdom"
	DeveloperPresetKingdomStress = "kingdom_stress"
)

func normalizeDeveloperPresetMode(mode string) string {
	switch mode {
	case DeveloperPresetCity, DeveloperPresetKingdom, DeveloperPresetKingdomStress:
		return mode
	default:
		return DeveloperPresetProgress
	}
}

// ApplyDeveloperPreset preserva o contrato anterior e usa o cenário de
// progressão. O endpoint administrativo pode selecionar cenários territoriais.
func ApplyDeveloperPreset(charID string, now time.Time) (*DeveloperPresetResult, error) {
	return ApplyDeveloperPresetMode(charID, now, DeveloperPresetProgress)
}

// ApplyDeveloperPresetMode prepara um personagem para QA sem criar regras
// especiais dentro do motor de jogo. Recursos, receitas, profissões e estado
// continuam usando as tabelas normais; por isso o mesmo personagem exercita os
// fluxos reais de craft, coleta, construção e combate.
func ApplyDeveloperPresetMode(charID string, now time.Time, mode string) (*DeveloperPresetResult, error) {
	mode = normalizeDeveloperPresetMode(mode)
	if charID == "" {
		return nil, fmt.Errorf("character_id obrigatório")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if err := EnsureCharacterCamp(charID); err != nil {
		return nil, err
	}
	if err := ensureEconomyRows(charID); err != nil {
		return nil, err
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}

	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	regions := game.ListExpeditionRegions()
	unlockedRegions := make([]string, 0, len(regions))
	for _, region := range regions {
		unlockedRegions = append(unlockedRegions, region.ID)
	}
	unlockedJSON, err := json.Marshal(unlockedRegions)
	if err != nil {
		return nil, err
	}
	allSkills := []string{"whirlwind", "multishot", "brutal_strike", "sniper_shot", "fireball", "ice_shard", "divine_heal"}
	allSkillsJSON, err := json.Marshal(allSkills)
	if err != nil {
		return nil, err
	}
	result, err := tx.Exec(`
		UPDATE characters
		SET level=GREATEST(level,100),experience=0,health=3600,max_health=3600,mana=1730,max_mana=1730,
		    gold_bank=GREATEST(gold_bank,100000000),str=GREATEST(str,100),dex=GREATEST(dex,100),
		    int_stat=GREATEST(int_stat,100),vit=GREATEST(vit,100),unspent_points=GREATEST(unspent_points,100),
		    unlocked_regions=$2::jsonb,learned_skills=$3::jsonb,highest_level_ever=GREATEST(highest_level_ever,100),progression_version=GREATEST(progression_version,2),
		    is_expedition_active=FALSE,current_stage=1,is_boss_stage=FALSE,state_revision=state_revision+1
		WHERE id=$1`, charID, string(unlockedJSON), string(allSkillsJSON))
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, fmt.Errorf("personagem de teste não encontrado")
	}

	// O Armazém 3 comporta o kit inteiro, enquanto as outras construções
	// permanecem no estado atual para ainda ser possível testar suas melhorias.
	if _, err := tx.Exec(`
		UPDATE character_camp_buildings
		SET level=3,upgrade_target_level=NULL,upgrade_started_at=NULL,upgrade_ends_at=NULL,updated_at=$2
		WHERE character_id=$1 AND building_key='warehouse'`, charID, now); err != nil {
		return nil, err
	}

	resourceCount := 0
	for _, resource := range game.ListResourceDefinitions() {
		quantity := int64(50000)
		if !resource.CountsTowardStorage {
			quantity = 500
		}
		if resource.MaxStack > 0 && quantity > resource.MaxStack {
			quantity = resource.MaxStack
		}
		if _, err := tx.Exec(`
			INSERT INTO character_resources(character_id,resource_key,quantity,updated_at)
			VALUES($1,$2,$3,$4)
			ON CONFLICT(character_id,resource_key) DO UPDATE
			SET quantity=GREATEST(character_resources.quantity,EXCLUDED.quantity),updated_at=EXCLUDED.updated_at`, charID, resource.Key, quantity, now); err != nil {
			return nil, err
		}
		resourceCount++
	}

	recipeCount := 0
	for _, recipe := range game.ListRecipeDefinitions() {
		if _, err := tx.Exec(`
			INSERT INTO character_recipe_unlocks(character_id,recipe_key,source_kind,source_key,unlocked_at)
			VALUES($1,$2,'developer_preset','qa',$3)
			ON CONFLICT(character_id,recipe_key) DO NOTHING`, charID, recipe.Key, now); err != nil {
			return nil, err
		}
		recipeCount++
	}

	blueprintCount := 0
	for _, building := range game.ListBuildingDefinitions() {
		if _, err := tx.Exec(`
			INSERT INTO character_building_blueprints(character_id,building_key,unlocked_max_level,source_key,discovered_at)
			VALUES($1,$2,$3,'developer_preset',$4)
			ON CONFLICT(character_id,building_key) DO UPDATE SET unlocked_max_level=GREATEST(character_building_blueprints.unlocked_max_level,EXCLUDED.unlocked_max_level)`, charID, building.Key, building.MaxLevel, now); err != nil {
			return nil, err
		}
		blueprintCount++
	}

	settlementStage := settlementStageKeyTx(tx, charID)
	residentTarget := game.SettlementPioneerCount
	_ = tx.QueryRow(`SELECT COUNT(*) FROM settlement_residents resident JOIN settlements settlement ON settlement.id=resident.settlement_id WHERE settlement.character_id=$1`, charID).Scan(&residentTarget)
	if residentTarget < game.SettlementPioneerCount {
		residentTarget = game.SettlementPioneerCount
	}
	if mode != DeveloperPresetProgress {
		var err error
		settlementStage, residentTarget, err = applyDeveloperTerritoryScenarioTx(tx, charID, mode, now)
		if err != nil {
			return nil, err
		}
	}

	// Povoa todos os 7 pioneiros no assentamento do personagem de teste
	var settlementID string
	if err := tx.QueryRow(`SELECT id FROM settlements WHERE character_id=$1`, charID).Scan(&settlementID); err == nil {
		for _, pioneer := range pioneerSeeds {
			residentName := generatedPioneerName(charID, pioneer)
			traitsJSON, _ := json.Marshal(pioneer.Traits)
			var residentID string
			if err := tx.QueryRow(`
				INSERT INTO settlement_residents(settlement_id,resident_key,name,icon,title,traits)
				VALUES($1,$2,$3,$4,$5,$6)
				ON CONFLICT(settlement_id,resident_key) DO UPDATE SET name=EXCLUDED.name,icon=EXCLUDED.icon,title=EXCLUDED.title
				RETURNING id`, settlementID, pioneer.Key, residentName, pioneer.Icon, pioneer.Title, string(traitsJSON)).Scan(&residentID); err == nil {
				for _, skillKey := range pioneer.Skills {
					_, _ = tx.Exec(`
						INSERT INTO settlement_resident_skills(resident_id,skill_key,level,experience,lifetime_experience)
						VALUES($1,$2,60,0,100000)
						ON CONFLICT(resident_id,skill_key) DO UPDATE SET level=60,updated_at=NOW()`, residentID, skillKey)
				}
			}
		}
	}

	const professionLevel = 60
	if _, err := tx.Exec(`UPDATE character_professions SET level=$2,experience=0,lifetime_experience=GREATEST(lifetime_experience,1),revision=revision+1,updated_at=$3 WHERE character_id=$1`, charID, professionLevel, now); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		UPDATE settlement_resident_skills skill
		SET level=$2,experience=0,lifetime_experience=GREATEST(skill.lifetime_experience,1),revision=skill.revision+1,updated_at=$3
		FROM settlement_residents resident JOIN settlements settlement ON settlement.id=resident.settlement_id
		WHERE skill.resident_id=resident.id AND settlement.character_id=$1`, charID, professionLevel, now); err != nil {
		return nil, err
	}

	var timersFinished int64
	timerStatements := []string{
		`UPDATE character_activities SET ends_at=$2,revision=revision+1,updated_at=$2 WHERE character_id=$1 AND state='running' AND ends_at>$2`,
		`UPDATE character_camp_buildings SET upgrade_ends_at=$2,updated_at=$2 WHERE character_id=$1 AND upgrade_target_level IS NOT NULL AND upgrade_ends_at>$2`,
		`UPDATE hero_desires desire SET current_order_ready_at=$2,revision=desire.revision+1,updated_at=$2 FROM settlements settlement WHERE desire.settlement_id=settlement.id AND settlement.character_id=$1 AND desire.state='crafting' AND desire.current_order_ready_at>$2`,
	}
	for _, statement := range timerStatements {
		update, err := tx.Exec(statement, charID, now)
		if err != nil {
			return nil, err
		}
		if affected, affectedErr := update.RowsAffected(); affectedErr == nil {
			timersFinished += affected
		}
	}
	if _, err := tx.Exec(`UPDATE character_camps SET state_revision=state_revision+1,updated_at=$2 WHERE character_id=$1`, charID, now); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &DeveloperPresetResult{
		CharacterID:       charID,
		PresetMode:        mode,
		SettlementStage:   settlementStage,
		ResidentsPrepared: residentTarget,
		ResourcesGranted:  resourceCount,
		RecipesUnlocked:   recipeCount,
		Blueprints:        blueprintCount,
		ProfessionLevel:   professionLevel,
		TimersFinished:    timersFinished,
		AppliedAt:         now,
	}, nil
}

func applyDeveloperTerritoryScenarioTx(tx *sql.Tx, charID, mode string, now time.Time) (string, int, error) {
	stage := game.SettlementStageCity
	prosperity := int64(1800)
	residentTarget := 18
	if mode == DeveloperPresetKingdom || mode == DeveloperPresetKingdomStress {
		stage = game.SettlementStageKingdom
		prosperity = 5000
		residentTarget = 30
	}
	if mode == DeveloperPresetKingdomStress {
		prosperity = 9000
		residentTarget = 40
	}

	var settlementID string
	if err := tx.QueryRow(`
		UPDATE settlements
		SET stage_key=$2,prosperity=GREATEST(prosperity,$3),stage_updated_at=$4,revision=revision+1,updated_at=$4
		WHERE character_id=$1
		RETURNING id`, charID, stage, prosperity, now).Scan(&settlementID); err != nil {
		return "", 0, fmt.Errorf("preparar estágio territorial QA: %w", err)
	}

	// Garante que todo prédio registrado no catálogo exista e esteja no nível
	// máximo dentro da área do cenário. Quando M5-B registrar novas estruturas,
	// os mesmos presets passam a incluí-las automaticamente.
	rows, err := tx.Query(`SELECT slot_key,building_key,level,COALESCE(upgrade_target_level,0),tile_x,tile_y,rotation FROM character_camp_buildings WHERE character_id=$1 FOR UPDATE`, charID)
	if err != nil {
		return "", 0, err
	}
	occupied := []game.BuildingSlot{}
	byBuilding := map[string]int{}
	for rows.Next() {
		var slot game.BuildingSlot
		if err := rows.Scan(&slot.SlotKey, &slot.BuildingKey, &slot.Level, &slot.UpgradeTargetLevel, &slot.TileX, &slot.TileY, &slot.Rotation); err != nil {
			rows.Close()
			return "", 0, err
		}
		slot.Discovered = true
		byBuilding[slot.BuildingKey] = len(occupied)
		occupied = append(occupied, slot)
	}
	if err := rows.Close(); err != nil {
		return "", 0, err
	}

	for _, definition := range game.ListBuildingDefinitions() {
		if !game.BuildingUnlocksAtStage(definition, stage) && !definition.DefaultUnlocked {
			continue
		}
		targetLevel := game.BuildingMaxLevelForStage(definition, stage)
		if targetLevel <= 0 {
			continue
		}
		if index, ok := byBuilding[definition.Key]; ok {
			// Trocar entre presets QA também precisa ser seguro. Um prédio salvo em
			// uma área exclusiva do Reino não pode permanecer fora dos limites se
			// o administrador voltar o mesmo personagem para o cenário Cidade.
			others := make([]game.BuildingSlot, 0, len(occupied)-1)
			for otherIndex, other := range occupied {
				if otherIndex != index {
					others = append(others, other)
				}
			}
			x, y := occupied[index].TileX, occupied[index].TileY
			if err := game.ValidateCampPlacementForStage(stage, definition.Key, x, y, occupied[index].Rotation, others, ""); err != nil {
				var found bool
				x, y, found = game.FindFirstFreeCampPlacementForStage(stage, definition.Key, occupied[index].Rotation, others)
				if !found {
					return "", 0, fmt.Errorf("cenário QA %s não encontrou espaço para realocar %s", mode, definition.Name)
				}
			}
			occupied[index].Level = targetLevel
			occupied[index].TileX = x
			occupied[index].TileY = y
			if _, err := tx.Exec(`UPDATE character_camp_buildings SET level=$3,tile_x=$4,tile_y=$5,upgrade_target_level=NULL,upgrade_started_at=NULL,upgrade_ends_at=NULL,updated_at=$6 WHERE character_id=$1 AND building_key=$2`, charID, definition.Key, targetLevel, x, y, now); err != nil {
				return "", 0, err
			}
			continue
		}
		x, y, ok := game.FindFirstFreeCampPlacementForStage(stage, definition.Key, 0, occupied)
		if !ok {
			return "", 0, fmt.Errorf("cenário QA %s não encontrou espaço para %s", mode, definition.Name)
		}
		slot := game.BuildingSlot{SlotKey: game.CampBuildingInstanceKey(definition.Key), BuildingKey: definition.Key, Level: targetLevel, TileX: x, TileY: y, Discovered: true}
		if _, err := tx.Exec(`INSERT INTO character_camp_buildings(character_id,slot_key,building_key,level,tile_x,tile_y,rotation,updated_at) VALUES($1,$2,$3,$4,$5,$6,0,$7) ON CONFLICT(character_id,building_key) DO UPDATE SET level=EXCLUDED.level,updated_at=EXCLUDED.updated_at`, charID, slot.SlotKey, slot.BuildingKey, slot.Level, slot.TileX, slot.TileY, now); err != nil {
			return "", 0, err
		}
		byBuilding[definition.Key] = len(occupied)
		occupied = append(occupied, slot)
	}

	qaSkills := []string{"lumberjack", "miner", "fisher", "blacksmith", "cook", "alchemist", "woodworker", "jeweler"}
	for index := game.SettlementPioneerCount + 1; index <= residentTarget; index++ {
		residentKey := fmt.Sprintf("qa_resident_%02d", index)
		residentName := fmt.Sprintf("Morador QA %02d", index)
		var residentID string
		if err := tx.QueryRow(`
			INSERT INTO settlement_residents(settlement_id,resident_key,name,icon,title,traits,happiness,state,updated_at)
			VALUES($1,$2,$3,'🧑','Morador de Teste','["QA territorial"]'::jsonb,85,'idle',$4)
			ON CONFLICT(settlement_id,resident_key) DO UPDATE SET name=EXCLUDED.name,happiness=EXCLUDED.happiness,state='idle',updated_at=EXCLUDED.updated_at
			RETURNING id`, settlementID, residentKey, residentName, now).Scan(&residentID); err != nil {
			return "", 0, err
		}
		skillKey := qaSkills[(index-game.SettlementPioneerCount-1)%len(qaSkills)]
		if _, err := tx.Exec(`INSERT INTO settlement_resident_skills(resident_id,skill_key,level,experience,lifetime_experience,updated_at) VALUES($1,$2,60,0,100000,$3) ON CONFLICT(resident_id,skill_key) DO UPDATE SET level=60,lifetime_experience=GREATEST(settlement_resident_skills.lifetime_experience,100000),updated_at=EXCLUDED.updated_at`, residentID, skillKey, now); err != nil {
			return "", 0, err
		}
	}

	if _, err := tx.Exec(`UPDATE character_camps SET layout_version=4,state_revision=state_revision+1,updated_at=$2 WHERE character_id=$1`, charID, now); err != nil {
		return "", 0, err
	}
	return stage, residentTarget, nil
}
