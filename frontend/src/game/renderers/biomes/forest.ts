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
  return getOffscreenCanvas('bg_camp_iso_v3', w, h, (ctx) => {
    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, 0, w, h);

    const horizon = Math.max(92, Math.round(h * 0.25));
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#020617');
    sky.addColorStop(1, '#172554');
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
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - ISO_TILE_HEIGHT / 2);
        ctx.lineTo(c.x + ISO_TILE_WIDTH / 2, c.y);
        ctx.lineTo(c.x, c.y + ISO_TILE_HEIGHT / 2);
        ctx.lineTo(c.x - ISO_TILE_WIDTH / 2, c.y);
        ctx.closePath();
        const edge = tx === 0 || ty === 0 || tx === CAMP_GRID_WIDTH - 1 || ty === CAMP_GRID_HEIGHT - 1;
        ctx.fillStyle = edge ? '#20382d' : ((tx + ty) % 2 === 0 ? '#284b38' : '#2d553e');
        ctx.fill();
        ctx.strokeStyle = 'rgba(148,163,184,0.055)';
        ctx.lineWidth = 1;
        ctx.stroke();
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
      const c = tileToScreen(tx, ty);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - ISO_TILE_HEIGHT / 2);
      ctx.lineTo(c.x + ISO_TILE_WIDTH / 2, c.y);
      ctx.lineTo(c.x, c.y + ISO_TILE_HEIGHT / 2);
      ctx.lineTo(c.x - ISO_TILE_WIDTH / 2, c.y);
      ctx.closePath();
      ctx.fillStyle = '#6b4f32';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,83,45,0.52)';
      ctx.stroke();
    });

    // Vegetação fica nas bordas externas e acompanha o próprio grid, evitando
    // coordenadas mágicas do canvas antigo de 680px.
    const treeTiles: Array<[number, number, number]> = [
      [1, 3, 0], [2, 8, 1], [3, 15, 2], [7, 17, 3],
      [16, 1, 1], [21, 4, 2], [22, 10, 0], [19, 16, 3],
    ];
    treeTiles.forEach(([tx, ty, variant]) => {
      const p = tileToScreen(tx, ty);
      const trunkH = 13 + variant * 2;
      ctx.fillStyle = '#4a2c16';
      ctx.fillRect(p.x - 3, p.y - trunkH, 6, trunkH + 3);
      ctx.fillStyle = variant % 2 === 0 ? '#14532d' : '#166534';
      ctx.fillRect(p.x - 11, p.y - trunkH - 14, 22, 10);
      ctx.fillStyle = '#0f3f2b';
      ctx.fillRect(p.x - 8, p.y - trunkH - 22, 16, 10);
    });

    const stoneTiles: Array<[number, number]> = [[3, 11], [6, 2], [18, 3], [21, 13], [12, 16], [2, 6]];
    ctx.fillStyle = '#64748b';
    stoneTiles.forEach(([tx, ty]) => {
      const p = tileToScreen(tx, ty);
      ctx.fillRect(p.x - 3, p.y - 2, 6, 3);
      ctx.fillRect(p.x - 1, p.y - 4, 5, 3);
    });
  });
}

const forestRiverTiles: Array<[number, number]> = [
  [2, 7], [3, 7], [4, 8], [5, 8], [6, 9], [7, 9], [8, 10], [9, 10],
  [10, 11], [11, 11], [12, 12], [13, 12], [14, 13], [15, 13], [16, 14],
  [17, 14], [18, 15], [19, 15],
];

const forestPathTiles = new Set<string>([
  ...Array.from({ length: 12 }, (_, index) => `${index + 6},${index + 3}`),
  ...Array.from({ length: 9 }, (_, index) => `${index + 8},${12 - index}`),
  '10,9', '11,9', '12,9', '13,9',
]);

function drawIsoTile(ctx: CanvasRenderingContext2D, tx: number, ty: number, fill: string, stroke = 'rgba(148,163,184,0.055)') {
  const c = tileToScreen(tx, ty);
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

/** Floresta da primeira expedição em uma arena isométrica de 24x18 tiles. */
export function getForestArenaBackground(w = 960, h = 420): HTMLCanvasElement {
  return getOffscreenCanvas('bg_forest_iso_arena_v1', w, h, (ctx) => {
    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, 0, w, h);

    const horizon = Math.max(92, Math.round(h * 0.25));
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#05052a');
    sky.addColorStop(1, '#172554');
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
        const fill = isRiver
          ? '#075985'
          : isPath
            ? '#76502d'
            : isArenaEdge
              ? '#20382d'
              : ((tx + ty) % 2 === 0 ? '#215238' : '#285f40');
        drawIsoTile(ctx, tx, ty, fill, isRiver ? 'rgba(125,211,252,0.25)' : undefined);
      }
    }

    // Margens, pedras e vegetação definem o clima de floresta sem bloquear os
    // atores. A colisão autoritativa continuará sendo adicionada ao catálogo
    // da arena quando novos obstáculos entrarem no design.
    const treeTiles: Array<[number, number, number]> = [
      [1, 3, 0], [3, 15, 1], [6, 16, 2], [17, 1, 1], [21, 4, 0], [22, 11, 2], [20, 16, 1],
    ];
    treeTiles.forEach(([tx, ty, variant]) => {
      const p = tileToScreen(tx, ty);
      const trunkH = 13 + variant * 2;
      ctx.fillStyle = '#4a2c16';
      ctx.fillRect(p.x - 3, p.y - trunkH, 6, trunkH + 3);
      ctx.fillStyle = variant % 2 === 0 ? '#14532d' : '#166534';
      ctx.fillRect(p.x - 11, p.y - trunkH - 14, 22, 10);
      ctx.fillStyle = '#0f3f2b';
      ctx.fillRect(p.x - 8, p.y - trunkH - 22, 16, 10);
    });

    [[4, 5], [5, 13], [18, 4], [21, 13], [15, 3], [2, 11]].forEach(([tx, ty]) => {
      const p = tileToScreen(tx, ty);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(p.x - 3, p.y - 2, 6, 3);
      ctx.fillRect(p.x - 1, p.y - 4, 5, 3);
    });
  });
}

/** Camada não cacheada da floresta: água e fogueira precisam animar a 60 FPS. */
export function renderForestArenaDynamic(ctx: CanvasRenderingContext2D, time: number) {
  forestRiverTiles.forEach(([tx, ty], index) => {
    const p = tileToScreen(tx, ty);
    const flow = (time * 0.04 + index * 7) % 28;
    ctx.save();
    ctx.globalAlpha = 0.28 + Math.sin(time / 260 + index) * 0.08;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 8 + flow - 14, p.y - 1);
    ctx.lineTo(p.x + flow - 14, p.y - 1);
    ctx.stroke();
    ctx.restore();
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
