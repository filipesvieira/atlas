import type { CampState, BuildingSlot } from '../../../hooks/useGameSocket';
import { getSettlementStageBounds, tileToScreen } from '../CampLayoutRegistry';
import { renderGatePreview } from './DefenseBuildingRenderers';

export interface FortificationRenderEntry {
  depth: number;
  stableOrder: number;
  render: () => void;
  slotKey?: string;
  hitRegion?: { x: number; y: number; width: number; height: number };
}

function findBuilding(camp: CampState | null, buildingKey: string): BuildingSlot | undefined {
  return Object.values(camp?.buildings || {}).find((slot) => slot.building_key === buildingKey);
}

function renderedLevel(slot?: BuildingSlot) {
  if (!slot) return 0;
  if ((slot.level || 0) > 0) return Math.min(3, slot.level || 0);
  return slot.upgrade_target_level ? Math.min(3, slot.upgrade_target_level) : 0;
}

function wallPalette(level: number) {
  if (level >= 3) return { top: '#c4b5fd', face: '#475569', dark: '#312e81', edge: '#1e1b4b' };
  if (level >= 2) return { top: '#cbd5e1', face: '#57534e', dark: '#44403c', edge: '#1c1917' };
  return { top: '#a16207', face: '#78350f', dark: '#451a03', edge: '#292524' };
}

function drawWallSegment(ctx: CanvasRenderingContext2D, x: number, y: number, axis: 'x' | 'y', level: number, underConstruction: boolean, time: number) {
  const height = 13 + level * 5;
  const palette = wallPalette(level);
  const dx = axis === 'x' ? 16 : -16;
  const dy = 8;
  const nx = axis === 'x' ? 3 : -3;
  const ny = axis === 'x' ? -6 : -6;

  ctx.save();
  ctx.globalAlpha = underConstruction ? 0.74 : 1;
  ctx.translate(Math.round(x), Math.round(y));

  // Face vertical voltada para a câmera.
  ctx.fillStyle = palette.face;
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-dx / 2, -dy / 2);
  ctx.lineTo(dx / 2, dy / 2);
  ctx.lineTo(dx / 2, dy / 2 - height);
  ctx.lineTo(-dx / 2, -dy / 2 - height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Topo dá leitura de espessura ao perímetro.
  ctx.fillStyle = palette.top;
  ctx.beginPath();
  ctx.moveTo(-dx / 2, -dy / 2 - height);
  ctx.lineTo(dx / 2, dy / 2 - height);
  ctx.lineTo(dx / 2 + nx, dy / 2 + ny - height);
  ctx.lineTo(-dx / 2 + nx, -dy / 2 + ny - height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Merlões/reforços crescem com o nível.
  const postCount = level >= 2 ? 2 : 1;
  for (let i = 0; i < postCount; i++) {
    const t = postCount === 1 ? 0 : (i === 0 ? -0.27 : 0.27);
    const px = dx * t;
    const py = dy * t - height - 5;
    ctx.fillStyle = palette.top;
    ctx.fillRect(Math.round(px - 2), Math.round(py), 5, 6);
    ctx.fillStyle = palette.dark;
    ctx.fillRect(Math.round(px - 2), Math.round(py + 5), 5, 2);
  }

  if (level >= 3) {
    ctx.fillStyle = 'rgba(167,139,250,0.58)';
    ctx.fillRect(Math.round(-dx / 2), Math.round(-dy / 2 - height - 3), Math.max(3, Math.round(Math.abs(dx))), 2);
    if (Math.floor((time / 330 + x + y) % 4) === 0) {
      ctx.fillStyle = '#ede9fe';
      ctx.fillRect(0, Math.round(-height - 7), 3, 3);
    }
  } else if (level >= 2 && Math.floor((x + y) / 2) % 3 === 0) {
    const flame = Math.round(Math.sin(time * 0.012 + x) * 1.2);
    ctx.fillStyle = 'rgba(251,191,36,0.20)';
    ctx.fillRect(-5, -height - 13, 10, 11);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-2, -height - 8 - flame, 5, 6 + flame);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(-1, -height - 6 - flame, 2, 3);
  }

  if (underConstruction) {
    ctx.strokeStyle = '#fbbf24';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(-10, -height - 9);
    ctx.lineTo(10, 7);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Muralha/Portão não ocupam lotes internos. O backend guarda nível, custo e
 * timers normalmente, enquanto o frontend materializa o cinturão ao redor do
 * limite territorial atual. Cada segmento possui profundidade própria para
 * intercalar corretamente com prédios/NPCs no isométrico.
 */
export function buildFortificationRenderEntries(
  ctx: CanvasRenderingContext2D,
  camp: CampState | null,
  stageKey: string,
  time: number,
  stableOrderStart = 0,
): FortificationRenderEntry[] {
  const wall = findBuilding(camp, 'wall');
  const gate = findBuilding(camp, 'gate');
  const wallLevel = renderedLevel(wall);
  const gateLevel = renderedLevel(gate);
  if (wallLevel <= 0) return [];

  const bounds = getSettlementStageBounds(stageKey);
  const entries: FortificationRenderEntry[] = [];
  let stableOrder = stableOrderStart;
  const gateCenterX = Math.floor((bounds.minX + bounds.maxX - 1) / 2);
  const gateHalfWidth = gateLevel > 0 ? 2 : 0;
  const wallBuilding = Boolean(wall?.upgrade_target_level);

  const addSegment = (tileX: number, tileY: number, axis: 'x' | 'y') => {
    const point = tileToScreen(tileX, tileY);
    entries.push({
      depth: point.y + 5,
      stableOrder: stableOrder++,
      slotKey: wall?.slot_key,
      hitRegion: wall ? { x: point.x - 12, y: point.y - 30, width: 24, height: 38 } : undefined,
      render: () => drawWallSegment(ctx, point.x, point.y + 3, axis, wallLevel, wallBuilding, time),
    });
  };

  // Bordas paralelas ao eixo X.
  for (let x = bounds.minX; x < bounds.maxX; x++) {
    addSegment(x, bounds.minY, 'x');
    const inGateOpening = gateLevel > 0 && Math.abs(x - gateCenterX) <= gateHalfWidth;
    if (!inGateOpening) addSegment(x, bounds.maxY - 1, 'x');
  }
  // Bordas paralelas ao eixo Y, sem repetir os quatro cantos.
  for (let y = bounds.minY + 1; y < bounds.maxY - 1; y++) {
    addSegment(bounds.minX, y, 'y');
    addSegment(bounds.maxX - 1, y, 'y');
  }

  if (gateLevel > 0) {
    const gatePoint = tileToScreen(gateCenterX, bounds.maxY - 1);
    const underConstruction = Boolean(gate?.upgrade_target_level);
    entries.push({
      depth: gatePoint.y + 24,
      stableOrder: stableOrder++,
      slotKey: gate?.slot_key,
      hitRegion: gate ? { x: gatePoint.x - 48, y: gatePoint.y - 78, width: 96, height: 94 } : undefined,
      render: () => {
        ctx.save();
        ctx.globalAlpha = underConstruction ? 0.78 : 1;
        renderGatePreview(ctx, {
          ctx,
          level: gateLevel,
          targetLevel: gate?.upgrade_target_level || gateLevel,
          discovered: true,
          isUnderConstruction: underConstruction,
          constructionProgress: 0,
          x: gatePoint.x,
          y: gatePoint.y + 9,
          scale: 0.56,
          time,
          footprint: { width: 86, height: 78 },
          variant: 'perimeter-south',
        });
        ctx.restore();
      },
    });
  }

  return entries;
}