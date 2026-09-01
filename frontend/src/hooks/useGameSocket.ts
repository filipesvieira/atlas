import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import type { ImportantNotification } from '../types/notifications';

const IGNORED_LOG_TYPES = new Set(['COMBAT_EVENT', 'TICK_UPDATE', 'HERO_MOVEMENT', 'AUTO_SELL_PREVIEW', 'STATE_SNAPSHOT']);

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
  movement_speed_bonus?: number;
  hands?: number;
  weapon_type?: string;
  slot_type?: string;
  item_kind?: 'equipment' | 'skill_book' | 'construction_manual' | 'quest';
  unlock_building_key?: string;
  unlock_max_level?: number;
  template_key?: string;
  visual_key?: string;
  set_key?: string;
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
  movement_speed_multiplier?: number;
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
  tile_x: number;
  tile_y: number;
  rotation: number;
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

export interface AutoPotionSettings {
  enabled: boolean;
  health_threshold_percent: number;
  mana_threshold_percent: number;
  max_gold_per_expedition: number;
  revision: number;
}

export interface AutoPotionState {
  gold_spent: number;
  health_cooldown_until?: string;
  mana_cooldown_until?: string;
  budget_exhausted: boolean;
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
  wage_reserved: number;
  wage_paid: number;
  wage_rule_version: number;
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
  wage_reserved: number;
  wage_paid: number;
  wage_refunded: number;
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

export interface SettlementStageDefinition {
  key: string;
  name: string;
  icon: string;
  min_prosperity: number;
  min_population: number;
  required_buildings: Record<string, number>;
  territory_width?: number;
  territory_height?: number;
}

export interface SettlementStageRequirementProgress {
  kind: 'prosperity' | 'population' | 'building' | string;
  key: string;
  required: number;
  current: number;
  met: boolean;
}

export interface SettlementStageProgress {
  current: SettlementStageDefinition;
  next?: SettlementStageDefinition;
  requirements: SettlementStageRequirementProgress[];
  ready: boolean;
}

export interface SettlementDefenseFoundation {
  raids_enabled: boolean;
  strategy: string;
  shield_until?: string;
  revision: number;
  snapshot_ready: boolean;
}

export interface SettlementState {
  id: string;
  name: string;
  stage_key: string;
  stage_progress?: SettlementStageProgress;
  territory?: { min_x: number; min_y: number; max_x: number; max_y: number };
  defense?: SettlementDefenseFoundation;
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
  treasury?: {
    balance: number;
    reserved_payroll: number;
    lifetime_income: number;
    lifetime_expenses: number;
    auto_fund_enabled: boolean;
    personal_gold_reserve: number;
    payroll_unlocked: boolean;
    unlock_prosperity: number;
    base_hourly_wage: number;
    economy_version: number;
  };
}

export interface PendingResourceBatch {
  source_kind: string;
  source_key: string;
  resources: ResourceAmount[];
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveBuff {
  category: 'meal' | string;
  source_resource_key: string;
  source_name: string;
  effect_key: 'xp_gain_percent' | 'attack_percent' | string;
  magnitude: number;
  started_at: string;
  expires_at: string;
  content_version: number;
}

export interface ConsumeResult {
  request_id: string;
  resource_key: string;
  active_buff: ActiveBuff;
  replaced_buff?: ActiveBuff;
  resource_inventory: { items: ResourceAmount[]; storage_used: number; storage_capacity: number; revision: number };
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
  active_buffs?: ActiveBuff[];
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

export interface ChatMessage {
  id: string;
  channel: 'world' | 'region' | 'kingdom' | 'pvp' | string;
  sender_id: string;
  sender_name: string;
  sender_level: number;
  text: string;
  created_at: string;
}

export interface PublicPlayerProfile {
  character_id: string;
  name: string;
  level: number;
  region?: string;
  rating: number;
  wins: number;
  losses: number;
  title_key?: string;
  banner_key?: string;
}

export interface DuelChallenge {
  id: string;
  request_id?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | string;
  challenger: PublicPlayerProfile;
  target: PublicPlayerProfile;
  created_at: string;
  expires_at: string;
  responded_at?: string;
}

export type PvPTacticalStrategy = 'aggressive' | 'balanced' | 'defensive';

export interface PvPMatchNotice {
  id: string;
  challenge_id: string;
  arena_key: string;
  status: 'ready' | 'active' | 'completed' | 'cancelled' | string;
  rules_version: number;
  created_at: string;
  player_confirmed: boolean;
  tactical_strategy?: PvPTacticalStrategy;
  strategy_version?: number;
  ranked?: boolean;
  match_origin?: string;
}

export interface PvPCombatActor {
  character_id: string;
  name: string;
  level: number;
  team: 'a' | 'b' | string;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  grid_x: number;
  grid_y: number;
  state: string;
  target_id?: string;
  archetype: 'melee' | 'distance' | 'magic' | string;
  skin_key?: string;
}

export interface PvPCombatEvent {
  tick: number;
  kind: string;
  source_id?: string;
  target_id?: string;
  skill_key?: string;
  amount?: number;
  is_critical?: boolean;
  is_healing?: boolean;
  winner_id?: string;
}

export interface PvPCombatSnapshot {
  match_id: string;
  arena_key: string;
  status: 'active' | 'completed' | 'cancelled' | string;
  tick: number;
  started_at: string;
  ended_at?: string;
  winner_id?: string;
  actors: PvPCombatActor[];
  events?: PvPCombatEvent[];
}


export interface PvPMatchHistoryEntry {
  match_id: string;
  origin: string;
  opponent_id: string;
  opponent_name: string;
  result: 'win'|'loss'|'draw'|string;
  rating_before: number;
  rating_after: number;
  rating_delta: number;
  combat_power: number;
  opponent_power: number;
  ranked?: boolean;
  season_number?: number;
  honor_awarded?: number;
  repeat_multiplier?: number;
  completion_reason?: string;
  duration_seconds?: number;
  disconnect_count?: number;
  disconnected_seconds?: number;
  metrics?: PvPCombatMetrics;
  started_at: string;
  ended_at: string;
}
export interface PvPReplayEvent { sequence:number; event_type:string; payload:Record<string,unknown>; created_at:string; }
export interface PvPMatchReplay { match_id:string; events:PvPReplayEvent[]; }
export interface PvPMatchmakingStatus {
  queued:boolean;
  rating:number;
  combat_power:number;
  queued_at?:string;
  queue_mode?:'casual'|'ranked'|string;
  season_number?:number;
  tier?:string;
  honor?:number;
}

export interface PvPRankTierInfo {
  key:string;
  name:string;
  min_rating:number;
  icon:string;
  order:number;
}

export interface PvPRankedProfile {
  season_id:string;
  character_id:string;
  rating:number;
  peak_rating:number;
  wins:number;
  losses:number;
  draws:number;
  placements_played:number;
  honor:number;
  tier:PvPRankTierInfo;
}

export interface PvPSeason {
  id:string;
  number:number;
  name:string;
  status:string;
  starts_at:string;
  ends_at:string;
  closed_at?:string;
}

export interface PvPSeasonReward {
  id:string;
  season_id:string;
  season_number:number;
  reward_key:string;
  reward_type:string;
  metadata:Record<string,string>;
  earned_at:string;
  claimed_at?:string;
}

export interface PvPSeasonStatus {
  season:PvPSeason;
  profile:PvPRankedProfile;
  pending_rewards:PvPSeasonReward[];
}

export interface PvPLadderEntry {
  rank:number;
  character_id:string;
  name:string;
  level:number;
  rating:number;
  peak_rating:number;
  wins:number;
  losses:number;
  draws:number;
  honor:number;
  tier:PvPRankTierInfo;
}

export interface PvPCombatMetrics {
  character_id:string;
  damage_dealt:number;
  damage_taken:number;
  healing_done:number;
  basic_attacks:number;
  skills_used:number;
  critical_hits:number;
  movement_ticks:number;
  chase_ticks:number;
  kite_ticks:number;
  first_contact_tick?:number;
  damage_before_contact:number;
}

export interface PvPTierDistributionEntry { tier:PvPRankTierInfo; players:number; percent:number; }
export interface PvPCompetitiveOverview {
  season_number:number;
  positioned_players:number;
  ranked_matches:number;
  average_duration_seconds:number;
  forfeit_matches:number;
  repeat_limited_matches:number;
  tier_distribution:PvPTierDistributionEntry[];
}
export interface PvPCosmeticUnlock { type:'title'|'banner'|'cosmetic'|string; key:string; season_number?:number; unlocked_at:string; }
export interface PvPCosmeticCollection {
  equipped_title?:string;
  equipped_banner?:string;
  equipped_cosmetic?:string;
  unlocks:PvPCosmeticUnlock[];
}

export interface CombatMessage {
  protocol_version?: number;
  request_id?: string;
  seq?: number;
  state_revision?: number;
  type: string;
  timestamp: string;
  stream?: 'social' | string;
  chat_message?: ChatMessage;
  chat_history?: ChatMessage[];
  presence?: { online_count: number };
  public_profile?: PublicPlayerProfile;
	duel_challenge?: DuelChallenge;
	duel_challenges?: DuelChallenge[];
	pvp_match_notice?: PvPMatchNotice;
	pvp_combat?: PvPCombatSnapshot;
  pvp_history?: PvPMatchHistoryEntry[];
  pvp_replay?: PvPMatchReplay;
  pvp_matchmaking?: PvPMatchmakingStatus;
  pvp_season?: PvPSeasonStatus;
  pvp_ladder?: PvPLadderEntry[];
  pvp_rewards?: PvPSeasonReward[];
  pvp_competitive?: PvPCompetitiveOverview;
  pvp_cosmetics?: PvPCosmeticCollection;
  error?: string;
  character?: {
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
    equipped_skin_key?: string;
    active_pvp_match_id?: string;
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
  character_delta?: {
    health: number;
    max_health: number;
    mana: number;
    max_mana: number;
    level: number;
    experience: number;
    gold_bank: number;
    unspent_points: number;
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
  arena?: {
    key: string;
    width: number;
    height: number;
    projectile_follow?: boolean;
    hero: {
      grid_x: number;
      grid_y: number;
      state?: string;
      target_id?: string;
      movement_speed_multiplier?: number;
    };
  };
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
  notification_text?: string;
  item_found?: Item;
  is_active?: boolean;
  discovered_loot?: string[];
  auto_sell_settings?: AutoSellSettings;
	  auto_potion_settings?: AutoPotionSettings;
	  auto_potion_state?: AutoPotionState;
  overflow_chest?: Item[];
  auto_sell_preview?: AutoSellEvaluationResult;
  economy?: EconomyState;
  active_buffs?: ActiveBuff[];
  gathering_result?: GatheringResult;
  craft_preview?: CraftPreview;
  craft_result?: {
    item?: Item;
    resources?: ResourceAmount[];
    rarity?: string;
    recipe_key?: string;
    transaction_id?: string;
    sent_to_backpack?: boolean;
    sent_to_armory?: boolean;
  };
  craft_batch_result?: CraftBatchResult;
  consume_result?: ConsumeResult;
}

function importantNotificationForMessage(msg: CombatMessage, previousCharacter: any): ImportantNotification | null {
  const rawMessage = (msg.notification_text || msg.log_text || '').trim();
  const eventId = `${msg.type}:${msg.seq || msg.request_id || msg.timestamp}:${msg.craft_result?.transaction_id || msg.gathering_result?.activity_id || ''}`;
  const notification = (
    category: ImportantNotification['category'],
    icon: string,
    title: string,
    message: string,
  ): ImportantNotification => ({
    id: eventId,
    category,
    icon,
    title,
    message: message || rawMessage,
    timestamp: msg.timestamp || new Date().toISOString(),
    read: false,
  });

  const character = msg.character;
  if (character && previousCharacter && character.level > (previousCharacter.level || 0)) {
    const availablePoints = character.unspent_points || 0;
    const points = availablePoints > 0 ? ` ${availablePoints} ponto(s) aguardam distribuição.` : '';
    return notification('progress', '🌟', 'Você subiu de nível', `Nível ${previousCharacter.level} → ${character.level}.${points}`);
  }

  if (character && previousCharacter && (character.unspent_points || 0) > (previousCharacter.unspent_points || 0)) {
    return notification('progress', '✨', 'Pontos disponíveis', `${character.unspent_points || 0} ponto(s) de atributo aguardam distribuição.`);
  }

  if (msg.type === 'SKILL_LEARNED') {
    return notification('skill', '📚', 'Nova habilidade aprendida', rawMessage || 'Uma nova habilidade foi aprendida permanentemente.');
  }

  if (msg.type === 'GATHERING_AUTO_CLAIMED' || msg.type === 'GATHERING_CLAIMED') {
    const result = msg.gathering_result;
    const worker = result?.resident_name || 'O trabalhador';
    const cycles = result?.completed_cycles ? ` ${result.completed_cycles} ciclo(s)` : '';
    return notification('gathering', '🏡', msg.type === 'GATHERING_AUTO_CLAIMED' ? 'Trabalhador retornou' : 'Coleta concluída', rawMessage || `${worker} voltou${cycles} e entregou a produção no Depósito.`);
  }

  if (msg.type === 'HERO_DESIRE_ATTEMPT_COMPLETED' && msg.craft_result?.item) {
    const item = msg.craft_result.item;
    const destination = msg.craft_result.sent_to_backpack
      ? 'foi enviado diretamente para a mochila.'
      : 'foi craftado e guardado no Arsenal.';
    return notification('craft', '🏰', 'Equipamento de Ambição pronto', `${item.name}${item.rarity ? ` (${item.rarity})` : ''} ${destination}`);
  }

  if (msg.type === 'HERO_DESIRE_ATTEMPT_COMPLETED' && (msg.craft_result?.resources?.length || 0) > 0) {
    const output = msg.craft_result!.resources!.map((resource) => `+${resource.quantity} ${resource.key}`).join(', ');
    return notification('craft', '🏡', 'Produção da Ambição concluída', rawMessage || `${output} foi entregue ao Depósito.`);
  }

  if (msg.type === 'CRAFT_COMPLETED' || msg.type === 'CRAFT_BATCH_COMPLETED') {
    const item = msg.craft_result?.item;
    const completed = msg.craft_batch_result?.completed || (item ? 1 : 0);
    const itemMessage = item ? `${item.name}${item.rarity ? ` (${item.rarity})` : ''} foi craftado com sucesso.` : `${completed} produção(ões) concluída(s) com sucesso.`;
    return notification('craft', '⚒️', 'Craft concluído', itemMessage);
  }

  if (msg.type === 'ARMORY_ITEM_CLAIMED' || msg.type === 'PENDING_CRAFT_CLAIMED') {
    return notification('reward', '🎁', 'Item recebido', msg.item_found?.name ? `${msg.item_found.name} foi enviado para a mochila.` : rawMessage);
  }

  if (msg.type === 'WELCOME_EVENT' && /trabalhador|produção|entreg/i.test(rawMessage)) {
    return notification('gathering', '🏡', 'Produção recebida', rawMessage);
  }

  // COMBAT_EVENT, EXPEDITION_STATUS e avisos de suprimentos ficam fora do
  // feed de acontecimentos importantes. O log de batalha continua recebendo
  // esses textos quando aplicável, mas o sino deve destacar apenas fatos que
  // exigem atenção fora do combate: progresso, produção, coleta e itens.

  return null;
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
	const [autoPotionSettings, setAutoPotionSettings] = useState<AutoPotionSettings | null>(null);
	const [autoPotionState, setAutoPotionState] = useState<AutoPotionState | null>(null);
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
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [lastPublicProfile, setLastPublicProfile] = useState<PublicPlayerProfile | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
	const [pendingDuelChallenges, setPendingDuelChallenges] = useState<DuelChallenge[]>([]);
	const [pvpMatchNotice, setPvPMatchNotice] = useState<PvPMatchNotice | null>(null);
	const [pvpArenaWaiting, setPvPArenaWaiting] = useState(false);
	const [pvpCombat, setPvPCombat] = useState<PvPCombatSnapshot | null>(null);
	const [pvpHistory, setPvPHistory] = useState<PvPMatchHistoryEntry[]>([]);
	const [pvpReplay, setPvPReplay] = useState<PvPMatchReplay | null>(null);
	const [pvpMatchmaking, setPvPMatchmaking] = useState<PvPMatchmakingStatus>({ queued:false, rating:1000, combat_power:0 });
	const [pvpSeason, setPvPSeason] = useState<PvPSeasonStatus | null>(null);
	const [pvpLadder, setPvPLadder] = useState<PvPLadderEntry[]>([]);
	const [pvpCompetitive, setPvPCompetitive] = useState<PvPCompetitiveOverview | null>(null);
	const [pvpCosmetics, setPvPCosmetics] = useState<PvPCosmeticCollection | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const onCombatEventRef = useRef<((event: CombatMessage) => void) | null>(null);
  const onImportantNotificationRef = useRef<((notification: ImportantNotification) => void) | null>(null);
  const lastSequenceRef = useRef<number>(0);
  const lastCharacterRevisionRef = useRef<number>(initialChar?.state_revision || 0);
  const lastInventoryRevisionRef = useRef<number>(0);
  const lastCampRevisionRef = useRef<number>(0);
  const lastResourceRevisionRef = useRef<number>(0);
  const activeCharacterRef = useRef<string>(characterId);
  const previousCharacterRef = useRef<any>(initialChar || null);

  useEffect(() => {
    if (activeCharacterRef.current === characterId) return;
    activeCharacterRef.current = characterId;
    lastSequenceRef.current = 0;
    lastCharacterRevisionRef.current = initialChar?.state_revision || 0;
    lastInventoryRevisionRef.current = 0;
    lastCampRevisionRef.current = 0;
    lastResourceRevisionRef.current = 0;
    previousCharacterRef.current = initialChar || null;
  }, [characterId, initialChar?.state_revision]);

  const setOnCombatEvent = useCallback((cb: (event: CombatMessage) => void) => {
    onCombatEventRef.current = cb;
  }, []);

  const setOnImportantNotification = useCallback((cb: (notification: ImportantNotification) => void) => {
    onImportantNotificationRef.current = cb;
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

    const connect = async () => {
      if (!isMounted) return;
      let ticket = '';
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/ws-ticket`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ character_id: characterId }),
        });
        if (!response.ok) throw new Error(`ticket websocket: HTTP ${response.status}`);
        const payload = await response.json();
        ticket = String(payload.ticket || '');
        if (!ticket) throw new Error('ticket websocket ausente');
      } catch (error) {
        console.error('Não foi possível preparar a conexão WebSocket:', error);
        if (isMounted) reconnectTimer = setTimeout(() => { void connect(); }, 2000);
        return;
      }
      if (!isMounted) return;
      const wsUrl = `${WS_BASE_URL}/ws?ticket=${encodeURIComponent(ticket)}`;

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
          const previousCharacter = previousCharacterRef.current;

          if (msg.stream === 'social') {
            if (msg.chat_history) setChatMessages(msg.chat_history.slice(-100));
            if (msg.chat_message) {
              setChatMessages((previous) => {
                if (previous.some((item) => item.id === msg.chat_message!.id)) return previous;
                return [...previous, msg.chat_message!].slice(-100);
              });
            }
            if (msg.presence) setOnlineCount(Math.max(0, msg.presence.online_count || 0));
            // SOCIAL_READY inclui o próprio perfil para composição de estado,
            // mas não deve abrir um popover automaticamente no login. O cartão
            // só aparece após REQUEST_PUBLIC_PROFILE (clique no nome ou em um
            // jogador do chat).
            if (msg.public_profile && msg.type !== 'SOCIAL_READY') setLastPublicProfile(msg.public_profile);
			if (msg.duel_challenges) {
				setPendingDuelChallenges(msg.duel_challenges.filter((challenge) => challenge.status === 'pending'));
			}
			if (msg.duel_challenge) {
				const challenge = msg.duel_challenge;
				setPendingDuelChallenges((previous) => {
					const withoutCurrent = previous.filter((item) => item.id !== challenge.id);
					if (challenge.status === 'pending' && challenge.target.character_id === characterId) {
						return [...withoutCurrent, challenge];
					}
					return withoutCurrent;
				});
			}
			if (msg.pvp_match_notice) {
        if (msg.pvp_match_notice.status === 'cancelled' || msg.type === 'PVP_MATCH_CANCELLED') {
          setPvPMatchNotice(null);
          setPvPArenaWaiting(false);
        } else {
          setPvPMatchNotice(msg.pvp_match_notice);
          setPvPMatchmaking(previous => ({...previous, queued:false}));
          setPvPArenaWaiting(msg.type === 'PVP_MATCH_WAITING' || msg.pvp_match_notice.player_confirmed === true);
        }
			}
			if (msg.pvp_combat) {
				setPvPCombat(msg.pvp_combat);
				setPvPArenaWaiting(false);
                if (msg.pvp_combat.status === 'completed' && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ action: 'REQUEST_PVP_HISTORY', request_id: makeRequestId('pvphistoryend') }));
                  ws.send(JSON.stringify({ action: 'REQUEST_PVP_SEASON_STATUS', request_id: makeRequestId('pvpseasonend') }));
                  ws.send(JSON.stringify({ action: 'REQUEST_PVP_LADDER', request_id: makeRequestId('pvpladderend') }));
                  ws.send(JSON.stringify({ action: 'REQUEST_PVP_COMPETITIVE', request_id: makeRequestId('pvpcompetitiveend') }));
                }
			}
            if (msg.pvp_history) setPvPHistory(msg.pvp_history);
            if (msg.pvp_replay) setPvPReplay(msg.pvp_replay);
            if (msg.pvp_matchmaking) setPvPMatchmaking(msg.pvp_matchmaking);
            if (msg.pvp_season) setPvPSeason(msg.pvp_season);
            if (msg.pvp_ladder) setPvPLadder(msg.pvp_ladder);
            if (msg.pvp_competitive) setPvPCompetitive(msg.pvp_competitive);
            if (msg.pvp_cosmetics) setPvPCosmetics(msg.pvp_cosmetics);
            if (msg.pvp_rewards && msg.type === 'PVP_SEASON_REWARDS_CLAIMED') {
              setPvPSeason((previous) => previous ? { ...previous, pending_rewards: previous.pending_rewards.filter((reward) => !msg.pvp_rewards!.some((claimed) => claimed.id === reward.id)) } : previous);
            }
            if (msg.error) setSocialError(msg.error);
            else if (msg.type !== 'SOCIAL_ERROR') setSocialError(null);
            // Eventos sociais usam stream próprio e não participam de seq/state_revision.
            return;
          }
          // Protocolo V3 envia apenas o delta do personagem no caminho quente.
          // Materializamos localmente o mesmo shape antigo antes de atualizar UI/Canvas.
          if (msg.character_delta && previousCharacter) {
            msg.character = {
              ...previousCharacter,
              ...msg.character_delta,
              state_revision: msg.state_revision ?? previousCharacter.state_revision,
            };
          }

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
              previousCharacterRef.current = msg.character;
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
		  if (msg.auto_potion_settings) {
			setAutoPotionSettings(msg.auto_potion_settings);
		  }
		  if (msg.auto_potion_state) {
			setAutoPotionState(msg.auto_potion_state);
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
		  if (msg.economy) {
			setEconomy(msg.economy);
			setActiveBuffs(msg.economy.active_buffs || []);
		  }
		  if (msg.active_buffs) setActiveBuffs(msg.active_buffs);
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

          const notificationText = msg.type === 'COMBAT_EVENT'
            ? msg.notification_text
            : IGNORED_LOG_TYPES.has(msg.type)
            ? ''
            : msg.notification_text || msg.log_text;

          if (notificationText && notificationText.trim() !== '') {
            const timeStr = msg.timestamp ? `[${msg.timestamp}] ` : '';
            const fullLogMsg = `${timeStr}${notificationText}`;
            setLogs((prev) => {
              if (prev.length > 0 && prev[0].slice(11) === notificationText) {
                return prev;
              }
              return [fullLogMsg, ...prev.slice(0, 49)];
            });
          }

          if (onCombatEventRef.current) {
            onCombatEventRef.current(msg);
          }

          const importantNotification = importantNotificationForMessage(msg, previousCharacter);
          if (importantNotification && onImportantNotificationRef.current) {
            onImportantNotificationRef.current(importantNotification);
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
          void connect();
        }, 1500);
      };
    };

    void connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [token, characterId]);

  const moveHero = (direction: string, pressed: boolean) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'MOVE_HERO',
        direction,
        pressed,
        request_id: makeRequestId('move'),
      }));
    }
  };

  const toggleExpedition = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'TOGGLE_EXPEDITION' }));
    }
  };

  const returnToCamp = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'RETURN_TO_CAMP' }));
    }
  };

  const changeRegion = (region: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CHANGE_REGION', region, region_id: region }));
    }
  };

  const setStance = (stance: string) => {
    setActiveStance(stance);
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

  const moveCampBuilding = (slotKey: string, tileX: number, tileY: number, rotation: number = 0) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'MOVE_CAMP_BUILDING',
        slot_key: slotKey,
        tile_x: Math.floor(tileX),
        tile_y: Math.floor(tileY),
        rotation: ((Math.floor(rotation) % 4) + 4) % 4,
        expected_revision: camp?.state_revision || 0,
      }));
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

	const updateAutoPotionSettings = (settings: AutoPotionSettings) => {
		if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
			socketRef.current.send(
				JSON.stringify({
					action: 'UPDATE_AUTO_POTION_SETTINGS',
					auto_potion_settings: settings,
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

  const consumeFood = (resourceKey: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'CONSUME_FOOD',
        resource_key: resourceKey,
        expected_revision: resourceInventory?.revision || 0,
        request_id: makeRequestId('meal'),
      }));
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

  const sendWorldChat = (text: string) => {
    const value = text.trim();
    if (!value || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ action: 'CHAT_SEND', channel: 'world', text: value.slice(0, 200), request_id: makeRequestId('chat') }));
  };

  const blockChatCharacter = (targetCharacterId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CHAT_BLOCK', target_character_id: targetCharacterId, request_id: makeRequestId('chatblock') }));
      setChatMessages((previous) => previous.filter((message) => message.sender_id !== targetCharacterId));
    }
  };

  const unblockChatCharacter = (targetCharacterId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CHAT_UNBLOCK', target_character_id: targetCharacterId, request_id: makeRequestId('chatunblock') }));
    }
  };

  const reportChatMessage = (messageId: string, reason = 'Conteúdo inadequado') => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CHAT_REPORT', message_id: messageId, reason: reason.slice(0, 240), request_id: makeRequestId('chatreport') }));
    }
  };

  const requestPublicProfile = (targetCharacterId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'REQUEST_PUBLIC_PROFILE', target_character_id: targetCharacterId, request_id: makeRequestId('profile') }));
    }
  };

  const createDuelChallenge = (targetCharacterId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CREATE_DUEL_CHALLENGE', target_character_id: targetCharacterId, request_id: makeRequestId('duel') }));
    }
  };

  const respondDuelChallenge = (challengeId: string, accept: boolean) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'RESPOND_DUEL_CHALLENGE', duel_challenge_id: challengeId, enabled: accept, request_id: makeRequestId('duelreply') }));
    }
  };

  const cancelDuelChallenge = (challengeId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CANCEL_DUEL_CHALLENGE', duel_challenge_id: challengeId, request_id: makeRequestId('duelcancel') }));
    }
  };

  const confirmPvPMatch = (matchId: string, tacticalStrategy: PvPTacticalStrategy = 'balanced') => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'CONFIRM_PVP_MATCH',
        pvp_match_id: matchId,
        pvp_tactical_strategy: tacticalStrategy,
        pvp_strategy_version: 1,
        request_id: makeRequestId('pvpconfirm'),
      }));
    }
  };

  const requestPvPHistory = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'REQUEST_PVP_HISTORY',request_id:makeRequestId('pvphistory')})); };
  const requestPvPReplay = (matchId:string) => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'REQUEST_PVP_REPLAY',pvp_match_id:matchId,request_id:makeRequestId('pvpreplay')})); };
  const joinPvPMatchmaking = (strategy:PvPTacticalStrategy='balanced') => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'JOIN_PVP_MATCHMAKING',pvp_tactical_strategy:strategy,pvp_strategy_version:1,request_id:makeRequestId('pvpqueue')})); };
  const leavePvPMatchmaking = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'LEAVE_PVP_MATCHMAKING',request_id:makeRequestId('pvpleave')})); };
  const requestPvPMatchmakingStatus = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'REQUEST_PVP_MATCHMAKING_STATUS',request_id:makeRequestId('pvpqstatus')})); };
  const joinPvPRanked = (strategy:PvPTacticalStrategy='balanced') => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'JOIN_PVP_RANKED',pvp_tactical_strategy:strategy,pvp_strategy_version:1,request_id:makeRequestId('pvpranked')})); };
  const leavePvPRanked = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'LEAVE_PVP_RANKED',request_id:makeRequestId('pvprankedleave')})); };
  const requestPvPSeasonStatus = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'REQUEST_PVP_SEASON_STATUS',request_id:makeRequestId('pvpseason')})); };
  const requestPvPLadder = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'REQUEST_PVP_LADDER',request_id:makeRequestId('pvpladder')})); };
  const claimPvPSeasonRewards = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'CLAIM_PVP_SEASON_REWARDS',request_id:makeRequestId('pvpreward')})); };
  const forfeitPvPMatch = (matchId:string) => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'FORFEIT_PVP_MATCH',pvp_match_id:matchId,request_id:makeRequestId('pvpforfeit')})); };
  const requestPvPCompetitive = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'REQUEST_PVP_COMPETITIVE',request_id:makeRequestId('pvpcompetitive')})); };
  const requestPvPCosmetics = () => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'REQUEST_PVP_COSMETICS',request_id:makeRequestId('pvpcosmetics')})); };
  const setPvPCosmetic = (type:'title'|'banner'|'cosmetic', key:string) => { if (socketRef.current?.readyState===WebSocket.OPEN) socketRef.current.send(JSON.stringify({action:'SET_PVP_COSMETIC',pvp_cosmetic_type:type,pvp_cosmetic_key:key,request_id:makeRequestId('pvpcosmeticset')})); };

  const clearPvPReplay = () => setPvPReplay(null);

  const setEquippedSkin = useCallback((skinKey: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'SET_EQUIPPED_SKIN', skin_key: skinKey, request_id: makeRequestId('skin') }));
    }
  }, []);

  const clearPublicProfile = () => setLastPublicProfile(null);

  const transferTreasuryGold = (direction: 'deposit' | 'withdraw', amount: number) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'TRANSFER_TREASURY_GOLD', direction, quantity: Math.max(1, Math.floor(amount)), request_id: makeRequestId('treasury') }));
	}
  };

  const updateTreasuryPolicy = (enabled: boolean, personalReserve: number) => {
	if (socketRef.current?.readyState === WebSocket.OPEN) {
	  socketRef.current.send(JSON.stringify({ action: 'UPDATE_TREASURY_POLICY', enabled, personal_reserve: Math.max(0, Math.floor(personalReserve)), request_id: makeRequestId('treasurypolicy') }));
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
	  autoPotionSettings,
	  autoPotionState,
    overflowChest,
    autoSellPreview,
    economy,
    activeBuffs,
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
    chatMessages,
    onlineCount,
    lastPublicProfile,
    socialError,
		pendingDuelChallenges,
		pvpMatchNotice,
		pvpArenaWaiting,
		pvpCombat,
        pvpHistory,
        pvpReplay,
        pvpMatchmaking,
        pvpSeason,
        pvpLadder,
        pvpCompetitive,
        pvpCosmetics,
    sendWorldChat,
    blockChatCharacter,
    unblockChatCharacter,
    reportChatMessage,
    requestPublicProfile,
		createDuelChallenge,
		respondDuelChallenge,
		cancelDuelChallenge,
		confirmPvPMatch,
        requestPvPHistory,
        requestPvPReplay,
        joinPvPMatchmaking,
        leavePvPMatchmaking,
        requestPvPMatchmakingStatus,
        joinPvPRanked,
        leavePvPRanked,
        requestPvPSeasonStatus,
        requestPvPLadder,
        claimPvPSeasonRewards,
    forfeitPvPMatch,
    requestPvPCompetitive,
    requestPvPCosmetics,
    setPvPCosmetic,
        clearPvPReplay,
		setEquippedSkin,
    clearPublicProfile,
    moveHero,
    toggleExpedition,
    returnToCamp,
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
    moveCampBuilding,
    requestSalvagePreview,
    salvageItem,
    salvageBatch,
    learnBuildingBlueprint,
    clearSalvagePreview,
    updateAutoSellSettings,
	updateAutoPotionSettings,
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
	consumeFood,
	requestEconomySync,
	claimPendingCraft,
	claimPendingResources,
	createHeroDesire,
	cancelHeroDesire,
	claimArmoryItem,
	transferTreasuryGold,
    updateTreasuryPolicy,
    setOnCombatEvent,
    setOnImportantNotification,
  };
}