import { CampBuildingSlotConfig } from './types';

/**
 * Layout V3: terreno maior para o assentamento crescer sem transformar o
 * viewport em um amontoado de prédios/NPCs. O backend usa os mesmos limites.
 */
export const CAMP_GRID_WIDTH = 24;
export const CAMP_GRID_HEIGHT = 18;
export const ISO_TILE_WIDTH = 32;
export const ISO_TILE_HEIGHT = 16;
export const ISO_ORIGIN_X = 480;
export const ISO_ORIGIN_Y = 58;

export const BuildingGridFootprints: Record<string, { width: number; height: number }> = {
  campfire: { width: 2, height: 2 },
  arcane_spring: { width: 2, height: 2 },
  adventurer_hut: { width: 3, height: 3 },
  warehouse: { width: 3, height: 3 },
  workbench: { width: 2, height: 2 },
  kitchen: { width: 3, height: 2 },
  alchemy_bench: { width: 3, height: 2 },
};

/**
 * Perfil visual é separado do footprint de colisão. Assim um prédio de nível
 * alto pode ganhar detalhes sem invadir visualmente três construções vizinhas.
 */
export interface BuildingVisualProfile {
  sceneScale: number;
  silhouetteWidth: number;
  silhouetteHeight: number;
  groundOffset: number;
}

export const BuildingVisualProfiles: Record<string, BuildingVisualProfile> = {
  campfire: { sceneScale: 0.86, silhouetteWidth: 62, silhouetteHeight: 58, groundOffset: 4 },
  arcane_spring: { sceneScale: 0.84, silhouetteWidth: 70, silhouetteHeight: 78, groundOffset: 4 },
  adventurer_hut: { sceneScale: 0.74, silhouetteWidth: 150, silhouetteHeight: 112, groundOffset: 5 },
  warehouse: { sceneScale: 0.82, silhouetteWidth: 112, silhouetteHeight: 88, groundOffset: 5 },
  workbench: { sceneScale: 0.94, silhouetteWidth: 80, silhouetteHeight: 60, groundOffset: 4 },
  kitchen: { sceneScale: 0.84, silhouetteWidth: 118, silhouetteHeight: 64, groundOffset: 4 },
  alchemy_bench: { sceneScale: 0.84, silhouetteWidth: 118, silhouetteHeight: 64, groundOffset: 4 },
};

export function getBuildingVisualProfile(buildingKey: string): BuildingVisualProfile {
  return BuildingVisualProfiles[buildingKey] || {
    sceneScale: 0.86,
    silhouetteWidth: 92,
    silhouetteHeight: 72,
    groundOffset: 4,
  };
}

/**
 * Novos saves já nascem mais centralizados no terreno expandido. Saves V2 são
 * deslocados de forma aditiva pela migration 000018, preservando o desenho que
 * o jogador montou e apenas criando margem ao redor dele.
 */
export const LegacySlotDefaults: Record<string, { tileX: number; tileY: number }> = {
  west: { tileX: 6, tileY: 8 },
  north: { tileX: 10, tileY: 5 },
  east: { tileX: 14, tileY: 8 },
  center: { tileX: 10, tileY: 8 },
  south: { tileX: 12, tileY: 10 },
};

export function tileToScreen(tileX: number, tileY: number) {
  return {
    x: ISO_ORIGIN_X + (tileX - tileY) * (ISO_TILE_WIDTH / 2),
    y: ISO_ORIGIN_Y + (tileX + tileY) * (ISO_TILE_HEIGHT / 2),
  };
}

export function screenToTile(screenX: number, screenY: number) {
  const dx = screenX - ISO_ORIGIN_X;
  const dy = screenY - ISO_ORIGIN_Y;
  return {
    tileX: Math.round(dx / ISO_TILE_WIDTH + dy / ISO_TILE_HEIGHT),
    tileY: Math.round(dy / ISO_TILE_HEIGHT - dx / ISO_TILE_WIDTH),
  };
}

export function getGridFootprint(buildingKey: string, rotation = 0) {
  const base = BuildingGridFootprints[buildingKey] || { width: 2, height: 2 };
  return rotation % 2 === 0 ? base : { width: base.height, height: base.width };
}

/**
 * Mantido apenas para clientes/saves legados que ainda carregam os cinco ids
 * cardeais. Escala e footprint visuais autoritativos vivem nos profiles acima.
 */
export const CampLayoutSlots: Record<string, CampBuildingSlotConfig> = {
  west: { slotKey: 'west', buildingKey: 'adventurer_hut', maxWidth: 111, maxHeight: 83, baseScale: 0.74 },
  north: { slotKey: 'north', buildingKey: 'arcane_spring', maxWidth: 59, maxHeight: 66, baseScale: 0.84 },
  east: { slotKey: 'east', buildingKey: 'warehouse', maxWidth: 92, maxHeight: 72, baseScale: 0.82 },
  center: { slotKey: 'center', buildingKey: 'campfire', maxWidth: 53, maxHeight: 50, baseScale: 0.86 },
  south: { slotKey: 'south', buildingKey: 'workbench', maxWidth: 75, maxHeight: 56, baseScale: 0.94 },
};
