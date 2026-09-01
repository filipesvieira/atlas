import type { CampState } from '../../hooks/useGameSocket';
import {
  getGridFootprint,
  isPerimeterBuilding,
  getSettlementStageBounds,
  SettlementBuildBounds,
  tileToScreen,
} from './CampLayoutRegistry';

export interface CampObstacle {
  slotKey: string;
  tileX: number;
  tileY: number;
  width: number;
  height: number;
}

export interface CampTile {
  x: number;
  y: number;
}

export interface CampRoute {
  points: Array<{ x: number; y: number }>;
  lengths: number[];
  totalLength: number;
}

export function getCampObstacles(camp: CampState | null): CampObstacle[] {
  if (!camp) return [];
  return Object.values(camp.buildings || {})
    .filter((building) => {
      if (isPerimeterBuilding(building.building_key)) return false;
      const discovered = building.building_key === 'campfire'
        || Boolean(camp.blueprints?.[building.building_key])
        || building.level > 0
        || Boolean(building.upgrade_target_level);
      return discovered;
    })
    .map((building) => {
      const footprint = getGridFootprint(building.building_key, building.rotation || 0);
      return {
        slotKey: building.slot_key,
        tileX: building.tile_x,
        tileY: building.tile_y,
        width: footprint.width,
        height: footprint.height,
      };
    });
}

export function isCampTileBlocked(
  tileX: number,
  tileY: number,
  obstacles: CampObstacle[],
  bounds: SettlementBuildBounds = getSettlementStageBounds('kingdom'),
): boolean {
  if (tileX < bounds.minX || tileY < bounds.minY || tileX >= bounds.maxX || tileY >= bounds.maxY) return true;
  return obstacles.some((obstacle) => (
    tileX >= obstacle.tileX
    && tileX < obstacle.tileX + obstacle.width
    && tileY >= obstacle.tileY
    && tileY < obstacle.tileY + obstacle.height
  ));
}

const NEIGHBORS: CampTile[] = [
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: -1, y: 0 }, { x: 1, y: 0 },
  { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
];

function tileKey(tile: CampTile) {
  return `${tile.x},${tile.y}`;
}

function clampTile(tile: CampTile, bounds: SettlementBuildBounds): CampTile {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX - 1, tile.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY - 1, tile.y)),
  };
}

function canTraverse(from: CampTile, to: CampTile, obstacles: CampObstacle[], bounds: SettlementBuildBounds) {
  if (isCampTileBlocked(to.x, to.y, obstacles, bounds)) return false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx !== 0 && dy !== 0) {
    if (isCampTileBlocked(from.x + dx, from.y, obstacles, bounds)) return false;
    if (isCampTileBlocked(from.x, from.y + dy, obstacles, bounds)) return false;
  }
  return true;
}

export function findNearestCampWalkableTile(
  preferred: CampTile,
  obstacles: CampObstacle[],
  bounds: SettlementBuildBounds = getSettlementStageBounds('kingdom'),
): CampTile {
  const start = clampTile(preferred, bounds);
  if (!isCampTileBlocked(start.x, start.y, obstacles, bounds)) return start;

  const queue: CampTile[] = [start];
  const visited = new Set([tileKey(start)]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const direction of NEIGHBORS) {
      const next = clampTile({ x: current.x + direction.x, y: current.y + direction.y }, bounds);
      const key = tileKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      if (!isCampTileBlocked(next.x, next.y, obstacles, bounds)) return next;
      queue.push(next);
    }
  }
  return start;
}

function heuristic(a: CampTile, b: CampTile) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function reconstructPath(cameFrom: Map<string, CampTile>, current: CampTile): CampTile[] {
  const path = [current];
  let cursor = current;
  while (cameFrom.has(tileKey(cursor))) {
    cursor = cameFrom.get(tileKey(cursor))!;
    path.unshift(cursor);
  }
  return path;
}

export function buildCampTileRoute(
  start: CampTile,
  end: CampTile,
  obstacles: CampObstacle[],
  bounds: SettlementBuildBounds = getSettlementStageBounds('kingdom'),
): CampTile[] {
  const first = findNearestCampWalkableTile(start, obstacles, bounds);
  const goal = findNearestCampWalkableTile(end, obstacles, bounds);
  const open: CampTile[] = [first];
  const cameFrom = new Map<string, CampTile>();
  const gScore = new Map<string, number>([[tileKey(first), 0]]);
  const fScore = new Map<string, number>([[tileKey(first), heuristic(first, goal)]]);

  while (open.length > 0) {
    let bestIndex = 0;
    for (let index = 1; index < open.length; index++) {
      if ((fScore.get(tileKey(open[index])) ?? Infinity) < (fScore.get(tileKey(open[bestIndex])) ?? Infinity)) {
        bestIndex = index;
      }
    }
    const current = open.splice(bestIndex, 1)[0];
    if (current.x === goal.x && current.y === goal.y) return reconstructPath(cameFrom, current);

    for (const direction of NEIGHBORS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      if (!canTraverse(current, next, obstacles, bounds)) continue;
      const nextKey = tileKey(next);
      const tentative = (gScore.get(tileKey(current)) ?? Infinity) + Math.hypot(direction.x, direction.y);
      if (tentative >= (gScore.get(nextKey) ?? Infinity)) continue;
      cameFrom.set(nextKey, current);
      gScore.set(nextKey, tentative);
      fScore.set(nextKey, tentative + heuristic(next, goal));
      if (!open.some((tile) => tileKey(tile) === nextKey)) open.push(next);
    }
  }

  return [first];
}

export function buildCampScreenRoute(
  start: CampTile,
  end: CampTile,
  obstacles: CampObstacle[],
  bounds: SettlementBuildBounds = getSettlementStageBounds('kingdom'),
): CampRoute {
  const tiles = buildCampTileRoute(start, end, obstacles, bounds);
  const points = tiles.map((tile) => tileToScreen(tile.x, tile.y));
  const lengths: number[] = [];
  let totalLength = 0;
  for (let index = 0; index < points.length - 1; index++) {
    const length = Math.hypot(points[index + 1].x - points[index].x, points[index + 1].y - points[index].y);
    lengths.push(length);
    totalLength += length;
  }
  return { points, lengths, totalLength };
}

export function sampleCampScreenRoute(route: CampRoute, progress: number) {
  if (route.points.length === 0) return { x: 0, y: 0 };
  if (route.points.length === 1 || route.totalLength <= 0) return route.points[0];
  const targetDistance = Math.max(0, Math.min(1, progress)) * route.totalLength;
  let traversed = 0;
  for (let index = 0; index < route.lengths.length; index++) {
    const length = route.lengths[index];
    if (targetDistance <= traversed + length) {
      const local = length <= 0 ? 0 : (targetDistance - traversed) / length;
      return {
        x: route.points[index].x + (route.points[index + 1].x - route.points[index].x) * local,
        y: route.points[index].y + (route.points[index + 1].y - route.points[index].y) * local,
      };
    }
    traversed += length;
  }
  return route.points[route.points.length - 1];
}