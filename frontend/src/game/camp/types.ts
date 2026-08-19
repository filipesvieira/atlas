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
  constructionProgress: number; // 0 a 100
  x: number;
  y: number;
  scale: number;
  time: number; // performance.now()
  footprint: BuildingFootprint;
}

export interface CampBuildingSlotConfig {
  slotKey: string;
  buildingKey: string;
  anchorX: number;
  groundY: number;
  maxWidth: number;
  maxHeight: number;
  sortY: number;
  baseScale: number;
}
