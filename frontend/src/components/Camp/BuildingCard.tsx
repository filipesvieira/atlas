import React, { useState, useEffect } from 'react';
import { BuildingDefinition } from '../../game/GameCatalog';
import { BuildingSlot } from '../../hooks/useGameSocket';

interface BuildingCardProps {
  buildingDef: BuildingDefinition;
  slot?: BuildingSlot;
  onOpenUpgradeModal: (buildingDef: BuildingDefinition, slot: BuildingSlot) => void;
}

export const BuildingCard: React.FC<BuildingCardProps> = ({
  buildingDef,
  slot,
  onOpenUpgradeModal,
}) => {
  const currentLevel = slot?.level || 0;
  const isMaxLevel = currentLevel >= buildingDef.max_level;
  const isUpgrading = Boolean(
    slot?.upgrade_target_level &&
    slot.upgrade_ends_at &&
    new Date(slot.upgrade_ends_at).getTime() > Date.now()
  );

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  useEffect(() => {
    if (!isUpgrading || !slot?.upgrade_started_at || !slot?.upgrade_ends_at) {
      setTimeLeft('');
      setProgressPercent(0);
      return;
    }

    const updateTimer = () => {
      const start = new Date(slot.upgrade_started_at!).getTime();
      const end = new Date(slot.upgrade_ends_at!).getTime();
      const now = Date.now();

      if (now >= end) {
        setTimeLeft('Concluindo...');
        setProgressPercent(100);
        return;
      }

      const totalDuration = end - start;
      const elapsed = now - start;
      const pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      setProgressPercent(pct);

      const diffSecs = Math.max(0, Math.ceil((end - now) / 1000));
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isUpgrading, slot?.upgrade_started_at, slot?.upgrade_ends_at]);

  // Formata o resumo do efeito do nível atual
  const getActiveBonusSummary = () => {
    if (currentLevel <= 0) return 'Construção não iniciada (Nível 0)';
    const lvlDef = buildingDef.levels[currentLevel - 1];
    if (!lvlDef) return '';
    return lvlDef.effects
      .map((eff) => {
        switch (eff.key) {
          case 'camp_hp_regen_percent':
            return `+${eff.value}% Regen HP`;
          case 'camp_mana_regen_percent':
            return `+${eff.value}% Regen MP`;
          case 'camp_all_regen_percent':
            return `+${eff.value}% Regen Geral`;
          case 'resource_storage':
            return `Capacidade: ${eff.value}`;
          case 'salvage_unlock':
            return `Reciclagem Liberada`;
          case 'salvage_efficiency_percent':
            return `+${eff.value}% Rendimento`;
          case 'salvage_batch_size':
            return `Lote: ${eff.value} itens`;
          case 'salvage_success_chance':
            return `+${eff.value}% Taxa Êxito`;
          case 'salvage_safe_mode':
            return `Modo Seguro Lib.`;
          default:
            return '';
        }
      })
      .filter(Boolean)
      .join(' • ');
  };

  return (
    <div
      className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
        currentLevel > 0
          ? 'bg-slate-900/90 border-slate-800 shadow-md hover:border-slate-700'
          : 'bg-slate-950/60 border-slate-900 text-slate-500'
      }`}
    >
      {/* Header do Card */}
      <div>
        <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-1.5 bg-slate-950 rounded-lg border border-slate-800">
              {buildingDef.icon}
            </span>
            <div>
              <h4 className="font-bold text-xs text-slate-200">{buildingDef.name}</h4>
              <span className="text-[10px] text-slate-500 font-mono capitalize">Slot {buildingDef.slot_type}</span>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              isMaxLevel
                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40'
                : currentLevel > 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            {isMaxLevel ? 'MAX' : `Nv. ${currentLevel}/${buildingDef.max_level}`}
          </span>
        </div>

        {/* Efeito Ativo */}
        <p className="text-[11px] text-slate-400 mt-2 min-h-[28px] leading-relaxed">
          {getActiveBonusSummary()}
        </p>
      </div>

      {/* Barra de Progresso de Upgrade ou Botão de Ação */}
      <div className="mt-3 pt-2 border-t border-slate-800/80">
        {isUpgrading ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-amber-300">
              <span className="flex items-center gap-1 animate-pulse">
                <span>🔨</span> Melhorando para Nv. {slot?.upgrade_target_level}...
              </span>
              <span>{timeLeft}</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => slot && onOpenUpgradeModal(buildingDef, slot)}
            disabled={isMaxLevel || !slot}
            className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              isMaxLevel
                ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-default'
                : currentLevel === 0
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
            }`}
          >
            {isMaxLevel ? (
              <span>✓ Nível Máximo</span>
            ) : currentLevel === 0 ? (
              <span>Construir 🔨</span>
            ) : (
              <span>Melhorar (Nv. {currentLevel + 1}) ⬆</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
