import { useEffect, useRef } from 'react';
import { GameViewport } from './GameViewport';
import { CombatActionBar } from './CombatActionBar';
import { ActiveBuff, AutoPotionSettings, AutoPotionState, DerivedStats, Item } from '../../hooks/useGameSocket';

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
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<GameViewport | null>(null);

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
    viewportRef.current?.setCampMoveHandler(onMoveCampBuilding);
  }, [onMoveCampBuilding]);

  useEffect(() => {
    viewportRef.current?.setHeroMoveHandler(onMoveHero);
  }, [onMoveHero]);

  const handleZoomOut = () => viewportRef.current?.zoomOut();
  const handleZoomIn = () => viewportRef.current?.zoomIn();
  const handleZoomReset = () => viewportRef.current?.resetZoom();

  return (
    <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-xl overflow-hidden w-full max-w-full">
      <div className="w-full flex flex-wrap justify-between items-center gap-1 mb-1.5">
        <h3 className="font-semibold text-amber-400 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Arena de Batalha / Vila Isométrica
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="hidden lg:inline text-[9px] xl:text-[10px] text-slate-500 font-mono">Setas/clique: mover</span>
          <div className="flex items-center gap-0.5 rounded border border-slate-700 bg-slate-950/80 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="h-5 w-5 rounded text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-amber-300"
              aria-label="Diminuir zoom"
              title="Diminuir zoom"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="h-5 px-1.5 rounded text-[9px] font-mono text-slate-400 hover:bg-slate-800 hover:text-amber-300"
              aria-label="Restaurar zoom"
              title="Restaurar zoom"
            >
              zoom
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="h-5 w-5 rounded text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-amber-300"
              aria-label="Aumentar zoom"
              title="Aumentar zoom"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full aspect-[16/7] rounded-lg overflow-hidden border border-slate-800 shadow-inner bg-slate-950 flex justify-center items-center"
      />
      {/* Barra de Ação & HUD de Combate MMORPG (com Posturas Táticas Integradas) */}
      <CombatActionBar
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
    </div>
  );
}
