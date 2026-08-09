import { Position, VisualEffect } from '../types';

export class WhirlwindEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private heroPos: Position;
  private durationMs = 500;
  private elapsedMs = 0;
  private particles: Array<{ angle: number; dist: number; speed: number; size: number }> = [];

  constructor(heroPos: Position) {
    this.id = 'whirlwind_' + Math.random().toString(36).substring(2, 9);
    this.heroPos = { ...heroPos };
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 10 + Math.random() * 35,
        speed: 8 + Math.random() * 8,
        size: 2 + Math.random() * 2,
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
    for (const p of this.particles) {
      p.angle += p.speed * dt;
      p.dist += 15 * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = this.elapsedMs / this.durationMs;
    const alpha = Math.max(0, 1 - progress);
    const radius = 20 + progress * 40;

    ctx.save();
    ctx.translate(this.heroPos.x, this.heroPos.y);

    // Anéis cortantes de aço prateado 360°
    ctx.strokeStyle = `rgba(226, 232, 240, ${alpha * 0.85})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(148, 163, 184, ${alpha * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Faíscas metálicas giratórias
    ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
    for (const p of this.particles) {
      const px = Math.cos(p.angle) * p.dist;
      const py = Math.sin(p.angle) * p.dist * 0.6; // Perspectiva isométrica
      ctx.fillRect(px, py, p.size, p.size);
    }

    ctx.restore();
  }
}

export class BrutalStrikeEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private targetPos: Position;
  private durationMs = 400;
  private elapsedMs = 0;

  constructor(targetPos: Position) {
    this.id = 'brutal_' + Math.random().toString(36).substring(2, 9);
    this.targetPos = { ...targetPos };
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs >= this.durationMs) {
      this.isFinished = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = this.elapsedMs / this.durationMs;
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.translate(this.targetPos.x, this.targetPos.y);

    // Linhas de impacto de corte vermelho/carmesim pesado
    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
    ctx.lineWidth = 4 * (1 - progress);

    // Corte diagonal 1
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.lineTo(16, 16);
    ctx.stroke();

    // Corte diagonal 2
    ctx.beginPath();
    ctx.moveTo(16, -16);
    ctx.lineTo(-16, 16);
    ctx.stroke();

    // Flash central de impacto
    ctx.fillStyle = `rgba(254, 202, 202, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * (1 - progress), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
