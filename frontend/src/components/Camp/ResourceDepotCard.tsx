import React from 'react';
import { ResourceDefinition } from '../../game/GameCatalog';
import { formatQuantity } from '../../utils/formatters';

interface ResourceDepotCardProps {
  definition: ResourceDefinition;
  quantity: number;
  onOpenDiscard: (def: ResourceDefinition) => void;
}

export const ResourceDepotCard: React.FC<ResourceDepotCardProps> = ({
  definition,
  quantity,
  onOpenDiscard,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'Incomum':
        return 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40';
      case 'Raro':
        return 'border-sky-500/50 text-sky-400 bg-sky-950/40';
      case 'Épico':
        return 'border-purple-500/50 text-purple-400 bg-purple-950/40';
      case 'Lendário':
        return 'border-orange-500/50 text-orange-400 bg-orange-950/40';
      case 'Mítico':
        return 'border-rose-500/60 text-rose-400 bg-rose-950/40';
      case 'Divino':
        return 'border-amber-400/80 text-amber-300 bg-amber-950/50';
      default:
        return 'border-slate-700 text-slate-400 bg-slate-800/40';
    }
  };

  const isTrophy = definition.category === 'trophy' || (definition.key && definition.key.startsWith('trophy_'));
  const isDiscardable = definition.discardable !== false && !isTrophy;
  const categoryLabels: Record<string, string> = {
    profession_raw: '🌾 Profissão', monster_part: '👹 Parte de monstro', processed: '⚒️ Processado',
    catalyst: '✨ Catalisador', trophy: '🏆 Troféu', scrap: '♻️ Sucata', material: '📦 Material',
  };
  const categoryLabel = categoryLabels[definition.category || 'material'] || '📦 Material';

  const sourceLabels: Record<string, string> = {
    gathering: 'Coleta de Moradores',
    monster_drop: 'Drop de Monstros',
    offline_monster_drop: 'Expedição Offline',
    crafting: 'Oficina Manual',
    legacy: 'Legado',
  };
  const sourceLabel = sourceLabels[definition.source_kind || ''] || definition.source_kind || 'Coleta';

  return (
    <div className="bg-slate-900/85 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition shadow-sm hover:shadow-md group">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform shrink-0">
              {definition.icon || '📦'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs text-slate-200 group-hover:text-amber-300 transition-colors line-clamp-1">
                {definition.name}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${getRarityBadge(definition.rarity)}`}>
                  {definition.rarity}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded border border-slate-700 text-slate-400 bg-slate-800/40 font-medium">
                  {categoryLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              title={`Quantidade total: ${quantity.toLocaleString()} unidades`}
              className="font-mono text-xs font-extrabold text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded border border-amber-500/30 whitespace-nowrap shadow-inner"
            >
              x{formatQuantity(quantity)}
            </span>
          </div>
        </div>

        <p
          onClick={() => setIsExpanded(!isExpanded)}
          title={definition.description ? `${definition.description} (Clique para expandir/recolher)` : ''}
          className={`text-[11px] text-slate-400 mt-2 leading-relaxed cursor-pointer hover:text-slate-300 transition ${isExpanded ? '' : 'line-clamp-2'}`}
        >
          {definition.description || 'Recurso essencial para desenvolvimento e forja.'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-[10px]">
        <span className="text-slate-500" title={`Peso no depósito e origem do material`}>
          {isTrophy ? 'Livre no Depósito' : `Peso: ${definition.storage_weight || 1}/un. · Origem: ${sourceLabel}`}
        </span>

        {isDiscardable && (
          <button
            onClick={() => onOpenDiscard(definition)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/60 font-medium transition"
            title="Descartar unidades deste recurso"
          >
            🗑️ Descartar
          </button>
        )}
      </div>
    </div>
  );
};
