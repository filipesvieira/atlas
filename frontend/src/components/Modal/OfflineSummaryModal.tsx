interface OfflineSummaryModalProps {
  data: {
    minutes_offline: number;
    xp_gained: number;
    gold_gained: number;
    items_found: any[];
  } | null;
  onClose: () => void;
}

export function OfflineSummaryModal({ data, onClose }: OfflineSummaryModalProps) {
  if (!data || data.minutes_offline < 3) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-2 border border-amber-500/30">
            📜
          </div>
          <h3 className="text-xl font-bold text-amber-400">Relatório de Expedição Offline</h3>
          <p className="text-xs text-slate-400 mt-1">
            Seu aventureiro continuou explorando enquanto você esteve ausente!
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-sm font-mono mb-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-slate-400">Tempo Offline:</span>
            <span className="text-amber-400 font-bold">{data.minutes_offline} minutos</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-slate-400">XP Acumulada:</span>
            <span className="text-emerald-400 font-bold">+{data.xp_gained} XP</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-slate-400">Ouro Coletado:</span>
            <span className="text-amber-300 font-bold">+{data.gold_gained} Gold</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-400">Itens Encontrados:</span>
            <span className="text-purple-400 font-bold">{data.items_found ? data.items_found.length : 0} itens</span>
          </div>
        </div>

        {data.items_found && data.items_found.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase">Loot Procedural Resgatado:</h4>
            <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
              {data.items_found.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center text-xs">
                  <span className="font-semibold text-amber-400">{item.name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">{item.rarity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-lg"
        >
          Coletar Recompensas & Continuar
        </button>
      </div>
    </div>
  );
}
