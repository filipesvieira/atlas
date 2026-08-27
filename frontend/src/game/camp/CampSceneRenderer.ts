import type { CampState, SettlementResident } from '../../hooks/useGameSocket';
import { CampBuildingRegistry } from './CampBuildingRegistry';
import {
  CAMP_GRID_HEIGHT,
  CAMP_GRID_WIDTH,
  LegacySlotDefaults,
  getBuildingVisualProfile,
  getGridFootprint,
  tileToScreen,
} from './CampLayoutRegistry';
import { BuildingRenderContext, CampPlacementPreview } from './types';
import { constructionOverlayRenderer } from './renderers/ConstructionOverlayRenderer';
import {
  buildCampScreenRoute,
  CampObstacle,
  CampRoute,
  findNearestCampWalkableTile,
  getCampObstacles,
  sampleCampScreenRoute,
} from './CampCollision';

interface SceneRenderEntry {
  depth: number;
  stableOrder: number;
  render: () => void;
  slotKey?: string;
  hitRegion?: { x: number; y: number; width: number; height: number };
}

interface ResidentSceneState {
  resident: SettlementResident;
  x: number;
  y: number;
  bob: number;
  walking: boolean;
  crafting: boolean;
  facing: number;
  role: 'fisher' | 'extractor' | 'cultivator' | 'craftsman';
  index: number;
}

export interface CampHeroSceneState {
  x: number;
  y: number;
  groundY: number;
  walking: boolean;
  facing: number;
}

const MAX_VISIBLE_RESIDENTS = 10;

export class CampSceneRenderer {
  private hitRegions = new Map<string, { x: number; y: number; width: number; height: number }>();
  private placementPreview: CampPlacementPreview | null = null;
  private collisionObstacles: CampObstacle[] = [];
  private collisionSignature = '';
  private collisionRoutes = new Map<string, CampRoute>();

  private refreshCollision(camp: CampState | null) {
    const obstacles = getCampObstacles(camp);
    const signature = obstacles
      .map((obstacle) => `${obstacle.slotKey}:${obstacle.tileX},${obstacle.tileY},${obstacle.width},${obstacle.height}`)
      .sort()
      .join('|');
    if (signature === this.collisionSignature) return;
    this.collisionSignature = signature;
    this.collisionObstacles = obstacles;
    this.collisionRoutes.clear();
  }

  private getCollisionRoute(startX: number, startY: number, endX: number, endY: number) {
    const key = `${startX},${startY}->${endX},${endY}`;
    const cached = this.collisionRoutes.get(key);
    if (cached) return cached;
    const route = buildCampScreenRoute(
      { x: startX, y: startY },
      { x: endX, y: endY },
      this.collisionObstacles,
    );
    this.collisionRoutes.set(key, route);
    return route;
  }

  public setPlacementPreview(preview: CampPlacementPreview | null) {
    this.placementPreview = preview;
  }

  public hitTest(x: number, y: number): string | null {
    const regions = Array.from(this.hitRegions.entries()).reverse();
    for (const [slotKey, rect] of regions) {
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) return slotKey;
    }
    return null;
  }

  public isPlacementValid(camp: CampState | null, slotKey: string, tileX: number, tileY: number, rotation = 0): boolean {
    const moving = camp?.buildings?.[slotKey];
    if (!moving) return false;
    const fp = getGridFootprint(moving.building_key, rotation);
    if (tileX < 0 || tileY < 0 || tileX + fp.width > CAMP_GRID_WIDTH || tileY + fp.height > CAMP_GRID_HEIGHT) return false;
    for (const [otherKey, other] of Object.entries(camp?.buildings || {})) {
      const otherDiscovered = other.building_key === 'campfire' || Boolean(camp?.blueprints?.[other.building_key]) || other.level > 0;
      if (otherKey === slotKey || (!otherDiscovered && other.level <= 0 && !other.upgrade_target_level)) continue;
      const otherFP = getGridFootprint(other.building_key, other.rotation || 0);
      if (tileX < other.tile_x + otherFP.width && tileX + fp.width > other.tile_x && tileY < other.tile_y + otherFP.height && tileY + fp.height > other.tile_y) return false;
    }
    return true;
  }

  /** Posição visual do herói no acampamento, compartilhando a malha dos moradores. */
  public getHeroSceneState(time: number, camp: CampState | null = null): CampHeroSceneState {
    this.refreshCollision(camp);
    const route = this.getCollisionRoute(8, 14, 15, 9);
    const start = sampleCampScreenRoute(route, 0);
    const end = sampleCampScreenRoute(route, 1);
    const cycle = 18000;
    const progress = (time % cycle) / cycle;
    let x = start.x;
    let groundY = start.y;
    let walking = false;
    let facing = 1;

    if (progress < 0.10) {
      facing = 1;
    } else if (progress < 0.46) {
      const t = (progress - 0.10) / 0.36;
      x = start.x + (end.x - start.x) * t;
      groundY = start.y + (end.y - start.y) * t;
      walking = true;
      facing = end.x >= start.x ? 1 : -1;
    } else if (progress < 0.56) {
      x = end.x;
      groundY = end.y;
      facing = end.x >= start.x ? 1 : -1;
    } else if (progress < 0.92) {
      const t = (progress - 0.56) / 0.36;
      x = end.x + (start.x - end.x) * t;
      groundY = end.y + (start.y - end.y) * t;
      walking = true;
      facing = end.x >= start.x ? -1 : 1;
    } else {
      facing = -1;
    }

    return { x, y: groundY - 24, groundY, walking, facing };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camp: CampState | null,
    time: number,
    residents: SettlementResident[] = [],
    heroRenderer?: (state: CampHeroSceneState) => void
  ) {
    const slotsMap = camp?.buildings || {};
    const blueprintsMap = camp?.blueprints || {};
    this.refreshCollision(camp);
    this.hitRegions.clear();

    const renderQueue: SceneRenderEntry[] = [];
    let stableOrder = 0;

    for (const slotData of Object.values(slotsMap)) {
      const buildingKey = slotData.building_key;
      const isDiscovered = buildingKey === 'campfire' || Boolean(blueprintsMap[buildingKey]) || slotData.level > 0;
      if (!isDiscovered) continue;

      const renderer = CampBuildingRegistry.get(buildingKey);
      if (!renderer) continue;

      const legacyPos = LegacySlotDefaults[slotData.slot_key] || { tileX: 0, tileY: 0 };
      const tileX = Number.isFinite(slotData.tile_x) ? slotData.tile_x : legacyPos.tileX;
      const tileY = Number.isFinite(slotData.tile_y) ? slotData.tile_y : legacyPos.tileY;
      const rotation = slotData.rotation || 0;
      const gridFP = getGridFootprint(buildingKey, rotation);
      const center = tileToScreen(tileX + (gridFP.width - 1) / 2, tileY + (gridFP.height - 1) / 2);
      const visual = getBuildingVisualProfile(buildingKey);
      const groundY = center.y + gridFP.height * visual.groundOffset;

      let isUnderConstruction = false;
      let constructionProgress = 0;
      let targetLevel = (slotData.level || 0) + 1;
      if (slotData.upgrade_target_level && slotData.upgrade_started_at && slotData.upgrade_ends_at) {
        const startAt = new Date(slotData.upgrade_started_at).getTime();
        const endAt = new Date(slotData.upgrade_ends_at).getTime();
        const now = Date.now();
        if (now < endAt) {
          isUnderConstruction = true;
          targetLevel = slotData.upgrade_target_level;
          constructionProgress = Math.min(100, Math.max(0, ((now - startAt) / Math.max(1, endAt - startAt)) * 100));
        }
      }

      const footprint = {
        width: Math.round(visual.silhouetteWidth * visual.sceneScale),
        height: Math.round(visual.silhouetteHeight * visual.sceneScale),
      };
      const groundHitPadding = Math.max(12, Math.round(footprint.height * 0.45));
      const renderCtx: BuildingRenderContext = {
        ctx,
        level: slotData.level || 0,
        targetLevel,
        discovered: true,
        isUnderConstruction,
        constructionProgress,
        x: center.x,
        y: groundY,
        scale: visual.sceneScale,
        time,
        footprint,
      };

      renderQueue.push({
        // O pé do objeto define profundidade no isométrico. NPCs atrás da casa
        // deixam de aparecer sempre por cima dela.
        depth: groundY,
        stableOrder: stableOrder++,
        slotKey: slotData.slot_key,
        hitRegion: {
          x: center.x - footprint.width / 2,
          y: groundY - footprint.height,
          width: footprint.width,
          height: footprint.height + groundHitPadding,
        },
        render: () => {
          renderer(ctx, renderCtx);
          if (isUnderConstruction) {
            constructionOverlayRenderer.render(ctx, {
              currentLevel: slotData.level || 0,
              targetLevel,
              progress: constructionProgress,
              footprint,
              x: center.x,
              groundY,
              time,
            });
          }
        },
      });
    }

    if (heroRenderer) {
      const heroState = this.getHeroSceneState(time, camp);
      renderQueue.push({
        depth: heroState.groundY,
        stableOrder: stableOrder++,
        render: () => heroRenderer(heroState),
      });
    }

    const residentStates = this.calculateResidentStates(camp, residents, time);
    for (const state of residentStates) {
      renderQueue.push({
        depth: state.y,
        stableOrder: stableOrder++,
        render: () => this.renderResidentState(ctx, state, time),
      });
    }

    renderQueue
      .sort((a, b) => a.depth - b.depth || a.stableOrder - b.stableOrder)
      .forEach((entry) => {
        if (entry.slotKey && entry.hitRegion) this.hitRegions.set(entry.slotKey, entry.hitRegion);
        entry.render();
      });

    if (this.placementPreview && camp?.buildings?.[this.placementPreview.slotKey]) {
      this.renderPlacementPreview(ctx, camp, this.placementPreview);
    }
  }

  private renderPlacementPreview(ctx: CanvasRenderingContext2D, camp: CampState, preview: CampPlacementPreview) {
    const building = camp.buildings[preview.slotKey];
    const fp = getGridFootprint(building.building_key, preview.rotation);
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = preview.valid ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.35)';
    ctx.strokeStyle = preview.valid ? '#4ade80' : '#f87171';
    ctx.lineWidth = 2;
    for (let x = 0; x < fp.width; x++) {
      for (let y = 0; y < fp.height; y++) {
        const c = tileToScreen(preview.tileX + x, preview.tileY + y);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 8);
        ctx.lineTo(c.x + 16, c.y);
        ctx.lineTo(c.x, c.y + 8);
        ctx.lineTo(c.x - 16, c.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private calculateResidentStates(camp: CampState | null, residents: SettlementResident[], time: number): ResidentSceneState[] {
    const presentResidents = residents
      .filter((resident) => resident.status !== 'collecting')
      .sort((a, b) => a.name.localeCompare(b.name));
    const craftingResidents = presentResidents.filter((resident) => resident.status === 'crafting');
    const idleResidents = presentResidents.filter((resident) => resident.status !== 'crafting');
    const idleCapacity = Math.max(0, MAX_VISIBLE_RESIDENTS - craftingResidents.length);
    const visibleIdle: SettlementResident[] = [];
    if (idleCapacity > 0 && idleResidents.length > 0) {
      const rotationOffset = Math.floor(time / 30000) % idleResidents.length;
      for (let i = 0; i < Math.min(idleCapacity, idleResidents.length); i++) {
        visibleIdle.push(idleResidents[(rotationOffset + i) % idleResidents.length]);
      }
    }
    const visibleResidents = [...craftingResidents.slice(0, MAX_VISIBLE_RESIDENTS), ...visibleIdle]
      .slice(0, MAX_VISIBLE_RESIDENTS);

    this.refreshCollision(camp);
    const route = (sx: number, sy: number, ex: number, ey: number) => (
      this.getCollisionRoute(sx, sy, ex, ey)
    );

    // Rotas longas e espalhadas pelo terreno V3. Com 20+ moradores o sistema
    // simula a população inteira, mas somente um subconjunto representativo é
    // desenhado simultaneamente para preservar leitura visual e FPS.
    const traversalRoutes = [
      route(3, 14, 20, 14),
      route(4, 11, 19, 7),
      route(5, 15, 18, 5),
      route(3, 8, 20, 10),
      route(7, 16, 17, 4),
      route(2, 12, 21, 8),
      route(5, 6, 19, 15),
      route(8, 4, 20, 13),
      route(3, 5, 15, 16),
      route(9, 16, 21, 6),
    ];

    return visibleResidents.map((resident, index) => {
      const skills = new Set((resident.skills || []).map((skill) => skill.skill_key));
      let role: ResidentSceneState['role'] = 'cultivator';
      if (skills.has('fisher')) {
        role = 'fisher';
      } else if (skills.has('lumberjack') || skills.has('miner')) {
        role = 'extractor';
      } else if (skills.has('blacksmith') || skills.has('jeweler') || skills.has('alchemist') || skills.has('woodworker') || skills.has('cook')) {
        role = 'craftsman';
      }

      const isCrafting = resident.status === 'crafting';
      const selectedRoute = traversalRoutes[index % traversalRoutes.length];
      const totalCycle = 26000 + index * 3100;
      const cycleProgress = ((time + index * 5200) % totalCycle) / totalCycle;

      let currentX: number;
      let currentY: number;
      let isWalking = false;
      let facing = 1;
      const start = sampleCampScreenRoute(selectedRoute, 0);
      const end = sampleCampScreenRoute(selectedRoute, 1);

      if (isCrafting) {
        const target = this.resolveWorkPoint(camp, skills, index);
        currentX = target.x;
        currentY = target.y;
      } else if (cycleProgress < 0.43) {
        const t = cycleProgress / 0.43;
        const point = sampleCampScreenRoute(selectedRoute, t);
        currentX = point.x;
        currentY = point.y + Math.sin(t * Math.PI * 4) * 1.5;
        isWalking = true;
        facing = end.x >= start.x ? 1 : -1;
      } else if (cycleProgress < 0.52) {
        currentX = end.x;
        currentY = end.y;
        facing = 1;
      } else if (cycleProgress < 0.94) {
        const t = (cycleProgress - 0.52) / 0.42;
        const point = sampleCampScreenRoute(selectedRoute, 1 - t);
        currentX = point.x;
        currentY = point.y + Math.sin(t * Math.PI * 4) * 1.5;
        isWalking = true;
        facing = end.x >= start.x ? -1 : 1;
      } else {
        currentX = start.x;
        currentY = start.y;
        facing = -1;
      }

      const bob = isCrafting
        ? Math.abs(Math.sin(time / 140)) * 2.1
        : isWalking
          ? Math.abs(Math.sin(time / 145)) * 1.7
          : Math.sin(time / 500 + index * 1.3) * 0.8;

      return {
        resident,
        x: currentX,
        y: currentY,
        bob,
        walking: isWalking,
        crafting: isCrafting,
        facing,
        role,
        index,
      };
    });
  }

  private resolveWorkPoint(camp: CampState | null, skills: Set<string>, index: number) {
    let preferredBuilding = 'workbench';
    if (skills.has('cook')) preferredBuilding = 'kitchen';
    else if (skills.has('alchemist')) preferredBuilding = 'alchemy_bench';

    const building = Object.values(camp?.buildings || {}).find((slot) => slot.building_key === preferredBuilding && slot.level > 0);
    this.refreshCollision(camp);
    const obstacles = this.collisionObstacles;
    if (!building) {
      const fallbackTile = findNearestCampWalkableTile({ x: 12 + (index % 3), y: 10 + (index % 2) }, obstacles);
      const fallback = tileToScreen(fallbackTile.x, fallbackTile.y);
      return { x: fallback.x + (index % 2 === 0 ? -7 : 7), y: fallback.y };
    }

    const fp = getGridFootprint(building.building_key, building.rotation || 0);
    const accessTile = findNearestCampWalkableTile({
      x: building.tile_x + Math.floor(fp.width / 2),
      y: building.tile_y + fp.height,
    }, obstacles);
    const center = tileToScreen(accessTile.x, accessTile.y);
    const lane = index % 3;
    return {
      x: center.x + (lane - 1) * 6,
      y: center.y + (lane % 2) * 3,
    };
  }

  private renderResidentState(ctx: CanvasRenderingContext2D, state: ResidentSceneState, time: number) {
    const { resident, x, y, bob, role, crafting, walking, facing, index } = state;
    this.renderResidentSprite(ctx, x, y - bob, role, crafting, walking, facing, time + index * 200, index);

    // Nomes deixam de ficar permanentemente empilhados. Trabalhadores em
    // movimento são reconhecidos pelo sprite/roupa; placas aparecem quando
    // param ou executam uma profissão.
    if (walking && !crafting) return;

    ctx.save();
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    const label = resident.name;
    const width = Math.max(44, ctx.measureText(label).width + 8);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(Math.round(x - width / 2), y - 46 - bob, Math.round(width), 10);
    ctx.strokeStyle = crafting ? '#f59e0b' : '#475569';
    ctx.strokeRect(Math.round(x - width / 2) + 0.5, y - 45.5 - bob, Math.round(width) - 1, 9);
    ctx.fillStyle = crafting ? '#fbbf24' : '#e2e8f0';
    ctx.fillText(label, x, y - 38 - bob);
    ctx.restore();
  }

  private renderResidentSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    role: 'fisher' | 'extractor' | 'cultivator' | 'craftsman',
    crafting: boolean,
    walking: boolean,
    facing: number,
    time: number,
    seed: number
  ) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // 1. Sombra projetada no solo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Espelha no eixo X conforme a direção de caminhada
    if (facing === -1) {
      ctx.scale(-1, 1);
    }

    const blink = Math.sin(time / 1500 + seed * 3) > 0.96;
    const breathe = Math.sin(time / 450 + seed) * 0.8;
    const walkStep = walking ? Math.sin(time / 120) * 3 : 0;

    // Paletas de Tons de Pele e Cabelo baseadas no índice
    const skinTones = ['#fed7aa', '#fde68a', '#fbcfe8', '#fdba74'];
    const hairTones = ['#78350f', '#451a03', '#92400e', '#1c1917', '#b45309'];
    const skin = skinTones[seed % skinTones.length];
    const hair = hairTones[seed % hairTones.length];

    // 2. Botas e Pernas Humanóides com passos
    ctx.fillStyle = '#18181b'; // Solado
    ctx.fillRect(-7 - walkStep, 16, 5, 2);
    ctx.fillRect(2 + walkStep, 16, 5, 2);

    // Botas de Couro
    const bootColor = role === 'extractor' ? '#451a03' : role === 'fisher' ? '#1e293b' : '#78350f';
    ctx.fillStyle = bootColor;
    ctx.fillRect(-6 - walkStep, 10, 4, 6);
    ctx.fillRect(2 + walkStep, 10, 4, 6);

    // Calça com volume e dobra
    const pantsColor = role === 'fisher' ? '#1e3a8a' : role === 'extractor' ? '#1e293b' : role === 'craftsman' ? '#334155' : '#b45309';
    ctx.fillStyle = pantsColor;
    ctx.fillRect(-6 - walkStep * 0.5, 3, 4, 8);
    ctx.fillRect(2 + walkStep * 0.5, 3, 4, 8);
    ctx.fillRect(-6, 2, 12, 3); // Cintura

    // Cinto com fivela de latão
    ctx.fillStyle = '#292524';
    ctx.fillRect(-6, 1, 12, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-1.5, 1, 3, 2);

    // 3. Torso e Vestimentas (Y: -10 a 2)
    if (role === 'fisher') {
      // Camisa listrada azul e branca com colete corta-vento
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-6, -9 + breathe, 12, 10);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-6, -7 + breathe, 12, 2);
      ctx.fillRect(-6, -3 + breathe, 12, 2);
      // Colete azul marinho
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-7, -9 + breathe, 3, 10);
      ctx.fillRect(4, -9 + breathe, 3, 10);
    } else if (role === 'extractor') {
      // Camisa de flanela vermelha com suspensórios de couro
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6, -9 + breathe, 12, 10);
      ctx.fillStyle = '#991b1b'; // Xadrez
      ctx.fillRect(-6, -6 + breathe, 12, 2);
      ctx.fillRect(-2, -9 + breathe, 4, 10);
      // Suspensórios
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-5, -9 + breathe, 2, 10);
      ctx.fillRect(3, -9 + breathe, 2, 10);
    } else if (role === 'craftsman') {
      // Camisa de linho marfim com avental reforçado de ferreiro
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-6, -9 + breathe, 12, 10);
      // Avental de couro
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4, -6 + breathe, 8, 9);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-3, -9 + breathe, 1.5, 4);
      ctx.fillRect(1.5, -9 + breathe, 1.5, 4);
    } else {
      // Túnica verde de linho de cultivador com gola em V
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-6, -9 + breathe, 12, 10);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-6, -9 + breathe, 2, 10);
      ctx.fillRect(4, -9 + breathe, 2, 10);
      ctx.fillStyle = skin; // Gola aberta em V
      ctx.fillRect(-1.5, -9 + breathe, 3, 3);
    }

    // 4. Braços e Mãos (Humanóides)
    ctx.fillStyle = role === 'fisher' ? '#1d4ed8' : role === 'extractor' ? '#dc2626' : role === 'craftsman' ? '#fef3c7' : '#16a34a';
    ctx.fillRect(-8, -8 + breathe, 2.5, 7);
    ctx.fillRect(5.5, -8 + breathe, 2.5, 7);
    ctx.fillStyle = skin; // Mãos
    ctx.fillRect(-8, -1 + breathe, 2.5, 2.5);
    ctx.fillRect(5.5, -1 + breathe, 2.5, 2.5);

    // 5. Cabeça e Rosto Humanóide Completo (Y: -20 a -9)
    // Cabeça
    ctx.fillStyle = skin;
    ctx.fillRect(-4.5, -18 + breathe, 9, 9);
    // Nariz / Bochecha
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(-0.5, -13 + breathe, 1, 1.5);
    // Olhos Expressivos (com piscada)
    if (!blink) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-3, -15 + breathe, 1.5, 2);
      ctx.fillRect(1.5, -15 + breathe, 1.5, 2);
    } else {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-3, -14 + breathe, 2, 1);
      ctx.fillRect(1, -14 + breathe, 2, 1);
    }
    // Boca / Sorriso sutil
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-1.5, -11 + breathe, 3, 1);

    // 6. Cabelo ou Chapéu Típico por Profissão
    if (role === 'fisher') {
      // Chapéu de pescador amarelo-mostarda com aba
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-7, -19 + breathe, 14, 2.5);
      ctx.fillRect(-5, -23 + breathe, 10, 4.5);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-5, -20 + breathe, 10, 1.5);
    } else if (role === 'cultivator') {
      // Chapéu de palha de fazendeiro com fita verde
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-8, -19 + breathe, 16, 2.5);
      ctx.fillRect(-5, -23 + breathe, 10, 4.5);
      ctx.fillStyle = '#15803d'; // Fita verde
      ctx.fillRect(-5, -20 + breathe, 10, 1.5);
    } else if (role === 'extractor') {
      // Bandana de minerador / lenhador com cabelo volumoso
      ctx.fillStyle = hair;
      ctx.fillRect(-5.5, -21 + breathe, 11, 4);
      ctx.fillRect(-5.5, -18 + breathe, 2, 5);
      ctx.fillRect(3.5, -18 + breathe, 2, 5);
      ctx.fillStyle = '#dc2626'; // Bandana vermelha
      ctx.fillRect(-5, -18 + breathe, 10, 2);
    } else {
      // Cabelo ondulado clássico volumoso
      ctx.fillStyle = hair;
      ctx.fillRect(-5.5, -21 + breathe, 11, 5);
      ctx.fillRect(-5.5, -18 + breathe, 2, 6);
      ctx.fillRect(3.5, -18 + breathe, 2, 6);
    }

    // 7. Ferramentas e Equipamentos Profissionais
    if (role === 'fisher') {
      // Vara de pesca de bambu com linha curvada e balde
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(7, 0 + breathe);
      ctx.lineTo(16, -18 + breathe);
      ctx.stroke();
      // Linha de nylon transparente
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, -18 + breathe);
      ctx.quadraticCurveTo(20, -5 + breathe, 21, 12);
      ctx.stroke();
      // Balde de metal com água/peixe
      ctx.fillStyle = '#64748b';
      ctx.fillRect(17, 8, 7, 9);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(18, 8, 5, 2);
    } else if (role === 'extractor') {
      // Machado de lenhador / Picareta de minerador com animação de corte/trabalho
      const toolAngle = crafting ? Math.sin(time / 110) * 0.7 - 0.2 : Math.sin(time / 600) * 0.15 + 0.2;
      ctx.save();
      ctx.translate(7, 0 + breathe);
      ctx.rotate(toolAngle);
      // Cabo de madeira nobre
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1, -16, 2.5, 24);
      // Lâmina de aço temperado
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-7, -17, 9, 6);
      ctx.fillStyle = '#cbd5e1'; // Fio de corte brilhante
      ctx.fillRect(-7, -17, 2, 6);
      ctx.restore();
    } else if (role === 'craftsman') {
      // Martelo de forja ou pinça nas mãos
      const hammerAngle = crafting ? Math.sin(time / 100) * 0.8 : 0.2;
      ctx.save();
      ctx.translate(7, 0 + breathe);
      ctx.rotate(hammerAngle);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1, -10, 2, 16);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-4, -13, 8, 5);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-4, -13, 2, 5);
      ctx.restore();
    } else {
      // Cultivador: Cesta de vime com trigo/ervas ou foice de colheita
      ctx.fillStyle = '#b45309'; // Cesta de vime
      ctx.fillRect(7, 3 + breathe, 8, 8);
      ctx.fillStyle = '#fde047'; // Trigo colhido
      ctx.fillRect(8, 0 + breathe, 2, 4);
      ctx.fillRect(11, -1 + breathe, 2, 5);
      ctx.fillRect(13, 1 + breathe, 2, 3);
    }

    // 8. Efeito de Crafting Ativo (Faíscas e Martelo)
    if (crafting) {
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      const bounce = Math.abs(Math.sin(time / 110)) * 4;
      ctx.fillText('🔨', 0, -29 - bounce);
      // Faíscas douradas
      const sparkAlpha = Math.abs(Math.sin(time / 80));
      ctx.fillStyle = `rgba(251, 191, 36, ${sparkAlpha})`;
      ctx.fillRect(10 + Math.sin(time / 60) * 6, -10 - Math.cos(time / 60) * 6, 2, 2);
      ctx.fillRect(-8 + Math.cos(time / 70) * 5, -8 + Math.sin(time / 70) * 5, 1.5, 1.5);
    }

    ctx.restore();
  }
}

export const campSceneRenderer = new CampSceneRenderer();