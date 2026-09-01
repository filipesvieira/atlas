import type { SettlementPromotionNotice } from '../../hooks/useGameSocket';

interface Props {
  promotion: SettlementPromotionNotice | null;
  onAcknowledge: () => void;
  onOpenSettlement: () => void;
}

export function SettlementPromotionModal({ promotion, onAcknowledge, onOpenSettlement }: Props) {
  if (!promotion) return null;
  const from = promotion.from_stage;
  const to = promotion.to_stage;
  const continueOnly = () => onAcknowledge();
  const inspect = () => { onAcknowledge(); onOpenSettlement(); };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-amber-400/70 bg-slate-950 shadow-[0_0_70px_rgba(245,158,11,0.18)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
        <div className="p-5 text-center sm:p-7">
          <div className="text-4xl sm:text-5xl" aria-hidden>✨ {to.icon} ✨</div>
          <div className="mt-3 font-pixel-heading text-sm text-amber-300 sm:text-base">{to.promotion_headline || `Agora você possui um ${to.name}!`}</div>
          <p className="mx-auto mt-3 max-w-md text-[11px] leading-relaxed text-slate-300">{to.summary}</p>

          <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-center"><div className="text-2xl">{from.icon}</div><div className="mt-1 text-[9px] text-slate-500">{from.name}</div></div>
            <div className="font-pixel-heading text-amber-400">→</div>
            <div className="text-center"><div className="text-3xl">{to.icon}</div><div className="mt-1 font-pixel-heading text-[10px] text-amber-200">{to.name}</div></div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(to.highlights || []).slice(0, 3).map((highlight) => (
              <div key={highlight} className="rounded-lg border border-amber-800/45 bg-amber-950/20 p-2 text-[9px] leading-relaxed text-amber-100">{highlight}</div>
            ))}
          </div>

          <div className="mt-4 text-[9px] text-slate-500">Promoção alcançada com {promotion.population} moradores e {promotion.prosperity.toLocaleString()} de Prosperidade.</div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={inspect} className="pixel-btn pixel-btn-gold px-4 py-2 text-[10px]">🏘️ Ver meu {to.name}</button>
            <button type="button" onClick={continueOnly} className="pixel-btn pixel-btn-dark px-4 py-2 text-[10px] text-slate-300">Continuar jogando</button>
          </div>
        </div>
      </div>
    </div>
  );
}
