import { getOffscreenCanvas } from './canvasCache';
import {
  BuildingVisualProfiles,
  CAMP_GRID_HEIGHT,
  CAMP_GRID_WIDTH,
  ISO_TILE_HEIGHT,
  ISO_TILE_WIDTH,
  getGridFootprint,
  tileToScreen,
} from '../../camp/CampLayoutRegistry';
import { renderCampfire } from '../../camp/renderers/CampfireRenderer';
import { FOREST_NIGHT_PALETTE, stableVisualVariant, WORLD_VISUAL_CONTRACT } from '../../WorldVisualStyle';

export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x - w * 0.15, y, w * 0.3, h * 0.4);

  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(x, y - h * 0.2, w * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(x - w * 0.2, y - h * 0.35, w * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(x + w * 0.2, y - h * 0.3, w * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Cenário: Floresta dos Aprendizes (Verde exuberante, árvore, trilha de terra, sol) */
export function getForestBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_forest', w, h, (ctx) => {
    // Céu gradiente suave (Crepúsculo ensolarado)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, '#1e3a8a');
    skyGrad.addColorStop(0.6, '#3b82f6');
    skyGrad.addColorStop(1, '#93c5fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    // Sol da manhã distante
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(80, 45, 22, 0, Math.PI * 2);
    ctx.fill();

    // Montanhas ao fundo
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w * 0.18, h * 0.32);
    ctx.lineTo(w * 0.36, h * 0.5);
    ctx.lineTo(w * 0.58, h * 0.28);
    ctx.lineTo(w * 0.82, h * 0.5);
    ctx.lineTo(w, h * 0.38);
    ctx.lineTo(w, h * 0.5);
    ctx.fill();

    // Chão de grama rústica
    const grassGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
    grassGrad.addColorStop(0, '#15803d');
    grassGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);

    // Trilha de terra central
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.quadraticCurveTo(w * 0.5, h * 0.58, w, h * 0.68);
    ctx.lineTo(w, h * 0.88);
    ctx.quadraticCurveTo(w * 0.5, h * 0.78, 0, h * 0.85);
    ctx.fill();

    // Pedras e tufos de grama na trilha
    ctx.fillStyle = '#92400e';
    ctx.fillRect(40, h * 0.72, 8, 3);
    ctx.fillRect(w * 0.32, h * 0.66, 12, 4);
    ctx.fillRect(w * 0.64, h * 0.75, 10, 4);
    ctx.fillRect(w * 0.88, h * 0.70, 7, 3);

    // Árvores nas bordas
    drawTree(ctx, 30, h * 0.52, 28, 65);
    drawTree(ctx, w - 30, h * 0.55, 32, 70);
    drawTree(ctx, w - 70, h * 0.48, 22, 50);
  });
}

/** Cenário: Acampamento / Safezone em perspectiva isométrica. */
export function getCampBackground(w = 960, h = 420): HTMLCanvasElement {
  return getOffscreenCanvas('bg_camp_iso_v4', w, h, (ctx) => {
    ctx.fillStyle = FOREST_NIGHT_PALETTE.void;
    ctx.fillRect(0, 0, w, h);

    const horizon = Math.max(92, Math.round(h * 0.25));
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, FOREST_NIGHT_PALETTE.horizonTop);
    sky.addColorStop(1, FOREST_NIGHT_PALETTE.horizonBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 10);

    // Lua e estrelas acompanham a nova largura do viewport.
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(w - 82, 25, 12, 12);
    ctx.fillStyle = '#ffffff';
    [
      [0.08, 0.07], [0.17, 0.11], [0.29, 0.06], [0.41, 0.10],
      [0.55, 0.05], [0.68, 0.12], [0.79, 0.07], [0.90, 0.13],
    ].forEach(([rx, ry]) => ctx.fillRect(Math.round(w * rx), Math.round(h * ry), 2, 2));

    // Terreno V3: 24x18. A grade segue sendo legível, mas discreta o bastante
    // para a vila parecer cenário em vez de editor técnico.
    for (let tx = 0; tx < CAMP_GRID_WIDTH; tx++) {
      for (let ty = 0; ty < CAMP_GRID_HEIGHT; ty++) {
        const c = tileToScreen(tx, ty);
        const edge = tx === 0 || ty === 0 || tx === CAMP_GRID_WIDTH - 1 || ty === CAMP_GRID_HEIGHT - 1;
        const grassVariant = stableVisualVariant(tx, ty, FOREST_NIGHT_PALETTE.grass.length);
        const fill = edge
          ? FOREST_NIGHT_PALETTE.grassEdge
          : FOREST_NIGHT_PALETTE.grass[grassVariant];
        drawIsoTile(ctx, tx, ty, fill, undefined, edge ? WORLD_VISUAL_CONTRACT.isoTile.edgeDepth : 0);
        if (!edge && stableVisualVariant(tx, ty, 15) === 0) {
          drawForestTuft(ctx, c.x + 4, c.y + 1, grassVariant);
        }
      }
    }

    // Eixos principais + pequenos ramais. Eles formam ruas naturais para os
    // moradores, sem impor onde o jogador deve colocar seus prédios.
    const pathTiles = new Set<string>();
    const midX = Math.floor(CAMP_GRID_WIDTH / 2);
    const midY = Math.floor(CAMP_GRID_HEIGHT / 2);
    for (let x = 2; x < CAMP_GRID_WIDTH - 2; x++) pathTiles.add(`${x},${midY}`);
    for (let y = 2; y < CAMP_GRID_HEIGHT - 2; y++) pathTiles.add(`${midX},${y}`);
    for (let i = -4; i <= 5; i++) {
      const x = midX + i;
      const y = midY + Math.floor(i / 2);
      if (x > 0 && x < CAMP_GRID_WIDTH - 1 && y > 0 && y < CAMP_GRID_HEIGHT - 1) pathTiles.add(`${x},${y}`);
    }

    pathTiles.forEach((entry) => {
      const [tx, ty] = entry.split(',').map(Number);
      drawIsoTile(ctx, tx, ty, stableVisualVariant(tx, ty, 2) === 0 ? FOREST_NIGHT_PALETTE.path : FOREST_NIGHT_PALETTE.pathLight, 'rgba(120,83,45,0.52)');
    });

    // Vegetação fica nas bordas externas e acompanha o próprio grid, evitando
    // coordenadas mágicas do canvas antigo de 680px.
    const treeTiles: Array<[number, number, number]> = [
      [1, 3, 0], [2, 8, 1], [3, 15, 2], [7, 17, 3],
      [16, 1, 1], [21, 4, 2], [22, 10, 0], [19, 16, 3],
    ];
    treeTiles.forEach(([tx, ty, variant]) => {
      const p = tileToScreen(tx, ty);
      drawForestTree(ctx, p.x, p.y, variant);
    });

    const stoneTiles: Array<[number, number]> = [[3, 11], [6, 2], [18, 3], [21, 13], [12, 16], [2, 6]];
    stoneTiles.forEach(([tx, ty]) => {
      const p = tileToScreen(tx, ty);
      drawForestRock(ctx, p.x, p.y, stableVisualVariant(tx, ty, 3));
    });
    const log = tileToScreen(4, 12);
    drawFallenLog(ctx, log.x, log.y - 2);
    const sign = tileToScreen(18, 5);
    drawForestSign(ctx, sign.x, sign.y - 1);
  });
}

/** Partículas ambientais do acampamento, desenhadas antes dos atores/prédios. */
export function renderCampDynamic(ctx: CanvasRenderingContext2D, _width: number, _height: number, time: number) {
  const fireflies: Array<[number, number, number]> = [
    [8, 5, 0], [16, 6, 1], [5, 12, 2], [18, 12, 3], [11, 3, 4],
  ];
  ctx.save();
  fireflies.forEach(([tx, ty, phase]) => {
    const point = tileToScreen(tx, ty);
    const pulse = 0.25 + (Math.sin(time * 0.003 + phase) + 1) * 0.22;
    ctx.fillStyle = `rgba(253, 224, 71, ${pulse})`;
    ctx.fillRect(Math.round(point.x + Math.sin(time * 0.0015 + phase) * 5), Math.round(point.y - 14 + Math.cos(time * 0.0018 + phase) * 4), 2, 2);
  });
  ctx.restore();
}

const forestRiverTiles: Array<[number, number]> = [
  // O curso d'água entra pela borda noroeste e sai pela borda sudeste; não é
  // mais uma decoração que começa e termina dentro da própria arena.
  [0, 5], [1, 6], [2, 7], [3, 7], [4, 8], [5, 8], [6, 9], [7, 9], [8, 10], [9, 10],
  [10, 11], [11, 11], [12, 12], [13, 12], [14, 13], [15, 13], [16, 14],
  [17, 14], [18, 15], [19, 15], [20, 16], [21, 16], [22, 17],
];

const forestPathTiles = new Set<string>([
  ...Array.from({ length: 12 }, (_, index) => `${index + 6},${index + 3}`),
  ...Array.from({ length: 9 }, (_, index) => `${index + 8},${12 - index}`),
  '10,9', '11,9', '12,9', '13,9',
]);

function drawIsoTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  fill: string,
  stroke = 'rgba(148,163,184,0.055)',
  edgeDepth = 0,
) {
  const c = tileToScreen(tx, ty);
  if (edgeDepth > 0) {
    ctx.fillStyle = FOREST_NIGHT_PALETTE.grassSide;
    ctx.beginPath();
    ctx.moveTo(c.x - ISO_TILE_WIDTH / 2, c.y);
    ctx.lineTo(c.x, c.y + ISO_TILE_HEIGHT / 2);
    ctx.lineTo(c.x + ISO_TILE_WIDTH / 2, c.y);
    ctx.lineTo(c.x + ISO_TILE_WIDTH / 2, c.y + edgeDepth);
    ctx.lineTo(c.x, c.y + ISO_TILE_HEIGHT / 2 + edgeDepth);
    ctx.lineTo(c.x - ISO_TILE_WIDTH / 2, c.y + edgeDepth);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - ISO_TILE_HEIGHT / 2);
  ctx.lineTo(c.x + ISO_TILE_WIDTH / 2, c.y);
  ctx.lineTo(c.x, c.y + ISO_TILE_HEIGHT / 2);
  ctx.lineTo(c.x - ISO_TILE_WIDTH / 2, c.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawForestTuft(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  const colors = ['#2d6d47', '#245e3f', '#367c4d'];
  ctx.fillStyle = colors[variant % colors.length];
  ctx.fillRect(x - 4, y - 2, 2, 4);
  ctx.fillRect(x - 1, y - 4, 2, 6);
  ctx.fillRect(x + 2, y - 3, 2, 5);
}

function drawForestRock(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  const width = variant % 2 === 0 ? 7 : 9;
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(x - Math.floor(width / 2) - 1, y - 4, width + 2, 6);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.rockDark;
  ctx.fillRect(x - Math.floor(width / 2), y - 4, width, 5);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.rockMid;
  ctx.fillRect(x - Math.floor(width / 2) + 1, y - 5, width - 3, 3);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.rockLight;
  ctx.fillRect(x - Math.floor(width / 2) + 2, y - 5, 2, 1);
}

function drawForestTree(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  const scale = variant % 3 === 0 ? 1 : variant % 3 === 1 ? 0.82 : 1.18;
  const trunkH = Math.round(18 * scale);
  const crownW = Math.round(22 * scale);
  const crownH = Math.round(28 * scale);
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(x - 3, y - trunkH, 6, trunkH + 4);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.trunk;
  ctx.fillRect(x - 2, y - trunkH, 4, trunkH + 2);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.trunkLight;
  ctx.fillRect(x, y - trunkH + 3, 2, trunkH - 5);
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.beginPath();
  ctx.moveTo(x, y - trunkH - crownH + 5);
  ctx.lineTo(x - crownW / 2 - 2, y - trunkH + 3);
  ctx.lineTo(x + crownW / 2 + 2, y - trunkH + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FOREST_NIGHT_PALETTE.pineDark;
  ctx.beginPath();
  ctx.moveTo(x, y - trunkH - crownH + 7);
  ctx.lineTo(x - crownW / 2, y - trunkH + 2);
  ctx.lineTo(x + crownW / 2, y - trunkH + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FOREST_NIGHT_PALETTE.pineMid;
  ctx.beginPath();
  ctx.moveTo(x - 1, y - trunkH - crownH + 11);
  ctx.lineTo(x - crownW / 2 + 5, y - trunkH - 1);
  ctx.lineTo(x + 2, y - trunkH - 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FOREST_NIGHT_PALETTE.pineLight;
  ctx.fillRect(x - Math.round(crownW / 4), y - trunkH - Math.round(crownH / 2), Math.round(crownW / 3), 3);
}

function drawFallenLog(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(x - 10, y - 5, 21, 7);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.trunk;
  ctx.fillRect(x - 9, y - 4, 18, 5);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.trunkLight;
  ctx.fillRect(x - 7, y - 3, 12, 2);
  ctx.fillStyle = '#c1844c';
  ctx.fillRect(x + 7, y - 3, 2, 3);
}

function drawForestSign(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(x - 2, y - 16, 5, 18);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.trunk;
  ctx.fillRect(x - 1, y - 15, 3, 16);
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(x - 9, y - 17, 17, 7);
  ctx.fillStyle = '#a36a36';
  ctx.fillRect(x - 8, y - 16, 15, 5);
}

/** Floresta da primeira expedição em uma arena isométrica de 24x18 tiles. */
export function getForestArenaBackground(w = 960, h = 420): HTMLCanvasElement {
  return getOffscreenCanvas('bg_forest_iso_arena_v2', w, h, (ctx) => {
    ctx.fillStyle = FOREST_NIGHT_PALETTE.void;
    ctx.fillRect(0, 0, w, h);

    const horizon = Math.max(92, Math.round(h * 0.25));
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, FOREST_NIGHT_PALETTE.horizonTop);
    sky.addColorStop(1, FOREST_NIGHT_PALETTE.horizonBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 12);

    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(116, 30, 10, 10);
    ctx.fillStyle = '#ffffff';
    [[0.10, 0.08], [0.22, 0.12], [0.36, 0.06], [0.58, 0.10], [0.76, 0.05], [0.91, 0.12]].forEach(([rx, ry]) => {
      ctx.fillRect(Math.round(w * rx), Math.round(h * ry), 2, 2);
    });

    for (let tx = 0; tx < CAMP_GRID_WIDTH; tx++) {
      for (let ty = 0; ty < CAMP_GRID_HEIGHT; ty++) {
        const key = `${tx},${ty}`;
        const isRiver = forestRiverTiles.some(([riverX, riverY]) => riverX === tx && riverY === ty);
        const isPath = forestPathTiles.has(key);
        const isArenaEdge = tx === 0 || ty === 0 || tx === CAMP_GRID_WIDTH - 1 || ty === CAMP_GRID_HEIGHT - 1;
        const grassVariant = stableVisualVariant(tx, ty, FOREST_NIGHT_PALETTE.grass.length);
        const fill = isRiver
          ? (stableVisualVariant(tx, ty, 2) === 0 ? FOREST_NIGHT_PALETTE.river : FOREST_NIGHT_PALETTE.riverDeep)
          : isPath
            ? (stableVisualVariant(tx, ty, 2) === 0 ? FOREST_NIGHT_PALETTE.path : FOREST_NIGHT_PALETTE.pathLight)
            : isArenaEdge
              ? FOREST_NIGHT_PALETTE.grassEdge
              : FOREST_NIGHT_PALETTE.grass[grassVariant];
        drawIsoTile(
          ctx,
          tx,
          ty,
          fill,
          isRiver ? 'rgba(125,211,252,0.25)' : undefined,
          isArenaEdge ? WORLD_VISUAL_CONTRACT.isoTile.edgeDepth : 0,
        );
        if (!isRiver && !isPath && !isArenaEdge && stableVisualVariant(tx, ty, 13) === 0) {
          const p = tileToScreen(tx, ty);
          drawForestTuft(ctx, p.x + 4, p.y + 1, grassVariant);
        }
      }
    }

    // Silhuetas e objetos baixos ficam atrás dos atores e não alteram colisão.
    const treeTiles: Array<[number, number, number]> = [
      [1, 3, 0], [3, 15, 1], [6, 16, 2], [17, 1, 1], [21, 4, 0], [22, 11, 2], [20, 16, 1],
      [7, 3, 2], [18, 2, 1], [22, 8, 0], [12, 16, 2], [5, 14, 1],
    ];
    treeTiles.forEach(([tx, ty, variant]) => {
      const p = tileToScreen(tx, ty);
      drawForestTree(ctx, p.x, p.y, variant);
    });

    [[4, 5], [5, 13], [18, 4], [21, 13], [15, 3], [2, 11], [11, 4], [7, 13]].forEach(([tx, ty]) => {
      const p = tileToScreen(tx, ty);
      drawForestRock(ctx, p.x, p.y, stableVisualVariant(tx, ty, 3));
    });
    const log = tileToScreen(3, 9);
    drawFallenLog(ctx, log.x, log.y - 2);
    const sign = tileToScreen(19, 9);
    drawForestSign(ctx, sign.x, sign.y - 1);
  });
}

/** Camada não cacheada da floresta: água e fogueira precisam animar a 60 FPS. */
function drawForestRiverWave(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, index: number) {
  const phase = (time * 0.0012 + index * 0.16) % 1;
  const travel = Math.round((phase * 2 - 1) * 10);
  const shimmer = 0.54 + Math.sin(time * 0.003 + index) * 0.16;
  ctx.save();
  ctx.strokeStyle = `rgba(125, 211, 252, ${shimmer})`;
  ctx.fillStyle = `rgba(125, 211, 252, ${shimmer})`;
  ctx.fillRect(x - 10 + travel, y - 3, 8, 2);
  ctx.fillRect(x - 1 + travel, y - 2, 5, 2);
  ctx.fillStyle = `rgba(186, 230, 253, ${shimmer * 0.8})`;
  ctx.fillRect(x - 5 - travel, y + 2, 7, 2);
  ctx.fillRect(x + 4 - travel, y + 3, 3, 1);
  ctx.restore();
}

export function renderForestArenaDynamic(ctx: CanvasRenderingContext2D, time: number) {
  forestRiverTiles.forEach(([tx, ty], index) => {
    const p = tileToScreen(tx, ty);
    drawForestRiverWave(ctx, p.x, p.y, time, index);
  });

  const fire = tileToScreen(12, 9);
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
}
