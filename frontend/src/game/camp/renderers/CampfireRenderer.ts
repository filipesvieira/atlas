import { BuildingRenderContext } from '../types';
import { drawIsoBox, drawIsoFootprint, drawIsoShadow } from './IsoBuildingPrimitives';
import { CAMP_VISUAL_PALETTE, drawCampEmbers, drawPixelSmoke } from '../CampVisualStyle';

function drawCampfireFlame(ctx: CanvasRenderingContext2D, time: number, height: number, radius: number) {
  const flicker = Math.round(Math.sin(time / 80) * 2 + Math.sin(time / 47) * 1.2);
  const glow = ctx.createRadialGradient(0, -height * 0.42, 3, 0, -height * 0.42, radius);
  glow.addColorStop(0, `rgba(249, 115, 22, ${0.48 + Math.sin(time / 95) * 0.12})`);
  glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -height * 0.42, radius, 0, Math.PI * 2);
  ctx.fill();

  // Chama em degraus, e não em triângulos vetoriais. A mesma peça atende
  // fogueiras de acampamento e de expedição sem perder a leitura pixel art.
  const unit = Math.max(2, Math.round(height / 15));
  const baseY = -4;
  ctx.fillStyle = CAMP_VISUAL_PALETTE.ember;
  ctx.fillRect(-4 * unit, baseY - 3 * unit, 8 * unit, 3 * unit);
  ctx.fillRect(-3 * unit, baseY - 6 * unit, 6 * unit, 3 * unit);
  ctx.fillRect(-2 * unit + flicker, baseY - 9 * unit, 4 * unit, 3 * unit);
  ctx.fillRect(-unit + flicker, baseY - 12 * unit, 2 * unit, 3 * unit);

  ctx.fillStyle = CAMP_VISUAL_PALETTE.flame;
  ctx.fillRect(-2 * unit, baseY - 3 * unit, 4 * unit, 3 * unit);
  ctx.fillRect(-unit, baseY - 6 * unit, 3 * unit, 3 * unit);
  ctx.fillRect(-unit + flicker, baseY - 9 * unit, 2 * unit, 3 * unit);

  ctx.fillStyle = '#fff7ed';
  ctx.fillRect(-unit, baseY - 3 * unit, 2 * unit, 3 * unit);
  ctx.fillRect(-unit + flicker, baseY - 6 * unit, unit, 3 * unit);

  // Um lóbulo lateral muda a silhueta a cada frame, visível mesmo no zoom
  // padrão da expedição.
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(-4 * unit - flicker, baseY - 4 * unit, 2 * unit, 2 * unit);
}

/** Fogueira do Acampamento — níveis 0 a 3 alinhados ao terreno isométrico. */
export function renderCampfire(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time, scale } = renderCtx;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (level === 0) {
    drawIsoShadow(ctx, 34, 24);
    drawIsoFootprint(ctx, 30, 22, '#1e293b', '#0f172a');
    drawIsoBox(ctx, { width: 20, depth: 10, height: 3, top: '#292524', left: '#1c1917', right: '#0f172a' });
    drawIsoBox(ctx, { x: -3, y: -5, width: 16, depth: 5, height: 3, top: '#451a03', left: '#292524', right: '#1c1917' });
    ctx.restore();
    return;
  }

  if (level === 1) {
    drawIsoShadow(ctx, 40, 30);
    drawIsoFootprint(ctx, 36, 26, '#475569', '#1e293b');
    const stones = [[-14, 1], [-8, -4], [0, -6], [8, -4], [14, 1], [0, 5]];
    stones.forEach(([stoneX, stoneY]) => drawIsoBox(ctx, { x: stoneX, y: stoneY, width: 7, depth: 5, height: 4, top: '#64748b', left: '#475569', right: '#334155' }));
    drawIsoBox(ctx, { width: 23, depth: 8, height: 4, top: '#78350f', left: '#451a03', right: '#5c2d11' });
    drawCampfireFlame(ctx, time, 22 + Math.sin(time / 100) * 4, 42);
    drawCampEmbers(ctx, time, 0, -6, 4, 8);
    drawPixelSmoke(ctx, time, 0, -21, 5, 28, 0.54);
    ctx.restore();
    return;
  }

  if (level === 2) {
    drawIsoShadow(ctx, 54, 38);
    drawIsoFootprint(ctx, 50, 34, '#64748b', '#1e293b');
    const ring = [[-20, 1], [-15, -5], [-8, -8], [0, -10], [8, -8], [15, -5], [20, 1], [12, 7], [0, 10], [-12, 7]];
    ring.forEach(([stoneX, stoneY]) => drawIsoBox(ctx, { x: stoneX, y: stoneY, width: 7, depth: 5, height: 5, top: '#64748b', left: '#475569', right: '#334155' }));
    drawIsoBox(ctx, { x: -28, y: 2, width: 19, depth: 11, height: 6, top: '#78350f', left: '#451a03', right: '#5c2d11' });
    drawIsoBox(ctx, { width: 28, depth: 10, height: 5, top: '#451a03', left: '#292524', right: '#1c1917' });
    drawCampfireFlame(ctx, time, 30 + Math.sin(time / 90) * 5, 66);
    drawIsoBox(ctx, { x: 0, y: -26, width: 14, depth: 10, height: 8, top: '#475569', left: '#334155', right: '#1e293b' });
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.lineTo(0, -34);
    ctx.lineTo(17, 0);
    ctx.stroke();
    drawCampEmbers(ctx, time, 0, -10, 6, 13);
    ctx.restore();
    return;
  }

  drawIsoShadow(ctx, 66, 44);
  drawIsoFootprint(ctx, 62, 40, '#64748b', '#1e293b');
  drawIsoBox(ctx, { width: 54, depth: 30, height: 8, top: '#475569', left: '#334155', right: '#1e293b' });
  drawIsoBox(ctx, { width: 34, depth: 16, height: 6, top: '#7c2d12', left: '#451a03', right: '#5c2d11' });
  drawCampfireFlame(ctx, time, 46 + Math.sin(time / 80) * 7, 92);
  ctx.fillStyle = '#fde047';
  for (let i = 0; i < 5; i++) {
    const sparkProgress = (time * 0.002 + i * 0.22) % 1;
    const sparkX = Math.sin(time * 0.005 + i * 2) * 14;
    const sparkY = -12 - sparkProgress * 68;
    ctx.fillStyle = `rgba(253, 224, 71, ${Math.sin(sparkProgress * Math.PI)})`;
    ctx.fillRect(sparkX, sparkY, 2, 2);
  }
  drawPixelSmoke(ctx, time, 0, -48, 5, 34);
  ctx.restore();
}