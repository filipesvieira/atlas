/**
 * Renderizador de Martelo Pixel Art Animado para Obras do Acampamento.
 * Desenha puramente em Canvas 2D sem depender de emojis de sistema operacional.
 */
export function drawPixelHammer(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const swing = Math.sin(time / 140);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.55 + swing * 0.45);

  // Cabo de madeira (diagonal)
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-2, -14, 4, 18);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-1, -12, 2, 14);

  // Cabeça de ferro/aço do martelo
  ctx.fillStyle = '#334155';
  ctx.fillRect(-8, -20, 16, 8);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-7, -19, 14, 3);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-6, -18, 5, 2);

  // Face de impacto
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(6, -19, 2, 6);

  ctx.restore();
}