import { useState } from 'react';
import { ItemIcon, getCleanItemName } from './ItemIcon';

interface Item {
  id: string;
  name: string;
  attack: number;
  defense: number;
  rarity: string;
  weight: number;
  special_effect?: string;
  slot_type?: string;
  weapon_type?: string;
}

interface TibiaBackpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  backpack: Item[];
  equippedBag?: Item | null;
  totalWeight: number;
  maxCapacity: number;
  maxSlots: number;
  onEquipItem: (itemId: string, slot: string) => void;
  onDiscardItem: (itemId: string) => void;
}

export function TibiaBackpackModal({
  isOpen,
  onClose,
  backpack = [],
  equippedBag,
  totalWeight,
  maxCapacity,
  maxSlots = 20,
  onEquipItem,
  onDiscardItem,
}: TibiaBackpackModalProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  if (!isOpen) return null;

  const usedSlots = backpack.length;
  const weightPercent = Math.min(100, Math.round((totalWeight / maxCapacity) * 100));

  const getItemSlotType = (item: Item): string => {
    if (item.slot_type && item.slot_type !== '') {
      return item.slot_type;
    }
    let targetSlot = 'mainhand';
    const effectLower = (item.special_effect || '').toLowerCase();
    const nameLower = item.name.toLowerCase();

    if (effectLower.includes('head') || nameLower.includes('capacete') || nameLower.includes('elmo') || nameLower.includes('coifa')) {
      targetSlot = 'head';
    } else if (effectLower.includes('chest') || nameLower.includes('cota') || nameLower.includes('peitoral') || nameLower.includes('robe') || nameLower.includes('armadura')) {
      targetSlot = 'chest';
    } else if (effectLower.includes('legs') || nameLower.includes('calça') || nameLower.includes('grevas') || nameLower.includes('manto')) {
      targetSlot = 'legs';
    } else if (effectLower.includes('boots') || nameLower.includes('bota') || nameLower.includes('sandália')) {
      targetSlot = 'boots';
    } else if (effectLower.includes('offhand') || nameLower.includes('escudo') || nameLower.includes('pavise') || nameLower.includes('shield')) {
      targetSlot = 'offhand';
    } else if (effectLower.includes('necklace') || nameLower.includes('amuleto') || nameLower.includes('colar') || nameLower.includes('talismã')) {
      targetSlot = 'necklace';
    } else if (effectLower.includes('ring') || nameLower.includes('anel')) {
      targetSlot = 'ring';
    } else if (effectLower.includes('bag') || nameLower.includes('mochila') || nameLower.includes('bolsa') || nameLower.includes('sacola')) {
      targetSlot = 'bag';
    } else if (effectLower.includes('ammo') || nameLower.includes('flecha') || nameLower.includes('virote') || nameLower.includes('munição')) {
      targetSlot = 'ammo';
    } else if (effectLower.includes('skill_book') || nameLower.includes('livro') || nameLower.includes('tome') || nameLower.includes('grimório') || nameLower.includes('manual')) {
      targetSlot = 'skill_book';
    } else if (effectLower.includes('mainhand') || nameLower.includes('espada') || nameLower.includes('machado') || nameLower.includes('arco') || nameLower.includes('cajado')) {
      targetSlot = 'mainhand';
    }

    return targetSlot;
  };

  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'Lendário':
        return {
          border: 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.25)] bg-amber-950/30 hover:border-amber-400',
          text: 'text-amber-300',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'Raro':
        return {
          border: 'border-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.25)] bg-sky-950/30 hover:border-sky-400',
          text: 'text-sky-300',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        };
      case 'Incomum':
        return {
          border: 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.25)] bg-emerald-950/30 hover:border-emerald-400',
          text: 'text-emerald-300',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      default:
        return {
          border: 'border-slate-800 bg-slate-900/80 hover:border-slate-700',
          text: 'text-slate-300',
          badge: 'bg-slate-800 text-slate-400 border-slate-700',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <ItemIcon slotType="bag" size="lg" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-400">Mochila do Aventureiro (Estilo Tibia)</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {equippedBag ? `Mochila Equipada: ${getCleanItemName(equippedBag.name)} (${equippedBag.rarity})` : 'Mochila Básica (20 slots)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono transition"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Indicadores de Capacidade */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs">
          {/* Slots */}
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

          {/* Peso (Cap) */}
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

        {/* Grade de Slots Estilo Tibia */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-inner">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
            {Array.from({ length: maxSlots }).map((_, index) => {
              const item = backpack[index];

              if (item) {
                const style = getRarityStyle(item.rarity);
                const slotType = getItemSlotType(item);
                const cleanName = getCleanItemName(item.name);

                return (
                  <div
                    key={item.id || index}
                    onClick={() => setSelectedItem(item)}
                    className={`h-16 rounded-xl border p-1.5 flex flex-col justify-between cursor-pointer transition-all hover:scale-105 relative group shadow-sm ${style.border}`}
                  >
                    <div className="flex justify-between items-center gap-1">
                      <ItemIcon
                        name={item.name}
                        slotType={slotType}
                        weaponType={item.weapon_type}
                        specialEffect={item.special_effect}
                        size="sm"
                        className={`${style.text} shrink-0`}
                      />
                      <span className={`text-[10px] font-bold truncate flex-1 ${style.text}`}>
                        {cleanName}
                      </span>
                    </div>

                    <div className="flex justify-between items-end font-mono text-[9px] mt-1">
                      <span className="text-amber-400 font-bold">
                        {item.attack > 0 ? `+${item.attack}A` : item.defense > 0 ? `+${item.defense}D` : ''}
                      </span>
                      <span className="text-slate-400 font-normal text-[8px]">
                        {item.weight.toFixed(1)}oz
                      </span>
                    </div>
                  </div>
                );
              }

              // Slot Vazio
              return (
                <div
                  key={`empty_${index}`}
                  className="h-16 rounded-xl border border-slate-900 bg-slate-950/60 flex items-center justify-center text-[10px] font-mono text-slate-800 select-none shadow-inner"
                >
                  {index + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Popover / Modal de Ação do Item Selecionado */}
        {selectedItem && (
          <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 space-y-2.5 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <span className="font-bold text-xs text-amber-300 flex items-center gap-2">
                <ItemIcon
                  name={selectedItem.name}
                  slotType={getItemSlotType(selectedItem)}
                  weaponType={selectedItem.weapon_type}
                  specialEffect={selectedItem.special_effect}
                  size="md"
                  className="text-amber-400"
                />
                {getCleanItemName(selectedItem.name)}
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
              >
                ✕ Fechar Ações
              </button>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Atk: <strong className="text-amber-400">+{selectedItem.attack}</strong></span>
              <span>Def: <strong className="text-sky-400">+{selectedItem.defense}</strong></span>
              <span>Peso: <strong className="text-slate-300">{selectedItem.weight.toFixed(1)} oz</strong></span>
              <span>Raridade: <strong className="text-purple-400">{selectedItem.rarity}</strong></span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  const slot = getItemSlotType(selectedItem);
                  onEquipItem(selectedItem.id, slot);
                  setSelectedItem(null);
                }}
                className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow"
              >
                Equipar Item ({getItemSlotType(selectedItem)})
              </button>
              <button
                onClick={() => {
                  onDiscardItem(selectedItem.id);
                  setSelectedItem(null);
                }}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold rounded-lg text-xs transition"
              >
                Descartar 🗑️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
