export interface PixelItemSpriteProps {
  name?: string;
  slotType?: string;
  weaponType?: string;
  rarity?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PixelItemSprite({
  name = '',
  slotType = '',
  weaponType = '',
  rarity: _rarity = 'Comum',
  size = 'md',
  className = '',
}: PixelItemSpriteProps) {
  const nameClean = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const slotClean = (slotType || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const weaponClean = (weaponType || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const rarityClean = (_rarity || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isMythic = rarityClean.includes('mitic') || rarityClean.includes('divino');
  const isLegendary = rarityClean.includes('lend');
  const isEpic = rarityClean.includes('epic');
  const isRare = rarityClean.includes('raro');

  const sizePx = size === 'sm' ? 16 : size === 'lg' ? 32 : size === 'xl' ? 48 : 24;
  const viewBox = '0 0 16 16';

  // Identificação temática por Nome/Material do Item (Identidade Visual Autêntica)
  const isGoldOrCelestial =
    nameClean.includes('ouro') ||
    nameClean.includes('dourad') ||
    nameClean.includes('celestial') ||
    nameClean.includes('sagrado') ||
    nameClean.includes('sol');

  const isIceOrCrystal =
    nameClean.includes('gelo') ||
    nameClean.includes('glacial') ||
    nameClean.includes('cristal') ||
    nameClean.includes('geada') ||
    nameClean.includes('diamante');

  const isFireOrEmber =
    nameClean.includes('fogo') ||
    nameClean.includes('brasa') ||
    nameClean.includes('chama') ||
    nameClean.includes('vulcan') ||
    nameClean.includes('infernal');

  const isDarkOrShadow =
    nameClean.includes('sombra') ||
    nameClean.includes('noturna') ||
    nameClean.includes('trevas') ||
    nameClean.includes('obsidiana') ||
    nameClean.includes('greiscou') ||
    nameClean.includes('greiscu') ||
    nameClean.includes('abissal') ||
    nameClean.includes('caos');

  const isArcaneOrVoid =
    nameClean.includes('arcano') ||
    nameClean.includes('runico') ||
    nameClean.includes('vazio') ||
    nameClean.includes('etereo') ||
    nameClean.includes('astral');

  const isEmeraldOrPoison =
    nameClean.includes('esmeralda') ||
    nameClean.includes('veneno') ||
    nameClean.includes('toxico') ||
    nameClean.includes('floresta');

  const isWood = nameClean.includes('madeira') || nameClean.includes('madeir') || nameClean.includes('carvalho');
  const isLeather = nameClean.includes('couro') || nameClean.includes('pele');
  const isCloth = nameClean.includes('tecido') || nameClean.includes('linho') || nameClean.includes('tunica') || nameClean.includes('robe');
  const isBone = nameClean.includes('osso') || nameClean.includes('esquele') || nameClean.includes('presa');
  const isStone = nameClean.includes('pedra') || nameClean.includes('rocha');
  const isCopper = nameClean.includes('cobre');
  const isBronze = nameClean.includes('bronze');
  const isSilver = nameClean.includes('prata');
  const isIron = nameClean.includes('ferro');

  // Paleta Autêntica de Lâmina e Metais (Fiel ao item, independente da raridade)
  const bladeColor = isGoldOrCelestial
    ? '#facc15'
    : isIceOrCrystal
    ? '#38bdf8'
    : isFireOrEmber
    ? '#ef4444'
    : isDarkOrShadow
    ? '#334155'
    : isArcaneOrVoid
    ? '#a855f7'
    : isEmeraldOrPoison
    ? '#10b981'
    : isWood ? '#a16207' : isLeather ? '#92400e' : isCloth ? '#6366f1' : isBone ? '#d6d3d1' : isStone ? '#78716c' : isCopper ? '#c2410c' : isBronze ? '#b45309' : isSilver ? '#cbd5e1' : isIron ? '#64748b' : '#cbd5e1'; // Material base

  const bladeHighlight = isGoldOrCelestial
    ? '#fef08a'
    : isIceOrCrystal
    ? '#e0f2fe'
    : isFireOrEmber
    ? '#fef08a'
    : isDarkOrShadow
    ? '#64748b'
    : isArcaneOrVoid
    ? '#f3e8ff'
    : isEmeraldOrPoison
    ? '#6ee7b7'
    : isWood ? '#f59e0b' : isLeather ? '#d97706' : isCloth ? '#a5b4fc' : isBone ? '#fafaf9' : isStone ? '#a8a29e' : isCopper ? '#fb923c' : isBronze ? '#f59e0b' : '#f8fafc';

  const bladeShadow = isGoldOrCelestial
    ? '#ca8a04'
    : isIceOrCrystal
    ? '#0284c7'
    : isFireOrEmber
    ? '#991b1b'
    : isDarkOrShadow
    ? '#0f172a'
    : isArcaneOrVoid
    ? '#6b21a8'
    : isEmeraldOrPoison
    ? '#047857'
    : isWood ? '#451a03' : isLeather ? '#451a03' : isCloth ? '#3730a3' : isBone ? '#a8a29e' : isStone ? '#44403c' : isCopper ? '#7c2d12' : isBronze ? '#78350f' : '#64748b';

  const guardColor = isGoldOrCelestial
    ? '#ca8a04'
    : isIceOrCrystal
    ? '#0369a1'
    : isFireOrEmber
    ? '#78350f'
    : isDarkOrShadow
    ? '#1e293b'
    : isArcaneOrVoid
    ? '#4c1d95'
    : isEmeraldOrPoison
    ? '#064e3b'
    : '#b45309'; // Bronze/Madeira padrão

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ARMAS DISTANCE: ARCOS E BESTAS
  // ──────────────────────────────────────────────────────────────────────────
  if (
    weaponClean === 'bow' ||
    weaponClean === 'distance' ||
    nameClean.includes('arco') ||
    nameClean.includes('besta') ||
    nameClean.includes('balestra')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Arco Curvo */}
        <rect x="2" y="2" width="2" height="3" fill={guardColor} />
        <rect x="3" y="5" width="2" height="3" fill={guardColor} />
        <rect x="4" y="8" width="2" height="3" fill="#78350f" />
        <rect x="3" y="11" width="2" height="3" fill={guardColor} />
        <rect x="2" y="14" width="2" height="2" fill={guardColor} />
        {/* Corda */}
        <rect x="12" y="2" width="1" height="13" fill="#e2e8f0" opacity="0.8" />
        <rect x="4" y="2" width="8" height="1" fill="#e2e8f0" opacity="0.6" />
        <rect x="4" y="14" width="8" height="1" fill="#e2e8f0" opacity="0.6" />
        {/* Flecha Pronta */}
        <rect x="5" y="8" width="8" height="1" fill={bladeColor} />
        <rect x="13" y="7" width="2" height="3" fill={bladeHighlight} />
        <rect x="3" y="7" width="2" height="3" fill="#dc2626" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ARMAS MÁGICAS: VARINHAS E CAJADOS
  // ──────────────────────────────────────────────────────────────────────────
  if (
    weaponClean === 'wand' ||
    weaponClean === 'magic' ||
    nameClean.includes('varinha') ||
    nameClean.includes('cajado') ||
    nameClean.includes('cetro') ||
    nameClean.includes('rod')
  ) {
    const isStaff = nameClean.includes('cajado') || nameClean.includes('cetro');
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Haste / Cabo */}
        <rect x="3" y="12" width="2" height="3" fill="#78350f" />
        <rect x="5" y="9" width="2" height="4" fill="#78350f" />
        <rect x="7" y="6" width="2" height="4" fill="#78350f" />
        <rect x="9" y="3" width="2" height="4" fill={guardColor} />
        {/* Orbe / Cristal Mágico */}
        {isStaff ? (
          <>
            <rect x="10" y="0" width="5" height="5" fill={bladeColor} />
            <rect x="11" y="1" width="3" height="3" fill={bladeHighlight} />
            <rect x="9" y="2" width="1" height="3" fill={guardColor} />
            <rect x="15" y="2" width="1" height="3" fill={guardColor} />
          </>
        ) : (
          <>
            <rect x="11" y="1" width="4" height="4" fill={bladeColor} />
            <rect x="12" y="2" width="2" height="2" fill="#ffffff" />
            <rect x="10" y="1" width="1" height="1" fill={bladeHighlight} />
            <rect x="14" y="4" width="1" height="1" fill={bladeHighlight} />
          </>
        )}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ARMAS MELEE: MACHADOS
  // ──────────────────────────────────────────────────────────────────────────
  if (
    weaponClean === 'axe' ||
    nameClean.includes('machado') ||
    nameClean.includes('machadinha') ||
    nameClean.includes('cutelo')
  ) {
    const isDoubleAxe = isEpic || isLegendary || isMythic || nameClean.includes('duplo') || nameClean.includes('guerra');
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Cabo de madeira na diagonal */}
        <rect x="3" y="12" width="2" height="3" fill="#78350f" />
        <rect x="5" y="9" width="2" height="4" fill="#78350f" />
        <rect x="7" y="6" width="2" height="4" fill="#78350f" />
        <rect x="9" y="3" width="2" height="4" fill="#78350f" />
        {/* Cabeça do Machado (Lâmina Direita) */}
        <rect x="10" y="2" width="4" height="6" fill={bladeColor} />
        <rect x="13" y="1" width="2" height="8" fill={bladeHighlight} />
        <rect x="10" y="3" width="2" height="4" fill={bladeShadow} />
        {/* Lâmina Esquerda (se Machado Duplo) */}
        {isDoubleAxe && (
          <>
            <rect x="5" y="2" width="4" height="6" fill={bladeColor} />
            <rect x="4" y="1" width="2" height="8" fill={bladeHighlight} />
            <rect x="7" y="3" width="2" height="4" fill={bladeShadow} />
          </>
        )}
        {/* Encaixe central */}
        <rect x="8" y="3" width="3" height="4" fill={guardColor} />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ARMAS MELEE: CLAVAS / MAÇAS / MARTELOS
  // ──────────────────────────────────────────────────────────────────────────
  if (
    weaponClean === 'club' ||
    nameClean.includes('clava') ||
    nameClean.includes('maca') ||
    nameClean.includes('martelo') ||
    nameClean.includes('porrete') ||
    nameClean.includes('malho')
  ) {
    const isHammer = nameClean.includes('martelo') || nameClean.includes('malho');
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Cabo */}
        <rect x="3" y="12" width="2" height="3" fill="#78350f" />
        <rect x="5" y="9" width="2" height="4" fill="#78350f" />
        <rect x="7" y="6" width="2" height="4" fill="#78350f" />
        {isHammer ? (
          <>
            {/* Bloco de Martelo */}
            <rect x="7" y="1" width="7" height="6" fill={bladeColor} />
            <rect x="7" y="1" width="7" height="2" fill={bladeHighlight} />
            <rect x="7" y="5" width="7" height="2" fill={bladeShadow} />
            <rect x="13" y="2" width="2" height="4" fill={guardColor} />
          </>
        ) : (
          <>
            {/* Maça / Estrela com Espinhos */}
            <rect x="8" y="2" width="5" height="5" fill={bladeColor} />
            <rect x="9" y="3" width="3" height="3" fill={bladeHighlight} />
            <rect x="10" y="0" width="1" height="2" fill={bladeShadow} />
            <rect x="10" y="7" width="1" height="2" fill={bladeShadow} />
            <rect x="6" y="4" width="2" height="1" fill={bladeShadow} />
            <rect x="13" y="4" width="2" height="1" fill={bladeShadow} />
          </>
        )}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. ARMAS MELEE: ESPADAS & LÂMINAS & MAINHAND FALLBACK
  // ──────────────────────────────────────────────────────────────────────────
  if (
    weaponClean === 'sword' ||
    nameClean.includes('espada') ||
    nameClean.includes('lamina') ||
    nameClean.includes('sabre') ||
    nameClean.includes('montante') ||
    nameClean.includes('florete') ||
    nameClean.includes('adaga') ||
    nameClean.includes('punhal') ||
    nameClean.includes('gladio') ||
    nameClean.includes('katana') ||
    nameClean.includes('cimitarra') ||
    nameClean.includes('greiscou') ||
    nameClean.includes('greiscu') ||
    nameClean.includes('vingador') ||
    slotClean === 'mainhand' ||
    slotClean === 'weapon'
  ) {
    const isGreatsword = nameClean.includes('montante') || nameClean.includes('duas maos');
    return (
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={viewBox}
        className={`pixel-art ${className}`}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Pomo */}
        <rect x="2" y="13" width="2" height="2" fill={guardColor} />
        {/* Cabo / Empunhadura */}
        <rect x="3" y="11" width="2" height="3" fill="#5c2c16" />
        <rect x="4" y="11" width="1" height="2" fill="#854d0e" />
        {/* Guarda-mão */}
        <rect x="2" y="10" width="6" height="2" fill={guardColor} />
        <rect x="1" y="10" width="1" height="1" fill={bladeHighlight} />
        <rect x="8" y="10" width="1" height="1" fill={guardColor} />
        {/* Gema na Guarda se for Raro+ */}
        {(isRare || isEpic || isLegendary || isMythic) && (
          <rect x="4" y="10" width="2" height="1" fill={isMythic ? '#ff0055' : isLegendary ? '#00f0ff' : '#dc2626'} />
        )}
        {/* Lâmina */}
        {isGreatsword ? (
          <>
            <rect x="4" y="3" width="4" height="7" fill={bladeColor} />
            <rect x="4" y="3" width="2" height="7" fill={bladeHighlight} />
            <rect x="7" y="3" width="1" height="7" fill={bladeShadow} />
            <rect x="5" y="1" width="2" height="2" fill={bladeHighlight} />
            <rect x="6" y="1" width="1" height="2" fill={bladeShadow} />
          </>
        ) : (
          <>
            <rect x="5" y="3" width="3" height="7" fill={bladeColor} />
            <rect x="5" y="3" width="1" height="7" fill={bladeHighlight} />
            <rect x="7" y="3" width="1" height="7" fill={bladeShadow} />
            <rect x="6" y="1" width="1" height="2" fill={bladeHighlight} />
          </>
        )}
        {/* Runas Cósmicas / Aura se for Lendário/Mítico */}
        {(isLegendary || isMythic) && (
          <>
            <rect x="6" y="4" width="1" height="1" fill="#ffffff" />
            <rect x="6" y="7" width="1" height="1" fill="#ffffff" />
            <rect x="4" y="2" width="1" height="1" fill={isMythic ? '#00ffff' : '#fef08a'} opacity="0.8" />
            <rect x="8" y="5" width="1" height="1" fill={isMythic ? '#ff00aa' : '#fef08a'} opacity="0.8" />
          </>
        )}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. ESCUDOS (Shields / OffHand)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'offhand' ||
    slotClean === 'shield' ||
    nameClean.includes('escudo') ||
    nameClean.includes('pavise') ||
    nameClean.includes('broquel')
  ) {
    const isBuckler = nameClean.includes('broquel');
    if (isWood) {
      return (
        <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
          {isBuckler ? (
            <>
              {/* Broquel redondo: tábuas verticais, aro escuro e umbo metálico. */}
              <rect x="5" y="2" width="6" height="1" fill="#451a03" />
              <rect x="3" y="3" width="10" height="2" fill="#78350f" />
              <rect x="2" y="5" width="12" height="6" fill="#78350f" />
              <rect x="3" y="11" width="10" height="2" fill="#78350f" />
              <rect x="5" y="13" width="6" height="1" fill="#451a03" />
              <rect x="3" y="5" width="2" height="6" fill="#a16207" />
              <rect x="5" y="4" width="2" height="8" fill="#b45309" />
              <rect x="7" y="3" width="2" height="10" fill="#d97706" />
              <rect x="9" y="4" width="2" height="8" fill="#b45309" />
              <rect x="11" y="5" width="2" height="6" fill="#92400e" />
              <rect x="4" y="7" width="8" height="1" fill="#451a03" opacity="0.55" />
              <rect x="7" y="6" width="2" height="3" fill="#94a3b8" />
              <rect x="8" y="6" width="1" height="1" fill="#e2e8f0" />
              {(isRare || isEpic || isLegendary || isMythic) && <rect x="7" y="10" width="2" height="1" fill="#facc15" />}
            </>
          ) : (
            <>
              {/* Escudo de madeira maior: pranchas visíveis com reforços. */}
              <rect x="3" y="2" width="10" height="8" fill="#78350f" />
              <rect x="4" y="10" width="8" height="3" fill="#78350f" />
              <rect x="6" y="13" width="4" height="2" fill="#451a03" />
              <rect x="4" y="3" width="2" height="9" fill="#a16207" />
              <rect x="6" y="3" width="2" height="10" fill="#d97706" />
              <rect x="8" y="3" width="2" height="10" fill="#b45309" />
              <rect x="10" y="3" width="2" height="9" fill="#92400e" />
              <rect x="3" y="6" width="10" height="2" fill="#475569" />
              <rect x="7" y="5" width="2" height="4" fill="#94a3b8" />
            </>
          )}
        </svg>
      );
    }

    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="2" width="12" height="7" fill={bladeColor} />
        <rect x="3" y="9" width="10" height="3" fill={bladeColor} />
        <rect x="5" y="12" width="6" height="2" fill={bladeColor} />
        <rect x="7" y="14" width="2" height="1" fill={bladeColor} />
        <rect x="2" y="2" width="12" height="1" fill={bladeHighlight} />
        <rect x="2" y="2" width="1" height="7" fill={bladeHighlight} />
        <rect x="13" y="2" width="1" height="7" fill={bladeShadow} />
        <rect x="7" y="3" width="2" height="8" fill={guardColor} />
        <rect x="4" y="5" width="8" height="2" fill={guardColor} />
        {(isRare || isEpic || isLegendary || isMythic) && <rect x="7" y="5" width="2" height="2" fill="#fde047" />}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. ELMOS / CAPACETES (Head)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'head' ||
    slotClean === 'helmet' ||
    nameClean.includes('elmo') ||
    nameClean.includes('capacete') ||
    nameClean.includes('coifa') ||
    nameClean.includes('tiara') ||
    nameClean.includes('coroa') ||
    nameClean.includes('chapeu') ||
    nameClean.includes('capuz')
  ) {
    const isCrown = nameClean.includes('coroa') || nameClean.includes('tiara');
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {isCrown ? (
          <>
            <rect x="2" y="7" width="12" height="5" fill="#eab308" />
            <rect x="2" y="4" width="2" height="3" fill="#eab308" />
            <rect x="7" y="3" width="2" height="4" fill="#eab308" />
            <rect x="12" y="4" width="2" height="3" fill="#eab308" />
            <rect x="7" y="8" width="2" height="2" fill="#dc2626" />
            <rect x="4" y="8" width="2" height="2" fill="#2563eb" />
            <rect x="10" y="8" width="2" height="2" fill="#16a34a" />
          </>
        ) : (
          <>
            {/* Topo do Elmo */}
            <rect x="4" y="2" width="8" height="3" fill={bladeHighlight} />
            <rect x="3" y="5" width="10" height="7" fill={bladeColor} />
            <rect x="2" y="8" width="12" height="4" fill={bladeShadow} />
            {/* Visor / Abertura dos Olhos */}
            <rect x="4" y="7" width="8" height="2" fill="#020617" />
            <rect x="7" y="6" width="2" height="4" fill={bladeHighlight} />
            {/* Pluma se for Épico+ */}
            {(isEpic || isLegendary || isMythic) && (
              <>
                <rect x="7" y="0" width="2" height="3" fill="#dc2626" />
                <rect x="6" y="1" width="1" height="2" fill="#ef4444" />
              </>
            )}
          </>
        )}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. PEITORAIS / ARMADURAS / ROBES (Chest)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'chest' ||
    slotClean === 'armor' ||
    nameClean.includes('armadura') ||
    nameClean.includes('peitoral') ||
    nameClean.includes('cota') ||
    nameClean.includes('robe') ||
    nameClean.includes('tunica') ||
    nameClean.includes('manto') ||
    nameClean.includes('couraca') ||
    nameClean.includes('gibao')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Ombros / Ombreiras */}
        <rect x="1" y="3" width="4" height="4" fill={guardColor} />
        <rect x="11" y="3" width="4" height="4" fill={guardColor} />
        {/* Tronco */}
        <rect x="4" y="2" width="8" height="11" fill={bladeColor} />
        <rect x="4" y="2" width="4" height="11" fill={bladeHighlight} />
        <rect x="8" y="2" width="4" height="11" fill={bladeShadow} />
        {/* Detalhe do Peitoral */}
        <rect x="6" y="4" width="4" height="4" fill={guardColor} />
        <rect x="7" y="5" width="2" height="2" fill={isRare || isEpic ? '#38bdf8' : '#f59e0b'} />
        {/* Faixa na Cintura */}
        <rect x="4" y="11" width="8" height="2" fill="#451a03" />
        <rect x="7" y="11" width="2" height="2" fill="#fbbf24" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. CALÇAS / GREVAS (Legs)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'legs' ||
    nameClean.includes('calca') ||
    nameClean.includes('grevas') ||
    nameClean.includes('perneira') ||
    nameClean.includes('saiote')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Cinto */}
        <rect x="3" y="2" width="10" height="2" fill="#78350f" />
        <rect x="7" y="2" width="2" height="2" fill="#fbbf24" />
        {/* Perna Esquerda */}
        <rect x="3" y="4" width="4" height="10" fill={bladeColor} />
        <rect x="3" y="4" width="2" height="10" fill={bladeHighlight} />
        {/* Perna Direita */}
        <rect x="9" y="4" width="4" height="10" fill={bladeColor} />
        <rect x="11" y="4" width="2" height="10" fill={bladeShadow} />
        {/* Joelheiras Reforçadas */}
        <rect x="3" y="8" width="4" height="2" fill={guardColor} />
        <rect x="9" y="8" width="4" height="2" fill={guardColor} />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 10. BOTAS (Boots)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'boots' ||
    nameClean.includes('bota') ||
    nameClean.includes('coturno') ||
    nameClean.includes('sapato') ||
    nameClean.includes('sandalia')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Bota Esquerda */}
        <rect x="2" y="4" width="4" height="7" fill={bladeColor} />
        <rect x="1" y="10" width="6" height="3" fill={bladeHighlight} />
        <rect x="1" y="13" width="6" height="1" fill="#451a03" />
        {/* Bota Direita */}
        <rect x="10" y="4" width="4" height="7" fill={bladeColor} />
        <rect x="9" y="10" width="6" height="3" fill={bladeShadow} />
        <rect x="9" y="13" width="6" height="1" fill="#451a03" />
        {/* Asas nas Botas se for Raro+ */}
        {(isEpic || isLegendary || isMythic) && (
          <>
            <rect x="0" y="5" width="2" height="2" fill="#ffffff" />
            <rect x="14" y="5" width="2" height="2" fill="#ffffff" />
          </>
        )}
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 11. COLAR / AMULETO / TALISMÃ (Necklace)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'necklace' ||
    nameClean.includes('colar') ||
    nameClean.includes('amuleto') ||
    nameClean.includes('talisma') ||
    nameClean.includes('pingente') ||
    nameClean.includes('gargantilha')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Corrente */}
        <rect x="4" y="2" width="8" height="1" fill="#fbbf24" />
        <rect x="3" y="3" width="1" height="4" fill="#fbbf24" />
        <rect x="12" y="3" width="1" height="4" fill="#fbbf24" />
        <rect x="4" y="7" width="2" height="2" fill="#fbbf24" />
        <rect x="10" y="7" width="2" height="2" fill="#fbbf24" />
        {/* Pingente / Gema */}
        <rect x="6" y="9" width="4" height="4" fill={isMythic ? '#00ffff' : isLegendary ? '#facc15' : isEpic ? '#dc2626' : '#2563eb'} />
        <rect x="7" y="10" width="2" height="2" fill="#ffffff" />
        <rect x="7" y="13" width="2" height="1" fill="#fbbf24" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 12. ANEL (Ring)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'ring' ||
    nameClean.includes('anel') ||
    nameClean.includes('alianca')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Aro do Anel */}
        <rect x="4" y="5" width="8" height="8" fill="#eab308" />
        <rect x="6" y="7" width="4" height="4" fill="#020617" />
        <rect x="5" y="6" width="2" height="2" fill="#fef08a" />
        {/* Gema no Topo */}
        <rect x="6" y="2" width="4" height="4" fill={isMythic ? '#ec4899' : isLegendary ? '#38bdf8' : '#ef4444'} />
        <rect x="7" y="3" width="2" height="2" fill="#ffffff" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 13. MOCHILA (Bag)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'bag' ||
    nameClean.includes('mochila') ||
    nameClean.includes('bolsa') ||
    nameClean.includes('sacola')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Alça superior */}
        <rect x="6" y="2" width="4" height="2" fill="#451a03" />
        {/* Corpo da Mochila */}
        <rect x="3" y="4" width="10" height="10" fill="#78350f" />
        <rect x="3" y="4" width="10" height="3" fill="#92400e" />
        {/* Bolso Frontal */}
        <rect x="5" y="8" width="6" height="5" fill="#451a03" />
        {/* Fivelas de Ouro */}
        <rect x="4" y="7" width="2" height="1" fill="#facc15" />
        <rect x="10" y="7" width="2" height="1" fill="#facc15" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 14. MUNIÇÃO / ALJAVA (Ammo)
  // ──────────────────────────────────────────────────────────────────────────
  if (
    slotClean === 'ammo' ||
    nameClean.includes('municao') ||
    nameClean.includes('flecha') ||
    nameClean.includes('virote') ||
    nameClean.includes('aljava')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Aljava */}
        <rect x="5" y="5" width="6" height="10" fill="#78350f" />
        <rect x="5" y="5" width="6" height="2" fill="#451a03" />
        {/* Pontas / Penas das Flechas */}
        <rect x="6" y="2" width="1" height="4" fill="#94a3b8" />
        <rect x="5" y="1" width="3" height="2" fill="#ef4444" />
        <rect x="8" y="2" width="1" height="4" fill="#94a3b8" />
        <rect x="7" y="1" width="3" height="2" fill="#3b82f6" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 15. LIVROS DE HABILIDADE E BLUEPRINTS
  // ──────────────────────────────────────────────────────────────────────────
  if (nameClean.includes('livro') || nameClean.includes('tomo') || nameClean.includes('tome') || nameClean.includes('grimorio')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="3" y="2" width="10" height="12" fill="#7e22ce" />
        <rect x="2" y="2" width="2" height="12" fill="#581c87" />
        <rect x="12" y="3" width="1" height="10" fill="#fef08a" />
        <rect x="6" y="5" width="4" height="4" fill="#fbbf24" />
        <rect x="7" y="6" width="2" height="2" fill="#ffffff" />
      </svg>
    );
  }

  if (nameClean.includes('projeto') || nameClean.includes('blueprint') || nameClean.includes('pergaminho') || nameClean.includes('manual') || nameClean.includes('planta')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="4" width="12" height="8" fill="#fef08a" />
        <rect x="1" y="3" width="2" height="10" fill="#d97706" />
        <rect x="13" y="3" width="2" height="10" fill="#d97706" />
        <rect x="7" y="7" width="2" height="2" fill="#dc2626" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 16. RECURSOS VEGETAIS: MADEIRA, TÁBUAS, RESINA, TRIGO, SEMENTES, FLORES, ERVAS
  // ──────────────────────────────────────────────────────────────────────────
  if (
    nameClean.includes('madeira') ||
    nameClean.includes('wood') ||
    nameClean.includes('tronco') ||
    nameClean.includes('tora') ||
    nameClean.includes('lenha')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Tronco de base inferior */}
        <rect x="2" y="8" width="12" height="6" rx="1" fill="#78350f" />
        <rect x="2" y="9" width="10" height="4" fill="#92400e" />
        <line x1="4" y1="10" x2="10" y2="10" stroke="#b45309" strokeWidth="1" />
        <ellipse cx="12" cy="11" rx="1.5" ry="2.5" fill="#d97706" />
        <ellipse cx="12" cy="11" rx="0.8" ry="1.5" fill="#fef3c7" />
        {/* Tronco superior empilhado */}
        <rect x="3" y="3" width="10" height="5" rx="1" fill="#78350f" />
        <rect x="3" y="4" width="8" height="3" fill="#92400e" />
        <line x1="5" y1="5" x2="9" y2="5" stroke="#b45309" strokeWidth="1" />
        <ellipse cx="11" cy="5.5" rx="1.5" ry="2" fill="#d97706" />
        <ellipse cx="11" cy="5.5" rx="0.8" ry="1" fill="#fef3c7" />
      </svg>
    );
  }

  if (
    nameClean.includes('tabua') ||
    nameClean.includes('plank') ||
    nameClean.includes('prancha') ||
    nameClean.includes('board') ||
    nameClean.includes('treated_plank')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        {/* Prancha de fundo */}
        <rect x="4" y="6" width="11" height="8" rx="0.5" fill="#78350f" />
        <rect x="4.5" y="6.5" width="10" height="7" fill="#b45309" />
        <line x1="6" y1="9" x2="13" y2="9" stroke="#d97706" strokeWidth="0.8" />
        <line x1="7" y1="11" x2="12" y2="11" stroke="#92400e" strokeWidth="0.8" />
        {/* Prancha de cima em diagonal/sobreposta */}
        <rect x="1" y="2" width="11" height="8" rx="0.5" fill="#92400e" />
        <rect x="1.5" y="2.5" width="10" height="7" fill="#d97706" />
        <line x1="3" y1="5" x2="10" y2="5" stroke="#f59e0b" strokeWidth="0.8" />
        <line x1="4" y1="7" x2="9" y2="7" stroke="#b45309" strokeWidth="0.8" />
        {/* Pregos/detalhes */}
        <circle cx="2.5" cy="3.5" r="0.6" fill="#475569" />
        <circle cx="10.5" cy="8.5" r="0.6" fill="#475569" />
      </svg>
    );
  }

  if (nameClean.includes('resina') || nameClean.includes('resin') || nameClean.includes('seiva')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <path d="M 8,2 C 5,6 3,9 3,11 C 3,13.8 5.2,15 8,15 C 10.8,15 13,13.8 13,11 C 13,9 11,6 8,2 Z" fill="#b45309" />
        <path d="M 8,3.5 C 6,7 4.5,9.5 4.5,11 C 4.5,13 6,14 8,14 C 10,14 11.5,13 11.5,11 C 11.5,9.5 10,7 8,3.5 Z" fill="#f59e0b" />
        <circle cx="6.5" cy="10" r="1.5" fill="#fef08a" />
        <circle cx="6" cy="9.5" r="0.6" fill="#ffffff" />
      </svg>
    );
  }

  if (nameClean.includes('trigo') || nameClean.includes('wheat') || nameClean.includes('cereal')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <line x1="8" y1="15" x2="8" y2="4" stroke="#a16207" strokeWidth="1.2" />
        <polygon points="8,2 10,4 8,5 6,4" fill="#facc15" />
        <polygon points="8,4 11,6 8,7 5,6" fill="#eab308" />
        <polygon points="8,6 11,8 8,9 5,8" fill="#ca8a04" />
        <polygon points="8,8 10,10 8,11 6,10" fill="#a16207" />
        <circle cx="8" cy="3" r="0.5" fill="#fef08a" />
      </svg>
    );
  }

  if (nameClean.includes('semente') || nameClean.includes('seeds') || nameClean.includes('grao')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <circle cx="6" cy="11" r="2.5" fill="#ca8a04" />
        <circle cx="10" cy="10" r="2.5" fill="#eab308" />
        <circle cx="7" cy="8" r="2" fill="#facc15" />
        <path d="M 7,7 Q 8,4 11,3" fill="none" stroke="#22c55e" strokeWidth="1" />
        <circle cx="11" cy="3" r="1" fill="#4ade80" />
      </svg>
    );
  }

  if (nameClean.includes('farinha') || nameClean.includes('flour')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="3,6 13,6 14,14 2,14" fill="#a16207" />
        <polygon points="4,7 12,7 13,13 3,13" fill="#ca8a04" />
        <ellipse cx="8" cy="6" rx="4" ry="2.5" fill="#f8fafc" />
        <ellipse cx="8" cy="6" rx="2.5" ry="1.5" fill="#ffffff" />
      </svg>
    );
  }

  if (nameClean.includes('flor') || nameClean.includes('blossom')) {
    const isArcane = nameClean.includes('arcana') || nameClean.includes('blossom');
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <circle cx="8" cy="8" r="2" fill={isArcane ? '#38bdf8' : '#fbbf24'} />
        <circle cx="8" cy="4" r="2.5" fill={isArcane ? '#a855f7' : '#ef4444'} />
        <circle cx="12" cy="8" r="2.5" fill={isArcane ? '#c084fc' : '#f87171'} />
        <circle cx="8" cy="12" r="2.5" fill={isArcane ? '#a855f7' : '#ef4444'} />
        <circle cx="4" cy="8" r="2.5" fill={isArcane ? '#c084fc' : '#f87171'} />
        <circle cx="8" cy="8" r="1" fill="#ffffff" />
      </svg>
    );
  }

  if (nameClean.includes('erva') || nameClean.includes('herbs') || nameClean.includes('planta')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <path d="M 8,14 Q 7,9 4,6 Q 8,6 8,14" fill="#15803d" />
        <path d="M 8,14 Q 9,8 13,5 Q 12,9 8,14" fill="#16a34a" />
        <path d="M 8,14 Q 8,7 8,3 Q 9,6 8,14" fill="#22c55e" />
        <line x1="8" y1="14" x2="8" y2="4" stroke="#86efac" strokeWidth="0.8" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 17. RECURSOS INDUSTRIAIS: CARVÃO, MINÉRIOS, LINGOTES, PEDRAS, CRISTAIS
  // ──────────────────────────────────────────────────────────────────────────
  if (nameClean.includes('carvao') || nameClean.includes('coal')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="4,5 9,3 13,6 14,11 9,14 3,12 2,7" fill="#0f172a" />
        <polygon points="5,6 9,4 12,7 13,10 9,13 4,11 3,8" fill="#1e293b" />
        <polygon points="6,7 9,5 11,7 10,10 6,9" fill="#334155" />
        <rect x="7" y="6" width="2" height="1" fill="#64748b" />
      </svg>
    );
  }

  if (nameClean.includes('lingote') || nameClean.includes('ingot') || nameClean.includes('barra')) {
    const isGold = nameClean.includes('ouro') || nameClean.includes('gold');
    const isSilver = nameClean.includes('prata') || nameClean.includes('silver');
    const barColor = isGold ? '#facc15' : isSilver ? '#e2e8f0' : '#64748b';
    const barLight = isGold ? '#fef08a' : isSilver ? '#ffffff' : '#cbd5e1';
    const barShadow = isGold ? '#ca8a04' : isSilver ? '#94a3b8' : '#334155';
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="3,9 11,9 13,13 1,13" fill={barShadow} />
        <polygon points="3,5 11,5 13,9 1,9" fill={barColor} />
        <polygon points="4,5 10,5 12,8 2,8" fill={barLight} />
        <line x1="4" y1="5" x2="10" y2="5" stroke="#ffffff" strokeWidth="0.8" />
      </svg>
    );
  }

  if (
    nameClean.includes('minerio') ||
    nameClean.includes('ore') ||
    nameClean.includes('cobre') ||
    nameClean.includes('copper') ||
    nameClean.includes('ferro') ||
    nameClean.includes('iron') ||
    nameClean.includes('pedra') ||
    nameClean.includes('stone') ||
    nameClean.includes('rocha')
  ) {
    const isCopper = nameClean.includes('cobre') || nameClean.includes('copper');
    const isIron = nameClean.includes('ferro') || nameClean.includes('iron');
    const isStone = nameClean.includes('pedra') || nameClean.includes('stone');
    const oreBase = isCopper ? '#7c2d12' : isIron ? '#1e293b' : isStone ? '#334155' : '#78350f';
    const oreGleam = isCopper ? '#c2410c' : isIron ? '#475569' : isStone ? '#64748b' : '#a16207';
    const sparkleColor = isCopper ? '#fed7aa' : isIron ? '#f8fafc' : isStone ? '#94a3b8' : '#fef08a';
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="4,4 10,2 14,6 13,12 7,14 2,11 2,6" fill={oreBase} />
        <polygon points="5,5 9,3 12,6 11,10 7,12 3,10 3,7" fill={oreGleam} />
        <rect x="5" y="6" width="3" height="2" fill={sparkleColor} />
        <rect x="9" y="8" width="3" height="2" fill={sparkleColor} />
        <rect x="6" y="10" width="2" height="1" fill={sparkleColor} />
        <circle cx="10" cy="5" r="0.8" fill="#ffffff" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 18. FIBRAS, TECIDOS, LINHO, SEDA, RETALHOS, BANDEIRAS, CAMISAS
  // ──────────────────────────────────────────────────────────────────────────
  if (nameClean.includes('bandeira') || nameClean.includes('flag') || nameClean.includes('patriot')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <line x1="2" y1="2" x2="2" y2="15" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="3" y="3" width="11" height="8" fill="#15803d" />
        <polygon points="8.5,4 13,7 8.5,10 4,7" fill="#facc15" />
        <circle cx="8.5" cy="7" r="1.5" fill="#1d4ed8" />
      </svg>
    );
  }

  if (nameClean.includes('camisa') || nameClean.includes('shirt') || nameClean.includes('militant')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="4,2 12,2 15,6 13,8 12,6 12,14 4,14 4,6 3,8 1,6" fill="#dc2626" />
        <polygon points="5,3 11,3 13,6 11,6 11,13 5,13 5,6 3,6" fill="#ef4444" />
        <polygon points="7,2 9,2 8,4" fill="#0f172a" />
        <rect x="7" y="7" width="2" height="3" fill="#fef08a" />
      </svg>
    );
  }

  if (
    nameClean.includes('fibra') ||
    nameClean.includes('fiber') ||
    nameClean.includes('tecido') ||
    nameClean.includes('cloth') ||
    nameClean.includes('retalho') ||
    nameClean.includes('seda') ||
    nameClean.includes('silk') ||
    nameClean.includes('mascara') ||
    nameClean.includes('faixa')
  ) {
    const isSilk = nameClean.includes('seda') || nameClean.includes('silk');
    const isScrap = nameClean.includes('retalho') || nameClean.includes('cloth_scrap');
    const isMask = nameClean.includes('mascara') || nameClean.includes('ninja');
    const clothColor = isMask ? '#0f172a' : isSilk ? '#a855f7' : isScrap ? '#ef4444' : '#0284c7';
    const clothLight = isMask ? '#334155' : isSilk ? '#e9d5ff' : isScrap ? '#fca5a5' : '#7dd3fc';
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <ellipse cx="6" cy="8" rx="4" ry="5" fill={clothColor} />
        <ellipse cx="6" cy="8" rx="3" ry="4" fill={clothLight} />
        <rect x="6" y="3" width="7" height="10" fill={clothColor} rx="1" />
        <rect x="7" y="4" width="5" height="8" fill={clothLight} />
        <line x1="4" y1="13" x2="13" y2="13" stroke="#1e293b" strokeWidth="1" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 19. PELES, COUROS, ESCAMAS
  // ──────────────────────────────────────────────────────────────────────────
  if (
    nameClean.includes('couro') ||
    nameClean.includes('leather') ||
    nameClean.includes('hide') ||
    nameClean.includes('pelt') ||
    nameClean.includes('pele')
  ) {
    const isTroll = nameClean.includes('troll');
    const isTanned = nameClean.includes('curtido') || nameClean.includes('tanned');
    const baseColor = isTroll ? '#15803d' : isTanned ? '#78350f' : '#b45309';
    const lightColor = isTroll ? '#22c55e' : isTanned ? '#92400e' : '#d97706';
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="3,3 13,3 15,8 13,14 3,14 1,8" fill={baseColor} />
        <polygon points="4,4 12,4 13,8 12,13 4,13 2,8" fill={lightColor} />
        <polygon points="6,6 10,6 11,8 10,11 6,11 5,8" fill={baseColor} />
        <rect x="7" y="7" width="2" height="2" fill="#fef08a" />
      </svg>
    );
  }

  if (nameClean.includes('escama') || nameClean.includes('scale')) {
    const isDragon = nameClean.includes('cinder') || nameClean.includes('dragon');
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="8,2 14,7 12,14 4,14 2,7" fill={isDragon ? '#b91c1c' : '#0284c7'} />
        <polygon points="8,3 13,7 11,13 5,13 3,7" fill={isDragon ? '#ef4444' : '#38bdf8'} />
        <polygon points="8,5 11,8 10,12 6,12 5,8" fill={isDragon ? '#f87171' : '#bae6fd'} />
        <rect x="7" y="5" width="2" height="3" fill="#ffffff" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 20. PEIXES & CARNES
  // ──────────────────────────────────────────────────────────────────────────
  if (nameClean.includes('peixe') || nameClean.includes('fish') || nameClean.includes('salmao')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="3,8 8,4 13,8 8,12" fill="#0284c7" />
        <polygon points="4,8 8,5 12,8 8,11" fill="#38bdf8" />
        <polygon points="12,8 15,5 15,11" fill="#0369a1" />
        <polygon points="12,8 14,6 14,10" fill="#7dd3fc" />
        <circle cx="5" cy="7" r="0.8" fill="#ffffff" />
        <circle cx="5" cy="7" r="0.4" fill="#0f172a" />
      </svg>
    );
  }

  if (nameClean.includes('carne') || nameClean.includes('meat')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <ellipse cx="8" cy="9" rx="6" ry="4" fill="#991b1b" />
        <ellipse cx="8" cy="9" rx="5" ry="3" fill="#dc2626" />
        <ellipse cx="8" cy="9" rx="3" ry="1.8" fill="#ef4444" />
        <ellipse cx="6" cy="8" rx="1.5" ry="1.2" fill="#fecaca" />
        <circle cx="12" cy="7" r="1.5" fill="#f8fafc" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 21. PARTES DE MONSTRO ESPECIAIS (GANCHO, CANETA, COROA, FIVELA, ETC.)
  // ──────────────────────────────────────────────────────────────────────────
  if (nameClean.includes('gancho') || nameClean.includes('hook')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="5" y="11" width="6" height="4" rx="1" fill="#78350f" />
        <rect x="6" y="11" width="4" height="2" fill="#ca8a04" />
        <circle cx="8" cy="13" r="0.8" fill="#facc15" />
        <path d="M 8,11 L 8,6 C 8,3 13,3 13,7 C 13,10 9,10 9,8" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <path d="M 8,10 L 8,6 C 8,4 12,4 12,7" fill="none" stroke="#f1f5f9" strokeWidth="1" strokeLinecap="round" />
        <polygon points="9,8 8,7 9,6" fill="#f8fafc" />
      </svg>
    );
  }

  if (nameClean.includes('caneta') || nameClean.includes('pen') || nameClean.includes('xandaum')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="12,1 15,4 7,12 4,9" fill="#0f172a" />
        <polygon points="11,2 14,5 8,11 5,8" fill="#1e293b" />
        <polygon points="8,8 10,10 9,11 7,9" fill="#facc15" />
        <polygon points="4,9 7,12 2,15 1,14" fill="#eab308" />
        <polygon points="3,10 6,13 2,14" fill="#fef08a" />
        <line x1="5" y1="11" x2="2" y2="14" stroke="#0284c7" strokeWidth="0.8" />
      </svg>
    );
  }

  if (nameClean.includes('tiara') || nameClean.includes('coroa') || nameClean.includes('crown')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="2,13 14,13 15,5 11,9 8,3 5,9 1,5" fill="#ca8a04" />
        <polygon points="3,12 13,12 14,6 11,9.5 8,4.5 5,9.5 2,6" fill="#facc15" />
        <circle cx="8" cy="8" r="1.5" fill="#10b981" />
        <circle cx="4" cy="9" r="1" fill="#ef4444" />
        <circle cx="12" cy="9" r="1" fill="#38bdf8" />
      </svg>
    );
  }

  if (nameClean.includes('fivela') || nameClean.includes('buckle') || nameClean.includes('belt')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="5" width="12" height="6" rx="1" fill="#475569" />
        <rect x="3" y="6" width="10" height="4" fill="#94a3b8" />
        <rect x="5" y="7" width="6" height="2" fill="#0f172a" />
        <rect x="7" y="6" width="2" height="4" fill="#facc15" />
      </svg>
    );
  }

  if (nameClean.includes('orelha') || nameClean.includes('ear')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <path d="M 4,14 C 2,10 3,4 12,2 C 10,7 11,11 6,14 Z" fill="#15803d" />
        <path d="M 5,12 C 4,9 5,5 10,4 C 9,8 9,10 6,12 Z" fill="#22c55e" />
        <circle cx="4" cy="13" r="1.5" fill="#facc15" />
      </svg>
    );
  }

  if (nameClean.includes('verruga') || nameClean.includes('wart')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <circle cx="8" cy="8" r="5" fill="#166534" />
        <circle cx="8" cy="8" r="4" fill="#22c55e" />
        <circle cx="6" cy="6" r="2" fill="#86efac" />
        <circle cx="10" cy="9" r="1.5" fill="#15803d" />
      </svg>
    );
  }

  if (nameClean.includes('lingua') || nameClean.includes('tongue')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <path d="M 5,3 Q 11,3 11,8 C 11,13 5,15 5,15 C 5,15 8,11 8,8 C 8,5 5,3 5,3 Z" fill="#e11d48" />
        <path d="M 6,5 Q 10,5 10,8 C 10,12 6,13 6,13" fill="#fb7185" />
        <circle cx="9" cy="11" r="1" fill="#22c55e" />
      </svg>
    );
  }

  if (nameClean.includes('placa') || nameClean.includes('plate') || nameClean.includes('colete') || nameClean.includes('riot')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="3,3 13,3 14,13 2,13" fill="#1e293b" />
        <polygon points="4,4 12,4 13,12 3,12" fill="#334155" />
        <polygon points="5,5 11,5 11,11 5,11" fill="#475569" />
        <circle cx="5" cy="5" r="0.8" fill="#94a3b8" />
        <circle cx="11" cy="5" r="0.8" fill="#94a3b8" />
        <circle cx="5" cy="11" r="0.8" fill="#94a3b8" />
        <circle cx="11" cy="11" r="0.8" fill="#94a3b8" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 22. GARRAS, PRESAS, DENTES, CHIFRES, OSSOS, FERRÕES, RUNAS
  // ──────────────────────────────────────────────────────────────────────────
  if (
    nameClean.includes('garra') ||
    nameClean.includes('claw') ||
    nameClean.includes('presa') ||
    nameClean.includes('fang') ||
    nameClean.includes('dente') ||
    nameClean.includes('tooth') ||
    nameClean.includes('tusk') ||
    nameClean.includes('chifre') ||
    nameClean.includes('horn') ||
    nameClean.includes('ferrao') ||
    nameClean.includes('stinger')
  ) {
    const isPoison = nameClean.includes('ferrao') || nameClean.includes('stinger');
    const isDemon = nameClean.includes('demon') || nameClean.includes('abissal');
    const baseColor = isDemon ? '#7f1d1d' : isPoison ? '#78350f' : '#cbd5e1';
    const mainColor = isDemon ? '#ef4444' : isPoison ? '#b45309' : '#f8fafc';
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <path d="M 4,14 Q 7,12 11,6 Q 13,3 14,2 Q 11,5 8,11 Q 5,14 4,14 Z" fill={baseColor} stroke="#94a3b8" strokeWidth="1" />
        <path d="M 5,13 Q 8,10 11,5" fill="none" stroke={mainColor} strokeWidth="1.2" />
        {isPoison && <circle cx="14" cy="2" r="1.5" fill="#22c55e" />}
      </svg>
    );
  }

  if (nameClean.includes('osso') || nameClean.includes('bone') || nameClean.includes('medula')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <line x1="4" y1="12" x2="12" y2="4" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />
        <circle cx="3" cy="11" r="1.5" fill="#e2e8f0" />
        <circle cx="5" cy="13" r="1.5" fill="#cbd5e1" />
        <circle cx="11" cy="3" r="1.5" fill="#f8fafc" />
        <circle cx="13" cy="5" r="1.5" fill="#e2e8f0" />
      </svg>
    );
  }

  if (nameClean.includes('runa') || nameClean.includes('rune')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="8,1 14,4 14,12 8,15 2,12 2,4" fill="#334155" />
        <polygon points="8,2 13,5 13,11 8,14 3,11 3,5" fill="#475569" />
        <path d="M 8,4 L 8,12 M 5,7 L 8,9 L 11,7 M 6,11 L 8,9 L 10,11" stroke="#38bdf8" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 23. CATALISADORES, SUCATAS, ESSÊNCIAS, ALMAS, CORAÇÃO, TROFÉUS
  // ──────────────────────────────────────────────────────────────────────────
  if (nameClean.includes('coracao') || nameClean.includes('heart')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <path d="M 8,14 C 8,14 1,9 1,5 C 1,2.5 3.5,1.5 5.5,2.5 C 7,3.5 8,5 8,5 C 8,5 9,3.5 10.5,2.5 C 12.5,1.5 15,2.5 15,5 C 15,9 8,14 8,14 Z" fill="#991b1b" />
        <path d="M 8,12 C 8,12 3,8 3,5 C 3,3.5 4.5,2.8 6,3.5 C 7,4.2 8,6 8,6 C 8,6 9,4.2 10,3.5 C 11.5,2.8 13,3.5 13,5 C 13,8 8,12 8,12 Z" fill="#ef4444" />
        <circle cx="5" cy="4" r="1" fill="#facc15" />
      </svg>
    );
  }

  if (nameClean.includes('alma') || nameClean.includes('soul') || nameClean.includes('espirito') || nameClean.includes('ghost')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <path d="M 8,2 C 4,2 3,6 3,10 C 3,14 5,14 6,12 C 7,10 8,13 9,13 C 10,13 11,11 12,13 C 13,15 13,8 13,6 C 13,3 11,2 8,2 Z" fill="#0284c7" />
        <path d="M 8,3 C 5,3 4,7 4,10 C 4,12 6,11 7,10 C 8,9 9,11 10,11 C 11,11 12,9 12,6 C 12,4 10,3 8,3 Z" fill="#38bdf8" />
        <circle cx="6" cy="6" r="0.8" fill="#ffffff" />
        <circle cx="10" cy="6" r="0.8" fill="#ffffff" />
      </svg>
    );
  }

  if (
    nameClean.includes('quality_dust') ||
    nameClean.includes('po de qualidade') ||
    nameClean.includes('nucleo') ||
    nameClean.includes('prismatic_core') ||
    nameClean.includes('essencia') ||
    nameClean.includes('essence') ||
    nameClean.includes('brasa') ||
    nameClean.includes('ember')
  ) {
    const isPrismatic = nameClean.includes('prismatic') || isEpic || isLegendary;
    const isEmber = nameClean.includes('brasa') || nameClean.includes('ember');
    const orbColor = isEmber ? '#ea580c' : isPrismatic ? '#a855f7' : '#facc15';
    const orbGlow = isEmber ? '#fef08a' : isPrismatic ? '#00f0ff' : '#ffffff';
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="8,1 13,4 15,9 11,14 5,14 1,9 3,4" fill={orbColor} />
        <polygon points="8,2 12,5 13,9 10,13 6,13 3,9 4,5" fill={orbGlow} />
        <rect x="7" y="5" width="2" height="2" fill="#ffffff" />
        <rect x="6" y="7" width="1" height="1" fill="#ffffff" />
      </svg>
    );
  }

  if (nameClean.includes('sucata') || nameClean.includes('scrap')) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <circle cx="8" cy="8" r="4" fill="#64748b" />
        <rect x="7" y="2" width="2" height="12" fill="#94a3b8" />
        <rect x="2" y="7" width="12" height="2" fill="#94a3b8" />
        <circle cx="8" cy="8" r="2" fill="#0f172a" />
        <circle cx="8" cy="8" r="1" fill="#cbd5e1" />
      </svg>
    );
  }

  if (
    nameClean.includes('trofeu') ||
    nameClean.includes('trophy') ||
    nameClean.includes('brasao') ||
    nameClean.includes('emblema') ||
    nameClean.includes('black_soul')
  ) {
    return (
      <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
        <polygon points="8,2 14,4 12,11 8,15 4,11 2,4" fill="#ca8a04" />
        <polygon points="8,3 13,5 11,10 8,14 5,10 3,5" fill="#facc15" />
        <polygon points="8,4 11,6 10,9 8,12 6,9 5,6" fill="#fef08a" />
        <rect x="7" y="6" width="2" height="2" fill="#dc2626" />
        <rect x="8" y="7" width="1" height="1" fill="#ffffff" />
      </svg>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FALLBACK PADRÃO: RELÍQUIA / ARTEFATO PIXEL ART COM BORDA E BRILHO
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <svg width={sizePx} height={sizePx} viewBox={viewBox} className={`pixel-art ${className}`} style={{ imageRendering: 'pixelated' }}>
      <polygon points="8,2 14,5 12,13 4,13 2,5" fill={bladeColor} />
      <polygon points="8,3 13,5 11,12 5,12 3,5" fill={bladeHighlight} />
      <polygon points="8,5 11,7 10,10 6,10 5,7" fill={bladeColor} />
      <rect x="7" y="7" width="2" height="2" fill="#fbbf24" />
    </svg>
  );
}