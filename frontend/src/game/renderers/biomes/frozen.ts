import { getOffscreenCanvas } from './canvasCache';

/** Cenário: Santuário de Atenas (Cavaleiros do Zodíaco com Estátua de Atena, Templo Grego de Colunas e Escadarias) */
export function getFrozenBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_frozen', w, h, (ctx) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.5, '#38bdf8');
    skyGrad.addColorStop(1, '#93c5fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(60, 25, 24, 0, Math.PI * 2);
    ctx.arc(90, 20, 30, 0, Math.PI * 2);
    ctx.arc(410, 30, 28, 0, Math.PI * 2);
    ctx.arc(440, 25, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(100, 0);
    ctx.lineTo(160, 0);
    ctx.lineTo(260, h * 0.5);
    ctx.lineTo(200, h * 0.5);
    ctx.fill();

    const athenaX = 250;
    const athenaY = 12;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(athenaX - 55, athenaY + 10, 8, 65);
    ctx.fillRect(athenaX + 47, athenaY + 10, 8, 65);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(athenaX - 57, athenaY + 6, 12, 5);
    ctx.fillRect(athenaX + 45, athenaY + 6, 12, 5);

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(athenaX, athenaY + 15);
    ctx.lineTo(athenaX + 16, athenaY + 70);
    ctx.lineTo(athenaX - 16, athenaY + 70);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(athenaX, athenaY + 15, 6, Math.PI, 0);
    ctx.fillRect(athenaX - 4, athenaY + 8, 8, 6);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(athenaX + 14, athenaY + 42, 10, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(athenaX + 14, athenaY + 42, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const templeY = h * 0.35;
    const templeH = h * 0.35;

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(110, templeY + 22);
    ctx.lineTo(250, templeY - 6);
    ctx.lineTo(390, templeY + 22);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(130, templeY + 20);
    ctx.lineTo(250, templeY);
    ctx.lineTo(370, templeY + 20);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(100, templeY + 22, 300, 10);

    ctx.fillStyle = '#f8fafc';
    for (let cx = 115; cx <= 375; cx += 37) {
      ctx.fillRect(cx, templeY + 32, 12, templeH - 32);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx + 3, templeY + 32, 3, templeH - 32);
      ctx.fillStyle = '#f8fafc';
    }

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(125, templeY + 32, 250, templeH - 32);

    for (let cx = 115; cx <= 375; cx += 37) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx, templeY + 32, 12, templeH - 32);
    }

    const floorY = templeY + templeH;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#cbd5e1');
    floorGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    const stairX = 200;
    const stairW = 100;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(stairX, floorY, stairW, h - floorY);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    for (let sy = floorY; sy < h; sy += 8) {
      ctx.beginPath();
      ctx.moveTo(stairX, sy);
      ctx.lineTo(stairX + stairW, sy);
      ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(stairX - 8, floorY, 8, h - floorY);
    ctx.fillRect(stairX + stairW, floorY, 8, h - floorY);
  });
}