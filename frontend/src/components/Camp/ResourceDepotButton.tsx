import React from 'react';

interface ResourceDepotButtonProps {
  storageUsed: number;
  storageCapacity: number;
  onClick: () => void;
}

export const ResourceDepotButton: React.FC<ResourceDepotButtonProps> = ({
  storageUsed,
  storageCapacity,
  onClick,
}) => {
  const percent = storageCapacity > 0 ? Math.min(100, Math.round((storageUsed / storageCapacity) * 100)) : 0;

  let badgeColor = 'text-amber-300 border-amber-500/30 bg-amber-950/40';
  let isFull = false;

  if (percent >= 90) {
    badgeColor = 'text-rose-400 border-rose-500/40 bg-rose-950/50 animate-pulse';
    isFull = true;
  }

  return (
    <button
      onClick={onClick}
      className={`w-full py-2 px-3 rounded-lg border flex items-center justify-between gap-2 text-xs font-semibold transition-all duration-200 shadow-sm group ${
        isFull
          ? 'bg-rose-950/40 hover:bg-rose-900/50 border-rose-600/60 shadow-rose-950/50'
          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/50 hover:shadow-amber-950/20'
      }`}
      title="Abrir Depósito de Recursos e Troféus do Acampamento"
    >
      <div className="flex items-center gap-2 text-slate-200 group-hover:text-amber-300 transition-colors">
        <span className="text-base group-hover:scale-110 transition-transform">📦</span>
        <span>Depósito de Recursos</span>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[11px]">
        <span className="text-slate-400 group-hover:text-slate-300">
          {storageUsed}/{storageCapacity}
        </span>
        <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${badgeColor}`}>
          {percent}%
        </span>
      </div>
    </button>
  );
};
