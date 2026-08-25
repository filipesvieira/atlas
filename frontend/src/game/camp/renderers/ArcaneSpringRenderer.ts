import { BuildingRenderContext } from '../types';
import { drawIsoBox, drawIsoFootprint, drawIsoShadow } from './IsoBuildingPrimitives';

function drawWaterSurface(ctx: CanvasRenderingContext2D, width: number, depth: number, y: number, color: string) {
  ctx.save();
  ctx.translate(0, y);
  drawIsoFootprint(ctx, width, depth, color, '#0c4a6e');
  ctx.restore();
}

function drawManaParticles(ctx: CanvasRenderingContext2D, time: number, count: number, spread: number, rise: number) {
  for (let i = 0; i < count; i++) {
    const particleProgress = (time * 0.0015 + i * 0.33) % 1;
    const px = Math.sin(time * 0.004 + i) * spread;
    const py = -rise * 0.2 - particleProgress * rise;
    const alpha = Math.sin(particleProgress * Math.PI);
    ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
    ctx.fillRect(px, py, 2, 2);
  }
}

/** Fonte Arcana — níveis 0 a 3 alinhados ao terreno isométrico. */
export function renderArcaneSpring(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time, scale } = renderCtx;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (level === 0) {
    drawIsoShadow(ctx, 36, 26);
    drawIsoFootprint(ctx, 32, 22, '#0f172a', '#172554');
    drawWaterSurface(ctx, 22, 14, -2, 'rgba(56, 189, 248, 0.25)');
    ctx.restore();
    return;
  }

  if (level === 1) {
    drawIsoShadow(ctx, 44, 32);
    drawIsoFootprint(ctx, 40, 28, '#1e293b', '#0c4a6e');
    drawWaterSurface(ctx, 32, 21, -4, '#0284c7');
    const stones = [[-16, 1], [-9, -5], [0, -7], [9, -5], [16, 1]];
    stones.forEach(([stoneX, stoneY]) => drawIsoBox(ctx, { x: stoneX, y: stoneY, width: 7, depth: 5, height: 4, top: '#64748b', left: '#475569', right: '#334155' }));
    const glow = ctx.createRadialGradient(0, -7, 2, 0, -7, 28);
    glow.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
    glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -7, 28, 0, Math.PI * 2);
    ctx.fill();
    drawManaParticles(ctx, time, 3, 10, 18);
    ctx.restore();
    return;
  }

  if (level === 2) {
    drawIsoShadow(ctx, 58, 40);
    drawIsoFootprint(ctx, 54, 36, '#334155', '#1e293b');
    drawIsoBox(ctx, { width: 48, depth: 30, height: 9, top: '#475569', left: '#334155', right: '#1e293b' });
    drawWaterSurface(ctx, 38, 23, -10, '#0284c7');
    drawIsoBox(ctx, { x: -24, y: -4, width: 8, depth: 8, height: 26, top: '#475569', left: '#334155', right: '#1e293b' });
    drawIsoBox(ctx, { x: 24, y: -4, width: 8, depth: 8, height: 26, top: '#475569', left: '#334155', right: '#1e293b' });
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-23, -24, 4, 3);
    ctx.fillRect(21, -24, 4, 3);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.fillRect(-26, -34, 52, 3);
    drawManaParticles(ctx, time, 4, 14, 26);
    ctx.restore();
    return;
  }

  drawIsoShadow(ctx, 72, 48);
  drawIsoFootprint(ctx, 68, 42, '#1e1b4b', '#312e81');
  drawIsoBox(ctx, { width: 62, depth: 36, height: 10, top: '#312e81', left: '#1e1b4b', right: '#172554' });
  drawWaterSurface(ctx, 44, 25, -11, '#0284c7');

  // Obeliscos e feixe continuam animados, mas agora partem de uma base em
  // losango e ocupam as laterais do santuário, em vez de uma faixa frontal.
  const obeliskFloatLeft = Math.sin(time / 200) * 3;
  const obeliskFloatRight = Math.cos(time / 200) * 3;
  drawIsoBox(ctx, { x: -28, y: -7 + obeliskFloatLeft, width: 9, depth: 9, height: 29, top: '#475569', left: '#334155', right: '#1e293b' });
  drawIsoBox(ctx, { x: 28, y: -7 + obeliskFloatRight, width: 9, depth: 9, height: 29, top: '#475569', left: '#334155', right: '#1e293b' });
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-30, -29 + obeliskFloatLeft, 4, 3);
  ctx.fillRect(26, -29 + obeliskFloatRight, 4, 3);

  const crystalFloat = Math.sin(time / 250) * 4;
  const crystalY = -43 + crystalFloat;
  const glow = ctx.createRadialGradient(0, crystalY, 5, 0, crystalY, 68);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.58)');
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, crystalY, 68, 0, Math.PI * 2);
  ctx.fill();

  const beam = ctx.createLinearGradient(0, -76, 0, -16);
  beam.addColorStop(0, 'rgba(56, 189, 248, 0)');
  beam.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
  beam.addColorStop(1, 'rgba(125, 211, 252, 0.8)');
  ctx.fillStyle = beam;
  ctx.fillRect(-6, -76, 12, 58);

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(0, crystalY - 13);
  ctx.lineTo(9, crystalY);
  ctx.lineTo(0, crystalY + 13);
  ctx.lineTo(-9, crystalY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.moveTo(0, crystalY - 8);
  ctx.lineTo(4, crystalY);
  ctx.lineTo(0, crystalY + 8);
  ctx.lineTo(-4, crystalY);
  ctx.closePath();
  ctx.fill();
  drawManaParticles(ctx, time, 5, 18, 44);
  ctx.restore();
}
