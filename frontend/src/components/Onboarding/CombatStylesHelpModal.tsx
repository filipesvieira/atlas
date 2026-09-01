import { useGameCatalog } from '../../hooks/useGameCatalog';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

interface CombatStylesHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CombatStylesHelpModal({ isOpen, onClose }: CombatStylesHelpModalProps) {
  const { catalog, error, loading } = useGameCatalog();
  const packs = catalog?.starterPacks || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl pixel-card-gold rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
        <div className="text-center border-b border-amber-600/30 pb-4 space-y-1">
          <div className="inline-flex items-center justify-center px-3 py-0.5 pixel-slot bg-slate-950 text-amber-300 rounded text-[10px] font-pixel-heading mb-1 border-amber-500/40">
            ❔ Ajuda do Sistema Classless
          </div>
          <h2 className="text-base sm:text-lg font-pixel-heading text-amber-400">Como funcionam os estilos de combate?</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-pixel-body">
            Não existem classes permanentes. Seu estilo é definido pela arma equipada, pela maestria que evolui com o uso e pelas habilidades aprendidas.
          </p>
        </div>

        {loading && <div className="text-center text-xs text-slate-400 font-pixel-heading">Carregando estilos do catálogo do jogo…</div>}
        {error && <div className="text-center text-xs text-rose-400 font-pixel-body">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-pixel-body">
          {packs.map((pack) => {
            const weaponKey = pack.id.includes('melee') ? 'sword' : pack.id.includes('distance') ? 'bow' : 'wand';
            return (
              <div
                key={pack.id}
                className="p-3.5 pixel-slot rounded-xl flex flex-col justify-between space-y-3 bg-slate-950/80"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <PixelItemSprite weaponType={weaponKey} size="sm" />
                    <h3 className="font-pixel-heading text-xs text-amber-300">{pack.title}</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{pack.subtitle}</p>
                </div>

                <div className="space-y-1 text-[10px] border-t border-b border-slate-800 py-2">
                  <div className="text-amber-400 font-semibold">Equipamentos: {pack.kit_label}</div>
                  <div className="text-slate-400">Foco: {pack.stat_focus}</div>
                </div>

                <ul className="space-y-1 text-[9px] text-slate-400 leading-relaxed">
                  {pack.details.map((detail, idx) => (
                    <li key={idx}>• {detail}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-950/40 p-3 text-[11px] text-emerald-200 font-pixel-body">
          💡 Todo aventureiro começa com os equipamentos básicos dos três estilos. Troque a arma quando quiser; isso não reinicia nível, XP, profissões ou progresso.
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-pixel-body">
          <div className="text-[10px] text-slate-500">
            Esta tela é apenas informativa e não altera o personagem.
          </div>
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-gold px-5 py-2 text-xs font-pixel-heading"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}