import { useGameCatalog } from '../../hooks/useGameCatalog';

interface CombatStylesHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CombatStylesHelpModal({ isOpen, onClose }: CombatStylesHelpModalProps) {
  const { catalog, error, loading } = useGameCatalog();
  const packs = catalog?.starterPacks || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
        <div className="text-center border-b border-slate-800 pb-4 space-y-1">
          <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-mono font-bold mb-1">
            ❔ Ajuda do Sistema Classless
          </div>
          <h2 className="text-xl font-bold text-amber-400">Como funcionam os estilos de combate?</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Não existem classes permanentes. Seu estilo é definido pela arma equipada, pelos atributos investidos e pelas habilidades aprendidas.
          </p>
        </div>

        {loading && <div className="text-center text-xs text-slate-400">Carregando estilos do catálogo do jogo…</div>}
        {error && <div className="text-center text-xs text-rose-400">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 bg-slate-950/80"
            >
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-200">{pack.title}</h3>
                <p className="text-[10px] text-slate-400 font-mono leading-tight">{pack.subtitle}</p>
              </div>

              <div className="space-y-1.5 text-[10px] font-mono border-t border-b border-slate-800 py-2">
                <div className="text-amber-300 font-semibold">🧰 Equipamentos: {pack.kit_label}</div>
                <div className="text-slate-400">📊 {pack.stat_focus}</div>
              </div>

              <ul className="space-y-1 text-[9px] text-slate-400 font-mono leading-relaxed">
                {pack.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-[11px] text-emerald-200">
          💡 Todo aventureiro começa com os equipamentos básicos dos três estilos. Troque a arma quando quiser; isso não reinicia nível, XP, profissões ou progresso.
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <div className="text-[10px] text-slate-500 font-mono">
            Esta tela é apenas informativa e não altera o personagem.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
