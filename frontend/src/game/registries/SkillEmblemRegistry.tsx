export interface SkillEmblemProps {
  skillKey: string;
  size?: number;
  className?: string;
}

export function SkillEmblem({ skillKey, size = 28, className = '' }: SkillEmblemProps) {
  const k = (skillKey || '').toLowerCase();
  const viewBox = '0 0 16 16';

  // 1. WHIRLWIND (Golpe Giratório) — Cyclone de lâminas
  if (k === 'whirlwind') {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Vórtice de ar */}
        <circle cx="8" cy="8" r="6" fill="#1e293b" />
        <rect x="7" y="2" width="2" height="4" fill="#38bdf8" />
        <rect x="10" y="7" width="4" height="2" fill="#38bdf8" />
        <rect x="7" y="10" width="2" height="4" fill="#38bdf8" />
        <rect x="2" y="7" width="4" height="2" fill="#38bdf8" />
        {/* Lâminas em cruz inclinada */}
        <rect x="4" y="4" width="3" height="3" fill="#e2e8f0" />
        <rect x="9" y="9" width="3" height="3" fill="#e2e8f0" />
        <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
      </svg>
    );
  }

  // 2. BRUTAL STRIKE (Golpe Brutal) — Martelo de Impacto Esmagador
  if (k === 'brutal_strike') {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Fundo de energia */}
        <rect x="2" y="2" width="12" height="12" fill="#450a0a" rx="2" />
        {/* Martelo Descendo */}
        <rect x="4" y="4" width="7" height="4" fill="#cbd5e1" />
        <rect x="4" y="4" width="7" height="1" fill="#ffffff" />
        <rect x="4" y="7" width="7" height="1" fill="#475569" />
        <rect x="10" y="5" width="2" height="6" fill="#78350f" />
        {/* Faíscas de Impacto Sísmico */}
        <rect x="2" y="10" width="3" height="2" fill="#fbbf24" />
        <rect x="6" y="11" width="4" height="2" fill="#f97316" />
        <rect x="11" y="10" width="3" height="2" fill="#fbbf24" />
        <rect x="7" y="13" width="2" height="2" fill="#ef4444" />
      </svg>
    );
  }

  // 3. MULTISHOT (Tiro Quádruplo) — Leque de 4 Flechas
  if (k === 'multishot') {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#064e3b" rx="2" />
        {/* 4 Flechas Disparadas em Leque */}
        {/* Flecha 1 (Cima) */}
        <rect x="4" y="4" width="4" height="1" fill="#78350f" />
        <rect x="8" y="3" width="2" height="3" fill="#facc15" />
        {/* Flecha 2 (Centro-Cima) */}
        <rect x="4" y="6" width="6" height="1" fill="#78350f" />
        <rect x="10" y="5" width="2" height="3" fill="#facc15" />
        {/* Flecha 3 (Centro-Baixo) */}
        <rect x="4" y="9" width="6" height="1" fill="#78350f" />
        <rect x="10" y="8" width="2" height="3" fill="#facc15" />
        {/* Flecha 4 (Baixo) */}
        <rect x="4" y="11" width="4" height="1" fill="#78350f" />
        <rect x="8" y="10" width="2" height="3" fill="#facc15" />
      </svg>
    );
  }

  // 4. SNIPER SHOT (Tiro Preciso) — Mira Reticular & Flecha
  if (k === 'sniper_shot') {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#1e1b4b" rx="2" />
        {/* Retículo de Mira */}
        <circle cx="8" cy="8" r="4" stroke="#facc15" strokeWidth="1" fill="none" />
        <rect x="8" y="2" width="1" height="4" fill="#facc15" />
        <rect x="8" y="10" width="1" height="4" fill="#facc15" />
        <rect x="2" y="8" width="4" height="1" fill="#facc15" />
        <rect x="10" y="8" width="4" height="1" fill="#facc15" />
        {/* Ponto Central Crítico */}
        <rect x="7" y="7" width="2" height="2" fill="#ef4444" />
      </svg>
    );
  }

  // 5. FIREBALL (Bola de Fogo) — Orbe Ígnea Flamejante
  if (k === 'fireball') {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#431407" rx="2" />
        {/* Labaredas */}
        <rect x="4" y="4" width="8" height="8" fill="#ea580c" />
        <rect x="5" y="5" width="6" height="6" fill="#f97316" />
        <rect x="6" y="6" width="4" height="4" fill="#facc15" />
        <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
        {/* Faíscas externas */}
        <rect x="3" y="5" width="1" height="2" fill="#ef4444" />
        <rect x="12" y="5" width="1" height="2" fill="#ef4444" />
        <rect x="5" y="2" width="2" height="2" fill="#f97316" />
        <rect x="9" y="2" width="2" height="2" fill="#facc15" />
      </svg>
    );
  }

  // 6. ICE SHARD (Estilhaço de Gelo) — Cristal Glacial
  if (k === 'ice_shard') {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#082f49" rx="2" />
        {/* Cristal Central */}
        <polygon points="8,2 12,8 8,14 4,8" fill="#38bdf8" />
        <polygon points="8,2 10,8 8,13 6,8" fill="#cffafe" />
        <polygon points="8,4 9,8 8,11 7,8" fill="#ffffff" />
        {/* Flocos de gelo nos cantos */}
        <rect x="3" y="3" width="2" height="2" fill="#7dd3fc" />
        <rect x="11" y="3" width="2" height="2" fill="#7dd3fc" />
        <rect x="3" y="11" width="2" height="2" fill="#7dd3fc" />
        <rect x="11" y="11" width="2" height="2" fill="#7dd3fc" />
      </svg>
    );
  }

  // 7. ARCANE NOVA (Nova Arcana) — Explosão circular violeta
  if (k === 'arcane_nova') {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#3b0764" rx="2" />
        <rect x="7" y="3" width="2" height="2" fill="#f5d0fe" />
        <rect x="4" y="5" width="3" height="2" fill="#d946ef" />
        <rect x="10" y="5" width="2" height="3" fill="#d946ef" />
        <rect x="3" y="8" width="3" height="2" fill="#60a5fa" />
        <rect x="10" y="9" width="3" height="2" fill="#60a5fa" />
        <rect x="6" y="7" width="4" height="4" fill="#a855f7" />
        <rect x="7" y="8" width="2" height="2" fill="#ffffff" />
        <rect x="7" y="12" width="2" height="2" fill="#e879f9" />
      </svg>
    );
  }

  // 8. DIVINE HEAL (Cura Divina) — Cálice Sagrado e Cruz Radiante
  if (k === 'divine_heal') {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#064e3b" rx="2" />
        {/* Cruz Sagrada de Luz */}
        <rect x="7" y="3" width="2" height="10" fill="#fef08a" />
        <rect x="4" y="5" width="8" height="2" fill="#fef08a" />
        <rect x="7" y="5" width="2" height="2" fill="#ffffff" />
        {/* Partículas de Bênção */}
        <rect x="3" y="3" width="2" height="2" fill="#4ade80" />
        <rect x="11" y="3" width="2" height="2" fill="#4ade80" />
        <rect x="3" y="11" width="2" height="2" fill="#4ade80" />
        <rect x="11" y="11" width="2" height="2" fill="#4ade80" />
      </svg>
    );
  }

  // AUTO-ATTACK ARQUÉTIPO MELEE
  if (k.includes('melee') || k.includes('sword') || k.includes('axe') || k.includes('club')) {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#1e293b" rx="2" />
        <rect x="4" y="11" width="2" height="2" fill="#78350f" />
        <rect x="5" y="9" width="3" height="2" fill="#b45309" />
        <rect x="6" y="4" width="5" height="5" fill="#e2e8f0" />
        <rect x="8" y="2" width="3" height="3" fill="#ffffff" />
      </svg>
    );
  }

  // AUTO-ATTACK ARQUÉTIPO DISTANCE
  if (k.includes('distance') || k.includes('bow')) {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#1e293b" rx="2" />
        <rect x="3" y="4" width="2" height="8" fill="#b45309" />
        <rect x="5" y="7" width="7" height="2" fill="#e2e8f0" />
        <rect x="11" y="6" width="2" height="4" fill="#facc15" />
      </svg>
    );
  }

  // AUTO-ATTACK ARQUÉTIPO MAGIC
  if (k.includes('magic') || k.includes('wand') || k.includes('staff')) {
    return (
      <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="12" fill="#1e293b" rx="2" />
        <rect x="4" y="10" width="2" height="3" fill="#78350f" />
        <rect x="6" y="7" width="2" height="3" fill="#78350f" />
        <rect x="8" y="3" width="5" height="5" fill="#38bdf8" />
        <rect x="9" y="4" width="3" height="3" fill="#ffffff" />
      </svg>
    );
  }

  // Fallback
  return (
    <svg width={size} height={size} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="2" width="12" height="12" fill="#334155" rx="2" />
      <rect x="6" y="6" width="4" height="4" fill="#f59e0b" />
    </svg>
  );
}