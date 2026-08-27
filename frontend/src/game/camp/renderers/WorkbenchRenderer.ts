import { BuildingRenderContext } from '../types';
import {
  drawIsoBox,
  drawIsoFootprint,
  drawIsoShadow,
  drawIsoWalls,
} from './IsoBuildingPrimitives';

/** Bancada de Desmontagem — níveis 0 a 3 em volume isométrico. */
export function renderWorkbench(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time, scale } = renderCtx;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (level === 0) {
    drawIsoShadow(ctx, 38, 28);
    drawIsoFootprint(ctx, 36, 26, '#334155', '#0f172a');
    drawIsoBox(ctx, { width: 28, depth: 16, height: 7, top: '#78350f', left: '#451a03', right: '#5c2d11' });
    drawIsoBox(ctx, { x: -7, y: -8, width: 10, depth: 7, height: 5, top: '#64748b', left: '#475569', right: '#334155' });
    ctx.restore();
    return;
  }

  if (level === 1) {
    const width = 52;
    const depth = 38;
    drawIsoShadow(ctx, width + 8, depth + 8);
    drawIsoFootprint(ctx, width, depth, '#475569', '#1e293b');
    drawIsoWalls(ctx, width, depth, 7, '#5c2d11', '#451a03', '#78350f');
    drawIsoBox(ctx, { x: -9, y: -9, width: 25, depth: 13, height: 12, top: '#92400e', left: '#78350f', right: '#451a03' });
    drawIsoBox(ctx, { x: 12, y: -5, width: 10, depth: 10, height: 9, top: '#64748b', left: '#475569', right: '#1e293b' });
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(9, -24, 4, 2);
    ctx.restore();
    return;
  }

  if (level === 2) {
    const width = 70;
    const depth = 50;
    const wallHeight = 8;
    drawIsoShadow(ctx, width + 10, depth + 10);
    drawIsoFootprint(ctx, width, depth, '#475569', '#1e293b');
    drawIsoWalls(ctx, width, depth, wallHeight, '#451a03', '#3b1d11', '#78350f');
    drawIsoBox(ctx, { x: -17, y: -9, width: 28, depth: 18, height: 23, top: '#78350f', left: '#5c2d11', right: '#451a03' });
    drawIsoBox(ctx, { x: 16, y: -2, width: 20, depth: 18, height: 12, top: '#475569', left: '#1e293b', right: '#0f172a' });
    drawIsoBox(ctx, { x: 34, y: 1, width: 15, depth: 15, height: 21, top: '#64748b', left: '#475569', right: '#334155' });
    const emberGlow = Math.sin(time / 120) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(234, 88, 12, ${emberGlow})`;
    ctx.fillRect(31, -14, 8, 6);
    ctx.restore();
    return;
  }

  const width = 86;
  const depth = 62;
  const wallHeight = 10;
  drawIsoShadow(ctx, width + 12, depth + 12);
  drawIsoFootprint(ctx, width, depth, '#64748b', '#1e293b');
  drawIsoWalls(ctx, width, depth, wallHeight, '#334155', '#1e293b', '#475569');

  // Oficina avançada com forno à direita, bancada, bigorna e roda de afiar.
  drawIsoBox(ctx, { x: 23, y: -7, width: 25, depth: 23, height: 34, top: '#475569', left: '#334155', right: '#1e293b' });
  drawIsoBox(ctx, { x: 23, y: -39, width: 15, depth: 13, height: 11, top: '#1e293b', left: '#334155', right: '#0f172a' });
  const furnaceGlow = Math.sin(time / 90) * 0.15 + 0.85;
  ctx.fillStyle = `rgba(249, 115, 22, ${furnaceGlow})`;
  ctx.fillRect(20, -24, 14, 11);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(22, -20, 10, 5);

  drawIsoBox(ctx, { x: -15, y: -10, width: 31, depth: 18, height: 23, top: '#1e293b', left: '#0f172a', right: '#111827' });
  drawIsoBox(ctx, { x: -28, y: -3, width: 24, depth: 17, height: 8, top: '#78350f', left: '#451a03', right: '#5c2d11' });
  drawIsoBox(ctx, { x: -26, y: -17, width: 12, depth: 11, height: 10, top: '#94a3b8', left: '#64748b', right: '#475569' });
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-27, -8, 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#fde047';
  for (let i = 0; i < 4; i++) {
    const sparkProgress = (time * 0.003 + i * 0.25) % 1;
    const sparkX = -2 + Math.cos(time * 0.01 + i * 2) * 12;
    const sparkY = -25 - sparkProgress * 16;
    ctx.fillStyle = `rgba(253, 224, 71, ${Math.sin(sparkProgress * Math.PI)})`;
    ctx.fillRect(sparkX, sparkY, 2, 2);
  }
  ctx.restore();
}