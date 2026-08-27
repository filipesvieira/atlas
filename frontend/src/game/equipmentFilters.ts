export interface EquipmentFilterEntry {
  name?: string;
  slot_type?: string;
  weapon_type?: string;
}

export const EQUIPMENT_FILTER_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '🎒' },
  { id: 'weapons', label: 'Armas', icon: '⚔️' },
  { id: 'shields', label: 'Escudos', icon: '🛡️' },
  { id: 'helmets', label: 'Elmos', icon: '🪖' },
  { id: 'armors', label: 'Armaduras', icon: '🥋' },
  { id: 'legs', label: 'Calças', icon: '👖' },
  { id: 'boots', label: 'Botas', icon: '🥾' },
  { id: 'accessories', label: 'Acessórios', icon: '📿' },
  { id: 'bags', label: 'Mochilas', icon: '🎒' },
];

export const WEAPON_SUBCATEGORIES = [
  { id: 'all', label: 'Todos os tipos' },
  { id: 'sword', label: 'Espadas' },
  { id: 'axe', label: 'Machados' },
  { id: 'club', label: 'Clavas / Martelos' },
  { id: 'bow', label: 'Arcos' },
  { id: 'wand', label: 'Varinhas' },
  { id: 'staff', label: 'Cajados' },
];

export const ACCESSORY_SUBCATEGORIES = [
  { id: 'all', label: 'Todos os tipos' },
  { id: 'ring', label: 'Anéis' },
  { id: 'necklace', label: 'Amuletos / Colares' },
  { id: 'ammo', label: 'Munições' },
];

export const equipmentCategory = (slotType?: string) => {
  switch (slotType) {
    case 'mainhand': return 'weapons';
    case 'offhand': return 'shields';
    case 'head': return 'helmets';
    case 'chest': return 'armors';
    case 'legs': return 'legs';
    case 'boots': return 'boots';
    case 'necklace':
    case 'ring':
    case 'ammo': return 'accessories';
    case 'bag': return 'bags';
    default: return 'all';
  }
};

export const weaponSubcategoryMatches = (entry: EquipmentFilterEntry, weaponFilter: string) => {
  if (weaponFilter === 'all') return true;
  const type = (entry.weapon_type || '').toLowerCase();
  const name = (entry.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (weaponFilter === 'club') return type === 'club' || type === 'hammer' || /clava|martelo|maca/.test(name);
  if (weaponFilter === 'staff') return type === 'staff' || /cajado/.test(name);
  if (weaponFilter === 'wand') return type === 'wand' || /varinha/.test(name);
  if (weaponFilter === 'sword') return type === 'sword' || /espada/.test(name);
  if (weaponFilter === 'axe') return type === 'axe' || /machad/.test(name);
  if (weaponFilter === 'bow') return type === 'bow' || /arco/.test(name);
  return true;
};

export const accessorySubcategoryMatches = (entry: EquipmentFilterEntry, accessoryFilter: string) => {
  if (accessoryFilter === 'all') return true;
  const type = (entry.slot_type || '').toLowerCase();
  const name = (entry.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (accessoryFilter === 'ring') return type === 'ring' || /anel/.test(name);
  if (accessoryFilter === 'necklace') return type === 'necklace' || /amuleto|colar|cordao|talisma/.test(name);
  if (accessoryFilter === 'ammo') return type === 'ammo' || /flecha|virote|municao/.test(name);
  return true;
};