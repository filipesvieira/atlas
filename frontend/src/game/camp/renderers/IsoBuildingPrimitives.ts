export interface IsoPoint {
  x: number;
  y: number;
}

interface IsoCorners {
  north: IsoPoint;
  east: IsoPoint;
  south: IsoPoint;
  west: IsoPoint;
  topNorth: IsoPoint;
  topEast: IsoPoint;
  topSouth: IsoPoint;
  topWest: IsoPoint;
}

export interface IsoBoxOptions {
  x?: number;
  y?: number;
  width: number;
  depth: number;
  height: number;
  top: string;
  left: string;
  right: string;
  edge?: string;
}

export interface IsoPanelOptions {
  width: number;
  depth: number;
  wallHeight: number;
  side: 'left' | 'right';
  position: number;
  size: number;
  height: number;
  bottomOffset?: number;
  fill: string;
  stroke?: string;
}

function polygon(ctx: CanvasRenderingContext2D, points: IsoPoint[], fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function getCorners(width: number, depth: number, height: number, x = 0, y = 0): IsoCorners {
  const ground = {
    // O terreno usa tiles 32x16: a profundidade visual é metade da largura.
    // Manter essa proporção evita que os prédios pareçam inclinados demais.
    north: { x, y: y - depth / 4 },
    east: { x: x + width / 2, y },
    south: { x, y: y + depth / 4 },
    west: { x: x - width / 2, y },
  };

  return {
    ...ground,
    topNorth: { x: ground.north.x, y: ground.north.y - height },
    topEast: { x: ground.east.x, y: ground.east.y - height },
    topSouth: { x: ground.south.x, y: ground.south.y - height },
    topWest: { x: ground.west.x, y: ground.west.y - height },
  };
}

function lerp(a: IsoPoint, b: IsoPoint, amount: number): IsoPoint {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

export function drawIsoFootprint(
  ctx: CanvasRenderingContext2D,
  width: number,
  depth: number,
  fill = '#1e293b',
  edge = '#0f172a'
) {
  const corners = getCorners(width, depth, 0);
  polygon(ctx, [corners.north, corners.east, corners.south, corners.west], fill, edge);
  polygon(ctx, [corners.north, corners.west, corners.south], 'rgba(255,255,255,0.035)');
  polygon(ctx, [corners.north, corners.east, corners.south], 'rgba(0,0,0,0.12)');
}

export function drawIsoBox(ctx: CanvasRenderingContext2D, options: IsoBoxOptions) {
  const corners = getCorners(options.width, options.depth, options.height, options.x, options.y);
  const edge = options.edge || '#0f172a';

  polygon(ctx, [corners.topWest, corners.topSouth, corners.south, corners.west], options.left, edge);
  polygon(ctx, [corners.topSouth, corners.topEast, corners.east, corners.south], options.right, edge);
  polygon(ctx, [corners.topNorth, corners.topEast, corners.topSouth, corners.topWest], options.top, edge);
}

export function drawIsoWalls(
  ctx: CanvasRenderingContext2D,
  width: number,
  depth: number,
  height: number,
  left: string,
  right: string,
  top = '#713f12',
  edge = '#1c1917'
) {
  const corners = getCorners(width, depth, height);
  drawIsoBox(ctx, { width, depth, height, left, right, top, edge });

  // Faixas discretas de tábuas dão materialidade às paredes sem depender de
  // sprites rasterizados diferentes para cada construção.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 224, 178, 0.12)';
  ctx.lineWidth = 1;
  for (const amount of [0.24, 0.48, 0.72]) {
    const leftA = lerp(corners.topWest, corners.west, amount);
    const leftB = lerp(corners.topSouth, corners.south, amount);
    const rightA = lerp(corners.topSouth, corners.south, amount);
    const rightB = lerp(corners.topEast, corners.east, amount);
    ctx.beginPath();
    ctx.moveTo(leftA.x, leftA.y);
    ctx.lineTo(leftB.x, leftB.y);
    ctx.moveTo(rightA.x, rightA.y);
    ctx.lineTo(rightB.x, rightB.y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawIsoRoof(
  ctx: CanvasRenderingContext2D,
  width: number,
  depth: number,
  wallHeight: number,
  roofHeight: number,
  left: string,
  right: string,
  backLeft: string,
  backRight: string,
  edge = '#451a03'
) {
  const corners = getCorners(width + 8, depth + 8, wallHeight);
  const ridge: IsoPoint = { x: 0, y: -wallHeight - roofHeight };

  // As águas traseiras são desenhadas primeiro; as duas águas frontais dão a
  // leitura de volume que faltava aos antigos telhados planos.
  polygon(ctx, [corners.topNorth, corners.topEast, ridge], backRight, edge);
  polygon(ctx, [corners.topWest, corners.topNorth, ridge], backLeft, edge);
  polygon(ctx, [corners.topWest, ridge, corners.topSouth], left, edge);
  polygon(ctx, [corners.topSouth, ridge, corners.topEast], right, edge);
  ctx.strokeStyle = 'rgba(254,240,138,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ridge.x, ridge.y);
  ctx.lineTo(corners.topSouth.x, corners.topSouth.y);
  ctx.stroke();

  // Sulcos de telha seguem as quatro águas e mantêm o volume legível nos
  // níveis 1–3, inclusive quando a câmera aproxima.
  ctx.strokeStyle = 'rgba(20, 10, 16, 0.34)';
  ctx.lineWidth = 1;
  for (const amount of [0.25, 0.5, 0.75]) {
    const leftStart = lerp(corners.topWest, ridge, amount);
    const leftEnd = lerp(corners.topNorth, ridge, amount);
    const rightStart = lerp(corners.topEast, ridge, amount);
    const rightEnd = lerp(corners.topNorth, ridge, amount);
    ctx.beginPath();
    ctx.moveTo(leftStart.x, leftStart.y);
    ctx.lineTo(leftEnd.x, leftEnd.y);
    ctx.moveTo(rightStart.x, rightStart.y);
    ctx.lineTo(rightEnd.x, rightEnd.y);
    ctx.stroke();
  }
}

export function drawIsoPanel(ctx: CanvasRenderingContext2D, options: IsoPanelOptions): IsoPoint[] {
  const corners = getCorners(options.width, options.depth, options.wallHeight);
  const sideEnd = options.side === 'left' ? corners.west : corners.east;
  const center = Math.min(0.94, Math.max(0.06, options.position));
  const halfSize = Math.min(0.22, Math.max(0.015, options.size / Math.max(options.width, options.depth)));
  const low = Math.max(0.02, center - halfSize);
  const high = Math.min(0.98, center + halfSize);
  const baseA = lerp(corners.south, sideEnd, low);
  const baseB = lerp(corners.south, sideEnd, high);
  const bottomOffset = options.bottomOffset || 0;
  baseA.y -= bottomOffset;
  baseB.y -= bottomOffset;
  const topA = { x: baseA.x, y: baseA.y - options.height };
  const topB = { x: baseB.x, y: baseB.y - options.height };
  const points = [baseA, baseB, topB, topA];
  polygon(ctx, points, options.fill, options.stroke || '#1c1917');
  return points;
}

export function drawIsoPanelGrid(ctx: CanvasRenderingContext2D, points: IsoPoint[], color = '#78350f') {
  if (points.length !== 4) return;
  const [baseA, baseB, topB, topA] = points;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo((topA.x + topB.x) / 2, (topA.y + topB.y) / 2);
  ctx.lineTo((baseA.x + baseB.x) / 2, (baseA.y + baseB.y) / 2);
  ctx.moveTo(topA.x + (topB.x - topA.x) * 0.5, topA.y + 1);
  ctx.lineTo(baseA.x + (baseB.x - baseA.x) * 0.5, baseA.y - 1);
  ctx.stroke();
}

export function drawIsoGroundPost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  width = 4,
  fill = '#451a03'
) {
  ctx.fillStyle = fill;
  ctx.fillRect(x - width / 2, y - height, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x - width / 2, y - height, 1, height);
}

export function drawIsoShadow(ctx: CanvasRenderingContext2D, width: number, depth: number, alpha = 0.28) {
  ctx.save();
  ctx.globalAlpha = alpha;
  drawIsoFootprint(ctx, width, depth, '#020617', '#020617');
  ctx.restore();
}
