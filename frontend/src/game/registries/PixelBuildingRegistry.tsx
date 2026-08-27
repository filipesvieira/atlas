export interface PixelBuildingSpriteProps {
  buildingKey?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PixelBuildingSprite({
  buildingKey = 'campfire',
  size = 'md',
  className = '',
}: PixelBuildingSpriteProps) {
  const keyLower = (buildingKey || '').toLowerCase();
  const sizePx = size === 'sm' ? 20 : size === 'lg' ? 40 : size === 'xl' ? 56 : 28;
  const viewBox = '0 0 16 16';

  // ──────────────────────────────────────────────────────────────────────────
  // 1. FOGUEIRA DO ACAMPAMENTO (Campfire)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('camp') || keyLower.includes('fogueira') || keyLower.includes('fire')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Pedras da Base */}
        <rect x="2" y="13" width="3" height="2" fill="#475569" />
        <rect x="11" y="13" width="3" height="2" fill="#475569" />
        <rect x="4" y="14" width="8" height="2" fill="#334155" />
        <rect x="3" y="13" width="2" height="1" fill="#64748b" />
        <rect x="11" y="13" width="2" height="1" fill="#64748b" />
        {/* Lenha Cruzada */}
        <rect x="3" y="12" width="10" height="2" fill="#78350f" />
        <rect x="4" y="11" width="3" height="2" fill="#92400e" />
        <rect x="9" y="11" width="3" height="2" fill="#92400e" />
        <rect x="2" y="12" width="1" height="2" fill="#451a03" />
        <rect x="13" y="12" width="1" height="2" fill="#451a03" />
        {/* Brasas e Cinzas */}
        <rect x="5" y="12" width="6" height="2" fill="#b91c1c" />
        <rect x="6" y="11" width="4" height="2" fill="#ea580c" />
        {/* Chamas Centrais */}
        <rect x="6" y="7" width="4" height="5" fill="#f97316" />
        <rect x="7" y="4" width="2" height="5" fill="#facc15" />
        <rect x="7" y="2" width="1" height="3" fill="#fef08a" />
        <rect x="5" y="8" width="2" height="3" fill="#ef4444" />
        <rect x="9" y="8" width="2" height="3" fill="#ef4444" />
        <rect x="7" y="6" width="2" height="4" fill="#ffffff" />
        {/* Centelhas voando */}
        <rect x="5" y="3" width="1" height="1" fill="#facc15" />
        <rect x="10" y="4" width="1" height="1" fill="#f97316" />
      </svg>
    );
  }

  if (keyLower.includes('alchemy') || keyLower.includes('alquimia')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="11" width="12" height="3" fill="#78350f" />
        <rect x="4" y="14" width="2" height="2" fill="#451a03" />
        <rect x="10" y="14" width="2" height="2" fill="#451a03" />
        <path d="M5 3h6v2H9v5h3v3H4v-3h3V5H5z" fill="#a78bfa" />
        <rect x="6" y="9" width="5" height="3" fill="#22d3ee" />
        <rect x="7" y="1" width="2" height="2" fill="#f0abfc" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CABANA DO AVENTUREIRO (Adventurer Hut)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('hut') || keyLower.includes('cabana') || keyLower.includes('adventurer')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Telhado de Palha / Madeira */}
        <polygon points="8,1 1,7 15,7" fill="#b45309" />
        <polygon points="8,1 3,7 13,7" fill="#d97706" />
        <rect x="7" y="1" width="2" height="2" fill="#fef08a" />
        <rect x="1" y="6" width="14" height="2" fill="#78350f" />
        {/* Paredes de Madeira */}
        <rect x="2" y="8" width="12" height="7" fill="#78350f" />
        <rect x="2" y="8" width="2" height="7" fill="#92400e" />
        <rect x="12" y="8" width="2" height="7" fill="#451a03" />
        {/* Porta de Carvalho */}
        <rect x="6" y="9" width="4" height="6" fill="#451a03" />
        <rect x="7" y="10" width="2" height="5" fill="#78350f" />
        <rect x="9" y="12" width="1" height="1" fill="#facc15" /> {/* Maçaneta */}
        {/* Janela com Luz */}
        <rect x="3" y="9" width="2" height="2" fill="#fde047" />
        <rect x="4" y="9" width="1" height="1" fill="#ffffff" />
        {/* Base de Pedra */}
        <rect x="1" y="14" width="14" height="2" fill="#475569" />
        <rect x="2" y="14" width="2" height="1" fill="#64748b" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ARMAZÉM DE RECURSOS (Warehouse / Depot)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('warehouse') || keyLower.includes('armaz') || keyLower.includes('depot') || keyLower.includes('storage')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Telhado Reforçado de Pedra/Telha */}
        <rect x="1" y="2" width="14" height="3" fill="#334155" />
        <rect x="2" y="1" width="12" height="2" fill="#475569" />
        <rect x="3" y="1" width="10" height="1" fill="#64748b" />
        {/* Paredes de Pedra Cúbica */}
        <rect x="2" y="5" width="12" height="10" fill="#475569" />
        <rect x="3" y="6" width="3" height="2" fill="#64748b" />
        <rect x="10" y="6" width="3" height="2" fill="#334155" />
        <rect x="3" y="9" width="3" height="2" fill="#334155" />
        <rect x="10" y="9" width="3" height="2" fill="#64748b" />
        {/* Portão Duplo de Carga com Pregos */}
        <rect x="5" y="7" width="6" height="8" fill="#78350f" />
        <rect x="5" y="7" width="1" height="8" fill="#451a03" />
        <rect x="10" y="7" width="1" height="8" fill="#451a03" />
        <rect x="7" y="7" width="2" height="8" fill="#451a03" />
        {/* Ferragens de Reforço */}
        <rect x="5" y="9" width="6" height="1" fill="#94a3b8" />
        <rect x="5" y="12" width="6" height="1" fill="#94a3b8" />
        <rect x="7" y="11" width="2" height="2" fill="#facc15" /> {/* Cadeado de Ouro */}
        {/* Chão */}
        <rect x="1" y="15" width="14" height="1" fill="#1e293b" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. BANCADA DE TRABALHO & DESMONTE (Workbench / Salvage)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('workbench') || keyLower.includes('bancada') || keyLower.includes('salvage') || keyLower.includes('forge')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Bigorna de Aço */}
        <rect x="4" y="3" width="8" height="2" fill="#94a3b8" />
        <rect x="3" y="3" width="2" height="1" fill="#cbd5e1" /> {/* Chifre da bigorna */}
        <rect x="5" y="5" width="6" height="2" fill="#64748b" />
        <rect x="4" y="7" width="8" height="2" fill="#475569" />
        <rect x="3" y="8" width="10" height="1" fill="#334155" />
        {/* Mesa / Tampo da Bancada de Madeira */}
        <rect x="1" y="9" width="14" height="3" fill="#b45309" />
        <rect x="1" y="9" width="14" height="1" fill="#d97706" />
        {/* Pernas da Bancada */}
        <rect x="2" y="12" width="3" height="4" fill="#78350f" />
        <rect x="11" y="12" width="3" height="4" fill="#78350f" />
        {/* Martelo Apoiado */}
        <rect x="12" y="3" width="2" height="3" fill="#94a3b8" />
        <rect x="12" y="6" width="1" height="3" fill="#92400e" />
        {/* Fagulhas / Brasas */}
        <rect x="9" y="2" width="1" height="1" fill="#facc15" />
        <rect x="11" y="1" width="1" height="1" fill="#f97316" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. FONTE ARCANA (Arcane Spring)
  // ──────────────────────────────────────────────────────────────────────────
  if (keyLower.includes('spring') || keyLower.includes('fonte') || keyLower.includes('arcane')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Cristal Flutuante no Topo */}
        <polygon points="8,1 10,3 8,6 6,3" fill="#38bdf8" />
        <polygon points="8,1 9,3 8,5 7,3" fill="#ffffff" />
        <rect x="5" y="2" width="1" height="1" fill="#a855f7" />
        <rect x="10" y="2" width="1" height="1" fill="#a855f7" />
        {/* Chafariz / Coluna Central */}
        <rect x="7" y="6" width="2" height="4" fill="#64748b" />
        <rect x="6" y="7" width="4" height="1" fill="#94a3b8" />
        {/* Borda da Piscina de Pedra */}
        <ellipse cx="8" cy="12" rx="7" ry="3" fill="#334155" />
        <ellipse cx="8" cy="12" rx="6" ry="2.2" fill="#475569" />
        {/* Água Mágica Cristalina */}
        <ellipse cx="8" cy="12" rx="5" ry="1.6" fill="#0284c7" />
        <ellipse cx="8" cy="12" rx="4" ry="1" fill="#38bdf8" />
        <rect x="7" y="11" width="2" height="1" fill="#ffffff" />
        {/* Runas Luminosas na Borda */}
        <rect x="3" y="12" width="1" height="1" fill="#00f0ff" />
        <rect x="12" y="12" width="1" height="1" fill="#00f0ff" />
      </svg>
    );
  }

  // Padrão Geral de Construção
  return (
    <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="4" width="12" height="10" fill="#64748b" />
      <polygon points="8,1 1,5 15,5" fill="#f59e0b" />
      <rect x="6" y="9" width="4" height="5" fill="#78350f" />
    </svg>
  );
}