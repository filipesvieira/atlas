/** Renderers de herói. O HeroRegistry decide qual implementação usar por chave/alias. */

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
// 2. SPRITES DE HEROIS & VOCAÇÕES (48×48px)
// ───────────────────────────────────────────────────────────────────────────

/** Sprite do Herói Guerreiro / Cavaleiro Templário (Armadura de Placas, Elmo Fechado, Espada de Aço, Escudo Cruzado e Capa Vermelha - Imagem 1) */
export function getKnightSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_knight', size, size, (ctx) => {
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

    // 5. Espada Longa de Aço Arming Sword na Mão Direita (Totalmente visível e detalhada)
    // Manopla de Aço segurando o punho
    ctx.fillStyle = '#64748b';
    ctx.fillRect(size / 2 + 9, 20, 6, 6);

    // Cabo de Couro e Pomo Dourado
    ctx.fillStyle = '#451a03'; // Empunhadura
    ctx.fillRect(size / 2 + 11, 21, 3, 7);
    ctx.fillStyle = '#fbbf24'; // Pomo esférico
    ctx.beginPath();
    ctx.arc(size / 2 + 12.5, 29, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Guarda Cruzada Dourada (Crossguard)
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(size / 2 + 7, 19, 12, 3);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(size / 2 + 11, 18, 4, 1);

    // Lâmina Longa de Aço Forjado (Empunhada em prontidão de combate)
    ctx.fillStyle = '#e2e8f0'; // Aço prateado polido
    ctx.beginPath();
    ctx.moveTo(size / 2 + 10, 19);
    ctx.lineTo(size / 2 + 16, 4);
    ctx.lineTo(size / 2 + 19, 4);
    ctx.lineTo(size / 2 + 14, 19);
    ctx.closePath();
    ctx.fill();

    // Ponta afiada chanfrada
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(size / 2 + 16, 4);
    ctx.lineTo(size / 2 + 17.5, 1.5);
    ctx.lineTo(size / 2 + 19, 4);
    ctx.closePath();
    ctx.fill();

    // Filo de corte brilhante (Reflexo de luz)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(size / 2 + 12, 18);
    ctx.lineTo(size / 2 + 17.5, 3);
    ctx.stroke();

    // Sulco Central de Alívio (Fuller)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2 + 12, 18);
    ctx.lineTo(size / 2 + 16.5, 5);
    ctx.stroke();

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
export function getMageSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_mage', size, size, (ctx) => {
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
export function getArcherSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_archer', size, size, (ctx) => {
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

/** Sprite do Herói Andarilho / Caminhante / Civil (Jaqueta Vermelha com Capuz, Calça Jeans, Botas de Trilha e Grande Mochila de Trekking com Esteira, Cantil e Corda - Imagem 1) */
export function getWandererSprite(size = 48): HTMLCanvasElement {
  return getOffscreenCanvas('sprite_wanderer', size, size, (ctx) => {
    // Sombra projetada
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 4, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. GRANDE MOCHILA DE EXPEDIÇÃO / TREKKING NAS COSTAS (Verde Oliva / Cáqui com Utilitários)
    const bagX = size / 2 - 18;
    const bagY = 6;
    const bagW = 14;
    const bagH = 26;

    // Corpo Principal da Mochila
    ctx.fillStyle = '#14532d'; // Verde floresta escuro base
    ctx.beginPath();
    ctx.roundRect(bagX, bagY, bagW, bagH, 4);
    ctx.fill();

    ctx.fillStyle = '#166534'; // Placa frontal/bolso principal
    ctx.fillRect(bagX + 2, bagY + 4, bagW - 4, bagH - 8);

    // Esteira / Isolante Térmico enrolado no topo da mochila (Azul Escuro com tiras pretas)
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.roundRect(bagX - 1, bagY - 4, bagW + 2, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a'; // Tiras pretas de fixação
    ctx.fillRect(bagX + 2, bagY - 4, 2, 5);
    ctx.fillRect(bagX + bagW - 4, bagY - 4, 2, 5);

    // Cantil / Garrafa de Água na lateral
    ctx.fillStyle = '#38bdf8'; // Garrafa azul claro
    ctx.fillRect(bagX - 3, bagY + 10, 4, 8);
    ctx.fillStyle = '#0f172a'; // Tampa
    ctx.fillRect(bagX - 2, bagY + 8, 2, 2);

    // Kit de Primeiros Socorros Vermelho na lateral superior
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(bagX - 4, bagY + 2, 5, 5);
    ctx.fillStyle = '#ffffff'; // Cruz branca
    ctx.fillRect(bagX - 2, bagY + 3, 1, 3);
    ctx.fillRect(bagX - 3, bagY + 4, 3, 1);

    // Feixe de Corda de Escalada no bolso frontal
    ctx.fillStyle = '#d97706'; // Terracota / Cânhamo
    ctx.fillRect(bagX + 4, bagY + 7, 6, 10);
    ctx.fillStyle = '#b45309';
    for (let ry = bagY + 8; ry < bagY + 16; ry += 2) {
      ctx.fillRect(bagX + 4, ry, 6, 1);
    }

    // Mosquetões e fivelas de aço penduradas na base
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(bagX + 2, bagY + bagH - 2, 3, 3);
    ctx.fillRect(bagX + 7, bagY + bagH - 2, 3, 3);

    // 2. PERNAS, CALÇA JEANS E BOTAS DE CAMINHADA
    ctx.fillStyle = '#1e293b'; // Calça jeans escuro
    ctx.fillRect(size / 2 - 7, 26, 5, 14);
    ctx.fillRect(size / 2 + 2, 26, 5, 14);

    // Botas de Trilha Marrons Robustas com Solado Escuro
    ctx.fillStyle = '#78350f'; // Couro marrom
    ctx.fillRect(size / 2 - 8, 38, 6, 6);
    ctx.fillRect(size / 2 + 1, 38, 6, 6);
    ctx.fillStyle = '#451a03'; // Solado tratorado
    ctx.fillRect(size / 2 - 9, 42, 8, 2);
    ctx.fillRect(size / 2 + 1, 42, 8, 2);
    ctx.fillStyle = '#fef3c7'; // Cadarços
    ctx.fillRect(size / 2 - 7, 39, 4, 1);
    ctx.fillRect(size / 2 + 2, 39, 4, 1);

    // 3. TRONCO: JAQUETA VERMELHA VIVA ESPORTIVA COM ZÍPER E GOLA (Imagem 1)
    ctx.fillStyle = '#dc2626'; // Vermelho vivo
    ctx.fillRect(size / 2 - 8, 14, 16, 13);
    ctx.fillStyle = '#b91c1c'; // Sombra da jaqueta
    ctx.fillRect(size / 2 - 8, 22, 16, 5);

    // Gola e Zíper Central
    ctx.fillStyle = '#ef4444'; // Gola/capuz rebatido
    ctx.fillRect(size / 2 - 6, 12, 12, 3);
    ctx.fillStyle = '#1e293b'; // Camiseta escura sob o zíper
    ctx.fillRect(size / 2 - 2, 14, 4, 3);
    ctx.fillStyle = '#f8fafc'; // Linha prateada do zíper
    ctx.fillRect(size / 2 - 1, 16, 2, 10);

    // Alças da Mochila nos Ombros
    ctx.fillStyle = '#15803d';
    ctx.fillRect(size / 2 - 7, 14, 3, 11);
    ctx.fillRect(size / 2 + 4, 14, 3, 11);

    // Fivela Peitoral das Alças
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(size / 2 - 4, 19, 8, 2);

    // 4. CABEÇA, ROSTO AMIGÁVEL E CABELO CASTANHO MODERNO
    ctx.fillStyle = '#fed7aa'; // Tom de pele clara natural
    ctx.fillRect(size / 2 - 5, 6, 10, 8);

    // Olhos Expressivos e Sorriso
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(size / 2, 8, 2, 2);
    ctx.fillStyle = '#b45309'; // Sorriso sutil
    ctx.fillRect(size / 2 - 1, 12, 4, 1);

    // Cabelo Castanho Estiloso
    ctx.fillStyle = '#451a03'; // Cabelo escuro
    ctx.fillRect(size / 2 - 6, 3, 12, 5);
    ctx.fillRect(size / 2 - 6, 5, 2, 4); // Mecha lateral
    ctx.fillStyle = '#78350f'; // Brilho no topo do cabelo
    ctx.fillRect(size / 2 - 3, 3, 7, 2);

    // 5. BRAÇOS E MÃOS SEGURANDO AS ALÇAS DA MOCHILA (Postura de Caminhada Confortável)
    ctx.fillStyle = '#dc2626'; // Mangas da jaqueta
    ctx.fillRect(size / 2 - 9, 15, 3, 8);
    ctx.fillRect(size / 2 + 6, 15, 3, 8);

    // Mãos segurando as alças
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(size / 2 - 8, 20, 4, 4);
    ctx.fillRect(size / 2 + 4, 20, 4, 4);
  });
}

