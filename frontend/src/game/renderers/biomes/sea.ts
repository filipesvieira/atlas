import { getOffscreenCanvas } from './canvasCache';

/** Cenário: Vila do Chapolin (Vila do Chaves icônica com o Barril do Chaves, escada para o 72, paredes amarelas e piso de lajotas) */
export function getChapolinBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_chapolin', w, h, (ctx) => {
    // Céu Noturno / Tarde na Vila
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.45);

    // Paredes Amarelas/Beiges e Azuis da Vila do Chaves (Ao fundo)
    const wallY = h * 0.25;
    const wallH = h * 0.35;

    const leftW = Math.round(w * 0.35);
    const midW = Math.round(w * 0.35);
    const rightW = w - leftW - midW;

    // Parede Esquerda (Apartamento do Seu Madruga / Escada)
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, wallY, leftW, wallH);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, wallY + wallH - 12, leftW, 12);

    // Parede Central (Fundo da Vila com portas)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(leftW, wallY + 15, midW, wallH - 15);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(leftW, wallY + wallH - 10, midW, 10);

    // Parede Direita (Apartamento da Dona Florinda)
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(leftW + midW, wallY, rightW, wallH);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(leftW + midW, wallY + wallH - 12, rightW, 12);

    // Portas e Janelas da Vila
    ctx.fillStyle = '#451a03';
    ctx.fillRect(210, wallY + 25, 24, 45);
    ctx.fillRect(300, wallY + 25, 24, 45);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(380, wallY + 15, 35, 55);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(385, wallY + 20, 25, 30);

    // 🪜 ESCADA DA VILA (No canto esquerdo X: 0 a 100, subindo)
    ctx.fillStyle = '#334155';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(0, wallY + wallH - (i * 12), 100 - (i * 14), 12);
    }
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, wallY + wallH + 10);
    ctx.lineTo(95, wallY + 20);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let rx = 20; rx < 90; rx += 18) {
      ctx.beginPath();
      ctx.moveTo(rx, wallY + wallH - (rx * 0.5));
      ctx.lineTo(rx, wallY + wallH - (rx * 0.5) - 25);
      ctx.stroke();
    }

    // Piso de Lajotas de Pedra em Tons Violeta/Cinza
    const patioY = wallY + wallH;
    const patioH = h - patioY;
    const patioGrad = ctx.createLinearGradient(0, patioY, 0, h);
    patioGrad.addColorStop(0, '#94a3b8');
    patioGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = patioGrad;
    ctx.fillRect(0, patioY, w, patioH);

    // Linhas do Pavimento de Lajotas Desregulares
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (let py = patioY; py < h; py += 16) {
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }
    for (let px = 0; px < w; px += 32) {
      ctx.beginPath();
      ctx.moveTo(px, patioY);
      ctx.lineTo(px + 10, h);
      ctx.stroke();
    }

    // 🛢️ O BARRIL DO CHAVES (No centro do pátio X: 220, Y: patioY + 10)
    const barrelX = 225;
    const barrelY = patioY + 8;
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(barrelX + 16, barrelY + 20, 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barrelX + 1, barrelY + 8, 30, 3);
    ctx.fillRect(barrelX, barrelY + 20, 32, 3);
    ctx.fillRect(barrelX + 1, barrelY + 32, 30, 3);
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.ellipse(barrelX + 16, barrelY + 3, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 🚲 TRICICLO VERMELHO DO QUICO
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(290, patioY + 25, 14, 4);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(288, patioY + 30, 4, 0, Math.PI * 2);
    ctx.arc(304, patioY + 30, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(298, patioY + 25);
    ctx.lineTo(298, patioY + 16);
    ctx.stroke();

    // Botijões de Gás e Vasos de Flores na direita
    ctx.fillStyle = '#64748b';
    ctx.fillRect(430, patioY + 5, 12, 22);
    ctx.fillRect(445, patioY + 5, 12, 22);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(410, patioY + 18, 14, 12);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(417, patioY + 14, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}
