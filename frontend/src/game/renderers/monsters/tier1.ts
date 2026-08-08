import type { MonsterVisualDefinition } from '../../registries/MonsterRegistry';
import { drawMonsterShadow } from './common';

export const tier1MonsterVisuals: MonsterVisualDefinition[] = [
  {
    key: 'forest_goblin',
    biomeKey: 'forest',
    aliases: ["goblin"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'forest_wolf',
    biomeKey: 'forest',
    aliases: ["lobo"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      ctx.fillStyle = '#475569';
      ctx.fillRect(size / 2 - 14, 18, 28, 14);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(size / 2 - 14, 20, 8, 10);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(size / 2 - 16, 12, 12, 12);
      ctx.fillRect(size / 2 - 20, 16, 6, 6);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 - 13, 14, 3, 3);
    },
  },
  {
    key: 'forest_spider',
    biomeKey: 'forest',
    aliases: ["aranha"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'forest_boss_bear',
    biomeKey: 'forest',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'shereque_ogre',
    biomeKey: 'shereque',
    aliases: ["ogre"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'shereque_donkey',
    biomeKey: 'shereque',
    aliases: ["burro"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'shereque_boss_fiona',
    biomeKey: 'shereque',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'chapolin_tripa',
    biomeKey: 'chapolin',
    aliases: ["tripa"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'chapolin_pirate',
    biomeKey: 'chapolin',
    aliases: ["pirata"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'chapolin_bandit',
    biomeKey: 'chapolin',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'chapolin_boss_alma',
    biomeKey: 'chapolin',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  }
];
