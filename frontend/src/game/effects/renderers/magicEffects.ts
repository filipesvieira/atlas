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

export class ArcaneNovaEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private startProvider: () => Position;
  private targetProvider: () => Position;
  private impactPos: Position | null = null;
  private elapsedMs = 0;
  private readonly travelDurationMs = 360;
  private readonly impactDurationMs = 720;
  private trailParticles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }> = [];
  private particles: Array<{ angle: number; speed: number; distance: number; size: number; color: string }>;

  constructor(startPosOrProvider: Position | (() => Position), targetPosOrProvider: Position | (() => Position)) {
    this.id = 'arcane_nova_' + Math.random().toString(36).substring(2, 9);
    this.startProvider = typeof startPosOrProvider === 'function' ? startPosOrProvider : () => startPosOrProvider;
    this.targetProvider = typeof targetPosOrProvider === 'function' ? targetPosOrProvider : () => targetPosOrProvider;
    const colors = ['#ffffff', '#f5d0fe', '#e879f9', '#c084fc', '#60a5fa'];
    this.particles = Array.from({ length: 32 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 32,
      speed: 34 + Math.random() * 56,
      distance: 8 + Math.random() * 18,
      size: 2 + Math.random() * 2,
      color: colors[index % colors.length],
    }));
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    const totalDuration = this.travelDurationMs + this.impactDurationMs;
    if (this.elapsedMs >= totalDuration) {
      this.isFinished = true;
      return;
    }

    const dt = deltaMs / 1000;
    const target = this.targetProvider();
    this.impactPos = this.elapsedMs <= this.travelDurationMs ? { ...target } : this.impactPos || { ...target };

    if (this.elapsedMs <= this.travelDurationMs) {
      const progress = Math.min(1, this.elapsedMs / this.travelDurationMs);
      const start = this.startProvider();
      const current = {
        x: start.x + (target.x - start.x) * progress,
        y: start.y + (target.y - start.y) * progress,
      };
      for (let index = 0; index < 3; index += 1) {
        this.trailParticles.push({
          x: current.x + (Math.random() * 10 - 5),
          y: current.y + (Math.random() * 10 - 5),
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 18,
          size: 2 + Math.random() * 2,
          alpha: 0.95,
          color: index % 2 === 0 ? '#e879f9' : '#60a5fa',
        });
      }
    }

    for (let index = this.trailParticles.length - 1; index >= 0; index -= 1) {
      const particle = this.trailParticles[index];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.alpha -= 3.2 * dt;
      if (particle.alpha <= 0) this.trailParticles.splice(index, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const impact = this.impactPos || this.targetProvider();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const particle of this.trailParticles) {
      ctx.globalAlpha = Math.max(0, particle.alpha);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }

    if (this.elapsedMs <= this.travelDurationMs) {
      const progress = Math.min(1, this.elapsedMs / this.travelDurationMs);
      const start = this.startProvider();
      const target = this.targetProvider();
      const current = {
        x: start.x + (target.x - start.x) * progress,
        y: start.y + (target.y - start.y) * progress,
      };
      const angle = Math.atan2(target.y - start.y, target.x - start.x);

      ctx.save();
      ctx.translate(current.x, current.y);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(-13, -3, 20, 6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(-7, -6, 12, 12);
      ctx.fillStyle = '#f5d0fe';
      ctx.fillRect(-4, -4, 7, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -2, 3, 4);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      const impactProgress = Math.min(1, (this.elapsedMs - this.travelDurationMs) / this.impactDurationMs);
      const alpha = Math.max(0, 1 - impactProgress);
      const flashProgress = Math.min(1, (this.elapsedMs - this.travelDurationMs) / 150);

      ctx.save();
      ctx.translate(impact.x, impact.y);

      // Flash central e núcleo cristalino tornam o impacto distinguível do
      // projétil básico da varinha/cajado, mesmo em hordas aglomeradas.
      if (flashProgress < 1) {
        ctx.globalAlpha = (1 - flashProgress) * 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(-15, -3, 30, 6);
        ctx.fillRect(-3, -15, 6, 30);
      }

      ctx.globalAlpha = alpha;
      for (let ring = 0; ring < 3; ring += 1) {
        const ringProgress = Math.min(1, impactProgress + ring * 0.12);
        ctx.strokeStyle = ring === 1 ? '#60a5fa' : '#e879f9';
        ctx.lineWidth = ring === 1 ? 2 : 3;
        ctx.beginPath();
        ctx.arc(0, 0, 10 + ringProgress * (38 + ring * 11), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Quatro runas quadradas orbitam o centro durante a dissipação.
      const runeRadius = 16 + impactProgress * 25;
      for (let index = 0; index < 4; index += 1) {
        const runeAngle = (Math.PI / 2) * index + impactProgress * 1.8;
        const runeX = Math.cos(runeAngle) * runeRadius;
        const runeY = Math.sin(runeAngle) * runeRadius * 0.65;
        ctx.fillStyle = index % 2 === 0 ? '#f5d0fe' : '#93c5fd';
        ctx.fillRect(runeX - 3, runeY - 3, 6, 6);
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(runeX - 1, runeY - 1, 2, 2);
      }

      for (const particle of this.particles) {
        const distance = particle.distance + impactProgress * particle.speed;
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = particle.color;
        ctx.fillRect(
          Math.cos(particle.angle) * distance - particle.size / 2,
          Math.sin(particle.angle) * distance * 0.65 - particle.size / 2,
          particle.size,
          particle.size,
        );
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#581c87';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillRect(-6, -2, 12, 4);
      ctx.restore();
    }
    ctx.restore();
  }
}