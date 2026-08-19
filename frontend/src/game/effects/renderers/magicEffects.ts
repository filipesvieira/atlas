import { Position, VisualEffect } from '../types';
import { drawFireballComet, drawIceOrbComet } from './projectileSprites';

export class FireballEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private startPos: Position;
  private targetProvider: () => Position;
  private impactPos: Position | null = null;
  private travelDurationMs = 280;
  private explodeDurationMs = 260;
  private elapsedMs = 0;
  private trailParticles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }> = [];
  private emberParticles: Array<{ vx: number; vy: number; x: number; y: number; size: number; color: string }> = [];

  constructor(startPos: Position, targetPosOrProvider: Position | (() => Position)) {
    this.id = 'fireball_' + Math.random().toString(36).substring(2, 9);
    this.startPos = { ...startPos };
    if (typeof targetPosOrProvider === 'function') {
      this.targetProvider = targetPosOrProvider;
    } else {
      this.targetProvider = () => targetPosOrProvider;
    }

    const colors = ['#fef08a', '#facc15', '#f97316', '#ef4444'];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 60;
      this.emberParticles.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.7,
        x: 0,
        y: 0,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
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

    const dt = deltaMs / 1000;

    if (this.elapsedMs <= this.travelDurationMs) {
      const travelProg = this.elapsedMs / this.travelDurationMs;
      const target = this.targetProvider();
      this.impactPos = { ...target };
      const curX = this.startPos.x + (target.x - this.startPos.x) * travelProg;
      const curY = this.startPos.y + (target.y - this.startPos.y) * travelProg;

      // Gerar partículas de rastro de fogo
      const trailColors = ['#fef08a', '#facc15', '#fb923c', '#ea580c', '#dc2626'];
      for (let i = 0; i < 2; i++) {
        this.trailParticles.push({
          x: curX - 10 + (Math.random() * 6 - 3),
          y: curY + (Math.random() * 8 - 4),
          vx: -(15 + Math.random() * 30),
          vy: (Math.random() - 0.5) * 15,
          alpha: 0.9,
          size: 2 + Math.random() * 2.5,
          color: trailColors[Math.floor(Math.random() * trailColors.length)],
        });
      }
    }

    // Atualizar partículas de rastro
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const tp = this.trailParticles[i];
      tp.x += tp.vx * dt;
      tp.y += tp.vy * dt;
      tp.alpha -= 3.2 * dt;
      if (tp.alpha <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }

    // Atualizar partículas de explosão no impacto
    if (this.elapsedMs > this.travelDurationMs) {
      for (const p of this.emberParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 1. Desenhar rastro de partículas de fogo
    for (const tp of this.trailParticles) {
      ctx.globalAlpha = Math.max(0, tp.alpha);
      ctx.fillStyle = tp.color;
      ctx.fillRect(tp.x, tp.y, tp.size, tp.size);
    }

    if (this.elapsedMs <= this.travelDurationMs) {
      // 2. Fase de Viagem: Desenhar Cometa de Fogo Pixel Art rastreando o monstro
      const travelProg = this.elapsedMs / this.travelDurationMs;
      const target = this.impactPos || this.targetProvider();
      const curX = this.startPos.x + (target.x - this.startPos.x) * travelProg;
      const curY = this.startPos.y + (target.y - this.startPos.y) * travelProg;

      const angle = Math.atan2(target.y - this.startPos.y, target.x - this.startPos.x);

      ctx.globalAlpha = 1.0;
      drawFireballComet(ctx, curX, curY, angle, 1.4);
    } else {
      // 3. Fase de Explosão: Ancorada exatamente no ponto de impacto no monstro
      const explodeProg = (this.elapsedMs - this.travelDurationMs) / this.explodeDurationMs;
      const alpha = Math.max(0, 1 - explodeProg);
      const impact = this.impactPos || this.targetProvider();

      ctx.translate(impact.x, impact.y);

      // Onda de choque de fogo pixelizada
      ctx.strokeStyle = `rgba(249, 115, 22, ${alpha * 0.9})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12 + explodeProg * 30, 0, Math.PI * 2);
      ctx.stroke();

      // Partículas de brasa incandescentes
      for (const p of this.emberParticles) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
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
  private targetProvider: () => Position;
  private impactPos: Position | null = null;
  private durationMs = 300;
  private elapsedMs = 0;
  private trailParticles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }> = [];

  constructor(startPos: Position, targetPosOrProvider: Position | (() => Position)) {
    this.id = 'iceshard_' + Math.random().toString(36).substring(2, 9);
    this.startPos = { ...startPos };
    if (typeof targetPosOrProvider === 'function') {
      this.targetProvider = targetPosOrProvider;
    } else {
      this.targetProvider = () => targetPosOrProvider;
    }
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs >= this.durationMs) {
      this.isFinished = true;
      return;
    }

    const dt = deltaMs / 1000;
    const progress = Math.min(1, this.elapsedMs / this.durationMs);
    const target = this.targetProvider();
    this.impactPos = { ...target };
    const curX = this.startPos.x + (target.x - this.startPos.x) * progress;
    const curY = this.startPos.y + (target.y - this.startPos.y) * progress;

    // Gerar partículas de rastro de cristais de gelo cintilantes
    const iceColors = ['#ffffff', '#cffafe', '#7dd3fc', '#38bdf8', '#0284c7'];
    for (let i = 0; i < 2; i++) {
      this.trailParticles.push({
        x: curX - 8 + (Math.random() * 4 - 2),
        y: curY + (Math.random() * 8 - 4),
        vx: -(12 + Math.random() * 25),
        vy: (Math.random() - 0.5) * 12,
        alpha: 0.95,
        size: 2 + Math.random() * 2,
        color: iceColors[Math.floor(Math.random() * iceColors.length)],
      });
    }

    // Atualizar partículas de gelo
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const tp = this.trailParticles[i];
      tp.x += tp.vx * dt;
      tp.y += tp.vy * dt;
      tp.alpha -= 3.0 * dt;
      if (tp.alpha <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = Math.min(1, this.elapsedMs / this.durationMs);
    const target = this.impactPos || this.targetProvider();
    const curX = this.startPos.x + (target.x - this.startPos.x) * progress;
    const curY = this.startPos.y + (target.y - this.startPos.y) * progress;
    const angle = Math.atan2(target.y - this.startPos.y, target.x - this.startPos.x);

    ctx.save();

    // 1. Rastro de Cristais de Gelo
    for (const tp of this.trailParticles) {
      ctx.globalAlpha = Math.max(0, tp.alpha);
      ctx.fillStyle = tp.color;
      ctx.fillRect(tp.x, tp.y, tp.size, tp.size);
    }

    // 2. Orbe de Gelo Pixel Art (Img 4)
    ctx.globalAlpha = 1.0;
    drawIceOrbComet(ctx, curX, curY, angle, 1.35);

    // 3. Impacto Gélido (Anel de Congelamento diretamente no monstro)
    if (progress > 0.75) {
      const slowProg = (progress - 0.75) / 0.25;
      const alpha = Math.max(0, 1 - slowProg);
      const impact = this.impactPos || target;

      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, 18 * slowProg, 0, Math.PI * 2);
      ctx.stroke();

      // Cristais de geada se espalhando
      ctx.fillStyle = `rgba(207, 250, 254, ${alpha})`;
      ctx.fillRect(impact.x + 8 * slowProg, impact.y - 8 * slowProg, 3, 3);
      ctx.fillRect(impact.x - 10 * slowProg, impact.y + 6 * slowProg, 3, 3);
      ctx.fillRect(impact.x + 6 * slowProg, impact.y + 10 * slowProg, 2, 2);
      ctx.fillRect(impact.x - 8 * slowProg, impact.y - 10 * slowProg, 2, 2);
    }

    ctx.restore();
  }
}

