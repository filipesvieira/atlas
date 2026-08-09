import { Position, VisualEffect } from '../types';

export class FireballEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private startPos: Position;
  private targetPos: Position;
  private travelDurationMs = 320;
  private explodeDurationMs = 280;
  private elapsedMs = 0;
  private emberParticles: Array<{ vx: number; vy: number; x: number; y: number; size: number }> = [];

  constructor(startPos: Position, targetPos: Position) {
    this.id = 'fireball_' + Math.random().toString(36).substring(2, 9);
    this.startPos = { ...startPos };
    this.targetPos = { ...targetPos };
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 45;
      this.emberParticles.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        x: 0,
        y: 0,
        size: 2 + Math.random() * 2.5,
      });
    }
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    const totalDuration = this.travelDurationMs + this.explodeDurationMs;
    if (this.elapsedMs >= totalDuration) {
      this.isFinished = true;
      return;
    }
    if (this.elapsedMs > this.travelDurationMs) {
      const dt = deltaMs / 1000;
      for (const p of this.emberParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.elapsedMs <= this.travelDurationMs) {
      // Fase de Viagem: Orbe Ígneo
      const travelProg = this.elapsedMs / this.travelDurationMs;
      const curX = this.startPos.x + (this.targetPos.x - this.startPos.x) * travelProg;
      const curY = this.startPos.y + (this.targetPos.y - this.startPos.y) * travelProg;

      // Cauda de fogo
      const grad = ctx.createRadialGradient(curX, curY, 2, curX, curY, 12);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.4, '#f97316');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(curX, curY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Núcleo brilhante
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(curX, curY, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Fase de Explosão
      const explodeProg = (this.elapsedMs - this.travelDurationMs) / this.explodeDurationMs;
      const alpha = Math.max(0, 1 - explodeProg);

      ctx.translate(this.targetPos.x, this.targetPos.y);

      // Onda de choque de fogo
      ctx.strokeStyle = `rgba(249, 115, 22, ${alpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 10 + explodeProg * 25, 0, Math.PI * 2);
      ctx.stroke();

      // Partículas de brasa incandescentes
      ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
      for (const p of this.emberParticles) {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    ctx.restore();
  }
}

export class IceShardEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private startPos: Position;
  private targetPos: Position;
  private durationMs = 360;
  private elapsedMs = 0;

  constructor(startPos: Position, targetPos: Position) {
    this.id = 'iceshard_' + Math.random().toString(36).substring(2, 9);
    this.startPos = { ...startPos };
    this.targetPos = { ...targetPos };
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs >= this.durationMs) {
      this.isFinished = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = Math.min(1, this.elapsedMs / this.durationMs);
    const curX = this.startPos.x + (this.targetPos.x - this.startPos.x) * progress;
    const curY = this.startPos.y + (this.targetPos.y - this.startPos.y) * progress;

    ctx.save();
    // Estilhaço de gelo ciano pontiagudo
    ctx.fillStyle = '#67e8f9';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(curX + 8, curY);
    ctx.lineTo(curX - 8, curY - 4);
    ctx.lineTo(curX - 4, curY);
    ctx.lineTo(curX - 8, curY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cristais cintilantes ao redor
    ctx.fillStyle = 'rgba(207, 250, 254, 0.8)';
    ctx.fillRect(curX - 12, curY - 6, 2, 2);
    ctx.fillRect(curX - 14, curY + 5, 2, 2);

    // Se chegou ao alvo, desenha anel de geada / slow
    if (progress > 0.8) {
      const slowProg = (progress - 0.8) / 0.2;
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - slowProg})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.targetPos.x, this.targetPos.y, 16 * slowProg, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
