/**
 * PixelArtRenderer — Gerador de Texturas e Cenários 2D em Offscreen Canvas
 * 
 * Pre-renderiza cenários ricos e sprites detalhados em offscreen canvases.
 * O rendering final via `ctx.drawImage(buffer, ...)` é 100% síncrono,
 * sem delays, sem telas pretas e com 60 FPS cravados.
 */

export class PixelArtRenderer {
  private static cache: Map<string, HTMLCanvasElement> = new Map();

  /** Cria ou recupera um canvas offscreen do cache */
  private static getOffscreenCanvas(key: string, width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // Preserva estética Pixel Art nítida
    drawFn(ctx);

    this.cache.set(key, canvas);
    return canvas;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CENÁRIOS DE BIOMA RICOS (500×260px)
  // ───────────────────────────────────────────────────────────────────────────

  /** Cenário: Floresta dos Aprendizes (Verde exuberante, árvore, trilha de terra, sol) */
  public static getForestBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_forest', w, h, (ctx) => {
      // Céu gradiente suave (Crepúsculo ensolarado)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#1e3a8a'); // Azul cobalto
      skyGrad.addColorStop(0.6, '#3b82f6'); // Azul claro
      skyGrad.addColorStop(1, '#93c5fd'); // Azul celeste
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Sol da manhã distante
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(80, 45, 22, 0, Math.PI * 2);
      ctx.fill();

      // Montanhas ao fundo
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(90, h * 0.32);
      ctx.lineTo(180, h * 0.5);
      ctx.lineTo(290, h * 0.28);
      ctx.lineTo(410, h * 0.5);
      ctx.lineTo(500, h * 0.38);
      ctx.lineTo(500, h * 0.5);
      ctx.fill();

      // Chão de grama rústica
      const grassGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      grassGrad.addColorStop(0, '#15803d'); // Verde floresta
      grassGrad.addColorStop(1, '#064e3b'); // Verde escuro
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Trilha de terra central (caminho dos combatentes)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      ctx.quadraticCurveTo(w * 0.5, h * 0.58, w, h * 0.68);
      ctx.lineTo(w, h * 0.88);
      ctx.quadraticCurveTo(w * 0.5, h * 0.78, 0, h * 0.85);
      ctx.fill();

      // Pedras e tufos de grama na trilha
      ctx.fillStyle = '#92400e';
      ctx.fillRect(40, h * 0.72, 8, 3);
      ctx.fillRect(160, h * 0.66, 12, 4);
      ctx.fillRect(320, h * 0.75, 10, 4);
      ctx.fillRect(440, h * 0.70, 7, 3);

      // Árvores nas bordas
      this.drawTree(ctx, 30, h * 0.52, 28, 65);
      this.drawTree(ctx, 470, h * 0.55, 32, 70);
      this.drawTree(ctx, 430, h * 0.48, 22, 50);
    });
  }

  /** Cenário: Ruínas Orcs (Pedra mística, colunas quebradas, piso de pedra) */
  public static getOrcRuinsBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_orcruins', w, h, (ctx) => {
      // Céu noturno com névoa púrpura
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#3b0764');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Lua cheia
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(420, 40, 18, 0, Math.PI * 2);
      ctx.fill();

      // Ruínas de castelo distante
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(60, 50, 40, 80);
      ctx.fillRect(140, 70, 50, 60);
      ctx.fillRect(280, 40, 45, 90);

      // Piso de pedra e ruínas
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Grade de lajotas de pedra
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.5);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = h * 0.5; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Colunas gregas quebradas nas ruínas
      ctx.fillStyle = '#475569';
      ctx.fillRect(40, h * 0.4, 16, 80);
      ctx.fillRect(450, h * 0.42, 18, 75);
    });
  }

  /** Cenário: Picos Congelados (Neve, geleira, aurora borealis) */
  public static getFrozenBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_frozen', w, h, (ctx) => {
      // Céu Ártico com Aurora Borealis
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.5, '#06b6d4');
      skyGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Faixas de Aurora verde/azul
      ctx.fillStyle = 'rgba(52, 211, 153, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.quadraticCurveTo(w * 0.5, 70, w, 20);
      ctx.lineTo(w, 50);
      ctx.quadraticCurveTo(w * 0.5, 90, 0, 40);
      ctx.fill();

      // Montanhas de Gelo
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(100, h * 0.22);
      ctx.lineTo(210, h * 0.5);
      ctx.lineTo(340, h * 0.18);
      ctx.lineTo(460, h * 0.5);
      ctx.lineTo(500, h * 0.35);
      ctx.lineTo(500, h * 0.5);
      ctx.fill();

      // Chão de neve / geleira
      const snowGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      snowGrad.addColorStop(0, '#bae6fd');
      snowGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = snowGrad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);
    });
  }

  /** Cenário: Abismo Cinderino (Rio de lava, pedras vulcânicas, chamas) */
  public static getAbyssBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_abyss', w, h, (ctx) => {
      // Caverna Vulcânica Vermelha
      const caveGrad = ctx.createLinearGradient(0, 0, 0, h);
      caveGrad.addColorStop(0, '#450a0a');
      caveGrad.addColorStop(0.6, '#7f1d1d');
      caveGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = caveGrad;
      ctx.fillRect(0, 0, w, h);

      // Formações de rocha vulcânica no fundo
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(80, h * 0.3);
      ctx.lineTo(160, h * 0.5);
      ctx.lineTo(300, h * 0.25);
      ctx.lineTo(420, h * 0.5);
      ctx.lineTo(500, h * 0.35);
      ctx.lineTo(500, h * 0.5);
      ctx.fill();

      // Rio de lava fervente no centro
      const lavaGrad = ctx.createLinearGradient(0, h * 0.65, 0, h * 0.85);
      lavaGrad.addColorStop(0, '#f97316');
      lavaGrad.addColorStop(0.5, '#ef4444');
      lavaGrad.addColorStop(1, '#b91c1c');
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(0, h * 0.65, w, 40);

      // Brilho dourado no centro da lava
      ctx.fillStyle = '#fde047';
      ctx.fillRect(50, h * 0.68, 80, 8);
      ctx.fillRect(220, h * 0.70, 120, 10);
      ctx.fillRect(400, h * 0.67, 70, 8);
    });
  }

  /** Cenário: Vila do Shereque (Pântano verde místico, água barrenta, cogumelos) */
  public static getSherequeBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_shereque', w, h, (ctx) => {
      // Céu de Pântano Tenebroso
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#064e3b');
      skyGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Lua Verde / Bruma do Pântano
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(0, h * 0.3, w, h * 0.2);

      // Água de Pântano Verde Escuro
      const swampGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      swampGrad.addColorStop(0, '#047857');
      swampGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = swampGrad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Lama central (caminho)
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      ctx.quadraticCurveTo(w * 0.5, h * 0.58, w, h * 0.68);
      ctx.lineTo(w, h * 0.88);
      ctx.quadraticCurveTo(w * 0.5, h * 0.78, 0, h * 0.85);
      ctx.fill();

      // Cogumelos Místicos Grandes nas bordas
      ctx.fillStyle = '#dc2626'; // Chapéu vermelho
      ctx.beginPath();
      ctx.arc(40, h * 0.58, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fef08a'; // Talo
      ctx.fillRect(37, h * 0.58, 6, 12);

      ctx.fillStyle = '#a855f7'; // Chapéu púrpura
      ctx.beginPath();
      ctx.arc(460, h * 0.62, 16, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(457, h * 0.62, 6, 14);
    });
  }

  /** Cenário: Vila do Chapolin (Vila costeira, praia tropical, sol poente) */
  public static getChapolinBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_chapolin', w, h, (ctx) => {
      // Céu de Pôr do Sol Laranja/Dourado
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#c2410c');
      skyGrad.addColorStop(0.5, '#ea580c');
      skyGrad.addColorStop(1, '#f97316');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Sol Poente Vermelhão
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(250, h * 0.42, 28, 0, Math.PI * 2);
      ctx.fill();

      // Mar Azul Tropical
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, h * 0.5, w, h * 0.15);

      // Areia da Praia
      const sandGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
      sandGrad.addColorStop(0, '#fde047');
      sandGrad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, h * 0.65, w, h * 0.35);

      // Coqueiros
      ctx.fillStyle = '#78350f';
      ctx.fillRect(40, h * 0.45, 10, 45);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(45, h * 0.42, 20, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Cenário: Esgotos Tartaruga (Tijolos escuros, líquido verde neon) */
  public static getEsgotosBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_esgotos', w, h, (ctx) => {
      // Parede de tijolos escuros
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h * 0.65);

      // Grade de tijolos de esgoto
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      for (let y = 0; y < h * 0.65; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Tubo de Esgoto com vazamento
      ctx.fillStyle = '#475569';
      ctx.fillRect(w * 0.5 - 30, h * 0.2, 60, 40);
      ctx.fillStyle = '#10b981'; // Fluído verde neon
      ctx.fillRect(w * 0.5 - 10, h * 0.4, 20, h * 0.25);

      // Canal de Esgoto Fervente no piso
      const sewerGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
      sewerGrad.addColorStop(0, '#10b981');
      sewerGrad.addColorStop(1, '#047857');
      ctx.fillStyle = sewerGrad;
      ctx.fillRect(0, h * 0.65, w, h * 0.35);
    });
  }

  /** Cenário: Escola de Rogartes (Castelo de Magia Noturno, Vitrais) */
  public static getRogartesBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_rogartes', w, h, (ctx) => {
      // Céu Noturno Púrpura Místico com Estrelas
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#1e1b4b');
      skyGrad.addColorStop(1, '#311042');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Estrelas piscando
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(60, 20, 3, 3);
      ctx.fillRect(180, 35, 2, 2);
      ctx.fillRect(320, 15, 3, 3);
      ctx.fillRect(440, 40, 2, 2);

      // Torres da Escola de Rogartes
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(100, h * 0.5);
      ctx.lineTo(130, 40);
      ctx.lineTo(160, h * 0.5);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(340, h * 0.5);
      ctx.lineTo(370, 30);
      ctx.lineTo(400, h * 0.5);
      ctx.fill();

      // Piso do Salão Místico
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Brilho Rúnico Púrpura no chão
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.75, 40, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  /** Desenha uma árvore simples no contexto */
  private static drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // Tronco
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - w * 0.15, y, w * 0.3, h * 0.4);

    // Folhagem verde (copa da árvore)
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(x, y - h * 0.2, w * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(x - w * 0.2, y - h * 0.35, w * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x + w * 0.2, y - h * 0.3, w * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SPRITES DE HEROIS & VOCAÇÕES (48×48px)
  // ───────────────────────────────────────────────────────────────────────────

  /** Sprite do Herói Guerreiro (Cavaleiro com elmo, espada e escudo) */
  public static getKnightSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_knight', size, size, (ctx) => {
      // Sombra projetada
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Manto Vermelho
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(size / 2 - 12, size / 2 - 4, 24, 20);

      // Armadura de Aço (Peitoral)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(size / 2 - 10, size / 2 - 6, 20, 18);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(size / 2 - 8, size / 2 - 4, 8, 14); // Brilho no peito

      // Capacete de Guerreiro com Pluma Dourada
      ctx.fillStyle = '#64748b';
      ctx.fillRect(size / 2 - 9, 8, 18, 16);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 - 3, 3, 6, 7); // Pluma
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(size / 2 - 7, 14, 14, 4); // Viseira escura

      // Olhos brilhantes na viseira
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(size / 2 - 4, 15, 2, 2);
      ctx.fillRect(size / 2 + 2, 15, 2, 2);

      // Espada de Aço na mão direita
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(size / 2 + 10, 10, 4, 22); // Lâmina
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 + 7, 28, 10, 3); // Empunhadura

      // Escudo na mão esquerda
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(size / 2 - 11, size / 2 + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 - 12, size / 2 + 2, 3, 4);
    });
  }

  /** Sprite do Herói Mago (Mago com túnica azul, chapéu de bruxo e cajado) */
  public static getMageSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_mage', size, size, (ctx) => {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Robe Azul Arcano
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(size / 2, 14);
      ctx.lineTo(size / 2 + 14, size - 6);
      ctx.lineTo(size / 2 - 14, size - 6);
      ctx.fill();

      // Detalhes Dourados no Robe
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 - 2, 18, 4, size - 24);

      // Rosto
      ctx.fillStyle = '#fde047';
      ctx.fillRect(size / 2 - 6, 12, 12, 10);

      // Barba Branca Mística
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(size / 2, 22, 7, 0, Math.PI);
      ctx.fill();

      // Chapéu de Mago Pontudo
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(size / 2, 2);
      ctx.lineTo(size / 2 + 12, 14);
      ctx.lineTo(size / 2 - 12, 14);
      ctx.fill();

      // Cajado Mágico na mão
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 + 10, 8, 3, 30);
      // Orbe de Cristal Azul Brilhante
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(size / 2 + 11.5, 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(size / 2 + 10, 4, 2, 2);
    });
  }

  /** Sprite do Herói Arqueiro (Caçador com manto verde, arco e aljava) */
  public static getArcherSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_archer', size, size, (ctx) => {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Manto de Caçador Verde
      ctx.fillStyle = '#15803d';
      ctx.fillRect(size / 2 - 10, 16, 20, 22);

      // Couraça de Couro
      ctx.fillStyle = '#92400e';
      ctx.fillRect(size / 2 - 8, 18, 16, 14);

      // Capuz Verde
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(size / 2, 14, 9, Math.PI, Math.PI * 2);
      ctx.fill();

      // Arco Curvo em Mão
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2 + 10, 24, 12, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Corda do Arco
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size / 2 + 14, 14);
      ctx.lineTo(size / 2 + 14, 34);
      ctx.stroke();
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SPRITES DE MONSTROS DETALHADOS (48×48px)
  // ───────────────────────────────────────────────────────────────────────────

  /** Sprite: Goblin Salteador */
  public static getGoblinSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_goblin', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo Verde Pequeno
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(size / 2 - 8, 16, 16, 18);

      // Orelhas Grandes de Goblin
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 6, 14);
      ctx.lineTo(size / 2 - 18, 10);
      ctx.lineTo(size / 2 - 6, 20);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size / 2 + 6, 14);
      ctx.lineTo(size / 2 + 18, 10);
      ctx.lineTo(size / 2 + 6, 20);
      ctx.fill();

      // Cabeça Verde
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(size / 2, 15, 8, 0, Math.PI * 2);
      ctx.fill();

      // Olhos Vermelhos
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(size / 2 - 5, 13, 3, 3);
      ctx.fillRect(size / 2 + 2, 13, 3, 3);

      // Adaga
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(size / 2 - 12, 20, 3, 10);
    });
  }

  /** Sprite: Lobo Selvagem */
  public static getWolfSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_wolf', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo de Lobo Quadrupede
      ctx.fillStyle = '#475569';
      ctx.fillRect(size / 2 - 14, 18, 28, 14);

      // Pelagem do Peito
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(size / 2 - 14, 20, 8, 10);

      // Cabeça de Lobo com Focinho
      ctx.fillStyle = '#64748b';
      ctx.fillRect(size / 2 - 16, 12, 12, 12);
      ctx.fillRect(size / 2 - 20, 16, 6, 6); // Focinho

      // Olho Âmbar
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 - 13, 14, 3, 3);
    });
  }

  /** Sprite: Orc Guerreiro / Berserker */
  public static getOrcSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_orc', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo Robusto Verde Escuro
      ctx.fillStyle = '#15803d';
      ctx.fillRect(size / 2 - 14, 16, 28, 22);

      // Ombreiras com Espinhos
      ctx.fillStyle = '#334155';
      ctx.fillRect(size / 2 - 18, 14, 8, 8);
      ctx.fillRect(size / 2 + 10, 14, 8, 8);

      // Cabeça Grande com Capacete
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(size / 2, 14, 10, 0, Math.PI * 2);
      ctx.fill();

      // Capacete de Ferro
      ctx.fillStyle = '#475569';
      ctx.fillRect(size / 2 - 10, 6, 20, 8);

      // Presas Inferiores
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(size / 2 - 6, 20, 3, 5);
      ctx.fillRect(size / 2 + 3, 20, 3, 5);

      // Machado de Batalha Duplo
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(size / 2 + 12, 6, 10, 26);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 + 15, 4, 3, 32);
    });
  }

  /** Sprite: Dragão Vermelho Cinderino */
  public static getDragonSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_dragon', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Asas de Dragão Abertas
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.moveTo(size / 2, 20);
      ctx.lineTo(4, 4);
      ctx.lineTo(size / 2 - 6, 26);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size / 2, 20);
      ctx.lineTo(size - 4, 4);
      ctx.lineTo(size / 2 + 6, 26);
      ctx.fill();

      // Corpo de Dragão Carmim
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(size / 2, 24, 14, 0, Math.PI * 2);
      ctx.fill();

      // Cabeça de Dragão com Chifres
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(size / 2 - 10, 8, 20, 14);

      // Chifres
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 - 12, 2, 4, 8);
      ctx.fillRect(size / 2 + 8, 2, 4, 8);

      // Olhos Fogo
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(size / 2 - 6, 12, 3, 3);
      ctx.fillRect(size / 2 + 3, 12, 3, 3);
    });
  }

  /** Sprite: Vampiro Ancestral / Lorde Espectro (Capa rubra, pele pálida, presas) */
  public static getVampireSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_vampire', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Capa Negra com Gola Alta Rubra
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.moveTo(size / 2, 8);
      ctx.lineTo(size / 2 + 16, size - 6);
      ctx.lineTo(size / 2 - 16, size - 6);
      ctx.fill();

      ctx.fillStyle = '#dc2626'; // Interior da gola
      ctx.fillRect(size / 2 - 10, 10, 20, 8);

      // Rosto Pálido
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(size / 2 - 6, 12, 12, 10);

      // Olhos Vermelhos Brilhantes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(size / 2 - 4, 14, 3, 3);
      ctx.fillRect(size / 2 + 1, 14, 3, 3);

      // Presas de Vampiro
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(size / 2 - 4, 20, 2, 4);
      ctx.fillRect(size / 2 + 2, 20, 2, 4);
    });
  }

  /** Sprite: Aranha de Espinhos / Aranha Gigante */
  public static getSpiderSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_spider', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 8 Pernas da Aranha
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 2.5;

      const legs = [-14, -10, -4, 4, 10, 14];
      legs.forEach((lx) => {
        ctx.beginPath();
        ctx.moveTo(size / 2, size / 2);
        ctx.lineTo(size / 2 + lx * 1.3, size / 2 - 8);
        ctx.lineTo(size / 2 + lx * 1.6, size / 2 + 10);
        ctx.stroke();
      });

      // Abdomen Roxo Escuro
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.arc(size / 2 + 6, size / 2, 10, 0, Math.PI * 2);
      ctx.fill();

      // Cabeça Negra
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(size / 2 - 6, size / 2, 7, 0, Math.PI * 2);
      ctx.fill();

      // Olhos Rubros de Aranha (Múltiplos)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(size / 2 - 10, size / 2 - 3, 2, 2);
      ctx.fillRect(size / 2 - 10, size / 2 + 1, 2, 2);
      ctx.fillRect(size / 2 - 7, size / 2 - 4, 2, 2);
      ctx.fillRect(size / 2 - 7, size / 2 + 2, 2, 2);
    });
  }

  /** Sprite: Orc Arqueiro (Com arco de madeira) */
  public static getOrcArcherSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_orc_archer', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo Verde com Túnica de Couro
      ctx.fillStyle = '#166534';
      ctx.fillRect(size / 2 - 12, 16, 24, 20);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 - 8, 18, 16, 16);

      // Cabeça de Orc
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(size / 2, 14, 8, 0, Math.PI * 2);
      ctx.fill();

      // Capuz Marrom
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(size / 2, 12, 9, Math.PI, Math.PI * 2);
      ctx.fill();

      // Arco Mão Direita
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2 - 10, 22, 10, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Corda do Arco
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size / 2 - 6, 14);
      ctx.lineTo(size / 2 - 6, 30);
      ctx.stroke();
    });
  }

  /** Sprite: Esqueleto Guardião */
  public static getSkeletonSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_skeleton', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Costelas de Esqueleto
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(size / 2 - 6, 18, 12, 14);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(size / 2 - 4, 20, 8, 2);
      ctx.fillRect(size / 2 - 4, 24, 8, 2);

      // Crânio
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(size / 2, 12, 8, 0, Math.PI * 2);
      ctx.fill();

      // Cavidades dos Olhos Vermelhas
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(size / 2 - 5, 10, 3, 3);
      ctx.fillRect(size / 2 + 2, 10, 3, 3);
    });
  }

  /** Sprite: Golem de Gelo */
  public static getGolemSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_golem', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo de Gelo Jagged
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(size / 2 - 14, 14, 28, 22);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(size / 2 - 10, 16, 20, 16);

      // Núcleo Azul Brilhante
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(size / 2, 22, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Sprite: Demônio Ancestral / Lorde das Chamas */
  public static getDemonSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_demon', size, size, (ctx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo de Demônio Obsidian/Vermelho
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(size / 2 - 14, 14, 28, 24);
      ctx.fillStyle = '#18181b'; // Peitoral de obsidian
      ctx.fillRect(size / 2 - 10, 16, 20, 18);

      // Chifres Vulcânicos
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 10, 10);
      ctx.lineTo(size / 2 - 18, 2);
      ctx.lineTo(size / 2 - 6, 12);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size / 2 + 10, 10);
      ctx.lineTo(size / 2 + 18, 2);
      ctx.lineTo(size / 2 + 6, 12);
      ctx.fill();

      // Olhos de Chama Amarelos
      ctx.fillStyle = '#fde047';
      ctx.fillRect(size / 2 - 6, 12, 4, 4);
      ctx.fillRect(size / 2 + 2, 12, 4, 4);
    });
  }

  /** Retorna a textura de Herói com base na vocação do personagem */
  public static getHeroTexture(vocation = 'guerreiro'): HTMLCanvasElement {
    const v = vocation.toLowerCase();
    if (v.includes('mago') || v.includes('apprentice') || v.includes('acolyte')) {
      return this.getMageSprite();
    }
    if (v.includes('arqueiro') || v.includes('hunter') || v.includes('paladin')) {
      return this.getArcherSprite();
    }
    return this.getKnightSprite();
  }

  /** Retorna a textura de Monstro com base no nome */
  public static getMonsterTexture(name = ''): HTMLCanvasElement {
    const n = name.toLowerCase();
    if (n.includes('vampiro') || n.includes('espectro') || n.includes('ancestral')) {
      return this.getVampireSprite();
    }
    if (n.includes('aranha') || n.includes('espinhos') || n.includes('spider')) {
      return this.getSpiderSprite();
    }
    if (n.includes('arqueiro') || n.includes('atirador')) {
      return this.getOrcArcherSprite();
    }
    if (n.includes('dragão') || n.includes('cinderino')) {
      return this.getDragonSprite();
    }
    if (n.includes('demônio') || n.includes('chamas') || n.includes('lorde')) {
      return this.getDemonSprite();
    }
    if (n.includes('lobo') || n.includes('wolf')) {
      return this.getWolfSprite();
    }
    if (n.includes('esqueleto') || n.includes('guardião')) {
      return this.getSkeletonSprite();
    }
    if (n.includes('golem') || n.includes('frost')) {
      return this.getGolemSprite();
    }
    if (n.includes('goblin') || n.includes('salteador')) {
      return this.getGoblinSprite();
    }
    return this.getOrcSprite();
  }
}
