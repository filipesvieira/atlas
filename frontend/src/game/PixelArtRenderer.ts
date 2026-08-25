import { monsterRegistry } from './registries/MonsterRegistry';

/**
 * PixelArtRenderer — Gerador de Texturas e Cenários 2D em Offscreen Canvas
 * 
 * Pre-renderiza cenários ricos e sprites detalhados em offscreen canvases.
 * O rendering final via `ctx.drawImage(buffer, ...)` é 100% síncrono,
 * sem delays, sem telas pretas e com 60 FPS cravados.
 */

export class PixelArtRenderer {
  private static cache: Map<string, HTMLCanvasElement> = new Map();

  /** Cria ou recupera um canvas offscreen do cache */
  private static getOffscreenCanvas(key: string, width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // Preserva estética Pixel Art nítida
    drawFn(ctx);

    this.cache.set(key, canvas);
    return canvas;
  }

  /** Retorna a textura de Monstro baseada na `visual_key` com tamanho dinâmico (48px ou 64px para bosses) */
  public static getMonsterTexture(visualKeyOrName = '', size = 48): HTMLCanvasElement {
    const key = visualKeyOrName.toLowerCase().trim();
    const cacheKey = `mob_${key}_${size}`;

    return this.getOffscreenCanvas(cacheKey, size, size, (ctx) => {
      this.drawMonsterByVisualKey(ctx, key, size);
    });
  }

  private static drawMonsterByVisualKey(ctx: CanvasRenderingContext2D, key: string, size: number) {
    monsterRegistry.render(ctx, key, size);
  }
}