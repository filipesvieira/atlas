import React, { useState } from 'react';
import { ResourceDefinition } from '../../game/GameCatalog';
import { PixelResourceSprite } from '../../game/registries/PixelResourceRegistry';

interface ResourceDiscardDialogProps {
  resource: ResourceDefinition;
  currentQuantity: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export const ResourceDiscardDialog: React.FC<ResourceDiscardDialogProps> = ({
  resource,
  currentQuantity,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [discardQty, setDiscardQty] = useState<number>(1);

  if (!isOpen) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscardQty(Math.max(1, Math.min(currentQuantity, parseInt(e.target.value) || 1)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
      setDiscardQty(1);
    } else {
      setDiscardQty(Math.max(1, Math.min(currentQuantity, val)));
    }
  };

  const remainingQty = Math.max(0, currentQuantity - discardQty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-pixel-body">
      <div className="pixel-card-crimson rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-slate-200">
        <div className="flex items-center justify-between border-b border-rose-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 pixel-slot rounded flex items-center justify-center bg-slate-900 border-rose-600/50">
              <PixelResourceSprite resourceKey={resource.key} name={resource.name || resource.key} size="sm" />
            </div>
            <div>
              <h3 className="font-pixel-heading text-slate-100 text-xs">{resource.name}</h3>
              <span className="text-[10px] text-rose-400 font-pixel-body">Descartar Recurso</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-crimson px-2 py-0.5 text-xs"
          >
            ✕
          </button>
        </div>

        <div className="pixel-slot rounded p-3 space-y-2 text-xs bg-slate-950/80">
          <div className="flex justify-between text-slate-300">
            <span>Estoque no Armazém:</span>
            <span className="font-pixel-heading text-slate-100">{currentQuantity.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-rose-400 font-medium">
            <span>Quantidade a Descartar:</span>
            <span className="font-pixel-heading">-{discardQty.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1.5">
            <span>Saldo Restante:</span>
            <span className="font-pixel-heading text-emerald-400">{remainingQty.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={currentQuantity}
              value={discardQty}
              onChange={handleSliderChange}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={currentQuantity}
              value={discardQty}
              onChange={handleInputChange}
              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-pixel-body text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5 justify-end text-[9px] font-pixel-heading">
            <button
              onClick={() => setDiscardQty(Math.max(1, Math.floor(currentQuantity * 0.25)))}
              className="pixel-btn pixel-btn-dark px-2 py-1"
            >
              25%
            </button>
            <button
              onClick={() => setDiscardQty(Math.max(1, Math.floor(currentQuantity * 0.5)))}
              className="pixel-btn pixel-btn-dark px-2 py-1"
            >
              50%
            </button>
            <button
              onClick={() => setDiscardQty(currentQuantity)}
              className="pixel-btn pixel-btn-crimson px-2 py-1 text-rose-200"
            >
              100%
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 italic">
          ⚠️ Esta ação é irreversível. O recurso descartado será liberado do seu Armazém.
        </p>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 pixel-btn pixel-btn-dark py-2 text-xs font-pixel-heading"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm(discardQty);
              onClose();
            }}
            className="flex-1 pixel-btn pixel-btn-crimson py-2 text-xs font-pixel-heading"
          >
            Confirmar Descarte
          </button>
        </div>
      </div>
    </div>
  );
};