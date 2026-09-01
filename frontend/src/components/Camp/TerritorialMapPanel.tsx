import { useEffect, useMemo, useRef, useState } from 'react';
import {
  renderTerritorialMap,
  TERRITORIAL_MAP_BASE_CELL,
  TERRITORIAL_MAP_MAX_ZOOM,
  TERRITORIAL_MAP_MIN_ZOOM,
  TERRITORIAL_STAGE_PRESENTATION,
  territorialScreenToWorld,
  type TerritorialMapViewState,
} from '../../game/world/TerritorialMapRenderer';
import type { SettlementScoutingReport, SettlementScoutingState, TerritorialKingdomSummary, TerritorialMapSnapshot, WorldLocation } from '../../hooks/useGameSocket';

interface Props {
  map: TerritorialMapSnapshot | null;
  ownLocation?: WorldLocation;
  loading?: boolean;
  error?: string | null;
  scouting?: SettlementScoutingState | null;
  scoutingLoading?: boolean;
  scoutingError?: string | null;
  onRefresh?: (radius?: number) => void;
  onRefreshScouting?: () => void;
  onStartScouting?: (targetSettlementID: string) => void;
  compactHeader?: boolean;
  focusSettlementID?: string | null;
}

function stageInfo(key: string) {
  return TERRITORIAL_STAGE_PRESENTATION[key] || {
    label: key || 'Assentamento',
    accent: '#94a3b8',
    fill: '#293442',
  };
}

function matchesQuery(kingdom: TerritorialKingdomSummary, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return kingdom.name.toLowerCase().includes(normalized)
    || `${kingdom.x},${kingdom.y}`.includes(normalized)
    || `(${kingdom.x},${kingdom.y})`.includes(normalized);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}


function estimateLabel(value?: { min: number; max: number }) {
  if (!value) return '???';
  return value.min === value.max ? `${value.min}` : `${value.min}–${value.max}`;
}

function confidenceLabel(key?: string) {
  return ({ low: 'Baixa', medium: 'Média', high: 'Alta' } as Record<string, string>)[key || ''] || 'Desconhecida';
}

function exposureLabel(key?: string) {
  return ({ none: 'Nenhuma', low: 'Baixa', moderate: 'Moderada', high: 'Alta', very_high: 'Muito alta' } as Record<string, string>)[key || ''] || 'Desconhecida';
}

function resonatorLabel(key?: string) {
  return ({ unknown: 'Não observado', not_observed: 'Não detectado', likely: 'Provável', confirmed: 'Confirmado' } as Record<string, string>)[key || ''] || 'Não observado';
}

function ageLabel(iso?: string, now = Date.now()) {
  if (!iso) return '—';
  const delta = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours}h ${minutes % 60}min`;
}

function countdownLabel(iso?: string, now = Date.now()) {
  if (!iso) return '—';
  const seconds = Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function autoFitZoom(kingdoms: TerritorialKingdomSummary[], center: { x: number; y: number }) {
  if (kingdoms.length <= 1) return 1.18;
  const xs = kingdoms.map((kingdom) => kingdom.x);
  const ys = kingdoms.map((kingdom) => kingdom.y);
  const minX = Math.min(center.x, ...xs);
  const maxX = Math.max(center.x, ...xs);
  const minY = Math.min(center.y, ...ys);
  const maxY = Math.max(center.y, ...ys);
  const span = Math.max(maxX - minX + 2, maxY - minY + 2);
  if (span <= 6) return 1.12;
  if (span <= 10) return 0.92;
  if (span <= 16) return 0.74;
  return 0.62;
}

export function TerritorialMapPanel({
  map, ownLocation, loading = false, error = null,
  scouting = null, scoutingLoading = false, scoutingError = null,
  onRefresh, onRefreshScouting, onStartScouting, compactHeader = false, focusSettlementID = null,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [query, setQuery] = useState('');
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [hoveredID, setHoveredID] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [clock, setClock] = useState(() => Date.now());
  const [requestedRadius, setRequestedRadius] = useState(20);

  const center = map?.center || (ownLocation ? { x: ownLocation.x, y: ownLocation.y } : { x: 0, y: 0 });
  const kingdoms = map?.kingdoms || [];
  const [view, setView] = useState<TerritorialMapViewState>({
    centerX: center.x,
    centerY: center.y,
    panX: 0,
    panY: 0,
    zoom: 1,
  });

  useEffect(() => {
    if (map?.radius) setRequestedRadius(map.radius);
  }, [map?.radius]);

  const refreshMap = (radius = requestedRadius) => {
    setRequestedRadius(radius);
    onRefresh?.(radius);
    onRefreshScouting?.();
  };

  const selected = kingdoms.find((kingdom) => kingdom.settlement_id === selectedID)
    || kingdoms.find((kingdom) => kingdom.is_self)
    || null;
  const hovered = kingdoms.find((kingdom) => kingdom.settlement_id === hoveredID) || null;

  const list = useMemo(
    () => kingdoms
      .filter((kingdom) => matchesQuery(kingdom, query))
      .slice()
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name)),
    [kingdoms, query],
  );
  const isSearching = query.trim().length > 0;


  const activeMission = selected && !selected.is_self
    ? scouting?.active?.find((mission) => mission.target_settlement_id === selected.settlement_id) || null
    : null;
  const latestReport: SettlementScoutingReport | null = selected && !selected.is_self
    ? scouting?.reports?.find((report) => report.target_settlement_id === selected.settlement_id) || null
    : null;
  const reportFresh = !!latestReport && new Date(latestReport.expires_at).getTime() > clock;
  const activeSlots = scouting?.active?.length || 0;
  const intelStatusBySettlement = useMemo(() => {
    const status: Record<string, 'active' | 'fresh' | 'stale'> = {};
    for (const mission of scouting?.active || []) status[mission.target_settlement_id] = 'active';
    for (const report of scouting?.reports || []) {
      if (status[report.target_settlement_id]) continue;
      status[report.target_settlement_id] = new Date(report.expires_at).getTime() > clock ? 'fresh' : 'stale';
    }
    return status;
  }, [scouting?.active, scouting?.reports, clock]);

  useEffect(() => {
    const hasActive = !!scouting?.active?.length;
    const hasReports = !!scouting?.reports?.length;
    if (!hasActive && !hasReports) return;
    const interval = window.setInterval(() => setClock(Date.now()), hasActive ? 1000 : 60_000);
    return () => window.clearInterval(interval);
  }, [scouting?.active?.length, scouting?.reports?.length]);

  useEffect(() => {
    if (!(scouting?.active?.length) || !onRefreshScouting) return;
    const next = Math.min(...scouting.active.map((mission) => new Date(mission.completes_at).getTime()));
    const delay = Math.max(500, Math.min(60_000, next - Date.now() + 750));
    const timeout = window.setTimeout(() => onRefreshScouting(), delay);
    return () => window.clearTimeout(timeout);
  }, [scouting?.active, onRefreshScouting]);

  useEffect(() => {
    const self = kingdoms.find((kingdom) => kingdom.is_self);
    setSelectedID(self?.settlement_id || null);
    setHoveredID(null);
    setView({
      centerX: center.x,
      centerY: center.y,
      panX: 0,
      panY: 0,
      zoom: autoFitZoom(kingdoms, center),
    });
  }, [map?.world_id, center.x, center.y]);

  useEffect(() => {
    if (!focusSettlementID) return;
    const target = kingdoms.find((kingdom) => kingdom.settlement_id === focusSettlementID);
    if (!target) return;
    const zoom = Math.max(autoFitZoom(kingdoms, center), 1.12);
    const size = TERRITORIAL_MAP_BASE_CELL * zoom;
    setSelectedID(target.settlement_id);
    setView({
      centerX: center.x,
      centerY: center.y,
      zoom,
      panX: -(target.x - center.x) * size,
      panY: (target.y - center.y) * size,
    });
  }, [focusSettlementID, map?.generated_at]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resize = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewportSize.width <= 0 || viewportSize.height <= 0 || !map) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.max(1, Math.round(viewportSize.width * dpr));
    const pixelHeight = Math.max(1, Math.round(viewportSize.height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderTerritorialMap(ctx, {
      width: viewportSize.width,
      height: viewportSize.height,
      kingdoms,
      selectedID: selected?.settlement_id || null,
      hoveredID,
      intelStatusBySettlement,
      view,
    });
  }, [map, kingdoms, selected?.settlement_id, hoveredID, intelStatusBySettlement, view, viewportSize]);

  const resetView = () => {
    setView({
      centerX: center.x,
      centerY: center.y,
      panX: 0,
      panY: 0,
      zoom: autoFitZoom(kingdoms, center),
    });
  };

  const focusKingdom = (kingdom: TerritorialKingdomSummary, zoomFloor = 1.05) => {
    const targetZoom = Math.max(view.zoom, zoomFloor);
    const size = TERRITORIAL_MAP_BASE_CELL * targetZoom;
    setSelectedID(kingdom.settlement_id);
    setView((current) => ({
      ...current,
      zoom: targetZoom,
      panX: -(kingdom.x - current.centerX) * size,
      panY: (kingdom.y - current.centerY) * size,
    }));
  };

  const kingdomAtPointer = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport || viewportSize.width <= 0 || viewportSize.height <= 0) return null;
    const rect = viewport.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const coordinate = territorialScreenToWorld(localX, localY, viewportSize.width, viewportSize.height, view);
    return kingdoms.find((kingdom) => kingdom.x === coordinate.x && kingdom.y === coordinate.y) || null;
  };

  const changeZoom = (delta: number, anchor?: { x: number; y: number }) => {
    setView((current) => {
      const nextZoom = clamp(+(current.zoom + delta).toFixed(2), TERRITORIAL_MAP_MIN_ZOOM, TERRITORIAL_MAP_MAX_ZOOM);
      if (nextZoom === current.zoom) return current;
      if (!anchor || viewportSize.width <= 0 || viewportSize.height <= 0) return { ...current, zoom: nextZoom };

      const oldSize = TERRITORIAL_MAP_BASE_CELL * current.zoom;
      const nextSize = TERRITORIAL_MAP_BASE_CELL * nextZoom;
      const dxWorld = (anchor.x - viewportSize.width / 2 - current.panX) / oldSize;
      const dyWorld = (anchor.y - viewportSize.height / 2 - current.panY) / oldSize;
      return {
        ...current,
        zoom: nextZoom,
        panX: anchor.x - viewportSize.width / 2 - dxWorld * nextSize,
        panY: anchor.y - viewportSize.height / 2 - dyWorld * nextSize,
      };
    });
  };

  return (
    <section className={compactHeader ? '' : 'rounded-xl border border-cyan-800/55 bg-cyan-950/10 p-3'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        {!compactHeader && <div>
          <div className="font-pixel-heading text-[12px] text-cyan-200">🗺️ Mapa Territorial</div>
          <div className="mt-1 text-[11px] text-slate-400">
            {map?.world_name || ownLocation?.world_name || 'Mundo persistente'} · Você está em <strong className="text-cyan-300">({center.x},{center.y})</strong>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">Mapa cartográfico do Reino do Avesso. A M6 adiciona inteligência por batedores sem revelar dados privados exatos.</div>
        </div>}
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[9px] text-slate-500">Alcance</span>
          {[10, 20, 40].map((radius) => (
            <button key={radius} type="button" disabled={loading} onClick={() => refreshMap(radius)} className={`pixel-btn px-2 py-1 text-[9px] disabled:cursor-wait disabled:opacity-60 ${requestedRadius === radius ? 'border-cyan-500 text-cyan-200' : ''}`}>{radius}</button>
          ))}
          <button type="button" onClick={() => changeZoom(0.16)} className="pixel-btn px-2 py-1 text-[9px]">＋</button>
          <button type="button" onClick={() => changeZoom(-0.16)} className="pixel-btn px-2 py-1 text-[9px]">－</button>
          <button type="button" onClick={resetView} className="pixel-btn px-2 py-1 text-[9px]">Centralizar</button>
          <button type="button" disabled={loading} onClick={() => refreshMap()} className="pixel-btn pixel-btn-gold px-2 py-1 text-[9px] disabled:cursor-wait disabled:opacity-60">{loading ? 'Carregando…' : 'Atualizar'}</button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-600/60 bg-rose-950/30 px-3 py-2 text-[9px] text-rose-200">
          ⚠️ Não foi possível carregar o mapa: {error}
        </div>
      )}

      {!map ? (
        <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-5 text-center">
          <div className="text-2xl">🧭</div>
          <p className="mt-2 text-[10px] text-slate-400">Carregue os reinos próximos para visualizar sua posição no mundo persistente.</p>
          <button type="button" disabled={loading} onClick={() => refreshMap()} className="pixel-btn pixel-btn-gold mt-3 px-3 py-1.5 text-[9px] disabled:cursor-wait disabled:opacity-60">{loading ? 'Consultando território…' : 'Abrir mapa próximo'}</button>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-2">
            <div
              ref={viewportRef}
              className="relative h-[clamp(430px,62vh,640px)] min-h-[430px] cursor-grab overflow-hidden rounded-lg border border-slate-700 bg-[#050b1a] shadow-inner active:cursor-grabbing"
              style={{ touchAction: 'none' }}
              onWheel={(event) => {
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                changeZoom(event.deltaY < 0 ? 0.12 : -0.12, { x: event.clientX - rect.left, y: event.clientY - rect.top });
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  panX: view.panX,
                  panY: view.panY,
                  moved: false,
                };
              }}
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
                const drag = dragRef.current;
                if (drag && drag.pointerId === event.pointerId) {
                  const dx = event.clientX - drag.x;
                  const dy = event.clientY - drag.y;
                  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
                  setView((current) => ({ ...current, panX: drag.panX + dx, panY: drag.panY + dy }));
                  setHoveredID(null);
                  return;
                }
                const kingdom = kingdomAtPointer(event.clientX, event.clientY);
                setHoveredID(kingdom?.settlement_id || null);
              }}
              onPointerUp={(event) => {
                const drag = dragRef.current;
                if (drag?.pointerId === event.pointerId && !drag.moved) {
                  const kingdom = kingdomAtPointer(event.clientX, event.clientY);
                  if (kingdom) setSelectedID(kingdom.settlement_id);
                }
                dragRef.current = null;
              }}
              onPointerCancel={() => { dragRef.current = null; }}
              onPointerLeave={() => {
                if (!dragRef.current) setHoveredID(null);
              }}
              onDoubleClick={(event) => {
                const kingdom = kingdomAtPointer(event.clientX, event.clientY);
                if (kingdom) focusKingdom(kingdom, 1.35);
                else changeZoom(0.18);
              }}
            >
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Mapa territorial do Reino do Avesso" />

              <div className="pointer-events-none absolute left-2 top-2 rounded border border-slate-800 bg-slate-950/85 px-2 py-1 text-[8px] text-slate-300 shadow-lg">
                {map.world_name} · raio {map.radius}
              </div>
              <div className="pointer-events-none absolute bottom-2 left-2 rounded border border-slate-800 bg-slate-950/85 px-2 py-1 text-[8px] text-slate-500 shadow-lg">
                zoom {Math.round(view.zoom * 100)}% · arraste para mover · duplo clique para aproximar
              </div>

              {hovered && !dragRef.current && (
                <div
                  className="pointer-events-none absolute z-20 max-w-[290px] rounded border border-cyan-900/70 bg-slate-950/95 px-3 py-2 text-[9px] shadow-2xl"
                  style={{
                    left: Math.min(pointer.x + 14, Math.max(12, viewportSize.width - 300)),
                    top: Math.min(pointer.y + 14, Math.max(12, viewportSize.height - 92)),
                  }}
                >
                  <div className="flex items-center gap-2 font-pixel-heading text-[9px] text-cyan-100">
                    <span className="h-2.5 w-2.5 shrink-0 border border-slate-950" style={{ backgroundColor: stageInfo(hovered.stage_key).accent }} />
                    <span className="truncate">{hovered.name}</span>
                  </div>
                  <div className="mt-1 text-slate-400">{stageInfo(hovered.stage_key).label} · ({hovered.x},{hovered.y})</div>
                  <div className="mt-1 text-slate-500">Distância {hovered.distance.toFixed(2)}{hovered.protected ? ' · Protegido' : ''}</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950/55 p-2.5">
              {Object.entries(TERRITORIAL_STAGE_PRESENTATION).map(([key, stage]) => (
                <span key={key} className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 text-[10px] text-slate-300">
                  <span className="h-3 w-3 border border-slate-900" style={{ backgroundColor: stage.accent }} />
                  <span>{stage.label}</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-2 rounded border border-emerald-700/60 bg-emerald-950/20 px-2.5 py-1.5 text-[10px] text-emerald-200">
                <span className="font-bold">S</span> Protegido
              </span>
            </div>
          </div>

          <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/35 p-4">
            <div className="rounded-lg border border-amber-900/55 bg-amber-950/15 p-4 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-pixel-heading text-[13px] text-amber-200">🐾 Inteligência M6</span>
                <button type="button" disabled={scoutingLoading} onClick={() => onRefreshScouting?.()} className="text-[12px] text-cyan-300 hover:text-cyan-100 disabled:opacity-50">Atualizar</button>
              </div>
              {scouting ? (
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-slate-300">
                  <span>Rastreador <strong className="text-slate-200">Nv. {scouting.tracker_level}</strong></span>
                  <span>Coordenação <strong className="text-slate-200">+{scouting.coordination_percent}%</strong></span>
                  <span>Missões <strong className="text-slate-200">{activeSlots}/{scouting.slots}</strong></span>
                  <span>{scouting.unlocked ? <strong className="text-emerald-300">Disponível</strong> : <strong className="text-slate-500">Bloqueada</strong>}</span>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="leading-relaxed text-slate-400">Carregue a Inteligência para verificar missões e liberar o envio de batedores.</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Requisito: Cidade ou Reino + Sala de Guerra. Quartel sozinho não libera espionagem.</p>
                  <button
                    type="button"
                    disabled={scoutingLoading}
                    onClick={() => onRefreshScouting?.()}
                    className="pixel-btn pixel-btn-gold mt-3 w-full px-3 py-2 text-[10px] disabled:cursor-wait disabled:opacity-60"
                  >
                    {scoutingLoading ? 'Carregando Inteligência…' : '🐾 Carregar Inteligência'}
                  </button>
                </div>
              )}
              {scoutingError && <div className="mt-2 text-rose-300">⚠️ {scoutingError}</div>}
            </div>

            <label className="block text-[13px] text-slate-300">
              Localizar território
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome do reino ou coordenadas, ex.: 2,1"
                className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-cyan-600"
              />
            </label>

            {selected && (
              <div className="rounded-lg border border-cyan-900/60 bg-slate-950/80 p-3.5 text-[12px] shadow-lg">
                <div className="flex items-center gap-2 font-pixel-heading text-[13px] text-cyan-200">
                  <span className="h-3.5 w-3.5 border border-slate-950" style={{ backgroundColor: stageInfo(selected.stage_key).accent }} />
                  <span className="min-w-0 truncate">{selected.name}</span>
                </div>
                <div className="mt-2 text-slate-400">{stageInfo(selected.stage_key).label} · ({selected.x},{selected.y})</div>
                <div className="mt-1 text-slate-400">Distância: <strong className="text-slate-200">{selected.distance.toFixed(2)}</strong></div>
                {selected.protected && <div className="mt-1 text-emerald-300">🛡️ Proteção territorial ativa</div>}

                {selected.is_self ? (
                  <div className="mt-3 border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-500">Seu assentamento está destacado em dourado. A Torre de Vigia e a Sala de Guerra participam da contraespionagem automaticamente.</div>
                ) : (
                  <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
                    {activeMission && (
                      <div className="rounded border border-amber-700/55 bg-amber-950/20 p-3 text-[11px] text-amber-200">
                        <div className="font-pixel-heading text-[11px]">🐾 Batedores em campo</div>
                        <div className="mt-1.5 text-amber-100/70">Retorno em {countdownLabel(activeMission.completes_at, clock)} · custo {activeMission.gold_cost.toLocaleString()} ouro</div>
                      </div>
                    )}

                    {latestReport ? (
                      <div className={`rounded border p-3 ${reportFresh ? 'border-cyan-800/70 bg-cyan-950/15' : 'border-slate-700 bg-slate-900/50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-pixel-heading text-[11px] ${reportFresh ? 'text-cyan-200' : 'text-slate-400'}`}>{reportFresh ? '👁️ Relatório de Inteligência' : '⌛ Inteligência desatualizada'}</span>
                          <span className="text-[10px] text-slate-500">{ageLabel(latestReport.generated_at, clock)}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                          <span className="text-slate-500">Confiança</span><strong className="text-right text-slate-200">{confidenceLabel(latestReport.confidence_key)} · {latestReport.quality}%</strong>
                          <span className="text-slate-500">Defense Power</span><strong className="text-right text-amber-200">{estimateLabel(latestReport.defense_power)}</strong>
                          <span className="text-slate-500">Muralha</span><strong className="text-right text-slate-200">Nv. {estimateLabel(latestReport.wall_level)}</strong>
                          <span className="text-slate-500">Torre de Vigia</span><strong className="text-right text-slate-200">Nv. {estimateLabel(latestReport.watchtower_level)}</strong>
                          <span className="text-slate-500">Guarnição</span><strong className="text-right text-slate-200">{estimateLabel(latestReport.garrison)}</strong>
                          <span className="text-slate-500">Ressonador</span><strong className="text-right text-slate-200">{resonatorLabel(latestReport.resonator_presence)}</strong>
                          <span className="text-slate-500">Armazém exposto</span><strong className="text-right text-slate-200">{exposureLabel(latestReport.storage_exposure_key)}</strong>
                          <span className="text-slate-500">Tesouro exposto</span><strong className="text-right text-slate-200">{exposureLabel(latestReport.treasury_exposure_key)}</strong>
                        </div>
                        <div className={`mt-3 text-[10px] ${latestReport.detected ? 'text-rose-300' : 'text-emerald-400'}`}>{latestReport.detected ? '⚠️ Há indícios de que seus batedores foram percebidos.' : '✓ Nenhum sinal de detecção confirmado.'}</div>
                      </div>
                    ) : !activeMission && (
                      <div className="text-[11px] leading-relaxed text-slate-500">Detalhes militares permanecem sob névoa de informação. Envie batedores para obter apenas estimativas — nunca valores privados exatos.</div>
                    )}

                    {!activeMission && scouting?.unlocked && (
                      <div>
                        <button
                          type="button"
                          disabled={scoutingLoading || activeSlots >= (scouting.slots || 0)}
                          onClick={() => onStartScouting?.(selected.settlement_id)}
                          className="pixel-btn pixel-btn-gold w-full px-3 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {scoutingLoading ? 'Enviando batedores…' : reportFresh ? '🐾 Atualizar inteligência' : '🐾 Enviar batedores'}
                        </button>
                        {scoutingError && <div role="alert" className="mt-2 rounded border border-rose-700/70 bg-rose-950/35 px-3 py-2 text-[11px] leading-relaxed text-rose-200">⚠️ Não foi possível enviar: {scoutingError}</div>}
                      </div>
                    )}
                    {!activeMission && scouting && !scouting.unlocked && <div className="text-[8px] text-amber-300/70">A Inteligência exige Cidade + Sala de Guerra.</div>}
                    {!activeMission && scouting?.unlocked && activeSlots >= (scouting.slots || 0) && <div className="text-[8px] text-amber-300/70">Todos os espaços de scouting estão ocupados.</div>}
                  </div>
                )}
                {!selected.is_self && <button type="button" onClick={() => focusKingdom(selected)} className="pixel-btn mt-3 w-full px-3 py-1.5 text-[10px]">Centralizar neste reino</button>}
              </div>
            )}

            {isSearching ? <div className="max-h-[330px] space-y-1 overflow-y-auto pr-1">
              <div className="pb-1 text-[10px] text-slate-500">Resultados encontrados: {list.length}</div>
              {list.slice(0, 12).map((kingdom) => {
                const stage = stageInfo(kingdom.stage_key);
                const active = selected?.settlement_id === kingdom.settlement_id;
                return (
                  <button
                    key={kingdom.settlement_id}
                    type="button"
                    onClick={() => focusKingdom(kingdom)}
                    className={`flex w-full items-center justify-between gap-2 rounded border px-3 py-2 text-left text-[11px] transition ${active ? 'border-cyan-700 bg-cyan-950/35' : 'border-slate-800 bg-slate-950/65 hover:border-slate-600 hover:bg-slate-900/70'}`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 border border-slate-950" style={{ backgroundColor: stage.accent }} />
                      <span className="truncate text-slate-300">{kingdom.is_self ? 'Você' : kingdom.name}</span>
                    </span>
                    <span className="shrink-0 text-slate-500">{kingdom.distance.toFixed(1)}</span>
                  </button>
                );
              })}
              {list.length === 0 && <div className="p-3 text-center text-[10px] text-slate-500">Nenhum território encontrado.</div>}
              {list.length > 12 && <div className="p-2 text-center text-[10px] text-slate-500">Mostrando os 12 resultados mais próximos. Refine a busca.</div>}
            </div> : null}

            {!!scouting?.alerts?.length && (
              <div className="rounded-lg border border-rose-900/60 bg-rose-950/15 p-3 text-[11px] leading-relaxed">
                <div className="font-pixel-heading text-[11px] text-rose-200">👁️ Contraespionagem · últimas 24h</div>
                <div className="mt-2 space-y-1.5">
                  {scouting.alerts.slice(0, 3).map((alert) => (
                    <div key={alert.mission_id} className="text-slate-300">
                      {alert.source_identified ? `Batedores de ${alert.source_name} (${alert.source_x},${alert.source_y}) identificados` : 'Batedores estrangeiros detectados'} · {ageLabel(alert.detected_at, clock)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
              <div><strong className="text-slate-300">{kingdoms.length}</strong> território(s) exibido(s) no alcance de <strong className="text-slate-300">{map.radius}</strong> casas.</div>
              <div className="mt-1.5">Use 10, 20 ou 40 no topo para ajustar o alcance. Informações militares continuam protegidas até uma missão de Inteligência.</div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
