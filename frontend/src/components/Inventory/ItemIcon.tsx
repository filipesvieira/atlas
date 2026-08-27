import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

export interface ItemIconProps {
  name?: string;
  slotType?: string;
  weaponType?: string;
  specialEffect?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rarity?: string;
  templateKey?: string;
  visualKey?: string;
  setKey?: string;
}

export function ItemIcon({
  name = '',
  slotType = '',
  weaponType = '',
  className = '',
  size = 'md',
  rarity = 'Comum',
  templateKey = '',
  visualKey = '',
  setKey = '',
}: ItemIconProps) {
  return (
    <PixelItemSprite
      name={name}
      slotType={slotType}
      weaponType={weaponType}
      rarity={rarity}
      templateKey={templateKey}
      visualKey={visualKey}
      setKey={setKey}
      size={size}
      className={className}
    />
  );
}

export function getCleanItemName(name: string): string {
  if (!name) return 'Item Desconhecido';
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}

export function getItemAttack(item?: any): { value: number; type: 'physical' | 'magic' } | null {
  if (!item) return null;
  const magicAtk = item.magic_attack || 0;
  const physAtk = item.physical_attack || 0;
  const rawAtk = item.attack || 0;

  if (magicAtk > 0 || (rawAtk > 0 && item.weapon_type === 'wand')) {
    return { value: magicAtk > 0 ? magicAtk : rawAtk, type: 'magic' };
  }
  if (physAtk > 0 || rawAtk > 0) {
    return { value: physAtk > 0 ? physAtk : rawAtk, type: 'physical' };
  }
  return null;
}

export function getItemStatBadge(item?: any): { text: string; type: 'physical' | 'magic' | 'defense'; colorClass: string } | null {
  if (!item) return null;
  const magicAtk = item.magic_attack || 0;
  const physAtk = item.physical_attack || 0;
  const rawAtk = item.attack || 0;
  const def = item.defense || 0;

  if (magicAtk > 0 || (rawAtk > 0 && item.weapon_type === 'wand')) {
    const val = magicAtk > 0 ? magicAtk : rawAtk;
    return {
      text: `+${val}M`,
      type: 'magic',
      colorClass: 'text-cyan-300',
    };
  }

  if (physAtk > 0 || rawAtk > 0) {
    const val = physAtk > 0 ? physAtk : rawAtk;
    return {
      text: `+${val}A`,
      type: 'physical',
      colorClass: 'text-emerald-400',
    };
  }

  if (def > 0) {
    return {
      text: `+${def}D`,
      type: 'defense',
      colorClass: 'text-sky-400',
    };
  }

  return null;
}

export function getRarityStyle(rarity?: string) {
  switch (rarity) {
    case 'Incomum':
      return {
        border: 'border-emerald-500/70 hover:border-emerald-400 bg-emerald-950/40',
        text: 'text-emerald-300',
        bg: 'bg-emerald-950/40',
        badgeBg: 'bg-emerald-950/90',
        badgeBorder: 'border-emerald-700/80',
        badgeText: 'text-emerald-300',
        glow: 'shadow-emerald-500/20',
      };
    case 'Raro':
      return {
        border: 'border-sky-500/70 hover:border-sky-400 bg-sky-950/40',
        text: 'text-sky-300',
        bg: 'bg-sky-950/40',
        badgeBg: 'bg-sky-950/90',
        badgeBorder: 'border-sky-700/80',
        badgeText: 'text-sky-300',
        glow: 'shadow-sky-500/20',
      };
    case 'Épico':
      return {
        border: 'border-purple-500/70 hover:border-purple-400 bg-purple-950/40',
        text: 'text-purple-300',
        bg: 'bg-purple-950/40',
        badgeBg: 'bg-purple-950/90',
        badgeBorder: 'border-purple-700/80',
        badgeText: 'text-purple-300',
        glow: 'shadow-purple-500/25',
      };
    case 'Lendário':
      return {
        border: 'border-amber-400/80 hover:border-amber-300 bg-amber-950/40',
        text: 'text-amber-300',
        bg: 'bg-amber-950/40',
        badgeBg: 'bg-amber-950/90',
        badgeBorder: 'border-amber-700/80',
        badgeText: 'text-amber-300',
        glow: 'shadow-amber-400/30',
      };
    case 'Mítico':
      return {
        border: 'border-rose-500/80 hover:border-rose-400 bg-rose-950/40',
        text: 'text-rose-300',
        bg: 'bg-rose-950/40',
        badgeBg: 'bg-rose-950/90',
        badgeBorder: 'border-rose-700/80',
        badgeText: 'text-rose-300',
        glow: 'shadow-rose-500/30',
      };
    case 'Divino':
      return {
        border: 'border-cyan-400/90 hover:border-cyan-300 bg-cyan-950/40',
        text: 'text-cyan-300',
        bg: 'bg-cyan-950/40',
        badgeBg: 'bg-cyan-950/90',
        badgeBorder: 'border-cyan-700/80',
        badgeText: 'text-cyan-300',
        glow: 'shadow-cyan-400/40',
      };
    case 'Comum':
    default:
      return {
        border: 'border-slate-800 hover:border-slate-700 bg-slate-900/60',
        text: 'text-slate-300',
        bg: 'bg-slate-900/60',
        badgeBg: 'bg-slate-900/80',
        badgeBorder: 'border-slate-800',
        badgeText: 'text-slate-300',
        glow: 'shadow-slate-500/10',
      };
  }
}

export function BonusBadges({ item }: { item?: any }) {
  if (!item) return null;
  const hasBonuses =
    item.bonus_str ||
    item.bonus_dex ||
    item.bonus_int ||
    item.bonus_hp ||
    item.bonus_mp ||
    item.gold_bonus ||
    item.lifesteal ||
    item.mana_regen ||
    item.crit_chance ||
    item.movement_speed_bonus;

  if (!hasBonuses) return null;

  const fmt = (val: number | undefined | null) => {
    if (val === undefined || val === null) return 0;
    const num = Number(val);
    return Number.isInteger(num) ? num : Number(num.toFixed(2));
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-mono">
      {item.bonus_str ? <span className="px-1 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded">+{fmt(item.bonus_str)} STR</span> : null}
      {item.bonus_dex ? <span className="px-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded">+{fmt(item.bonus_dex)} DEX</span> : null}
      {item.bonus_int ? <span className="px-1 bg-sky-950/80 text-sky-300 border border-sky-800/60 rounded">+{fmt(item.bonus_int)} INT</span> : null}
      {item.bonus_hp ? <span className="px-1 bg-rose-950/80 text-rose-300 border border-rose-800/60 rounded">+{fmt(item.bonus_hp)} HP</span> : null}
      {item.bonus_mp ? <span className="px-1 bg-blue-950/80 text-blue-300 border border-blue-800/60 rounded">+{fmt(item.bonus_mp)} MP</span> : null}
      {item.gold_bonus ? <span className="px-1 bg-yellow-950/80 text-yellow-300 border border-yellow-800/60 rounded">+{fmt(item.gold_bonus)}% Ouro</span> : null}
      {item.lifesteal ? <span className="px-1 bg-red-950/80 text-red-300 border border-red-800/60 rounded">+{fmt(item.lifesteal)}% Lifesteal</span> : null}
      {item.mana_regen ? <span className="px-1 bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 rounded">+{fmt(item.mana_regen)} MP/s</span> : null}
      {item.crit_chance ? <span className="px-1 bg-purple-950/80 text-purple-300 border border-purple-800/60 rounded">+{fmt(item.crit_chance)}% Crit</span> : null}
      {item.movement_speed_bonus ? <span className="px-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded">🥾 +{fmt(item.movement_speed_bonus)}% Movimento</span> : null}
    </div>
  );
}

export function getSlotLabel(slotKey: string): string {
  const map: Record<string, string> = {
    head: 'Elmo',
    necklace: 'Colar',
    chest: 'Armadura',
    mainhand: 'Arma',
    offhand: 'Escudo',
    legs: 'Calça',
    boots: 'Bota',
    ring: 'Anel',
    ammo: 'Munição',
    bag: 'Mochila',
  };
  return map[slotKey] || slotKey;
}

export function getHandsBadge(item?: any) {
  if (!item) return null;
  const isWeapon = item.slot_type === 'mainhand' || Boolean(item.weapon_type) || (item.attack || 0) > 0 || (item.physical_attack || 0) > 0 || (item.magic_attack || 0) > 0;
  if (!isWeapon && item.hands !== 2) return null;
  if (item.hands === 2) {
    return {
      hands: 2,
      label: 'Duas Mãos (2H)',
      shortLabel: '2H',
      icon: '⚔️⚔️',
      description: 'Ocupa ambas as mãos (desequipa o escudo)',
      badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-600/80',
    };
  }
  if (item.hands === 1) {
    return {
      hands: 1,
      label: 'Uma Mão (1H)',
      shortLabel: '1H',
      icon: '🗡️',
      description: 'Permite o uso de escudo na mão secundária',
      badgeClass: 'bg-slate-900/90 text-slate-300 border-slate-700',
    };
  }
  return null;
}