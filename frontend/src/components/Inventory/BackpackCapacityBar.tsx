import React from 'react';

interface BackpackCapacityBarProps {
  totalWeight: number;
  maxCapacity: number;
  usedSlots: number;
  maxSlots: number;
  weightPercent: number;
}

export const BackpackCapacityBar: React.FC<BackpackCapacityBarProps> = ({
  totalWeight,
  maxCapacity,
  usedSlots,
  maxSlots,
  weightPercent,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 py-2.5 px-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
      {/* Indicador de Peso */}
      <div className="flex-1 min-w-[140px]">
        <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
          <span>⚖️ Peso (Capacidade)</span>
          <span className={weightPercent > 90 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
            {totalWeight.toFixed(1)} / {maxCapacity} ({weightPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              weightPercent > 90
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                : weightPercent > 70
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${weightPercent}%` }}
          />
        </div>
      </div>

      {/* Indicador de Slots */}
      <div className="flex-1 min-w-[140px]">
        <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
          <span>📦 Espaço na Mochila</span>
          <span className={usedSlots >= maxSlots ? 'text-rose-400 font-bold' : 'text-slate-300'}>
            {usedSlots} / {maxSlots} ({Math.round((usedSlots / Math.max(1, maxSlots)) * 100)}%)
          </span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              usedSlots >= maxSlots
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                : usedSlots >= maxSlots * 0.8
                ? 'bg-amber-500'
                : 'bg-sky-500'
            }`}
            style={{ width: `${Math.min(100, (usedSlots / Math.max(1, maxSlots)) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
