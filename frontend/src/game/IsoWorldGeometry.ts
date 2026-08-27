/**
 * Geometria compartilhada pelos cenários isométricos.
 *
 * A projeção não pertence ao acampamento: ela é usada pelo acampamento e
 * pelas arenas de expedição. Manter a malha e a projeção em um módulo neutro
 * evita que uma nova fase herde regras de posicionamento de construções.
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

/** Malha autoritativa atual do acampamento e das arenas de combate. */
export const ISO_ARENA_GEOMETRY: IsoWorldGeometry = Object.freeze({
  gridWidth: 24,
  gridHeight: 18,
  tileWidth: 32,
  tileHeight: 16,
  originX: 480,
  originY: 58,
  actorFootOffset: 24,
});

export const ISO_EDGE_DEPTH = 5;

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