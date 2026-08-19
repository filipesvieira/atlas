import { BuildingRenderContext } from '../types';

/**
 * Renderizador da Fogueira do Acampamento (Campfire) — Níveis 0 a 3.
 * Desenha ancorado a partir do centro inferior da base (groundY).
 * Nível 2 adiciona anel de pedras, caldeirão e banco de tronco.
 * Nível 3 é uma grande fogueira cerimonial com pedestal de pedras talhadas.
 */
export function renderCampfire(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time } = renderCtx;

  ctx.save();
  ctx.translate(x, y);

  if (level === 0) {
    // Nível 0: Círculo de cinzas apagadas e dois troncos carbonizados
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, -4, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, -4, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Troncos cruzados apagados
    ctx.fillStyle = '#292524';
    ctx.fillRect(-10, -6, 20, 3);
    ctx.fillRect(-8, -8, 16, 3);
    ctx.restore();
    return;
  }

  if (level === 1) {
    // Nível 1: Fogueira simples com 6 pedras e chama aconchegante
    // Pedras da base
    ctx.fillStyle = '#475569';
    const angles = [0, 1.05, 2.09, 3.14, 4.19, 5.24];
    angles.forEach((ang) => {
      const sx = Math.cos(ang) * 16;
      const sy = Math.sin(ang) * 8 - 4;
      ctx.fillRect(sx - 3, sy - 2, 6, 5);
    });

    // Troncos de madeira
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-12, -7, 24, 4);
    ctx.fillRect(-9, -10, 18, 4);

    // Chamas animadas
    const fHeight = 16 + Math.sin(time / 100) * 4;
    const fShift = Math.sin(time / 80) * 2;

    // Glow suave
    const glow1 = ctx.createRadialGradient(0, -8, 3, 0, -8, 45);
    glow1.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
    glow1.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = glow1;
    ctx.beginPath();
    ctx.arc(0, -8, 45, 0, Math.PI * 2);
    ctx.fill();

    // Fogo externo
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(fShift, -fHeight);
    ctx.lineTo(10, -6);
    ctx.closePath();
    ctx.fill();

    // Fogo interno
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(fShift * 0.5, -fHeight * 0.75);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    return;
  }

  if (level === 2) {
    // Nível 2: Fogueira com anel de 10 pedras, tripé de ferro com panela e banco de tronco
    // Banco de tronco à esquerda
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-36, -6, 18, 6);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-34, 0, 4, 4);
    ctx.fillRect(-22, 0, 4, 4);

    // Anel completo de pedras
    ctx.fillStyle = '#64748b';
    const angles = [0, 0.63, 1.26, 1.88, 2.51, 3.14, 3.77, 4.4, 5.03, 5.65];
    angles.forEach((ang) => {
      const sx = Math.cos(ang) * 22;
      const sy = Math.sin(ang) * 10 - 6;
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
    });

    // Troncos no centro
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-15, -9, 30, 5);
    ctx.fillRect(-12, -13, 24, 5);

    // Glow maior
    const glow2 = ctx.createRadialGradient(0, -12, 5, 0, -12, 70);
    glow2.addColorStop(0, 'rgba(249, 115, 22, 0.6)');
    glow2.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = glow2;
    ctx.beginPath();
    ctx.arc(0, -12, 70, 0, Math.PI * 2);
    ctx.fill();

    // Chamas fortes
    const fHeight2 = 24 + Math.sin(time / 90) * 5;
    const fShift2 = Math.sin(time / 70) * 3;

    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(fShift2, -fHeight2);
    ctx.lineTo(14, -8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(fShift2 * 0.5, -fHeight2 * 0.8);
    ctx.lineTo(9, -8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(0, -fHeight2 * 0.5);
    ctx.lineTo(4, -8);
    ctx.closePath();
    ctx.fill();

    // Tripé de ferro para o caldeirão
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(0, -fHeight2 - 8);
    ctx.lineTo(18, 0);
    ctx.stroke();

    // Caldeirão pendurado
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, -fHeight2 + 4, 7, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(-7, -fHeight2 + 2, 14, 3);

    ctx.restore();
    return;
  }

  // Nível 3: Grande Fogueira Cerimonial com pedestal de pedras talhadas e iluminação épica
  // Pedestal de pedras talhadas
  ctx.fillStyle = '#334155';
  ctx.fillRect(-28, -6, 56, 6);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-24, -10, 48, 5);

  // Brasas e troncos nobres
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(-18, -14, 36, 6);
  ctx.fillRect(-14, -18, 28, 5);

  // Iluminação épica
  const glow3 = ctx.createRadialGradient(0, -18, 8, 0, -18, 95);
  glow3.addColorStop(0, 'rgba(234, 88, 12, 0.7)');
  glow3.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
  glow3.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = glow3;
  ctx.beginPath();
  ctx.arc(0, -18, 95, 0, Math.PI * 2);
  ctx.fill();

  // Chamas cerimoniosas multicamadas
  const fHeight3 = 38 + Math.sin(time / 80) * 7;
  const fShift3 = Math.sin(time / 60) * 4;

  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(-20, -12);
  ctx.lineTo(fShift3 * 1.2, -fHeight3);
  ctx.lineTo(20, -12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(-15, -12);
  ctx.lineTo(fShift3 * 0.8, -fHeight3 * 0.85);
  ctx.lineTo(15, -12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.lineTo(fShift3 * 0.4, -fHeight3 * 0.65);
  ctx.lineTo(10, -12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.moveTo(-5, -12);
  ctx.lineTo(0, -fHeight3 * 0.4);
  ctx.lineTo(5, -12);
  ctx.closePath();
  ctx.fill();

  // Fagulhas e brasas ascendentes
  ctx.fillStyle = '#fde047';
  for (let i = 0; i < 5; i++) {
    const sTime = (time * 0.002 + i * 0.22) % 1;
    const sx = Math.sin(time * 0.005 + i * 2) * 14;
    const sy = -14 - sTime * (fHeight3 + 20);
    const alpha = Math.sin(sTime * Math.PI);
    ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  ctx.restore();
}
