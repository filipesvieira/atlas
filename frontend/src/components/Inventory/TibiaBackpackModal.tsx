import { useState, useEffect } from 'react';
import {
  ItemIcon,
  getCleanItemName,
  getItemAttack,
  getItemStatBadge,
  getRarityStyle,
  BonusBadges,
  getSlotLabel,
  getHandsBadge,
} from './ItemIcon';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';
import type { DerivedStats } from '../../hooks/useGameSocket';
import { BackpackCapacityBar } from './BackpackCapacityBar';
import { BackpackFilterBar } from './BackpackFilterBar';
import { ACCESSORY_SUBCATEGORIES, accessorySubcategoryMatches, weaponSubcategoryMatches } from '../../game/equipmentFilters';
import { getBagSlotBonus } from '../../game/bagCapacity';

export interface Item {
  id: string;
  name: string;
  attack?: number;
  physical_attack?: number;
  magic_attack?: number;
  defense: number;
  weight: number;
  hands?: number;
  rarity: string;
  special_effect: string;
  value_gold?: number;
  required_level?: number;
  melee_power_bonus?: number;
  ranged_power_bonus?: number;
  magic_power_bonus?: number;
  bonus_hp?: number;
  bonus_mp?: number;
  gold_bonus?: number;
  crit_chance?: number;
  lifesteal?: number;
  mana_regen?: number;
  movement_speed_bonus?: number;
  weapon_type?: string;
  slot_type?: string;
  item_kind?: 'equipment' | 'skill_book' | 'construction_manual' | 'quest';
  template_key?: string;
  visual_key?: string;
  set_key?: string;
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
  totalWeight?: number;
  maxCapacity?: number;
  maxSlots?: number;
  totalAttack?: number;
  totalDefense?: number;
  onEquipItem?: (itemId: string, slot: string) => void;
  onUnequipItem?: (slot: string) => void;
  onBulkSell?: (itemIds: string[]) => void;
  onLearnBlueprint?: (itemId: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Todos', slotKey: 'bag' },
  { id: 'weapons', label: 'Armas', weaponKey: 'sword' },
  { id: 'shields', label: 'Escudos', slotKey: 'offhand' },
  { id: 'helmets', label: 'Elmos', slotKey: 'head' },
  { id: 'armors', label: 'Armaduras', slotKey: 'chest' },
  { id: 'legs', label: 'Calças', slotKey: 'legs' },
  { id: 'boots', label: 'Botas', slotKey: 'boots' },
  { id: 'accessories', label: 'Acessórios', slotKey: 'necklace' },
  { id: 'bags', label: 'Mochilas', slotKey: 'bag' },
];

const RARITIES = ['all', 'Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico', 'Divino'];
const EQUIPPABLE_SLOT_TYPES = new Set([
  'head',
  'necklace',
  'chest',
  'mainhand',
  'offhand',
  'legs',
  'boots',
  'ring',
  'ammo',
  'bag',
]);

interface ModalEquipSlotProps {
  item?: Item | null;
  label: string;
  slotKey: string;
  onUnequip?: (slot: string) => void;
  onMouseEnter?: (e: React.MouseEvent, item: Item) => void;
  onMouseMove?: (e: React.MouseEvent, item: Item) => void;
  onMouseLeave?: () => void;
}

function ModalEquipSlot({
  item,
  label,
  slotKey,
  onUnequip,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: ModalEquipSlotProps) {
  const style = item
    ? getRarityStyle(item.rarity)
    : {
        border: 'border-slate-800 bg-slate-950/80',
        text: 'text-slate-600',
        badgeBg: 'bg-slate-900',
        badgeBorder: 'border-slate-800',
        badgeText: 'text-slate-400',
      };
  const statBadge = getItemStatBadge(item);

  return (
    <div
      onClick={() => item && onUnequip && onUnequip(slotKey)}
      onMouseEnter={(e) => item && onMouseEnter && onMouseEnter(e, item)}
      onMouseMove={(e) => item && onMouseMove && onMouseMove(e, item)}
      onMouseLeave={onMouseLeave}
      className={`w-12 h-12 pixel-slot rounded flex flex-col items-center justify-center relative cursor-pointer group transition-all shrink-0 ${
        item ? style.border : 'border-slate-800 bg-slate-950/80'
      }`}
    >
      {item ? (
        <div className="flex flex-col items-center justify-center relative w-full h-full p-0.5 pointer-events-none">
          <ItemIcon
            name={item.name}
            slotType={slotKey}
            specialEffect={item.special_effect}
            rarity={item.rarity}
            size="sm"
            className={`${style.text} group-hover:scale-105 transition-transform`}
          />
          {statBadge && (
            <div className={`text-[7px] font-mono font-bold leading-none mt-0.5 ${statBadge.colorClass}`}>
              {statBadge.text}
            </div>
          )}
        </div>
      ) : (
        <div className="opacity-20 filter grayscale pointer-events-none">
          <PixelItemSprite slotType={slotKey} size="sm" />
        </div>
      )}
      <span className="text-[7px] font-pixel-body text-slate-400 absolute -bottom-1 bg-slate-950 px-0.5 rounded border border-slate-800 scale-90 truncate max-w-full pointer-events-none">
        {label}
      </span>
    </div>
  );
}

interface HoveredTooltipData {
  item: Item;
  slotKey: string;
  isEquipped: boolean;
  x: number;
  y: number;
}

export function TibiaBackpackModal({
  isOpen,
  onClose,
  character,
  derivedStats = null,
  backpack = [],
  equipment = {},
  totalAttack = 15,
  totalDefense = 5,
  maxCapacity = 1500,
  maxSlots = 20,
  onEquipItem,
  onUnequipItem,
  onBulkSell,
  onLearnBlueprint,
}: TibiaBackpackModalProps) {
  const [inspectedItem, setInspectedItem] = useState<Item | null>(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [weaponFilter, setWeaponFilter] = useState('all');
  const [accessoryFilter, setAccessoryFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredTooltip, setHoveredTooltip] = useState<HoveredTooltipData | null>(null);

  // Fechar com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Limpar estado ao fechar
  useEffect(() => {
    if (!isOpen) {
      setInspectedItem(null);
      setMultiSelectedIds([]);
      setHoveredTooltip(null);
      setSearchQuery('');
      setCategoryFilter('all');
      setWeaponFilter('all');
      setAccessoryFilter('all');
      setRarityFilter('all');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const safeBackpack = Array.isArray(backpack) ? backpack.filter(Boolean) : [];
  const safeEquipment = equipment || {};
  const equipList = Object.values(safeEquipment).filter(Boolean) as Item[];
  const totalLifesteal = equipList.reduce((sum, item) => sum + (item.lifesteal || 0), 0);
  const totalGoldBonus = equipList.reduce((sum, item) => sum + (item.gold_bonus || 0), 0);
  // Equipamentos vestidos também ocupam capacidade, assim como no cálculo
  // autoritativo do backend (GameSession.GetTotalWeight).
  const equippedWeight = equipList.reduce((acc, item) => acc + (item?.weight || 0), 0);
  const currentWeight = safeBackpack.reduce((acc, item) => acc + (item?.weight || 0), 0) + equippedWeight;
  const charLevel = character?.level || 1;
  const getSellValue = (item: Item): number => Math.max(0, Number(item.value_gold) || 0);
  const formatGold = (value: number): string => value.toLocaleString('pt-BR');

  const getItemSlotType = (item: Item): string => {
    if (item.slot_type) return item.slot_type;
    const nameClean = item.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (
      item.weapon_type ||
      nameClean.includes('espada') ||
      nameClean.includes('machado') ||
      nameClean.includes('clava') ||
      nameClean.includes('maca') ||
      nameClean.includes('arco') ||
      nameClean.includes('varinha') ||
      nameClean.includes('cajado') ||
      nameClean.includes('lamina')
    )
      return 'mainhand';
    if (nameClean.includes('escudo') || nameClean.includes('broquel')) return 'offhand';
    if (
      nameClean.includes('capacete') ||
      nameClean.includes('elmo') ||
      nameClean.includes('coifa') ||
      nameClean.includes('tiara') ||
      nameClean.includes('coroa')
    )
      return 'head';
    if (
      nameClean.includes('armadura') ||
      nameClean.includes('cota') ||
      nameClean.includes('peitoral') ||
      nameClean.includes('robe') ||
      nameClean.includes('tunica')
    )
      return 'chest';
    if (nameClean.includes('calca') || nameClean.includes('grevas')) return 'legs';
    if (nameClean.includes('bota') || nameClean.includes('sapato') || nameClean.includes('sandalia'))
      return 'boots';
    if (nameClean.includes('anel') || nameClean.includes('alianca')) return 'ring';
    if (nameClean.includes('colar') || nameClean.includes('amuleto') || nameClean.includes('talisma'))
      return 'necklace';
    if (nameClean.includes('flecha') || nameClean.includes('municao')) return 'ammo';
    if (nameClean.includes('mochila') || nameClean.includes('bolsa')) return 'bag';
    if (nameClean.includes('livro') || nameClean.includes('tome') || item.item_kind === 'skill_book')
      return 'skill_book';
    if (
      nameClean.includes('projeto') ||
      nameClean.includes('manual') ||
      item.item_kind === 'construction_manual'
    )
      return 'manual';
    return 'misc';
  };

  const filteredBackpack = safeBackpack.filter((item) => {
    if (!item) return false;
    const slotType = getItemSlotType(item);

    if (categoryFilter === 'weapons' && slotType !== 'mainhand') return false;
    if (categoryFilter === 'shields' && slotType !== 'offhand') return false;
    if (categoryFilter === 'helmets' && slotType !== 'head') return false;
    if (categoryFilter === 'armors' && slotType !== 'chest') return false;
    if (categoryFilter === 'legs' && slotType !== 'legs') return false;
    if (categoryFilter === 'boots' && slotType !== 'boots') return false;
    if (categoryFilter === 'accessories' && slotType !== 'necklace' && slotType !== 'ring' && slotType !== 'ammo') return false;
    if (categoryFilter === 'bags' && slotType !== 'bag') return false;
    if (categoryFilter === 'ammos' && slotType !== 'ammo') return false;
    if (weaponFilter !== 'all' && (slotType !== 'mainhand' || !weaponSubcategoryMatches(item, weaponFilter))) return false;
    if (accessoryFilter !== 'all' && (slotType !== 'necklace' && slotType !== 'ring' && slotType !== 'ammo' || !accessorySubcategoryMatches(item, accessoryFilter))) return false;

    if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchEffect = item.special_effect?.toLowerCase().includes(q);
      const matchRarity = item.rarity?.toLowerCase().includes(q);
      if (!matchName && !matchEffect && !matchRarity) return false;
    }

    return true;
  });

  const categoryCounts = safeBackpack.reduce((acc: Record<string, number>, item) => {
    if (!item) return acc;
    const slotType = getItemSlotType(item);
    acc['all'] = (acc['all'] || 0) + 1;
    if (slotType === 'mainhand') acc['weapons'] = (acc['weapons'] || 0) + 1;
    if (slotType === 'offhand') acc['shields'] = (acc['shields'] || 0) + 1;
    if (slotType === 'head') acc['helmets'] = (acc['helmets'] || 0) + 1;
    if (slotType === 'chest') acc['armors'] = (acc['armors'] || 0) + 1;
    if (slotType === 'legs') acc['legs'] = (acc['legs'] || 0) + 1;
    if (slotType === 'boots') acc['boots'] = (acc['boots'] || 0) + 1;
    if (slotType === 'necklace' || slotType === 'ring' || slotType === 'ammo') acc['accessories'] = (acc['accessories'] || 0) + 1;
    if (slotType === 'bag') acc['bags'] = (acc['bags'] || 0) + 1;
    if (slotType === 'ammo') acc['ammos'] = (acc['ammos'] || 0) + 1;
    return acc;
  }, {});
  const accessoryCounts = safeBackpack.reduce((acc: Record<string, number>, item) => {
    if (!item) return acc;
    const slotType = getItemSlotType(item);
    if (slotType !== 'necklace' && slotType !== 'ring' && slotType !== 'ammo') return acc;
    ACCESSORY_SUBCATEGORIES.forEach(({ id }) => {
      if (accessorySubcategoryMatches(item, id)) acc[id] = (acc[id] || 0) + 1;
    });
    return acc;
  }, {});
  const weaponCounts = safeBackpack.reduce((acc: Record<string, number>, item) => {
    if (!item || getItemSlotType(item) !== 'mainhand') return acc;
    ['all', 'sword', 'axe', 'club', 'bow', 'wand', 'staff'].forEach((weaponType) => {
      if (weaponSubcategoryMatches(item, weaponType)) acc[weaponType] = (acc[weaponType] || 0) + 1;
    });
    return acc;
  }, {});

  const activeMultiSelectedIds = multiSelectedIds.filter((id) =>
    safeBackpack.some((item) => item.id === id)
  );
  const activeMultiSelectedGold = safeBackpack
    .filter((item) => activeMultiSelectedIds.includes(item.id))
    .reduce((sum, item) => sum + getSellValue(item), 0);
  const filteredGold = filteredBackpack.reduce((sum, item) => sum + getSellValue(item), 0);
  const backpackGold = safeBackpack.reduce((sum, item) => sum + getSellValue(item), 0);

  const areAllFilteredSelected =
    filteredBackpack.length > 0 &&
    filteredBackpack.every((it) => activeMultiSelectedIds.includes(it.id));

  const handleToggleSelectAll = () => {
    if (areAllFilteredSelected) {
      const filteredIds = new Set(filteredBackpack.map((it) => it.id));
      setMultiSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
      setInspectedItem(null);
    } else {
      const filteredIds = filteredBackpack.map((it) => it.id);
      setMultiSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
      setInspectedItem(filteredBackpack[0] || null);
    }
  };

  // Clique item a item: alterna a seleção. Se desmarcado, limpa/atualiza a inspeção
  const handleItemClick = (item: Item) => {
    setMultiSelectedIds((prev) => {
      const isAlreadySelected = prev.includes(item.id);
      if (isAlreadySelected) {
        const next = prev.filter((id) => id !== item.id);
        if (inspectedItem?.id === item.id) {
          const nextInspectedId = next[next.length - 1];
          const nextItem = nextInspectedId
            ? safeBackpack.find((i) => i.id === nextInspectedId) || null
            : null;
          setInspectedItem(nextItem);
        }
        return next;
      } else {
        setInspectedItem(item);
        return [...prev, item.id];
      }
    });
  };

  const handleItemDoubleClick = (item: Item) => {
    if (!onEquipItem) return;

    const slot = getItemSlotType(item);
    if (!EQUIPPABLE_SLOT_TYPES.has(slot)) return;

    // O botão de equipar continua sendo a referência visual para itens
    // bloqueados; o duplo clique não deve enviar uma ação que o jogador sabe
    // de antemão que não pode concluir.
    if (item.required_level && charLevel < item.required_level) {
      setInspectedItem(item);
      setMultiSelectedIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
      return;
    }

    onEquipItem(item.id, slot);
    setHoveredTooltip(null);
    setInspectedItem(null);
    setMultiSelectedIds((prev) => prev.filter((id) => id !== item.id));
  };

  const handleHoverItem = (
    e: React.MouseEvent,
    item: Item,
    slotKey?: string,
    isEquipped?: boolean
  ) => {
    const tooltipW = 264;
    const tooltipH = 240;

    let left = e.clientX + 16;
    if (left + tooltipW > window.innerWidth - 12) {
      left = e.clientX - tooltipW - 16;
    }
    if (left < 10) {
      left = 10;
    }

    let top = e.clientY - 30;
    if (top + tooltipH > window.innerHeight - 12) {
      top = window.innerHeight - tooltipH - 12;
    }
    if (top < 10) {
      top = 10;
    }

    setHoveredTooltip({
      item,
      slotKey: slotKey || getItemSlotType(item),
      isEquipped: Boolean(isEquipped),
      x: left,
      y: top,
    });
  };

  const handleMouseLeaveItem = () => {
    setHoveredTooltip(null);
  };

  const handleSellInspectedItem = () => {
    if (!inspectedItem || !onBulkSell) return;
    onBulkSell([inspectedItem.id]);
    setMultiSelectedIds((prev) => prev.filter((id) => id !== inspectedItem.id));
    setInspectedItem(null);
  };

  const handleSellMultiSelected = () => {
    if (activeMultiSelectedIds.length === 0 || !onBulkSell) return;
    onBulkSell(activeMultiSelectedIds);
    setMultiSelectedIds([]);
    setInspectedItem(null);
  };

  const handleSellAllOrFiltered = () => {
    if (!onBulkSell || safeBackpack.length === 0) return;
    const targetItems = hasActiveFilters ? filteredBackpack : safeBackpack;
    const ids = targetItems.map((i) => i.id);
    if (ids.length > 0) {
      onBulkSell(ids);
      setMultiSelectedIds([]);
      setInspectedItem(null);
    }
  };

  const hasActiveFilters =
    categoryFilter !== 'all' || weaponFilter !== 'all' || accessoryFilter !== 'all' || rarityFilter !== 'all' || searchQuery.trim().length > 0;
  const clearFilters = () => {
    setCategoryFilter('all');
    setWeaponFilter('all');
    setAccessoryFilter('all');
    setRarityFilter('all');
    setSearchQuery('');
  };

  // Garante que o item inspecionado só é exibido se estiver ativamente marcado
  const activeInspectedItem =
    inspectedItem && activeMultiSelectedIds.includes(inspectedItem.id)
      ? safeBackpack.find((it) => it.id === inspectedItem.id) || null
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden select-none animate-in fade-in">
      {/* Modal Card Amplo e Sem Overflow Horizontal */}
      <div className="pixel-card-gold rounded-2xl w-full max-w-5xl max-h-[92vh] h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="pixel-card-header pixel-card-header-gold px-5 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <PixelItemSprite slotType="bag" size="sm" />
            <h3 className="font-pixel-heading text-sm text-amber-400">
              Mochila & Inventário do Aventureiro
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded border border-amber-700/70 bg-amber-950/40 px-2.5 py-1 text-[11px] font-pixel-heading text-amber-200"
              title="Ouro disponível do herói"
            >
              💰 {formatGold(Number(character?.gold_bank) || 0)} Gold
            </span>
            <button
              onClick={onClose}
              className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-xs"
            >
              ✕ Fechar
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col md:flex-row gap-4 min-h-0 min-w-0">
          {/* Coluna Esquerda: Equipamento Ativo & Atributos em Tempo Real */}
          <div className="w-full md:w-64 bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-3 shrink-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="w-full flex flex-col items-center gap-2.5">
              <h4 className="font-pixel-heading text-xs text-amber-400 mb-0.5">
                Equipamento Ativo
              </h4>

              {/* Grid 3x4 de Equipamentos */}
              <div className="flex gap-2">
                <ModalEquipSlot
                  item={safeEquipment.necklace}
                  label="Colar"
                  slotKey="necklace"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'necklace', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'necklace', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
                <ModalEquipSlot
                  item={safeEquipment.head}
                  label="Elmo"
                  slotKey="head"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'head', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'head', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
                <ModalEquipSlot
                  item={safeEquipment.bag}
                  label="Mochila"
                  slotKey="bag"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'bag', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'bag', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
              </div>
              <div className="flex gap-2">
                <ModalEquipSlot
                  item={safeEquipment.mainhand}
                  label="Arma"
                  slotKey="mainhand"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'mainhand', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'mainhand', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
                <ModalEquipSlot
                  item={safeEquipment.chest}
                  label="Armadura"
                  slotKey="chest"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'chest', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'chest', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
                <ModalEquipSlot
                  item={safeEquipment.offhand}
                  label="Escudo"
                  slotKey="offhand"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'offhand', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'offhand', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
              </div>
              <div className="flex gap-2">
                <ModalEquipSlot
                  item={safeEquipment.ring}
                  label="Anel"
                  slotKey="ring"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'ring', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'ring', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
                <ModalEquipSlot
                  item={safeEquipment.legs}
                  label="Calça"
                  slotKey="legs"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'legs', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'legs', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
                <ModalEquipSlot
                  item={safeEquipment.ammo}
                  label="Munição"
                  slotKey="ammo"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'ammo', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'ammo', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
              </div>
              <div className="flex gap-2">
                <div className="w-12 h-12"></div>
                <ModalEquipSlot
                  item={safeEquipment.boots}
                  label="Bota"
                  slotKey="boots"
                  onUnequip={onUnequipItem}
                  onMouseEnter={(e, it) => handleHoverItem(e, it, 'boots', true)}
                  onMouseMove={(e, it) => handleHoverItem(e, it, 'boots', true)}
                  onMouseLeave={handleMouseLeaveItem}
                />
                <div className="w-12 h-12"></div>
              </div>
            </div>

            {/* Painel Completo de Atributos do Herói em Tempo Real */}
            <div className="w-full space-y-2 pt-2 border-t border-slate-800 text-[10px] font-pixel-body">
              {/* Atributos Principais de Combate */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex justify-between items-center" title="Ataque Total (Arma + Bônus)">
                  <span className="text-slate-400">⚔️ Ataque:</span>
                  <span className="text-amber-400 font-bold font-pixel-heading">{totalAttack}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex justify-between items-center" title="Defesa Total (Armadura, Escudo + Bônus)">
                  <span className="text-slate-400">🛡️ Defesa:</span>
                  <span className="text-sky-400 font-bold font-pixel-heading">{totalDefense}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex justify-between items-center" title="Vida Máxima">
                  <span className="text-slate-400">❤️ Max HP:</span>
                  <span className="text-rose-400 font-bold font-pixel-heading">{derivedStats?.max_health ?? character?.max_health ?? 100}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex justify-between items-center" title="Mana Máxima">
                  <span className="text-slate-400">💧 Max MP:</span>
                  <span className="text-blue-400 font-bold font-pixel-heading">{derivedStats?.max_mana ?? character?.max_mana ?? 50}</span>
                </div>
              </div>

              {/* Especialização S1: maestria por uso em vez de atributos manuais */}
              <div className="p-1.5 bg-slate-900/70 rounded border border-slate-800/80 space-y-1">
                <div className="text-[9px] font-pixel-heading text-slate-400 uppercase tracking-wider">
                  Especialização por uso
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <span className="text-slate-300">🎓 Maestria: <strong className="text-amber-300 font-pixel-heading">{derivedStats?.active_mastery_key || '—'}</strong></span>
                  <span className="text-slate-300">Nv.: <strong className="text-amber-300 font-pixel-heading">{derivedStats?.active_mastery_level ?? 10}</strong></span>
                  <span className="text-slate-300">⚔️ Poder melee: <strong className="text-rose-300 font-pixel-heading">+{derivedStats?.melee_power_bonus ?? 0}</strong></span>
                  <span className="text-slate-300">🏹 Poder distância: <strong className="text-emerald-300 font-pixel-heading">+{derivedStats?.ranged_power_bonus ?? 0}</strong></span>
                  <span className="text-slate-300">🔮 Poder mágico: <strong className="text-cyan-300 font-pixel-heading">+{derivedStats?.magic_power_bonus ?? 0}</strong></span>
                  <span className="text-slate-300">🎒 Capacidade: <strong className="text-sky-300 font-pixel-heading">{derivedStats?.total_capacity ?? 0}</strong></span>
                </div>
              </div>

              {/* Bônus Secundários e Especiais de Equipamentos */}
              <div className="p-1.5 bg-slate-900/70 rounded border border-slate-800/80 space-y-1">
                <div className="text-[9px] font-pixel-heading text-slate-400 uppercase tracking-wider">
                  Bônus dos Equipamentos
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                  <div className="flex justify-between" title="Chance de Acerto Crítico">
                    <span className="text-slate-400">🎯 Crítico:</span>
                    <span className="text-purple-300 font-bold font-pixel-heading">{(derivedStats?.crit_chance ?? 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between" title="Regeneração de Mana contínua por segundo">
                    <span className="text-slate-400">🌀 Regen MP:</span>
                    <span className="text-cyan-300 font-bold font-pixel-heading">{(derivedStats?.mana_regen_per_second ?? 0).toFixed(1)}/s</span>
                  </div>
                  <div className="flex justify-between" title="Vampirismo / Roubo de Vida ao atacar">
                    <span className="text-slate-400">🩸 Vampirismo:</span>
                    <span className="text-red-400 font-bold font-pixel-heading">+{totalLifesteal}%</span>
                  </div>
                  <div className="flex justify-between" title="Bônus percentual de Ouro obtido">
                    <span className="text-slate-400">💰 Bônus Ouro:</span>
                    <span className="text-yellow-300 font-bold font-pixel-heading">+{totalGoldBonus}%</span>
                  </div>
                  <div className="flex justify-between" title="Velocidade de deslocamento na arena">
                    <span className="text-slate-400">🥾 Movimento:</span>
                    <span className="text-emerald-300 font-bold font-pixel-heading">+{Math.max(0, (((derivedStats?.movement_speed_multiplier ?? 1) - 1) * 100)).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Filtros e Grid Vertical da Mochila */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5 overflow-hidden">
            {/* Barra de Capacidade e Peso */}
            <BackpackCapacityBar
              totalWeight={currentWeight}
              maxCapacity={maxCapacity}
              usedSlots={safeBackpack.length}
              maxSlots={maxSlots}
              weightPercent={
                maxCapacity > 0
                  ? Math.min(100, Math.round((currentWeight / maxCapacity) * 100))
                  : 0
              }
            />

            {/* Barra de Filtros e Busca */}
            <BackpackFilterBar
              categories={CATEGORIES}
              rarities={RARITIES}
              categoryFilter={categoryFilter}
              weaponFilter={weaponFilter}
              accessoryFilter={accessoryFilter}
              rarityFilter={rarityFilter}
              searchQuery={searchQuery}
              categoryCounts={categoryCounts}
              weaponCounts={weaponCounts}
              accessoryCounts={accessoryCounts}
              hasActiveFilters={hasActiveFilters}
              onSelectCategory={(value) => { setCategoryFilter(value); if (value !== 'weapons') setWeaponFilter('all'); if (value !== 'accessories') setAccessoryFilter('all'); }}
              onSelectWeapon={setWeaponFilter}
              onSelectAccessory={setAccessoryFilter}
              onSelectRarity={setRarityFilter}
              onSearchChange={setSearchQuery}
              onClearFilters={clearFilters}
            />

            {/* Barra de Seleção / Contagem */}
              <div className="flex justify-between items-center bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-pixel-body shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectAll}
                  className="pixel-btn pixel-btn-dark px-2.5 py-0.5 text-[10px]"
                >
                  {areAllFilteredSelected
                    ? `Desmarcar Todos (${filteredBackpack.length})`
                    : `Selecionar Todos (${filteredBackpack.length})`}
                </button>
                {activeMultiSelectedIds.length > 0 && (
                  <button
                    onClick={() => {
                      setMultiSelectedIds([]);
                      setInspectedItem(null);
                    }}
                    className="text-slate-400 hover:text-slate-200 text-[10px] underline"
                  >
                    Desmarcar ({activeMultiSelectedIds.length})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span className="hidden sm:inline text-amber-300/80" title="Dê dois cliques em um equipamento para equipá-lo automaticamente.">
                  ⚔️ Duplo clique equipa
                </span>
                <span>{filteredBackpack.length} / {safeBackpack.length} itens</span>
              </div>
            </div>

            {/* Grade de Slots Compactos com Rolagem Exclusivamente Vertical */}
            <div className="flex-1 min-w-0 bg-slate-950/60 border border-slate-800 rounded-xl p-3 overflow-y-auto overflow-x-hidden">
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-7 gap-2.5">
                {filteredBackpack.map((item) => {
                  const isMultiSelected = activeMultiSelectedIds.includes(item.id);
                  const slotType = getItemSlotType(item);
                  const style = getRarityStyle(item.rarity);
                  const isLevelLocked = item.required_level
                    ? charLevel < item.required_level
                    : false;
                  const statBadge = getItemStatBadge(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                      onMouseEnter={(e) => handleHoverItem(e, item, slotType, false)}
                      onMouseMove={(e) => handleHoverItem(e, item, slotType, false)}
                      onMouseLeave={handleMouseLeaveItem}
                      className={`w-14 h-14 pixel-slot rounded p-1 flex flex-col items-center justify-between cursor-pointer transition-all relative group hover:scale-105 shrink-0 ${
                        isMultiSelected ? 'pixel-slot-selected' : style.border
                      }`}
                    >
                      {isLevelLocked && (
                        <span className="absolute -top-1 -left-1 bg-rose-600 text-white font-bold rounded-full w-3.5 h-3.5 text-[7px] flex items-center justify-center shadow pointer-events-none z-10">
                          🔒
                        </span>
                      )}

                      {isMultiSelected && (
                        <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 font-pixel-heading font-black rounded-full w-4 h-4 text-[8px] flex items-center justify-center shadow-lg border border-amber-300 pointer-events-none z-10">
                          ✓
                        </span>
                      )}

                      {/* Ícone Centrado */}
                      <div className="flex-1 flex items-center justify-center w-full pointer-events-none">
                        <ItemIcon
                          name={item.name}
                          slotType={slotType}
                          weaponType={item.weapon_type}
                          templateKey={item.template_key}
                          visualKey={item.visual_key}
                          setKey={item.set_key}
                          specialEffect={item.special_effect}
                          rarity={item.rarity}
                          size="md"
                          className={`${style.text} group-hover:scale-105 transition-transform`}
                        />
                      </div>

                      {/* Rodapé Estático com Stats e Peso */}
                      <div className="w-full flex justify-between items-end font-pixel-body text-[8px] leading-none pointer-events-none px-0.5">
                        <span
                          className={
                            statBadge?.colorClass || 'text-amber-400 font-bold'
                          }
                        >
                          {statBadge?.text || ''}
                        </span>
                        <span className="flex items-center gap-1 text-[7px] font-mono">
                          <span className="text-amber-300" title="Valor de venda">🪙{formatGold(getSellValue(item))}</span>
                          <span className="text-slate-400">{(item.weight || 0).toFixed(0)}oz</span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {!hasActiveFilters &&
                  filteredBackpack.length < maxSlots &&
                  Array.from({ length: maxSlots - filteredBackpack.length }).map((_, index) => (
                    <div
                      key={`empty_${index}`}
                      className="w-14 h-14 pixel-slot rounded flex items-center justify-center text-[10px] font-pixel-body text-slate-700 select-none opacity-30 shrink-0"
                    >
                      {filteredBackpack.length + index + 1}
                    </div>
                  ))}
              </div>

              {filteredBackpack.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 font-pixel-body text-xs">
                  <span>Nenhum item encontrado com os filtros atuais</span>
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-amber-400 hover:text-amber-300 underline"
                  >
                    Resetar Filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel Inferior: Item Inspecionado e Ações (Apenas exibido se houver item selecionado) */}
        {activeInspectedItem && (
          <div className="bg-slate-950 border-t-2 border-amber-500/50 p-3 flex flex-wrap justify-between items-center gap-3 shrink-0 animate-in slide-in-from-bottom-2">
            {(() => {
              const inspectedSlot = getItemSlotType(activeInspectedItem);
              const inspectedIsSkillBook = Boolean(
                activeInspectedItem.item_kind === 'skill_book' ||
                  inspectedSlot === 'skill_book' ||
                  activeInspectedItem.name.toLowerCase().includes('tome:') ||
                  activeInspectedItem.name.toLowerCase().includes('livro:')
              );
              const inspectedIsConstructionManual = Boolean(
                activeInspectedItem.item_kind === 'construction_manual' ||
                  inspectedSlot === 'manual' ||
                  activeInspectedItem.name.toLowerCase().includes('projeto:')
              );
              const isInspectedLevelLocked = activeInspectedItem.required_level
                ? charLevel < activeInspectedItem.required_level
                : false;
              const handsBadge = getHandsBadge(activeInspectedItem);

              return (
                <>
                  <div className="flex items-center gap-3 font-pixel-body min-w-0">
                    <ItemIcon
                      name={activeInspectedItem.name}
                      slotType={inspectedSlot}
                      weaponType={activeInspectedItem.weapon_type}
                      templateKey={activeInspectedItem.template_key}
                      visualKey={activeInspectedItem.visual_key}
                      setKey={activeInspectedItem.set_key}
                      specialEffect={activeInspectedItem.special_effect}
                      rarity={activeInspectedItem.rarity}
                      size="md"
                      className="text-amber-400 shrink-0"
                    />
                    <div className="min-w-0">
                      <h5 className="font-pixel-heading text-xs text-amber-300 flex items-center gap-2 flex-wrap">
                        <span className="truncate">
                          {getCleanItemName(activeInspectedItem.name)}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-pixel-heading ${
                            getRarityStyle(activeInspectedItem.rarity).badgeBg
                          } ${getRarityStyle(activeInspectedItem.rarity).badgeBorder} ${
                            getRarityStyle(activeInspectedItem.rarity).badgeText
                          }`}
                        >
                          {activeInspectedItem.rarity}
                        </span>
                        {isInspectedLevelLocked && (
                          <span className="text-[8px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-pixel-heading">
                            🔒 Requer Lv. {activeInspectedItem.required_level}
                          </span>
                        )}
                      </h5>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span>
                          Slot:{' '}
                          <strong className="text-slate-300">
                            {getSlotLabel(inspectedSlot)}
                          </strong>
                        </span>
                        <span>
                          Peso:{' '}
                          <strong className="text-slate-300">
                            {(activeInspectedItem.weight || 0).toFixed(1)} oz
                          </strong>
                        </span>
                        {activeInspectedItem.magic_attack ? (
                          <span>
                            Magia:{' '}
                            <strong className="text-cyan-300">
                              +{activeInspectedItem.magic_attack}
                            </strong>
                          </span>
                        ) : (
                          <span>
                            Atk:{' '}
                            <strong className="text-rose-400">
                              +
                              {getItemAttack(activeInspectedItem)?.value ||
                                activeInspectedItem.attack ||
                                0}
                            </strong>
                          </span>
                        )}
                        <span>
                          Def:{' '}
                          <strong className="text-sky-400">
                            +{activeInspectedItem.defense || 0}
                          </strong>
                        </span>
                        <span>
                          Venda:{' '}
                          <strong className="text-amber-300">
                            🪙 {formatGold(getSellValue(activeInspectedItem))}
                          </strong>
                        </span>
                      </div>
                      {handsBadge && (
                        <div
                          className={`text-[9px] px-1.5 py-0.2 rounded border mt-1 inline-flex items-center gap-1 ${handsBadge.badgeClass}`}
                        >
                          <span>
                            {handsBadge.icon} {handsBadge.label}
                          </span>
                        </div>
                      )}
                      <BonusBadges item={activeInspectedItem} />
                    </div>
                  </div>

                    <div className="flex items-center gap-2 font-pixel-body shrink-0">
                    {inspectedIsSkillBook && onLearnBlueprint ? (
                      <button
                        disabled={isInspectedLevelLocked}
                        onClick={() => {
                          onLearnBlueprint(activeInspectedItem.id);
                          setInspectedItem(null);
                          setMultiSelectedIds((prev) =>
                            prev.filter((id) => id !== activeInspectedItem.id)
                          );
                        }}
                        className={`pixel-btn px-3.5 py-1.5 text-xs ${
                          isInspectedLevelLocked
                            ? 'pixel-btn-dark opacity-50 cursor-not-allowed'
                            : 'pixel-btn-purple'
                        }`}
                      >
                        📖 Aprender Magia
                      </button>
                    ) : inspectedIsConstructionManual && onLearnBlueprint ? (
                      <button
                        onClick={() => {
                          onLearnBlueprint(activeInspectedItem.id);
                          setInspectedItem(null);
                          setMultiSelectedIds((prev) =>
                            prev.filter((id) => id !== activeInspectedItem.id)
                          );
                        }}
                        className="pixel-btn pixel-btn-gold px-3.5 py-1.5 text-xs"
                      >
                        📜 Estudar Projeto
                      </button>
                    ) : (
                      onEquipItem && (
                        <button
                          disabled={isInspectedLevelLocked}
                          onClick={() => {
                            onEquipItem(activeInspectedItem.id, inspectedSlot);
                            setInspectedItem(null);
                            setMultiSelectedIds((prev) =>
                              prev.filter((id) => id !== activeInspectedItem.id)
                            );
                          }}
                          className={`pixel-btn px-3.5 py-1.5 text-xs ${
                            isInspectedLevelLocked
                              ? 'pixel-btn-dark opacity-50 cursor-not-allowed'
                              : 'pixel-btn-gold'
                          }`}
                        >
                          🛡️ Equipar Item
                        </button>
                      )
                    )}

                    {onBulkSell && (
                      <button
                        onClick={handleSellInspectedItem}
                        className="pixel-btn pixel-btn-emerald px-3.5 py-1.5 text-xs"
                      >
                        💰 Vender Item
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Rodapé do Modal com Vendas em Massa */}
        <div className="flex flex-wrap justify-between items-center border-t border-slate-800 bg-slate-950/90 px-5 py-3 gap-3 shrink-0 font-pixel-body">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">
              Itens Marcados:{' '}
              <strong className="text-amber-400 font-pixel-heading">
                {activeMultiSelectedIds.length}
              </strong>
            </span>
            {activeMultiSelectedIds.length > 0 && (
              <span className="text-amber-300">
                Venda: <strong className="font-pixel-heading">🪙 {formatGold(activeMultiSelectedGold)}</strong>
              </span>
            )}
            {activeMultiSelectedIds.length > 0 && (
              <button
                onClick={() => {
                  setMultiSelectedIds([]);
                  setInspectedItem(null);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline"
              >
                Limpar Marcados
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {activeMultiSelectedIds.length > 0 && onBulkSell && (
              <button
                onClick={handleSellMultiSelected}
                className="pixel-btn pixel-btn-emerald px-4 py-1.5 text-xs font-pixel-heading flex items-center gap-1.5 shadow"
              >
                <span>💰</span> Vender Marcados ({activeMultiSelectedIds.length}) · +{formatGold(activeMultiSelectedGold)} ouro
              </button>
            )}

            {onBulkSell && (
              <button
                onClick={handleSellAllOrFiltered}
                disabled={safeBackpack.length === 0}
                className="pixel-btn pixel-btn-gold px-4 py-1.5 text-xs font-pixel-heading flex items-center gap-1.5 shadow disabled:opacity-40"
              >
                <span>💰</span>{' '}
                {hasActiveFilters
                  ? `Vender Filtrados (${filteredBackpack.length}) · +${formatGold(filteredGold)} ouro`
                  : `Vender Todos (${safeBackpack.length}) · +${formatGold(backpackGold)} ouro`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip Rico Renderizado no Overlay Superior do Modal (Livre de Cortes e Acima de Toda a Interface) */}
      {hoveredTooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredTooltip.x}px`,
            top: `${hoveredTooltip.y}px`,
            zIndex: 99999,
          }}
          className="pointer-events-none w-64 p-3.5 text-left pixel-card-gold rounded-xl shadow-2xl backdrop-blur-md font-pixel-body animate-in fade-in zoom-in-95 border-2 border-amber-500/80 bg-slate-950/95 select-none"
        >
          <div className="flex justify-between items-start gap-1">
            <div
              className={`font-pixel-heading text-xs ${
                getRarityStyle(hoveredTooltip.item.rarity).text
              }`}
            >
              {getCleanItemName(hoveredTooltip.item.name)}
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-pixel-body font-bold border ${
                getRarityStyle(hoveredTooltip.item.rarity).badgeBg
              } ${getRarityStyle(hoveredTooltip.item.rarity).badgeBorder} ${
                getRarityStyle(hoveredTooltip.item.rarity).badgeText
              }`}
            >
              {hoveredTooltip.item.rarity}
            </span>
          </div>

          <div className="text-[9px] text-slate-400 border-b border-slate-800 pb-1 mb-1 font-pixel-body">
            Slot: {getSlotLabel(hoveredTooltip.slotKey)}
          </div>

          {hoveredTooltip.item.required_level && hoveredTooltip.item.required_level > 1 && (
            <div
              className={`text-[10px] font-pixel-body font-bold mb-1.5 flex items-center gap-1 ${
                charLevel < hoveredTooltip.item.required_level
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            >
              <span>{charLevel < hoveredTooltip.item.required_level ? '🔒' : '✅'}</span>
              <span>Requer Nível {hoveredTooltip.item.required_level}</span>
            </div>
          )}

          {hoveredTooltip.slotKey === 'bag' && (
            <div className="text-[10px] text-amber-300 font-pixel-heading mb-1.5">
              🎒 Slots: +{getBagSlotBonus(hoveredTooltip.item.rarity)}
            </div>
          )}

          <div className="flex justify-between text-[10px] font-pixel-body mb-1">
            {hoveredTooltip.item.magic_attack ? (
              <span className="text-cyan-300 font-bold">
                Magia: +{hoveredTooltip.item.magic_attack}
              </span>
            ) : (
              <span className="text-rose-400 font-bold">
                Atk: +
                {getItemAttack(hoveredTooltip.item)?.value ||
                  hoveredTooltip.item.attack ||
                  0}
              </span>
            )}
            <span className="text-sky-400 font-bold">
              Def: +{hoveredTooltip.item.defense || 0}
            </span>
            <span className="text-slate-400">
              {(hoveredTooltip.item.weight || 0).toFixed(1)} oz
            </span>
          </div>

          <BonusBadges item={hoveredTooltip.item} />

          <div className="mt-1.5 border-t border-slate-800 pt-1 text-[10px] text-amber-300 font-pixel-heading">
            💰 Venda: +{formatGold(getSellValue(hoveredTooltip.item))} ouro
          </div>

          {(() => {
            const handsBadge = getHandsBadge(hoveredTooltip.item);
            if (!handsBadge) return null;
            return (
              <div
                className={`text-[9px] font-pixel-body px-1.5 py-0.5 rounded border mt-1.5 flex items-center justify-between gap-1 ${handsBadge.badgeClass}`}
              >
                <span className="font-bold">{handsBadge.label}</span>
                <span className="text-[8px] opacity-80">{handsBadge.shortLabel}</span>
              </div>
            );
          })()}

          {hoveredTooltip.item.special_effect && (
            <div className="text-[9px] text-purple-400 italic leading-tight mt-1.5 border-t border-slate-800 pt-1 font-pixel-body">
              {hoveredTooltip.item.special_effect}
            </div>
          )}

          <div className="mt-2 text-[9px] text-amber-400 font-pixel-body font-bold border-t border-slate-800 pt-1">
            {hoveredTooltip.isEquipped ? '(Clique para desequipar)' : '(Clique para marcar / inspecionar)'}
          </div>
        </div>
      )}
    </div>
  );
}