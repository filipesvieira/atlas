import { getOffscreenCanvas } from './canvasCache';

/** Cenário: Esgotos Tartaruga (Tijolos marrons clássicos do Arcade, tubo circular de esgoto e canal de água roxa/índigo) */
export function getEsgotosBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_esgotos', w, h, (ctx) => {
    const wallH = h * 0.62;
    const wallGrad = ctx.createLinearGradient(0, 0, 0, wallH);
    wallGrad.addColorStop(0, '#5c2206');
    wallGrad.addColorStop(0.5, '#78350f');
    wallGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, wallH);

    ctx.strokeStyle = '#290d02';
    ctx.lineWidth = 1.5;
    for (let y = 0; y < wallH; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      const offset = (Math.floor(y / 14) % 2) * 16;
      for (let x = offset; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 14);
        ctx.stroke();
      }
    }

    const pipeX = 70;
    const pipeY = wallH * 0.5;
    const pipeR = 26;

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(pipeX, pipeY, pipeR + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#290d02';
    ctx.beginPath();
    ctx.arc(pipeX, pipeY, pipeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(pipeX, pipeY, pipeR - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.fillRect(450, 0, 8, wallH);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(447, 20, 14, 6);
    ctx.fillRect(447, 80, 14, 6);

    const canalY = wallH;
    const canalH = h - canalY;
    const canalGrad = ctx.createLinearGradient(0, canalY, 0, h);
    canalGrad.addColorStop(0, '#311042');
    canalGrad.addColorStop(0.5, '#581c87');
    canalGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = canalGrad;
    ctx.fillRect(0, canalY, w, canalH);

    ctx.fillStyle = '#a855f7';
    for (let rx = 20; rx < w; rx += 60) {
      ctx.fillRect(rx, canalY + 12, 28, 2);
      ctx.fillRect(rx + 15, canalY + 28, 35, 2);
      ctx.fillRect(rx - 10, canalY + 45, 24, 2);
    }
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(120, canalY + 20, 40, 2);
    ctx.fillRect(320, canalY + 35, 50, 2);
  });
}

/** Cenário: Planalto Central (Brasília - Congresso Nacional, Cúpulas, Rampa e Espelho d'Água) */
export function getPlanaltoBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_planalto', w, h, (ctx) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.5, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.6);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const drawCloud = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.8, cy - r * 0.3, r * 0.75, 0, Math.PI * 2);
      ctx.arc(cx + r * 1.5, cy, r * 0.85, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.7, cy + r * 0.1, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCloud(60, 45, 22);
    drawCloud(190, 35, 28);
    drawCloud(340, 40, 25);
    drawCloud(460, 50, 20);

    const towerW = 20;
    const towerH = 110;
    const towerX1 = w * 0.41;
    const towerX2 = towerX1 + towerW + 8;
    const towerY = h * 0.14;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
    ctx.fillRect(towerX1 - 2, towerY, towerW * 2 + 12, towerH);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(towerX1, towerY, towerW, towerH);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(towerX1 + towerW - 3, towerY, 3, towerH);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(towerX2, towerY, towerW, towerH);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(towerX2 + towerW - 3, towerY, 3, towerH);

    ctx.fillStyle = '#475569';
    for (let y = towerY + 6; y < towerY + towerH - 6; y += 7) {
      ctx.fillRect(towerX1 + 3, y, towerW - 6, 2.5);
      ctx.fillRect(towerX2 + 3, y, towerW - 6, 2.5);
    }

    ctx.fillStyle = '#64748b';
    ctx.fillRect(towerX1 + towerW, towerY + towerH * 0.45, 8, 14);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(towerX1 + towerW + 1, towerY + towerH * 0.45 + 3, 6, 8);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(towerX2 + 18, towerY + towerH);
    ctx.lineTo(towerX2 + 18, towerY + 15);
    ctx.stroke();

    ctx.fillStyle = '#16a34a';
    ctx.fillRect(towerX2 + 18, towerY + 15, 16, 10);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(towerX2 + 26, towerY + 16);
    ctx.lineTo(towerX2 + 32, towerY + 20);
    ctx.lineTo(towerX2 + 26, towerY + 24);
    ctx.lineTo(towerX2 + 20, towerY + 20);
    ctx.fill();

    const baseW = w * 0.88;
    const baseX = (w - baseW) / 2;
    const baseY = h * 0.52;
    const baseH = 22;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(baseX, baseY, baseW, baseH);
    ctx.fillStyle = '#1e293b';
    for (let gx = baseX + 8; gx < baseX + baseW - 8; gx += 10) {
      ctx.fillRect(gx, baseY + 6, 7, baseH - 8);
    }

    const cupola1X = w * 0.22;
    const cupola1Y = baseY;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cupola1X, cupola1Y + 2, 42, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const cupola2X = w * 0.76;
    const cupola2Y = baseY + 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cupola2X, cupola2Y, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cupola2X - 52, cupola2Y);
    ctx.quadraticCurveTo(cupola2X, cupola2Y + 24, cupola2X + 52, cupola2Y);
    ctx.lineTo(cupola2X + 32, cupola2Y + 12);
    ctx.quadraticCurveTo(cupola2X, cupola2Y + 28, cupola2X - 32, cupola2Y + 12);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(w * 0.44, baseY + baseH);
    ctx.lineTo(w * 0.34, h * 0.72);
    ctx.lineTo(w * 0.42, h * 0.72);
    ctx.lineTo(w * 0.50, baseY + baseH);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    const waterGrad = ctx.createLinearGradient(0, h * 0.60, 0, h * 0.74);
    waterGrad.addColorStop(0, '#0284c7');
    waterGrad.addColorStop(0.5, '#38bdf8');
    waterGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(baseX + 10, h * 0.62, baseW - 20, 20);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(towerX1 + 4, h * 0.62, towerW * 2 + 2, 18);
    for (let r = h * 0.64; r < h * 0.80; r += 5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(baseX + 30, r);
      ctx.lineTo(baseX + baseW - 30, r);
      ctx.stroke();
    }

    const lawnGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
    lawnGrad.addColorStop(0, '#22c55e');
    lawnGrad.addColorStop(0.3, '#16a34a');
    lawnGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = lawnGrad;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
    for (let lx = 0; lx < w; lx += 40) {
      ctx.fillRect(lx, h * 0.72, 20, h * 0.28);
    }
  });
}
