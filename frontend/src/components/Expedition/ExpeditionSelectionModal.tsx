import { useState } from 'react';

export interface RegionData {
  id: string;
  name: string;
  tier: number;
  minLevel: number;
  maxLevel: number;
  description: string;
  icon: string;
  bossName: string;
  requiresUnlockFrom?: string;
  dropsPreview: { name: string; icon: string }[];
}

export const WORLD_REGIONS: RegionData[] = [
  // ─── TIER 1 (LV. 1–5) ───────────────────────────────────────────────────
  {
    id: 'forest',
    name: 'Floresta dos Aprendizes',
    tier: 1,
    minLevel: 1,
    maxLevel: 5,
    description: 'Florestas calmas perfeitas para treinar os primeiros passos.',
    icon: '🌲',
    bossName: 'Urso Ranzinza dos Carinhosos 🐻',
    dropsPreview: [
      { name: 'Espada do Aprendiz', icon: '🗡️' },
      { name: 'Arco Curvo', icon: '🏹' },
      { name: 'Varinha do Aprendiz', icon: '🔮' },
      { name: 'Capacete de Couro', icon: '🪖' },
      { name: 'Pequena Bolsa', icon: '🎒' },
      { name: 'Amuleto do Lobo', icon: '🐺' },
    ],
  },
  {
    id: 'shereque',
    name: 'Vila do Shereque',
    tier: 1,
    minLevel: 1,
    maxLevel: 5,
    description: 'Pântano verde onde ogros e burros falantes guardam armas rústicas.',
    icon: '🍞',
    bossName: 'Fiona Arrazadora 🐸',
    dropsPreview: [
      { name: 'Clava de Madeira', icon: '🏏' },
      { name: 'Machadinha de Madeira', icon: '🪓' },
      { name: 'Broquel de Madeira', icon: '🛡️' },
      { name: 'Túnica de Couro', icon: '👕' },
      { name: 'Sandálias Ágeis', icon: '🥾' },
      { name: 'Tome: Golpe Giratório', icon: '📜' },
    ],
  },
  {
    id: 'chapolin',
    name: 'Vila do Chapolin',
    tier: 1,
    minLevel: 1,
    maxLevel: 5,
    description: 'Vila costeira aterrorizada pelo terrível Alma Negra.',
    icon: '🎩',
    bossName: 'Alma Negra de Greiscu 🏴‍☠️',
    dropsPreview: [
      { name: 'Sabre de Bronze', icon: '🗡️' },
      { name: 'Coifa de Prata', icon: '🪖' },
      { name: 'Anel de Cobre', icon: '💍' },
      { name: 'Flechas de Madeira', icon: '🎯' },
      { name: 'Manual: Tiro Quádruplo', icon: '📜' },
    ],
  },

  // ─── TIER 2 (LV. 5–12) ──────────────────────────────────────────────────
  {
    id: 'orcruins',
    name: 'Castelo de Greiscu',
    tier: 2,
    minLevel: 5,
    maxLevel: 12,
    description: 'Fortificação ancestral dominada por orcs e pelo temível Esquelético.',
    icon: '🏰',
    bossName: 'Esquelético Pacato 💀',
    requiresUnlockFrom: 'forest',
    dropsPreview: [
      { name: 'Machado Orc', icon: '🪓' },
      { name: 'Espada de Aço', icon: '⚔️' },
      { name: 'Cota de Malha', icon: '🛡️' },
      { name: 'Escudo de Madeira', icon: '🛡️' },
      { name: 'Mochila de Aventureiro', icon: '🎒' },
    ],
  },
  {
    id: 'esgotos',
    name: 'Esgotos Tartaruga',
    tier: 2,
    minLevel: 5,
    maxLevel: 12,
    description: 'Subterrâneo escuro guardado pelo Clã do Pé e ratos mutantes.',
    icon: '🥷',
    bossName: 'Destruidor Ranzinza 🥷',
    requiresUnlockFrom: 'forest',
    dropsPreview: [
      { name: 'Arco Longo', icon: '🏹' },
      { name: 'Maça de Batalha', icon: '🏏' },
      { name: 'Calça de Couro', icon: '👖' },
      { name: 'Botas de Couro', icon: '🥾' },
      { name: 'Colar de Prata', icon: '𓓿' },
      { name: 'Virotes Perfurantes', icon: '🎯' },
    ],
  },

  // ─── TIER 3 (LV. 12–20) ─────────────────────────────────────────────────
  {
    id: 'rogartes',
    name: 'Escola de Rogartes',
    tier: 3,
    minLevel: 12,
    maxLevel: 20,
    description: 'Escola de magia lendária infestada por bruxos e dementadores.',
    icon: '🧙‍♂️',
    bossName: 'Voldemorte sem Nariz 🪄',
    requiresUnlockFrom: 'orcruins',
    dropsPreview: [
      { name: 'Cajado Rúnico', icon: '🔮' },
      { name: 'Varinha das Relíquias', icon: '🪄' },
      { name: 'Robe Místico', icon: '🥋' },
      { name: 'Elmo Rúnico', icon: '🪖' },
      { name: 'Bolsa Rúnica', icon: '🎒' },
      { name: 'Livro: Bola de Fogo', icon: '📜' },
    ],
  },

  // ─── TIER 4 (LV. 20–35) ─────────────────────────────────────────────────
  {
    id: 'frozen',
    name: 'Santuário de Atenas',
    tier: 4,
    minLevel: 20,
    maxLevel: 35,
    description: 'Picos congelados guardados pelos Cavaleiros de Ouro e espectros.',
    icon: '🛡️',
    bossName: 'Mestre do Santuário 🌟',
    requiresUnlockFrom: 'rogartes',
    dropsPreview: [
      { name: 'Katana da Fúria', icon: '⚔️' },
      { name: 'Marreta Biônica', icon: '🔨' },
      { name: 'Arco dos Ventos', icon: '🏹' },
      { name: 'Escudo do Zodíaco', icon: '🛡️' },
      { name: 'Armadura de Ouro', icon: '👑' },
      { name: 'Mochila Dragônica', icon: '🎒' },
    ],
  },

  // ─── TIER 5 (LV. 35–99) ─────────────────────────────────────────────────
  {
    id: 'abyss',
    name: 'Caverna do Dragão Perdido',
    tier: 5,
    minLevel: 35,
    maxLevel: 99,
    description: 'Abismo vulcânico onde o Vingador de Chifres guarda tesouros lendários.',
    icon: '🌋',
    bossName: 'Vingador de Chifres 🐲',
    requiresUnlockFrom: 'frozen',
    dropsPreview: [
      { name: 'Espada Mítica do Vingador', icon: '⚔️' },
      { name: 'Lâmina de Greiscu', icon: '🗡️' },
      { name: 'Arco Apocalíptico', icon: '🏹' },
      { name: 'Cajado da Eternidade', icon: '🔮' },
      { name: 'Mochila do Zodíaco', icon: '🎒' },
      { name: 'Flechas Divinas', icon: '🎯' },
    ],
  },
];

interface ExpeditionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRegion: string;
  characterLevel: number;
  unlockedRegions?: string[];
  onSelectRegion: (regionId: string) => void;
}

export function ExpeditionSelectionModal({
  isOpen,
  onClose,
  currentRegion,
  characterLevel,
  unlockedRegions = ['forest', 'shereque', 'chapolin'],
  onSelectRegion,
}: ExpeditionSelectionModalProps) {
  const [selectedTier, setSelectedTier] = useState<number>(1);

  if (!isOpen) return null;

  const filteredRegions = WORLD_REGIONS.filter((r) => r.tier === selectedTier);

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
          {[1, 2, 3, 4, 5].map((tier) => {
            const labels = ['Tier 1 (Lv 1-5)', 'Tier 2 (Lv 5-12)', 'Tier 3 (Lv 12-20)', 'Tier 4 (Lv 20-35)', 'Tier 5 (Lv 35+)'];
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
                {labels[tier - 1]}
              </button>
            );
          })}
        </div>

        {/* Lista de Expedições do Tier */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {filteredRegions.map((region) => {
            const isLevelMet = characterLevel >= region.minLevel;
            const isUnlockedByBoss = unlockedRegions.includes(region.id) || !region.requiresUnlockFrom;
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
                    <span className="text-purple-400">🚩 5 Fases + Chefão</span>
                  </div>

                  {/* Preview de Drops Alvo */}
                  <div className="pt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      🎯 Loot Exclusivo da Região:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {region.dropsPreview.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          <span>{item.icon}</span>
                          <span>{item.name}</span>
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
