import { PixelArtRenderer } from '../../game/PixelArtRenderer';
import { biomeRegistry } from '../../game/registries/BiomeRegistry';
import { heroRegistry } from '../../game/registries/HeroRegistry';
import { monsterRegistry } from '../../game/registries/MonsterRegistry';

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}

interface Projectile {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  progress: number;
  color: string;
  type: 'fireball' | 'arrow' | 'slash';
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
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  hitFlashTimer: number; // >0 faz o monstro piscar em vermelho ao levar dano
}

export class GameViewport {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private isDestroyed = false;

  // Dimensões da arena
  private width = 500;
  private height = 260;

  // Estado do Herói
  private heroName = 'Aventureiro';
  private heroLevel = 1;
  private vocation = 'guerreiro';
  private heroHealth = 100;
  private heroMaxHealth = 100;
  private heroMana = 30;
  private heroMaxMana = 30;
  private heroX = 100;
  private heroY = 140;
  private targetHeroX = 100;
  private targetHeroY = 140;
  private heroWalkFrame = 0;

  // Estado dos Monstros e Bioma
  private regionId = 'forest';
  private monsters: Map<string, RenderMonster> = new Map();

  // Efeitos visuais
  private floatingTexts: FloatingText[] = [];
  private projectiles: Projectile[] = [];
  private isActive = true;
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
    // 1. Interpolação Lerp do Herói
    const heroDx = this.targetHeroX - this.heroX;
    const heroDy = this.targetHeroY - this.heroY;
    const isHeroMoving = Math.abs(heroDx) > 0.5 || Math.abs(heroDy) > 0.5;

    this.heroX += heroDx * 0.14;
    this.heroY += heroDy * 0.14;

    if (isHeroMoving) {
      this.heroWalkFrame += 0.25;
    } else {
      this.heroWalkFrame = 0;
    }

    // 2. Interpolação Lerp dos Monstros
    this.monsters.forEach((m) => {
      const mDx = m.targetX - m.currentX;
      const mDy = m.targetY - m.currentY;

      m.currentX += mDx * 0.12;
      m.currentY += mDy * 0.12;

      if (m.hitFlashTimer > 0) {
        m.hitFlashTimer -= 1;
      }
    });

    // 3. Atualizar Projéteis
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += 0.08;
      p.currentX = p.startX + (p.targetX - p.startX) * p.progress;
      p.currentY = p.startY + (p.targetY - p.startY) * p.progress;

      if (p.progress >= 1.0) {
        this.projectiles.splice(i, 1);
      }
    }

    // 4. Atualizar Textos Flutuantes
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.6;
      ft.alpha -= 0.015;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 5. Atualizar Partículas (Campfire/Stars)
    if (!this.isActive) {
      // Cria partículas (fagulhas da fogueira ou vagalumes)
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

    // 0. Limpar totalmente o canvas e desativar antialiasing para nitidez cravada (sem borrado/smearing)
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = false;

    // 1. Desenhar cenário sem conhecer regiões concretas. O registry resolve
    // region/biome -> renderer e mantém o loop principal fechado para extensão.
    const biomeKey = this.isActive ? this.regionId : 'camp';
    const bgBuffer = biomeRegistry.render(biomeKey, this.width, this.height);
    this.targetHeroX = this.isActive ? 100 : 200;
    
    ctx.drawImage(bgBuffer, 0, 0, this.width, this.height);

    // Desenhar partículas
    this.particles.forEach((p) => {
      ctx.fillStyle = `rgba(251, 146, 60, ${Math.max(0, p.alpha)})`; // orange-400
      ctx.fillRect(p.x, p.y, 2, 2);
    });

    // 2. Desenhar Herói do Jogador (Com Animação de Caminhada / Bobbing)
    const heroBob = Math.sin(this.heroWalkFrame) * 3;
    const spriteSize = 48;
    const heroSprite = heroRegistry.render(this.vocation, spriteSize);

    ctx.drawImage(heroSprite, this.heroX - spriteSize / 2, this.heroY - spriteSize / 2 + heroBob);

    // Placa de Nome do Herói
    this.drawHeroPlate(ctx, this.heroX, this.heroY - 32 + heroBob);

    // 3. Desenhar Monstros
    this.monsters.forEach((m) => {
      const mobBob = Math.sin(this.heroWalkFrame * 0.8) * 2;
      const isBoss = m.isBoss || false;
      const spriteSize = isBoss ? 64 : 48;
      const visualKey = m.visualKey || m.key || m.name;
      const mSprite = PixelArtRenderer.getMonsterTexture(visualKey, spriteSize);

      ctx.save();

      if (isBoss) {
        // Sombra ampliada para Boss
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(m.currentX, m.currentY + 22, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Aura elemental pulsante ao redor do Boss
        const auraRadius = 24 + Math.sin(Date.now() / 200) * 4;
        const auraGrad = ctx.createRadialGradient(m.currentX, m.currentY + 10, 5, m.currentX, m.currentY + 10, auraRadius);
        auraGrad.addColorStop(0, 'rgba(234, 88, 12, 0.6)');
        auraGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(m.currentX, m.currentY + 10, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Se o monstro estiver em fuga (FLEE), espelhar horizontalmente
      if (m.state === 'FLEE') {
        ctx.translate(m.currentX, m.currentY + mobBob);
        ctx.scale(-1, 1);
        ctx.drawImage(mSprite, -spriteSize / 2, -spriteSize / 2);
      } else {
        // Efeito de flash/piscar quando leva dano
        if (m.hitFlashTimer > 0) {
          ctx.globalAlpha = 0.7;
        }
        ctx.drawImage(mSprite, m.currentX - spriteSize / 2, m.currentY - spriteSize / 2 + mobBob);
      }

      ctx.restore();

      // Placa de Nome do Monstro (Com Clamping para nunca cortar nas bordas)
      const clampedX = Math.max(60, Math.min(440, m.currentX));
      const plateOffsetY = isBoss ? 40 : 32;
      this.drawMonsterPlate(ctx, clampedX, m.currentY - plateOffsetY + mobBob, m);
    });

    // 4. Desenhar Projéteis (Magia / Flecha)
    this.projectiles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.currentX, p.currentY, p.type === 'fireball' ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Brilho do projétil
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.currentX - 1, p.currentY - 1, 3, 3);
    });

    // 5. Desenhar Textos Flutuantes (Dano / Cura)
    this.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = 'bold 12px monospace';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
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

    // Fundo da Placa
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(plateX, y - 12, plateW, 26);

    // Nome em Dourado
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(text, x, y - 2);

    // Barra de HP
    const barW = Math.min(60, plateW - 8);
    const barH = 3;
    const barX = x - barW / 2;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, y + 2, barW, barH);

    const hpPct = this.heroMaxHealth > 0 ? Math.max(0, this.heroHealth / this.heroMaxHealth) : 0;
    const hpFillW = Math.round(barW * hpPct);
    const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.2 ? '#f59e0b' : '#ef4444';

    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, y + 2, hpFillW, barH);

    // Barra de Mana
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, y + 7, barW, barH);

    const manaPct = this.heroMaxMana > 0 ? Math.max(0, this.heroMana / this.heroMaxMana) : 0;
    const manaFillW = Math.round(barW * manaPct);

    ctx.fillStyle = '#38bdf8'; // Cyan místico para mana
    ctx.fillRect(barX, y + 7, manaFillW, barH);

    ctx.restore();
  }

  private drawMonsterPlate(ctx: CanvasRenderingContext2D, x: number, y: number, m: RenderMonster) {
    ctx.save();
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';

    const isBoss = m.isBoss;
    const prefix = isBoss ? '👑 ' : '';
    const text = `${prefix}${m.name} (Lv.${m.level})`;
    const textWidth = ctx.measureText(text).width;

    // Fundo da Placa (Dourado/Rubro para Boss, Preto transparente para normal)
    ctx.fillStyle = isBoss ? 'rgba(69, 10, 10, 0.9)' : 'rgba(0, 0, 0, 0.75)';
    const boxW = Math.min(180, Math.max(isBoss ? 64 : 48, textWidth + 10));
    const boxX = x - boxW / 2;
    ctx.fillRect(boxX, y - 12, boxW, 20);

    if (isBoss) {
      ctx.strokeStyle = '#fbbf24'; // Borda dourada para Boss
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, y - 12, boxW, 20);
    }

    // Nome em Amarelo Dourado para Boss, Vermelho para mob normal
    ctx.fillStyle = isBoss ? '#fde047' : '#f87171';
    ctx.fillText(text, x, y - 2);

    // Barra de HP (Mais larga para Boss)
    const barW = Math.min(120, Math.max(36, boxW - 8));
    const barH = isBoss ? 5 : 4;
    const barX = x - barW / 2;
    const barY = y + 2;

    ctx.fillStyle = '#1e293b'; // Fundo escuro da barra
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

    if (msg.is_active !== undefined) {
      this.isActive = msg.is_active;
    }

    // 2. Atualizar Bioma da Região
    if (msg.active_biome || msg.active_region || msg.region_id || msg.region || msg.regionId || msg.activeRegion) {
      this.regionId = msg.active_biome || msg.active_region || msg.region_id || msg.region || msg.regionId || msg.activeRegion;
    }

    // 3. Sincronizar Monstros Ativos
    const activeMonsters: any[] = msg.monsters || (msg.monster ? [msg.monster] : []);
    const activeIds = new Set<string>();

    activeMonsters.forEach((mob: any, idx: number) => {
      const mobId = mob.id || `mob_${idx}`;
      activeIds.add(mobId);

      const vKey = (mob.visual_key || mob.key || mob.name || '').toLowerCase();
      this.regionId = monsterRegistry.getBiomeKey(vKey) || this.regionId;

      const gridX = mob.grid_x ?? (14 - (activeMonsters.length - 1 - idx) * 2);
      const gridY = mob.grid_y ?? 4;

      // Converter coordenadas de grid (32px por tile) para pixels
      const targetPixelX = gridX * 32 + 16;
      const targetPixelY = gridY * 32 + 16;

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
          currentX: 520, // Surge fora da tela à direita e entra caminhando
          currentY: targetPixelY,
          targetX: targetPixelX,
          targetY: targetPixelY,
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
        m.targetX = targetPixelX;
        m.targetY = targetPixelY;
      }
    });

    // Remover monstros que não existem mais
    this.monsters.forEach((_, id) => {
      if (!activeIds.has(id)) {
        this.monsters.delete(id);
      }
    });

    // 4. Animar Ataques e Efeitos de Combate
    if (msg.damage_dealt && msg.damage_dealt > 0) {
      this.triggerAttackAnimation();
      this.addFloatingText(`-${msg.damage_dealt}`, 340, 90, '#ef4444');
    }

    if (msg.damage_taken && msg.damage_taken > 0) {
      this.addFloatingText(`-${msg.damage_taken}`, this.heroX, 90, '#fbbf24');

      // Disparo de magia/fogo de monstros à distância contra o herói
      this.monsters.forEach((m) => {
        if (m.attackType === 'ranged') {
          const projectile = monsterRegistry.getProjectile(m.visualKey || m.key || '');
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
            type: projectile.type,
          });
        }
      });
    }

    if (msg.item_found) {
      this.addFloatingText(`+${msg.item_found.name}`, 220, 70, '#a855f7');
    }
  }

  /** Animação fluida de ataque baseada na vocação */
  private triggerAttackAnimation() {
    const attackStyle = heroRegistry.getAttackStyle(this.vocation);

    if (attackStyle === 'magic') {
      // Disparar Orbe Mágico Azul
      this.projectiles.push({
        id: `proj_${Date.now()}`,
        startX: this.heroX + 15,
        startY: this.heroY - 5,
        targetX: 340,
        targetY: 140,
        currentX: this.heroX + 15,
        currentY: this.heroY - 5,
        progress: 0,
        color: '#38bdf8',
        type: 'fireball',
      });
    } else if (attackStyle === 'arrow') {
      // Disparar Flecha Amarela
      this.projectiles.push({
        id: `proj_${Date.now()}`,
        startX: this.heroX + 15,
        startY: this.heroY - 5,
        targetX: 340,
        targetY: 140,
        currentX: this.heroX + 15,
        currentY: this.heroY - 5,
        progress: 0,
        color: '#facc15',
        type: 'arrow',
      });
    } else {
      // Guerreiro Melee: Avança suavemente e golpeia
      this.targetHeroX = 260;
      setTimeout(() => {
        this.targetHeroX = 100;
      }, 300);
    }
  }

  /** Adiciona número flutuante de dano/cura */
  public addFloatingText(text: string, x: number, y: number, color: string) {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      color,
      alpha: 1.0,
      scale: 1.0,
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
