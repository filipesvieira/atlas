import { CombatEffectEvent, Position, VisualEffect } from './types';
import { WhirlwindEffect, BrutalStrikeEffect } from './renderers/meleeEffects';
import { MultishotEffect, SniperShotEffect } from './renderers/rangedEffects';
import { FireballEffect, IceShardEffect } from './renderers/magicEffects';
import { DivineHealEffect } from './renderers/commonEffects';

export class CombatEffectRegistry {
  private activeEffects: VisualEffect[] = [];

  public spawnEffect(
    event: CombatEffectEvent,
    heroPos: Position,
    monsterPositions: Map<string, Position>
  ): void {
    const targetPos = this.resolvePrimaryTargetPosition(event, monsterPositions, heroPos);

    switch (event.key) {
      case 'whirlwind':
        this.activeEffects.push(new WhirlwindEffect(heroPos));
        break;

      case 'brutal_strike':
        this.activeEffects.push(new BrutalStrikeEffect(targetPos));
        break;

      case 'multishot': {
        const targetList: Position[] = [];
        if (event.target_ids && event.target_ids.length > 0) {
          for (const id of event.target_ids) {
            const pos = monsterPositions.get(id);
            if (pos) targetList.push(pos);
          }
        }
        if (targetList.length === 0) {
          targetList.push(targetPos);
        }
        this.activeEffects.push(new MultishotEffect(heroPos, targetList));
        break;
      }

      case 'sniper_shot':
        this.activeEffects.push(new SniperShotEffect(heroPos, targetPos));
        break;

      case 'fireball':
        this.activeEffects.push(new FireballEffect(heroPos, targetPos));
        break;

      case 'ice_shard':
        this.activeEffects.push(new IceShardEffect(heroPos, targetPos));
        break;

      case 'divine_heal':
        this.activeEffects.push(new DivineHealEffect(heroPos));
        break;
    }
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
