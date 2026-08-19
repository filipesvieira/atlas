import { BuildingRenderContext } from '../types';

/**
 * Renderizador da Cabana do Aventureiro (Adventurer Hut) — Níveis 0 a 3.
 * Desenha ancorado a partir do centro inferior da base (groundY).
 * Nível 2 assume 110x76px (porte da antiga casa) e Nível 3 atinge 140x96px (chalé de dois volumes).
 */
export function renderHut(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time } = renderCtx;

  ctx.save();
  ctx.translate(x, y);

  if (level === 0) {
    // Nível 0: Saco de dormir rústico, estacas e mochila improvisada
    ctx.fillStyle = '#334155';
    ctx.fillRect(-15, -6, 30, 6);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-13, -10, 10, 5); // Travesseiro
    ctx.fillStyle = '#78350f';
    ctx.fillRect(8, -12, 6, 8); // Mochila de couro encostada
    ctx.fillRect(7, -13, 8, 2);
    ctx.restore();
    return;
  }

  if (level === 1) {
    // Nível 1: Tenda grande reforçada com lona esticada e lampião (58 x 42 px)
    const w = 29;
    const h = 42;

    // Estacas e cordas laterais
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w - 6, 0);
    ctx.lineTo(0, -h);
    ctx.lineTo(w + 6, 0);
    ctx.stroke();

    // Tecido principal da tenda
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(-w, 0);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();

    // Faixas de reforço
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(-w * 0.5, 0);
    ctx.lineTo(w * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // Entrada da tenda (abertura escura)
    ctx.fillStyle = '#291807';
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.7);
    ctx.lineTo(-w * 0.35, 0);
    ctx.lineTo(w * 0.35, 0);
    ctx.closePath();
    ctx.fill();

    // Lampião pendurado na frente
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, -h * 0.75, 4, 3);
    const lampFlicker = Math.sin(time / 150) * 0.15 + 0.85;
    ctx.fillStyle = `rgba(251, 191, 36, ${lampFlicker})`;
    ctx.fillRect(-3, -h * 0.75 + 3, 6, 6);

    ctx.restore();
    return;
  }

  if (level === 2) {
    // Nível 2: Cabana de madeira completa com o porte da antiga casa (110 x 76 px)
    const houseW = 100;
    const wallH = 46;
    const roofH = 30;
    const left = -houseW / 2;

    // 1. Paredes de troncos horizontais
    ctx.fillStyle = '#451a03';
    ctx.fillRect(left, -wallH, houseW, wallH);

    // Linhas de tábuas de madeira
    ctx.fillStyle = '#292524';
    for (let py = -wallH + 8; py < 0; py += 8) {
      ctx.fillRect(left, py, houseW, 1);
    }

    // 2. Telhado de madeira nobre inclinado
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(left - 8, -wallH);
    ctx.lineTo(0, -wallH - roofH);
    ctx.lineTo(left + houseW + 8, -wallH);
    ctx.closePath();
    ctx.fill();

    // Borda superior do telhado
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(left - 10, -wallH);
    ctx.lineTo(0, -wallH - roofH - 3);
    ctx.lineTo(left + houseW + 10, -wallH);
    ctx.lineTo(left + houseW + 6, -wallH + 3);
    ctx.lineTo(0, -wallH - roofH);
    ctx.lineTo(left - 6, -wallH + 3);
    ctx.closePath();
    ctx.fill();

    // 3. Porta de madeira escura
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-12, -32, 24, 32);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(6, -17, 3, 3); // Maçaneta de ouro

    // 4. Janela iluminada acolhedora
    const winFlicker = Math.sin(time / 220) * 0.1 + 0.9;
    ctx.fillStyle = `rgba(251, 191, 36, ${0.9 * winFlicker})`;
    ctx.fillRect(left + 15, -34, 20, 20);

    // Divisórias da janela
    ctx.fillStyle = '#78350f';
    ctx.fillRect(left + 24, -34, 2, 20);
    ctx.fillRect(left + 15, -25, 20, 2);

    // 5. Suporte de armas anexo à esquerda
    ctx.fillStyle = '#78350f';
    ctx.fillRect(left - 16, -22, 14, 22);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(left - 15, -18, 16, 2);
    ctx.fillRect(left - 15, -9, 16, 2);

    // 6. Barril de suprimentos à direita
    ctx.fillStyle = '#78350f';
    ctx.fillRect(left + houseW + 2, -18, 12, 18);
    ctx.fillStyle = '#334155';
    ctx.fillRect(left + houseW + 2, -15, 12, 2);
    ctx.fillRect(left + houseW + 2, -6, 12, 2);

    ctx.restore();
    return;
  }

  // Nível 3: Chalé/Lodge Imponente de Dois Pavimentos com Chaminé e Estandarte (140 x 96 px)
  const lodgeW = 126;
  const wallH3 = 56;
  const roofH3 = 40;
  const left3 = -lodgeW / 2;

  // 1. Fundação de pedras talhadas
  ctx.fillStyle = '#334155';
  ctx.fillRect(left3 - 4, -10, lodgeW + 8, 10);
  ctx.fillStyle = '#475569';
  for (let px = left3; px < left3 + lodgeW; px += 18) {
    ctx.fillRect(px, -9, 16, 8);
  }

  // 2. Paredes de madeira reforçada e vigas
  ctx.fillStyle = '#3b1d11';
  ctx.fillRect(left3, -wallH3, lodgeW, wallH3 - 10);

  // Vigas verticais e horizontais de carvalho
  ctx.fillStyle = '#5c2d11';
  ctx.fillRect(left3, -wallH3, 8, wallH3 - 10);
  ctx.fillRect(left3 + lodgeW - 8, -wallH3, 8, wallH3 - 10);
  ctx.fillRect(-5, -wallH3, 10, wallH3 - 10);
  ctx.fillRect(left3, -wallH3 + 22, lodgeW, 5);

  // 3. Chaminé de pedra com fumaça animada à direita
  const chimX = left3 + lodgeW - 24;
  const chimY = -wallH3 - roofH3 + 6;
  ctx.fillStyle = '#475569';
  ctx.fillRect(chimX, chimY, 14, 38);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(chimX - 2, chimY, 18, 4);

  // Fumaça animada em partículas
  ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
  for (let i = 0; i < 4; i++) {
    const fTime = (time * 0.0012 + i * 0.35) % 1;
    const smkX = chimX + 7 + Math.sin(time * 0.003 + i) * 6 + fTime * 8;
    const smkY = chimY - 4 - fTime * 24;
    const smkSize = 4 + fTime * 7;
    ctx.beginPath();
    ctx.arc(smkX, smkY, smkSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Telhado imponente de ardósia nobre com duas águas
  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.moveTo(left3 - 12, -wallH3);
  ctx.lineTo(0, -wallH3 - roofH3);
  ctx.lineTo(left3 + lodgeW + 12, -wallH3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#9a3412';
  ctx.beginPath();
  ctx.moveTo(left3 - 14, -wallH3);
  ctx.lineTo(0, -wallH3 - roofH3 - 4);
  ctx.lineTo(left3 + lodgeW + 14, -wallH3);
  ctx.lineTo(left3 + lodgeW + 10, -wallH3 + 4);
  ctx.lineTo(0, -wallH3 - roofH3);
  ctx.lineTo(left3 - 10, -wallH3 + 4);
  ctx.closePath();
  ctx.fill();

  // 5. Porta arqueada reforçada de ferro
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(-15, -38, 30, 38);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(8, -20, 4, 4); // Maçaneta dourada

  // 6. Janelas duplas iluminadas (Térreo e Sótão)
  const winGlow = Math.sin(time / 180) * 0.08 + 0.92;
  ctx.fillStyle = `rgba(251, 191, 36, ${0.95 * winGlow})`;
  ctx.fillRect(left3 + 16, -42, 22, 22);
  ctx.fillRect(-8, -wallH3 - 22, 16, 16); // Janela do sótão

  ctx.fillStyle = '#5c2d11';
  // Grades de madeira
  ctx.fillRect(left3 + 26, -42, 2, 22);
  ctx.fillRect(left3 + 16, -32, 22, 2);
  ctx.fillRect(0, -wallH3 - 22, 2, 16);
  ctx.fillRect(-8, -wallH3 - 14, 16, 2);

  // 7. Estandarte heróico do Aventureiro no topo do telhado
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(-1, -wallH3 - roofH3 - 14);
  ctx.lineTo(16, -wallH3 - roofH3 - 8);
  ctx.lineTo(-1, -wallH3 - roofH3 - 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-3, -wallH3 - roofH3 - 16, 3, 16);

  ctx.restore();
}
