import { useEffect, useState } from 'react';
import { PROLOGUE_SLIDES } from './PrologueData';

interface PrologueOverlayProps {
  isOpen: boolean;
  onFinish: () => void;
}

const accentStyles = {
  amber: 'border-amber-500/80 text-amber-300',
  rose: 'border-rose-500/80 text-rose-200',
  sky: 'border-sky-500/80 text-sky-200',
  emerald: 'border-emerald-500/80 text-emerald-200',
} as const;

export function PrologueOverlay({ isOpen, onFinish }: PrologueOverlayProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const currentSlide = PROLOGUE_SLIDES[slideIndex];
  const isLastSlide = slideIndex === PROLOGUE_SLIDES.length - 1;

  useEffect(() => {
    if (!isOpen) return;
    setSlideIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (slideIndex === PROLOGUE_SLIDES.length - 1) onFinish();
        else setSlideIndex((index) => index + 1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSlideIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onFinish, slideIndex]);

  if (!isOpen) return null;

  return (
    <section className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950 p-2 text-slate-100 backdrop-blur-sm sm:p-4" aria-label="Prólogo de Reino do Avesso" role="dialog" aria-modal="true">
      <div className="prologue-frame w-full max-w-6xl overflow-hidden rounded-xl border-2 border-amber-600/70 bg-slate-950 shadow-2xl">
        <div className="relative aspect-[16/7] min-h-[320px] overflow-hidden bg-slate-950 sm:min-h-[420px]">
          <img
            key={currentSlide.id}
            src={currentSlide.image}
            alt=""
            className="prologue-scene absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-slate-950/5" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 sm:px-8 sm:pb-6">
            <div className={`max-w-2xl border-l-4 bg-slate-950/90 px-4 py-3 shadow-xl backdrop-blur-sm sm:px-5 ${accentStyles[currentSlide.accent]}`}>
              <p className="mb-1 text-[9px] font-pixel-heading uppercase tracking-[0.18em] text-slate-400">Crônicas de Valdória · {slideIndex + 1}/{PROLOGUE_SLIDES.length}</p>
              <h2 className="font-pixel-heading text-base text-amber-300 sm:text-xl">{currentSlide.title}</h2>
              <div className="mt-2 space-y-0.5 font-pixel-body text-[11px] leading-relaxed text-slate-200 sm:text-sm">
                {currentSlide.lines.map((line) => <p key={line}>{line}</p>)}
              </div>
              {isLastSlide && (
                <p className="mt-3 border-t border-amber-600/30 pt-2 font-pixel-retro text-[10px] italic text-amber-200 sm:text-xs">
                  “Eles nos expulsaram do mundo deles. Então construímos o nosso.”
                </p>
              )}
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-slate-800 bg-slate-950 px-3 py-2.5 font-pixel-body sm:px-5">
          <button type="button" onClick={onFinish} className="pixel-btn pixel-btn-dark px-2.5 py-1.5 text-[10px]" title="Pular prólogo">
            Pular
          </button>
          <div className="flex items-center gap-1.5" aria-label={`Cena ${slideIndex + 1} de ${PROLOGUE_SLIDES.length}`}>
            {PROLOGUE_SLIDES.map((slide, index) => (
              <span key={slide.id} className={`h-2 w-2 border ${index === slideIndex ? 'border-amber-200 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]' : index < slideIndex ? 'border-amber-700 bg-amber-800' : 'border-slate-700 bg-slate-900'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSlideIndex((index) => Math.max(0, index - 1))} disabled={slideIndex === 0} className="pixel-btn pixel-btn-dark px-2.5 py-1.5 text-[10px] disabled:cursor-not-allowed disabled:opacity-35">
              ◀ Anterior
            </button>
            <button type="button" onClick={() => isLastSlide ? onFinish() : setSlideIndex((index) => index + 1)} className="pixel-btn pixel-btn-gold px-3 py-1.5 text-[10px]">
              {isLastSlide ? 'Entrar no Reino' : 'Próximo ▶'}
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
