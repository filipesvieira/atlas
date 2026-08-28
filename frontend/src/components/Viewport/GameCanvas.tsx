import { useEffect, useRef, useState } from 'react';
import { GameViewport } from './GameViewport';
import { PvPArenaViewport } from './PvPArenaViewport';
import { CombatActionBar } from './CombatActionBar';
import { ActiveBuff, AutoPotionSettings, AutoPotionState, DerivedStats, Item, PvPCombatSnapshot } from '../../hooks/useGameSocket';

interface GameCanvasProps {
  setOnCombatEvent?: (cb: (msg: any) => void) => void;
  character?: any;
  derivedStats?: DerivedStats | null;
  activeBuffs?: ActiveBuff[];
	  autoPotionSettings?: AutoPotionSettings | null;
	  autoPotionState?: AutoPotionState | null;
  skillCooldowns?: Record<string, number>;
  attackCooldownRemaining?: number;
  mainHandItem?: Item | null;
  onToggleSkill?: (skillKey: string) => void;
  currentStance?: string;
  onSelectStance?: (stance: string) => void;
	  onUpdateAutoPotionSettings?: (settings: AutoPotionSettings) => void;
  onMoveHero?: (direction: string, pressed: boolean) => void;
  onMoveCampBuilding?: (slotKey: string, tileX: number, tileY: number, rotation: number) => void;
  isWorldFocusMode?: boolean;
  onWorldFocusModeChange?: (active: boolean) => void;
  onOpenBackpack?: () => void;
  onOpenDepot?: () => void;
  onOpenCamp?: () => void;
  onOpenSettlement?: () => void;
  onOpenWorldMap?: () => void;
  onToggleExpedition?: () => void;
  isExpeditionActive?: boolean;
  isConnected?: boolean;
  pvpCombat?: PvPCombatSnapshot | null;
}

export function GameCanvas({
  setOnCombatEvent,
  character,
  derivedStats,
  activeBuffs,
	  autoPotionSettings,
	  autoPotionState,
  skillCooldowns,
  attackCooldownRemaining,
  mainHandItem,
  onToggleSkill,
  currentStance,
  onSelectStance,
	  onUpdateAutoPotionSettings,
  onMoveHero,
  onMoveCampBuilding,
  isWorldFocusMode = false,
  onWorldFocusModeChange,
  onOpenBackpack,
  onOpenDepot,
  onOpenCamp,
  onOpenSettlement,
  onOpenWorldMap,
  onToggleExpedition,
  isExpeditionActive = false,
  isConnected = false,
  pvpCombat,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<GameViewport | null>(null);
  const pvpContainerRef = useRef<HTMLDivElement>(null);
  const pvpViewportRef = useRef<PvPArenaViewport | null>(null);
  const [dismissedPvPMatchID, setDismissedPvPMatchID] = useState<string | null>(null);
  const pvpArenaVisible = Boolean(
    pvpCombat
      && (pvpCombat.status === 'active' || pvpCombat.status === 'completed')
      && dismissedPvPMatchID !== pvpCombat.match_id,
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const viewport = new GameViewport();
    viewportRef.current = viewport;
    viewport.init(containerRef.current);

    if (setOnCombatEvent) {
      setOnCombatEvent((msg: any) => {
        if (viewportRef.current) {
          viewportRef.current.handleLiveCombatEvent(msg);
        }
      });
    }

    return () => {
      viewport.destroy();
      viewportRef.current = null;
    };
  }, [setOnCombatEvent]);

  useEffect(() => {
    if (pvpCombat?.status === 'active') setDismissedPvPMatchID(null);
  }, [pvpCombat?.match_id, pvpCombat?.status]);

  useEffect(() => {
    if (!pvpArenaVisible || !pvpContainerRef.current || !pvpCombat) return;
    const viewport = new PvPArenaViewport(character?.id || '');
    pvpViewportRef.current = viewport;
    viewport.init(pvpContainerRef.current);
    viewport.setSnapshot(pvpCombat);
    return () => {
      viewport.destroy();
      if (pvpViewportRef.current === viewport) pvpViewportRef.current = null;
    };
  }, [pvpArenaVisible]);

  useEffect(() => {
    if (pvpCombat) pvpViewportRef.current?.setSnapshot(pvpCombat);
  }, [pvpCombat]);

  useEffect(() => {
    viewportRef.current?.setCampMoveHandler(onMoveCampBuilding);
  }, [onMoveCampBuilding]);

  useEffect(() => {
    viewportRef.current?.setHeroMoveHandler(onMoveHero);
  }, [onMoveHero]);

  useEffect(() => {
    if (!isWorldFocusMode) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onWorldFocusModeChange?.(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isWorldFocusMode, onWorldFocusModeChange]);

  const handleZoomOut = () => viewportRef.current?.zoomOut();
  const handleZoomIn = () => viewportRef.current?.zoomIn();
  const handleZoomReset = () => viewportRef.current?.resetZoom();

  const focusActionClass = 'pixel-btn pixel-btn-dark px-2 py-1.5 text-[9px] sm:text-[10px] whitespace-nowrap';

  return (
    <div className={`flex flex-col items-center justify-center bg-slate-900 border border-slate-800 shadow-xl overflow-hidden w-full max-w-full ${
      isWorldFocusMode
        ? 'fixed inset-0 z-40 rounded-none border-0 bg-slate-950 p-2.5 sm:p-3'
        : 'rounded-xl p-2.5'
    }`}>
      <div className="w-full flex flex-wrap justify-between items-center gap-1 mb-1.5">
        <h3 className="font-semibold text-amber-400 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {isWorldFocusMode ? 'Reino do Avesso · Modo Mundo' : 'Arena de Batalha / Vila Isométrica'}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="hidden lg:inline text-[9px] xl:text-[10px] text-slate-500 font-mono">Setas/clique: mover</span>
          <div className="flex items-center gap-0.5 rounded border border-slate-700 bg-slate-950/80 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={pvpArenaVisible}
              className="h-5 w-5 rounded text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-amber-300 disabled:opacity-35"
              aria-label="Diminuir zoom"
              title="Diminuir zoom"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              disabled={pvpArenaVisible}
              className="h-5 px-1.5 rounded text-[9px] font-mono text-slate-400 hover:bg-slate-800 hover:text-amber-300 disabled:opacity-35"
              aria-label="Restaurar zoom"
              title="Restaurar zoom"
            >
              zoom
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={pvpArenaVisible}
              className="h-5 w-5 rounded text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-amber-300 disabled:opacity-35"
              aria-label="Aumentar zoom"
              title="Aumentar zoom"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => onWorldFocusModeChange?.(!isWorldFocusMode)}
            className="h-5 rounded border border-amber-600/60 bg-slate-950 px-1.5 text-[9px] font-pixel-heading text-amber-300 hover:bg-amber-500 hover:text-slate-950"
            aria-label={isWorldFocusMode ? 'Sair do modo mundo' : 'Abrir modo mundo'}
            title={isWorldFocusMode ? 'Sair do modo mundo (Esc)' : 'Abrir modo mundo'}
          >
            {isWorldFocusMode ? '✕ SAIR' : '⛶ MUNDO'}
          </button>
        </div>
      </div>
      <div className={`relative w-full ${isWorldFocusMode ? 'flex min-h-0 flex-1 items-center justify-center' : ''}`}>
        <div
          ref={containerRef}
          className={`rounded-lg overflow-hidden border border-slate-800 shadow-inner bg-slate-950 flex justify-center items-center ${
            isWorldFocusMode ? 'h-full max-w-full aspect-[16/7]' : 'w-full aspect-[16/7]'
          }`}
        />
        <div
          ref={pvpContainerRef}
          aria-hidden={!pvpArenaVisible}
          className={`absolute inset-0 z-20 overflow-hidden rounded-lg border border-violet-400/70 bg-slate-950 shadow-[0_0_28px_rgba(168,85,247,0.38)] transition-opacity ${
            pvpArenaVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
        {pvpArenaVisible && pvpCombat && (
          <div className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-2 rounded border border-violet-400/80 bg-slate-950/90 px-2.5 py-1.5 shadow-lg">
            <div className="font-pixel-heading text-[9px] text-violet-200">
              ⚔️ ARENA DE DUELO · {pvpCombat.status === 'active' ? `PULSO ${pvpCombat.tick}` : 'RESULTADO CONFIRMADO'}
            </div>
            {pvpCombat.status === 'completed' ? (
              <button
                type="button"
                onClick={() => setDismissedPvPMatchID(pvpCombat.match_id)}
                className="pixel-btn pixel-btn-dark px-2 py-1 text-[9px]"
              >
                VOLTAR À EXPEDIÇÃO
              </button>
            ) : (
              <span className="text-[9px] text-violet-300">SIMULAÇÃO AUTORITATIVA</span>
            )}
          </div>
        )}
        {isWorldFocusMode && (
          <nav className="absolute left-2 top-2 z-30 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5 rounded-lg border border-slate-700/90 bg-slate-950/90 p-1.5 shadow-xl backdrop-blur-sm" aria-label="Acessos do modo mundo">
            <button type="button" onClick={onOpenBackpack} className={focusActionClass}>🎒 Mochila</button>
            <button type="button" onClick={onOpenDepot} className={focusActionClass}>📦 Depósito</button>
            <button type="button" onClick={onOpenCamp} className={focusActionClass}>⛺ Acampamento</button>
            <button type="button" onClick={onOpenSettlement} className={focusActionClass}>🏘️ Assentamento</button>
            <button type="button" onClick={onOpenWorldMap} className={focusActionClass}>🗺️ Mapa</button>
            <button
              type="button"
              onClick={onToggleExpedition}
              disabled={!isConnected}
              className={`${isExpeditionActive ? 'pixel-btn pixel-btn-crimson' : 'pixel-btn pixel-btn-gold'} px-2 py-1.5 text-[9px] sm:text-[10px] whitespace-nowrap disabled:opacity-40`}
            >
              {isExpeditionActive ? '⛺ Retornar' : '⚔️ Expedição'}
            </button>
          </nav>
        )}
        {!pvpArenaVisible && (
          <CombatActionBar
            displayMode="overlay"
            character={character}
            derivedStats={derivedStats}
            activeBuffs={activeBuffs}
			autoPotionSettings={autoPotionSettings}
			autoPotionState={autoPotionState}
            skillCooldowns={skillCooldowns}
            attackCooldownRemaining={attackCooldownRemaining}
            mainHandItem={mainHandItem}
            onToggleSkill={onToggleSkill}
            currentStance={currentStance}
            onSelectStance={onSelectStance}
			onUpdateAutoPotionSettings={onUpdateAutoPotionSettings}
          />
        )}
      </div>
    </div>
  );
}
