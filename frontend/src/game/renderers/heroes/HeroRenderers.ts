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

