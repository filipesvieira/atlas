const cache = new Map<string, HTMLCanvasElement>();

export function getOffscreenCanvas(
  key: string,
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D) => void
): HTMLCanvasElement {
  const cacheKey = `${key}_${width}x${height}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx);
  cache.set(cacheKey, canvas);
  return canvas;
}
