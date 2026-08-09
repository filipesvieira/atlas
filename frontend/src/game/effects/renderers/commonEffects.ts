import { Position, VisualEffect } from '../types';

export class DivineHealEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private heroPos: Position;
  private durationMs = 600;
  private elapsedMs = 0;
  private crosses: Array<{ x: number; y: number; vy: number; alpha: number }> = [];

  constructor(heroPos: Position) {
    this.id = 'heal_' + Math.random().toString(36).substring(2, 9);
    this.heroPos = { ...heroPos };
    for (let i = 0; i < 6; i++) {
      this.crosses.push({
        x: (Math.random() - 0.5) * 30,
        y: Math.random() * 20,
        vy: 20 + Math.random() * 25,
        alpha: 1.0,
      });
    }
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs >= this.durationMs) {
      this.isFinished = true;
      return;
    }
    const dt = deltaMs / 1000;
    for (const c of this.crosses) {
      c.y -= c.vy * dt;
      c.alpha = Math.max(0, 1 - this.elapsedMs / this.durationMs);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = this.elapsedMs / this.durationMs;
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.translate(this.heroPos.x, this.heroPos.y);

    // Coluna vertical de luz dourada/esmeralda sagrada
    const colWidth = 24 * (1 - progress * 0.4);
    const grad = ctx.createLinearGradient(0, -60, 0, 20);
    grad.addColorStop(0, `rgba(52, 211, 153, 0)`);
    grad.addColorStop(0.5, `rgba(52, 211, 153, ${alpha * 0.45})`);
    grad.addColorStop(1, `rgba(250, 204, 21, ${alpha * 0.6})`);

    ctx.fillStyle = grad;
    ctx.fillRect(-colWidth / 2, -60, colWidth, 80);

    // Cruzes sagradas subindo
    ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
    for (const c of this.crosses) {
      // Haste vertical
      ctx.fillRect(c.x - 1.5, c.y - 6, 3, 12);
      // Haste horizontal
      ctx.fillRect(c.x - 5, c.y - 3, 10, 3);
    }

    ctx.restore();
  }
}
