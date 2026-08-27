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
  const isFull = percent >= 90;
  const alertClass = percent >= 100 ? 'pixel-alert-frame pixel-alert-critical' : isFull ? 'pixel-alert-frame pixel-alert-warning' : '';

  return (
    <div className={`pixel-slot rounded-lg p-3 bg-slate-950/80 ${alertClass}`}>
      <div className="flex items-center justify-between text-xs mb-1.5 font-pixel-body">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="font-pixel-heading text-amber-300">Capacidade do Armazém:</span>
          <span className="text-slate-400">
            {storageUsed.toLocaleString()} / {storageCapacity.toLocaleString()} un.
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded font-pixel-heading text-[10px] ${isFull ? 'bg-rose-950 text-rose-300 border border-rose-600' : 'bg-slate-900 text-amber-300 border border-amber-600/40'}`}>
          {percent}%
        </span>
      </div>

      <div className="w-full h-2.5 pixel-bar-bg rounded overflow-hidden p-0.5">
        <div
          className={`h-full transition-all duration-300 ${isFull ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'pixel-bar-xp'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5 text-[9px] text-slate-400 font-pixel-body">
        <span>Apenas materiais ocupam espaço no armazém.</span>
        <span className="text-amber-400">🏆 Troféus de Boss não ocupam limite.</span>
      </div>
    </div>
  );
};