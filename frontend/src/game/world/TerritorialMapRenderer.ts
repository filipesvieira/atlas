import { CAMP_VISUAL_PALETTE } from '../camp/CampVisualStyle';
import {
  drawIsoBox,
  drawIsoFootprint,
  drawIsoGroundPost,
  drawIsoRoof,
  drawIsoWalls,
} from '../camp/renderers/IsoBuildingPrimitives';
import { FOREST_NIGHT_PALETTE, WORLD_VISUAL_CONTRACT, stableVisualVariant } from '../WorldVisualStyle';

export interface TerritorialMapKingdomMarker {
  settlement_id: string;
  name: string;
  stage_key: string;
  x: number;
  y: number;
  distance: number;
  is_self: boolean;
  protected: boolean;
}

export interface TerritorialMapViewState {
  centerX: number;
  centerY: number;
  panX: number;
  panY: number;
  zoom: number;
}

export interface TerritorialMapRenderOptions {
  width: number;
  height: number;
  kingdoms: TerritorialMapKingdomMarker[];
  selectedID?: string | null;
  hoveredID?: string | null;
  intelStatusBySettlement?: Record<string, 'active' | 'fresh' | 'stale'>;
  view: TerritorialMapViewState;
}

export interface TerritorialStagePresentation {
  label: string;
  accent: string;
  fill: string;
}

export const TERRITORIAL_STAGE_PRESENTATION: Record<string, TerritorialStagePresentation> = {
  camp: { label: 'Acampamento', accent: '#fbbf24', fill: '#3b2b18' },
  outpost: { label: 'Posto', accent: '#fb923c', fill: '#40281d' },
  hamlet: { label: 'Vilarejo', accent: '#c084fc', fill: '#33243f' },
  village: { label: 'Vila', accent: '#4ade80', fill: '#173a2e' },
  city: { label: 'Cidade', accent: CAMP_VISUAL_PALETTE.magic, fill: '#12364a' },
  kingdom: { label: 'Reino', accent: '#f472b6', fill: '#43202d' },
};

export const TERRITORIAL_MAP_BASE_CELL = 78;
export const TERRITORIAL_MAP_MIN_ZOOM = 0.58;
export const TERRITORIAL_MAP_MAX_ZOOM = 2.65;

const FALLBACK_STAGE: TerritorialStagePresentation = {
  label: 'Assentamento',
  accent: CAMP_VISUAL_PALETTE.stoneLight,
  fill: '#293442',
};

function stagePresentation(stageKey: string) {
  return TERRITORIAL_STAGE_PRESENTATION[stageKey] || FALLBACK_STAGE;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function cellSize(view: TerritorialMapViewState) {
  return TERRITORIAL_MAP_BASE_CELL * clamp(view.zoom, TERRITORIAL_MAP_MIN_ZOOM, TERRITORIAL_MAP_MAX_ZOOM);
}

export function territorialWorldToScreen(
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  view: TerritorialMapViewState,
) {
  const size = cellSize(view);
  return {
    x: width / 2 + view.panX + (worldX - view.centerX) * size,
    y: height / 2 + view.panY - (worldY - view.centerY) * size,
  };
}

export function territorialScreenToWorld(
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  view: TerritorialMapViewState,
) {
  const size = cellSize(view);
  return {
    x: Math.round(view.centerX + (screenX - width / 2 - view.panX) / size),
    y: Math.round(view.centerY - (screenY - height / 2 - view.panY) / size),
  };
}

function visibleBounds(width: number, height: number, view: TerritorialMapViewState) {
  const size = cellSize(view);
  const left = view.centerX + (-width / 2 - view.panX) / size;
  const right = view.centerX + (width / 2 - view.panX) / size;
  const top = view.centerY - (-height / 2 - view.panY) / size;
  const bottom = view.centerY - (height / 2 - view.panY) / size;
  return {
    minX: Math.floor(Math.min(left, right)) - 1,
    maxX: Math.ceil(Math.max(left, right)) + 1,
    minY: Math.floor(Math.min(bottom, top)) - 1,
    maxY: Math.ceil(Math.max(bottom, top)) + 1,
  };
}

function hash01(x: number, y: number, salt = 0) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function drawPixelPine(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(-2 * scale, 1 * scale, 4 * scale, 5 * scale);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.trunk;
  ctx.fillRect(-1 * scale, 1 * scale, 2 * scale, 4 * scale);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.pineDark;
  ctx.beginPath();
  ctx.moveTo(0, -8 * scale);
  ctx.lineTo(7 * scale, 3 * scale);
  ctx.lineTo(-7 * scale, 3 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FOREST_NIGHT_PALETTE.pineMid;
  ctx.beginPath();
  ctx.moveTo(-1 * scale, -6 * scale);
  ctx.lineTo(4 * scale, 1 * scale);
  ctx.lineTo(-4 * scale, 1 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPixelRock(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const w = 6 * scale;
  const h = 4 * scale;
  ctx.fillStyle = WORLD_VISUAL_CONTRACT.outline;
  ctx.fillRect(Math.round(x - w / 2 - scale), Math.round(y - h / 2), Math.round(w + scale * 2), Math.round(h + scale));
  ctx.fillStyle = FOREST_NIGHT_PALETTE.rockMid;
  ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
  ctx.fillStyle = FOREST_NIGHT_PALETTE.rockLight;
  ctx.fillRect(Math.round(x - w / 2 + scale), Math.round(y - h / 2), Math.round(scale * 2), Math.round(scale));
}

function drawTerrainCell(
  ctx: CanvasRenderingContext2D,
  worldX: number,
  worldY: number,
  screenX: number,
  screenY: number,
  size: number,
  occupied: boolean,
) {
  const variant = stableVisualVariant(worldX, worldY, FOREST_NIGHT_PALETTE.grass.length);
  const left = Math.floor(screenX - size / 2);
  const top = Math.floor(screenY - size / 2);
  const drawSize = Math.ceil(size) + 1;

  ctx.fillStyle = FOREST_NIGHT_PALETTE.grass[variant];
  ctx.fillRect(left, top, drawSize, drawSize);

  // Quebra a superfície uniforme sem abandonar o pixel-art noturno do mapa PvE.
  const shade = hash01(worldX, worldY, 3) > 0.5 ? 'rgba(3,18,28,.16)' : 'rgba(117,159,109,.045)';
  ctx.fillStyle = shade;
  ctx.fillRect(left, top, drawSize, Math.max(2, Math.floor(size * 0.16)));

  const pathVariant = stableVisualVariant(worldX + 11, worldY - 7, 4);
  ctx.save();
  ctx.globalAlpha = occupied ? 0.76 : 0.32;
  ctx.fillStyle = FOREST_NIGHT_PALETTE.path;
  const pathWidth = Math.max(3, Math.round(size * 0.075));
  if (pathVariant === 0) {
    ctx.fillRect(left, Math.round(screenY - pathWidth / 2), drawSize, pathWidth);
  } else if (pathVariant === 1) {
    ctx.fillRect(Math.round(screenX - pathWidth / 2), top, pathWidth, drawSize);
  } else if (pathVariant === 2) {
    ctx.beginPath();
    ctx.moveTo(left, top + size * 0.72);
    ctx.lineTo(left + size * 0.45, top + size * 0.48);
    ctx.lineTo(left + size, top + size * 0.54);
    ctx.lineWidth = pathWidth;
    ctx.strokeStyle = FOREST_NIGHT_PALETTE.path;
    ctx.stroke();
  }
  ctx.restore();

  if (size >= 45) {
    const decorCount = occupied ? 2 : 3;
    for (let i = 0; i < decorCount; i += 1) {
      const px = left + size * (0.16 + hash01(worldX, worldY, 10 + i) * 0.68);
      const py = top + size * (0.18 + hash01(worldX, worldY, 20 + i) * 0.64);
      if (Math.abs(px - screenX) < size * 0.18 && Math.abs(py - screenY) < size * 0.18) continue;
      const scale = size > 90 ? 1.15 : size > 62 ? 0.9 : 0.7;
      if (hash01(worldX, worldY, 30 + i) > 0.36) drawPixelPine(ctx, px, py, scale);
      else drawPixelRock(ctx, px, py, scale);
    }
  }

  ctx.strokeStyle = 'rgba(7,17,31,.78)';
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 0.5, top + 0.5, drawSize - 1, drawSize - 1);
}

function polygon(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, fill: string, stroke = WORLD_VISUAL_CONTRACT.outline) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawCampGlyph(ctx: CanvasRenderingContext2D) {
  drawIsoFootprint(ctx, 46, 28, '#183729', WORLD_VISUAL_CONTRACT.outline);
  polygon(ctx, [[-16, 2], [0, -22], [17, 2]], '#7c3428');
  polygon(ctx, [[0, -22], [17, 2], [3, 2]], '#a74631');
  ctx.fillStyle = CAMP_VISUAL_PALETTE.ember;
  ctx.fillRect(21, -3, 4, 5);
  ctx.fillStyle = CAMP_VISUAL_PALETTE.flame;
  ctx.fillRect(22, -7, 2, 5);
}

function drawOutpostGlyph(ctx: CanvasRenderingContext2D) {
  drawIsoFootprint(ctx, 50, 30, '#183729', WORLD_VISUAL_CONTRACT.outline);
  for (const x of [-19, -13, 13, 19]) drawIsoGroundPost(ctx, x, 3, 18, 3, CAMP_VISUAL_PALETTE.wood);
  drawIsoBox(ctx, {
    width: 28,
    depth: 22,
    height: 13,
    top: CAMP_VISUAL_PALETTE.woodLight,
    left: CAMP_VISUAL_PALETTE.wood,
    right: CAMP_VISUAL_PALETTE.woodShadow,
    edge: WORLD_VISUAL_CONTRACT.outline,
  });
  drawIsoGroundPost(ctx, 14, -10, 31, 3, CAMP_VISUAL_PALETTE.woodShadow);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(15, -40, 16, 8);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(15, -40, 11, 3);
}

function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawIsoWalls(ctx, 34, 25, 16, CAMP_VISUAL_PALETTE.wood, CAMP_VISUAL_PALETTE.woodShadow, CAMP_VISUAL_PALETTE.woodLight, WORLD_VISUAL_CONTRACT.outline);
  drawIsoRoof(ctx, 34, 25, 16, 14, CAMP_VISUAL_PALETTE.roof, CAMP_VISUAL_PALETTE.roofShadow, CAMP_VISUAL_PALETTE.roofLight, CAMP_VISUAL_PALETTE.roof, WORLD_VISUAL_CONTRACT.outline);
  ctx.restore();
}

function drawHamletGlyph(ctx: CanvasRenderingContext2D) {
  drawIsoFootprint(ctx, 54, 34, '#183729', WORLD_VISUAL_CONTRACT.outline);
  drawHouse(ctx, 0, 2, 1);
  ctx.fillStyle = CAMP_VISUAL_PALETTE.flame;
  ctx.fillRect(21, -2, 3, 3);
  ctx.fillStyle = CAMP_VISUAL_PALETTE.ember;
  ctx.fillRect(20, 1, 5, 2);
}

function drawVillageGlyph(ctx: CanvasRenderingContext2D) {
  drawIsoFootprint(ctx, 66, 40, '#1b4935', WORLD_VISUAL_CONTRACT.outline);
  drawHouse(ctx, -15, 2, 0.78);
  drawHouse(ctx, 16, 8, 0.72);
  drawIsoGroundPost(ctx, 2, -1, 20, 3, CAMP_VISUAL_PALETTE.wood);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(3, -22, 10, 6);
}

function drawCityGlyph(ctx: CanvasRenderingContext2D) {
  drawIsoFootprint(ctx, 70, 44, '#1b4935', WORLD_VISUAL_CONTRACT.outline);
  drawIsoBox(ctx, {
    width: 52,
    depth: 34,
    height: 18,
    top: CAMP_VISUAL_PALETTE.stoneLight,
    left: CAMP_VISUAL_PALETTE.stone,
    right: CAMP_VISUAL_PALETTE.stoneShadow,
    edge: WORLD_VISUAL_CONTRACT.outline,
  });
  for (const x of [-22, 22]) {
    ctx.save();
    ctx.translate(x, -3);
    drawIsoBox(ctx, {
      width: 18,
      depth: 18,
      height: 28,
      top: '#8d9aa6',
      left: CAMP_VISUAL_PALETTE.stone,
      right: CAMP_VISUAL_PALETTE.stoneShadow,
      edge: WORLD_VISUAL_CONTRACT.outline,
    });
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(251,191,36,.9)';
  ctx.fillRect(-4, -20, 4, 5);
  ctx.fillRect(13, -17, 3, 4);
}

function drawKingdomGlyph(ctx: CanvasRenderingContext2D) {
  drawIsoFootprint(ctx, 76, 48, '#1b4935', WORLD_VISUAL_CONTRACT.outline);
  drawIsoBox(ctx, {
    width: 58,
    depth: 38,
    height: 22,
    top: '#8b98a5',
    left: CAMP_VISUAL_PALETTE.stone,
    right: CAMP_VISUAL_PALETTE.stoneShadow,
    edge: WORLD_VISUAL_CONTRACT.outline,
  });
  for (const [x, height] of [[-25, 34], [0, 42], [25, 34]] as Array<[number, number]>) {
    ctx.save();
    ctx.translate(x, -5);
    drawIsoBox(ctx, {
      width: 18,
      depth: 18,
      height,
      top: '#9aa7b3',
      left: '#526170',
      right: '#303a46',
      edge: WORLD_VISUAL_CONTRACT.outline,
    });
    ctx.restore();
  }
  drawIsoGroundPost(ctx, 0, -44, 24, 3, CAMP_VISUAL_PALETTE.woodShadow);
  ctx.fillStyle = '#be123c';
  ctx.fillRect(1, -69, 16, 8);
  ctx.fillStyle = '#fb7185';
  ctx.fillRect(1, -69, 11, 3);
  ctx.fillStyle = 'rgba(251,191,36,.95)';
  ctx.fillRect(-3, -31, 4, 5);
  ctx.fillRect(21, -25, 3, 4);
}

function drawSettlementGlyph(
  ctx: CanvasRenderingContext2D,
  kingdom: TerritorialMapKingdomMarker,
  screenX: number,
  screenY: number,
  size: number,
) {
  const stage = stagePresentation(kingdom.stage_key);
  const selectedScale = kingdom.is_self ? 1.04 : 1;
  // As construções precisam caber dentro da própria célula até em clusters densos.
  // O zoom aumenta a leitura do território sem voltar ao problema antigo de
  // miniaturas invadindo os quadrantes vizinhos.
  const scale = Math.min(1.45, Math.max(0.40, size / 112)) * selectedScale;

  ctx.save();
  ctx.translate(Math.round(screenX), Math.round(screenY + size * 0.12));
  ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  switch (kingdom.stage_key) {
    case 'camp': drawCampGlyph(ctx); break;
    case 'outpost': drawOutpostGlyph(ctx); break;
    case 'hamlet': drawHamletGlyph(ctx); break;
    case 'village': drawVillageGlyph(ctx); break;
    case 'city': drawCityGlyph(ctx); break;
    case 'kingdom': drawKingdomGlyph(ctx); break;
    default: drawHamletGlyph(ctx); break;
  }
  ctx.restore();

  if (kingdom.protected) {
    const badgeX = screenX + size * 0.31;
    const badgeY = screenY - size * 0.31;
    const radius = Math.max(7, size * 0.095);
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#064e3b';
    ctx.fill();
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#d1fae5';
    ctx.font = `700 ${Math.max(8, Math.floor(radius * 1.2))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', badgeX, badgeY + 0.5);
  }

  return stage;
}

function drawOwnedCell(
  ctx: CanvasRenderingContext2D,
  kingdom: TerritorialMapKingdomMarker,
  screenX: number,
  screenY: number,
  size: number,
  selected: boolean,
  hovered: boolean,
) {
  const stage = stagePresentation(kingdom.stage_key);
  const left = screenX - size / 2;
  const top = screenY - size / 2;

  ctx.save();
  ctx.fillStyle = stage.fill;
  ctx.globalAlpha = kingdom.is_self ? 0.42 : selected ? 0.36 : hovered ? 0.28 : 0.16;
  ctx.fillRect(Math.round(left + 2), Math.round(top + 2), Math.max(1, Math.round(size - 4)), Math.max(1, Math.round(size - 4)));
  ctx.restore();

  ctx.strokeStyle = kingdom.is_self ? '#fbbf24' : selected ? CAMP_VISUAL_PALETTE.magicLight : hovered ? CAMP_VISUAL_PALETTE.magic : stage.accent;
  ctx.lineWidth = kingdom.is_self || selected ? 3 : hovered ? 2.5 : 1.5;
  ctx.strokeRect(Math.round(left + 2) + 0.5, Math.round(top + 2) + 0.5, Math.max(1, Math.round(size - 5)), Math.max(1, Math.round(size - 5)));

  if (kingdom.is_self || selected) {
    ctx.save();
    ctx.strokeStyle = kingdom.is_self ? 'rgba(251,191,36,.34)' : 'rgba(207,250,254,.28)';
    ctx.lineWidth = 7;
    ctx.strokeRect(Math.round(left + 6) + 0.5, Math.round(top + 6) + 0.5, Math.max(1, Math.round(size - 13)), Math.max(1, Math.round(size - 13)));
    ctx.restore();
  }
}

function drawKingdomLabel(
  ctx: CanvasRenderingContext2D,
  kingdom: TerritorialMapKingdomMarker,
  screenX: number,
  screenY: number,
  size: number,
  selected: boolean,
) {
  if (!kingdom.is_self && !selected && size < 105) return;
  const maxChars = size >= 130 ? 18 : 12;
  const raw = kingdom.is_self ? 'VOCÊ' : kingdom.name;
  const label = raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw;
  const fontSize = Math.max(9, Math.min(12, Math.floor(size * 0.12)));
  ctx.font = `700 ${fontSize}px monospace`;
  const paddingX = 6;
  const textWidth = ctx.measureText(label).width;
  const boxW = textWidth + paddingX * 2;
  const boxH = fontSize + 8;
  const x = screenX - boxW / 2;
  const y = screenY + size * 0.34 - boxH / 2;
  ctx.fillStyle = 'rgba(5,11,26,.90)';
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(boxW), Math.round(boxH));
  ctx.strokeStyle = kingdom.is_self ? '#fbbf24' : CAMP_VISUAL_PALETTE.magic;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(boxW - 1), Math.round(boxH - 1));
  ctx.fillStyle = kingdom.is_self ? '#fef3c7' : '#cffafe';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, screenX, y + boxH / 2 + 0.5);
}

function coordinateStep(size: number) {
  if (size >= 74) return 1;
  if (size >= 46) return 2;
  return 4;
}

function drawCoordinateRulers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  view: TerritorialMapViewState,
  bounds: ReturnType<typeof visibleBounds>,
) {
  const size = cellSize(view);
  const step = coordinateStep(size);
  const fontSize = size >= 70 ? 10 : 9;
  ctx.font = `700 ${fontSize}px monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    if (((x % step) + step) % step !== 0) continue;
    const pos = territorialWorldToScreen(x, view.centerY, width, height, view);
    if (pos.x < 20 || pos.x > width - 20) continue;
    ctx.fillStyle = 'rgba(5,11,26,.82)';
    ctx.fillRect(Math.round(pos.x - 15), 6, 30, 17);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(String(x), Math.round(pos.x), 9);
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    if (((y % step) + step) % step !== 0) continue;
    const pos = territorialWorldToScreen(view.centerX, y, width, height, view);
    if (pos.y < 28 || pos.y > height - 18) continue;
    ctx.fillStyle = 'rgba(5,11,26,.82)';
    ctx.fillRect(6, Math.round(pos.y - 8), 34, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(String(y), 10, Math.round(pos.y));
  }
}

export function renderTerritorialMap(ctx: CanvasRenderingContext2D, options: TerritorialMapRenderOptions) {
  const { width, height, kingdoms, selectedID, hoveredID, view } = options;
  const size = cellSize(view);
  const bounds = visibleBounds(width, height, view);
  const byCoordinate = new Map<string, TerritorialMapKingdomMarker>();
  kingdoms.forEach((kingdom) => byCoordinate.set(`${kingdom.x}:${kingdom.y}`, kingdom));

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = FOREST_NIGHT_PALETTE.void;
  ctx.fillRect(0, 0, width, height);

  // Horizonte/borda noturna do mesmo contrato visual usado no mundo isométrico.
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, FOREST_NIGHT_PALETTE.horizonTop);
  background.addColorStop(0.35, FOREST_NIGHT_PALETTE.horizonBottom);
  background.addColorStop(1, FOREST_NIGHT_PALETTE.void);
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  for (let y = bounds.maxY; y >= bounds.minY; y -= 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const screen = territorialWorldToScreen(x, y, width, height, view);
      drawTerrainCell(ctx, x, y, screen.x, screen.y, size, byCoordinate.has(`${x}:${y}`));
    }
  }

  // Eixos do assentamento do jogador continuam discretos, apenas como referência cartográfica.
  const self = kingdoms.find((kingdom) => kingdom.is_self);
  if (self) {
    const selfScreen = territorialWorldToScreen(self.x, self.y, width, height, view);
    ctx.strokeStyle = 'rgba(34,211,238,.24)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(selfScreen.y) + 0.5);
    ctx.lineTo(width, Math.round(selfScreen.y) + 0.5);
    ctx.moveTo(Math.round(selfScreen.x) + 0.5, 0);
    ctx.lineTo(Math.round(selfScreen.x) + 0.5, height);
    ctx.stroke();
  }

  for (const kingdom of kingdoms) {
    const screen = territorialWorldToScreen(kingdom.x, kingdom.y, width, height, view);
    if (screen.x < -size || screen.x > width + size || screen.y < -size || screen.y > height + size) continue;
    const selected = kingdom.settlement_id === selectedID;
    const hovered = kingdom.settlement_id === hoveredID;
    drawOwnedCell(ctx, kingdom, screen.x, screen.y, size, selected, hovered);
  }

  for (const kingdom of kingdoms) {
    const screen = territorialWorldToScreen(kingdom.x, kingdom.y, width, height, view);
    if (screen.x < -size || screen.x > width + size || screen.y < -size || screen.y > height + size) continue;
    const selected = kingdom.settlement_id === selectedID;
    drawSettlementGlyph(ctx, kingdom, screen.x, screen.y, size);
    drawKingdomLabel(ctx, kingdom, screen.x, screen.y, size, selected);
  }

  drawCoordinateRulers(ctx, width, height, view, bounds);

  // Vignette discreta igual à leitura noturna dos cenários do jogo.
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.68);
  vignette.addColorStop(0, 'rgba(5,11,26,0)');
  vignette.addColorStop(1, 'rgba(5,11,26,.36)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
