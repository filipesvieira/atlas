import { BuildingRenderContext } from '../types';

/**
 * Renderizador do Armazém de Recursos (Warehouse) — Níveis 0 a 3.
 * Desenha ancorado a partir do centro inferior da base (groundY).
 * Nível 2 adiciona depósito reforçado com portão de ferro e caixas.
 * Nível 3 é um grande armazém de dois pavimentos com guincho e brasão.
 */
export function renderWarehouse(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y } = renderCtx;

  ctx.save();
  ctx.translate(x, y);

  if (level === 0) {
    // Nível 0: Lona improvisada cobrindo duas caixas de suprimentos
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-12, -10, 11, 10);
    ctx.fillRect(1, -12, 12, 12);

    // Lona escura por cima
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-6, -15);
    ctx.lineTo(15, -16);
    ctx.lineTo(16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if (level === 1) {
    // Nível 1: Galpão de madeira pequeno com caixas e barril (54 x 40 px)
    const w = 46;
    const h = 34;
    const left = -w / 2;

    // Paredes de madeira
    ctx.fillStyle = '#5c2d11';
    ctx.fillRect(left, -h, w, h);

    // Telhado inclinado
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(left - 4, -h);
    ctx.lineTo(0, -h - 12);
    ctx.lineTo(left + w + 4, -h);
    ctx.closePath();
    ctx.fill();

    // Porta simples
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-8, -22, 16, 22);

    // Caixa de recursos na lateral
    ctx.fillStyle = '#92400e';
    ctx.fillRect(left - 10, -10, 10, 10);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(left - 8, -8, 6, 6);

    ctx.restore();
    return;
  }

  if (level === 2) {
    // Nível 2: Depósito reforçado com portão de ferro e prateleiras (74 x 58 px)
    const w2 = 64;
    const h2 = 44;
    const left2 = -w2 / 2;

    // Fundação e paredes reforçadas
    ctx.fillStyle = '#451a03';
    ctx.fillRect(left2, -h2, w2, h2);

    // Vigas de reforço de carvalho
    ctx.fillStyle = '#291807';
    ctx.fillRect(left2, -h2, 6, h2);
    ctx.fillRect(left2 + w2 - 6, -h2, 6, h2);
    ctx.fillRect(left2, -h2 + 18, w2, 4);

    // Telhado de tábuas duplas
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(left2 - 6, -h2);
    ctx.lineTo(0, -h2 - 18);
    ctx.lineTo(left2 + w2 + 6, -h2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(left2 - 8, -h2);
    ctx.lineTo(0, -h2 - 20);
    ctx.lineTo(left2 + w2 + 8, -h2);
    ctx.lineTo(left2 + w2 + 4, -h2 + 3);
    ctx.lineTo(0, -h2 - 17);
    ctx.lineTo(left2 - 4, -h2 + 3);
    ctx.closePath();
    ctx.fill();

    // Portão de carga com barras de ferro
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-12, -28, 24, 28);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-11, -26, 22, 2);
    ctx.fillRect(-11, -16, 22, 2);
    ctx.fillRect(-11, -6, 22, 2);

    // Caixas e barril na entrada
    ctx.fillStyle = '#78350f';
    ctx.fillRect(left2 - 12, -14, 12, 14);
    ctx.fillStyle = '#475569';
    ctx.fillRect(left2 + w2 + 2, -12, 10, 12);

    ctx.restore();
    return;
  }

  // Nível 3: Grande Armazém Comercial de Dois Pavimentos com Guincho e Brasão (96 x 75 px)
  const w3 = 86;
  const h3 = 54;
  const left3 = -w3 / 2;

  // 1. Fundação de pedras
  ctx.fillStyle = '#334155';
  ctx.fillRect(left3 - 4, -8, w3 + 8, 8);

  // 2. Paredes do armazém
  ctx.fillStyle = '#3b1d11';
  ctx.fillRect(left3, -h3, w3, h3 - 8);

  // Vigas e pilares estruturais
  ctx.fillStyle = '#5c2d11';
  ctx.fillRect(left3, -h3, 8, h3 - 8);
  ctx.fillRect(left3 + w3 - 8, -h3, 8, h3 - 8);
  ctx.fillRect(-6, -h3, 12, h3 - 8);
  ctx.fillRect(left3, -h3 + 24, w3, 6);

  // 3. Telhado de telhas vermelhas
  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.moveTo(left3 - 10, -h3);
  ctx.lineTo(0, -h3 - 24);
  ctx.lineTo(left3 + w3 + 10, -h3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#9a3412';
  ctx.beginPath();
  ctx.moveTo(left3 - 12, -h3);
  ctx.lineTo(0, -h3 - 26);
  ctx.lineTo(left3 + w3 + 12, -h3);
  ctx.lineTo(left3 + w3 + 8, -h3 + 4);
  ctx.lineTo(0, -h3 - 22);
  ctx.lineTo(left3 - 8, -h3 + 4);
  ctx.closePath();
  ctx.fill();

  // 4. Guincho mecânico de carga no piso superior
  ctx.fillStyle = '#78350f';
  ctx.fillRect(16, -h3 - 8, 14, 4);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, -h3 - 6);
  ctx.lineTo(28, -h3 + 12);
  ctx.stroke();

  // Fardo de carga pendurado no guincho
  ctx.fillStyle = '#d97706';
  ctx.fillRect(23, -h3 + 12, 10, 9);

  // 5. Portão duplo de carvalho com rebites de ferro
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(-16, -34, 32, 34);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-15, -30, 30, 2);
  ctx.fillRect(-15, -18, 30, 2);
  ctx.fillRect(-15, -6, 30, 2);

  // 6. Brasão dourado do entreposto no frontão
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, -h3 - 10, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-2, -h3 - 12, 4, 4);

  // 7. Pilhas de caixas de minérios e madeira na lateral
  ctx.fillStyle = '#78350f';
  ctx.fillRect(left3 - 14, -14, 12, 14);
  ctx.fillStyle = '#334155';
  ctx.fillRect(left3 - 12, -24, 10, 10);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(left3 + w3 + 2, -16, 14, 16);

  ctx.restore();
}
