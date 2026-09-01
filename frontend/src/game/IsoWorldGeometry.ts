/**
 * Geometria compartilhada pelos cenários isométricos.
 *
 * Arena e assentamento usam a mesma projeção, mas NÃO o mesmo tamanho de
 * mundo. A partir da M5-A.1 o Reino pode crescer sem alterar alcance,
 * colisão ou posicionamento das arenas PvE/PvP.
 */
export interface IsoWorldGeometry {
  gridWidth: number;
  gridHeight: number;
  tileWidth: number;
  tileHeight: number;
  originX: number;
  originY: number;
  actorFootOffset: number;
}

/** Arena autoritativa de combate — permanece 24x18. */
export const ISO_ARENA_GEOMETRY: IsoWorldGeometry = Object.freeze({
  gridWidth: 24,
  gridHeight: 18,
  tileWidth: 32,
  tileHeight: 16,
  originX: 480,
  originY: 58,
  actorFootOffset: 24,
});

/** Mundo máximo do assentamento. O backend envia o contrato territorial no catálogo. */
export const SETTLEMENT_WORLD_GEOMETRY: IsoWorldGeometry = {
  gridWidth: 52,
  gridHeight: 38,
  tileWidth: 32,
  tileHeight: 16,
  originX: 656,
  originY: 24,
  actorFootOffset: 24,
};

export let SETTLEMENT_WORLD_PIXEL_WIDTH = 1600;
export let SETTLEMENT_WORLD_PIXEL_HEIGHT = 820;

/** Aplica a geometria autoritativa recebida no GameCatalog. */
export function configureSettlementWorldGeometry(gridWidth: number, gridHeight: number) {
  const width = Math.max(1, Math.round(gridWidth));
  const height = Math.max(1, Math.round(gridHeight));
  SETTLEMENT_WORLD_GEOMETRY.gridWidth = width;
  SETTLEMENT_WORLD_GEOMETRY.gridHeight = height;
  SETTLEMENT_WORLD_GEOMETRY.originX = height * (SETTLEMENT_WORLD_GEOMETRY.tileWidth / 2) + 48;
  const size = getIsoWorldCanvasSize(SETTLEMENT_WORLD_GEOMETRY);
  SETTLEMENT_WORLD_PIXEL_WIDTH = size.width;
  SETTLEMENT_WORLD_PIXEL_HEIGHT = size.height;
}
export const ISO_EDGE_DEPTH = 5;

/**
 * Cria a geometria de apresentação de uma arena a partir do grid que o
 * servidor enviou no snapshot. A arena clássica permanece exatamente igual;
 * fases maiores ganham um buffer próprio, sem herdar o tamanho do
 * assentamento nem alterar coordenadas autoritativas.
 */
export function createArenaGeometry(gridWidth: number, gridHeight: number): IsoWorldGeometry {
  const width = Math.max(1, Math.round(gridWidth));
  const height = Math.max(1, Math.round(gridHeight));
  if (width === ISO_ARENA_GEOMETRY.gridWidth && height === ISO_ARENA_GEOMETRY.gridHeight) {
    return ISO_ARENA_GEOMETRY;
  }

  const halfTileWidth = ISO_ARENA_GEOMETRY.tileWidth / 2;
  return {
    gridWidth: width,
    gridHeight: height,
    tileWidth: ISO_ARENA_GEOMETRY.tileWidth,
    tileHeight: ISO_ARENA_GEOMETRY.tileHeight,
    // Mantém 48px de respiro à esquerda; o tamanho do buffer abaixo garante
    // o mesmo respiro à direita, inclusive em grades retangulares.
    originX: height * halfTileWidth + 48,
    originY: ISO_ARENA_GEOMETRY.originY,
    actorFootOffset: ISO_ARENA_GEOMETRY.actorFootOffset,
  };
}

/** Dimensões mínimas do buffer que contém todo o losango e seus acabamentos. */
export function getIsoWorldCanvasSize(geometry: IsoWorldGeometry) {
  if (geometry === ISO_ARENA_GEOMETRY) {
    return { width: 960, height: 420 };
  }
  const halfTileWidth = geometry.tileWidth / 2;
  const halfTileHeight = geometry.tileHeight / 2;
  const right = geometry.originX + geometry.gridWidth * halfTileWidth;
  const bottom = geometry.originY
    + (geometry.gridWidth + geometry.gridHeight - 2) * halfTileHeight
    + halfTileHeight + ISO_EDGE_DEPTH;
  return {
    width: Math.max(960, Math.ceil(right + 48)),
    height: Math.max(420, Math.ceil(bottom + 40)),
  };
}

export function tileToScreen(
  tileX: number,
  tileY: number,
  geometry: IsoWorldGeometry = ISO_ARENA_GEOMETRY,
) {
  return {
    x: geometry.originX + (tileX - tileY) * (geometry.tileWidth / 2),
    y: geometry.originY + (tileX + tileY) * (geometry.tileHeight / 2),
  };
}

export function screenToTile(
  screenX: number,
  screenY: number,
  geometry: IsoWorldGeometry = ISO_ARENA_GEOMETRY,
) {
  const dx = screenX - geometry.originX;
  const dy = screenY - geometry.originY;
  return {
    tileX: Math.round(dx / geometry.tileWidth + dy / geometry.tileHeight),
    tileY: Math.round(dy / geometry.tileHeight - dx / geometry.tileWidth),
  };
}

export function clampIsoTile(tileX: number, tileY: number, geometry: IsoWorldGeometry = ISO_ARENA_GEOMETRY) {
  return {
    tileX: Math.max(0, Math.min(geometry.gridWidth - 1, Math.round(tileX))),
    tileY: Math.max(0, Math.min(geometry.gridHeight - 1, Math.round(tileY))),
  };
}