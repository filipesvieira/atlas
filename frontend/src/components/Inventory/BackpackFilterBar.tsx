import React from 'react';
import { ACCESSORY_SUBCATEGORIES, WEAPON_SUBCATEGORIES } from '../../game/equipmentFilters';

export interface CategoryOption {
  id: string;
  label: string;
  slotKey?: string;
  weaponKey?: string;
}

interface BackpackFilterBarProps {
  categories: CategoryOption[];
  rarities: string[];
  categoryFilter: string;
  rarityFilter: string;
  weaponFilter: string;
  accessoryFilter: string;
  searchQuery: string;
  categoryCounts: Record<string, number>;
  weaponCounts: Record<string, number>;
  accessoryCounts: Record<string, number>;
  hasActiveFilters: boolean;
  onSelectCategory: (id: string) => void;
  onSelectWeapon: (id: string) => void;
  onSelectAccessory: (id: string) => void;
  onSelectRarity: (rarity: string) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

export const BackpackFilterBar: React.FC<BackpackFilterBarProps> = ({
  categories,
  rarities,
  categoryFilter,
  rarityFilter,
  weaponFilter,
  accessoryFilter,
  searchQuery,
  categoryCounts,
  weaponCounts,
  accessoryCounts,
  hasActiveFilters,
  onSelectCategory,
  onSelectWeapon,
  onSelectAccessory,
  onSelectRarity,
  onSearchChange,
  onClearFilters,
}) => {
  return (
    <div className="w-full min-w-0 flex flex-col gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
      {/* Linha 1: Categorias de Slots com quebra responsiva */}
      <div className="w-full flex flex-wrap items-center gap-1.5">
        {categories.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          const isActive = categoryFilter === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs whitespace-nowrap font-pixel-body transition-all ${
                isActive
                  ? 'pixel-btn pixel-btn-gold text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'pixel-btn pixel-btn-dark text-slate-300'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[9px] px-1 rounded-full ${
                  isActive ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-900 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {categoryFilter === 'weapons' && (
        <div className="w-full flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2" aria-label="Subcategorias de armas">
          <span className="mr-1 text-[10px] text-slate-500">Tipos:</span>
          {WEAPON_SUBCATEGORIES.map((subcategory) => {
            const isActive = weaponFilter === subcategory.id;
            return (
              <button
                key={subcategory.id}
                type="button"
                onClick={() => onSelectWeapon(subcategory.id)}
                className={`pixel-btn px-2 py-0.5 text-[10px] ${isActive ? 'pixel-btn-gold font-bold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}
              >
                {subcategory.label} ({weaponCounts[subcategory.id] || 0})
              </button>
            );
          })}
        </div>
      )}

      {categoryFilter === 'accessories' && (
        <div className="w-full flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2" aria-label="Subcategorias de acessórios">
          <span className="mr-1 text-[10px] text-slate-500">Tipos:</span>
          {ACCESSORY_SUBCATEGORIES.map((subcategory) => {
            const isActive = accessoryFilter === subcategory.id;
            return (
              <button
                key={subcategory.id}
                type="button"
                onClick={() => onSelectAccessory(subcategory.id)}
                className={`pixel-btn px-2 py-0.5 text-[10px] ${isActive ? 'pixel-btn-gold font-bold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}
              >
                {subcategory.label} ({accessoryCounts[subcategory.id] || 0})
              </button>
            );
          })}
        </div>
      )}

      {/* Linha 2: Busca por texto & Filtro de Raridade */}
      <div className="w-full flex flex-wrap sm:flex-nowrap items-center gap-2 font-pixel-body">
        {/* Input de Busca */}
        <div className="relative flex-1 min-w-[160px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="🔍 Buscar por nome, atributo, efeito..."
            className="w-full bg-slate-900/90 border-2 border-slate-800 rounded px-3 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
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
          className="bg-slate-900/90 border-2 border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400 shrink-0"
        >
          {rarities.map((r) => (
            <option key={r} value={r}>
              {r === 'all' ? '✨ Todas Raridades' : `💎 ${r}`}
            </option>
          ))}
        </select>

        {/* Botão de Limpar Filtros */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-xs whitespace-nowrap shrink-0"
            title="Limpar todos os filtros"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
};
