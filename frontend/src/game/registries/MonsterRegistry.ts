import { drawMissingMonster } from '../renderers/monsters/common';
import {
  tier1MonsterVisuals,
  tier2MonsterVisuals,
  tier3MonsterVisuals,
  tier4MonsterVisuals,
  tier5MonsterVisuals,
} from '../renderers/monsters';
import { Registry, normalizeRegistryKey } from './Registry';

export interface MonsterRenderOptions {
  time?: number;
  walkStep?: number;
  isMoving?: boolean;
  hitFlash?: boolean;
  state?: string;
  isAttacking?: boolean;
  attackProgress?: number;
}

export type MonsterRenderer = (
  ctx: CanvasRenderingContext2D,
  size: number,
  options?: MonsterRenderOptions
) => void;

export interface MonsterVisualDefinition {
  key: string;
  aliases?: readonly string[];
  biomeKey?: string;
  projectile?: { color: string; type: 'fireball' | 'arrow' | 'slash' | 'lollipop' };
  /** Escala visual independente do tamanho lógico e da colisão. */
  visualScale?: number;
  /** Altura base da placa de nome quando o sprite extrapola seu corpo. */
  nameplateOffsetY?: number;
  render: MonsterRenderer;
}

class MonsterVisualRegistry extends Registry<MonsterVisualDefinition> {
  public render(
    ctx: CanvasRenderingContext2D,
    visualKey: string,
    size: number,
    options?: MonsterRenderOptions
  ): void {
    const normalizedKey = normalizeRegistryKey(visualKey);
    const definition = this.get(normalizedKey);
    if (!definition) {
      drawMissingMonster(ctx, size, normalizedKey || 'unknown');
      return;
    }
    definition.render(ctx, size, options);
  }

  public getProjectile(visualKey: string): { color: string; type: 'fireball' | 'arrow' | 'slash' | 'lollipop' } {
    return this.get(visualKey)?.projectile ?? { color: '#a855f7', type: 'fireball' };
  }

  public getBiomeKey(visualKey: string): string | undefined {
    return this.get(visualKey)?.biomeKey;
  }

  public getVisualScale(visualKey: string): number {
    const scale = this.get(visualKey)?.visualScale ?? 1;
    return Number.isFinite(scale) ? Math.max(0.55, Math.min(2, scale)) : 1;
  }

  public getNameplateOffsetY(visualKey: string, fallback: number): number {
    const offset = this.get(visualKey)?.nameplateOffsetY ?? fallback;
    return Number.isFinite(offset) ? Math.max(16, offset) : fallback;
  }
}

/**
 * Fonte única do roteamento visual de monstros.
 * Para adicionar um monstro, registre seu renderer no módulo do tier/tema;
 * GameViewport e PixelArtRenderer não precisam ser alterados.
 */
export const monsterRegistry = new MonsterVisualRegistry().registerAll([
  ...tier1MonsterVisuals,
  ...tier2MonsterVisuals,
  ...tier3MonsterVisuals,
  ...tier4MonsterVisuals,
  ...tier5MonsterVisuals,
]);