import { configureSettlementTerritoryContract, type SettlementTerritoryContract } from './camp/CampLayoutRegistry';
import { API_BASE_URL } from '../config';

export interface SkillCatalogEntry {
  key: string;
  name: string;
  icon: string;
  description: string;
  mana_cost: number;
  min_level: number;
  cooldown_ticks?: number;
  cooldown_seconds?: number;
  allowed_archetypes: string[];
  target_type: string;
  visual_key: string;
}

export type ResourceCategory = 'material' | 'profession_raw' | 'monster_part' | 'processed' | 'consumable' | 'catalyst' | 'trophy' | 'scrap';

export interface ResourceDefinition {
  key: string;
  name: string;
  icon: string;
  rarity: string;
  description: string;
  max_stack: number;
  category?: ResourceCategory;
  counts_toward_storage?: boolean;
  discardable?: boolean;
  source_kind?: string;
  profession_key?: string;
  tier?: number;
  storage_weight?: number;
  tradeable?: boolean;
  content_version?: number;
}

export interface ResourceAmount {
  key: string;
  quantity: number;
}

export interface ResourceInventorySnapshot {
  items: ResourceAmount[];
  storage_used: number;
  storage_capacity: number;
  revision: number;
}

export interface BuildingBlueprintProgress {
  building_key: string;
  unlocked_max_level: number;
  source_key?: string;
  discovered_at: string;
}

export interface SalvageItemOutcome {
  item_id: string;
  item_name: string;
  rarity?: string;
  slot_type?: string;
  success: boolean;
  success_chance: number;
  yield?: ResourceAmount[];
}

export interface BuildingEffect {
  key: string;
  value: number;
}

export interface BuildingRequirement {
  building_key: string;
  min_level: number;
}

export interface BuildingLevelDefinition {
  level: number;
  gold_cost: number;
  costs: ResourceAmount[];
  build_duration: number; // nanosegundos no JSON Go
  build_duration_seconds?: number;
  effects: BuildingEffect[];
  required_trophies?: ResourceAmount[];
  required_buildings?: BuildingRequirement[];
  required_settlement_stage?: string;
}

export interface BuildingDefinition {
  key: string;
  name: string;
  icon: string;
  description: string;
  slot_type: string;
  default_unlocked?: boolean;
  placement_mode?: 'free' | 'perimeter' | string;
  unlock_stage?: string;
  max_level: number;
  levels: BuildingLevelDefinition[];
}

export interface ProfessionDefinition {
  key: string;
  name: string;
  icon: string;
  description: string;
  category?: 'gathering' | 'crafting' | string;
  max_level: number;
}

export interface GatheringRewardDefinition {
  resource_key: string;
  chance: number;
  min_quantity: number;
  max_quantity: number;
}

export interface GatheringExpeditionDefinition {
  key: string;
  display_name: string;
  area_name?: string;
  icon: string;
  description: string;
  biome_key: string;
  profession_key: string;
  required_profession_level: number;
  tier: number;
  allowed_durations: number[];
  nodes: Array<{
    key: string;
    name: string;
    weight: number;
    cycle_seconds: number;
    profession_xp: number;
    required_tool_tier: number;
    rewards: Array<{ resource_key: string; chance: number; min_quantity: number; max_quantity: number }>;
  }>; 
  content_version: number;
  player_selectable: boolean;
}

export interface EquipmentSetDefinition {
  key: string;
  name: string;
  theme: string;
  class_focus: string;
  piece_keys: string[];
}

export interface RecipeDefinition {
  key: string;
  name: string;
  description: string;
  kind: 'equipment' | 'processing' | 'consumable';
  output_template_key?: string;
  visual_key?: string;
  set_key?: string;
  output_resource_key?: string;
  output_quantity?: number;
  profession_key: string;
  required_profession_level: number;
  tier: number;
  station_key?: string;
  required_station_level?: number;
  ingredients: ResourceAmount[];
  gold_cost: number;
  craft_seconds: number;
  minimum_rarity?: string;
  maximum_rarity?: string;
  default_unlocked: boolean;
  unlock_trophy_key?: string;
  content_version: number;
  slot_type?: string;
  weapon_type?: string;
  hands?: number;
  required_level?: number;
  base_atk?: number;
  base_magic?: number;
  base_def?: number;
  base_weight?: number;
  base_melee_power?: number;
  base_ranged_power?: number;
  base_magic_power?: number;
  base_hp?: number;
  base_mp?: number;
  crit_chance?: number;
  lifesteal?: number;
  mana_regen?: number;
  base_movement_speed_bonus?: number;
}

export interface EconomyPolicy {
  version: number;
  professions_enabled: boolean;
  gathering_enabled: boolean;
  crafting_enabled: boolean;
  crafting_first_loot_enabled: boolean;
  common_equipment_drop_multiplier: number;
  boss_artifact_drop_multiplier: number;
}

export interface ConsumableDefinition {
  resource_key: string;
  name: string;
  description: string;
  category: 'meal' | 'potion';
  effect_key: 'xp_gain_percent' | 'attack_percent';
  magnitude: number;
  duration_seconds: number;
  content_version: number;
}

interface GameCatalogResponse {
  version: string;
  regions: Array<{
    id: string;
    biome_key: string;
    name: string;
    tier: number;
    order: number;
    min_level: number;
    max_level: number;
    description: string;
    icon: string;
    max_stages: number;
    requires_unlock_from?: string;
    requires_tier_complete?: boolean;
    drops_preview: string[];
    boss_name: string;
    is_secret: boolean;
  }>;
  starter_packs: StarterPackData[];
  skills?: SkillCatalogEntry[];
  resources?: ResourceDefinition[];
  camp_buildings?: BuildingDefinition[];
  camp_layout?: Record<string, string>;
  professions?: ProfessionDefinition[];
  gathering_expeditions?: GatheringExpeditionDefinition[];
  recipes?: RecipeDefinition[];
  consumables?: ConsumableDefinition[];
  equipment_sets?: EquipmentSetDefinition[];
  economy_policy?: EconomyPolicy;
  settlement_territory?: SettlementTerritoryContract;
}

export interface RegionData {
  id: string;
  biomeKey: string;
  name: string;
  tier: number;
  order: number;
  minLevel: number;
  maxLevel: number;
  description: string;
  icon: string;
  maxStages: number;
  bossName: string;
  requiresUnlockFrom?: string;
  /** Quando true, todas as regiões do tier anterior precisam ter boss derrotado.
   *  Data-driven: funciona automaticamente para qualquer número de tiers. */
  requiresTierComplete?: boolean;
  dropsPreview: string[];
  isSecret: boolean;
}

export interface StarterPackData {
  id: string;
  vocation: string;
  title: string;
  subtitle: string;
  kit_label: string;
  stat_focus: string;
  details: string[];
  accent: string;
}

export interface GameCatalogData {
  version: string;
  regions: RegionData[];
  starterPacks: StarterPackData[];
  skills: SkillCatalogEntry[];
  resources: ResourceDefinition[];
  campBuildings: BuildingDefinition[];
  campLayout: Record<string, string>;
  professions: ProfessionDefinition[];
  gatheringExpeditions: GatheringExpeditionDefinition[];
  recipes: RecipeDefinition[];
  consumables: ConsumableDefinition[];
  equipmentSets?: EquipmentSetDefinition[];
  economyPolicy?: EconomyPolicy;
  settlementTerritory?: SettlementTerritoryContract;
}

let catalogPromise: Promise<GameCatalogData> | null = null;

function mapCatalog(response: GameCatalogResponse): GameCatalogData {
  configureSettlementTerritoryContract(response.settlement_territory);
  return {
    version: response.version,
    regions: (response.regions || [])
      .map((region) => ({
        id: region.id,
        biomeKey: region.biome_key || region.id,
        name: region.name,
        tier: region.tier,
        order: region.order,
        minLevel: region.min_level,
        maxLevel: region.max_level,
        description: region.description,
        icon: region.icon,
        maxStages: region.max_stages,
        bossName: region.boss_name,
        requiresUnlockFrom: region.requires_unlock_from,
        requiresTierComplete: region.requires_tier_complete,
        dropsPreview: region.drops_preview || [],
        isSecret: region.is_secret,
      }))
      .sort((a, b) => a.order - b.order),
    starterPacks: response.starter_packs || [],
    skills: response.skills || [],
    resources: response.resources || [],
    campBuildings: response.camp_buildings || [],
    campLayout: response.camp_layout || {},
    professions: response.professions || [],
    gatheringExpeditions: response.gathering_expeditions || [],
    recipes: response.recipes || [],
    consumables: response.consumables || [],
    equipmentSets: response.equipment_sets || [],
    economyPolicy: response.economy_policy,
    settlementTerritory: response.settlement_territory,
  };
}

/** Carrega o catálogo autoritativo uma vez por sessão do frontend. */
export function loadGameCatalog(): Promise<GameCatalogData> {
  if (!catalogPromise) {
    catalogPromise = fetch(`${API_BASE_URL}/api/v1/game/catalog`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`GameCatalog indisponível (${response.status})`);
        return mapCatalog((await response.json()) as GameCatalogResponse);
      })
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}