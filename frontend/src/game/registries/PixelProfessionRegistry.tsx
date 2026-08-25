export interface PixelProfessionSpriteProps {
  professionKey?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PixelProfessionSprite({
  professionKey = 'miner',
  size = 'md',
  className = '',
}: PixelProfessionSpriteProps) {
  const keyLower = (professionKey || '').toLowerCase();
  const sizePx = size === 'sm' ? 16 : size === 'lg' ? 32 : size === 'xl' ? 44 : 22;
  const viewBox = '0 0 16 16';

  // ──────────────────────────────────────────────────────────────────────────
  // 1. MINERADOR / MINERAÇÃO (Miner)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('miner') || keyLower.includes('mina')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Cabeça da Picareta de Aço */}
        <polygon points="3,2 6,2 14,10 14,13 13,14 10,14 2,6 2,3" fill="#64748b" />
        <polygon points="4,2 6,2 13,9 13,11 11,13 9,13 2,6 2,4" fill="#94a3b8" />
        <polygon points="5,3 6,3 12,9 12,10 10,12 9,12 3,6 3,5" fill="#e2e8f0" />
        {/* Pontas Afiadas */}
        <rect x="2" y="2" width="2" height="2" fill="#00f0ff" />
        <rect x="13" y="13" width="2" height="2" fill="#00f0ff" />
        {/* Cabo de Madeira Diagonal */}
        <line x1="4" y1="13" x2="13" y2="4" stroke="#78350f" strokeWidth="2" strokeLinecap="square" />
        <line x1="5" y1="12" x2="12" y2="5" stroke="#b45309" strokeWidth="1" strokeLinecap="square" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. LENHADOR / CORTE DE MADEIRA (Lumberjack)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('lumber') || keyLower.includes('lenhador') || keyLower.includes('woodcut')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Cabo de Madeira */}
        <line x1="3" y1="14" x2="11" y2="3" stroke="#78350f" strokeWidth="2" strokeLinecap="square" />
        <line x1="4" y1="13" x2="10" y2="4" stroke="#92400e" strokeWidth="1" strokeLinecap="square" />
        {/* Lâmina do Machado de Dois Gumes */}
        <polygon points="9,2 15,4 14,8 10,7" fill="#94a3b8" />
        <polygon points="10,3 14,4 13,7 11,6" fill="#cbd5e1" />
        <polygon points="8,5 6,7 7,10 10,8" fill="#64748b" />
        <rect x="14" y="4" width="1" height="3" fill="#ffffff" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PESCADOR / PESCA (Fisher)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('fish') || keyLower.includes('pesca')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Vara de Pescar */}
        <line x1="2" y1="14" x2="13" y2="2" stroke="#b45309" strokeWidth="1.5" strokeLinecap="square" />
        {/* Linha de Pesca */}
        <path d="M 13,2 Q 15,6 13,10" fill="none" stroke="#94a3b8" strokeWidth="1" />
        {/* Peixe Fisgado */}
        <polygon points="9,10 14,8 12,13 14,15 10,13 8,11" fill="#38bdf8" />
        <polygon points="10,10 13,9 11,12 9,11" fill="#7dd3fc" />
        <rect x="13" y="9" width="1" height="1" fill="#ffffff" />
        <rect x="9" y="10" width="1" height="1" fill="#facc15" /> {/* Anzol */}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. AGRICULTOR / CULTIVO (Farmer)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('farm') || keyLower.includes('agric') || keyLower.includes('trigo')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Foice de Colheita */}
        <line x1="3" y1="14" x2="8" y2="9" stroke="#78350f" strokeWidth="2" strokeLinecap="square" />
        <path d="M 7,9 Q 11,4 14,7 Q 11,10 8,9" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        {/* Espigas Douradas */}
        <rect x="10" y="2" width="2" height="3" fill="#facc15" />
        <rect x="12" y="3" width="2" height="3" fill="#eab308" />
        <rect x="9" y="5" width="2" height="2" fill="#fef08a" />
        <rect x="13" y="6" width="2" height="2" fill="#ca8a04" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. HERBALISTA / BOTÂNICA (Herbalist)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('herb') || keyLower.includes('planta') || keyLower.includes('flor')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Caule Verde */}
        <path d="M 4,14 Q 8,10 8,5" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
        {/* Folhas Medicinais */}
        <polygon points="8,10 12,8 9,12" fill="#22c55e" />
        <polygon points="7,8 3,6 6,10" fill="#4ade80" />
        {/* Flor Rara no Topo */}
        <rect x="7" y="3" width="3" height="3" fill="#a855f7" />
        <rect x="8" y="2" width="1" height="1" fill="#c084fc" />
        <rect x="6" y="4" width="1" height="1" fill="#c084fc" />
        <rect x="10" y="4" width="1" height="1" fill="#c084fc" />
        <rect x="8" y="4" width="1" height="1" fill="#fef08a" /> {/* Miolo da flor */}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. RASTREADOR / CAÇADOR (Tracker)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('track') || keyLower.includes('rastreador') || keyLower.includes('hunt')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Pegada de Fera Animal */}
        <ellipse cx="8" cy="11" rx="4" ry="3" fill="#78350f" />
        <ellipse cx="8" cy="11" rx="3" ry="2" fill="#92400e" />
        {/* Garras / Almofadas da pata */}
        <circle cx="5" cy="6" r="1.5" fill="#78350f" />
        <circle cx="7" cy="4" r="1.5" fill="#78350f" />
        <circle cx="10" cy="4" r="1.5" fill="#78350f" />
        <circle cx="12" cy="6" r="1.5" fill="#78350f" />
        {/* Mira Tática / Olho Noturno */}
        <circle cx="13" cy="3" r="1" fill="#22c55e" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. FERREIRO / ARMARIA (Blacksmith / Armorsmith / Weaponsmith)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('smith') || keyLower.includes('ferreiro') || keyLower.includes('forja')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Bigorna de Fundo */}
        <rect x="3" y="10" width="10" height="4" fill="#334155" />
        <rect x="2" y="10" width="2" height="2" fill="#475569" />
        {/* Martelo de Forja */}
        <rect x="7" y="3" width="7" height="3" fill="#94a3b8" />
        <rect x="6" y="2" width="1" height="5" fill="#cbd5e1" />
        <line x1="9" y1="6" x2="4" y2="12" stroke="#78350f" strokeWidth="2" strokeLinecap="square" />
        {/* Fagulhas Incandescentes */}
        <rect x="5" y="8" width="1" height="1" fill="#facc15" />
        <rect x="11" y="8" width="1" height="1" fill="#f97316" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. JOALHEIRO (Jeweler)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('jewel') || keyLower.includes('joalh') || keyLower.includes('gem')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Gema Lapidada Hexagonal */}
        <polygon points="8,2 14,5 12,12 8,15 4,12 2,5" fill="#0284c7" />
        <polygon points="8,2 13,5 11,11 8,14 5,11 3,5" fill="#38bdf8" />
        <polygon points="8,2 11,5 8,10 5,5" fill="#e0f2fe" />
        <polygon points="8,4 10,6 8,9 6,6" fill="#ffffff" />
        {/* Brilhos / Facetas */}
        <rect x="12" y="3" width="1" height="1" fill="#ffffff" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. MARCENEIRO (Woodworker)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('woodwork') || keyLower.includes('marcen') || keyLower.includes('carpin')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Plaina de Madeira */}
        <polygon points="3,9 13,9 12,13 2,13" fill="#78350f" />
        <polygon points="4,9 12,9 11,12 3,12" fill="#92400e" />
        <rect x="7" y="6" width="3" height="4" fill="#94a3b8" /> {/* Lâmina de corte */}
        <rect x="10" y="7" width="2" height="2" fill="#451a03" /> {/* Puxador */}
        {/* Espiral de Lasca de Madeira */}
        <path d="M 6,5 Q 8,2 10,5" fill="none" stroke="#fde047" strokeWidth="1.5" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 10. ALQUIMISTA (Alchemist)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('alchem') || keyLower.includes('alquim') || keyLower.includes('poção')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Gargalo do Frasco */}
        <rect x="7" y="2" width="2" height="3" fill="#94a3b8" />
        <rect x="6" y="1" width="4" height="1" fill="#cbd5e1" />
        <rect x="7" y="1" width="2" height="1" fill="#78350f" /> {/* Rolha */}
        {/* Corpo Redondo do Frasco */}
        <ellipse cx="8" cy="10" rx="5" ry="4" fill="#64748b" />
        {/* Elixir Borbulhante Mágico */}
        <ellipse cx="8" cy="11" rx="4" ry="3" fill="#10b981" />
        <ellipse cx="8" cy="11" rx="3" ry="2" fill="#34d399" />
        {/* Bolhas */}
        <circle cx="7" cy="10" r="0.8" fill="#ffffff" />
        <circle cx="9" cy="8" r="0.8" fill="#ffffff" />
        <circle cx="8" cy="6" r="0.5" fill="#34d399" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 11. ALFAIATE (Tailor)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('tailor') || keyLower.includes('alfaiate') || keyLower.includes('costur')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Carretel de Linha */}
        <rect x="5" y="4" width="6" height="8" fill="#3b82f6" />
        <rect x="5" y="4" width="6" height="2" fill="#60a5fa" />
        <rect x="4" y="2" width="8" height="2" fill="#78350f" />
        <rect x="4" y="12" width="8" height="2" fill="#78350f" />
        {/* Agulha Prateada Cruzada */}
        <line x1="2" y1="14" x2="14" y2="2" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="square" />
        <rect x="13" y="2" width="1" height="1" fill="#1e293b" /> {/* Olho da agulha */}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 12. COUREIRO (Leatherworker)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('leather') || keyLower.includes('couro') || keyLower.includes('curtid')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Pele / Couro Esticado */}
        <polygon points="4,3 12,3 14,7 13,13 3,13 2,7" fill="#78350f" />
        <polygon points="5,4 11,4 13,7 12,12 4,12 3,7" fill="#92400e" />
        <polygon points="6,5 10,5 11,7 10,10 6,10 5,7" fill="#b45309" />
        {/* Furador / Sovela de Couro */}
        <line x1="12" y1="13" x2="15" y2="10" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <rect x="14" y="11" width="1" height="1" fill="#facc15" />
      </svg>
    );
  }

  // Fallback Geral
  return (
    <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
      <rect x="3" y="3" width="10" height="10" fill="#64748b" />
      <rect x="5" y="5" width="6" height="6" fill="#fbbf24" />
    </svg>
  );
}