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
    drops_preview: string[];
    boss_name: string;
    is_secret: boolean;
  }>;
  starter_packs: StarterPackData[];
  skills?: SkillCatalogEntry[];
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
}

let catalogPromise: Promise<GameCatalogData> | null = null;

function mapCatalog(response: GameCatalogResponse): GameCatalogData {
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
        dropsPreview: region.drops_preview || [],
        isSecret: region.is_secret,
      }))
      .sort((a, b) => a.order - b.order),
    starterPacks: response.starter_packs || [],
    skills: response.skills || [],
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
