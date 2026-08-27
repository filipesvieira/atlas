import { useEffect, useState } from 'react';
import { useGameCatalog } from '../../hooks/useGameCatalog';

interface StarterOnboardingModalProps {
  isOpen: boolean;
  isForced?: boolean;
  onClose: () => void;
  onSelectPack: (pack: string) => void;
}

export function StarterOnboardingModal({ isOpen, isForced = false, onClose, onSelectPack }: StarterOnboardingModalProps) {
  const [selectedPack, setSelectedPack] = useState('melee');
  const { catalog, error, loading } = useGameCatalog();
  const packs = catalog?.starterPacks || [];

  useEffect(() => {
    if (packs.length > 0 && !packs.some((pack) => pack.id === selectedPack)) {
      setSelectedPack(packs[0].id);
    }
  }, [packs, selectedPack]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectPack(selectedPack);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Header do Tutorial */}
        <div className="text-center border-b border-slate-800 pb-4 space-y-1">
          <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-mono font-bold mb-1">
            📜 Mini-Tutorial de Início do Project Atlas
          </div>
          <h2 className="text-xl font-bold text-amber-400">Escolha o seu Kit de Armas Inicial</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isForced
              ? 'Bem-vindo! Escolha a sua vocação inicial abaixo para equipar suas primeiras armas e começar a expedição.'
              : 'Selecione o estilo de combate inicial do seu aventureiro.'}
          </p>
        </div>

        {loading && <div className="text-center text-xs text-slate-400">Carregando kits do catálogo do jogo…</div>}
        {error && <div className="text-center text-xs text-rose-400">{error}</div>}

        {/* Seleção de Arquétipos vinda do catálogo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {packs.map((pack) => {
            const isSelected = selectedPack === pack.id;
            return (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 bg-slate-950/80 ${
                  isSelected ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-slate-900/90' : 'border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-200">{pack.title}</h3>
                  <p className="text-[10px] text-slate-400 font-mono leading-tight">{pack.subtitle}</p>
                </div>

                <div className="space-y-1.5 text-[10px] font-mono border-t border-b border-slate-800 py-2">
                  <div className="text-amber-300 font-semibold">🎁 Kit: {pack.kit_label}</div>
                  <div className="text-slate-400">📊 {pack.stat_focus}</div>
                </div>

                <ul className="space-y-1 text-[9px] text-slate-400 font-mono leading-relaxed">
                  {pack.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Rodapé e Confirmação */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <div className="text-[10px] text-slate-500 font-mono">
            {isForced ? '⚠️ Escolha definitiva de kit inicial' : '💡 Dica: Você pode trocar de estilo equipando novos loots'}
          </div>
          <div className="flex gap-2">
            {!isForced && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Fechar
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={packs.length === 0}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg"
            >
              Confirmar Escolha ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}