import { useState } from 'react';
import { useGameCatalog } from '../../hooks/useGameCatalog';
import { ExpeditionSelectionModal } from './ExpeditionSelectionModal';

interface ExpeditionRegionSelectorProps {
  currentRegion?: string;
  characterLevel: number;
  unlockedRegions?: string[];
  currentStage?: number;
  maxStages?: number;
  isBossStage?: boolean;
  onSelectRegion: (regionId: string) => void;
}

export function ExpeditionRegionSelector({
  currentRegion = 'forest',
  characterLevel,
  unlockedRegions = [],
  currentStage = 1,
  maxStages = 5,
  isBossStage = false,
  onSelectRegion,
}: ExpeditionRegionSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { catalog, error: catalogError } = useGameCatalog();

  const activeRegionData = catalog?.regions.find((r) => r.id === currentRegion) || catalog?.regions[0];
  const displayStage = currentStage > 0 ? currentStage : 1;
  const displayMax = maxStages > 0 ? maxStages : 5;

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2.5">
        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
          <h3 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
            <span>🗺️ Expedição Ativa</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {isBossStage ? '🔥 BOSS FINAL' : `Fase ${displayStage}/${displayMax}`}
          </span>
        </div>

        {/* Card Resumo da Região Ativa */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-amber-500/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeRegionData?.icon || '🗺️'}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100">{activeRegionData?.name || currentRegion}</span>
                {activeRegionData && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-mono">
                    Lv. {activeRegionData.minLevel}-{activeRegionData.maxLevel}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-amber-400/90 font-mono block mt-0.5">
                {catalogError ? '⚠️ Catálogo indisponível' : `👑 Boss: ${activeRegionData?.bossName || 'carregando…'}`}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500 text-slate-950">
            ● Ativa
          </span>
        </div>

        {/* Indicador de Estágio / Barra de Fases */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Progresso da Expedição</span>
            <span className={isBossStage ? 'text-amber-400 font-bold animate-pulse' : 'text-purple-400 font-bold'}>
              {isBossStage ? `🔥 FASE ${displayStage}/${displayMax}: CHEFÃO FINAL!` : `Fase ${displayStage} de ${displayMax}`}
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 flex">
            {Array.from({ length: displayMax }, (_, index) => index + 1).map((stg) => (
              <div
                key={stg}
                className={`flex-1 border-r border-slate-900 transition-all duration-300 ${
                  stg < displayStage
                    ? 'bg-emerald-500'
                    : stg === displayStage
                    ? isBossStage
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-purple-500 shadow-sm shadow-purple-500/50'
                    : 'bg-slate-900'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Botão de Destaque para abrir o Modal de Seleção do Mapa do Mundo */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          <span>🗺️</span>
          <span>Abrir Mapa do Mundo & Expedições</span>
        </button>
      </div>

      {/* Modal do Mapa do Mundo */}
      <ExpeditionSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentRegion={currentRegion}
        characterLevel={characterLevel}
        regions={catalog?.regions || []}
        unlockedRegions={unlockedRegions}
        onSelectRegion={onSelectRegion}
      />
    </>
  );
}
