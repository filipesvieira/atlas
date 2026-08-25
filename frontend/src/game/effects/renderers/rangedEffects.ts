import { Position, VisualEffect } from '../types';
import { drawEnchantedBloodArrow, drawSniperLaserBeam } from './projectileSprites';

interface MultishotArrowState {
  targetProvider: () => Position;
  impactPos: Position | null;
  spreadAngleRad: number; // Ângulo de dispersão do leque inicial
  spreadCurveOffset: number; // Altura do arco vertical
  trail: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }>;
  impactParticles: Array<{ x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number }>;
}

export class MultishotEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private startPos: Position;
  private arrows: MultishotArrowState[] = [];
  private travelDurationMs = 320;
  private explodeDurationMs = 220;
  private elapsedMs = 0;

  constructor(
    startPos: Position,
    targetProvidersOrPositions: Array<Position | (() => Position)>
  ) {
    this.id = 'multishot_' + Math.random().toString(36).substring(2, 9);
    this.startPos = { ...startPos };

    // Dispersão em leque / semi-círculo para as 4 flechas (-32°, -11°, +11°, +32°)
    const spreadOffsets = [-36, -12, 12, 36];
    const spreadAngles = [-0.38, -0.14, 0.14, 0.38];

    for (let i = 0; i < 4; i++) {
      const rawTarget = targetProvidersOrPositions.length > 0
        ? targetProvidersOrPositions[i % targetProvidersOrPositions.length]
        : { x: startPos.x + 220, y: startPos.y };

      const targetProvider: () => Position = typeof rawTarget === 'function'
        ? rawTarget
        : () => rawTarget;

      this.arrows.push({
        targetProvider,
        impactPos: null,
        spreadAngleRad: spreadAngles[i],
        spreadCurveOffset: spreadOffsets[i],
        trail: [],
        impactParticles: [],
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
    const travelProgress = Math.min(1.0, this.elapsedMs / this.travelDurationMs);

    for (let i = 0; i < this.arrows.length; i++) {
      const arrow = this.arrows[i];
      const target = arrow.targetProvider();

      if (travelProgress < 1.0) {
        // Arco parabólico de espalhamento em leque (semi-círculo)
        const curveProg = Math.sin(travelProgress * Math.PI);
        const curX = this.startPos.x + (target.x - this.startPos.x) * travelProgress;
        const curY = this.startPos.y + (target.y - this.startPos.y) * travelProgress + arrow.spreadCurveOffset * curveProg;

        arrow.impactPos = { ...target };

        // Gerar rastro / poeira cósmica mágica em tons de rosa e magenta (Img 2)
        const pinkColors = ['#ffffff', '#ffe4e6', '#fda4af', '#fb7185', '#f43f5e', '#be185d'];
        for (let k = 0; k < 2; k++) {
          arrow.trail.push({
            x: curX + (Math.random() * 4 - 2),
            y: curY + (Math.random() * 4 - 2),
            vx: -(12 + Math.random() * 20),
            vy: (Math.random() - 0.5) * 12,
            alpha: 0.95,
            size: 1.5 + Math.random() * 2.2,
            color: pinkColors[Math.floor(Math.random() * pinkColors.length)],
          });
        }
      } else if (arrow.impactParticles.length === 0) {
        // Ao colidir no monstro: Gerar explosão de impacto mágica rosa choque
        const hitColors = ['#ffffff', '#fda4af', '#fb7185', '#f43f5e', '#e11d48'];
        for (let k = 0; k < 10; k++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 30 + Math.random() * 55;
          arrow.impactParticles.push({
            x: 0,
            y: 0,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd * 0.7,
            size: 1.8 + Math.random() * 2.2,
            color: hitColors[Math.floor(Math.random() * hitColors.length)],
            alpha: 1.0,
          });
        }
      }

      // Atualizar rastro
      for (let ti = arrow.trail.length - 1; ti >= 0; ti--) {
        const tp = arrow.trail[ti];
        tp.x += tp.vx * dt;
        tp.y += tp.vy * dt;
        tp.alpha -= 3.6 * dt;
        if (tp.alpha <= 0) {
          arrow.trail.splice(ti, 1);
        }
      }

      // Atualizar partículas de impacto
      for (const ip of arrow.impactParticles) {
        ip.x += ip.vx * dt;
        ip.y += ip.vy * dt;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const travelProgress = Math.min(1.0, this.elapsedMs / this.travelDurationMs);
    const explodeProgress = Math.max(0, (this.elapsedMs - this.travelDurationMs) / this.explodeDurationMs);

    ctx.save();

    for (let i = 0; i < this.arrows.length; i++) {
      const arrow = this.arrows[i];

      // 1. Rastro de partículas mágicas rosa choque
      for (const tp of arrow.trail) {
        ctx.globalAlpha = Math.max(0, tp.alpha);
        ctx.fillStyle = tp.color;
        ctx.fillRect(tp.x, tp.y, tp.size, tp.size);
      }

      const target = arrow.impactPos || arrow.targetProvider();

      if (travelProgress < 1.0) {
        // 2. Voo da Flecha Encantada (Img 2)
        const curveProg = Math.sin(travelProgress * Math.PI);
        const curX = this.startPos.x + (target.x - this.startPos.x) * travelProgress;
        const curY = this.startPos.y + (target.y - this.startPos.y) * travelProgress + arrow.spreadCurveOffset * curveProg;

        // Calcular ângulo tangente da trajetória
        const nextProg = Math.min(1.0, travelProgress + 0.05);
        const nextCurve = Math.sin(nextProg * Math.PI);
        const nextX = this.startPos.x + (target.x - this.startPos.x) * nextProg;
        const nextY = this.startPos.y + (target.y - this.startPos.y) * nextProg + arrow.spreadCurveOffset * nextCurve;
        const facingAngle = Math.atan2(nextY - curY, nextX - curX);

        ctx.globalAlpha = 1.0;
        drawEnchantedBloodArrow(ctx, curX, curY, facingAngle, 1.35);
      } else {
        // 3. Impacto e Explosão Mágica no Monstro
        const alpha = Math.max(0, 1 - explodeProgress);
        const impact = arrow.impactPos || target;

        ctx.save();
        ctx.translate(impact.x, impact.y);

        // Onda de choque de energia rosa neon
        ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * 0.9})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, 6 + explodeProgress * 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(253, 164, 175, ${alpha * 0.7})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 4 + explodeProgress * 12, 0, Math.PI * 2);
        ctx.stroke();

        // Partículas de explosão
        for (const ip of arrow.impactParticles) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = ip.color;
          ctx.fillRect(ip.x, ip.y, ip.size, ip.size);
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }
}

export class SniperShotEffect implements VisualEffect {
  id: string;
  isFinished = false;
  private startPos: Position;
  private targetProvider: () => Position;
  private impactPos: Position | null = null;
  private laserTravelDurationMs = 150;
  private beamFadeDurationMs = 200;
  private elapsedMs = 0;
  private impactSparks: Array<{ vx: number; vy: number; x: number; y: number; size: number; color: string }> = [];

  constructor(
    startPos: Position,
    targetPosOrProvider: Position | (() => Position)
  ) {
    this.id = 'sniper_' + Math.random().toString(36).substring(2, 9);
    this.startPos = { ...startPos };
    if (typeof targetPosOrProvider === 'function') {
      this.targetProvider = targetPosOrProvider;
    } else {
      this.targetProvider = () => targetPosOrProvider;
    }

    const sparkColors = ['#ffffff', '#fef08a', '#facc15', '#f97316', '#dc2626'];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 85;
      this.impactSparks.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        x: 0,
        y: 0,
        size: 2 + Math.random() * 3,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      });
    }
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    const totalDuration = this.laserTravelDurationMs + this.beamFadeDurationMs;
    if (this.elapsedMs >= totalDuration) {
      this.isFinished = true;
      return;
    }

    const dt = deltaMs / 1000;
    const target = this.targetProvider();
    this.impactPos = { ...target };

    if (this.elapsedMs > this.laserTravelDurationMs) {
      for (const s of this.impactSparks) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const target = this.impactPos || this.targetProvider();
    const travelProg = Math.min(1.0, this.elapsedMs / this.laserTravelDurationMs);
    const fadeProg = Math.max(0, (this.elapsedMs - this.laserTravelDurationMs) / this.beamFadeDurationMs);
    const alpha = Math.max(0, 1.0 - fadeProg);

    const curX = this.startPos.x + (target.x - this.startPos.x) * travelProg;
    const curY = this.startPos.y + (target.y - this.startPos.y) * travelProg;

    // 1. Renderizar Feixe Laser Hiper-Veloz (Img 3)
    drawSniperLaserBeam(
      ctx,
      this.startPos.x,
      this.startPos.y,
      curX,
      curY,
      target.x,
      target.y,
      travelProg,
      alpha
    );

    // 2. Impacto e Explosão Solar no Monstro
    if (this.elapsedMs >= this.laserTravelDurationMs) {
      ctx.save();
      ctx.translate(target.x, target.y);

      // Onda de choque de laser incandescente
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.95})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 10 + fadeProg * 35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.9})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 6 + fadeProg * 22, 0, Math.PI * 2);
      ctx.stroke();

      // Faíscas de perfuração
      for (const s of this.impactSparks) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }

      ctx.restore();
    }
  }
}