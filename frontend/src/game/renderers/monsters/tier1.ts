import type { MonsterVisualDefinition, MonsterRenderOptions } from '../../registries/MonsterRegistry';
import { drawMonsterShadow } from './common';

export const tier1MonsterVisuals: MonsterVisualDefinition[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // BIOMA 1: FLORESTA SOMBRIA (TIER 1) - VISUAIS FIÉIS ÀS IMAGENS DE REFERÊNCIA
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 1. Goblin da Floresta (Imagem 2 de Referência)
   * Pele verde-oliva rugosa, barriga redonda proeminente (potbelly) com umbigo,
   * tanga de peles rasgadas marrom-ocre, orelhas gigantes pontudas caídas com interior rosado,
   * nariz bulboso arredondado, olhos vermelhos cansados, boca caída com presas inferiores,
   * pés descalços com dedões grossos e empunhando lança rústica de madeira com ponta de osso.
   */
  {
    key: 'forest_goblin',
    biomeKey: 'forest',
    aliases: ['goblin'],
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 120) * 3;
      const breathe = Math.sin(time / 400) * 0.7;
      const cx = size / 2;
      const isAttacking = Boolean(opts.isAttacking || /attack|cast|skill/i.test(opts.state || ''));
      const attackPulse = isAttacking ? 0.5 + Math.sin(time / 115) * 0.5 : 0;

      drawMonsterShadow(ctx, size);

      // 1. Perninhas Curtas e Pés Descalços com Dedões e Unhas (Passos Alternados)
      // Perna Traseira (Esquerda)
      ctx.fillStyle = '#4d7c0f'; // Verde oliva sombra
      ctx.fillRect(cx - 9 - walkStep, 32, 5, 9);
      ctx.fillStyle = '#65a30d'; // Pé descalço
      ctx.fillRect(cx - 12 - walkStep, 39, 8, 4);
      ctx.fillStyle = '#fef3c7'; // Dedões e unhas
      ctx.fillRect(cx - 13 - walkStep, 41, 3, 2);

      // Perna Dianteira (Direita)
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(cx + 3 + walkStep, 32, 5, 9);
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(cx + 1 + walkStep, 39, 8, 4);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx + 7 + walkStep, 41, 3, 2);

      // 2. Saiote / Tanga de Peles e Trapos Rasgados Marrom-Ocre
      ctx.fillStyle = '#78350f'; // Couro marrom
      ctx.beginPath();
      ctx.moveTo(cx - 11, 28 + breathe);
      ctx.lineTo(cx + 11, 28 + breathe);
      ctx.lineTo(cx + 9, 36);
      ctx.lineTo(cx + 4, 33);
      ctx.lineTo(cx, 37);
      ctx.lineTo(cx - 5, 33);
      ctx.lineTo(cx - 9, 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d97706'; // Farrapos ocre
      ctx.fillRect(cx - 8, 29 + breathe, 16, 2.5);
      ctx.fillStyle = '#fef3c7'; // Pedaço de pele clara desfiada
      ctx.fillRect(cx - 6, 31 + breathe, 4, 3);

      // 3. Barrigão Redondo Proeminente (Potbelly) e Torso Verde Oliva
      ctx.fillStyle = '#4d7c0f'; // Sombra torso
      ctx.beginPath();
      ctx.ellipse(cx, 22 + breathe, 11, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#65a30d'; // Barrigão verde oliva
      ctx.beginPath();
      ctx.ellipse(cx - 1, 23 + breathe, 10, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#84cc16'; // Destaque na pança
      ctx.beginPath();
      ctx.ellipse(cx - 2, 22 + breathe, 6.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Umbigo marcado no centro da barriga
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.arc(cx - 1, 25 + breathe, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // 4. Cabeça Verde Achatada, Orelhas Gigantes e Rosto Ranzinza
      // Orelhas gigantes pontudas caídas para os lados
      // Orelha Esquerda
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.moveTo(cx - 6, 12 + breathe);
      ctx.lineTo(cx - 21, 6 + breathe);
      ctx.lineTo(cx - 8, 17 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fda4af'; // Interior rosado
      ctx.beginPath();
      ctx.moveTo(cx - 8, 12 + breathe);
      ctx.lineTo(cx - 18, 8 + breathe);
      ctx.lineTo(cx - 9, 15 + breathe);
      ctx.closePath();
      ctx.fill();

      // Orelha Direita
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.moveTo(cx + 6, 12 + breathe);
      ctx.lineTo(cx + 21, 6 + breathe);
      ctx.lineTo(cx + 8, 17 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.moveTo(cx + 8, 12 + breathe);
      ctx.lineTo(cx + 18, 8 + breathe);
      ctx.lineTo(cx + 9, 15 + breathe);
      ctx.closePath();
      ctx.fill();

      // Cabeça
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.ellipse(cx, 13 + breathe, 9, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sobrancelhas grossas caídas
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cx - 7, 9 + breathe, 5, 1.8);
      ctx.fillRect(cx + 2, 9 + breathe, 5, 1.8);

      // Olhos vermelhos com piscada irregular, como no Camponês.
      const blinkPhase = (time + 500) % 4200;
      const blinking = blinkPhase < 125 || (blinkPhase > 175 && blinkPhase < 220);
      if (blinking) {
        ctx.fillStyle = '#365314';
        ctx.fillRect(cx - 6, 11.5 + breathe, 3.5, 1.5);
        ctx.fillRect(cx + 2.5, 11.5 + breathe, 3.5, 1.5);
      } else {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 6, 11 + breathe, 3.5, 2.2);
        ctx.fillRect(cx + 2.5, 11 + breathe, 3.5, 2.2);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(cx - 6, 10.5 + breathe, 3.5, 1);
        ctx.fillRect(cx + 2.5, 10.5 + breathe, 3.5, 1);
      }

      // Nariz bulboso e grande bem arredondado
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(cx, 14 + breathe, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(cx - 1.5, 16 + breathe, 3, 1);

      // Boca abre durante a investida e fala/rosna em repouso.
      const mouthOpen = isAttacking || Math.sin(time / 310) > 0.35;
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cx - 4, 17.5 + breathe, 8, mouthOpen ? 4 : 1.5);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - 3, 16 + breathe, 1.5, 2);
      ctx.fillRect(cx + 1.5, 16 + breathe, 1.5, 2);
      if (mouthOpen) {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 2, 20 + breathe, 4, 1);
      }

      // 5. Braço Direito Empunhando Lança Rústica de Madeira com Ponta de Osso
      const spearSway = Math.sin(time / 180) * 1.5 + attackPulse * 3.5;
      const spearX = cx - 14 + attackPulse * 5;
      const spearTipY = 2 - attackPulse * 4;

      // Haste de madeira retorcida
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(spearX + spearSway, spearTipY + 1);
      ctx.lineTo(spearX - spearSway * 0.5, 42);
      ctx.stroke();

      // Amarração de corda/couro
      ctx.fillStyle = '#d97706';
      ctx.fillRect(spearX - 2 + spearSway, 9, 4, 3);

      // Ponta afiada de osso/pedra lascada
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(spearX + spearSway, spearTipY);
      ctx.lineTo(spearX + 3 + spearSway, 9 - attackPulse * 2);
      ctx.lineTo(spearX - 3 + spearSway, 9 - attackPulse * 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cbd5e1'; // Sombra na lâmina
      ctx.fillRect(spearX - 1 + spearSway, 5, 2, 4);

      // Mão do goblin segurando a haste
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.arc(spearX + spearSway * 0.2, 23 + breathe, 3, 0, Math.PI * 2);
      ctx.fill();

      // Braço esquerdo na cintura
      ctx.beginPath();
      ctx.arc(cx + 10, 24 + breathe, 2.8, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  /**
   * 2. Lobo da Floresta (Imagem 1 de Referência)
   * Lobo cinzento realista com pelagem em camadas (manto dorsal cinza chumbo/ardósia,
   * flancos prateados, peito e queixo brancos, focinho afilado com trufa preta,
   * olhos dourados/âmbar penetrantes, orelhas pontudas e 4 patas articuladas com passadas).
   */
  {
    key: 'forest_wolf',
    biomeKey: 'forest',
    aliases: ['lobo'],
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 110) * 3.5;
      const breathe = Math.sin(time / 450) * 0.8;
      const tailSway = Math.sin(time / 200) * 2.5;
      const cx = size / 2;
      const isAttacking = Boolean(opts.isAttacking || /attack|cast|skill/i.test(opts.state || ''));

      drawMonsterShadow(ctx, size);

      // 1. Cauda Felpuda Cinza Escura (Balança com a caminhada)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(cx + 12, 20 + breathe);
      ctx.quadraticCurveTo(cx + 20 + tailSway, 22 + breathe, cx + 18 + tailSway, 33);
      ctx.lineTo(cx + 14 + tailSway, 33);
      ctx.quadraticCurveTo(cx + 15, 24 + breathe, cx + 9, 23 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cbd5e1'; // Ponta da cauda clara
      ctx.fillRect(cx + 15 + tailSway, 30, 4, 3);

      // 2. 4 Patas Articuladas com Passos Alternados
      // Patas Traseira e Dianteira do Fundo (Esquerda)
      ctx.fillStyle = '#334155'; // Pata traseira fundo
      ctx.fillRect(cx + 9 - walkStep * 0.8, 25, 4.5, 16);
      ctx.fillStyle = '#f8fafc'; // Pata branca
      ctx.fillRect(cx + 9 - walkStep * 0.8, 39, 5, 3);
      ctx.fillStyle = '#0f172a'; // Garras
      ctx.fillRect(cx + 8 - walkStep * 0.8, 41, 2, 1.5);

      ctx.fillStyle = '#475569'; // Pata dianteira fundo
      ctx.fillRect(cx - 7 - walkStep * 0.8, 24, 4.5, 17);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 8 - walkStep * 0.8, 39, 5, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 9 - walkStep * 0.8, 41, 2, 1.5);

      // 3. Tronco e Lombo com Pelagem em Camadas (Manto Grafite + Flancos Prateados)
      // Lombo escuro
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(cx - 12, 16 + breathe, 24, 11, 4);
      ctx.fill();

      // Flanco cinza ardósia
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(cx - 13, 18 + breathe, 24, 9, 3);
      ctx.fill();

      // Flanco cinza prateado
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cx - 12, 21 + breathe, 22, 5);

      // Barriga e peito branco marfim
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(cx - 11, 24 + breathe, 20, 4.5, 2);
      ctx.fill();

      // Juba felpuda no peito
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(cx - 11, 16 + breathe);
      ctx.lineTo(cx - 16, 23 + breathe);
      ctx.lineTo(cx - 8, 25 + breathe);
      ctx.closePath();
      ctx.fill();

      // 4. Patas Traseira e Dianteira da Frente (Direita)
      ctx.fillStyle = '#475569'; // Pata traseira frente
      ctx.fillRect(cx + 4 + walkStep * 0.8, 24, 5, 17);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx + 4 + walkStep * 0.8, 39, 5.5, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx + 3 + walkStep * 0.8, 41, 2, 1.5);

      ctx.fillStyle = '#64748b'; // Pata dianteira frente
      ctx.fillRect(cx - 13 + walkStep * 0.8, 23, 5, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 14 + walkStep * 0.8, 39, 6, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 15 + walkStep * 0.8, 41, 2, 1.5);

      // 5. Cabeça de Lobo Realista, Orelhas Pontudas e Focinho
      // Orelhas eretas com interior felpudo
      ctx.fillStyle = '#1e293b'; // Orelha traseira
      ctx.beginPath();
      ctx.moveTo(cx - 10, 8 + breathe);
      ctx.lineTo(cx - 7, 2 + breathe);
      ctx.lineTo(cx - 4, 9 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 8, 4 + breathe, 2.5, 4);

      ctx.fillStyle = '#334155'; // Orelha dianteira
      ctx.beginPath();
      ctx.moveTo(cx - 16, 8 + breathe);
      ctx.lineTo(cx - 13, 1 + breathe);
      ctx.lineTo(cx - 9, 9 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 14, 3 + breathe, 3, 5);

      // Cabeça em camadas
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(cx - 12, 13 + breathe, 8, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cx - 16, 11 + breathe, 7, 7);

      // Bochechas peludas prateadas
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(cx - 10, 14 + breathe);
      ctx.lineTo(cx - 14, 18 + breathe);
      ctx.lineTo(cx - 9, 18 + breathe);
      ctx.closePath();
      ctx.fill();

      // Focinho afilado com laterais brancas
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 21, 14 + breathe, 8, 5);
      ctx.fillStyle = '#475569'; // Ponte do focinho
      ctx.fillRect(cx - 19, 13 + breathe, 6, 2);

      // Trufa do nariz preta
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx - 21, 14 + breathe);
      ctx.lineTo(cx - 23, 15.5 + breathe);
      ctx.lineTo(cx - 21, 17 + breathe);
      ctx.closePath();
      ctx.fill();

      // Olhos amendoados dourados/âmbar com pupila
      const blinkPhase = (time + 1250) % 4700;
      const blinking = blinkPhase < 120 || (blinkPhase > 165 && blinkPhase < 210);
      if (blinking) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 15, 11.5 + breathe, 4, 1.5);
      } else {
        ctx.fillStyle = '#f59e0b'; // Âmbar penetrante
        ctx.beginPath();
        ctx.ellipse(cx - 13, 11 + breathe, 2.2, 1.6, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000'; // Pupila
        ctx.fillRect(cx - 13.5, 10.5 + breathe, 1.2, 1.2);
        ctx.fillStyle = '#ffffff'; // Brilho
        ctx.fillRect(cx - 14, 10 + breathe, 0.8, 0.8);
      }

      // Focinho abre e fecha em rosnado; durante o ataque a mandíbula fica
      // aberta por mais tempo para reforçar a leitura de ação.
      const mouthOpen = isAttacking || Math.sin(time / 280) > 0.45;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 20, 18 + breathe, 6, mouthOpen ? 4 : 1.5);
      if (mouthOpen) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx - 19, 18 + breathe, 2, 1.5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 18, 21 + breathe, 3, 1);
      }
    },
  },

  /**
   * 3. Aranha da Floresta (Imagem 3 de Referência - Viúva Negra)
   * Exoesqueleto de quitina preto lustroso, abdômen bulboso preto com marcante
   * ampulheta / mancha vermelho-carmim vibrante no dorso, olhos vermelhos em grupo,
   * quelíceras venenosas e 8 patas longas articuladas com onda de caminhada rastejante.
   */
  {
    key: 'forest_spider',
    biomeKey: 'forest',
    aliases: ['aranha'],
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const breathe = Math.sin(time / 380) * 0.7;
      const cx = size / 2;
      const isAttacking = Boolean(opts.isAttacking || /attack|cast|skill/i.test(opts.state || ''));

      drawMonsterShadow(ctx, size);

      // 1. 8 Patas Articuladas com Onda Rastejante de Aracnídeo
      // 4 Patas do Lado Esquerdo e 4 Patas do Lado Direito
      const legAngles = [
        { dx: -18, dy: -12, kneeY: -16, footX: -22, footY: 10, phase: 0 },
        { dx: -14, dy: -14, kneeY: -18, footX: -19, footY: 14, phase: 1.2 },
        { dx: -8, dy: -12, kneeY: -15, footX: -14, footY: 18, phase: 2.4 },
        { dx: -4, dy: -8, kneeY: -11, footX: -9, footY: 20, phase: 3.6 },
        { dx: 4, dy: -8, kneeY: -11, footX: 9, footY: 20, phase: 0.6 },
        { dx: 8, dy: -12, kneeY: -15, footX: 14, footY: 18, phase: 1.8 },
        { dx: 14, dy: -14, kneeY: -18, footX: 19, footY: 14, phase: 3.0 },
        { dx: 18, dy: -12, kneeY: -16, footX: 22, footY: 10, phase: 4.2 },
      ];

      legAngles.forEach((leg, i) => {
        const wave = Math.sin(time / 130 + leg.phase) * 3;
        const rootX = cx + (i < 4 ? -4 : 4);
        const rootY = 22 + breathe;
        const kneeX = cx + leg.dx + (i < 4 ? -wave * 0.5 : wave * 0.5);
        const kneeY = rootY + leg.kneeY - Math.abs(wave) * 0.8;
        const footX = cx + leg.footX;
        const footY = 41 + Math.max(0, wave);

        // Segmento 1: Fêmur (Preto quitina com junta vermelha escura)
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.lineTo(kneeX, kneeY);
        ctx.stroke();

        // Junta / Joelho avermelhado
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(kneeX - 1, kneeY - 1, 2.5, 2.5);

        // Segmento 2: Tíbia & Tarso descendo até o solo
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();
      });

      // 2. Abdômen Bulboso Preto Lustroso (Gota volumosa)
      ctx.fillStyle = '#09090b'; // Preto obsidiana profundo
      ctx.beginPath();
      ctx.ellipse(cx + 5, 21 + breathe, 12, 13, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Reflexo curvo de quitina polida
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx + 8, 18 + breathe, 9, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();

      // 3. A Emblemática Mancha / Ampulheta Vermelho-Carmim Vibrante
      ctx.fillStyle = '#dc2626'; // Vermelho vibrante
      ctx.beginPath();
      // Triângulo superior da ampulheta
      ctx.moveTo(cx + 3, 14 + breathe);
      ctx.lineTo(cx + 9, 14 + breathe);
      ctx.lineTo(cx + 6, 20 + breathe);
      ctx.closePath();
      ctx.fill();
      // Triângulo inferior da ampulheta
      ctx.beginPath();
      ctx.moveTo(cx + 6, 20 + breathe);
      ctx.lineTo(cx + 10, 27 + breathe);
      ctx.lineTo(cx + 2, 27 + breathe);
      ctx.closePath();
      ctx.fill();
      // Brilho escarlate central
      ctx.fillStyle = '#f87171';
      ctx.fillRect(cx + 5, 19 + breathe, 2, 3);

      // 4. Cefalotórax Preto e Quelíceras Frontais
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(cx - 7, 23 + breathe, 7.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(cx - 8, 21 + breathe, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Quelíceras / Presas frontais venenosas curvadas
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 12, 24 + breathe);
      ctx.lineTo(cx - 16, 28 + breathe);
      ctx.moveTo(cx - 10, 26 + breathe);
      ctx.lineTo(cx - 13, 30 + breathe);
      ctx.stroke();

      // Olhos múltiplos vermelhos piscam em conjunto, preservando a silhueta
      // ameaçadora sem exigir uma folha de sprites nova.
      const blinkPhase = (time + 2300) % 3900;
      const blinking = blinkPhase < 105 || (blinkPhase > 155 && blinkPhase < 200);
      if (blinking) {
        ctx.fillStyle = '#3f0b12';
        ctx.fillRect(cx - 13, 20.5 + breathe, 7, 1.5);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 12, 20 + breathe, 2, 2);
        ctx.fillRect(cx - 10, 19 + breathe, 2.2, 2.2);
        ctx.fillRect(cx - 13, 23 + breathe, 1.8, 1.8);
        ctx.fillRect(cx - 8, 20 + breathe, 1.8, 1.8);
        ctx.fillStyle = '#ffffff'; // Micro brilho nos olhos
        ctx.fillRect(cx - 10, 19 + breathe, 1, 1);
      }

      // Quelíceras e boca abrem durante o disparo venenoso ou em um ciclo
      // curto de ameaça quando a aranha está parada.
      const mouthOpen = isAttacking || Math.sin(time / 260) > 0.5;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(cx - 14, 26 + breathe, 6, mouthOpen ? 4 : 1.5);
      if (mouthOpen) {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 13, 28 + breathe, 4, 1);
      }
    },
  },

  /**
   * 4. Boss Ursinho da Floresta (Imagem 4 de Referência - Ursinho Zangado Azul)
   * Formato Boss 64px: Pelagem azul-celeste vibrante, orelhas redondas com interior branco,
   * topete, sobrancelhas arqueadas zangadas expressivas, olhos anime brilhantes, focinho branco
   * com nariz de coração azul-escuro, marcas de raio nas bochechas, círculo branco na barriga
   * com nuvem de tempestade despejando gotas e coração rosa, bracinhos com almofada de coração
   * e pezinhos com corações azuis nas solas e passos de boss!
   */
  {
    key: 'forest_boss_bear',
    biomeKey: 'forest',
    aliases: ['ursinho', 'ursinho_zangado'],
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 110) * 3.5;
      const breathe = Math.sin(time / 450) * 1.2;
      const cx = size / 2;
      const isAttacking = Boolean(opts.isAttacking || /attack|cast|skill/i.test(opts.state || ''));
      const armLift = isAttacking ? Math.sin(time / 140) * 5 : Math.sin(time / 520) * 1.2;
      const roarPhase = (time + 900) % 5200;
      const attackPulse = opts.isAttacking
        ? Math.sin(Math.max(0, Math.min(1, opts.attackProgress ?? 0)) * Math.PI)
        : 0;
      const roarPulse = attackPulse > 0.05
        ? attackPulse
        : roarPhase < 440 ? Math.sin((roarPhase / 440) * Math.PI) : 0;
      const roaring = isAttacking || roarPhase < 440;

      drawMonsterShadow(ctx, size);

      // 1. Pernas e Pezinhos com Almofadinhas de Coração Azul-Escuro (Passos de Boss)
      // Perna Esquerda
      ctx.fillStyle = '#0284c7'; // Azul sombra
      ctx.beginPath();
      ctx.roundRect(cx - 24 - walkStep, 40, 18, 19, 7);
      ctx.fill();
      ctx.fillStyle = '#38bdf8'; // Sola azul celeste
      ctx.beginPath();
      ctx.ellipse(cx - 15 - walkStep, 49, 7, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Coração Azul Marinho na sola esquerda
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(cx - 15 - walkStep, 47);
      ctx.arc(cx - 17 - walkStep, 46, 2.5, Math.PI, 0);
      ctx.arc(cx - 13 - walkStep, 46, 2.5, Math.PI, 0);
      ctx.lineTo(cx - 15 - walkStep, 52);
      ctx.closePath();
      ctx.fill();

      // Perna Direita
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(cx + 6 + walkStep, 40, 18, 19, 7);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(cx + 15 + walkStep, 49, 7, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Coração Azul Marinho na sola direita
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(cx + 15 + walkStep, 47);
      ctx.arc(cx + 13 + walkStep, 46, 2.5, Math.PI, 0);
      ctx.arc(cx + 17 + walkStep, 46, 2.5, Math.PI, 0);
      ctx.lineTo(cx + 15 + walkStep, 52);
      ctx.closePath();
      ctx.fill();

      // 2. Corpo Gordinho Fofo Azul Celeste
      ctx.fillStyle = '#0284c7'; // Sombra corpo
      ctx.beginPath();
      ctx.roundRect(cx - 20, 24 + breathe, 40, 27, 13);
      ctx.fill();
      ctx.fillStyle = '#38bdf8'; // Azul celeste vibrante
      ctx.beginPath();
      ctx.roundRect(cx - 18, 24 + breathe, 36, 25, 12);
      ctx.fill();

      // 3. Barriga Branca Circular com Emblema da Nuvem de Tempestade e Coração
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, 38 + breathe, 13, 0, Math.PI * 2);
      ctx.fill();

      // Nuvem azul marinho na barriga
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(cx - 4, 36 + breathe, 4.5, 0, Math.PI * 2);
      ctx.arc(cx + 4, 36 + breathe, 4.5, 0, Math.PI * 2);
      ctx.arc(cx, 33 + breathe, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 7, 36 + breathe, 14, 4);

      // 3 Gotas de chuva azuis
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx - 5, 42 + breathe, 1.8, 3);
      ctx.fillRect(cx + 4, 42 + breathe, 1.8, 3);

      // Coração Rosa no centro da chuva
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(cx, 42 + breathe);
      ctx.arc(cx - 1.5, 41 + breathe, 1.6, Math.PI, 0);
      ctx.arc(cx + 1.5, 41 + breathe, 1.6, Math.PI, 0);
      ctx.lineTo(cx, 45 + breathe);
      ctx.closePath();
      ctx.fill();

      // 4. Bracinhos Curtos Fofos com Almofadinhas de Coração
      // Braço Esquerdo
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(cx - 28, 28 + breathe - armLift, 12, 11, 5);
      ctx.fill();
      // Coração na palma esquerda
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(cx - 24, 32 + breathe - armLift, 2, 0, Math.PI * 2);
      ctx.fill();

      // Braço Direito
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(cx + 16, 28 + breathe + armLift, 12, 11, 5);
      ctx.fill();
      // Coração na palma direita
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(cx + 24, 32 + breathe + armLift, 2, 0, Math.PI * 2);
      ctx.fill();

      // 5. Cabeça Redonda, Topete, Orelhas com Interior Branco e Rosto Zangadinho
      // Orelha Esquerda
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx - 14, 8 + breathe, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff'; // Interior branco
      ctx.beginPath();
      ctx.arc(cx - 14, 8 + breathe, 4, 0, Math.PI * 2);
      ctx.fill();

      // Orelha Direita
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx + 14, 8 + breathe, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 14, 8 + breathe, 4, 0, Math.PI * 2);
      ctx.fill();

      // Cabeça
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(cx, 18 + breathe, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, 18 + breathe, 16, 0, Math.PI * 2);
      ctx.fill();

      // Topete de pelo azul no topo da cabeça
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(cx - 4, 3 + breathe);
      ctx.quadraticCurveTo(cx - 1, -2 + breathe, cx + 2, 3 + breathe);
      ctx.quadraticCurveTo(cx + 5, -1 + breathe, cx + 4, 5 + breathe);
      ctx.closePath();
      ctx.fill();

      // Sobrancelhas arqueadas zangadas pretas
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, 10 + breathe);
      ctx.lineTo(cx - 3, 14 + breathe);
      ctx.moveTo(cx + 10, 10 + breathe);
      ctx.lineTo(cx + 3, 14 + breathe);
      ctx.stroke();

      // Olhos anime grandes com piscada ocasional.
      const blinkPhase = (time + 2100) % 4600;
      const blinking = blinkPhase < 140 || (blinkPhase > 185 && blinkPhase < 235);
      if (blinking) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(cx - 10, 17 + breathe, 7, 2);
        ctx.fillRect(cx + 3, 17 + breathe, 7, 2);
      } else {
        // Olho Esquerdo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx - 6, 17 + breathe, 4.2, 5.2, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a'; // Pupila
        ctx.beginPath();
        ctx.ellipse(cx - 5.5, 17 + breathe, 3.2, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff'; // Brilho duplo de anime
        ctx.fillRect(cx - 7, 14.5 + breathe, 2, 2.2);
        ctx.fillRect(cx - 5, 18 + breathe, 1.2, 1.2);

        // Olho Direito
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx + 6, 17 + breathe, 4.2, 5.2, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(cx + 5.5, 17 + breathe, 3.2, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + 5, 14.5 + breathe, 2, 2.2);
        ctx.fillRect(cx + 7, 18 + breathe, 1.2, 1.2);
      }

      // Marcas de raio azul nas bochechas
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 13, 21 + breathe);
      ctx.lineTo(cx - 10, 20 + breathe);
      ctx.lineTo(cx - 8, 22 + breathe);
      ctx.moveTo(cx + 8, 22 + breathe);
      ctx.lineTo(cx + 10, 20 + breathe);
      ctx.lineTo(cx + 13, 21 + breathe);
      ctx.stroke();

      // Focinho branco ovalado
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx, 23 + breathe, 7.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nariz de Coração Azul Marinho
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(cx, 22 + breathe);
      ctx.arc(cx - 1.5, 21 + breathe, 1.8, Math.PI, 0);
      ctx.arc(cx + 1.5, 21 + breathe, 1.8, Math.PI, 0);
      ctx.lineTo(cx, 24.5 + breathe);
      ctx.closePath();
      ctx.fill();

      // Urro do boss: a mandíbula abre de forma visível, com dentes e língua;
      // o ciclo também ocorre fora do combate para a criatura não parecer uma
      // imagem parada. Durante o ataque, o urro é imediato.
      const mouthOpen = roaring;
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(cx - 6 - roarPulse, 27 + breathe, 12 + roarPulse * 2, mouthOpen ? 5 + roarPulse * 3 : 2);
      if (mouthOpen) {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(cx - 4 - roarPulse * 0.5, 27 + breathe, 8 + roarPulse, 2);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(cx - 3, 31 + breathe + roarPulse * 2, 6, 1 + roarPulse);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(cx - 25, 18 - roarPulse * 5, 3, 2);
        ctx.fillRect(cx + 22, 16 - roarPulse * 4, 3, 2);
      }
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // BIOMA 2: PÂNTANO DO SHEREQUE (TIER 1)
  // ───────────────────────────────────────────────────────────────────────────

  {
    key: 'shereque_ogre',
    biomeKey: 'shereque',
    aliases: ['ogre'],
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 110) * 3;
      const breathe = Math.sin(time / 450) * 0.8;
      const cx = size / 2;

      drawMonsterShadow(ctx, size);

      // Pernas grossas do Ogro com passos pesados.
      ctx.fillStyle = '#78350f'; // Calças
      ctx.fillRect(cx - 16 - walkStep, 36, 11, 8);
      ctx.fillRect(cx + 5 + walkStep, 36, 11, 8);
      ctx.fillStyle = '#451a03'; // Botas
      ctx.fillRect(cx - 18 - walkStep, 41, 13, 4);
      ctx.fillRect(cx + 5 + walkStep, 41, 13, 4);

      // Ombros e braços largos: a silhueta precisa comunicar um ogro pesado,
      // e não apenas um humano verde com colete.
      ctx.fillStyle = '#14532d';
      ctx.fillRect(cx - 23, 18 + breathe, 10, 18);
      ctx.fillRect(cx + 13, 18 + breathe, 10, 18);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(cx - 24, 23 + breathe, 10, 11);
      ctx.fillRect(cx + 14, 23 + breathe, 10, 11);
      ctx.fillRect(cx - 24, 31 + breathe, 8, 6);
      ctx.fillRect(cx + 18, 31 + breathe, 8, 6);

      // Tronco barrigudo com camisa clara e colete curto.
      ctx.fillStyle = '#14532d';
      ctx.fillRect(cx - 18, 17 + breathe, 36, 21);
      ctx.fillRect(cx - 15, 15 + breathe, 30, 25);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - 11, 19 + breathe, 22, 17);
      ctx.fillRect(cx - 14, 23 + breathe, 28, 11);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 17, 18 + breathe, 8, 19);
      ctx.fillRect(cx + 9, 18 + breathe, 8, 19);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(cx - 8, 20 + breathe, 16, 4);
      ctx.fillRect(cx - 8, 34 + breathe, 16, 3);

      // Cinto largo e barriga marcada.
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 18, 35 + breathe, 36, 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx - 5, 34 + breathe, 10, 6);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(cx - 2, 36 + breathe, 4, 2);

      // Cabeça larga, mandíbula marcada e orelhas de trompete.
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(cx, 12 + breathe, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 9, 6 + breathe, 18, 15);
      ctx.fillRect(cx - 11, 10 + breathe, 22, 8);

      // Orelhas de Ogro em Formato de Funil/Trompete
      ctx.fillStyle = '#15803d';
      ctx.fillRect(cx - 19, 7 + breathe, 8, 5);
      ctx.fillRect(cx - 21, 5 + breathe, 4, 8);
      ctx.fillRect(cx + 11, 7 + breathe, 8, 5);
      ctx.fillRect(cx + 17, 5 + breathe, 4, 8);

      // Olhos e boca animados: a expressão deixa de ser uma imagem congelada
      // sem perder a leitura simples da arte pixelada.
      const blinkPhase = (time + 650) % 4200;
      const blinking = blinkPhase < 130 || (blinkPhase > 170 && blinkPhase < 220);
      if (blinking) {
        ctx.fillStyle = '#14532d';
        ctx.fillRect(cx - 9, 11 + breathe, 6, 2);
        ctx.fillRect(cx + 3, 11 + breathe, 6, 2);
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx - 9, 9 + breathe, 6, 5);
        ctx.fillRect(cx + 3, 9 + breathe, 6, 5);
        ctx.fillStyle = '#052e16';
        ctx.fillRect(cx - 6, 10 + breathe, 2, 3);
        ctx.fillRect(cx + 4, 10 + breathe, 2, 3);
      }

      const mouthOpen = Math.sin(time / 280) > 0.35;
      ctx.fillStyle = '#14532d';
      ctx.fillRect(cx - 7, 17 + breathe, 14, mouthOpen ? 5 : 3);
      if (mouthOpen) {
        ctx.fillStyle = '#fefce8';
        ctx.fillRect(cx - 6, 17 + breathe, 12, 2);
        ctx.fillStyle = '#166534';
        ctx.fillRect(cx - 1, 16 + breathe, 2, 2);
      } else {
        ctx.fillStyle = '#86efac';
        ctx.fillRect(cx - 4, 16 + breathe, 8, 1);
      }
    },
  },
  {
    key: 'shereque_cookie',
    biomeKey: 'shereque',
    projectile: { color: '#f472b6', type: 'lollipop' },
    visualScale: 0.78,
    nameplateOffsetY: 54,
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 120) * 2.5;
      const breathe = Math.sin(time / 430) * 0.7;
      const cx = size / 2;
      const blinkPhase = (time + 1800) % 4300;
      const blinking = blinkPhase < 130 || (blinkPhase > 180 && blinkPhase < 225);
      const attackProgress = Math.max(0, Math.min(1, opts.attackProgress ?? 0));
      const castPulse = opts.isAttacking ? Math.sin(attackProgress * Math.PI) : 0;

      drawMonsterShadow(ctx, size);

      // Pernas curtas e separadas, com glacê nos tornozelos.
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(cx - 10 - walkStep, 36, 8, 9);
      ctx.fillRect(cx + 2 + walkStep, 36, 8, 9);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - 10 - walkStep, 40, 8, 2);
      ctx.fillRect(cx + 2 + walkStep, 40, 8, 2);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 12 - walkStep, 42, 10, 4);
      ctx.fillRect(cx + 2 + walkStep, 42, 10, 4);

      // Braços em posição levantada, como o boneco de biscoito da referência.
      ctx.fillStyle = '#431407';
      ctx.fillRect(cx - 21, 20 + breathe, 8, 8);
      ctx.fillRect(cx - 24, 16 + breathe, 7, 8);
      ctx.fillRect(cx + 13, 20 + breathe, 8, 8);
      ctx.fillRect(cx + 17, 16 + breathe, 7, 8);
      ctx.fillStyle = '#c66a24';
      ctx.fillRect(cx - 20, 20 + breathe, 6, 6);
      ctx.fillRect(cx - 22, 17 + breathe, 5, 6);
      ctx.fillRect(cx + 14, 20 + breathe, 6, 6);
      ctx.fillRect(cx + 17, 17 + breathe, 5, 6);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - 24, 16 + breathe, 4, 2);
      ctx.fillRect(cx + 20, 16 + breathe, 4, 2);

      // Corpo mais estreito que a cabeça, com cintura e borda de glacê.
      ctx.fillStyle = '#431407';
      ctx.fillRect(cx - 13, 21 + breathe, 26, 19);
      ctx.fillStyle = '#c66a24';
      ctx.fillRect(cx - 11, 22 + breathe, 22, 17);
      ctx.fillStyle = '#e09a45';
      ctx.fillRect(cx - 9, 23 + breathe, 7, 13);

      // Botões de açúcar e costura branca na cintura.
      ctx.fillStyle = '#9333ea';
      ctx.fillRect(cx - 3, 24 + breathe, 5, 5);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - 10, 35 + breathe, 20, 2);
      ctx.fillRect(cx - 8, 37 + breathe, 3, 2);
      ctx.fillRect(cx + 5, 37 + breathe, 3, 2);

      // Cabeça redonda e grande: o corpo fica propositalmente menor para a
      // leitura clássica de boneco de gengibre em pixel art.
      ctx.fillStyle = '#431407';
      ctx.beginPath();
      ctx.arc(cx, 13 + breathe, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9772a';
      ctx.beginPath();
      ctx.arc(cx, 13 + breathe, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1b35b';
      ctx.fillRect(cx - 8, 4 + breathe, 7, 4);

      if (blinking) {
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(cx - 8, 11 + breathe, 5, 2);
        ctx.fillRect(cx + 3, 11 + breathe, 5, 2);
      } else {
        ctx.fillStyle = '#fefce8';
        ctx.fillRect(cx - 8, 9 + breathe, 5, 5);
        ctx.fillRect(cx + 3, 9 + breathe, 5, 5);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(cx - 5, 10 + breathe, 2, 3);
        ctx.fillRect(cx + 3, 10 + breathe, 2, 3);
      }

      const smileOpen = Math.sin(time / 310) > 0.2;
      ctx.fillStyle = '#9f1239';
      ctx.fillRect(cx - 7, 16 + breathe, 14, smileOpen ? 4 : 2);
      if (smileOpen) {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(cx - 5, 16 + breathe, 10, 2);
      } else {
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(cx - 5, 16 + breathe, 10, 1);
      }

      // O cajado vem por último: fica à frente do corpo e usa a mão direita
      // como pivô, portanto acompanha o braço e ganha o arco de conjuração.
      const staffPivotX = cx + 21;
      const staffPivotY = 21 + breathe;
      ctx.save();
      ctx.translate(staffPivotX, staffPivotY);
      ctx.rotate(-0.44 + castPulse * 0.9);
      ctx.translate(-staffPivotX, -staffPivotY - castPulse * 4);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(staffPivotX, staffPivotY);
      ctx.lineTo(cx + 30, -13);
      ctx.stroke();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(staffPivotX + 1, staffPivotY - 1);
      ctx.lineTo(cx + 31, -12);
      ctx.stroke();

      // Pirulito grande para continuar legível apesar da escala menor do monstro.
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(cx + 30, -13, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(cx + 24, -17, 12, 4);
      ctx.fillRect(cx + 27, -13, 8, 4);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(cx + 28, -21, 5, 4);
      ctx.fillRect(cx + 33, -10, 4, 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx + 28, -14, 3, 3);
      ctx.restore();

      if (castPulse > 0.1) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx + 37, -19 - castPulse * 4, 2, 2);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(cx + 40, -13 - castPulse * 5, 2, 2);
      }
    },
  },
  {
    key: 'shereque_donkey',
    biomeKey: 'shereque',
    aliases: ['burro'],
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 110) * 3;
      const breathe = Math.sin(time / 450) * 0.8;
      const cx = size / 2;

      drawMonsterShadow(ctx, size);

      // 4 Patas no Chão com Cascos Escuros e Passadas
      ctx.fillStyle = '#475569'; // Pernas traseiras
      ctx.fillRect(cx - 12 - walkStep, 24, 5, 18);
      ctx.fillRect(cx + 6 + walkStep, 24, 5, 18);
      ctx.fillStyle = '#64748b'; // Pernas dianteiras
      ctx.fillRect(cx - 15 + walkStep, 24, 5, 18);
      ctx.fillRect(cx + 2 - walkStep, 24, 5, 18);
      ctx.fillStyle = '#1e293b'; // Cascos escuros
      ctx.fillRect(cx - 15 + walkStep, 38, 5, 4);
      ctx.fillRect(cx - 12 - walkStep, 38, 5, 4);
      ctx.fillRect(cx + 2 - walkStep, 38, 5, 4);
      ctx.fillRect(cx + 6 + walkStep, 38, 5, 4);

      // Corpo do Burro Cinza
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cx - 16, 16 + breathe, 26, 14);
      ctx.fillStyle = '#94a3b8'; // Brilho no lombo
      ctx.fillRect(cx - 14, 16 + breathe, 20, 4);
      ctx.fillStyle = '#cbd5e1'; // Barriga cinza claro
      ctx.fillRect(cx - 12, 26 + breathe, 18, 4);

      // Rabo Curvado com Tufo Negro
      const tailSway = Math.sin(time / 200) * 2;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + 10, 18 + breathe);
      ctx.quadraticCurveTo(cx + 18 + tailSway, 14 + breathe, cx + 16 + tailSway, 24);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx + 16 + tailSway, 25, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Pescoço com Crina Negra
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cx - 18, 8 + breathe, 10, 12);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 12, 4 + breathe, 4, 14);

      // Cabeça de Burro e Focinho Claro
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cx - 22, 6 + breathe, 12, 10);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 25, 10 + breathe, 8, 8);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 24, 12 + breathe, 2, 2);

      // Olhos Expressivos
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 19, 8 + breathe, 5, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 18, 9 + breathe, 2, 2);

      // Sorriso Dentado
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 24, 15 + breathe, 6, 2);

      // Orelhas Longas de Burro
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cx - 20, -4 + breathe, 4, 11);
      ctx.fillRect(cx - 15, -6 + breathe, 4, 12);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 19, -2 + breathe, 2, 8);
      ctx.fillRect(cx - 14, -4 + breathe, 2, 9);
    },
  },
  {
    key: 'shereque_boss_fiona',
    biomeKey: 'shereque',
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const breathe = Math.sin(time / 450) * 0.9;
      const skirtWave = Math.sin(time / 240) * 1.5;
      const cx = size / 2;

      drawMonsterShadow(ctx, size);

      // Feiona é uma chefe ogra: ombros, braços e tronco largos antes da saia.
      ctx.fillStyle = '#14532d';
      ctx.fillRect(cx - 25, 23 + breathe, 11, 22);
      ctx.fillRect(cx + 14, 23 + breathe, 11, 22);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(cx - 28, 34 + breathe, 9, 9);
      ctx.fillRect(cx + 19, 34 + breathe, 9, 9);
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.moveTo(cx - 18, 19 + breathe);
      ctx.lineTo(cx + 18, 19 + breathe);
      ctx.lineTo(cx + 25 + skirtWave, size - 6);
      ctx.lineTo(cx - 25 - skirtWave, size - 6);
      ctx.fill();

      ctx.fillStyle = '#059669';
      ctx.fillRect(cx - 18, 22 + breathe, 36, 16);
      ctx.fillRect(cx - 21, 30 + breathe, 42, 12);

      ctx.fillStyle = '#a7f3d0'; // Painel frontal claro da saia larga
      ctx.beginPath();
      ctx.moveTo(cx - 7, 23 + breathe);
      ctx.lineTo(cx + 7, 23 + breathe);
      ctx.lineTo(cx + 12, size - 6);
      ctx.lineTo(cx - 12, size - 6);
      ctx.fill();

      // Guarnições Douradas
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx - 18, 22 + breathe, 36, 3);
      ctx.fillRect(cx - 20, 38 + breathe, 40, 3);

      // Cinto realça o volume do tronco e diferencia roupa de pele.
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 19, 34 + breathe, 38, 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx - 4, 33 + breathe, 8, 6);

      // Colar Esmeralda
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(cx - 5, 17 + breathe, 10, 2);
      ctx.fillStyle = '#059669';
      ctx.fillRect(cx - 2, 19 + breathe, 4, 3);

      // Cabeça de Ogressa Verde
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(cx, 11 + breathe, 12, 0, Math.PI * 2);
      ctx.fill();

      // Orelhas de Ogressa
      ctx.fillStyle = '#166534';
      ctx.fillRect(cx - 14, 8 + breathe, 5, 3);
      ctx.fillRect(cx + 9, 8 + breathe, 5, 3);

      // Cabelo Ruivo Trançado
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(cx, 8 + breathe, 11, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 10, 4 + breathe, 8, 8);
      ctx.fillRect(cx + 2, 4 + breathe, 8, 8);
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(cx - 14, 10 + breathe, 5, 16);
      ctx.fillRect(cx + 9, 10 + breathe, 5, 16);

      // Olhos e boca animados da Feiona. A piscada é curta e irregular, e a
      // boca alterna entre sorriso e fala para dar vida ao boss sem depender
      // de sprites extras.
      const blinkPhase = (time + 2100) % 4600;
      const blinking = blinkPhase < 140 || (blinkPhase > 185 && blinkPhase < 235);
      if (blinking) {
        ctx.fillStyle = '#166534';
        ctx.fillRect(cx - 7, 11 + breathe, 5, 2);
        ctx.fillRect(cx + 2, 11 + breathe, 5, 2);
      } else {
        ctx.fillStyle = '#fefce8';
        ctx.fillRect(cx - 7, 9 + breathe, 5, 5);
        ctx.fillRect(cx + 2, 9 + breathe, 5, 5);
        ctx.fillStyle = '#14532d';
        ctx.fillRect(cx - 5, 10 + breathe, 2, 3);
        ctx.fillRect(cx + 3, 10 + breathe, 2, 3);
      }

      const mouthOpen = Math.sin(time / 300) > 0.3;
      ctx.fillStyle = '#14532d';
      ctx.fillRect(cx - 6, 17 + breathe, 12, mouthOpen ? 5 : 3);
      if (mouthOpen) {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(cx - 5, 17 + breathe, 10, 2);
        ctx.fillStyle = '#059669';
        ctx.fillRect(cx - 1, 17 + breathe, 2, 2);
      } else {
        ctx.fillStyle = '#86efac';
        ctx.fillRect(cx - 4, 17 + breathe, 8, 1);
      }
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // BIOMA 3: CHAPOLIN (TIER 1)
  // ───────────────────────────────────────────────────────────────────────────

  {
    key: 'chapolin_tripa',
    biomeKey: 'chapolin',
    aliases: ['tripa'],
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 110) * 3;
      const breathe = Math.sin(time / 450) * 0.8;
      const cx = size / 2;

      drawMonsterShadow(ctx, size);

      // Pernas e Sapatos com Passos
      ctx.fillStyle = '#d97706'; // Calça
      ctx.fillRect(cx - 6 - walkStep, 32, 5, 11);
      ctx.fillRect(cx + 1 + walkStep, 32, 5, 11);
      ctx.fillStyle = '#451a03'; // Sapatos
      ctx.fillRect(cx - 7 - walkStep, 41, 6, 4);
      ctx.fillRect(cx + 1 + walkStep, 41, 6, 4);

      // Corpo Alto e Magro com Paletó Amarelo
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - 8, 14 + breathe, 16, 24);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 4, 16 + breathe, 8, 16);

      // Gravata Larga Listrada
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx - 3, 18 + breathe);
      ctx.lineTo(cx + 3, 18 + breathe);
      ctx.lineTo(cx + 4, 30 + breathe);
      ctx.lineTo(cx - 4, 30 + breathe);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 3, 22 + breathe, 6, 2);
      ctx.fillRect(cx - 3, 26 + breathe, 6, 2);

      // Cabeça Magra de Tripa Seca com Bigode
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 5, 6 + breathe, 10, 10);
      ctx.fillStyle = '#292524'; // Bigode
      ctx.fillRect(cx - 5, 12 + breathe, 10, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 4, 8 + breathe, 2, 2);
      ctx.fillRect(cx + 2, 8 + breathe, 2, 2);

      // Chapéu Fedora Verde Escuro
      ctx.fillStyle = '#14532d';
      ctx.fillRect(cx - 9, 4 + breathe, 18, 4);
      ctx.fillRect(cx - 6, 0 + breathe, 12, 5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 6, 4 + breathe, 12, 1);
    },
  },
  {
    key: 'chapolin_pirate',
    biomeKey: 'chapolin',
    aliases: ['pirata'],
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 110) * 3;
      const breathe = Math.sin(time / 450) * 0.8;
      const cx = size / 2;

      drawMonsterShadow(ctx, size);

      // Calça e Botas com Passos
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - 9 - walkStep, 28, 7, 13);
      ctx.fillRect(cx + 2 + walkStep, 28, 7, 13);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 10 - walkStep, 38, 8, 6);
      ctx.fillRect(cx + 2 + walkStep, 38, 8, 6);

      // Camisa Marrom com Decote V
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 10, 14 + breathe, 20, 16);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(cx - 4, 14 + breathe);
      ctx.lineTo(cx + 4, 14 + breathe);
      ctx.lineTo(cx, 22 + breathe);
      ctx.fill();

      // Faixa Verde Esmeralda
      ctx.fillStyle = '#059669';
      ctx.fillRect(cx - 11, 26 + breathe, 22, 5);
      ctx.fillRect(cx - 13, 28 + breathe, 6, 12);

      // Cabeça com Tapa-Olho
      ctx.fillStyle = '#d97706';
      ctx.fillRect(cx - 6, 6 + breathe, 12, 10);
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 5, 12 + breathe, 10, 4);

      // Tapa-olho Preto
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 4, 7 + breathe, 4, 4);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, 6 + breathe);
      ctx.lineTo(cx + 6, 12 + breathe);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 2, 8 + breathe, 3, 2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx + 3, 8 + breathe, 1, 2);

      // Chapéu Tricórnio Pirata com Caveira
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx - 16, 6 + breathe);
      ctx.lineTo(cx, -2 + breathe);
      ctx.lineTo(cx + 16, 6 + breathe);
      ctx.lineTo(cx, 4 + breathe);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(cx, 1 + breathe, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 3, 2 + breathe, 6, 1);
    },
  },
  {
    key: 'chapolin_bandit',
    biomeKey: 'chapolin',
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 110) * 3;
      const breathe = Math.sin(time / 450) * 0.8;
      const cx = size / 2;

      drawMonsterShadow(ctx, size);

      // Calça Jeans e Sapatos Longos com Passos
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(cx - 6 - walkStep, 26, 5, 14);
      ctx.fillRect(cx + 1 + walkStep, 26, 5, 14);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - 12 - walkStep, 38, 11, 4);
      ctx.fillRect(cx + 1 + walkStep, 38, 11, 4);

      // Faca no Bolso Traseiro
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(cx + 5, 24 + breathe);
      ctx.lineTo(cx + 12, 32 + breathe);
      ctx.lineTo(cx + 5, 32 + breathe);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx + 5, 18 + breathe, 3, 6);

      // Camisa Polo Verde
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(cx - 1, 20 + breathe, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 8, 14 + breathe, 16, 14);

      // Cabeça Amarela Longa
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 5, 6 + breathe, 10, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 4, 8 + breathe, 4, 3);
      ctx.fillRect(cx + 1, 8 + breathe, 4, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 4, 8 + breathe, 4, 1);
      ctx.fillRect(cx + 1, 8 + breathe, 4, 1);
      ctx.fillRect(cx - 2, 9 + breathe, 2, 2);
      ctx.fillRect(cx + 2, 9 + breathe, 2, 2);

      // Cabeleira Palmeira Vermelha
      ctx.fillStyle = '#dc2626';
      const hairSpikes = [-12, -8, -4, 0, 4, 8, 12];
      hairSpikes.forEach((hx) => {
        ctx.beginPath();
        ctx.moveTo(cx + hx * 0.4, 6 + breathe);
        ctx.lineTo(cx + hx * 1.2, -8 + breathe);
        ctx.lineTo(cx + hx * 0.8, 6 + breathe);
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(cx, 3 + breathe, 9, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    key: 'chapolin_boss_alma',
    biomeKey: 'chapolin',
    render: (ctx, size, opts: MonsterRenderOptions = {}) => {
      const time = opts.time || performance.now();
      const walkStep = opts.walkStep ?? Math.sin(time / 110) * 3;
      const breathe = Math.sin(time / 450) * 1.0;
      const cx = size / 2;

      drawMonsterShadow(ctx, size);

      // Corpo Musculoso Azul/Púrpura com Botas Roxas
      ctx.fillStyle = '#4338ca';
      ctx.fillRect(cx - 14, 14 + breathe, 28, 28);
      ctx.fillStyle = '#7e22ce'; // Sunga roxa
      ctx.fillRect(cx - 12, 36, 24, 8);
      ctx.fillRect(cx - 10 - walkStep, 43, 8, 14);
      ctx.fillRect(cx + 2 + walkStep, 43, 8, 14);

      // Arnês de Peito Roxo
      ctx.fillStyle = '#6b21a8';
      ctx.beginPath();
      ctx.moveTo(cx - 14, 16 + breathe);
      ctx.lineTo(cx + 14, 30 + breathe);
      ctx.lineTo(cx + 10, 32 + breathe);
      ctx.lineTo(cx - 14, 18 + breathe);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 14, 16 + breathe);
      ctx.lineTo(cx - 14, 30 + breathe);
      ctx.lineTo(cx - 10, 32 + breathe);
      ctx.lineTo(cx + 14, 18 + breathe);
      ctx.fill();

      // Crânio Amarelo Místico com Capuz Roxo
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(cx, 12 + breathe, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 6, 10 + breathe, 4, 4);
      ctx.fillRect(cx + 2, 10 + breathe, 4, 4);
      ctx.fillRect(cx - 1, 14 + breathe, 3, 3);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 4, 17 + breathe, 9, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 2, 17 + breathe, 1, 3);
      ctx.fillRect(cx + 1, 17 + breathe, 1, 3);

      // Capuz Roxo
      ctx.fillStyle = '#7e22ce';
      ctx.beginPath();
      ctx.arc(cx, 10 + breathe, 12, Math.PI * 0.8, Math.PI * 2.2);
      ctx.lineTo(cx + 14, 20 + breathe);
      ctx.lineTo(cx - 14, 20 + breathe);
      ctx.fill();

      // Cajado Havoc Staff com Chifres de Carneiro
      const staffSway = Math.sin(time / 180) * 1.5;
      ctx.fillStyle = '#6b21a8';
      ctx.fillRect(cx + 16 + staffSway, 4 + breathe, 4, 46);

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(cx + 18 + staffSway, 4 + breathe, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx + 15 + staffSway, 3 + breathe, 2, 2);
      ctx.fillRect(cx + 19 + staffSway, 3 + breathe, 2, 2);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx + 11 + staffSway, 2 + breathe, 6, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 25 + staffSway, 2 + breathe, 6, -Math.PI * 0.5, Math.PI);
      ctx.stroke();
    },
  },
];