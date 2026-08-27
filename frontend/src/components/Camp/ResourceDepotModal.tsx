import React, { useState, useMemo } from 'react';
import { ResourceAmount, ResourceCategory, ResourceDefinition } from '../../game/GameCatalog';
import { CampState } from '../../hooks/useGameSocket';
import { ResourceCapacityBar } from './ResourceCapacityBar';
import { ResourceDepotCard } from './ResourceDepotCard';
import { ResourceDiscardDialog } from './ResourceDiscardDialog';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

interface ResourceDepotModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: ResourceAmount[];
  camp: CampState | null;
  pendingResources?: ResourceAmount[];
  catalogResources: ResourceDefinition[];
  onDiscardResource: (key: string, quantity: number) => void;
  onClaimPendingResources?: () => void;
}

export const ResourceDepotModal: React.FC<ResourceDepotModalProps> = ({
  isOpen,
  onClose,
  resources,
  camp,
  pendingResources,
  catalogResources,
  onDiscardResource,
  onClaimPendingResources,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryTab, setCategoryTab] = useState<'all' | ResourceCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [discardingResource, setDiscardingResource] = useState<{
    def: ResourceDefinition;
    qty: number;
  } | null>(null);

  // Mapeia definições do catálogo
  const catalogMap = useMemo(() => {
    const map = new Map<string, ResourceDefinition>();
    for (const def of catalogResources) {
      map.set(def.key, def);
    }
    return map;
  }, [catalogResources]);

  // Filtra apenas recursos POSSUÍDOS com quantidade > 0
  const possessedResources = useMemo(() => {
    return resources
      .filter((r) => r.quantity > 0)
      .map((r) => {
        const def = catalogMap.get(r.key) || {
          key: r.key,
          name: r.key,
          icon: '📦',
          rarity: 'Comum',
          description: 'Recurso coletado.',
          max_stack: 999999,
          category: (r.key.startsWith('trophy_') ? 'trophy' : 'material') as any,
          counts_toward_storage: !r.key.startsWith('trophy_'),
          discardable: !r.key.startsWith('trophy_'),
        };
        return {
          amount: r,
          def,
        };
      });
  }, [resources, catalogMap]);

  // Aplica filtros de busca, categoria e raridade
  const filteredList = useMemo(() => {
    return possessedResources.filter(({ def }) => {
      // 1. Busca por texto
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesName = def.name.toLowerCase().includes(term);
        const matchesDesc = def.description.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc) return false;
      }

      // 2. Aba de categoria
      const category = def.category || (def.key.startsWith('trophy_') ? 'trophy' : 'material');
      if (categoryTab !== 'all' && category !== categoryTab) return false;

      // 3. Filtro de raridade
      if (rarityFilter !== 'all' && def.rarity !== rarityFilter) return false;

      return true;
    });
  }, [possessedResources, searchTerm, categoryTab, rarityFilter]);

  const storageUsed = camp?.storage_used ?? 0;
  const storageCapacity = camp?.storage_capacity ?? 500;
  const categoryTabs: Array<{ key: 'all' | ResourceCategory; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'profession_raw', label: '🌾 Profissões' },
    { key: 'monster_part', label: '👹 Partes' },
    { key: 'processed', label: '⚒️ Processados' },
    { key: 'catalyst', label: '✨ Catalisadores' },
    { key: 'scrap', label: '♻️ Sucata' },
    { key: 'trophy', label: '🏆 Troféus' },
    { key: 'material', label: '📦 Legados' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-pixel-body">
      <div className="pixel-card-gold rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header do Modal */}
        <div className="pixel-card-header pixel-card-header-gold px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 pixel-slot rounded bg-slate-900 border-amber-500/40">
              <PixelItemSprite name="minério" size="md" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-pixel-heading text-amber-300 flex items-center gap-2">
                Depósito de Recursos
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie seus materiais de construção e troféus de expedição.
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

        {/* Corpo com barra de capacidade e filtros */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Banner de Transbordo / Recursos Pendentes Protegidos */}
          {pendingResources && pendingResources.length > 0 && (
            <div className="pixel-slot pixel-alert-frame pixel-alert-warning rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <PixelItemSprite name="minério" size="md" />
                <div>
                  <h4 className="text-xs font-pixel-heading text-amber-300">
                    Recursos Retidos no Transbordo ({pendingResources.reduce((sum: number, r: ResourceAmount) => sum + r.quantity, 0)} un.)
                  </h4>
                  <p className="text-[10px] text-amber-200/80">
                    Estes recursos não couberam no armazém e estão protegidos aguardando resgate.
                  </p>
                </div>
              </div>
              {onClaimPendingResources && (
                <button
                  onClick={onClaimPendingResources}
                  className="pixel-btn pixel-btn-gold px-3.5 py-1.5 text-xs font-pixel-heading flex items-center gap-1.5"
                >
                  <span>📥</span> Resgatar
                </button>
              )}
            </div>
          )}

          {/* Barra de Capacidade do Armazém */}
          <ResourceCapacityBar
            storageUsed={storageUsed}
            storageCapacity={storageCapacity}
          />

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-1">
            {/* Abas */}
            <div className="flex flex-wrap rounded bg-slate-950 p-1 border border-slate-800 text-[10px]">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCategoryTab(tab.key)}
                  className={`px-2 py-1 rounded transition ${categoryTab === tab.key ? 'pixel-btn pixel-btn-gold text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {tab.label}{tab.key === 'all' ? ` (${possessedResources.length})` : ''}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Filtro por Raridade */}
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="all">Todas as Raridades</option>
                <option value="Comum">Comum</option>
                <option value="Incomum">Incomum</option>
                <option value="Raro">Raro</option>
                <option value="Épico">Épico</option>
                <option value="Lendário">Lendário</option>
              </select>

              {/* Input de Busca */}
              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  placeholder="Buscar recurso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <span className="absolute left-2 top-1.5 text-xs text-slate-500">🔍</span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1.5 text-xs text-slate-500 hover:text-slate-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grid de Recursos Possuídos */}
          {filteredList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2">
              {filteredList.map(({ def, amount }) => (
                <ResourceDepotCard
                  key={def.key}
                  definition={def}
                  quantity={amount.quantity}
                  onOpenDiscard={() =>
                    setDiscardingResource({ def, qty: amount.quantity })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center pixel-slot rounded-xl p-6 space-y-2 bg-slate-950/60">
              <span className="text-4xl">🌾</span>
              <h4 className="font-pixel-heading text-slate-300 text-xs">
                Nenhum recurso encontrado
              </h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                {searchTerm || categoryTab !== 'all' || rarityFilter !== 'all'
                  ? 'Nenhum recurso corresponde aos filtros aplicados.'
                  : 'Faça expedições de profissão ou cace monstros para descobrir recursos.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{possessedResources.length} tipos estocados</span>
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-dark px-4 py-1.5 text-xs font-pixel-heading"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Diálogo de Descarte */}
      {discardingResource && (
        <ResourceDiscardDialog
          resource={discardingResource.def}
          currentQuantity={discardingResource.qty}
          isOpen={true}
          onClose={() => setDiscardingResource(null)}
          onConfirm={(qty) => {
            onDiscardResource(discardingResource.def.key, qty);
            setDiscardingResource(null);
          }}
        />
      )}
    </div>
  );
};