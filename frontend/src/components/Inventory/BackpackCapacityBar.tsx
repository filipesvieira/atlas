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
  const weightCritical = weightPercent > 90;
  const slotsCritical = usedSlots >= maxSlots;
  const capacityWarning = !weightCritical && !slotsCritical && (weightPercent > 70 || usedSlots >= maxSlots * 0.8);
  const alertClass = weightCritical || slotsCritical
    ? 'pixel-alert-frame pixel-alert-critical'
    : capacityWarning
    ? 'pixel-alert-frame pixel-alert-warning'
    : '';

  return (
    <div className={`w-full min-w-0 flex flex-col sm:flex-row items-center gap-3 py-2 px-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs ${alertClass}`}>
      {/* Indicador de Peso */}
      <div className="w-full sm:flex-1 min-w-0">
        <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
          <span>⚖️ Peso</span>
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
            style={{ width: `${Math.min(100, weightPercent)}%` }}
          />
        </div>
      </div>

      {/* Indicador de Slots */}
      <div className="w-full sm:flex-1 min-w-0">
        <div className="flex justify-between text-slate-400 mb-1 font-mono text-[11px]">
          <span>📦 Espaço</span>
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