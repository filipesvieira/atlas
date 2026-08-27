import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { ConsumableDefinition, GatheringExpeditionDefinition, GameCatalogData, RecipeDefinition } from '../../game/GameCatalog';
import type { ActiveBuff, CraftBatchResult, CraftPreview, EconomyState, Item, ProfessionProgress, ResourceAmount, SettlementResident } from '../../hooks/useGameSocket';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';
import { PixelResourceSprite } from '../../game/registries/PixelResourceRegistry';
import { PixelProfessionSprite } from '../../game/registries/PixelProfessionRegistry';
import { ACCESSORY_SUBCATEGORIES, EQUIPMENT_FILTER_CATEGORIES, WEAPON_SUBCATEGORIES, accessorySubcategoryMatches, equipmentCategory, weaponSubcategoryMatches } from '../../game/equipmentFilters';
import { getBagSlotBonus, getBagSlotRange } from '../../game/bagCapacity';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  catalog: GameCatalogData;
  economy: EconomyState | null;
  resources: ResourceAmount[];
  craftPreview: CraftPreview | null;
  craftBatchResult: CraftBatchResult | null;
  characterGold: number;
  onStartGathering: (key: string, duration: number) => void;
  onCancelGathering: (activityId: string) => void;
  onClaimGathering: (activityId: string) => void;
  onPreviewCraft: (recipeKey: string, catalystKey?: string) => void;
  onCraft: (recipeKey: string, catalystKey?: string, previewRevision?: number, quantity?: number) => void;
  onConsumeFood: (resourceKey: string) => void;
  onSync: () => void;
  onClaimPendingCraft: (itemId: string) => void;
  onClaimPendingResources: () => void;
  onCreateHeroDesire: (recipeKey: string, targetRarity: string, catalystKey: string, maxAttempts: number, priority: number) => void;
  onCancelHeroDesire: (desireId: string) => void;
  onClaimArmoryItem: (armoryId: string) => void;
  onTransferTreasuryGold: (direction: 'deposit' | 'withdraw', amount: number) => void;
  onUpdateTreasuryPolicy: (enabled: boolean, personalReserve: number) => void;
}

type Tab = 'work' | 'treasury' | 'ambitions' | 'kitchen' | 'alchemy' | 'crafting' | 'residents';
const rarityLabel: Record<string, string> = { common: 'Comum', uncommon: 'Incomum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário', Comum: 'Comum', Incomum: 'Incomum', Raro: 'Raro', 'Épico': 'Épico', 'Lendário': 'Lendário' };
const rarityClass: Record<string, string> = { common: 'text-slate-300', uncommon: 'text-emerald-300', rare: 'text-sky-300', epic: 'text-fuchsia-300', legendary: 'text-amber-300', Comum: 'text-slate-300', Incomum: 'text-emerald-300', Raro: 'text-sky-300', 'Épico': 'text-fuchsia-300', 'Lendário': 'text-amber-300' };
const rarityKeys = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const canonicalRarityAliases: Record<string, string> = { Comum: 'common', Incomum: 'uncommon', Raro: 'rare', 'Épico': 'epic', Lendário: 'legendary' };
const canonicalRarityKey = (rarity?: string) => canonicalRarityAliases[rarity || ''] || rarity || 'common';
const raritiesForRecipe = (recipe?: RecipeDefinition) => {
  if (!recipe) return [] as string[];
  const minimum = Math.max(0, rarityKeys.indexOf(canonicalRarityKey(recipe.minimum_rarity) as typeof rarityKeys[number]));
  const maximumIndex = rarityKeys.indexOf(canonicalRarityKey(recipe.maximum_rarity) as typeof rarityKeys[number]);
  const maximum = maximumIndex >= 0 ? maximumIndex : rarityKeys.length - 1;
  return rarityKeys.slice(minimum, maximum + 1) as unknown as string[];
};
const durationLabel = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  if (safeSeconds < 3600) return `${Math.max(1, Math.ceil(safeSeconds / 60))} min`;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.ceil((safeSeconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours} h`;
};

export const professionLabels: Record<string, string> = {
  miner: 'Minerador',
  tracker: 'Rastreador',
  fisher: 'Pescador',
  lumberjack: 'Lenhador',
  blacksmith: 'Ferreiro',
  jeweler: 'Joalheiro',
  woodworker: 'Marceneiro',
  alchemist: 'Alquimista',
  herbalist: 'Herbalista',
  farmer: 'Agricultor',
  tailor: 'Alfaiate',
  leatherworker: 'Coureiro',
  cook: 'Cozinheiro',
};

export const buildingLabels: Record<string, string> = {
  workbench: 'Bancada de Trabalho',
  warehouse: 'Armazém de Recursos',
  campfire: 'Fogueira do Acampamento',
  adventurer_hut: 'Cabana do Aventureiro',
  arcane_spring: 'Fonte Arcana',
  kitchen: 'Cozinha de Campanha',
  alchemy_bench: 'Bancada de Alquimia',
};

export const catalystLabels: Record<string, string> = {
  prismatic_core: '✨ Núcleo Prismático',
  quality_dust: '✨ Pó de Qualidade',
  alchemical_catalyst: '🧪 Catalisador Alquímico',
  ancient_amber: '🪨 Âmbar Ancestral',
};

export const catalystPurpose: Record<string, string> = {
  quality_dust: 'Aumenta as chances de raridades Incomum, Raro e Épico. Consome 1 unidade por craft e não garante uma raridade.',
  prismatic_core: 'Aumenta fortemente as chances de Raro, Épico e Lendário. Consome 1 unidade por craft e não garante uma raridade.',
};

export const slotLabels: Record<string, { label: string; icon: string }> = {
  head: { label: 'Elmo', icon: '🪖' },
  chest: { label: 'Armadura', icon: '🥋' },
  legs: { label: 'Calças', icon: '👖' },
  boots: { label: 'Botas', icon: '🥾' },
  mainhand: { label: 'Arma', icon: '⚔️' },
  offhand: { label: 'Escudo / Secundário', icon: '🛡️' },
  necklace: { label: 'Colar / Amuleto', icon: '📿' },
  ring: { label: 'Anel', icon: '💍' },
  ammo: { label: 'Munição', icon: '🏹' },
  bag: { label: 'Mochila', icon: '🎒' },
};

export const CRAFT_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '🎒' },
  { id: 'weapons', label: 'Armas', icon: '⚔️' },
  { id: 'shields', label: 'Escudos', icon: '🛡️' },
  { id: 'helmets', label: 'Elmos', icon: '🪖' },
  { id: 'armors', label: 'Armaduras', icon: '🥋' },
  { id: 'legs', label: 'Calças', icon: '👖' },
  { id: 'boots', label: 'Botas', icon: '🥾' },
  { id: 'accessories', label: 'Acessórios', icon: '📿' },
  { id: 'bags', label: 'Mochilas', icon: '🎒' },
  { id: 'processing', label: 'Processamento', icon: '🧱' },
];

type EquipmentFilterEntry = {
  name?: string;
  slot_type?: string;
  weapon_type?: string;
  visual_key?: string;
  set_key?: string;
  rarity?: string;
};

const matchesEquipmentFilters = (
  entry: EquipmentFilterEntry,
  categoryFilter: string,
  weaponFilter: string,
  accessoryFilter: string,
  rarityFilter: string,
  searchQuery: string,
) => {
  if (categoryFilter !== 'all' && equipmentCategory(entry.slot_type) !== categoryFilter) return false;
  if (weaponFilter !== 'all' && (equipmentCategory(entry.slot_type) !== 'weapons' || !weaponSubcategoryMatches(entry, weaponFilter))) return false;
  if (accessoryFilter !== 'all' && (equipmentCategory(entry.slot_type) !== 'accessories' || !accessorySubcategoryMatches(entry, accessoryFilter))) return false;
  if (rarityFilter !== 'all' && canonicalRarityKey(entry.rarity) !== rarityFilter) return false;
  if (searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    if (!(entry.name || '').toLowerCase().includes(query)) return false;
  }
  return true;
};

function EquipmentFilterBar({
  categoryFilter,
  weaponFilter,
  accessoryFilter,
  rarityFilter,
  searchQuery,
  categoryCounts,
  weaponCounts,
  accessoryCounts,
  onCategoryChange,
  onWeaponChange,
  onAccessoryChange,
  onRarityChange,
  onSearchChange,
}: {
  categoryFilter: string;
  weaponFilter: string;
  accessoryFilter: string;
  rarityFilter: string;
  searchQuery: string;
  categoryCounts: Record<string, number>;
  weaponCounts: Record<string, number>;
  accessoryCounts: Record<string, number>;
  onCategoryChange: (value: string) => void;
  onWeaponChange: (value: string) => void;
  onAccessoryChange: (value: string) => void;
  onRarityChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}) {
  const hasActiveFilters = categoryFilter !== 'all' || weaponFilter !== 'all' || accessoryFilter !== 'all' || rarityFilter !== 'all' || searchQuery.trim().length > 0;
  const clearFilters = () => {
    onCategoryChange('all');
    onWeaponChange('all');
    onAccessoryChange('all');
    onRarityChange('all');
    onSearchChange('');
  };

  return (
    <div className="mb-3 flex w-full min-w-0 flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/80 p-2.5">
      <div className="flex w-full flex-wrap items-center gap-1.5">
        {EQUIPMENT_FILTER_CATEGORIES.map((category) => {
          const active = categoryFilter === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              className={`pixel-btn flex items-center gap-1 px-2 py-0.5 text-xs whitespace-nowrap ${active ? 'pixel-btn-gold font-bold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
              <span className={`rounded-full px-1 text-[9px] ${active ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-500'}`}>{categoryCounts[category.id] || 0}</span>
            </button>
          );
        })}
      </div>
      {categoryFilter === 'weapons' && (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-800 pt-2" aria-label="Subcategorias de armas">
          <span className="mr-1 text-[10px] text-slate-500">Tipos:</span>
          {WEAPON_SUBCATEGORIES.map((subcategory) => {
            const active = weaponFilter === subcategory.id;
            return (
              <button
                key={subcategory.id}
                type="button"
                onClick={() => onWeaponChange(subcategory.id)}
                className={`pixel-btn px-2 py-0.5 text-[10px] ${active ? 'pixel-btn-gold font-bold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}
              >
                {subcategory.label} ({weaponCounts[subcategory.id] || 0})
              </button>
            );
          })}
        </div>
      )}
      {categoryFilter === 'accessories' && (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-800 pt-2" aria-label="Subcategorias de acessórios">
          <span className="mr-1 text-[10px] text-slate-500">Tipos:</span>
          {ACCESSORY_SUBCATEGORIES.map((subcategory) => {
            const active = accessoryFilter === subcategory.id;
            return (
              <button
                key={subcategory.id}
                type="button"
                onClick={() => onAccessoryChange(subcategory.id)}
                className={`pixel-btn px-2 py-0.5 text-[10px] ${active ? 'pixel-btn-gold font-bold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}
              >
                {subcategory.label} ({accessoryCounts[subcategory.id] || 0})
              </button>
            );
          })}
        </div>
      )}
      <div className="flex w-full flex-wrap items-center gap-2 font-pixel-body sm:flex-nowrap">
        <div className="relative min-w-[160px] flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="🔍 Buscar equipamento..."
            className="w-full rounded border-2 border-slate-800 bg-slate-900/90 px-3 py-1 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
          {searchQuery && <button type="button" onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">✕</button>}
        </div>
        <select value={rarityFilter} onChange={(event) => onRarityChange(event.target.value)} className="shrink-0 rounded border-2 border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-200 focus:border-amber-400 focus:outline-none">
          <option value="all">✨ Todas raridades</option>
          {rarityKeys.map((rarity) => <option key={rarity} value={rarity}>💎 {rarityLabel[rarity]}</option>)}
        </select>
        {hasActiveFilters && <button type="button" onClick={clearFilters} className="pixel-btn pixel-btn-crimson shrink-0 px-2.5 py-1 text-xs">Limpar</button>}
      </div>
    </div>
  );
}

export const formatProfession = (key?: string) => professionLabels[key || ''] || key || 'Geral';
export const formatBuilding = (key?: string) => buildingLabels[key || ''] || key || 'Estrutura';
export const formatCatalyst = (key?: string) => catalystLabels[key || ''] || key || 'Nenhum';

function CraftedEquipmentTooltip({ recipe, item, children }: { recipe?: RecipeDefinition | null; item?: Item; children: ReactNode }) {
  const source = recipe || item;
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const tooltipWidth = 288;
    const tooltipHeight = 250;
    const gap = 10;
    const viewportPadding = 8;
    let left = rect.right + gap;
    if (left + tooltipWidth > window.innerWidth - viewportPadding) {
      left = rect.left - tooltipWidth - gap;
    }
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipWidth - viewportPadding));
    const top = Math.max(
      viewportPadding,
      Math.min(rect.top, window.innerHeight - tooltipHeight - viewportPadding),
    );
    setPosition({ left, top });
  };

  useEffect(() => {
    if (!visible) return undefined;
    const reposition = () => updatePosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [visible]);

  const handleMouseEnter = (_event: MouseEvent<HTMLDivElement>) => {
    if (!source || ('kind' in source && source.kind !== 'equipment')) return;
    updatePosition();
    setVisible(true);
  };

  if (!source || ('kind' in source && source.kind !== 'equipment')) return <>{children}</>;
  const isRecipe = 'kind' in source;
  const rarity = isRecipe
    ? source.minimum_rarity && source.maximum_rarity && source.minimum_rarity !== source.maximum_rarity
      ? `${source.minimum_rarity} a ${source.maximum_rarity}`
      : source.minimum_rarity || 'Raridade variável'
    : source.rarity || 'Raridade variável';
  const bagSlots = source.slot_type === 'bag' ? (isRecipe ? null : getBagSlotBonus(source.rarity)) : null;
  const bagRange = isRecipe && source.slot_type === 'bag' ? getBagSlotRange(source.minimum_rarity, source.maximum_rarity) : null;
  const attack = isRecipe ? source.base_atk || 0 : source.attack || source.physical_attack || 0;
  const magicAttack = isRecipe ? source.base_magic || 0 : source.magic_attack || 0;
  const defense = isRecipe ? source.base_def || 0 : source.defense || 0;
  const weight = isRecipe ? source.base_weight || 0 : source.weight || 0;
  const bonusStr = isRecipe ? source.base_str : source.bonus_str;
  const bonusDex = isRecipe ? source.base_dex : source.bonus_dex;
  const bonusInt = isRecipe ? source.base_int : source.bonus_int;
  const bonusHp = isRecipe ? source.base_hp : source.bonus_hp;
  const bonusMp = isRecipe ? source.base_mp : source.bonus_mp;
  const critChance = isRecipe ? source.crit_chance : source.crit_chance;
  const lifesteal = isRecipe ? source.lifesteal : source.lifesteal;
  const manaRegen = isRecipe ? source.mana_regen : source.mana_regen;
  const movementSpeed = isRecipe ? source.base_movement_speed_bonus : source.movement_speed_bonus;
  const requiredLevel = isRecipe ? source.required_level : source.required_level;
  const hands = isRecipe ? source.hands : source.hands;

  return (
    <div
      ref={anchorRef}
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="pointer-events-none fixed z-[100] flex w-72 flex-col gap-2 rounded-xl border-2 border-amber-500/80 bg-slate-950/95 p-3 text-left font-pixel-body shadow-2xl backdrop-blur-md"
          style={{ left: position.left, top: position.top }}
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
            <strong className="font-pixel-heading text-xs text-amber-300">{source.name}</strong>
            <span className="shrink-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] text-slate-300">{rarity}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <span className="text-rose-300">⚔️ Ataque: +{attack}</span>
            <span className="text-cyan-300">🔮 Magia: +{magicAttack}</span>
            <span className="text-sky-300">🛡️ Defesa: +{defense}</span>
            <span className="text-slate-300">⚖️ Peso: {weight.toFixed(1)} oz</span>
          </div>
          {bagRange && (
            <span className="text-emerald-300">🎒 Slots: +{bagRange.min === bagRange.max ? bagRange.min : `${bagRange.min} a +${bagRange.max}`}</span>
          )}
          {bagSlots !== null && (
            <span className="text-emerald-300">🎒 Slots: +{bagSlots}</span>
          )}
          <div className="flex flex-wrap gap-1 text-[9px]">
            {bonusStr ? <span className="rounded border border-amber-800/60 bg-amber-950/80 px-1 text-amber-300">+{bonusStr} STR</span> : null}
            {bonusDex ? <span className="rounded border border-emerald-800/60 bg-emerald-950/80 px-1 text-emerald-300">+{bonusDex} DEX</span> : null}
            {bonusInt ? <span className="rounded border border-sky-800/60 bg-sky-950/80 px-1 text-sky-300">+{bonusInt} INT</span> : null}
            {bonusHp ? <span className="rounded border border-rose-800/60 bg-rose-950/80 px-1 text-rose-300">+{bonusHp} HP</span> : null}
            {bonusMp ? <span className="rounded border border-blue-800/60 bg-blue-950/80 px-1 text-blue-300">+{bonusMp} MP</span> : null}
            {critChance ? <span className="rounded border border-purple-800/60 bg-purple-950/80 px-1 text-purple-300">+{critChance.toFixed(1)}% Crit</span> : null}
            {lifesteal ? <span className="rounded border border-red-800/60 bg-red-950/80 px-1 text-red-300">+{lifesteal.toFixed(1)}% Vampirismo</span> : null}
            {manaRegen ? <span className="rounded border border-cyan-800/60 bg-cyan-950/80 px-1 text-cyan-300">+{manaRegen} MP/s</span> : null}
            {movementSpeed ? <span className="rounded border border-emerald-800/60 bg-emerald-950/80 px-1 text-emerald-300">🥾 +{movementSpeed.toFixed(1)}% Movimento</span> : null}
          </div>
          <div className="border-t border-slate-800 pt-1 text-[9px] text-slate-400">
            Requer herói nível {requiredLevel || 1} · {hands === 2 ? 'Duas mãos' : hands === 1 ? 'Uma mão' : 'Equipamento'}
          </div>
          {!isRecipe && source.special_effect && (
            <div className="border-t border-slate-800 pt-1 text-[9px] italic text-purple-300">{source.special_effect}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ConsumableTooltip({ consumable, outputQuantity, children }: { consumable?: ConsumableDefinition; outputQuantity?: number; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const tooltipWidth = 300;
    const tooltipHeight = 190;
    const gap = 10;
    const padding = 8;
    let left = rect.right + gap;
    if (left + tooltipWidth > window.innerWidth - padding) left = rect.left - tooltipWidth - gap;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    const top = Math.max(padding, Math.min(rect.top, window.innerHeight - tooltipHeight - padding));
    setPosition({ left, top });
  };

  useEffect(() => {
    if (!visible) return undefined;
    const reposition = () => updatePosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [visible]);

  if (!consumable) return <>{children}</>;
  const effectLabel = consumable.effect_key === 'xp_gain_percent' ? 'XP de combate' : 'Ataque';
  const categoryLabel = consumable.category === 'meal' ? 'Refeição' : 'Poção';

  return (
    <div
      ref={anchorRef}
      className="relative w-full"
      onMouseEnter={() => { updatePosition(); setVisible(true); }}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="pointer-events-none fixed z-[100] flex w-[300px] flex-col gap-2 rounded-xl border-2 border-emerald-500/80 bg-slate-950/95 p-3 text-left font-pixel-body shadow-2xl backdrop-blur-md"
          style={{ left: position.left, top: position.top }}
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
            <strong className="font-pixel-heading text-xs text-emerald-300">{consumable.name}</strong>
            <span className="shrink-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] text-slate-300">{categoryLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <span className="text-emerald-300">✨ Bônus: +{consumable.magnitude}%</span>
            <span className="text-sky-300">📈 Efeito: {effectLabel}</span>
            <span className="text-amber-300">⏱️ Duração: {durationLabel(consumable.duration_seconds)}</span>
            {outputQuantity ? <span className="text-purple-300">📦 Produção: +{outputQuantity}</span> : null}
          </div>
          <p className="border-t border-slate-800 pt-1 text-[10px] leading-relaxed text-slate-300">{consumable.description}</p>
          <span className="border-t border-slate-800 pt-1 text-[9px] text-slate-500">Consumir substitui apenas o {consumable.category === 'meal' ? 'alimento' : 'tônico'} ativo da mesma categoria.</span>
        </div>
      )}
    </div>
  );
}

function ConsumableStationStatus({ kind, activeBuff, now }: { kind: 'meal' | 'potion'; activeBuff?: ActiveBuff; now: number }) {
  const isMeal = kind === 'meal';
  const icon = isMeal ? '🍳' : '🧪';
  const title = isMeal ? 'Cozinha de campanha' : 'Bancada de Alquimia';
  const description = isMeal
    ? 'Transforme pesca, caça, trigo e ervas em preparação para a próxima expedição.'
    : 'Destile poções para fortalecer o herói. A poção usa um espaço separado e não substitui a refeição ativa.';
  const activeLabel = isMeal ? 'REFEIÇÃO ATIVA' : 'POÇÃO ATIVA';
  const emptyLabel = isMeal ? 'Nenhuma refeição ativa.' : 'Nenhuma poção ativa.';
  const accentTitle = isMeal ? 'text-orange-300' : 'text-fuchsia-300';
  const badgeClass = isMeal
    ? 'border-orange-700/60 bg-orange-950/40 text-orange-200'
    : 'border-fuchsia-700/60 bg-fuchsia-950/40 text-fuchsia-200';
  const activeClass = isMeal
    ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-200'
    : 'border-fuchsia-700/60 bg-fuchsia-950/30 text-fuchsia-200';
  const timeClass = isMeal ? 'text-emerald-300/80' : 'text-fuchsia-300/80';
  const remaining = activeBuff ? durationLabel(Math.max(60, Math.ceil((new Date(activeBuff.expires_at).getTime() - now) / 1000))) : '';

  return (
    <>
      <div className="settlement-panel-header">
        <div>
          <h3 className={`settlement-panel-title ${accentTitle}`}>{icon} {title}</h3>
          <p className="settlement-panel-subtitle">{description}</p>
        </div>
        {activeBuff ? <span className={`rounded border px-2 py-1 text-[9px] font-pixel-heading ${badgeClass}`}>1 {activeLabel}</span> : null}
      </div>
      <div className={`settlement-choice flex min-h-11 items-center gap-2 px-3 py-2 text-xs ${activeBuff ? activeClass : 'text-slate-400'}`}>
        {activeBuff ? <PixelResourceSprite resourceKey={activeBuff.source_resource_key} name={activeBuff.source_name} size="sm" /> : <span className="text-base opacity-60">{isMeal ? '🍽️' : '🧴'}</span>}
        {activeBuff ? <div>
          <strong>{activeBuff.source_name}</strong> · +{activeBuff.magnitude}% {activeBuff.effect_key === 'xp_gain_percent' ? 'XP de combate' : 'Ataque'}<br />
          <span className={`text-[10px] ${timeClass}`}>restam {remaining}</span>
        </div> : <span>{emptyLabel}</span>}
      </div>
    </>
  );
}

export const formatBlockedReason = (reason?: string, resourceDefs?: Record<string, { name?: string }>) => {
  if (!reason) return '';
  let formatted = reason;
  Object.entries(buildingLabels).forEach(([key, name]) => {
    formatted = formatted.split(key).join(name);
  });
  Object.entries(professionLabels).forEach(([key, name]) => {
    formatted = formatted.split(key).join(name);
  });
  if (resourceDefs) {
    Object.entries(resourceDefs).forEach(([key, def]) => {
      if (def.name) {
        formatted = formatted.split(key).join(def.name);
      }
    });
  }
  return formatted;
};

export function EquipmentStatsCard({ recipe }: { recipe: RecipeDefinition }) {
  if (recipe.kind !== 'equipment') return null;
  return (
    <div className="settlement-panel bg-slate-950/80">
      <div className="border-b border-slate-800 pb-2 mb-2 font-pixel-body">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-pixel-heading text-slate-200 text-xs flex min-w-0 items-center gap-1.5">
            <span className="settlement-icon-frame h-8 w-8 rounded-md shrink-0">
              <PixelItemSprite name={recipe.name} slotType={recipe.slot_type} weaponType={recipe.weapon_type} templateKey={recipe.output_template_key} visualKey={recipe.visual_key} setKey={recipe.set_key} rarity={recipe.minimum_rarity} size="sm" />
            </span>
            <span className="truncate">{recipe.name || 'Equipamento'}</span>
            {recipe.hands === 2 && (
              <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 text-[9px] font-pixel-heading shrink-0">
                2 Mãos
              </span>
            )}
            {recipe.hands === 1 && (
              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 text-[9px] font-pixel-heading shrink-0">
                1 Mão
              </span>
            )}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-pixel-heading">
          <span
            title="Nível de Conhecimento da Comunidade necessário para liberar e fabricar esta receita. O nível individual do morador é usado apenas nas ordens automáticas."
            className="rounded border border-sky-700/70 bg-sky-950/60 px-2 py-1 text-sky-200"
          >
            📚 Conhecimento necessário: {formatProfession(recipe.profession_key)} · Nv. {recipe.required_profession_level || 1}
          </span>
          <span
            title="Nível do herói necessário para equipar este equipamento."
            className={`rounded border px-2 py-1 ${recipe.required_level && recipe.required_level > 1 ? 'border-amber-700/70 bg-amber-950/60 text-amber-200' : 'border-emerald-700/70 bg-emerald-950/60 text-emerald-200'}`}
          >
            🎯 Nível do herói: {recipe.required_level && recipe.required_level > 1 ? `${recipe.required_level} ou superior` : '1 ou superior'}
          </span>
        </div>
      </div>

      {/* Atributos Básicos de Combate */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-pixel-body mb-2">
        {recipe.base_atk !== undefined && recipe.base_atk > 0 && (
          <div className="settlement-choice p-1.5 rounded text-rose-400 font-bold flex justify-between bg-slate-900">
            <span>⚔️ Ataque:</span>
            <span className="font-pixel-heading">+{recipe.base_atk}</span>
          </div>
        )}
        {recipe.base_magic !== undefined && recipe.base_magic > 0 && (
          <div className="settlement-choice p-1.5 rounded text-cyan-300 font-bold flex justify-between bg-slate-900">
            <span>🔮 Magia:</span>
            <span className="font-pixel-heading">+{recipe.base_magic}</span>
          </div>
        )}
        {recipe.base_def !== undefined && recipe.base_def > 0 && (
          <div className="settlement-choice p-1.5 rounded text-sky-400 font-bold flex justify-between bg-slate-900">
            <span>🛡️ Defesa:</span>
            <span className="font-pixel-heading">+{recipe.base_def}</span>
          </div>
        )}
        {recipe.base_weight !== undefined && recipe.base_weight > 0 && (
          <div className="settlement-choice p-1.5 rounded text-slate-400 flex justify-between bg-slate-900">
            <span>⚖️ Peso:</span>
            <span className="font-pixel-heading">{recipe.base_weight.toFixed(1)} oz</span>
          </div>
        )}
        {recipe.slot_type === 'bag' && (() => {
          const range = getBagSlotRange(recipe.minimum_rarity, recipe.maximum_rarity);
          return (
            <div className="settlement-choice p-1.5 rounded text-emerald-300 font-bold flex justify-between bg-slate-900">
              <span>🎒 Slots:</span>
              <span className="font-pixel-heading">+{range.min === range.max ? range.min : `${range.min} a +${range.max}`}</span>
            </div>
          );
        })()}
      </div>

      {/* Bônus de Atributos Secundários */}
      <div className="flex flex-wrap gap-1.5 text-[10px] font-pixel-body">
        {recipe.base_str !== undefined && recipe.base_str > 0 && (
          <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
            💪 STR: +{recipe.base_str}
          </span>
        )}
        {recipe.base_dex !== undefined && recipe.base_dex > 0 && (
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
            🎯 DEX: +{recipe.base_dex}
          </span>
        )}
        {recipe.base_int !== undefined && recipe.base_int > 0 && (
          <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            🧠 INT: +{recipe.base_int}
          </span>
        )}
        {recipe.base_hp !== undefined && recipe.base_hp > 0 && (
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
            ❤️ HP: +{recipe.base_hp}
          </span>
        )}
        {recipe.base_mp !== undefined && recipe.base_mp > 0 && (
          <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
            💧 MP: +{recipe.base_mp}
          </span>
        )}
        {recipe.crit_chance !== undefined && recipe.crit_chance > 0 && (
          <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50">
            ⚡ Crítico: +{recipe.crit_chance.toFixed(1)}%
          </span>
        )}
        {recipe.lifesteal !== undefined && recipe.lifesteal > 0 && (
          <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
            🩸 Vampirismo: +{recipe.lifesteal.toFixed(1)}%
          </span>
        )}
        {recipe.mana_regen !== undefined && recipe.mana_regen > 0 && (
          <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            💧 Regen MP: +{recipe.mana_regen}/s
          </span>
        )}
        {recipe.base_movement_speed_bonus !== undefined && recipe.base_movement_speed_bonus > 0 && (
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
            🥾 Movimento: +{recipe.base_movement_speed_bonus.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function countdown(iso: string | undefined, now: number) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
  return seconds <= 0 ? 'pronto' : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function estimateGathering(expedition: GatheringExpeditionDefinition, duration: number, resources: Record<string, { storage_weight?: number }>) {
  const totalWeight = expedition.nodes.reduce((sum, node) => sum + node.weight, 0) || 1;
  const averageCycle = expedition.nodes.reduce((sum, node) => sum + node.cycle_seconds * node.weight / totalWeight, 0) || 60;
  const cycles = duration / averageCycle;
  let units = 0;
  let storage = 0;
  expedition.nodes.forEach((node) => node.rewards.forEach((reward) => {
    const expected = cycles * node.weight / totalWeight * reward.chance * (reward.min_quantity + reward.max_quantity) / 2;
    units += expected;
    storage += expected * (resources[reward.resource_key]?.storage_weight || 1);
  }));
  return { units: Math.max(1, Math.round(units)), storage: Math.max(1, Math.round(storage)) };
}

function estimateGatheringWage(duration: number, professionLevel: number, expeditionTier: number, settlement: EconomyState['settlement']) {
  const treasury = settlement?.treasury;
  if (!treasury?.payroll_unlocked) return 0;
  const levelBonus = Math.min(1, Math.max(0, professionLevel - 1) * 0.03);
  const tierBonus = Math.max(0, expeditionTier - 1) * 0.25;
  return Math.ceil(treasury.base_hourly_wage * duration / 3600 * (1 + levelBonus + tierBonus));
}

function residentSkill(resident: SettlementResident, skillKey: string) {
  return resident.skills.find((skill) => skill.skill_key === skillKey);
}

type GatheringEligibility = {
  eligible: SettlementResident[];
  selected?: SettlementResident;
  reason?: string;
};

function gatheringEligibility(
  residents: SettlementResident[],
  busyResidents: Set<string | undefined>,
  professionKey: string,
  requiredLevel: number,
  professionName: string,
): GatheringEligibility {
  const withProfession = residents.filter((resident) => residentSkill(resident, professionKey));
  if (!withProfession.length) {
    return { eligible: [], reason: `Nenhum morador possui a profissão ${professionName}.` };
  }

  const qualified = withProfession.filter((resident) => (residentSkill(resident, professionKey)?.level || 0) >= requiredLevel);
  if (!qualified.length) {
    const best = [...withProfession].sort((a, b) => (residentSkill(b, professionKey)?.level || 0) - (residentSkill(a, professionKey)?.level || 0))[0];
    const level = residentSkill(best, professionKey)?.level || 0;
    return { eligible: [], reason: `${best.name} é ${professionName} Nv. ${level}; esta ordem requer Nv. ${requiredLevel}.` };
  }

  const eligible = qualified
    .filter((resident) => resident.status === 'idle' && !busyResidents.has(resident.id))
    .sort((a, b) => (residentSkill(b, professionKey)?.level || 0) - (residentSkill(a, professionKey)?.level || 0));
  if (!eligible.length) {
    const occupied = qualified.map((resident) => resident.name).join(', ');
    return { eligible: [], reason: `${occupied} ${qualified.length === 1 ? 'está ocupado' : 'estão ocupados'} no momento.` };
  }

  return { eligible, selected: eligible[0] };
}

function gatheringRewardLabel(reward: GatheringExpeditionDefinition['nodes'][number]['rewards'][number], resources: WorkProps['resourceDefinitions']) {
  const definition = resources[reward.resource_key];
  const quantity = reward.min_quantity === reward.max_quantity ? `${reward.min_quantity}` : `${reward.min_quantity}–${reward.max_quantity}`;
  const chance = reward.chance >= 1 ? 'garantido' : `${Math.round(reward.chance * 100)}%`;
  return { definition, quantity, chance };
}

type ProfessionRecipeStats = {
  total: number;
  discovered: number;
  requiredLevels: number[];
};

function buildProfessionRecipeStats(recipes: RecipeDefinition[], unlocked: Set<string>): Record<string, ProfessionRecipeStats> {
  return recipes.reduce<Record<string, ProfessionRecipeStats>>((stats, recipe) => {
    const current = stats[recipe.profession_key] || { total: 0, discovered: 0, requiredLevels: [] };
    current.total += 1;
    if (unlocked.has(recipe.key)) current.discovered += 1;
    current.requiredLevels.push(recipe.required_profession_level || 1);
    stats[recipe.profession_key] = current;
    return stats;
  }, {});
}

function pendingSourceLabel(sourceKind: string) {
  switch (sourceKind) {
    case 'offline_monster_drop': return 'Expedição de combate offline';
    case 'monster_drop': return 'Caçada de monstros';
    case 'gathering_claim': return 'Expedição de coleta';
    case 'crafting': return 'Produção da oficina';
    case 'pending_retry': return 'Carga antiga preservada';
    default: return sourceKind.replace(/_/g, ' ');
  }
}

export function EconomyHubModal(props: Props) {
  const [tab, setTab] = useState<Tab>('work');
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState('');
  const [craftCategory, setCraftCategory] = useState('all');
  const [craftWeaponFilter, setCraftWeaponFilter] = useState('all');
  const [craftAccessoryFilter, setCraftAccessoryFilter] = useState('all');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDefinition | null>(null);
  const [catalyst, setCatalyst] = useState('');
  const [desireRecipe, setDesireRecipe] = useState('');
  const [desireKindFilter, setDesireKindFilter] = useState<'equipment' | 'processing' | 'food' | 'alchemy'>('equipment');
  const [desireCategoryFilter, setDesireCategoryFilter] = useState('all');
  const [desireWeaponFilter, setDesireWeaponFilter] = useState('all');
  const [desireAccessoryFilter, setDesireAccessoryFilter] = useState('all');
  const [desireRarityFilter, setDesireRarityFilter] = useState('all');
  const [desireSearch, setDesireSearch] = useState('');
  const [targetRarity, setTargetRarity] = useState('uncommon');
  const [desireCatalyst, setDesireCatalyst] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [priority, setPriority] = useState(50);

  useEffect(() => {
    if (!props.isOpen) return;
    props.onSync();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const syncTimer = window.setInterval(() => props.onSync(), 5000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(syncTimer);
    };
  }, [props.isOpen]);

  const settlement = props.economy?.settlement;
  const residents = settlement?.residents || [];
  const activities = props.economy?.active_gatherings || (props.economy?.active_gathering ? [props.economy.active_gathering] : []);
  const professionByKey = useMemo(() => Object.fromEntries((props.economy?.professions || []).map((p) => [p.profession_key, p])), [props.economy]);
  const resourcesByKey = useMemo(() => Object.fromEntries(props.resources.map((r) => [r.key, r.quantity])), [props.resources]);
  const resourceDefinitions = useMemo(() => Object.fromEntries(props.catalog.resources.map((r) => [r.key, r])), [props.catalog.resources]);
  const recipesByKey = useMemo(() => Object.fromEntries(props.catalog.recipes.map((r) => [r.key, r])), [props.catalog.recipes]);
  const consumablesByResourceKey = useMemo(() => Object.fromEntries(props.catalog.consumables.map((c) => [c.resource_key, c])), [props.catalog.consumables]);
  const unlocked = useMemo(() => new Set(props.economy?.unlocked_recipes || []), [props.economy]);
  const professionRecipeStats = useMemo(() => buildProfessionRecipeStats(props.catalog.recipes, unlocked), [props.catalog.recipes, unlocked]);
  const cookingRecipes = useMemo(() => props.catalog.recipes.filter((recipe) => recipe.kind === 'consumable' && recipe.station_key === 'kitchen' && unlocked.has(recipe.key)), [props.catalog.recipes, unlocked]);
  const alchemyRecipes = useMemo(() => props.catalog.recipes.filter((recipe) => recipe.kind === 'consumable' && recipe.station_key === 'alchemy_bench' && unlocked.has(recipe.key)), [props.catalog.recipes, unlocked]);
  const activeMeal = (props.economy?.active_buffs || []).find((buff) => buff.category === 'meal' && new Date(buff.expires_at).getTime() > now);
  const activePotion = (props.economy?.active_buffs || []).find((buff) => buff.category === 'potion' && new Date(buff.expires_at).getTime() > now);

  const recipes = useMemo(() => {
    return props.catalog.recipes.filter((recipe) => {
      if (!unlocked.has(recipe.key)) return false;
      // Oficina Manual não fabrica consumíveis nem receitas pertencentes a estações especializadas.
      if (recipe.kind === 'consumable' || recipe.station_key === 'kitchen' || recipe.station_key === 'alchemy_bench') return false;
      if (search && !recipe.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (craftCategory === 'all') return true;
      if (craftCategory === 'processing') return recipe.kind === 'processing';
      if (craftCategory === 'weapons') return recipe.kind === 'equipment' && recipe.slot_type === 'mainhand' && weaponSubcategoryMatches(recipe, craftWeaponFilter);
      if (craftCategory === 'shields') return recipe.kind === 'equipment' && recipe.slot_type === 'offhand';
      if (craftCategory === 'helmets') return recipe.kind === 'equipment' && recipe.slot_type === 'head';
      if (craftCategory === 'armors') return recipe.kind === 'equipment' && recipe.slot_type === 'chest';
      if (craftCategory === 'legs') return recipe.kind === 'equipment' && recipe.slot_type === 'legs';
      if (craftCategory === 'boots') return recipe.kind === 'equipment' && recipe.slot_type === 'boots';
      if (craftCategory === 'accessories') return recipe.kind === 'equipment' && (recipe.slot_type === 'necklace' || recipe.slot_type === 'ring' || recipe.slot_type === 'ammo') && accessorySubcategoryMatches(recipe, craftAccessoryFilter);
      if (craftCategory === 'bags') return recipe.kind === 'equipment' && recipe.slot_type === 'bag';
      return true;
    });
  }, [props.catalog.recipes, unlocked, search, craftCategory, craftWeaponFilter, craftAccessoryFilter]);

  const equipmentRecipes = props.catalog.recipes.filter((recipe) => unlocked.has(recipe.key) && recipe.kind === 'equipment');
  const ambitionRecipes = props.catalog.recipes.filter((recipe) => unlocked.has(recipe.key));
  const desireCategoryCounts = useMemo(() => equipmentRecipes.reduce<Record<string, number>>((counts, recipe) => {
    const category = equipmentCategory(recipe.slot_type);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, { all: equipmentRecipes.length }), [equipmentRecipes]);
  const desireWeaponCounts = useMemo(() => equipmentRecipes.reduce<Record<string, number>>((counts, recipe) => {
    if (equipmentCategory(recipe.slot_type) !== 'weapons') return counts;
    WEAPON_SUBCATEGORIES.forEach(({ id }) => {
      if (weaponSubcategoryMatches(recipe, id)) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, {}), [equipmentRecipes]);
  const desireAccessoryCounts = useMemo(() => equipmentRecipes.reduce<Record<string, number>>((counts, recipe) => {
    if (equipmentCategory(recipe.slot_type) !== 'accessories') return counts;
    ACCESSORY_SUBCATEGORIES.forEach(({ id }) => {
      if (accessorySubcategoryMatches(recipe, id)) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, {}), [equipmentRecipes]);
  const filteredEquipmentRecipes = useMemo(() => equipmentRecipes.filter((recipe) => {
    if (!matchesEquipmentFilters({ ...recipe, rarity: undefined }, desireCategoryFilter, desireWeaponFilter, desireAccessoryFilter, 'all', desireSearch)) return false;
    if (desireRarityFilter === 'all') return true;
    const rarityIndex = rarityKeys.indexOf(desireRarityFilter as typeof rarityKeys[number]);
    const minimumIndex = Math.max(0, rarityKeys.indexOf(canonicalRarityKey(recipe.minimum_rarity) as typeof rarityKeys[number]));
    const maximumIndexValue = rarityKeys.indexOf(canonicalRarityKey(recipe.maximum_rarity) as typeof rarityKeys[number]);
    const maximumIndex = maximumIndexValue >= 0 ? maximumIndexValue : rarityKeys.length - 1;
    return rarityIndex >= minimumIndex && rarityIndex <= maximumIndex;
  }), [equipmentRecipes, desireCategoryFilter, desireWeaponFilter, desireRarityFilter, desireSearch]);
  const filteredAmbitionRecipes = useMemo(() => {
    if (desireKindFilter === 'equipment') return filteredEquipmentRecipes;
    return ambitionRecipes.filter((recipe) => {
      if (desireKindFilter === 'processing') return recipe.kind === 'processing';
      if (desireKindFilter === 'food') return recipe.kind === 'consumable' && recipe.station_key === 'kitchen';
      return recipe.kind === 'consumable' && recipe.station_key === 'alchemy_bench';
    }).filter((recipe) => !desireSearch || recipe.name.toLowerCase().includes(desireSearch.toLowerCase()));
  }, [ambitionRecipes, desireKindFilter, desireSearch, filteredEquipmentRecipes]);
  const selectedDesireRecipe = ambitionRecipes.find((recipe) => recipe.key === desireRecipe);
  const isEquipmentDesire = selectedDesireRecipe?.kind === 'equipment';
  const allowedDesireRarities = raritiesForRecipe(selectedDesireRecipe);
  const busyResidents = useMemo(() => new Set(activities.filter((activity) => activity.state === 'running' || activity.state === 'claimable').map((activity) => activity.resident_id).filter(Boolean)), [activities]);
  const nextResidentProsperity = settlement?.next_resident_prosperity || 0;
  const prosperityProgress = nextResidentProsperity > 0 ? Math.min(100, (settlement?.prosperity || 0) * 100 / nextResidentProsperity) : 100;
  const effectiveCapacity = Math.max(settlement?.population || 0, settlement?.population_capacity || 0);

  useEffect(() => {
    if (!allowedDesireRarities.length || allowedDesireRarities.includes(targetRarity)) return;
    setTargetRarity(allowedDesireRarities.includes('uncommon') ? 'uncommon' : allowedDesireRarities[0]);
  }, [desireRecipe, allowedDesireRarities.join('|'), targetRarity]);

  if (!props.isOpen) return null;

  const selectRecipe = (recipe: RecipeDefinition) => {
    setSelectedRecipe(recipe);
    setCatalyst('');
    props.onPreviewCraft(recipe.key, '');
  };
  const selectCatalyst = (value: string) => {
    setCatalyst(value);
    if (selectedRecipe) props.onPreviewCraft(selectedRecipe.key, value);
  };
  const consumeFood = (resourceKey: string, foodName: string, category: 'meal' | 'potion' = 'meal') => {
    const activeBuff = category === 'potion' ? activePotion : activeMeal;
    if (activeBuff) {
      const remainingMinutes = Math.max(1, Math.ceil((new Date(activeBuff.expires_at).getTime() - now) / 60000));
      const label = category === 'potion' ? 'poção' : 'refeição';
      if (!window.confirm(`${activeBuff.source_name} ainda está ativo por aproximadamente ${remainingMinutes} min. Consumir ${foodName} substituirá a ${label} atual. Continuar?`)) return;
    }
    props.onConsumeFood(resourceKey);
  };

  const tabs: Array<[Tab, string]> = [
    ['work', '🧑‍🌾 Ordens de Trabalho'], ['treasury', '🏦 Tesouraria & Folha'], ['ambitions', '⭐ Ambições & Arsenal'],
    ['kitchen', '🍳 Cozinha'], ['alchemy', '🧪 Alquimia'], ['crafting', '⚒️ Oficina Manual'], ['residents', '🏘️ Moradores'],
  ];

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md font-pixel-body sm:p-4">
    <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl pixel-card-gold shadow-2xl">
      <header className="pixel-card-header pixel-card-header-gold flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="font-pixel-heading text-sm sm:text-base text-amber-400">🏘️ {settlement?.name || 'Assentamento do Aventureiro'}</h2>
          <p className="text-xs text-slate-400">O herói combate e decide o crescimento. Moradores coletam e produzem em nome da comunidade.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {settlement && (
            <div className="flex flex-wrap items-center justify-end gap-1.5 font-pixel-body">
              <span
                className="settlement-choice cursor-help px-2.5 py-1.5 text-[10px] text-sky-300 border-sky-500/40 bg-sky-950/40 sm:text-xs"
                title={`👥 População: ${settlement.population} moradores de ${effectiveCapacity} vagas.`}
              >
                👥 Moradores: {settlement.population}/{effectiveCapacity}
              </span>
              <span
                className="settlement-choice cursor-help px-2.5 py-1.5 text-[10px] text-amber-300 border-amber-500/40 bg-amber-950/40 sm:text-xs"
                title="✨ Prosperidade permanente da comunidade."
              >
                ✨ Prosperidade: {settlement.prosperity}
              </span>
              <span
                className="settlement-choice cursor-help px-2.5 py-1.5 text-[10px] text-emerald-300 border-emerald-500/40 bg-emerald-950/40 sm:text-xs"
                title="Ouro disponível para salários e futuras despesas produtivas. Valores reservados já foram separados."
              >
                🏦 Caixa: {settlement.treasury?.balance || 0}
              </span>
            </div>
          )}
          <button onClick={props.onClose} className="pixel-btn pixel-btn-crimson px-3 py-1 text-xs">✕</button>
        </div>
      </header>
      <nav className="grid grid-cols-2 gap-1.5 border-b border-slate-800 bg-slate-950/80 p-2 font-pixel-heading text-xs sm:grid-cols-3 lg:grid-cols-7" aria-label="Seções do assentamento">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-selected={tab === key}
            className={`min-h-10 rounded py-2 text-[10px] leading-tight transition sm:text-xs ${
              tab === key
                ? 'pixel-btn pixel-btn-gold text-slate-950 font-bold'
                : 'pixel-btn pixel-btn-dark text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <main className="space-y-5 overflow-y-auto p-3 sm:p-5">
        {!props.economy && <section className="settlement-panel pixel-alert-frame pixel-alert-info text-xs text-sky-200">Sincronizando assentamento… <button onClick={props.onSync} className="pixel-btn pixel-btn-dark ml-2 px-2 py-1 text-[10px]">Tentar novamente</button></section>}

        {tab === 'work' && props.economy && <WorkOrders
          {...props} activities={activities} residents={residents} now={now}
          professionByKey={professionByKey} resourceDefinitions={resourceDefinitions} busyResidents={busyResidents}
          onOpenTreasury={() => setTab('treasury')}
        />}

        {tab === 'treasury' && props.economy && <TreasuryPanel
          settlement={settlement}
          characterGold={props.characterGold}
          onTransfer={props.onTransferTreasuryGold}
          onUpdatePolicy={props.onUpdateTreasuryPolicy}
        />}

        {tab === 'ambitions' && props.economy && <div className="space-y-5">
          <section className="settlement-panel settlement-panel-arcane">
            <div className="settlement-panel-header">
              <div className="flex items-start gap-3">
                <div className="settlement-icon-frame border-fuchsia-400/50 bg-fuchsia-950/40 text-xl">⭐</div>
                <div>
                <h3 className="settlement-panel-title text-fuchsia-300">Desejo do Herói</h3>
                <p className="settlement-panel-subtitle">Defina um equipamento ou uma receita de produção. A comunidade trabalha em segundo plano, desenvolvendo a profissão do morador e o conhecimento coletivo.</p>
                </div>
              </div>
              <span className="shrink-0 rounded border border-fuchsia-400/40 bg-fuchsia-950/50 px-2 py-1 text-[9px] font-pixel-heading text-fuchsia-200">PRODUÇÃO AUTOMÁTICA</span>
            </div>
            <div className="grid gap-2 text-[10px] text-fuchsia-100/75 sm:grid-cols-3">
              <div className="settlement-choice border-fuchsia-800/50 bg-slate-950/35 px-2.5 py-2">✓ Equipamentos vão para mochila/Arsenal.</div>
              <div className="settlement-choice border-fuchsia-800/50 bg-slate-950/35 px-2.5 py-2">✓ Alimentos e recursos vão para o Depósito.</div>
              <div className="settlement-choice border-fuchsia-800/50 bg-slate-950/35 px-2.5 py-2">✓ Cada execução concede XP ao trabalhador.</div>
            </div>
          </section>

          <section className="settlement-panel">
            <div className="settlement-panel-header">
              <div>
                <h3 className="settlement-panel-title">⚙️ Configurar nova ambição</h3>
                <p className="settlement-panel-subtitle">Os materiais só são consumidos quando um artesão livre iniciar uma tentativa.</p>
              </div>
              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[9px] font-pixel-heading text-slate-400">ETAPA 1 · DEFINIÇÃO</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div title="Escolhe qual receita os artesãos tentarão produzir. Somente receitas já descobertas aparecem aqui." className="settlement-field-label">
                <span>Receita desejada ⓘ</span>
                <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {([
                    ['equipment', '⚔️ Equipamentos'],
                    ['processing', '🧱 Processamento'],
                    ['food', '🍳 Cozinha'],
                    ['alchemy', '🧪 Alquimia'],
                  ] as const).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => { setDesireKindFilter(kind); setDesireRecipe(''); setDesireCatalyst(''); }}
                      className={`pixel-btn px-2 py-1.5 text-[10px] ${desireKindFilter === kind ? 'pixel-btn-gold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {desireKindFilter === 'equipment' ? (
                  <EquipmentFilterBar
                    categoryFilter={desireCategoryFilter}
                    weaponFilter={desireWeaponFilter}
                    accessoryFilter={desireAccessoryFilter}
                    rarityFilter={desireRarityFilter}
                    searchQuery={desireSearch}
                    categoryCounts={desireCategoryCounts}
                    weaponCounts={desireWeaponCounts}
                    accessoryCounts={desireAccessoryCounts}
                    onCategoryChange={(value) => { setDesireCategoryFilter(value); if (value !== 'weapons') setDesireWeaponFilter('all'); if (value !== 'accessories') setDesireAccessoryFilter('all'); }}
                    onWeaponChange={setDesireWeaponFilter}
                    onAccessoryChange={setDesireAccessoryFilter}
                    onRarityChange={setDesireRarityFilter}
                    onSearchChange={setDesireSearch}
                  />
                ) : (
                  <input value={desireSearch} onChange={(e) => setDesireSearch(e.target.value)} placeholder="🔎 Buscar receita..." className="settlement-control mb-2" />
                )}
                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {filteredAmbitionRecipes.map((recipe) => (
                    <ConsumableTooltip
                      key={recipe.key}
                      consumable={recipe.kind === 'consumable' ? consumablesByResourceKey[recipe.output_resource_key || ''] : undefined}
                      outputQuantity={recipe.output_quantity}
                    >
                      <CraftedEquipmentTooltip recipe={recipe}>
                        <button
                          type="button"
                          onClick={() => setDesireRecipe(recipe.key)}
                          className={`settlement-choice flex w-full items-center justify-between gap-2 p-2 text-left ${desireRecipe === recipe.key ? 'settlement-choice-selected border-fuchsia-400/80' : ''}`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="settlement-icon-frame h-8 w-8 shrink-0 rounded-md">
                              {recipe.kind === 'equipment' ? (
                                <PixelItemSprite name={recipe.name} slotType={recipe.slot_type} weaponType={recipe.weapon_type} templateKey={recipe.output_template_key} visualKey={recipe.visual_key} setKey={recipe.set_key} rarity={recipe.minimum_rarity} size="sm" />
                              ) : (
                                <PixelResourceSprite resourceKey={recipe.output_resource_key || ''} name={recipe.name} size="sm" />
                              )}
                            </span>
                            <span className="min-w-0">
                              <strong className="block truncate text-xs font-pixel-heading text-slate-100">{recipe.name}</strong>
                              <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                                {formatProfession(recipe.profession_key)} Nv. {recipe.required_profession_level} · Tier {recipe.tier} · {recipe.kind === 'equipment' ? 'equipamento' : `produz ${recipe.output_quantity || 0}`}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-[9px] text-slate-500">
                            <span className="block">{recipe.kind === 'equipment' ? rarityLabel[canonicalRarityKey(recipe.minimum_rarity)] : `+${recipe.output_quantity || 0}`}</span>
                            <span className="block text-amber-300">{recipe.gold_cost}g</span>
                          </span>
                        </button>
                      </CraftedEquipmentTooltip>
                    </ConsumableTooltip>
                  ))}
                  {filteredAmbitionRecipes.length === 0 && (
                    <p className="settlement-empty py-5 text-center text-[10px]">Nenhuma receita encontrada.</p>
                  )}
                </div>
                <span className="mt-1 block text-[9px] font-normal text-slate-500">{filteredAmbitionRecipes.length} receita(s) encontrada(s).</span>
              </div>
              <div className="space-y-3">
                {selectedDesireRecipe && (
                  <DesireRecipeDetails recipe={selectedDesireRecipe} resources={resourcesByKey} definitions={resourceDefinitions} />
                )}
                <div className="grid gap-3 sm:grid-cols-2">
              {isEquipmentDesire && <label title="É a qualidade mínima que encerra a Ambição. Itens abaixo dela vão para o Arsenal e contam como uma tentativa." className="settlement-field-label">
                Raridade mínima ⓘ
                <select value={targetRarity} disabled={!desireRecipe} onChange={(e) => setTargetRarity(e.target.value)} className="settlement-control">
                  {allowedDesireRarities.map((rarity) => <option key={rarity} value={rarity}>{rarityLabel[rarity]}</option>)}
                </select>
                {selectedDesireRecipe && <span className="mt-1 block text-[9px] font-normal text-slate-500">Faixa: {rarityLabel[canonicalRarityKey(selectedDesireRecipe.minimum_rarity)]} → {rarityLabel[canonicalRarityKey(selectedDesireRecipe.maximum_rarity)]}</span>}
              </label>}
              <label title="Número máximo de itens que poderão ser produzidos tentando alcançar a raridade mínima." className="settlement-field-label">
                {isEquipmentDesire ? 'Tentativas' : 'Execuções'} ⓘ
                <input type="number" min={1} max={20} value={maxAttempts} onChange={(e) => setMaxAttempts(Math.max(1, Math.min(20, Number(e.target.value))))} className="settlement-control" />
              </label>
              <label title="Define a ordem da fila. Números maiores são atendidos primeiro." className="settlement-field-label">
                Prioridade ⓘ
                <input type="number" min={1} max={100} value={priority} onChange={(e) => setPriority(Math.max(1, Math.min(100, Number(e.target.value))))} className="settlement-control" />
                <span className="mt-1 block text-[9px] font-normal text-slate-500">100 vem antes de 50.</span>
              </label>
              {isEquipmentDesire && <label title="Recurso opcional consumido em cada tentativa. Redistribui as chances para raridades melhores, sem garantir a meta." className="settlement-field-label sm:col-span-2">
                Catalisador ⓘ
                <select value={desireCatalyst} onChange={(e) => setDesireCatalyst(e.target.value)} className="settlement-control">
                  <option value="">Sem catalisador</option>
                  <option value="quality_dust">Pó de Qualidade · Raro</option>
                  <option value="prismatic_core">Núcleo Prismático · Épico</option>
                </select>
                {desireCatalyst && <span className="mt-1 block text-[9px] font-normal leading-relaxed text-slate-400">{catalystPurpose[desireCatalyst]}</span>}
              </label>}
              <button title="Cria uma ordem automática e autoriza a produção." disabled={!desireRecipe} onClick={() => props.onCreateHeroDesire(desireRecipe, targetRarity, desireCatalyst, maxAttempts, priority)} className="pixel-btn pixel-btn-purple min-h-10 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-30 sm:col-span-2">
                ⭐ Registrar ambição e autorizar produção
              </button>
                </div>
              </div>
            </div>

          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <DesireQueue
              settlement={settlement}
              now={now}
              resources={resourceDefinitions}
              recipesByKey={recipesByKey}
              currentResourceBalances={resourcesByKey}
              characterGold={props.characterGold}
              onCancel={props.onCancelHeroDesire}
            />
            <Armory settlement={settlement} onClaim={props.onClaimArmoryItem}/>
          </div>
        </div>}

        {tab === 'kitchen' && props.economy && <div className="space-y-4">
          <section className="settlement-panel settlement-panel-accent">
            <ConsumableStationStatus kind="meal" activeBuff={activeMeal} now={now} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="settlement-panel">
              <div className="settlement-panel-header"><div><h4 className="settlement-panel-title text-slate-200">🍲 Receitas da cozinha</h4><p className="settlement-panel-subtitle">Selecione uma preparação para consultar custos e produzir.</p></div></div>
              <div className="space-y-2">
              {cookingRecipes.map((recipe) => <ConsumableTooltip key={recipe.key} consumable={consumablesByResourceKey[recipe.output_resource_key || '']} outputQuantity={recipe.output_quantity}>
                <button onClick={() => selectRecipe(recipe)} className={`settlement-choice w-full p-3 text-left ${selectedRecipe?.key === recipe.key ? 'settlement-choice-selected border-orange-400' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="settlement-icon-frame"><PixelResourceSprite resourceKey={recipe.output_resource_key} name={recipe.name} size="lg"/></span>
                    <div className="min-w-0 flex-1"><strong className="font-pixel-heading text-xs text-slate-100">{recipe.name}</strong><p className="mt-1 text-[10px] text-slate-400">Cozinheiro Nv. {recipe.required_profession_level} · Cozinha Nv. {recipe.required_station_level || 1} · {recipe.gold_cost}g</p></div>
                  </div>
                </button>
              </ConsumableTooltip>)}
              {!cookingRecipes.length && <p className="settlement-empty">Nenhuma receita culinária descoberta.</p>}
              </div>
            </section>
            <ManualCraft recipe={selectedRecipe?.station_key === 'kitchen' ? selectedRecipe : null} preview={props.craftPreview} batchResult={props.craftBatchResult} resources={resourcesByKey} definitions={resourceDefinitions} catalyst="" characterGold={props.characterGold} communityProfession={selectedRecipe ? professionByKey[selectedRecipe.profession_key] : undefined} onCatalyst={() => {}} onCraft={props.onCraft}/>
          </div>

          <section className="settlement-panel">
            <div className="settlement-panel-header"><div><h4 className="settlement-panel-title text-slate-200">🧺 Despensa</h4><p className="settlement-panel-subtitle">Consumíveis disponíveis para preparar o próximo turno.</p></div></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {props.catalog.consumables.filter((food) => food.category === 'meal').map((food) => { const qty = resourcesByKey[food.resource_key] || 0; return <ConsumableTooltip key={food.resource_key} consumable={food}>
                <div className="settlement-choice p-3">
                  <div className="flex gap-2"><span className="settlement-icon-frame h-9 w-9 rounded-md"><PixelResourceSprite resourceKey={food.resource_key} name={food.name} size="md"/></span><div><strong className="text-xs text-slate-100">{food.name} ×{qty}</strong><p className="text-[10px] text-orange-300">+{food.magnitude}% {food.effect_key === 'xp_gain_percent' ? 'XP' : 'Ataque'} · {durationLabel(food.duration_seconds)}</p></div></div>
                  <p className="mt-2 min-h-[32px] text-[10px] leading-relaxed text-slate-400">{food.description}</p>
                  <button disabled={qty <= 0} onClick={() => consumeFood(food.resource_key, food.name)} className="mt-2 w-full pixel-btn pixel-btn-gold px-2 py-1.5 text-[10px] text-slate-950 disabled:opacity-30">Consumir</button>
                </div>
              </ConsumableTooltip>; })}
            </div>
          </section>
        </div>}

        {tab === 'alchemy' && props.economy && <div className="space-y-4">
          <section className="settlement-panel settlement-panel-arcane">
            <ConsumableStationStatus kind="potion" activeBuff={activePotion} now={now} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="settlement-panel">
              <div className="settlement-panel-header"><div><h4 className="settlement-panel-title text-slate-200">🧪 Receitas de alquimia</h4><p className="settlement-panel-subtitle">As receitas básicas começam no Alquimista Nv. 1 e na Bancada Nv. 1.</p></div></div>
              <div className="space-y-2">
                {alchemyRecipes.map((recipe) => <ConsumableTooltip key={recipe.key} consumable={consumablesByResourceKey[recipe.output_resource_key || '']} outputQuantity={recipe.output_quantity}>
                  <button onClick={() => selectRecipe(recipe)} className={`settlement-choice w-full p-3 text-left ${selectedRecipe?.key === recipe.key ? 'settlement-choice-selected border-fuchsia-400' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="settlement-icon-frame"><PixelResourceSprite resourceKey={recipe.output_resource_key} name={recipe.name} size="lg"/></span>
                      <div className="min-w-0 flex-1"><strong className="font-pixel-heading text-xs text-slate-100">{recipe.name}</strong><p className="mt-1 text-[10px] text-slate-400">Conhecimento de Alquimista Nv. {recipe.required_profession_level} · Bancada Nv. {recipe.required_station_level || 1} · {recipe.gold_cost}g</p></div>
                    </div>
                  </button>
                </ConsumableTooltip>)}
                {!alchemyRecipes.length && <p className="settlement-empty">Nenhuma receita de alquimia descoberta.</p>}
              </div>
            </section>
            <ManualCraft recipe={selectedRecipe?.station_key === 'alchemy_bench' ? selectedRecipe : null} preview={props.craftPreview} batchResult={props.craftBatchResult} resources={resourcesByKey} definitions={resourceDefinitions} catalyst="" characterGold={props.characterGold} communityProfession={selectedRecipe ? professionByKey[selectedRecipe.profession_key] : undefined} onCatalyst={() => {}} onCraft={props.onCraft}/>
          </div>

          <section className="settlement-panel">
            <div className="settlement-panel-header"><div><h4 className="settlement-panel-title text-slate-200">🧴 Poções disponíveis</h4><p className="settlement-panel-subtitle">Use uma poção para substituir apenas a poção ativa, mantendo a refeição separada.</p></div></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {props.catalog.consumables.filter((potion) => potion.category === 'potion').map((potion) => { const qty = resourcesByKey[potion.resource_key] || 0; return <ConsumableTooltip key={potion.resource_key} consumable={potion}>
                <div className="settlement-choice p-3">
                  <div className="flex gap-2"><span className="settlement-icon-frame h-9 w-9 rounded-md"><PixelResourceSprite resourceKey={potion.resource_key} name={potion.name} size="md"/></span><div><strong className="text-xs text-slate-100">{potion.name} ×{qty}</strong><p className="text-[10px] text-fuchsia-300">+{potion.magnitude}% {potion.effect_key === 'xp_gain_percent' ? 'XP' : 'Ataque'} · {durationLabel(potion.duration_seconds)}</p></div></div>
                  <p className="mt-2 min-h-[32px] text-[10px] leading-relaxed text-slate-400">{potion.description}</p>
                  <button disabled={qty <= 0} onClick={() => consumeFood(potion.resource_key, potion.name, 'potion')} className="mt-2 w-full pixel-btn pixel-btn-purple px-2 py-1.5 text-[10px] text-slate-950 disabled:opacity-30">Usar poção</button>
                </div>
              </ConsumableTooltip>; })}
            </div>
          </section>
        </div>}

        {tab === 'crafting' && props.economy && <div className="grid gap-4 lg:grid-cols-2">
          <section className="settlement-panel">
            <div className="settlement-panel-header">
              <div>
                <h3 className="settlement-panel-title text-amber-300">⚒️ Oficina Manual</h3>
                <p className="settlement-panel-subtitle">Equipamentos e processamentos são feitos aqui. Para preparar consumíveis, acesse a estação correspondente.</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button type="button" onClick={() => setTab('kitchen')} className="pixel-btn pixel-btn-dark px-2 py-1 text-[10px] text-orange-300">🍳 Abrir Cozinha</button>
                <button type="button" onClick={() => setTab('alchemy')} className="pixel-btn pixel-btn-dark px-2 py-1 text-[10px] text-fuchsia-300">🧪 Abrir Alquimia</button>
              </div>
            </div>
            {(props.economy.pending_craft_items?.length || 0) > 0 && (
              <div className="settlement-panel settlement-panel-accent mb-3 p-3">
                <p className="mb-2 text-xs font-bold text-amber-300">📦 Produção manual em carga segura</p>
                {props.economy.pending_craft_items!.map((item) => (
                  <button key={item.id} onClick={() => props.onClaimPendingCraft(item.id)} className="pixel-btn pixel-btn-gold mr-2 px-2 py-1 text-[10px]">
                    Resgatar {item.name}{item.slot_type === 'bag' ? ` · +${getBagSlotBonus(item.rarity)} slots` : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Filtros de Categoria */}
            <div className="mb-2.5 flex flex-wrap gap-1">
              {CRAFT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCraftCategory(cat.id); if (cat.id !== 'weapons') setCraftWeaponFilter('all'); if (cat.id !== 'accessories') setCraftAccessoryFilter('all'); }}
                  className={`pixel-btn px-2.5 py-1 text-[11px] ${
                    craftCategory === cat.id
                      ? 'pixel-btn pixel-btn-gold font-bold text-slate-950'
                      : 'pixel-btn pixel-btn-dark text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            {craftCategory === 'weapons' && (
              <div className="mb-2.5 flex flex-wrap items-center gap-1 border-t border-slate-800 pt-2" aria-label="Subcategorias de armas">
                <span className="mr-1 text-[10px] text-slate-500">Tipos:</span>
                {WEAPON_SUBCATEGORIES.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() => setCraftWeaponFilter(subcategory.id)}
                    className={`pixel-btn px-2 py-0.5 text-[10px] ${craftWeaponFilter === subcategory.id ? 'pixel-btn-gold font-bold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>
            )}
            {craftCategory === 'accessories' && (
              <div className="mb-2.5 flex flex-wrap items-center gap-1 border-t border-slate-800 pt-2" aria-label="Subcategorias de acessórios">
                <span className="mr-1 text-[10px] text-slate-500">Tipos:</span>
                {ACCESSORY_SUBCATEGORIES.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() => setCraftAccessoryFilter(subcategory.id)}
                    className={`pixel-btn px-2 py-0.5 text-[10px] ${craftAccessoryFilter === subcategory.id ? 'pixel-btn-gold font-bold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-3 flex items-center gap-2">
              <input
                title="Filtra somente as receitas que o personagem já descobriu; não altera custos nem a fila."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar receita descoberta…"
                className="settlement-control"
              />
              <span title="Ouro disponível. Cada unidade do lote cobra o custo da receita separadamente." className="cursor-help whitespace-nowrap text-xs text-amber-300">
                💰 {props.characterGold} ⓘ
              </span>
            </div>

            <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {recipes.map((recipe) => (
                <CraftedEquipmentTooltip key={recipe.key} recipe={recipe}>
                <button
                  aria-label={`Selecionar ${recipe.name} e consultar os requisitos e chances atuais`}
                  onClick={() => selectRecipe(recipe)}
                  className={`settlement-choice group relative w-full p-2.5 text-left ${
                    selectedRecipe?.key === recipe.key
                      ? 'settlement-choice-selected'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="settlement-icon-frame h-8 w-8 rounded-md">
                        <PixelItemSprite
                          name={recipe.name}
                          slotType={recipe.slot_type}
                          weaponType={recipe.weapon_type}
                          templateKey={recipe.output_template_key}
                          visualKey={recipe.visual_key}
                          setKey={recipe.set_key}
                          rarity={recipe.minimum_rarity}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0">
                        <strong className="text-xs text-slate-100 flex items-center gap-1.5 font-pixel-heading">
                          <span className="truncate">{recipe.name}</span>
                          {recipe.hands === 2 && (
                            <span className="rounded bg-purple-950 px-1 py-0.2 text-[8px] font-bold text-purple-300 border border-purple-800/50">2H</span>
                          )}
                        </strong>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400 font-pixel-body">
                          <span>Conhecimento de {formatProfession(recipe.profession_key)} Nv. {recipe.required_profession_level}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-pixel-body">
                      <span className="text-[9px] font-pixel-heading text-slate-400 block">Tier {recipe.tier}</span>
                      <span className="text-[11px] font-pixel-heading text-amber-300">{recipe.gold_cost}g</span>
                    </div>
                  </div>
                </button>
                </CraftedEquipmentTooltip>
              ))}
              {recipes.length === 0 && (
                <p className="settlement-empty font-pixel-body">
                  Nenhuma receita encontrada para esta categoria ou busca.
                </p>
              )}
            </div>
          </section>

          <ManualCraft
            recipe={selectedRecipe}
            preview={props.craftPreview}
            batchResult={props.craftBatchResult}
            resources={resourcesByKey}
            definitions={resourceDefinitions}
            catalyst={catalyst}
            characterGold={props.characterGold}
            communityProfession={selectedRecipe ? professionByKey[selectedRecipe.profession_key] : undefined}
            onCatalyst={selectCatalyst}
            onCraft={props.onCraft}
          />
        </div>}

        {tab === 'residents' && props.economy && <div className="space-y-4">
          <CommunityKnowledgePanel
            catalog={props.catalog}
            professions={props.economy.professions}
            recipeStats={professionRecipeStats}
          />
          <section className="settlement-panel settlement-panel-accent text-xs text-slate-300">
            <div className="settlement-panel-header"><div><h3 className="settlement-panel-title text-amber-300">🏘️ Crescimento do refúgio</h3><p className="settlement-panel-subtitle">Novos moradores chegam automaticamente quando a capacidade e a Prosperidade permitem.</p></div><span className="rounded border border-amber-700/60 bg-amber-950/40 px-2 py-1 text-[9px] font-pixel-heading text-amber-200">RECRUTAMENTO</span></div>
            <p>A chegada é automática quando <strong>as duas condições</strong> são atendidas: existe uma vaga criada pela Cabana do Aventureiro e o refúgio alcançou o marco de Prosperidade do próximo morador.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className={`settlement-choice p-3 ${settlement && settlement.population < effectiveCapacity ? 'border-emerald-800 bg-emerald-950/25 text-emerald-300' : 'pixel-alert-frame pixel-alert-warning text-rose-300'}`}>
                🏠 Moradia: {settlement?.population}/{effectiveCapacity} · {settlement && settlement.population < effectiveCapacity ? 'há vaga' : 'lotada'}
              </div>
              <div className="settlement-choice border-fuchsia-800 bg-fuchsia-950/25 p-3 text-fuchsia-200">
                ✨ Prosperidade: {settlement?.prosperity}{nextResidentProsperity > 0 ? ` / ${nextResidentProsperity}` : ' · etapa concluída'}
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-800"><div className="h-full bg-fuchsia-500" style={{ width: `${prosperityProgress}%` }}/></div>
              </div>
            </div>
            {settlement?.growth_blocked_reason && <p className="settlement-choice mt-3 border-slate-700 bg-slate-950/50 p-2 text-slate-300">📌 Próximo passo: {settlement.growth_blocked_reason}.</p>}
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">Prosperidade aumenta com <strong>obras concluídas</strong>, <strong>produção entregue por trabalhadores</strong>, <strong>craft manual</strong> e <strong>cada tentativa produzida de uma Ambição</strong>. Ela não é gasta nem diminui nesta versão. Construções continuam sendo decisão exclusiva do jogador.</p>
          </section>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{residents.map((resident) => <ResidentCard key={resident.id} resident={resident} catalog={props.catalog} communityProfessions={professionByKey} recipeStats={professionRecipeStats}/>)}</div>
        </div>}
      </main>
    </div>
  </div>;
}

interface WorkProps extends Props {
  activities: NonNullable<EconomyState['active_gatherings']>;
  residents: SettlementResident[];
  now: number;
  professionByKey: Record<string, { level: number }>;
  resourceDefinitions: Record<string, { name?: string; icon?: string; storage_weight?: number }>;
  busyResidents: Set<string | undefined>;
  onOpenTreasury: () => void;
}

function WorkOrders(props: WorkProps) {
  const pendingBatches = props.economy?.pending_resource_batches || [];
  const pendingTotal = (props.economy?.pending_resources || []).reduce((total, resource) => total + resource.quantity, 0);
  const treasury = props.economy?.settlement?.treasury;
  const payrollActive = Boolean(treasury?.payroll_unlocked);
  const automaticFunds = treasury?.auto_fund_enabled
    ? Math.max(0, props.characterGold - treasury.personal_gold_reserve)
    : 0;
  const fundingCapacity = (treasury?.balance || 0) + automaticFunds;
  const hasSelectableDestinations = props.catalog.gatheringExpeditions.some((expedition) => expedition.player_selectable);
  const destinations = props.catalog.gatheringExpeditions.filter((expedition) => !hasSelectableDestinations || expedition.player_selectable);
  const destinationProfessions = props.catalog.professions.filter((profession) => destinations.some((expedition) => expedition.profession_key === profession.key));
  const [professionFilter, setProfessionFilter] = useState('all');
  const visibleDestinations = destinations.filter((expedition) => professionFilter === 'all' || expedition.profession_key === professionFilter);
  const eligibleDestinations = visibleDestinations.filter((expedition) => {
    const professionName = props.catalog.professions.find((profession) => profession.key === expedition.profession_key)?.name || professionLabels[expedition.profession_key] || expedition.profession_key;
    return Boolean(gatheringEligibility(props.residents, props.busyResidents, expedition.profession_key, expedition.required_profession_level, professionName).selected);
  });
  const hasAffordableContract = eligibleDestinations.some((expedition) => {
    const professionName = props.catalog.professions.find((profession) => profession.key === expedition.profession_key)?.name || professionLabels[expedition.profession_key] || expedition.profession_key;
    const eligibility = gatheringEligibility(props.residents, props.busyResidents, expedition.profession_key, expedition.required_profession_level, professionName);
    const level = eligibility.selected ? (residentSkill(eligibility.selected, expedition.profession_key)?.level || 1) : 1;
    return expedition.allowed_durations.some((duration) => fundingCapacity >= estimateGatheringWage(duration, level, expedition.tier, props.economy?.settlement));
  });
  const budgetBlocked = payrollActive && eligibleDestinations.length > 0 && !hasAffordableContract;

  return <div className="space-y-5"><section className="settlement-panel settlement-panel-info text-xs text-slate-300"><div className="settlement-panel-header"><div><h3 className="settlement-panel-title text-sky-300">🧭 Ordens de trabalho</h3><p className="settlement-panel-subtitle">1. Escolha o destino · 2. O morador qualificado é selecionado · 3. Escolha a duração do contrato.</p></div><span className="rounded border border-sky-700/60 bg-sky-950/40 px-2 py-1 text-[9px] font-pixel-heading text-sky-200">PRODUÇÃO EM PARALELO</span></div><div className="mt-3 grid gap-2 md:grid-cols-2"><div className="settlement-choice border-emerald-800/60 bg-emerald-950/20 p-3"><strong className="text-[10px] text-emerald-300">🪙 Contrato e salário</strong><p className="mt-1 text-[10px] leading-relaxed text-slate-300">O valor no botão é o <strong>total do contrato</strong>, reservado imediatamente. Ao cancelar, a parte ainda não trabalhada retorna ao Caixa.</p></div><div className={`settlement-choice p-3 ${payrollActive ? 'border-amber-800/60 bg-amber-950/20' : 'border-sky-800/60 bg-sky-950/20'}`}><strong className={`text-[10px] ${payrollActive ? 'text-amber-300' : 'text-sky-300'}`}>{payrollActive ? '🏦 Folha ativa' : '🛡️ Proteção inicial'}</strong><p className="mt-1 text-[10px] leading-relaxed text-slate-300">{payrollActive ? <>Caixa disponível para novos contratos: <strong className="text-emerald-300">{fundingCapacity} ouro</strong>{treasury?.auto_fund_enabled ? ' (Caixa + financiamento automático)' : ''}.</> : <>Os pioneiros trabalham sem custo até <strong>{treasury?.unlock_prosperity} de Prosperidade</strong>.</>}</p></div></div></section>
    {budgetBlocked && <section className="settlement-panel pixel-alert-frame pixel-alert-critical text-xs text-rose-100" role="alert">
      <div className="settlement-panel-header"><div><h3 className="settlement-panel-title text-rose-300"><span className="pixel-alert-icon" aria-hidden="true">⚠️</span> Orçamento de salários esgotado</h3><p className="settlement-panel-subtitle text-rose-100/80">Há moradores qualificados, mas nenhum contrato disponível cabe no Caixa atual.</p></div><button type="button" onClick={props.onOpenTreasury} className="pixel-btn pixel-btn-gold shrink-0 px-3 py-2 text-[10px]">🏦 Abrir Tesouraria & Folha</button></div>
      <p className="mt-3 leading-relaxed">Saldo para novos contratos: <strong className="text-amber-300">{fundingCapacity} ouro</strong>. Deposite ouro no Caixa ou ajuste o financiamento automático para voltar a contratar trabalhadores. Ordens já em andamento continuam normalmente.</p>
    </section>}
    {(props.economy?.pending_resources?.length || 0) > 0 && <section className="settlement-panel pixel-alert-frame pixel-alert-warning"><div className="settlement-panel-header"><div><h3 className="settlement-panel-title text-amber-200"><span className="pixel-alert-icon" aria-hidden="true">📦</span> Carga segura</h3><p className="settlement-panel-subtitle">{pendingTotal.toLocaleString('pt-BR')} unidades aguardando espaço. Nada será perdido.</p></div><button onClick={props.onClaimPendingResources} className="pixel-btn pixel-btn-gold px-3 py-2 text-[10px]">Tentar guardar tudo</button></div><div className="grid gap-2 lg:grid-cols-2">{pendingBatches.length > 0 ? pendingBatches.map((batch) => <article key={`${batch.source_kind}:${batch.source_key}`} className="settlement-choice p-3"><div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-amber-200">{pendingSourceLabel(batch.source_kind)}</strong><span className="text-[10px] font-pixel-stats text-slate-400">{batch.quantity.toLocaleString('pt-BR')} un.</span></div><p className="mt-1 break-words text-[9px] font-pixel-stats text-slate-500">{batch.source_key}</p><p className="mt-2 text-[10px] leading-relaxed text-slate-300">{batch.resources.map((resource) => `${props.resourceDefinitions[resource.key]?.name || resource.key} x${resource.quantity}`).join(' · ')}</p></article>) : <article className="settlement-choice p-3 text-[10px] text-slate-300">Carga legada: {props.economy!.pending_resources!.map((resource) => `${props.resourceDefinitions[resource.key]?.name || resource.key} x${resource.quantity}`).join(' · ')}</article>}</div></section>}
    {props.activities.length > 0 && <section className="grid gap-3 lg:grid-cols-2">{props.activities.map((activity) => {
      const ready = new Date(activity.ends_at).getTime() <= props.now || activity.state === 'claimable';
      const pendingStorage = activity.state === 'pending_storage';
      const destination = props.catalog.gatheringExpeditions.find((expedition) => expedition.key === activity.expedition_key);
      return <article key={activity.id} className={`settlement-panel ${pendingStorage ? 'pixel-alert-frame pixel-alert-warning' : ready ? 'settlement-panel-positive pixel-alert-frame pixel-alert-success' : 'settlement-panel-positive'}`}>
        <p className="text-[10px] uppercase tracking-wider text-emerald-400">{activity.resident_name || 'Trabalhador'} · {pendingStorage ? 'trabalhador livre' : ready ? 'entregando automaticamente' : 'em coleta'}</p>
        <h3 className="font-bold text-slate-100">{destination?.display_name || activity.expedition_key}</h3>
        {destination?.area_name && <p className="mt-0.5 text-[10px] text-sky-300">📍 {destination.area_name}</p>}
        <p className="mt-1 font-mono text-xs text-slate-400">{pendingStorage ? 'Parte da carga aguarda espaço no Depósito.' : `Retorno: ${countdown(activity.ends_at, props.now)}`}</p>
        {activity.wage_reserved > 0 && <p className="mt-1 text-[10px] text-amber-300">💰 Salário reservado: {activity.wage_reserved} ouro{activity.wage_paid > 0 ? ' · pago' : ''}</p>}
        {pendingStorage ? <button title="O morador já voltou e está livre. Este botão tenta guardar somente o excedente protegido." onClick={() => props.onClaimGathering(activity.id)} className="pixel-btn pixel-btn-gold mt-3 px-3 py-2 text-[10px]">Tentar guardar carga pendente</button>
          : ready ? <button title="A entrega acontece sozinha. Este botão apenas solicita uma sincronização imediata." onClick={props.onSync} className="pixel-btn pixel-btn-emerald mt-3 px-3 py-2 text-[10px]">↻ Sincronizando entrega automática…</button>
          : <button title="Cancela a ordem antes do fim. Os ciclos completos já realizados são preservados e entregues." onClick={() => props.onCancelGathering(activity.id)} className="pixel-btn pixel-btn-crimson mt-3 px-3 py-2 text-[10px]">Cancelar e preservar ciclos</button>}
      </article>;
    })}</section>}
    <section className="settlement-panel border-sky-800/60 bg-slate-950/40"><div className="flex flex-wrap items-center gap-2"><strong className="mr-1 text-[11px] text-sky-200">Escolha um destino:</strong><button onClick={() => setProfessionFilter('all')} className={`pixel-btn px-2.5 py-1.5 text-[9px] ${professionFilter === 'all' ? 'pixel-btn-gold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}>Todos ({destinations.length})</button>{destinationProfessions.map((profession) => { const count = destinations.filter((expedition) => expedition.profession_key === profession.key).length; return <button key={profession.key} onClick={() => setProfessionFilter(profession.key)} className={`pixel-btn px-2.5 py-1.5 text-[9px] ${professionFilter === profession.key ? 'pixel-btn-gold text-slate-950' : 'pixel-btn-dark text-slate-300'}`}><PixelProfessionSprite professionKey={profession.key} size="sm" /> {profession.name} ({count})</button>; })}</div><p className="mt-2 text-[10px] text-slate-400">O destino determina os recursos possíveis. O sorteio agora é apenas de quantidade e de recursos extras dentro do destino escolhido.</p></section>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleDestinations.map((expedition) => {
      const professionName = props.catalog.professions.find((p) => p.key === expedition.profession_key)?.name || professionLabels[expedition.profession_key] || expedition.profession_key;
      const eligibility = gatheringEligibility(props.residents, props.busyResidents, expedition.profession_key, expedition.required_profession_level, professionName);
      const selectedLevel = eligibility.selected ? (residentSkill(eligibility.selected, expedition.profession_key)?.level || 1) : 1;
      return (
        <section key={expedition.key} className="settlement-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="settlement-icon-frame">
                <PixelProfessionSprite professionKey={expedition.profession_key} size="lg" />
              </div>
              <div>
                <h3 className="font-pixel-heading text-xs text-slate-100">{expedition.display_name}</h3>
                <p className="text-[10px] text-sky-300 font-pixel-body">📍 {expedition.area_name || expedition.display_name} · {professionName} Nv. {expedition.required_profession_level}+</p>
              </div>
            </div>
            <p className="my-2 text-[10px] text-slate-400 font-pixel-body leading-relaxed">{expedition.description}</p>
            <p className={`mb-2 text-[10px] font-pixel-body ${eligibility.selected ? 'text-emerald-300' : 'text-rose-300'}`}>
              {eligibility.selected ? <>✓ Será enviado: <strong>{eligibility.selected.name}</strong> · {professionName} Nv. {selectedLevel}</> : <>🔒 Indisponível: {eligibility.reason}</>}
            </p>
            <div className="mb-3 rounded border border-slate-700/70 bg-slate-950/35 px-2.5 py-2 text-[10px] font-pixel-body">
              <p className="text-sky-200">📦 Recursos desta rota <span className="text-slate-500">(por ciclo)</span></p>
              <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
                {expedition.nodes.map((node) => {
                  return <div key={node.key} className="rounded border border-slate-800 bg-slate-900/70 p-2">
                    {expedition.nodes.length > 1 && <strong className="text-slate-200">{node.name}</strong>}
                    <div className="flex items-center justify-between gap-2"><span className="text-[9px] text-fuchsia-300">{durationLabel(node.cycle_seconds)}/ciclo · +{node.profession_xp} XP</span></div>
                    <div className="mt-1 flex flex-wrap gap-1">{node.rewards.map((reward) => {
                      const display = gatheringRewardLabel(reward, props.resourceDefinitions);
                      return <span key={reward.resource_key} className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[9px] text-slate-300"><PixelResourceSprite resourceKey={reward.resource_key} name={display.definition?.name || reward.resource_key} size="sm" />{display.definition?.name || reward.resource_key} {display.quantity} <span className={reward.chance >= 1 ? 'text-emerald-300' : 'text-amber-300'}>{display.chance}</span></span>;
                    })}</div>
                  </div>;
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 font-pixel-body">
            {expedition.allowed_durations.map((duration) => {
              const estimate = estimateGathering(expedition, duration, props.resourceDefinitions);
              const wage = estimateGatheringWage(duration, selectedLevel, expedition.tier, props.economy?.settlement);
              const canPay = wage === 0 || fundingCapacity >= wage;
              const blockedReason = !eligibility.selected ? eligibility.reason || 'Nenhum morador elegível está livre.' : `O contrato exige ${wage} ouro no total, mas há ${fundingCapacity} ouro disponível para salários.`;
              return (
                <button
                  key={duration}
                  disabled={!eligibility.selected || !canPay}
                  onClick={() => props.onStartGathering(expedition.key, duration)}
                  title={eligibility.selected && canPay ? `Contrato de ${durationLabel(duration)}: média de ${estimate.units} recursos; ocupa cerca de ${estimate.storage} de depósito; salário total de ${wage} ouro.` : blockedReason}
                  className="pixel-btn pixel-btn-gold flex min-h-16 flex-col items-center justify-center px-2 py-1.5 text-[10px] text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <span className="font-bold">Enviar por {durationLabel(duration)}</span>
                  <span className="mt-0.5 text-[8px] font-normal opacity-80">Média: ~{estimate.units} recursos</span>
                  <span className="text-[8px] font-normal opacity-80">{wage > 0 ? `Contrato: ${wage} ouro total` : 'Salário: subsidiado'}</span>
                </button>
              );
            })}
          </div>
        </section>
      );
    })}</div>
  </div>;
}

function TreasuryPanel({
  settlement,
  characterGold,
  onTransfer,
  onUpdatePolicy,
}: {
  settlement: EconomyState['settlement'];
  characterGold: number;
  onTransfer: (direction: 'deposit' | 'withdraw', amount: number) => void;
  onUpdatePolicy: (enabled: boolean, personalReserve: number) => void;
}) {
  const treasury = settlement?.treasury;
  const [amount, setAmount] = useState(500);
  const [autoFund, setAutoFund] = useState(treasury?.auto_fund_enabled ?? false);
  const [personalReserve, setPersonalReserve] = useState(treasury?.personal_gold_reserve ?? 500);

  useEffect(() => {
    if (!treasury) return;
    setAutoFund(treasury.auto_fund_enabled);
    setPersonalReserve(treasury.personal_gold_reserve);
  }, [treasury?.auto_fund_enabled, treasury?.personal_gold_reserve]);

  if (!treasury) return <section className="settlement-empty">Tesouraria indisponível nesta versão do servidor.</section>;

  return <div className="space-y-4">
    <section className="settlement-panel settlement-panel-positive">
      <div className="settlement-panel-header"><div><h3 className="settlement-panel-title text-emerald-300">🏦 Tesouraria do assentamento</h3><p className="settlement-panel-subtitle">O caixa paga trabalhos produtivos sem gerar dívida ou ouro negativo.</p></div><span className="rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-1 text-[9px] font-pixel-heading text-emerald-200">ECONOMIA COMUNITÁRIA</span></div>
      <p className="text-xs leading-relaxed text-slate-300">O salário é separado antes da saída, liquidado no retorno automático e devolvido quando uma ordem é cancelada antes do trabalho.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TreasuryMetric label="Disponível" value={treasury.balance} tone="text-emerald-300" help="Pode ser usado em novas ordens." />
        <TreasuryMetric label="Folha reservada" value={treasury.reserved_payroll} tone="text-amber-300" help="Já separado para trabalhos em andamento." />
        <TreasuryMetric label="Entradas históricas" value={treasury.lifetime_income} tone="text-sky-300" help="Total depositado manual ou automaticamente." />
        <TreasuryMetric label="Salários pagos" value={treasury.lifetime_expenses} tone="text-rose-300" help="Custo produtivo efetivamente liquidado." />
      </div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="settlement-panel">
        <div className="settlement-panel-header"><div><h4 className="settlement-panel-title text-slate-200">↔️ Transferir ouro</h4><p className="settlement-panel-subtitle">Movimente ouro entre a carteira do herói e o caixa.</p></div></div>
        <p className="mt-1 text-[10px] text-slate-400">Ouro pessoal: <strong className="text-amber-300">{characterGold}</strong> · Caixa disponível: <strong className="text-emerald-300">{treasury.balance}</strong></p>
        <input title="Quantidade de ouro que será movimentada entre a carteira do herói e a Tesouraria." type="number" min={1} value={amount} onChange={(event) => setAmount(Math.max(1, Number(event.target.value) || 1))} className="settlement-control" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button disabled={amount > characterGold} onClick={() => onTransfer('deposit', amount)} className="pixel-btn pixel-btn-emerald px-3 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-30">Depositar</button>
          <button disabled={amount > treasury.balance} onClick={() => onTransfer('withdraw', amount)} className="pixel-btn pixel-btn-gold px-3 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-30">Retirar</button>
        </div>
      </section>

      <section className="settlement-panel">
        <div className="settlement-panel-header"><div><h4 className="settlement-panel-title text-slate-200">⚙️ Financiamento automático</h4><p className="settlement-panel-subtitle">Complete apenas o déficit no momento de autorizar uma ordem.</p></div></div>
        <label title="Quando faltar ouro no caixa, transfere somente o déficit da carteira do herói antes de iniciar a ordem." className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={autoFund} onChange={(event) => setAutoFund(event.target.checked)} className="mt-0.5"/><span><strong>Completar a Tesouraria automaticamente</strong><span className="mt-1 block text-[10px] text-slate-500">A transferência ocorre apenas ao autorizar um trabalho.</span></span></label>
        <label title="O financiamento automático nunca reduz o ouro pessoal abaixo deste valor." className="settlement-field-label mt-3">Reserva pessoal protegida ⓘ<input type="number" min={0} value={personalReserve} onChange={(event) => setPersonalReserve(Math.max(0, Number(event.target.value) || 0))} className="settlement-control"/></label>
        <button onClick={() => onUpdatePolicy(autoFund, personalReserve)} className="pixel-btn pixel-btn-dark mt-3 w-full px-3 py-2 text-[10px]">Salvar política</button>
      </section>
    </div>

    <section className={`settlement-panel text-xs ${treasury.payroll_unlocked ? 'settlement-panel-positive text-emerald-200' : 'settlement-panel-accent text-amber-200'}`}>
      <strong>{treasury.payroll_unlocked ? '✓ Folha de pagamento ativa' : '🛡️ Folha subsidiada no início'}</strong>
      <p className="mt-1">{treasury.payroll_unlocked ? 'Cada nova ordem mostra o salário exato antes da confirmação. Cancelamentos devolvem automaticamente a parte ainda não trabalhada.' : `Os pioneiros não cobram ouro até o assentamento alcançar ${treasury.unlock_prosperity} de Prosperidade. Progresso inicial nunca será bloqueado por salários.`}</p>
    </section>
  </div>;
}

function TreasuryMetric({ label, value, tone, help }: { label: string; value: number; tone: string; help: string }) {
  return <div title={help} className="settlement-choice cursor-help p-3"><span className="block text-[9px] uppercase tracking-wider text-slate-500">{label}</span><strong className={`mt-1 block font-pixel-stats text-lg ${tone}`}>{value.toLocaleString('pt-BR')}g</strong></div>;
}

function DesireRecipeDetails({
  recipe,
  resources,
  definitions,
}: {
  recipe: RecipeDefinition;
  resources: Record<string, number>;
  definitions: Record<string, { name?: string; icon?: string }>;
}) {
  return (
    <div className="border-t border-slate-800 pt-3">
      <div className="settlement-panel-header">
        <div>
          <h4 className="settlement-panel-title text-amber-300">📊 Ficha da receita selecionada</h4>
          <p className="settlement-panel-subtitle">Requisitos, saída e insumos ficam visíveis junto da seleção.</p>
        </div>
        <span className="rounded border border-amber-700/60 bg-amber-950/30 px-2 py-1 text-[10px] font-pixel-stats text-amber-300">💰 {recipe.gold_cost} gold / tentativa</span>
      </div>
      {recipe.kind === 'equipment' ? (
        <EquipmentStatsCard recipe={recipe} />
      ) : (
        <div className="settlement-panel bg-slate-950/45 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <PixelResourceSprite resourceKey={recipe.output_resource_key || ''} name={recipe.name} size="md" />
            <div>
              <strong className="text-emerald-300">Produção: +{recipe.output_quantity || 0} por execução</strong>
              <p className="mt-1 text-[10px] text-slate-400">O resultado vai para o Depósito e, se faltar espaço, fica disponível em Cargas Pendentes.</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="settlement-choice px-2 py-1 text-[10px] text-sky-300">🛠️ {formatProfession(recipe.profession_key)} Nv. {recipe.required_profession_level}</span>
            <span className="settlement-choice px-2 py-1 text-[10px] text-purple-300">🏗️ {buildingLabels[recipe.station_key || ''] || recipe.station_key || 'Sem estação'} Nv. {recipe.required_station_level || 0}</span>
          </div>
        </div>
      )}
      <div className="settlement-panel mt-3 bg-slate-950/45">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-pixel-heading uppercase tracking-wider text-slate-400">Insumos por tentativa</span>
          <span className="text-[9px] text-slate-500">Disponível / necessário</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {recipe.ingredients.map((ingredient) => {
            const inStock = resources[ingredient.key] || 0;
            const isSatisfied = inStock >= ingredient.quantity;
            const definition = definitions[ingredient.key];
            return (
              <div key={ingredient.key} className={`settlement-choice flex items-center gap-2 px-2.5 py-2 text-[11px] ${isSatisfied ? 'border-emerald-800/70 bg-emerald-950/25 text-emerald-300' : 'pixel-alert-frame pixel-alert-warning text-rose-300'}`}>
                <PixelResourceSprite resourceKey={ingredient.key} name={definition?.name || ingredient.key} size="sm" />
                <span className="min-w-0 flex-1 truncate">{definition?.name || ingredient.key}</span>
                <span className="shrink-0 font-pixel-stats font-bold">{inStock}/{ingredient.quantity} {isSatisfied ? '✓' : '!'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DesireQueue({
  settlement,
  now,
  resources,
  recipesByKey,
  currentResourceBalances,
  characterGold,
  onCancel,
}: {
  settlement: EconomyState['settlement'];
  now: number;
  resources: Record<string, { name?: string; icon?: string }>;
  recipesByKey?: Record<string, RecipeDefinition>;
  currentResourceBalances?: Record<string, number>;
  characterGold?: number;
  onCancel: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [weaponFilter, setWeaponFilter] = useState('all');
  const [accessoryFilter, setAccessoryFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const desires = (settlement?.hero_desires || []).filter((d) => d.state !== 'cancelled');
  const filteredDesires = desires.filter((desire) => {
    const recipe = recipesByKey?.[desire.recipe_key];
    return matchesEquipmentFilters({
      name: desire.recipe_name,
      slot_type: recipe?.slot_type,
      weapon_type: recipe?.weapon_type,
      rarity: desire.target_rarity,
    }, categoryFilter, weaponFilter, accessoryFilter, rarityFilter, searchQuery);
  });
  const categoryCounts = desires.reduce<Record<string, number>>((counts, desire) => {
    const category = equipmentCategory(recipesByKey?.[desire.recipe_key]?.slot_type);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, { all: desires.length });
  const weaponCounts = desires.reduce<Record<string, number>>((counts, desire) => {
    const recipe = recipesByKey?.[desire.recipe_key];
    if (equipmentCategory(recipe?.slot_type) !== 'weapons') return counts;
    WEAPON_SUBCATEGORIES.forEach(({ id }) => {
      if (weaponSubcategoryMatches({ name: desire.recipe_name, weapon_type: recipe?.weapon_type }, id)) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, {});
  const accessoryCounts = desires.reduce<Record<string, number>>((counts, desire) => {
    const recipe = recipesByKey?.[desire.recipe_key];
    if (equipmentCategory(recipe?.slot_type) !== 'accessories') return counts;
    ACCESSORY_SUBCATEGORIES.forEach(({ id }) => {
      if (accessorySubcategoryMatches({ name: desire.recipe_name, slot_type: recipe?.slot_type }, id)) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, {});

  const renderStateBadge = (state: string) => {
    switch (state) {
      case 'crafting':
        return <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">🔨 Fabricando</span>;
      case 'blocked':
        return <span className="rounded border border-rose-800 bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300">🔒 Bloqueado</span>;
      case 'completed':
        return <span className="rounded border border-sky-700 bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-300">✨ Concluído</span>;
      case 'exhausted':
        return <span className="rounded border border-amber-700 bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300">⚠️ Tentativas encerradas</span>;
      case 'queued':
      default:
        return <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">⏳ Na Fila</span>;
    }
  };

  return (
    <section className="settlement-panel">
      <div className="settlement-panel-header">
        <div>
          <h3 className="settlement-panel-title text-purple-200">⭐ Fila de ambições</h3>
          <p className="settlement-panel-subtitle">Acompanhe tentativas, insumos reservados e resultados produzidos.</p>
        </div>
        <span className="rounded border border-purple-700/60 bg-purple-950/40 px-2 py-1 text-[9px] font-pixel-heading text-purple-200">PRODUÇÃO AUTOMÁTICA</span>
      </div>
      <EquipmentFilterBar
        categoryFilter={categoryFilter}
        weaponFilter={weaponFilter}
        accessoryFilter={accessoryFilter}
        rarityFilter={rarityFilter}
        searchQuery={searchQuery}
        categoryCounts={categoryCounts}
        weaponCounts={weaponCounts}
        accessoryCounts={accessoryCounts}
        onCategoryChange={(value) => { setCategoryFilter(value); if (value !== 'weapons') setWeaponFilter('all'); if (value !== 'accessories') setAccessoryFilter('all'); }}
        onWeaponChange={setWeaponFilter}
        onAccessoryChange={setAccessoryFilter}
        onRarityChange={setRarityFilter}
        onSearchChange={setSearchQuery}
      />
      <div className="space-y-2">
        {filteredDesires.map((desire) => {
          const isExpanded = expandedId === desire.id;
          const targetRecipe = recipesByKey ? recipesByKey[desire.recipe_key] : null;
          const isEquipmentDesire = targetRecipe?.kind === 'equipment';

          return (
            <CraftedEquipmentTooltip key={desire.id} recipe={targetRecipe}>
              <article
                onClick={() => setExpandedId(isExpanded ? null : desire.id)}
                className={`settlement-choice cursor-pointer p-3 ${isExpanded ? 'settlement-choice-selected' : ''}`}
                aria-expanded={isExpanded}
              >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <strong className="text-sm font-bold text-slate-100">{desire.recipe_name}</strong>
                  <p className={`text-xs ${isEquipmentDesire ? (rarityClass[desire.target_rarity] || 'text-slate-400') : 'text-emerald-300'}`}>
                    {isEquipmentDesire ? `Meta: ${rarityLabel[desire.target_rarity] || desire.target_rarity}` : 'Produção'} · execução {desire.attempts_completed}/{desire.max_attempts}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStateBadge(desire.state)}
                  <span className="text-xs text-slate-500" aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {desire.assigned_resident_name && (
                <p className="mt-2 text-xs text-sky-300 font-mono">
                  🔨 {desire.assigned_resident_name} · {countdown(desire.current_order_ready_at, now)}
                </p>
              )}

              {desire.blocked_reason && (
                <p className="mt-2 rounded-lg border border-rose-900/50 bg-rose-950/40 p-2 text-[11px] font-medium text-rose-300">
                  ⚠️ {formatBlockedReason(desire.blocked_reason, resources)}
                </p>
              )}

              {/* Receita Completa de Insumos da Ambição */}
              {targetRecipe && (
                <div className="settlement-choice mt-2.5 border-slate-800 bg-slate-900/70 p-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>📋 Insumos da receita (por tentativa):</span>
                    <span className={(characterGold || 0) >= targetRecipe.gold_cost ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                      💰 {targetRecipe.gold_cost} gold
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {targetRecipe.ingredients.map((ing) => {
                      const inStock = currentResourceBalances ? (currentResourceBalances[ing.key] || 0) : 0;
                      const isSatisfied = inStock >= ing.quantity;
                      const def = resources[ing.key];
                      return (
                        <div
                          key={ing.key}
                          className={`settlement-choice flex items-center justify-between px-2 py-1 text-[11px] ${
                            isSatisfied
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                              : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                          }`}
                        >
                          <span className="mr-1 flex min-w-0 items-center gap-1.5 truncate">
                            <PixelResourceSprite resourceKey={ing.key} name={def?.name || ing.key} size="sm" />
                            <span className="truncate">{def?.name || ing.key}</span>
                          </span>
                          <span className="font-mono font-bold whitespace-nowrap">
                            {inStock}/{ing.quantity} {isSatisfied ? '✓' : '⚠️'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isExpanded && (
                <div className="settlement-choice mt-3 border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-300">
                  <p><strong className="text-amber-300">Receita:</strong> {desire.recipe_name}</p>
                  <p title="Quanto maior o número, antes esta Ambição entra em produção. Não altera chance, raridade nem velocidade." className="cursor-help"><strong className="text-amber-300">Prioridade ⓘ:</strong> {desire.priority} / 100 · somente ordem da fila</p>
                  {isEquipmentDesire && <p><strong className="text-amber-300">Catalisador:</strong> {formatCatalyst(desire.catalyst_key)}</p>}
                  {(desire.reserved_resources?.length || 0) > 0 && (
                    <p className="text-amber-300">
                      <strong>Insumos reservados:</strong>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {desire.reserved_resources!.map((reserved) => (
                          <span key={reserved.key} className="settlement-choice inline-flex items-center gap-1 px-1.5 py-1 text-[10px] text-amber-200">
                            <PixelResourceSprite resourceKey={reserved.key} name={resources[reserved.key]?.name || reserved.key} size="sm" />
                            {resources[reserved.key]?.name || reserved.key} ×{reserved.quantity}
                          </span>
                        ))}
                        <span className="settlement-choice px-1.5 py-1 text-[10px] text-amber-200">💰 {desire.reserved_gold || 0} gold</span>
                      </span>
                    </p>
                  )}
                </div>
              )}

              {['completed', 'exhausted'].includes(desire.state) && (
                <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-[11px] font-medium text-sky-300">
                    {isEquipmentDesire
                      ? (desire.state === 'completed' ? '✓ Item que atingiu a meta foi para a mochila quando havia espaço; demais tentativas ficam no Arsenal.' : '⚠️ Tentativas produzidas permanecem protegidas no Arsenal.')
                      : '✓ Produções concluídas foram entregues ao Depósito; excedentes ficam em Cargas Pendentes.'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(desire.id);
                    }}
                    className="pixel-btn pixel-btn-dark px-2.5 py-1 text-[10px]"
                    title="Remover somente esta ficha da fila. Nenhum item do Arsenal será apagado."
                  >
                    ✕ Limpar
                  </button>
                </div>
              )}

              {['queued', 'blocked'].includes(desire.state) && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(desire.id);
                    }}
                    className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-[10px]"
                  >
                    Cancelar ambição
                  </button>
                </div>
              )}

              {desire.state === 'crafting' && (
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-rose-900/40 pt-2">
                  <span className="text-[10px] leading-relaxed text-rose-200/80">
                    A tentativa em andamento pode ser interrompida. Insumos e ouro reservados são devolvidos; excedentes ficam em Cargas Pendentes.
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const confirmed = window.confirm('Parar esta produção agora? Os materiais e o ouro reservados da tentativa atual serão devolvidos.');
                      if (confirmed) onCancel(desire.id);
                    }}
                    className="pixel-btn pixel-btn-crimson shrink-0 px-2.5 py-1 text-[10px]"
                    title="Interrompe somente a tentativa atual e libera o trabalhador."
                  >
                    ■ Parar produção
                  </button>
                </div>
              )}
              </article>
            </CraftedEquipmentTooltip>
          );
        })}
        {filteredDesires.length === 0 && (
          <p className="settlement-empty">
            {desires.length === 0 ? 'Nenhuma ambição ativa registrada.' : 'Nenhuma ambição corresponde aos filtros atuais.'}
          </p>
        )}
      </div>
    </section>
  );
}

function Armory({ settlement, onClaim }: { settlement: EconomyState['settlement']; onClaim: (id: string) => void }) {
  const armory = settlement?.armory || [];
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [weaponFilter, setWeaponFilter] = useState('all');
  const [accessoryFilter, setAccessoryFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const filteredArmory = armory.filter((entry) => matchesEquipmentFilters(entry.item, categoryFilter, weaponFilter, accessoryFilter, rarityFilter, searchQuery));
  const categoryCounts = armory.reduce<Record<string, number>>((counts, entry) => {
    const category = equipmentCategory(entry.item.slot_type);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, { all: armory.length });
  const weaponCounts = armory.reduce<Record<string, number>>((counts, entry) => {
    if (equipmentCategory(entry.item.slot_type) !== 'weapons') return counts;
    WEAPON_SUBCATEGORIES.forEach(({ id }) => {
      if (weaponSubcategoryMatches(entry.item, id)) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, {});
  const accessoryCounts = armory.reduce<Record<string, number>>((counts, entry) => {
    if (equipmentCategory(entry.item.slot_type) !== 'accessories') return counts;
    ACCESSORY_SUBCATEGORIES.forEach(({ id }) => {
      if (accessorySubcategoryMatches(entry.item, id)) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, {});
  return (
    <section className="settlement-panel">
      <div className="settlement-panel-header">
        <div>
          <h3 className="settlement-panel-title text-amber-200">🛡️ Arsenal do assentamento</h3>
          <p className="settlement-panel-subtitle">Itens produzidos ficam protegidos até serem levados à mochila.</p>
        </div>
        <span className="rounded border border-amber-700/60 bg-amber-950/40 px-2 py-1 text-[9px] font-pixel-heading text-amber-200">ITENS SEGUROS</span>
      </div>
      <EquipmentFilterBar
        categoryFilter={categoryFilter}
        weaponFilter={weaponFilter}
        accessoryFilter={accessoryFilter}
        rarityFilter={rarityFilter}
        searchQuery={searchQuery}
        categoryCounts={categoryCounts}
        weaponCounts={weaponCounts}
        accessoryCounts={accessoryCounts}
        onCategoryChange={(value) => { setCategoryFilter(value); if (value !== 'weapons') setWeaponFilter('all'); if (value !== 'accessories') setAccessoryFilter('all'); }}
        onWeaponChange={setWeaponFilter}
        onAccessoryChange={setAccessoryFilter}
        onRarityChange={setRarityFilter}
        onSearchChange={setSearchQuery}
      />
      <div className="space-y-2">
        {filteredArmory.map((entry) => (
          <CraftedEquipmentTooltip key={entry.id} item={entry.item}>
          <article className="settlement-choice flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="settlement-icon-frame h-10 w-10 rounded-md">
                <PixelItemSprite
                  name={entry.item.name}
                  slotType={entry.item.slot_type}
                  weaponType={entry.item.weapon_type}
                  rarity={entry.item.rarity}
                  size="md"
                />
              </div>
              <div className="min-w-0">
                <strong className={`text-xs font-pixel-heading block truncate ${rarityClass[entry.item.rarity] || 'text-slate-100'}`}>
                  {entry.item.name}
                </strong>
                    <p className="text-[10px] text-slate-400 font-pixel-body">
                      {rarityLabel[entry.item.rarity] || entry.item.rarity} · guardado em segurança
                      {entry.item.slot_type === 'bag' && ` · 🎒 +${getBagSlotBonus(entry.item.rarity)} slots`}
                    </p>
              </div>
            </div>
            <button
              onClick={() => onClaim(entry.id)}
              className="pixel-btn pixel-btn-gold px-3 py-1.5 text-xs font-pixel-heading shrink-0"
            >
              Levar à mochila
            </button>
          </article>
          </CraftedEquipmentTooltip>
        ))}
        {filteredArmory.length === 0 && (
          <p className="settlement-empty font-pixel-body">
            {armory.length === 0 ? 'O arsenal ainda está vazio.' : 'Nenhum item corresponde aos filtros atuais.'}
          </p>
        )}
      </div>
    </section>
  );
}

function ManualCraft({ recipe, preview, batchResult, resources, definitions, catalyst, characterGold, communityProfession, onCatalyst, onCraft }: {
  recipe: RecipeDefinition | null;
  preview: CraftPreview | null;
  batchResult: CraftBatchResult | null;
  resources: Record<string, number>;
  definitions: Record<string, { name?: string; icon?: string; description?: string }>;
  catalyst: string;
  characterGold: number;
  communityProfession?: ProfessionProgress;
  onCatalyst: (value: string) => void;
  onCraft: Props['onCraft'];
}) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const ingredientLimits = recipe?.ingredients.map((ingredient) => Math.floor((resources[ingredient.key] || 0) / Math.max(1, ingredient.quantity))) || [];
  const catalystLimit = catalyst ? Math.floor((resources[catalyst] || 0) / Math.max(1, preview?.catalyst_cost || 1)) : 50;
  const goldLimit = recipe?.gold_cost ? Math.floor(characterGold / recipe.gold_cost) : 50;
  const maxAffordable = Math.max(0, Math.min(50, catalystLimit, goldLimit, ...(ingredientLimits.length ? ingredientLimits : [50])));

  useEffect(() => {
    if (!batchResult || !recipe || batchResult.recipe_key !== recipe.key) return;
    setIsProcessing(false);
  }, [batchResult, recipe?.key]);

  useEffect(() => {
    if (!isProcessing) return;
    const timeout = window.setTimeout(() => setIsProcessing(false), 20000);
    return () => window.clearTimeout(timeout);
  }, [isProcessing]);

  const handleProcessCraft = () => {
    if (!recipe || isProcessing) return;
    const count = Math.max(1, Math.min(50, quantity));
    setIsProcessing(true);
    onCraft(recipe.key, catalyst, preview?.preview_revision || 0, count);
  };

  return (
    <section className="settlement-panel">
      {!recipe ? (
        <div className="settlement-empty flex min-h-[260px] items-center justify-center">
          Selecione uma receita para produzir pessoalmente.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="settlement-panel-header">
            <div>
              <h3 className="settlement-panel-title text-amber-300">
                <span>{recipe.kind === 'equipment' ? (slotLabels[recipe.slot_type || '']?.icon || '⚔️') : '🧱'}</span>
                <span>{recipe.name}</span>
              </h3>
              <p className="settlement-panel-subtitle">{recipe.description}</p>
            </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                Tier {recipe.tier}
              </span>
          </div>

          {recipe.kind === 'processing' && recipe.output_resource_key && definitions[recipe.output_resource_key] && (
            <div className="settlement-panel settlement-panel-info p-3 text-[10px] leading-relaxed text-sky-200">
              <strong>🎯 Para que serve o resultado: {definitions[recipe.output_resource_key].name || recipe.output_resource_key}</strong>
              <p className="mt-1 text-slate-300">{definitions[recipe.output_resource_key].description || 'Recurso especial usado na progressão do Acampamento.'}</p>
            </div>
          )}

          <div className="settlement-panel settlement-panel-info p-3 text-[10px] leading-relaxed text-sky-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>📚 Conhecimento da Comunidade · {formatProfession(recipe.profession_key)}</strong>
              <span className="font-pixel-stats text-sky-200">
                Nv. {communityProfession?.level || preview?.profession_level || 1} · {communityProfession?.experience || 0}/{communityProfession?.xp_required || '—'} XP
              </span>
            </div>
            <p className="mt-1 text-slate-300">
              Este conhecimento valida o requisito da receita e melhora a qualidade dos equipamentos. A habilidade individual do trabalhador só participa das ordens automáticas.
            </p>
          </div>

          {/* Card com Atributos do Equipamento */}
          <EquipmentStatsCard recipe={recipe} />

          <div className="settlement-panel settlement-panel-info p-3 text-[10px] leading-relaxed text-sky-200">
            ℹ️ <strong>Não existe falha aleatória total no craft manual.</strong> Cada unidade aceita pelo servidor produz um resultado. Em equipamentos, o sorteio define apenas a <strong>raridade</strong>. Um lote pode parar antes do fim se acabarem materiais, ouro, catalisador ou espaço; o resumo abaixo informa exatamente quantas unidades foram concluídas e o motivo da parada.
          </div>

          {/* Grade de Insumos da Receita */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
              <span>📋 Insumos da Receita ({quantity > 1 ? `Lote de ${quantity}x` : '1 unidade'}):</span>
              <span className={characterGold >= recipe.gold_cost * quantity ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                💰 {recipe.gold_cost * quantity} gold ({characterGold} disponível)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recipe.ingredients.map((ingredient) => {
                const required = ingredient.quantity * quantity;
                const inStock = resources[ingredient.key] || 0;
                const isSatisfied = inStock >= required;
                return (
                  <div
                    key={ingredient.key}
                    className={`settlement-choice flex items-center justify-between p-2 text-xs ${isSatisfied ? 'border-emerald-800/70 bg-emerald-950/20 text-emerald-300' : 'border-rose-900/70 bg-rose-950/20 text-rose-300'}`}
                  >
                    <span className="truncate mr-1 flex items-center gap-1.5">
                      <PixelResourceSprite resourceKey={ingredient.key} name={definitions[ingredient.key]?.name || ingredient.key} size="sm" />
                      <span>{definitions[ingredient.key]?.name || ingredient.key}</span>
                    </span>
                    <strong className="font-mono whitespace-nowrap">
                      {inStock}/{required} {isSatisfied ? '✓' : '⚠️'}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label title="Quantidade máxima que o servidor tentará produzir em sequência. Custos são cobrados por unidade e o lote para com segurança ao faltar algum requisito." className="block cursor-help text-xs font-semibold text-slate-300">
              Quantidade de produção em lote ⓘ:
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {[1, 5, 10, 25, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setQuantity(num)}
                    className={`pixel-btn px-2.5 py-1 text-xs ${quantity === num ? 'pixel-btn-gold text-slate-950' : 'pixel-btn-dark text-slate-300'} disabled:opacity-50`}
                  >
                    {num}x
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={50}
                  disabled={isProcessing}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="settlement-control w-16 px-2 py-1 text-center text-xs font-bold disabled:opacity-50"
                />
              </div>
              <span className={`mt-1.5 block text-[10px] ${quantity <= maxAffordable ? 'text-emerald-300' : 'text-amber-300'}`}>
                Capacidade estimada com os saldos atuais: {maxAffordable} unidade(s). {quantity > maxAffordable && 'O servidor produzirá o que for possível e explicará onde parou.'}
              </span>
            </label>
          </div>

          {recipe.kind === 'equipment' && (
            <label title="Consumido uma vez por unidade. Melhora a distribuição de raridades, mas não garante uma raridade específica." className="block cursor-help text-xs text-slate-400">
              Catalisador opcional ⓘ
              <select
                value={catalyst}
                disabled={isProcessing}
                onChange={(e) => onCatalyst(e.target.value)}
                className="settlement-control disabled:opacity-50"
              >
                <option value="">Sem catalisador</option>
                <option value="quality_dust">Pó de Qualidade · Raro</option>
                <option value="prismatic_core">Núcleo Prismático · Épico</option>
              </select>
              {catalyst && <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{catalystPurpose[catalyst]}</span>}
            </label>
          )}

          {preview?.recipe_key === recipe.key && (
            <div className="settlement-choice space-y-2 border-slate-800 bg-slate-900 p-3 text-xs">
              <p className={preview.can_craft ? 'text-emerald-300' : 'text-rose-300'}>
                {preview.can_craft ? '✓ Requisitos atendidos' : preview.missing_requirements.map((req) => formatBlockedReason(req, definitions)).join(' · ')}
              </p>
              <p className="text-slate-400">Custo por unidade: {recipe.gold_cost} gold{preview.catalyst_cost ? ` · ${preview.catalyst_cost} catalisador` : ''}. O lote de {quantity} solicita até {recipe.gold_cost * quantity} gold.</p>
              {recipe.kind === 'equipment' && preview.rarity_chances && <div title="Probabilidades por unidade, calculadas com profissão, estação e catalisador atuais." className="cursor-help border-t border-slate-800 pt-2"><strong className="text-amber-300">Chances de raridade por item ⓘ</strong><div className="mt-1 flex flex-wrap gap-1">{Object.entries(preview.rarity_chances).filter(([, chance]) => chance > 0).map(([rarity, chance]) => <span key={rarity} className={`settlement-choice rounded px-2 py-1 ${rarityClass[rarity] || 'text-slate-300'}`}>{rarityLabel[rarity] || rarity}: {(chance * 100).toFixed(1)}%</span>)}</div></div>}
            </div>
          )}

          {batchResult?.recipe_key === recipe.key && (
            <div className={`settlement-panel p-3 text-xs shadow-md ${batchResult.completed === batchResult.requested ? 'settlement-panel-positive pixel-alert-frame pixel-alert-success text-emerald-200' : 'settlement-panel-accent pixel-alert-frame pixel-alert-warning text-amber-200'}`}>
              <p className="font-black">🔨 Resultado real do lote: {batchResult.completed}/{batchResult.requested} concluído(s)</p>
              <p className="mt-1">Falhas aleatórias totais: {batchResult.random_failures}.</p>
              {batchResult.rarity_counts && Object.keys(batchResult.rarity_counts).length > 0 && <p className="mt-1">Raridades: {Object.entries(batchResult.rarity_counts).map(([rarity, count]) => `${rarity} x${count}`).join(' · ')}</p>}
              {batchResult.pending_count > 0 && <p className="mt-1">📦 {batchResult.pending_count} item(ns) foram para a carga segura porque a mochila não comportou.</p>}
              {batchResult.stop_reason && <p className="settlement-choice mt-2 border-slate-800 bg-slate-950/40 p-2 text-amber-100">Motivo da parada: {formatBlockedReason(batchResult.stop_reason, definitions)}</p>}
            </div>
          )}

          <button
            disabled={!preview?.can_craft || preview.recipe_key !== recipe.key || isProcessing || maxAffordable < 1}
            onClick={handleProcessCraft}
            className="pixel-btn pixel-btn-gold w-full py-3 text-xs text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isProcessing ? (
              <span>🔨 Servidor processando o lote de {quantity}…</span>
            ) : (
              <span>Produzir {quantity > 1 ? `${quantity}x ` : ''}manualmente</span>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

function CommunityKnowledgePanel({ catalog, professions, recipeStats }: {
  catalog: GameCatalogData;
  professions: ProfessionProgress[];
  recipeStats: Record<string, ProfessionRecipeStats>;
}) {
  const progressByKey = Object.fromEntries(professions.map((profession) => [profession.profession_key, profession]));
  const groupedProfessions = [
    { key: 'gathering', label: 'Coleta', icon: '🌲', professions: catalog.professions.filter((profession) => profession.category === 'gathering') },
    { key: 'crafting', label: 'Artesanato', icon: '⚒️', professions: catalog.professions.filter((profession) => profession.category !== 'gathering') },
  ];

  return (
    <section className="settlement-panel settlement-panel-info">
      <div className="settlement-panel-header">
        <div>
          <h3 className="settlement-panel-title text-sky-200">📚 Conhecimento da Comunidade</h3>
          <p className="settlement-panel-subtitle">Experiência coletiva do assentamento. Ela libera receitas e melhora a qualidade do que é produzido; não é a soma dos níveis individuais dos moradores.</p>
        </div>
        <span className="rounded border border-sky-700/60 bg-sky-950/40 px-2 py-1 text-[9px] font-pixel-heading text-sky-200">PROGRESSÃO COLETIVA</span>
      </div>
      <div className="space-y-3">
        {groupedProfessions.map((group) => (
          <div key={group.key}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-pixel-heading uppercase tracking-wider text-slate-400">
              <span>{group.icon}</span>{group.label}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {group.professions.map((definition) => {
                const progress = progressByKey[definition.key];
                const level = progress?.level || 1;
                const requiredXP = progress?.xp_required || 1;
                const percent = Math.min(100, ((progress?.experience || 0) * 100) / requiredXP);
                const stats = recipeStats[definition.key];
                const nextLevel = stats?.requiredLevels.filter((required) => required > level).sort((a, b) => a - b)[0];
                return (
                  <div key={definition.key} className="settlement-choice bg-slate-950/55 p-2.5" title={definition.description}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-100">
                        <PixelProfessionSprite professionKey={definition.key} size="sm" />
                        <span className="truncate">{definition.name}</span>
                      </span>
                      <strong className="shrink-0 font-pixel-heading text-emerald-300">Nv. {level}</strong>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-slate-900">
                      <div className="h-full rounded bg-sky-400 transition-all duration-300" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-1 flex justify-between gap-2 text-[9px] text-slate-400">
                      <span>{progress?.experience || 0}/{progress?.xp_required || 0} XP</span>
                      <span>{stats?.discovered || 0}/{stats?.total || 0} receitas</span>
                    </div>
                    <p className="mt-1 truncate text-[9px] text-sky-300/80">
                      {nextLevel ? `Próximo requisito: Nv. ${nextLevel}` : 'Nível máximo das receitas atuais'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResidentCard({ resident, catalog, communityProfessions, recipeStats }: {
  resident: SettlementResident;
  catalog: GameCatalogData;
  communityProfessions: Record<string, ProfessionProgress>;
  recipeStats: Record<string, ProfessionRecipeStats>;
}) {
  const statusLabels: Record<string, string> = {
    idle: 'Disponível no refúgio',
    collecting: 'Em expedição de coleta',
    crafting: 'Produzindo na oficina',
  };
  const statusHelp: Record<string, string> = {
    idle: 'Pode assumir uma nova ordem de coleta ou produção.',
    collecting: 'Retornará e depositará a produção automaticamente ao concluir.',
    crafting: 'Está atendendo uma Ambição do Herói e ficará livre quando a tentativa terminar.',
  };

  const isPioneer = ['tonho_three_axes', 'jurema_net_pull', 'cida_suspicious_tea', 'alencastro_forge', 'barnabe_wood', 'aurora_alchemy', 'elena_gems'].includes(resident.resident_key);
  const isLegendary = resident.traits.some((t) => t.toLowerCase().includes('lendario') || t.toLowerCase().includes('mestre')) || resident.title.includes('Grão-Mestre');
  const isEpic = resident.traits.some((t) => t.toLowerCase().includes('epico')) || resident.title.includes('Habilidoso');
  const isRare = resident.traits.some((t) => t.toLowerCase().includes('raro') || t.toLowerCase().includes('dupla')) || resident.skills.length >= 2 && !isPioneer;

  return (
    <article className="settlement-panel flex flex-col justify-between shadow-sm transition hover:border-slate-500">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="settlement-icon-frame h-11 w-11 rounded-xl">
              <PixelProfessionSprite professionKey={resident.skills[0]?.skill_key || 'miner'} size="lg" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-pixel-heading text-slate-100 text-xs">{resident.name}</h3>
                {isLegendary && (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-pixel-heading bg-amber-950 border border-amber-500/80 text-amber-300">
                    Lendário
                  </span>
                )}
                {isEpic && !isLegendary && (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-pixel-heading bg-purple-950 border border-purple-500/80 text-purple-300">
                    Épico
                  </span>
                )}
                {isPioneer && (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-pixel-heading bg-amber-950 border border-amber-600/70 text-amber-300">
                    ⭐ Pioneiro
                  </span>
                )}
                {isRare && !isPioneer && !isEpic && !isLegendary && (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-pixel-heading bg-sky-950 border border-sky-500/80 text-sky-300">
                    Raro
                  </span>
                )}
                {!isLegendary && !isEpic && !isRare && !isPioneer && (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-pixel-heading bg-slate-800 text-slate-400">
                    Comum
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-300/90 font-pixel-body">{resident.title}</p>
              <span
                title={statusHelp[resident.status] || resident.status}
                className={`mt-1 inline-block cursor-help rounded px-2 py-0.2 text-[9px] font-pixel-heading ${
                  resident.status === 'idle'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    : resident.status === 'crafting'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                    : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                }`}
              >
                {statusLabels[resident.status] || resident.status}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {resident.traits
            .filter((t) => !t.toLowerCase().startsWith('raridade:'))
            .map((trait) => (
              <span key={trait} className="settlement-choice rounded px-2 py-0.5 text-[9px] text-slate-300 font-pixel-body">
                {trait}
              </span>
            ))}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2.5">
        <span className="text-[9px] font-pixel-heading text-slate-400 uppercase tracking-wider block">Profissões:</span>
        {resident.skills.map((skill) => {
          const profession = catalog.professions.find((entry) => entry.key === skill.skill_key);
          const pct = Math.min(100, (skill.experience * 100) / Math.max(1, skill.xp_required));
          const community = communityProfessions[skill.skill_key];
          const stats = recipeStats[skill.skill_key];
          const nextLevel = stats?.requiredLevels.filter((required) => required > (community?.level || 1)).sort((a, b) => a - b)[0];
          return (
            <div key={skill.skill_key} className="settlement-choice rounded bg-slate-900/90 p-1.5 font-pixel-body">
              <div className="flex justify-between text-[10px] text-slate-200">
                <span className="flex items-center gap-1.5">
                  <PixelProfessionSprite professionKey={skill.skill_key} size="sm" />
                  <span>{profession?.name || professionLabels[skill.skill_key] || skill.skill_key}</span>
                </span>
                <span className="font-pixel-heading text-emerald-400">Habilidade Nv. {skill.level}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-950">
                <div className="h-full bg-emerald-500 rounded transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex justify-between gap-2 text-[9px] text-slate-400">
                <span>Individual: {skill.experience}/{skill.xp_required} XP</span>
                <span>Comunidade: Nv. {community?.level || 1}</span>
              </div>
              <p className="mt-1 truncate text-[9px] text-slate-500">
                {stats?.discovered || 0}/{stats?.total || 0} receitas descobertas{nextLevel ? ` · próximo Nv. ${nextLevel}` : ''}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
