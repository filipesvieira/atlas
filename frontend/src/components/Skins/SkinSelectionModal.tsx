import React, { useState, useEffect, useRef } from 'react';
import { AVAILABLE_SKINS, HeroSkin, SkinRegistryService, SkinRarity } from '../../game/registries/SkinRegistry';
import { heroRegistry } from '../../game/registries/HeroRegistry';

interface SkinSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId?: string;
}

export const SkinSelectionModal: React.FC<SkinSelectionModalProps> = ({ isOpen, onClose, characterId }) => {
  const [activeSkinId, setActiveSkinId] = useState<string>(() => SkinRegistryService.getActiveSkinId(characterId));
  const [selectedPreviewSkin, setSelectedPreviewSkin] = useState<HeroSkin>(() => SkinRegistryService.getActiveSkin(characterId));
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (characterId) {
        SkinRegistryService.setCharacterId(characterId);
      }
      const currentId = SkinRegistryService.getActiveSkinId(characterId);
      setActiveSkinId(currentId);
      const skin = SkinRegistryService.getSkin(currentId) || AVAILABLE_SKINS[0];
      setSelectedPreviewSkin(skin);
    }
  }, [isOpen, characterId]);

  // Animação de pré-visualização em alta resolução no Canvas
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current || !selectedPreviewSkin) return;

    let animFrame: number;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();
    const renderPreview = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const bob = Math.sin(elapsed * 4) * 3;
      const walkStep = Math.sin(elapsed * 6) * 3;

      // Demonstração periódica de golpe a cada 2.5s (dura 420ms)
      const cycle = elapsed % 2.5;
      const isAttacking = cycle < 0.45;
      const attackProgress = isAttacking ? cycle / 0.45 : 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      heroRegistry.renderDynamic(
        ctx,
        canvas.width / 2,
        canvas.height / 2 + bob,
        selectedPreviewSkin.renderKey,
        {
          time: now,
          walkStep,
          isWalking: true,
          isAttacking,
          attackProgress,
          attackStyle: selectedPreviewSkin.attackStyle || 'melee',
          facing: 1,
          size: 96,
        }
      );

      animFrame = requestAnimationFrame(renderPreview);
    };

    renderPreview();

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isOpen, selectedPreviewSkin]);

  const handleEquipSkin = (skin: HeroSkin) => {
    SkinRegistryService.setActiveSkinId(skin.id, characterId);
    setActiveSkinId(skin.id);
  };

  const getRarityBadge = (rarity: SkinRarity) => {
    switch (rarity) {
      case 'Comum':
        return 'border-slate-700 text-slate-300 bg-slate-800/40';
      case 'Raro':
        return 'border-sky-500/50 text-sky-300 bg-sky-950/40';
      case 'Épico':
        return 'border-purple-500/50 text-purple-300 bg-purple-950/40';
      case 'Lendário':
        return 'border-amber-500/50 text-amber-300 bg-amber-950/40';
      case 'Mítico':
        return 'border-rose-500/60 text-rose-300 bg-rose-950/40';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">🎭</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-amber-400">Guarda-Roupa & Visual do Herói</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full">
                  {AVAILABLE_SKINS.length} Skins Disponíveis
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Personalize a aparência do seu personagem na arena e em combate.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg p-1 transition"
          >
            ✕
          </button>
        </div>

        {/* Corpo do Modal em 2 Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 flex-1 overflow-hidden">
          {/* Coluna da Esquerda: Lista de Skins (7 Colunas) */}
          <div className="md:col-span-7 flex flex-col space-y-2 min-h-0">
            <h4 className="text-xs font-bold text-slate-300 shrink-0">Skins Desbloqueadas:</h4>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {AVAILABLE_SKINS.map((skin) => {
                const isEquipped = activeSkinId === skin.id;
                const isSelected = selectedPreviewSkin?.id === skin.id;

                return (
                  <div
                    key={skin.id}
                    onClick={() => setSelectedPreviewSkin(skin)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                        : isEquipped
                        ? 'bg-slate-850 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0 shadow-inner">
                        {skin.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="font-bold text-xs text-slate-200 truncate">{skin.name}</h5>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${getRarityBadge(skin.rarity)}`}>
                            {skin.rarity}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{skin.subtitle}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isEquipped ? (
                        <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 rounded-lg shadow-sm flex items-center gap-1">
                          <span>✓</span>
                          <span>Equipado</span>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipSkin(skin);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-700 rounded-lg transition shadow-sm"
                        >
                          Equipar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna da Direita: Preview Animado no Canvas & Detalhes (5 Colunas) */}
          <div className="md:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center space-y-3 min-h-0 overflow-y-auto">
            {selectedPreviewSkin && (
              <>
                <div className="w-full flex flex-col items-center space-y-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getRarityBadge(selectedPreviewSkin.rarity)}`}>
                    {selectedPreviewSkin.rarity}
                  </span>

                  <h4 className="font-bold text-sm text-amber-400">{selectedPreviewSkin.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedPreviewSkin.subtitle}</p>

                  {/* Canvas de Preview Animado */}
                  <div className="w-36 h-36 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-center p-2 shadow-inner my-2">
                    <canvas
                      ref={previewCanvasRef}
                      width={120}
                      height={120}
                      className="image-pixelated"
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed text-left bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                    {selectedPreviewSkin.description}
                  </p>
                </div>

                <div className="w-full pt-2 border-t border-slate-800 flex justify-between items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    Tipo: <strong className="text-amber-400 font-semibold">Visual Cosmético</strong>
                  </span>

                  {activeSkinId === selectedPreviewSkin.id ? (
                    <span className="px-4 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 rounded-xl">
                      Em Uso
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEquipSkin(selectedPreviewSkin)}
                      className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition shadow-lg shadow-amber-500/20"
                    >
                      Equipar Skin
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
