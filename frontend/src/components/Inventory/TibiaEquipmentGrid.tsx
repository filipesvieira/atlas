import { useState } from 'react';
import { TibiaBackpackModal, Item, EquipmentSlots } from './TibiaBackpackModal';
import { ItemIcon, getCleanItemName, getItemAttack, getRarityStyle, BonusBadges, getSlotLabel } from './ItemIcon';

export type { Item, EquipmentSlots };

interface TibiaEquipmentGridProps {
  character?: any;
  equipment?: EquipmentSlots;
  backpack?: Item[];
  cap?: number;
  totalAttack?: number;
  totalDefense?: number;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
  onEquipItem?: (itemId: string, slot: string) => void;
  onUnequipItem?: (slot: string) => void;
  onDiscardItem?: (itemId: string) => void;
  onBulkSell?: (itemIds: string[]) => void;
}

interface SlotItemProps {
  item?: Item | null;
  placeholderIcon: string;
  label: string;
  slotKey: string;
  charLevel?: number;
  onUnequip?: (slot: string) => void;
}

function SlotItem({ item, placeholderIcon, label, slotKey, charLevel = 1, onUnequip }: SlotItemProps) {
  const style = item ? getRarityStyle(item.rarity) : {
    border: 'border-slate-800 bg-slate-950/80 hover:border-slate-700',
    text: 'text-slate-600',
    bg: 'bg-slate-950/80',
    badgeBg: 'bg-slate-900',
    badgeBorder: 'border-slate-800',
    badgeText: 'text-slate-400',
    glow: '',
  };

  const cleanName = item ? getCleanItemName(item.name) : label;
  const isRightSlot = slotKey === 'bag' || slotKey === 'offhand' || slotKey === 'ammo';
  const tooltipPos = isRightSlot ? 'right-full mr-3 -top-2' : 'left-full ml-3 -top-2';
  const atkVal = item ? getItemAttack(item) : 0;
  const isLevelLocked = item?.required_level ? charLevel < item.required_level : false;

  return (
    <div
      onClick={() => item && onUnequip && onUnequip(slotKey)}
      className={`w-11 h-11 rounded-lg border flex flex-col items-center justify-center relative cursor-pointer transition-all group hover:z-40 ${
        item
          ? `${style.border} ${style.glow} shadow-md`
          : 'bg-slate-950/80 border-slate-800 text-slate-600 hover:border-slate-700'
      }`}
    >
      {item ? (
        <div className="flex flex-col items-center justify-center relative w-full h-full p-0.5">
          <ItemIcon
            name={item.name}
            slotType={slotKey}
            specialEffect={item.special_effect}
            size="md"
            className={`${style.text} opacity-90 transition-transform group-hover:scale-110`}
          />
          {(atkVal > 0 || (item.defense || 0) > 0) && (
            <div className="text-[8px] font-mono text-emerald-400 font-bold leading-none mt-0.5">
              +{atkVal > 0 ? `${atkVal}A` : `${item.defense}D`}
            </div>
          )}
        </div>
      ) : (
        <span className="text-base opacity-40 select-none">{placeholderIcon}</span>
      )}
      <span className="text-[8px] font-sans text-slate-500 absolute -bottom-1 bg-slate-900 px-0.5 rounded border border-slate-800 scale-90 truncate max-w-full">
        {label}
      </span>
      
      {/* Tooltip Hover Rico com Posicionamento Inteligente e Atributos Completos */}
      {item && (
        <div className={`hidden group-hover:flex absolute z-50 flex-col w-52 p-3 text-left bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl pointer-events-none backdrop-blur-sm animate-in fade-in zoom-in-95 ${tooltipPos}`}>
          <div className="flex justify-between items-start gap-1">
            <div className={`font-bold text-xs ${style.text}`}>{cleanName}</div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${style.badgeBg} ${style.badgeBorder} ${style.badgeText}`}>
              {item.rarity}
            </span>
          </div>
          
          <div className="text-[9px] text-slate-400 border-b border-slate-800 pb-1 mb-1 font-mono">
            Slot: {getSlotLabel(slotKey)}
          </div>

          {/* Requisito de Nível */}
          {item.required_level && item.required_level > 1 && (
            <div className={`text-[10px] font-mono font-bold mb-1.5 flex items-center gap-1 ${
              isLevelLocked ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              <span>{isLevelLocked ? '🔒' : '✅'}</span>
              <span>Requer Nível {item.required_level}</span>
            </div>
          )}

          {/* Estatísticas Principais */}
          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span className="text-rose-400 font-bold">Atk: +{atkVal}</span>
            <span className="text-sky-400 font-bold">Def: +{item.defense || 0}</span>
            <span className="text-slate-400">{(item.weight || 0).toFixed(1)} oz</span>
          </div>

          {/* Badges de Bônus de Atributos */}
          <BonusBadges item={item} />

          {/* Efeito Especial */}
          {item.special_effect && (
            <div className="text-[9px] text-purple-400 italic leading-tight mt-1.5 border-t border-slate-800 pt-1">
              {item.special_effect}
            </div>
          )}

          <div className="mt-2 text-[9px] text-amber-500 font-bold border-t border-slate-800 pt-1">
            (Clique para desequipar)
          </div>
        </div>
      )}
    </div>
  );
}

export function TibiaEquipmentGrid({
  character,
  equipment = {},
  backpack = [],
  cap = 1500,
  totalAttack = 15,
  totalDefense = 5,
  health = 150,
  maxHealth = 150,
  mana = 50,
  maxMana = 50,
  onEquipItem,
  onUnequipItem,
  onDiscardItem,
  onBulkSell,
}: TibiaEquipmentGridProps) {
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);

  const safeBackpack = Array.isArray(backpack) ? backpack : [];
  const safeEquipment = equipment || {};

  const hpPercent = Math.max(0, Math.min(100, Math.round((health / maxHealth) * 100)));
  const manaPercent = Math.max(0, Math.min(100, Math.round((mana / maxMana) * 100)));

  // Bônus de Peso e Slots por Raridade da Mochila (Bag)
  let bagCapBonus = 0;
  let bagSlotsBonus = 0;

  if (safeEquipment.bag) {
    switch (safeEquipment.bag.rarity) {
      case 'Comum':
        bagCapBonus = 200;
        bagSlotsBonus = 4;
        break;
      case 'Incomum':
        bagCapBonus = 350;
        bagSlotsBonus = 6;
        break;
      case 'Raro':
        bagCapBonus = 500;
        bagSlotsBonus = 8;
        break;
      case 'Lendário':
        bagCapBonus = 800;
        bagSlotsBonus = 12;
        break;
      default:
        bagCapBonus = 300;
        bagSlotsBonus = 8;
    }
  }

  const maxSlots = 20 + bagSlotsBonus;
  const effectiveCap = cap + bagCapBonus;

  // Peso total da mochila
  const backpackWeight = safeBackpack.reduce((sum, item) => sum + (item ? (item.weight || 0) : 0), 0);
  
  // Peso dos equipamentos
  const equipWeight = [
    safeEquipment.head, safeEquipment.chest, safeEquipment.legs, safeEquipment.boots,
    safeEquipment.mainhand, safeEquipment.offhand, safeEquipment.necklace, safeEquipment.ring,
    safeEquipment.ammo, safeEquipment.bag
  ].reduce((sum, item) => sum + (item ? (item.weight || 0) : 0), 0);

  const totalWeight = backpackWeight + equipWeight;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl text-slate-100 flex flex-col gap-3">
      {/* Visual Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
        <h3 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
          <span>🛡️</span> Equipamentos do Aventureiro
        </h3>
        <div className="flex gap-2 text-[11px] font-mono">
          <span className="text-amber-300 font-semibold">Atk: {totalAttack}</span>
          <span className="text-sky-300 font-semibold">Def: {totalDefense}</span>
        </div>
      </div>

      {/* Tibia Classic Bars (HP Vermelho / Mana Azul) */}
      <div className="space-y-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800 shadow-inner">
        {/* Barra de HP Tibia */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-rose-400 font-bold flex items-center gap-1">❤️ HP</span>
            <span className="text-rose-300 font-bold">{health} / {maxHealth}</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-rose-950 shadow-inner">
            <div
              className="bg-gradient-to-r from-rose-700 via-rose-500 to-rose-400 h-full transition-all duration-300 shadow"
              style={{ width: `${hpPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Barra de Mana Tibia */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-sky-400 font-bold flex items-center gap-1">💙 Mana</span>
            <span className="text-sky-300 font-bold">{mana} / {maxMana}</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-sky-950 shadow-inner">
            <div
              className="bg-gradient-to-r from-sky-700 via-sky-500 to-sky-400 h-full transition-all duration-300 shadow"
              style={{ width: `${manaPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Grid 3x4 Estilo Tibia */}
      <div className="flex flex-col items-center justify-center bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-inner">
        {/* Linha 1: Necklace | Head | Backpack */}
        <div className="flex gap-2.5 mb-2">
          <SlotItem item={safeEquipment.necklace} placeholderIcon="📿" label="Necklace" slotKey="necklace" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.head} placeholderIcon="🪖" label="Head" slotKey="head" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.bag} placeholderIcon="🎒" label="Bag" slotKey="bag" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
        </div>

        {/* Linha 2: MainHand | Chest | OffHand */}
        <div className="flex gap-2.5 mb-2">
          <SlotItem item={safeEquipment.mainhand} placeholderIcon="⚔️" label="Weapon" slotKey="mainhand" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.chest} placeholderIcon="🛡️" label="Chest" slotKey="chest" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.offhand} placeholderIcon="🛡️" label="Shield" slotKey="offhand" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
        </div>

        {/* Linha 3: Ring | Legs | Ammo */}
        <div className="flex gap-2.5 mb-2">
          <SlotItem item={safeEquipment.ring} placeholderIcon="💍" label="Ring" slotKey="ring" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.legs} placeholderIcon="👖" label="Legs" slotKey="legs" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.ammo} placeholderIcon="🏹" label="Ammo" slotKey="ammo" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
        </div>

        {/* Linha 4: Boots */}
        <div className="flex gap-2.5">
          <div className="w-11 h-11"></div>
          <SlotItem item={safeEquipment.boots} placeholderIcon="🥾" label="Boots" slotKey="boots" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <div className="w-11 h-11"></div>
        </div>

        {/* Capacidade (Cap) */}
        <div className="w-full flex justify-between items-center text-[11px] font-mono mt-3 pt-2 border-t border-slate-800 text-slate-400">
          <span>Capacidade (Cap):</span>
          <span className="text-amber-400 font-bold">{Math.max(0, effectiveCap - totalWeight).toFixed(1)} / {effectiveCap.toFixed(1)} oz</span>
        </div>
      </div>

      {/* Botão de Abertura da Mochila em Modal */}
      <div className="space-y-2">
        <button
          onClick={() => setIsBackpackOpen(true)}
          className="w-full py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex justify-between items-center px-4 shadow-lg transition-all border border-amber-400/40"
        >
          <span className="flex items-center gap-1.5">
            <span>🎒</span> Abrir Mochila & Inventário
          </span>
          <span className="font-mono bg-slate-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 text-[10px]">
            {safeBackpack.length} / {maxSlots} Slots
          </span>
        </button>
      </div>

      {/* Modal da Mochila Estilo Tibia com Equipamentos e Multi-seleção */}
      <TibiaBackpackModal
        isOpen={isBackpackOpen}
        onClose={() => setIsBackpackOpen(false)}
        character={character}
        backpack={safeBackpack}
        equipment={safeEquipment}
        equippedBag={safeEquipment.bag}
        totalAttack={totalAttack}
        totalDefense={totalDefense}
        totalWeight={totalWeight}
        maxCapacity={effectiveCap}
        maxSlots={maxSlots}
        onEquipItem={onEquipItem}
        onUnequipItem={onUnequipItem}
        onDiscardItem={onDiscardItem}
        onBulkSell={onBulkSell}
      />
    </div>
  );
}
