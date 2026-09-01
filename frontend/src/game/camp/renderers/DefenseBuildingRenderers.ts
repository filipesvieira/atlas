import { BuildingRenderContext } from '../types';
import {
  drawIsoBox,
  drawIsoFootprint,
  drawIsoPanel,
  drawIsoPanelApron,
  drawIsoPanelGrid,
  drawIsoRoof,
  drawIsoShadow,
  drawIsoWalls,
} from './IsoBuildingPrimitives';

function begin(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  ctx.save();
  ctx.translate(renderCtx.x, renderCtx.y);
  ctx.scale(renderCtx.scale, renderCtx.scale);
}

function end(ctx: CanvasRenderingContext2D) {
  ctx.restore();
}

function effectiveLevel(renderCtx: BuildingRenderContext) {
  return Math.max(0, Math.min(3, renderCtx.level || 0));
}

function fillPolygon(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function pulse(time: number, speed = 0.004, amplitude = 0.18) {
  return 1 - amplitude + Math.sin(time * speed) * amplitude;
}

function drawPixelGlow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number, size = 12) {
  const alpha = 0.34 + Math.sin(time * 0.006 + x) * 0.12;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x - size, y - 2, size * 2, 4);
  ctx.fillRect(x - 2, y - size, 4, size * 2);
  ctx.globalAlpha = Math.min(1, alpha + 0.38);
  ctx.fillRect(x - 3, y - 3, 6, 6);
  ctx.restore();
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, color = '#fbbf24') {
  const flicker = Math.round(Math.sin(time * 0.012 + x * 0.7) * 1.2);
  drawPixelGlow(ctx, x, y - 1, color, time, 7 + flicker);
  ctx.fillStyle = '#292524';
  ctx.fillRect(x - 3, y - 5, 6, 8);
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y - 3, 3, 4);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(x, y - 2, 2, 2);
}

function drawWindowGlow(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, color = '#fbbf24') {
  const alpha = 0.78 + Math.sin(time * 0.004 + x) * 0.16;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, y - 5, 8, 8);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(x - 2, y - 3, 3, 4);
  ctx.restore();
}

function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, color = '#94a3b8') {
  const drift = Math.sin(time * 0.0016) * 3;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = color;
  ctx.fillRect(x + drift - 3, y - 9, 7, 6);
  ctx.globalAlpha = 0.28;
  ctx.fillRect(x + drift + 2, y - 17, 8, 7);
  ctx.fillRect(x + drift - 2, y - 26, 6, 6);
  ctx.restore();
}

function drawRune(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, color = '#c4b5fd') {
  const glow = pulse(time, 0.005, 0.22);
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, y - 1, 9, 2);
  ctx.fillRect(x - 1, y - 4, 3, 9);
  ctx.fillStyle = '#ede9fe';
  ctx.fillRect(x, y - 1, 2, 2);
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, time = 0) {
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 27 - level * 3);
  ctx.stroke();
  ctx.fillStyle = level >= 3 ? '#7c3aed' : level >= 2 ? '#b91c1c' : '#92400e';
  const flutter = Math.round(Math.sin(time * 0.004 + x) * 3);
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 26 - level * 3);
  ctx.lineTo(x + 15 + flutter, y - 22 - level * 3);
  ctx.lineTo(x + 1, y - 15 - level * 3);
  ctx.closePath();
  ctx.fill();
}

function drawTrainingDummy(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x - 2, y - 23, 4, 25);
  ctx.fillRect(x - 10, y - 17, 20, 4);
  ctx.fillStyle = '#a16207';
  ctx.fillRect(x - 6, y - 28, 12, 10);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(x - 8, y - 15, 16, 8);
  ctx.fillStyle = '#57534e';
  ctx.fillRect(x - 8, y + 1, 16, 3);
}

function drawCrossedWeapons(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 8);
  ctx.lineTo(x + 8, y - 8);
  ctx.moveTo(x + 8, y + 8);
  ctx.lineTo(x - 8, y - 8);
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(x - 10, y + 6, 6, 3);
  ctx.fillRect(x + 4, y + 6, 6, 3);
  ctx.restore();
}

function drawVaultWheel(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number) {
  ctx.save();
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 + Math.sin(time * 0.0005) * 0.04;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * (radius + 3), y + Math.sin(angle) * (radius + 3));
    ctx.stroke();
  }
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(x - 3, y - 3, 6, 6);
  ctx.restore();
}

function drawMedicalCross(ctx: CanvasRenderingContext2D, x: number, y: number, size = 4, color = '#dc2626') {
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x - size * 2, y - size * 2, size * 4, size * 4);
  ctx.fillStyle = color;
  ctx.fillRect(x - size / 2, y - size * 1.5, size, size * 3);
  ctx.fillRect(x - size * 1.5, y - size / 2, size * 3, size);
}

function drawRemedyCrate(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  drawIsoBox(ctx, { x, y, width: 16, depth: 13, height: 11, top: '#e7e5e4', left: '#d6d3d1', right: '#a8a29e', edge: '#57534e' });
  drawMedicalCross(ctx, x + 4, y - 7, 2, '#e11d48');
  ctx.save();
  ctx.globalAlpha = 0.32 + Math.sin(time * 0.005) * 0.1;
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(x - 4, y - 16, 8, 2);
  ctx.restore();
}

function drawStrategyTable(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, advanced = false) {
  drawIsoBox(ctx, {
    x,
    y,
    width: advanced ? 34 : 27,
    depth: advanced ? 24 : 20,
    height: 12,
    top: advanced ? '#1d4ed8' : '#d6b77a',
    left: '#78350f',
    right: '#451a03',
    edge: '#1c1917',
  });
  const marker = Math.round(Math.sin(time * 0.0025) * 3);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x - 6 + marker, y - 16, 3, 4);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(x + 4, y - 12 - marker, 3, 3);
  ctx.fillStyle = advanced ? '#67e8f9' : '#334155';
  ctx.fillRect(x - 1, y - 17, 2, 7);
  if (advanced) drawPixelGlow(ctx, x, y - 15, '#38bdf8', time, 10);
}

function drawCommandCrest(ctx: CanvasRenderingContext2D, x: number, y: number, level: number) {
  ctx.fillStyle = level >= 3 ? '#7c3aed' : '#991b1b';
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 7);
  ctx.lineTo(x + 9, y - 7);
  ctx.lineTo(x + 6, y + 5);
  ctx.lineTo(x, y + 11);
  ctx.lineTo(x - 6, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawCrossedWeapons(ctx, x, y + 1);
}

function drawStoneTower(ctx: CanvasRenderingContext2D, height: number, width = 30, accent = '#94a3b8') {
  drawIsoBox(ctx, { width, depth: width * 0.78, height, top: accent, left: '#475569', right: '#334155', edge: '#111827' });
  const crownY = -height;
  for (const x of [-width * 0.3, 0, width * 0.3]) {
    drawIsoBox(ctx, { x, y: crownY - 1, width: 8, depth: 7, height: 8, top: '#cbd5e1', left: '#64748b', right: '#475569', edge: '#111827' });
  }
}

function drawPerimeterGate(ctx: CanvasRenderingContext2D, level: number, time: number) {
  const towerHeight = 42 + level * 8;
  const accent = level >= 3 ? '#c4b5fd' : level >= 2 ? '#cbd5e1' : '#94a3b8';
  const leftTower = { x: -42, y: -21 };
  const rightTower = { x: 42, y: 21 };
  drawIsoShadow(ctx, 116, 56);
  drawIsoFootprint(ctx, 110, 50, '#57534e', '#1c1917');
  for (const tower of [leftTower, rightTower]) {
    ctx.save();
    ctx.translate(tower.x, tower.y);
    drawStoneTower(ctx, towerHeight, 29, accent);
    ctx.restore();
  }

  // A muralha sul corre no vetor (16, 8). A abertura e a grade seguem a
  // mesma diagonal, em vez de usar uma porta frontal quadrada.
  const topY = -towerHeight + 5;
  fillPolygon(ctx, [
    { x: -35, y: topY - 18 }, { x: 35, y: topY + 18 },
    { x: 35, y: topY + 31 }, { x: -35, y: topY - 5 },
  ], level >= 3 ? '#6d28d9' : '#57534e', '#111827');
  fillPolygon(ctx, [
    { x: -29, y: topY - 12 }, { x: 29, y: topY + 12 },
    { x: 29, y: topY + 45 }, { x: -29, y: topY + 21 },
  ], '#111827', '#020617');
  for (let x = -24; x <= 24; x += 8) {
    const y = topY + x * 0.42;
    ctx.strokeStyle = level >= 2 ? '#cbd5e1' : '#a16207';
    ctx.lineWidth = level >= 2 ? 3 : 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 25);
    ctx.stroke();
  }
  if (level >= 2) {
    drawLantern(ctx, -34, topY + 2, time);
    drawLantern(ctx, 34, topY + 30, time);
  }
  if (level >= 3) {
    drawRune(ctx, -12, topY + 3, time);
    drawRune(ctx, 12, topY + 15, time);
    drawPixelGlow(ctx, 0, topY + 9, '#a78bfa', time, 25);
  }
}

export function renderWallPreview(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  const width = 78 + level * 6;
  const depth = 26;
  const height = 18 + level * 7;
  drawIsoShadow(ctx, width + 10, depth + 8);
  drawIsoFootprint(ctx, width, depth, level >= 2 ? '#64748b' : '#57534e', '#1c1917');
  if (level === 0) {
    for (let x = -30; x <= 30; x += 12) {
      drawIsoBox(ctx, { x, width: 7, depth: 7, height: 15, top: '#a16207', left: '#78350f', right: '#451a03', edge: '#292524' });
    }
    end(ctx);
    return;
  }
  drawIsoBox(ctx, {
    width,
    depth,
    height,
    top: level >= 3 ? '#94a3b8' : '#78716c',
    left: level >= 2 ? '#57534e' : '#78350f',
    right: level >= 2 ? '#44403c' : '#451a03',
    edge: '#1c1917',
  });
  for (let x = -width / 2 + 9; x < width / 2; x += 18) {
    drawIsoBox(ctx, { x, y: -height - 1, width: 9, depth: 8, height: 8, top: '#cbd5e1', left: '#64748b', right: '#475569', edge: '#1e293b' });
  }
  if (level >= 3) {
    ctx.fillStyle = 'rgba(167, 139, 250, 0.55)';
    ctx.fillRect(-width / 2 + 5, -height - 7, width - 10, 2);
  }
  end(ctx);
}

export function renderGatePreview(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  if (renderCtx.variant === 'perimeter-south') {
    drawPerimeterGate(ctx, level, renderCtx.time);
    end(ctx);
    return;
  }
  const towerHeight = 42 + level * 8;
  drawIsoShadow(ctx, 104, 48);
  drawIsoFootprint(ctx, 98, 42, '#57534e', '#1c1917');
  drawStoneTower(ctx, towerHeight, 28, level >= 3 ? '#c4b5fd' : '#94a3b8');
  ctx.save();
  ctx.translate(-34, 2);
  drawStoneTower(ctx, towerHeight, 28, level >= 3 ? '#c4b5fd' : '#94a3b8');
  ctx.restore();
  ctx.save();
  ctx.translate(34, 2);
  drawStoneTower(ctx, towerHeight, 28, level >= 3 ? '#c4b5fd' : '#94a3b8');
  ctx.restore();
  drawIsoBox(ctx, { y: -towerHeight + 17, width: 70, depth: 20, height: 15, top: '#78716c', left: '#57534e', right: '#44403c', edge: '#1c1917' });
  const gateTop = -towerHeight + 22;
  fillPolygon(ctx, [
    { x: -20, y: gateTop - 7 }, { x: 20, y: gateTop + 7 },
    { x: 20, y: gateTop + 42 }, { x: -20, y: gateTop + 28 },
  ], '#1c1917', '#111827');
  for (let x = -16; x <= 16; x += 8) {
    const y = gateTop + x * 0.34;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 28);
    ctx.stroke();
  }
  if (level >= 2) {
    drawLantern(ctx, -25, gateTop + 12, renderCtx.time);
    drawLantern(ctx, 25, gateTop + 27, renderCtx.time);
  }
  if (level >= 3) {
    const glow = ctx.createRadialGradient(0, -towerHeight + 12, 1, 0, -towerHeight + 12, 28);
    glow.addColorStop(0, 'rgba(196,181,253,0.55)');
    glow.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-30, -towerHeight - 18, 60, 60);
  }
  end(ctx);
}

export function renderWatchtower(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  const base = 46 + level * 4;
  const height = 52 + level * 18;
  drawIsoShadow(ctx, base + 16, base + 8);
  drawIsoFootprint(ctx, base + 8, base, '#57534e', '#1c1917');
  if (level === 0) {
    for (const x of [-14, 14]) drawIsoBox(ctx, { x, width: 7, depth: 7, height: 30, top: '#a16207', left: '#78350f', right: '#451a03' });
    drawIsoBox(ctx, { y: -26, width: 42, depth: 30, height: 7, top: '#92400e', left: '#713f12', right: '#451a03' });
    end(ctx);
    return;
  }
  drawStoneTower(ctx, height, base - 14, level >= 3 ? '#c4b5fd' : '#94a3b8');
  drawIsoBox(ctx, { y: -height - 8, width: base + 14, depth: base, height: 10, top: '#78350f', left: '#713f12', right: '#451a03' });
  drawBanner(ctx, 8, -height - 15, level, renderCtx.time);
  drawLantern(ctx, 0, -height - 17, renderCtx.time, level >= 3 ? '#c4b5fd' : '#fbbf24');
  if (level >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.12 + pulse(renderCtx.time, 0.002, 0.08) * 0.1;
    fillPolygon(ctx, [{ x: 0, y: -height - 20 }, { x: 52, y: -height - 2 }, { x: 22, y: -height + 20 }], level >= 3 ? '#a78bfa' : '#fef3c7');
    ctx.restore();
  }
  if (level >= 3) drawRune(ctx, 0, -height - 29, renderCtx.time);
  end(ctx);
}

export function renderBarracks(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  const width = 82 + level * 8;
  const depth = 52 + level * 5;
  const wallHeight = 30 + level * 8;
  drawIsoShadow(ctx, width + 12, depth + 12);
  drawIsoFootprint(ctx, width + 6, depth + 6, '#57534e', '#1c1917');
  // Pedra na base e telhado de ardósia afastam o quartel das casas civis.
  drawIsoBox(ctx, { y: 2, width: width + 2, depth: depth + 2, height: 9, top: '#78716c', left: '#57534e', right: '#44403c', edge: '#1c1917' });
  drawIsoWalls(ctx, width, depth, wallHeight, '#7f1d1d', '#5f1717', '#78350f');
  drawIsoRoof(ctx, width, depth, wallHeight, 15 + level * 2, '#334155', '#1e293b', '#475569', '#334155', '#0f172a');
  const door = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.52, size: 22, height: 28, fill: '#292524', stroke: '#cbd5e1' });
  drawIsoPanelGrid(ctx, door, '#94a3b8');
  drawBanner(ctx, -width / 2 - 6, -wallHeight + 7, level, renderCtx.time);
  if (level >= 2) drawBanner(ctx, width / 2 + 5, -wallHeight + 10, level, renderCtx.time + 330);
  drawCrossedWeapons(ctx, -width * 0.16, -wallHeight + 18);
  drawWindowGlow(ctx, width * 0.2, -wallHeight + 24, renderCtx.time, '#fb923c');
  drawTrainingDummy(ctx, -width / 2 - 14, 8);
  if (level >= 2) {
    // Anexo de armas, com silhueta baixa e metálica.
    drawIsoBox(ctx, { x: width / 2 + 10, y: 4, width: 25, depth: 20, height: 25, top: '#64748b', left: '#475569', right: '#334155' });
    drawCrossedWeapons(ctx, width / 2 + 10, -11);
    drawLantern(ctx, width / 2 + 18, -24, renderCtx.time);
  }
  if (level >= 3) {
    drawPixelGlow(ctx, 0, -wallHeight - 11, '#ef4444', renderCtx.time, 15);
    drawCrossedWeapons(ctx, 0, -wallHeight - 11);
  }
  end(ctx);
}

export function renderVault(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  const width = 62 + level * 8;
  const depth = 52 + level * 6;
  const height = 32 + level * 10;
  drawIsoShadow(ctx, width + 12, depth + 12);
  drawIsoFootprint(ctx, width + 9, depth + 9, '#334155', '#0f172a');
  // Bloco baixo, sem telhado residencial, com camadas de pedra e aço.
  drawIsoBox(ctx, { y: 2, width: width + 5, depth: depth + 5, height: 10, top: '#52525b', left: '#3f3f46', right: '#27272a', edge: '#09090b' });
  drawIsoBox(ctx, { width, depth, height, top: level >= 3 ? '#71717a' : '#64748b', left: '#3f4b5c', right: '#273244', edge: '#0f172a' });
  drawIsoBox(ctx, { y: -height - 2, width: width - 12, depth: depth - 12, height: 7, top: '#a1a1aa', left: '#52525b', right: '#3f3f46', edge: '#18181b' });
  const door = drawIsoPanel(ctx, { width, depth, wallHeight: height, side: 'right', position: 0.50, size: 30, height: 31, fill: '#18181b', stroke: '#e4e4e7' });
  const doorCenterX = door.reduce((sum, point) => sum + point.x, 0) / door.length;
  const doorCenterY = door.reduce((sum, point) => sum + point.y, 0) / door.length;
  drawVaultWheel(ctx, doorCenterX, doorCenterY, 8 + level, renderCtx.time);
  drawPixelGlow(ctx, doorCenterX, doorCenterY, '#fbbf24', renderCtx.time, 7);
  if (level >= 2) {
    for (const x of [-width / 2 - 5, width / 2 + 5]) {
      drawIsoBox(ctx, { x, width: 14, depth: 14, height: height + 8, top: '#a1a1aa', left: '#52525b', right: '#3f3f46' });
    }
    drawLantern(ctx, -width / 2 - 6, -height / 2, renderCtx.time, '#fbbf24');
  }
  if (level >= 3) {
    drawRune(ctx, 0, -height - 10, renderCtx.time, '#fbbf24');
    drawRune(ctx, -width / 2 - 6, -height / 2, renderCtx.time);
    drawRune(ctx, width / 2 + 6, -height / 2, renderCtx.time);
  }
  end(ctx);
}

export function renderInfirmary(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  if (level === 0) {
    // Posto de primeiros socorros improvisado: lona, maca e caixa de remédios.
    const width = 56;
    const depth = 42;
    const wallHeight = 11;
    drawIsoShadow(ctx, width + 12, depth + 12);
    drawIsoFootprint(ctx, width + 4, depth + 4, '#78716c', '#334155');
    drawIsoWalls(ctx, width, depth, wallHeight, '#e7e5e4', '#d6d3d1', '#f8fafc', '#78716c');
    drawIsoRoof(ctx, width, depth, wallHeight, 27, '#f1f5f9', '#cbd5e1', '#ffffff', '#e2e8f0', '#64748b');
    const flap = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.54, size: 13, height: 12, fill: '#334155', stroke: '#64748b' });
    drawIsoPanelApron(ctx, flap, 'right', 9, '#cbd5e1', '#64748b', 2);
    drawMedicalCross(ctx, 0, -wallHeight - 18, 4);
    drawRemedyCrate(ctx, -width / 2 - 5, 4, renderCtx.time);
    drawLantern(ctx, width / 2 + 4, -8, renderCtx.time, '#fb7185');
    end(ctx);
    return;
  }

  const width = level === 1 ? 70 : level === 2 ? 84 : 96;
  const depth = level === 1 ? 52 : level === 2 ? 60 : 68;
  const wallHeight = level === 1 ? 34 : level === 2 ? 42 : 50;
  drawIsoShadow(ctx, width + 14, depth + 14);
  drawIsoFootprint(ctx, width + 4, depth + 4, '#cbd5e1', '#475569');
  drawIsoBox(ctx, { y: 2, width: width + 2, depth: depth + 2, height: 7, top: '#e2e8f0', left: '#94a3b8', right: '#64748b', edge: '#334155' });
  drawIsoWalls(ctx, width, depth, wallHeight, '#e7e5e4', '#d6d3d1', '#f8fafc', '#64748b');
  drawIsoRoof(ctx, width, depth, wallHeight, 18 + level * 2, '#0f766e', '#115e59', '#14b8a6', '#0f766e', '#134e4a');

  const door = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.54, size: 17 + level * 2, height: 26 + level * 3, fill: '#334155', stroke: '#f8fafc' });
  drawIsoPanelGrid(ctx, door, '#94a3b8');
  drawIsoPanelApron(ctx, door, 'right', 10 + level * 3, '#e2e8f0', '#64748b', 3);
  drawMedicalCross(ctx, -width * 0.2, -wallHeight + 18, 4 + level);
  drawWindowGlow(ctx, width * 0.2, -wallHeight + 20, renderCtx.time, '#67e8f9');
  drawLantern(ctx, width * 0.34, -wallHeight + 27, renderCtx.time, '#fb7185');
  drawRemedyCrate(ctx, -width / 2 - 7, 5, renderCtx.time);

  if (level >= 2) {
    // Ala lateral visível a partir do nível 2; no nível 3 ela cresce e recebe sinal próprio.
    const wingWidth = level === 2 ? 27 : 36;
    const wingHeight = level === 2 ? 24 : 32;
    drawIsoBox(ctx, { x: width / 2 + 10, y: 2, width: wingWidth, depth: 24, height: wingHeight, top: '#ccfbf1', left: '#e7e5e4', right: '#cbd5e1', edge: '#64748b' });
    drawMedicalCross(ctx, width / 2 + 15, -wingHeight + 8, 3);
  }
  if (level >= 3) {
    // Farol de cura diferencia imediatamente a enfermaria máxima no assentamento.
    drawPixelGlow(ctx, 0, -wallHeight - 24, '#67e8f9', renderCtx.time, 24);
    drawRune(ctx, 0, -wallHeight - 24, renderCtx.time, '#67e8f9');
    drawMedicalCross(ctx, 0, -wallHeight - 7, 6, '#e11d48');
  }
  end(ctx);
}

export function renderPrison(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  const width = 64 + level * 8;
  const depth = 50 + level * 6;
  const height = 34 + level * 9;
  drawIsoShadow(ctx, width + 10, depth + 10);
  drawIsoFootprint(ctx, width, depth, '#44403c', '#1c1917');
  drawIsoBox(ctx, { width, depth, height, top: '#78716c', left: '#44403c', right: '#292524', edge: '#111827' });
  const bars = drawIsoPanel(ctx, { width, depth, wallHeight: height, side: 'right', position: 0.50, size: 22, height: 28, fill: '#111827', stroke: '#94a3b8' });
  drawIsoPanelGrid(ctx, bars, '#cbd5e1');
  drawLantern(ctx, -width * 0.24, -height * 0.42, renderCtx.time, '#fb923c');
  if (level >= 2) {
    ctx.strokeStyle = '#a3a3a3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-width / 2 - 2, -height / 2, 7, 0, Math.PI * 1.7);
    ctx.stroke();
  }
  if (level >= 3) {
    drawRune(ctx, width / 2 + 3, -height * 0.48, renderCtx.time, '#e879f9');
    drawRune(ctx, -width / 2 - 3, -height * 0.48, renderCtx.time, '#e879f9');
  }
  end(ctx);
}

export function renderEngineerWorkshop(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  const width = 86 + level * 7;
  const depth = 52 + level * 5;
  const wallHeight = 28 + level * 7;
  drawIsoShadow(ctx, width + 14, depth + 12);
  drawIsoFootprint(ctx, width, depth, '#57534e', '#1c1917');
  drawIsoWalls(ctx, width, depth, wallHeight, '#713f12', '#451a03', '#92400e');
  drawIsoRoof(ctx, width, depth, wallHeight, 18, '#475569', '#334155', '#64748b', '#475569', '#1e293b');
  drawIsoBox(ctx, { x: width / 2 + 11, y: 1, width: 20, depth: 18, height: 24, top: '#64748b', left: '#475569', right: '#334155' });
  drawWindowGlow(ctx, width * 0.16, -wallHeight + 17, renderCtx.time, '#fb923c');
  drawSmoke(ctx, width / 2 + 12, -wallHeight - 3, renderCtx.time);
  const gearRadius = 12 + level * 2;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-width / 2 + 8, -wallHeight - 8, gearRadius, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + renderCtx.time * 0.00015;
    const x = -width / 2 + 8 + Math.cos(angle) * (gearRadius + 5);
    const y = -wallHeight - 8 + Math.sin(angle) * (gearRadius + 5);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  if (level >= 2) {
    drawLantern(ctx, -width / 2 + 8, -wallHeight - 8, renderCtx.time, '#fb923c');
    for (let index = 0; index < 3; index++) {
      const sparkX = width / 2 - 5 + ((renderCtx.time / 10 + index * 13) % 18);
      const sparkY = -wallHeight - 10 - ((renderCtx.time / 18 + index * 7) % 15);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sparkX, sparkY, 2, 2);
    }
  }
  if (level >= 3) {
    drawRune(ctx, width / 2 + 11, -wallHeight - 16, renderCtx.time, '#67e8f9');
    drawPixelGlow(ctx, width / 2 + 11, -wallHeight - 16, '#38bdf8', renderCtx.time, 14);
  }
  end(ctx);
}

export function renderWarRoom(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);

  if (level === 0) {
    // Tenda de campanha: já comunica planejamento antes de virar edifício.
    const width = 72;
    const depth = 48;
    const wallHeight = 12;
    drawIsoShadow(ctx, width + 14, depth + 12);
    drawIsoFootprint(ctx, width + 4, depth + 4, '#57534e', '#1c1917');
    drawIsoWalls(ctx, width, depth, wallHeight, '#7f1d1d', '#450a0a', '#991b1b');
    drawIsoRoof(ctx, width, depth, wallHeight, 31, '#991b1b', '#7f1d1d', '#b91c1c', '#991b1b', '#450a0a');
    const flap = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.54, size: 17, height: 14, fill: '#1c1917', stroke: '#fbbf24' });
    drawIsoPanelApron(ctx, flap, 'right', 9, '#713f12', '#451a03', 2);
    drawBanner(ctx, -width / 2 - 4, -wallHeight + 5, level, renderCtx.time);
    drawCommandCrest(ctx, 0, -wallHeight - 17, level);
    drawStrategyTable(ctx, -width / 2 - 8, 7, renderCtx.time);
    drawLantern(ctx, width / 2 + 3, -8, renderCtx.time, '#fb923c');
    end(ctx);
    return;
  }

  const width = 90 + level * 8;
  const depth = 56 + level * 5;
  const wallHeight = 34 + level * 8;
  drawIsoShadow(ctx, width + 14, depth + 12);
  drawIsoFootprint(ctx, width + 6, depth + 6, '#57534e', '#1c1917');
  drawIsoBox(ctx, { y: 2, width: width + 3, depth: depth + 3, height: 9, top: '#78716c', left: '#57534e', right: '#44403c', edge: '#1c1917' });
  drawIsoWalls(ctx, width, depth, wallHeight, '#7f1d1d', '#5f1717', '#78350f');
  drawIsoRoof(ctx, width, depth, wallHeight, 20 + level * 2, '#3f3f46', '#27272a', '#57534e', '#3f3f46', '#18181b');

  const door = drawIsoPanel(ctx, { width, depth, wallHeight, side: 'right', position: 0.52, size: 24 + level * 2, height: 30 + level * 3, fill: '#1c1917', stroke: '#fbbf24' });
  drawIsoPanelGrid(ctx, door, '#a8a29e');
  drawIsoPanelApron(ctx, door, 'right', 12 + level * 3, '#57534e', '#292524', 4);
  drawBanner(ctx, -width / 2 - 7, -wallHeight + 2, level, renderCtx.time);
  drawBanner(ctx, width / 2 + 7, -wallHeight + 2, level, renderCtx.time + 320);
  drawCommandCrest(ctx, 0, -wallHeight - 12, level);
  drawWindowGlow(ctx, -width * 0.18, -wallHeight + 16, renderCtx.time, '#fb923c');
  drawLantern(ctx, width * 0.23, -wallHeight + 16, renderCtx.time, '#fb923c');
  drawStrategyTable(ctx, -width / 2 - 10, 8, renderCtx.time, level >= 3);
  if (level >= 2) {
    // Torre de comunicações e braseiro identificam o centro estratégico.
    drawIsoBox(ctx, { x: width / 2 + 10, y: 2, width: 23, depth: 20, height: 32 + level * 5, top: '#64748b', left: '#475569', right: '#334155', edge: '#1e293b' });
    drawBanner(ctx, width / 2 + 10, -35 - level * 5, level, renderCtx.time + 610);
    drawLantern(ctx, width / 2 + 20, -28, renderCtx.time, '#fbbf24');
  }
  if (level >= 3) {
    drawPixelGlow(ctx, 0, -wallHeight - 20, '#a78bfa', renderCtx.time, 22);
    drawRune(ctx, 0, -wallHeight - 20, renderCtx.time);
    for (const offset of [-18, 18]) drawRune(ctx, offset, -wallHeight + 8, renderCtx.time + offset * 20, '#fbbf24');
  }
  end(ctx);
}

export function renderResonator(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const level = effectiveLevel(renderCtx);
  begin(ctx, renderCtx);
  const width = 60 + level * 6;
  const depth = 48 + level * 5;
  drawIsoShadow(ctx, width + 20, depth + 18);
  drawIsoFootprint(ctx, width, depth, '#312e81', '#1e1b4b');
  for (const x of [-22, 22]) {
    drawIsoBox(ctx, { x, width: 14, depth: 12, height: 30 + level * 6, top: '#64748b', left: '#475569', right: '#334155', edge: '#1e293b' });
  }
  drawIsoBox(ctx, { width: 32, depth: 28, height: 18 + level * 5, top: '#7c3aed', left: '#5b21b6', right: '#4c1d95', edge: '#312e81' });
  const pulse = 0.70 + Math.sin(renderCtx.time * 0.004) * 0.16;
  const glow = ctx.createRadialGradient(0, -34 - level * 7, 3, 0, -34 - level * 7, 34 + level * 5);
  glow.addColorStop(0, `rgba(224,231,255,${0.9 * pulse})`);
  glow.addColorStop(0.3, `rgba(167,139,250,${0.55 * pulse})`);
  glow.addColorStop(1, 'rgba(76,29,149,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -34 - level * 7, 34 + level * 5, 0, Math.PI * 2);
  ctx.fill();
  if (level >= 2) {
    const orbit = renderCtx.time * 0.001;
    for (let index = 0; index < 3; index++) {
      const angle = orbit + (Math.PI * 2 * index) / 3;
      const x = Math.cos(angle) * (22 + level * 2);
      const y = -34 - level * 7 + Math.sin(angle) * 9;
      ctx.fillStyle = '#a5f3fc';
      ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
    }
  }
  ctx.save();
  ctx.translate(0, -35 - level * 7);
  ctx.rotate(renderCtx.time * 0.0007);
  ctx.fillStyle = '#ddd6fe';
  ctx.beginPath();
  ctx.moveTo(0, -14 - level * 2);
  ctx.lineTo(10 + level, 0);
  ctx.lineTo(0, 14 + level * 2);
  ctx.lineTo(-10 - level, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (level >= 3) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(renderCtx.time * 0.004) * 0.12;
    ctx.fillStyle = '#c4b5fd';
    ctx.fillRect(-2, -115, 4, 58);
    ctx.fillStyle = '#ede9fe';
    ctx.fillRect(-1, -122, 2, 66);
    ctx.restore();
    drawRune(ctx, -22, -31 - level * 7, renderCtx.time);
    drawRune(ctx, 22, -31 - level * 7, renderCtx.time + 240);
  }
  end(ctx);
}
