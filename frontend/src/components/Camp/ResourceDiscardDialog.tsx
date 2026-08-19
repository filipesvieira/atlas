import React, { useState } from 'react';
import { ResourceDefinition } from '../../game/GameCatalog';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border-2 border-rose-500/50 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{resource.icon}</span>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">{resource.name}</h3>
              <span className="text-xs text-rose-400 font-medium">Descartar Recurso</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg leading-none p-1 rounded"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Estoque no Armazém:</span>
            <span className="font-bold font-mono text-slate-100">{currentQuantity.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-rose-400 font-medium">
            <span>Quantidade a Descartar:</span>
            <span className="font-bold font-mono">-{discardQty.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400 border-t border-slate-800/80 pt-1.5">
            <span>Saldo Restante:</span>
            <span className="font-mono font-bold text-emerald-400">{remainingQty.toLocaleString()}</span>
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
              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono text-sm text-slate-100 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5 justify-end text-[10px]">
            <button
              onClick={() => setDiscardQty(Math.max(1, Math.floor(currentQuantity * 0.25)))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 font-semibold"
            >
              25%
            </button>
            <button
              onClick={() => setDiscardQty(Math.max(1, Math.floor(currentQuantity * 0.5)))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 font-semibold"
            >
              50%
            </button>
            <button
              onClick={() => setDiscardQty(currentQuantity)}
              className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded border border-rose-800 font-semibold"
            >
              Tudo (100%)
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          ⚠️ Esta ação é irreversível. O recurso descartado será liberado do seu Armazém.
        </p>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs border border-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm(discardQty);
              onClose();
            }}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold rounded-lg text-xs border border-rose-500/80 shadow-lg shadow-rose-900/40 transition"
          >
            Confirmar Descarte
          </button>
        </div>
      </div>
    </div>
  );
};
