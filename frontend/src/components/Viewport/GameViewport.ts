import { biomeRegistry } from '../../game/registries/BiomeRegistry';
import { heroRegistry } from '../../game/registries/HeroRegistry';
import { SkinRegistryService } from '../../game/registries/SkinRegistry';
import { monsterRegistry } from '../../game/registries/MonsterRegistry';
import { CombatEffectRegistry } from '../../game/effects/CombatEffectRegistry';
import { Position } from '../../game/effects/types';
import { campSceneRenderer } from '../../game/camp/CampSceneRenderer';
import { drawWandStar, drawStaffVortex, drawFireballComet, drawIceOrbComet, drawRealArrow } from '../../game/effects/renderers/projectileSprites';
import type { CampState, SettlementState } from '../../hooks/useGameSocket';

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  scale?: number;
}

interface ProjectileTrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

interface ProjectileImpactParticle {
  vx: number;
  vy: number;
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
}

interface Projectile {
  id: string;
  startX: number;
  startY: number;
  targetId?: string;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  progress: number;
  color: string;
  type: string;
  rotationAngle?: number;
  rotationSpeed?: number;
  trail: ProjectileTrailParticle[];
  isExploding?: boolean;
  explodeProgress?: number;
  explodeDuration?: number;
  impactX?: number;
  impactY?: number;
  impactParticles?: ProjectileImpactParticle[];
}

interface RenderMonster {
  id: string;
  key?: string;
  visualKey?: string;
  isBoss?: boolean;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  attackType: string;
  state: string;
  statusEffects?: Array<{ key: string; remaining_ticks: number; magnitude: number }>;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  walkDistance: number;
  isWalking: boolean;
  hitFlashTimer: number; // >0 faz o monstro piscar em vermelho ao levar dano
}

// ───────────────────────────────────────────────────────────────────────────
// ⚙️ CONFIGURAÇÃO DA LINHA DE BATALHA (CHÃO DE COMBATE)
// Altere BATTLE_GROUND_Y para subir ou descer o Herói e os Monstros em todos os cenários.
// ───────────────────────────────────────────────────────────────────────────
export const BATTLE_GROUND_Y = 225; // Posição vertical no chão (em canvas de 300px)

export class GameViewport {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private isDestroyed = false;

  // Dimensões da arena
  private width = 680;
  private height = 300;

  // Estado do Herói
  private heroName = 'Aventureiro';
  private heroLevel = 1;
  private vocation = 'guerreiro';
  private weaponArchetype = 'melee';
  private mainHandItem: any = null;
  private heroHealth = 100;
  private heroMaxHealth = 100;
  private heroMana = 30;
  private heroMaxMana = 30;
  private heroX = 100;
  private heroY = BATTLE_GROUND_Y;
  private heroBaseX = 100;
  private heroLeapTimer = 0;
  private heroLeapDuration = 0.3;
  private heroLeapStartX = 100;
  private heroLeapTargetX = 100;
  private heroLeapHeight = 0;
  private heroLeapType: 'dash' | 'leap' | 'none' = 'none';
  private heroCosmicTrail: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }> = [];
  private heroWalkFrame = 0;
  private heroAttackDuration = 0.35; // 350ms de ciclo de ataque
  private heroAttackTimer = 0;

  // Estado dos Monstros e Bioma
  private regionId = 'forest';
  private monsters: Map<string, RenderMonster> = new Map();

  // Subsistema Modular de Efeitos
  private effectRegistry = new CombatEffectRegistry();

  // Efeitos visuais e partículas
  private floatingTexts: FloatingText[] = [];
  private projectiles: Projectile[] = [];
  private isActive = true;
  private camp: CampState | null = null;
  private settlement: SettlementState | null = null;
  private particles: { x: number; y: number; alpha: number; speed: number; phase: number }[] = [];

  constructor() {}

  public init(container: HTMLDivElement) {
    if (!container) return;

    // Criar canvas 2D nativo de alta performance
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    container.innerHTML = '';
    container.appendChild(canvas);

    this.canvas = canvas;
    this.ctx = ctx;
    this.isDestroyed = false;

    // Iniciar Loop de Renderização 60 FPS
    this.startLoop();
  }

  private startLoop() {
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (this.isDestroyed || !this.ctx) return;

      const dt = Math.min(0.05, (now - lastTime) / 1000); // delta time em segundos
      lastTime = now;

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  // ─── ATUALIZAÇÃO DA LÓGICA E ANIMAÇÃO ──────────────────────────────────────

  private update(_dt: number) {
    // 0. Atualizar Temporizador do Golpe do Herói
    if (this.heroAttackTimer > 0) {
      this.heroAttackTimer = Math.max(0, this.heroAttackTimer - _dt);
    }

    // 1. Interpolação e Física de Salto / Investida (Hero Leap & Dash)
    if (this.heroLeapTimer > 0) {
      this.heroLeapTimer = Math.max(0, this.heroLeapTimer - _dt);
      const leapProg = 1.0 - (this.heroLeapTimer / this.heroLeapDuration);

      if (leapProg <= 0.5) {
        // Fase 1: Avanço / Salto em direção ao monstro
        const fwdProg = leapProg * 2.0;
        this.heroX = this.heroLeapStartX + (this.heroLeapTargetX - this.heroLeapStartX) * fwdProg;
        this.heroY = BATTLE_GROUND_Y - Math.sin(fwdProg * Math.PI) * this.heroLeapHeight;

        // No Golpe Brutal, emitir rastro contínuo de poeira cósmica dourada atrás do herói (Img 1)
        if (this.heroLeapType === 'leap') {
          const leapTrailColors = ['#ffffff', '#fef08a', '#facc15', '#f59e0b', '#fb923c'];
          for (let k = 0; k < 3; k++) {
            this.heroCosmicTrail.push({
              x: this.heroX + (Math.random() * 8 - 4),
              y: this.heroY + (Math.random() * 8 - 4) + 6,
              vx: -(16 + Math.random() * 25),
              vy: (Math.random() - 0.5) * 16,
              alpha: 0.95,
              size: 2.0 + Math.random() * 2.5,
              color: leapTrailColors[Math.floor(Math.random() * leapTrailColors.length)],
            });
          }
        }
      } else {
        // Fase 2: Retorno suave após o golpe
        const retProg = (leapProg - 0.5) * 2.0;
        this.heroX = this.heroLeapTargetX + (this.heroBaseX - this.heroLeapTargetX) * retProg;
        this.heroY = BATTLE_GROUND_Y - Math.sin(retProg * Math.PI) * (this.heroLeapHeight * 0.25);
      }

      this.heroWalkFrame += 0.35;

      if (this.heroLeapTimer === 0) {
        this.heroLeapType = 'none';
        this.heroX = this.heroBaseX;
        this.heroY = BATTLE_GROUND_Y;
      }
    } else {
      // Posição base do herói (repouso / corrida suave)
      const heroDx = this.heroBaseX - this.heroX;
      const heroDy = BATTLE_GROUND_Y - this.heroY;
      const isHeroMoving = Math.abs(heroDx) > 0.5 || Math.abs(heroDy) > 0.5;

      this.heroX += heroDx * 0.18;
      this.heroY += heroDy * 0.18;

      if (isHeroMoving) {
        this.heroWalkFrame += 0.25;
      } else {
        this.heroWalkFrame += 0.04;
      }
    }

    // Atualizar partículas do rastro cósmico do herói
    for (let i = this.heroCosmicTrail.length - 1; i >= 0; i--) {
      const tp = this.heroCosmicTrail[i];
      tp.x += tp.vx * _dt;
      tp.y += tp.vy * _dt;
      tp.alpha -= 3.2 * _dt;
      if (tp.alpha <= 0) {
        this.heroCosmicTrail.splice(i, 1);
      }
    }

    // 2. Movimentação Suave e Contínua dos Monstros (Estilo Trabalhadores do Acampamento)
    this.monsters.forEach((m) => {
      const dx = m.targetX - m.currentX;
      const dy = m.targetY - m.currentY;
      const dist = Math.hypot(dx, dy);

      if (dist > 1.0) {
        // Velocidade fluida contínua para evitar travamentos ou saltos espaçados entre ticks
        const moveSpeed = Math.max(55, Math.min(130, dist * 2.0));
        const step = Math.min(dist, moveSpeed * _dt);
        const moveRatio = step / dist;

        m.currentX += dx * moveRatio;
        m.currentY += dy * moveRatio;
        m.walkDistance = (m.walkDistance || 0) + step;
        m.isWalking = true;
      } else {
        m.currentX = m.targetX;
        m.currentY = m.targetY;
        m.isWalking = false;
      }

      if (m.hitFlashTimer > 0) {
        m.hitFlashTimer -= 1;
      }
    });

    // 3. Atualizar Subsistema Modular de Efeitos
    this.effectRegistry.update(_dt * 1000);

    // 4. Atualizar Projéteis, Rastreamento Dinâmico e Impactos/Explosões
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (!p.isExploding) {
        // Rastrear posição dinâmica atualizada do monstro enquanto viaja
        const liveTarget = p.targetId && this.monsters.has(p.targetId)
          ? { x: this.monsters.get(p.targetId)!.currentX, y: this.monsters.get(p.targetId)!.currentY - 6 }
          : { x: p.targetX, y: p.targetY };

        p.targetX = liveTarget.x;
        p.targetY = liveTarget.y;

        p.progress += 0.16; // Viagem ágil e fluida
        p.currentX = p.startX + (p.targetX - p.startX) * Math.min(1.0, p.progress);
        p.currentY = p.startY + (p.targetY - p.startY) * Math.min(1.0, p.progress);
        p.rotationAngle = (p.rotationAngle || 0) + (p.rotationSpeed || 10) * _dt;

        if (!p.trail) p.trail = [];

        // Gerar partículas de poeira cósmica / rastro
        if (p.type === 'wand_star') {
          const starColors = ['#ffffff', '#fef08a', '#facc15', '#f59e0b', '#fbbf24'];
          p.trail.push({
            x: p.currentX + (Math.random() * 4 - 2),
            y: p.currentY + (Math.random() * 4 - 2),
            vx: -(12 + Math.random() * 20),
            vy: (Math.random() - 0.5) * 10,
            alpha: 0.95,
            size: 1.5 + Math.random() * 2.0,
            color: starColors[Math.floor(Math.random() * starColors.length)],
          });
        } else if (p.type === 'staff_vortex') {
          const vortexColors = ['#00f0ff', '#38bdf8', '#7c3aed', '#a855f7', '#1e1b4b', '#ffffff'];
          p.trail.push({
            x: p.currentX + (Math.random() * 4 - 2),
            y: p.currentY + (Math.random() * 4 - 2),
            vx: -(14 + Math.random() * 22),
            vy: (Math.random() - 0.5) * 10,
            alpha: 0.95,
            size: 1.8 + Math.random() * 2.2,
            color: vortexColors[Math.floor(Math.random() * vortexColors.length)],
          });
        } else if (p.type === 'fireball') {
          const fireColors = ['#fef08a', '#facc15', '#f97316', '#ef4444'];
          p.trail.push({
            x: p.currentX + (Math.random() * 4 - 2),
            y: p.currentY + (Math.random() * 4 - 2),
            vx: -(14 + Math.random() * 20),
            vy: (Math.random() - 0.5) * 12,
            alpha: 0.9,
            size: 2 + Math.random() * 2,
            color: fireColors[Math.floor(Math.random() * fireColors.length)],
          });
        } else if (p.type === 'ice_shard') {
          const iceColors = ['#ffffff', '#cffafe', '#7dd3fc', '#38bdf8'];
          p.trail.push({
            x: p.currentX + (Math.random() * 4 - 2),
            y: p.currentY + (Math.random() * 4 - 2),
            vx: -(12 + Math.random() * 20),
            vy: (Math.random() - 0.5) * 10,
            alpha: 0.9,
            size: 1.8 + Math.random() * 2,
            color: iceColors[Math.floor(Math.random() * iceColors.length)],
          });
        }

        // Checar impacto direto no corpo do monstro
        const distToTarget = Math.hypot(p.currentX - p.targetX, p.currentY - p.targetY);
        if (p.progress >= 1.0 || distToTarget <= 14) {
          p.isExploding = true;
          p.currentX = p.targetX;
          p.currentY = p.targetY;
          p.impactX = p.targetX;
          p.impactY = p.targetY;
          p.explodeProgress = 0;
          p.explodeDuration = 0.22;
          p.impactParticles = [];

          // Ativar piscar de dano no monstro atingido
          if (p.targetId && this.monsters.has(p.targetId)) {
            this.monsters.get(p.targetId)!.hitFlashTimer = 8;
          }

          // Gerar partículas de impacto / explosão temática no corpo do monstro
          if (p.type === 'wand_star') {
            const hitColors = ['#ffffff', '#fef08a', '#fde047', '#f59e0b', '#d97706'];
            for (let k = 0; k < 12; k++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 35 + Math.random() * 70;
              p.impactParticles.push({
                x: 0,
                y: 0,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd * 0.7,
                size: 2 + Math.random() * 2.5,
                color: hitColors[Math.floor(Math.random() * hitColors.length)],
                alpha: 1.0,
              });
            }
          } else if (p.type === 'staff_vortex') {
            const hitColors = ['#00f0ff', '#38bdf8', '#7c3aed', '#c084fc', '#ffffff'];
            for (let k = 0; k < 14; k++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 40 + Math.random() * 75;
              p.impactParticles.push({
                x: 0,
                y: 0,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd * 0.7,
                size: 2 + Math.random() * 2.5,
                color: hitColors[Math.floor(Math.random() * hitColors.length)],
                alpha: 1.0,
              });
            }
          } else if (p.type === 'arrow') {
            const hitColors = ['#ffffff', '#facc15', '#e2e8f0'];
            for (let k = 0; k < 6; k++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 25 + Math.random() * 45;
              p.impactParticles.push({
                x: 0,
                y: 0,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd * 0.7,
                size: 1.5 + Math.random() * 2,
                color: hitColors[Math.floor(Math.random() * hitColors.length)],
                alpha: 1.0,
              });
            }
          }
        }
      } else {
        // Fase de Explosão / Impacto
        p.explodeProgress = (p.explodeProgress || 0) + _dt / (p.explodeDuration || 0.22);
        if (p.impactParticles) {
          for (const ip of p.impactParticles) {
            ip.x += ip.vx * _dt;
            ip.y += ip.vy * _dt;
            ip.alpha = Math.max(0, 1.0 - (p.explodeProgress || 0));
          }
        }
      }

      // Atualizar física e dissipação do rastro
      for (let ti = p.trail.length - 1; ti >= 0; ti--) {
        const t = p.trail[ti];
        t.x += t.vx * _dt;
        t.y += t.vy * _dt;
        t.alpha -= 3.5 * _dt;
        if (t.alpha <= 0) {
          p.trail.splice(ti, 1);
        }
      }

      if (p.isExploding && (p.explodeProgress || 0) >= 1.0 && p.trail.length === 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // 5. Atualizar Textos Flutuantes (Física Parabólica & Gravidade Suave)
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.x += ft.vx;
      ft.y += ft.vy;
      ft.vy += 0.08; // Gravidade suave após o impulso
      ft.alpha -= 0.016;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 6. Atualizar Partículas (Campfire/Stars)
    if (!this.isActive) {
      if (Math.random() < 0.1) {
        this.particles.push({
          x: 236 + (Math.random() * 20 - 10),
          y: this.height * 0.5 + 128 - 20,
          alpha: 1.0,
          speed: 0.5 + Math.random(),
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y -= p.speed;
      p.x += Math.sin(p.phase + p.y * 0.05) * 0.5;
      p.alpha -= 0.02;
      if (p.alpha <= 0 || this.isActive) {
        this.particles.splice(i, 1);
      }
    }
  }

  // ─── RENDERIZAÇÃO PRINCIPAL 60 FPS ─────────────────────────────────────────

  private render() {
    const ctx = this.ctx;
    if (!ctx) return;

    // 0. Limpar totalmente o canvas e desativar antialiasing para nitidez cravada
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = false;

    // 1. Desenhar cenário
    const biomeKey = this.isActive ? this.regionId : 'camp';
    const bgBuffer = biomeRegistry.render(biomeKey, this.width, this.height);
    this.heroBaseX = this.isActive ? 100 : 180;
    ctx.drawImage(bgBuffer, 0, 0, this.width, this.height);

    // 1.1 Desenhar Construções Dinâmicas do Acampamento
    if (!this.isActive) {
      campSceneRenderer.render(ctx, this.camp, performance.now(), this.settlement?.residents || []);
    }

    // Desenhar partículas
    this.particles.forEach((p) => {
      ctx.fillStyle = `rgba(251, 146, 60, ${Math.max(0, p.alpha)})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    });

    // 1.2 Desenhar Rastro Cósmico do Herói (Salto do Golpe Brutal)
    this.heroCosmicTrail.forEach((tp) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, tp.alpha);
      ctx.fillStyle = tp.color;
      ctx.fillRect(tp.x, tp.y, tp.size, tp.size);
      ctx.restore();
    });

    // 2. Desenhar Herói do Jogador (Renderização Dinâmica Nativa com Pernas, Braços e Ataques)
    const heroBob = this.isActive && this.heroLeapType === 'none' ? Math.sin(this.heroWalkFrame) * 2.2 : 0;
    const walkStep = this.isActive ? Math.sin(this.heroWalkFrame * 1.8) * 3.5 : 0;
    const isAttacking = this.heroAttackTimer > 0;
    const attackProgress = isAttacking
      ? 1.0 - (this.heroAttackTimer / this.heroAttackDuration)
      : 0;

    const activeSkin = SkinRegistryService.getActiveSkin();
    const heroVisualKey = activeSkin ? activeSkin.renderKey : this.vocation;

    heroRegistry.renderDynamic(ctx, this.heroX, this.heroY + heroBob, heroVisualKey, {
      time: performance.now(),
      walkStep,
      isWalking: this.isActive,
      isAttacking,
      attackProgress,
      attackStyle: this.weaponArchetype === 'magic' ? 'magic' : (this.weaponArchetype === 'distance' || this.weaponArchetype === 'arrow' || this.weaponArchetype === 'bow') ? 'arrow' : 'melee',
      facing: 1,
      size: 48,
    });
    this.drawHeroPlate(ctx, this.heroX, this.heroY - 37 + heroBob);

    // 3. Desenhar Monstros Vivos
    this.monsters.forEach((m) => {
      if (m.currentX > this.width + 30) {
        return;
      }

      const entranceAlpha = Math.max(0, Math.min(1, (this.width - m.currentX + 32) / 48));
      const mobBob = Math.sin(this.heroWalkFrame * 0.8) * 2;
      const isBoss = m.isBoss || false;
      const mobSpriteSize = isBoss ? 64 : 48;
      const visualKey = m.visualKey || m.key || m.name;

      ctx.save();
      ctx.globalAlpha = entranceAlpha;

      // 1. Transladar para o centro exato do monstro no solo
      ctx.translate(m.currentX, m.currentY + mobBob);

      // 2. Aura do Boss (sempre perfeitamente centralizada na origem do monstro)
      if (isBoss) {
        const auraRadius = 24 + Math.sin(Date.now() / 200) * 4;
        const auraGrad = ctx.createRadialGradient(0, 10, 5, 0, 10, auraRadius);
        auraGrad.addColorStop(0, 'rgba(234, 88, 12, 0.6)');
        auraGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 10, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Se estiver fugindo (FLEE) ou virando de lado, espelhar em torno do CENTRO do monstro
      if (m.state === 'FLEE') {
        ctx.scale(-1, 1);
      }

      if (m.hitFlashTimer > 0) {
        ctx.globalAlpha = entranceAlpha * 0.65;
      }

      // 4. Mover para o canto superior esquerdo local para renderizar centrado
      ctx.translate(-mobSpriteSize / 2, -mobSpriteSize / 2);

      const mobWalkStep = m.isWalking
        ? Math.sin((m.walkDistance || 0) / 5.5) * 3.5
        : 0;

      monsterRegistry.render(ctx, visualKey, mobSpriteSize, {
        time: performance.now(),
        walkStep: mobWalkStep,
        isMoving: m.isWalking,
        hitFlash: m.hitFlashTimer > 0,
        state: m.state,
      });

      ctx.restore();

      if (m.currentX <= this.width + 10) {
        const plateOffsetY = isBoss ? 42 : 30;
        this.drawMonsterPlate(ctx, m.currentX, m.currentY - plateOffsetY + mobBob, m, entranceAlpha);
      }
    });

    // 4. Desenhar Efeitos Modulares de Habilidades e Combate
    this.effectRegistry.render(ctx);

    // 5. Desenhar Projéteis e Efeitos de Impacto/Explosão
    this.projectiles.forEach((p) => {
      // 5.1 Rastro de poeira cósmica / partículas
      if (p.trail && p.trail.length > 0) {
        for (const tp of p.trail) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, tp.alpha);
          ctx.fillStyle = tp.color;
          ctx.fillRect(tp.x, tp.y, tp.size, tp.size);
          ctx.restore();
        }
      }

      if (!p.isExploding) {
        // 5.2 Sprite Pixel Art do Projétil em Voo
        if (p.type === 'wand_star') {
          drawWandStar(ctx, p.currentX, p.currentY, p.rotationAngle || 0, 1.35);
        } else if (p.type === 'staff_vortex') {
          drawStaffVortex(ctx, p.currentX, p.currentY, p.rotationAngle || 0, 1.4);
        } else if (p.type === 'fireball') {
          const angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
          drawFireballComet(ctx, p.currentX, p.currentY, angle, 1.35);
        } else if (p.type === 'ice_shard') {
          const angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
          drawIceOrbComet(ctx, p.currentX, p.currentY, angle, 1.35);
        } else {
          // Flecha real do arqueiro pixel art (Img 1)
          const angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
          drawRealArrow(ctx, p.currentX, p.currentY, angle, 1.35);
        }
      } else {
        // 5.3 Efeito de Impacto / Explosão no Corpo do Monstro
        const expProg = p.explodeProgress || 0;
        const alpha = Math.max(0, 1 - expProg);
        const ix = p.impactX || p.currentX;
        const iy = p.impactY || p.currentY;

        ctx.save();
        ctx.translate(ix, iy);

        if (p.type === 'wand_star') {
          // Onda de choque estelar dourada
          ctx.strokeStyle = `rgba(250, 204, 21, ${alpha * 0.9})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 8 + expProg * 20, 0, Math.PI * 2);
          ctx.stroke();

          // Flash central de centelha
          if (expProg < 0.4) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(0.4 - expProg) * 2.5})`;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (p.type === 'staff_vortex') {
          // Onda de choque cósmica azul/púrpura
          ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.9})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 10 + expProg * 24, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 6 + expProg * 16, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.type === 'arrow') {
          // Flash de impacto da flecha e faíscas metálicas
          ctx.strokeStyle = `rgba(203, 213, 225, ${alpha * 0.85})`;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(0, 0, 4 + expProg * 16, 0, Math.PI * 2);
          ctx.stroke();

          if (expProg < 0.35) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(0.35 - expProg) * 2.8})`;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Desenhar partículas de impacto
        if (p.impactParticles) {
          for (const ip of p.impactParticles) {
            ctx.globalAlpha = Math.max(0, ip.alpha);
            ctx.fillStyle = ip.color;
            ctx.fillRect(ip.x, ip.y, ip.size, ip.size);
          }
        }

        ctx.restore();
      }
    });

    // 6. Desenhar Textos Flutuantes (Dano / Cura)
    this.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      const fontSize = ft.scale && ft.scale > 1.0 ? Math.round(12 * ft.scale) : 12;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = ft.scale && ft.scale > 1.0 ? 3 : 2;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  // ─── DESENHO DE PLACAS E STATUS ──────────────────────────────────────────

  private drawHeroPlate(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';

    const text = `${this.heroName} (Lv.${this.heroLevel})`;
    const textWidth = ctx.measureText(text).width;
    const plateW = Math.min(180, Math.max(48, textWidth + 8));
    const plateX = x - plateW / 2;

    // Fundo da Placa elegante translúcido
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(plateX, y - 12, plateW, 26);

    // Borda sutil
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(plateX, y - 12, plateW, 26);

    // Nome em Dourado
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(text, x, y - 2);

    // Barra de HP
    const barW = Math.min(60, plateW - 8);
    const barH = 3;
    const barX = x - barW / 2;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX, y + 2, barW, barH);

    const hpPct = this.heroMaxHealth > 0 ? Math.max(0, this.heroHealth / this.heroMaxHealth) : 0;
    const hpFillW = Math.round(barW * hpPct);
    const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.2 ? '#f59e0b' : '#ef4444';

    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, y + 2, hpFillW, barH);

    // Barra de Mana
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX, y + 7, barW, barH);

    const manaPct = this.heroMaxMana > 0 ? Math.max(0, this.heroMana / this.heroMaxMana) : 0;
    const manaFillW = Math.round(barW * manaPct);

    ctx.fillStyle = '#38bdf8'; // Cyan místico para mana
    ctx.fillRect(barX, y + 7, manaFillW, barH);

    ctx.restore();
  }

  private drawMonsterPlate(ctx: CanvasRenderingContext2D, x: number, y: number, m: RenderMonster, alpha: number = 1) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';

    const isBoss = m.isBoss;
    const isSlowed = m.statusEffects?.some((st) => st.key === 'slow');
    const prefix = (isBoss ? '👑 ' : '') + (isSlowed ? '❄️ ' : '');
    const text = `${prefix}${m.name} (Lv.${m.level})`;
    const textWidth = ctx.measureText(text).width;

    // Fundo da Placa (Dourado/Rubro para Boss, Dark Slate moderno para monstro comum)
    ctx.fillStyle = isBoss ? 'rgba(69, 10, 10, 0.90)' : 'rgba(15, 23, 42, 0.85)';
    const boxW = Math.min(200, Math.max(isBoss ? 64 : 44, textWidth + 8));
    const boxX = x - boxW / 2;
    ctx.fillRect(boxX, y - 11, boxW, isBoss ? 21 : 18);

    if (isBoss) {
      ctx.strokeStyle = '#fbbf24'; // Borda dourada majestosa para Boss
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, y - 11, boxW, 21);
    } else {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, y - 11, boxW, 18);
    }

    // Nome em Amarelo Dourado para Boss, Vermelho Coral suave para normal
    ctx.fillStyle = isBoss ? '#fde047' : isSlowed ? '#67e8f9' : '#fca5a5';
    ctx.fillText(text, x, y - 2);

    // Barra de HP (Mais larga para Boss)
    const barW = Math.min(140, Math.max(34, boxW - 8));
    const barH = isBoss ? 5 : 3;
    const barX = x - barW / 2;
    const barY = y + 2;

    ctx.fillStyle = '#0f172a'; // Fundo escuro
    ctx.fillRect(barX, barY, barW, barH);

    const pct = m.maxHealth > 0 ? Math.max(0, m.health / m.maxHealth) : 0;
    const fillW = Math.round(barW * pct);
    const hpColor = pct > 0.5 ? '#22c55e' : pct > 0.2 ? '#f59e0b' : '#ef4444';

    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, fillW, barH);

    ctx.restore();
  }

  // ─── PROCESSADOR DE EVENTOS DO SERVIDOR GO ───────────────────────────────

  public handleLiveCombatEvent(msg: any) {
    if (!msg) return;

    // 1. Atualizar dados do Herói
    if (msg.character) {
      this.heroName = msg.character.name || 'Aventureiro';
      this.heroLevel = msg.character.level || 1;
      this.heroHealth = msg.character.health ?? this.heroHealth;
      this.heroMaxHealth = msg.character.max_health ?? this.heroMaxHealth;
      this.heroMana = msg.character.mana ?? this.heroMana;
      this.heroMaxMana = msg.character.max_mana ?? this.heroMaxMana;

      if (msg.character.vocation || msg.character.origin) {
        this.vocation = (msg.character.vocation || msg.character.origin).toLowerCase();
      }

      if (msg.character.active_region || msg.character.activeRegion) {
        this.regionId = msg.character.active_region || msg.character.activeRegion;
      }
    }

    // Identificar Arma e Arquétipo de Combate da Arma Empunhada (Desacoplado da Skin Cosmética)
    if (msg.inventory?.equipment?.mainhand !== undefined) {
      this.mainHandItem = msg.inventory.equipment.mainhand;
    }

    if (msg.derived_stats?.primary_archetype) {
      this.weaponArchetype = msg.derived_stats.primary_archetype.toLowerCase();
    } else if (msg.inventory?.equipment?.mainhand) {
      const wType = (msg.inventory.equipment.mainhand.weapon_type || '').toLowerCase();
      if (wType.includes('wand') || wType.includes('rod') || wType.includes('magic')) {
        this.weaponArchetype = 'magic';
      } else if (wType.includes('bow') || wType.includes('crossbow') || wType.includes('distance')) {
        this.weaponArchetype = 'distance';
      } else {
        this.weaponArchetype = 'melee';
      }
    }

    if (msg.is_active !== undefined) {
      this.isActive = msg.is_active;
    }

    if (msg.camp) {
      this.camp = msg.camp;
    }

    if (msg.economy?.settlement) {
      this.settlement = msg.economy.settlement;
    }

    // 2. Atualizar Bioma da Região
    if (msg.active_biome || msg.active_region || msg.region_id || msg.region || msg.regionId || msg.activeRegion) {
      this.regionId = msg.active_biome || msg.active_region || msg.region_id || msg.region || msg.regionId || msg.activeRegion;
    }

    // 3. Sincronizar Monstros Ativos
    if (msg.is_active === false || msg.type === 'REGION_CHANGED') {
      this.monsters.clear();
    } else if (msg.monsters !== undefined || msg.monster !== undefined) {
      const activeMonsters: any[] = msg.monsters || (msg.monster ? [msg.monster] : []);
      const activeIds = new Set<string>();

      activeMonsters.forEach((mob: any, idx: number) => {
        if (!mob || (mob.health !== undefined && mob.health <= 0)) return;
        const mobId = mob.id || `mob_${idx}`;
        activeIds.add(mobId);

        const vKey = (mob.visual_key || mob.key || mob.name || '').toLowerCase();
        this.regionId = monsterRegistry.getBiomeKey(vKey) || this.regionId;

        const gridY = mob.grid_y ?? 4;
        const isRanged = (mob.attack_type || mob.attackType || '').toLowerCase() === 'ranged';
        const defaultBattleX = isRanged
          ? Math.min(this.width - 80, 270 + (activeMonsters.length - 1 - idx) * 40)
          : Math.min(this.width - 120, 165 + (activeMonsters.length - 1 - idx) * 36);

        // Converter coordenadas de grid para pixels alinhados ao solo de combate (BATTLE_GROUND_Y)
        const targetPixelX = mob.grid_x !== undefined && mob.grid_x < 12
          ? Math.max(150, Math.min(this.width - 60, mob.grid_x * 32 + 16))
          : defaultBattleX;
        const targetPixelY = BATTLE_GROUND_Y + (gridY - 4) * 12;

        let m = this.monsters.get(mobId);
        if (!m) {
          m = {
            id: mobId,
            key: mob.key,
            visualKey: mob.visual_key,
            isBoss: mob.is_boss,
            name: mob.name || 'Monstro',
            level: mob.level || 1,
            health: mob.health ?? 100,
            maxHealth: mob.max_health ?? 100,
            attackType: mob.attack_type || 'melee',
            state: mob.state || 'CHASE',
            statusEffects: mob.status_effects || [],
            currentX: this.width + 50, // Surge fora da tela à direita e entra caminhando
            currentY: targetPixelY,
            targetX: targetPixelX,
            targetY: targetPixelY,
            walkDistance: 0,
            isWalking: true,
            hitFlashTimer: 0,
          };
          this.monsters.set(mobId, m);
        } else {
          // Se a vida diminuiu, ativar piscar de dano (hit flash)
          if (mob.health < m.health) {
            m.hitFlashTimer = 8;
          }
          m.key = mob.key || m.key;
          m.visualKey = mob.visual_key || m.visualKey;
          m.isBoss = mob.is_boss ?? m.isBoss;
          m.health = mob.health ?? m.health;
          m.maxHealth = mob.max_health ?? m.maxHealth;
          m.state = mob.state || m.state;
          m.statusEffects = mob.status_effects || m.statusEffects;
          m.targetX = targetPixelX;
          m.targetY = targetPixelY;
        }
      });

      // Remover monstros que não existem mais apenas quando a lista veio explicitamente definida
      this.monsters.forEach((_, id) => {
        if (!activeIds.has(id)) {
          this.monsters.delete(id);
        }
      });
    }

    // 4. Animar Efeitos Modulares de Combate (Combat Effects Protocol)
    const monsterPosMap = new Map<string, Position>();
    this.monsters.forEach((m) => {
      monsterPosMap.set(m.id, { x: m.currentX, y: m.currentY });
    });

    if (msg.combat_effects && msg.combat_effects.length > 0) {
      let hasHeroAttack = false;
      let primaryTargetId: string | undefined;
      let attackSkillKey: string | undefined;

      for (const eff of msg.combat_effects) {
        this.effectRegistry.spawnEffect(
          eff,
          { x: this.heroX, y: this.heroY - 6 },
          monsterPosMap,
          (tId) => this.resolveTargetPos(tId),
          () => ({ x: this.heroX, y: this.heroY })
        );

        if (eff.kind === 'attack' || (eff.kind === 'skill' && eff.key !== 'divine_heal')) {
          hasHeroAttack = true;
          if (eff.kind === 'skill') {
            attackSkillKey = eff.key;
          }
          if (eff.target_ids && eff.target_ids.length > 0) {
            primaryTargetId = eff.target_ids[0];
          }
        }

        const targetPos = this.resolveTargetPos(eff.target_ids && eff.target_ids.length > 0 ? eff.target_ids[0] : undefined);

        if (eff.key === 'divine_heal' || eff.kind === 'heal') {
          // Cura Sagrada: Flutua suavemente sobre o herói
          this.addFloatingText(`+${eff.amount} HP`, this.heroX, BATTLE_GROUND_Y - 40, '#4ade80', 1.25, 0, -1.6);
        } else if (eff.is_crit) {
          // Dano Crítico: Salto alto e dourado brilhante no centro
          this.addFloatingText(`⚡ CRIT! -${eff.amount}`, targetPos.x, targetPos.y - 50, '#fde047', 1.45, 0, -3.2);
        } else if (eff.kind === 'skill' && eff.amount > 0) {
          // Habilidade / Magia: Salto em leque para a direita com cor temática
          const skillColor = eff.key === 'ice_shard' ? '#38bdf8' : eff.key === 'multishot' ? '#facc15' : '#fb923c';
          this.addFloatingText(`-${eff.amount}`, targetPos.x + 14, targetPos.y - 42, skillColor, 1.2, 0.95, -2.8);
        } else if (eff.kind === 'attack' && eff.amount > 0) {
          // Ataque Básico: Salto em leque para a esquerda com tom coral suave
          this.addFloatingText(`-${eff.amount}`, targetPos.x - 14, targetPos.y - 38, '#fca5a5', 1.0, -0.85, -2.0);
        }
      }

      if (hasHeroAttack) {
        this.triggerAttackAnimation(primaryTargetId, attackSkillKey);
      }
    } else if (msg.damage_dealt && msg.damage_dealt > 0) {
      this.triggerAttackAnimation();
      const defTarget = this.resolveTargetPos();
      this.addFloatingText(`-${msg.damage_dealt}`, defTarget.x, defTarget.y - 45, '#fca5a5', 1.0, -0.85, -2.0);
    }

    if (msg.damage_taken && msg.damage_taken > 0) {
      this.addFloatingText(`-${msg.damage_taken}`, this.heroX, BATTLE_GROUND_Y - 45, '#fbbf24', 1.05, (Math.random() - 0.5) * 0.8, -2.0);

      // Disparo de magia/fogo de monstros à distância contra o herói
      this.monsters.forEach((m) => {
        if (m.attackType === 'ranged') {
          const projectile = monsterRegistry.getProjectile(m.visualKey || m.key || '');
          const isMagicMob = (projectile.type as string) === 'spell' || projectile.color.includes('38bdf8') || projectile.color.includes('purple');
          const isStaffMob = (m.visualKey || m.key || '').includes('mage') || (m.visualKey || m.key || '').includes('darkmage') || (m.visualKey || m.key || '').includes('necromancer');
          const mobProjType = projectile.type === 'fireball' ? 'fireball' : isStaffMob ? 'staff_vortex' : isMagicMob ? 'wand_star' : 'arrow';

          this.projectiles.push({
            id: `enemy_proj_${Date.now()}_${Math.random()}`,
            startX: m.currentX - 15,
            startY: m.currentY - 5,
            targetX: this.heroX,
            targetY: this.heroY,
            currentX: m.currentX - 15,
            currentY: m.currentY - 5,
            progress: 0,
            color: projectile.color,
            type: mobProjType,
            rotationAngle: 0,
            rotationSpeed: -10.0,
            trail: [],
            isExploding: false,
            explodeProgress: 0,
            explodeDuration: 0.18,
            impactParticles: [],
          });
        }
      });
    }

    if (msg.item_found) {
      this.addFloatingText(`+${msg.item_found.name}`, 220, BATTLE_GROUND_Y - 55, '#c084fc', 1.2, 0, -1.8);
    }
  }

  /** Resolve dinamicamente a posição do monstro alvo em tempo real */
  public resolveTargetPos(targetId?: string): Position {
    if (targetId && this.monsters.has(targetId)) {
      const m = this.monsters.get(targetId)!;
      return { x: m.currentX, y: m.currentY - 6 };
    }
    for (const m of this.monsters.values()) {
      if (m.currentX > 0 && m.currentX <= this.width + 40) {
        return { x: m.currentX, y: m.currentY - 6 };
      }
    }
    return { x: Math.min(this.width - 120, this.heroX + 220), y: BATTLE_GROUND_Y - 6 };
  }

  /** Animação fluida de ataque baseada estritamente na arma empunhada */
  private triggerAttackAnimation(targetId?: string, skillKey?: string) {
    this.heroAttackTimer = this.heroAttackDuration;

    const isMagic = this.weaponArchetype === 'magic';
    const isRanged = this.weaponArchetype === 'distance' || this.weaponArchetype === 'arrow' || this.weaponArchetype === 'bow';
    const targetPos = this.resolveTargetPos(targetId);

    if (isMagic) {
      const weaponName = (this.mainHandItem?.name || '').toLowerCase();
      const weaponHands = this.mainHandItem?.hands || 1;
      const isStaff = weaponName.includes('cajado') || weaponName.includes('staff') || weaponName.includes('cetro') || weaponHands === 2;
      const projType = isStaff ? 'staff_vortex' : 'wand_star';

      this.projectiles.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        startX: this.heroX + 18,
        startY: this.heroY - 5,
        targetId: targetId,
        targetX: targetPos.x,
        targetY: targetPos.y,
        currentX: this.heroX + 18,
        currentY: this.heroY - 5,
        progress: 0,
        color: isStaff ? '#38bdf8' : '#facc15',
        type: projType,
        rotationAngle: 0,
        rotationSpeed: isStaff ? 9.5 : 12.0,
        trail: [],
        isExploding: false,
        explodeProgress: 0,
        explodeDuration: 0.22,
        impactParticles: [],
      });
    } else if (isRanged) {
      // Disparar Flecha Direcional
      this.projectiles.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        startX: this.heroX + 18,
        startY: this.heroY - 5,
        targetId: targetId,
        targetX: targetPos.x,
        targetY: targetPos.y,
        currentX: this.heroX + 18,
        currentY: this.heroY - 5,
        progress: 0,
        color: '#facc15',
        type: 'arrow',
        trail: [],
        isExploding: false,
        explodeProgress: 0,
        explodeDuration: 0.16,
        impactParticles: [],
      });
    } else {
      // Guerreiro Melee: Salto Parabólico ou Investida Rápida
      const targetAdvanceX = Math.max(130, targetPos.x - 26);
      this.heroLeapStartX = this.heroX;
      this.heroLeapTargetX = targetAdvanceX;

      if (skillKey === 'brutal_strike') {
        // Golpe Brutal: Salto Alto Parabólico com Rastro Cósmico (Img 1)
        this.heroLeapType = 'leap';
        this.heroLeapDuration = 0.44;
        this.heroLeapTimer = 0.44;
        this.heroLeapHeight = 46;
      } else {
        // Ataque Básico Melee: Investida rápida com corte e sangue jorrando (Img 3)
        this.heroLeapType = 'dash';
        this.heroLeapDuration = 0.28;
        this.heroLeapTimer = 0.28;
        this.heroLeapHeight = 6;
        this.effectRegistry.spawnBloodSplash(() => this.resolveTargetPos(targetId));
      }
    }
  }

  /** Adiciona número flutuante de dano/cura com dispersão parabólica */
  public addFloatingText(
    text: string,
    x: number,
    y: number,
    color: string,
    scale: number = 1.0,
    vx: number = 0,
    vy: number = -2.2
  ) {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      vx,
      vy,
      color,
      alpha: 1.0,
      scale: scale ?? 1.0,
    });
  }

  /** Destruição e limpeza de memória */
  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}
