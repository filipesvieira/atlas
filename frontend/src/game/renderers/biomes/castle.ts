import { getOffscreenCanvas } from './canvasCache';

/** Cenário: Escola de Rogartes (Biblioteca de Hogwarts com arcos góticos, vitrais iluminados, estantes de livros e lareira) */
export function getRogartesBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_rogartes', w, h, (ctx) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.6, '#1e1b4b');
    skyGrad.addColorStop(1, '#311042');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.45);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.35);
    ctx.quadraticCurveTo(w * 0.25, 0, w * 0.5, h * 0.35);
    ctx.quadraticCurveTo(w * 0.75, 0, w, h * 0.35);
    ctx.stroke();

    const winX = 215;
    const winY = 15;
    const winW = 70;
    const winH = 85;

    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.moveTo(winX, winY + winH);
    ctx.lineTo(winX, winY + 30);
    ctx.quadraticCurveTo(winX + winW * 0.5, winY - 10, winX + winW, winY + 30);
    ctx.lineTo(winX + winW, winY + winH);
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(winX + 4, winY + winH - 2);
    ctx.lineTo(winX + 4, winY + 32);
    ctx.quadraticCurveTo(winX + winW * 0.5, winY - 5, winX + winW - 4, winY + 32);
    ctx.lineTo(winX + winW - 4, winY + winH - 2);
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(winX + winW * 0.5, winY);
    ctx.lineTo(winX + winW * 0.5, winY + winH);
    ctx.moveTo(winX + 4, winY + 45);
    ctx.lineTo(winX + winW - 4, winY + 45);
    ctx.stroke();

    const wallY = h * 0.35;
    const wallH = h * 0.35;

    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, wallY, w, 12);
    ctx.fillStyle = '#78350f';
    for (let bx = 10; bx < w; bx += 14) {
      ctx.fillRect(bx, wallY - 15, 4, 15);
    }
    ctx.fillRect(0, wallY - 17, w, 3);

    ctx.fillStyle = '#361202';
    ctx.fillRect(0, wallY + 12, w, wallH - 12);

    const bookColors = ['#991b1b', '#15803d', '#ca8a04', '#1d4ed8', '#78350f'];
    for (let y = wallY + 16; y < wallY + wallH - 10; y += 18) {
      ctx.fillStyle = '#290d02';
      ctx.fillRect(0, y + 14, w, 3);

      for (let x = 10; x < w - 20; x += 6) {
        if (x > winX - 20 && x < winX + winW + 10) continue;
        ctx.fillStyle = bookColors[Math.floor((x + y) % bookColors.length)];
        ctx.fillRect(x, y, 5, 14);
      }
    }

    ctx.fillStyle = '#451a03';
    ctx.fillRect(410, wallY + 15, 65, 60);
    ctx.fillStyle = '#1c0a02';
    ctx.beginPath();
    ctx.arc(442, wallY + 50, 20, Math.PI, 0);
    ctx.fillRect(422, wallY + 50, 40, 25);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(442, wallY + 65, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(442, wallY + 67, 7, 0, Math.PI * 2);
    ctx.fill();

    const floorY = wallY + wallH;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#64748b');
    floorGrad.addColorStop(1, '#334155');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (let fx = 0; fx < w; fx += 40) {
      ctx.beginPath();
      ctx.moveTo(fx, floorY);
      ctx.lineTo(fx, h);
      ctx.stroke();
    }

    ctx.fillStyle = '#5c2206';
    ctx.fillRect(180, floorY + 8, 140, 10);
    ctx.fillStyle = '#361202';
    ctx.fillRect(195, floorY + 18, 8, 14);
    ctx.fillRect(297, floorY + 18, 8, 14);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(248, floorY, 4, 8);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(250, floorY - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}
