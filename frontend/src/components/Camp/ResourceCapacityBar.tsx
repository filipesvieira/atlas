import React from 'react';

interface ResourceCapacityBarProps {
  storageUsed: number;
  storageCapacity: number;
}

export const ResourceCapacityBar: React.FC<ResourceCapacityBarProps> = ({
  storageUsed,
  storageCapacity,
}) => {
  const percent = storageCapacity > 0 ? Math.min(100, Math.round((storageUsed / storageCapacity) * 100)) : 0;

  let barColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  let badgeColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';

  if (percent >= 90) {
    barColor = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse';
    badgeColor = 'text-rose-400 border-rose-500/40 bg-rose-950/50';
  } else if (percent >= 70) {
    barColor = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    badgeColor = 'text-amber-400 border-amber-500/30 bg-amber-950/40';
  }

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 shadow-inner">
      <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span>📦</span>
          <span className="font-semibold text-slate-200">Capacidade do Armazém:</span>
          <span className="text-slate-400 font-mono">
            {storageUsed.toLocaleString()} / {storageCapacity.toLocaleString()} unidades
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded border text-[11px] font-mono font-bold ${badgeColor}`}>
          {percent}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
        <span>Apenas materiais ocupam espaço no armazém.</span>
        <span className="text-amber-400/90 font-medium">🏆 Troféus de Boss não ocupam limite.</span>
      </div>
    </div>
  );
};
