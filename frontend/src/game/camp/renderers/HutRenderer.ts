import { BuildingRenderContext } from '../types';
import {
  drawIsoBox,
  drawIsoFootprint,
  drawIsoPanel,
  drawIsoPanelApron,
  drawIsoPanelGrid,
  drawIsoRoof,
  drawIsoShadow,
  drawIsoGroundPost,
  drawIsoWalls,
} from './IsoBuildingPrimitives';

/** Cabana do Aventureiro — níveis 0 a 3 em volume isométrico. */
export function renderHut(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time, scale } = renderCtx;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (level === 0) {
    drawIsoShadow(ctx, 38, 28);
    drawIsoFootprint(ctx, 36, 26, '#334155', '#0f172a');
    drawIsoBox(ctx, { x: -3, y: -1, width: 27, depth: 13, height: 4, top: '#64748b', left: '#475569', right: '#334155' });
    drawIsoBox(ctx, { x: 12, y: -5, width: 10, depth: 8, height: 13, top: '#92400e', left: '#78350f', right: '#451a03' });
    ctx.restore();
    return;
  }

  if (level === 1) {
    const width = 62;
    const depth = 46;
    drawIsoShadow(ctx, width + 8, depth + 8);
    drawIsoFootprint(ctx, width, depth, '#6b4f35', '#292018');
    drawIsoWalls(ctx, width - 8, depth - 8, 13, '#8b5a2b', '#6b3f22', '#a16207');
    drawIsoRoof(ctx, width - 10, depth - 10, 13, 28, '#9a3412', '#7c2d12', '#b45309', '#78350f');
    const door = drawIsoPanel(ctx, { width: width - 8, depth: depth - 8, wallHeight: 13, side: 'right', position: 0.52, size: 13, height: 15, fill: '#292524', stroke: '#0f172a' });
    drawIsoPanelApron(ctx, door, 'right', 13, '#a16207', '#451a03', 3);
    const lamp = Math.sin(time / 150) * 0.15 + 0.85;
    ctx.fillStyle = `rgba(251, 191, 36, ${lamp})`;
    ctx.fillRect(8, -22, 6, 7);
    ctx.restore();
    return;
  }

  if (level === 2) {
    const width = 112;
    const depth = 78;
    const wallHeight = 43;
    drawIsoShadow(ctx, width + 10, depth + 10);
    drawIsoFootprint(ctx, width, depth, '#78716c', '#292524');
    drawIsoWalls(ctx, width, depth, wallHeight, '#8b5a2b', '#6b3f22', '#a16207');
    drawIsoRoof(ctx, width, depth, wallHeight, 34, '#9a3412', '#7c2d12', '#b45309', '#78350f');

    const door = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.52, size: 19, height: 29, fill: '#1c1917', stroke: '#0f172a' });
    drawIsoPanelGrid(ctx, door, '#451a03');
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(door[1].x - 2, door[1].y - 15, 3, 3);

    const windowLeft = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'left', position: 0.42, size: 17, height: 16, bottomOffset: 11, fill: `rgba(251, 191, 36, ${0.86 + Math.sin(time / 220) * 0.08})`, stroke: '#78350f' });
    drawIsoPanelGrid(ctx, windowLeft);
    const windowRight = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.8, size: 15, height: 15, bottomOffset: 11, fill: `rgba(251, 191, 36, ${0.82 + Math.sin(time / 260) * 0.08})`, stroke: '#78350f' });
    drawIsoPanelGrid(ctx, windowRight);

    // Patamar e banco acompanham exatamente a diagonal da parede frontal.
    drawIsoPanelApron(ctx, door, 'right', 19, '#a16207', '#451a03', 4);
    drawIsoBox(ctx, { x: 30, y: 18, width: 15, depth: 7, height: 7, top: '#b45309', left: '#78350f', right: '#5c2d11' });
    ctx.restore();
    return;
  }

  // Nível 3: chalé de dois volumes, fundação de pedra, chaminé e estandarte.
  const width = 132;
  const depth = 90;
  const wallHeight = 52;
  drawIsoShadow(ctx, width + 12, depth + 12);
  drawIsoFootprint(ctx, width, depth, '#78716c', '#292524');
  drawIsoWalls(ctx, width, depth, wallHeight, '#8b5a2b', '#5c351d', '#a16207');
  drawIsoRoof(ctx, width, depth, wallHeight, 42, '#9f1239', '#7f1d1d', '#9a3412', '#7c2d12');

  const door = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.5, size: 22, height: 37, fill: '#1c1917', stroke: '#0f172a' });
  drawIsoPanelGrid(ctx, door, '#451a03');
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(door[1].x - 2, door[1].y - 19, 4, 4);

  const upperWindow = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'left', position: 0.35, size: 20, height: 20, bottomOffset: 16, fill: `rgba(251, 191, 36, ${0.9 + Math.sin(time / 180) * 0.06})`, stroke: '#5c2d11' });
  drawIsoPanelGrid(ctx, upperWindow);
  const sideWindow = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.82, size: 19, height: 18, bottomOffset: 16, fill: `rgba(251, 191, 36, ${0.88 + Math.sin(time / 200) * 0.06})`, stroke: '#5c2d11' });
  drawIsoPanelGrid(ctx, sideWindow);

  drawIsoPanelApron(ctx, door, 'right', 23, '#a16207', '#451a03', 4);
  drawIsoBox(ctx, { x: 35, y: 22, width: 18, depth: 8, height: 8, top: '#b45309', left: '#78350f', right: '#5c2d11' });

  const chimneyX = 35;
  const chimneyY = -wallHeight - 24;
  drawIsoBox(ctx, { x: chimneyX, y: chimneyY, width: 14, depth: 12, height: 30, top: '#64748b', left: '#475569', right: '#334155' });
  ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
  for (let i = 0; i < 4; i++) {
    const smokeProgress = (time * 0.0012 + i * 0.35) % 1;
    const smokeX = chimneyX + 6 + Math.sin(time * 0.003 + i) * 5 + smokeProgress * 6;
    const smokeY = chimneyY - 30 - smokeProgress * 24;
    ctx.beginPath();
    ctx.arc(smokeX, smokeY, 4 + smokeProgress * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawIsoGroundPost(ctx, -2, -wallHeight - 34, 28, 3, '#cbd5e1');
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(0, -wallHeight - 58);
  ctx.lineTo(18, -wallHeight - 51);
  ctx.lineTo(0, -wallHeight - 44);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
