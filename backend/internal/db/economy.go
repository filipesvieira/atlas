package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/atlas/backend/pkg/game"
)

func ensureEconomyRows(charID string) error {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, profession := range game.ListProfessionDefinitions() {
		if _, err := tx.Exec(`INSERT INTO character_professions(character_id,profession_key) VALUES($1,$2) ON CONFLICT DO NOTHING`, charID, profession.Key); err != nil {
			return err
		}
	}
	for _, recipe := range game.ListRecipeDefinitions() {
		if recipe.DefaultUnlocked {
			if _, err := tx.Exec(`INSERT INTO character_recipe_unlocks(character_id,recipe_key,source_kind) VALUES($1,$2,'default') ON CONFLICT DO NOTHING`, charID, recipe.Key); err != nil {
				return err
			}
		} else if recipe.UnlockTrophyKey != "" {
			if _, err := tx.Exec(`
				INSERT INTO character_recipe_unlocks(character_id,recipe_key,source_kind,source_key)
				SELECT $1::uuid,$2::text,'boss_trophy',$3::text
					WHERE EXISTS(SELECT 1 FROM character_resources WHERE character_id=$1::uuid AND resource_key=$3::text AND quantity>0)
					   OR EXISTS(SELECT 1 FROM character_resource_ledger WHERE character_id=$1::uuid AND resource_key=$3::text AND delta>0)
				ON CONFLICT DO NOTHING`, charID, recipe.Key, recipe.UnlockTrophyKey); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func scanGatheringActivity(row rowScanner) (*game.GatheringActivity, error) {
	activity := &game.GatheringActivity{}
	var snapshotJSON string
	var resultJSON sql.NullString
	err := row.Scan(&activity.ID, &activity.CharacterID, &activity.ExpeditionKey, &activity.ProfessionKey,
		&activity.State, &activity.DurationSeconds, &activity.StartedAt, &activity.EndsAt,
		&snapshotJSON, &resultJSON, &activity.ProfessionXPApplied, &activity.Revision,
		&activity.ResidentID, &activity.ResidentName, &activity.WageReserved,
		&activity.WagePaid, &activity.WageRuleVersion)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(snapshotJSON), &activity.Snapshot); err != nil {
		return nil, fmt.Errorf("snapshot de coleta corrompido: %w", err)
	}
	if resultJSON.Valid && resultJSON.String != "" && resultJSON.String != "null" {
		var result game.GatheringResult
		if err := json.Unmarshal([]byte(resultJSON.String), &result); err != nil {
			return nil, fmt.Errorf("resultado de coleta corrompido: %w", err)
		}
		activity.Result = &result
	}
	return activity, nil
}

const gatheringActivityColumns = `id,character_id,expedition_key,profession_key,state,duration_seconds,started_at,ends_at,snapshot,result,profession_xp_applied,revision,COALESCE(resident_id::text,''),resident_name_snapshot,wage_reserved,wage_paid,wage_rule_version`

func GetCharacterEconomyState(charID string) (*game.EconomyState, error) {
	if err := ensureEconomyRows(charID); err != nil {
		return nil, err
	}
	if err := ensureSettlementRows(charID); err != nil {
		return nil, err
	}
	state := &game.EconomyState{Professions: []game.ProfessionProgress{}, ActiveGatherings: []game.GatheringActivity{}, PendingGathering: []game.ResourceAmount{}, UnlockedRecipes: []string{}, PendingCraftItems: []game.Item{}, PendingResources: []game.ResourceAmount{}, PendingBatches: []game.PendingResourceBatch{}, ActiveBuffs: []game.ActiveBuff{}}
	rows, err := DB.Query(`SELECT profession_key,level,experience,revision FROM character_professions WHERE character_id=$1 ORDER BY profession_key`, charID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var p game.ProfessionProgress
		if err := rows.Scan(&p.ProfessionKey, &p.Level, &p.Experience, &p.Revision); err != nil {
			rows.Close()
			return nil, err
		}
		p.XPRequired = game.GetRequiredProfessionXP(p.Level)
		state.Professions = append(state.Professions, p)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`SELECT resource_key,SUM(quantity) FROM character_pending_resource_rewards WHERE character_id=$1 GROUP BY resource_key ORDER BY resource_key`, charID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var reward game.ResourceAmount
		if err := rows.Scan(&reward.Key, &reward.Quantity); err != nil {
			rows.Close()
			return nil, err
		}
		state.PendingResources = append(state.PendingResources, reward)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`SELECT source_kind,source_key,resource_key,quantity,created_at,updated_at FROM character_pending_resource_rewards WHERE character_id=$1 ORDER BY created_at,source_kind,source_key,resource_key`, charID)
	if err != nil {
		return nil, err
	}
	batchIndexes := make(map[string]int)
	for rows.Next() {
		var sourceKind, sourceKey string
		var reward game.ResourceAmount
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&sourceKind, &sourceKey, &reward.Key, &reward.Quantity, &createdAt, &updatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		batchKey := sourceKind + "\x00" + sourceKey
		index, exists := batchIndexes[batchKey]
		if !exists {
			index = len(state.PendingBatches)
			batchIndexes[batchKey] = index
			state.PendingBatches = append(state.PendingBatches, game.PendingResourceBatch{
				SourceKind: sourceKind,
				SourceKey:  sourceKey,
				Resources:  []game.ResourceAmount{},
				CreatedAt:  createdAt,
				UpdatedAt:  updatedAt,
			})
		}
		batch := &state.PendingBatches[index]
		batch.Resources = append(batch.Resources, reward)
		batch.Quantity += reward.Quantity
		if updatedAt.After(batch.UpdatedAt) {
			batch.UpdatedAt = updatedAt
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`SELECT `+gatheringActivityColumns+` FROM character_activities WHERE character_id=$1 AND state IN ('running','claimable','pending_storage') ORDER BY created_at`, charID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		activity, scanErr := scanGatheringActivity(rows)
		if scanErr != nil {
			rows.Close()
			return nil, scanErr
		}
		if activity.State == game.GatheringStateRunning && !time.Now().UTC().Before(activity.EndsAt) {
			activity.State = game.GatheringStateClaimable
		}
		state.ActiveGatherings = append(state.ActiveGatherings, *activity)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if len(state.ActiveGatherings) > 0 {
		legacyFirst := state.ActiveGatherings[0]
		state.ActiveGathering = &legacyFirst
	}

	rows, err = DB.Query(`SELECT resource_key,SUM(quantity) FROM character_pending_gathering_rewards WHERE character_id=$1 GROUP BY resource_key ORDER BY resource_key`, charID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var reward game.ResourceAmount
		if err := rows.Scan(&reward.Key, &reward.Quantity); err != nil {
			rows.Close()
			return nil, err
		}
		state.PendingGathering = append(state.PendingGathering, reward)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`SELECT recipe_key FROM character_recipe_unlocks WHERE character_id=$1 ORDER BY recipe_key`, charID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			rows.Close()
			return nil, err
		}
		state.UnlockedRecipes = append(state.UnlockedRecipes, key)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	rows, err = DB.Query(`SELECT item FROM pending_crafted_items WHERE character_id=$1 ORDER BY created_at`, charID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			rows.Close()
			return nil, err
		}
		var item game.Item
		if err := json.Unmarshal([]byte(raw), &item); err != nil {
			rows.Close()
			return nil, fmt.Errorf("item produzido pendente corrompido: %w", err)
		}
		state.PendingCraftItems = append(state.PendingCraftItems, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	settlement, err := GetSettlementState(charID)
	if err != nil {
		return nil, err
	}
	state.Settlement = settlement
	buffs, err := GetCharacterActiveBuffs(charID, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	state.ActiveBuffs = buffs
	return state, nil
}

func queuePendingItemTx(tx *sql.Tx, charID string, item game.Item, sourceKind, referenceKey string) error {
	if tx == nil || charID == "" || item.ID == "" {
		return fmt.Errorf("item pendente inválido")
	}
	if len(sourceKind) > 40 || len(referenceKey) > 160 {
		return fmt.Errorf("metadados do item pendente excedem o limite")
	}
	itemJSON, err := json.Marshal(item)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`INSERT INTO pending_crafted_items(character_id,transaction_id,item,source_kind,reference_key) VALUES($1,NULL,$2,$3,$4) ON CONFLICT DO NOTHING`, charID, string(itemJSON), sourceKind, referenceKey)
	return err
}

// QueuePendingItem guarda recompensas protegidas quando mochila e baú estão
// cheios. A chave única do item torna a operação segura em reconexões/retries.
func QueuePendingItem(charID string, item game.Item, sourceKind, referenceKey string) error {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := queuePendingItemTx(tx, charID, item, sourceKind, referenceKey); err != nil {
		return err
	}
	return tx.Commit()
}

// ClaimPendingResources resgata excedentes de caça/offline sem recalcular os
// drops. O request_id torna a resposta idempotente e o restante volta à carga.
func ClaimPendingResources(charID, requestID string) (*game.ResourceMutationResult, error) {
	if requestID == "" {
		return nil, fmt.Errorf("request_id obrigatório")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var previousJSON string
	if err := tx.QueryRow(`SELECT result FROM pending_resource_claim_requests WHERE character_id=$1 AND request_id=$2`, charID, requestID).Scan(&previousJSON); err == nil {
		var previous game.ResourceMutationResult
		if err := json.Unmarshal([]byte(previousJSON), &previous); err != nil {
			return nil, err
		}
		return &previous, tx.Commit()
	} else if err != sql.ErrNoRows {
		return nil, err
	}
	// Ordem global: acampamento -> carga pendente -> recursos. O fluxo de drop
	// também trava o acampamento antes de materializar overflow, evitando deadlock.
	capacity, err := campStorageCapacityTx(tx, charID)
	if err != nil {
		return nil, err
	}
	rows, err := tx.Query(`SELECT source_kind,source_key,resource_key,quantity FROM character_pending_resource_rewards WHERE character_id=$1 ORDER BY created_at,source_kind,source_key,resource_key FOR UPDATE`, charID)
	if err != nil {
		return nil, err
	}
	type pendingResourceRow struct {
		SourceKind string
		SourceKey  string
		Resource   game.ResourceAmount
	}
	pendingRows := make([]pendingResourceRow, 0)
	for rows.Next() {
		var pending pendingResourceRow
		if err := rows.Scan(&pending.SourceKind, &pending.SourceKey, &pending.Resource.Key, &pending.Resource.Quantity); err != nil {
			rows.Close()
			return nil, err
		}
		pendingRows = append(pendingRows, pending)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if len(pendingRows) == 0 {
		return nil, fmt.Errorf("não há recursos pendentes")
	}

	pendingByKey := make(map[string]int64)
	for _, pending := range pendingRows {
		pendingByKey[pending.Resource.Key] += pending.Resource.Quantity
	}
	pendingKeys := make([]string, 0, len(pendingByKey))
	for key := range pendingByKey {
		pendingKeys = append(pendingKeys, key)
	}
	sort.Strings(pendingKeys)
	pending := make([]game.ResourceAmount, 0, len(pendingKeys))
	for _, key := range pendingKeys {
		pending = append(pending, game.ResourceAmount{Key: key, Quantity: pendingByKey[key]})
	}
	mutationValue, err := AddCharacterResourcesTx(tx, charID, pending, capacity)
	if err != nil {
		return nil, err
	}
	mutation := &mutationValue
	if _, err := tx.Exec(`DELETE FROM character_pending_resource_rewards WHERE character_id=$1`, charID); err != nil {
		return nil, err
	}
	acceptedRemaining := make(map[string]int64)
	for _, accepted := range mutation.Accepted {
		acceptedRemaining[accepted.Key] = accepted.Quantity
	}
	// A procedência original é preservada. Isso impede que uma nova
	// tentativa transforme combate/coleta em um lote genérico sem origem. A
	// aceitação é distribuída na mesma ordem estável usada pelo SELECT.
	for _, pendingRow := range pendingRows {
		acceptedFromRow := pendingRow.Resource.Quantity
		if acceptedFromRow > acceptedRemaining[pendingRow.Resource.Key] {
			acceptedFromRow = acceptedRemaining[pendingRow.Resource.Key]
		}
		acceptedRemaining[pendingRow.Resource.Key] -= acceptedFromRow
		overflowQuantity := pendingRow.Resource.Quantity - acceptedFromRow
		if overflowQuantity <= 0 {
			continue
		}
		if err := storePendingResourcesTx(tx, charID, pendingRow.SourceKind, pendingRow.SourceKey, []game.ResourceAmount{{Key: pendingRow.Resource.Key, Quantity: overflowQuantity}}); err != nil {
			return nil, err
		}
	}
	if err := recordResourceLedgerTx(tx, charID, requestID, "pending_resource_claim", "deposit", mutation.Accepted); err != nil {
		return nil, err
	}
	resultJSON, err := json.Marshal(mutation)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO pending_resource_claim_requests(character_id,request_id,result) VALUES($1,$2,$3)`, charID, requestID, string(resultJSON)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return mutation, nil
}

func StartGatheringActivity(charID, expeditionKey string, durationSeconds int64, requestID string) (*game.GatheringActivity, error) {
	if !game.CurrentEconomyPolicy().GatheringEnabled {
		return nil, fmt.Errorf("expedições de coleta estão temporariamente desabilitadas")
	}
	definition, exists := game.GetGatheringExpedition(expeditionKey)
	if !exists {
		return nil, fmt.Errorf("expedição de coleta desconhecida: %s", expeditionKey)
	}
	if !definition.PlayerSelectable {
		return nil, fmt.Errorf("esta expedição legada não aceita novas ordens; escolha um destino de coleta")
	}
	if requestID == "" || !game.IsGatheringDurationAllowed(definition, durationSeconds) {
		return nil, fmt.Errorf("requisição ou duração de coleta inválida")
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

	if existing, scanErr := scanGatheringActivity(tx.QueryRow(`SELECT `+gatheringActivityColumns+` FROM character_activities WHERE character_id=$1 AND request_id=$2`, charID, requestID)); scanErr == nil {
		return existing, tx.Commit()
	}
	// Ordem canônica de locks econômicos: assentamento -> personagem -> morador.
	// Transferências da Tesouraria usam a mesma ordem, evitando deadlock entre
	// financiamento automático, Ambições e novas coletas concorrentes.
	if _, err := lockSettlementTreasuryTx(tx, charID); err != nil {
		return nil, err
	}
	var lockedHeroGold int64
	if err := tx.QueryRow(`SELECT gold_bank FROM characters WHERE id=$1 FOR UPDATE`, charID).Scan(&lockedHeroGold); err != nil {
		return nil, err
	}
	var residentID, residentName string
	var level, toolTier int
	if err := tx.QueryRow(`
		SELECT resident.id,resident.name,skill.level
		FROM settlements settlement
		JOIN settlement_residents resident ON resident.settlement_id=settlement.id
		JOIN settlement_resident_skills skill ON skill.resident_id=resident.id AND skill.skill_key=$2
		WHERE settlement.character_id=$1
		  AND resident.state='idle'
		  AND NOT EXISTS(SELECT 1 FROM character_activities active WHERE active.resident_id=resident.id AND active.state IN ('running','claimable'))
		  AND NOT EXISTS(SELECT 1 FROM hero_desires desire WHERE desire.assigned_resident_id=resident.id AND desire.state='crafting')
		ORDER BY skill.level DESC,resident.arrived_at
		LIMIT 1 FOR UPDATE OF resident,skill`, charID, definition.ProfessionKey).Scan(&residentID, &residentName, &level); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("nenhum morador com a especialidade %s está disponível", definition.ProfessionKey)
		}
		return nil, err
	}
	if level < definition.RequiredProfessionLevel {
		return nil, fmt.Errorf("%s requer nível %d de profissão", definition.DisplayName, definition.RequiredProfessionLevel)
	}
	settlementID, wageReserved, err := reserveGatheringWageTx(tx, charID, residentID, residentName, definition.ProfessionKey, requestID, durationSeconds, level, definition.Tier)
	if err != nil {
		return nil, err
	}
	startedAt := time.Now().UTC()
	seed, err := secureServerSeed()
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE settlement_residents SET state='collecting',updated_at=NOW() WHERE id=$1`, residentID); err != nil {
		return nil, err
	}
	snapshot := game.GatheringSnapshot{ProfessionLevel: level, ToolTier: toolTier, ContentVersion: definition.ContentVersion, Seed: seed, ExpeditionSnapshot: game.CloneGatheringExpedition(definition)}
	snapshotJSON, err := json.Marshal(snapshot)
	if err != nil {
		return nil, err
	}
	activity := &game.GatheringActivity{CharacterID: charID, ResidentID: residentID, ResidentName: residentName, ExpeditionKey: expeditionKey, ProfessionKey: definition.ProfessionKey, State: game.GatheringStateRunning, DurationSeconds: durationSeconds, StartedAt: startedAt, EndsAt: startedAt.Add(time.Duration(durationSeconds) * time.Second), Snapshot: snapshot, WageReserved: wageReserved, WageRuleVersion: game.SettlementEconomyVersion}
	err = tx.QueryRow(`INSERT INTO character_activities(character_id,activity_kind,expedition_key,profession_key,state,duration_seconds,started_at,ends_at,snapshot,request_id,resident_id,resident_name_snapshot,wage_reserved,wage_rule_version) VALUES($1,'gathering',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id,revision`, charID, expeditionKey, definition.ProfessionKey, activity.State, durationSeconds, activity.StartedAt, activity.EndsAt, string(snapshotJSON), requestID, residentID, residentName, wageReserved, game.SettlementEconomyVersion).Scan(&activity.ID, &activity.Revision)
	if err != nil {
		return nil, err
	}
	if wageReserved > 0 {
		if _, err := tx.Exec(`INSERT INTO settlement_payroll(activity_id,settlement_id,resident_id,resident_name_snapshot,profession_key,wage_reserved,economy_version) VALUES($1,$2,$3,$4,$5,$6,$7)`, activity.ID, settlementID, residentID, residentName, definition.ProfessionKey, wageReserved, game.SettlementEconomyVersion); err != nil {
			return nil, err
		}
	}
	if _, err := tx.Exec(`UPDATE settlements SET revision=revision+1,updated_at=NOW() WHERE character_id=$1`, charID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	game.IncrementTelemetry("gathering_started_total{profession=" + definition.ProfessionKey + "}")
	return activity, nil
}

func CancelGatheringActivity(charID, activityID, requestID string) (*game.GatheringResult, error) {
	if requestID == "" {
		return nil, fmt.Errorf("request_id obrigatório")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var previousJSON string
	if err := tx.QueryRow(`SELECT result FROM gathering_claim_requests WHERE character_id=$1 AND request_id=$2`, charID, requestID).Scan(&previousJSON); err == nil {
		var previous game.GatheringResult
		if err := json.Unmarshal([]byte(previousJSON), &previous); err != nil {
			return nil, err
		}
		return &previous, tx.Commit()
	} else if err != sql.ErrNoRows {
		return nil, err
	}
	activityQuery := `SELECT ` + gatheringActivityColumns + ` FROM character_activities WHERE character_id=$1 AND state='running'`
	activityArgs := []any{charID}
	if activityID != "" {
		activityQuery += ` AND id=$2`
		activityArgs = append(activityArgs, activityID)
	}
	activityQuery += ` ORDER BY created_at LIMIT 1 FOR UPDATE`
	activity, err := scanGatheringActivity(tx.QueryRow(activityQuery, activityArgs...))
	if err != nil {
		return nil, fmt.Errorf("nenhuma coleta em andamento")
	}
	result := game.CalculateGatheringResult(*activity, time.Now().UTC())
	result.WasCancelled = true
	result.WageReserved = activity.WageReserved
	paid, refunded, err := settleGatheringPayrollTx(tx, charID, activity, time.Now().UTC(), true, requestID)
	if err != nil {
		return nil, err
	}
	result.WagePaid = paid
	result.WageRefunded = refunded
	var profession game.ProfessionProgress
	if err := tx.QueryRow(`SELECT profession_key,level,experience,revision FROM character_professions WHERE character_id=$1 AND profession_key=$2 FOR UPDATE`, charID, activity.ProfessionKey).Scan(&profession.ProfessionKey, &profession.Level, &profession.Experience, &profession.Revision); err != nil {
		return nil, err
	}
	result.ProfessionBefore = profession.Level
	profession = game.ApplyProfessionExperience(profession, result.ProfessionXP)
	result.ProfessionAfter = profession.Level
	if result.ProfessionXP > 0 {
		if _, err := tx.Exec(`UPDATE character_professions SET level=$3,experience=$4,lifetime_experience=lifetime_experience+$5,revision=revision+1,updated_at=NOW() WHERE character_id=$1 AND profession_key=$2`, charID, profession.ProfessionKey, profession.Level, profession.Experience, result.ProfessionXP); err != nil {
			return nil, err
		}
	}
	if activity.ResidentID != "" && result.ProfessionXP > 0 {
		var residentProgress game.ProfessionProgress
		residentProgress.ProfessionKey = activity.ProfessionKey
		if err := tx.QueryRow(`SELECT level,experience,revision FROM settlement_resident_skills WHERE resident_id=$1 AND skill_key=$2 FOR UPDATE`, activity.ResidentID, activity.ProfessionKey).Scan(&residentProgress.Level, &residentProgress.Experience, &residentProgress.Revision); err != nil {
			return nil, err
		}
		result.ProfessionBefore = residentProgress.Level
		residentProgress = game.ApplyProfessionExperience(residentProgress, result.ProfessionXP)
		result.ProfessionAfter = residentProgress.Level
		if _, err := tx.Exec(`UPDATE settlement_resident_skills SET level=$3,experience=$4,lifetime_experience=lifetime_experience+$5,revision=revision+1,updated_at=NOW() WHERE resident_id=$1 AND skill_key=$2`, activity.ResidentID, activity.ProfessionKey, residentProgress.Level, residentProgress.Experience, result.ProfessionXP); err != nil {
			return nil, err
		}
	}
	capacity, err := campStorageCapacityTx(tx, charID)
	if err != nil {
		return nil, err
	}
	mutation, err := AddCharacterResourcesTx(tx, charID, result.Rewards, capacity)
	if err != nil {
		return nil, err
	}
	result.Accepted = mutation.Accepted
	result.Pending = mutation.Overflow
	if err := recordResourceLedgerTx(tx, charID, requestID, "gathering_cancel", activity.ExpeditionKey, mutation.Accepted); err != nil {
		return nil, err
	}
	for _, pending := range mutation.Overflow {
		if _, err := tx.Exec(`INSERT INTO character_pending_gathering_rewards(character_id,activity_id,resource_key,quantity) VALUES($1,$2,$3,$4) ON CONFLICT(character_id,activity_id,resource_key) DO UPDATE SET quantity=EXCLUDED.quantity`, charID, activity.ID, pending.Key, pending.Quantity); err != nil {
			return nil, err
		}
	}
	state := game.GatheringStateCancelled
	if len(result.Pending) > 0 {
		state = game.GatheringStatePendingStorage
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE character_activities SET state=$2,result=$3,profession_xp_applied=TRUE,revision=revision+1,claimed_at=NOW(),updated_at=NOW() WHERE id=$1`, activity.ID, state, string(resultJSON)); err != nil {
		return nil, err
	}
	if activity.ResidentID != "" {
		if _, err := tx.Exec(`UPDATE settlement_residents SET state='idle',updated_at=NOW() WHERE id=$1`, activity.ResidentID); err != nil {
			return nil, err
		}
	}
	if _, err := tx.Exec(`UPDATE settlements SET prosperity=prosperity+$2,revision=revision+1,updated_at=NOW() WHERE character_id=$1`, charID, game.GatheringProsperityGain(result.CompletedCycles)); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO gathering_claim_requests(character_id,activity_id,request_id,result) VALUES($1,$2,$3,$4)`, charID, activity.ID, requestID, string(resultJSON)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	game.IncrementTelemetry("gathering_cancelled_total{profession=" + activity.ProfessionKey + "}")
	if len(result.Pending) > 0 {
		game.IncrementTelemetry("gathering_pending_storage_total")
	}
	return &result, nil
}

func campStorageCapacityTx(tx *sql.Tx, charID string) (int64, error) {
	if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
		return 0, err
	}
	var campRevision int64
	if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id=$1 FOR UPDATE`, charID).Scan(&campRevision); err != nil {
		return 0, err
	}
	capacity := game.DefaultBaseResourceStorage
	var level int
	err := tx.QueryRow(`SELECT level FROM character_camp_buildings WHERE character_id=$1 AND building_key='warehouse'`, charID).Scan(&level)
	if err != nil && err != sql.ErrNoRows {
		return 0, err
	}
	if level > 0 {
		if definition, ok := game.GetBuildingDefinition("warehouse"); ok && level <= len(definition.Levels) {
			for _, effect := range definition.Levels[level-1].Effects {
				if effect.Key == "resource_storage" && int64(effect.Value) > capacity {
					capacity = int64(effect.Value)
				}
			}
		}
	}
	return capacity, nil
}

func ClaimGatheringActivity(charID, activityID, requestID string) (*game.GatheringResult, error) {
	if requestID == "" {
		return nil, fmt.Errorf("request_id obrigatório")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var previousJSON string
	if err := tx.QueryRow(`SELECT result FROM gathering_claim_requests WHERE character_id=$1 AND request_id=$2`, charID, requestID).Scan(&previousJSON); err == nil {
		var previous game.GatheringResult
		if err := json.Unmarshal([]byte(previousJSON), &previous); err != nil {
			return nil, err
		}
		return &previous, tx.Commit()
	} else if err != sql.ErrNoRows {
		return nil, err
	}
	activityQuery := `SELECT ` + gatheringActivityColumns + ` FROM character_activities WHERE character_id=$1 AND state IN ('running','claimable','pending_storage')`
	activityArgs := []any{charID}
	if activityID != "" {
		activityQuery += ` AND id=$2`
		activityArgs = append(activityArgs, activityID)
	}
	activityQuery += ` ORDER BY created_at LIMIT 1 FOR UPDATE`
	activity, err := scanGatheringActivity(tx.QueryRow(activityQuery, activityArgs...))
	if err != nil {
		return nil, fmt.Errorf("nenhuma recompensa de coleta disponível")
	}
	if activity.State == game.GatheringStateRunning && time.Now().UTC().Before(activity.EndsAt) {
		return nil, fmt.Errorf("a expedição ainda não terminou")
	}
	// Uma coleta que excedeu o armazém pode ser reivindicada novamente depois
	// que o jogador liberar espaço. Somente o saldo pendente é tentado; a
	// recompensa original e o XP jamais são recalculados/aplicados duas vezes.
	if activity.State == game.GatheringStatePendingStorage && activity.Result != nil {
		pendingRows, err := tx.Query(`SELECT resource_key,quantity FROM character_pending_gathering_rewards WHERE character_id=$1 AND activity_id=$2 FOR UPDATE`, charID, activity.ID)
		if err != nil {
			return nil, err
		}
		pending := []game.ResourceAmount{}
		for pendingRows.Next() {
			var reward game.ResourceAmount
			if err := pendingRows.Scan(&reward.Key, &reward.Quantity); err != nil {
				pendingRows.Close()
				return nil, err
			}
			pending = append(pending, reward)
		}
		pendingRows.Close()
		capacity, err := campStorageCapacityTx(tx, charID)
		if err != nil {
			return nil, err
		}
		mutation, err := AddCharacterResourcesTx(tx, charID, pending, capacity)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`DELETE FROM character_pending_gathering_rewards WHERE character_id=$1 AND activity_id=$2`, charID, activity.ID); err != nil {
			return nil, err
		}
		for _, reward := range mutation.Overflow {
			if _, err := tx.Exec(`INSERT INTO character_pending_gathering_rewards(character_id,activity_id,resource_key,quantity) VALUES($1,$2,$3,$4)`, charID, activity.ID, reward.Key, reward.Quantity); err != nil {
				return nil, err
			}
		}
		result := *activity.Result
		result.Accepted = append(result.Accepted, mutation.Accepted...)
		result.Pending = mutation.Overflow
		if err := recordResourceLedgerTx(tx, charID, requestID, "gathering_claim", activity.ExpeditionKey, mutation.Accepted); err != nil {
			return nil, err
		}
		state := game.GatheringStateClaimed
		if len(result.Pending) > 0 {
			state = game.GatheringStatePendingStorage
		}
		resultJSON, err := json.Marshal(result)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`UPDATE character_activities SET state=$2,result=$3,revision=revision+1,updated_at=NOW() WHERE id=$1`, activity.ID, state, string(resultJSON)); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`INSERT INTO gathering_claim_requests(character_id,activity_id,request_id,result) VALUES($1,$2,$3,$4)`, charID, activity.ID, requestID, string(resultJSON)); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		game.IncrementTelemetry("gathering_claim_total{status=retry}")
		if len(result.Pending) > 0 {
			game.IncrementTelemetry("gathering_pending_storage_total")
		}
		return &result, nil
	}
	result := game.CalculateGatheringResult(*activity, activity.EndsAt)
	result.WageReserved = activity.WageReserved
	paid, refunded, err := settleGatheringPayrollTx(tx, charID, activity, activity.EndsAt, false, requestID)
	if err != nil {
		return nil, err
	}
	result.WagePaid = paid
	result.WageRefunded = refunded
	var profession game.ProfessionProgress
	if err := tx.QueryRow(`SELECT profession_key,level,experience,revision FROM character_professions WHERE character_id=$1 AND profession_key=$2 FOR UPDATE`, charID, activity.ProfessionKey).Scan(&profession.ProfessionKey, &profession.Level, &profession.Experience, &profession.Revision); err != nil {
		return nil, err
	}
	result.ProfessionBefore = profession.Level
	if !activity.ProfessionXPApplied {
		profession = game.ApplyProfessionExperience(profession, result.ProfessionXP)
		if _, err := tx.Exec(`UPDATE character_professions SET level=$3,experience=$4,lifetime_experience=lifetime_experience+$5,revision=revision+1,updated_at=NOW() WHERE character_id=$1 AND profession_key=$2`, charID, profession.ProfessionKey, profession.Level, profession.Experience, result.ProfessionXP); err != nil {
			return nil, err
		}
	}
	result.ProfessionAfter = profession.Level
	if activity.ResidentID != "" && !activity.ProfessionXPApplied {
		var residentProgress game.ProfessionProgress
		residentProgress.ProfessionKey = activity.ProfessionKey
		if err := tx.QueryRow(`SELECT level,experience,revision FROM settlement_resident_skills WHERE resident_id=$1 AND skill_key=$2 FOR UPDATE`, activity.ResidentID, activity.ProfessionKey).Scan(&residentProgress.Level, &residentProgress.Experience, &residentProgress.Revision); err != nil {
			return nil, err
		}
		result.ProfessionBefore = residentProgress.Level
		residentProgress = game.ApplyProfessionExperience(residentProgress, result.ProfessionXP)
		result.ProfessionAfter = residentProgress.Level
		if _, err := tx.Exec(`UPDATE settlement_resident_skills SET level=$3,experience=$4,lifetime_experience=lifetime_experience+$5,revision=revision+1,updated_at=NOW() WHERE resident_id=$1 AND skill_key=$2`, activity.ResidentID, activity.ProfessionKey, residentProgress.Level, residentProgress.Experience, result.ProfessionXP); err != nil {
			return nil, err
		}
	}
	capacity, err := campStorageCapacityTx(tx, charID)
	if err != nil {
		return nil, err
	}
	mutation, err := AddCharacterResourcesTx(tx, charID, result.Rewards, capacity)
	if err != nil {
		return nil, err
	}
	result.Accepted = mutation.Accepted
	result.Pending = mutation.Overflow
	if err := recordResourceLedgerTx(tx, charID, requestID, "gathering_claim", activity.ExpeditionKey, mutation.Accepted); err != nil {
		return nil, err
	}
	for _, pending := range mutation.Overflow {
		if _, err := tx.Exec(`INSERT INTO character_pending_gathering_rewards(character_id,activity_id,resource_key,quantity) VALUES($1,$2,$3,$4) ON CONFLICT(character_id,activity_id,resource_key) DO UPDATE SET quantity=EXCLUDED.quantity`, charID, activity.ID, pending.Key, pending.Quantity); err != nil {
			return nil, err
		}
	}
	state := game.GatheringStateClaimed
	if len(result.Pending) > 0 {
		state = game.GatheringStatePendingStorage
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE character_activities SET state=$2,result=$3,profession_xp_applied=TRUE,revision=revision+1,claimed_at=NOW(),updated_at=NOW() WHERE id=$1`, activity.ID, state, string(resultJSON)); err != nil {
		return nil, err
	}
	if activity.ResidentID != "" {
		if _, err := tx.Exec(`UPDATE settlement_residents SET state='idle',updated_at=NOW() WHERE id=$1`, activity.ResidentID); err != nil {
			return nil, err
		}
	}
	if _, err := tx.Exec(`UPDATE settlements SET prosperity=prosperity+$2,revision=revision+1,updated_at=NOW() WHERE character_id=$1`, charID, game.GatheringProsperityGain(result.CompletedCycles)); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`INSERT INTO gathering_claim_requests(character_id,activity_id,request_id,result) VALUES($1,$2,$3,$4)`, charID, activity.ID, requestID, string(resultJSON)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	game.IncrementTelemetry("gathering_claim_total{status=initial}")
	if len(result.Pending) > 0 {
		game.IncrementTelemetry("gathering_pending_storage_total")
	}
	return &result, nil
}

// ReconcileCompletedGatherings deposita automaticamente as ordens vencidas e
// libera seus moradores. Se o depósito estiver cheio, somente o excedente fica
// em carga segura; o trabalhador volta ao estado idle do mesmo jeito.
//
// A função é chamada no login e pelo pulso da sessão online. Quando o jogo
// estava fechado, o resultado é calculado pelo snapshot autoritativo e
// conciliado assim que o personagem retorna, sem exigir clique do jogador.
func ReconcileCompletedGatherings(charID string, now time.Time, limit int) ([]game.GatheringResult, error) {
	if charID == "" {
		return nil, fmt.Errorf("personagem obrigatório para conciliar coletas")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if limit < 1 {
		limit = 24
	}
	if limit > 100 {
		limit = 100
	}
	rows, err := DB.Query(`
		SELECT id::text
		FROM character_activities
		WHERE character_id=$1
		  AND state IN ('running','claimable')
		  AND ends_at<=$2
		ORDER BY ends_at,created_at
		LIMIT $3`, charID, now.UTC(), limit)
	if err != nil {
		return nil, err
	}
	activityIDs := []string{}
	for rows.Next() {
		var activityID string
		if err := rows.Scan(&activityID); err != nil {
			rows.Close()
			return nil, err
		}
		activityIDs = append(activityIDs, activityID)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	results := make([]game.GatheringResult, 0, len(activityIDs))
	for _, activityID := range activityIDs {
		requestID := "auto-gather:" + activityID
		result, claimErr := ClaimGatheringActivity(charID, activityID, requestID)
		if claimErr != nil {
			// Outra goroutine pode ter conciliado a mesma ordem entre o SELECT e
			// o lock serializável. Nesse caso o estado final já está correto.
			var stillDue bool
			checkErr := DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM character_activities WHERE character_id=$1 AND id=$2 AND state IN ('running','claimable') AND ends_at<=$3)`, charID, activityID, now.UTC()).Scan(&stillDue)
			if checkErr == nil && !stillDue {
				continue
			}
			return nil, claimErr
		}
		if result != nil {
			results = append(results, *result)
		}
	}
	return results, nil
}

func hasRecipeUnlockedTx(tx *sql.Tx, charID, recipeKey string) (bool, error) {
	var unlocked bool
	err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM character_recipe_unlocks WHERE character_id=$1 AND recipe_key=$2)`, charID, recipeKey).Scan(&unlocked)
	return unlocked, err
}

func craftPreviewTx(tx *sql.Tx, charID, recipeKey, catalystKey string, lock bool) (*game.CraftPreview, game.ProfessionProgress, error) {
	recipe, exists := game.GetRecipeDefinition(recipeKey)
	if !exists {
		return nil, game.ProfessionProgress{}, fmt.Errorf("receita desconhecida: %s", recipeKey)
	}
	unlocked, err := hasRecipeUnlockedTx(tx, charID, recipeKey)
	if err != nil {
		return nil, game.ProfessionProgress{}, err
	}
	profession := game.ProfessionProgress{ProfessionKey: recipe.ProfessionKey}
	professionQuery := `SELECT level,experience,revision FROM character_professions WHERE character_id=$1 AND profession_key=$2`
	if lock {
		professionQuery += ` FOR UPDATE`
	}
	if err := tx.QueryRow(professionQuery, charID, recipe.ProfessionKey).Scan(&profession.Level, &profession.Experience, &profession.Revision); err != nil {
		return nil, profession, err
	}
	profession.XPRequired = game.GetRequiredProfessionXP(profession.Level)
	var gold, charRevision int64
	charQuery := `SELECT gold_bank,state_revision FROM characters WHERE id=$1`
	if lock {
		charQuery += ` FOR UPDATE`
	}
	if err := tx.QueryRow(charQuery, charID).Scan(&gold, &charRevision); err != nil {
		return nil, profession, err
	}
	campRevision := int64(0)
	if lock {
		if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
			return nil, profession, err
		}
		if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id=$1 FOR UPDATE`, charID).Scan(&campRevision); err != nil {
			return nil, profession, err
		}
	} else if err := tx.QueryRow(`SELECT COALESCE((SELECT state_revision FROM character_camps WHERE character_id=$1),0)`, charID).Scan(&campRevision); err != nil {
		return nil, profession, err
	}
	resourceRowsQuery := `SELECT resource_key,quantity FROM character_resources WHERE character_id=$1`
	if lock {
		resourceRowsQuery += ` FOR UPDATE`
	}
	rows, err := tx.Query(resourceRowsQuery, charID)
	if err != nil {
		return nil, profession, err
	}
	balances := map[string]int64{}
	for rows.Next() {
		var key string
		var quantity int64
		if err := rows.Scan(&key, &quantity); err != nil {
			rows.Close()
			return nil, profession, err
		}
		balances[key] = quantity
	}
	rows.Close()
	missing := []string{}
	if !unlocked {
		missing = append(missing, "Receita ainda não descoberta")
	}
	if profession.Level < recipe.RequiredProfessionLevel {
		missing = append(missing, fmt.Sprintf("%s nível %d", recipe.ProfessionKey, recipe.RequiredProfessionLevel))
	}
	if gold < recipe.GoldCost {
		missing = append(missing, fmt.Sprintf("Ouro: faltam %d", recipe.GoldCost-gold))
	}
	for _, ingredient := range recipe.Ingredients {
		if balances[ingredient.Key] < ingredient.Quantity {
			missing = append(missing, fmt.Sprintf("%s: %d/%d", ingredient.Key, balances[ingredient.Key], ingredient.Quantity))
		}
	}
	catalystCost := game.CatalystCost(catalystKey)
	if catalystKey != "" && catalystCost == 0 {
		missing = append(missing, "Catalisador inválido")
	} else if catalystCost > 0 && balances[catalystKey] < catalystCost {
		missing = append(missing, fmt.Sprintf("%s: %d/%d", catalystKey, balances[catalystKey], catalystCost))
	}
	stationLevel := 0
	if recipe.RequiredStationLevel > 0 {
		err := tx.QueryRow(`SELECT level FROM character_camp_buildings WHERE character_id=$1 AND building_key=$2`, charID, recipe.StationKey).Scan(&stationLevel)
		if err != nil && err != sql.ErrNoRows {
			return nil, profession, err
		}
		if stationLevel < recipe.RequiredStationLevel {
			missing = append(missing, fmt.Sprintf("%s nível %d", formatBuildingName(recipe.StationKey), recipe.RequiredStationLevel))
		}
	}
	previewRevision := int64(recipe.ContentVersion)*1000003 + int64(profession.Level)*1009 + int64(stationLevel)*17 + campRevision
	preview := &game.CraftPreview{RecipeKey: recipe.Key, RecipeVersion: recipe.ContentVersion, CanCraft: len(missing) == 0, MissingRequirements: missing, Costs: recipe.Ingredients, GoldCost: recipe.GoldCost, EstimatedSeconds: recipe.CraftSeconds, PreviewRevision: previewRevision, CatalystKey: catalystKey, CatalystCost: catalystCost, ProfessionLevel: profession.Level, StationLevel: stationLevel, RarityTableVersion: 1}
	if recipe.Kind == game.RecipeKindEquipment {
		preview.RarityChances = game.CraftRarityDistributionWithModifiers(recipe, catalystKey, profession.Level, stationLevel)
		preview.MinimumRarity = recipe.MinimumRarity
		preview.MaximumRarity = recipe.MaximumRarity
	}
	return preview, profession, nil
}

func GetCraftPreview(charID, recipeKey, catalystKey string) (*game.CraftPreview, error) {
	if !game.CurrentEconomyPolicy().CraftingEnabled {
		return nil, fmt.Errorf("crafting está temporariamente desabilitado")
	}
	if err := ensureEconomyRows(charID); err != nil {
		return nil, err
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	preview, _, err := craftPreviewTx(tx, charID, recipeKey, catalystKey, false)
	if err != nil {
		return nil, err
	}
	return preview, tx.Commit()
}

func CraftItem(charID, recipeKey, catalystKey, requestID string, expectedPreviewRevision int64) (*game.CraftResult, error) {
	if !game.CurrentEconomyPolicy().CraftingEnabled {
		return nil, fmt.Errorf("crafting está temporariamente desabilitado")
	}
	if requestID == "" {
		return nil, fmt.Errorf("request_id obrigatório")
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
	var previousJSON string
	if err := tx.QueryRow(`SELECT result FROM crafting_transactions WHERE character_id=$1 AND request_id=$2`, charID, requestID).Scan(&previousJSON); err == nil {
		var previous game.CraftResult
		if err := json.Unmarshal([]byte(previousJSON), &previous); err != nil {
			return nil, err
		}
		game.IncrementTelemetry("craft_idempotency_replay_total")
		return &previous, tx.Commit()
	} else if err != sql.ErrNoRows {
		return nil, err
	}
	// Trava o inventário antes de acampamento/recursos. Desmontagem e resgate de
	// itens usam a mesma ordem, evitando o ciclo inventário <-> depósito.
	lockedInventory, err := GetCharacterInventoryTx(tx, charID, true)
	if err != nil {
		return nil, err
	}
	preview, profession, err := craftPreviewTx(tx, charID, recipeKey, catalystKey, true)
	if err != nil {
		return nil, err
	}
	lockedCharacter, err := scanLockedCharacter(tx.QueryRow(`SELECT `+characterSnapshotColumns+` FROM characters WHERE id=$1 FOR UPDATE`, charID))
	if err != nil {
		return nil, err
	}
	if !preview.CanCraft {
		return nil, fmt.Errorf("requisitos insuficientes: %v", preview.MissingRequirements)
	}
	recipe, _ := game.GetRecipeDefinition(recipeKey)
	costs := append([]game.ResourceAmount{}, recipe.Ingredients...)
	if preview.CatalystCost > 0 {
		costs = append(costs, game.ResourceAmount{Key: catalystKey, Quantity: preview.CatalystCost})
	}
	for _, cost := range costs {
		var newBalance int64
		err := tx.QueryRow(`UPDATE character_resources SET quantity=quantity-$3,updated_at=NOW() WHERE character_id=$1 AND resource_key=$2 AND quantity >= $3 RETURNING quantity`, charID, cost.Key, cost.Quantity).Scan(&newBalance)
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("saldo de %s mudou durante o craft", cost.Key)
		}
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`INSERT INTO character_resource_ledger(character_id,request_id,reason,reference_key,resource_key,delta,balance_after) VALUES($1,$2,'craft',$3,$4,$5,$6)`, charID, requestID, recipeKey, cost.Key, -cost.Quantity, newBalance); err != nil {
			return nil, err
		}
		game.IncrementTelemetry("resource_sink_total{resource=" + cost.Key + ",reason=craft}")
	}
	goldUpdate, err := tx.Exec(`UPDATE characters SET gold_bank=gold_bank-$2,state_revision=state_revision+1 WHERE id=$1 AND gold_bank >= $2`, charID, recipe.GoldCost)
	if err != nil {
		return nil, err
	}
	if affected, rowsErr := goldUpdate.RowsAffected(); rowsErr != nil || affected != 1 {
		return nil, fmt.Errorf("saldo de ouro mudou durante o craft")
	}
	profession = game.ApplyProfessionExperience(profession, int64(12*recipe.Tier))
	if _, err := tx.Exec(`UPDATE character_professions SET level=$3,experience=$4,lifetime_experience=lifetime_experience+$5,revision=revision+1,updated_at=NOW() WHERE character_id=$1 AND profession_key=$2`, charID, profession.ProfessionKey, profession.Level, profession.Experience, int64(12*recipe.Tier)); err != nil {
		return nil, err
	}
	result := &game.CraftResult{RequestID: requestID, RecipeKey: recipeKey, ProfessionProgress: profession}
	seed, err := secureServerSeed()
	if err != nil {
		return nil, err
	}
	var craftedItem *game.Item
	if recipe.Kind == game.RecipeKindEquipment {
		craftedItem, result.Rarity, err = game.GenerateCraftedItem(recipe, catalystKey, seed, preview.ProfessionLevel, preview.StationLevel)
		if err != nil {
			return nil, err
		}
		result.Item = craftedItem
	} else {
		result.Resources = []game.ResourceAmount{{Key: recipe.OutputResourceKey, Quantity: recipe.OutputQuantity}}
		capacity, err := campStorageCapacityTx(tx, charID)
		if err != nil {
			return nil, err
		}
		mutation, err := AddCharacterResourcesTx(tx, charID, result.Resources, capacity)
		if err != nil {
			return nil, err
		}
		if len(mutation.Overflow) > 0 {
			return nil, fmt.Errorf("não há espaço no depósito para o produto processado")
		}
		if err := recordResourceLedgerTx(tx, charID, requestID+":output", "craft_output", recipeKey, mutation.Accepted); err != nil {
			return nil, err
		}
	}

	transactionID := ""
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	costsJSON, err := json.Marshal(costs)
	if err != nil {
		return nil, err
	}
	if err := tx.QueryRow(`INSERT INTO crafting_transactions(character_id,request_id,recipe_key,recipe_version,catalyst_key,preview_revision,costs,gold_cost,result,deterministic_seed,rarity_table_version,profession_level_snapshot,station_level_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`, charID, requestID, recipeKey, recipe.ContentVersion, catalystKey, preview.PreviewRevision, string(costsJSON), recipe.GoldCost, string(resultJSON), seed, preview.RarityTableVersion, preview.ProfessionLevel, preview.StationLevel).Scan(&transactionID); err != nil {
		return nil, err
	}
	result.TransactionID = transactionID
	if craftedItem != nil {
		inventory := lockedInventory
		gameCharacter := characterToGame(lockedCharacter)
		gameInventory := inventoryToGame(inventory)
		capacitySession := &game.GameSession{Character: gameCharacter, Inventory: gameInventory, ActiveStance: lockedCharacter.ActiveStance}
		if len(inventory.Backpack) < capacitySession.GetMaxSlotCapacity() && capacitySession.GetTotalWeight()+craftedItem.Weight <= capacitySession.GetMaxWeightCapacity() {
			inventory.Backpack = append(inventory.Backpack, *craftedItem)
			if err := SaveCharacterInventoryTx(tx, charID, inventory); err != nil {
				return nil, err
			}
		} else {
			itemJSON, err := json.Marshal(craftedItem)
			if err != nil {
				return nil, err
			}
			if _, err := tx.Exec(`INSERT INTO pending_crafted_items(character_id,transaction_id,item) VALUES($1,$2,$3)`, charID, transactionID, string(itemJSON)); err != nil {
				return nil, err
			}
			result.SentToPending = true
		}
	}
	// A oficina manual também desenvolve a comunidade, porém em ritmo menor
	// que uma Ambição executada integralmente por um artesão residente.
	if _, err := tx.Exec(`UPDATE settlements SET prosperity=prosperity+$2,revision=revision+1,updated_at=NOW() WHERE character_id=$1`, charID, int64(recipe.Tier)); err != nil {
		return nil, err
	}
	capacity, err := campStorageCapacityTx(tx, charID)
	if err != nil {
		return nil, err
	}
	snapshot, err := getSnapshotWithinTx(tx, charID, capacity)
	if err != nil {
		return nil, err
	}
	result.ResourceInventory = *snapshot
	resultJSON, err = json.Marshal(result)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE crafting_transactions SET result=$2 WHERE id=$1`, transactionID, string(resultJSON)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	game.IncrementTelemetry("craft_completed_total{recipe=" + recipeKey + ",rarity=" + result.Rarity + "}")
	if result.SentToPending {
		game.IncrementTelemetry("inventory_overflow_total{source=craft}")
	}
	return result, nil
}

// ListPendingGatheringKeys é útil para auditorias e mantém uma ordem estável.
func ListPendingGatheringKeys(state *game.EconomyState) []string {
	keys := []string{}
	if state != nil {
		for _, reward := range state.PendingGathering {
			keys = append(keys, reward.Key)
		}
	}
	sort.Strings(keys)
	return keys
}

func ClaimPendingCraftedItem(charID, itemID string) (*game.Item, *Inventory, error) {
	if itemID == "" {
		return nil, nil, fmt.Errorf("item_id obrigatório")
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()
	inventory, err := GetCharacterInventoryTx(tx, charID, true)
	if err != nil {
		return nil, nil, err
	}
	lockedCharacter, err := scanLockedCharacter(tx.QueryRow(`SELECT `+characterSnapshotColumns+` FROM characters WHERE id=$1 FOR UPDATE`, charID))
	if err != nil {
		return nil, nil, err
	}
	var pendingID, raw string
	if err := tx.QueryRow(`SELECT id,item FROM pending_crafted_items WHERE character_id=$1 AND item->>'id'=$2 FOR UPDATE`, charID, itemID).Scan(&pendingID, &raw); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, fmt.Errorf("item pendente não encontrado")
		}
		return nil, nil, err
	}
	var item game.Item
	if err := json.Unmarshal([]byte(raw), &item); err != nil {
		return nil, nil, err
	}
	capacitySession := &game.GameSession{Character: characterToGame(lockedCharacter), Inventory: inventoryToGame(inventory), ActiveStance: lockedCharacter.ActiveStance}
	if len(inventory.Backpack) >= capacitySession.GetMaxSlotCapacity() || capacitySession.GetTotalWeight()+item.Weight > capacitySession.GetMaxWeightCapacity() {
		return nil, nil, fmt.Errorf("a mochila continua sem espaço ou capacidade; libere peso/slot antes de resgatar")
	}
	inventory.Backpack = append(inventory.Backpack, item)
	if err := SaveCharacterInventoryTx(tx, charID, inventory); err != nil {
		return nil, nil, err
	}
	if _, err := tx.Exec(`DELETE FROM pending_crafted_items WHERE id=$1`, pendingID); err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}
	return &item, inventory, nil
}
