export function drawMonsterShadow(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(size / 2, size - 4, size * 0.3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawMissingMonster(ctx: CanvasRenderingContext2D, size: number, key: string) {
  console.warn(`[MonsterRegistry] Visual key desconhecida: "${key}". Renderizando fallback magenta.`);
  const checkSize = Math.max(4, Math.floor(size / 8));
  for (let y = 0; y < size; y += checkSize) {
    for (let x = 0; x < size; x += checkSize) {
      const isMagenta = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
      ctx.fillStyle = isMagenta ? '#ff00ff' : '#000000';
      ctx.fillRect(x, y, checkSize, checkSize);
    }
  }
}
