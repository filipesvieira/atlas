package db

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"time"

	"github.com/atlas/backend/pkg/game"
)

// GetCharacterResources carrega todos os recursos positivos de um personagem.
func GetCharacterResources(charID string) (map[string]int64, error) {
	query := `SELECT resource_key, quantity FROM character_resources WHERE character_id = $1 AND quantity > 0`
	rows, err := DB.Query(query, charID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar recursos: %w", err)
	}
	defer rows.Close()

	resMap := make(map[string]int64)
	for rows.Next() {
		var key string
		var qty int64
		if err := rows.Scan(&key, &qty); err != nil {
			return nil, err
		}
		if qty > 0 {
			resMap[key] = qty
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return resMap, nil
}

// GetCharacterResourceSnapshot retorna uma fotografia autoritativa completa do inventário de recursos.
func GetCharacterResourceSnapshot(charID string) (*game.ResourceInventorySnapshot, error) {
	resMap, err := GetCharacterResources(charID)
	if err != nil {
		return nil, err
	}

	camp, err := GetCharacterCamp(charID)
	if err != nil {
		return nil, err
	}

	items := make([]game.ResourceAmount, 0, len(resMap))
	for k, q := range resMap {
		if q > 0 {
			items = append(items, game.ResourceAmount{Key: k, Quantity: q})
		}
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Key < items[j].Key
	})

	storageUsed := game.GetStorageUsed(resMap)

	return &game.ResourceInventorySnapshot{
		Items:           items,
		StorageUsed:     storageUsed,
		StorageCapacity: camp.StorageCapacity,
		Revision:        camp.StateRevision,
	}, nil
}

// AddCharacterResources adiciona recursos ao inventário do personagem em transação serializável.
func AddCharacterResources(charID string, drops []game.ResourceAmount, maxCap int64) (game.ResourceMutationResult, error) {
	return AddCharacterResourcesWithLedger(charID, drops, maxCap, "resource_gain", "")
}

// AddCharacterResourcesWithLedger aplica a mutação e registra sua origem na
// mesma transação. referenceKey deve identificar monstro, relatório ou comando.
func AddCharacterResourcesWithLedger(charID string, drops []game.ResourceAmount, maxCap int64, reason, referenceKey string) (game.ResourceMutationResult, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return game.ResourceMutationResult{}, err
	}
	defer tx.Rollback()

	res, err := AddCharacterResourcesTx(tx, charID, drops, maxCap)
	if err != nil {
		return res, err
	}
	requestID := fmt.Sprintf("%s:%s:%d", reason, referenceKey, time.Now().UTC().UnixNano())
	if err := recordResourceLedgerTx(tx, charID, requestID, reason, referenceKey, res.Accepted); err != nil {
		return res, err
	}
	if err := storePendingResourcesTx(tx, charID, reason, referenceKey, res.Overflow); err != nil {
		return res, err
	}

	if err := tx.Commit(); err != nil {
		return res, err
	}
	return res, nil
}

func storePendingResourcesTx(tx *sql.Tx, charID, sourceKind, sourceKey string, amounts []game.ResourceAmount) error {
	for _, amount := range amounts {
		if amount.Quantity <= 0 {
			continue
		}
		if _, err := tx.Exec(`
			INSERT INTO character_pending_resource_rewards(character_id,source_kind,source_key,resource_key,quantity)
			VALUES($1,$2,$3,$4,$5)
			ON CONFLICT(character_id,source_kind,source_key,resource_key) DO UPDATE
			SET quantity=character_pending_resource_rewards.quantity+EXCLUDED.quantity,updated_at=NOW()`, charID, sourceKind, sourceKey, amount.Key, amount.Quantity); err != nil {
			return err
		}
	}
	return nil
}

func recordResourceLedgerTx(tx *sql.Tx, charID, requestID, reason, referenceKey string, amounts []game.ResourceAmount) error {
	for _, amount := range amounts {
		if amount.Quantity == 0 {
			continue
		}
		var balance int64
		if err := tx.QueryRow(`SELECT quantity FROM character_resources WHERE character_id=$1 AND resource_key=$2`, charID, amount.Key).Scan(&balance); err != nil {
			return err
		}
		insertResult, err := tx.Exec(`INSERT INTO character_resource_ledger(character_id,request_id,reason,reference_key,resource_key,delta,balance_after) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(character_id,request_id,resource_key) DO NOTHING`, charID, requestID, reason, referenceKey, amount.Key, amount.Quantity, balance)
		if err != nil {
			return err
		}
		if affected, affectedErr := insertResult.RowsAffected(); affectedErr == nil && affected == 1 {
			direction := "source"
			if amount.Quantity < 0 {
				direction = "sink"
			}
			game.IncrementTelemetry("resource_" + direction + "_total{resource=" + amount.Key + ",reason=" + reason + "}")
		}
	}
	return nil
}

// AddCharacterResourcesTx adiciona recursos dentro de uma transação ativa respeitando a capacidade máxima autoritativa.
func AddCharacterResourcesTx(tx *sql.Tx, charID string, drops []game.ResourceAmount, maxCap int64) (game.ResourceMutationResult, error) {
	result := game.ResourceMutationResult{
		Accepted: make([]game.ResourceAmount, 0, len(drops)),
		Overflow: make([]game.ResourceAmount, 0),
		Inventory: game.ResourceInventorySnapshot{
			Items:           make([]game.ResourceAmount, 0),
			StorageCapacity: maxCap,
		},
	}

	if len(drops) == 0 {
		snap, err := getSnapshotWithinTx(tx, charID, maxCap)
		if err != nil {
			return result, err
		}
		result.Inventory = *snap
		return result, nil
	}

	// 1. Garante e trava o acampamento antes de recursos ou cargas pendentes.
	// Esta ordem é compartilhada por combate, offline, coleta e crafting.
	if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
		return result, err
	}
	var revision int64
	err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id = $1 FOR UPDATE`, charID).Scan(&revision)
	if err != nil && err != sql.ErrNoRows {
		return result, fmt.Errorf("falha ao obter lock de acampamento: %w", err)
	}

	// 2. Lock nos recursos atuais
	rows, err := tx.Query(`SELECT resource_key, quantity FROM character_resources WHERE character_id = $1 FOR UPDATE`, charID)
	if err != nil {
		return result, err
	}
	currentRes := make(map[string]int64)
	for rows.Next() {
		var k string
		var q int64
		if err := rows.Scan(&k, &q); err != nil {
			rows.Close()
			return result, err
		}
		if q > 0 {
			currentRes[k] = q
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return result, err
	}
	rows.Close()

	// 3. Calcula uso atual considerando apenas materiais armazenáveis
	currentUsed := game.GetStorageUsed(currentRes)

	for _, drop := range drops {
		if drop.Quantity <= 0 {
			continue
		}

		resDef, hasDef := game.GetResourceDefinition(drop.Key)
		if !hasDef {
			return result, fmt.Errorf("recurso não registrado: %s", drop.Key)
		}
		countsTowardsStorage := resDef.CountsTowardStorage
		storageWeight := int64(1)
		if resDef.StorageWeight > 0 {
			storageWeight = resDef.StorageWeight
		}

		canFit := drop.Quantity
		if countsTowardsStorage && maxCap > 0 {
			avail := maxCap - currentUsed
			if avail <= 0 {
				canFit = 0
			} else if canFit*storageWeight > avail {
				canFit = avail / storageWeight
			}
		}

		if canFit > 0 {
			currentRes[drop.Key] += canFit
			if countsTowardsStorage {
				currentUsed += canFit * storageWeight
			}
			result.Accepted = append(result.Accepted, game.ResourceAmount{Key: drop.Key, Quantity: canFit})

			_, err = tx.Exec(`
				INSERT INTO character_resources (character_id, resource_key, quantity, updated_at)
				VALUES ($1, $2, $3, NOW())
				ON CONFLICT (character_id, resource_key)
				DO UPDATE SET quantity = character_resources.quantity + EXCLUDED.quantity, updated_at = NOW()
			`, charID, drop.Key, canFit)
			if err != nil {
				return result, fmt.Errorf("erro ao inserir recurso: %w", err)
			}
		}

		overflowQty := drop.Quantity - canFit
		if overflowQty > 0 {
			result.Overflow = append(result.Overflow, game.ResourceAmount{Key: drop.Key, Quantity: overflowQty})
		}
	}

	// 4. Incrementa revisão de estado para forçar atualização em tempo real
	if _, err := tx.Exec(`UPDATE character_camps SET state_revision = state_revision + 1, updated_at = NOW() WHERE character_id = $1`, charID); err != nil {
		return result, err
	}

	snap, err := getSnapshotWithinTx(tx, charID, maxCap)
	if err != nil {
		return result, err
	}
	result.Inventory = *snap

	return result, nil
}

// DiscardCharacterResource permite ao jogador descartar uma quantidade específica de um recurso de forma segura.
func DiscardCharacterResource(charID, resourceKey string, quantity, expectedRevision int64) (*game.ResourceInventorySnapshot, error) {
	if quantity <= 0 {
		return nil, fmt.Errorf("quantidade de descarte inválida: %d", quantity)
	}

	if !game.IsResourceDiscardable(resourceKey) {
		return nil, fmt.Errorf("o recurso %s não pode ser descartado (troféus e itens especiais são protegidos)", resourceKey)
	}

	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
		return nil, err
	}
	var campRevision int64
	if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id=$1 FOR UPDATE`, charID).Scan(&campRevision); err != nil {
		return nil, err
	}
	if expectedRevision > 0 && campRevision != expectedRevision {
		return nil, fmt.Errorf("o depósito mudou; sincronize antes de confirmar o descarte")
	}

	// 1. Lock no saldo atual do recurso
	var currentQty int64
	err = tx.QueryRow(`SELECT quantity FROM character_resources WHERE character_id = $1 AND resource_key = $2 FOR UPDATE`, charID, resourceKey).Scan(&currentQty)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("recurso %s não encontrado no inventário", resourceKey)
		}
		return nil, err
	}

	if currentQty < quantity {
		return nil, fmt.Errorf("quantidade insuficiente: possui %d, tentou descartar %d", currentQty, quantity)
	}

	// 2. Debita ou remove linha
	newQty := currentQty - quantity
	if newQty > 0 {
		_, err = tx.Exec(`UPDATE character_resources SET quantity = $1, updated_at = NOW() WHERE character_id = $2 AND resource_key = $3`, newQty, charID, resourceKey)
	} else {
		_, err = tx.Exec(`DELETE FROM character_resources WHERE character_id = $1 AND resource_key = $2`, charID, resourceKey)
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao atualizar saldo do recurso: %w", err)
	}
	if _, err := tx.Exec(`INSERT INTO character_resource_ledger(character_id,request_id,reason,reference_key,resource_key,delta,balance_after) VALUES($1,$2,'discard','deposit',$3,$4,$5)`, charID, fmt.Sprintf("discard:%s:%d", resourceKey, time.Now().UTC().UnixNano()), resourceKey, -quantity, newQty); err != nil {
		return nil, err
	}

	// 3. Incrementa revisão de estado do acampamento
	if _, err := tx.Exec(`UPDATE character_camps SET state_revision = state_revision + 1, updated_at = NOW() WHERE character_id = $1`, charID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return GetCharacterResourceSnapshot(charID)
}

// SalvageItemAtomically realiza o desmonte integral com garantia "Tudo ou Nada" em transação serializável usando tx.
func SalvageItemAtomically(charID, itemID string, efficiency float64) (*game.Item, []game.ResourceAmount, *game.ResourceInventorySnapshot, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, nil, nil, err
	}
	defer tx.Rollback()

	// 1. Lock no inventário do personagem com TX
	invDB, err := GetCharacterInventoryTx(tx, charID, true)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("inventário não encontrado: %w", err)
	}
	gameInv := ConvertDBInvToGameInv(invDB)

	// 2. Lock no acampamento e leitura consistente das construções com TX.
	if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
		return nil, nil, nil, err
	}
	var currentRevision int64
	if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id = $1 FOR UPDATE`, charID).Scan(&currentRevision); err != nil {
		return nil, nil, nil, err
	}
	buildings, err := getCampBuildingsTx(tx, charID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("erro ao carregar acampamento: %w", err)
	}

	bonuses := game.CalculateCampBonuses(buildings)
	if !bonuses.SalvageUnlocked {
		return nil, nil, nil, fmt.Errorf("a Bancada de Desmontagem precisa ser construída para reciclar itens")
	}

	eff := bonuses.SalvageEfficiencyPercent
	if efficiency > eff {
		eff = efficiency
	}

	// 3. Localizar o item na mochila
	var targetItem *game.Item
	targetIdx := -1
	for idx, it := range gameInv.Backpack {
		if it.ID == itemID {
			itemCopy := it
			targetItem = &itemCopy
			targetIdx = idx
			break
		}
	}
	if targetItem == nil || targetIdx == -1 {
		return nil, nil, nil, fmt.Errorf("equipamento não encontrado na mochila")
	}

	// 4. Calcular rendimento de materiais
	yield, err := game.CalculateSalvageYield(targetItem, eff)
	if err != nil {
		return nil, nil, nil, err
	}

	// 5. Verificar se todo o rendimento cabe no armazém (Tudo ou Nada)
	resRows, err := tx.Query(`SELECT resource_key, quantity FROM character_resources WHERE character_id = $1 FOR UPDATE`, charID)
	if err != nil {
		return nil, nil, nil, err
	}
	currentRes := make(map[string]int64)
	for resRows.Next() {
		var k string
		var q int64
		if err := resRows.Scan(&k, &q); err == nil && q > 0 {
			currentRes[k] = q
		}
	}
	resRows.Close()

	currentUsed := game.GetStorageUsed(currentRes)
	var additionalMaterialNeeded int64
	for _, y := range yield {
		def, ok := game.GetResourceDefinition(y.Key)
		if !ok || def.CountsTowardStorage {
			weight := int64(1)
			if ok && def.StorageWeight > 0 {
				weight = def.StorageWeight
			}
			additionalMaterialNeeded += y.Quantity * weight
		}
	}

	if currentUsed+additionalMaterialNeeded > bonuses.StorageCapacity {
		return nil, nil, nil, fmt.Errorf("não há espaço suficiente no Armazém para receber todos os materiais deste desmonte (%d necessários, %d livres)", additionalMaterialNeeded, bonuses.StorageCapacity-currentUsed)
	}

	// 6. Remover item da mochila usando TX
	gameInv.Backpack = append(gameInv.Backpack[:targetIdx], gameInv.Backpack[targetIdx+1:]...)
	newInvDB := ConvertGameInvToDBInv(gameInv)
	if err := SaveCharacterInventoryTx(tx, charID, newInvDB); err != nil {
		return nil, nil, nil, fmt.Errorf("erro ao salvar inventário no tx: %w", err)
	}

	// 7. Adicionar recursos no banco usando TX
	ledgerRequestID := fmt.Sprintf("salvage:%s", itemID)
	for _, y := range yield {
		var balance int64
		err = tx.QueryRow(`
			INSERT INTO character_resources (character_id, resource_key, quantity, updated_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (character_id, resource_key)
			DO UPDATE SET quantity = character_resources.quantity + EXCLUDED.quantity, updated_at = NOW()
			RETURNING quantity
		`, charID, y.Key, y.Quantity).Scan(&balance)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("erro ao creditar material %s: %w", y.Key, err)
		}
		if _, err := tx.Exec(`INSERT INTO character_resource_ledger(character_id,request_id,reason,reference_key,resource_key,delta,balance_after) VALUES($1,$2,'salvage',$3,$4,$5,$6) ON CONFLICT(character_id,request_id,resource_key) DO NOTHING`, charID, ledgerRequestID, targetItem.TemplateKey, y.Key, y.Quantity, balance); err != nil {
			return nil, nil, nil, err
		}
	}

	// 8. Incrementar revisão
	if _, err := tx.Exec(`UPDATE character_camps SET state_revision = state_revision + 1, updated_at = NOW() WHERE character_id = $1`, charID); err != nil {
		return nil, nil, nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, nil, err
	}

	snap, _ := GetCharacterResourceSnapshot(charID)
	return targetItem, yield, snap, nil
}

// SalvageBatchAtomically processa múltiplos itens com chances de sucesso, modo seguro e garantia transacional total.
func SalvageBatchAtomically(charID, requestID string, itemIDs []string, safeMode bool) (*game.SalvageBatchResult, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Lock no inventário
	invDB, err := GetCharacterInventoryTx(tx, charID, true)
	if err != nil {
		return nil, fmt.Errorf("erro ao obter inventário: %w", err)
	}
	gameInv := ConvertDBInvToGameInv(invDB)

	// 2. Lock no acampamento e leitura consistente das construções com TX.
	if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
		return nil, err
	}
	var currentRevision int64
	if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id = $1 FOR UPDATE`, charID).Scan(&currentRevision); err != nil {
		return nil, err
	}
	buildings, err := getCampBuildingsTx(tx, charID)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar acampamento: %w", err)
	}

	bonuses := game.CalculateCampBonuses(buildings)
	if !bonuses.SalvageUnlocked {
		return nil, fmt.Errorf("a Bancada de Desmontagem precisa ser construída para reciclar itens")
	}

	wbLevel := 0
	if wbSlot, ok := buildings["south"]; ok {
		wbLevel = wbSlot.Level
	}
	if wbLevel < 1 {
		wbLevel = 1
	}

	// 3. Validação de capacidade prévia: calcula rendimento máximo possível
	resRows, err := tx.Query(`SELECT resource_key, quantity FROM character_resources WHERE character_id = $1 FOR UPDATE`, charID)
	if err != nil {
		return nil, err
	}
	currentRes := make(map[string]int64)
	for resRows.Next() {
		var k string
		var q int64
		if err := resRows.Scan(&k, &q); err == nil && q > 0 {
			currentRes[k] = q
		}
	}
	resRows.Close()
	currentUsed := game.GetStorageUsed(currentRes)

	var maxPossibleYield int64
	bpMap := make(map[string]*game.Item)
	for i := range gameInv.Backpack {
		bpMap[gameInv.Backpack[i].ID] = &gameInv.Backpack[i]
	}

	for _, id := range itemIDs {
		item, exists := bpMap[id]
		if !exists {
			return nil, fmt.Errorf("equipamento %s não encontrado na mochila", id)
		}
		yList, err := game.CalculateSalvageYield(item, bonuses.SalvageEfficiencyPercent)
		if err == nil {
			for _, y := range yList {
				def, ok := game.GetResourceDefinition(y.Key)
				if !ok || def.CountsTowardStorage {
					weight := int64(1)
					if ok && def.StorageWeight > 0 {
						weight = def.StorageWeight
					}
					maxPossibleYield += y.Quantity * weight
				}
			}
		}
	}

	if currentUsed+maxPossibleYield > bonuses.StorageCapacity {
		return nil, fmt.Errorf("não há espaço suficiente no Armazém para receber o lote (%d materiais máximos, %d livres)", maxPossibleYield, bonuses.StorageCapacity-currentUsed)
	}

	// 4. Executa desmontagem com rolagens de RNG
	outcomes, totalYield, err := game.SalvageBatch(gameInv, itemIDs, wbLevel, bonuses.SalvageEfficiencyPercent, safeMode, nil)
	if err != nil {
		return nil, err
	}

	// 5. Persiste inventário atualizado
	newInvDB := ConvertGameInvToDBInv(gameInv)
	if err := SaveCharacterInventoryTx(tx, charID, newInvDB); err != nil {
		return nil, fmt.Errorf("erro ao salvar inventário: %w", err)
	}

	// 6. Credita materiais obtidos com sucesso
	for _, y := range totalYield {
		var balance int64
		err = tx.QueryRow(`
			INSERT INTO character_resources (character_id, resource_key, quantity, updated_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (character_id, resource_key)
			DO UPDATE SET quantity = character_resources.quantity + EXCLUDED.quantity, updated_at = NOW()
			RETURNING quantity
		`, charID, y.Key, y.Quantity).Scan(&balance)
		if err != nil {
			return nil, fmt.Errorf("erro ao creditar material: %w", err)
		}
		if _, err := tx.Exec(`INSERT INTO character_resource_ledger(character_id,request_id,reason,reference_key,resource_key,delta,balance_after) VALUES($1,$2,'salvage_batch','workbench',$3,$4,$5) ON CONFLICT(character_id,request_id,resource_key) DO NOTHING`, charID, requestID, y.Key, y.Quantity, balance); err != nil {
			return nil, err
		}
	}

	// 7. Incrementa revisão de estado
	if _, err := tx.Exec(`UPDATE character_camps SET state_revision = state_revision + 1, updated_at = NOW() WHERE character_id = $1`, charID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	snap, _ := GetCharacterResourceSnapshot(charID)
	return &game.SalvageBatchResult{
		RequestID:  requestID,
		Outcomes:   outcomes,
		TotalYield: totalYield,
		Inventory:  *gameInv,
		Resources:  *snap,
	}, nil
}

// LearnBuildingBlueprint consome o manual da mochila e desbloqueia o projeto arquitetônico no acampamento.
func LearnBuildingBlueprint(charID, itemID string) (*game.InventoryData, *game.CampState, error) {
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	// 1. Lock no inventário
	invDB, err := GetCharacterInventoryTx(tx, charID, true)
	if err != nil {
		return nil, nil, fmt.Errorf("erro ao obter inventário: %w", err)
	}
	gameInv := ConvertDBInvToGameInv(invDB)

	// 2. Encontrar o manual na mochila
	itemIdx := -1
	var targetManual game.Item
	for idx, it := range gameInv.Backpack {
		if it.ID == itemID {
			itemIdx = idx
			targetManual = it
			break
		}
	}

	if itemIdx == -1 {
		return nil, nil, fmt.Errorf("manual não encontrado na mochila")
	}

	buildingKey := targetManual.UnlockBuildingKey
	if buildingKey == "" {
		// Fallback por nome do template
		switch targetManual.Name {
		case "Manual: Armazém de Recursos":
			buildingKey = "warehouse"
		case "Manual: Cabana do Aventureiro":
			buildingKey = "adventurer_hut"
		case "Manual: Fonte Arcana":
			buildingKey = "arcane_spring"
		case "Manual: Bancada de Desmontagem":
			buildingKey = "workbench"
		case "Manual do Mestre de Obras":
			buildingKey = "master_builder"
		default:
			return nil, nil, fmt.Errorf("este item não é um manual de construção válido")
		}
	}

	unlockedMaxLevel := targetManual.UnlockMaxLevel
	if unlockedMaxLevel <= 0 {
		unlockedMaxLevel = 3
	}

	// 3. Remove o manual da mochila
	gameInv.Backpack = append(gameInv.Backpack[:itemIdx], gameInv.Backpack[itemIdx+1:]...)
	newInvDB := ConvertGameInvToDBInv(gameInv)
	if err := SaveCharacterInventoryTx(tx, charID, newInvDB); err != nil {
		return nil, nil, fmt.Errorf("erro ao salvar inventário: %w", err)
	}

	// 4. Insere ou atualiza o blueprint descoberto
	_, err = tx.Exec(`
		INSERT INTO character_building_blueprints (character_id, building_key, unlocked_max_level, source_key, discovered_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (character_id, building_key)
		DO UPDATE SET unlocked_max_level = GREATEST(character_building_blueprints.unlocked_max_level, EXCLUDED.unlocked_max_level)
	`, charID, buildingKey, unlockedMaxLevel, targetManual.Name)
	if err != nil {
		return nil, nil, fmt.Errorf("erro ao registrar blueprint: %w", err)
	}

	// 5. Projetos de construções reais ganham uma fundação nível 0 no grid.
	// Ela pode ser arrastada livremente antes do jogador iniciar a primeira obra.
	// Blueprints utilitários (ex.: master_builder) não possuem BuildingDefinition e
	// portanto não ocupam terreno. Os cinco placeholders legados só passam a
	// ocupar espaço quando descobertos; se o jogador já ocupou a posição antiga,
	// o projeto recém-descoberto é realocado automaticamente para o primeiro local livre.
	if _, isBuilding := game.GetBuildingDefinition(buildingKey); isBuilding {
		rows, err := tx.Query(`
			SELECT b.slot_key,b.building_key,b.level,COALESCE(b.upgrade_target_level,0),b.tile_x,b.tile_y,b.rotation,
			       (b.building_key='campfire' OR b.level>0 OR bp.building_key IS NOT NULL) AS discovered
			FROM character_camp_buildings b
			LEFT JOIN character_building_blueprints bp ON bp.character_id=b.character_id AND bp.building_key=b.building_key
			WHERE b.character_id=$1 FOR UPDATE OF b`, charID)
		if err != nil {
			return nil, nil, err
		}
		occupied := make([]game.BuildingSlot, 0, 16)
		var targetSlot *game.BuildingSlot
		for rows.Next() {
			var slot game.BuildingSlot
			if err := rows.Scan(&slot.SlotKey, &slot.BuildingKey, &slot.Level, &slot.UpgradeTargetLevel, &slot.TileX, &slot.TileY, &slot.Rotation, &slot.Discovered); err != nil {
				rows.Close()
				return nil, nil, err
			}
			occupied = append(occupied, slot)
			if slot.BuildingKey == buildingKey {
				copySlot := slot
				targetSlot = &copySlot
			}
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, nil, err
		}
		if err := rows.Close(); err != nil {
			return nil, nil, err
		}

		withoutTarget := make([]game.BuildingSlot, 0, len(occupied))
		for _, slot := range occupied {
			if targetSlot != nil && slot.SlotKey == targetSlot.SlotKey {
				continue
			}
			withoutTarget = append(withoutTarget, slot)
		}

		if targetSlot == nil {
			stageKey := settlementStageKeyTx(tx, charID)
			tileX, tileY, ok := game.FindFirstFreeCampPlacementForStage(stageKey, buildingKey, 0, withoutTarget)
			if !ok {
				return nil, nil, fmt.Errorf("não há espaço livre no terreno para posicionar o projeto de construção")
			}
			instanceKey := game.CampBuildingInstanceKey(buildingKey)
			if _, err := tx.Exec(`
				INSERT INTO character_camp_buildings(character_id,slot_key,building_key,level,tile_x,tile_y,rotation,updated_at)
				VALUES($1,$2,$3,0,$4,$5,0,NOW())
				ON CONFLICT(character_id,building_key) DO NOTHING`, charID, instanceKey, buildingKey, tileX, tileY); err != nil {
				return nil, nil, fmt.Errorf("posicionar fundação do projeto: %w", err)
			}
		} else if targetSlot.Level <= 0 && targetSlot.UpgradeTargetLevel <= 0 {
			stageKey := settlementStageKeyTx(tx, charID)
			if err := game.ValidateCampPlacementForStage(stageKey, buildingKey, targetSlot.TileX, targetSlot.TileY, targetSlot.Rotation, withoutTarget, ""); err != nil {
				tileX, tileY, ok := game.FindFirstFreeCampPlacementForStage(stageKey, buildingKey, targetSlot.Rotation, withoutTarget)
				if !ok {
					return nil, nil, fmt.Errorf("não há espaço livre no terreno para posicionar o projeto de construção")
				}
				if _, err := tx.Exec(`UPDATE character_camp_buildings SET tile_x=$3,tile_y=$4,updated_at=NOW() WHERE character_id=$1 AND slot_key=$2`, charID, targetSlot.SlotKey, tileX, tileY); err != nil {
					return nil, nil, fmt.Errorf("realocar fundação recém-descoberta: %w", err)
				}
			}
		}
	}

	// 6. Incrementa revisão de estado do acampamento
	if _, err := tx.Exec(`UPDATE character_camps SET state_revision = state_revision + 1, updated_at = NOW() WHERE character_id = $1`, charID); err != nil {
		return nil, nil, fmt.Errorf("incrementar revisão do acampamento: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}

	camp, err := GetCharacterCamp(charID)
	if err != nil {
		return nil, nil, err
	}

	return gameInv, camp, nil
}

// getCampBuildingsTx lê as construções pela conexão transacional que já detém
// o lock do acampamento. Isso impede snapshots mistos durante craft/desmonte.
func getCampBuildingsTx(tx *sql.Tx, charID string) (map[string]game.BuildingSlot, error) {
	rows, err := tx.Query(`
		SELECT slot_key, building_key, level
		FROM character_camp_buildings
		WHERE character_id = $1
	`, charID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	buildings := make(map[string]game.BuildingSlot)
	for rows.Next() {
		var slot game.BuildingSlot
		if err := rows.Scan(&slot.SlotKey, &slot.BuildingKey, &slot.Level); err != nil {
			return nil, err
		}
		buildings[slot.SlotKey] = slot
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return buildings, nil
}

// helper interno para montar snapshot dentro de uma transação
func getSnapshotWithinTx(tx *sql.Tx, charID string, maxCap int64) (*game.ResourceInventorySnapshot, error) {
	rows, err := tx.Query(`SELECT resource_key, quantity FROM character_resources WHERE character_id = $1 AND quantity > 0`, charID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]game.ResourceAmount, 0)
	resMap := make(map[string]int64)
	for rows.Next() {
		var k string
		var q int64
		if err := rows.Scan(&k, &q); err != nil {
			return nil, err
		}
		if q > 0 {
			resMap[k] = q
			items = append(items, game.ResourceAmount{Key: k, Quantity: q})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var rev int64
	if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id = $1`, charID).Scan(&rev); err != nil {
		return nil, err
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Key < items[j].Key
	})

	return &game.ResourceInventorySnapshot{
		Items:           items,
		StorageUsed:     game.GetStorageUsed(resMap),
		StorageCapacity: maxCap,
		Revision:        rev,
	}, nil
}

// GetCharacterBlueprints carrega todos os projetos descobertos pelo aventureiro.
func GetCharacterBlueprints(charID string) (map[string]game.BuildingBlueprintProgress, error) {
	rows, err := DB.Query(`SELECT building_key, unlocked_max_level, source_key, discovered_at FROM character_building_blueprints WHERE character_id = $1`, charID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	blueprints := make(map[string]game.BuildingBlueprintProgress)
	for rows.Next() {
		var bp game.BuildingBlueprintProgress
		var src sql.NullString
		if err := rows.Scan(&bp.BuildingKey, &bp.UnlockedMaxLevel, &src, &bp.DiscoveredAt); err != nil {
			return nil, err
		}
		if src.Valid {
			bp.SourceKey = src.String
		}
		blueprints[bp.BuildingKey] = bp
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Fogueira é sempre descoberta inicialmente
	if _, ok := blueprints["campfire"]; !ok {
		blueprints["campfire"] = game.BuildingBlueprintProgress{
			BuildingKey:      "campfire",
			UnlockedMaxLevel: 3,
			SourceKey:        "initial",
			DiscoveredAt:     time.Now().UTC(),
		}
	}

	return blueprints, nil
}

// EnsureCharacterCamp garante a existência da linha de acampamento e seus slots padrão.
func EnsureCharacterCamp(charID string) error {
	_, err := DB.Exec(`
		INSERT INTO character_camps (character_id, layout_version, state_revision, created_at, updated_at)
		VALUES ($1, $2, 0, NOW(), NOW())
		ON CONFLICT (character_id) DO NOTHING
	`, charID, game.CampLayoutVersion)
	if err != nil {
		return err
	}

	for slotKey, buildingKey := range game.SlotToBuildingMap {
		tileX, tileY := game.GetDefaultCampPlacement(slotKey)
		_, err := DB.Exec(`
			INSERT INTO character_camp_buildings (character_id, slot_key, building_key, level, tile_x, tile_y, rotation, updated_at)
			VALUES ($1, $2, $3, 0, $4, $5, 0, NOW())
			ON CONFLICT (character_id, slot_key) DO NOTHING
		`, charID, slotKey, buildingKey, tileX, tileY)
		if err != nil {
			return err
		}
	}

	// Auto-descoberta considera tanto o kit inicial quanto construções liberadas
	// pela maturidade territorial. Isso evita dependências circulares como
	// "ser Cidade para descobrir a Muralha exigida para virar Cidade".
	stageKey := settlementStageKey(charID)
	for _, def := range game.ListBuildingDefinitions() {
		autoUnlocked := def.DefaultUnlocked || game.BuildingUnlocksAtStage(def, stageKey)
		if !autoUnlocked {
			continue
		}
		sourceKey := "initial"
		if !def.DefaultUnlocked && def.UnlockStage != "" {
			sourceKey = "stage:" + def.UnlockStage
		}
		if _, err := DB.Exec(`
			INSERT INTO character_building_blueprints (character_id, building_key, unlocked_max_level, source_key, discovered_at)
			VALUES ($1, $2, $3, $4, NOW())
			ON CONFLICT (character_id, building_key) DO UPDATE
			SET unlocked_max_level=GREATEST(character_building_blueprints.unlocked_max_level,EXCLUDED.unlocked_max_level)
		`, charID, def.Key, def.MaxLevel, sourceKey); err != nil {
			return err
		}

		// Os prédios legados já possuem placeholder. Prédios de layout livre
		// recebem uma fundação nível 0 em uma área que não colide com nenhum slot
		// legado, podendo ser arrastados antes da obra.
		instanceKey := game.CampBuildingInstanceKey(def.Key)
		var exists int
		if err := DB.QueryRow(`SELECT COUNT(*) FROM character_camp_buildings WHERE character_id=$1 AND building_key=$2`, charID, def.Key).Scan(&exists); err != nil {
			return err
		}
		if exists > 0 {
			continue
		}
		rows, err := DB.Query(`SELECT slot_key,building_key,level,COALESCE(upgrade_target_level,0),tile_x,tile_y,rotation FROM character_camp_buildings WHERE character_id=$1`, charID)
		if err != nil {
			return err
		}
		occupied := make([]game.BuildingSlot, 0, 16)
		for rows.Next() {
			var slot game.BuildingSlot
			if err := rows.Scan(&slot.SlotKey, &slot.BuildingKey, &slot.Level, &slot.UpgradeTargetLevel, &slot.TileX, &slot.TileY, &slot.Rotation); err != nil {
				rows.Close()
				return err
			}
			// Reservamos também as posições legadas ainda não descobertas para que
			// um futuro manual nunca apareça embaixo de uma cozinha existente.
			slot.Discovered = true
			occupied = append(occupied, slot)
		}
		if err := rows.Close(); err != nil {
			return err
		}
		tileX, tileY, ok := game.FindFirstFreeCampPlacementForStage(stageKey, def.Key, 0, occupied)
		if !ok {
			return fmt.Errorf("não há espaço livre para posicionar o projeto inicial de %s", def.Name)
		}
		if _, err := DB.Exec(`
			INSERT INTO character_camp_buildings(character_id,slot_key,building_key,level,tile_x,tile_y,rotation,updated_at)
			VALUES($1,$2,$3,0,$4,$5,0,NOW())
			ON CONFLICT (character_id,building_key) DO NOTHING`, charID, instanceKey, def.Key, tileX, tileY); err != nil {
			return err
		}
	}

	// Migração segura: qualquer construção com nível > 0 é automaticamente registrada como descoberta
	rows, err := DB.Query(`SELECT building_key FROM character_camp_buildings WHERE character_id = $1 AND level > 0`, charID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var bKey string
		if err := rows.Scan(&bKey); err != nil {
			return err
		}
		if _, err := DB.Exec(`
			INSERT INTO character_building_blueprints (character_id, building_key, unlocked_max_level, source_key, discovered_at)
			VALUES ($1, $2, 3, 'migrated', NOW())
			ON CONFLICT (character_id, building_key) DO NOTHING
		`, charID, bKey); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}

// GetCharacterCamp carrega o estado completo do acampamento e suas construções com bônus consolidados.
func GetCharacterCamp(charID string) (*game.CampState, error) {
	if err := EnsureCharacterCamp(charID); err != nil {
		return nil, err
	}

	var camp game.CampState
	camp.CharacterID = charID
	camp.Buildings = make(map[string]game.BuildingSlot)

	err := DB.QueryRow(`
		SELECT layout_version, state_revision 
		FROM character_camps 
		WHERE character_id = $1
	`, charID).Scan(&camp.LayoutVersion, &camp.StateRevision)
	if err != nil {
		return nil, fmt.Errorf("erro ao carregar acampamento: %w", err)
	}

	rows, err := DB.Query(`
		SELECT slot_key, building_key, level, upgrade_target_level, upgrade_started_at, upgrade_ends_at, tile_x, tile_y, rotation, updated_at
		FROM character_camp_buildings
		WHERE character_id = $1
	`, charID)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar construções: %w", err)
	}
	defer rows.Close()

	activeUpgrades := 0
	for rows.Next() {
		var slot game.BuildingSlot
		var targetLvl sql.NullInt32
		var startAt, endAt sql.NullTime

		err := rows.Scan(
			&slot.SlotKey,
			&slot.BuildingKey,
			&slot.Level,
			&targetLvl,
			&startAt,
			&endAt,
			&slot.TileX,
			&slot.TileY,
			&slot.Rotation,
			&slot.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if targetLvl.Valid {
			slot.UpgradeTargetLevel = int(targetLvl.Int32)
		}
		if startAt.Valid {
			slot.UpgradeStartedAt = &startAt.Time
		}
		if endAt.Valid {
			slot.UpgradeEndsAt = &endAt.Time
			if endAt.Time.After(time.Now().UTC()) {
				activeUpgrades++
			}
		}

		camp.Buildings[slot.SlotKey] = slot
	}

	// Carrega blueprints descobertos
	blueprints, err := GetCharacterBlueprints(charID)
	if err == nil {
		camp.Blueprints = blueprints
	}

	// Capacidade e estado de equipes de obras
	camp.MaxConstructionSlots = 1
	if mb, ok := camp.Blueprints["master_builder"]; ok && mb.UnlockedMaxLevel >= 1 {
		camp.MaxConstructionSlots = 2
	}
	camp.ActiveConstructionSlots = activeUpgrades

	// Carrega capacidade calculada
	bonuses := game.CalculateCampBonuses(camp.Buildings)
	camp.StorageCapacity = bonuses.StorageCapacity

	resMap, _ := GetCharacterResources(charID)
	camp.StorageUsed = game.GetStorageUsed(resMap)

	return &camp, nil
}

// StartBuildingUpgrade valida custos de ouro, recursos e pré-requisitos, iniciando o timer de construção.
func StartBuildingUpgrade(accountID, charID, slotKey, buildingKey string) (*game.CampState, error) {
	bDef, exists := game.GetBuildingDefinition(buildingKey)
	if !exists {
		return nil, fmt.Errorf("construção inválida: %s", buildingKey)
	}
	if slotKey == "" {
		slotKey = game.CampBuildingInstanceKey(buildingKey)
	}

	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Ordem global de locks: personagem → acampamento → recursos.
	var goldBank int64
	if err := tx.QueryRow(`SELECT gold_bank FROM characters WHERE id=$1 AND account_id=$2 FOR UPDATE`, charID, accountID).Scan(&goldBank); err != nil {
		return nil, fmt.Errorf("personagem não encontrado: %w", err)
	}
	if _, err := tx.Exec(`INSERT INTO character_camps(character_id) VALUES($1) ON CONFLICT DO NOTHING`, charID); err != nil {
		return nil, err
	}
	var campRevision int64
	if err := tx.QueryRow(`SELECT state_revision FROM character_camps WHERE character_id=$1 FOR UPDATE`, charID).Scan(&campRevision); err != nil {
		return nil, err
	}

	stageKey := settlementStageKeyTx(tx, charID)
	if bDef.UnlockStage != "" && !game.SettlementStageAtLeast(stageKey, bDef.UnlockStage) {
		return nil, fmt.Errorf("%s só pode ser projetada a partir do estágio %s", bDef.Name, bDef.UnlockStage)
	}
	if game.BuildingUnlocksAtStage(bDef, stageKey) {
		if _, err := tx.Exec(`
			INSERT INTO character_building_blueprints(character_id,building_key,unlocked_max_level,source_key,discovered_at)
			VALUES($1,$2,$3,$4,NOW())
			ON CONFLICT(character_id,building_key) DO UPDATE SET unlocked_max_level=GREATEST(character_building_blueprints.unlocked_max_level,EXCLUDED.unlocked_max_level)`,
			charID, buildingKey, bDef.MaxLevel, "stage:"+bDef.UnlockStage); err != nil {
			return nil, err
		}
	}

	// Construções não liberadas pelo estágio continuam usando manuais como fonte
	// autoritativa de descoberta.
	if !bDef.DefaultUnlocked {
		var bpCount int
		err = tx.QueryRow(`SELECT COUNT(*) FROM character_building_blueprints WHERE character_id = $1 AND building_key = $2`, charID, buildingKey).Scan(&bpCount)
		if err != nil || bpCount == 0 {
			return nil, fmt.Errorf("o projeto de %s ainda não foi descoberto", bDef.Name)
		}
	}

	// 2. Verificar se já atingiu o limite de obras ativas (Equipes de Construção)
	var ongoingUpgrades int
	err = tx.QueryRow(`
		SELECT COUNT(*) FROM character_camp_buildings 
		WHERE character_id = $1 AND upgrade_target_level IS NOT NULL AND upgrade_ends_at > NOW()
	`, charID).Scan(&ongoingUpgrades)
	if err != nil {
		return nil, fmt.Errorf("erro ao verificar fila de construções: %w", err)
	}

	maxSlots := 1
	var masterBuilderCount int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM character_building_blueprints WHERE character_id = $1 AND building_key = 'master_builder'`, charID).Scan(&masterBuilderCount); err != nil {
		return nil, fmt.Errorf("verificar equipe adicional de obras: %w", err)
	}
	if masterBuilderCount > 0 {
		maxSlots = 2
	}

	if ongoingUpgrades >= maxSlots {
		return nil, fmt.Errorf("todas as equipes de obra estão ocupadas (%d/%d). Aguarde a conclusão antes de iniciar outra", ongoingUpgrades, maxSlots)
	}

	// 3. Lock na construção atual do slot (personagem/acampamento já travados)
	var currentLevel int
	var storedBuildingKey string
	var upgradeTarget sql.NullInt32
	var upgradeEnds sql.NullTime
	err = tx.QueryRow(`
		SELECT building_key, level, upgrade_target_level, upgrade_ends_at
		FROM character_camp_buildings
		WHERE character_id = $1 AND slot_key = $2 FOR UPDATE
	`, charID, slotKey).Scan(&storedBuildingKey, &currentLevel, &upgradeTarget, &upgradeEnds)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("posicione o projeto de %s no terreno antes de iniciar a obra", bDef.Name)
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar construção: %w", err)
	}
	if storedBuildingKey != buildingKey {
		return nil, fmt.Errorf("a instância %s pertence a %s, não a %s", slotKey, storedBuildingKey, buildingKey)
	}

	// Reconciliar se já expirou
	if upgradeTarget.Valid && upgradeEnds.Valid && !upgradeEnds.Time.After(time.Now().UTC()) {
		currentLevel = int(upgradeTarget.Int32)
	}

	targetLevel := currentLevel + 1
	if targetLevel > bDef.MaxLevel {
		return nil, fmt.Errorf("a construção %s já atingiu o nível máximo (%d)", bDef.Name, bDef.MaxLevel)
	}

	lvlDef, ok := game.GetBuildingLevelDefinition(buildingKey, targetLevel)
	if !ok {
		return nil, fmt.Errorf("nível de construção não configurado")
	}
	if lvlDef.RequiredSettlementStage != "" && !game.SettlementStageAtLeast(stageKey, lvlDef.RequiredSettlementStage) {
		return nil, fmt.Errorf("%s Nv. %d requer o estágio territorial %s", bDef.Name, targetLevel, lvlDef.RequiredSettlementStage)
	}

	// 5. Validar Pré-requisitos de Outras Construções
	for _, req := range lvlDef.RequiredBuildings {
		var reqLvl int
		err := tx.QueryRow(`SELECT level FROM character_camp_buildings WHERE character_id = $1 AND building_key = $2`, charID, req.BuildingKey).Scan(&reqLvl)
		if err != nil || reqLvl < req.MinLevel {
			reqDef, _ := game.GetBuildingDefinition(req.BuildingKey)
			reqName := req.BuildingKey
			if reqDef.Name != "" {
				reqName = reqDef.Name
			}
			return nil, fmt.Errorf("pré-requisito não atendido: requer %s Nível %d (atual: Nível %d)", reqName, req.MinLevel, reqLvl)
		}
	}

	// 6. Validação de Gold
	if goldBank < lvlDef.GoldCost {
		return nil, fmt.Errorf("ouro insuficiente: requer %d Gold (atual: %d)", lvlDef.GoldCost, goldBank)
	}

	// 7. Validação de Recursos e Troféus
	resRows, err := tx.Query(`SELECT resource_key, quantity FROM character_resources WHERE character_id = $1 FOR UPDATE`, charID)
	if err != nil {
		return nil, err
	}
	resMap := make(map[string]int64)
	for resRows.Next() {
		var k string
		var q int64
		if err := resRows.Scan(&k, &q); err == nil {
			resMap[k] = q
		}
	}
	resRows.Close()

	for _, cost := range lvlDef.Costs {
		if resMap[cost.Key] < cost.Quantity {
			resDef, _ := game.GetResourceDefinition(cost.Key)
			name := cost.Key
			if resDef.Name != "" {
				name = resDef.Name
			}
			return nil, fmt.Errorf("recurso insuficiente: requer %d %s (atual: %d)", cost.Quantity, name, resMap[cost.Key])
		}
	}

	for _, trophy := range lvlDef.RequiredTrophies {
		if resMap[trophy.Key] < trophy.Quantity {
			resDef, _ := game.GetResourceDefinition(trophy.Key)
			name := trophy.Key
			if resDef.Name != "" {
				name = resDef.Name
			}
			return nil, fmt.Errorf("troféu insuficiente: requer %d %s (atual: %d)", trophy.Quantity, name, resMap[trophy.Key])
		}
	}

	// 8. Debitar Gold
	_, err = tx.Exec(`UPDATE characters SET gold_bank = gold_bank - $1, state_revision = state_revision + 1 WHERE id = $2`, lvlDef.GoldCost, charID)
	if err != nil {
		return nil, fmt.Errorf("erro ao debitar ouro: %w", err)
	}

	// 9. Debitar Recursos e Troféus
	allCosts := append([]game.ResourceAmount{}, lvlDef.Costs...)
	allCosts = append(allCosts, lvlDef.RequiredTrophies...)
	buildRequestID := fmt.Sprintf("building:%s:%d:%d", buildingKey, targetLevel, time.Now().UTC().UnixNano())
	for _, cost := range allCosts {
		var balance int64
		err = tx.QueryRow(`
			UPDATE character_resources 
			SET quantity = quantity - $1, updated_at = NOW() 
			WHERE character_id = $2 AND resource_key = $3
			RETURNING quantity
		`, cost.Quantity, charID, cost.Key).Scan(&balance)
		if err != nil {
			return nil, fmt.Errorf("erro ao debitar recurso %s: %w", cost.Key, err)
		}
		if _, err := tx.Exec(`INSERT INTO character_resource_ledger(character_id,request_id,reason,reference_key,resource_key,delta,balance_after) VALUES($1,$2,'building_upgrade',$3,$4,$5,$6)`, charID, buildRequestID, fmt.Sprintf("%s:%d", buildingKey, targetLevel), cost.Key, -cost.Quantity, balance); err != nil {
			return nil, err
		}
	}

	// 10. Agendar upgrade. O onboarding das três construções iniciais usa
	// duração zero e também deve concluir na mesma transação; contas admin/QA
	// continuam com conclusão imediata para testes.
	now := time.Now().UTC()
	var userRole string
	_ = tx.QueryRow(`SELECT role FROM accounts WHERE id = $1`, accountID).Scan(&userRole)
	completeImmediately := userRole == "admin" || lvlDef.BuildDuration <= 0

	if completeImmediately {
		// Conclusão imediata sem alterar a posição escolhida no grid.
		_, err = tx.Exec(`
			UPDATE character_camp_buildings
			SET level=$3,upgrade_target_level=NULL,upgrade_started_at=NULL,upgrade_ends_at=NULL,updated_at=NOW()
			WHERE character_id=$1 AND slot_key=$2 AND building_key=$4
		`, charID, slotKey, targetLevel, buildingKey)
	} else {
		endsAt := now.Add(lvlDef.BuildDuration)
		_, err = tx.Exec(`
			UPDATE character_camp_buildings
			SET upgrade_target_level=$3,upgrade_started_at=$4,upgrade_ends_at=$5,updated_at=NOW()
			WHERE character_id=$1 AND slot_key=$2 AND building_key=$6
		`, charID, slotKey, targetLevel, now, endsAt, buildingKey)
	}
	if err != nil {
		return nil, fmt.Errorf("erro ao atualizar construção: %w", err)
	}
	if completeImmediately {
		// A obra termina nesta mesma transação; portanto a prosperidade de
		// conclusão também precisa ser aplicada imediatamente.
		if _, err := tx.Exec(`UPDATE settlements SET prosperity=prosperity+$2,revision=revision+1,updated_at=NOW() WHERE character_id=$1`, charID, int64(25*targetLevel)); err != nil {
			return nil, fmt.Errorf("registrar prosperidade da construção: %w", err)
		}
	}

	// Incrementar revisão do acampamento
	if _, err := tx.Exec(`UPDATE character_camps SET state_revision = state_revision + 1, updated_at = NOW() WHERE character_id = $1`, charID); err != nil {
		return nil, fmt.Errorf("incrementar revisão do acampamento: %w", err)
	}
	if err := invalidateSettlementDefenseSnapshotTx(tx, charID, now); err != nil {
		return nil, fmt.Errorf("invalidar snapshot defensivo após obra: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	if completeImmediately {
		if err := reconcileSettlementStage(charID, now); err != nil {
			return nil, err
		}
	}

	return GetCharacterCamp(charID)
}

// ReconcileCampUpgrades conclui upgrades com data de término atingida.
func ReconcileCampUpgrades(charID string, now time.Time) (*game.CampState, bool, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	tx, err := DB.BeginTx(context.Background(), &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()
	rows, err := tx.Query(`
		SELECT upgrade_target_level
		FROM character_camp_buildings
		WHERE character_id=$1
		  AND upgrade_target_level IS NOT NULL
		  AND upgrade_ends_at<=$2
		FOR UPDATE`, charID, now)
	if err != nil {
		return nil, false, err
	}
	completed := 0
	prosperityGain := int64(0)
	for rows.Next() {
		var targetLevel int
		if err := rows.Scan(&targetLevel); err != nil {
			rows.Close()
			return nil, false, err
		}
		completed++
		prosperityGain += int64(25 * targetLevel)
	}
	if err := rows.Close(); err != nil {
		return nil, false, err
	}
	if completed == 0 {
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return nil, false, nil
	}

	if _, err := tx.Exec(`
		UPDATE character_camp_buildings
		SET level = upgrade_target_level,
		    upgrade_target_level = NULL,
		    upgrade_started_at = NULL,
		    upgrade_ends_at = NULL,
		    updated_at = NOW()
		WHERE character_id = $1 
		  AND upgrade_target_level IS NOT NULL 
		  AND upgrade_ends_at <= $2
	`, charID, now); err != nil {
		return nil, false, err
	}
	if _, err := tx.Exec(`UPDATE character_camps SET state_revision=state_revision+1,updated_at=NOW() WHERE character_id=$1`, charID); err != nil {
		return nil, false, err
	}
	if _, err := tx.Exec(`UPDATE settlements SET prosperity=prosperity+$2,revision=revision+1,updated_at=NOW() WHERE character_id=$1`, charID, prosperityGain); err != nil {
		return nil, false, err
	}
	if err := invalidateSettlementDefenseSnapshotTx(tx, charID, now); err != nil {
		return nil, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	if err := reconcileSettlementStage(charID, now); err != nil {
		return nil, false, err
	}
	camp, err := GetCharacterCamp(charID)
	return camp, true, err
}
