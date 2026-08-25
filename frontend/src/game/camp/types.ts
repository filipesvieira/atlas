export interface BuildingFootprint {
  width: number;
  height: number;
}

export interface BuildingRenderContext {
  ctx: CanvasRenderingContext2D;
  level: number;
  targetLevel?: number;
  discovered: boolean;
  isUnderConstruction: boolean;
  constructionProgress: number;
  x: number;
  y: number;
  scale: number;
  time: number;
  footprint: BuildingFootprint;
}

export interface CampBuildingSlotConfig {
  slotKey: string;
  buildingKey: string;
  maxWidth: number;
  maxHeight: number;
  baseScale: number;
}

export interface CampPlacementPreview {
  slotKey: string;
  tileX: number;
  tileY: number;
  rotation: number;
  valid: boolean;
}