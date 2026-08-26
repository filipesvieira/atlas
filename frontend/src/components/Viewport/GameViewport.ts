import { biomeRegistry } from '../../game/registries/BiomeRegistry';
import { renderForestArenaDynamic } from '../../game/renderers/biomes/BiomeRenderers';
import { heroRegistry } from '../../game/registries/HeroRegistry';
import { SkinRegistryService } from '../../game/registries/SkinRegistry';
import { monsterRegistry } from '../../game/registries/MonsterRegistry';
import { CombatEffectRegistry } from '../../game/effects/CombatEffectRegistry';
import { Position } from '../../game/effects/types';
import { campSceneRenderer } from '../../game/camp/CampSceneRenderer';
import { CAMP_GRID_HEIGHT, CAMP_GRID_WIDTH, getGridFootprint, screenToTile, tileToScreen } from '../../game/camp/CampLayoutRegistry';
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
  movementSpeedMultiplier: number;
  statusEffects?: Array<{ key: string; remaining_ticks: number; magnitude: number }>;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  motionSpeedPixelsPerSecond: number;
  gridX: number;
  gridY: number;
  // 1 olha para a direita; -1 mantém a orientação padrão para a esquerda.
  // A arte dos monstros é desenhada originalmente voltada para a esquerda.
  facing: number;
  walkDistance: number;
  isWalking: boolean;
  hitFlashTimer: number; // >0 faz o monstro piscar em vermelho ao levar dano
  spawnTimer: number;
  spawnDuration: number;
}

// O backend decide o próximo tile a cada ciclo de combate. O cliente usa a
// distância recebida nesse intervalo para manter a caminhada contínua entre
// snapshots, sem inventar posições que possam afetar combate ou alcance.
const ARENA_SERVER_TICK_SECONDS = 0.75;
const MIN_VIEWPORT_ZOOM = 1.0;
const MAX_VIEWPORT_ZOOM = 1.5;
const VIEWPORT_ZOOM_STEP = 0.1;

// ───────────────────────────────────────────────────────────────────────────
// ⚙️ CONFIGURAÇÃO DA LINHA DE BATALHA (CHÃO DE COMBATE)
// Altere BATTLE_GROUND_Y para subir ou descer o Herói e os Monstros em todos os cenários.
// ───────────────────────────────────────────────────────────────────────────
export const BATTLE_GROUND_Y = 315; // Posição vertical no chão (em canvas de 420px)

export class GameViewport {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private isDestroyed = false;

  // Dimensões da arena
  private width = 960;
  private height = 420;

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
  private heroBaseY = BATTLE_GROUND_Y;
  private heroGridX = 7;
  private heroGridY = 9;
  private heroArenaState = 'IDLE';
  private heroMovementSpeedMultiplier = 1;
  private heroMotionSpeedPixelsPerSecond = 0;
  private heroTargetId = '';
  private arenaInitialized = false;
  private isIsoArena = false;
  private heroLeapTimer = 0;
  private heroLeapDuration = 0.3;
  private heroLeapStartX = 100;
  private heroLeapTargetX = 100;
  private heroLeapStartY = BATTLE_GROUND_Y;
  private heroLeapTargetY = BATTLE_GROUND_Y;
  private heroLeapHeight = 0;
  private heroLeapType: 'dash' | 'leap' | 'none' = 'none';
  private heroCosmicTrail: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }> = [];
  private heroWalkFrame = 0;
  private heroFacing = 1;
  private heroAttackDuration = 0.35; // 350ms de ciclo de ataque
  private heroAttackTimer = 0;

  // Estado dos Monstros e Bioma
  private regionId = 'forest';
  private monsters: Map<string, RenderMonster> = new Map();
  // Mantém o ponto de impacto de um monstro removido no mesmo evento em que
  // morreu. Efeitos visuais ainda referenciam seu target_id por alguns frames.
  private lastKnownMonsterPositions: Map<string, Position> = new Map();

  // Subsistema Modular de Efeitos
  private effectRegistry = new CombatEffectRegistry();

  // Efeitos visuais e partículas
  private floatingTexts: FloatingText[] = [];
  private projectiles: Projectile[] = [];
  private isActive = true;
  private camp: CampState | null = null;
  private settlement: SettlementState | null = null;
  private particles: { x: number; y: number; alpha: number; speed: number; phase: number }[] = [];
  private draggingBuildingSlotKey: string | null = null;
  private draggingBuildingRotation = 0;
  private draggingBuildingPoint: { x: number; y: number } | null = null;
  private onMoveCampBuilding?: (slotKey: string, tileX: number, tileY: number, rotation: number) => void;
  private onMoveHero?: (direction: string, pressed: boolean) => void;
  private pressedMovementKeys = new Set<string>();
  private heroMovementHeartbeat: number | null = null;
  private lastHeroMovementDirection = '';
  private heroPointerId: number | null = null;
  private heroPointerDirection = '';
  private viewportZoom = 1.15;
  private cameraFocusX = this.width / 2;
  private cameraFocusY = this.height / 2;

  private arenaActorScreenPosition(gridX: number, gridY: number) {
    const safeX = Math.max(0, Math.min(CAMP_GRID_WIDTH - 1, Math.round(gridX)));
    const safeY = Math.max(0, Math.min(CAMP_GRID_HEIGHT - 1, Math.round(gridY)));
    const ground = tileToScreen(safeX, safeY);
    return { x: ground.x, y: ground.y - 24, depth: ground.y };
  }

  constructor() {}

  public setCampMoveHandler(handler?: (slotKey: string, tileX: number, tileY: number, rotation: number) => void) {
    this.onMoveCampBuilding = handler;
  }

  public setHeroMoveHandler(handler?: (direction: string, pressed: boolean) => void) {
    this.onMoveHero = handler;
  }

  public zoomIn() {
    this.viewportZoom = Math.min(MAX_VIEWPORT_ZOOM, this.viewportZoom + VIEWPORT_ZOOM_STEP);
  }

  public zoomOut() {
    this.viewportZoom = Math.max(MIN_VIEWPORT_ZOOM, this.viewportZoom - VIEWPORT_ZOOM_STEP);
  }

  public resetZoom() {
    this.viewportZoom = 1.15;
  }

  private updateCameraFocus() {
    const visibleWidth = this.width / this.viewportZoom;
    const visibleHeight = this.height / this.viewportZoom;
    const minX = visibleWidth / 2;
    const maxX = this.width - visibleWidth / 2;
    const minY = visibleHeight / 2;
    const maxY = this.height - visibleHeight / 2;
    const clampFocus = (value: number, min: number, max: number) => {
      if (max < min) return (min + max) / 2;
      return Math.max(min, Math.min(max, value));
    };

    this.cameraFocusX = clampFocus(this.heroX, minX, maxX);
    this.cameraFocusY = clampFocus(this.heroY, minY, maxY);
  }

  /**
   * O acampamento é uma cena pixel art. Em zoom fracionário, deixar a
   * translação da câmera com casas decimais faz o canvas reamostrar o mesmo
   * tile em pixels alternados a cada frame, criando um tremor leve. O foco
   * lógico continua contínuo; somente a transformação visual é alinhada ao
   * pixel e a conversão de cliques usa exatamente esse mesmo foco.
   */
  private cameraFocusForTransform(value: number) {
    if (this.isActive || this.viewportZoom <= 1) return value;
    return Math.round(value * this.viewportZoom) / this.viewportZoom;
  }

  private applyCameraTransform(ctx: CanvasRenderingContext2D) {
    this.updateCameraFocus();
    const renderFocusX = this.cameraFocusForTransform(this.cameraFocusX);
    const renderFocusY = this.cameraFocusForTransform(this.cameraFocusY);
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.viewportZoom, this.viewportZoom);
    ctx.translate(-renderFocusX, -renderFocusY);
  }

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
    canvas.addEventListener('pointerdown', this.handleCampPointerDown);
    canvas.addEventListener('pointermove', this.handleCampPointerMove);
    canvas.addEventListener('pointerup', this.handleCampPointerUp);
    canvas.addEventListener('pointercancel', this.handleCampPointerUp);
    window.addEventListener('keydown', this.handleCampKeyDown);
    window.addEventListener('keydown', this.handleHeroKeyDown);
    window.addEventListener('keyup', this.handleHeroKeyUp);
    window.addEventListener('blur', this.handleHeroWindowBlur);

    // Iniciar Loop de Renderização 60 FPS
    this.startLoop();
  }

  private canvasPoint(event: PointerEvent) {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    const screenX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * this.width;
    const screenY = ((event.clientY - rect.top) / Math.max(1, rect.height)) * this.height;
    const renderFocusX = this.cameraFocusForTransform(this.cameraFocusX);
    const renderFocusY = this.cameraFocusForTransform(this.cameraFocusY);
    return {
      // Os renderizadores e os hit-tests trabalham em coordenadas do mundo.
      // Ao clicar com zoom, desfazemos a transformação da câmera antes de
      // converter para tile ou testar construções.
      x: renderFocusX + (screenX - this.width / 2) / this.viewportZoom,
      y: renderFocusY + (screenY - this.height / 2) / this.viewportZoom,
    };
  }

  private handleCampPointerDown = (event: PointerEvent) => {
    if (this.isActive) {
      this.handleHeroPointerDown(event);
      return;
    }
    if (this.isActive || !this.camp || !this.onMoveCampBuilding || !this.canvas) return;
    const point = this.canvasPoint(event);
    const slotKey = campSceneRenderer.hitTest(point.x, point.y);
    if (!slotKey) return;
    const building = this.camp.buildings?.[slotKey];
    if (!building || building.upgrade_target_level) return;
    this.draggingBuildingSlotKey = slotKey;
    this.draggingBuildingRotation = building.rotation || 0;
    this.draggingBuildingPoint = point;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.canvas.style.cursor = 'grabbing';
    this.updateCampPlacementPreview(point.x, point.y);
  };


  private handleCampPointerMove = (event: PointerEvent) => {
    if (this.isActive) {
      this.handleHeroPointerMove(event);
      return;
    }
    if (!this.draggingBuildingSlotKey || this.isActive) return;
    const point = this.canvasPoint(event);
    this.draggingBuildingPoint = point;
    this.updateCampPlacementPreview(point.x, point.y);
  };

  private handleCampKeyDown = (event: KeyboardEvent) => {
    if (!this.draggingBuildingSlotKey || this.isActive || event.key.toLowerCase() !== 'r') return;
    event.preventDefault();
    this.draggingBuildingRotation = (this.draggingBuildingRotation + 1) % 4;
    if (this.draggingBuildingPoint) {
      this.updateCampPlacementPreview(this.draggingBuildingPoint.x, this.draggingBuildingPoint.y);
    }
  };

  private movementDirectionForKey(key: string) {
    switch (key) {
      case 'ArrowUp': return 'up';
      case 'ArrowDown': return 'down';
      case 'ArrowLeft': return 'left';
      case 'ArrowRight': return 'right';
      default: return '';
    }
  }

  private currentHeroMovementDirection() {
    const up = this.pressedMovementKeys.has('ArrowUp');
    const down = this.pressedMovementKeys.has('ArrowDown');
    const left = this.pressedMovementKeys.has('ArrowLeft');
    const right = this.pressedMovementKeys.has('ArrowRight');
    const vertical = up === down ? '' : up ? 'up' : 'down';
    const horizontal = left === right ? '' : left ? 'left' : 'right';
    const screenDirection = vertical && horizontal ? `${vertical}-${horizontal}` : vertical || horizontal;

    // As setas descrevem a direção visual na tela. A arena, porém, usa eixos
    // de tile isométricos: converter aqui evita que ↑ mova o herói para a
    // direita visual e mantém clique/touch independentes dessa convenção.
    const isometricDirectionForScreen: Record<string, string> = {
      up: 'up-left',
      down: 'down-right',
      left: 'down-left',
      right: 'up-right',
      'up-left': 'left',
      'up-right': 'up',
      'down-left': 'down',
      'down-right': 'right',
    };
    return isometricDirectionForScreen[screenDirection] || '';
  }

  private heroMovementDirectionForPoint(point: { x: number; y: number }) {
    const targetTile = screenToTile(point.x, point.y);
    const deltaX = targetTile.tileX - this.heroGridX;
    const deltaY = targetTile.tileY - this.heroGridY;
    const vertical = deltaY === 0 ? '' : deltaY < 0 ? 'up' : 'down';
    const horizontal = deltaX === 0 ? '' : deltaX < 0 ? 'left' : 'right';
    if (vertical && horizontal) return `${vertical}-${horizontal}`;
    return vertical || horizontal;
  }

  private activeHeroMovementDirection() {
    return this.heroPointerDirection || this.currentHeroMovementDirection();
  }

  private isFormControlTarget(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
  }

  private sendCurrentHeroMovement(force = false) {
    if (!this.isActive || !this.onMoveHero) return;
    const direction = this.activeHeroMovementDirection();
    if (!direction) return;
    if (force || direction !== this.lastHeroMovementDirection) {
      this.lastHeroMovementDirection = direction;
      this.onMoveHero(direction, true);
    }
  }

  private startHeroMovementHeartbeat() {
    if (this.heroMovementHeartbeat !== null) return;
    this.heroMovementHeartbeat = window.setInterval(() => this.sendCurrentHeroMovement(true), 120);
  }

  private stopManualHeroMovement() {
    if (this.heroMovementHeartbeat !== null) {
      window.clearInterval(this.heroMovementHeartbeat);
      this.heroMovementHeartbeat = null;
    }
    this.pressedMovementKeys.clear();
    this.heroPointerId = null;
    this.heroPointerDirection = '';
    if (this.lastHeroMovementDirection && this.onMoveHero) {
      this.onMoveHero(this.lastHeroMovementDirection, false);
    }
    this.lastHeroMovementDirection = '';
  }

  private handleHeroPointerDown = (event: PointerEvent) => {
    if (!this.isActive || !this.onMoveHero || !this.canvas) return;
    const direction = this.heroMovementDirectionForPoint(this.canvasPoint(event));
    if (!direction) return;

    event.preventDefault();
    this.heroPointerId = event.pointerId;
    this.heroPointerDirection = direction;
    this.canvas.setPointerCapture?.(event.pointerId);
    // Um clique equivale a um novo pressionar: o servidor aplica o passo
    // imediato e os heartbeats mantêm a caminhada se o botão ficar pressionado.
    this.sendCurrentHeroMovement(true);
    this.startHeroMovementHeartbeat();
  };

  private handleHeroPointerMove = (event: PointerEvent) => {
    if (!this.isActive || this.heroPointerId !== event.pointerId) return;
    const direction = this.heroMovementDirectionForPoint(this.canvasPoint(event));
    if (!direction || direction === this.heroPointerDirection) return;
    this.heroPointerDirection = direction;
    this.sendCurrentHeroMovement(true);
  };

  private handleHeroPointerUp = (event: PointerEvent) => {
    if (this.heroPointerId !== event.pointerId) return;
    event.preventDefault();
    if (this.canvas?.hasPointerCapture?.(event.pointerId)) {
      this.canvas.releasePointerCapture?.(event.pointerId);
    }
    this.heroPointerId = null;
    this.heroPointerDirection = '';

    const keyboardDirection = this.currentHeroMovementDirection();
    if (keyboardDirection) {
      this.sendCurrentHeroMovement(true);
      this.startHeroMovementHeartbeat();
      return;
    }

    if (this.lastHeroMovementDirection && this.onMoveHero) {
      this.onMoveHero(this.lastHeroMovementDirection, false);
    }
    this.lastHeroMovementDirection = '';
    if (this.heroMovementHeartbeat !== null) {
      window.clearInterval(this.heroMovementHeartbeat);
      this.heroMovementHeartbeat = null;
    }
  };

  private handleHeroKeyDown = (event: KeyboardEvent) => {
    if (!this.isActive || this.isFormControlTarget(event)) return;
    const direction = this.movementDirectionForKey(event.key);
    if (!direction) return;
    event.preventDefault();
    if (this.pressedMovementKeys.has(event.key)) return;
    this.pressedMovementKeys.add(event.key);
    this.sendCurrentHeroMovement(true);
    this.startHeroMovementHeartbeat();
  };

  private handleHeroKeyUp = (event: KeyboardEvent) => {
    const direction = this.movementDirectionForKey(event.key);
    if (!direction) return;
    event.preventDefault();
    this.pressedMovementKeys.delete(event.key);
    // Enquanto o botão do mouse estiver pressionado, ele continua sendo a
    // fonte de direção ativa; soltar uma seta não pode cancelar o clique.
    if (this.heroPointerDirection) {
      this.sendCurrentHeroMovement(true);
      return;
    }
    const nextDirection = this.currentHeroMovementDirection();
    if (nextDirection) {
      this.sendCurrentHeroMovement(true);
      return;
    }
    this.stopManualHeroMovement();
  };

  private handleHeroWindowBlur = () => {
    if (this.pressedMovementKeys.size > 0 || this.lastHeroMovementDirection) this.stopManualHeroMovement();
  };

  private handleCampPointerUp = (event: PointerEvent) => {
    if (this.isActive) {
      this.handleHeroPointerUp(event);
      return;
    }
    if (!this.draggingBuildingSlotKey) return;
    const slotKey = this.draggingBuildingSlotKey;
    const point = this.canvasPoint(event);
    const building = this.camp?.buildings?.[slotKey];
    if (building && this.camp && this.onMoveCampBuilding) {
      const rotation = this.draggingBuildingRotation;
      const fp = getGridFootprint(building.building_key, rotation);
      const tile = screenToTile(point.x, point.y);
      const tileX = tile.tileX - Math.floor(fp.width / 2);
      const tileY = tile.tileY - Math.floor(fp.height / 2);
      const valid = campSceneRenderer.isPlacementValid(this.camp, slotKey, tileX, tileY, rotation);
      if (valid) this.onMoveCampBuilding(slotKey, tileX, tileY, rotation);
    }
    this.draggingBuildingSlotKey = null;
    this.draggingBuildingRotation = 0;
    this.draggingBuildingPoint = null;
    campSceneRenderer.setPlacementPreview(null);
    if (this.canvas) {
      this.canvas.style.cursor = 'default';
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
    }
  };

  private updateCampPlacementPreview(screenX: number, screenY: number) {
    const slotKey = this.draggingBuildingSlotKey;
    const building = slotKey ? this.camp?.buildings?.[slotKey] : null;
    if (!slotKey || !building || !this.camp) return;
    const rotation = this.draggingBuildingRotation;
    const fp = getGridFootprint(building.building_key, rotation);
    const tile = screenToTile(screenX, screenY);
    const tileX = tile.tileX - Math.floor(fp.width / 2);
    const tileY = tile.tileY - Math.floor(fp.height / 2);
    campSceneRenderer.setPlacementPreview({
      slotKey, tileX, tileY, rotation,
      valid: campSceneRenderer.isPlacementValid(this.camp, slotKey, tileX, tileY, rotation),
    });
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
    if (this.isActive && this.heroLeapTimer > 0) {
      this.heroLeapTimer = Math.max(0, this.heroLeapTimer - _dt);
      const leapProg = 1.0 - (this.heroLeapTimer / this.heroLeapDuration);

      if (leapProg <= 0.5) {
        // Fase 1: Avanço / Salto em direção ao monstro
        const fwdProg = leapProg * 2.0;
        this.heroX = this.heroLeapStartX + (this.heroLeapTargetX - this.heroLeapStartX) * fwdProg;
        this.heroY = this.heroLeapStartY + (this.heroLeapTargetY - this.heroLeapStartY) * fwdProg - Math.sin(fwdProg * Math.PI) * this.heroLeapHeight;

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
        this.heroY = this.heroLeapTargetY + (this.heroBaseY - this.heroLeapTargetY) * retProg - Math.sin(retProg * Math.PI) * (this.heroLeapHeight * 0.25);
      }

      this.heroWalkFrame += 0.35;

      if (this.heroLeapTimer === 0) {
        this.heroLeapType = 'none';
        this.heroX = this.heroBaseX;
        this.heroY = this.heroBaseY;
      }
    } else {
      // Posição base do herói. Na arena, o alvo recebido do servidor é
      // percorrido com velocidade constante até o próximo snapshot, em vez de
      // usar uma interpolação exponencial que termina cedo e cria pausas.
      const heroDx = this.heroBaseX - this.heroX;
      const heroDy = this.heroBaseY - this.heroY;
      const heroDistance = Math.hypot(heroDx, heroDy);
      const isHeroMoving = heroDistance > 0.5;

      if (isHeroMoving) {
        const fallbackSpeed = heroDistance / ARENA_SERVER_TICK_SECONDS;
        const heroSpeed = Math.max(
          1,
          this.heroMotionSpeedPixelsPerSecond || fallbackSpeed * Math.max(1, this.heroMovementSpeedMultiplier),
        );
        const step = Math.min(heroDistance, heroSpeed * _dt);
        const ratio = step / heroDistance;
        this.heroX += heroDx * ratio;
        this.heroY += heroDy * ratio;
      } else {
        this.heroX = this.heroBaseX;
        this.heroY = this.heroBaseY;
      }

      if (isHeroMoving) {
        this.heroWalkFrame += _dt * 8;
      } else {
        this.heroWalkFrame += _dt * 1.6;
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
      if (m.spawnTimer > 0) {
        m.spawnTimer = Math.max(0, m.spawnTimer - _dt);
        // O portal acompanha a posição autoritativa desde o primeiro frame;
        // não há mais uma entrada artificial pela lateral da tela.
        m.currentX = m.targetX;
        m.currentY = m.targetY;
        m.isWalking = false;
      }

      const dx = m.targetX - m.currentX;
      const dy = m.targetY - m.currentY;
      const dist = Math.hypot(dx, dy);

      if (m.spawnTimer > 0) {
        // A criatura aparece no próprio tile enquanto o portal faz a
        // transição; aguardar a abertura evita o efeito de caminhada lateral.
      } else if (dist > 1.0) {
        // O destino autoritativo muda por tick. A velocidade é calculada no
        // recebimento do snapshot para que um monstro percorra a distância
        // inteira de forma contínua durante o ciclo, sem parar no meio.
        const moveSpeed = Math.max(1, m.motionSpeedPixelsPerSecond || (dist / ARENA_SERVER_TICK_SECONDS));
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

    // A posição interpolada muda entre os ticks autoritativos. Recalcular a
    // orientação aqui evita que um ator continue de costas durante a caminhada
    // ou enquanto o outro ator cruza a diagonal da arena.
    if (this.isActive) {
      this.updateBattleFacing();
    }

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
        const fire = this.getCampfireParticleOrigin();
        this.particles.push({
          x: fire.x + (Math.random() * 16 - 8),
          y: fire.y - 18,
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

  /** Posição atual da fogueira para partículas, respeitando drag-and-drop. */
  private getCampfireParticleOrigin() {
    const building = Object.values(this.camp?.buildings || {}).find((slot) => slot.building_key === 'campfire');
    if (!building) return tileToScreen(10.5, 8.5);
    const fp = getGridFootprint(building.building_key, building.rotation || 0);
    return tileToScreen(building.tile_x + (fp.width - 1) / 2, building.tile_y + (fp.height - 1) / 2);
  }

  // ─── RENDERIZAÇÃO PRINCIPAL 60 FPS ─────────────────────────────────────────

  private render() {
    const ctx = this.ctx;
    if (!ctx) return;

    // A posição do herói do acampamento precisa estar atualizada antes do
    // cálculo do foco. Antes ela era preenchida pelo callback depois da
    // transformação, deixando a câmera sempre um frame atrasada quando havia
    // zoom.
    const frameTime = performance.now();
    if (!this.isActive) {
      const campHero = campSceneRenderer.getHeroSceneState(frameTime);
      this.heroX = campHero.x;
      this.heroY = campHero.y;
    }

    // 0. Limpar totalmente o canvas e desativar antialiasing para nitidez cravada
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = false;
    // A câmera envolve todo o mundo renderizado: cenário, construções,
    // atores, projéteis e textos de combate. O HUD fica fora deste canvas e
    // continua em tamanho fixo.
    ctx.save();
    this.applyCameraTransform(ctx);

    // 1. Desenhar cenário
    const biomeKey = this.isActive ? this.regionId : 'camp';
    const bgBuffer = biomeRegistry.render(biomeKey, this.width, this.height);
    if (this.isActive && this.isIsoArena && !this.arenaInitialized) {
      const fallbackHero = this.arenaActorScreenPosition(this.heroGridX, this.heroGridY);
      this.heroBaseX = fallbackHero.x;
      this.heroBaseY = fallbackHero.y;
    } else if (this.isActive && !this.isIsoArena) {
      // As demais regiões permanecem no renderer legado até cada bioma receber
      // sua própria malha visual e regras de obstáculos.
      this.heroBaseX = 140;
      this.heroBaseY = BATTLE_GROUND_Y;
    }
    ctx.drawImage(bgBuffer, 0, 0, this.width, this.height);
    // A primeira arena isométrica possui objetos que obrigatoriamente precisam
    // redesenhar a cada frame (rio e fogueira). A chamada direta evita que uma
    // mudança transitória de `regionId` causada por snapshots de combate
    // silencie a camada dinâmica enquanto a arena forest continua visível.
    if (this.isActive && this.isIsoArena) {
      renderForestArenaDynamic(ctx, frameTime);
    } else {
      biomeRegistry.renderDynamic(biomeKey, ctx, this.width, this.height, frameTime);
    }

    // 1.1 Desenhar Construções Dinâmicas do Acampamento
    let campHeroRendered = false;
    if (!this.isActive) {
      campSceneRenderer.render(
        ctx,
        this.camp,
        frameTime,
        this.settlement?.residents || [],
        (campHero) => {
          campHeroRendered = true;
          this.heroX = campHero.x;
          this.heroY = campHero.y;
          this.heroBaseX = campHero.x;
          this.heroBaseY = campHero.y;
          this.heroFacing = campHero.facing;
          this.heroArenaState = campHero.walking ? 'CHASE' : 'IDLE';
          this.heroAttackTimer = 0;
          this.heroLeapTimer = 0;
          this.heroLeapType = 'none';
          this.heroWalkFrame = campHero.walking ? frameTime / 120 : frameTime / 500;

          const activeSkin = SkinRegistryService.getActiveSkin();
          const heroVisualKey = activeSkin ? activeSkin.renderKey : this.vocation;
          const campWalkStep = campHero.walking ? Math.sin(this.heroWalkFrame * 1.8) * 3.5 : 0;
          const campBob = campHero.walking ? Math.sin(this.heroWalkFrame) * 1.2 : Math.sin(frameTime / 500) * 0.8;
          this.renderHeroActor(ctx, heroVisualKey, campBob, campWalkStep, false, 0);
        }
      );
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

    // 2. Ordenar atores pelo pé no terreno. Em uma arena isométrica o eixo de
    // profundidade é o Y do tile projetado, não a ordem hero->monstro.
    const heroBob = this.isActive && this.heroLeapType === 'none' ? Math.sin(this.heroWalkFrame) * 2.2 : 0;
    const walkStep = this.isActive ? Math.sin(this.heroWalkFrame * 1.8) * 3.5 : 0;
    const isAttacking = this.heroAttackTimer > 0;
    const attackProgress = isAttacking
      ? 1.0 - (this.heroAttackTimer / this.heroAttackDuration)
      : 0;

    const activeSkin = SkinRegistryService.getActiveSkin();
    const heroVisualKey = activeSkin ? activeSkin.renderKey : this.vocation;

    const actorEntries: Array<{ depth: number; render: () => void }> = campHeroRendered ? [] : [{
      depth: this.heroY + 24,
      render: () => this.renderHeroActor(ctx, heroVisualKey, heroBob, walkStep, isAttacking, attackProgress),
    }];
    this.monsters.forEach((m) => {
      actorEntries.push({
        depth: m.currentY + 24,
        render: () => this.renderMonsterActor(ctx, m),
      });
    });
    actorEntries.sort((a, b) => a.depth - b.depth).forEach((entry) => entry.render());

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

    ctx.restore();
  }

  private renderHeroActor(
    ctx: CanvasRenderingContext2D,
    heroVisualKey: string,
    heroBob: number,
    walkStep: number,
    isAttacking: boolean,
    attackProgress: number
  ) {
    heroRegistry.renderDynamic(ctx, this.heroX, this.heroY + heroBob, heroVisualKey, {
      time: performance.now(),
      walkStep,
      isWalking: this.isActive && this.heroArenaState !== 'IDLE',
      isAttacking,
      attackProgress,
      attackStyle: this.weaponArchetype === 'magic' ? 'magic' : (this.weaponArchetype === 'distance' || this.weaponArchetype === 'arrow' || this.weaponArchetype === 'bow') ? 'arrow' : 'melee',
      facing: this.heroFacing,
      size: 48,
    });
    this.drawHeroPlate(ctx, this.heroX, this.heroY - 37 + heroBob);
  }

  /**
   * Mantém os atores voltados para o adversário usando o eixo horizontal
   * projetado da malha isométrica (X - Y). A arte do herói nasce olhando para
   * a direita; a arte dos monstros nasce olhando para a esquerda.
   */
  private updateBattleFacing() {
    if (!this.isActive || this.monsters.size === 0) return;

    let heroTarget = this.heroTargetId ? this.monsters.get(this.heroTargetId) : undefined;
    if (!heroTarget) {
      let nearestDistance = Number.POSITIVE_INFINITY;
      this.monsters.forEach((monster) => {
        const distance = Math.hypot(monster.currentX - this.heroX, monster.currentY - this.heroY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          heroTarget = monster;
        }
      });
    }

    if (heroTarget) {
      const screenDelta = heroTarget.currentX - this.heroX;
      if (Math.abs(screenDelta) > 1) {
        this.heroFacing = screenDelta > 0 ? 1 : -1;
      } else {
        const projectedGridDelta = (heroTarget.gridX - heroTarget.gridY) - (this.heroGridX - this.heroGridY);
        if (projectedGridDelta !== 0) {
          this.heroFacing = projectedGridDelta > 0 ? 1 : -1;
        }
      }
    }

    this.monsters.forEach((monster) => {
      const screenDelta = this.heroX - monster.currentX;
      if (Math.abs(screenDelta) > 1) {
        const heroIsRight = screenDelta > 0;
        // Em FLEE a criatura corre para longe e, portanto, fica de costas para
        // o herói. Nos demais estados ela deve encará-lo.
        monster.facing = monster.state === 'FLEE'
          ? (heroIsRight ? -1 : 1)
          : (heroIsRight ? 1 : -1);
        return;
      }

      const projectedGridDelta = (this.heroGridX - this.heroGridY) - (monster.gridX - monster.gridY);
      if (projectedGridDelta !== 0) {
        const heroIsRight = projectedGridDelta > 0;
        monster.facing = monster.state === 'FLEE'
          ? (heroIsRight ? -1 : 1)
          : (heroIsRight ? 1 : -1);
      }
    });
  }

  private faceHeroTowardScreenX(targetX: number) {
    const screenDelta = targetX - this.heroX;
    if (Math.abs(screenDelta) > 1) {
      this.heroFacing = screenDelta > 0 ? 1 : -1;
    }
  }

  private renderTeleportPortal(ctx: CanvasRenderingContext2D, x: number, groundY: number, progress: number) {
    const time = performance.now();
    const pulse = 0.88 + Math.sin(time / 120) * 0.12;
    const alpha = Math.max(0, 1 - progress * 0.72);

    ctx.save();
    ctx.translate(Math.round(x), Math.round(groundY - 18));
    ctx.scale(0.72, 1);
    ctx.globalAlpha = alpha;

    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 32 * pulse);
    glow.addColorStop(0, 'rgba(14, 165, 233, 0.55)');
    glow.addColorStop(0.55, 'rgba(2, 132, 199, 0.22)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-34, -38, 68, 76);

    // Núcleo escuro e anéis concêntricos: leitura de portal mesmo em baixa
    // resolução, mantendo a paleta azul das referências fornecidas.
    ctx.fillStyle = '#031b35';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 + pulse * 2, 27 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 + pulse * 2, 31 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-1, -1, 14 + pulse, 27 + pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const angle = time / 520 + i * (Math.PI * 2 / 8);
      const radius = 22 + Math.sin(time / 180 + i) * 5;
      const particleX = Math.cos(angle) * radius;
      const particleY = Math.sin(angle) * radius * 1.35;
      ctx.globalAlpha = alpha * (0.45 + (i % 3) * 0.18);
      ctx.fillStyle = i % 2 === 0 ? '#7dd3fc' : '#0ea5e9';
      ctx.fillRect(Math.round(particleX), Math.round(particleY), 3, 3);
    }
    ctx.restore();
  }

  private renderMonsterActor(ctx: CanvasRenderingContext2D, m: RenderMonster) {
    const spawnProgress = m.spawnDuration > 0
      ? Math.max(0, Math.min(1, 1 - m.spawnTimer / m.spawnDuration))
      : 1;
    const entranceAlpha = m.spawnTimer > 0
      ? Math.max(0.12, Math.min(1, spawnProgress * 1.18))
      : 1;
    const mobBob = Math.sin(this.heroWalkFrame * 0.8) * 2;
    const isBoss = m.isBoss || false;
    const mobSpriteSize = isBoss ? 64 : 48;
    const visualKey = m.visualKey || m.key || m.name;

    if (m.spawnTimer > 0) {
      this.renderTeleportPortal(ctx, m.currentX, m.currentY, spawnProgress);
    }

    ctx.save();
    ctx.globalAlpha = entranceAlpha;
    ctx.translate(m.currentX, m.currentY + mobBob);
    const spawnScale = m.spawnTimer > 0 ? 0.72 + spawnProgress * 0.28 : 1;
    ctx.scale(spawnScale, spawnScale);

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

    // Os renderers de monstros têm orientação base para a esquerda. O espelho
    // agora depende da posição do herói, e não do estado FLEE: fugir, perseguir
    // ou atacar não deve fazer a criatura lutar de costas para o alvo.
    if (m.facing === 1) ctx.scale(-1, 1);
    if (m.hitFlashTimer > 0) ctx.globalAlpha = entranceAlpha * 0.65;
    ctx.translate(-mobSpriteSize / 2, -mobSpriteSize / 2);
    const mobWalkStep = m.isWalking ? Math.sin((m.walkDistance || 0) / 5.5) * 3.5 : 0;
    monsterRegistry.render(ctx, visualKey, mobSpriteSize, {
      time: performance.now(),
      walkStep: mobWalkStep,
      isMoving: m.isWalking,
      hitFlash: m.hitFlashTimer > 0,
      state: m.state,
    });
    ctx.restore();

    if (m.spawnTimer <= 0 || spawnProgress > 0.55) {
      const plateOffsetY = isBoss ? 42 : 30;
      this.drawMonsterPlate(ctx, m.currentX, m.currentY - plateOffsetY + mobBob, m, entranceAlpha);
    }
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

    if (typeof msg.derived_stats?.movement_speed_multiplier === 'number') {
      // O backend calcula e limita a velocidade. Aqui apenas protegemos o
      // renderizador de um valor inválido, sem criar um segundo teto visual.
      this.heroMovementSpeedMultiplier = Number.isFinite(msg.derived_stats.movement_speed_multiplier)
        ? Math.max(1, msg.derived_stats.movement_speed_multiplier)
        : 1;
    }

    if (msg.is_active !== undefined) {
      this.isActive = msg.is_active;
      if (!this.isActive) {
        this.stopManualHeroMovement();
        // Eventos atrasados de combate não podem iniciar investida, projétil
        // ou efeito de impacto enquanto o herói está no acampamento.
        this.effectRegistry.clear();
        this.projectiles = [];
        this.heroAttackTimer = 0;
        this.heroLeapTimer = 0;
        this.heroLeapType = 'none';
        this.heroCosmicTrail = [];
        this.heroTargetId = '';
        this.lastKnownMonsterPositions.clear();
      }
    }

    if (msg.arena?.hero) {
      this.isIsoArena = msg.arena.key === 'forest' || msg.active_biome === 'forest' || msg.active_region === 'forest' || this.regionId === 'forest';
      if (!this.isIsoArena) {
        this.arenaInitialized = false;
      }
      const nextHeroX = Number(msg.arena.hero.grid_x ?? this.heroGridX);
      const nextHeroY = Number(msg.arena.hero.grid_y ?? this.heroGridY);
      const nextHeroPosition = this.arenaActorScreenPosition(nextHeroX, nextHeroY);
      const targetChanged = nextHeroX !== this.heroGridX || nextHeroY !== this.heroGridY;
      const arenaMovementSpeed = Number(msg.arena.hero.movement_speed_multiplier);
      if (Number.isFinite(arenaMovementSpeed) && arenaMovementSpeed > 0) {
        // Inclui a aceleração temporária do controle manual. O canvas precisa
        // interpolar no mesmo ritmo da simulação, não apenas no ritmo base.
        this.heroMovementSpeedMultiplier = arenaMovementSpeed;
      }
      this.heroArenaState = msg.arena.hero.state || 'IDLE';
      this.heroTargetId = String(msg.arena.hero.target_id || '');
      if (this.isIsoArena) {
        this.heroBaseX = nextHeroPosition.x;
        this.heroBaseY = nextHeroPosition.y;
        if (!this.arenaInitialized) {
          this.heroX = this.heroBaseX;
          this.heroY = this.heroBaseY;
          this.heroMotionSpeedPixelsPerSecond = 0;
        } else if (targetChanged) {
          // O alvo pode avançar mais de um tile quando a velocidade é maior
          // que 1x. A velocidade visual deve ser calculada por tile, e não
          // pela distância restante até o alvo; caso contrário, o valor já
          // preenchido aqui impede o multiplicador recebido do backend de ser
          // usado no loop de animação.
          const previousHeroPosition = this.arenaActorScreenPosition(this.heroGridX, this.heroGridY);
          const authoritativePixelDistance = Math.hypot(
            nextHeroPosition.x - previousHeroPosition.x,
            nextHeroPosition.y - previousHeroPosition.y,
          );
          const authoritativeTileDistance = Math.hypot(
            nextHeroX - this.heroGridX,
            nextHeroY - this.heroGridY,
          );
          const pixelsPerTile = authoritativePixelDistance / Math.max(1, authoritativeTileDistance);
          const movementMultiplier = Math.max(1, this.heroMovementSpeedMultiplier);
          this.heroMotionSpeedPixelsPerSecond = (pixelsPerTile / ARENA_SERVER_TICK_SECONDS) * movementMultiplier;
        }
        this.arenaInitialized = true;
      }
      this.heroGridX = nextHeroX;
      this.heroGridY = nextHeroY;
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
      this.lastKnownMonsterPositions.clear();
    } else if (msg.monsters !== undefined || msg.monster !== undefined) {
      // Guardar a posição interpolada antes de sincronizar a nova lista. Um
      // alvo que morreu pode desaparecer de msg.monsters, mas seu efeito de
      // impacto ainda precisa resolver o mesmo ponto, não outro monstro.
      this.monsters.forEach((monster) => {
        this.lastKnownMonsterPositions.set(monster.id, {
          x: monster.currentX,
          y: monster.currentY - 6,
        });
      });

      const activeMonsters: any[] = msg.monsters || (msg.monster ? [msg.monster] : []);
      const activeIds = new Set<string>();

      activeMonsters.forEach((mob: any, idx: number) => {
        if (!mob) return;
        const mobId = mob.id || `mob_${idx}`;
        if (mob.health !== undefined && mob.health <= 0) {
          // A posição anterior é a melhor referência visual disponível: o
          // backend já confirmou a morte e não deve ser criado um novo ator.
          return;
        }
        activeIds.add(mobId);

        const vKey = (mob.visual_key || mob.key || mob.name || '').toLowerCase();
        this.regionId = monsterRegistry.getBiomeKey(vKey) || this.regionId;

        const gridX = Number(mob.grid_x ?? 22 - (idx % 3));
        const gridY = Number(mob.grid_y ?? 9);
        const isRanged = (mob.attack_type || mob.attackType || '').toLowerCase() === 'ranged';
        const isoPosition = this.arenaActorScreenPosition(gridX, gridY);
        const isIsoMessage = this.isIsoArena || msg.arena?.key === 'forest';
        const combatWidthScale = this.width / 680;
        const defaultBattleX = isRanged
          ? Math.min(this.width - 100, (270 + (activeMonsters.length - 1 - idx) * 40) * combatWidthScale)
          : Math.min(this.width - 140, (165 + (activeMonsters.length - 1 - idx) * 36) * combatWidthScale);
        const targetPixelX = isIsoMessage
          ? isoPosition.x
          : mob.grid_x !== undefined && mob.grid_x < 12
            ? Math.max(190, Math.min(this.width - 80, (mob.grid_x * 32 + 16) * combatWidthScale))
            : defaultBattleX;
        const targetPixelY = isIsoMessage ? isoPosition.y : BATTLE_GROUND_Y + (gridY - 4) * 12;

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
            movementSpeedMultiplier: Number(mob.movement_speed_multiplier ?? 1) || 1,
            statusEffects: mob.status_effects || [],
            // O servidor já informa o tile de nascimento. O monstro surge no
            // próprio mapa e recebe apenas uma transição visual de teleporte.
            currentX: targetPixelX,
            currentY: targetPixelY,
            targetX: targetPixelX,
            targetY: targetPixelY,
            motionSpeedPixelsPerSecond: 0,
            gridX,
            gridY,
            facing: -1,
            walkDistance: 0,
            isWalking: false,
            hitFlashTimer: 0,
            spawnTimer: 0.85,
            spawnDuration: 0.85,
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
          m.movementSpeedMultiplier = Number(mob.movement_speed_multiplier ?? m.movementSpeedMultiplier ?? 1) || 1;
          m.statusEffects = mob.status_effects || m.statusEffects;
          if (gridX !== m.gridX || gridY !== m.gridY) {
            const distanceToTarget = Math.hypot(targetPixelX - m.currentX, targetPixelY - m.currentY);
            m.motionSpeedPixelsPerSecond = distanceToTarget / ARENA_SERVER_TICK_SECONDS;
          }
          m.gridX = gridX;
          m.gridY = gridY;
          m.targetX = targetPixelX;
          m.targetY = targetPixelY;
        }

        this.lastKnownMonsterPositions.set(mobId, {
          x: m.currentX,
          y: m.currentY - 6,
        });
      });

      // Remover monstros que não existem mais apenas quando a lista veio explicitamente definida
      this.monsters.forEach((_, id) => {
        if (!activeIds.has(id)) {
          this.monsters.delete(id);
        }
      });
    }

    this.updateBattleFacing();

    // 4. Animar Efeitos Modulares de Combate (Combat Effects Protocol)
    const monsterPosMap = new Map<string, Position>();
    this.monsters.forEach((m) => {
      monsterPosMap.set(m.id, { x: m.currentX, y: m.currentY });
    });

    if (this.isActive && msg.combat_effects && msg.combat_effects.length > 0) {
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
          } else {
            // Um ataque básico posterior não pode herdar a animação da magia
            // emitida antes no mesmo tick.
            attackSkillKey = undefined;
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
    } else if (this.isActive && msg.damage_dealt && msg.damage_dealt > 0) {
      this.triggerAttackAnimation();
      const defTarget = this.resolveTargetPos();
      this.addFloatingText(`-${msg.damage_dealt}`, defTarget.x, defTarget.y - 45, '#fca5a5', 1.0, -0.85, -2.0);
    }

    if (this.isActive && msg.damage_taken && msg.damage_taken > 0) {
      // A arena isométrica muda a altura do herói conforme o tile. Usar o
      // ground fixo da batalha antiga colocava o dano longe do sprite, às
      // vezes fora da área visível acima da cabeça.
      this.addFloatingText(`-${msg.damage_taken}`, this.heroX, this.heroY - 48, '#f87171', 1.12, (Math.random() - 0.5) * 0.8, -2.0);

      // Disparo de magia/fogo de monstros à distância contra o herói
      this.monsters.forEach((m) => {
        if (m.attackType === 'ranged') {
          const projectile = monsterRegistry.getProjectile(m.visualKey || m.key || '');
          const isMagicMob = (projectile.type as string) === 'spell' || projectile.color.includes('38bdf8') || projectile.color.includes('purple');
          const isStaffMob = (m.visualKey || m.key || '').includes('mage') || (m.visualKey || m.key || '').includes('darkmage') || (m.visualKey || m.key || '').includes('necromancer');
          const mobProjType = projectile.type === 'fireball' ? 'fireball' : isStaffMob ? 'staff_vortex' : isMagicMob ? 'wand_star' : 'arrow';

          this.projectiles.push({
            id: `enemy_proj_${Date.now()}_${Math.random()}`,
            startX: m.currentX + m.facing * 15,
            startY: m.currentY - 5,
            targetX: this.heroX,
            targetY: this.heroY,
            currentX: m.currentX + m.facing * 15,
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
    if (targetId) {
      if (this.monsters.has(targetId)) {
        const m = this.monsters.get(targetId)!;
        return { x: m.currentX, y: m.currentY - 6 };
      }
      const lastKnownPosition = this.lastKnownMonsterPositions.get(targetId);
      if (lastKnownPosition) {
        return { ...lastKnownPosition };
      }

      // Um target_id explícito nunca pode ser redirecionado para outro
      // monstro. Isso causava o dash fictício no último golpe do guerreiro.
      return { x: this.heroX, y: this.heroY - 6 };
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
    // O alvo do último golpe pode ter sido removido da lista de vivos neste
    // mesmo evento. A orientação do herói deve seguir o ponto real do golpe,
    // não um monstro sobrevivente escolhido como fallback visual.
    this.faceHeroTowardScreenX(targetPos.x);

    if (isMagic) {
      const weaponName = (this.mainHandItem?.name || '').toLowerCase();
      const weaponHands = this.mainHandItem?.hands || 1;
      const isStaff = weaponName.includes('cajado') || weaponName.includes('staff') || weaponName.includes('cetro') || weaponHands === 2;
      const projType = isStaff ? 'staff_vortex' : 'wand_star';

      this.projectiles.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        startX: this.heroX + this.heroFacing * 18,
        startY: this.heroY - 5,
        targetId: targetId,
        targetX: targetPos.x,
        targetY: targetPos.y,
        currentX: this.heroX + this.heroFacing * 18,
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
        startX: this.heroX + this.heroFacing * 18,
        startY: this.heroY - 5,
        targetId: targetId,
        targetX: targetPos.x,
        targetY: targetPos.y,
        currentX: this.heroX + this.heroFacing * 18,
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
      // Guerreiro Melee: salto/avanço na direção real do alvo, agora em dois
      // eixos da arena, em vez do deslocamento horizontal fixo da batalha 2D.
      const targetAdvanceX = this.heroX + (targetPos.x - this.heroX) * 0.72;
      const targetAdvanceY = this.heroY + (targetPos.y - this.heroY) * 0.72;
      this.heroLeapStartX = this.heroX;
      this.heroLeapTargetX = targetAdvanceX;
      this.heroLeapStartY = this.heroY;
      this.heroLeapTargetY = targetAdvanceY;

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
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.handleCampPointerDown);
      this.canvas.removeEventListener('pointermove', this.handleCampPointerMove);
      this.canvas.removeEventListener('pointerup', this.handleCampPointerUp);
      this.canvas.removeEventListener('pointercancel', this.handleCampPointerUp);
      campSceneRenderer.setPlacementPreview(null);
    }
    window.removeEventListener('keydown', this.handleCampKeyDown);
    window.removeEventListener('keydown', this.handleHeroKeyDown);
    window.removeEventListener('keyup', this.handleHeroKeyUp);
    window.removeEventListener('blur', this.handleHeroWindowBlur);
    this.stopManualHeroMovement();
    this.draggingBuildingSlotKey = null;
    this.draggingBuildingPoint = null;
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}
