const BAG_SLOT_BONUSES: Record<string, number> = {
  Comum: 4,
  Incomum: 6,
  Raro: 8,
  Épico: 10,
  Lendário: 12,
  Mítico: 14,
  Divino: 16,
};

const RARITY_ALIASES: Record<string, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  épico: 'Épico',
  lendário: 'Lendário',
  mítico: 'Mítico',
  divino: 'Divino',
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
  mythic: 'Mítico',
  divine: 'Divino',
};

const RARITY_ORDER = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico', 'Divino'];

function canonicalRarity(rarity?: string): string {
  if (!rarity) return 'Comum';
  const normalized = rarity.trim().toLowerCase();
  return RARITY_ALIASES[normalized] || rarity;
}

export function getBagSlotBonus(rarity?: string): number {
  return BAG_SLOT_BONUSES[canonicalRarity(rarity)] ?? BAG_SLOT_BONUSES.Comum;
}

export function getBagTotalSlots(rarity?: string): number {
  return 20 + getBagSlotBonus(rarity);
}

export function getBagSlotRange(minimumRarity?: string, maximumRarity?: string): { min: number; max: number } {
  const minIndex = Math.max(0, RARITY_ORDER.indexOf(canonicalRarity(minimumRarity)));
  const maxIndex = maximumRarity ? RARITY_ORDER.indexOf(canonicalRarity(maximumRarity)) : RARITY_ORDER.length - 1;
  const lastIndex = maxIndex >= minIndex ? maxIndex : RARITY_ORDER.length - 1;
  return {
    min: getBagSlotBonus(RARITY_ORDER[minIndex]),
    max: getBagSlotBonus(RARITY_ORDER[lastIndex]),
  };
}