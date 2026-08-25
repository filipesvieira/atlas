import React from 'react';
import { ResourceDefinition } from '../../game/GameCatalog';
import { formatQuantity } from '../../utils/formatters';
import { PixelResourceSprite } from '../../game/registries/PixelResourceRegistry';

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
        return 'border-emerald-500/60 text-emerald-300 bg-emerald-950/80';
      case 'Raro':
        return 'border-sky-500/60 text-sky-300 bg-sky-950/80';
      case 'Épico':
        return 'border-purple-500/60 text-purple-300 bg-purple-950/80';
      case 'Lendário':
        return 'border-amber-400/80 text-amber-300 bg-amber-950/80';
      case 'Mítico':
        return 'border-rose-500/80 text-rose-300 bg-rose-950/80';
      case 'Divino':
        return 'border-amber-300 text-amber-200 bg-amber-900/80';
      default:
        return 'border-slate-700 text-slate-400 bg-slate-800/80';
    }
  };

  const isTrophy = definition.category === 'trophy' || (definition.key && definition.key.startsWith('trophy_'));
  const isDiscardable = definition.discardable !== false && !isTrophy;
  const categoryLabels: Record<string, string> = {
    profession_raw: 'Profissão', monster_part: 'Parte', processed: 'Processado',
    catalyst: 'Catalisador', trophy: 'Troféu', scrap: 'Sucata', material: 'Material',
  };
  const categoryLabel = categoryLabels[definition.category || 'material'] || 'Material';

  return (
    <div className="pixel-slot rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition shadow-sm group bg-slate-950/80">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 pixel-slot rounded bg-slate-900 border-amber-500/40 flex items-center justify-center shrink-0">
              <PixelResourceSprite resourceKey={definition.key} name={definition.name} size="md" />
            </div>
            <div className="min-w-0 flex-1">
              <h4
                title={definition.name}
                className="font-pixel-heading text-xs text-slate-200 group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug cursor-pointer"
              >
                {definition.name}
              </h4>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap font-pixel-body">
                <span className={`text-[8px] px-1.5 py-0.2 rounded font-pixel-heading border ${getRarityBadge(definition.rarity)}`}>
                  {definition.rarity}
                </span>
                <span className="text-[8px] px-1.5 py-0.2 rounded border border-slate-700 text-slate-400 bg-slate-900">
                  {categoryLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              title={`Quantidade total: ${quantity.toLocaleString()} unidades`}
              className="font-pixel-heading text-xs text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-amber-500/40 whitespace-nowrap shadow-inner"
            >
              x{formatQuantity(quantity)}
            </span>
          </div>
        </div>

        <p
          onClick={() => setIsExpanded(!isExpanded)}
          title={definition.description ? `${definition.description} (Clique para expandir/recolher)` : ''}
          className={`text-[11px] text-slate-400 mt-2 leading-relaxed cursor-pointer hover:text-slate-300 transition font-pixel-body ${isExpanded ? '' : 'line-clamp-2'}`}
        >
          {definition.description || 'Recurso essencial para desenvolvimento e forja.'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[9px] font-pixel-body">
        <span className="text-slate-500" title={`Peso no depósito`}>
          {isTrophy ? 'Livre no Depósito' : `Peso: ${definition.storage_weight || 1}/un.`}
        </span>

        {isDiscardable && (
          <button
            onClick={() => onOpenDiscard(definition)}
            className="pixel-btn pixel-btn-crimson px-2 py-0.5 text-[9px]"
            title="Descartar unidades deste recurso"
          >
            🗑️ Descartar
          </button>
        )}
      </div>
    </div>
  );
};