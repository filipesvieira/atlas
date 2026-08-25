import { Position, VisualEffect } from '../types';
import { drawWhirlwindVortex, drawSeismicExplosion, drawBloodSplash } from './projectileSprites';

export class WhirlwindEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private heroPosProvider: () => Position;
  private durationMs = 550;
  private elapsedMs = 0;

  constructor(heroPosOrProvider: Position | (() => Position)) {
    this.id = 'whirlwind_' + Math.random().toString(36).substring(2, 9);
    if (typeof heroPosOrProvider === 'function') {
      this.heroPosProvider = heroPosOrProvider;
    } else {
      this.heroPosProvider = () => heroPosOrProvider;
    }
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs >= this.durationMs) {
      this.isFinished = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = Math.min(1.0, this.elapsedMs / this.durationMs);
    const alpha = Math.max(0, 1.0 - progress);
    const heroPos = this.heroPosProvider();

    // Renderizar Vórtice Cósmico Neon Magenta/Violeta 360° (Img 2)
    drawWhirlwindVortex(ctx, heroPos.x, heroPos.y, progress, alpha, 1.15);
  }
}

export class BrutalStrikeEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private targetProvider: () => Position;
  private impactPos: Position | null = null;
  private durationMs = 480;
  private elapsedMs = 0;
  private debrisParticles: Array<{ x: number; y: number; vx: number; vy: number; size: number; color: string }>;

  constructor(targetPosOrProvider: Position | (() => Position)) {
    this.id = 'brutal_' + Math.random().toString(36).substring(2, 9);
    if (typeof targetPosOrProvider === 'function') {
      this.targetProvider = targetPosOrProvider;
    } else {
      this.targetProvider = () => targetPosOrProvider;
    }

    const debrisColors = ['#fde047', '#f97316', '#dc2626', '#450a0a', '#ffffff'];
    this.debrisParticles = [];
    for (let i = 0; i < 16; i++) {
      const angle = -Math.PI * 0.85 + Math.random() * Math.PI * 0.7; // Dispersão ascendente
      const speed = 35 + Math.random() * 75;
      this.debrisParticles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
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
    const target = this.targetProvider();
    this.impactPos = { ...target };

    for (const d of this.debrisParticles) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 80 * dt; // Gravidade dos escombros
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = Math.min(1.0, this.elapsedMs / this.durationMs);
    const alpha = Math.max(0, 1.0 - progress);
    const target = this.impactPos || this.targetProvider();

    ctx.save();

    // 1. Explosão Sísmica Pixel Art (Img 1)
    drawSeismicExplosion(ctx, target.x, target.y + 4, progress, alpha, 1.6);

    // 2. Onda de Choque Sísmica no Solo
    ctx.strokeStyle = `rgba(249, 115, 22, ${alpha * 0.85})`;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.ellipse(target.x, target.y + 12, (20 + progress * 40), (8 + progress * 16), 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Escombros e Faíscas Ascendentes
    ctx.translate(target.x, target.y);
    for (const d of this.debrisParticles) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.fillRect(d.x, d.y, d.size, d.size);
    }

    ctx.restore();
  }
}

export class BloodSplashEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private targetProvider: () => Position;
  private durationMs = 380;
  private elapsedMs = 0;
  private droplets: Array<{ x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number }>;

  constructor(targetPosOrProvider: Position | (() => Position)) {
    this.id = 'blood_' + Math.random().toString(36).substring(2, 9);
    if (typeof targetPosOrProvider === 'function') {
      this.targetProvider = targetPosOrProvider;
    } else {
      this.targetProvider = () => targetPosOrProvider;
    }

    const bloodColors = ['#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#7f1d1d'];
    this.droplets = [];
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI * 0.9 + Math.random() * Math.PI * 0.8;
      const speed = 25 + Math.random() * 60;
      this.droplets.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color: bloodColors[Math.floor(Math.random() * bloodColors.length)],
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
    for (const d of this.droplets) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 90 * dt; // Gravidade das gotas
      d.alpha = Math.max(0, 1.0 - this.elapsedMs / this.durationMs);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = Math.min(1.0, this.elapsedMs / this.durationMs);
    const alpha = Math.max(0, 1.0 - progress);
    const target = this.targetProvider();

    ctx.save();

    // 1. Splash Central de Sangue (Img 3)
    drawBloodSplash(ctx, target.x, target.y - 4, progress, alpha);

    // 2. Gotas de Sangue Espirradas em Arco
    ctx.translate(target.x, target.y - 4);
    for (const d of this.droplets) {
      ctx.globalAlpha = Math.max(0, d.alpha);
      ctx.fillStyle = d.color;
      ctx.fillRect(d.x, d.y, d.size, d.size);
    }

    ctx.restore();
  }
}