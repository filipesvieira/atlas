import { getOffscreenCanvas } from './canvasCache';

/** Cenário: Caverna do Dragão Perdido (Portal Vórtice Dimensional e Entrada de Cabeça de Dragão Verde com Trilhos) */
export function getAbyssBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_abyss', w, h, (ctx) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    skyGrad.addColorStop(0, '#831843');
    skyGrad.addColorStop(0.5, '#db2777');
    skyGrad.addColorStop(1, '#fb7185');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.55);

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(320, h * 0.5);
    ctx.lineTo(370, h * 0.22);
    ctx.lineTo(440, h * 0.5);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(410, h * 0.24, 18, 50);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(418, h * 0.20, 10, 6);

    const vortexX = 140;
    const vortexY = h * 0.28;

    ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.beginPath();
    ctx.ellipse(vortexX, vortexY, 130, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
    ctx.beginPath();
    ctx.ellipse(vortexX, vortexY, 95, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.beginPath();
    ctx.ellipse(vortexX, vortexY, 65, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    const dragX = 150;
    const dragY = h * 0.08;

    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(dragX, dragY + 45, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#052e16';
    for (let angle = Math.PI * 1.1; angle <= Math.PI * 1.9; angle += 0.25) {
      const spkX = dragX + Math.cos(angle) * 58;
      const spkY = dragY + 45 + Math.sin(angle) * 58;
      ctx.beginPath();
      ctx.moveTo(spkX, spkY);
      ctx.lineTo(spkX + Math.cos(angle) * 16, spkY + Math.sin(angle) * 16);
      ctx.lineTo(spkX + 8, spkY + 8);
      ctx.fill();
    }

    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(dragX, dragY + 62, 38, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(dragX, dragY + 62, 28, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    for (let tx = dragX - 32; tx <= dragX + 24; tx += 8) {
      ctx.beginPath();
      ctx.moveTo(tx, dragY + 62);
      ctx.lineTo(tx + 4, dragY + 76);
      ctx.lineTo(tx + 8, dragY + 62);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(dragX - 26, dragY + 98);
    ctx.lineTo(dragX - 22, dragY + 80);
    ctx.lineTo(dragX - 16, dragY + 98);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(dragX + 16, dragY + 98);
    ctx.lineTo(dragX + 22, dragY + 80);
    ctx.lineTo(dragX + 26, dragY + 98);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(dragX - 28, dragY + 30, 16, 7);
    ctx.fillRect(dragX + 12, dragY + 30, 16, 7);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(dragX - 24, dragY + 32, 10, 3);
    ctx.fillRect(dragX + 14, dragY + 32, 10, 3);

    const trackY = h * 0.52;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let rx = 180; rx < w; rx += 28) {
      ctx.beginPath();
      ctx.moveTo(rx, trackY + 12);
      ctx.lineTo(rx + 28, h);
      ctx.moveTo(rx + 28, trackY + 12);
      ctx.lineTo(rx, h);
      ctx.stroke();
    }

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(160, trackY + 8, w - 160, 6);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(160, trackY + 14, w - 160, 3);

    const floorGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    floorGrad.addColorStop(0, '#15803d');
    floorGrad.addColorStop(0.4, '#166534');
    floorGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.55, 180, h * 0.45);

    ctx.fillStyle = '#e2e8f0';
    for (let st = h * 0.58; st < h; st += 12) {
      ctx.fillRect(20, st, 120, 4);
    }
  });
}