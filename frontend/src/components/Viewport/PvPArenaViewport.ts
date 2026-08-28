import { heroRegistry } from '../../game/registries/HeroRegistry';
import { SkinRegistryService } from '../../game/registries/SkinRegistry';
import { CombatEffectRegistry } from '../../game/effects/CombatEffectRegistry';
import { drawRealArrow, drawWandStar } from '../../game/effects/renderers/projectileSprites';
import { ISO_ARENA_GEOMETRY, tileToScreen } from '../../game/IsoWorldGeometry';
import type { PvPCombatActor, PvPCombatEvent, PvPCombatSnapshot } from '../../hooks/useGameSocket';

interface RenderActor extends PvPCombatActor {
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  walkDistance: number;
  attackTimer: number;
  attackDuration: number;
  skillTimer: number;
  skillKey: string;
  hitFlashTimer: number;
  displayHealth: number;
}

interface ArenaProjectile {
  sourceID: string;
  targetID: string;
  kind: 'arrow' | 'magic';
  elapsed: number;
  duration: number;
}

interface PendingImpact {
  targetID: string;
  amount: number;
  isHealing: boolean;
  isCritical: boolean;
  remaining: number;
}

interface FloatingDamage {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  velocityX: number;
  velocityY: number;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 420;
const SERVER_PULSE_SECONDS = 0.25;

/**
 * Viewport exclusivamente visual da arena PvP. Ele recebe somente o snapshot
 * público da M3C: o servidor continua sendo a única autoridade de posição,
 * dano e resultado. O `GameViewport` de expedição permanece vivo abaixo dele.
 */
export class PvPArenaViewport {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private terrain: HTMLCanvasElement | null = null;
  private animationFrame: number | null = null;
  private destroyed = false;
  private actors = new Map<string, RenderActor>();
  private floatingDamage: FloatingDamage[] = [];
  private projectiles: ArenaProjectile[] = [];
  private pendingImpacts: PendingImpact[] = [];
  private effects = new CombatEffectRegistry();
  private processedEvents = new Set<string>();
  private matchID = '';
  private status = 'active';
  private winnerID = '';
  private tick = 0;
  private selfCharacterID = '';

  constructor(selfCharacterID: string) {
    this.selfCharacterID = selfCharacterID;
  }

  public init(container: HTMLDivElement) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.pointerEvents = 'none';

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    container.innerHTML = '';
    container.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = ctx;
    this.terrain = this.createTerrain();
    this.destroyed = false;

    let lastTime = performance.now();
    const loop = (now: number) => {
      if (this.destroyed) return;
      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      this.update(delta);
      this.render(now);
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  public setSnapshot(snapshot: PvPCombatSnapshot) {
    if (!snapshot?.match_id || snapshot.actors.length !== 2) return;
    const isFreshViewport = snapshot.match_id !== this.matchID;
    if (isFreshViewport) {
      this.matchID = snapshot.match_id;
      this.tick = 0;
      this.actors.clear();
      this.floatingDamage = [];
      this.projectiles = [];
      this.pendingImpacts = [];
      this.effects.clear();
      this.processedEvents.clear();
    }

    const knownActors = new Set<string>();
    for (const input of snapshot.actors) {
      knownActors.add(input.character_id);
      const position = tileToScreen(input.grid_x, input.grid_y, ISO_ARENA_GEOMETRY);
      const targetX = position.x;
      const targetY = position.y - ISO_ARENA_GEOMETRY.actorFootOffset;
      const previous = this.actors.get(input.character_id);
      if (!previous) {
        this.actors.set(input.character_id, {
          ...input,
          currentX: targetX,
          currentY: targetY,
          targetX,
          targetY,
          walkDistance: 0,
          attackTimer: 0,
          attackDuration: 0.24,
          skillTimer: 0,
          skillKey: '',
          hitFlashTimer: 0,
          displayHealth: input.health,
        });
        continue;
      }

      const positionChanged = previous.grid_x !== input.grid_x || previous.grid_y !== input.grid_y;
      Object.assign(previous, input, { targetX, targetY });
      if (positionChanged) previous.walkDistance += Math.hypot(targetX - previous.currentX, targetY - previous.currentY);
    }
    for (const actorID of this.actors.keys()) {
      if (!knownActors.has(actorID)) this.actors.delete(actorID);
    }

    if (snapshot.tick > this.tick) {
      // Em reconexão os HPs do primeiro snapshot já incluem os eventos daquele
      // tick; reanimá-los subtrairia o dano uma segunda vez no display local.
      if (!isFreshViewport) {
        for (const event of snapshot.events || []) this.applyCombatEvent(event);
      }
      this.tick = snapshot.tick;
    }
    this.status = snapshot.status;
    this.winnerID = snapshot.winner_id || '';
  }

  private applyCombatEvent(event: PvPCombatEvent) {
    const key = `${event.tick}:${event.kind}:${event.source_id}:${event.target_id}:${event.skill_key || ''}:${event.amount}:${event.is_healing ? 'heal' : ''}`;
    if (this.processedEvents.has(key)) return;
    this.processedEvents.add(key);
    if (this.processedEvents.size > 128) {
      this.processedEvents = new Set(Array.from(this.processedEvents).slice(-64));
    }
    if ((event.kind !== 'basic_attack' && event.kind !== 'skill') || !event.target_id) return;

    const source = event.source_id ? this.actors.get(event.source_id) : undefined;
    const target = this.actors.get(event.target_id);
    if (!target) return;

    let impactDelay = 0.1;
    if (source) {
      // O servidor já confirmou que a ação ocorreu nesta posição. Finalizamos
      // qualquer interpolação residual para não atacar deslizando.
      source.currentX = source.targetX;
      source.currentY = source.targetY;
      source.attackDuration = event.kind === 'skill' ? 0.34 : 0.24;
      source.attackTimer = source.attackDuration;
      if (event.kind === 'skill') {
        source.skillTimer = 0.48;
        source.skillKey = event.skill_key || '';
        this.spawnSkillEffect(event, source, target);
        impactDelay = this.skillImpactDelay(event.skill_key || '');
      } else if (source.archetype === 'distance') {
        this.projectiles.push({ sourceID: source.character_id, targetID: target.character_id, kind: 'arrow', elapsed: 0, duration: 0.24 });
        impactDelay = 0.24;
      } else if (source.archetype === 'magic') {
        this.projectiles.push({ sourceID: source.character_id, targetID: target.character_id, kind: 'magic', elapsed: 0, duration: 0.26 });
        impactDelay = 0.26;
      }
    }

    this.pendingImpacts.push({
      targetID: target.character_id,
      amount: event.amount || 0,
      isHealing: Boolean(event.is_healing),
      isCritical: Boolean(event.is_critical),
      remaining: impactDelay,
    });
  }

  private spawnSkillEffect(event: PvPCombatEvent, source: RenderActor, target: RenderActor) {
    if (!event.skill_key) return;
    const sourcePos = { x: source.currentX, y: source.currentY - 8 };
    const actorPositions = new Map<string, { x: number; y: number }>();
    for (const actor of this.actors.values()) actorPositions.set(actor.character_id, { x: actor.currentX, y: actor.currentY - 8 });
    this.effects.spawnEffect(
      {
        kind: event.is_healing ? 'heal' : 'skill',
        key: event.skill_key,
        source_id: event.source_id,
        target_ids: event.target_id ? [event.target_id] : [],
        amount: event.amount,
        is_crit: event.is_critical,
      },
      sourcePos,
      actorPositions,
      (targetID?: string) => {
        const actor = targetID ? this.actors.get(targetID) : target;
        return actor ? { x: actor.currentX, y: actor.currentY - 8 } : { x: target.currentX, y: target.currentY - 8 };
      },
      () => {
        const actor = this.actors.get(source.character_id) || source;
        return { x: actor.currentX, y: actor.currentY - 8 };
      },
    );
  }

  private skillImpactDelay(skillKey: string) {
    switch (skillKey) {
      case 'fireball': return 0.28;
      case 'ice_shard': return 0.30;
      case 'multishot': return 0.32;
      case 'sniper_shot': return 0.15;
      case 'arcane_nova': return 0.16;
      case 'divine_heal': return 0.10;
      default: return 0.12;
    }
  }

  private applyImpact(impact: PendingImpact) {
    const target = this.actors.get(impact.targetID);
    if (!target) return;
    if (impact.isHealing) {
      target.displayHealth = Math.min(target.max_health, target.displayHealth + impact.amount);
    } else {
      target.displayHealth = Math.max(0, target.displayHealth - impact.amount);
      target.hitFlashTimer = Math.max(target.hitFlashTimer, 0.18);
    }
    this.floatingDamage.push({
      text: `${impact.isHealing ? '+' : `${impact.isCritical ? '⚡ ' : ''}-`}${impact.amount}`,
      x: target.currentX + (Math.random() - 0.5) * 12,
      y: target.currentY - 44,
      color: impact.isHealing ? '#6ee7b7' : impact.isCritical ? '#fde047' : '#fda4af',
      alpha: 1,
      velocityX: (Math.random() - 0.5) * 10,
      velocityY: -28,
    });
  }

  private update(delta: number) {
    for (const actor of this.actors.values()) {
      const deltaX = actor.targetX - actor.currentX;
      const deltaY = actor.targetY - actor.currentY;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > 0.25) {
        const step = Math.min(distance, (distance / SERVER_PULSE_SECONDS) * delta);
        actor.currentX += (deltaX / distance) * step;
        actor.currentY += (deltaY / distance) * step;
      } else {
        actor.currentX = actor.targetX;
        actor.currentY = actor.targetY;
      }
      actor.attackTimer = Math.max(0, actor.attackTimer - delta);
      actor.skillTimer = Math.max(0, actor.skillTimer - delta);
      actor.hitFlashTimer = Math.max(0, actor.hitFlashTimer - delta);
    }

    this.effects.update(delta * 1000);
    for (let index = this.projectiles.length - 1; index >= 0; index--) {
      const projectile = this.projectiles[index];
      projectile.elapsed += delta;
      if (projectile.elapsed >= projectile.duration) this.projectiles.splice(index, 1);
    }

    for (let index = this.pendingImpacts.length - 1; index >= 0; index--) {
      const impact = this.pendingImpacts[index];
      impact.remaining -= delta;
      if (impact.remaining <= 0) {
        this.pendingImpacts.splice(index, 1);
        this.applyImpact(impact);
      }
    }

    // Reconexão ou pacote sem evento: converge para o valor autoritativo quando
    // não existe impacto visual pendente para o combatente.
    for (const actor of this.actors.values()) {
      const pending = this.pendingImpacts.some((impact) => impact.targetID === actor.character_id);
      if (!pending && actor.displayHealth !== actor.health) actor.displayHealth = actor.health;
    }

    for (let index = this.floatingDamage.length - 1; index >= 0; index--) {
      const floating = this.floatingDamage[index];
      floating.x += floating.velocityX * delta;
      floating.y += floating.velocityY * delta;
      floating.velocityY += 28 * delta;
      floating.alpha -= 1.45 * delta;
      if (floating.alpha <= 0) this.floatingDamage.splice(index, 1);
    }
  }

  private createTerrain() {
    const terrain = document.createElement('canvas');
    terrain.width = CANVAS_WIDTH;
    terrain.height = CANVAS_HEIGHT;
    const ctx = terrain.getContext('2d');
    if (!ctx) return terrain;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#080816';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#160d2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 92);
    ctx.fillStyle = '#0d1530';
    ctx.fillRect(0, 92, CANVAS_WIDTH, CANVAS_HEIGHT - 92);

    for (let star = 0; star < 34; star++) {
      const x = (star * 79 + 41) % CANVAS_WIDTH;
      const y = 12 + ((star * 37) % 70);
      ctx.fillStyle = star % 4 === 0 ? '#fef3c7' : '#d8b4fe';
      ctx.fillRect(x, y, star % 5 === 0 ? 2 : 1, 1);
    }

    for (let tileY = 0; tileY < ISO_ARENA_GEOMETRY.gridHeight; tileY++) {
      for (let tileX = 0; tileX < ISO_ARENA_GEOMETRY.gridWidth; tileX++) {
        const point = tileToScreen(tileX, tileY, ISO_ARENA_GEOMETRY);
        const edge = tileX === 0 || tileY === 0 || tileX === ISO_ARENA_GEOMETRY.gridWidth - 1 || tileY === ISO_ARENA_GEOMETRY.gridHeight - 1;
        ctx.fillStyle = edge
          ? ((tileX + tileY) % 2 === 0 ? '#17132f' : '#110f25')
          : ((tileX + tileY) % 2 === 0 ? '#2b2350' : '#241d45');
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - 8);
        ctx.lineTo(point.x + 16, point.y);
        ctx.lineTo(point.x, point.y + 8);
        ctx.lineTo(point.x - 16, point.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = edge ? '#38265f' : '#33285a';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    const center = tileToScreen(12, 9, ISO_ARENA_GEOMETRY);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a855f7';
    for (let rune = 0; rune < 4; rune++) {
      const angle = (Math.PI / 2) * rune + Math.PI / 4;
      ctx.fillRect(Math.round(Math.cos(angle) * 24) - 2, Math.round(Math.sin(angle) * 12) - 2, 4, 4);
    }
    ctx.restore();
    return terrain;
  }

  private render(now: number) {
    const ctx = this.ctx;
    if (!ctx || !this.terrain) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(this.terrain, 0, 0);
    this.renderTorches(ctx, now);

    const actors = Array.from(this.actors.values()).sort((left, right) => left.currentY - right.currentY);
    for (const actor of actors) this.renderActor(ctx, actor, now);
    this.renderProjectiles(ctx);
    this.effects.render(ctx);
    this.renderFloatingDamage(ctx);
    if (this.status === 'completed' && this.pendingImpacts.length === 0) this.renderResult(ctx);
  }

  private renderTorches(ctx: CanvasRenderingContext2D, now: number) {
    const torchTiles = [[5, 4], [18, 4], [5, 14], [18, 14]];
    for (const [tileX, tileY] of torchTiles) {
      const point = tileToScreen(tileX, tileY, ISO_ARENA_GEOMETRY);
      const flicker = 0.82 + Math.sin(now / 105 + tileX * 3 + tileY) * 0.18;
      const glow = ctx.createRadialGradient(point.x, point.y - 18, 2, point.x, point.y - 18, 30 * flicker);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.32)');
      glow.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(point.x - 32, point.y - 50, 64, 64);
      ctx.fillStyle = '#312e4f';
      ctx.fillRect(point.x - 2, point.y - 20, 4, 16);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(point.x - 4, point.y - 27, 8, 8);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(point.x - 2, point.y - 25, 4, 5);
    }
  }

  private renderActor(ctx: CanvasRenderingContext2D, actor: RenderActor, now: number) {
    const opponent = Array.from(this.actors.values()).find((candidate) => candidate.character_id !== actor.character_id);
    const facing = opponent && opponent.currentX < actor.currentX ? -1 : 1;
    const fallbackArchetype = actor.archetype === 'magic' ? 'hero_mage' : actor.archetype === 'distance' ? 'hero_archer' : 'hero_knight';
    const archetype = SkinRegistryService.getSkin(actor.skin_key || '')?.renderKey || fallbackArchetype;
    const isMoving = Math.hypot(actor.targetX - actor.currentX, actor.targetY - actor.currentY) > 0.75;
    const bob = isMoving ? Math.sin((actor.walkDistance + now / 15) / 6) * 1.5 : Math.sin(now / 360 + actor.grid_x) * 0.7;
    const hpPercent = actor.max_health > 0 ? Math.max(0, actor.displayHealth / actor.max_health) : 0;

    ctx.save();
    ctx.fillStyle = 'rgba(3, 1, 12, 0.55)';
    ctx.beginPath();
    ctx.ellipse(actor.currentX, actor.currentY + 17, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    this.renderSkillEffect(ctx, actor);
    const isDead = actor.displayHealth <= 0;
    if (actor.hitFlashTimer > 0) ctx.globalAlpha = 0.65;
    const renderOptions = {
      time: now,
      walkStep: isMoving && !isDead ? Math.sin((actor.walkDistance + now / 20) / 5) * 3.2 : 0,
      isWalking: isMoving && !isDead,
      isAttacking: !isDead && (actor.attackTimer > 0 || actor.skillTimer > 0),
      attackProgress: Math.max(0, Math.min(1, 1 - actor.attackTimer / Math.max(0.01, actor.attackDuration))),
      attackStyle: actor.archetype === 'magic' ? 'magic' : actor.archetype === 'distance' ? 'arrow' : 'melee',
      facing,
      size: 48,
    } as const;
    if (isDead) {
      ctx.save();
      ctx.globalAlpha *= 0.58;
      ctx.translate(actor.currentX, actor.currentY + 12);
      ctx.rotate(facing * 0.72);
      heroRegistry.renderDynamic(ctx, 0, 0, archetype, renderOptions);
      ctx.restore();
    } else {
      heroRegistry.renderDynamic(ctx, actor.currentX, actor.currentY + bob, archetype, renderOptions);
    }
    ctx.restore();

    const self = actor.character_id === this.selfCharacterID;
    ctx.font = 'bold 9px monospace';
    const plateWidth = Math.max(74, Math.min(154, ctx.measureText(`${actor.name} (Lv.${actor.level})`).width + 12));
    const plateX = actor.currentX - plateWidth / 2;
    const plateY = actor.currentY - 50;
    ctx.save();
    ctx.fillStyle = self ? 'rgba(9, 42, 78, 0.9)' : 'rgba(71, 14, 43, 0.9)';
    ctx.fillRect(plateX, plateY, plateWidth, 21);
    ctx.strokeStyle = self ? '#38bdf8' : '#fb7185';
    ctx.strokeRect(plateX, plateY, plateWidth, 21);
    ctx.textAlign = 'center';
    ctx.fillStyle = self ? '#bae6fd' : '#fecdd3';
    ctx.fillText(`${self ? '✦ ' : '⚔ '}${actor.name} (Lv.${actor.level})`, actor.currentX, plateY + 9);
    ctx.fillStyle = '#090b1d';
    ctx.fillRect(plateX + 4, plateY + 14, plateWidth - 8, 4);
    ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.2 ? '#f59e0b' : '#f43f5e';
    ctx.fillRect(plateX + 4, plateY + 14, Math.round((plateWidth - 8) * hpPercent), 4);
    ctx.restore();
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const projectile of this.projectiles) {
      const source = this.actors.get(projectile.sourceID);
      const target = this.actors.get(projectile.targetID);
      if (!source || !target) continue;
      const progress = Math.max(0, Math.min(1, projectile.elapsed / projectile.duration));
      const startX = source.currentX + (target.currentX >= source.currentX ? 10 : -10);
      const startY = source.currentY - 12;
      const endX = target.currentX;
      const endY = target.currentY - 12;
      const x = startX + (endX - startX) * progress;
      const y = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * 5;
      const angle = Math.atan2(endY - startY, endX - startX);
      if (projectile.kind === 'arrow') drawRealArrow(ctx, x, y, angle, 1.1);
      else drawWandStar(ctx, x, y, angle + progress * Math.PI * 2, 0.72);
    }
  }

  private renderSkillEffect(ctx: CanvasRenderingContext2D, actor: RenderActor) {
    if (actor.skillTimer <= 0) return;
    const progress = 1 - actor.skillTimer / 0.48;
    const styleBySkill: Record<string, { color: string; ring: boolean }> = {
      whirlwind: { color: '#67e8f9', ring: true },
      brutal_strike: { color: '#fb923c', ring: false },
      multishot: { color: '#fde047', ring: false },
      sniper_shot: { color: '#fef3c7', ring: false },
      fireball: { color: '#fb7185', ring: false },
      ice_shard: { color: '#7dd3fc', ring: false },
      arcane_nova: { color: '#d8b4fe', ring: true },
      divine_heal: { color: '#6ee7b7', ring: true },
    };
    const style = styleBySkill[actor.skillKey] || { color: '#c4b5fd', ring: true };
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.78 * (1 - progress));
    ctx.strokeStyle = style.color;
    ctx.fillStyle = style.color;
    ctx.lineWidth = 2;
    if (style.ring) {
      const radius = 10 + progress * 22;
      ctx.beginPath();
      ctx.ellipse(actor.currentX, actor.currentY + 8, radius, Math.max(4, radius * 0.38), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillRect(actor.currentX - 3, actor.currentY - 18 - progress * 8, 6, 6);
      ctx.fillRect(actor.currentX + 7, actor.currentY - 10, 3, 3);
    }
    ctx.restore();
  }

  private renderFloatingDamage(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    for (const floating of this.floatingDamage) {
      ctx.globalAlpha = Math.max(0, floating.alpha);
      ctx.strokeStyle = '#09020f';
      ctx.lineWidth = 3;
      ctx.strokeText(floating.text, floating.x, floating.y);
      ctx.fillStyle = floating.color;
      ctx.fillText(floating.text, floating.x, floating.y);
    }
    ctx.restore();
  }

  private renderResult(ctx: CanvasRenderingContext2D) {
    const winner = this.actors.get(this.winnerID);
    ctx.save();
    ctx.fillStyle = 'rgba(10, 5, 24, 0.78)';
    ctx.fillRect(270, 174, 420, 68);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(270, 174, 420, 68);
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(winner ? `VITÓRIA DE ${winner.name.toUpperCase()}` : 'EMPATE NA ARENA', CANVAS_WIDTH / 2, 202);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#c4b5fd';
    ctx.fillText('Nenhum ouro, item ou recurso foi perdido.', CANVAS_WIDTH / 2, 222);
    ctx.restore();
  }

  public destroy() {
    this.destroyed = true;
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    if (this.canvas?.parentElement) this.canvas.parentElement.removeChild(this.canvas);
    this.canvas = null;
    this.ctx = null;
    this.terrain = null;
    this.actors.clear();
    this.floatingDamage = [];
    this.projectiles = [];
    this.pendingImpacts = [];
    this.effects.clear();
  }
}