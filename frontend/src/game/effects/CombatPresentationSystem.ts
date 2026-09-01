import type { Position } from './types';

export type ScreenShakeMode = 'off' | 'low' | 'normal';
export type CombatImpactWeight = 'light' | 'medium' | 'heavy' | 'finisher';
export type CombatImpactFlavor = 'slash' | 'blunt' | 'pierce' | 'arcane' | 'fire' | 'ice' | 'holy' | 'generic';

const SCREEN_SHAKE_STORAGE_KEY = 'atlas.combat.screen_shake';

export function getScreenShakeMode(): ScreenShakeMode {
  if (typeof window === 'undefined') return 'normal';
  const stored = window.localStorage.getItem(SCREEN_SHAKE_STORAGE_KEY);
  if (stored === 'off' || stored === 'low' || stored === 'normal') return stored;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'low' : 'normal';
}

export function setScreenShakeMode(mode: ScreenShakeMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SCREEN_SHAKE_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent('atlas:combat-feedback-settings', { detail: { screenShake: mode } }));
}

export function nextScreenShakeMode(mode: ScreenShakeMode): ScreenShakeMode {
  if (mode === 'normal') return 'low';
  if (mode === 'low') return 'off';
  return 'normal';
}

export interface CombatImpactProfile {
  weight: CombatImpactWeight;
  flavor: CombatImpactFlavor;
  hitStopMs: number;
  shakeStrength: number;
  shakeDurationMs: number;
  sparkCount: number;
  sparkLifetimeMs: number;
  visualKnockbackPx: number;
  staggerMs: number;
}

export interface CombatImpactProfileInput {
  archetype?: string;
  weaponType?: string;
  weaponName?: string;
  skillKey?: string;
  isCritical?: boolean;
  isLethal?: boolean;
  isHealing?: boolean;
}

const flavorFor = (input: CombatImpactProfileInput): CombatImpactFlavor => {
  const skill = (input.skillKey || '').toLowerCase();
  const weapon = `${input.weaponType || ''} ${input.weaponName || ''}`.toLowerCase();
  if (input.isHealing || skill === 'divine_heal') return 'holy';
  if (skill === 'fireball' || weapon.includes('fire')) return 'fire';
  if (skill === 'ice_shard' || weapon.includes('ice')) return 'ice';
  if (skill === 'arcane_nova' || input.archetype === 'magic' || weapon.includes('wand') || weapon.includes('staff') || weapon.includes('varinha') || weapon.includes('cajado')) return 'arcane';
  if (input.archetype === 'distance' || weapon.includes('bow') || weapon.includes('arco')) return 'pierce';
  if (weapon.includes('club') || weapon.includes('hammer') || weapon.includes('martelo') || weapon.includes('mace') || weapon.includes('maça')) return 'blunt';
  return 'slash';
};

const baseWeightFor = (input: CombatImpactProfileInput): CombatImpactWeight => {
  const skill = (input.skillKey || '').toLowerCase();
  const weapon = `${input.weaponType || ''} ${input.weaponName || ''}`.toLowerCase();
  if (input.isLethal) return 'finisher';
  if (skill === 'brutal_strike' || skill === 'sniper_shot' || skill === 'fireball') return 'heavy';
  if (skill === 'whirlwind' || skill === 'arcane_nova' || skill === 'multishot') return 'medium';
  if (weapon.includes('club') || weapon.includes('hammer') || weapon.includes('martelo') || weapon.includes('mace') || weapon.includes('maça') || weapon.includes('axe') || weapon.includes('machado')) return 'heavy';
  if (input.archetype === 'distance') return 'light';
  if (input.archetype === 'magic') return 'medium';
  return 'medium';
};

export function resolveCombatImpactProfile(input: CombatImpactProfileInput): CombatImpactProfile {
  if (input.isHealing) {
    return {
      weight: 'light', flavor: 'holy', hitStopMs: 0, shakeStrength: 0, shakeDurationMs: 0,
      sparkCount: 7, sparkLifetimeMs: 260, visualKnockbackPx: 0, staggerMs: 0,
    };
  }

  const weight = baseWeightFor(input);
  const flavor = flavorFor(input);
  const table: Record<CombatImpactWeight, Omit<CombatImpactProfile, 'weight' | 'flavor'>> = {
    light: { hitStopMs: 34, shakeStrength: 0.65, shakeDurationMs: 90, sparkCount: 6, sparkLifetimeMs: 185, visualKnockbackPx: 2, staggerMs: 75 },
    medium: { hitStopMs: 48, shakeStrength: 1.15, shakeDurationMs: 120, sparkCount: 9, sparkLifetimeMs: 220, visualKnockbackPx: 3.5, staggerMs: 105 },
    heavy: { hitStopMs: 72, shakeStrength: 1.9, shakeDurationMs: 155, sparkCount: 13, sparkLifetimeMs: 270, visualKnockbackPx: 5.5, staggerMs: 145 },
    finisher: { hitStopMs: 110, shakeStrength: 2.8, shakeDurationMs: 210, sparkCount: 18, sparkLifetimeMs: 340, visualKnockbackPx: 9, staggerMs: 220 },
  };
  const profile: CombatImpactProfile = { weight, flavor, ...table[weight] };

  if (input.isCritical && weight !== 'finisher') {
    profile.hitStopMs = Math.min(96, profile.hitStopMs + 24);
    profile.shakeStrength *= 1.35;
    profile.shakeDurationMs += 35;
    profile.sparkCount += 5;
    profile.visualKnockbackPx += 2;
    profile.staggerMs += 40;
  }
  return profile;
}

interface ImpactSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  ageMs: number;
  lifetimeMs: number;
  color: string;
}

interface ImpactBurst {
  x: number;
  y: number;
  ageMs: number;
  lifetimeMs: number;
  maxRadius: number;
  color: string;
  secondary: string;
}

interface ScheduledImpact {
  remainingMs: number;
  position: () => Position;
  sourcePosition?: () => Position;
  input: CombatImpactProfileInput;
  onImpact?: (profile: CombatImpactProfile, direction: Position) => void;
}

const colorsForFlavor = (flavor: CombatImpactFlavor): [string, string, string] => {
  switch (flavor) {
    case 'slash': return ['#ffffff', '#e2e8f0', '#fca5a5'];
    case 'blunt': return ['#fef3c7', '#d6d3d1', '#a8a29e'];
    case 'pierce': return ['#ffffff', '#fde047', '#cbd5e1'];
    case 'arcane': return ['#ffffff', '#c084fc', '#60a5fa'];
    case 'fire': return ['#fef3c7', '#f59e0b', '#ef4444'];
    case 'ice': return ['#ffffff', '#7dd3fc', '#38bdf8'];
    case 'holy': return ['#ffffff', '#fde68a', '#6ee7b7'];
    default: return ['#ffffff', '#e2e8f0', '#94a3b8'];
  }
};

/**
 * CFF-A: relógio e feedback exclusivamente visuais. Nenhum método desta classe
 * altera HP, dano, cooldown, posição em grid ou qualquer estado autoritativo.
 */
export class CombatPresentationSystem {
  private hitStopRemainingMs = 0;
  private shakeRemainingMs = 0;
  private shakeDurationMs = 1;
  private shakeStrength = 0;
  private sparks: ImpactSpark[] = [];
  private bursts: ImpactBurst[] = [];
  private scheduled: ScheduledImpact[] = [];

  public scheduleImpact(
    delayMs: number,
    position: () => Position,
    input: CombatImpactProfileInput,
    sourcePosition?: () => Position,
    onImpact?: (profile: CombatImpactProfile, direction: Position) => void,
  ): void {
    this.scheduled.push({ remainingMs: Math.max(0, delayMs), position, sourcePosition, input, onImpact });
  }

  public triggerImpact(
    position: Position,
    input: CombatImpactProfileInput,
  ): CombatImpactProfile {
    const profile = resolveCombatImpactProfile(input);
    this.spawnImpact(position, profile);
    return profile;
  }

  private triggerScheduled(impact: ScheduledImpact): void {
    const target = impact.position();
    const source = impact.sourcePosition?.();
    const profile = this.triggerImpact(target, impact.input);
    const dx = source ? target.x - source.x : 1;
    const dy = source ? target.y - source.y : 0;
    const length = Math.max(0.0001, Math.hypot(dx, dy));
    impact.onImpact?.(profile, { x: dx / length, y: dy / length });
  }

  private spawnImpact(position: Position, profile: CombatImpactProfile): void {
    this.hitStopRemainingMs = Math.max(this.hitStopRemainingMs, profile.hitStopMs);
    this.shakeRemainingMs = Math.max(this.shakeRemainingMs, profile.shakeDurationMs);
    this.shakeDurationMs = Math.max(this.shakeDurationMs, profile.shakeDurationMs);
    this.shakeStrength = Math.max(this.shakeStrength, profile.shakeStrength);

    const [primary, secondary, tertiary] = colorsForFlavor(profile.flavor);
    const radius = profile.weight === 'finisher' ? 28 : profile.weight === 'heavy' ? 20 : profile.weight === 'medium' ? 15 : 11;
    this.bursts.push({
      x: position.x, y: position.y, ageMs: 0,
      lifetimeMs: profile.weight === 'finisher' ? 260 : 170,
      maxRadius: radius, color: primary, secondary,
    });

    for (let index = 0; index < profile.sparkCount; index += 1) {
      // A distribuição visual não participa de replay/dano e pode variar entre clientes.
      const angle = (Math.PI * 2 * index) / Math.max(1, profile.sparkCount) + (Math.random() - 0.5) * 0.45;
      const speedBase = profile.weight === 'finisher' ? 72 : profile.weight === 'heavy' ? 58 : profile.weight === 'medium' ? 45 : 34;
      const speed = speedBase * (0.65 + Math.random() * 0.7);
      this.sparks.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.68 - 8,
        size: 1 + Math.random() * (profile.weight === 'finisher' ? 3.2 : 2.3),
        ageMs: 0,
        lifetimeMs: profile.sparkLifetimeMs * (0.82 + Math.random() * 0.3),
        color: index % 3 === 0 ? tertiary : index % 2 === 0 ? secondary : primary,
      });
    }
  }

  /** Avança somente o relógio de apresentação e devolve o delta visual. */
  public advance(realDeltaSeconds: number): number {
    const realMs = Math.max(0, realDeltaSeconds * 1000);

    for (let index = this.scheduled.length - 1; index >= 0; index -= 1) {
      const item = this.scheduled[index];
      item.remainingMs -= realMs;
      if (item.remainingMs <= 0) {
        this.scheduled.splice(index, 1);
        this.triggerScheduled(item);
      }
    }

    const wasStopped = this.hitStopRemainingMs > 0;
    this.hitStopRemainingMs = Math.max(0, this.hitStopRemainingMs - realMs);
    this.shakeRemainingMs = Math.max(0, this.shakeRemainingMs - realMs);
    if (this.shakeRemainingMs <= 0) {
      this.shakeStrength = 0;
      this.shakeDurationMs = 1;
    }

    // Sparks/bursts congelam junto do hit stop. O shake usa tempo real para não
    // prolongar desconfortavelmente um impacto em máquinas lentas.
    const visualDeltaSeconds = wasStopped ? 0 : realDeltaSeconds;
    const visualMs = visualDeltaSeconds * 1000;
    for (let index = this.sparks.length - 1; index >= 0; index -= 1) {
      const spark = this.sparks[index];
      spark.ageMs += visualMs;
      spark.x += spark.vx * visualDeltaSeconds;
      spark.y += spark.vy * visualDeltaSeconds;
      spark.vy += 85 * visualDeltaSeconds;
      if (spark.ageMs >= spark.lifetimeMs) this.sparks.splice(index, 1);
    }
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      const burst = this.bursts[index];
      burst.ageMs += visualMs;
      if (burst.ageMs >= burst.lifetimeMs) this.bursts.splice(index, 1);
    }
    return visualDeltaSeconds;
  }

  public applyScreenShake(ctx: CanvasRenderingContext2D, nowMs: number): void {
    if (this.shakeRemainingMs <= 0 || this.shakeStrength <= 0) return;
    const mode = getScreenShakeMode();
    if (mode === 'off') return;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const settingMultiplier = mode === 'low' ? 0.42 : 1;
    const motionMultiplier = reducedMotion ? 0.5 : 1;
    const envelope = Math.min(1, this.shakeRemainingMs / Math.max(1, this.shakeDurationMs));
    const amplitude = this.shakeStrength * settingMultiplier * motionMultiplier * envelope;
    const x = Math.round(Math.sin(nowMs * 0.091) * amplitude);
    const y = Math.round(Math.cos(nowMs * 0.127) * amplitude * 0.72);
    ctx.translate(x, y);
  }

  public renderWorld(ctx: CanvasRenderingContext2D): void {
    for (const burst of this.bursts) {
      const progress = Math.min(1, burst.ageMs / Math.max(1, burst.lifetimeMs));
      const alpha = 1 - progress;
      const radius = 3 + burst.maxRadius * progress;
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = burst.color;
      ctx.lineWidth = progress < 0.45 ? 2 : 1;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      if (progress < 0.34) {
        ctx.globalAlpha = (0.34 - progress) * 2.4;
        ctx.fillStyle = burst.secondary;
        ctx.fillRect(Math.round(burst.x) - 5, Math.round(burst.y) - 1, 11, 3);
        ctx.fillRect(Math.round(burst.x) - 1, Math.round(burst.y) - 5, 3, 11);
      }
      ctx.restore();
    }

    for (const spark of this.sparks) {
      const progress = Math.min(1, spark.ageMs / Math.max(1, spark.lifetimeMs));
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.fillStyle = spark.color;
      ctx.fillRect(Math.round(spark.x - spark.size / 2), Math.round(spark.y - spark.size / 2), Math.max(1, Math.round(spark.size)), Math.max(1, Math.round(spark.size)));
      ctx.restore();
    }
  }

  public clear(): void {
    this.hitStopRemainingMs = 0;
    this.shakeRemainingMs = 0;
    this.shakeDurationMs = 1;
    this.shakeStrength = 0;
    this.sparks = [];
    this.bursts = [];
    this.scheduled = [];
  }
}
