import { useState, useEffect, useMemo } from 'react';
import { ItemIcon, getCleanItemName, getItemAttack, getRarityStyle, BonusBadges, getSlotLabel } from './ItemIcon';
import type { DerivedStats } from '../../hooks/useGameSocket';

export interface Item {
  id: string;
  name: string;
  attack?: number;
  physical_attack?: number;
  magic_attack?: number;
  defense: number;
  weight: number;
  rarity: string;
  special_effect: string;
  required_level?: number;
  bonus_str?: number;
  bonus_dex?: number;
  bonus_int?: number;
  bonus_hp?: number;
  bonus_mp?: number;
  gold_bonus?: number;
  crit_chance?: number;
  lifesteal?: number;
  mana_regen?: number;
  weapon_type?: string;
  slot_type?: string;
}

export interface EquipmentSlots {
  head?: Item | null;
  necklace?: Item | null;
  chest?: Item | null;
  mainhand?: Item | null;
  offhand?: Item | null;
  legs?: Item | null;
  boots?: Item | null;
  ring?: Item | null;
  ammo?: Item | null;
  bag?: Item | null;
}

interface TibiaBackpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  character?: any;
  derivedStats?: DerivedStats | null;
  backpack?: Item[];
  equipment?: EquipmentSlots;
  equippedBag?: Item | null;
  totalAttack?: number;
  totalDefense?: number;
  totalWeight?: number;
  maxCapacity?: number;
  maxSlots?: number;
  onEquipItem?: (itemId: string, slot: string) => void;
  onUnequipItem?: (slot: string) => void;
  onDiscardItem?: (itemId: string) => void;
  onBulkSell?: (itemIds: string[]) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '🎒' },
  { id: 'weapons', label: 'Armas', icon: '⚔️' },
  { id: 'shields', label: 'Escudos', icon: '🛡️' },
  { id: 'helmets', label: 'Elmos', icon: '🪖' },
  { id: 'armors', label: 'Armaduras', icon: '🥋' },
  { id: 'legs', label: 'Calças', icon: '👖' },
  { id: 'boots', label: 'Botas', icon: '🥾' },
  { id: 'accessories', label: 'Acessórios', icon: '📿' },
  { id: 'bags', label: 'Mochilas', icon: '🎒' },
  { id: 'ammos', label: 'Munições', icon: '🏹' },
];

const RARITIES = ['all', 'Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico', 'Divino'];

export function TibiaBackpackModal({
  isOpen,
  onClose,
  character,
  derivedStats = null,
  backpack = [],
  equipment = {},
  equippedBag = null,
  totalAttack = 15,
  totalDefense = 5,
  totalWeight = 0,
  maxCapacity = 1500,
  maxSlots = 20,
  onEquipItem,
  onUnequipItem,
  onBulkSell,
}: TibiaBackpackModalProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [inspectedItem, setInspectedItem] = useState<Item | null>(null);
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Estados de Filtro
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Resetar seleções e filtros ao abrir/fechar o modal
  useEffect(() => {
    setSelectedItemIds([]);
    setInspectedItem(null);
    setHoveredItem(null);
  }, [isOpen]);

  const safeBackpack = Array.isArray(backpack) ? backpack : [];
  const safeEquipment = equipment || {};
  const usedSlots = safeBackpack.length;
  const weightPercent = Math.min(100, Math.round((totalWeight / Math.max(1, maxCapacity)) * 100));
  const charLevel = character?.level || 1;

  const activeSelectedIds = selectedItemIds.filter((id) =>
    safeBackpack.some((item) => item.id === id)
  );

  const getItemSlotType = (item: Item): string => {
    if (item.slot_type) return item.slot_type;
    const nameLower = item.name.toLowerCase();
    if (nameLower.includes('escudo') || nameLower.includes('orbe')) return 'offhand';
    if (nameLower.includes('elmo') || nameLower.includes('capacete') || nameLower.includes('capuz')) return 'head';
    if (nameLower.includes('armadura') || nameLower.includes('cota') || nameLower.includes('peitoral') || nameLower.includes('robe')) return 'chest';
    if (nameLower.includes('calça') || nameLower.includes('legs') || nameLower.includes('saiote')) return 'legs';
    if (nameLower.includes('bota') || nameLower.includes('sandália')) return 'boots';
    if (nameLower.includes('colar') || nameLower.includes('amuleto') || nameLower.includes('talismã')) return 'necklace';
    if (nameLower.includes('anel')) return 'ring';
    if (nameLower.includes('mochila') || nameLower.includes('bolsa')) return 'bag';
    if (nameLower.includes('flecha') || nameLower.includes('virote')) return 'ammo';
    return 'mainhand';
  };

  const matchesCategory = (item: Item, cat: string): boolean => {
    if (cat === 'all') return true;
    const slot = getItemSlotType(item);
    if (cat === 'weapons') return slot === 'mainhand';
    if (cat === 'shields') return slot === 'offhand';
    if (cat === 'helmets') return slot === 'head';
    if (cat === 'armors') return slot === 'chest';
    if (cat === 'legs') return slot === 'legs';
    if (cat === 'boots') return slot === 'boots';
    if (cat === 'accessories') return slot === 'necklace' || slot === 'ring';
    if (cat === 'bags') return slot === 'bag';
    if (cat === 'ammos') return slot === 'ammo';
    return true;
  };

  // Itens Filtrados
  const filteredBackpack = useMemo(() => {
    return safeBackpack.filter((item) => {
      if (!matchesCategory(item, categoryFilter)) return false;
      if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchRarity = item.rarity.toLowerCase().includes(q);
        const matchEffect = item.special_effect?.toLowerCase().includes(q);
        if (!matchName && !matchRarity && !matchEffect) return false;
      }
      return true;
    });
  }, [safeBackpack, categoryFilter, rarityFilter, searchQuery]);

  // Contadores por Categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: safeBackpack.length };
    for (const cat of CATEGORIES) {
      if (cat.id !== 'all') {
        counts[cat.id] = safeBackpack.filter((i) => matchesCategory(i, cat.id)).length;
      }
    }
    return counts;
  }, [safeBackpack]);

  const hasActiveFilters = categoryFilter !== 'all' || rarityFilter !== 'all' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setCategoryFilter('all');
    setRarityFilter('all');
    setSearchQuery('');
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredIds = filteredBackpack.map((i) => i.id);
  const areAllFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedItemIds.includes(id));

  const handleSelectAllFiltered = () => {
    if (areAllFilteredSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSellSelected = () => {
    if (activeSelectedIds.length === 0 || !onBulkSell) return;
    onBulkSell(activeSelectedIds);
    setSelectedItemIds([]);
    setInspectedItem(null);
  };

  const handleSellAllNonBags = () => {
    if (!onBulkSell || safeBackpack.length === 0) return;
    const nonBagIds = safeBackpack
      .filter((i) => !(i.name.toLowerCase().includes('mochila') || i.name.toLowerCase().includes('bolsa')))
      .map((i) => i.id);
    if (nonBagIds.length > 0) {
      onBulkSell(nonBagIds);
      setSelectedItemIds([]);
      setInspectedItem(null);
    }
  };

  const handleMouseEnterItem = (e: React.MouseEvent, item: Item) => {
    setHoveredItem(item);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  // Slot Equipado no Modal
  const ModalEquipSlot = ({ item, label, slotKey }: { item?: Item | null; label: string; slotKey: string }) => {
    const rarityStyle = item ? getRarityStyle(item.rarity) : { border: 'border-slate-800 bg-slate-950/80', text: 'text-slate-600' };
    const atkVal = item ? getItemAttack(item) : 0;

    return (
      <div
        onClick={() => item && onUnequipItem && onUnequipItem(slotKey)}
        onMouseEnter={(e) => item && handleMouseEnterItem(e, item)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`w-11 h-11 rounded-lg border flex flex-col items-center justify-center relative cursor-pointer group transition-all ${rarityStyle.border}`}
      >
        {item ? (
          <div className="flex flex-col items-center justify-center relative w-full h-full p-0.5">
            <ItemIcon
              name={item.name}
              slotType={slotKey}
              specialEffect={item.special_effect}
              size="sm"
              className={`${rarityStyle.text} group-hover:scale-110 transition-transform`}
            />
            {(atkVal > 0 || (item.defense || 0) > 0) && (
              <div className="text-[7px] font-mono text-emerald-400 font-bold leading-none mt-0.5">
                +{atkVal > 0 ? `${atkVal}A` : `${item.defense}D`}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs opacity-40 select-none">🛡️</span>
        )}
        <span className="text-[7px] font-sans text-slate-500 absolute -bottom-1 bg-slate-900 px-0.5 rounded border border-slate-800 scale-90 truncate max-w-full">
          {label}
        </span>
      </div>
    );
  };

  // Calcula a soma de bônus de equipamentos equipados
  const eqList = [
    safeEquipment.head, safeEquipment.chest, safeEquipment.legs, safeEquipment.boots,
    safeEquipment.mainhand, safeEquipment.offhand, safeEquipment.necklace, safeEquipment.ring,
    safeEquipment.ammo, safeEquipment.bag,
  ].filter(Boolean) as Item[];

  const eqBonus = eqList.reduce(
    (acc, it) => {
      acc.str += it.bonus_str || 0;
      acc.dex += it.bonus_dex || 0;
      acc.int += it.bonus_int || 0;
      acc.hp += it.bonus_hp || 0;
      acc.mp += it.bonus_mp || 0;
      acc.gold += it.gold_bonus || 0;
      acc.lifesteal += it.lifesteal || 0;
      acc.manaRegen += it.mana_regen || 0;
      acc.crit += it.crit_chance || 0;
      return acc;
    },
    { str: 0, dex: 0, int: 0, hp: 0, mp: 0, gold: 0, lifesteal: 0, manaRegen: 0, crit: 0 }
  );

  const baseStr = character?.str ?? character?.STR ?? 5;
  const baseDex = character?.dex ?? character?.DEX ?? 5;
  const baseInt = character?.int_stat ?? character?.int ?? character?.INT ?? 5;

  const totalStr = derivedStats ? derivedStats.effective_str : baseStr + eqBonus.str;
  const totalDex = derivedStats ? derivedStats.effective_dex : baseDex + eqBonus.dex;
  const totalInt = derivedStats ? derivedStats.effective_int : baseInt + eqBonus.int;
  const critFromDex = (totalDex / (totalDex + 300)) * 25.0;
  const totalCrit = derivedStats ? derivedStats.crit_chance : Math.min(50.0, Math.round((5.0 + critFromDex + eqBonus.crit) * 100) / 100);
  const regenFromInt = (totalInt / (totalInt + 300)) * 6.0;
  const totalManaRegen = derivedStats ? derivedStats.mana_regen_per_second : Math.round((1.5 + regenFromInt + eqBonus.manaRegen) * 10) / 10;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
      {/* Tooltip Overlay Fixo sem Cortes (fixed z-[100]) */}
      {hoveredItem && tooltipPos && (
        <div
          className="fixed z-[100] w-52 p-3 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl pointer-events-none text-left backdrop-blur-sm animate-in fade-in zoom-in-95"
          style={{
            top: `${Math.max(16, tooltipPos.y - 140)}px`,
            left: `${Math.min(window.innerWidth - 220, Math.max(16, tooltipPos.x - 104))}px`,
          }}
        >
          <div className="flex justify-between items-start gap-1">
            <div className={`font-bold text-xs ${getRarityStyle(hoveredItem.rarity).text}`}>
              {getCleanItemName(hoveredItem.name)}
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${getRarityStyle(hoveredItem.rarity).badgeBg} ${getRarityStyle(hoveredItem.rarity).badgeBorder} ${getRarityStyle(hoveredItem.rarity).badgeText}`}>
              {hoveredItem.rarity}
            </span>
          </div>

          <div className="text-[9px] text-slate-400 border-b border-slate-800 pb-1 mb-1 font-mono">
            Slot: {getSlotLabel(getItemSlotType(hoveredItem))}
          </div>

          {/* Requisito de Nível */}
          {hoveredItem.required_level && hoveredItem.required_level > 1 && (
            <div className={`text-[10px] font-mono font-bold mb-1.5 flex items-center gap-1 ${
              charLevel < hoveredItem.required_level ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              <span>{charLevel < hoveredItem.required_level ? '🔒' : '✅'}</span>
              <span>Requer Nível {hoveredItem.required_level}</span>
            </div>
          )}

          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span className="text-rose-400 font-bold">Atk: +{getItemAttack(hoveredItem)}</span>
            <span className="text-sky-400 font-bold">Def: +{hoveredItem.defense || 0}</span>
            <span className="text-slate-400">{(hoveredItem.weight || 0).toFixed(1)} oz</span>
          </div>

          <BonusBadges item={hoveredItem} />

          {hoveredItem.special_effect && (
            <div className="text-[9px] text-purple-400 italic leading-tight mt-1.5 border-t border-slate-800 pt-1">
              {hoveredItem.special_effect}
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <ItemIcon slotType="bag" size="lg" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <span>🎒</span> Mochila & Inventário do Aventureiro
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {equippedBag ? `Mochila Equipada: ${getCleanItemName(equippedBag.name)} (${equippedBag.rarity})` : 'Mochila Básica'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono transition"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Painel de Atributos do Aventureiro em Tempo Real */}
        {character && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs shrink-0 flex flex-col gap-2 shadow-inner">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-3">
                <span className="text-amber-300 font-bold text-sm">{character.name || 'Herói'}</span>
                <span className="text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-semibold">
                  Lv. {charLevel} ({character.vocation || 'Aprendiz'})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="text-rose-400 font-semibold">❤️ HP: {character.health || 0}/{character.max_health || 0}</span>
                <span className="text-sky-400 font-semibold">💙 MP: {character.mana || 0}/{character.max_mana || 0}</span>
                <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  ⚔️ Atk: {totalAttack}
                </span>
                <span className="text-sky-300 font-bold bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">
                  🛡️ Def: {totalDefense}
                </span>
              </div>
            </div>

            {/* Atributos Primários + Passivas de Equipamento */}
            <div className="flex flex-wrap justify-between items-center gap-3 text-[11px] pt-0.5">
              <div className="flex gap-3 items-center">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Atributos:</span>
                <span className="text-slate-300">FOR: <strong className="text-amber-300">{totalStr}</strong> {eqBonus.str > 0 && <span className="text-[9px] text-amber-500">(+{eqBonus.str})</span>}</span>
                <span className="text-slate-300">DES: <strong className="text-emerald-300">{totalDex}</strong> {eqBonus.dex > 0 && <span className="text-[9px] text-emerald-500">(+{eqBonus.dex})</span>}</span>
                <span className="text-slate-300">INT: <strong className="text-sky-300">{totalInt}</strong> {eqBonus.int > 0 && <span className="text-[9px] text-sky-500">(+{eqBonus.int})</span>}</span>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-semibold border-l border-slate-800 pl-3">
                <span className="px-1.5 py-0.5 bg-red-950/60 text-red-300 border border-red-800/50 rounded" title="Porcentagem de cura baseada no dano causado">
                  🩸 Vampirismo: {eqBonus.lifesteal.toFixed(1)}%
                </span>
                <span className="px-1.5 py-0.5 bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 rounded" title="Regeneração total de Mana por tick">
                  💧 Regen MP: +{totalManaRegen}/s
                </span>
                <span className="px-1.5 py-0.5 bg-purple-950/60 text-purple-300 border border-purple-800/50 rounded" title="Chance de Acerto Crítico (1.5x Dano)">
                  ⚡ Crítico: {totalCrit.toFixed(1)}%
                </span>
                <span className="px-1.5 py-0.5 bg-yellow-950/60 text-yellow-300 border border-yellow-800/50 rounded" title="Bônus extra no Ouro obtido de monstros">
                  💰 Bônus Ouro: +{eqBonus.gold.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Indicadores de Capacidade (Slots e Peso) */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs shrink-0">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Slots Utilizados:</span>
              <span className={`font-bold ${usedSlots >= maxSlots ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                {usedSlots} / {maxSlots}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${usedSlots >= maxSlots ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (usedSlots / maxSlots) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Capacidade (Cap):</span>
              <span className={`font-bold ${weightPercent >= 90 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {totalWeight.toFixed(1)} / {maxCapacity.toFixed(1)} oz
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${weightPercent >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${weightPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal: Equipamentos + Mochila em Grid com Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-1">
          {/* Coluna 1: Equipamentos Atuais */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <h4 className="text-xs font-bold text-amber-400 border-b border-slate-800 w-full pb-1 text-center">
              🛡️ Equipamentos
            </h4>
            <div className="flex flex-col gap-2 my-auto">
              <div className="flex gap-2">
                <ModalEquipSlot item={safeEquipment.necklace} label="Colar" slotKey="necklace" />
                <ModalEquipSlot item={safeEquipment.head} label="Elmo" slotKey="head" />
                <ModalEquipSlot item={safeEquipment.bag} label="Mochila" slotKey="bag" />
              </div>
              <div className="flex gap-2">
                <ModalEquipSlot item={safeEquipment.mainhand} label="Arma" slotKey="mainhand" />
                <ModalEquipSlot item={safeEquipment.chest} label="Armadura" slotKey="chest" />
                <ModalEquipSlot item={safeEquipment.offhand} label="Escudo" slotKey="offhand" />
              </div>
              <div className="flex gap-2">
                <ModalEquipSlot item={safeEquipment.ring} label="Anel" slotKey="ring" />
                <ModalEquipSlot item={safeEquipment.legs} label="Calça" slotKey="legs" />
                <ModalEquipSlot item={safeEquipment.ammo} label="Munição" slotKey="ammo" />
              </div>
              <div className="flex gap-2 justify-center">
                <ModalEquipSlot item={safeEquipment.boots} label="Bota" slotKey="boots" />
              </div>
            </div>
            <p className="text-[9px] text-slate-500 italic text-center">Clique em um item equipado para desequipar</p>
          </div>

          {/* Colunas 2 e 3: Mochila (Filtros, Slots & Seleção) */}
          <div className="md:col-span-2 bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2.5">
            {/* Header da Mochila com Contagem e Botão Selecionar */}
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>🎒</span> Conteúdo da Mochila
                </h4>
                <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                  {filteredBackpack.length} / {safeBackpack.length} Itens
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono flex items-center gap-0.5"
                    title="Limpar todos os filtros"
                  >
                    <span>✕</span> Limpar Filtros
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Campo de Busca Rápida */}
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 pointer-events-none">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar item..."
                    className="bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-6 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-28 sm:w-36 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 top-1 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={handleSelectAllFiltered}
                  className="text-[10px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono border border-slate-700 transition"
                >
                  {areAllFilteredSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>
            </div>

            {/* Barra de Filtros: Tipo de Equipamento (Categorias) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-thin scrollbar-thumb-slate-800">
              <span className="text-slate-500 text-[9px] uppercase font-bold shrink-0 mr-0.5">Tipo:</span>
              {CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                const isActive = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition border ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className={`text-[9px] px-1 rounded ${isActive ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Barra de Filtros: Raridade */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-thin scrollbar-thumb-slate-800">
              <span className="text-slate-500 text-[9px] uppercase font-bold shrink-0 mr-0.5">Raridade:</span>
              {RARITIES.map((r) => {
                const isActive = rarityFilter === r;
                const style = r !== 'all' ? getRarityStyle(r) : null;
                return (
                  <button
                    key={r}
                    onClick={() => setRarityFilter(r)}
                    className={`px-2 py-0.5 rounded-md shrink-0 transition border ${
                      isActive
                        ? style
                          ? `${style.badgeBg} ${style.badgeBorder} ${style.badgeText} font-bold shadow-sm ring-1 ring-amber-400/30`
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {r === 'all' ? 'Todas' : r}
                  </button>
                );
              })}
            </div>

            {/* Grid dos Slots Filtrados */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredBackpack.map((item, index) => {
                const isSelected = activeSelectedIds.includes(item.id);
                const style = getRarityStyle(item.rarity);
                const slotType = getItemSlotType(item);
                const cleanName = getCleanItemName(item.name);
                const atkVal = getItemAttack(item);
                const isLevelLocked = item.required_level ? charLevel < item.required_level : false;

                return (
                  <div
                    key={item.id || index}
                    onClick={() => {
                      toggleSelectItem(item.id);
                      setInspectedItem(item);
                    }}
                    onMouseEnter={(e) => handleMouseEnterItem(e, item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`h-16 rounded-xl border p-1.5 flex flex-col justify-between cursor-pointer transition-all relative group shadow-sm ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50 shadow-amber-500/20'
                        : style.border
                    }`}
                  >
                    {/* Badge de Nível Bloqueado */}
                    {isLevelLocked && (
                      <span className="absolute -top-1 -left-1 bg-rose-600 text-white font-bold rounded-full w-4 h-4 text-[8px] flex items-center justify-center shadow" title={`Requer Nível ${item.required_level}`}>
                        🔒
                      </span>
                    )}

                    {/* Badge de Seleção */}
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-bold rounded-full w-4 h-4 text-[9px] flex items-center justify-center shadow">
                        ✓
                      </span>
                    )}

                    <div className="flex justify-between items-center gap-1">
                      <ItemIcon
                        name={item.name}
                        slotType={slotType}
                        weaponType={item.weapon_type}
                        specialEffect={item.special_effect}
                        size="sm"
                        className={`${style.text} shrink-0`}
                      />
                      <span className={`text-[10px] font-bold truncate flex-1 ${style.text}`} title={cleanName}>
                        {cleanName}
                      </span>
                    </div>

                    <div className="flex justify-between items-end font-mono text-[9px] mt-1">
                      <span className="text-amber-400 font-bold">
                        {atkVal > 0 ? `+${atkVal}A` : (item.defense || 0) > 0 ? `+${item.defense}D` : ''}
                      </span>
                      <span className="text-slate-400 font-normal text-[8px]">
                        {(item.weight || 0).toFixed(1)}oz
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Slots vazios para preenchimento visual se não houver filtros restritivos */}
              {!hasActiveFilters && filteredBackpack.length < maxSlots &&
                Array.from({ length: maxSlots - filteredBackpack.length }).map((_, index) => (
                  <div
                    key={`empty_${index}`}
                    className="h-16 rounded-xl border border-slate-900 bg-slate-950/60 flex items-center justify-center text-[10px] font-mono text-slate-800 select-none shadow-inner"
                  >
                    {filteredBackpack.length + index + 1}
                  </div>
                ))}
            </div>

            {/* Mensagem quando nenhum item é encontrado pelos filtros */}
            {filteredBackpack.length === 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-2xl">🔍</span>
                <p className="text-xs text-slate-300 font-semibold">Nenhum item encontrado com os filtros aplicados.</p>
                <p className="text-[11px] text-slate-500 font-mono">Tente mudar o tipo de equipamento, raridade ou termo de busca.</p>
                <button
                  onClick={clearFilters}
                  className="mt-1 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono transition"
                >
                  Resetar Filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detalhes / Ações Rápidas do Item Inspecionado */}
        {inspectedItem && (
          <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3 flex flex-wrap justify-between items-center gap-3 shrink-0 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <ItemIcon
                name={inspectedItem.name}
                slotType={getItemSlotType(inspectedItem)}
                weaponType={inspectedItem.weapon_type}
                specialEffect={inspectedItem.special_effect}
                size="md"
                className="text-amber-400"
              />
              <div>
                <h5 className="font-bold text-xs text-amber-300 flex items-center gap-2">
                  <span>{getCleanItemName(inspectedItem.name)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${getRarityStyle(inspectedItem.rarity).badgeBg} ${getRarityStyle(inspectedItem.rarity).badgeBorder} ${getRarityStyle(inspectedItem.rarity).badgeText}`}>
                    {inspectedItem.rarity}
                  </span>
                  {inspectedItem.required_level && inspectedItem.required_level > 1 && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      charLevel < inspectedItem.required_level
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}>
                      {charLevel < inspectedItem.required_level ? '🔒' : '✅'} Requer Lv. {inspectedItem.required_level}
                    </span>
                  )}
                </h5>
                <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-400 mt-0.5">
                  <span>Atk: <strong className="text-rose-400">+{getItemAttack(inspectedItem)}</strong></span>
                  <span>Def: <strong className="text-sky-400">+{inspectedItem.defense || 0}</strong></span>
                  <span>Peso: <strong className="text-slate-300">{(inspectedItem.weight || 0).toFixed(1)} oz</strong></span>
                  <span>Slot: <strong className="text-slate-300">{getSlotLabel(getItemSlotType(inspectedItem))}</strong></span>
                </div>
                <BonusBadges item={inspectedItem} />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={inspectedItem.required_level ? charLevel < inspectedItem.required_level : false}
                onClick={() => {
                  const slot = getItemSlotType(inspectedItem);
                  onEquipItem && onEquipItem(inspectedItem.id, slot);
                  setInspectedItem(null);
                }}
                className={`px-3 py-1.5 font-bold rounded-lg text-xs transition shadow ${
                  inspectedItem.required_level && charLevel < inspectedItem.required_level
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
                title={inspectedItem.required_level && charLevel < inspectedItem.required_level ? `Nível insuficiente (Requer Lv. ${inspectedItem.required_level})` : 'Equipar Item'}
              >
                {inspectedItem.required_level && charLevel < inspectedItem.required_level ? `🔒 Requer Lv. ${inspectedItem.required_level}` : 'Equipar Item'}
              </button>
              {onBulkSell && (
                <button
                  onClick={() => {
                    onBulkSell([inspectedItem.id]);
                    setInspectedItem(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-600 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1"
                >
                  <span>💰</span> Vender Item
                </button>
              )}
            </div>
          </div>
        )}

        {/* Barra de Ações em Lote (Bulk Actions) - Sem botão de descarte */}
        <div className="flex flex-wrap justify-between items-center border-t border-slate-800 pt-3 gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Selecionados: <strong className="text-amber-400">{activeSelectedIds.length}</strong></span>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeSelectedIds.length > 0 && onBulkSell && (
              <button
                onClick={handleSellSelected}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
              >
                <span>💰</span> Vender Selecionados ({activeSelectedIds.length})
              </button>
            )}

            <button
              onClick={handleSellAllNonBags}
              className="px-3 py-2 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <span>💰</span> Vender Tudo (Exceto Mochilas)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

