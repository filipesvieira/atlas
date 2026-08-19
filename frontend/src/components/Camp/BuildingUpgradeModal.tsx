import React from 'react';
import { BuildingDefinition, ResourceDefinition } from '../../game/GameCatalog';
import { BuildingSlot, ResourceAmount } from '../../hooks/useGameSocket';

interface BuildingUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingDef?: BuildingDefinition;
  slot?: BuildingSlot;
  allBuildings?: Record<string, BuildingSlot>;
  allBuildingDefs?: BuildingDefinition[];
  characterGold: number;
  resources: ResourceAmount[];
  definitions?: ResourceDefinition[];
  onConfirmUpgrade: (slotKey: string, buildingKey: string) => void;
}

export const BuildingUpgradeModal: React.FC<BuildingUpgradeModalProps> = ({
  isOpen,
  onClose,
  buildingDef,
  slot,
  allBuildings = {},
  allBuildingDefs = [],
  characterGold,
  resources,
  definitions = [],
  onConfirmUpgrade,
}) => {
  if (!isOpen || !buildingDef || !slot) return null;

  const currentLevel = slot.level || 0;
  const nextLevel = currentLevel + 1;
  const isMaxLevel = currentLevel >= buildingDef.max_level;
  const nextLvlDef = !isMaxLevel ? buildingDef.levels[nextLevel - 1] : null;

  const safeResources = Array.isArray(resources) ? resources.filter(Boolean) : [];
  const safeDefinitions = Array.isArray(definitions) ? definitions.filter(Boolean) : [];
  const safeAllBuildingDefs = Array.isArray(allBuildingDefs) ? allBuildingDefs.filter(Boolean) : [];

  const resMap = new Map(safeResources.map((r) => [r.key, r.quantity]));
  const defMap = new Map(safeDefinitions.map((d) => [d.key, d]));
  const bDefMap = new Map(safeAllBuildingDefs.map((b) => [b.key, b]));

  // Checagem de requisitos
  const hasEnoughGold = nextLvlDef ? characterGold >= nextLvlDef.gold_cost : false;

  const costChecks = nextLvlDef
    ? nextLvlDef.costs.map((cost) => {
        const available = resMap.get(cost.key) || 0;
        return {
          key: cost.key,
          required: cost.quantity,
          available,
          hasEnough: available >= cost.quantity,
          def: defMap.get(cost.key),
        };
      })
    : [];

  const trophyChecks =
    nextLvlDef && nextLvlDef.required_trophies
      ? nextLvlDef.required_trophies.map((trophy) => {
          const available = resMap.get(trophy.key) || 0;
          return {
            key: trophy.key,
            required: trophy.quantity,
            available,
            hasEnough: available >= trophy.quantity,
            def: defMap.get(trophy.key),
          };
        })
      : [];

  const buildingChecks =
    nextLvlDef && nextLvlDef.required_buildings
      ? nextLvlDef.required_buildings.map((req) => {
          // Encontra nível atual da construção requerida
          let currentReqLvl = 0;
          for (const s of Object.values(allBuildings)) {
            if (s.building_key === req.building_key) {
              currentReqLvl = s.level;
              break;
            }
          }
          const reqDef = bDefMap.get(req.building_key);
          return {
            key: req.building_key,
            name: reqDef?.name || req.building_key,
            minLevel: req.min_level,
            currentLevel: currentReqLvl,
            hasEnough: currentReqLvl >= req.min_level,
          };
        })
      : [];

  const canUpgrade =
    !isMaxLevel &&
    hasEnoughGold &&
    costChecks.every((c) => c.hasEnough) &&
    trophyChecks.every((t) => t.hasEnough) &&
    buildingChecks.every((b) => b.hasEnough);

  const formatDuration = (secondsVal?: number, nanoseconds?: number) => {
    let seconds = secondsVal || 0;
    if (!seconds && nanoseconds) {
      seconds = Math.round(nanoseconds / 1_000_000_000);
    }
    if (seconds < 60) return `${seconds} segundos`;
    const mins = Math.floor(seconds / 60);
    return `${mins} minuto${mins > 1 ? 's' : ''}`;
  };

  const formatEffect = (key: string, val: number) => {
    switch (key) {
      case 'camp_hp_regen_percent':
        return `+${val}% Regeneração de HP no Acampamento`;
      case 'camp_mana_regen_percent':
        return `+${val}% Regeneração de Mana no Acampamento`;
      case 'camp_all_regen_percent':
        return `+${val}% Regeneração de HP e Mana no Acampamento`;
      case 'resource_storage':
        return `Capacidade de Armazém aumentada para ${val.toLocaleString()} unidades`;
      case 'salvage_unlock':
        return `Desbloqueia a reciclagem de equipamentos na Bancada`;
      case 'salvage_efficiency_percent':
        return `+${val}% Rendimento de materiais ao desmontar equipamentos`;
      case 'salvage_batch_size':
        return `Capacidade de Desmonte em Lote: até ${val} itens por vez`;
      case 'salvage_success_chance':
        return `+${val}% Taxa de Sucesso no Desmonte de Equipamentos`;
      case 'salvage_safe_mode':
        return `Desbloqueia o Modo Seguro de Desmonte (100% de sucesso contra perda)`;
      default:
        return `${key}: +${val}`;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-slate-100 font-sans">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-slate-950 rounded-xl border border-slate-800">
              {buildingDef.icon}
            </span>
            <div>
              <h3 className="font-bold text-base text-amber-400">{buildingDef.name}</h3>
              <p className="text-xs text-slate-400">
                Nível Atual: <strong className="text-amber-300 font-mono">Nv. {currentLevel}</strong> / {buildingDef.max_level}
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

        {/* Descrição */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          {buildingDef.description}
        </p>

        {/* Efeitos do Próximo Nível */}
        {!isMaxLevel && nextLvlDef && (
          <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 space-y-2">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✨ Melhorias do Nível {nextLevel}:</span>
            </h4>
            <ul className="text-xs text-emerald-200 space-y-1 pl-1">
              {nextLvlDef.effects.map((eff) => (
                <li key={eff.key} className="flex items-center gap-1.5">
                  <span className="text-emerald-500">▶</span>
                  <span>{formatEffect(eff.key, eff.value)}</span>
                </li>
              ))}
            </ul>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
              <span>Tempo de Construção:</span>
              <span className="font-mono text-amber-300 font-semibold">
                {formatDuration(nextLvlDef.build_duration_seconds, nextLvlDef.build_duration)}
              </span>
            </div>
          </div>
        )}

        {/* Requisitos de Ouro, Recursos e Outras Construções */}
        {!isMaxLevel && nextLvlDef && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300">Requisitos de Construção:</h4>

            {/* Pré-requisitos de Construções */}
            {buildingChecks.length > 0 && (
              <div className="space-y-1">
                {buildingChecks.map((b) => (
                  <div
                    key={b.key}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                      b.hasEnough
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{b.hasEnough ? '✅' : '🔒'}</span>
                      <span className="font-medium">Requer {b.name} Nv. {b.minLevel}</span>
                    </div>
                    <div className="font-mono text-xs">
                      <span>Atual: Nv. {b.currentLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custo de Gold */}
            <div
              className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                hasEnoughGold
                  ? 'bg-slate-950/60 border-slate-800 text-slate-200'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>💰</span>
                <span className="font-medium">Ouro da Conta</span>
              </div>
              <div className="font-mono text-xs">
                <span className={hasEnoughGold ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                  {characterGold.toLocaleString()}
                </span>
                <span className="text-slate-500"> / {nextLvlDef.gold_cost.toLocaleString()} Gold</span>
              </div>
            </div>

            {/* Custos de Materiais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {costChecks.map((c) => (
                <div
                  key={c.key}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                    c.hasEnough
                      ? 'bg-slate-950/60 border-slate-800 text-slate-200'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span>{c.def?.icon || '📦'}</span>
                    <span className="truncate">{c.def?.name || c.key}</span>
                  </div>
                  <div className="font-mono text-xs whitespace-nowrap">
                    <span className={c.hasEnough ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {c.available.toLocaleString()}
                    </span>
                    <span className="text-slate-500"> / {c.required.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Troféus Especiais */}
            {trophyChecks.length > 0 && (
              <div className="space-y-1 pt-1">
                {trophyChecks.map((t) => (
                  <div
                    key={t.key}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                      t.hasEnough
                        ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>🏆</span>
                      <span>{t.def?.name || t.key}</span>
                    </div>
                    <div className="font-mono text-xs">
                      <span className={t.hasEnough ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                        {t.available.toLocaleString()}
                      </span>
                      <span className="text-slate-500"> / {t.required.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isMaxLevel && (
          <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl text-center text-xs text-amber-300 font-medium">
            🏆 Esta construção atingiu o nível máximo de desenvolvimento do acampamento!
          </div>
        )}

        {/* Footer & Botões */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
          >
            Fechar
          </button>

          {!isMaxLevel && (
            <button
              onClick={() => {
                onConfirmUpgrade(slot.slot_key, buildingDef.key);
                onClose();
              }}
              disabled={!canUpgrade}
              className={`px-5 py-2 font-bold text-xs rounded-xl shadow-lg transition ${
                canUpgrade
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {canUpgrade ? 'Iniciar Construção 🔨' : 'Requisitos Não Atendidos'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
