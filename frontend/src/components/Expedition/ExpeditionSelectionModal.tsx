import { useState } from 'react';
import { RegionData } from '../../game/GameCatalog';

interface ExpeditionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRegion: string;
  characterLevel: number;
  regions: RegionData[];
  unlockedRegions?: string[];
  discoveredLoot?: string[];
  onSelectRegion: (regionId: string) => void;
}

export function ExpeditionSelectionModal({
  isOpen,
  onClose,
  currentRegion,
  characterLevel,
  regions,
  unlockedRegions = [],
  onSelectRegion,
}: ExpeditionSelectionModalProps) {
  const [selectedTier, setSelectedTier] = useState<number>(1);

  if (!isOpen) return null;

  const safeUnlockedRegions = unlockedRegions || [];
  const defeatedSet = new Set(safeUnlockedRegions);
  const filteredRegions = regions.filter((r) => r.tier === selectedTier);

  // Helper: retorna o progresso de chefes derrotados no tier anterior
  const getTierBossProgress = (targetTier: number) => {
    if (targetTier <= 1) return { defeated: 0, total: 0, complete: true };
    const prevTierRegions = regions.filter((r) => r.tier === targetTier - 1);
    const defeated = prevTierRegions.filter((r) => defeatedSet.has(r.id)).length;
    return { defeated, total: prevTierRegions.length, complete: defeated >= prevTierRegions.length };
  };

  const tiers = [...new Set(regions.map((region) => region.tier))]
    .sort((a, b) => a - b)
    .map((tier) => {
      const tierRegions = regions.filter((region) => region.tier === tier);
      const bossProgress = getTierBossProgress(tier);
      return {
        tier,
        minLevel: Math.min(...tierRegions.map((region) => region.minLevel)),
        maxLevel: Math.max(...tierRegions.map((region) => region.maxLevel)),
        bossProgress,
        isTierLocked: tier > 1 && !bossProgress.complete,
      };
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="pixel-card-gold rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="pixel-card-header pixel-card-header-gold p-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🗺️</span>
            <div>
              <h3 className="text-sm sm:text-base font-pixel-heading text-amber-400">Mapa do Mundo & Regiões</h3>
              <p className="text-xs text-slate-400 font-pixel-body">
                Selecione seu destino estratégico para enfrentar monstros e chefes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-xs"
          >
            ✕
          </button>
        </div>

        {/* Abas de Tiers de Nível */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 p-2 gap-1.5 overflow-x-auto font-pixel-body">
          {tiers.map(({ tier, minLevel, maxLevel, isTierLocked }) => {
            const active = selectedTier === tier;
            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-all whitespace-nowrap ${
                  active
                    ? 'pixel-btn pixel-btn-gold text-slate-950 font-bold'
                    : isTierLocked
                    ? 'pixel-btn pixel-btn-dark opacity-50'
                    : 'pixel-btn pixel-btn-dark text-slate-300'
                }`}
              >
                <span className="font-pixel-heading">Tier {tier}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-pixel-body ${
                    active ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Lv. {minLevel}-{maxLevel}
                </span>
                {isTierLocked && <span className="text-[10px]">🔒</span>}
              </button>
            );
          })}
        </div>

        {/* Lista de Expedições do Tier Selecionado */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 font-pixel-body">
          {filteredRegions.map((region) => {
            const isLevelMet = characterLevel >= region.minLevel;
            const needsTierComplete = region.tier > 1 && (region.requiresTierComplete || !region.requiresUnlockFrom);
            let isUnlockedByBoss = true;
            let tierProgress: { defeated: number; total: number } | null = null;
            if (needsTierComplete) {
              const progress = getTierBossProgress(region.tier);
              isUnlockedByBoss = progress.complete;
              if (!progress.complete) {
                tierProgress = { defeated: progress.defeated, total: progress.total };
              }
            } else if (region.requiresUnlockFrom) {
              isUnlockedByBoss = defeatedSet.has(region.id);
            }
            const isAvailable = isLevelMet && isUnlockedByBoss;
            const isSelected = currentRegion === region.id;

            return (
              <div
                key={region.id}
                className={`p-3.5 pixel-slot rounded-xl transition-all flex flex-col md:flex-row justify-between items-center gap-3 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-950/60 shadow-lg ring-1 ring-amber-400'
                    : !isAvailable
                    ? 'opacity-60 bg-slate-950/50'
                    : 'bg-slate-950/80 hover:border-slate-700'
                }`}
              >
                {/* Informações da Região */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{region.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-pixel-heading text-xs text-amber-300">{region.name}</h3>
                        <span className="text-[9px] px-2 py-0.5 rounded font-pixel-heading bg-slate-900 text-emerald-400 border border-slate-700">
                          Lv. {region.minLevel}-{region.maxLevel}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] px-2 py-0.5 rounded font-pixel-heading bg-amber-500 text-slate-950 font-bold">
                            ● Ativa
                          </span>
                        )}
                        {defeatedSet.has(region.id) && (
                          <span className="text-[9px] px-2 py-0.5 rounded font-pixel-heading bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                            ✨ Boss Derrotado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{region.description}</p>
                    </div>
                  </div>

                  {/* Informações do Chefão & Fases */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-300 pt-0.5">
                    <span className="text-amber-400 font-semibold">👑 Boss: {region.bossName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-purple-400">🚩 {region.maxStages} Fases + Chefão</span>
                  </div>
                </div>

                {/* Ação / Seleção */}
                <div className="flex md:flex-col justify-end items-end gap-2 border-t md:border-t-0 border-slate-800 pt-2 md:pt-0 min-w-[140px]">
                  {!isAvailable ? (
                    <div className="pixel-alert-frame pixel-alert-warning rounded p-2 text-right space-y-1">
                      <span className="text-xs font-pixel-heading text-rose-400 flex items-center gap-1 justify-end">
                        🔒 Bloqueado
                      </span>
                      <p className="text-[10px] text-slate-500 max-w-[130px]">
                        {!isLevelMet
                          ? `Requer Nível ${region.minLevel}`
                          : tierProgress
                          ? `👑 ${tierProgress.defeated}/${tierProgress.total} Chefes do Tier ${region.tier - 1}`
                          : `Derrote o Boss da expedição anterior!`}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onSelectRegion(region.id);
                        onClose();
                      }}
                      disabled={isSelected}
                      className={`w-full py-2 px-4 rounded text-xs font-pixel-heading transition-all ${
                        isSelected
                          ? 'pixel-btn pixel-btn-dark opacity-60 cursor-default'
                          : 'pixel-btn pixel-btn-gold'
                      }`}
                    >
                      {isSelected ? 'Expedição Ativa' : 'Viajar ➔'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center text-[11px] text-slate-400 font-pixel-body">
          <span>💡 Cada monstro possui tabela de drop própria. Farm em locais estratégicos!</span>
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-dark px-4 py-1.5 text-xs font-pixel-heading"
          >
            Fechar Mapa
          </button>
        </div>
      </div>
    </div>
  );
}