import { Position, VisualEffect } from '../types';

export class MultishotEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private startPos: Position;
  private targetPositions: Position[];
  private durationMs = 350;
  private elapsedMs = 0;

  constructor(startPos: Position, targetPositions: Position[]) {
    this.id = 'multishot_' + Math.random().toString(36).substring(2, 9);
    this.startPos = { ...startPos };
    // Garante até 4 alvos/posições
    this.targetPositions = targetPositions.slice(0, 4);
    if (this.targetPositions.length === 0) {
      this.targetPositions.push({ x: startPos.x + 200, y: startPos.y });
    }
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs >= this.durationMs) {
      this.isFinished = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = Math.min(1, this.elapsedMs / this.durationMs);

    ctx.save();
    for (let i = 0; i < 4; i++) {
      const target = this.targetPositions[i % this.targetPositions.length];
      // Leque angular com ligeiro offset vertical para flechas adicionais
      const yOffset = (i - 1.5) * 8 * (1 - progress);
      const curX = this.startPos.x + (target.x - this.startPos.x) * progress;
      const curY = this.startPos.y + (target.y - this.startPos.y) * progress + yOffset;

      // Haste da flecha dourada
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(curX - 10, curY);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      // Ponta brilhante
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(curX, curY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Rastro suave
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(curX - 22, curY);
      ctx.lineTo(curX - 10, curY);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class SniperShotEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private startPos: Position;
  private targetPos: Position;
  private durationMs = 280;
  private elapsedMs = 0;

  constructor(startPos: Position, targetPos: Position) {
    this.id = 'sniper_' + Math.random().toString(36).substring(2, 9);
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
    // Raio perfurante potente
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.startPos.x, this.startPos.y);
    ctx.lineTo(curX, curY);
    ctx.stroke();

    // Flash na ponta da flecha
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(curX, curY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
