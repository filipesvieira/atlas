import React from 'react';
import { ResourceDefinition } from '../../game/GameCatalog';
import { ResourceAmount } from '../../hooks/useGameSocket';
import { formatQuantity } from '../../utils/formatters';

interface ResourceBarProps {
  resources: ResourceAmount[];
  definitions: ResourceDefinition[];
  storageUsed?: number;
  storageCapacity?: number;
  onOpenDepot?: () => void;
}

const DEFAULT_RESOURCE_NAMES: Record<string, string> = {
  wood: 'Madeira',
  stone: 'Pedra',
  iron: 'Minério de Ferro',
  fiber: 'Fibra Vegetal',
  leather: 'Couro Bruto',
  arcane_essence: 'Essência Arcana',
};

const DEFAULT_RESOURCE_ICONS: Record<string, string> = {
  wood: '🪵',
  stone: '🪨',
  iron: '⛓️',
  fiber: '🌿',
  leather: '📜',
  arcane_essence: '✨',
};

export const ResourceBar: React.FC<ResourceBarProps> = ({
  resources = [],
  definitions = [],
  storageUsed = 0,
  storageCapacity = 500,
  onOpenDepot,
}) => {
  const safeDefinitions = Array.isArray(definitions) ? definitions.filter(Boolean) : [];
  const safeResources = Array.isArray(resources) ? resources.filter(Boolean) : [];

  const defMap = new Map(safeDefinitions.map((d) => [d.key, d]));
  const resMap = new Map(safeResources.map((r) => [r.key, r.quantity]));

  const primaryKeys = safeResources
    .filter((resource) => resource.quantity > 0 && !resource.key.startsWith('trophy_'))
    .sort((a, b) => b.quantity - a.quantity || a.key.localeCompare(b.key))
    .slice(0, 6)
    .map((resource) => resource.key);
  const trophyList = safeResources.filter((r) => r.key && r.key.startsWith('trophy_') && r.quantity > 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2.5 font-sans">
      {/* Header do Depósito com Barra de Armazenamento */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📦</span>
          <h3 className="font-bold text-amber-400 text-xs tracking-wide uppercase">
            Depósito de Materiais
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de Armazenamento */}
          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border flex items-center gap-1.5 shadow-inner ${
              storageUsed >= storageCapacity
                ? 'bg-rose-950/60 text-rose-300 border-rose-500/60'
                : storageUsed >= storageCapacity * 0.8
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            title="Capacidade do Armazém (expansível com melhorias da construção Armazém)"
          >
            Armazém: {storageUsed} / {storageCapacity}
          </span>

          {onOpenDepot && (
            <button
              onClick={onOpenDepot}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <span>🔍 Ver Todos</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Recursos Primários */}
      {primaryKeys.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 text-xs">
        {primaryKeys.map((key) => {
          const qty = resMap.get(key) || 0;
          const def = defMap.get(key);
          const icon = def?.icon || DEFAULT_RESOURCE_ICONS[key] || '📦';
          const name = def?.name || DEFAULT_RESOURCE_NAMES[key] || key;

          return (
            <div
              key={key}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all ${
                'bg-slate-950/80 border-slate-700 text-slate-200 shadow-sm'
              }`}
              title={`${name}: ${qty.toLocaleString()} unidades guardadas`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm shrink-0">{icon}</span>
                <span className="text-[11px] truncate font-medium">{name}</span>
              </div>
              <span className="font-mono text-[11px] font-bold shrink-0 ml-1 text-amber-300">
                {formatQuantity(qty)}
              </span>
            </div>
          );
        })}
      </div> : (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/30 px-3 py-2 text-center text-[11px] text-slate-500">
          O depósito está vazio. Recursos aparecem aqui somente depois de descobertos.
        </div>
      )}

      {/* Faixa de Troféus de Boss (se houver algum) */}
      {trophyList.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <span>🏆 Troféus de Boss:</span>
          </span>
          {trophyList.map((t) => {
            const def = defMap.get(t.key);
            const icon = def?.icon || '🏆';
            const name = def?.name || t.key;
            return (
              <div
                key={t.key}
                className="flex items-center gap-1 bg-amber-950/40 border border-amber-500/40 px-2 py-0.5 rounded-full text-[11px] text-amber-200"
                title={`${name}: ${t.quantity.toLocaleString()} unidades`}
              >
                <span>{icon}</span>
                <span>{name}</span>
                <span className="font-mono font-bold text-amber-400">x{formatQuantity(t.quantity)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
