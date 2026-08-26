import { FOREST_NIGHT_PALETTE, WORLD_VISUAL_CONTRACT } from '../WorldVisualStyle';

export const CAMP_VISUAL_PALETTE = {
  ...FOREST_NIGHT_PALETTE,
  woodShadow: '#29170f',
  wood: '#5b321b',
  woodLight: '#8b542b',
  woodHighlight: '#c1844c',
  stoneShadow: '#202938',
  stone: '#465362',
  stoneLight: '#7a8994',
  roofShadow: '#321b1c',
  roof: '#71302c',
  roofLight: '#a74631',
  ember: '#f97316',
  flame: '#fde047',
  magic: '#22d3ee',
  magicLight: '#cffafe',
} as const;

export function drawCampWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  time: number,
) {
  const pulse = 0.82 + Math.sin(time / 220 + x * 0.03) * 0.08;
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
  ctx.fillStyle = `rgba(251, 191, 36, ${pulse})`;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = 'rgba(255,251,235,0.58)';
  ctx.fillRect(x + 1, y + 1, Math.max(1, Math.floor(width / 3)), Math.max(1, height - 2));
  ctx.fillStyle = CAMP_VISUAL_PALETTE.woodShadow;
  ctx.fillRect(x + Math.floor(width / 2), y, 1, height);
  ctx.fillRect(x, y + Math.floor(height / 2), width, 1);
}

export function drawPixelSmoke(
  ctx: CanvasRenderingContext2D,
  time: number,
  x: number,
  y: number,
  count: number,
  rise: number,
  maxAlpha = 0.58,
) {
  for (let i = 0; i < count; i++) {
    const progress = (time * 0.0011 + i * 0.29) % 1;
    const drift = Math.sin(time * 0.0025 + i * 1.7) * 4 + progress * 5;
    const puffX = x + drift;
    const puffY = y - progress * rise - i * 2;
    const size = 3 + Math.floor(progress * 4);
    ctx.fillStyle = `rgba(203, 213, 225, ${Math.sin(progress * Math.PI) * maxAlpha})`;
    ctx.fillRect(Math.round(puffX), Math.round(puffY), size, size);
    if (i % 2 === 0) ctx.fillRect(Math.round(puffX - 2), Math.round(puffY + 2), 2, 2);
  }
}

export function drawCampEmbers(
  ctx: CanvasRenderingContext2D,
  time: number,
  x: number,
  y: number,
  count: number,
  spread: number,
) {
  for (let i = 0; i < count; i++) {
    const progress = (time * 0.002 + i * 0.23) % 1;
    const px = x + Math.sin(time * 0.004 + i * 2.1) * spread;
    const py = y - progress * (22 + spread);
    const alpha = Math.sin(progress * Math.PI);
    ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
}

export function drawMagicRipple(
  ctx: CanvasRenderingContext2D,
  time: number,
  x: number,
  y: number,
  width: number,
) {
  const phase = (time * 0.0014) % 1;
  ctx.save();
  ctx.globalAlpha = 0.28 + Math.sin(phase * Math.PI) * 0.3;
  ctx.strokeStyle = CAMP_VISUAL_PALETTE.magicLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, width * (0.24 + phase * 0.28), 3 + phase * 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
