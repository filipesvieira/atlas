import React from 'react';

interface CampButtonProps {
  activeSlots: number;
  maxSlots: number;
  onClick: () => void;
}

export const CampButton: React.FC<CampButtonProps> = ({
  activeSlots,
  maxSlots,
  onClick,
}) => {
  const isBusy = activeSlots >= maxSlots;
  const isBuilding = activeSlots > 0;

  return (
    <button
      onClick={onClick}
      className="w-full py-2 px-3 rounded-lg border flex items-center justify-between gap-2 text-xs font-semibold transition-all duration-200 shadow-sm group bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-500/50 hover:shadow-emerald-950/20"
      title="Abrir Gestão do Acampamento e Construções"
    >
      <div className="flex items-center gap-2 text-slate-200 group-hover:text-emerald-300 transition-colors">
        <span className="text-base group-hover:scale-110 transition-transform">🏕️</span>
        <span>Gestão do Acampamento</span>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[11px]">
        <span
          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 ${
            isBusy
              ? 'text-amber-300 border-amber-500/40 bg-amber-950/50'
              : isBuilding
              ? 'text-sky-300 border-sky-500/40 bg-sky-950/50'
              : 'text-emerald-300 border-emerald-500/30 bg-emerald-950/40'
          }`}
          title={
            activeSlots > 0
              ? `${activeSlots} de ${maxSlots} equipe(s) de obras trabalhando no momento`
              : `Nenhuma obra em andamento (${maxSlots} equipe livre)`
          }
        >
          <span>👷 Obras:</span>
          <span>{activeSlots}/{maxSlots}</span>
        </span>
      </div>
    </button>
  );
};
