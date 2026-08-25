import React from 'react';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

interface CampButtonProps {
  activeSlots: number;
  maxSlots: number;
  onClick: () => void;
  compact?: boolean;
}

export const CampButton: React.FC<CampButtonProps> = ({
  activeSlots,
  maxSlots,
  onClick,
  compact = false,
}) => {
  const isBusy = activeSlots >= maxSlots;
  const isBuilding = activeSlots > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full pixel-btn pixel-btn-dark flex items-center justify-between text-xs ${compact ? 'py-1.5 px-2 gap-1' : 'py-2 px-3 gap-2'}`}
      title="Abrir Gestão do Acampamento e Construções"
    >
      <div className="flex items-center gap-1.5 font-pixel-body">
        <PixelItemSprite name="projeto" size="sm" />
        <span>{compact ? 'Acampamento' : 'Gestão do Acampamento'}</span>
      </div>

      <div className="flex items-center gap-1.5 font-pixel-body text-[10px]">
        <span
          className={`px-1.5 py-0.5 rounded font-pixel-heading text-[9px] flex items-center gap-1 ${
            isBusy
              ? 'bg-amber-950 text-amber-300'
              : isBuilding
              ? 'bg-sky-950 text-sky-300'
              : 'bg-emerald-950 text-emerald-300'
          }`}
          title={
            activeSlots > 0
              ? `${activeSlots} de ${maxSlots} equipe(s) em obras`
              : `Nenhuma obra em andamento (${maxSlots} equipe livre)`
          }
        >
          <span>Obras:</span>
          <span>{activeSlots}/{maxSlots}</span>
        </span>
      </div>
    </button>
  );
};