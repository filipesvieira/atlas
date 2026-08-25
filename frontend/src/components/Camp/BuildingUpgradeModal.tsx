import React from 'react';
import { BuildingDefinition, ResourceDefinition } from '../../game/GameCatalog';
import { BuildingSlot, ResourceAmount } from '../../hooks/useGameSocket';
import { PixelResourceSprite } from '../../game/registries/PixelResourceRegistry';
import { BuildingScenePreview } from './BuildingScenePreview';

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
    if (seconds <= 0) return 'Imediato';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  const formatEffect = (key: string, val: number) => {
    switch (key) {
      case 'camp_hp_regen_percent':
        return `+${val}% Regen HP no Acampamento`;
      case 'camp_mana_regen_percent':
        return `+${val}% Regen Mana no Acampamento`;
      case 'camp_all_regen_percent':
        return `+${val}% Regen HP/MP no Acampamento`;
      case 'resource_storage':
        return `Armazém aumentado para ${val.toLocaleString()} unidades`;
      case 'salvage_unlock':
        return `Reciclagem liberada na Bancada`;
      case 'salvage_efficiency_percent':
        return `+${val}% Rendimento de materiais`;
      case 'salvage_batch_size':
        return `Lote: até ${val} itens por vez`;
      case 'salvage_success_chance':
        return `+${val}% Taxa de Sucesso no Desmonte`;
      case 'salvage_safe_mode':
        return `Modo Seguro de Desmonte Liberado`;
      default:
        return `${key}: +${val}`;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-pixel-body">
      <div className="pixel-card-gold rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-slate-100">
        {/* Header */}
        <div className="pixel-card-header pixel-card-header-gold pb-3 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-1 pixel-slot rounded bg-slate-900 border-amber-500/40 flex items-center justify-center shrink-0">
              <BuildingScenePreview buildingKey={buildingDef.key} level={currentLevel} size="md" />
            </div>
            <div>
              <h3 className="font-pixel-heading text-sm text-amber-400">{buildingDef.name}</h3>
              <p className="text-xs text-slate-400">
                Nível Atual: <strong className="text-amber-300 font-pixel-heading">Nv. {currentLevel}</strong> / {buildingDef.max_level}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-crimson px-2 py-0.5 text-xs"
          >
            ✕
          </button>
        </div>

        {/* Descrição */}
        <p className="text-xs text-slate-300 leading-relaxed pixel-slot p-3 rounded-xl bg-slate-950/70 border-slate-800">
          {buildingDef.description}
        </p>

        {/* Efeitos do Próximo Nível */}
        {!isMaxLevel && nextLvlDef && (
          <div className="pixel-slot p-3 rounded-xl bg-slate-950/80 border-emerald-500/40 space-y-2">
            <h4 className="text-xs font-pixel-heading text-emerald-400 flex items-center gap-1.5">
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
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
              <span>Tempo de Construção:</span>
              <span className="font-pixel-heading text-amber-300">
                {formatDuration(nextLvlDef.build_duration_seconds, nextLvlDef.build_duration)}
              </span>
            </div>
          </div>
        )}

        {/* Requisitos de Ouro, Recursos e Outras Construções */}
        {!isMaxLevel && nextLvlDef && (
          <div className="space-y-2">
            <h4 className="text-xs font-pixel-heading text-slate-300">Requisitos de Construção:</h4>

            {/* Pré-requisitos de Construções */}
            {buildingChecks.length > 0 && (
              <div className="space-y-1">
                {buildingChecks.map((b) => (
                  <div
                    key={b.key}
                    className={`flex items-center justify-between p-2 rounded pixel-slot text-xs ${
                      b.hasEnough
                        ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30'
                        : 'border-rose-500/40 text-rose-300 bg-rose-950/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{b.hasEnough ? '✅' : '🔒'}</span>
                      <span className="font-medium">Requer {b.name} Nv. {b.minLevel}</span>
                    </div>
                    <div className="text-xs font-pixel-heading">
                      <span>Atual: Nv. {b.currentLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custo de Gold */}
            <div
              className={`flex items-center justify-between p-2 rounded pixel-slot text-xs ${
                hasEnoughGold
                  ? 'border-slate-800 text-slate-200 bg-slate-950/70'
                  : 'pixel-alert-frame pixel-alert-critical text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>💰</span>
                <span className="font-medium">Ouro da Conta</span>
              </div>
              <div className="text-xs font-pixel-heading">
                <span className={hasEnoughGold ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                  {characterGold.toLocaleString()}
                </span>
                <span className="text-slate-500 font-pixel-body"> / {nextLvlDef.gold_cost.toLocaleString()} Gold</span>
              </div>
            </div>

            {/* Custos de Materiais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {costChecks.map((c) => (
                <div
                  key={c.key}
                  className={`flex items-center justify-between p-2 rounded pixel-slot text-xs ${
                    c.hasEnough
                      ? 'border-slate-800 text-slate-200 bg-slate-950/70'
                      : 'pixel-alert-frame pixel-alert-critical text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <PixelResourceSprite resourceKey={c.key} name={c.def?.name || c.key} size="sm" />
                    <span className="truncate">{c.def?.name || c.key}</span>
                  </div>
                  <div className="text-xs font-pixel-heading whitespace-nowrap">
                    <span className={c.hasEnough ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {c.available.toLocaleString()}
                    </span>
                    <span className="text-slate-500 font-pixel-body"> / {c.required.toLocaleString()}</span>
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
                    className={`flex items-center justify-between p-2 rounded pixel-slot text-xs ${
                      t.hasEnough
                        ? 'border-amber-500/40 text-amber-200 bg-amber-950/30'
                        : 'pixel-alert-frame pixel-alert-critical text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PixelResourceSprite resourceKey={t.key} name={t.def?.name || t.key} size="sm" />
                      <span>{t.def?.name || t.key}</span>
                    </div>
                    <div className="text-xs font-pixel-heading">
                      <span className={t.hasEnough ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                        {t.available.toLocaleString()}
                      </span>
                      <span className="text-slate-500 font-pixel-body"> / {t.required.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isMaxLevel && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-center text-xs text-amber-300 font-pixel-body">
            🏆 Esta construção atingiu o nível máximo de desenvolvimento do acampamento!
          </div>
        )}

        {/* Footer & Botões */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-dark px-4 py-1.5 text-xs font-pixel-heading"
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
              className={`px-5 py-1.5 text-xs font-pixel-heading transition ${
                canUpgrade
                  ? 'pixel-btn pixel-btn-gold'
                  : 'pixel-btn pixel-btn-dark opacity-50 cursor-not-allowed'
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
