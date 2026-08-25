import { BuildingRenderContext } from '../types';
import {
  drawIsoBox,
  drawIsoFootprint,
  drawIsoPanel,
  drawIsoRoof,
  drawIsoShadow,
  drawIsoWalls,
} from './IsoBuildingPrimitives';

function drawPotionFlask(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = 1) {
  drawIsoBox(ctx, { x, y, width: 8 * size, depth: 6 * size, height: 7 * size, top: color, left: '#7c3aed', right: '#4c1d95' });
  drawIsoBox(ctx, { x, y: y - 7 * size, width: 3 * size, depth: 3 * size, height: 4 * size, top: '#c4b5fd', left: '#8b5cf6', right: '#6d28d9' });
}

function drawArcaneBubbles(ctx: CanvasRenderingContext2D, time: number, count: number, spread: number, rise: number) {
  for (let i = 0; i < count; i++) {
    const progress = (time * 0.0014 + i * 0.27) % 1;
    const px = Math.sin(time * 0.003 + i * 2.2) * spread;
    const py = -rise * progress - 13;
    ctx.fillStyle = `rgba(216, 180, 254, ${Math.sin(progress * Math.PI) * 0.8})`;
    ctx.fillRect(px, py, 2, 2);
  }
}

/** Bancada de Alquimia — níveis 0 a 3 em volume isométrico. */
export function renderAlchemyBench(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time, scale } = renderCtx;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (level === 0) {
    drawIsoShadow(ctx, 38, 28);
    drawIsoFootprint(ctx, 34, 24, '#312e81', '#111827');
    drawIsoBox(ctx, { x: -2, y: -3, width: 27, depth: 14, height: 5, top: '#92400e', left: '#713f12', right: '#451a03' });
    drawPotionFlask(ctx, 10, -8, '#c084fc');
    ctx.restore();
    return;
  }

  if (level === 1) {
    drawIsoShadow(ctx, 48, 34);
    drawIsoFootprint(ctx, 44, 30, '#334155', '#1e1b4b');
    drawIsoBox(ctx, { x: -7, y: -7, width: 30, depth: 17, height: 10, top: '#92400e', left: '#713f12', right: '#451a03' });
    drawIsoBox(ctx, { x: 14, y: -4, width: 12, depth: 10, height: 8, top: '#475569', left: '#334155', right: '#1e293b' });
    drawPotionFlask(ctx, -13, -19, '#c084fc');
    drawPotionFlask(ctx, 4, -19, '#67e8f9', 0.85);
    drawArcaneBubbles(ctx, time, 2, 7, 15);
    ctx.restore();
    return;
  }

  if (level === 2) {
    const width = 64;
    const depth = 44;
    drawIsoShadow(ctx, width + 8, depth + 8);
    drawIsoFootprint(ctx, width, depth, '#475569', '#1e1b4b');
    drawIsoWalls(ctx, width, depth, 7, '#4c1d95', '#312e81', '#6d28d9');
    drawIsoBox(ctx, { x: -13, y: -9, width: 32, depth: 19, height: 18, top: '#92400e', left: '#713f12', right: '#451a03' });
    drawIsoBox(ctx, { x: 19, y: -3, width: 20, depth: 17, height: 13, top: '#475569', left: '#334155', right: '#1e293b' });
    drawIsoPanel(ctx, { width, depth, wallHeight: 7, side: 'left', position: 0.34, size: 12, height: 13, bottomOffset: 5, fill: '#1e1b4b', stroke: '#0f172a' });
    drawPotionFlask(ctx, -18, -31, '#c084fc', 1.05);
    drawPotionFlask(ctx, -2, -30, '#67e8f9', 0.9);
    ctx.fillStyle = '#f0abfc';
    ctx.fillRect(19, -28, 4, 3);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(25, -25, 4, 3);
    drawArcaneBubbles(ctx, time, 4, 15, 27);
    ctx.restore();
    return;
  }

  const width = 84;
  const depth = 58;
  drawIsoShadow(ctx, width + 10, depth + 10);
  drawIsoFootprint(ctx, width, depth, '#312e81', '#1e1b4b');
  drawIsoWalls(ctx, width, depth, 10, '#4c1d95', '#312e81', '#6d28d9');
  drawIsoRoof(ctx, width - 4, depth - 4, 10, 18, '#581c87', '#3b0764', '#7e22ce', '#4c1d95');

  // Laboratório avançado com bancada de madeira, núcleo de destilação e prateleiras.
  drawIsoBox(ctx, { x: -21, y: -10, width: 34, depth: 21, height: 25, top: '#92400e', left: '#713f12', right: '#451a03' });
  drawIsoBox(ctx, { x: 22, y: -5, width: 26, depth: 21, height: 35, top: '#475569', left: '#334155', right: '#1e293b' });
  drawIsoBox(ctx, { x: 22, y: -42, width: 15, depth: 13, height: 12, top: '#64748b', left: '#475569', right: '#1e293b' });
  drawIsoPanel(ctx, { width, depth, wallHeight: 10, side: 'right', position: 0.42, size: 14, height: 19, bottomOffset: 6, fill: '#1e1b4b', stroke: '#0f172a' });
  drawPotionFlask(ctx, -29, -37, '#c084fc', 1.15);
  drawPotionFlask(ctx, -12, -36, '#67e8f9', 1.0);

  const glow = ctx.createRadialGradient(22, -48, 2, 22, -48, 34);
  glow.addColorStop(0, 'rgba(216, 180, 254, 0.65)');
  glow.addColorStop(1, 'rgba(124, 58, 237, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(22, -48, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(18, -54, 9, 6);
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(21, -58, 3, 5);
  drawArcaneBubbles(ctx, time, 6, 22, 46);
  ctx.restore();
}
