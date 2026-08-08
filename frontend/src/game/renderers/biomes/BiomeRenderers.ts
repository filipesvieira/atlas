/** Renderers de bioma extraídos do renderer monolítico. Cada função preserva o desenho Canvas original. */

const cache = new Map<string, HTMLCanvasElement>();

function getOffscreenCanvas(key: string, width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx);
  cache.set(key, canvas);
  return canvas;
}

// ───────────────────────────────────────────────────────────────────────────
// 1. CENÁRIOS DE BIOMA RICOS (500×260px)
// ───────────────────────────────────────────────────────────────────────────

/** Cenário: Floresta dos Aprendizes (Verde exuberante, árvore, trilha de terra, sol) */
export function getForestBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_forest', w, h, (ctx) => {
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
    drawTree(ctx, 30, h * 0.52, 28, 65);
    drawTree(ctx, 470, h * 0.55, 32, 70);
    drawTree(ctx, 430, h * 0.48, 22, 50);
  });
}

/** Cenário: Acampamento / Safezone Vivo (Cabana, pinheiros, tronco, fogueira com anel de pedras) */
export function getCampBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_camp', w, h, (ctx) => {
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
    drawTree(ctx, 40, h * 0.46, 18, 45);
    drawTree(ctx, 90, h * 0.48, 15, 40);

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
export function getSherequeBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_shereque', w, h, (ctx) => {
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
export function getChapolinBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_chapolin', w, h, (ctx) => {
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
export function getOrcRuinsBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_orcruins', w, h, (ctx) => {
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
export function getEsgotosBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_esgotos', w, h, (ctx) => {
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
export function getRogartesBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_rogartes', w, h, (ctx) => {
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
export function getFrozenBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_frozen', w, h, (ctx) => {
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

/** Cenário: Caverna do Dragão Perdido (Portal Vórtice Dimensional e Entrada de Cabeça de Dragão Verde com Trilhos - Imagens 1 e 2) */
export function getAbyssBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_abyss', w, h, (ctx) => {
    // 1. Céu Crepuscular Rosa/Púrpura do Reino da Caverna do Dragão (Conforme Imagens 1 e 2)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    skyGrad.addColorStop(0, '#831843'); // Rosa escuro
    skyGrad.addColorStop(0.5, '#db2777'); // Magenta/rosa vibrante
    skyGrad.addColorStop(1, '#fb7185'); // Rosa crepúsculo
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.55);

    // Montanhas e Castelo Distante no Fundo
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(320, h * 0.5);
    ctx.lineTo(370, h * 0.22);
    ctx.lineTo(440, h * 0.5);
    ctx.fill();

    // Torre do Castelo Distante na Direita
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(410, h * 0.24, 18, 50);
    ctx.fillStyle = '#dc2626'; // Bandeirinha no topo da torre
    ctx.fillRect(418, h * 0.20, 10, 6);

    // 2. 🌀 O PORTAL VÓRTICE DIMENSIONAL DOURADO/ALVO (Imagem 1 - Topo Central/Esquerdo)
    const vortexX = 140;
    const vortexY = h * 0.28;

    // Anéis concêntricos do túnel de vórtice
    ctx.fillStyle = 'rgba(251, 191, 36, 0.4)'; // Anel externo amarelo
    ctx.beginPath();
    ctx.ellipse(vortexX, vortexY, 130, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(249, 115, 22, 0.6)'; // Anel intermediário laranja
    ctx.beginPath();
    ctx.ellipse(vortexX, vortexY, 95, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(254, 240, 138, 0.85)'; // Anel luminoso central
    ctx.beginPath();
    ctx.ellipse(vortexX, vortexY, 65, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. 🐉 A CABEÇA DE DRAGÃO VERDE ESCULPIDA NA MONTANHA (Imagem 2 Central)
    const dragX = 150;
    const dragY = h * 0.08;

    // Contorno da Cabeça do Dragão de Pedra Verde
    ctx.fillStyle = '#14532d'; // Verde escuro escamado
    ctx.beginPath();
    ctx.arc(dragX, dragY + 45, 58, 0, Math.PI * 2);
    ctx.fill();

    // Espinhos e Cristas da Cabeça do Dragão
    ctx.fillStyle = '#052e16'; // Verde profundo
    for (let angle = Math.PI * 1.1; angle <= Math.PI * 1.9; angle += 0.25) {
      const spkX = dragX + Math.cos(angle) * 58;
      const spkY = dragY + 45 + Math.sin(angle) * 58;
      ctx.beginPath();
      ctx.moveTo(spkX, spkY);
      ctx.lineTo(spkX + Math.cos(angle) * 16, spkY + Math.sin(angle) * 16);
      ctx.lineTo(spkX + 8, spkY + 8);
      ctx.fill();
    }

    // Boca Cavernosa Escancarada do Dragão (A Entrada da Caverna)
    ctx.fillStyle = '#7f1d1d'; // Garganta cavernosa avermelhada
    ctx.beginPath();
    ctx.arc(dragX, dragY + 62, 38, 0, Math.PI);
    ctx.fill();

    // Interior Preto Profundo da Garganta
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(dragX, dragY + 62, 28, 0, Math.PI);
    ctx.fill();

    // Dentes e Presas de Marfim Afiadas na Boca Superior e Inferior (Imagem 2)
    ctx.fillStyle = '#ffffff';
    // Dentes superiores
    for (let tx = dragX - 32; tx <= dragX + 24; tx += 8) {
      ctx.beginPath();
      ctx.moveTo(tx, dragY + 62);
      ctx.lineTo(tx + 4, dragY + 76);
      ctx.lineTo(tx + 8, dragY + 62);
      ctx.fill();
    }
    // Presas inferiores curvadas para cima
    ctx.beginPath();
    ctx.moveTo(dragX - 26, dragY + 98);
    ctx.lineTo(dragX - 22, dragY + 80);
    ctx.lineTo(dragX - 16, dragY + 98);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(dragX + 16, dragY + 98);
    ctx.lineTo(dragX + 22, dragY + 80);
    ctx.lineTo(dragX + 26, dragY + 98);
    ctx.fill();

    // Olhos Ameaçadores de Fogo Amarelo/Vermelho do Dragão
    ctx.fillStyle = '#ef4444'; // Vermelho fogo
    ctx.fillRect(dragX - 28, dragY + 30, 16, 7);
    ctx.fillRect(dragX + 12, dragY + 30, 16, 7);
    ctx.fillStyle = '#fef08a'; // Centro amarelo brilhante
    ctx.fillRect(dragX - 24, dragY + 32, 10, 3);
    ctx.fillRect(dragX + 14, dragY + 32, 10, 3);

    // 4. 🎢 TRILHOS E PASSARELA DA MONTANHA-RUSSA ENTRANDO NA BOCA DO DRAGÃO
    const trackY = h * 0.52;

    // Treliça/Vigas brancas da montanha-russa (Trestles em X)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let rx = 180; rx < w; rx += 28) {
      ctx.beginPath();
      ctx.moveTo(rx, trackY + 12);
      ctx.lineTo(rx + 28, h);
      ctx.moveTo(rx + 28, trackY + 12);
      ctx.lineTo(rx, h);
      ctx.stroke();
    }

    // Trilhos Vermelhos do Carrinho (Conforme Imagem 2)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(160, trackY + 8, w - 160, 6);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(160, trackY + 14, w - 160, 3);

    // 5. SOLO DA PLATAFORMA / COLINA DO PARQUE (Y: h*0.6 a h)
    const floorGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    floorGrad.addColorStop(0, '#15803d'); // Grama verde da colina
    floorGrad.addColorStop(0.4, '#166534');
    floorGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.55, 180, h * 0.45);

    // Escadarias de Acesso da Plataforma na Esquerda
    ctx.fillStyle = '#e2e8f0';
    for (let st = h * 0.58; st < h; st += 12) {
      ctx.fillRect(20, st, 120, 4);
    }
  });
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
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

/** Cenário: Planalto Central (Brasília - Congresso Nacional, Cúpulas, Rampa e Espelho d'Água) */
export function getPlanaltoBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_planalto', w, h, (ctx) => {
    // 1. Céu Azul Vibrante do Cerrado de Brasília
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.5, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.6);

    // Nuvens Volumosas e Brancas (Cumulus do Planalto)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const drawCloud = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.8, cy - r * 0.3, r * 0.75, 0, Math.PI * 2);
      ctx.arc(cx + r * 1.5, cy, r * 0.85, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.7, cy + r * 0.1, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCloud(60, 45, 22);
    drawCloud(190, 35, 28);
    drawCloud(340, 40, 25);
    drawCloud(460, 50, 20);

    // 2. CONGRESSO NACIONAL - AS DUAS TORRES GÊMEAS VERTICAIS
    const towerW = 20;
    const towerH = 110;
    const towerX1 = w * 0.41;
    const towerX2 = towerX1 + towerW + 8;
    const towerY = h * 0.14;

    // Sombra suave atrás das torres
    ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
    ctx.fillRect(towerX1 - 2, towerY, towerW * 2 + 12, towerH);

    // Torre 1 (Esquerda)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(towerX1, towerY, towerW, towerH);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(towerX1 + towerW - 3, towerY, 3, towerH);

    // Torre 2 (Direita)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(towerX2, towerY, towerW, towerH);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(towerX2 + towerW - 3, towerY, 3, towerH);

    // Janelas das Torres em Linhas Horizontais
    ctx.fillStyle = '#475569';
    for (let y = towerY + 6; y < towerY + towerH - 6; y += 7) {
      ctx.fillRect(towerX1 + 3, y, towerW - 6, 2.5);
      ctx.fillRect(towerX2 + 3, y, towerW - 6, 2.5);
    }

    // Passarela Central de Conexão entre as Torres
    ctx.fillStyle = '#64748b';
    ctx.fillRect(towerX1 + towerW, towerY + towerH * 0.45, 8, 14);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(towerX1 + towerW + 1, towerY + towerH * 0.45 + 3, 6, 8);

    // Mastro com a Bandeira do Brasil atrás das Torres
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(towerX2 + 18, towerY + towerH);
    ctx.lineTo(towerX2 + 18, towerY + 15);
    ctx.stroke();

    ctx.fillStyle = '#16a34a';
    ctx.fillRect(towerX2 + 18, towerY + 15, 16, 10);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(towerX2 + 26, towerY + 16);
    ctx.lineTo(towerX2 + 32, towerY + 20);
    ctx.lineTo(towerX2 + 26, towerY + 24);
    ctx.lineTo(towerX2 + 20, towerY + 20);
    ctx.fill();

    // 3. EDIFÍCIO DA BASE / LAJE DO CONGRESSO
    const baseW = w * 0.88;
    const baseX = (w - baseW) / 2;
    const baseY = h * 0.52;
    const baseH = 22;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(baseX, baseY, baseW, baseH);
    ctx.fillStyle = '#1e293b';
    // Vidraça da fachada do Congresso
    for (let gx = baseX + 8; gx < baseX + baseW - 8; gx += 10) {
      ctx.fillRect(gx, baseY + 6, 7, baseH - 8);
    }

    // 4. CÚPULA CONVEXA (SENADO FEDERAL - ESQUERDA)
    const cupola1X = w * 0.22;
    const cupola1Y = baseY;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cupola1X, cupola1Y + 2, 42, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. CÚPULA CÔNCAVA (CÂMARA DOS DEPUTADOS - PRATO PRA CIMA NA DIREITA)
    const cupola2X = w * 0.76;
    const cupola2Y = baseY + 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cupola2X, cupola2Y, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Corpo cônico do prato da câmara
    ctx.beginPath();
    ctx.moveTo(cupola2X - 52, cupola2Y);
    ctx.quadraticCurveTo(cupola2X, cupola2Y + 24, cupola2X + 52, cupola2Y);
    ctx.lineTo(cupola2X + 32, cupola2Y + 12);
    ctx.quadraticCurveTo(cupola2X, cupola2Y + 28, cupola2X - 32, cupola2Y + 12);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // 6. RAMPA MONUMENTAL CENTRAL
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(w * 0.44, baseY + baseH);
    ctx.lineTo(w * 0.34, h * 0.72);
    ctx.lineTo(w * 0.42, h * 0.72);
    ctx.lineTo(w * 0.50, baseY + baseH);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // 7. ESPELHO D'ÁGUA EM FRENTE AO CONGRESSO
    const waterGrad = ctx.createLinearGradient(0, h * 0.60, 0, h * 0.74);
    waterGrad.addColorStop(0, '#0284c7');
    waterGrad.addColorStop(0.5, '#38bdf8');
    waterGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(baseX + 10, h * 0.62, baseW - 20, 20);

    // Reflexo sutil das torres no espelho d'água
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(towerX1 + 4, h * 0.62, towerW * 2 + 2, 18);
    for (let r = h * 0.64; r < h * 0.80; r += 5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(baseX + 30, r);
      ctx.lineTo(baseX + baseW - 30, r);
      ctx.stroke();
    }

    // 8. GRAMADO VERDE VIBRANTE DA ESPLANADA DOS MINISTÉRIOS (Piso de Combate)
    const lawnGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
    lawnGrad.addColorStop(0, '#22c55e');
    lawnGrad.addColorStop(0.3, '#16a34a');
    lawnGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = lawnGrad;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Textura de grama aparada em faixas
    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
    for (let lx = 0; lx < w; lx += 40) {
      ctx.fillRect(lx, h * 0.72, 20, h * 0.28);
    }
  });
}


