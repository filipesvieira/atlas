import { getOffscreenCanvas } from './canvasCache';

export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x - w * 0.15, y, w * 0.3, h * 0.4);

  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(x, y - h * 0.2, w * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(x - w * 0.2, y - h * 0.35, w * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(x + w * 0.2, y - h * 0.3, w * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Cenário: Floresta dos Aprendizes (Verde exuberante, árvore, trilha de terra, sol) */
export function getForestBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_forest', w, h, (ctx) => {
    // Céu gradiente suave (Crepúsculo ensolarado)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, '#1e3a8a');
    skyGrad.addColorStop(0.6, '#3b82f6');
    skyGrad.addColorStop(1, '#93c5fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    // Sol da manhã distante
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(80, 45, 22, 0, Math.PI * 2);
    ctx.fill();

    // Montanhas ao fundo
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w * 0.18, h * 0.32);
    ctx.lineTo(w * 0.36, h * 0.5);
    ctx.lineTo(w * 0.58, h * 0.28);
    ctx.lineTo(w * 0.82, h * 0.5);
    ctx.lineTo(w, h * 0.38);
    ctx.lineTo(w, h * 0.5);
    ctx.fill();

    // Chão de grama rústica
    const grassGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
    grassGrad.addColorStop(0, '#15803d');
    grassGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);

    // Trilha de terra central
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.quadraticCurveTo(w * 0.5, h * 0.58, w, h * 0.68);
    ctx.lineTo(w, h * 0.88);
    ctx.quadraticCurveTo(w * 0.5, h * 0.78, 0, h * 0.85);
    ctx.fill();

    // Pedras e tufos de grama na trilha
    ctx.fillStyle = '#92400e';
    ctx.fillRect(40, h * 0.72, 8, 3);
    ctx.fillRect(w * 0.32, h * 0.66, 12, 4);
    ctx.fillRect(w * 0.64, h * 0.75, 10, 4);
    ctx.fillRect(w * 0.88, h * 0.70, 7, 3);

    // Árvores nas bordas
    drawTree(ctx, 30, h * 0.52, 28, 65);
    drawTree(ctx, w - 30, h * 0.55, 32, 70);
    drawTree(ctx, w - 70, h * 0.48, 22, 50);
  });
}

/** Cenário: Acampamento / Safezone Vivo (Cabana, pinheiros, tronco, fogueira com anel de pedras) */
export function getCampBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_camp', w, h, (ctx) => {
    // Céu noturno calmo
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    // Lua e estrelas sutis
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(w - 80, 35, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(60, 20, 2, 2);
    ctx.fillRect(140, 40, 2, 2);
    ctx.fillRect(240, 15, 2, 2);
    ctx.fillRect(310, 30, 2, 2);

    // Silhuetas de montanhas ao fundo
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w * 0.16, h * 0.35);
    ctx.lineTo(w * 0.34, h * 0.5);
    ctx.lineTo(w * 0.60, h * 0.30);
    ctx.lineTo(w * 0.86, h * 0.5);
    ctx.lineTo(w, h * 0.38);
    ctx.lineTo(w, h * 0.5);
    ctx.fill();

    // Pinheiros distantes
    drawTree(ctx, 40, h * 0.46, 18, 45);
    drawTree(ctx, 90, h * 0.48, 15, 40);

    // Chão do acampamento
    const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
    groundGrad.addColorStop(0, '#1e293b');
    groundGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);

    // Detalhes de solo
    ctx.fillStyle = '#334155';
    ctx.fillRect(30, h * 0.65, 6, 3);
    ctx.fillRect(120, h * 0.75, 8, 4);
    ctx.fillRect(280, h * 0.82, 5, 3);
    ctx.fillRect(380, h * 0.68, 7, 3);

    ctx.fillStyle = '#166534';
    ctx.fillRect(70, h * 0.60, 4, 6);
    ctx.fillRect(150, h * 0.70, 4, 6);
    ctx.fillRect(310, h * 0.78, 4, 6);

    // Detalhes extras de vegetação e pedrinhas no chão do acampamento
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(45, h * 0.55, 3, 2);
    ctx.fillRect(210, h * 0.62, 4, 2);
    ctx.fillRect(360, h * 0.58, 3, 2);
    ctx.fillRect(440, h * 0.64, 4, 3);
  });
}
