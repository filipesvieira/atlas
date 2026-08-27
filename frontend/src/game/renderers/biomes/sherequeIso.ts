import { getOffscreenCanvas } from './canvasCache';
import { BuildingVisualProfiles, getGridFootprint } from '../../camp/CampLayoutRegistry';
import { CAMP_VISUAL_PALETTE } from '../../camp/CampVisualStyle';
import { renderCampfire } from '../../camp/renderers/CampfireRenderer';
import {
  drawIsoFootprint,
  drawIsoPanel,
  drawIsoPanelGrid,
  drawIsoRoof,
  drawIsoShadow,
  drawIsoWalls,
} from '../../camp/renderers/IsoBuildingPrimitives';
import { ISO_ARENA_GEOMETRY, IsoWorldGeometry, tileToScreen } from '../../IsoWorldGeometry';
import { WORLD_VISUAL_CONTRACT, stableVisualVariant } from '../../WorldVisualStyle';

const SWAMP_PALETTE = {
  void: '#050b16',
  horizonTop: '#11112e',
  horizonBottom: '#183b37',
  grass: ['#0d5a46', '#0f674d', '#125f48', '#0b4f42'],
  grassEdge: '#0a3b35',
  grassSide: '#082f2e',
  mud: '#68451f',
  mudLight: '#815627',
  water: '#0e6570',
  waterDeep: '#084b5e',
  waterLight: '#86efac',
  root: '#3b2417',
  rootLight: '#754523',
  bark: '#4b2918',
  barkLight: '#8a552b',
  moss: '#2c8b5b',
  mossLight: '#55b86b',
  reed: '#a6a83b',
  mushroom: '#d97706',
} as const;

// Os canais atravessam a arena, mas deixam as posições de entrada e o centro
// de combate livres. Na primeira versão os objetos são decorativos; a colisão
// autoritativa continuará pertencendo ao backend.
const SHEREQUE_WATER_TILES: Array<[number, number]> = [
  [1, 5], [2, 5], [2, 6], [3, 6], [3, 7], [4, 7], [4, 8], [5, 8],
  [5, 9], [6, 9], [6, 10], [7, 10], [7, 11], [8, 11], [8, 12], [9, 12],
  [17, 4], [18, 4], [18, 5], [19, 5], [19, 6], [20, 6], [20, 7], [21, 7],
  [21, 8], [22, 8], [22, 9],
];

const SHEREQUE_MUD_TILES = new Set<string>([
  '9,8', '10,8', '11,8', '12,8', '13,8', '14,8',
  '9,9', '10,9', '11,9', '12,9', '13,9', '14,9',
  '10,10', '11,10', '12,10', '13,10',
]);

// O sapo é fauna ambiental, não um ator de combate. A rota fechada evita a
// cabana, a fogueira e os principais pontos de spawn, mantendo sua animação
// puramente visual e determinística para todos os clientes.
const SHEREQUE_FROG_ROUTE: Array<[number, number]> = [
  [3, 3], [5, 3], [7, 4], [8, 5], [8, 7], [8, 10],
  [10, 12], [12, 14], [15, 14], [17, 12], [19, 10], [21, 10],
  [22, 8], [22, 5], [22, 2], [20, 2], [17, 2], [14, 2],
  [11, 3], [8, 3], [5, 3],
];
const SHEREQUE_FROG_CYCLE_MS = 3000;
const SHEREQUE_FROG_HOP_MS = 850;

function tileKey(tileX: number, tileY: number) {
  return `${tileX},${tileY}`;
}

function drawIsoTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  fill: string,
  geometry: IsoWorldGeometry,
  edgeDepth = 0,
  stroke = 'rgba(148,163,184,0.045)',
) {
  const point = tileToScreen(tileX, tileY, geometry);
  const halfWidth = geometry.tileWidth / 2;
  const halfHeight = geometry.tileHeight / 2;

  if (edgeDepth > 0) {
    ctx.fillStyle = SWAMP_PALETTE.grassSide;
    ctx.beginPath();
    ctx.moveTo(point.x - halfWidth, point.y);
    ctx.lineTo(point.x, point.y + halfHeight);
    ctx.lineTo(point.x + halfWidth, point.y);
    ctx.lineTo(point.x + halfWidth, point.y + edgeDepth);
    ctx.lineTo(point.x, point.y + halfHeight + edgeDepth);
    ctx.lineTo(point.x - halfWidth, point.y + edgeDepth);
    ctx.closePath();
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(point.x, point.y - halfHeight);
  ctx.lineTo(point.x + halfWidth, point.y);
  ctx.lineTo(point.x, point.y + halfHeight);
  ctx.lineTo(point.x - halfWidth, point.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawReeds(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  const sway = Math.sin(variant * 1.7) * 2;
  ctx.strokeStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 2); ctx.lineTo(x - 5 + sway, y - 18);
  ctx.moveTo(x + 1, y + 2); ctx.lineTo(x + 3 - sway, y - 23);
  ctx.moveTo(x + 6, y + 2); ctx.lineTo(x + 8 + sway, y - 14);
  ctx.stroke();
  ctx.strokeStyle = SWAMP_PALETTE.reed;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 2); ctx.lineTo(x - 5 + sway, y - 18);
  ctx.moveTo(x + 1, y + 2); ctx.lineTo(x + 3 - sway, y - 23);
  ctx.moveTo(x + 6, y + 2); ctx.lineTo(x + 8 + sway, y - 14);
  ctx.stroke();
  ctx.fillStyle = SWAMP_PALETTE.reed;
  ctx.fillRect(x + 1 - sway, y - 25, 3, 4);
}

function drawRoot(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  const direction = variant % 2 === 0 ? 1 : -1;
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.quadraticCurveTo(x + direction * 14, y - 12, x + direction * 28, y - 7);
  ctx.lineTo(x + direction * 31, y - 1);
  ctx.quadraticCurveTo(x + direction * 14, y - 4, x + direction * 3, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SWAMP_PALETTE.root;
  ctx.beginPath();
  ctx.moveTo(x + direction, y - 2);
  ctx.quadraticCurveTo(x + direction * 14, y - 10, x + direction * 27, y - 6);
  ctx.lineTo(x + direction * 28, y - 2);
  ctx.quadraticCurveTo(x + direction * 13, y - 3, x + direction * 4, y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SWAMP_PALETTE.rootLight;
  ctx.fillRect(x + direction * 10, y - 6, direction * 9, 2);
}

function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  const cap = variant % 2 === 0 ? SWAMP_PALETTE.mushroom : '#b45309';
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(x - 2, y - 10, 5, 11);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(x - 1, y - 9, 3, 10);
  ctx.fillStyle = cap;
  ctx.fillRect(x - 7, y - 13, 15, 5);
  ctx.fillRect(x - 4, y - 15, 9, 3);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(x - 3, y - 13, 2, 2);
  ctx.fillRect(x + 3, y - 11, 2, 2);
}

function drawSherequeSign(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(x - 2, y - 22, 4, 24);
  ctx.fillStyle = SWAMP_PALETTE.bark;
  ctx.fillRect(x - 18, y - 24, 36, 11);
  ctx.fillStyle = SWAMP_PALETTE.mossLight;
  ctx.fillRect(x - 14, y - 21, 28, 2);
}

interface SherequeFrogState {
  groundX: number;
  groundY: number;
  jumpHeight: number;
  facing: 1 | -1;
  blinking: boolean;
  feedingProgress: number | null;
}

function smoothStep(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

function getSherequeFrogState(time: number, geometry: IsoWorldGeometry): SherequeFrogState {
  const routeProgress = time / SHEREQUE_FROG_CYCLE_MS;
  const routeIndex = Math.floor(routeProgress) % SHEREQUE_FROG_ROUTE.length;
  const nextIndex = (routeIndex + 1) % SHEREQUE_FROG_ROUTE.length;
  const cycleTime = time % SHEREQUE_FROG_CYCLE_MS;
  const hopProgress = Math.min(1, cycleTime / SHEREQUE_FROG_HOP_MS);
  const travel = smoothStep(hopProgress);
  const [startTileX, startTileY] = SHEREQUE_FROG_ROUTE[routeIndex];
  const [endTileX, endTileY] = SHEREQUE_FROG_ROUTE[nextIndex];
  const tileX = startTileX + (endTileX - startTileX) * travel;
  const tileY = startTileY + (endTileY - startTileY) * travel;
  const ground = tileToScreen(tileX, tileY, geometry);
  const start = tileToScreen(startTileX, startTileY, geometry);
  const end = tileToScreen(endTileX, endTileY, geometry);
  const resting = cycleTime >= SHEREQUE_FROG_HOP_MS;

  // A cada quatro paradas um vaga-lume se aproxima e é capturado. O evento
  // ocorre no período de descanso para não competir visualmente com o salto.
  const feedingStart = 1450;
  const feedingDuration = 820;
  const feedingProgress = resting && nextIndex % 4 === 2 && cycleTime >= feedingStart && cycleTime <= feedingStart + feedingDuration
    ? (cycleTime - feedingStart) / feedingDuration
    : null;

  return {
    groundX: ground.x,
    groundY: ground.y,
    jumpHeight: hopProgress < 1 ? Math.sin(hopProgress * Math.PI) * 8 : 0,
    facing: end.x >= start.x ? 1 : -1,
    blinking: resting && feedingProgress === null && (Math.floor(time / 120) + nextIndex * 7) % 37 === 0,
    feedingProgress,
  };
}

function drawFrogFirefly(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const pulse = 0.45 + (Math.sin(time * 0.012) + 1) * 0.22;
  ctx.fillStyle = `rgba(253, 224, 71, ${pulse})`;
  ctx.fillRect(Math.round(x - 3), Math.round(y - 3), 7, 7);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  ctx.restore();
}

/** Sapo pixelado inspirado na referência, desenhado na paleta do pântano. */
function drawSherequeFrog(ctx: CanvasRenderingContext2D, state: SherequeFrogState, time: number) {
  const { groundX, groundY, jumpHeight, facing, blinking, feedingProgress } = state;
  const visualScale = 0.4;

  // A sombra permanece no terreno e encolhe conforme o sapo ganha altura.
  const shadowScale = 1 - Math.min(0.45, jumpHeight / 48);
  ctx.save();
  ctx.globalAlpha = 0.34 - Math.min(0.16, jumpHeight / 120);
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(Math.round(groundX), Math.round(groundY + 1), 7 * shadowScale, 2.5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(Math.round(groundX), Math.round(groundY - jumpHeight));
  ctx.scale(facing * visualScale, visualScale);

  // Vaga-lume e língua fazem parte do mesmo espaço local do sapo.
  if (feedingProgress !== null) {
    const approach = Math.min(1, feedingProgress / 0.38);
    const tongueWave = feedingProgress < 0.48
      ? feedingProgress / 0.48
      : Math.max(0, 1 - (feedingProgress - 0.48) / 0.32);
    const flyX = 31 - approach * 7;
    const flyY = -27 + Math.sin(time * 0.018) * 3;
    if (feedingProgress < 0.78) drawFrogFirefly(ctx, flyX, flyY, time, 1 - Math.max(0, feedingProgress - 0.66) / 0.12);
    if (tongueWave > 0.04) {
      ctx.strokeStyle = WORLD_VISUAL_CONTRACT.outline;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, -20);
      ctx.lineTo(10 + (flyX - 10) * tongueWave, -20 + (flyY + 20) * tongueWave);
      ctx.stroke();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, -20);
      ctx.lineTo(10 + (flyX - 10) * tongueWave, -20 + (flyY + 20) * tongueWave);
      ctx.stroke();
    }
  }

  const outline = WORLD_VISUAL_CONTRACT.outline;
  const greenDark = '#15803d';
  const green = '#22c55e';
  const greenLight = '#4ade80';
  const belly = '#fef3c7';

  // Pernas traseiras e pés.
  ctx.fillStyle = outline;
  ctx.fillRect(-21, -8, 15, 9);
  ctx.fillRect(6, -8, 15, 9);
  ctx.fillRect(-17, -13, 10, 8);
  ctx.fillRect(7, -13, 10, 8);
  ctx.fillStyle = greenDark;
  ctx.fillRect(-19, -7, 13, 6);
  ctx.fillRect(6, -7, 13, 6);
  ctx.fillStyle = green;
  ctx.fillRect(-15, -12, 8, 6);
  ctx.fillRect(7, -12, 8, 6);

  // Corpo e barriga clara.
  ctx.fillStyle = outline;
  ctx.fillRect(-15, -29, 30, 23);
  ctx.fillRect(-18, -24, 36, 13);
  ctx.fillStyle = greenDark;
  ctx.fillRect(-14, -28, 28, 21);
  ctx.fillStyle = green;
  ctx.fillRect(-16, -23, 32, 11);
  ctx.fillStyle = belly;
  ctx.fillRect(-5, -23, 17, 16);
  ctx.fillRect(-2, -27, 12, 5);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(8, -18, 5, 9);

  // Cabeça larga e focinho.
  ctx.fillStyle = outline;
  ctx.fillRect(-17, -39, 34, 17);
  ctx.fillRect(-14, -43, 11, 8);
  ctx.fillRect(4, -43, 11, 8);
  ctx.fillStyle = green;
  ctx.fillRect(-16, -38, 32, 15);
  ctx.fillStyle = greenLight;
  ctx.fillRect(-13, -36, 8, 6);
  ctx.fillRect(3, -38, 10, 5);

  // Olhos grandes; a faixa verde durante a piscada mantém a animação bem
  // visível mesmo com zoom distante.
  ctx.fillStyle = outline;
  ctx.fillRect(-13, -44, 11, 13);
  ctx.fillRect(3, -44, 11, 13);
  if (blinking) {
    ctx.fillStyle = greenDark;
    ctx.fillRect(-11, -37, 8, 3);
    ctx.fillRect(5, -37, 8, 3);
  } else {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-11, -42, 8, 10);
    ctx.fillRect(5, -42, 8, 10);
    ctx.fillStyle = '#020617';
    ctx.fillRect(-6, -38, 3, 5);
    ctx.fillRect(5, -38, 3, 5);
  }

  // Boca curta e pixelada.
  ctx.fillStyle = outline;
  ctx.fillRect(7, -25, 8, 2);
  ctx.fillRect(13, -27, 3, 4);
  ctx.restore();
}

/** Cabana da Vila do Shereque no mesmo volume isométrico das construções do acampamento. */
function drawSherequeHut(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);
  const width = 104;
  const depth = 72;
  const wallHeight = 40;
  const roofHeight = 30;

  drawIsoShadow(ctx, width + 12, depth + 12);
  drawIsoFootprint(ctx, width, depth, '#3f2a1e', '#101b1a');
  drawIsoWalls(ctx, width, depth, wallHeight, SWAMP_PALETTE.bark, '#342015', '#684025', '#171c1b');
  drawIsoRoof(
    ctx,
    width,
    depth,
    wallHeight,
    roofHeight,
    SWAMP_PALETTE.moss,
    '#146044',
    '#14532d',
    '#0b3d2a',
    '#071c1a',
  );

  const warmWindow = `rgba(251, 191, 36, ${0.84 + Math.sin(time / 230) * 0.08})`;
  const leftWindow = drawIsoPanel(ctx, {
    width,
    depth,
    wallHeight,
    side: 'left',
    position: 0.42,
    size: 17,
    height: 17,
    bottomOffset: 10,
    fill: warmWindow,
    stroke: '#26170f',
  });
  drawIsoPanelGrid(ctx, leftWindow, '#5c351e');

  const rightWindow = drawIsoPanel(ctx, {
    width,
    depth,
    wallHeight,
    side: 'right',
    position: 0.78,
    size: 15,
    height: 15,
    bottomOffset: 10,
    fill: warmWindow,
    stroke: '#26170f',
  });
  drawIsoPanelGrid(ctx, rightWindow, '#5c351e');

  const door = drawIsoPanel(ctx, {
    width,
    depth,
    wallHeight,
    side: 'right',
    position: 0.48,
    size: 20,
    height: 27,
    fill: '#26170f',
    stroke: '#101010',
  });
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(door[1].x - 2, door[1].y - 14, 3, 3);

  // Pequenas faixas de musgo reforçam o bioma sem voltar ao telhado plano.
  ctx.fillStyle = SWAMP_PALETTE.mossLight;
  ctx.fillRect(-30, -wallHeight - roofHeight + 12, 19, 2);
  ctx.fillRect(12, -wallHeight - roofHeight + 18, 16, 2);
  ctx.restore();
}

function drawStaticProps(ctx: CanvasRenderingContext2D, geometry: IsoWorldGeometry) {
  [[2, 3, 0], [4, 12, 1], [7, 15, 2], [16, 3, 3], [21, 12, 4], [20, 15, 5]].forEach(([tileX, tileY, variant]) => {
    const point = tileToScreen(tileX, tileY, geometry);
    drawReeds(ctx, point.x, point.y, variant);
  });
  [[5, 4, 0], [19, 13, 1], [14, 15, 0]].forEach(([tileX, tileY, variant]) => {
    const point = tileToScreen(tileX, tileY, geometry);
    drawRoot(ctx, point.x, point.y, variant);
  });
  [[3, 9, 0], [7, 5, 1], [18, 11, 0]].forEach(([tileX, tileY, variant]) => {
    const point = tileToScreen(tileX, tileY, geometry);
    drawMushroom(ctx, point.x, point.y, variant);
  });

}

/** Vila do Shereque em uma arena isométrica de 24x18 tiles. */
export function getSherequeArenaBackground(w = 960, h = 420, geometry = ISO_ARENA_GEOMETRY): HTMLCanvasElement {
  return getOffscreenCanvas('bg_shereque_iso_arena_v4', w, h, (ctx) => {
    ctx.fillStyle = SWAMP_PALETTE.void;
    ctx.fillRect(0, 0, w, h);

    const horizon = Math.max(92, Math.round(h * 0.25));
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, SWAMP_PALETTE.horizonTop);
    sky.addColorStop(1, SWAMP_PALETTE.horizonBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 12);
    ctx.fillStyle = '#d9f99d';
    ctx.fillRect(w - 132, 28, 9, 9);
    ctx.fillStyle = '#d1fae5';
    [[0.11, 0.08], [0.25, 0.12], [0.44, 0.06], [0.65, 0.10], [0.86, 0.07]].forEach(([rx, ry]) => {
      ctx.fillRect(Math.round(w * rx), Math.round(h * ry), 2, 2);
    });

    for (let tileX = 0; tileX < geometry.gridWidth; tileX++) {
      for (let tileY = 0; tileY < geometry.gridHeight; tileY++) {
        const edge = tileX === 0 || tileY === 0 || tileX === geometry.gridWidth - 1 || tileY === geometry.gridHeight - 1;
        const water = SHEREQUE_WATER_TILES.some(([waterX, waterY]) => waterX === tileX && waterY === tileY);
        const mud = SHEREQUE_MUD_TILES.has(tileKey(tileX, tileY));
        const grassVariant = stableVisualVariant(tileX, tileY, SWAMP_PALETTE.grass.length);
        const fill = water
          ? (stableVisualVariant(tileX, tileY, 2) === 0 ? SWAMP_PALETTE.water : SWAMP_PALETTE.waterDeep)
          : mud
            ? (stableVisualVariant(tileX, tileY, 2) === 0 ? SWAMP_PALETTE.mud : SWAMP_PALETTE.mudLight)
            : edge ? SWAMP_PALETTE.grassEdge : SWAMP_PALETTE.grass[grassVariant];
        drawIsoTile(ctx, tileX, tileY, fill, geometry, edge ? 5 : 0, water ? 'rgba(134,239,172,0.16)' : undefined);
        if (!water && !mud && !edge && stableVisualVariant(tileX, tileY, 17) === 0) {
          const point = tileToScreen(tileX, tileY, geometry);
          ctx.fillStyle = '#3c9361';
          ctx.fillRect(point.x + 3, point.y - 1, 2, 4);
          ctx.fillRect(point.x + 6, point.y - 3, 2, 6);
        }
      }
    }
    drawStaticProps(ctx, geometry);
  });
}

/**
 * A casa não fica mais no background cacheado. Entrando na fila de profundidade
 * do viewport, atores ao norte ficam atrás do telhado e atores ao sul ficam na
 * frente da fachada, como em um cenário isométrico real.
 */
export function getSherequeDepthObjects(
  _ctx: CanvasRenderingContext2D,
  _width: number,
  _height: number,
  time: number,
  geometry = ISO_ARENA_GEOMETRY,
) {
  const ground = tileToScreen(18, 6, geometry);
  const sign = tileToScreen(5, 14, geometry);
  const frog = getSherequeFrogState(time, geometry);
  const hutDepth = 72;
  return [
    {
      depth: ground.y + hutDepth / 4,
      render: () => drawSherequeHut(_ctx, ground.x, ground.y, time),
    },
    {
      depth: sign.y + 2,
      render: () => drawSherequeSign(_ctx, sign.x, sign.y),
    },
    {
      depth: frog.groundY + 3,
      render: () => drawSherequeFrog(_ctx, frog, time),
    },
  ];
}

function drawWaterWave(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, index: number) {
  const phase = (time * 0.001 + index * 0.19) % 1;
  const offset = Math.round((phase * 2 - 1) * 9);
  const alpha = 0.42 + Math.sin(time * 0.0025 + index) * 0.14;
  ctx.fillStyle = `rgba(134, 239, 172, ${alpha})`;
  ctx.fillRect(x - 11 + offset, y - 3, 8, 2);
  ctx.fillRect(x - 2 + offset, y - 1, 5, 2);
  ctx.fillStyle = `rgba(186, 230, 253, ${Math.max(0.15, alpha * 0.75)})`;
  ctx.fillRect(x - 5 - offset, y + 3, 7, 1);
}

function renderMist(ctx: CanvasRenderingContext2D, geometry: IsoWorldGeometry, time: number) {
  [[8, 5, 0], [13, 12, 1], [16, 10, 2], [4, 11, 3]].forEach(([tileX, tileY, phase]) => {
    const point = tileToScreen(tileX, tileY, geometry);
    const drift = Math.sin(time * 0.0007 + phase) * 7;
    const pulse = 0.08 + (Math.sin(time * 0.0012 + phase) + 1) * 0.04;
    ctx.fillStyle = `rgba(167, 243, 208, ${pulse})`;
    ctx.fillRect(point.x - 18 + drift, point.y - 19, 22, 4);
    ctx.fillRect(point.x + 3 + drift, point.y - 15, 14, 3);
  });
}

/** Água, névoa, vaga-lumes e fogueira da Vila do Shereque. */
export function renderSherequeDynamic(
  ctx: CanvasRenderingContext2D,
  _width: number,
  _height: number,
  time: number,
  geometry = ISO_ARENA_GEOMETRY,
) {
  SHEREQUE_WATER_TILES.forEach(([tileX, tileY], index) => {
    const point = tileToScreen(tileX, tileY, geometry);
    drawWaterWave(ctx, point.x, point.y, time, index);
  });
  renderMist(ctx, geometry, time);

  [[6, 4, 0], [15, 5, 1], [5, 13, 2], [16, 13, 3], [12, 4, 4]].forEach(([tileX, tileY, phase]) => {
    const point = tileToScreen(tileX, tileY, geometry);
    const pulse = 0.3 + (Math.sin(time * 0.003 + phase) + 1) * 0.2;
    ctx.fillStyle = `rgba(253, 224, 71, ${pulse})`;
    ctx.fillRect(Math.round(point.x + Math.sin(time * 0.0015 + phase) * 5), Math.round(point.y - 19 + Math.cos(time * 0.0018 + phase) * 4), 2, 2);
  });

  const fire = tileToScreen(11, 9, geometry);
  const campfireVisual = BuildingVisualProfiles.campfire;
  const campfireFootprint = getGridFootprint('campfire');
  renderCampfire(ctx, {
    ctx,
    level: 1,
    discovered: true,
    isUnderConstruction: false,
    constructionProgress: 100,
    x: fire.x,
    y: fire.y + campfireFootprint.height * campfireVisual.groundOffset,
    scale: campfireVisual.sceneScale,
    time,
    footprint: {
      width: Math.round(campfireVisual.silhouetteWidth * campfireVisual.sceneScale),
      height: Math.round(campfireVisual.silhouetteHeight * campfireVisual.sceneScale),
    },
  });

  ctx.save();
  ctx.globalAlpha = 0.12 + (Math.sin(time * 0.002) + 1) * 0.04;
  ctx.fillStyle = CAMP_VISUAL_PALETTE.magicLight;
  ctx.fillRect(fire.x - 24, fire.y - 7, 48, 3);
  ctx.restore();
}