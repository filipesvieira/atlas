/**
 * Renderers de Herói & Skins com Sistema de Animação Humana Completa:
 * - Ciclo de passos dinâmicos nas pernas/botas (walkStep)
 * - Respiração e oscilação orgânica (breathe)
 * - Piscada de olhos natural (blink)
 * - Movimento dinâmico de braços e armas em combate:
 *   * Camponês: soco/golpe rápido para a frente com retorno suave à cintura
 *   * Andarilho: desengate da alça da mochila com soco direto dinâmico
 *   * Cavaleiro: arco cortante de espada (slash) com rastro prateado e avanço de escudo
 *   * Arqueiro: corda puxada para trás com flecha e disparo elástico (snap)
 *   * Mago: elevação do cajado com anéis arcanos luminosos e foco cósmico
 */

export interface HeroRenderOptions {
  time?: number;
  walkStep?: number;
  isWalking?: boolean;
  isAttacking?: boolean;
  attackProgress?: number; // 0.0 a 1.0
  attackStyle?: 'melee' | 'arrow' | 'magic';
  facing?: number; // 1 (direita), -1 (esquerda)
  size?: number; // padrão 48
}

const cache = new Map<string, HTMLCanvasElement>();

function getOffscreenCanvas(key: string, size: number, drawFn: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cacheKey = `${key}_${size}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = 48;
  baseCanvas.height = 48;
  const baseCtx = baseCanvas.getContext('2d')!;
  baseCtx.imageSmoothingEnabled = false;
  drawFn(baseCtx);

  if (size === 48) {
    cache.set(cacheKey, baseCanvas);
    return baseCanvas;
  }

  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = size;
  scaledCanvas.height = size;
  const scaledCtx = scaledCanvas.getContext('2d')!;
  scaledCtx.imageSmoothingEnabled = false;
  scaledCtx.drawImage(baseCanvas, 0, 0, size, size);

  cache.set(cacheKey, scaledCanvas);
  return scaledCanvas;
}

// ───────────────────────────────────────────────────────────────────────────
// RENDERIZADORES DINÂMICOS COM ANIMAÇÃO DE PERNAS, BRAÇOS E ATAQUE
// ───────────────────────────────────────────────────────────────────────────

/** 1. Camponês Aventureiro (Skin Padrão) */
export function renderPeasant(ctx: CanvasRenderingContext2D, x: number, y: number, opts: HeroRenderOptions = {}) {
  const size = opts.size || 48;
  const time = opts.time || performance.now();
  const walkStep = opts.walkStep ?? (opts.isWalking ? Math.sin(time / 110) * 3.5 : 0);
  const breathe = Math.sin(time / 450) * 0.8;
  const blink = Math.sin(time / 1500) > 0.95;
  const isAttacking = Boolean(opts.isAttacking);
  const attackProgress = Math.max(0, Math.min(1, opts.attackProgress ?? 0));
  const punchCurve = isAttacking ? Math.sin(attackProgress * Math.PI) : 0;
  const facing = opts.facing ?? 1;

  ctx.save();
  ctx.translate(Math.round(x - size / 2), Math.round(y - size / 2));
  if (size !== 48) {
    const s = size / 48;
    ctx.scale(s, s);
  }
  if (facing === -1) {
    ctx.translate(24, 0);
    ctx.scale(-1, 1);
    ctx.translate(-24, 0);
  }

  // Sombra no solo (Y=44)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(24, 44, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Pernas, Culote Ocre e Botas Medievais Pretas de Couro com Passos
  // Perna Esquerda
  ctx.fillStyle = '#b45309'; // Sombra culote
  ctx.fillRect(16 - walkStep, 25, 2, 9);
  ctx.fillStyle = '#d97706'; // Culote
  ctx.fillRect(17 - walkStep, 24, 6, 11);
  ctx.fillStyle = '#27272a'; // Cano da bota
  ctx.fillRect(16 - walkStep, 33, 6, 4);
  ctx.fillStyle = '#18181b'; // Bota preta
  ctx.fillRect(17 - walkStep, 34, 5, 10);
  ctx.fillStyle = '#09090b'; // Solado
  ctx.fillRect(16 - walkStep, 42, 7, 2);

  // Perna Direita
  ctx.fillStyle = '#b45309'; // Sombra culote
  ctx.fillRect(30 + walkStep, 25, 2, 9);
  ctx.fillStyle = '#d97706'; // Culote
  ctx.fillRect(25 + walkStep, 24, 6, 11);
  ctx.fillStyle = '#27272a'; // Cano da bota
  ctx.fillRect(25 + walkStep, 33, 6, 4);
  ctx.fillStyle = '#18181b'; // Bota preta
  ctx.fillRect(26 + walkStep, 34, 5, 10);
  ctx.fillStyle = '#09090b'; // Solado
  ctx.fillRect(25 + walkStep, 42, 7, 2);

  // Cintura e cinto. A antiga faixa vertical até as pernas criava uma leitura
  // indesejada durante o ciclo de caminhada; o entrepernas agora permanece
  // aberto e neutro, definido apenas pelas duas calças separadas.
  ctx.fillStyle = '#d97706';
  ctx.fillRect(17, 23, 14, 3);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(17, 26, 14, 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(23, 26, 2, 2);

  // 2. Braço Esquerdo (Mão apoiada no quadril)
  ctx.fillStyle = '#fef3c7'; // Manga bufante marfim
  ctx.fillRect(12, 14 + breathe, 5, 10);
  ctx.fillRect(11, 17 + breathe, 4, 6);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(12, 21 + breathe, 5, 3);
  ctx.fillStyle = '#fef08a'; // Punho
  ctx.fillRect(13, 23 + breathe, 4, 2);
  ctx.fillStyle = '#fed7aa'; // Mão na cintura
  ctx.fillRect(14, 24 + breathe, 4, 3);

  // 3. Camisa Central de Linho Marfim (Gola em V)
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(20, 11 + breathe, 8, 12);
  ctx.fillStyle = '#fed7aa'; // Decote em V
  ctx.beginPath();
  ctx.moveTo(21, 11 + breathe);
  ctx.lineTo(27, 11 + breathe);
  ctx.lineTo(24, 17 + breathe);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fef08a'; // Lapelas
  ctx.fillRect(19, 10 + breathe, 3, 3);
  ctx.fillRect(26, 10 + breathe, 3, 3);

  // 4. Colete Medieval Preto com Debrum Carmim (Doublet)
  ctx.fillStyle = '#18181b'; // Corpo preto
  ctx.fillRect(17, 13 + breathe, 4, 10);
  ctx.fillRect(27, 13 + breathe, 4, 10);
  ctx.fillStyle = '#b91c1c'; // Ombros carmim
  ctx.fillRect(15, 12 + breathe, 4, 4);
  ctx.fillRect(29, 12 + breathe, 4, 4);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(16, 12 + breathe, 3, 2);
  ctx.fillRect(29, 12 + breathe, 3, 2);
  ctx.fillStyle = '#b91c1c'; // Debrum decote
  ctx.fillRect(20, 13 + breathe, 1.5, 10);
  ctx.fillRect(26.5, 13 + breathe, 1.5, 10);
  ctx.fillStyle = '#15803d'; // Cadarço verde escuro trançado
  ctx.fillRect(22, 14 + breathe, 4, 1);
  ctx.fillRect(22, 17 + breathe, 4, 1);
  ctx.fillRect(22, 20 + breathe, 4, 1);
  ctx.fillStyle = '#18181b'; // Pontas inferiores
  ctx.fillRect(18, 23 + breathe, 3, 2);
  ctx.fillRect(27, 23 + breathe, 3, 2);

  // 5. Cabeça, Rosto e Cabelo Castanho Ondulado
  ctx.fillStyle = '#fed7aa'; // Pele do rosto
  ctx.fillRect(20, 5 + breathe, 8, 7);

  if (!blink) {
    ctx.fillStyle = '#0f172a'; // Olhos
    ctx.fillRect(22, 7 + breathe, 1.5, 2);
    ctx.fillRect(25, 7 + breathe, 1.5, 2);
  } else {
    ctx.fillStyle = '#78350f'; // Olhos piscando
    ctx.fillRect(22, 8 + breathe, 2, 1);
    ctx.fillRect(25, 8 + breathe, 2, 1);
  }

  ctx.fillStyle = '#b45309'; // Sorriso sutil
  ctx.fillRect(23, 10 + breathe, 3, 1);
  ctx.fillStyle = '#78350f'; // Cabelo ondulado volumoso
  ctx.fillRect(18, 2 + breathe, 12, 4);
  ctx.fillRect(17, 4 + breathe, 3, 7);
  ctx.fillRect(28, 4 + breathe, 3, 7);
  ctx.fillRect(18, 10 + breathe, 2, 3);
  ctx.fillRect(28, 10 + breathe, 2, 3);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(21, 2 + breathe, 7, 2);

  // 6. Braço Direito: Repouso vs Ataque Enérgico
  if (!isAttacking || punchCurve <= 0.01) {
    // Mão direita apoiada na cintura
    ctx.fillStyle = '#fef3c7'; // Manga marfim
    ctx.fillRect(31, 14 + breathe, 5, 10);
    ctx.fillRect(33, 17 + breathe, 4, 6);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(31, 21 + breathe, 5, 3);
    ctx.fillStyle = '#fef08a'; // Punho
    ctx.fillRect(31, 23 + breathe, 4, 2);
    ctx.fillStyle = '#fed7aa'; // Mão
    ctx.fillRect(30, 24 + breathe, 4, 3);
  } else {
    // Braço direito se estica para a frente num golpe direto
    const punchX = punchCurve * 14;
    const punchY = -punchCurve * 4;

    ctx.fillStyle = '#fef3c7'; // Manga esticada
    ctx.fillRect(30, 14 + breathe, 5 + punchX * 0.4, 7);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(33 + punchX * 0.3, 16 + breathe + punchY * 0.5, 5 + punchX * 0.5, 5);
    ctx.fillStyle = '#fef08a'; // Punho da manga
    ctx.fillRect(37 + punchX * 0.8, 17 + breathe + punchY, 3, 4);
    ctx.fillStyle = '#fed7aa'; // Punho cerrado
    ctx.fillRect(39 + punchX, 17 + breathe + punchY, 5, 5);

    // Rastro de vento no ápice do soco
    if (punchCurve > 0.55) {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(43 + punchX, 19 + breathe + punchY, 6, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** 2. Andarilho Mochileiro */
export function renderWanderer(ctx: CanvasRenderingContext2D, x: number, y: number, opts: HeroRenderOptions = {}) {
  const size = opts.size || 48;
  const time = opts.time || performance.now();
  const walkStep = opts.walkStep ?? (opts.isWalking ? Math.sin(time / 110) * 3.5 : 0);
  const breathe = Math.sin(time / 450) * 0.8;
  const blink = Math.sin(time / 1500) > 0.95;
  const isAttacking = Boolean(opts.isAttacking);
  const attackProgress = Math.max(0, Math.min(1, opts.attackProgress ?? 0));
  const punchCurve = isAttacking ? Math.sin(attackProgress * Math.PI) : 0;
  const facing = opts.facing ?? 1;

  ctx.save();
  ctx.translate(Math.round(x - size / 2), Math.round(y - size / 2));
  if (size !== 48) {
    const s = size / 48;
    ctx.scale(s, s);
  }
  if (facing === -1) {
    ctx.translate(24, 0);
    ctx.scale(-1, 1);
    ctx.translate(-24, 0);
  }

  // Sombra no solo (Y=44)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(24, 44, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Mochila Cargueira de Expedição nas Costas (Y: 8-34)
  const bagBob = Math.sin(time / 240) * 0.8 - punchCurve * 1.5;
  const bagX = 7;
  const bagY = 8 + breathe + bagBob;
  ctx.fillStyle = '#14532d'; // Verde floresta
  ctx.beginPath();
  ctx.roundRect(bagX, bagY, 13, 24, 3);
  ctx.fill();
  ctx.fillStyle = '#166534';
  ctx.fillRect(bagX + 2, bagY + 4, 9, 16);

  // Esteira enrolada no topo
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.roundRect(bagX - 1, bagY - 4, 15, 5, 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bagX + 2, bagY - 4, 2, 5);
  ctx.fillRect(bagX + 9, bagY - 4, 2, 5);

  // Cantil na lateral
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(bagX - 3, bagY + 9, 3, 7);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bagX - 2, bagY + 7, 2, 2);

  // Kit de Primeiros Socorros & Corda
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(bagX - 3, bagY + 2, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bagX - 2, bagY + 3, 2, 2);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(bagX + 3, bagY + 8, 6, 8);

  // 2. Pernas, Calça Jeans e Botas de Trilha com Passos
  // Perna Esquerda
  ctx.fillStyle = '#1e293b'; // Jeans
  ctx.fillRect(17 - walkStep, 26, 5, 12);
  ctx.fillStyle = '#78350f'; // Bota
  ctx.fillRect(16 - walkStep, 38, 6, 6);
  ctx.fillStyle = '#451a03'; // Solado
  ctx.fillRect(15 - walkStep, 42, 8, 2);
  ctx.fillStyle = '#fef3c7'; // Cadarços
  ctx.fillRect(17 - walkStep, 39, 4, 1);

  // Perna Direita
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(26 + walkStep, 26, 5, 12);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(25 + walkStep, 38, 6, 6);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(25 + walkStep, 42, 8, 2);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(26 + walkStep, 39, 4, 1);

  // 3. Jaqueta Vermelha Esportiva (Y: 14-27)
  ctx.fillStyle = '#dc2626'; // Vermelho vivo
  ctx.fillRect(16, 14 + breathe, 16, 13);
  ctx.fillStyle = '#b91c1c'; // Sombra
  ctx.fillRect(16, 22 + breathe, 16, 5);
  ctx.fillStyle = '#ef4444'; // Gola
  ctx.fillRect(18, 12 + breathe, 12, 3);
  ctx.fillStyle = '#1e293b'; // Camiseta
  ctx.fillRect(22, 14 + breathe, 4, 3);
  ctx.fillStyle = '#f8fafc'; // Zíper
  ctx.fillRect(23, 16 + breathe, 2, 9);
  ctx.fillStyle = '#15803d'; // Alças da mochila
  ctx.fillRect(17, 14 + breathe, 3, 11);
  ctx.fillRect(28, 14 + breathe, 3, 11);

  // 4. Cabeça e Rosto
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(19, 6 + breathe, 10, 8);
  if (!blink) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(24, 8 + breathe, 2, 2);
  } else {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(24, 9 + breathe, 2, 1);
  }
  ctx.fillStyle = '#b45309';
  ctx.fillRect(23, 12 + breathe, 4, 1);
  ctx.fillStyle = '#451a03'; // Cabelo
  ctx.fillRect(18, 3 + breathe, 12, 5);
  ctx.fillRect(18, 5 + breathe, 2, 4);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(21, 3 + breathe, 7, 2);

  // 5. Braço Esquerdo (Segura alça da mochila)
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(15, 15 + breathe, 3, 8);
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(16, 20 + breathe, 4, 4);

  // 6. Braço Direito: Alça vs Soco Direto
  if (!isAttacking || punchCurve <= 0.01) {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(30, 15 + breathe, 3, 8);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(28, 20 + breathe, 4, 4);
  } else {
    const punchX = punchCurve * 15;
    const punchY = -punchCurve * 3;

    ctx.fillStyle = '#dc2626'; // Manga esportiva vermelha esticada
    ctx.fillRect(29, 15 + breathe, 5 + punchX * 0.5, 6);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(33 + punchX * 0.4, 16 + breathe + punchY, 5 + punchX * 0.4, 5);
    ctx.fillStyle = '#fed7aa'; // Mão fechada
    ctx.fillRect(38 + punchX, 16 + breathe + punchY, 5, 5);

    if (punchCurve > 0.55) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(43 + punchX, 18 + breathe + punchY, 6, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** 3. Cavaleiro Templário */
export function renderKnight(ctx: CanvasRenderingContext2D, x: number, y: number, opts: HeroRenderOptions = {}) {
  const size = opts.size || 48;
  const time = opts.time || performance.now();
  const walkStep = opts.walkStep ?? (opts.isWalking ? Math.sin(time / 110) * 3.5 : 0);
  const breathe = Math.sin(time / 450) * 0.8;
  const isAttacking = Boolean(opts.isAttacking);
  const attackProgress = Math.max(0, Math.min(1, opts.attackProgress ?? 0));
  const slashCurve = isAttacking ? Math.sin(attackProgress * Math.PI) : 0;
  const facing = opts.facing ?? 1;

  ctx.save();
  ctx.translate(Math.round(x - size / 2), Math.round(y - size / 2));
  if (size !== 48) {
    const s = size / 48;
    ctx.scale(s, s);
  }
  if (facing === -1) {
    ctx.translate(24, 0);
    ctx.scale(-1, 1);
    ctx.translate(-24, 0);
  }

  // Sombra no solo (Y=44)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(24, 44, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Capa Carmim Medieval Drapada (Ondula com passos e impacto)
  const capeWave = Math.sin(time / 280) * 2.5 + slashCurve * 4;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(16, 14 + breathe);
  ctx.lineTo(6 - capeWave, 42);
  ctx.lineTo(20, 42);
  ctx.lineTo(26, 22 + breathe);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b91c1c'; // Sombra da capa
  ctx.fillRect(8 - capeWave * 0.5, 22 + breathe, 6, 20);

  // Broche dourado no ombro
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(17, 15 + breathe, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Grevas e Botas de Aço com Passos
  // Perna Esquerda
  ctx.fillStyle = '#475569';
  ctx.fillRect(15 - walkStep, 28, 6, 6);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(15 - walkStep, 33, 6, 11);
  ctx.fillStyle = '#94a3b8'; // Sabaton (pé)
  ctx.fillRect(14 - walkStep, 41, 7, 3);

  // Perna Direita
  ctx.fillStyle = '#475569';
  ctx.fillRect(27 + walkStep, 28, 6, 6);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(27 + walkStep, 33, 6, 11);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(27 + walkStep, 41, 7, 3);

  // 3. Cota de Malha, Cinto e Peitoral de Aço Polido
  ctx.fillStyle = '#475569';
  ctx.fillRect(14, 24 + breathe, 20, 9);
  ctx.fillStyle = '#78350f'; // Cinto de couro
  ctx.fillRect(13, 23 + breathe, 22, 3.5);
  ctx.fillStyle = '#fbbf24'; // Fivela
  ctx.fillRect(21, 22 + breathe, 6, 5);

  // Peitoral de Placas de Aço Polido
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(14, 13 + breathe, 20, 11);
  ctx.fillStyle = '#cbd5e1'; // Brilho central
  ctx.fillRect(19, 14 + breathe, 10, 9);

  // 4. Elmo Templário Fechado
  ctx.fillStyle = '#64748b';
  ctx.fillRect(16, 3 + breathe, 16, 13);
  ctx.fillStyle = '#cbd5e1'; // Placa frontal
  ctx.fillRect(18, 5 + breathe, 12, 10);
  ctx.fillStyle = '#1e293b'; // Viseira escura
  ctx.fillRect(18, 8 + breathe, 12, 3);
  // Furos de ventilação
  ctx.fillStyle = '#334155';
  ctx.fillRect(20, 12 + breathe, 2, 2);
  ctx.fillRect(23, 12 + breathe, 2, 2);
  ctx.fillRect(26, 12 + breathe, 2, 2);

  // 5. Braço Esquerdo & Escudo Heater (Avança em postura de bloqueio/apoio)
  const shieldAdv = slashCurve * 3;
  const shieldX = 5 + shieldAdv;
  const shieldY = 16 + breathe;
  ctx.fillStyle = '#f8fafc'; // Fundo branco
  ctx.beginPath();
  ctx.moveTo(shieldX, shieldY);
  ctx.lineTo(shieldX + 14, shieldY);
  ctx.lineTo(shieldX + 14, shieldY + 14);
  ctx.lineTo(shieldX + 7, shieldY + 22);
  ctx.lineTo(shieldX, shieldY + 14);
  ctx.closePath();
  ctx.fill();
  // Cruz Vermelha
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(shieldX + 5, shieldY, 4, 20);
  ctx.fillRect(shieldX, shieldY + 6, 14, 4);
  // Borda metálica
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 6. Braço Direito & Espada Longa (Golpe de Corte / Slash Dinâmico)
  if (!isAttacking || slashCurve <= 0.01) {
    // Espada na guarda alta vertical
    ctx.fillStyle = '#64748b'; // Manopla
    ctx.fillRect(33, 20 + breathe, 5, 5);
    ctx.fillStyle = '#451a03'; // Cabo
    ctx.fillRect(35, 21 + breathe, 2.5, 6);
    ctx.fillStyle = '#fbbf24'; // Pomo
    ctx.beginPath();
    ctx.arc(36, 28 + breathe, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24'; // Guarda
    ctx.fillRect(31, 19 + breathe, 10, 2.5);
    // Lâmina de Aço
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(34, 19 + breathe);
    ctx.lineTo(39, 4 + breathe);
    ctx.lineTo(41, 4 + breathe);
    ctx.lineTo(37, 19 + breathe);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff'; // Ponta afiada
    ctx.beginPath();
    ctx.moveTo(39, 4 + breathe);
    ctx.lineTo(40, 2 + breathe);
    ctx.lineTo(41, 4 + breathe);
    ctx.closePath();
    ctx.fill();
  } else {
    // Rotação da Espada e Manopla no golpe de corte
    // 0.0 -> 0.25 (wind-up), 0.25 -> 0.7 (slash frontal), 0.7 -> 1.0 (retorno)
    let slashAngle = 0;
    if (attackProgress < 0.25) {
      slashAngle = -(attackProgress / 0.25) * 0.45; // puxa para trás (-25°)
    } else if (attackProgress < 0.7) {
      const t = (attackProgress - 0.25) / 0.45;
      slashAngle = -0.45 + t * 1.75; // corte devastador (+75°)
    } else {
      const t = (attackProgress - 0.7) / 0.3;
      slashAngle = 1.3 - t * 1.3; // retorna a 0°
    }

    ctx.save();
    ctx.translate(34, 20 + breathe);
    ctx.rotate(slashAngle);

    // Manopla
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-2, -2, 5, 5);
    // Cabo & Pomo
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, 2.5, 6);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(1.2, 7, 2, 0, Math.PI * 2);
    ctx.fill();
    // Guarda Dourada
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-4, -3, 10, 2.5);
    // Lâmina de Aço Polido
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(-1, -3);
    ctx.lineTo(3, -20);
    ctx.lineTo(5, -20);
    ctx.lineTo(2, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(3, -20);
    ctx.lineTo(4, -22);
    ctx.lineTo(5, -20);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Rastro de Lâmina no clímax do golpe (Slash Arc Trail)
    if (attackProgress >= 0.35 && attackProgress <= 0.68) {
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(34, 20 + breathe, 24, -Math.PI * 0.4, Math.PI * 0.35);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(34, 20 + breathe, 26, -Math.PI * 0.3, Math.PI * 0.25);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** 4. Patrulheiro dos Bosques / Arqueiro */
export function renderArcher(ctx: CanvasRenderingContext2D, x: number, y: number, opts: HeroRenderOptions = {}) {
  const size = opts.size || 48;
  const time = opts.time || performance.now();
  const walkStep = opts.walkStep ?? (opts.isWalking ? Math.sin(time / 110) * 3.5 : 0);
  const breathe = Math.sin(time / 450) * 0.8;
  const blink = Math.sin(time / 1500) > 0.95;
  const isAttacking = Boolean(opts.isAttacking);
  const attackProgress = Math.max(0, Math.min(1, opts.attackProgress ?? 0));
  const facing = opts.facing ?? 1;

  ctx.save();
  ctx.translate(Math.round(x - size / 2), Math.round(y - size / 2));
  if (size !== 48) {
    const s = size / 48;
    ctx.scale(s, s);
  }
  if (facing === -1) {
    ctx.translate(24, 0);
    ctx.scale(-1, 1);
    ctx.translate(-24, 0);
  }

  // Sombra no solo (Y=44)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(24, 44, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Pernas, Calças de Couro e Botas de Rastreador com Passos
  // Perna Esquerda
  ctx.fillStyle = '#451a03'; // Calça
  ctx.fillRect(17 - walkStep, 28, 5, 12);
  ctx.fillStyle = '#78350f'; // Bota
  ctx.fillRect(16 - walkStep, 38, 6, 6);
  ctx.fillStyle = '#0f172a'; // Solado
  ctx.fillRect(16 - walkStep, 42, 6, 2);

  // Perna Direita
  ctx.fillStyle = '#451a03';
  ctx.fillRect(26 + walkStep, 28, 5, 12);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(25 + walkStep, 38, 6, 6);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(25 + walkStep, 42, 6, 2);

  // 2. Aljava de Flechas nas Costas
  ctx.fillStyle = '#92400e';
  ctx.fillRect(10, 9 + breathe, 5, 16);
  ctx.fillStyle = '#fef3c7'; // Penas
  ctx.fillRect(9, 4 + breathe, 2, 6);
  ctx.fillRect(12, 2 + breathe, 2, 8);

  // 3. Túnica Verde com Bordado Dourado e Cinto
  ctx.fillStyle = '#15803d'; // Túnica
  ctx.fillRect(15, 15 + breathe, 18, 14);
  ctx.fillStyle = '#fbbf24'; // Borda dourada
  ctx.fillRect(15, 27 + breathe, 18, 2);
  ctx.fillStyle = '#451a03'; // Cinto
  ctx.fillRect(14, 23 + breathe, 20, 3);
  ctx.fillStyle = '#fbbf24'; // Fivela
  ctx.fillRect(22, 22 + breathe, 4, 4);

  // Braçadeiras
  ctx.fillStyle = '#78350f';
  ctx.fillRect(12, 16 + breathe, 4, 8);
  ctx.fillRect(32, 16 + breathe, 4, 8);

  // 4. Cabeça e Capuz Verde (Robin Hood)
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(24, 10 + breathe, 7.5, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(33, 16 + breathe);
  ctx.lineTo(15, 16 + breathe);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fde047'; // Rosto
  ctx.fillRect(20, 8 + breathe, 8, 6);

  if (!blink) {
    ctx.fillStyle = '#0f172a'; // Olho compenetrado
    ctx.fillRect(24, 9 + breathe, 2.5, 2);
  } else {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(24, 10 + breathe, 2.5, 1);
  }

  // 5. Arco Longo de Madeira, Corda e Flecha
  if (!isAttacking) {
    // Postura relaxada
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(31, 19 + breathe, 15, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    ctx.strokeStyle = '#f8fafc'; // Corda
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(34, 5 + breathe);
    ctx.lineTo(21, 19 + breathe);
    ctx.lineTo(34, 33 + breathe);
    ctx.stroke();

    ctx.fillStyle = '#78350f'; // Flecha apoiada
    ctx.fillRect(19, 18 + breathe, 23, 2);
    ctx.fillStyle = '#cbd5e1'; // Ponta
    ctx.beginPath();
    ctx.moveTo(42, 19 + breathe);
    ctx.lineTo(47, 16 + breathe);
    ctx.lineTo(47, 22 + breathe);
    ctx.closePath();
    ctx.fill();
  } else {
    // Animação de Tiro com Puxada de Corda
    // 0.0 -> 0.5 (puxa a corda ao máximo), 0.5 -> 0.7 (soltura/snap), 0.7 -> 1.0 (recuo e relaxamento)
    let drawDist = 0;
    const isFired = attackProgress >= 0.5;

    if (attackProgress < 0.5) {
      drawDist = (attackProgress / 0.5) * 14; // puxa corda até 14px para trás
    } else if (attackProgress < 0.7) {
      drawDist = 0; // soltura imediata
    } else {
      drawDist = Math.sin((attackProgress - 0.7) / 0.3 * Math.PI) * 2; // leve vibração de recuo
    }

    const bowX = 33;
    const bowY = 19 + breathe;
    const pullX = bowX - 10 - drawDist;

    // Arco firme apontado para a frente
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bowX, bowY, 15, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    // Corda tensionada em V
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bowX + 3, bowY - 14);
    ctx.lineTo(pullX, bowY);
    ctx.lineTo(bowX + 3, bowY + 14);
    ctx.stroke();

    // Mão puxando a corda
    ctx.fillStyle = '#78350f';
    ctx.fillRect(pullX - 2, bowY - 2, 4, 4);

    if (!isFired) {
      // Flecha encaixada na corda puxada
      ctx.fillStyle = '#78350f';
      ctx.fillRect(pullX, bowY - 1, (bowX + 14) - pullX, 2);
      ctx.fillStyle = '#fef3c7'; // Penas na mão
      ctx.fillRect(pullX - 4, bowY - 2, 4, 4);
      ctx.fillStyle = '#cbd5e1'; // Ponta metálica
      ctx.beginPath();
      ctx.moveTo(bowX + 14, bowY);
      ctx.lineTo(bowX + 18, bowY - 3);
      ctx.lineTo(bowX + 18, bowY + 3);
      ctx.closePath();
      ctx.fill();
    } else if (attackProgress < 0.75) {
      // Rastro de disparo da flecha em velocidade
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bowX + 5, bowY);
      ctx.lineTo(bowX + 26, bowY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** 5. Arcanista Elemental / Mago */
export function renderMage(ctx: CanvasRenderingContext2D, x: number, y: number, opts: HeroRenderOptions = {}) {
  const size = opts.size || 48;
  const time = opts.time || performance.now();
  const walkStep = opts.walkStep ?? (opts.isWalking ? Math.sin(time / 110) * 3.5 : 0);
  const breathe = Math.sin(time / 450) * 0.8;
  const isAttacking = Boolean(opts.isAttacking);
  const attackProgress = Math.max(0, Math.min(1, opts.attackProgress ?? 0));
  const castCurve = isAttacking ? Math.sin(attackProgress * Math.PI) : 0;
  const facing = opts.facing ?? 1;

  ctx.save();
  ctx.translate(Math.round(x - size / 2), Math.round(y - size / 2));
  if (size !== 48) {
    const s = size / 48;
    ctx.scale(s, s);
  }
  if (facing === -1) {
    ctx.translate(24, 0);
    ctx.scale(-1, 1);
    ctx.translate(-24, 0);
  }

  // Sombra no solo (Y=44)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(24, 44, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Manto Púrpura Drapado (Y: 13-43)
  ctx.fillStyle = '#7e22ce';
  ctx.beginPath();
  ctx.moveTo(24, 13 + breathe);
  ctx.lineTo(39, 42);
  ctx.lineTo(9, 42);
  ctx.closePath();
  ctx.fill();

  // 2. Robe Azul Real com Cinto Dourado (Y: 14-43)
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.moveTo(24, 14 + breathe);
  ctx.lineTo(35, 42);
  ctx.lineTo(13, 42);
  ctx.closePath();
  ctx.fill();

  // Cinto de Couro e Fivela Dourada
  ctx.fillStyle = '#78350f';
  ctx.fillRect(15, 24 + breathe, 18, 3.5);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(21, 22 + breathe, 6, 6);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(22.5, 23.5 + breathe, 3, 3);

  // Sapatos sob a barra do robe com passadas leves
  ctx.fillStyle = '#451a03';
  ctx.fillRect(17 - walkStep, 41, 5, 3);
  ctx.fillRect(26 + walkStep, 41, 5, 3);

  // 3. Rosto e Barba Branca Flutuante
  ctx.fillStyle = '#fde047'; // Pele
  ctx.fillRect(20, 8 + breathe, 8, 7);

  // Barba branca flutuante
  const beardWave = Math.sin(time / 300) * 1.5 + castCurve * 2.5;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(24, 15 + breathe, 6, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, 15 + breathe);
  ctx.lineTo(24 + beardWave, 25 + breathe);
  ctx.lineTo(30, 15 + breathe);
  ctx.closePath();
  ctx.fill();

  // Olhos arcanos
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(21, 9 + breathe, 2, 2);
  ctx.fillRect(25, 9 + breathe, 2, 2);

  // 4. Chapéu Pontudo de Bruxo Púrpura (Y: 2-10)
  ctx.fillStyle = '#7e22ce'; // Aba do chapéu
  ctx.beginPath();
  ctx.ellipse(24, 8 + breathe, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Copa pontuda dobrada
  ctx.beginPath();
  ctx.moveTo(16, 8 + breathe);
  ctx.quadraticCurveTo(18, 2 + breathe, 28, 2 + breathe);
  ctx.lineTo(31, 8 + breathe);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fbbf24'; // Faixa dourada
  ctx.fillRect(18, 6 + breathe, 12, 2);

  // 5. Cajado Místico com Cristal Azul (Conjuração Arcana)
  if (!isAttacking || castCurve <= 0.01) {
    // Cajado apoiado no solo
    ctx.fillStyle = '#78350f'; // Haste
    ctx.fillRect(9, 10 + breathe, 3, 34);
    ctx.strokeStyle = '#92400e'; // Espiral
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(10.5, 7 + breathe, 4.5, 0, Math.PI * 1.8);
    ctx.stroke();
    // Cristal Azul com pulso de respiração
    const glow = Math.sin(time / 200) * 0.5 + 2.5;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(10.5, 7 + breathe, glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 6 + breathe, 1.5, 1.5);
  } else {
    // Cajado é erguido para o alto e para a frente apontando o foco cósmico
    const liftX = castCurve * 8;
    const liftY = -castCurve * 7;
    const staffX = 10 + liftX;
    const staffY = 7 + breathe + liftY;

    // Haste inclinada
    ctx.save();
    ctx.translate(10, 36 + breathe);
    ctx.rotate(castCurve * 0.35); // inclinação mágica para frente

    ctx.fillStyle = '#78350f';
    ctx.fillRect(-1.5, -26, 3, 34);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -29, 4.5, 0, Math.PI * 1.8);
    ctx.stroke();

    // Cristal Azul Cintilante
    const glow = 3 + castCurve * 2;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -29, glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -30, 2, 2);

    ctx.restore();

    // Anéis de Pulso Mágico no Ápice da Conjuração
    if (castCurve > 0.4) {
      const ringRadius = 4 + castCurve * 9;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(staffX + 10, staffY - 2, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(244, 114, 182, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(staffX + 10, staffY - 2, ringRadius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** Despachante Geral de Renderização de Skins */
export function renderHeroSkin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  skinKey: string,
  opts: HeroRenderOptions = {}
) {
  const key = (skinKey || '').toLowerCase();
  if (key.includes('knight') || key.includes('guerreiro') || key.includes('cavaleiro')) {
    renderKnight(ctx, x, y, opts);
  } else if (key.includes('archer') || key.includes('arqueiro') || key.includes('patrulheiro') || key.includes('hunter')) {
    renderArcher(ctx, x, y, opts);
  } else if (key.includes('mage') || key.includes('mago') || key.includes('arcanista') || key.includes('sorcerer')) {
    renderMage(ctx, x, y, opts);
  } else if (key.includes('wanderer') || key.includes('andarilho') || key.includes('mochileiro')) {
    renderWanderer(ctx, x, y, opts);
  } else {
    renderPeasant(ctx, x, y, opts);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// WRAPPERS ESTÁTICOS PARA THUMBNAILS E ÍCONES (Retrocompatibilidade Total)
// ───────────────────────────────────────────────────────────────────────────

export function getPeasantSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_peasant_v2', size, (ctx) => renderPeasant(ctx, 24, 24, { size: 48 }));
}

export function getWandererSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_wanderer', size, (ctx) => renderWanderer(ctx, 24, 24, { size: 48 }));
}

export function getKnightSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_knight', size, (ctx) => renderKnight(ctx, 24, 24, { size: 48 }));
}

export function getArcherSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_archer', size, (ctx) => renderArcher(ctx, 24, 24, { size: 48 }));
}

export function getMageSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_mage', size, (ctx) => renderMage(ctx, 24, 24, { size: 48 }));
}
