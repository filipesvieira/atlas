import { BuildingRenderContext } from '../types';

/**
 * Renderizador da Fonte Arcana (Arcane Spring) — Níveis 0 a 3.
 * Desenha ancorado a partir do centro inferior da base (groundY).
 * Nível 2 adiciona poço de pedra e colunas rúnicas.
 * Nível 3 adiciona obeliscos flutuantes e feixe de mana.
 */
export function renderArcaneSpring(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time } = renderCtx;

  ctx.save();
  ctx.translate(x, y);

  if (level === 0) {
    // Nível 0: Solo úmido com musgo azulado e brilho tênue
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, -3, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, -3, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (level === 1) {
    // Nível 1: Pequena nascente azulada com pedras naturais
    ctx.fillStyle = '#334155';
    const stones = [-18, -10, 0, 10, 18];
    stones.forEach((sx) => {
      ctx.fillRect(sx - 3, -6, 6, 6);
    });

    // Água mágica
    const waterGlow = ctx.createRadialGradient(0, -6, 2, 0, -6, 25);
    waterGlow.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
    waterGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = waterGlow;
    ctx.beginPath();
    ctx.ellipse(0, -6, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Partículas subindo
    ctx.fillStyle = '#bae6fd';
    for (let i = 0; i < 3; i++) {
      const pTime = (time * 0.0015 + i * 0.33) % 1;
      const px = Math.sin(time * 0.004 + i) * 10;
      const py = -6 - pTime * 18;
      const alpha = Math.sin(pTime * Math.PI);
      ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
      ctx.fillRect(px, py, 2, 2);
    }

    ctx.restore();
    return;
  }

  if (level === 2) {
    // Nível 2: Poço de pedra talhada com colunas rúnicas laterais
    // Bacia do poço
    ctx.fillStyle = '#334155';
    ctx.fillRect(-24, -12, 48, 12);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-22, -14, 44, 3);

    // Água borbulhante mágica
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-18, -11, 36, 8);
    const glow2 = ctx.createRadialGradient(0, -8, 2, 0, -8, 40);
    glow2.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
    glow2.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(-20, -12, 40, 10);

    // Colunas rúnicas laterais
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-26, -34, 6, 24);
    ctx.fillRect(20, -34, 6, 24);

    // Runas pulsantes nas colunas
    const runeGlow = Math.sin(time / 200) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(56, 189, 248, ${runeGlow})`;
    ctx.fillRect(-25, -28, 4, 3);
    ctx.fillRect(-25, -20, 4, 3);
    ctx.fillRect(21, -28, 4, 3);
    ctx.fillRect(21, -20, 4, 3);

    // Arco superior de pedra
    ctx.fillStyle = '#334155';
    ctx.fillRect(-26, -36, 52, 4);

    ctx.restore();
    return;
  }

  // Nível 3: Grande Fonte Arcana Elevada com Obeliscos Flutuantes e Feixe de Mana
  // Base do santuário
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(-32, -8, 64, 8);
  ctx.fillStyle = '#312e81';
  ctx.fillRect(-28, -14, 56, 6);

  // Cristal central flutuante
  const crystalFloat = Math.sin(time / 250) * 4;
  const cryY = -28 + crystalFloat;

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(0, cryY - 12);
  ctx.lineTo(8, cryY);
  ctx.lineTo(0, cryY + 12);
  ctx.lineTo(-8, cryY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.moveTo(0, cryY - 8);
  ctx.lineTo(4, cryY);
  ctx.lineTo(0, cryY + 8);
  ctx.lineTo(-4, cryY);
  ctx.closePath();
  ctx.fill();

  // Feixe de luz vertical ascendente
  const beamGrad = ctx.createLinearGradient(0, -60, 0, -14);
  beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
  beamGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
  beamGrad.addColorStop(1, 'rgba(125, 211, 252, 0.8)');
  ctx.fillStyle = beamGrad;
  ctx.fillRect(-6, -60, 12, 46);

  // Obeliscos rúnicos flutuantes laterais
  const obFloat1 = Math.sin(time / 200) * 3;
  const obFloat2 = Math.cos(time / 200) * 3;

  ctx.fillStyle = '#334155';
  // Obelisco esquerdo
  ctx.fillRect(-28, -42 + obFloat1, 6, 26);
  // Obelisco direito
  ctx.fillRect(22, -42 + obFloat2, 6, 26);

  // Runas brilhantes
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-27, -36 + obFloat1, 4, 3);
  ctx.fillRect(-27, -26 + obFloat1, 4, 3);
  ctx.fillRect(23, -36 + obFloat2, 4, 3);
  ctx.fillRect(23, -26 + obFloat2, 4, 3);

  // Aura mágica
  const glow3 = ctx.createRadialGradient(0, cryY, 5, 0, cryY, 65);
  glow3.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
  glow3.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow3;
  ctx.beginPath();
  ctx.arc(0, cryY, 65, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
