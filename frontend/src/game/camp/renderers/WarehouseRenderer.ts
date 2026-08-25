import { BuildingRenderContext } from '../types';
import {
  drawIsoBox,
  drawIsoFootprint,
  drawIsoPanel,
  drawIsoPanelGrid,
  drawIsoRoof,
  drawIsoShadow,
  drawIsoWalls,
} from './IsoBuildingPrimitives';

/** Armazém de Recursos — níveis 0 a 3 em volume isométrico. */
export function renderWarehouse(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, scale } = renderCtx;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (level === 0) {
    // Nível 0: depósito improvisado, mas já reconhecível como construção.
    // A versão anterior era composta por dois blocos sob um telhado plano e
    // acabava parecendo uma placa escura vista de cima.
    const width = 50;
    const depth = 38;
    const wallHeight = 17;
    drawIsoShadow(ctx, width + 12, depth + 12);
    drawIsoFootprint(ctx, width + 4, depth + 4, '#64748b', '#1e293b');
    drawIsoWalls(ctx, width, depth, wallHeight, '#78350f', '#451a03', '#92400e');
    drawIsoRoof(ctx, width, depth, wallHeight, 15, '#475569', '#1e293b', '#64748b', '#334155');

    // Porta frontal e ferrolho: elementos simples ajudam a comunicar que é
    // um edifício de armazenamento, mesmo antes do primeiro upgrade.
    const gate = drawIsoPanel(ctx, {
      width,
      depth,
      wallHeight,
      side: 'right',
      position: 0.54,
      size: 12,
      height: 15,
      fill: '#292524',
      stroke: '#0f172a',
    });
    drawIsoPanelGrid(ctx, gate, '#57534e');
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(gate[1].x - 2, gate[1].y - 8, 3, 3);

    // Caixas externas e um pequeno reforço metálico diferenciam o depósito
    // dos demais prédios iniciais sem introduzir uma nova arte rasterizada.
    drawIsoBox(ctx, { x: -width / 2 - 6, y: 2, width: 12, depth: 11, height: 10, top: '#a16207', left: '#78350f', right: '#451a03' });
    drawIsoBox(ctx, { x: width / 2 + 5, y: 3, width: 10, depth: 10, height: 8, top: '#92400e', left: '#78350f', right: '#451a03' });
    drawIsoBox(ctx, { x: 0, y: -wallHeight - 1, width: 7, depth: 5, height: 3, top: '#94a3b8', left: '#64748b', right: '#334155' });
    ctx.restore();
    return;
  }

  if (level === 1) {
    const width = 58;
    const depth = 48;
    const wallHeight = 33;
    drawIsoShadow(ctx, width + 8, depth + 8);
    drawIsoFootprint(ctx, width, depth, '#475569', '#1e293b');
    drawIsoWalls(ctx, width, depth, wallHeight, '#5c2d11', '#451a03', '#78350f');
    drawIsoRoof(ctx, width, depth, wallHeight, 20, '#78350f', '#5c2d11', '#713f12', '#451a03');
    const gate = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.52, size: 16, height: 23, fill: '#1c1917', stroke: '#0f172a' });
    drawIsoPanelGrid(ctx, gate, '#475569');
    drawIsoBox(ctx, { x: -width / 2 - 8, y: 2, width: 12, depth: 12, height: 16, top: '#92400e', left: '#78350f', right: '#451a03' });
    ctx.restore();
    return;
  }

  if (level === 2) {
    const width = 78;
    const depth = 62;
    const wallHeight = 43;
    drawIsoShadow(ctx, width + 10, depth + 10);
    drawIsoFootprint(ctx, width, depth, '#64748b', '#1e293b');
    drawIsoWalls(ctx, width, depth, wallHeight, '#451a03', '#3b1d11', '#78350f');
    drawIsoRoof(ctx, width, depth, wallHeight, 25, '#92400e', '#78350f', '#713f12', '#5c2d11');
    const gate = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.5, size: 23, height: 30, fill: '#1c1917', stroke: '#0f172a' });
    drawIsoPanelGrid(ctx, gate, '#64748b');
    drawIsoBox(ctx, { x: -width / 2 - 9, y: 1, width: 15, depth: 14, height: 21, top: '#92400e', left: '#78350f', right: '#451a03' });
    drawIsoBox(ctx, { x: width / 2 + 7, y: 3, width: 13, depth: 13, height: 18, top: '#64748b', left: '#475569', right: '#334155' });
    ctx.restore();
    return;
  }

  const width = 96;
  const depth = 76;
  const wallHeight = 53;
  drawIsoShadow(ctx, width + 12, depth + 12);
  drawIsoFootprint(ctx, width, depth, '#64748b', '#1e293b');
  drawIsoWalls(ctx, width, depth, wallHeight, '#3b1d11', '#291807', '#7c2d12');
  drawIsoRoof(ctx, width, depth, wallHeight, 30, '#9f1239', '#7f1d1d', '#7c2d12', '#5c1f16');
  const gate = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.5, size: 29, height: 37, fill: '#1c1917', stroke: '#0f172a' });
  drawIsoPanelGrid(ctx, gate, '#64748b');

  // Guincho e fardo, com a caixa suspensa seguindo a mesma perspectiva.
  drawIsoBox(ctx, { x: 29, y: -wallHeight - 6, width: 13, depth: 12, height: 7, top: '#92400e', left: '#78350f', right: '#451a03' });
  drawIsoBox(ctx, { x: 34, y: -wallHeight + 17, width: 12, depth: 10, height: 11, top: '#d97706', left: '#92400e', right: '#78350f' });
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(34, -wallHeight - 3);
  ctx.lineTo(34, -wallHeight + 17);
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, -wallHeight - 10, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-2, -wallHeight - 12, 4, 4);
  drawIsoBox(ctx, { x: -width / 2 - 10, y: -1, width: 14, depth: 13, height: 22, top: '#334155', left: '#475569', right: '#1e293b' });
  drawIsoBox(ctx, { x: width / 2 + 8, y: 1, width: 15, depth: 14, height: 18, top: '#92400e', left: '#78350f', right: '#451a03' });
  ctx.restore();
}
