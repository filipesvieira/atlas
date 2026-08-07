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
      skyGrad.addColorStop(0, '#1e3a8a');
      skyGrad.addColorStop(0.6, '#3b82f6');
      skyGrad.addColorStop(1, '#93c5fd');
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
      grassGrad.addColorStop(0, '#15803d');
      grassGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Trilha de terra central
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

  /** Cenário: Acampamento / Safezone Vivo (Cabana, pinheiros, tronco, fogueira com anel de pedras) */
  public static getCampBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_camp', w, h, (ctx) => {
      // Céu noturno calmo
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Lua e estrelas sutis
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(420, 35, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(60, 20, 2, 2);
      ctx.fillRect(140, 40, 2, 2);
      ctx.fillRect(240, 15, 2, 2);
      ctx.fillRect(310, 30, 2, 2);

      // Silhuetas de montanhas ao fundo
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(80, h * 0.35);
      ctx.lineTo(170, h * 0.5);
      ctx.lineTo(300, h * 0.30);
      ctx.lineTo(430, h * 0.5);
      ctx.lineTo(500, h * 0.38);
      ctx.lineTo(500, h * 0.5);
      ctx.fill();

      // Pinheiros distantes
      this.drawTree(ctx, 40, h * 0.46, 18, 45);
      this.drawTree(ctx, 90, h * 0.48, 15, 40);

      // Chão do acampamento
      const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      groundGrad.addColorStop(0, '#1e293b');
      groundGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Detalhes de solo
      ctx.fillStyle = '#334155';
      ctx.fillRect(30, h * 0.65, 6, 3);
      ctx.fillRect(120, h * 0.75, 8, 4);
      ctx.fillRect(280, h * 0.82, 5, 3);
      ctx.fillRect(380, h * 0.68, 7, 3);

      ctx.fillStyle = '#166534';
      ctx.fillRect(70, h * 0.60, 4, 6);
      ctx.fillRect(150, h * 0.70, 4, 6);
      ctx.fillRect(310, h * 0.78, 4, 6);

      // Cabana de madeira à direita
      const cabX = 360;
      const cabY = h * 0.4;
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cabX, cabY + 20, 110, 60);
      ctx.fillStyle = '#292524';
      for (let px = cabX + 15; px < cabX + 110; px += 20) {
        ctx.fillRect(px, cabY + 20, 2, 60);
      }
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(cabX - 10, cabY + 20);
      ctx.lineTo(cabX + 55, cabY - 10);
      ctx.lineTo(cabX + 120, cabY + 20);
      ctx.fill();
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cabX + 20, cabY + 45, 22, 35);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cabX + 65, cabY + 32, 20, 20);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cabX + 74, cabY + 32, 2, 20);
      ctx.fillRect(cabX + 65, cabY + 41, 20, 2);

      // Suporte de armas e barril
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cabX - 25, cabY + 50, 16, 24);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cabX - 23, cabY + 54, 20, 3);
      ctx.fillRect(cabX - 23, cabY + 66, 20, 3);

      // Banco de tronco
      const benchX = 140;
      const benchY = h * 0.5 + 4 * 32 - 10;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(benchX, benchY, 40, 10);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(benchX + 4, benchY + 10, 6, 8);
      ctx.fillRect(benchX + 30, benchY + 10, 6, 8);

      // Fogueira
      const fireX = 224;
      const fireY = h * 0.5 + 4 * 32 - 16;
      ctx.fillStyle = '#64748b';
      const stoneAngles = [0, 0.78, 1.57, 2.35, 3.14, 3.92, 4.71, 5.49];
      stoneAngles.forEach((ang) => {
        const sx = fireX + 12 + Math.cos(ang) * 22;
        const sy = fireY + Math.sin(ang) * 14;
        ctx.fillRect(sx - 3, sy - 3, 6, 5);
      });

      ctx.fillStyle = '#451a03';
      ctx.fillRect(fireX, fireY, 24, 8);
      ctx.fillRect(fireX + 4, fireY - 4, 16, 12);
      
      const glow = ctx.createRadialGradient(fireX + 12, fireY, 5, fireX + 12, fireY, 65);
      glow.addColorStop(0, 'rgba(234, 88, 12, 0.5)');
      glow.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fireX + 12, fireY, 65, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Cenário: Vila do Shereque (Pântano temático com a famosa Casa Tronco do Shereque, raízes e bruma) */
  public static getSherequeBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_shereque', w, h, (ctx) => {
      // Céu de Pântano com Raios de Sol Suaves
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#064e3b');
      skyGrad.addColorStop(0.7, '#14532d');
      skyGrad.addColorStop(1, '#166534');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Raios de Sol Crepusculares através das copas
      ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
      ctx.beginPath();
      ctx.moveTo(80, 0);
      ctx.lineTo(160, h * 0.5);
      ctx.lineTo(210, h * 0.5);
      ctx.lineTo(110, 0);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(220, 0);
      ctx.lineTo(320, h * 0.5);
      ctx.lineTo(370, h * 0.5);
      ctx.lineTo(250, 0);
      ctx.fill();

      // Silhueta de Árvores de Pântano ao fundo com Musgo Pendurado
      ctx.fillStyle = '#022c22';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(40, h * 0.2);
      ctx.lineTo(90, h * 0.5);
      ctx.lineTo(150, h * 0.25);
      ctx.lineTo(220, h * 0.5);
      ctx.fill();

      // Musgo pendente nas árvores
      ctx.fillStyle = '#15803d';
      ctx.fillRect(45, h * 0.25, 4, 20);
      ctx.fillRect(52, h * 0.28, 3, 15);
      ctx.fillRect(155, h * 0.28, 4, 18);

      // Solo de Lama do Pântano com Grama Rústica
      const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      groundGrad.addColorStop(0, '#14532d');
      groundGrad.addColorStop(0.4, '#36220f');
      groundGrad.addColorStop(1, '#1c1007');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Trilha central de terra úmida
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      ctx.quadraticCurveTo(w * 0.4, h * 0.58, w, h * 0.68);
      ctx.lineTo(w, h * 0.90);
      ctx.quadraticCurveTo(w * 0.4, h * 0.78, 0, h * 0.88);
      ctx.fill();

      // 🏠 A FAMOSA CASA TRONCO DO SHEREQUE (X: 290 a 460, Y: h*0.35 a h*0.82)
      const houseX = 310;
      const houseY = h * 0.35;

      // Tronco Principal Oco (Madeira escura e cortada no topo)
      ctx.fillStyle = '#361202';
      ctx.beginPath();
      ctx.moveTo(houseX + 20, houseY + 110);
      ctx.lineTo(houseX + 35, houseY + 30);
      ctx.lineTo(houseX + 90, houseY + 30);
      ctx.lineTo(houseX + 110, houseY + 110);
      ctx.fill();

      // Topo do Tronco Quebrado
      ctx.fillStyle = '#5c2206';
      ctx.beginPath();
      ctx.ellipse(houseX + 62, houseY + 30, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#290d02';
      ctx.beginPath();
      ctx.ellipse(houseX + 62, houseY + 30, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Telhado de Musgo & Ervas Sobrepostas (Verde exuberante caindo)
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(houseX - 10, houseY + 65);
      ctx.quadraticCurveTo(houseX + 60, houseY + 10, houseX + 135, houseY + 65);
      ctx.lineTo(houseX + 120, houseY + 80);
      ctx.quadraticCurveTo(houseX + 60, houseY + 35, houseX + 5, houseY + 80);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(houseX + 30, houseY + 45, 18, 0, Math.PI * 2);
      ctx.arc(houseX + 60, houseY + 35, 22, 0, Math.PI * 2);
      ctx.arc(houseX + 95, houseY + 48, 18, 0, Math.PI * 2);
      ctx.fill();

      // Raízes Gigantes Enraizadas na Lama
      ctx.fillStyle = '#290d02';
      ctx.beginPath();
      ctx.moveTo(houseX + 25, houseY + 80);
      ctx.quadraticCurveTo(houseX - 15, houseY + 110, houseX - 25, houseY + 125);
      ctx.lineTo(houseX + 5, houseY + 125);
      ctx.quadraticCurveTo(houseX + 25, houseY + 110, houseX + 40, houseY + 95);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(houseX + 95, houseY + 85);
      ctx.quadraticCurveTo(houseX + 135, houseY + 110, houseX + 150, houseY + 125);
      ctx.lineTo(houseX + 130, houseY + 125);
      ctx.quadraticCurveTo(houseX + 110, houseY + 110, houseX + 85, houseY + 98);
      ctx.fill();

      // Porta Rústica de Madeira no Tronco
      ctx.fillStyle = '#5c2a0c';
      ctx.fillRect(houseX + 48, houseY + 75, 26, 38);
      ctx.fillStyle = '#1c0a02';
      ctx.fillRect(houseX + 46, houseY + 73, 30, 3);
      ctx.fillRect(houseX + 46, houseY + 73, 3, 40);
      ctx.fillRect(houseX + 73, houseY + 73, 3, 40);
      // Trinco da porta
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(houseX + 68, houseY + 93, 3, 4);

      // Pedras de Caminho
      ctx.fillStyle = '#64748b';
      ctx.fillRect(houseX + 30, houseY + 115, 10, 5);
      ctx.fillRect(houseX + 12, houseY + 122, 12, 6);
      ctx.fillRect(houseX - 10, houseY + 128, 14, 6);

      // Placa de Aviso "CUIDADO COM O OGRO" à esquerda
      ctx.fillStyle = '#78350f';
      ctx.fillRect(40, h * 0.65, 4, 25); // Poste
      ctx.fillStyle = '#92400e';
      ctx.fillRect(28, h * 0.62, 28, 14); // Placa
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(32, h * 0.66, 20, 4); // Pintura de aviso vermelha

      // Cogumelos Místicos Grandes na borda esquerda
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(100, h * 0.72, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(97, h * 0.72, 6, 10);
    });
  }

  /** Cenário: Vila do Chapolin (Vila do Chaves icônica com o Barril do Chaves, escada para o 72, paredes amarelas e piso de lajotas) */
  public static getChapolinBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_chapolin', w, h, (ctx) => {
      // Céu Noturno / Tarde na Vila
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.45);

      // Paredes Amarelas/Beiges e Azuis da Vila do Chaves (Ao fundo)
      const wallY = h * 0.25;
      const wallH = h * 0.35;

      // Parede Esquerda (Apartamento do Seu Madruga / Escada)
      ctx.fillStyle = '#d97706'; // Amarelo queimado / Ocre
      ctx.fillRect(0, wallY, 180, wallH);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, wallY + wallH - 12, 180, 12); // Rodapé vermelho

      // Parede Central (Fundo da Vila com portas)
      ctx.fillStyle = '#fef08a'; // Amarelo claro da vila
      ctx.fillRect(180, wallY + 15, 170, wallH - 15);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(180, wallY + wallH - 10, 170, 10);

      // Parede Direita (Apartamento da Dona Florinda)
      ctx.fillStyle = '#7dd3fc'; // Azul claro
      ctx.fillRect(350, wallY, 150, wallH);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(350, wallY + wallH - 12, 150, 12);

      // Portas e Janelas da Vila
      // Porta 71/72
      ctx.fillStyle = '#451a03';
      ctx.fillRect(210, wallY + 25, 24, 45);
      ctx.fillRect(300, wallY + 25, 24, 45);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(380, wallY + 15, 35, 55); // Janela com moldura
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(385, wallY + 20, 25, 30); // Vidro da janela

      // 🪜 ESCADA DA VILA (No canto esquerdo X: 0 a 100, subindo)
      ctx.fillStyle = '#334155'; // Degraus de pedra
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(0, wallY + wallH - (i * 12), 100 - (i * 14), 12);
      }
      // Corrimão de ferro preto
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, wallY + wallH + 10);
      ctx.lineTo(95, wallY + 20);
      ctx.stroke();
      ctx.lineWidth = 2;
      for (let rx = 20; rx < 90; rx += 18) {
        ctx.beginPath();
        ctx.moveTo(rx, wallY + wallH - (rx * 0.5));
        ctx.lineTo(rx, wallY + wallH - (rx * 0.5) - 25);
        ctx.stroke();
      }

      // Piso de Lajotas de Pedra em Tons Violeta/Cinza (Conforme Imagem 5)
      const patioY = wallY + wallH;
      const patioH = h - patioY;
      const patioGrad = ctx.createLinearGradient(0, patioY, 0, h);
      patioGrad.addColorStop(0, '#94a3b8');
      patioGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = patioGrad;
      ctx.fillRect(0, patioY, w, patioH);

      // Linhas do Pavimento de Lajotas Desregulares
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      for (let py = patioY; py < h; py += 16) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
      }
      for (let px = 0; px < w; px += 32) {
        ctx.beginPath();
        ctx.moveTo(px, patioY);
        ctx.lineTo(px + 10, h);
        ctx.stroke();
      }

      // 🛢️ O BARRIL DO CHAVES (No centro do pátio X: 220, Y: patioY + 10)
      const barrelX = 225;
      const barrelY = patioY + 8;
      // Corpo de madeira do barril
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(barrelX + 16, barrelY + 20, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      // Anéis de ferro pretos
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(barrelX + 1, barrelY + 8, 30, 3);
      ctx.fillRect(barrelX, barrelY + 20, 32, 3);
      ctx.fillRect(barrelX + 1, barrelY + 32, 30, 3);
      // Abertura do topo do barril
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(barrelX + 16, barrelY + 3, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 🚲 TRICICLO VERMELHO DO QUICO (Perto do barril X: 290)
      ctx.fillStyle = '#dc2626'; // Corpo vermelho
      ctx.fillRect(290, patioY + 25, 14, 4);
      ctx.fillStyle = '#0f172a'; // Rodinhas
      ctx.beginPath();
      ctx.arc(288, patioY + 30, 4, 0, Math.PI * 2);
      ctx.arc(304, patioY + 30, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1'; // Guidão
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(298, patioY + 25);
      ctx.lineTo(298, patioY + 16);
      ctx.stroke();

      // Botijões de Gás e Vasos de Flores na direita
      ctx.fillStyle = '#64748b'; // Botijão
      ctx.fillRect(430, patioY + 5, 12, 22);
      ctx.fillRect(445, patioY + 5, 12, 22);
      ctx.fillStyle = '#b45309'; // Vaso de flor
      ctx.fillRect(410, patioY + 18, 14, 12);
      ctx.fillStyle = '#ef4444'; // Flores vermelhas
      ctx.beginPath();
      ctx.arc(417, patioY + 14, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Cenário: Ruínas Orcs / Castelo de Greiscu (O icônico Castle Grayskull com a fachada de crânio gigante, pontes de fangs e tempestade carmim) */
  public static getOrcRuinsBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_orcruins', w, h, (ctx) => {
      // Céu Tempestuoso Carmim e Púrpura (Conforme Imagem 1)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#4c1d95');
      skyGrad.addColorStop(0.4, '#701a75');
      skyGrad.addColorStop(0.7, '#be185d');
      skyGrad.addColorStop(1, '#9f1239');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Nuvens Tempestuosas em Carretel Escuro
      ctx.fillStyle = 'rgba(30, 27, 75, 0.4)';
      ctx.beginPath();
      ctx.arc(100, 20, 50, 0, Math.PI * 2);
      ctx.arc(260, 15, 60, 0, Math.PI * 2);
      ctx.arc(420, 25, 45, 0, Math.PI * 2);
      ctx.fill();

      // Solo de Pedras Vulcânicas e Caminho de Lajotas (Y: h*0.5 a h)
      const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      groundGrad.addColorStop(0, '#311042');
      groundGrad.addColorStop(0.5, '#1e1b4b');
      groundGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Caminho central de pedra roxa
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - 40, h * 0.5);
      ctx.lineTo(w * 0.5 + 40, h * 0.5);
      ctx.lineTo(w * 0.5 + 90, h);
      ctx.lineTo(w * 0.5 - 90, h);
      ctx.fill();

      // Stalagmites/Picos de osso afiados nas bordas do caminho
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(40, h * 0.85);
      ctx.lineTo(55, h * 0.68);
      ctx.lineTo(68, h * 0.85);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(430, h * 0.88);
      ctx.lineTo(448, h * 0.70);
      ctx.lineTo(462, h * 0.88);
      ctx.fill();

      // 🏰 CASTELO DE GREISCU (CASTLE GRAYSKULL - X: 160 a 340, Y: h*0.12 a h*0.8)
      const castleX = 170;
      const castleY = h * 0.12;

      // Torres Laterais de Pedra Verde Musgo
      ctx.fillStyle = '#15803d'; // Verde musgo do castelo
      ctx.fillRect(castleX, castleY + 20, 42, 110);
      ctx.fillRect(castleX + 118, castleY + 20, 42, 110);

      // Ameias/Muros no topo das torres
      ctx.fillStyle = '#166534';
      ctx.fillRect(castleX - 4, castleY + 10, 50, 14);
      ctx.fillRect(castleX + 114, castleY + 10, 50, 14);
      // Dentes das ameias
      ctx.fillStyle = '#14532d';
      ctx.fillRect(castleX - 2, castleY + 6, 8, 8);
      ctx.fillRect(castleX + 16, castleY + 6, 8, 8);
      ctx.fillRect(castleX + 34, castleY + 6, 8, 8);
      ctx.fillRect(castleX + 116, castleY + 6, 8, 8);
      ctx.fillRect(castleX + 134, castleY + 6, 8, 8);
      ctx.fillRect(castleX + 152, castleY + 6, 8, 8);

      // Bloco Central do Castelo e Domo Superior
      ctx.fillStyle = '#15803d';
      ctx.fillRect(castleX + 35, castleY + 30, 90, 100);
      // Domo do elmo central
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(castleX + 80, castleY + 30, 26, Math.PI, 0);
      ctx.fill();

      // 💀 A FACHADA DE CRÂNIO GIGANTE (Central)
      ctx.fillStyle = '#15803d'; // Cor da rocha do crânio
      ctx.beginPath();
      ctx.arc(castleX + 80, castleY + 65, 36, 0, Math.PI * 2);
      ctx.fill();

      // Cavidades Oculares Ocultas (Olhos pretos do crânio)
      ctx.fillStyle = '#022c22'; // Fundo preto profundo
      ctx.beginPath();
      ctx.arc(castleX + 63, castleY + 60, 11, 0, Math.PI * 2);
      ctx.arc(castleX + 97, castleY + 60, 11, 0, Math.PI * 2);
      ctx.fill();

      // Cavidade Nasal em V
      ctx.beginPath();
      ctx.moveTo(castleX + 80, castleY + 70);
      ctx.lineTo(castleX + 74, castleY + 80);
      ctx.lineTo(castleX + 86, castleY + 80);
      ctx.fill();

      // Mandíbula e Grandes Presas de Marfim (Fangs)
      ctx.fillStyle = '#fef3c7'; // Marfim das presas
      // Presa esquerda gigantesca
      ctx.beginPath();
      ctx.moveTo(castleX + 50, castleY + 80);
      ctx.quadraticCurveTo(castleX + 46, castleY + 115, castleX + 54, castleY + 125);
      ctx.quadraticCurveTo(castleX + 60, castleY + 110, castleX + 60, castleY + 80);
      ctx.fill();

      // Presa direita gigantesca
      ctx.beginPath();
      ctx.moveTo(castleX + 110, castleY + 80);
      ctx.quadraticCurveTo(castleX + 114, castleY + 115, castleX + 106, castleY + 125);
      ctx.quadraticCurveTo(castleX + 100, castleY + 110, castleX + 100, castleY + 80);
      ctx.fill();

      // Dentes superiores entre as presas
      for (let tx = castleX + 62; tx < castleX + 98; tx += 7) {
        ctx.fillRect(tx, castleY + 82, 5, 8);
      }

      // Porta do Portão Rústico sob a Boca do Crânio
      ctx.fillStyle = '#451a03';
      ctx.fillRect(castleX + 60, castleY + 88, 40, 42);
      ctx.fillStyle = '#290d02';
      ctx.fillRect(castleX + 79, castleY + 88, 2, 42); // Divisão das portas
      // Escudo com emblema rubro na porta
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(castleX + 80, castleY + 98, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(castleX + 78, castleY + 96, 4, 4);
    });
  }

  /** Cenário: Esgotos Tartaruga (Tijolos marrons clássicos do Arcade, tubo circular de esgoto e canal de água roxa/índigo - Imagem 1) */
  public static getEsgotosBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_esgotos', w, h, (ctx) => {
      // Parede de Tijolos Marrons/Vermelhos de Esgoto (Conforme Imagem 1 Arcade)
      const wallH = h * 0.62;
      const wallGrad = ctx.createLinearGradient(0, 0, 0, wallH);
      wallGrad.addColorStop(0, '#5c2206');
      wallGrad.addColorStop(0.5, '#78350f');
      wallGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, w, wallH);

      // Linhas dos Tijolos de Pedra da Parede
      ctx.strokeStyle = '#290d02';
      ctx.lineWidth = 1.5;
      for (let y = 0; y < wallH; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        const offset = (Math.floor(y / 14) % 2) * 16;
        for (let x = offset; x < w; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 14);
          ctx.stroke();
        }
      }

      // ⭕ TUBO DE ESGOTO CIRCULAR GRANDE NA PAREDE (L. HEAD - X: 60, Y: wallH * 0.45)
      const pipeX = 70;
      const pipeY = wallH * 0.5;
      const pipeR = 26;

      // Anel metálico externo do tubo
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(pipeX, pipeY, pipeR + 4, 0, Math.PI * 2);
      ctx.fill();

      // Borda interna do tubo de tijolo
      ctx.fillStyle = '#290d02';
      ctx.beginPath();
      ctx.arc(pipeX, pipeY, pipeR, 0, Math.PI * 2);
      ctx.fill();

      // Interior preto profundo da tubulação
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(pipeX, pipeY, pipeR - 4, 0, Math.PI * 2);
      ctx.fill();

      // Tubulação vertical de ferro com junções na direita
      ctx.fillStyle = '#334155';
      ctx.fillRect(450, 0, 8, wallH);
      ctx.fillStyle = '#64748b'; // Junção metálica
      ctx.fillRect(447, 20, 14, 6);
      ctx.fillRect(447, 80, 14, 6);

      // 🌊 CANAL DE ESGOTO LÍQUIDO ROXO/ÍNDIGO (Piso Arcade Imagem 1)
      const canalY = wallH;
      const canalH = h - canalY;
      const canalGrad = ctx.createLinearGradient(0, canalY, 0, h);
      canalGrad.addColorStop(0, '#311042');
      canalGrad.addColorStop(0.5, '#581c87');
      canalGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = canalGrad;
      ctx.fillRect(0, canalY, w, canalH);

      // Ondulações e Reflexos Místicos Púrpuras na Água
      ctx.fillStyle = '#a855f7';
      for (let rx = 20; rx < w; rx += 60) {
        ctx.fillRect(rx, canalY + 12, 28, 2);
        ctx.fillRect(rx + 15, canalY + 28, 35, 2);
        ctx.fillRect(rx - 10, canalY + 45, 24, 2);
      }
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(120, canalY + 20, 40, 2);
      ctx.fillRect(320, canalY + 35, 50, 2);
    });
  }

  /** Cenário: Escola de Rogartes (Biblioteca de Hogwarts com arcos góticos, vitrais iluminados, estantes de livros e lareira - Imagem 1) */
  public static getRogartesBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_rogartes', w, h, (ctx) => {
      // Teto em Arcos Góticos de Pedra Púrpura/Índigo (Conforme Imagem 1)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.6, '#1e1b4b');
      skyGrad.addColorStop(1, '#311042');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.45);

      // Nervuras de Arcos Góticos do Teto
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.35);
      ctx.quadraticCurveTo(w * 0.25, 0, w * 0.5, h * 0.35);
      ctx.quadraticCurveTo(w * 0.75, 0, w, h * 0.35);
      ctx.stroke();

      // 🪟 VITRAL GÓTICO ILUMINADO CENTRAL (Imagem 1)
      const winX = 215;
      const winY = 15;
      const winW = 70;
      const winH = 85;

      // Moldura de pedra do arco do vitral
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(winX, winY + winH);
      ctx.lineTo(winX, winY + 30);
      ctx.quadraticCurveTo(winX + winW * 0.5, winY - 10, winX + winW, winY + 30);
      ctx.lineTo(winX + winW, winY + winH);
      ctx.fill();

      // Vidro azul luminoso
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.moveTo(winX + 4, winY + winH - 2);
      ctx.lineTo(winX + 4, winY + 32);
      ctx.quadraticCurveTo(winX + winW * 0.5, winY - 5, winX + winW - 4, winY + 32);
      ctx.lineTo(winX + winW - 4, winY + winH - 2);
      ctx.fill();

      // Trançado de chumbo no vitral
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(winX + winW * 0.5, winY);
      ctx.lineTo(winX + winW * 0.5, winY + winH);
      ctx.moveTo(winX + 4, winY + 45);
      ctx.lineTo(winX + winW - 4, winY + 45);
      ctx.stroke();

      // 📚 MEZANINO E ESTANTES DE LIVROS DA BIBLIOTECA (Y: h*0.35 a h*0.65)
      const wallY = h * 0.35;
      const wallH = h * 0.35;

      // Mezanino com Balustrada de Madeira
      ctx.fillStyle = '#451a03';
      ctx.fillRect(0, wallY, w, 12);
      ctx.fillStyle = '#78350f';
      for (let bx = 10; bx < w; bx += 14) {
        ctx.fillRect(bx, wallY - 15, 4, 15);
      }
      ctx.fillRect(0, wallY - 17, w, 3); // Corrimão

      // Parede de Estantes com Livros Antigos
      ctx.fillStyle = '#361202';
      ctx.fillRect(0, wallY + 12, w, wallH - 12);

      // Lombadas de Livros Multicor nas Estantes
      const bookColors = ['#991b1b', '#15803d', '#ca8a04', '#1d4ed8', '#78350f'];
      for (let y = wallY + 16; y < wallY + wallH - 10; y += 18) {
        ctx.fillStyle = '#290d02'; // Prateleira
        ctx.fillRect(0, y + 14, w, 3);

        for (let x = 10; x < w - 20; x += 6) {
          // Pular espaço onde fica o vitral central
          if (x > winX - 20 && x < winX + winW + 10) continue;
          ctx.fillStyle = bookColors[Math.floor((x + y) % bookColors.length)];
          ctx.fillRect(x, y, 5, 14);
        }
      }

      // 🔥 LAREIRA ACONCHEGANTE NA DIREITA (X: 400, Y: wallY + 15)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(410, wallY + 15, 65, 60);
      ctx.fillStyle = '#1c0a02'; // Boca da lareira
      ctx.beginPath();
      ctx.arc(442, wallY + 50, 20, Math.PI, 0);
      ctx.fillRect(422, wallY + 50, 40, 25);
      ctx.fill();
      // Fogo na lareira
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(442, wallY + 65, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(442, wallY + 67, 7, 0, Math.PI * 2);
      ctx.fill();

      // PISO DE LAJOTAS DE PEDRA E MESA DE ESTUDO CENTRAL
      const floorY = wallY + wallH;
      const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
      floorGrad.addColorStop(0, '#64748b');
      floorGrad.addColorStop(1, '#334155');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorY, w, h - floorY);

      // Lajotas no Piso de Pedra
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      for (let fx = 0; fx < w; fx += 40) {
        ctx.beginPath();
        ctx.moveTo(fx, floorY);
        ctx.lineTo(fx, h);
        ctx.stroke();
      }

      // Mesa de Madeira de Estudo Central (X: 180 a 320)
      ctx.fillStyle = '#5c2206';
      ctx.fillRect(180, floorY + 8, 140, 10);
      ctx.fillStyle = '#361202';
      ctx.fillRect(195, floorY + 18, 8, 14);
      ctx.fillRect(297, floorY + 18, 8, 14);
      // Vela acesa na mesa
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(248, floorY, 4, 8);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(250, floorY - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Cenário: Santuário de Atenas (Cavaleiros do Zodíaco com Estátua de Atena, Templo Grego de Colunas e Escadarias - Imagem 1) */
  public static getFrozenBackground(w = 500, h = 260): HTMLCanvasElement {
    return this.getOffscreenCanvas('bg_frozen', w, h, (ctx) => {
      // Céu Azul Luminoso com Nuvens e Raios de Sol do Santuário (Conforme Imagem 1)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(1, '#93c5fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Nuvens Brancas e Raios Divinos no Céu
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(60, 25, 24, 0, Math.PI * 2);
      ctx.arc(90, 20, 30, 0, Math.PI * 2);
      ctx.arc(410, 30, 28, 0, Math.PI * 2);
      ctx.arc(440, 25, 22, 0, Math.PI * 2);
      ctx.fill();

      // Raios de Luz Solares Diagonais
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(100, 0);
      ctx.lineTo(160, 0);
      ctx.lineTo(260, h * 0.5);
      ctx.lineTo(200, h * 0.5);
      ctx.fill();

      // 🗿 ESTÁTUA GIGANTE DE ATENA NO SUMMIT DO SANTUÁRIO (Imagem 1 Central Superior)
      const athenaX = 250;
      const athenaY = 12;

      // Colunas laterais da montanha do templo de Atena
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(athenaX - 55, athenaY + 10, 8, 65);
      ctx.fillRect(athenaX + 47, athenaY + 10, 8, 65);
      ctx.fillStyle = '#fbbf24'; // Topos decorados das colunas
      ctx.fillRect(athenaX - 57, athenaY + 6, 12, 5);
      ctx.fillRect(athenaX + 45, athenaY + 6, 12, 5);

      // Corpo/Vestido da Estátua de Atena
      ctx.fillStyle = '#e2e8f0'; // Mármore branco da estátua
      ctx.beginPath();
      ctx.moveTo(athenaX, athenaY + 15);
      ctx.lineTo(athenaX + 16, athenaY + 70);
      ctx.lineTo(athenaX - 16, athenaY + 70);
      ctx.fill();

      // Cabeça e Capacete Dourado de Atena
      ctx.fillStyle = '#fbbf24'; // Capacete real dourado
      ctx.beginPath();
      ctx.arc(athenaX, athenaY + 15, 6, Math.PI, 0);
      ctx.fillRect(athenaX - 4, athenaY + 8, 8, 6);
      ctx.fill();

      // Escudo Redondo Dourado de Atena (Escudo de Atena na Mão Esquerda)
      ctx.fillStyle = '#fbbf24'; // Escudo reluzente
      ctx.beginPath();
      ctx.ellipse(athenaX + 14, athenaY + 42, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b'; // Borda interna do escudo
      ctx.beginPath();
      ctx.ellipse(athenaX + 14, athenaY + 42, 7, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 🏛️ TEMPLO GREGO DE COLUNAS BRANCAS (Templo das 12 Casas - Y: h*0.35 a h*0.65)
      const templeY = h * 0.35;
      const templeH = h * 0.35;

      // Frontão Triangular do Templo Grego (Pediment)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(110, templeY + 22);
      ctx.lineTo(250, templeY - 6); // Pico central
      ctx.lineTo(390, templeY + 22);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1'; // Relevo interno do frontão
      ctx.beginPath();
      ctx.moveTo(130, templeY + 20);
      ctx.lineTo(250, templeY);
      ctx.lineTo(370, templeY + 20);
      ctx.fill();

      // Viga Superior e Teto do Templo
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(100, templeY + 22, 300, 10);

      // Colunas Gregas Brancas Flautadas (8 Colunas Alinhadas)
      ctx.fillStyle = '#f8fafc';
      for (let cx = 115; cx <= 375; cx += 37) {
        ctx.fillRect(cx, templeY + 32, 12, templeH - 32);
        ctx.fillStyle = '#cbd5e1'; // Sombra da calha da coluna
        ctx.fillRect(cx + 3, templeY + 32, 3, templeH - 32);
        ctx.fillStyle = '#f8fafc';
      }

      // Sombra do Interior do Templo atrás das Colunas
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(125, templeY + 32, 250, templeH - 32);

      // Re-desenhar colunas sobre a sombra interior para profundidade
      for (let cx = 115; cx <= 375; cx += 37) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx, templeY + 32, 12, templeH - 32);
      }

      // 🏛️ ESCADARIAS MONUMENTAIS DE PEDRA E PISO DO SANTUÁRIO
      const floorY = templeY + templeH;
      const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
      floorGrad.addColorStop(0, '#cbd5e1');
      floorGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorY, w, h - floorY);

      // Escadaria Central Subindo o Santuário (Conforme Imagem 1)
      const stairX = 200;
      const stairW = 100;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(stairX, floorY, stairW, h - floorY);

      // Degraus da Escadaria
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      for (let sy = floorY; sy < h; sy += 8) {
        ctx.beginPath();
        ctx.moveTo(stairX, sy);
        ctx.lineTo(stairX + stairW, sy);
        ctx.stroke();
      }

      // Muretas Laterais de Pedra da Escadaria
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(stairX - 8, floorY, 8, h - floorY);
      ctx.fillRect(stairX + stairW, floorY, 8, h - floorY);
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

  private static drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - w * 0.15, y, w * 0.3, h * 0.4);

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

  /** Sprite do Herói Guerreiro / Cavaleiro Templário (Armadura de Placas, Elmo Fechado, Espada de Aço, Escudo Cruzado e Capa Vermelha - Imagem 1) */
  public static getKnightSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_knight', size, size, (ctx) => {
      // Sombra projetada
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 1. Capa Real Vermelho Carmim (Drapada pelo ombro esquerdo estendendo até o chão)
      ctx.fillStyle = '#dc2626'; // Vermelho vivo
      ctx.beginPath();
      ctx.moveTo(size / 2 - 8, 12);
      ctx.lineTo(size / 2 - 20, size - 4);
      ctx.lineTo(size / 2 - 4, size - 4);
      ctx.lineTo(size / 2 + 4, 20);
      ctx.fill();
      ctx.fillStyle = '#b91c1c'; // Sombra no caimento da capa
      ctx.fillRect(size / 2 - 18, 22, 6, size - 26);

      // Broche Dourado da Capa no Colarinho
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(size / 2 - 6, 14, 3, 0, Math.PI * 2);
      ctx.fill();

      // 2. Cota de Malha (Saia de Malha sob o Cinto)
      ctx.fillStyle = '#475569';
      ctx.fillRect(size / 2 - 10, 24, 20, 10);
      ctx.fillStyle = '#334155'; // Textura de elos de malha
      for (let mx = size / 2 - 8; mx < size / 2 + 10; mx += 4) {
        ctx.fillRect(mx, 26, 2, 6);
      }

      // Cinto de Couro com Tiras e Bolsas
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 - 11, 23, 22, 4);
      ctx.fillStyle = '#fbbf24'; // Fivela
      ctx.fillRect(size / 2 - 3, 22, 6, 6);

      // 3. Armadura de Placas de Aço Polido (Peitoral, Grevas e Sabatons)
      ctx.fillStyle = '#94a3b8'; // Aço reflexivo
      ctx.fillRect(size / 2 - 10, 12, 20, 12);
      ctx.fillStyle = '#cbd5e1'; // Brilho central no peitoral
      ctx.fillRect(size / 2 - 5, 13, 10, 10);

      // Grevas e Botas de Aço
      ctx.fillStyle = '#64748b';
      ctx.fillRect(size / 2 - 9, 32, 6, 12);
      ctx.fillRect(size / 2 + 3, 32, 6, 12);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(size / 2 - 10, 41, 7, 4);
      ctx.fillRect(size / 2 + 3, 41, 7, 4);

      // 4. Elmo Templário Fechado (Great Helm com Viseira e Furos)
      ctx.fillStyle = '#64748b'; // Corpo do elmo
      ctx.fillRect(size / 2 - 8, 2, 16, 14);
      ctx.fillStyle = '#cbd5e1'; // Placa frontal reforçada
      ctx.fillRect(size / 2 - 6, 4, 12, 11);
      ctx.fillStyle = '#1e293b'; // Fenda da viseira escura
      ctx.fillRect(size / 2 - 6, 8, 12, 3);
      // Furos de ventilação no elmo
      ctx.fillStyle = '#334155';
      ctx.fillRect(size / 2 - 4, 12, 2, 2);
      ctx.fillRect(size / 2 - 1, 12, 2, 2);
      ctx.fillRect(size / 2 + 2, 12, 2, 2);

      // 5. Espada Longa de Aço Arming Sword na Mão Direita
      ctx.fillStyle = '#e2e8f0'; // Lâmina afiada prateada
      ctx.beginPath();
      ctx.moveTo(size / 2 + 12, 12);
      ctx.lineTo(size / 2 + 20, -6);
      ctx.lineTo(size / 2 + 23, -6);
      ctx.lineTo(size / 2 + 15, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff'; // Filo de corte brilhante
      ctx.fillRect(size / 2 + 16, 0, 2, 8);

      ctx.fillStyle = '#fbbf24'; // Guarda transversal dourada
      ctx.fillRect(size / 2 + 9, 10, 10, 3);
      ctx.fillStyle = '#451a03'; // Empunhadura
      ctx.fillRect(size / 2 + 13, 13, 3, 5);

      // 6. Escudo Cruzado (Heater Shield) na Mão Esquerda (Emblema de Cruz Vermelha)
      const shieldX = size / 2 - 20;
      const shieldY = 16;
      ctx.fillStyle = '#f8fafc'; // Fundo branco do escudo
      ctx.beginPath();
      ctx.moveTo(shieldX, shieldY);
      ctx.lineTo(shieldX + 16, shieldY);
      ctx.lineTo(shieldX + 16, shieldY + 16);
      ctx.lineTo(shieldX + 8, shieldY + 24);
      ctx.lineTo(shieldX, shieldY + 16);
      ctx.fill();

      // Cruz Heraldica Vermelha no Escudo
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(shieldX + 6, shieldY, 4, 22);
      ctx.fillRect(shieldX, shieldY + 7, 16, 4);

      // Borda Metálica de Proteção
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shieldX, shieldY);
      ctx.lineTo(shieldX + 16, shieldY);
      ctx.lineTo(shieldX + 16, shieldY + 16);
      ctx.lineTo(shieldX + 8, shieldY + 24);
      ctx.lineTo(shieldX, shieldY + 16);
      ctx.closePath();
      ctx.stroke();
    });
  }

  /** Sprite do Herói Mago / Arquimago Místico (Robe Azul, Manto e Chapéu Púrpura, Barba Branca e Cajado de Madeira Enrolado - Imagem 3) */
  public static getMageSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_mage', size, size, (ctx) => {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 1. Capa Púrpura Drapada nos Ombros (Conforme Imagem 3)
      ctx.fillStyle = '#7e22ce'; // Manto roxo vibrante
      ctx.beginPath();
      ctx.moveTo(size / 2, 10);
      ctx.lineTo(size / 2 + 18, size - 4);
      ctx.lineTo(size / 2 - 18, size - 4);
      ctx.fill();

      // 2. Robe Azul Real com Cinto Dourado
      ctx.fillStyle = '#1d4ed8'; // Robe azul místico
      ctx.beginPath();
      ctx.moveTo(size / 2, 12);
      ctx.lineTo(size / 2 + 13, size - 4);
      ctx.lineTo(size / 2 - 13, size - 4);
      ctx.fill();

      // Cinto de Couro com Fivela Dourada Robusta
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 - 11, 24, 22, 4);
      ctx.fillStyle = '#fbbf24'; // Fivela dourada retangular
      ctx.fillRect(size / 2 - 4, 22, 8, 8);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(size / 2 - 2, 24, 4, 4);

      // Sapatos Marrons sob a Barra do Robe
      ctx.fillStyle = '#451a03';
      ctx.fillRect(size / 2 - 8, size - 6, 6, 4);
      ctx.fillRect(size / 2 + 2, size - 6, 6, 4);

      // 3. Rosto de Arquimago e Barba Branca Flutuante
      ctx.fillStyle = '#fde047'; // Tom de pele
      ctx.fillRect(size / 2 - 5, 8, 10, 8);

      // Barba e Bigode Brancos Majestosos
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(size / 2, 16, 8, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(size / 2 - 7, 16);
      ctx.lineTo(size / 2, 26); // Ponta da barba
      ctx.lineTo(size / 2 + 7, 16);
      ctx.fill();

      // Bigode Curvado
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(size / 2 - 6, 14, 12, 3);

      // Olhos Expressivos
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(size / 2 - 4, 10, 2, 2);
      ctx.fillRect(size / 2 + 2, 10, 2, 2);

      // 4. Chapéu Pontudo de Bruxo Púrpura com Aba Larga e Ponta Dobrada
      ctx.fillStyle = '#7e22ce'; // Chapéu roxo
      ctx.beginPath();
      ctx.ellipse(size / 2, 8, 14, 4, 0, 0, Math.PI * 2); // Aba do chapéu
      ctx.fill();

      // Copa do Chapéu Curvada/Dobrada (Conforme Imagem 3)
      ctx.beginPath();
      ctx.moveTo(size / 2 - 10, 8);
      ctx.quadraticCurveTo(size / 2 - 8, -6, size / 2 + 4, -8); // Ponta dobrada
      ctx.lineTo(size / 2 + 10, 8);
      ctx.fill();

      // Faixa Dourada no Chapéu
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 - 8, 6, 16, 2);

      // 5. CAJADO DE ARQUIMAGO DE MADEIRA ENROLADA NA MÃO DIREITA (Imagem 3)
      ctx.fillStyle = '#78350f'; // Haste de madeira rústica
      ctx.fillRect(size / 2 - 16, -4, 4, 46);

      // Cabeça em Espiral/Looping do Cajado (Curvada no topo)
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(size / 2 - 14, -4, 6, 0, Math.PI * 1.8);
      ctx.stroke();
      // Brilho Mágico de Alta Energia no centro da espiral
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(size / 2 - 14, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(size / 2 - 15, -5, 2, 2);
    });
  }

  /** Sprite do Herói Arqueiro / Caçador Patrulheiro (Túnica Verde, Capuz, Braçadeiras, Arco Longo Puxado e Aljava - Imagem 2) */
  public static getArcherSprite(size = 48): HTMLCanvasElement {
    return this.getOffscreenCanvas('sprite_archer', size, size, (ctx) => {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, 13, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 1. Calças de Couro Marrom e Botas de Rastreador
      ctx.fillStyle = '#451a03'; // Calça de couro
      ctx.fillRect(size / 2 - 7, 28, 5, 14);
      ctx.fillRect(size / 2 + 2, 28, 5, 14);
      ctx.fillStyle = '#78350f'; // Botas ajustadas
      ctx.fillRect(size / 2 - 8, 38, 6, 6);
      ctx.fillRect(size / 2 + 2, 38, 6, 6);

      // 2. Túnica Verde Patrulheiro com Barrado Bordado Dourado
      ctx.fillStyle = '#15803d'; // Túnica verde
      ctx.fillRect(size / 2 - 10, 14, 20, 16);
      ctx.fillStyle = '#fbbf24'; // Barrado/borda bordada dourada
      ctx.fillRect(size / 2 - 10, 28, 20, 2);
      ctx.fillRect(size / 2 - 4, 14, 8, 2); // Colarinho

      // Braçadeiras de Couro (Vambraces) nos Braços
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 - 14, 16, 5, 10);
      ctx.fillRect(size / 2 + 9, 16, 5, 10);

      // Cinto de Couro com Tiras Cruzadas
      ctx.fillStyle = '#451a03';
      ctx.fillRect(size / 2 - 10, 23, 20, 3);
      ctx.fillStyle = '#fbbf24'; // Fivela de bronze
      ctx.fillRect(size / 2 - 3, 22, 5, 5);

      // 3. Aljava de Couro com Flechas nas Costas
      ctx.fillStyle = '#92400e'; // Aljava
      ctx.fillRect(size / 2 - 14, 8, 6, 18);
      ctx.fillStyle = '#fef3c7'; // Penas brancas/bege das flechas
      ctx.fillRect(size / 2 - 15, 2, 2, 6);
      ctx.fillRect(size / 2 - 12, 0, 2, 8);
      ctx.fillRect(size / 2 - 9, 3, 2, 5);

      // 4. Cabeça e Capuz Verde de Caçador com Gola Caída (Robin Hood)
      ctx.fillStyle = '#166534'; // Capuz verde escuro
      ctx.beginPath();
      ctx.arc(size / 2, 10, 8, Math.PI * 0.8, Math.PI * 2.2);
      ctx.lineTo(size / 2 + 10, 16);
      ctx.lineTo(size / 2 - 10, 16);
      ctx.fill();

      // Gola Caída sobre os Ombros
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 9, 14);
      ctx.quadraticCurveTo(size / 2, 18, size / 2 + 9, 14);
      ctx.lineTo(size / 2 + 7, 10);
      ctx.lineTo(size / 2 - 7, 10);
      ctx.fill();

      // Rosto do Arqueiro Focado em Disparo
      ctx.fillStyle = '#fde047';
      ctx.fillRect(size / 2 - 4, 8, 8, 6);
      ctx.fillStyle = '#0f172a'; // Olho compenetrado no alvo
      ctx.fillRect(size / 2, 9, 3, 2);

      // 5. ARCO LONGO DE MADEIRA CURVADO E FLECHA PRONTA PARA DISPARO (Imagem 2)
      ctx.strokeStyle = '#92400e'; // Arco longo de madeira flexível
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2 + 8, 18, 16, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      // Corda de Arco Esticada
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size / 2 + 12, 2);
      ctx.lineTo(size / 2 - 4, 18); // Mão puxando a corda
      ctx.lineTo(size / 2 + 12, 34);
      ctx.stroke();

      // Flecha metálica pronta para disparar
      ctx.fillStyle = '#78350f'; // Haste de madeira da flecha
      ctx.fillRect(size / 2 - 6, 17, 26, 2);
      ctx.fillStyle = '#cbd5e1'; // Ponta de metal prateada
      ctx.beginPath();
      ctx.moveTo(size / 2 + 20, 18);
      ctx.lineTo(size / 2 + 26, 15);
      ctx.lineTo(size / 2 + 26, 21);
      ctx.fill();
    });
  }

  /** Retorna a textura de Herói com base na vocação */
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

  /** Retorna a textura de Monstro baseada na `visual_key` com tamanho dinâmico (48px ou 64px para bosses) */
  public static getMonsterTexture(visualKeyOrName = '', size = 48): HTMLCanvasElement {
    const key = visualKeyOrName.toLowerCase().trim();
    const cacheKey = `mob_${key}_${size}`;

    return this.getOffscreenCanvas(cacheKey, size, size, (ctx) => {
      this.drawMonsterByVisualKey(ctx, key, size);
    });
  }

  private static drawMonsterByVisualKey(ctx: CanvasRenderingContext2D, key: string, size: number) {
    const shadow = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size - 4, size * 0.3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    switch (key) {
      // ─── TIER 1: Floresta dos Aprendizes ───
      case 'forest_goblin':
      case 'goblin':
        shadow();
        ctx.fillStyle = '#15803d';
        ctx.fillRect(size / 2 - 8, 16, 16, 18);
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
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(size / 2, 15, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(size / 2 - 5, 13, 3, 3);
        ctx.fillRect(size / 2 + 2, 13, 3, 3);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(size / 2 - 12, 20, 3, 10);
        break;

      case 'forest_wolf':
      case 'lobo':
        shadow();
        ctx.fillStyle = '#475569';
        ctx.fillRect(size / 2 - 14, 18, 28, 14);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(size / 2 - 14, 20, 8, 10);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(size / 2 - 16, 12, 12, 12);
        ctx.fillRect(size / 2 - 20, 16, 6, 6);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(size / 2 - 13, 14, 3, 3);
        break;

      case 'forest_spider':
      case 'aranha':
        shadow();
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 2.5;
        [-14, -10, -4, 4, 10, 14].forEach((lx) => {
          ctx.beginPath();
          ctx.moveTo(size / 2, size / 2);
          ctx.lineTo(size / 2 + lx * 1.3, size / 2 - 8);
          ctx.lineTo(size / 2 + lx * 1.6, size / 2 + 10);
          ctx.stroke();
        });
        ctx.fillStyle = '#3b0764';
        ctx.beginPath();
        ctx.arc(size / 2 + 6, size / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(size / 2 - 6, size / 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(size / 2 - 10, size / 2 - 3, 2, 2);
        ctx.fillRect(size / 2 - 10, size / 2 + 1, 2, 2);
        break;

      case 'forest_boss_bear':
        shadow();
        ctx.fillStyle = '#451a03';
        ctx.fillRect(size / 2 - 20, 14, 40, 36);
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(size / 2, 16, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(size / 2 - 8, 12, 4, 4);
        ctx.fillRect(size / 2 + 4, 12, 4, 4);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(size / 2 - 10, 8);
        ctx.lineTo(size / 2 - 4, 22);
        ctx.stroke();
        break;

      // ─── TIER 1: Vila do Shereque ───
      case 'shereque_ogre':
      case 'ogre':
        shadow();
        // Túnica Bege e Colete de Couro Marrom sobre Corpo Verde
        ctx.fillStyle = '#15803d'; // Pele verde de ogro
        ctx.fillRect(size / 2 - 16, 16, 32, 24);
        ctx.fillStyle = '#fef3c7'; // Camisa beige/branca
        ctx.fillRect(size / 2 - 12, 18, 24, 20);
        ctx.fillStyle = '#78350f'; // Colete de couro marrom
        ctx.fillRect(size / 2 - 14, 18, 8, 20);
        ctx.fillRect(size / 2 + 6, 18, 8, 20);
        // Cinto com fivela
        ctx.fillStyle = '#451a03';
        ctx.fillRect(size / 2 - 14, 34, 28, 4);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(size / 2 - 4, 33, 8, 6);

        // Cabeça de Ogro Carismático
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(size / 2, 13, 11, 0, Math.PI * 2);
        ctx.fill();

        // Orelhas de Ogro em Formato de Funil/Trompete
        ctx.fillStyle = '#15803d';
        ctx.fillRect(size / 2 - 16, 8, 6, 4);
        ctx.fillRect(size / 2 - 18, 6, 4, 6);
        ctx.fillRect(size / 2 + 10, 8, 6, 4);
        ctx.fillRect(size / 2 + 14, 6, 4, 6);

        // Sorriso Amigável com Dentes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 5, 17, 10, 3);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(size / 2 - 2, 17, 4, 1);
        break;

      case 'shereque_donkey':
      case 'burro':
        shadow();
        // 1. 4 Patas no Chão com Cascos Escuros (Completamente assentadas)
        ctx.fillStyle = '#475569'; // Pernas traseiras
        ctx.fillRect(size / 2 - 12, 24, 5, 18);
        ctx.fillRect(size / 2 + 6, 24, 5, 18);
        ctx.fillStyle = '#64748b'; // Pernas dianteiras
        ctx.fillRect(size / 2 - 15, 24, 5, 18);
        ctx.fillRect(size / 2 + 2, 24, 5, 18);
        ctx.fillStyle = '#1e293b'; // Cascos escuros nas patas
        ctx.fillRect(size / 2 - 15, 38, 5, 4);
        ctx.fillRect(size / 2 - 12, 38, 5, 4);
        ctx.fillRect(size / 2 + 2, 38, 5, 4);
        ctx.fillRect(size / 2 + 6, 38, 5, 4);

        // 2. Corpo do Burro Cinza
        ctx.fillStyle = '#64748b';
        ctx.fillRect(size / 2 - 16, 16, 26, 14);
        ctx.fillStyle = '#94a3b8'; // Brilho no lombo
        ctx.fillRect(size / 2 - 14, 16, 20, 4);
        ctx.fillStyle = '#cbd5e1'; // Barriga cinza claro
        ctx.fillRect(size / 2 - 12, 26, 18, 4);

        // 3. Rabo Curvado com Tufo Negro na Ponta
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(size / 2 + 10, 18);
        ctx.quadraticCurveTo(size / 2 + 18, 14, size / 2 + 16, 24);
        ctx.stroke();
        ctx.fillStyle = '#0f172a'; // Tufo de pelo no rabo
        ctx.beginPath();
        ctx.arc(size / 2 + 16, 25, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Pescoço com Crina Negra ao Longo da Espinha
        ctx.fillStyle = '#64748b';
        ctx.fillRect(size / 2 - 18, 8, 10, 12);
        ctx.fillStyle = '#0f172a'; // Crina negra
        ctx.fillRect(size / 2 - 12, 4, 4, 14);

        // 5. Cabeça de Burro e Focinho Claro
        ctx.fillStyle = '#64748b';
        ctx.fillRect(size / 2 - 22, 6, 12, 10);
        ctx.fillStyle = '#f8fafc'; // Focinho branco/claro
        ctx.fillRect(size / 2 - 25, 10, 8, 8);
        ctx.fillStyle = '#0f172a'; // Narina
        ctx.fillRect(size / 2 - 24, 12, 2, 2);

        // 6. Olhos Expressivos com Pupila
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 19, 8, 5, 4);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 - 18, 9, 2, 2);

        // 7. Sorriso Dentado do Burro Falante
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 24, 15, 6, 2);

        // 8. Orelhas Longas de Burro
        ctx.fillStyle = '#64748b';
        ctx.fillRect(size / 2 - 20, -4, 4, 11);
        ctx.fillRect(size / 2 - 15, -6, 4, 12);
        ctx.fillStyle = '#cbd5e1'; // Interior da orelha
        ctx.fillRect(size / 2 - 19, -2, 2, 8);
        ctx.fillRect(size / 2 - 14, -4, 2, 9);
        break;

      case 'shereque_boss_fiona':
        shadow();
        // Princesa Fiona Ogressa com Vestido Verde Nobre (64px Boss)
        // 1. Vestido Verde Esmeralda Longo com Painel Central Claro
        ctx.fillStyle = '#047857'; // Verde esmeralda principal do vestido
        ctx.beginPath();
        ctx.moveTo(size / 2 - 8, 16);
        ctx.lineTo(size / 2 + 8, 16);
        ctx.lineTo(size / 2 + 20, size - 6);
        ctx.lineTo(size / 2 - 20, size - 6);
        ctx.fill();

        ctx.fillStyle = '#a7f3d0'; // Painel frontal claro do vestido
        ctx.beginPath();
        ctx.moveTo(size / 2 - 4, 20);
        ctx.lineTo(size / 2 + 4, 20);
        ctx.lineTo(size / 2 + 8, size - 6);
        ctx.lineTo(size / 2 - 8, size - 6);
        ctx.fill();

        // Guarnições e Borda Dourada no Vestido
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(size / 2 - 9, 20, 18, 3);
        ctx.fillRect(size / 2 - 10, 32, 20, 2);

        // 2. Colar com Pingente de Coração Esmeralda
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(size / 2 - 5, 17, 10, 2);
        ctx.fillStyle = '#059669'; // Joia esmeralda
        ctx.fillRect(size / 2 - 2, 19, 4, 3);

        // 3. Cabeça de Ogressa Verde com Expressão Marcante
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(size / 2, 11, 10, 0, Math.PI * 2);
        ctx.fill();

        // Orelhas de Ogressa (Formato de trompete verde)
        ctx.fillStyle = '#166534';
        ctx.fillRect(size / 2 - 14, 8, 5, 3);
        ctx.fillRect(size / 2 + 9, 8, 5, 3);

        // Olhos Verdes e Maquiagem
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 6, 10, 3, 3);
        ctx.fillRect(size / 2 + 3, 10, 3, 3);
        ctx.fillStyle = '#047857';
        ctx.fillRect(size / 2 - 5, 11, 2, 2);
        ctx.fillRect(size / 2 + 4, 11, 2, 2);

        // 4. Cabelo Ruivo Trançado e com Franja (Conforme Imagem 2)
        ctx.fillStyle = '#ea580c'; // Ruivo fogo vibrante
        ctx.beginPath();
        ctx.arc(size / 2, 8, 11, Math.PI, 0); // Topo do cabelo
        ctx.fill();
        // Franja dividida ao meio
        ctx.fillRect(size / 2 - 10, 4, 8, 8);
        ctx.fillRect(size / 2 + 2, 4, 8, 8);
        // Trança ruiva longa caindo nas costas/ombros
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(size / 2 - 14, 10, 5, 16);
        ctx.fillRect(size / 2 + 9, 10, 5, 16);
        break;

      // ─── TIER 1: Vila do Chapolin ───
      case 'chapolin_tripa':
      case 'tripa':
        shadow();
        // Tripa Seca (Ramón Valdés de Terno Amarelo, Gravata e Chapéu - Imagem 1)
        // 1. Corpo Alto e Magro com Paletó Amarelo
        ctx.fillStyle = '#fef08a'; // Terno amarelo pálido/ocre
        ctx.fillRect(size / 2 - 8, 14, 16, 26);
        ctx.fillStyle = '#78350f'; // Camisa marrom por baixo
        ctx.fillRect(size / 2 - 4, 16, 8, 16);

        // 2. Gravata Larga Listrada Branca/Cinza
        ctx.fillStyle = '#f8fafc'; // Gravata branca
        ctx.beginPath();
        ctx.moveTo(size / 2 - 3, 18);
        ctx.lineTo(size / 2 + 3, 18);
        ctx.lineTo(size / 2 + 4, 30);
        ctx.lineTo(size / 2 - 4, 30);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1'; // Listras na gravata
        ctx.fillRect(size / 2 - 3, 22, 6, 2);
        ctx.fillRect(size / 2 - 3, 26, 6, 2);

        // 3. Calça Bege e Sapatos Marrons
        ctx.fillStyle = '#d97706'; // Calça
        ctx.fillRect(size / 2 - 6, 32, 5, 12);
        ctx.fillRect(size / 2 + 1, 32, 5, 12);
        ctx.fillStyle = '#451a03'; // Sapatos
        ctx.fillRect(size / 2 - 7, 42, 6, 4);
        ctx.fillRect(size / 2 + 1, 42, 6, 4);

        // 4. Cabeça Magra de Tripa Seca com Bigode Marcante
        ctx.fillStyle = '#fde047'; // Tom de pele
        ctx.fillRect(size / 2 - 5, 6, 10, 10);
        ctx.fillStyle = '#292524'; // Bigode escuro marcante (Seu Madruga)
        ctx.fillRect(size / 2 - 5, 12, 10, 3);
        ctx.fillStyle = '#0f172a'; // Olhos expressivos
        ctx.fillRect(size / 2 - 4, 8, 2, 2);
        ctx.fillRect(size / 2 + 2, 8, 2, 2);

        // 5. Chapéu de Feltro Verde Escuro com Aba (Fedora)
        ctx.fillStyle = '#14532d'; // Chapéu verde escuro
        ctx.fillRect(size / 2 - 9, 4, 18, 4); // Aba do chapéu
        ctx.fillRect(size / 2 - 6, 0, 12, 5); // Copa do chapéu
        ctx.fillStyle = '#0f172a'; // Faixa preta no chapéu
        ctx.fillRect(size / 2 - 6, 4, 12, 1);
        break;

      case 'chapolin_pirate':
      case 'pirata':
        shadow();
        // Pirata Alma Negra (Ramón Valdés Pirata com Tapa-Olho e Chapéu com Caveira - Imagem 2)
        // 1. Calça Bege e Botas de Couro
        ctx.fillStyle = '#fef3c7'; // Calça bege ampla
        ctx.fillRect(size / 2 - 9, 28, 7, 14);
        ctx.fillRect(size / 2 + 2, 28, 7, 14);
        ctx.fillStyle = '#451a03'; // Botas
        ctx.fillRect(size / 2 - 10, 38, 8, 6);
        ctx.fillRect(size / 2 + 2, 38, 8, 6);

        // 2. Camisa Marrom Cetim com Gola V
        ctx.fillStyle = '#78350f';
        ctx.fillRect(size / 2 - 10, 14, 20, 16);
        ctx.fillStyle = '#fde047'; // Peito exposto no decote
        ctx.beginPath();
        ctx.moveTo(size / 2 - 4, 14);
        ctx.lineTo(size / 2 + 4, 14);
        ctx.lineTo(size / 2, 22);
        ctx.fill();

        // 3. Faixa/Cinto Verde Esmeralda Amarrado na Cintura
        ctx.fillStyle = '#059669'; // Faixa verde
        ctx.fillRect(size / 2 - 11, 26, 22, 5);
        ctx.fillRect(size / 2 - 13, 28, 6, 12); // Ponta pendurada do cinto

        // 4. Cabeça com Bigode Grisalho e Tapa-Olho
        ctx.fillStyle = '#d97706';
        ctx.fillRect(size / 2 - 6, 6, 12, 10);
        ctx.fillStyle = '#334155'; // Bigode e cavanhaque grisalho
        ctx.fillRect(size / 2 - 5, 12, 10, 4);

        // Tapa-olho Preto no olho esquerdo
        ctx.fillStyle = '#000000';
        ctx.fillRect(size / 2 - 4, 7, 4, 4);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size / 2 - 6, 6);
        ctx.lineTo(size / 2 + 6, 12);
        ctx.stroke();

        // Olho direito visível
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 + 2, 8, 3, 2);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 + 3, 8, 1, 2);

        // 5. Chapéu Tricórnio Pirata com Caveira Branca e Ossos
        ctx.fillStyle = '#0f172a'; // Chapéu pirata preto
        ctx.beginPath();
        ctx.moveTo(size / 2 - 16, 6);
        ctx.lineTo(size / 2, -2);
        ctx.lineTo(size / 2 + 16, 6);
        ctx.lineTo(size / 2, 4);
        ctx.fill();

        // Caveira com ossos em branco no chapéu
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(size / 2, 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(size / 2 - 3, 2, 6, 1); // Ossos cruzados
        break;

      case 'chapolin_bandit':
        shadow();
        // Bandido dos Ermos (Sideshow Bob com Cabelo de Palmeira Vermelho e Faca na Calça - Imagem 4)
        // 1. Calça Jeans Azul e Sapatos Vermelhos Longos
        ctx.fillStyle = '#1d4ed8'; // Jeans azul
        ctx.fillRect(size / 2 - 6, 26, 5, 14);
        ctx.fillRect(size / 2 + 1, 26, 5, 14);
        ctx.fillStyle = '#dc2626'; // Sapatos compridos de palhaço vermelhos
        ctx.fillRect(size / 2 - 12, 38, 11, 4);
        ctx.fillRect(size / 2 + 1, 38, 11, 4);

        // Faca de Açougueiro no Bolso Traseiro
        ctx.fillStyle = '#cbd5e1'; // Lâmina de metal prateada
        ctx.beginPath();
        ctx.moveTo(size / 2 + 5, 24);
        ctx.lineTo(size / 2 + 12, 32);
        ctx.lineTo(size / 2 + 5, 32);
        ctx.fill();
        ctx.fillStyle = '#78350f'; // Cabo de madeira da faca
        ctx.fillRect(size / 2 + 5, 18, 3, 6);

        // 2. Camisa Polo Verde com Barriga Saliente
        ctx.fillStyle = '#15803d'; // Verde polo
        ctx.beginPath();
        ctx.arc(size / 2 - 1, 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(size / 2 - 8, 14, 16, 14);

        // 3. Cabeça Amarela Longa e Olhos Sarcásticos
        ctx.fillStyle = '#facc15'; // Pele amarela Simpsons
        ctx.fillRect(size / 2 - 5, 6, 10, 10);
        ctx.fillStyle = '#ffffff'; // Olhos
        ctx.fillRect(size / 2 - 4, 8, 4, 3);
        ctx.fillRect(size / 2 + 1, 8, 4, 3);
        ctx.fillStyle = '#0f172a'; // Pálpebras meio fechadas
        ctx.fillRect(size / 2 - 4, 8, 4, 1);
        ctx.fillRect(size / 2 + 1, 8, 4, 1);
        ctx.fillRect(size / 2 - 2, 9, 2, 2);
        ctx.fillRect(size / 2 + 2, 9, 2, 2);

        // 4. CABELEIRA ESPECTACULAR VERMELHA EM FORMATO DE PALMEIRA (Sideshow Bob)
        ctx.fillStyle = '#dc2626'; // Vermelho vivo
        const hairSpikes = [-12, -8, -4, 0, 4, 8, 12];
        hairSpikes.forEach((hx) => {
          ctx.beginPath();
          ctx.moveTo(size / 2 + hx * 0.4, 6);
          ctx.lineTo(size / 2 + hx * 1.2, -8);
          ctx.lineTo(size / 2 + hx * 0.8, 6);
          ctx.fill();
        });
        ctx.beginPath();
        ctx.arc(size / 2, 3, 9, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'chapolin_boss_alma':
        shadow();
        // Pirata Alma Negra de Greiscu / Esqueleto de Greiscu (Skeletor do He-Man 64px Boss - Imagem 3)
        // 1. Corpo Musculoso Azul/Púrpura com Sunga e Botas Roxas
        ctx.fillStyle = '#4338ca'; // Corpo muscular azul indigo
        ctx.fillRect(size / 2 - 14, 14, 28, 30);
        ctx.fillStyle = '#7e22ce'; // Sunga roxa
        ctx.fillRect(size / 2 - 12, 36, 24, 8);
        ctx.fillRect(size / 2 - 10, 44, 8, 14); // Botas roxas nas pernas
        ctx.fillRect(size / 2 + 2, 44, 8, 14);

        // 2. Arnês de Peito Roxo com Alças Cruzadas
        ctx.fillStyle = '#6b21a8';
        ctx.beginPath();
        ctx.moveTo(size / 2 - 14, 16);
        ctx.lineTo(size / 2 + 14, 30);
        ctx.lineTo(size / 2 + 10, 32);
        ctx.lineTo(size / 2 - 14, 18);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 2 + 14, 16);
        ctx.lineTo(size / 2 - 14, 30);
        ctx.lineTo(size / 2 - 10, 32);
        ctx.lineTo(size / 2 + 14, 18);
        ctx.fill();

        // 3. Cabeça de CRÂNIO AMARELO MÍSTICO (Skeletor)
        ctx.fillStyle = '#fde047'; // Crânio amarelo reluzente
        ctx.beginPath();
        ctx.arc(size / 2, 12, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a'; // Cavidades oculares e nasais pretas
        ctx.fillRect(size / 2 - 6, 10, 4, 4);
        ctx.fillRect(size / 2 + 2, 10, 4, 4);
        ctx.fillRect(size / 2 - 1, 14, 3, 3);
        ctx.fillStyle = '#fde047'; // Dentes amarelos na mandíbula
        ctx.fillRect(size / 2 - 4, 17, 9, 3);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 - 2, 17, 1, 3);
        ctx.fillRect(size / 2 + 1, 17, 1, 3);

        // Capuz Roxo Envolvendo o Crânio
        ctx.fillStyle = '#7e22ce';
        ctx.beginPath();
        ctx.arc(size / 2, 10, 12, Math.PI * 0.8, Math.PI * 2.2);
        ctx.lineTo(size / 2 + 14, 20);
        ctx.lineTo(size / 2 - 14, 20);
        ctx.fill();

        // 4. HAVOC STAFF (Cajado com Crânio de Carneiro e Chifres na mão direita)
        ctx.fillStyle = '#6b21a8'; // Haste do cajado roxa
        ctx.fillRect(size / 2 + 16, 4, 4, 48);

        // Crânio de Carneiro com Chifres Curvados no Topo do Cajado
        ctx.fillStyle = '#f8fafc'; // Crânio de carneiro prateado/branco
        ctx.beginPath();
        ctx.arc(size / 2 + 18, 4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 + 15, 3, 2, 2);
        ctx.fillRect(size / 2 + 19, 3, 2, 2);

        // Chifres de Carneiro Enrolados no Cajado
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(size / 2 + 11, 2, 6, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(size / 2 + 25, 2, 6, -Math.PI * 0.5, Math.PI);
        ctx.stroke();
        break;

      // ─── TIER 2: Castelo de Greiscu ───
      case 'orcruins_orc':
      case 'orc':
        shadow();
        // Orc Guerreiro Musculoso com Ombreira de Espinhos e Corrente (Imagem 4)
        // 1. Pernas Musculosas com Protetores e Botas com Espinhos
        ctx.fillStyle = '#15803d'; // Pele verde orc musculosa
        ctx.fillRect(size / 2 - 12, 28, 9, 14);
        ctx.fillRect(size / 2 + 3, 28, 9, 14);
        ctx.fillStyle = '#78350f'; // Saiote de couro e tiras
        ctx.fillRect(size / 2 - 10, 26, 20, 8);
        ctx.fillStyle = '#b91c1c'; // Tiras de pano vermelho penduradas
        ctx.fillRect(size / 2 - 6, 28, 4, 10);
        ctx.fillRect(size / 2 + 2, 28, 4, 10);
        ctx.fillStyle = '#451a03'; // Botas pesadas
        ctx.fillRect(size / 2 - 13, 38, 10, 6);
        ctx.fillRect(size / 2 + 3, 38, 10, 6);

        // 2. Tronco Verde Musculoso com Arnês de Corrente
        ctx.fillStyle = '#15803d';
        ctx.fillRect(size / 2 - 14, 14, 28, 16);
        ctx.fillStyle = '#cbd5e1'; // Corrente prateada cruzando o peito
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(size / 2 - 12, 14);
        ctx.lineTo(size / 2 + 12, 26);
        ctx.stroke();

        // 3. Ombreira de Metal Vermelho com Grandes Espinhos de Marfim (Ombro direito)
        ctx.fillStyle = '#b91c1c'; // Placa metálica vermelha
        ctx.fillRect(size / 2 - 18, 10, 10, 10);
        ctx.fillStyle = '#cbd5e1'; // Espinhos de marfim/metal na ombreira
        ctx.beginPath();
        ctx.moveTo(size / 2 - 18, 10);
        ctx.lineTo(size / 2 - 24, 2);
        ctx.lineTo(size / 2 - 14, 12);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 2 - 14, 10);
        ctx.lineTo(size / 2 - 18, -2);
        ctx.lineTo(size / 2 - 10, 12);
        ctx.fill();

        // 4. Cabeça de Orc com Cabelo em Rabo de Cavalo e Presas
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(size / 2, 11, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1c1917'; // Barba trançada e rabo de cavalo
        ctx.fillRect(size / 2 - 4, 16, 8, 5);
        ctx.fillRect(size / 2 + 2, 1, 4, 8); // Rabo de cavalo alto
        ctx.fillStyle = '#fef9c3'; // Presas inferiores salientes de marfim
        ctx.fillRect(size / 2 - 5, 14, 2, 4);
        ctx.fillRect(size / 2 + 3, 14, 2, 4);
        break;

      case 'orcruins_orc_mage':
        shadow();
        // Orc Mago / Shaman com Túnica Púrpura, Grimório e Cajado de Chama (Imagem 3)
        // 1. Manto Púrpura Escuro com Capuz Solto
        ctx.fillStyle = '#3b0764'; // Manto místico
        ctx.beginPath();
        ctx.moveTo(size / 2, 10);
        ctx.lineTo(size / 2 + 14, size - 4);
        ctx.lineTo(size / 2 - 14, size - 4);
        ctx.fill();

        ctx.fillStyle = '#581c87'; // Dobras do manto
        ctx.fillRect(size / 2 - 12, 18, 24, 20);
        ctx.fillStyle = '#78350f'; // Tiras de couro cruzadas com moedas
        ctx.fillRect(size / 2 - 10, 20, 20, 4);
        ctx.fillStyle = '#fbbf24'; // Medalhões dourados
        ctx.fillRect(size / 2 - 6, 20, 3, 3);
        ctx.fillRect(size / 2 + 3, 20, 3, 3);

        // 2. Cabeça de Orc Púrpura com Barba Escura
        ctx.fillStyle = '#581c87'; // Pele orc púrpura
        ctx.beginPath();
        ctx.arc(size / 2, 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1c1917'; // Barba cheia
        ctx.fillRect(size / 2 - 5, 15, 10, 6);
        ctx.fillStyle = '#fef9c3'; // Presas
        ctx.fillRect(size / 2 - 4, 15, 2, 3);
        ctx.fillRect(size / 2 + 2, 15, 2, 3);

        // 3. Grimório Aberto na Mão Esquerda (Livro de Magia)
        ctx.fillStyle = '#78350f'; // Capa de couro do livro
        ctx.fillRect(size / 2 - 18, 20, 10, 12);
        ctx.fillStyle = '#fef3c7'; // Páginas abertas amareladas
        ctx.fillRect(size / 2 - 17, 21, 8, 10);
        ctx.fillStyle = '#a855f7'; // Rúnico desenhado nas páginas
        ctx.fillRect(size / 2 - 15, 23, 4, 2);
        ctx.fillRect(size / 2 - 15, 27, 4, 2);

        // 4. Cajado Mágico com CHAMA PÚRPURA BRILHANTE na Mão Direita
        ctx.fillStyle = '#451a03'; // Cajado de madeira rústica
        ctx.fillRect(size / 2 + 12, 4, 3, 36);

        // Chama Púrpura Reluzente no Topo
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(size / 2 + 13.5, 4, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e879f9'; // Núcleo brilhante rosa/púrpura
        ctx.beginPath();
        ctx.arc(size / 2 + 13.5, 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 + 12, 3, 2, 2);
        break;

      case 'orcruins_skeleton':
      case 'esqueleto':
        shadow();
        // Esqueleto Guardião / Mago Esqueleto de Túnica Azul e Orbe Mágico Flutuante (Imagem 2)
        // 1. Túnica Azul Real com Capuz e Painel Central Cinza
        ctx.fillStyle = '#1d4ed8'; // Túnica azul vibrante
        ctx.beginPath();
        ctx.moveTo(size / 2, 8);
        ctx.lineTo(size / 2 + 15, size - 4);
        ctx.lineTo(size / 2 - 15, size - 4);
        ctx.fill();

        ctx.fillStyle = '#475569'; // Trim/painel central cinza
        ctx.fillRect(size / 2 - 3, 16, 6, size - 20);

        // Cinto de Couro com Botões e Medallão Cyan
        ctx.fillStyle = '#78350f';
        ctx.fillRect(size / 2 - 12, 28, 24, 4);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(size / 2 - 4, 27, 8, 6);
        ctx.fillStyle = '#38bdf8'; // Gema azul mística no cinto
        ctx.fillRect(size / 2 - 2, 29, 4, 2);

        // 2. Capuz Azul Envolvendo o Crânio com Sombra Interna
        ctx.fillStyle = '#1e40af'; // Capuz azul escuro
        ctx.beginPath();
        ctx.arc(size / 2, 10, 11, Math.PI * 0.75, Math.PI * 2.25);
        ctx.lineTo(size / 2 + 13, 20);
        ctx.lineTo(size / 2 - 13, 20);
        ctx.fill();

        // Interior do Capuz Escuro
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(size / 2, 11, 9, 0, Math.PI * 2);
        ctx.fill();

        // 3. Crânio Branco com Olhos Dourados Reluzentes
        ctx.fillStyle = '#f8fafc'; // Crânio branco limpo
        ctx.beginPath();
        ctx.arc(size / 2, 11, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Olhos Dourados/Âmbar Brilhantes (Conforme Imagem 2)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(size / 2 - 5, 9, 3, 3);
        ctx.fillRect(size / 2 + 2, 9, 3, 3);
        ctx.fillStyle = '#fde047'; // Centro reluzente
        ctx.fillRect(size / 2 - 4, 10, 1, 1);
        ctx.fillRect(size / 2 + 3, 10, 1, 1);

        // Nariz e Sorriso
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 - 1, 12, 2, 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(size / 2 - 4, 15, 8, 1);

        // 4. ORBE MÁGICO CIANO/AZUL FLUTUANTE NA MÃO DIREITA (Imagem 2)
        // Mão segurando o ar arcano
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(size / 2 - 16, 20, 4, 3);

        // Orbe Flutuante de Energia Ciano com Brilho
        ctx.fillStyle = '#06b6d4'; // Ciano vibrante
        ctx.beginPath();
        ctx.arc(size / 2 - 16, 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a5f3fc'; // Núcleo reluzente de alta energia
        ctx.beginPath();
        ctx.arc(size / 2 - 16, 12, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 18, 10, 2, 2);
        break;

      case 'orcruins_orc_archer':
        shadow();
        // Orc Arqueiro em Posição de Disparo com Aljava e Ombreira (Imagem 1)
        // 1. Pernas Musculosas com Saiote Vermelho e Botas com Pele
        ctx.fillStyle = '#15803d'; // Pele verde de orc
        ctx.fillRect(size / 2 - 10, 28, 7, 14);
        ctx.fillRect(size / 2 + 3, 28, 7, 14);
        ctx.fillStyle = '#dc2626'; // Pano vermelho pendurado na frente
        ctx.fillRect(size / 2 - 4, 26, 8, 12);
        ctx.fillStyle = '#fef3c7'; // Orla de pele bege nos punhos e botas
        ctx.fillRect(size / 2 - 11, 38, 8, 3);
        ctx.fillRect(size / 2 + 3, 38, 8, 3);
        ctx.fillStyle = '#451a03'; // Botas marrons
        ctx.fillRect(size / 2 - 11, 41, 8, 4);
        ctx.fillRect(size / 2 + 3, 41, 8, 4);

        // 2. Tronco em Posição de Arco Puxado
        ctx.fillStyle = '#15803d';
        ctx.fillRect(size / 2 - 12, 14, 24, 14);
        ctx.fillStyle = '#78350f'; // Cinto de couro cruzado
        ctx.fillRect(size / 2 - 10, 24, 20, 4);

        // 3. Aljava cheia de Flechas nas Costas
        ctx.fillStyle = '#92400e'; // Aljava de couro
        ctx.fillRect(size / 2 + 8, 6, 6, 18);
        ctx.fillStyle = '#fef3c7'; // Penas de flecha amarelas/brancas
        ctx.fillRect(size / 2 + 7, 1, 2, 6);
        ctx.fillRect(size / 2 + 10, -1, 2, 8);
        ctx.fillRect(size / 2 + 13, 2, 2, 5);

        // 4. Ombreira de Metal Cinza com Espinhos Grandes de Marfim (Ombro esquerdo)
        ctx.fillStyle = '#475569';
        ctx.fillRect(size / 2 - 15, 10, 8, 8);
        ctx.fillStyle = '#fef3c7'; // Espinhos de marfim na ombreira
        ctx.beginPath();
        ctx.moveTo(size / 2 - 15, 10);
        ctx.lineTo(size / 2 - 20, 3);
        ctx.lineTo(size / 2 - 11, 11);
        ctx.fill();

        // 5. Cabeça de Orc com Rabo de Cavalo e Presas Expostas
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(size / 2, 11, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1c1917'; // Rabo de cavalo alto
        ctx.fillRect(size / 2 + 1, 2, 4, 7);
        ctx.fillStyle = '#fef9c3'; // Presas sobressalentes
        ctx.fillRect(size / 2 - 4, 13, 2, 3);
        ctx.fillRect(size / 2 + 2, 13, 2, 3);

        // 6. ARCO DE MADEIRA CURVADO PUXADO E FLECHA PRONTA PARA DISPARO (Imagem 1)
        ctx.strokeStyle = '#c2410c'; // Arco de madeira alaranjada
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(size / 2 - 6, 20, 14, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();

        // Corda esticada
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size / 2 - 2, 6);
        ctx.lineTo(size / 2 + 8, 20);
        ctx.lineTo(size / 2 - 2, 34);
        ctx.stroke();

        // Flecha armada pronta para atirar
        ctx.fillStyle = '#78350f'; // Haste da flecha
        ctx.fillRect(size / 2 - 16, 19, 24, 2);
        ctx.fillStyle = '#94a3b8'; // Ponta metálica prateada da flecha
        ctx.beginPath();
        ctx.moveTo(size / 2 - 16, 20);
        ctx.lineTo(size / 2 - 22, 17);
        ctx.lineTo(size / 2 - 22, 23);
        ctx.fill();
        break;

      case 'orcruins_berserker':
        shadow();
        // Orc Berserker com Montante com Runas Azuis (Imagem 2)
        // 1. Corpo Musculoso Verde com Tatuagens Tribais Escuras
        ctx.fillStyle = '#15803d'; // Verde musculoso
        ctx.fillRect(size / 2 - 14, 16, 28, 22);
        ctx.fillStyle = '#064e3b'; // Tatuagens tribais nos braços/peito
        ctx.fillRect(size / 2 - 12, 18, 6, 8);
        ctx.fillRect(size / 2 + 6, 18, 6, 8);

        // Saiote de Couro e Tiras de Pele
        ctx.fillStyle = '#fef3c7'; // Orla de pele amarelada
        ctx.fillRect(size / 2 - 12, 32, 24, 4);
        ctx.fillStyle = '#78350f'; // Saiote de couro
        ctx.fillRect(size / 2 - 10, 36, 20, 6);

        // Ombreira Metálica com Espinhos no Ombro Esquerdo
        ctx.fillStyle = '#334155';
        ctx.fillRect(size / 2 - 16, 12, 8, 8);
        ctx.fillStyle = '#cbd5e1'; // Espinhos metálicos
        ctx.fillRect(size / 2 - 18, 10, 3, 4);
        ctx.fillRect(size / 2 - 14, 8, 3, 4);

        // Cabeça de Orc Enfurecido com Mohawk
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(size / 2, 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1c1917'; // Mohawk escuro
        ctx.fillRect(size / 2 - 2, 3, 4, 8);

        // 2. MONTANTE DO BERSERKER COM RUNAS AZUIS MAGNÍFICAS (Boleado acima do corpo)
        ctx.fillStyle = '#94a3b8'; // Lâmina prateada metálica
        ctx.beginPath();
        ctx.moveTo(size / 2 + 10, 24);
        ctx.lineTo(size / 2 + 22, -10);
        ctx.lineTo(size / 2 + 26, -10);
        ctx.lineTo(size / 2 + 14, 24);
        ctx.fill();

        // Runas Cyan/Azul Brilhante ao longo da lâmina
        ctx.fillStyle = '#38bdf8'; // Azul rúnico brilhante
        ctx.fillRect(size / 2 + 14, 16, 3, 2);
        ctx.fillRect(size / 2 + 17, 8, 3, 2);
        ctx.fillRect(size / 2 + 20, 0, 3, 2);
        ctx.fillRect(size / 2 + 23, -6, 3, 2);

        // Guarda e Empunhadura Vermelha
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(size / 2 + 8, 22, 8, 4);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(size / 2 + 11, 26, 3, 8);
        break;

      case 'orcruins_boss_skeleton':
        shadow();
        // Esquelético Pacato / Rei Esqueleto de Coroa e Capa Vermelha (64px Boss - Imagem 5)
        // 1. Capa Real Vermelho Carmim Envolvendo os Ombros
        ctx.fillStyle = '#dc2626'; // Capa vermelha vibrante
        ctx.beginPath();
        ctx.moveTo(size / 2, 18);
        ctx.lineTo(size / 2 + 24, size - 4);
        ctx.lineTo(size / 2 - 24, size - 4);
        ctx.fill();

        ctx.fillStyle = '#fbbf24'; // Fecho dourado no pescoço
        ctx.beginPath();
        ctx.arc(size / 2, 20, 4, 0, Math.PI * 2);
        ctx.fill();

        // 2. Esqueleto de Ossos Brancos/Creme (Costelas, Pelve, Pernas)
        ctx.fillStyle = '#f8fafc'; // Costelas
        ctx.fillRect(size / 2 - 8, 24, 16, 16);
        ctx.fillStyle = '#0f172a'; // Espaços entre costelas
        ctx.fillRect(size / 2 - 6, 27, 12, 2);
        ctx.fillRect(size / 2 - 6, 32, 12, 2);

        ctx.fillStyle = '#f8fafc'; // Pelve e Pernas de osso
        ctx.fillRect(size / 2 - 7, 40, 14, 6);
        ctx.fillRect(size / 2 - 7, 46, 5, 12);
        ctx.fillRect(size / 2 + 2, 46, 5, 12);

        // 3. Crânio de Esqueleto Pacato Bonitinho com Olhos Grandes
        ctx.fillStyle = '#f8fafc'; // Crânio branco limpo
        ctx.beginPath();
        ctx.arc(size / 2, 12, 12, 0, Math.PI * 2);
        ctx.fill();

        // Cavidades Oculares Redondas e Grandes (Expressão simpática/pacata)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(size / 2 - 5, 12, 4, 0, Math.PI * 2);
        ctx.arc(size / 2 + 5, 12, 4, 0, Math.PI * 2);
        ctx.fill();

        // Sorriso Bonito de Dentes Limpos
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 6, 18, 12, 3);
        ctx.fillStyle = '#0f172a';
        for (let dx = -4; dx <= 4; dx += 3) {
          ctx.fillRect(size / 2 + dx, 18, 1, 3);
        }

        // 4. COROA DOURADA MAJESTOSA COM RUBI VERMELHO NO CENTRO
        ctx.fillStyle = '#fbbf24'; // Dourado real
        ctx.beginPath();
        ctx.moveTo(size / 2 - 12, 4);
        ctx.lineTo(size / 2 - 14, -6);
        ctx.lineTo(size / 2 - 6, -2);
        ctx.lineTo(size / 2, -10); // Pico central
        ctx.lineTo(size / 2 + 6, -2);
        ctx.lineTo(size / 2 + 14, -6);
        ctx.lineTo(size / 2 + 12, 4);
        ctx.fill();

        // Rubi Vermelho na Coroa
        ctx.fillStyle = '#dc2626'; // Joia de rubi
        ctx.beginPath();
        ctx.arc(size / 2, -3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(size / 2 - 1, -4, 2, 2);
        break;

      // ─── TIER 2: Esgotos Tartaruga ───
      case 'esgotos_ninja':
      case 'ninja':
        shadow();
        // Ninja do Clã do Pé (Capuz Púrpura com Emblema da Pegada Vermelha na Testa - Imagem 2)
        // 1. Pernas e Botas de Ninja Pretas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 - 8, 28, 6, 14);
        ctx.fillRect(size / 2 + 2, 28, 6, 14);
        ctx.fillStyle = '#64748b'; // Tiras amarradas nas canelas
        ctx.fillRect(size / 2 - 9, 32, 8, 2);
        ctx.fillRect(size / 2 - 9, 36, 8, 2);
        ctx.fillRect(size / 2 + 1, 32, 8, 2);
        ctx.fillRect(size / 2 + 1, 36, 8, 2);

        // 2. Traje Ninja Preto com Cinto e Gola Púrpura
        ctx.fillStyle = '#1e293b'; // Túnica preta
        ctx.fillRect(size / 2 - 10, 14, 20, 15);
        ctx.fillStyle = '#7e22ce'; // Cinto e tiras roxas
        ctx.fillRect(size / 2 - 11, 25, 22, 4);

        // Braçadeiras Metálicas Segmentadas nos Antebraços
        ctx.fillStyle = '#cbd5e1'; // Metal prateado brilhante
        ctx.fillRect(size / 2 - 14, 16, 4, 10);
        ctx.fillRect(size / 2 + 10, 16, 4, 10);
        ctx.fillStyle = '#475569';
        ctx.fillRect(size / 2 - 14, 19, 4, 1);
        ctx.fillRect(size / 2 - 14, 22, 4, 1);
        ctx.fillRect(size / 2 + 10, 19, 4, 1);
        ctx.fillRect(size / 2 + 10, 22, 4, 1);

        // 3. Capuz e Máscara Púrpura de Balaclava Alongada (Conforme Imagem 2)
        ctx.fillStyle = '#6b21a8'; // Capuz roxo estendido
        ctx.beginPath();
        ctx.arc(size / 2, 8, 8, Math.PI, 0); // Topo arredondado alto
        ctx.fillRect(size / 2 - 8, 8, 16, 8);
        ctx.fill();

        // Gola Caída Púrpura no Peito
        ctx.beginPath();
        ctx.moveTo(size / 2 - 10, 14);
        ctx.lineTo(size / 2, 20);
        ctx.lineTo(size / 2 + 10, 14);
        ctx.fill();

        // 4. EMBLEMA DA PEGADA VERMELHA DO CLÃ DO PÉ NA TESTA (Imagem 2)
        ctx.fillStyle = '#dc2626'; // Vermelho do Clã do Pé
        ctx.beginPath();
        ctx.arc(size / 2, 5, 2.5, 0, Math.PI * 2); // Calcanhar da pegada
        ctx.fill();
        ctx.fillRect(size / 2 - 2, 2, 1, 1); // Dedinhos da pegada
        ctx.fillRect(size / 2, 1.5, 1, 1);
        ctx.fillRect(size / 2 + 2, 2, 1, 1);

        // 5. Olhos Amarelos Reluzentes Staring do Mask
        ctx.fillStyle = '#fbbf24'; // Olhos amarelos amendoados
        ctx.fillRect(size / 2 - 5, 8, 3, 2);
        ctx.fillRect(size / 2 + 2, 8, 3, 2);
        break;

      case 'esgotos_rat':
      case 'rato':
        shadow();
        // Rato Mutante Mestre Splinter (Kimono Vermelho, Barba/Sobrancelhas Brancas e Cajado - Imagem 3)
        // 1. Rabo Longo de Rato Curvado nas Costas (Imagem 3)
        ctx.strokeStyle = '#fef3c7'; // Rabo tom marfim/rosa
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(size / 2 + 8, 20);
        ctx.quadraticCurveTo(size / 2 + 22, 10, size / 2 + 16, -2);
        ctx.stroke();

        // 2. Pernas e Garras de Rato Cinza
        ctx.fillStyle = '#64748b'; // Pelagem cinza
        ctx.fillRect(size / 2 - 10, 26, 7, 14);
        ctx.fillRect(size / 2 + 3, 26, 7, 14);
        ctx.fillStyle = '#cbd5e1'; // Garras afiadas nos pés
        ctx.fillRect(size / 2 - 11, 38, 8, 3);
        ctx.fillRect(size / 2 + 3, 38, 8, 3);

        // 3. Kimono Vermelho Rústico com Cinto de Couro
        ctx.fillStyle = '#b91c1c'; // Kimono vermelho bordô
        ctx.fillRect(size / 2 - 12, 14, 24, 16);
        ctx.fillStyle = '#78350f'; // Gola e cinto de couro marrom
        ctx.fillRect(size / 2 - 12, 22, 24, 4);
        ctx.beginPath();
        ctx.moveTo(size / 2 - 8, 14);
        ctx.lineTo(size / 2, 22);
        ctx.lineTo(size / 2 + 8, 14);
        ctx.stroke();

        // 4. Cabeça de Rato Cinza com Focinho Longo e Sobrancelhas Brancas (Mestre Splinter)
        ctx.fillStyle = '#64748b'; // Pelagem da cabeça
        ctx.beginPath();
        ctx.arc(size / 2, 11, 7, 0, Math.PI * 2);
        ctx.fill();

        // Focinho Longo com Nariz Rosa
        ctx.fillRect(size / 2 - 12, 10, 8, 5);
        ctx.fillStyle = '#f43f5e'; // Nariz rosa
        ctx.fillRect(size / 2 - 13, 10, 3, 3);

        // Sobrancelhas e Bigodes Brancos Majestosos de Mestre
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(size / 2 - 8, 6, 8, 3); // Sobrancelhas brancas
        ctx.fillRect(size / 2 - 6, 15, 6, 3); // Barba branca sob o queixo
        // Whiskers/Bigodes finos
        ctx.fillRect(size / 2 - 14, 12, 3, 1);
        ctx.fillRect(size / 2 - 14, 14, 3, 1);

        // Olhos Expressivos de Rato
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 - 5, 8, 2, 2);

        // 5. CAJADO DE MADEIRA SEGURADO NA MÃO (Bo Staff / Bastão)
        ctx.fillStyle = '#92400e'; // Bastão de madeira
        ctx.beginPath();
        ctx.moveTo(size / 2 + 10, 2);
        ctx.lineTo(size / 2 - 14, 34);
        ctx.lineTo(size / 2 - 11, 35);
        ctx.lineTo(size / 2 + 13, 3);
        ctx.fill();
        break;

      case 'esgotos_boss_destroyer':
        shadow();
        // Destruidor Ranzinza / Shredder (Armadura de Lâminas, Elmo Fechado e Capa Roxa 64px Boss - Imagem 4)
        // 1. Capa Longa Púrpura Fluida nas Costas
        ctx.fillStyle = '#7e22ce'; // Capa roxa imperial
        ctx.beginPath();
        ctx.moveTo(size / 2, 12);
        ctx.lineTo(size / 2 + 22, size - 4);
        ctx.lineTo(size / 2 - 22, size - 4);
        ctx.fill();

        // 2. Traje Ninja Escuro e Pernas com Grevas de Lâminas Prateadas
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(size / 2 - 12, 16, 24, 28);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 - 10, 36, 8, 18); // Calças escuras
        ctx.fillRect(size / 2 + 2, 36, 8, 18);

        // Grevas com Lâminas Metálicas Amoladas nas Pernas
        ctx.fillStyle = '#94a3b8'; // Metal das grevas
        ctx.fillRect(size / 2 - 11, 38, 9, 14);
        ctx.fillRect(size / 2 + 2, 38, 9, 14);
        ctx.fillStyle = '#f8fafc'; // Garras/lâminas prateadas sobressaindo
        ctx.fillRect(size / 2 - 14, 40, 4, 3);
        ctx.fillRect(size / 2 - 14, 46, 4, 3);
        ctx.fillRect(size / 2 + 10, 40, 4, 3);
        ctx.fillRect(size / 2 + 10, 46, 4, 3);

        // 3. Peitoral e Ombreiras com Lâminas Cortantes
        ctx.fillStyle = '#334155';
        ctx.fillRect(size / 2 - 12, 16, 24, 18);
        // Ombreiras Metálicas com Lâminas Triplas (Conforme Imagem 4)
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(size / 2 - 18, 14, 8, 8);
        ctx.fillRect(size / 2 + 10, 14, 8, 8);
        ctx.fillStyle = '#ffffff'; // Lâminas affiadas
        ctx.beginPath();
        ctx.moveTo(size / 2 - 18, 14);
        ctx.lineTo(size / 2 - 24, 8);
        ctx.lineTo(size / 2 - 14, 16);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 2 + 18, 14);
        ctx.lineTo(size / 2 + 24, 8);
        ctx.lineTo(size / 2 + 14, 16);
        ctx.fill();

        // Braçadeiras com Garra Dupla de Destruidor nas Mãos (Shredder Gauntlets)
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(size / 2 - 17, 26, 6, 10);
        ctx.fillRect(size / 2 + 11, 26, 6, 10);
        ctx.fillStyle = '#ffffff'; // Garras retráteis cortantes
        ctx.fillRect(size / 2 - 21, 28, 5, 2);
        ctx.fillRect(size / 2 - 21, 32, 5, 2);
        ctx.fillRect(size / 2 + 16, 28, 5, 2);
        ctx.fillRect(size / 2 + 16, 32, 5, 2);

        // 4. ELMO METALICO DE DESTRUIDOR COM MÁSCARA FACIAL (Imagem 4)
        ctx.fillStyle = '#64748b'; // Elmo de aço
        ctx.fillRect(size / 2 - 9, 2, 18, 14);
        ctx.fillStyle = '#cbd5e1'; // Crista metálica superior do elmo
        ctx.beginPath();
        ctx.moveTo(size / 2 - 3, 2);
        ctx.lineTo(size / 2, -6);
        ctx.lineTo(size / 2 + 3, 2);
        ctx.fill();

        // Máscara Facial Prateada Cobrindo Nariz e Boca
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(size / 2 - 7, 8, 14, 8);
        ctx.fillStyle = '#475569'; // Grelhas respiratórias na máscara
        ctx.fillRect(size / 2 - 4, 11, 8, 2);

        // Olhos Ameaçadores no Capacete
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(size / 2 - 6, 6, 12, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 4, 7, 2, 1);
        ctx.fillRect(size / 2 + 2, 7, 2, 1);
        break;

      // ─── TIER 3: Escola de Rogartes ───
      case 'rogartes_dementor':
      case 'dementador':
        shadow();
        // Dementador das Sombras (Espectro de Manto Esfarrapado e Mãos Esqueléticas - Imagem 2)
        // 1. Manto Negro/Verde Escuro Esfarrapado e Flutuante
        ctx.fillStyle = '#09090b'; // Negro profundo
        ctx.beginPath();
        ctx.moveTo(size / 2, 4);
        ctx.lineTo(size / 2 + 16, 26);
        ctx.lineTo(size / 2 + 18, size - 4);
        ctx.lineTo(size / 2 - 18, size - 4);
        ctx.lineTo(size / 2 - 16, 26);
        ctx.fill();

        ctx.fillStyle = '#064e3b'; // Sombras verde-oliva em decomposição
        ctx.beginPath();
        ctx.moveTo(size / 2 - 12, 14);
        ctx.lineTo(size / 2 + 12, 14);
        ctx.lineTo(size / 2 + 15, size - 6);
        ctx.lineTo(size / 2 - 15, size - 6);
        ctx.fill();

        // Fitilhos e Tiras Esfarrapadas na Borda Inferior (Conforme Imagem 2)
        ctx.fillStyle = '#0f172a';
        for (let fx = size / 2 - 16; fx <= size / 2 + 16; fx += 4) {
          ctx.fillRect(fx, size - 8, 2, 6);
        }

        // 2. Capuz com Cavidade Obscura Sem Rosto (Vazio Interno)
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(size / 2, 10, 8, Math.PI, 0);
        ctx.fillRect(size / 2 - 8, 10, 16, 8);
        ctx.fill();
        ctx.fillStyle = '#000000'; // Vazio negro absoluto do rosto
        ctx.beginPath();
        ctx.ellipse(size / 2, 12, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Mãos Esqueléticas em Decomposição Estendidas para Frente (Imagem 2)
        ctx.fillStyle = '#cbd5e1'; // Ossos prateados/pálidos
        // Mão esquerda estendida
        ctx.fillRect(size / 2 - 18, 14, 8, 2);
        ctx.fillRect(size / 2 - 20, 13, 3, 1);
        ctx.fillRect(size / 2 - 20, 15, 3, 1);
        // Mão direita levantada
        ctx.fillRect(size / 2 + 10, 12, 8, 2);
        ctx.fillRect(size / 2 + 17, 10, 3, 1);
        ctx.fillRect(size / 2 + 17, 13, 3, 1);
        break;

      case 'rogartes_troll':
      case 'trasgo':
        shadow();
        // Trasgo das Cavernas (Troll Azul/Cinza Musculoso com Clava de Madeira - Imagem 3)
        // 1. Pernas Enormes de Troll com Garras
        ctx.fillStyle = '#475569'; // Pele azul/cinza de troll
        ctx.fillRect(size / 2 - 14, 26, 10, 16);
        ctx.fillRect(size / 2 + 4, 26, 10, 16);
        ctx.fillStyle = '#b91c1c'; // Saiote de pano vermelho
        ctx.fillRect(size / 2 - 12, 24, 24, 8);
        ctx.fillStyle = '#cbd5e1'; // Garras afiadas nos pés grandes
        ctx.fillRect(size / 2 - 15, 38, 11, 4);
        ctx.fillRect(size / 2 + 4, 38, 11, 4);

        // 2. Tronco Musculoso com Colete de Couro Marrom
        ctx.fillStyle = '#475569';
        ctx.fillRect(size / 2 - 16, 12, 32, 16);
        ctx.fillStyle = '#94a3b8'; // Barriga azul claro saliente
        ctx.beginPath();
        ctx.arc(size / 2, 20, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#92400e'; // Colete de couro marrom sem mangas
        ctx.fillRect(size / 2 - 16, 12, 6, 16);
        ctx.fillRect(size / 2 + 10, 12, 6, 16);

        // 3. Cabeça de Troll Calva com Orelhas Grandes Flácidas
        ctx.fillStyle = '#64748b'; // Cabeça calva
        ctx.beginPath();
        ctx.arc(size / 2, 10, 9, 0, Math.PI * 2);
        ctx.fill();

        // Orelhas Gigantes Desproporcionais (Imagem 3)
        ctx.fillStyle = '#475569';
        ctx.fillRect(size / 2 - 15, 7, 6, 8);
        ctx.fillRect(size / 2 + 9, 7, 6, 8);

        // Boca Aberta com Dentes Tortos
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(size / 2 - 4, 13, 8, 4);
        ctx.fillStyle = '#fef3c7'; // Dentes amarelados
        ctx.fillRect(size / 2 - 3, 13, 2, 2);
        ctx.fillRect(size / 2 + 1, 15, 2, 2);

        // 4. CLAVA DE MADEIRA GIGANTE NA MÃO DIREITA (Tronco de Árvore)
        ctx.fillStyle = '#78350f'; // Madeira do porrete
        ctx.beginPath();
        ctx.moveTo(size / 2 + 10, 24);
        ctx.lineTo(size / 2 + 22, -6);
        ctx.lineTo(size / 2 + 26, -2);
        ctx.lineTo(size / 2 + 14, 26);
        ctx.fill();
        ctx.fillStyle = '#451a03'; // Nós e nós de madeira na clava
        ctx.fillRect(size / 2 + 20, -2, 4, 4);
        break;

      case 'rogartes_boss_darkmage':
      case 'voldemorte':
        shadow();
        // Voldemort Sem Nariz (Aquele Que Não Deve Ser Nomeado - 64px Boss - Imagem 4)
        // 1. Manto Longo de Bruxo Verde Escuro em Movimento
        ctx.fillStyle = '#064e3b'; // Verde escuro característico do Lord das Trevas
        ctx.beginPath();
        ctx.moveTo(size / 2, 14);
        ctx.lineTo(size / 2 + 20, size - 4);
        ctx.lineTo(size / 2 - 20, size - 4);
        ctx.fill();

        ctx.fillStyle = '#022c22'; // Dobras do manto e mangas amplas
        ctx.fillRect(size / 2 - 14, 18, 28, 26);
        ctx.fillRect(size / 2 - 22, 18, 10, 20); // Manga esquerda aberta

        // Pés pálidos descalços sob o manto
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(size / 2 - 8, size - 6, 6, 4);
        ctx.fillRect(size / 2 + 2, size - 6, 6, 4);

        // 2. Cabeça Pálida e SEM NARIZ (Fendas de Cobra na Face - Imagem 4)
        ctx.fillStyle = '#f1f5f9'; // Pele pálida fantasmagórica
        ctx.beginPath();
        ctx.arc(size / 2, 11, 10, 0, Math.PI * 2);
        ctx.fill();

        // FENDAS DE COBRA NO LUGAR DO NARIZ (SEM NARIZ!)
        ctx.fillStyle = '#475569'; // Duas fendas verticais paralelas
        ctx.fillRect(size / 2 - 2, 11, 1.5, 3);
        ctx.fillRect(size / 2 + 0.5, 11, 1.5, 3);

        // Boca Aberta Gritando / Conjurando Feitiço
        ctx.fillStyle = '#0f172a'; // Garganta escura
        ctx.beginPath();
        ctx.arc(size / 2, 17, 4, 0, Math.PI);
        ctx.fill();

        // Olhos Vermelhos Ameaçadores
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(size / 2 - 5, 8, 3, 2);
        ctx.fillRect(size / 2 + 2, 8, 3, 2);

        // 3. VARINHA DAS VARINHAS (ELDER WAND) DISPARANDO AVADA KEDAVRA (VERDE RAY)
        ctx.fillStyle = '#78350f'; // Varinha das Varinhas na mão direita
        ctx.fillRect(size / 2 + 10, 8, 14, 2);

        // Raio Verde Mágico Avada Kedavra na ponta da varinha!
        ctx.fillStyle = '#22c55e'; // Verde avada kedavra intenso
        ctx.beginPath();
        ctx.moveTo(size / 2 + 24, 9);
        ctx.lineTo(size / 2 + 38, 2);
        ctx.lineTo(size / 2 + 38, 16);
        ctx.fill();
        ctx.fillStyle = '#4ade80'; // Núcleo brilhante
        ctx.fillRect(size / 2 + 24, 8, 10, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 + 24, 9, 4, 1);
        break;

      // ─── TIER 4: Santuário de Atenas ───
      case 'frozen_specter':
      case 'espectro':
      case 'lord_espectro':
        shadow();
        // Lord Espectro (Mago Fantasma de Capa Azul Royal, Capuz Negro com Olhos Vermelhos e Luvas Brancas - Imagem 4)
        // 1. Capa Azul Royal Flutuante
        ctx.fillStyle = '#1d4ed8'; // Azul royal vibrante
        ctx.beginPath();
        ctx.moveTo(size / 2, 4);
        ctx.lineTo(size / 2 + 16, 26);
        ctx.lineTo(size / 2 + 15, size - 4);
        ctx.lineTo(size / 2 - 15, size - 4);
        ctx.lineTo(size / 2 - 16, 26);
        ctx.fill();

        // 2. Capuz Azul com Vazio Negro do Rosto e Olhos Vermelhos (Orko / Specter - Imagem 4)
        ctx.fillStyle = '#1e40af'; // Capuz roxo/azul
        ctx.beginPath();
        ctx.arc(size / 2, 10, 9, Math.PI, 0);
        ctx.fillRect(size / 2 - 9, 10, 18, 8);
        ctx.fill();

        ctx.fillStyle = '#000000'; // Vazio negro do rosto
        ctx.beginPath();
        ctx.ellipse(size / 2, 12, 6, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Olhos Vermelhos Diabólicos e Inclinados
        ctx.fillStyle = '#ef4444'; // Olhos vermelhos brilhantes
        ctx.beginPath();
        ctx.moveTo(size / 2 - 6, 9);
        ctx.lineTo(size / 2 - 1, 13);
        ctx.lineTo(size / 2 - 5, 13);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 2 + 6, 9);
        ctx.lineTo(size / 2 + 1, 13);
        ctx.lineTo(size / 2 + 5, 13);
        ctx.fill();

        // 3. Mãos com Luvas Brancas Expressivas Flutuando Estendidas (Imagem 4)
        ctx.fillStyle = '#f8fafc'; // Luvas brancas
        // Mão esquerda com 4 dedos abertos
        ctx.fillRect(size / 2 - 20, 12, 7, 8);
        ctx.fillRect(size / 2 - 22, 10, 3, 3);
        ctx.fillRect(size / 2 - 22, 14, 3, 3);
        ctx.fillRect(size / 2 - 22, 18, 3, 3);

        // Mão direita com 4 dedos abertos
        ctx.fillRect(size / 2 + 13, 12, 7, 8);
        ctx.fillRect(size / 2 + 19, 10, 3, 3);
        ctx.fillRect(size / 2 + 19, 14, 3, 3);
        ctx.fillRect(size / 2 + 19, 18, 3, 3);
        break;

      case 'frozen_zombie':
      case 'zumbi':
      case 'rei_da_noite':
        shadow();
        // Zumbi Congelado / Rei da Noite (Coroa de Chifres de Gelo, Olhos Azul Safira e Armadura - Imagem 5)
        // 1. Armadura de Malha/Brigandina e Placas de Couro Escuro
        ctx.fillStyle = '#334155'; // Placa metálica de brigandina
        ctx.fillRect(size / 2 - 11, 16, 22, 28);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(size / 2 - 9, 34, 7, 14); // Calças de couro
        ctx.fillRect(size / 2 + 2, 34, 7, 14);

        // Ombreiras com Placas em Escamas de Gelo
        ctx.fillStyle = '#475569';
        ctx.fillRect(size / 2 - 15, 16, 6, 10);
        ctx.fillRect(size / 2 + 9, 16, 6, 10);

        // Broche/Medalhão de Aço Central no Peito (Conforme Imagem 5)
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(size / 2, 16);
        ctx.lineTo(size / 2 + 4, 23);
        ctx.lineTo(size / 2, 28);
        ctx.lineTo(size / 2 - 4, 23);
        ctx.fill();

        // 2. Rosto Pálido de Gelo e Rugas Profundas (Night King)
        ctx.fillStyle = '#94a3b8'; // Pele cinza/azul de morto-vivo
        ctx.beginPath();
        ctx.arc(size / 2, 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1'; // Maçãs do rosto pálidas
        ctx.fillRect(size / 2 - 6, 8, 12, 6);

        // 3. COROA DE CHIFRES/ESPINHOS DE GELO NA CABEÇA (Imagem 5)
        ctx.fillStyle = '#e0f2fe'; // Chifres de gelo cristalino
        ctx.fillRect(size / 2 - 8, 1, 2, 5);
        ctx.fillRect(size / 2 - 5, -2, 2, 7);
        ctx.fillRect(size / 2 - 2, -4, 2, 8);
        ctx.fillRect(size / 2 + 1, -4, 2, 8);
        ctx.fillRect(size / 2 + 4, -2, 2, 7);
        ctx.fillRect(size / 2 + 7, 1, 2, 5);

        // 4. OLHOS AZUL SAFIRA LUMINOSOS PONTUADOS (Imagem 5)
        ctx.fillStyle = '#2563eb'; // Azul safira vibrante
        ctx.fillRect(size / 2 - 5, 8, 3, 3);
        ctx.fillRect(size / 2 + 2, 8, 3, 3);
        ctx.fillStyle = '#38bdf8'; // Núcleo ciano reluzente
        ctx.fillRect(size / 2 - 4, 9, 1, 1);
        ctx.fillRect(size / 2 + 3, 9, 1, 1);
        break;

      case 'frozen_golem':
      case 'golem':
        shadow();
        // Golem de Gelo (Musculoso de Cristais Cyan com Punhos Gigantes e Espinhos - Imagem 3)
        // 1. Pernas de Cristais de Gelo Maciço
        ctx.fillStyle = '#0284c7'; // Gelo denso escuro
        ctx.fillRect(size / 2 - 14, 24, 10, 18);
        ctx.fillRect(size / 2 + 4, 24, 10, 18);
        ctx.fillStyle = '#78350f'; // Saiote de couro marrom rasgado
        ctx.fillRect(size / 2 - 12, 22, 24, 6);

        // 2. Tronco Musculoso de Cristais de Gelo Ciano (Cyan/Blue)
        ctx.fillStyle = '#38bdf8'; // Gelo ciano brilhante
        ctx.fillRect(size / 2 - 16, 10, 32, 16);
        ctx.fillStyle = '#7dd3fc'; // Placas de peitoral destacadas
        ctx.fillRect(size / 2 - 12, 12, 10, 10);
        ctx.fillRect(size / 2 + 2, 12, 10, 10);

        // Espinhos de Gelo Salientes nos Ombros e Costas (Conforme Imagem 3)
        ctx.fillStyle = '#e0f2fe'; // Pontas afiadas brancas
        ctx.beginPath();
        ctx.moveTo(size / 2 - 16, 10);
        ctx.lineTo(size / 2 - 22, 2);
        ctx.lineTo(size / 2 - 10, 8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 2 + 16, 10);
        ctx.lineTo(size / 2 + 22, 2);
        ctx.lineTo(size / 2 + 10, 8);
        ctx.fill();

        // 3. PUNHOS GIGANTES DE GELO CRISTALINO NAS MÃOS (Imagem 3)
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(size / 2 - 22, 18, 10, 14); // Mão esquerda colossal
        ctx.fillRect(size / 2 + 12, 18, 10, 14); // Mão direita colossal
        ctx.fillStyle = '#bae6fd'; // Brilho facetado de cristal nos punhos
        ctx.fillRect(size / 2 - 20, 20, 4, 4);
        ctx.fillRect(size / 2 + 14, 20, 4, 4);

        // 4. Cabeça Facetada de Golem com Olhos Brancos e Boca de Dentes de Gelo
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(size / 2, 8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff'; // Olhos brancos brilhantes
        ctx.fillRect(size / 2 - 5, 6, 3, 2);
        ctx.fillRect(size / 2 + 2, 6, 3, 2);
        ctx.fillStyle = '#0284c7'; // Boca com dentes pontiagudos de gelo
        ctx.fillRect(size / 2 - 4, 10, 8, 3);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(size / 2 - 3, 10, 2, 2);
        ctx.fillRect(size / 2 + 1, 10, 2, 2);
        break;

      case 'frozen_chimera':
      case 'quimera':
        shadow();
        // Quimera do Frost (Leão com Juba Castanha, Olhos Brancos e Cauda de Serpente com Lâmina Vermelha - Imagem 2)
        // 1. CAUDA DE SERPENTE COM LÂMINA SCORPION VERMELHA NAS COSTAS (Imagem 2)
        ctx.strokeStyle = '#166534'; // Corpo da serpente verde
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(size / 2 + 10, 20);
        ctx.quadraticCurveTo(size / 2 + 22, 6, size / 2 - 14, 2);
        ctx.stroke();

        // Lâmina/Aguilhão Vermelho na ponta da cauda (Scorpion Sting)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(size / 2 - 14, 2);
        ctx.lineTo(size / 2 - 20, -4);
        ctx.lineTo(size / 2 - 8, -2);
        ctx.fill();

        // 2. Corpos Posteriores e Pernas com Cascos Avermelhados
        ctx.fillStyle = '#1e1b4b'; // Pelagem escura/púrpura nos quadris
        ctx.fillRect(size / 2 - 10, 22, 22, 14);
        ctx.fillStyle = '#991b1b'; // Cascos vermelhos nos pés
        ctx.fillRect(size / 2 - 10, 34, 5, 6);
        ctx.fillRect(size / 2 - 2, 34, 5, 6);
        ctx.fillRect(size / 2 + 6, 34, 5, 6);
        ctx.fillRect(size / 2 + 14, 34, 5, 6);

        // 3. JUBA DE LEÃO CASTANHA/VIBRANTE E BOCA DE FERA (Imagem 2)
        ctx.fillStyle = '#9a3412'; // Juba alaranjada/castanha volumosa
        ctx.beginPath();
        ctx.arc(size / 2 - 8, 14, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c2410c'; // Destaques da juba
        ctx.beginPath();
        ctx.arc(size / 2 - 8, 12, 9, 0, Math.PI * 2);
        ctx.fill();

        // Rosto de Leão com Focinho e Boca Rosnando
        ctx.fillStyle = '#fef3c7'; // Pelagem clara do focinho
        ctx.fillRect(size / 2 - 16, 12, 8, 7);
        ctx.fillStyle = '#991b1b'; // Boca aberta rosnando
        ctx.fillRect(size / 2 - 16, 15, 6, 4);
        ctx.fillStyle = '#ffffff'; // Presas afiadas de leão
        ctx.fillRect(size / 2 - 15, 14, 2, 2);
        ctx.fillRect(size / 2 - 12, 14, 2, 2);

        // 4. OLHOS BRANCOS LUMINOSOS DE FERA (Imagem 2)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 12, 10, 3, 3);
        break;

      case 'frozen_boss_master':
      case 'mestre_do_santuario':
      case 'mestre_do_santuário':
      case 'mestre':
        shadow();
        // Mestre do Santuário / Sumo Sacerdote de Atena (64px Boss - Imagem 2)
        // 1. Túnica Sagrada Branca Fluida com Orla Vermelho Carmim
        ctx.fillStyle = '#f8fafc'; // Túnica branca sacerdotal
        ctx.beginPath();
        ctx.moveTo(size / 2, 8);
        ctx.lineTo(size / 2 + 24, size - 4);
        ctx.lineTo(size / 2 - 24, size - 4);
        ctx.fill();

        // Barrado/Orla Vermelho Carmim na Base do Manto (Conforme Imagem 2)
        ctx.fillStyle = '#dc2626'; // Vermelho vibrante
        ctx.fillRect(size / 2 - 24, size - 8, 48, 4);
        ctx.fillStyle = '#fbbf24'; // Filete dourado acima do barrado
        ctx.fillRect(size / 2 - 24, size - 10, 48, 2);

        // 2. Estolas/Mantos Verdes Esmeralda Pendentes com Bordados Dourados
        ctx.fillStyle = '#047857'; // Esmeralda místico
        ctx.fillRect(size / 2 - 14, 16, 8, 30);
        ctx.fillRect(size / 2 + 6, 16, 8, 30);

        // Padronagem e Tassels Dourados nas Estolas Verdes
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(size / 2 - 13, 20, 6, 2);
        ctx.fillRect(size / 2 - 13, 28, 6, 2);
        ctx.fillRect(size / 2 - 13, 36, 6, 2);
        ctx.fillRect(size / 2 + 7, 20, 6, 2);
        ctx.fillRect(size / 2 + 7, 28, 6, 2);
        ctx.fillRect(size / 2 + 7, 36, 6, 2);
        // Pingentes/Franjas douradas nas pontas
        ctx.beginPath();
        ctx.moveTo(size / 2 - 10, 46);
        ctx.lineTo(size / 2 - 14, 52);
        ctx.lineTo(size / 2 - 6, 52);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 2 + 10, 46);
        ctx.lineTo(size / 2 + 6, 52);
        ctx.lineTo(size / 2 + 14, 52);
        ctx.fill();

        // 3. Colar Cerimonial com Gemas de Rubi e Turquesa
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(size / 2, 18, 8, 0, Math.PI);
        ctx.stroke();

        ctx.fillStyle = '#dc2626'; // Rubi central
        ctx.beginPath();
        ctx.arc(size / 2, 22, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#06b6d4'; // Turquesas laterais
        ctx.fillRect(size / 2 - 6, 20, 2, 2);
        ctx.fillRect(size / 2 + 4, 20, 2, 2);

        // 4. ELMO CERIMONIAL DOURADO E ROSTO NEGRO OBSCURO (Imagem 2)
        ctx.fillStyle = '#fbbf24'; // Elmo dourado suntuoso
        ctx.beginPath();
        ctx.arc(size / 2, 8, 10, Math.PI, 0);
        ctx.fillRect(size / 2 - 10, 8, 20, 8);
        ctx.fill();

        // Asas/Cristas de Dragão no Elmo (Imagem 2)
        ctx.beginPath();
        ctx.moveTo(size / 2 - 10, 4);
        ctx.lineTo(size / 2 - 16, -4);
        ctx.lineTo(size / 2 - 6, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 2 + 10, 4);
        ctx.lineTo(size / 2 + 16, -4);
        ctx.lineTo(size / 2 + 6, 2);
        ctx.fill();

        // Rosto Negro Absoluto Místico sob a Máscara
        ctx.fillStyle = '#0f172a'; // Sombra e mistério do Mestre
        ctx.beginPath();
        ctx.ellipse(size / 2, 10, 6, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Olhos Vermelhos Ameaçadores e Profundos
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(size / 2 - 4, 9, 2, 2);
        ctx.fillRect(size / 2 + 2, 9, 2, 2);
        break;

      // ─── TIER 5: Caverna do Dragão Perdido ───
      case 'abyss_dragon':
      case 'dragão':
      case 'dragao':
        shadow();
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
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(size / 2, 24, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(size / 2 - 10, 8, 20, 14);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(size / 2 - 12, 2, 4, 8);
        ctx.fillRect(size / 2 + 8, 2, 4, 8);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(size / 2 - 6, 12, 3, 3);
        ctx.fillRect(size / 2 + 3, 12, 3, 3);
        break;

      case 'abyss_demon':
      case 'demônio':
      case 'demonio':
        shadow();
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(size / 2 - 14, 14, 28, 24);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(size / 2 - 10, 16, 20, 18);
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
        ctx.fillStyle = '#fde047';
        ctx.fillRect(size / 2 - 6, 12, 4, 4);
        ctx.fillRect(size / 2 + 2, 12, 4, 4);
        break;

      case 'abyss_vampire':
      case 'vampiro':
        shadow();
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.moveTo(size / 2, 8);
        ctx.lineTo(size / 2 + 16, size - 6);
        ctx.lineTo(size / 2 - 16, size - 6);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(size / 2 - 10, 10, 20, 8);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(size / 2 - 6, 12, 12, 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(size / 2 - 4, 14, 3, 3);
        ctx.fillRect(size / 2 + 1, 14, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size / 2 - 4, 20, 2, 4);
        ctx.fillRect(size / 2 + 2, 20, 2, 4);
        break;

      case 'abyss_necromancer':
        shadow();
        ctx.fillStyle = '#09090b';
        ctx.fillRect(size / 2 - 14, 12, 28, 28);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(size / 2, 16, 6, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'abyss_scorpion':
        shadow();
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(size / 2 - 16, 18, 32, 16);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(size / 2 + 12, 6, 6, 14);
        break;

      case 'abyss_flame_lord':
        shadow();
        ctx.fillStyle = '#f97316';
        ctx.fillRect(size / 2 - 14, 14, 28, 26);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(size / 2 - 8, 18, 16, 16);
        break;

      case 'abyss_boss_avenger':
      case 'vingador':
        shadow();
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(size / 2 - 22, 10, 44, 38);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(size / 2 - 14, 10);
        ctx.lineTo(size / 2 - 24, 0);
        ctx.lineTo(size / 2 - 8, 12);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size / 2 + 14, 10);
        ctx.lineTo(size / 2 + 24, 0);
        ctx.lineTo(size / 2 + 8, 12);
        ctx.fill();
        break;

      default:
        console.warn(`[PixelArtRenderer] Visual key desconhecida: "${key}". Renderizando fallback magenta.`);
        const checkSize = Math.max(4, Math.floor(size / 8));
        for (let y = 0; y < size; y += checkSize) {
          for (let x = 0; x < size; x += checkSize) {
            const isMagenta = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
            ctx.fillStyle = isMagenta ? '#ff00ff' : '#000000';
            ctx.fillRect(x, y, checkSize, checkSize);
          }
        }
        break;
    }
  }
}
