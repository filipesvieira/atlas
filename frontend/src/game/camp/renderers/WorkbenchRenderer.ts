import { BuildingRenderContext } from '../types';

/**
 * Renderizador da Bancada de Desmontagem (Workbench) — Níveis 0 a 3.
 * Desenha ancorado a partir do centro inferior da base (groundY).
 * Nível 2 adiciona bigorna e forja de brasas.
 * Nível 3 é uma oficina completa com forno, bigorna reforçada e faíscas de forja.
 */
export function renderWorkbench(ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) {
  const { level, x, y, time } = renderCtx;

  ctx.save();
  ctx.translate(x, y);

  if (level === 0) {
    // Nível 0: Mesa de madeira gasta com ferramentas enferrujadas
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-12, -8, 24, 3); // Tampo
    ctx.fillRect(-10, -5, 3, 5); // Pés
    ctx.fillRect(7, -5, 3, 5);

    // Ferramenta enferrujada
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-6, -11, 8, 3);
    ctx.restore();
    return;
  }

  if (level === 1) {
    // Nível 1: Bancada funcional com martelo e caixa de ferramentas (42 x 28 px)
    // Mesa de carvalho
    ctx.fillStyle = '#5c2d11';
    ctx.fillRect(-18, -14, 36, 4); // Tampo grosso
    ctx.fillRect(-16, -10, 4, 10); // Pernas
    ctx.fillRect(12, -10, 4, 10);
    ctx.fillRect(-16, -4, 32, 2); // Travessa

    // Caixa de ferramentas na lateral
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-15, -20, 10, 6);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-12, -22, 4, 2); // Alça

    // Martelo sobre a mesa
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, -16, 8, 2);
    ctx.fillStyle = '#334155';
    ctx.fillRect(8, -18, 4, 4);

    ctx.restore();
    return;
  }

  if (level === 2) {
    // Nível 2: Bigorna de ferro, forja com brasas e ferramentas afiadas (58 x 40 px)
    // 1. Bancada principal
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-24, -16, 26, 4);
    ctx.fillRect(-22, -12, 4, 12);
    ctx.fillRect(-4, -12, 4, 12);

    // Suporte traseiro de ferramentas
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-24, -30, 26, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-21, -26, 2, 8); // Serrote
    ctx.fillRect(-15, -28, 2, 10); // Alicate
    ctx.fillRect(-9, -25, 2, 7); // Chave

    // 2. Bigorna de ferro sólido
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6, -14, 16, 6); // Corpo
    ctx.fillRect(4, -8, 20, 8); // Base pesada
    ctx.fillStyle = '#334155';
    ctx.fillRect(2, -14, 4, 3); // Bico da bigorna
    ctx.fillRect(6, -16, 16, 2); // Superfície de trabalho

    // 3. Pequena forja com brasas quentes
    ctx.fillStyle = '#475569';
    ctx.fillRect(24, -18, 12, 18);
    const emberGlow = Math.sin(time / 120) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(234, 88, 12, ${emberGlow})`;
    ctx.fillRect(26, -14, 8, 6);

    ctx.restore();
    return;
  }

  // Nível 3: Oficina de Desmontagem Completa com Forno, Roda de Afiar e Faíscas (76 x 56 px)
  // 1. Piso de placas de aço
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-34, -4, 68, 4);

  // 2. Forno industrial de fundição à direita
  ctx.fillStyle = '#334155';
  ctx.fillRect(14, -36, 20, 32);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(16, -42, 16, 6); // Chaminé do forno

  // Abertura incandescente do forno
  const furnaceGlow = Math.sin(time / 90) * 0.15 + 0.85;
  ctx.fillStyle = `rgba(249, 115, 22, ${furnaceGlow})`;
  ctx.fillRect(17, -24, 14, 12);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(19, -20, 10, 6);

  // 3. Bigorna reforçada com martelo de precisão
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-6, -18, 18, 8);
  ctx.fillRect(-8, -10, 22, 10);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-10, -18, 4, 4); // Bico
  ctx.fillRect(-6, -20, 18, 2); // Face polida

  // 4. Bancada mecânica com torno de bancada e engrenagens
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-32, -22, 22, 5);
  ctx.fillRect(-30, -17, 4, 17);
  ctx.fillRect(-14, -17, 4, 17);

  // Torno de bancada de ferro
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-30, -28, 8, 6);
  ctx.fillRect(-28, -26, 12, 2);

  // 5. Roda de esmeril / afiar girando
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(-22, -10, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(-22, -10, 3, 0, Math.PI * 2);
  ctx.fill();

  // 6. Faíscas ativas de forja
  ctx.fillStyle = '#fde047';
  for (let i = 0; i < 4; i++) {
    const spkTime = (time * 0.003 + i * 0.25) % 1;
    const spkX = 4 + Math.cos(time * 0.01 + i * 2) * 12;
    const spkY = -20 - spkTime * 16;
    const alpha = Math.sin(spkTime * Math.PI);
    ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
    ctx.fillRect(spkX, spkY, 2, 2);
  }

  ctx.restore();
}
