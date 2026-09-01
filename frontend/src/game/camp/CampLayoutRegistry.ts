import { CampBuildingSlotConfig } from './types';
import {
  SETTLEMENT_WORLD_GEOMETRY,
  tileToScreen as isoTileToScreen,
  screenToTile as isoScreenToTile,
  configureSettlementWorldGeometry,
} from '../IsoWorldGeometry';

export { SETTLEMENT_WORLD_GEOMETRY } from '../IsoWorldGeometry';

/** Contrato territorial recebido do backend. */
export interface SettlementTerritoryStageContract {
  key: string;
  name: string;
  width: number;
  height: number;
}

export interface SettlementTerritoryContract {
  layout_version: number;
  world_width: number;
  world_height: number;
  stages: SettlementTerritoryStageContract[];
}

export const ISO_TILE_WIDTH = SETTLEMENT_WORLD_GEOMETRY.tileWidth;
export const ISO_TILE_HEIGHT = SETTLEMENT_WORLD_GEOMETRY.tileHeight;

export interface SettlementBuildBounds {
  minX: number;
  minY: number;
  maxX: number; // exclusivo
  maxY: number; // exclusivo
}

const fallbackStages: SettlementTerritoryStageContract[] = [
  { key: 'camp', name: 'Acampamento', width: 24, height: 18 },
  { key: 'outpost', name: 'Posto', width: 28, height: 20 },
  { key: 'hamlet', name: 'Vilarejo', width: 32, height: 22 },
  { key: 'village', name: 'Vila', width: 36, height: 24 },
  { key: 'city', name: 'Cidade', width: 40, height: 28 },
  { key: 'kingdom', name: 'Reino', width: 52, height: 38 },
];

let territoryContract: SettlementTerritoryContract = {
  layout_version: 5,
  world_width: 52,
  world_height: 38,
  stages: fallbackStages,
};

export let SettlementStageOrder = territoryContract.stages.map((stage) => stage.key);
export let SettlementStageLabels: Record<string, string> = Object.fromEntries(territoryContract.stages.map((stage) => [stage.key, stage.name]));

export function configureSettlementTerritoryContract(contract?: SettlementTerritoryContract | null) {
  if (!contract?.world_width || !contract?.world_height || !contract.stages?.length) return;
  territoryContract = {
    layout_version: contract.layout_version,
    world_width: contract.world_width,
    world_height: contract.world_height,
    stages: contract.stages.map((stage) => ({ ...stage })),
  };
  SettlementStageOrder = territoryContract.stages.map((stage) => stage.key);
  SettlementStageLabels = Object.fromEntries(territoryContract.stages.map((stage) => [stage.key, stage.name]));
  configureSettlementWorldGeometry(territoryContract.world_width, territoryContract.world_height);
}

export function getSettlementTerritoryContract() {
  return territoryContract;
}

export function getCampGridWidth() { return territoryContract.world_width; }
export function getCampGridHeight() { return territoryContract.world_height; }

export function settlementStageAtLeast(currentKey = 'camp', requiredKey = '') {
  if (!requiredKey) return true;
  const current = SettlementStageOrder.indexOf(currentKey as (typeof SettlementStageOrder)[number]);
  const required = SettlementStageOrder.indexOf(requiredKey as (typeof SettlementStageOrder)[number]);
  return current >= 0 && required >= 0 && current >= required;
}

export function getSettlementStageBounds(stageKey = 'camp'): SettlementBuildBounds {
  const stage = territoryContract.stages.find((candidate) => candidate.key === stageKey)
    || territoryContract.stages.find((candidate) => candidate.key === 'camp')
    || fallbackStages[0];
  const minX = Math.floor((territoryContract.world_width - stage.width) / 2);
  const minY = Math.floor((territoryContract.world_height - stage.height) / 2);
  return { minX, minY, maxX: minX + stage.width, maxY: minY + stage.height };
}

export function getSettlementStageScreenBounds(stageKey = 'camp', margin = 44) {
  const bounds = getSettlementStageBounds(stageKey);
  const corners = [
    tileToScreen(bounds.minX, bounds.minY),
    tileToScreen(bounds.maxX - 1, bounds.minY),
    tileToScreen(bounds.minX, bounds.maxY - 1),
    tileToScreen(bounds.maxX - 1, bounds.maxY - 1),
  ];
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  return {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minY: Math.min(...ys) - margin,
    maxY: Math.max(...ys) + margin,
  };
}

export function getSettlementStageCenter(stageKey = 'camp') {
  const bounds = getSettlementStageBounds(stageKey);
  return tileToScreen(
    (bounds.minX + bounds.maxX - 1) / 2,
    (bounds.minY + bounds.maxY - 1) / 2,
  );
}

export const BuildingGridFootprints: Record<string, { width: number; height: number }> = {
  campfire: { width: 2, height: 2 },
  arcane_spring: { width: 2, height: 2 },
  adventurer_hut: { width: 3, height: 3 },
  warehouse: { width: 3, height: 3 },
  workbench: { width: 2, height: 2 },
  kitchen: { width: 3, height: 2 },
  alchemy_bench: { width: 3, height: 2 },
  watchtower: { width: 3, height: 3 },
  barracks: { width: 4, height: 3 },
  vault: { width: 3, height: 3 },
  infirmary: { width: 3, height: 3 },
  prison: { width: 3, height: 3 },
  engineer_workshop: { width: 4, height: 3 },
  war_room: { width: 4, height: 3 },
  resonator: { width: 3, height: 3 },
};

export const PerimeterBuildingKeys = new Set(['wall', 'gate']);

export function isPerimeterBuilding(buildingKey: string) {
  return PerimeterBuildingKeys.has(buildingKey);
}

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
  wall: { sceneScale: 0.90, silhouetteWidth: 118, silhouetteHeight: 70, groundOffset: 3 },
  gate: { sceneScale: 0.84, silhouetteWidth: 132, silhouetteHeight: 108, groundOffset: 4 },
  watchtower: { sceneScale: 0.72, silhouetteWidth: 104, silhouetteHeight: 150, groundOffset: 5 },
  barracks: { sceneScale: 0.73, silhouetteWidth: 154, silhouetteHeight: 112, groundOffset: 5 },
  vault: { sceneScale: 0.78, silhouetteWidth: 126, silhouetteHeight: 100, groundOffset: 5 },
  infirmary: { sceneScale: 0.76, silhouetteWidth: 128, silhouetteHeight: 104, groundOffset: 5 },
  prison: { sceneScale: 0.78, silhouetteWidth: 124, silhouetteHeight: 102, groundOffset: 5 },
  engineer_workshop: { sceneScale: 0.73, silhouetteWidth: 154, silhouetteHeight: 116, groundOffset: 5 },
  war_room: { sceneScale: 0.72, silhouetteWidth: 158, silhouetteHeight: 116, groundOffset: 5 },
  resonator: { sceneScale: 0.76, silhouetteWidth: 126, silhouetteHeight: 132, groundOffset: 5 },
};

export function getBuildingVisualProfile(buildingKey: string): BuildingVisualProfile {
  return BuildingVisualProfiles[buildingKey] || {
    sceneScale: 0.86,
    silhouetteWidth: 92,
    silhouetteHeight: 72,
    groundOffset: 4,
  };
}

/** Defaults legados preservados e centralizados no território V5. */
export const LegacySlotDefaults: Record<string, { tileX: number; tileY: number }> = {
  west: { tileX: 20, tileY: 18 },
  north: { tileX: 24, tileY: 15 },
  east: { tileX: 28, tileY: 18 },
  center: { tileX: 24, tileY: 18 },
  south: { tileX: 26, tileY: 20 },
};

export function tileToScreen(tileX: number, tileY: number) {
  return isoTileToScreen(tileX, tileY, SETTLEMENT_WORLD_GEOMETRY);
}

export function screenToTile(screenX: number, screenY: number) {
  return isoScreenToTile(screenX, screenY, SETTLEMENT_WORLD_GEOMETRY);
}

export function getGridFootprint(buildingKey: string, rotation = 0) {
  if (isPerimeterBuilding(buildingKey)) return { width: 0, height: 0 };
  const base = BuildingGridFootprints[buildingKey] || { width: 2, height: 2 };
  return rotation % 2 === 0 ? base : { width: base.height, height: base.width };
}

export const CampLayoutSlots: Record<string, CampBuildingSlotConfig> = {
  west: { slotKey: 'west', buildingKey: 'adventurer_hut', maxWidth: 111, maxHeight: 83, baseScale: 0.74 },
  north: { slotKey: 'north', buildingKey: 'arcane_spring', maxWidth: 59, maxHeight: 66, baseScale: 0.84 },
  east: { slotKey: 'east', buildingKey: 'warehouse', maxWidth: 92, maxHeight: 72, baseScale: 0.82 },
  center: { slotKey: 'center', buildingKey: 'campfire', maxWidth: 53, maxHeight: 50, baseScale: 0.86 },
  south: { slotKey: 'south', buildingKey: 'workbench', maxWidth: 75, maxHeight: 56, baseScale: 0.94 },
};