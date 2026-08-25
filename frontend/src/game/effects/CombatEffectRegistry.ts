import { CombatEffectEvent, Position, VisualEffect } from './types';
import { WhirlwindEffect, BrutalStrikeEffect, BloodSplashEffect } from './renderers/meleeEffects';
import { MultishotEffect, SniperShotEffect } from './renderers/rangedEffects';
import { ArcaneNovaEffect, FireballEffect, IceShardEffect } from './renderers/magicEffects';
import { DivineHealEffect } from './renderers/commonEffects';

export class CombatEffectRegistry {
  private activeEffects: VisualEffect[] = [];

  public spawnEffect(
    event: CombatEffectEvent,
    heroPos: Position,
    monsterPositions: Map<string, Position>,
    targetPosResolver?: (targetId?: string) => Position,
    heroPosResolver?: () => Position
  ): void {
    const firstTargetId = event.target_ids && event.target_ids.length > 0 ? event.target_ids[0] : undefined;
    const dynamicTargetProvider = targetPosResolver
      ? () => targetPosResolver(firstTargetId)
      : () => this.resolvePrimaryTargetPosition(event, monsterPositions, heroPos);

    const dynamicHeroProvider = heroPosResolver || (() => heroPos);

    switch (event.key) {
      case 'whirlwind':
        this.activeEffects.push(new WhirlwindEffect(dynamicHeroProvider));
        break;

      case 'brutal_strike':
        this.activeEffects.push(new BrutalStrikeEffect(dynamicTargetProvider));
        break;

      case 'blood_splash':
        this.activeEffects.push(new BloodSplashEffect(dynamicTargetProvider));
        break;

      case 'multishot': {
        const targetProviders: Array<Position | (() => Position)> = [];
        if (event.target_ids && event.target_ids.length > 0) {
          for (const id of event.target_ids) {
            if (targetPosResolver) {
              targetProviders.push(() => targetPosResolver(id));
            } else {
              const pos = monsterPositions.get(id);
              if (pos) targetProviders.push(pos);
            }
          }
        }
        if (targetProviders.length === 0) {
          targetProviders.push(dynamicTargetProvider);
        }
        this.activeEffects.push(new MultishotEffect(heroPos, targetProviders));
        break;
      }

      case 'sniper_shot':
        this.activeEffects.push(new SniperShotEffect(heroPos, dynamicTargetProvider));
        break;

      case 'fireball':
        this.activeEffects.push(new FireballEffect(heroPos, dynamicTargetProvider));
        break;

      case 'ice_shard':
        this.activeEffects.push(new IceShardEffect(heroPos, dynamicTargetProvider));
        break;

      case 'arcane_nova':
        this.activeEffects.push(new ArcaneNovaEffect(dynamicHeroProvider, dynamicTargetProvider));
        break;

      case 'divine_heal':
        this.activeEffects.push(new DivineHealEffect(heroPos));
        break;
    }
  }

  public spawnBloodSplash(targetProvider: Position | (() => Position)): void {
    this.activeEffects.push(new BloodSplashEffect(targetProvider));
  }

  public update(deltaMs: number): void {
    for (const eff of this.activeEffects) {
      eff.update(deltaMs);
    }
    this.activeEffects = this.activeEffects.filter((eff) => !eff.isFinished);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const eff of this.activeEffects) {
      eff.render(ctx);
    }
  }

  public clear(): void {
    this.activeEffects = [];
  }

  private resolvePrimaryTargetPosition(
    event: CombatEffectEvent,
    monsterPositions: Map<string, Position>,
    heroPos: Position
  ): Position {
    if (event.target_ids && event.target_ids.length > 0) {
      const firstTarget = event.target_ids[0];
      const pos = monsterPositions.get(firstTarget);
      if (pos) return pos;
    }
    // Fallback: se houver monstros no mapa, pega o primeiro
    for (const pos of monsterPositions.values()) {
      return pos;
    }
    // Padrão: 180px à frente do herói
    return { x: heroPos.x + 180, y: heroPos.y };
  }
}
