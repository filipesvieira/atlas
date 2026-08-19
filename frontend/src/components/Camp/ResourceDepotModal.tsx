import React, { useState, useMemo } from 'react';
import { ResourceAmount, ResourceCategory, ResourceDefinition } from '../../game/GameCatalog';
import { CampState } from '../../hooks/useGameSocket';
import { ResourceCapacityBar } from './ResourceCapacityBar';
import { ResourceDepotCard } from './ResourceDepotCard';
import { ResourceDiscardDialog } from './ResourceDiscardDialog';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header do Modal */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/30 text-amber-300">
              📦
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                Depósito de Recursos do Acampamento
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie seus materiais de construção e troféus de expedição.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-base transition"
          >
            ✕
          </button>
        </div>

        {/* Corpo com barra de capacidade e filtros */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Banner de Transbordo / Recursos Pendentes Protegidos */}
          {pendingResources && pendingResources.length > 0 && (
            <div className="bg-amber-950/60 border-2 border-amber-500/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-pulse">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📦</span>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    Recursos Retidos no Transbordo ({pendingResources.reduce((sum: number, r: ResourceAmount) => sum + r.quantity, 0)} unidades)
                  </h4>
                  <p className="text-[10px] text-amber-200/80">
                    Estes recursos não couberam no armazém e estão protegidos aguardando espaço para resgate.
                  </p>
                </div>
              </div>
              {onClaimPendingResources && (
                <button
                  onClick={onClaimPendingResources}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition shadow flex items-center gap-1.5"
                >
                  <span>📥</span> Resgatar para o Depósito
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
            <div className="flex flex-wrap rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCategoryTab(tab.key)}
                  className={`px-2.5 py-1 rounded-md transition ${categoryTab === tab.key ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
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
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-amber-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
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
            <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80 p-6 space-y-2">
              <span className="text-4xl">🌾</span>
              <h4 className="text-slate-300 font-semibold text-sm">
                Nenhum recurso encontrado
              </h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                {searchTerm || categoryTab !== 'all' || rarityFilter !== 'all'
                  ? 'Nenhum recurso corresponde aos filtros aplicados.'
                  : 'Faça expedições de profissão ou cace monstros para descobrir recursos. Itens com quantidade zero permanecem ocultos.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{possessedResources.length} tipos de itens estocados</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition border border-slate-700"
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
