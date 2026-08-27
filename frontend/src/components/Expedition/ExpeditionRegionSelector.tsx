import { useEffect, useState } from 'react';
import { useGameCatalog } from '../../hooks/useGameCatalog';
import { ExpeditionSelectionModal } from './ExpeditionSelectionModal';

interface ExpeditionRegionSelectorProps {
  currentRegion?: string;
  characterLevel: number;
  unlockedRegions?: string[];
  discoveredLoot?: string[];
  currentStage?: number;
  maxStages?: number;
  isBossStage?: boolean;
  onSelectRegion: (regionId: string) => void;
  openMapRequest?: number;
  compact?: boolean;
}

export function ExpeditionRegionSelector({
  currentRegion = 'forest',
  characterLevel,
  unlockedRegions = [],
  discoveredLoot = [],
  currentStage = 1,
  maxStages = 5,
  isBossStage = false,
  onSelectRegion,
  openMapRequest = 0,
  compact = false,
}: ExpeditionRegionSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { catalog, error: catalogError } = useGameCatalog();

  // Reaproveita o seletor/modal já existente quando o acesso vier do HUD.
  useEffect(() => {
    if (openMapRequest > 0) setIsModalOpen(true);
  }, [openMapRequest]);

  const activeRegionData = catalog?.regions.find((r) => r.id === currentRegion) || catalog?.regions[0];
  const displayStage = currentStage > 0 ? currentStage : 1;
  const displayMax = maxStages > 0 ? maxStages : 5;

  return (
    <>
      <div className={`pixel-card rounded-xl ${compact ? 'p-2.5 space-y-1.5' : 'p-3 space-y-2.5'}`}>
        <div className="pixel-card-header">
          <h3 className="font-pixel-heading text-xs text-amber-400 flex items-center gap-1.5">
            <span>🗺️ Expedição Ativa</span>
          </h3>
          <span className="text-[10px] font-pixel-heading text-slate-400">
            {isBossStage ? '🔥 BOSS FINAL' : `Fase ${displayStage}/${displayMax}`}
          </span>
        </div>

        {/* Card Resumo da Região Ativa */}
        <div className={`${compact ? 'p-2' : 'p-2.5'} rounded-lg bg-slate-950/80 border border-amber-500/50 flex justify-between items-center`}>
          <div className="flex items-center gap-2">
            <span className={compact ? 'text-base' : 'text-xl'}>{activeRegionData?.icon || '🗺️'}</span>
            <div>
              <div className="flex items-center gap-1.5 font-pixel-body">
                <span className="text-xs font-bold text-slate-100 font-pixel-heading">{activeRegionData?.name || currentRegion}</span>
                {activeRegionData && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                    Lv. {activeRegionData.minLevel}-{activeRegionData.maxLevel}
                  </span>
                )}
              </div>
              <span className={`${compact ? 'hidden' : 'block'} text-[10px] text-amber-400 font-pixel-body mt-0.5`}>
                {catalogError ? '⚠️ Catálogo indisponível' : `👑 Boss: ${activeRegionData?.bossName || 'carregando…'}`}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-pixel-heading px-2 py-0.5 rounded bg-amber-500 text-slate-950">
            ● Ativa
          </span>
        </div>

        {/* Indicador de Estágio / Barra de Fases */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-pixel-body text-slate-400">
            <span>Progresso da Expedição</span>
            <span className={isBossStage ? 'pixel-alert-frame pixel-alert-arcane rounded px-1.5 py-0.5 text-amber-300 font-bold font-pixel-heading' : 'text-purple-400 font-bold'}>
              {isBossStage ? `🔥 FASE ${displayStage}/${displayMax}: CHEFÃO FINAL!` : `Fase ${displayStage} de ${displayMax}`}
            </span>
          </div>
          <div className="w-full pixel-bar-bg rounded h-2.5 flex">
            {Array.from({ length: displayMax }, (_, index) => index + 1).map((stg) => (
              <div
                key={stg}
                className={`flex-1 border-r border-slate-950 transition-all duration-300 ${
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
          title="Escolher a região e a expedição. Para administrar a vila, use Gerenciar Assentamento & Trabalhos."
          className={`w-full pixel-btn pixel-btn-gold text-xs ${compact ? 'py-2' : 'py-2.5'} flex items-center justify-center gap-1.5`}>
          <span>🗺️</span>
          <span>Trocar Região / Mapa do Mundo</span>
        </button>
      </div>

      <ExpeditionSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        regions={catalog?.regions || []}
        currentRegion={currentRegion}
        characterLevel={characterLevel}
        unlockedRegions={unlockedRegions}
        discoveredLoot={discoveredLoot}
        onSelectRegion={onSelectRegion}
      />
    </>
  );
}