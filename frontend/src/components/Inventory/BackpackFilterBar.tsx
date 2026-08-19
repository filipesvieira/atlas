import React from 'react';

export interface CategoryOption {
  id: string;
  label: string;
  icon: string;
}

interface BackpackFilterBarProps {
  categories: CategoryOption[];
  rarities: string[];
  categoryFilter: string;
  rarityFilter: string;
  searchQuery: string;
  categoryCounts: Record<string, number>;
  hasActiveFilters: boolean;
  onSelectCategory: (id: string) => void;
  onSelectRarity: (rarity: string) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

export const BackpackFilterBar: React.FC<BackpackFilterBarProps> = ({
  categories,
  rarities,
  categoryFilter,
  rarityFilter,
  searchQuery,
  categoryCounts,
  hasActiveFilters,
  onSelectCategory,
  onSelectRarity,
  onSearchChange,
  onClearFilters,
}) => {
  return (
    <div className="flex flex-col gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
      {/* Linha 1: Categorias de Slots com badges de contagem */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
        {categories.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          const isActive = categoryFilter === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1 rounded-full ${
                  isActive ? 'bg-amber-500/30 text-amber-200 font-bold' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Linha 2: Busca por texto & Filtro de Raridade */}
      <div className="flex items-center gap-2">
        {/* Input de Busca */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="🔍 Buscar por nome, atributo, efeito..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-md px-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown de Raridade */}
        <select
          value={rarityFilter}
          onChange={(e) => onSelectRarity(e.target.value)}
          className="bg-slate-900/80 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
        >
          {rarities.map((r) => (
            <option key={r} value={r}>
              {r === 'all' ? '✨ Todas Raridades' : `💎 ${r}`}
            </option>
          ))}
        </select>

        {/* Limpar Filtros */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-md text-xs border border-rose-900/40 transition-colors"
            title="Limpar todos os filtros ativos"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
};
