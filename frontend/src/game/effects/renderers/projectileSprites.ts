/**
 * ProjectileSprites - Renderizadores de Pixel Art de Alta Fidelidade para Magias e Projéteis
 * 
 * Sprites Canônicos:
 * 1. drawWandStar: Estrela radiante dourada/âmbar pixel art com rotação e poeira cósmica (Varinhas).
 * 2. drawStaffVortex: Anel/vórtice cósmico azul/púrpura com centro vazado e rotação (Cajados).
 * 3. drawFireballComet: Bola de fogo direcional pixel art com núcleo incandescente e cauda dentada.
 * 4. drawIceOrbComet: Orbe/cometa de gelo pixel art em camadas concêntricas de ciano e cobalto.
 */

// ─── 1. VARINHA MÁGICA: ESTRELA RADIANTE DOURADA/ÂMBAR (IMG 1) ─────────────────

export function drawWandStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotationRad: number = 0,
  scale: number = 1.3
) {
  ctx.save();
  ctx.translate(x, y);
  if (rotationRad !== 0) {
    ctx.rotate(rotationRad);
  }
  ctx.scale(scale, scale);

  // Paleta Canônica da Estrela Radiante (Img 1)
  const P_TIP = '#451a03';      // Pontas marrom escuro
  const P_DARK = '#78350f';     // Sombra âmbar profunda
  const P_MED_DARK = '#b45309'; // Âmbar médio escuro
  const P_AMBER = '#d97706';    // Âmbar
  const P_GOLD = '#f59e0b';     // Dourado
  const P_LIGHT_GOLD = '#fbbf24'; // Dourado claro
  const P_YELLOW = '#fde047';   // Amarelo vibrante
  const P_PALE = '#fef08a';     // Amarelo quase branco
  const P_WHITE = '#ffffff';    // Núcleo branco puro

  // Matriz 17x17 centralizada em (0,0) -> coordenadas de -8 a +8
  const p = (px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, 1, 1);
  };

  // Pontas Cardinais Longas (Vertical)
  p(0, -8, P_TIP);
  p(0, -7, P_DARK);
  p(0, -6, P_MED_DARK);
  p(0, -5, P_AMBER);
  p(0, -4, P_GOLD);
  p(0, -3, P_LIGHT_GOLD);

  p(0, 8, P_TIP);
  p(0, 7, P_DARK);
  p(0, 6, P_MED_DARK);
  p(0, 5, P_AMBER);
  p(0, 4, P_GOLD);
  p(0, 3, P_LIGHT_GOLD);

  // Pontas Cardinais Longas (Horizontal)
  p(-8, 0, P_TIP);
  p(-7, 0, P_DARK);
  p(-6, 0, P_MED_DARK);
  p(-5, 0, P_AMBER);
  p(-4, 0, P_GOLD);
  p(-3, 0, P_LIGHT_GOLD);

  p(8, 0, P_TIP);
  p(7, 0, P_DARK);
  p(6, 0, P_MED_DARK);
  p(5, 0, P_AMBER);
  p(4, 0, P_GOLD);
  p(3, 0, P_LIGHT_GOLD);

  // Pontas Diagonais Médias (NW, NE, SW, SE)
  // Top-Left (NW)
  p(-4, -5, P_DARK);
  p(-5, -4, P_DARK);
  p(-3, -4, P_MED_DARK);
  p(-4, -3, P_MED_DARK);
  p(-3, -3, P_AMBER);
  p(-2, -3, P_GOLD);
  p(-3, -2, P_GOLD);

  // Top-Right (NE)
  p(4, -5, P_DARK);
  p(5, -4, P_DARK);
  p(3, -4, P_MED_DARK);
  p(4, -3, P_MED_DARK);
  p(3, -3, P_AMBER);
  p(2, -3, P_GOLD);
  p(3, -2, P_GOLD);

  // Bottom-Left (SW)
  p(-4, 5, P_DARK);
  p(-5, 4, P_DARK);
  p(-3, 4, P_MED_DARK);
  p(-4, 3, P_MED_DARK);
  p(-3, 3, P_AMBER);
  p(-2, 3, P_GOLD);
  p(-3, 2, P_GOLD);

  // Bottom-Right (SE)
  p(4, 5, P_DARK);
  p(5, 4, P_DARK);
  p(3, 4, P_MED_DARK);
  p(4, 3, P_MED_DARK);
  p(3, 3, P_AMBER);
  p(2, 3, P_GOLD);
  p(3, 2, P_GOLD);

  // Pontas Curtas Intermediárias
  p(-1, -4, P_MED_DARK); p(1, -4, P_MED_DARK);
  p(-1, 4, P_MED_DARK);  p(1, 4, P_MED_DARK);
  p(-4, -1, P_MED_DARK); p(-4, 1, P_MED_DARK);
  p(4, -1, P_MED_DARK);  p(4, 1, P_MED_DARK);

  // Corpo Radiante Intermediário (Anel Dourado)
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      p(dx, dy, P_YELLOW);
    }
  }

  // Camada Interna Amarelo Claro
  p(-1, -1, P_PALE); p(0, -1, P_PALE); p(1, -1, P_PALE);
  p(-1, 0, P_PALE);  p(0, 0, P_WHITE); p(1, 0, P_PALE);
  p(-1, 1, P_PALE);  p(0, 1, P_PALE);  p(1, 1, P_PALE);

  // Centro Incandescente Branco
  p(0, 0, P_WHITE);
  p(0, -1, P_WHITE);
  p(0, 1, P_WHITE);
  p(-1, 0, P_WHITE);
  p(1, 0, P_WHITE);

  ctx.restore();
}

// ─── 2. CAJADO MÁGICO: VÓRTICE CÓSMICO AZUL/PÚRPURA (IMG 2) ───────────────────

export function drawStaffVortex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotationRad: number = 0,
  scale: number = 1.35
) {
  ctx.save();
  ctx.translate(x, y);
  if (rotationRad !== 0) {
    ctx.rotate(rotationRad);
  }
  ctx.scale(scale, scale);

  // Paleta Canônica do Vórtice Cósmico (Img 2)
  const V_DARK_EDGE = '#0b0f19'; // Borda externa quase preta
  const V_NAVY = '#1e1b4b';      // Índigo profundo
  const V_PURPLE = '#4c1d95';    // Roxo escuro
  const V_VIOLET = '#7c3aed';    // Violeta vibrante
  const V_MAGENTA = '#a855f7';   // Magenta suave
  const V_DEEP_BLUE = '#1e3a8a'; // Azul marinho
  const V_ROYAL = '#2563eb';     // Azul royal
  const V_SKY = '#38bdf8';       // Azul celeste
  const V_CYAN = '#00f0ff';      // Ciano cósmico incandescente
  const V_WHITE = '#ffffff';     // Reflexo cósmico

  const p = (px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, 1, 1);
  };

  // Matriz 16x16 com centro vazado (-7 a +7)
  // Borda Externa Circulada
  // Topo
  p(-3, -7, V_DARK_EDGE); p(-2, -7, V_DARK_EDGE); p(-1, -7, V_DARK_EDGE); p(0, -7, V_DARK_EDGE); p(1, -7, V_DARK_EDGE); p(2, -7, V_DARK_EDGE);
  p(-5, -6, V_DARK_EDGE); p(-4, -6, V_PURPLE); p(-3, -6, V_PURPLE); p(-2, -6, V_VIOLET); p(-1, -6, V_ROYAL); p(0, -6, V_SKY); p(1, -6, V_CYAN); p(2, -6, V_CYAN); p(3, -6, V_DARK_EDGE);
  p(-6, -5, V_DARK_EDGE); p(-5, -5, V_PURPLE); p(-4, -5, V_VIOLET); p(-3, -5, V_MAGENTA); p(-2, -5, V_ROYAL); p(-1, -5, V_SKY); p(0, -5, V_CYAN); p(1, -5, V_CYAN); p(2, -5, V_WHITE); p(3, -5, V_CYAN); p(4, -5, V_DARK_EDGE);

  // Meio Superior
  p(-7, -3, V_DARK_EDGE); p(-6, -3, V_PURPLE); p(-5, -3, V_VIOLET); p(-4, -3, V_MAGENTA); p(-3, -3, V_PURPLE); p(2, -3, V_CYAN); p(3, -3, V_CYAN); p(4, -3, V_ROYAL); p(5, -3, V_DARK_EDGE);
  p(-7, -2, V_DARK_EDGE); p(-6, -2, V_PURPLE); p(-5, -2, V_VIOLET); p(-4, -2, V_MAGENTA); p(3, -2, V_CYAN); p(4, -2, V_ROYAL); p(5, -2, V_DEEP_BLUE); p(6, -2, V_DARK_EDGE);
  p(-7, -1, V_DARK_EDGE); p(-6, -1, V_NAVY); p(-5, -1, V_PURPLE); p(-4, -1, V_VIOLET); p(3, -1, V_SKY); p(4, -1, V_ROYAL); p(5, -1, V_DEEP_BLUE); p(6, -1, V_DARK_EDGE);

  // Equador (Centro Vazado: X entre -2 e 2, Y entre -2 e 2 não são preenchidos)
  p(-7, 0, V_DARK_EDGE); p(-6, 0, V_NAVY); p(-5, 0, V_PURPLE); p(-4, 0, V_VIOLET); p(3, 0, V_SKY); p(4, 0, V_ROYAL); p(5, 0, V_DEEP_BLUE); p(6, 0, V_DARK_EDGE);
  p(-7, 1, V_DARK_EDGE); p(-6, 1, V_NAVY); p(-5, 1, V_PURPLE); p(-4, 1, V_VIOLET); p(3, 1, V_SKY); p(4, 1, V_ROYAL); p(5, 1, V_DEEP_BLUE); p(6, 1, V_DARK_EDGE);
  p(-7, 2, V_DARK_EDGE); p(-6, 2, V_NAVY); p(-5, 2, V_PURPLE); p(-4, 2, V_PURPLE); p(3, 2, V_ROYAL); p(4, 2, V_ROYAL); p(5, 2, V_DEEP_BLUE); p(6, 2, V_DARK_EDGE);

  // Meio Inferior
  p(-7, 3, V_DARK_EDGE); p(-6, 3, V_DARK_EDGE); p(-5, 3, V_NAVY); p(-4, 3, V_PURPLE); p(-3, 3, V_PURPLE); p(2, 3, V_ROYAL); p(3, 3, V_ROYAL); p(4, 3, V_DEEP_BLUE); p(5, 3, V_DARK_EDGE);
  p(-6, 4, V_DARK_EDGE); p(-5, 4, V_DARK_EDGE); p(-4, 4, V_NAVY); p(-3, 4, V_PURPLE); p(-2, 4, V_PURPLE); p(-1, 4, V_DEEP_BLUE); p(0, 4, V_ROYAL); p(1, 4, V_ROYAL); p(2, 4, V_SKY); p(3, 4, V_DEEP_BLUE); p(4, 4, V_DARK_EDGE);

  // Fundo Inferior
  p(-5, 5, V_DARK_EDGE); p(-4, 5, V_DARK_EDGE); p(-3, 5, V_NAVY); p(-2, 5, V_NAVY); p(-1, 5, V_DEEP_BLUE); p(0, 5, V_DEEP_BLUE); p(1, 5, V_ROYAL); p(2, 5, V_SKY); p(3, 5, V_DARK_EDGE);
  p(-3, 6, V_DARK_EDGE); p(-2, 6, V_DARK_EDGE); p(-1, 6, V_NAVY); p(0, 6, V_NAVY); p(1, 6, V_DEEP_BLUE); p(2, 6, V_DARK_EDGE);
  p(-2, 7, V_DARK_EDGE); p(-1, 7, V_DARK_EDGE); p(0, 7, V_DARK_EDGE); p(1, 7, V_DARK_EDGE);

  ctx.restore();
}

// ─── 3. BOLA DE FOGO: COMETA ÍGNEO DIRECIONAL PIXEL ART (IMG 3) ───────────────

export function drawFireballComet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingAngle: number = 0,
  scale: number = 1.4
) {
  ctx.save();
  ctx.translate(x, y);
  if (facingAngle !== 0) {
    ctx.rotate(facingAngle);
  }
  ctx.scale(scale, scale);

  // Paleta Canônica da Bola de Fogo (Img 3)
  const F_CRIMSON = '#7f1d1d';   // Vermelho escuro / contorno
  const F_DARK_RED = '#991b1b';  // Vermelho intermediário
  const F_RED = '#dc2626';       // Vermelho vivo
  const F_DARK_ORANGE = '#ea580c'; // Laranja escuro
  const F_ORANGE = '#f97316';    // Laranja intenso
  const F_LIGHT_ORANGE = '#fb923c'; // Laranja claro
  const F_GOLD = '#facc15';      // Amarelo ouro
  const F_BRIGHT = '#fef08a';    // Amarelo incandescente
  const F_WHITE = '#ffffff';     // Núcleo branco puro

  const p = (px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, 1, 1);
  };

  // Sprite Direcional: Ponta/Cabeça à Direita (+X), Cauda de Fogo à Esquerda (-X)
  // Dimensões 22x14 (X: -14 a +7, Y: -6 a +7)

  // 1. Cabeça Dianteira Arredondada (+X)
  p(6, -2, F_CRIMSON); p(6, -1, F_CRIMSON); p(6, 0, F_CRIMSON); p(6, 1, F_CRIMSON); p(6, 2, F_CRIMSON);
  p(7, -1, F_DARK_RED); p(7, 0, F_DARK_RED); p(7, 1, F_DARK_RED);

  // 2. Contornos Superiores e Inferiores
  for (let bx = -4; bx <= 5; bx++) {
    p(bx, -6, F_CRIMSON);
    p(bx, 6, F_CRIMSON);
  }

  // 3. Cauda Dentada Traseira (-X)
  // Espigões de chamas se dissolvendo
  p(-14, 0, F_DARK_RED); p(-13, 0, F_DARK_RED); p(-12, 0, F_RED); p(-11, 0, F_ORANGE);
  p(-11, -2, F_CRIMSON); p(-10, -2, F_DARK_RED); p(-9, -2, F_RED); p(-8, -2, F_ORANGE);
  p(-12, 2, F_CRIMSON);  p(-11, 2, F_DARK_RED);  p(-10, 2, F_RED); p(-9, 2, F_ORANGE);
  p(-8, -4, F_CRIMSON);  p(-7, -4, F_DARK_RED);  p(-6, -4, F_RED);
  p(-8, 4, F_CRIMSON);   p(-7, 4, F_DARK_RED);   p(-6, 4, F_RED);

  // 4. Camadas de Chamas Intermediárias
  for (let cy = -5; cy <= 5; cy++) {
    for (let cx = -5; cx <= 5; cx++) {
      if (Math.hypot(cx - 1, cy) <= 5.2) {
        p(cx, cy, cx < -1 ? F_DARK_ORANGE : F_ORANGE);
      }
    }
  }

  // 5. Camada Dourada / Laranja Claro
  for (let cy = -4; cy <= 4; cy++) {
    for (let cx = -3; cx <= 4; cx++) {
      if (Math.hypot(cx - 0.5, cy) <= 4.0) {
        p(cx, cy, F_LIGHT_ORANGE);
      }
    }
  }

  for (let cy = -3; cy <= 3; cy++) {
    for (let cx = -2; cx <= 4; cx++) {
      if (Math.hypot(cx, cy) <= 3.0) {
        p(cx, cy, F_GOLD);
      }
    }
  }

  // 6. Núcleo Incandescente Amarelo Brilhante & Branco
  for (let cy = -2; cy <= 2; cy++) {
    for (let cx = -1; cx <= 3; cx++) {
      if (Math.hypot(cx - 1, cy) <= 2.2) {
        p(cx, cy, F_BRIGHT);
      }
    }
  }

  p(0, -1, F_WHITE); p(1, -1, F_WHITE); p(2, -1, F_WHITE);
  p(0, 0, F_WHITE);  p(1, 0, F_WHITE);  p(2, 0, F_WHITE);
  p(0, 1, F_WHITE);  p(1, 1, F_WHITE);  p(2, 1, F_WHITE);

  ctx.restore();
}

// ─── 4. ESTILHAÇO DE GELO: ORBE/COMETA DE GELO PIXEL ART (IMG 4) ──────────────

export function drawIceOrbComet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingAngle: number = 0,
  scale: number = 1.35
) {
  ctx.save();
  ctx.translate(x, y);
  if (facingAngle !== 0) {
    ctx.rotate(facingAngle);
  }
  ctx.scale(scale, scale);

  // Paleta Canônica do Orbe de Gelo (Img 4)
  const I_COBALT = '#1e3a8a';    // Cobalto profundo (borda externa)
  const I_DEEP_BLUE = '#1d4ed8'; // Azul cobalto médio
  const I_BLUE = '#0284c7';      // Azul gélido
  const I_CYAN = '#06b6d4';      // Ciano
  const I_SKY = '#38bdf8';       // Ciano brilhante
  const I_LIGHT_CYAN = '#7dd3fc';// Ciano pálido
  const I_PALE = '#cffafe';      // Gelo puro
  const I_WHITE = '#ffffff';     // Núcleo branco cristalino

  const p = (px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, 1, 1);
  };

  // Matriz 16x16 (-8 a +7) do Orbe de Gelo
  // 1. Contorno de Borda Cobalto Externo
  // Cúpula dianteira (+X)
  p(6, -3, I_COBALT); p(7, -2, I_COBALT); p(7, -1, I_COBALT); p(7, 0, I_COBALT); p(7, 1, I_COBALT); p(7, 2, I_COBALT); p(6, 3, I_COBALT);
  // Bordas superior/inferior
  p(-3, -7, I_COBALT); p(-2, -7, I_COBALT); p(-1, -7, I_COBALT); p(0, -7, I_COBALT); p(1, -7, I_COBALT); p(2, -7, I_COBALT);
  p(-3, 7, I_COBALT);  p(-2, 7, I_COBALT);  p(-1, 7, I_COBALT);  p(0, 7, I_COBALT);  p(1, 7, I_COBALT);  p(2, 7, I_COBALT);

  // 2. Cauda Dentada de Gelo Traseira (-X)
  p(-8, 0, I_COBALT); p(-7, 0, I_DEEP_BLUE); p(-6, 0, I_BLUE);
  p(-7, -2, I_COBALT); p(-6, -2, I_DEEP_BLUE); p(-5, -2, I_CYAN);
  p(-7, 2, I_COBALT);  p(-6, 2, I_DEEP_BLUE);  p(-5, 2, I_CYAN);
  p(-6, -4, I_COBALT); p(-5, -4, I_DEEP_BLUE);
  p(-6, 4, I_COBALT);  p(-5, 4, I_DEEP_BLUE);

  // 3. Preenchimento de Camadas Gélidas
  for (let cy = -6; cy <= 6; cy++) {
    for (let cx = -5; cx <= 6; cx++) {
      if (Math.hypot(cx, cy) <= 6.2) {
        p(cx, cy, I_DEEP_BLUE);
      }
    }
  }

  for (let cy = -5; cy <= 5; cy++) {
    for (let cx = -4; cx <= 5; cx++) {
      if (Math.hypot(cx, cy) <= 5.2) {
        p(cx, cy, I_BLUE);
      }
    }
  }

  for (let cy = -4; cy <= 4; cy++) {
    for (let cx = -3; cx <= 5; cx++) {
      if (Math.hypot(cx - 0.5, cy) <= 4.2) {
        p(cx, cy, I_CYAN);
      }
    }
  }

  for (let cy = -3; cy <= 3; cy++) {
    for (let cx = -2; cx <= 4; cx++) {
      if (Math.hypot(cx - 1, cy) <= 3.2) {
        p(cx, cy, I_SKY);
      }
    }
  }

  for (let cy = -2; cy <= 2; cy++) {
    for (let cx = -1; cx <= 4; cx++) {
      if (Math.hypot(cx - 1.5, cy) <= 2.4) {
        p(cx, cy, I_LIGHT_CYAN);
      }
    }
  }

  // 4. Núcleo Branco Cristalino
  p(0, -1, I_PALE); p(1, -1, I_WHITE); p(2, -1, I_WHITE); p(3, -1, I_PALE);
  p(0, 0, I_PALE);  p(1, 0, I_WHITE);  p(2, 0, I_WHITE);  p(3, 0, I_PALE);
  p(0, 1, I_PALE);  p(1, 1, I_WHITE);  p(2, 1, I_WHITE);  p(3, 1, I_PALE);

  ctx.restore();
}

// ─── 5. FLECHA REAL DO ARQUEIRO: PIXEL ART (IMG 1) ───────────────────────────

export function drawRealArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingAngle: number = 0,
  scale: number = 1.35
) {
  ctx.save();
  ctx.translate(x, y);
  if (facingAngle !== 0) {
    ctx.rotate(facingAngle);
  }
  ctx.scale(scale, scale);

  // Paleta Canônica da Flecha (Img 1)
  const A_DARK_STEEL = '#334155'; // Contorno / base do ferro
  const A_STEEL = '#64748b';      // Metal cinza médio
  const A_LIGHT_STEEL = '#94a3b8';// Metal claro
  const A_WHITE_STEEL = '#cbd5e1';// Brilho do gume
  const A_WOOD_LIGHT = '#78350f'; // Haste de madeira clara (topo)
  const A_WOOD_DARK = '#451a03';  // Haste de madeira sombra (fundo)
  const A_FEATHER_CYAN = '#38bdf8'; // Penas ciano
  const A_FEATHER_BLUE = '#3b82f6'; // Penas azul royal
  const A_FEATHER_INDIGO = '#6366f1'; // Penas anil
  const A_FEATHER_PURPLE = '#4f46e5'; // Penas violeta
  const A_FEATHER_DARK = '#1e1b4b';   // Sombra da pena

  const p = (px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, 1, 1);
  };

  // 1. Emplumagem Traseira (Plumas Azuis/Violetas, X: -12 a -7, Y: -3 a +3)
  // Asa Superior
  p(-12, -3, A_FEATHER_BLUE); p(-11, -3, A_FEATHER_BLUE); p(-10, -3, A_FEATHER_CYAN);
  p(-12, -2, A_FEATHER_INDIGO); p(-11, -2, A_FEATHER_BLUE); p(-10, -2, A_FEATHER_CYAN); p(-9, -2, A_FEATHER_BLUE); p(-8, -2, A_FEATHER_INDIGO);
  p(-11, -1, A_FEATHER_INDIGO); p(-10, -1, A_FEATHER_BLUE); p(-9, -1, A_FEATHER_BLUE); p(-8, -1, A_FEATHER_INDIGO); p(-7, -1, A_FEATHER_PURPLE);

  // Asa Inferior
  p(-11, 1, A_FEATHER_PURPLE); p(-10, 1, A_FEATHER_BLUE); p(-9, 1, A_FEATHER_BLUE); p(-8, 1, A_FEATHER_PURPLE); p(-7, 1, A_FEATHER_DARK);
  p(-12, 2, A_FEATHER_PURPLE); p(-11, 2, A_FEATHER_BLUE); p(-10, 2, A_FEATHER_INDIGO); p(-9, 2, A_FEATHER_PURPLE); p(-8, 2, A_FEATHER_DARK);
  p(-12, 3, A_FEATHER_PURPLE); p(-11, 3, A_FEATHER_INDIGO); p(-10, 3, A_FEATHER_DARK);

  // 2. Haste de Madeira (Shaft, X: -9 a +6, Y: -1 e 0)
  for (let sx = -9; sx <= 6; sx++) {
    p(sx, -1, A_WOOD_LIGHT);
    p(sx, 0, A_WOOD_DARK);
  }

  // 3. Ponta de Ferro / Cabeça da Flecha (Head, X: 6 a 12, Y: -3 a +3)
  // Base alargada do gume
  p(6, -3, A_DARK_STEEL); p(6, 3, A_DARK_STEEL);
  p(6, -2, A_STEEL);      p(6, 2, A_STEEL);
  p(6, -1, A_STEEL);      p(6, 0, A_DARK_STEEL); p(6, 1, A_STEEL);

  p(7, -2, A_DARK_STEEL); p(7, 2, A_DARK_STEEL);
  p(7, -1, A_LIGHT_STEEL); p(7, 0, A_STEEL); p(7, 1, A_STEEL);

  p(8, -2, A_DARK_STEEL); p(8, 2, A_DARK_STEEL);
  p(8, -1, A_WHITE_STEEL); p(8, 0, A_LIGHT_STEEL); p(8, 1, A_STEEL);

  p(9, -1, A_DARK_STEEL); p(9, 1, A_DARK_STEEL);
  p(9, 0, A_LIGHT_STEEL);

  p(10, -1, A_DARK_STEEL); p(10, 1, A_DARK_STEEL);
  p(10, 0, A_WHITE_STEEL);

  p(11, 0, A_STEEL);
  p(12, 0, A_DARK_STEEL);

  ctx.restore();
}

// ─── 6. FLECHA ENCANTADA DE SANGUE/CÓSMICA: TIRO QUÁDRUPLO (IMG 2) ─────────────

export function drawEnchantedBloodArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingAngle: number = 0,
  scale: number = 1.35
) {
  ctx.save();
  ctx.translate(x, y);
  if (facingAngle !== 0) {
    ctx.rotate(facingAngle);
  }
  ctx.scale(scale, scale);

  // Paleta Canônica da Flecha Encantada (Img 2)
  const B_AURA_HOT_PINK = '#f43f5e'; // Magenta / Rosa neon intenso
  const B_AURA_PINK = '#fb7185';     // Rosa choque médio
  const B_AURA_LIGHT = '#fda4af';    // Rosa suave
  const B_AURA_WHITE = '#ffffff';    // Brilho místico
  const B_WOOD_DARK = '#1e1b4b';     // Haste de metal místico escuro
  const B_WOOD_MID = '#3730a3';      // Haste meio
  const B_HEAD_STEEL = '#e2e8f0';    // Ponta prateada
  const B_HEAD_TIP = '#ffffff';      // Ponta brilhante
  const B_FLETCHING = '#be123c';     // Penas carmesim

  const p = (px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, 1, 1);
  };

  // 1. Aura Mágica / Plasma Cósmico Ondulante ao redor (Img 2)
  ctx.save();
  ctx.globalAlpha = 0.85;
  // Plasma Rosa Superior
  p(-12, -4, B_AURA_HOT_PINK); p(-11, -4, B_AURA_PINK); p(-10, -5, B_AURA_HOT_PINK);
  p(-6, -4, B_AURA_HOT_PINK);  p(-5, -5, B_AURA_PINK);  p(-4, -4, B_AURA_LIGHT); p(-3, -5, B_AURA_HOT_PINK);
  p(0, -4, B_AURA_PINK);       p(1, -5, B_AURA_HOT_PINK); p(2, -4, B_AURA_LIGHT);
  p(6, -4, B_AURA_HOT_PINK);   p(7, -5, B_AURA_PINK);   p(8, -4, B_AURA_HOT_PINK);

  // Plasma Rosa Inferior
  p(-11, 4, B_AURA_HOT_PINK);  p(-10, 5, B_AURA_PINK);  p(-9, 4, B_AURA_HOT_PINK);
  p(-5, 4, B_AURA_PINK);       p(-4, 5, B_AURA_HOT_PINK); p(-3, 4, B_AURA_LIGHT);
  p(1, 4, B_AURA_HOT_PINK);    p(2, 5, B_AURA_PINK);    p(3, 4, B_AURA_HOT_PINK);
  p(7, 4, B_AURA_HOT_PINK);    p(8, 5, B_AURA_PINK);

  // Faixa de Aura Contínua
  for (let ax = -12; ax <= 10; ax++) {
    p(ax, -2, (ax % 3 === 0) ? B_AURA_HOT_PINK : B_AURA_PINK);
    p(ax, 2, (ax % 2 === 0) ? B_AURA_PINK : B_AURA_HOT_PINK);
  }
  ctx.restore();

  // 2. Emplumagem Traseira Carmesim (X: -13 a -9, Y: -2 a +2)
  p(-13, -2, B_FLETCHING); p(-12, -2, B_FLETCHING); p(-11, -2, '#e11d48');
  p(-12, -1, B_FLETCHING); p(-11, -1, '#e11d48'); p(-10, -1, '#fda4af');
  p(-12, 1, B_FLETCHING);  p(-11, 1, '#e11d48');  p(-10, 1, '#fda4af');
  p(-13, 2, B_FLETCHING);  p(-12, 2, B_FLETCHING); p(-11, 2, '#e11d48');

  // 3. Haste Mística Escura (X: -10 a +7)
  for (let sx = -10; sx <= 7; sx++) {
    p(sx, -1, B_WOOD_MID);
    p(sx, 0, B_WOOD_DARK);
  }

  // 4. Ponta da Flecha Prateada Encantada (X: 7 a 13)
  p(7, -2, '#94a3b8'); p(7, 2, '#94a3b8');
  p(8, -2, B_HEAD_STEEL); p(8, 2, B_HEAD_STEEL);
  p(8, -1, B_HEAD_STEEL); p(8, 0, B_HEAD_STEEL); p(8, 1, B_HEAD_STEEL);
  p(9, -1, B_HEAD_TIP);   p(9, 0, B_HEAD_TIP);   p(9, 1, B_HEAD_TIP);
  p(10, -1, B_HEAD_TIP);  p(10, 0, B_HEAD_TIP);  p(10, 1, B_HEAD_TIP);
  p(11, 0, B_AURA_WHITE);
  p(12, 0, B_AURA_WHITE);

  ctx.restore();
}

// ─── 7. FEIXE LASER HIPER-VELOZ: TIRO PRECISO (IMG 3) ─────────────────────────

export function drawSniperLaserBeam(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  curX: number,
  curY: number,
  targetX: number,
  targetY: number,
  _progress: number,
  alpha: number = 1.0
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);

  const angle = Math.atan2(targetY - startY, targetX - startX);
  const totalDist = Math.hypot(curX - startX, curY - startY);

  // 1. Linhas de Velocidade / Linhas Supersônicas Paralelas (Img 3)
  const streakOffsets = [-8, -5, -3, 3, 5, 8];
  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(angle);

  streakOffsets.forEach((offY, idx) => {
    const len = Math.max(15, totalDist * (0.4 + (idx % 3) * 0.2));
    const startOffset = Math.max(0, totalDist - len - (idx * 8));
    
    ctx.strokeStyle = idx % 2 === 0 ? `rgba(239, 68, 68, ${alpha * 0.65})` : `rgba(249, 115, 22, ${alpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startOffset, offY);
    ctx.lineTo(totalDist - (idx * 4), offY);
    ctx.stroke();

    // Ponto incandescente na ponta da linha
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(totalDist - (idx * 4) - 2, offY - 0.75, 3, 1.5);
  });

  // 2. Feixe Central de Alta Energia (Laser Vermelho / Laranja / Amarelo)
  // Aura externa vermelha
  ctx.strokeStyle = `rgba(220, 38, 38, ${alpha * 0.5})`;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(totalDist, 0);
  ctx.stroke();

  // Feixe médio laranja fogo
  ctx.strokeStyle = `rgba(249, 115, 22, ${alpha * 0.85})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(totalDist, 0);
  ctx.stroke();

  // Núcleo incandescente amarelo ouro / branco
  ctx.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.95})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(totalDist, 0);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(totalDist, 0);
  ctx.stroke();

  // 3. Cabeça Cônica de Choque na Ponta Dianteira (Img 3)
  ctx.translate(totalDist, 0);

  // Arcos cônicos de choque supersônicos
  for (let c = 1; c <= 3; c++) {
    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * (0.9 - c * 0.2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-c * 5, 0, 8 + c * 5, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  }

  // Ponta Incandescente Brilhante
  const headGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 10);
  headGrad.addColorStop(0, '#ffffff');
  headGrad.addColorStop(0.3, '#fef08a');
  headGrad.addColorStop(0.7, '#f97316');
  headGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

// ─── 8. ATAQUE SÍSMICO / GOLPE BRUTAL: EXPLOSÃO PIXEL ART (IMG 1) ─────────────

export function drawSeismicExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _progress: number,
  alpha: number = 1.0,
  scale: number = 1.5
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.max(0, alpha);

  // Paleta Canônica da Explosão Sísmica (Img 1)
  const S_DARK_GROUND = '#450a0a'; // Base escura do solo rachado
  const S_DEEP_RED = '#991b1b';    // Vermelho profundo
  const S_RED = '#dc2626';         // Vermelho vivo das pontas
  const S_ORANGE_DARK = '#ea580c'; // Laranja escuro
  const S_ORANGE = '#f97316';      // Laranja fogo
  const S_GOLD = '#f59e0b';        // Dourado
  const S_YELLOW = '#fde047';      // Amarelo vivo
  const S_PALE = '#fef08a';        // Amarelo claro
  const S_WHITE = '#ffffff';       // Núcleo incandescente branco

  const p = (px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, 1, 1);
  };

  // 1. Chão Rachado na Base (X: -14 a 14, Y: 4 a 6)
  for (let gx = -14; gx <= 14; gx++) {
    p(gx, 5, S_DARK_GROUND);
    if (Math.abs(gx) % 2 === 0) p(gx, 6, '#1e1b4b');
  }
  p(-16, 5, S_DARK_GROUND); p(16, 5, S_DARK_GROUND);
  p(-12, 4, S_DEEP_RED); p(-8, 4, S_DEEP_RED); p(8, 4, S_DEEP_RED); p(12, 4, S_DEEP_RED);

  // 2. Pilares e Espinhos Dentados de Fogo Ascendentes (Img 1)
  // Espinho Central Alto (Y: -16 a 4)
  p(0, -16, S_DEEP_RED);
  p(0, -15, S_RED); p(0, -14, S_ORANGE_DARK);
  p(-1, -13, S_RED); p(0, -13, S_ORANGE); p(1, -13, S_RED);
  p(-1, -12, S_ORANGE); p(0, -12, S_GOLD); p(1, -12, S_ORANGE);
  p(-1, -11, S_ORANGE); p(0, -11, S_YELLOW); p(1, -11, S_ORANGE);
  p(-1, -10, S_GOLD); p(0, -10, S_YELLOW); p(1, -10, S_GOLD);

  // Espinho Esquerdo Alto
  p(-4, -14, S_RED); p(-3, -13, S_ORANGE_DARK);
  p(-4, -12, S_ORANGE); p(-3, -12, S_GOLD); p(-2, -12, S_ORANGE);
  p(-4, -11, S_GOLD); p(-3, -11, S_YELLOW); p(-2, -11, S_GOLD);
  p(-4, -10, S_YELLOW); p(-3, -10, S_PALE); p(-2, -10, S_YELLOW);

  // Espinho Direito Alto
  p(4, -14, S_RED); p(3, -13, S_ORANGE_DARK);
  p(2, -12, S_ORANGE); p(3, -12, S_GOLD); p(4, -12, S_ORANGE);
  p(2, -11, S_GOLD); p(3, -11, S_YELLOW); p(4, -11, S_GOLD);
  p(2, -10, S_YELLOW); p(3, -10, S_PALE); p(4, -10, S_YELLOW);

  // Espinhos Laterais Médios Diagonais (Esquerda)
  p(-8, -10, S_RED); p(-7, -9, S_ORANGE_DARK);
  p(-8, -8, S_ORANGE); p(-7, -8, S_GOLD); p(-6, -8, S_ORANGE);
  p(-9, -7, S_RED); p(-8, -7, S_GOLD); p(-7, -7, S_YELLOW); p(-6, -7, S_GOLD);
  p(-10, -5, S_RED); p(-9, -5, S_ORANGE); p(-8, -5, S_YELLOW); p(-7, -5, S_PALE);
  p(-12, -3, S_RED); p(-11, -3, S_ORANGE); p(-10, -3, S_GOLD); p(-9, -3, S_YELLOW);
  p(-14, -1, S_RED); p(-13, -1, S_ORANGE); p(-12, -1, S_GOLD);

  // Espinhos Laterais Médios Diagonais (Direita)
  p(8, -10, S_RED); p(7, -9, S_ORANGE_DARK);
  p(6, -8, S_ORANGE); p(7, -8, S_GOLD); p(8, -8, S_ORANGE);
  p(6, -7, S_GOLD); p(7, -7, S_YELLOW); p(8, -7, S_GOLD); p(9, -7, S_RED);
  p(7, -5, S_PALE); p(8, -5, S_YELLOW); p(9, -5, S_ORANGE); p(10, -5, S_RED);
  p(9, -3, S_YELLOW); p(10, -3, S_GOLD); p(11, -3, S_ORANGE); p(12, -3, S_RED);
  p(12, -1, S_GOLD); p(13, -1, S_ORANGE); p(14, -1, S_RED);

  // 3. Núcleo Incandescente Central (X: -5 a 5, Y: -9 a 4)
  for (let ny = -9; ny <= 3; ny++) {
    for (let nx = -5; nx <= 5; nx++) {
      const dist = Math.hypot(nx, ny + 2);
      if (dist <= 2.2) {
        p(nx, ny, S_WHITE);
      } else if (dist <= 3.6) {
        p(nx, ny, S_PALE);
      } else if (dist <= 5.0) {
        p(nx, ny, S_YELLOW);
      } else if (dist <= 6.5) {
        p(nx, ny, S_ORANGE);
      }
    }
  }

  // 4. Faíscas e Fragmentos Voando no Ar
  p(-7, -15, S_YELLOW);
  p(6, -16, S_PALE);
  p(8, -13, S_GOLD);
  p(-11, -11, S_ORANGE);
  p(11, -10, S_RED);
  p(-13, -7, S_YELLOW);
  p(13, -6, S_PALE);

  ctx.restore();
}

// ─── 9. GOLPE GIRATÓRIO: VÓRTICE CÓSMICO NEON 360° (IMG 2) ───────────────────

export function drawWhirlwindVortex(
  ctx: CanvasRenderingContext2D,
  heroX: number,
  heroY: number,
  progress: number,
  alpha: number = 1.0,
  scale: number = 1.0
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);

  // Posicionado na cintura do herói (heroY - 6)
  const waistY = heroY - 6;
  const currentAngle = progress * Math.PI * 5; // Múltiplas rotações completas

  ctx.translate(heroX, waistY);
  ctx.scale(scale, scale);

  const radiusX = 36 + progress * 24;
  const radiusY = 12 + progress * 8; // Perspectiva isométrica horizontal

  // 1. Halo Neon Magenta Externo Difuso (Img 2)
  ctx.save();
  ctx.rotate(currentAngle * 0.4);
  ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * 0.45})`;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX * 1.08, radiusY * 1.08, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 2. Anel de Plasma Rosa Choque / Magenta Brilhante
  ctx.save();
  ctx.rotate(currentAngle * 0.7);
  ctx.strokeStyle = `rgba(236, 72, 153, ${alpha * 0.85})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 3. Anel Cósmico Violeta / Púrpura Fluorescente (Img 2)
  ctx.save();
  ctx.rotate(currentAngle);
  ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.95})`;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX * 0.82, radiusY * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 4. Anel Interno de Energia Ciano Elétrico e Núcleo Branco
  ctx.save();
  ctx.rotate(currentAngle * 1.3);
  ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.9})`;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX * 0.65, radiusY * 0.65, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX * 0.65, radiusY * 0.65, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 5. Faíscas e Partículas Estelares Orbitais Giratórias
  const sparkColors = ['#ffffff', '#00f0ff', '#f43f5e', '#a855f7', '#fb7185'];
  for (let i = 0; i < 8; i++) {
    const sparkAngle = currentAngle + (i * Math.PI * 2) / 8;
    const sx = Math.cos(sparkAngle) * (radiusX * (0.8 + (i % 3) * 0.15));
    const sy = Math.sin(sparkAngle) * (radiusY * (0.8 + (i % 3) * 0.15));

    ctx.fillStyle = sparkColors[i % sparkColors.length];
    ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
  }

  ctx.restore();
}

// ─── 10. ATAQUE BÁSICO MELEE: SPLASH DE SANGUE JORRANDO (IMG 3) ───────────────

export function drawBloodSplash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  alpha: number = 1.0,
  _seed: number = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.max(0, alpha);

  // Paleta de Sangue Arterial Realista (Img 3)
  const BL_DEEP = '#7f1d1d';  // Coágulo profundo
  const BL_DARK = '#991b1b';  // Vermelho escuro
  const BL_MID = '#b91c1c';   // Vermelho sangue
  const BL_VIVID = '#dc2626'; // Vermelho arterial vivo
  const BL_LIGHT = '#ef4444'; // Respingos claros
  const BL_SPEC = '#fca5a5';  // Brilho especular

  const p = (px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, 1, 1);
  };

  const scale = 1.0 + progress * 0.5;
  ctx.scale(scale, scale);

  // 1. Mancha Central de Sangue (Impacto do Golpe)
  p(0, 0, BL_DEEP); p(1, 0, BL_DARK); p(-1, 0, BL_DARK);
  p(0, -1, BL_VIVID); p(0, 1, BL_DEEP);
  p(1, -1, BL_LIGHT); p(-1, 1, BL_DEEP);
  p(1, -2, BL_SPEC);
  p(-2, -1, BL_MID); p(2, 0, BL_MID);

  // 2. Jatos de Sangue Espirrando em Leque (Gotas da Img 3)
  // Jato Superior Esquerdo
  p(-3, -4, BL_VIVID); p(-4, -4, BL_DARK); p(-4, -5, BL_LIGHT); p(-3, -5, BL_SPEC);
  p(-6, -7, BL_VIVID); p(-7, -8, BL_LIGHT);

  // Jato Superior Direito
  p(3, -4, BL_VIVID); p(4, -5, BL_DARK); p(4, -4, BL_LIGHT); p(5, -6, BL_SPEC);
  p(7, -7, BL_VIVID); p(8, -8, BL_LIGHT);

  // Jatos Laterais Espirrados
  p(-6, -1, BL_DARK); p(-7, -1, BL_VIVID); p(-8, -2, BL_LIGHT);
  p(5, 0, BL_DARK); p(6, 1, BL_VIVID); p(7, 0, BL_LIGHT);

  // Jatos Inferiores (Gotas caindo)
  p(-3, 3, BL_DEEP); p(-4, 4, BL_DARK); p(-4, 6, BL_VIVID);
  p(2, 4, BL_DEEP); p(3, 5, BL_DARK); p(4, 7, BL_VIVID);
  p(0, 5, BL_DARK); p(1, 7, BL_LIGHT);

  ctx.restore();
}