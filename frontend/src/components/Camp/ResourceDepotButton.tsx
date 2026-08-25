import React from 'react';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

interface ResourceDepotButtonProps {
  storageUsed: number;
  storageCapacity: number;
  onClick: () => void;
  compact?: boolean;
}

export const ResourceDepotButton: React.FC<ResourceDepotButtonProps> = ({
  storageUsed,
  storageCapacity,
  onClick,
  compact = false,
}) => {
  const percent = storageCapacity > 0 ? Math.min(100, Math.round((storageUsed / storageCapacity) * 100)) : 0;
  let isFull = percent >= 90;

  return (
    <button
      onClick={onClick}
      className={`w-full pixel-btn ${isFull ? 'pixel-btn-crimson' : 'pixel-btn-dark'} flex items-center justify-between text-xs ${compact ? 'py-1.5 px-2 gap-1' : 'py-2 px-3 gap-2'}`}
      title="Abrir Depósito de Recursos e Troféus do Acampamento"
    >
      <div className="flex items-center gap-1.5 font-pixel-body">
        <PixelItemSprite name="minério" size="sm" />
        <span>{compact ? 'Depósito' : 'Depósito de Recursos'}</span>
      </div>

      <div className="flex items-center gap-1 font-pixel-body text-[9px]">
        {!compact && <span className="text-slate-300">{storageUsed}/{storageCapacity}</span>}
        <span className={`px-1.5 py-0.2 rounded font-pixel-heading text-[9px] ${isFull ? 'bg-rose-950 text-rose-200' : 'bg-slate-950 text-amber-300'}`}>
          {percent}%
        </span>
      </div>
    </button>
  );
};