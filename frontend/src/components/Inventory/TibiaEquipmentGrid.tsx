import { useEffect, useState } from 'react';
import { TibiaBackpackModal, Item, EquipmentSlots } from './TibiaBackpackModal';
import { ItemIcon, getCleanItemName, getItemAttack, getItemStatBadge, getRarityStyle, BonusBadges, getSlotLabel, getHandsBadge } from './ItemIcon';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';
import { ResourceDepotButton } from '../Camp/ResourceDepotButton';
import { CampButton } from '../Camp/CampButton';
import type { DerivedStats } from '../../hooks/useGameSocket';
import { getBagSlotBonus } from '../../game/bagCapacity';

export interface TibiaEquipmentGridProps {
  character?: any;
  derivedStats?: DerivedStats | null;
  equipment?: EquipmentSlots;
  backpack?: Item[];
  cap?: number;
  totalAttack?: number;
  totalDefense?: number;
  storageUsed?: number;
  storageCapacity?: number;
  activeConstructionSlots?: number;
  maxConstructionSlots?: number;
  onOpenDepot?: () => void;
  onOpenCamp?: () => void;
  onEquipItem?: (itemId: string, slot: string) => void;
  onUnequipItem?: (slot: string) => void;
  onBulkSell?: (itemIds: string[]) => void;
  onLearnBlueprint?: (itemId: string) => void;
  openBackpackRequest?: number;
  compact?: boolean;
}

export interface SlotItemProps {
  item?: Item | null;
  label: string;
  slotKey: string;
  charLevel?: number;
  onUnequip?: (slot: string) => void;
}

export function SlotItem({ item, label, slotKey, charLevel = 1, onUnequip }: SlotItemProps) {
  const style = item ? getRarityStyle(item.rarity) : {
    border: 'border-slate-800 bg-slate-950/80',
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
  const statBadge = getItemStatBadge(item);
  const isLevelLocked = item?.required_level ? charLevel < item.required_level : false;

  return (
    <div
      onClick={() => item && onUnequip && onUnequip(slotKey)}
      className={`w-12 h-12 pixel-slot rounded flex flex-col items-center justify-center relative cursor-pointer transition-all group hover:z-40 ${
        item ? `${style.border} ${style.glow} shadow-md` : 'opacity-85'
      }`}
    >
      {item ? (
        <div className="flex flex-col items-center justify-center relative w-full h-full p-0.5">
          <ItemIcon
            name={item.name}
            slotType={slotKey}
            specialEffect={item.special_effect}
            rarity={item.rarity}
            size="md"
            className={`${style.text} transition-transform group-hover:scale-110`}
          />
          {statBadge && (
            <div className={`text-[8px] font-mono font-bold leading-none mt-0.5 ${statBadge.colorClass}`}>
              {statBadge.text}
            </div>
          )}
        </div>
      ) : (
        <div className="opacity-25 filter grayscale">
          <PixelItemSprite slotType={slotKey} size="md" />
        </div>
      )}
      <span className="text-[8px] font-pixel-body text-slate-400 absolute -bottom-1.5 bg-slate-950 px-1 rounded border border-slate-800 scale-90 truncate max-w-full">
        {label}
      </span>
      
      {/* Tooltip Hover Rico com Posicionamento Inteligente e Atributos Completos */}
      {item && (
        <div className={`hidden group-hover:flex absolute z-50 flex-col w-56 p-3 text-left pixel-card-gold rounded-lg shadow-2xl pointer-events-none backdrop-blur-md animate-in fade-in zoom-in-95 ${tooltipPos}`}>
          <div className="flex justify-between items-start gap-1">
            <div className={`font-pixel-heading text-xs ${style.text}`}>{cleanName}</div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-pixel-body font-bold border ${style.badgeBg} ${style.badgeBorder} ${style.badgeText}`}>
              {item.rarity}
            </span>
          </div>
          
          <div className="text-[9px] text-slate-400 border-b border-slate-800 pb-1 mb-1 font-pixel-body">
            Slot: {getSlotLabel(slotKey)}
          </div>

          {/* Requisito de Nível */}
          {item.required_level && item.required_level > 1 && (
            <div className={`text-[10px] font-pixel-body font-bold mb-1.5 flex items-center gap-1 ${
              isLevelLocked ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              <span>{isLevelLocked ? '🔒' : '✅'}</span>
              <span>Requer Nível {item.required_level}</span>
            </div>
          )}

          {slotKey === 'bag' && (
            <div className="text-[10px] text-amber-300 font-pixel-heading mb-1.5">
              🎒 Slots: +{getBagSlotBonus(item.rarity)}
            </div>
          )}

          {/* Estatísticas Principais */}
          <div className="flex justify-between text-[10px] font-pixel-body mb-1">
            {item.magic_attack ? (
              <span className="text-cyan-300 font-bold">Magia: +{item.magic_attack}</span>
            ) : (
              <span className="text-rose-400 font-bold">Atk: +{getItemAttack(item)?.value || item.attack || 0}</span>
            )}
            <span className="text-sky-400 font-bold">Def: +{item.defense || 0}</span>
            <span className="text-slate-400">{(item.weight || 0).toFixed(1)} oz</span>
          </div>

          {/* Badges de Bônus de Atributos */}
          <BonusBadges item={item} />

          {/* Badge de Duas Mãos vs Uma Mão */}
          {(() => {
            const handsBadge = getHandsBadge(item);
            if (!handsBadge) return null;
            return (
              <div className={`text-[9px] font-pixel-body px-1.5 py-0.5 rounded border mt-1.5 flex items-center justify-between gap-1 ${handsBadge.badgeClass}`}>
                <span className="font-bold">{handsBadge.label}</span>
                <span className="text-[8px] opacity-80">{handsBadge.shortLabel}</span>
              </div>
            );
          })()}

          {/* Efeito Especial */}
          {item.special_effect && (
            <div className="text-[9px] text-purple-400 italic leading-tight mt-1.5 border-t border-slate-800 pt-1">
              {item.special_effect}
            </div>
          )}

          <div className="mt-2 text-[9px] text-amber-400 font-pixel-body font-bold border-t border-slate-800 pt-1">
            (Clique para desequipar)
          </div>
        </div>
      )}
    </div>
  );
}

export function TibiaEquipmentGrid({
  character,
  derivedStats = null,
  equipment = {},
  backpack = [],
  cap = 1500,
  totalAttack = 15,
  totalDefense = 5,
  storageUsed = 0,
  storageCapacity = 500,
  activeConstructionSlots = 0,
  maxConstructionSlots = 1,
  onOpenDepot,
  onOpenCamp,
  onEquipItem,
  onUnequipItem,
  onBulkSell,
  onLearnBlueprint,
  openBackpackRequest = 0,
  compact = false,
}: TibiaEquipmentGridProps) {
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);

  // O card continua sendo a fonte única do modal. O HUD do Modo Mundo apenas
  // dispara esta abertura, sem duplicar inventário ou regras de equipamento.
  useEffect(() => {
    if (openBackpackRequest > 0) setIsBackpackOpen(true);
  }, [openBackpackRequest]);

  const safeBackpack = Array.isArray(backpack) ? backpack : [];
  const safeEquipment = equipment || {};

  // Bônus de Peso e Slots por Raridade da Mochila (Bag) sincronizado autoritativamente
  let bagCapBonus = 0;
  const bagSlotsBonus = safeEquipment.bag ? getBagSlotBonus(safeEquipment.bag.rarity) : 0;

  if (safeEquipment.bag) {
    const bagRarity = safeEquipment.bag.rarity || 'Comum';
    switch (bagRarity) {
      case 'Comum':
        bagCapBonus = 200;
        break;
      case 'Incomum':
        bagCapBonus = 350;
        break;
      case 'Raro':
        bagCapBonus = 500;
        break;
      case 'Épico':
        bagCapBonus = 650;
        break;
      case 'Lendário':
        bagCapBonus = 800;
        break;
      case 'Mítico':
        bagCapBonus = 1000;
        break;
      case 'Divino':
        bagCapBonus = 1300;
        break;
      default:
        bagCapBonus = 200;
    }
  }

  const effectiveCap = derivedStats?.total_capacity || (cap + bagCapBonus);
  const maxSlots = derivedStats?.max_slots || (20 + bagSlotsBonus);

  // O backend considera tanto a mochila quanto os equipamentos vestidos.
  // Manter a mesma regra aqui evita que a UI mostre uma Cap livre maior do
  // que a capacidade realmente disponível para novos itens.
  const backpackWeight = safeBackpack.reduce((acc, item) => acc + (item?.weight || 0), 0);
  const equippedWeight = Object.values(safeEquipment).reduce((acc, item) => acc + (item?.weight || 0), 0);
  const totalWeight = backpackWeight + equippedWeight;
  const freeCapacity = Math.max(0, effectiveCap - totalWeight);

  return (
    <div className={`pixel-card-gold rounded-xl text-slate-100 flex flex-col ${compact ? 'p-2.5 gap-2' : 'p-3 gap-3'}`}>
      {/* Visual Header */}
      <div className="pixel-card-header pixel-card-header-gold">
        <h3 className="font-pixel-heading text-xs text-amber-400 flex items-center gap-1.5">
          <PixelItemSprite slotType="chest" size="sm" />
          <span>Equipamentos</span>
        </h3>
      </div>

      {/* Grid Clássico Tibia 3x4 (10 Slots + Centralizado) */}
      <div className={`bg-slate-950/90 border-2 border-slate-900 rounded-lg shadow-inner flex flex-col items-center ${compact ? 'p-2' : 'p-3'}`}>
        {/* Linha 1: Necklace (Colar) | Head (Elmo) | Bag (Mochila) */}
        <div className={compact ? 'flex gap-1.5 mb-1.5' : 'flex gap-2.5 mb-2.5'}>
          <SlotItem item={safeEquipment.necklace} label="Colar" slotKey="necklace" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.head} label="Elmo" slotKey="head" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.bag} label="Mochila" slotKey="bag" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
        </div>

        {/* Linha 2: MainHand (Arma) | Chest (Armadura) | OffHand (Escudo) */}
        <div className={compact ? 'flex gap-1.5 mb-1.5' : 'flex gap-2.5 mb-2.5'}>
          <SlotItem item={safeEquipment.mainhand} label="Arma" slotKey="mainhand" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.chest} label="Armadura" slotKey="chest" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.offhand} label="Escudo" slotKey="offhand" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
        </div>

        {/* Linha 3: Ring (Anel) | Legs (Calça) | Ammo (Munição) */}
        <div className={compact ? 'flex gap-1.5 mb-1.5' : 'flex gap-2.5 mb-2.5'}>
          <SlotItem item={safeEquipment.ring} label="Anel" slotKey="ring" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.legs} label="Calça" slotKey="legs" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <SlotItem item={safeEquipment.ammo} label="Munição" slotKey="ammo" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
        </div>

        {/* Linha 4: Vazio | Boots (Bota) | Vazio */}
        <div className={compact ? 'flex gap-1.5' : 'flex gap-2.5'}>
          <div className="w-12 h-12"></div>
          <SlotItem item={safeEquipment.boots} label="Bota" slotKey="boots" charLevel={character?.level || 1} onUnequip={onUnequipItem} />
          <div className="w-12 h-12"></div>
        </div>

        {/* Capacidade (Cap) */}
        <div className={`w-full flex flex-col gap-0.5 text-[11px] font-pixel-body ${compact ? 'mt-2 pt-1.5' : 'mt-3 pt-2'} border-t-2 border-slate-900 text-slate-400`}>
          <div className="flex justify-between items-center" title="Espaço de carga que ainda está livre para novos itens.">
            <span>Capacidade livre (Cap):</span>
            <span className="text-amber-400 font-bold font-pixel-heading text-[11px]">{freeCapacity.toFixed(1)} oz</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500" title="Peso total da mochila e dos equipamentos vestidos.">
            <span>Peso carregado:</span>
            <span className="text-slate-300 font-bold font-pixel-heading">{totalWeight.toFixed(1)} / {effectiveCap.toFixed(1)} oz</span>
          </div>
        </div>

        {safeEquipment.bag && (
          <div className="w-full flex justify-between items-center text-[10px] font-pixel-body mt-1 text-slate-400">
            <span>🎒 Slots da mochila:</span>
            <span className="text-emerald-300 font-bold font-pixel-heading">+{bagSlotsBonus} ({maxSlots} total)</span>
          </div>
        )}

        {/* Saldo Bancário */}
        <div className="w-full flex justify-between items-center text-[11px] font-pixel-body mt-1 pt-1.5 border-t border-slate-900 text-slate-400">
          <span>Saldo Bancário:</span>
          <span className="text-amber-300 font-bold font-pixel-heading text-[11px]">💰 {character?.gold_bank?.toLocaleString() || 0} Gold</span>
        </div>
      </div>

      {/* Botões de Abertura: Mochila, Depósito e Acampamento */}
      <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
        <button
          onClick={() => setIsBackpackOpen(true)}
          className={`w-full pixel-btn pixel-btn-gold text-xs flex justify-between items-center ${compact ? 'py-2 px-2' : 'py-2.5 px-4'}`}
        >
          <span className="flex items-center gap-1.5">
            <PixelItemSprite slotType="bag" size="sm" />
            <span>Mochila & Inventário</span>
          </span>
          <span className="font-pixel-heading bg-slate-950 text-amber-300 px-2 py-0.5 rounded border border-amber-600/50 text-[10px]">
            {safeBackpack.length} / {maxSlots} Slots
          </span>
        </button>

        {onOpenDepot && (
          <ResourceDepotButton
            storageUsed={storageUsed}
            storageCapacity={storageCapacity}
            onClick={onOpenDepot}
            compact={compact}
          />
        )}

        {onOpenCamp && (
          <CampButton
            activeSlots={activeConstructionSlots}
            maxSlots={maxConstructionSlots}
            onClick={onOpenCamp}
            compact={compact}
          />
        )}
      </div>

      {/* Modal da Mochila Estilo Tibia com Equipamentos e Multi-seleção */}
      <TibiaBackpackModal
        isOpen={isBackpackOpen}
        onClose={() => setIsBackpackOpen(false)}
        character={character}
        derivedStats={derivedStats}
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
        onBulkSell={onBulkSell}
        onLearnBlueprint={onLearnBlueprint}
      />
    </div>
  );
}