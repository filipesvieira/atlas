import { BuildingRenderContext } from '../types';
import {
  drawIsoBox,
  drawIsoFootprint,
  drawIsoRoof,
  drawIsoShadow,
  drawIsoWalls,
} from './IsoBuildingPrimitives';

/** Cozinha de Campanha — níveis 0 a 3 em volume isométrico. */
export function renderKitchen(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time, scale } = renderCtx;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (level === 0) {
    drawIsoShadow(ctx, 58, 42);
    drawIsoFootprint(ctx, 54, 38, '#3f2b1d', '#1c1917');
    drawIsoBox(ctx, { x: -8, y: -3, width: 30, depth: 17, height: 6, top: '#78716c', left: '#57534e', right: '#44403c' });
    drawIsoBox(ctx, { x: 12, y: -8, width: 13, depth: 10, height: 8, top: '#92400e', left: '#78350f', right: '#451a03' });
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(10, -20, 5, 4);
    ctx.restore();
    return;
  }

  const width = level >= 3 ? 102 : level >= 2 ? 88 : 72;
  const depth = level >= 3 ? 68 : level >= 2 ? 56 : 46;
  drawIsoShadow(ctx, width + 10, depth + 10);
  drawIsoFootprint(ctx, width, depth, '#3f2b1d', '#1c1917');
  drawIsoWalls(ctx, width, depth, 6, '#713f12', '#5c2d11', '#92400e');
  if (level >= 2) {
    // A cobertura fica atrás dos volumes de trabalho; desenhá-la depois
    // escondia a cozinha avançada e deixava visível apenas o telhado.
    drawIsoRoof(ctx, width - 4, depth - 4, 7, 24, '#5b3216', '#451a03', '#713f12', '#5c2d11');
  }

  // Bancada e despensa formam dois volumes distintos sobre o mesmo piso.
  drawIsoBox(ctx, { x: -19, y: -8, width: 37, depth: 21, height: 17, top: '#92400e', left: '#713f12', right: '#451a03' });
  drawIsoBox(ctx, { x: 19, y: -5, width: 27, depth: 20, height: 14, top: '#475569', left: '#334155', right: '#1e293b' });
  drawIsoBox(ctx, { x: -21, y: -28, width: 10, depth: 8, height: 7, top: '#facc15', left: '#a16207', right: '#713f12' });
  drawIsoBox(ctx, { x: -8, y: -26, width: 9, depth: 8, height: 6, top: '#22c55e', left: '#15803d', right: '#166534' });

  const flame = Math.sin(time / 95) * 0.18 + 0.82;
  ctx.fillStyle = `rgba(249, 115, 22, ${flame})`;
  ctx.fillRect(16, -15, 14, 6);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(20, -18, 6, 5);

  if (level >= 2) {
    drawIsoBox(ctx, { x: -21, y: -39, width: 26, depth: 12, height: 5, top: '#92400e', left: '#713f12', right: '#451a03' });
    drawIsoBox(ctx, { x: -15, y: -48, width: 8, depth: 8, height: 6, top: '#e7e5e4', left: '#a8a29e', right: '#78716c' });
    drawIsoBox(ctx, { x: -3, y: -47, width: 10, depth: 8, height: 5, top: '#38bdf8', left: '#0284c7', right: '#075985' });
  }

  if (level >= 3) {
    // Forno avançado com chaminé e vapor pixelado.
    drawIsoBox(ctx, { x: 43, y: -7, width: 27, depth: 25, height: 37, top: '#78716c', left: '#57534e', right: '#44403c' });
    drawIsoBox(ctx, { x: 43, y: -43, width: 15, depth: 13, height: 14, top: '#78716c', left: '#57534e', right: '#292524' });
    ctx.fillStyle = `rgba(251, 146, 60, ${flame})`;
    ctx.fillRect(39, -24, 12, 9);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(41, -21, 8, 5);
    ctx.fillStyle = 'rgba(226,232,240,.55)';
    const drift = Math.floor((time / 250) % 3);
    ctx.fillRect(18 + drift, -34, 4, 4);
    ctx.fillRect(21 - drift, -41, 4, 4);
  }

  ctx.restore();
}
