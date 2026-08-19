import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_BASE_URL } from '../config';

export interface Item {
  id: string;
  name: string;
  tier?: number;
  attack?: number;
  physical_attack?: number;
  magic_attack?: number;
  defense: number;
  weight: number;
  rarity: string;
  special_effect: string;
  value_gold?: number;
  required_level?: number;
  bonus_str?: number;
  bonus_dex?: number;
  bonus_int?: number;
  bonus_hp?: number;
  bonus_mp?: number;
  gold_bonus?: number;
  crit_chance?: number;
  lifesteal?: number;
  mana_regen?: number;
  hands?: number;
  weapon_type?: string;
  slot_type?: string;
  item_kind?: 'equipment' | 'skill_book' | 'construction_manual' | 'quest';
  unlock_building_key?: string;
  unlock_max_level?: number;
  template_key?: string;
  source?: 'legacy_drop' | 'monster_drop' | 'boss_drop' | 'crafted' | 'starter_pack' | 'quest_reward' | string;
  created_at?: string;
}

export interface EquipmentSlots {
  head?: Item | null;
  necklace?: Item | null;
  chest?: Item | null;
  mainhand?: Item | null;
  offhand?: Item | null;
  legs?: Item | null;
  boots?: Item | null;
  ring?: Item | null;
  ammo?: Item | null;
  bag?: Item | null;
}

export interface InventoryData {
  equipment: EquipmentSlots;
  backpack: Item[];
  cap: number;
  revision: number;
}

export interface DerivedStats {
  effective_str: number;
  effective_dex: number;
  effective_int: number;
  effective_vit: number;
  total_attack: number;
  total_defense: number;
  max_health: number;
  max_mana: number;
  total_capacity: number;
  max_slots?: number;
  crit_chance: number;
  mana_regen_per_second: number;
  current_dps: number;
  speed_multiplier: number;
  primary_archetype: string;
  attack_speed_seconds?: number;
  attack_speed_bonus?: number;
}

export interface ResourceAmount {
  key: string;
  quantity: number;
}

export interface BuildingSlot {
  slot_key: string;
  building_key: string;
  level: number;
  upgrade_target_level?: number;
  upgrade_started_at?: string;
  upgrade_ends_at?: string;
  updated_at: string;
}

export interface CampState {
  character_id: string;
  layout_version: number;
  state_revision: number;
  storage_used: number;
  storage_capacity: number;
  buildings: Record<string, BuildingSlot>;
  blueprints?: Record<string, import('../game/GameCatalog').BuildingBlueprintProgress>;
  active_construction_slots?: number;
  max_construction_slots?: number;
}

export interface AutoSellSettings {
  enabled: boolean;
  online_enabled: boolean;
  offline_enabled: boolean;
  trigger_percent: number;
  target_percent: number;
  sell_rarities: string[];
  sell_slot_types: string[];
  only_duplicates: boolean;
  keep_first_discovered_copy: boolean;
  keep_best_per_template: number;
  protected_template_keys: string[];
  sell_crafted_items: boolean;
  revision: number;
}

export interface AutoSellEvaluationResult {
  should_trigger: boolean;
  current_occupancy_percent: number;
  items_to_sell: Item[];
  items_kept: Item[];
  total_gold_estimated: number;
  protected_first_discovery_count: number;
  protected_rarity_count: number;
  protected_slot_count: number;
  protected_crafted_count: number;
}

export interface ProfessionProgress {
  profession_key: string;
  level: number;
  experience: number;
  xp_required: number;
  revision: number;
}

export interface GatheringActivity {
  id: string;
  resident_id?: string;
  resident_name?: string;
  expedition_key: string;
  profession_key: string;
  state: 'running' | 'claimable' | 'pending_storage' | 'claimed' | 'cancelled';
  duration_seconds: number;
  started_at: string;
  ends_at: string;
  revision: number;
}

export interface GatheringResult {
  activity_id: string;
  resident_id?: string;
  resident_name?: string;
  expedition_key: string;
  profession_key: string;
  completed_cycles: number;
  rewards: ResourceAmount[];
  accepted?: ResourceAmount[];
  pending?: ResourceAmount[];
  profession_xp: number;
  profession_level_before: number;
  profession_level_after: number;
  was_cancelled: boolean;
}

export interface SettlementResidentSkill {
  skill_key: string;
  skill_kind: string;
  level: number;
  experience: number;
  xp_required: number;
}

export interface SettlementResident {
  id: string;
  resident_key: string;
  name: string;
  icon: string;
  title: string;
  traits: string[];
  happiness: number;
  status: 'idle' | 'collecting' | 'crafting' | string;
  skills: SettlementResidentSkill[];
}

export interface HeroDesire {
  id: string;
  recipe_key: string;
  recipe_name: string;
  target_rarity: string;
  catalyst_key?: string;
  priority: number;
  max_attempts: number;
  attempts_completed: number;
  state: 'queued' | 'blocked' | 'crafting' | 'completed' | 'exhausted' | 'cancelled';
  blocked_reason?: string;
  assigned_resident_id?: string;
  assigned_resident_name?: string;
  current_order_started_at?: string;
  current_order_ready_at?: string;
  reserved_resources?: ResourceAmount[];
  reserved_gold?: number;
  result_item_id?: string;
  revision: number;
}

export interface SettlementArmoryItem {
  id: string;
  item: Item;
  source_kind: string;
  reference_key?: string;
  stored_at: string;
}

export interface SettlementState {
  id: string;
  name: string;
  stage_key: string;
  population: number;
  population_capacity: number;
  reputation: number;
  prosperity: number;
  next_resident_prosperity?: number;
  growth_blocked_reason?: string;
  prosperity_permanent: boolean;
  revision: number;
  residents: SettlementResident[];
  hero_desires: HeroDesire[];
  armory: SettlementArmoryItem[];
}

export interface PendingResourceBatch {
  source_kind: string;
  source_key: string;
  resources: ResourceAmount[];
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface EconomyState {
  professions: ProfessionProgress[];
  active_gathering?: GatheringActivity;
  active_gatherings?: GatheringActivity[];
  pending_gathering: ResourceAmount[];
  unlocked_recipes: string[];
  pending_craft_items?: Item[];
  pending_resources?: ResourceAmount[];
  pending_resource_batches?: PendingResourceBatch[];
  settlement?: SettlementState;
}

export interface CraftPreview {
  recipe_key: string;
  recipe_version: number;
  can_craft: boolean;
  missing_requirements: string[];
  costs: ResourceAmount[];
  gold_cost: number;
  rarity_chances?: Record<string, number>;
  minimum_rarity?: string;
  maximum_rarity?: string;
  estimated_seconds: number;
  preview_revision: number;
  catalyst_key?: string;
  catalyst_cost?: number;
  profession_level: number;
  station_level: number;
  rarity_table_version: number;
}

export interface CraftBatchResult {
  request_id: string;
  recipe_key: string;
  requested: number;
  completed: number;
  not_completed: number;
  stop_reason?: string;
  rarity_counts?: Record<string, number>;
  pending_count: number;
  random_failures: number;
}

export interface CombatMessage {
  protocol_version?: number;
  request_id?: string;
  seq?: number;
  state_revision?: number;
  type: string;
  timestamp: string;
  character: {
    id: string;
    name: string;
    level: number;
    health: number;
    max_health: number;
    mana: number;
    max_mana: number;
    experience: number;
    gold_bank: number;
    vocation: string;
    origin: string;
    str?: number;
    dex?: number;
    int_stat?: number;
    vit?: number;
    unspent_points?: number;
    masteries?: {
      sword_mastery?: number;
      axe_mastery?: number;
      shield_mastery?: number;
      distance_mastery?: number;
      magic_mastery?: number;
      club_mastery?: number;
    };
    learned_skills?: string[];
    active_skills?: string[];
    unlocked_regions?: string[];
    auto_resume_expedition?: boolean;
	state_revision?: number;
	progression_version?: number;
	lifetime_experience?: number;
	highest_level_ever?: number;
	xp_required?: number;
	xp_percent?: number;
  };
  inventory?: InventoryData;
  camp?: CampState;
  resources?: ResourceAmount[];
  resource_drops?: ResourceAmount[];
  resource_inventory?: {
    items: ResourceAmount[];
    storage_used: number;
    storage_capacity: number;
    revision: number;
  };
  monsters?: any[];
  monster?: {
    name: string;
    level: number;
    health: number;
    max_health: number;
    attack: number;
    status_effects?: Array<{ key: string; remaining_ticks: number; magnitude: number }>;
  };
  damage_dealt?: number;
  damage_taken?: number;
  dps?: number;
  total_attack?: number;
  total_defense?: number;
  derived_stats?: DerivedStats;
  combat_effects?: Array<{
    kind: 'skill' | 'attack' | 'heal' | 'status';
    key: string;
    source_id?: string;
    target_ids?: string[];
    amount?: number;
    is_crit?: boolean;
    status_key?: string;
  }>;
  skill_cooldowns?: Record<string, number>;
  attack_cooldown_remaining?: number;
  active_region?: string;
  active_biome?: string;
  active_stance?: string;
  current_stage?: number;
  max_stages?: number;
  is_boss_stage?: boolean;
  log_text?: string;
  item_found?: Item;
  is_active?: boolean;
  discovered_loot?: string[];
  auto_sell_settings?: AutoSellSettings;
  overflow_chest?: Item[];
  auto_sell_preview?: AutoSellEvaluationResult;
  economy?: EconomyState;
  gathering_result?: GatheringResult;
  craft_preview?: CraftPreview;
  craft_batch_result?: CraftBatchResult;
}

export function useGameSocket(token: string, characterId: string, initialChar?: any) {
  const [character, setCharacter] = useState<any>(initialChar || null);
  const [derivedStats, setDerivedStats] = useState<DerivedStats | null>(null);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [inventory, setInventory] = useState<InventoryData>({
    equipment: {},
    backpack: [],
    cap: initialChar?.level ? 1000 + initialChar.level * 10 : 1500,
    revision: 0,
  });
  const [discoveredLoot, setDiscoveredLoot] = useState<string[]>([]);
  const [autoSellSettings, setAutoSellSettings] = useState<AutoSellSettings | null>(null);
  const [overflowChest, setOverflowChest] = useState<Item[]>([]);
  const [autoSellPreview, setAutoSellPreview] = useState<AutoSellEvaluationResult | null>(null);
  const [camp, setCamp] = useState<CampState | null>(null);
  const [resources, setResources] = useState<ResourceAmount[]>([]);
  const [resourceInventory, setResourceInventory] = useState<{
    items: ResourceAmount[];
    storage_used: number;
    storage_capacity: number;
    revision: number;
  } | null>(null);
  const [economy, setEconomy] = useState<EconomyState | null>(null);
  const [craftPreview, setCraftPreview] = useState<CraftPreview | null>(null);
  const [lastCraftBatchResult, setLastCraftBatchResult] = useState<CraftBatchResult | null>(null);
  const [lastGatheringResult, setLastGatheringResult] = useState<GatheringResult | null>(null);
  const [salvagePreview, setSalvagePreview] = useState<{ item: Item; yield: ResourceAmount[] } | null>(null);
  const [monster, setMonster] = useState<any>(null);
  const [totalAttack, setTotalAttack] = useState(15);
  const [totalDefense, setTotalDefense] = useState(5);
  const [activeRegion, setActiveRegion] = useState(initialChar?.active_region || 'forest');
  const [activeStance, setActiveStance] = useState(initialChar?.active_stance || 'balanced');
  const [currentStage, setCurrentStage] = useState(initialChar?.current_stage || 1);
  const [maxStages, setMaxStages] = useState(5);
  const [isBossStage, setIsBossStage] = useState(initialChar?.is_boss_stage || false);
  const [unlockedRegions, setUnlockedRegions] = useState<string[]>(
    initialChar?.unlocked_regions || []
  );
  const [isExpeditionActive, setIsExpeditionActive] = useState(initialChar?.is_expedition_active || false);
  const [autoResumeExpedition, setAutoResumeExpeditionState] = useState(initialChar?.auto_resume_expedition || false);
  const [dps, setDps] = useState(0);
  const [attackCooldownRemaining, setAttackCooldownRemaining] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const onCombatEventRef = useRef<((event: CombatMessage) => void) | null>(null);
  const lastSequenceRef = useRef<number>(0);
  const lastCharacterRevisionRef = useRef<number>(initialChar?.state_revision || 0);
  const lastInventoryRevisionRef = useRef<number>(0);
  const lastCampRevisionRef = useRef<number>(0);
  const lastResourceRevisionRef = useRef<number>(0);
  const activeCharacterRef = useRef<string>(characterId);

  useEffect(() => {
    if (activeCharacterRef.current === characterId) return;
    activeCharacterRef.current = characterId;
    lastSequenceRef.current = 0;
    lastCharacterRevisionRef.current = initialChar?.state_revision || 0;
    lastInventoryRevisionRef.current = 0;
    lastCampRevisionRef.current = 0;
    lastResourceRevisionRef.current = 0;
  }, [characterId, initialChar?.state_revision]);

  const setOnCombatEvent = useCallback((cb: (event: CombatMessage) => void) => {
    onCombatEventRef.current = cb;
  }, []);

  const requestStateSync = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'REQUEST_STATE_SYNC',
        })
      );
    }
  }, []);

  useEffect(() => {
    if (!token || !characterId) return;

    let isMounted = true;
    let reconnectTimer: any = null;

    const connect = () => {
      if (!isMounted) return;
      const wsUrl = `${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}&character_id=${encodeURIComponent(characterId)}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) {
          ws.close();
          return;
        }
        setConnected(true);
        lastSequenceRef.current = 0;
		lastCharacterRevisionRef.current = Math.max(lastCharacterRevisionRef.current, initialChar?.state_revision || 0);
        setLogs((prev) => ['Conectado ao servidor Go via WebSocket.', ...prev]);
      };

      ws.onmessage = (event) => {
        try {
          const msg: CombatMessage = JSON.parse(event.data);

          if (msg.seq) {
            if (lastSequenceRef.current > 0 && msg.seq > lastSequenceRef.current + 1) {
              console.warn(
                `[WebSocket] Salto de sequência detectado (esperado: ${lastSequenceRef.current + 1}, recebido: ${msg.seq}). Solicitando sincronização de estado...`
              );
              requestStateSync();
            }
            lastSequenceRef.current = msg.seq;
          }

          if (msg.character) {
			const incomingRevision = msg.character.state_revision ?? msg.state_revision ?? 0;
			if (incomingRevision >= lastCharacterRevisionRef.current) {
			  lastCharacterRevisionRef.current = incomingRevision;
			  setCharacter(msg.character);
			  if (msg.character.unlocked_regions) {
				setUnlockedRegions(msg.character.unlocked_regions);
			  }
			  if (msg.character.auto_resume_expedition !== undefined) {
				setAutoResumeExpeditionState(msg.character.auto_resume_expedition);
			  }
            }
          }

          if (msg.inventory && (msg.inventory.revision || 0) >= lastInventoryRevisionRef.current) {
            lastInventoryRevisionRef.current = msg.inventory.revision || 0;
            setInventory({
              equipment: msg.inventory.equipment || {},
              backpack: Array.isArray(msg.inventory.backpack) ? msg.inventory.backpack : [],
              cap: msg.inventory.cap || 1500,
              revision: msg.inventory.revision || 0,
            });
          }

          if (msg.discovered_loot && Array.isArray(msg.discovered_loot)) {
            setDiscoveredLoot((prev) => Array.from(new Set([...prev, ...msg.discovered_loot!])));
          }

          if (msg.auto_sell_settings) {
            setAutoSellSettings(msg.auto_sell_settings);
          }

          if (msg.overflow_chest !== undefined) {
            setOverflowChest(Array.isArray(msg.overflow_chest) ? msg.overflow_chest : []);
          }

          if (msg.auto_sell_preview) {
            setAutoSellPreview(msg.auto_sell_preview);
          }

		  // A conexão WebSocket preserva a ordem das mensagens. A economia agora
		  // possui revisões independentes para várias ordens e para o assentamento;
		  // comparar somente a coleta "principal" descartaria atualizações válidas.
		  if (msg.economy) setEconomy(msg.economy);
			  if (msg.craft_preview) {
				setCraftPreview(msg.craft_preview);
			  }
			  if (msg.craft_batch_result) {
				setLastCraftBatchResult(msg.craft_batch_result);
			  }
		  if (msg.gathering_result) {
			setLastGatheringResult(msg.gathering_result);
		  }

          if (msg.camp && msg.camp.state_revision >= lastCampRevisionRef.current) {
            lastCampRevisionRef.current = msg.camp.state_revision;
            setCamp(msg.camp);
          }

          if (msg.resource_inventory && msg.resource_inventory.revision >= lastResourceRevisionRef.current) {
            lastResourceRevisionRef.current = msg.resource_inventory.revision;
            lastCampRevisionRef.current = Math.max(lastCampRevisionRef.current, msg.resource_inventory.revision);
            setResourceInventory(msg.resource_inventory);
            setResources(msg.resource_inventory.items);
            // O snapshot de recursos é autoritativo mesmo quando o evento não
            // carrega o objeto camp (ex.: crafting). Isso elimina a capacidade
            // visual atrasada que antes só corrigia após refresh.
            setCamp((prev) => {
              if (!prev && !msg.camp) return prev;
              return {
                ...(prev || msg.camp!),
                ...(msg.camp || {}),
                storage_used: msg.resource_inventory!.storage_used,
                storage_capacity: msg.resource_inventory!.storage_capacity,
                state_revision: msg.resource_inventory!.revision,
              };
            });
          } else if (msg.resources && !msg.resource_inventory) {
            setResources(msg.resources);
          }

          if (msg.type === 'SALVAGE_PREVIEW' && msg.item_found && msg.resource_drops) {
            setSalvagePreview({ item: msg.item_found, yield: msg.resource_drops });
          }

          if (msg.type === 'SALVAGE_COMPLETED') {
            setSalvagePreview(null);
          }

          if (msg.total_attack !== undefined) {
            setTotalAttack(msg.total_attack);
          }
          if (msg.total_defense !== undefined) {
            setTotalDefense(msg.total_defense);
          }

          if (msg.active_region) {
            setActiveRegion(msg.active_region);
          }

          if (msg.current_stage !== undefined && msg.current_stage > 0) {
            setCurrentStage(msg.current_stage);
          }
          if (msg.max_stages !== undefined && msg.max_stages > 0) {
            setMaxStages(msg.max_stages);
          }
          if (msg.is_boss_stage !== undefined) {
            setIsBossStage(msg.is_boss_stage);
          }

          if (msg.dps !== undefined) {
            setDps(msg.dps);
          }

          if (msg.active_stance) {
            setActiveStance(msg.active_stance);
          }

          if (msg.monster !== undefined) {
            setMonster(msg.monster);
          }

          if (msg.derived_stats) {
            setDerivedStats(msg.derived_stats);
          }

          if (typeof msg.attack_cooldown_remaining === 'number') {
            setAttackCooldownRemaining(msg.attack_cooldown_remaining);
          }

          if (msg.skill_cooldowns !== undefined) {
            setSkillCooldowns(msg.skill_cooldowns);
          }

		  if (msg.is_active !== undefined) {
			setIsExpeditionActive(msg.is_active);
		  }

          if (msg.log_text && msg.log_text.trim() !== '') {
            const timeStr = msg.timestamp ? `[${msg.timestamp}] ` : '';
            const fullLogMsg = `${timeStr}${msg.log_text}`;
            setLogs((prev) => {
              if (prev.length > 0 && prev[0].slice(11) === msg.log_text) {
                return prev;
              }
              return [fullLogMsg, ...prev.slice(0, 49)];
            });
          }

          if (onCombatEventRef.current) {
            onCombatEventRef.current(msg);
          }
        } catch (err) {
          console.error('Erro processando mensagem WebSocket:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Erro no WebSocket:', err);
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnected(false);
        reconnectTimer = setTimeout(() => {
          connect();
        }, 1500);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [token, characterId]);

  const toggleExpedition = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'TOGGLE_EXPEDITION' }));
    }
  };

  const changeRegion = (region: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CHANGE_REGION', region, region_id: region }));
    }
  };

  const setStance = (stance: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'SET_STANCE', stance }));
    }
  };

  const equipItem = (itemId: string, slot: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'EQUIP_ITEM', item_id: itemId, slot }));
    }
  };

  const unequipItem = (slot: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'UNEQUIP_ITEM', slot }));
    }
  };

  const discardItem = (itemId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'DISCARD_ITEM', item_id: itemId }));
    }
  };

  const toggleSkill = (skill: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'TOGGLE_SKILL', skill }));
    }
  };

  const allocateStat = (stat: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'ALLOCATE_STAT', stat }));
    }
  };

  const bulkSell = (itemIds: string[]) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'BULK_SELL', item_ids: itemIds }));
    }
  };

  const setAutoResumeExpedition = (enabled: boolean) => {
    setAutoResumeExpeditionState(enabled);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'SET_AUTO_RESUME', enabled }));
    }
  };

  const startBuildingUpgrade = (slotKey: string, buildingKey: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'START_BUILDING_UPGRADE', slot_key: slotKey, building_key: buildingKey }));
    }
  };

  const requestSalvagePreview = (itemId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'SALVAGE_PREVIEW', item_id: itemId }));
    }
  };

  const salvageItem = (itemId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'SALVAGE_ITEM', item_id: itemId }));
    }
  };

  const clearSalvagePreview = () => {
    setSalvagePreview(null);
  };

  const discardResource = (resourceKey: string, quantity: number, expectedRevision?: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'DISCARD_RESOURCE',
          resource_key: resourceKey,
          quantity,
          expected_revision: expectedRevision ?? camp?.state_revision,
        })
      );
    }
  };

  const learnBuildingBlueprint = (itemId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'LEARN_BUILDING_BLUEPRINT',
          item_id: itemId,
        })
      );
    }
  };

  const salvageBatch = (itemIds: string[], safeMode: boolean = false) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const requestId = `salvage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      socketRef.current.send(
        JSON.stringify({
          action: 'SALVAGE_BATCH',
          request_id: requestId,
          item_ids: itemIds,
          safe_mode: safeMode,
        })
      );
    }
  };

  const updateAutoSellSettings = (settings: AutoSellSettings) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'UPDATE_AUTO_SELL_SETTINGS',
          auto_sell_settings: settings,
        })
      );
    }
  };

  const requestAutoSellPreview = (settings: AutoSellSettings) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'REQUEST_AUTO_SELL_PREVIEW',
          auto_sell_settings: settings,
        })
      );
    }
  };

  const claimOverflowItem = (itemId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'CLAIM_OVERFLOW_ITEM',
          item_id: itemId,
        })
      );
    }
  };

  const sellOverflowItem = (itemId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'SELL_OVERFLOW_ITEM',
          item_id: itemId,
        })
      );
    }
  };

  const sellAllOverflow = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: 'SELL_ALL_OVERFLOW',
        })
      );
    }
  };

  const makeRequestId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const startGathering = (expeditionKey: string, durationSeconds: number) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'START_GATHERING', expedition_key: expeditionKey, duration_seconds: durationSeconds, request_id: makeRequestId('gather') }));
	}
  };

  const cancelGathering = (activityId: string) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'CANCEL_GATHERING', activity_id: activityId, request_id: makeRequestId('cancel') }));
	}
  };

  const claimGatheringRewards = (activityId: string) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'CLAIM_GATHERING_REWARDS', activity_id: activityId, request_id: makeRequestId('claim') }));
	}
  };

  const requestCraftPreview = (recipeKey: string, catalystKey: string = '') => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'REQUEST_CRAFT_PREVIEW', recipe_key: recipeKey, catalyst_key: catalystKey, request_id: makeRequestId('preview') }));
	}
  };

  const craftItem = (recipeKey: string, catalystKey: string = '', previewRevision?: number, quantity: number = 1) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      setLastCraftBatchResult(null);
      socketRef.current.send(JSON.stringify({ action: 'CRAFT_ITEM', recipe_key: recipeKey, catalyst_key: catalystKey, preview_revision: previewRevision ?? craftPreview?.preview_revision ?? 0, quantity: Math.max(1, Math.min(50, quantity)), request_id: makeRequestId('craft') }));
    }
  };

  const requestEconomySync = () => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'REQUEST_ECONOMY_SYNC', request_id: makeRequestId('economy') }));
	}
  };

  const claimPendingCraft = (itemId: string) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'CLAIM_PENDING_CRAFT', item_id: itemId, request_id: makeRequestId('claimcraft') }));
	}
  };

  const claimPendingResources = () => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'CLAIM_PENDING_RESOURCES', request_id: makeRequestId('claimresources') }));
	}
  };

  const createHeroDesire = (recipeKey: string, targetRarity: string, catalystKey: string, maxAttempts: number, priority: number) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'CREATE_HERO_DESIRE', recipe_key: recipeKey, target_rarity: targetRarity, catalyst_key: catalystKey, max_attempts: maxAttempts, priority, request_id: makeRequestId('desire') }));
	}
  };

  const cancelHeroDesire = (desireId: string) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'CANCEL_HERO_DESIRE', desire_id: desireId, request_id: makeRequestId('canceldesire') }));
	}
  };

  const claimArmoryItem = (armoryId: string) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'CLAIM_ARMORY_ITEM', armory_id: armoryId, request_id: makeRequestId('armory') }));
	}
  };

  return {
    character,
    camp,
    resources,
    resourceInventory,
    salvagePreview,
    derivedStats,
    skillCooldowns,
    inventory,
    discoveredLoot,
    autoSellSettings,
    overflowChest,
    autoSellPreview,
    economy,
    craftPreview,
    lastCraftBatchResult,
    lastGatheringResult,
    monster,
    totalAttack,
    totalDefense,
    activeRegion,
    activeStance,
    currentStage,
    maxStages,
    isBossStage,
    unlockedRegions,
    isExpeditionActive,
    autoResumeExpedition,
    dps,
    attackCooldownRemaining,
    logs,
    connected,
    toggleExpedition,
    setAutoResumeExpedition,
    equipItem,
    unequipItem,
    discardItem,
    discardResource,
    changeRegion,
    setStance,
    toggleSkill,
    allocateStat,
    bulkSell,
    startBuildingUpgrade,
    requestSalvagePreview,
    salvageItem,
    salvageBatch,
    learnBuildingBlueprint,
    clearSalvagePreview,
    updateAutoSellSettings,
    requestAutoSellPreview,
    claimOverflowItem,
    sellOverflowItem,
    sellAllOverflow,
    requestStateSync,
	startGathering,
	cancelGathering,
	claimGatheringRewards,
	requestCraftPreview,
	craftItem,
	requestEconomySync,
	claimPendingCraft,
	claimPendingResources,
	createHeroDesire,
	cancelHeroDesire,
	claimArmoryItem,
    setOnCombatEvent,
  };
}
