import { useState } from 'react';
import { RegionData } from '../../game/GameCatalog';

interface ExpeditionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRegion: string;
  characterLevel: number;
  regions: RegionData[];
  unlockedRegions?: string[];
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
  const filteredRegions = regions.filter((r) => r.tier === selectedTier);
  const tiers = [...new Set(regions.map((region) => region.tier))]
    .sort((a, b) => a - b)
    .map((tier) => {
      const tierRegions = regions.filter((region) => region.tier === tier);
      return {
        tier,
        minLevel: Math.min(...tierRegions.map((region) => region.minLevel)),
        maxLevel: Math.max(...tierRegions.map((region) => region.maxLevel)),
      };
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🗺️</span>
            <div>
              <h2 className="text-base font-bold text-amber-400">Mapa do Mundo & Expedições</h2>
              <p className="text-[11px] text-slate-400">
                Selecione seu destino estratégico para farmar equipamentos específicos!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* Abas de Tiers de Nível */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-1.5 overflow-x-auto">
          {tiers.map(({ tier, minLevel, maxLevel }) => {
            const active = selectedTier === tier;
            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-400'
                }`}
              >
                Tier {tier} (Lv {minLevel}-{maxLevel})
              </button>
            );
          })}
        </div>

        {/* Lista de Expedições do Tier */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {filteredRegions.map((region) => {
            const isLevelMet = characterLevel >= region.minLevel;
            const isUnlockedByBoss = safeUnlockedRegions.includes(region.id) || !region.requiresUnlockFrom;
            const isAvailable = isLevelMet || isUnlockedByBoss;
            const isSelected = currentRegion === region.id;

            return (
              <div
                key={region.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-500/10'
                    : !isAvailable
                    ? 'bg-slate-950/50 border-slate-850 opacity-60'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Informações da Região */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{region.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-100">{region.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-mono text-emerald-400 font-bold border border-slate-700">
                          Lv. {region.minLevel}-{region.maxLevel}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                            ● Ativa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{region.description}</p>
                    </div>
                  </div>

                  {/* Informações do Chefão & Fases */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-300 pt-1">
                    <span className="text-amber-400 font-semibold">👑 Boss Final: {region.bossName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-purple-400">🚩 {region.maxStages} Fases + Chefão</span>
                  </div>

                  {/* Preview de Drops Alvo */}
                  <div className="pt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      🎯 Loot Exclusivo da Região:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {region.dropsPreview.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          <span>🎁</span>
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ação / Seleção */}
                <div className="flex md:flex-col justify-end items-end gap-2 border-t md:border-t-0 border-slate-800 pt-2 md:pt-0 min-w-[140px]">
                  {!isAvailable ? (
                    <div className="text-right space-y-1">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1 justify-end">
                        🔒 Bloqueado
                      </span>
                      <p className="text-[10px] text-slate-500 max-w-[130px]">
                        {!isLevelMet
                          ? `Requer Nível ${region.minLevel}`
                          : `Derrote o Boss da expedição anterior para liberar!`}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onSelectRegion(region.id);
                        onClose();
                      }}
                      disabled={isSelected}
                      className={`w-full py-2 px-4 rounded-xl font-bold text-xs transition-all shadow-md ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      }`}
                    >
                      {isSelected ? 'Expedição Ativa' : 'Viajar para Região ➔'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-[11px] text-slate-400">
          <span>💡 Dica: Cada monstro possui tabela de drop própria. Farm em locais estratégicos!</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all text-xs"
          >
            Fechar Mapa
          </button>
        </div>
      </div>
    </div>
  );
}
