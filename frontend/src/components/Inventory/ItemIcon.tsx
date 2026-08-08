interface ItemIconProps {
  name?: string;
  slotType?: string;
  weaponType?: string;
  specialEffect?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ItemIcon({
  name = '',
  slotType = '',
  weaponType = '',
  specialEffect: _specialEffect = '',
  className = '',
  size = 'md',
}: ItemIconProps) {
  const nameLower = name.toLowerCase();
  const slotLower = slotType.toLowerCase();
  const weaponLower = weaponType.toLowerCase();

  const iconSizes = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-base',
    lg: 'w-8 h-8 text-xl',
  };

  const dim = iconSizes[size] || iconSizes.md;

  // 1. ESPADA (Sword)
  if (
    weaponLower === 'sword' ||
    nameLower.includes('espada') ||
    nameLower.includes('lámina') ||
    nameLower.includes('sabre')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.5 17.5L3 6V3H6L17.5 14.5M14.5 17.5L19 22L22 19L17.5 14.5M14.5 17.5L17.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 5L5 19" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      </svg>
    );
  }

  // 2. MACHADO (Axe)
  if (
    weaponLower === 'axe' ||
    nameLower.includes('machado') ||
    nameLower.includes('machadinha')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7 6.3C15.9 4.3 18.5 3 21 3V9C18.5 9 15.9 7.7 14.7 5.7M14.7 6.3L3 18M14.7 6.3C13.5 8.3 10.9 9.6 8.4 9.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M18 21L21 18" stroke="currentColor" strokeWidth="2"/>
      </svg>
    );
  }

  // 3. CLAVA / MAÇA / MARTELO (Club)
  if (
    weaponLower === 'club' ||
    nameLower.includes('clava') ||
    nameLower.includes('maça') ||
    nameLower.includes('martelo')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 4L20 9L11 18L6 13L15 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M7 14L3 18L6 21L10 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="16.5" cy="7.5" r="1.5" fill="currentColor"/>
      </svg>
    );
  }

  // 4. ARCO / BESTA (Bow)
  if (
    weaponLower === 'bow' ||
    nameLower.includes('arco') ||
    nameLower.includes('besta')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 19C5 12 12 5 19 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M5 19L19 5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.6"/>
        <path d="M7 7L17 17M17 17H12M17 17V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // 5. CAJADO / VARINHA (Wand/Staff)
  if (
    weaponLower === 'wand' ||
    nameLower.includes('cajado') ||
    nameLower.includes('varinha') ||
    nameLower.includes('cetro')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 19L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="17.5" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
        <path d="M17.5 3V10M14 6.5H21" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    );
  }

  // 6. ESCUDO (Shield)
  if (
    weaponLower === 'shield' ||
    slotLower === 'offhand' ||
    nameLower.includes('escudo') ||
    nameLower.includes('pavise') ||
    nameLower.includes('orbe')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3L4 6V12C4 17.5 7.5 21.5 12 22.5C16.5 21.5 20 17.5 20 12V6L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 7V17M8 11H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // 7. CAPACETE / ELMO (Head)
  if (
    slotLower === 'head' ||
    nameLower.includes('capacete') ||
    nameLower.includes('elmo') ||
    nameLower.includes('coifa') ||
    nameLower.includes('tiara') ||
    nameLower.includes('coroa')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4C7 4 4 8 4 13V18H20V13C20 8 17 4 12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M7 13H17M12 4V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M4 18L2 21H22L20 18" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    );
  }

  // 8. COTA / PEITORAL / ROBE (Chest)
  if (
    slotLower === 'chest' ||
    nameLower.includes('cota') ||
    nameLower.includes('peitoral') ||
    nameLower.includes('robe') ||
    nameLower.includes('armadura')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4L9 3H15L18 4L21 8L18 10V20H6V10L3 8L6 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 3V12M9 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // 9. CALÇAS / GREVAS (Legs)
  if (
    slotLower === 'legs' ||
    nameLower.includes('calça') ||
    nameLower.includes('grevas') ||
    nameLower.includes('saiote') ||
    nameLower.includes('manto')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 3H18V9L15 21H13L12 12L11 21H9L6 9V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M6 8H18" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    );
  }

  // 10. BOTAS (Boots)
  if (
    slotLower === 'boots' ||
    nameLower.includes('bota') ||
    nameLower.includes('sandália') ||
    nameLower.includes('sapato')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 4V14L4 16V20H18C19.5 20 21 19 21 17V14L15 14V4H8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M8 9H15" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    );
  }

  // 11. MOCHILA / BOLSA (Bag)
  if (
    slotLower === 'bag' ||
    nameLower.includes('mochila') ||
    nameLower.includes('bolsa') ||
    nameLower.includes('sacola')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 8V20C6 21 7 22 8 22H16C17 22 18 21 18 20V8M6 8H18M6 8L8 4H16L18 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <rect x="9" y="11" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  // 12. AMULETO / COLAR (Necklace)
  if (
    slotLower === 'necklace' ||
    nameLower.includes('amuleto') ||
    nameLower.includes('colar') ||
    nameLower.includes('talismã')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4C6 10 9 15 12 15C15 15 18 10 18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="12,16 15,20 12,22 9,20" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3"/>
      </svg>
    );
  }

  // 13. ANEL (Ring)
  if (
    slotLower === 'ring' ||
    nameLower.includes('anel') ||
    nameLower.includes('aliança')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="2"/>
        <polygon points="12,4 14,7 12,9 10,7" stroke="currentColor" strokeWidth="1.5" fill="currentColor"/>
      </svg>
    );
  }

  // 14. MUNIÇÃO (Ammo)
  if (
    slotLower === 'ammo' ||
    nameLower.includes('flecha') ||
    nameLower.includes('virote') ||
    nameLower.includes('munição')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 21L17 11M17 11V16M17 11H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 18L7 21M4 21L6 19" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 16L19 9" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
      </svg>
    );
  }

  // 15. LIVRO / GRIMÓRIO (Skill Book)
  if (
    slotLower === 'skill_book' ||
    nameLower.includes('livro') ||
    nameLower.includes('tome') ||
    nameLower.includes('grimório') ||
    nameLower.includes('manual')
  ) {
    return (
      <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 19.5C4 18.1 5.1 17 6.5 17H20V4H6.5C5.1 4 4 5.1 4 6.5V19.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M4 19.5C4 20.9 5.1 22 6.5 22H20V17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M9 8H15M9 11H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // Ícone Genérico de Item (Caixa de Tesouro)
  return (
    <svg className={`${dim} ${className}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 11H20M12 11V15" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

export function getCleanItemName(fullName: string = ''): string {
  if (!fullName) return '';
  return fullName.replace(/^(Comum|Incomum|Raro|Épico|Lendário|Mítico|Divino)\s+/i, '').trim();
}

export function getItemAttack(item?: { attack?: number; physical_attack?: number; magic_attack?: number } | null): number {
  if (!item) return 0;
  if (typeof item.attack === 'number' && item.attack > 0) return item.attack;
  return (item.physical_attack || 0) + (item.magic_attack || 0);
}

export function getRarityStyle(rarity?: string) {
  switch (rarity) {
    case 'Incomum':
      return {
        border: 'border-emerald-500/60 hover:border-emerald-400 bg-emerald-950/30',
        text: 'text-emerald-300',
        bg: 'bg-emerald-950/30',
        badgeBg: 'bg-emerald-950/80',
        badgeBorder: 'border-emerald-800/80',
        badgeText: 'text-emerald-300',
        glow: 'shadow-emerald-500/20',
      };
    case 'Raro':
      return {
        border: 'border-sky-500/60 hover:border-sky-400 bg-sky-950/30',
        text: 'text-sky-300',
        bg: 'bg-sky-950/30',
        badgeBg: 'bg-sky-950/80',
        badgeBorder: 'border-sky-800/80',
        badgeText: 'text-sky-300',
        glow: 'shadow-sky-500/20',
      };
    case 'Épico':
      return {
        border: 'border-purple-500/60 hover:border-purple-400 bg-purple-950/30',
        text: 'text-purple-300',
        bg: 'bg-purple-950/30',
        badgeBg: 'bg-purple-950/80',
        badgeBorder: 'border-purple-800/80',
        badgeText: 'text-purple-300',
        glow: 'shadow-purple-500/20',
      };
    case 'Lendário':
      return {
        border: 'border-orange-500/60 hover:border-orange-400 bg-orange-950/30',
        text: 'text-orange-300',
        bg: 'bg-orange-950/30',
        badgeBg: 'bg-orange-950/80',
        badgeBorder: 'border-orange-800/80',
        badgeText: 'text-orange-300',
        glow: 'shadow-orange-500/20',
      };
    case 'Mítico':
      return {
        border: 'border-rose-500/70 hover:border-rose-400 bg-rose-950/30',
        text: 'text-rose-300',
        bg: 'bg-rose-950/30',
        badgeBg: 'bg-rose-950/80',
        badgeBorder: 'border-rose-800/80',
        badgeText: 'text-rose-300',
        glow: 'shadow-rose-500/20',
      };
    case 'Divino':
      return {
        border: 'border-amber-400/80 hover:border-amber-300 bg-amber-950/40',
        text: 'text-amber-300',
        bg: 'bg-amber-950/40',
        badgeBg: 'bg-amber-950/80',
        badgeBorder: 'border-amber-800/80',
        badgeText: 'text-amber-300',
        glow: 'shadow-amber-400/30',
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
    item.crit_chance;

  if (!hasBonuses) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-mono">
      {item.bonus_str ? <span className="px-1 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded">+{item.bonus_str} STR</span> : null}
      {item.bonus_dex ? <span className="px-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded">+{item.bonus_dex} DEX</span> : null}
      {item.bonus_int ? <span className="px-1 bg-sky-950/80 text-sky-300 border border-sky-800/60 rounded">+{item.bonus_int} INT</span> : null}
      {item.bonus_hp ? <span className="px-1 bg-rose-950/80 text-rose-300 border border-rose-800/60 rounded">+{item.bonus_hp} HP</span> : null}
      {item.bonus_mp ? <span className="px-1 bg-blue-950/80 text-blue-300 border border-blue-800/60 rounded">+{item.bonus_mp} MP</span> : null}
      {item.gold_bonus ? <span className="px-1 bg-yellow-950/80 text-yellow-300 border border-yellow-800/60 rounded">+{item.gold_bonus}% Ouro</span> : null}
      {item.lifesteal ? <span className="px-1 bg-red-950/80 text-red-300 border border-red-800/60 rounded">+{item.lifesteal}% Lifesteal</span> : null}
      {item.mana_regen ? <span className="px-1 bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 rounded">+{item.mana_regen} MP/s</span> : null}
      {item.crit_chance ? <span className="px-1 bg-purple-950/80 text-purple-300 border border-purple-800/60 rounded">+{item.crit_chance}% Crit</span> : null}
    </div>
  );
}

export function getSlotLabel(slotKey: string): string {
  const map: Record<string, string> = {
    head: 'Head',
    necklace: 'Necklace',
    chest: 'Chest',
    mainhand: 'Weapon',
    offhand: 'Shield',
    legs: 'Legs',
    boots: 'Boots',
    ring: 'Ring',
    ammo: 'Ammo',
    bag: 'Bag',
  };
  return map[slotKey] || slotKey;
}

