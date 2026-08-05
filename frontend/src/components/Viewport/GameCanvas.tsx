import { useEffect, useRef } from 'react';
import { GameViewport } from './GameViewport';

interface GameCanvasProps {
  setOnCombatEvent?: (cb: (msg: any) => void) => void;
}

export function GameCanvas({ setOnCombatEvent }: GameCanvasProps) {
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

  return (
    <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl overflow-hidden max-w-full">
      <div className="w-full flex justify-between items-center mb-2">
        <h3 className="font-semibold text-amber-400 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Arena de Batalha 2D (60 FPS Ultra-Fluido)
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">500x260 px</span>
      </div>
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-slate-800 shadow-inner bg-slate-950 flex justify-center items-center max-w-full"
      />
    </div>
  );
}
