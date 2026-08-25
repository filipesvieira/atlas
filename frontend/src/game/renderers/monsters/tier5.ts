import type { MonsterVisualDefinition } from '../../registries/MonsterRegistry';
import { drawMonsterShadow } from './common';

export const tier5MonsterVisuals: MonsterVisualDefinition[] = [
  {
    key: 'abyss_dragon',
    biomeKey: 'abyss',
    aliases: ["dragão","dragao","dragao_cinderino","dragão_cinderino","dragão_vermelho"],
    projectile: { color: '#f97316', type: 'fireball' },
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // Dragão Cinderino (Dragão Vermelho de Ventre Amarelo e Chifres Dourados - Imagem 2)
      // 1. Cauda Longa e Espinhos Dorsais Alaranjados
      ctx.fillStyle = '#dc2626'; // Vermelho vivo
      ctx.beginPath();
      ctx.moveTo(size / 2 + 10, 36);
      ctx.quadraticCurveTo(size / 2 + 26, 42, size / 2 + 20, 24);
      ctx.quadraticCurveTo(size / 2 + 16, 32, size / 2 + 8, 36);
      ctx.fill();

      // Espinhos dorsais triangulares alaranjados
      ctx.fillStyle = '#f97316';
      for (let s = 14; s <= 38; s += 6) {
        ctx.beginPath();
        ctx.moveTo(size / 2 + 8, s);
        ctx.lineTo(size / 2 + 14, s - 3);
        ctx.lineTo(size / 2 + 9, s + 3);
        ctx.fill();
      }

      // 2. Pernas e Garras de Dragão Vermelho
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(size / 2 - 14, 34, 10, 12);
      ctx.fillRect(size / 2 + 2, 34, 10, 12);
      ctx.fillStyle = '#fef08a'; // Garras de marfim
      ctx.fillRect(size / 2 - 16, 42, 3, 4);
      ctx.fillRect(size / 2 - 12, 44, 3, 3);
      ctx.fillRect(size / 2 + 2, 44, 3, 3);
      ctx.fillRect(size / 2 + 8, 42, 3, 4);

      // 3. Tronco Musculoso Vermelho e Barriga Amarela Segmentada (Imagem 2)
      ctx.fillStyle = '#dc2626'; // Corpo vermelho
      ctx.fillRect(size / 2 - 12, 16, 22, 22);

      // Barriga Amarela Segmentada em Placas (Imagem 2)
      ctx.fillStyle = '#fbbf24'; // Amarelo dourado do ventre
      ctx.fillRect(size / 2 - 8, 18, 14, 18);
      ctx.fillStyle = '#f59e0b'; // Divisórias horizontais das placas ventrais
      ctx.fillRect(size / 2 - 7, 22, 12, 1.5);
      ctx.fillRect(size / 2 - 7, 26, 12, 1.5);
      ctx.fillRect(size / 2 - 7, 30, 12, 1.5);

      // Braços e Garras Superiores
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(size / 2 - 18, 20, 8, 5);
      ctx.fillRect(size / 2 + 8, 22, 7, 5);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(size / 2 - 20, 20, 3, 3);
      ctx.fillRect(size / 2 + 13, 22, 3, 3);

      // 4. Cabeça do Dragão com Focinho, Dentes Brancos e Chifres Dourados (Imagem 2)
      // Cabeça vermelha
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(size / 2, 10, 9, 0, Math.PI * 2);
      ctx.fill();

      // Focinho alongado e boca aberta com língua rosa
      ctx.fillRect(size / 2 - 14, 8, 9, 7);
      ctx.fillStyle = '#f43f5e'; // Língua rosa
      ctx.fillRect(size / 2 - 12, 12, 5, 2);
      ctx.fillStyle = '#ffffff'; // Dentes brancos afiados
      ctx.fillRect(size / 2 - 14, 8, 2, 2);
      ctx.fillRect(size / 2 - 11, 8, 2, 2);
      ctx.fillRect(size / 2 - 13, 13, 2, 2);

      // Chifres Marfim / Dourados no topo da cabeça (Imagem 2)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 2, 4);
      ctx.lineTo(size / 2 - 6, -5);
      ctx.lineTo(size / 2 + 2, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(size / 2 + 4, 4);
      ctx.lineTo(size / 2 + 1, -5);
      ctx.lineTo(size / 2 + 7, 2);
      ctx.fill();

      // Orelha pontiaguda amarela na lateral
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(size / 2 + 6, 7);
      ctx.lineTo(size / 2 + 13, 3);
      ctx.lineTo(size / 2 + 8, 11);
      ctx.fill();

      // Olhos Azuis Expressivos do Dragão (Imagem 2)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(size / 2 - 5, 5, 5, 5);
      ctx.fillStyle = '#0284c7'; // Pupila azul
      ctx.fillRect(size / 2 - 4, 6, 3, 3);
    },
  },
  {
    key: 'abyss_scorpion',
    biomeKey: 'abyss',
    aliases: ["escorpiao","escorpião","escorpião_infernal","escorpiao_infernal"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // Escorpião Infernal / Magma Scorpion (Pinças Gigantes de Fogo e Cauda Arqueada Flamejante - Imagem 3)
      // 1. Pernas de Rocha Basáltica com Pontas de Fogo
      ctx.fillStyle = '#451a03'; // Rocha vulcânica
      for (let leg = -14; leg <= 14; leg += 7) {
        ctx.fillRect(size / 2 + leg - 2, 28, 3, 14);
        ctx.fillStyle = '#f97316'; // Pontas incandescentes nas patas
        ctx.fillRect(size / 2 + leg - 2, 40, 3, 4);
        ctx.fillStyle = '#451a03';
      }

      // 2. Carapaça de Basalto Vulcânico com Fissuras de Magma
      ctx.fillStyle = '#290d02'; // Exoesqueleto negro vulcânico
      ctx.fillRect(size / 2 - 14, 18, 28, 16);
      ctx.fillStyle = '#ea580c'; // Fissuras incandescentes no dorso
      ctx.fillRect(size / 2 - 10, 20, 20, 3);
      ctx.fillRect(size / 2 - 8, 26, 16, 3);

      // Olhos e Mandíbulas Flamejantes
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(size / 2 - 6, 16, 3, 2);
      ctx.fillRect(size / 2 + 3, 16, 3, 2);

      // 3. CAUDA ARQUEADA ALTA COM AGUILHÃO DE FOGO VIVO (Imagem 3)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(size / 2, 18);
      ctx.quadraticCurveTo(size / 2 - 24, 0, size / 2 - 16, -6);
      ctx.stroke();

      // Aguilhão e Chama no Topo da Cauda
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(size / 2 - 16, -6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(size / 2 - 16, -6, 4, 0, Math.PI * 2);
      ctx.fill();

      // 4. PINÇAS GIGANTES DE FOGO INCANDESCENTE NAS MÃOS (Imagem 3)
      // Braço esquerdo e pinça
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 - 20, 22, 8, 6);
      ctx.fillStyle = '#ea580c'; // Pinça esquerda flamejante
      ctx.beginPath();
      ctx.arc(size / 2 - 22, 26, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a'; // Brilho de fogo
      ctx.fillRect(size / 2 - 24, 24, 5, 5);

      // Braço direito e pinça
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 + 12, 22, 8, 6);
      ctx.fillStyle = '#ea580c'; // Pinça direita flamejante
      ctx.beginPath();
      ctx.arc(size / 2 + 22, 26, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a'; // Brilho de fogo
      ctx.fillRect(size / 2 + 19, 24, 5, 5);
    },
  },
  {
    key: 'abyss_demon',
    biomeKey: 'abyss',
    aliases: ["demônio","demonio","demonio_ancestral","demônio_ancestral"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // Demônio Ancestral / Lord of Darkness (Chifres Negros, Asas de Morcego e Costelas de Fogo - Imagem 4)
      // 1. ASAS GIGANTES DE MORCEGO ABERTAS (Membrana Vermelha e Armação Negra - Imagem 4)
      // Asa Esquerda
      ctx.fillStyle = '#991b1b'; // Membrana carmim
      ctx.beginPath();
      ctx.moveTo(size / 2 - 4, 14);
      ctx.lineTo(size / 2 - 26, -4);
      ctx.lineTo(size / 2 - 28, 22);
      ctx.lineTo(size / 2 - 14, 26);
      ctx.fill();
      // Armação negra da asa
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(size / 2 - 4, 14);
      ctx.lineTo(size / 2 - 26, -4);
      ctx.lineTo(size / 2 - 28, 22);
      ctx.stroke();

      // Asa Direita
      ctx.fillStyle = '#991b1b'; // Membrana carmim
      ctx.beginPath();
      ctx.moveTo(size / 2 + 4, 14);
      ctx.lineTo(size / 2 + 26, -4);
      ctx.lineTo(size / 2 + 28, 22);
      ctx.lineTo(size / 2 + 14, 26);
      ctx.fill();
      // Armação negra da asa
      ctx.strokeStyle = '#09090b';
      ctx.beginPath();
      ctx.moveTo(size / 2 + 4, 14);
      ctx.lineTo(size / 2 + 26, -4);
      ctx.lineTo(size / 2 + 28, 22);
      ctx.stroke();

      // 2. Tronco Musculoso com COSTELAS INCANDESCENTES DE FOGO VIVO (Imagem 4)
      ctx.fillStyle = '#18181b'; // Pele negra obsidiana
      ctx.fillRect(size / 2 - 12, 14, 24, 26);

      // Costelas/Peitoral em Fogo Vermelho Radiante
      ctx.fillStyle = '#dc2626'; // Vermelho fogo vivo
      ctx.fillRect(size / 2 - 8, 18, 16, 3);
      ctx.fillRect(size / 2 - 7, 23, 14, 3);
      ctx.fillRect(size / 2 - 6, 28, 12, 3);
      ctx.fillRect(size / 2 - 4, 33, 8, 3);

      // Garras Negras com Dedos Afiados
      ctx.fillStyle = '#09090b';
      ctx.fillRect(size / 2 - 18, 24, 6, 12);
      ctx.fillRect(size / 2 + 12, 24, 6, 12);

      // 3. Cabeça de Demônio com CHIFRES CURVADOS E OLHOS VERMELHOS (Imagem 4)
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(size / 2, 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Chifres Curvados Longos
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 5, 4);
      ctx.lineTo(size / 2 - 14, -8);
      ctx.lineTo(size / 2 - 2, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(size / 2 + 5, 4);
      ctx.lineTo(size / 2 + 14, -8);
      ctx.lineTo(size / 2 + 2, 2);
      ctx.fill();

      // Olhos Vermelhos Reluzentes Diabólicos
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(size / 2 - 4, 7, 2, 2);
      ctx.fillRect(size / 2 + 2, 7, 2, 2);
    },
  },
  {
    key: 'abyss_flame_lord',
    biomeKey: 'abyss',
    aliases: ["lorde_das_chamas","lorde_chamas","flamelord","fogo"],
    projectile: { color: '#f97316', type: 'fireball' },
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // Lorde das Chamas / Frenzied Flame Lord (Armadura Forjada e Cabeça de Vórtice de Fogo - Imagem 5)
      // 1. Armadura de Placas de Aço Negro Queimado com Detalhes Forjados
      ctx.fillStyle = '#18181b'; // Aço queimado
      ctx.fillRect(size / 2 - 12, 16, 24, 28);
      ctx.fillStyle = '#451a03'; // Filigrana de bronze forjado
      ctx.fillRect(size / 2 - 10, 18, 20, 2);
      ctx.fillRect(size / 2 - 8, 24, 16, 2);

      // Ombreiras e Braços Blindados
      ctx.fillStyle = '#27272a';
      ctx.fillRect(size / 2 - 16, 16, 6, 14);
      ctx.fillRect(size / 2 + 10, 16, 6, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 - 16, 20, 6, 2);
      ctx.fillRect(size / 2 + 10, 20, 6, 2);

      // Fagulhas e Brasas subindo da Armadura
      ctx.fillStyle = '#f97316';
      ctx.fillRect(size / 2 - 14, 12, 2, 2);
      ctx.fillRect(size / 2 + 12, 10, 2, 2);
      ctx.fillRect(size / 2 - 6, 32, 2, 2);

      // 2. A CABEÇA DE VÓRTICE DE FOGO VIVO E ANEL DOURADO (Imagem 5)
      // Labaredas externas vermelhas/alaranjadas
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(size / 2, 4, 14, 0, Math.PI * 2);
      ctx.fill();

      // Labaredas amarelas brilhantes
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(size / 2, 4, 10, 0, Math.PI * 2);
      ctx.fill();

      // Núcleo branco incandescente
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(size / 2, 4, 6, 0, Math.PI * 2);
      ctx.fill();

      // Centro oco / void negro no olho do vórtice (Conforme Imagem 5)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(size / 2, 4, 3, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    key: 'abyss_vampire',
    biomeKey: 'abyss',
    aliases: ["vampiro","vampiro_ancestral","dracula","conde"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // Vampiro Ancestral / Conde Drácula (Manto Negro com Forro Vermelho Carmim, Jabot Branco e Cabelos Prateados - Imagem 1)
      // 1. CAPA VAMPÍRICA PRETA COM FORRO VERMELHO ESCARLATE VIBRANTE (Imagem 1)
      // Forro interior vermelho carmim brilhante
      ctx.fillStyle = '#dc2626'; // Vermelho carmim vivo
      ctx.beginPath();
      ctx.moveTo(size / 2, 8);
      ctx.lineTo(size / 2 + 22, size - 4);
      ctx.lineTo(size / 2 - 22, size - 4);
      ctx.fill();

      // Manto exterior preto acetinado
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 4, 8);
      ctx.lineTo(size / 2 - 20, size - 4);
      ctx.lineTo(size / 2 - 26, size - 8);
      ctx.lineTo(size / 2 - 16, 12);
      ctx.fill();

      // Gola Alta Pontuda Vampírica atrás do Pescoço (Imagem 1)
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 12, 12);
      ctx.lineTo(size / 2 - 16, -2);
      ctx.lineTo(size / 2 - 4, 6);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(size / 2 + 12, 12);
      ctx.lineTo(size / 2 + 16, -2);
      ctx.lineTo(size / 2 + 4, 6);
      ctx.fill();

      // 2. Traje Nobre: Colete Vermelho Bordado a Ouro e Calças Negras com Botas de Cano Alto
      ctx.fillStyle = '#0f172a'; // Calças pretas aristocráticas
      ctx.fillRect(size / 2 - 7, 28, 6, 16);
      ctx.fillRect(size / 2 + 1, 28, 6, 16);
      ctx.fillStyle = '#09090b'; // Botas pretas de cano alto lustrosas
      ctx.fillRect(size / 2 - 8, 38, 7, 8);
      ctx.fillRect(size / 2 + 1, 38, 7, 8);
      ctx.fillStyle = '#fbbf24'; // Fivelas douradas nas botas
      ctx.fillRect(size / 2 - 7, 39, 5, 1.5);
      ctx.fillRect(size / 2 + 2, 39, 5, 1.5);

      // Colete Escarlate com Detalhes e Brocados em Ouro
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(size / 2 - 8, 14, 16, 16);
      ctx.fillStyle = '#fbbf24'; // Botões e arabescos dourados
      ctx.fillRect(size / 2 - 7, 18, 2, 2);
      ctx.fillRect(size / 2 - 7, 22, 2, 2);
      ctx.fillRect(size / 2 + 5, 18, 2, 2);
      ctx.fillRect(size / 2 + 5, 22, 2, 2);
      ctx.fillStyle = '#dc2626'; // Faixa escarlate na cintura
      ctx.fillRect(size / 2 - 8, 27, 16, 3);

      // Jabot / Lenço Plissado de Seda Branca no Peito (Imagem 1)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 4, 12);
      ctx.lineTo(size / 2 + 4, 12);
      ctx.lineTo(size / 2 + 2, 20);
      ctx.lineTo(size / 2 - 2, 20);
      ctx.fill();

      // 3. Rosto Pálido Aristocrático e Cabelos Longos Prateados Ondulados (Imagem 1)
      // Cabelos prateados caindo sobre os ombros
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(size / 2 - 9, 4, 18, 12);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(size / 2 - 10, 8, 3, 10);
      ctx.fillRect(size / 2 + 7, 8, 3, 10);

      // Rosto nobre pálido
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(size / 2 - 5, 5, 10, 8);
      ctx.fillStyle = '#ef4444'; // Olhos vermelhos hipnóticos
      ctx.fillRect(size / 2 - 4, 7, 2, 2);
      ctx.fillRect(size / 2 + 2, 7, 2, 2);
      ctx.fillStyle = '#991b1b'; // Lábios com presas discretas
      ctx.fillRect(size / 2 - 2, 11, 4, 1);

      // 4. Morcego de Asas Abertas Pousado no Braço Esquerdo (Imagem 1)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(size / 2 + 13, 16, 4, 6); // Corpo do morcego
      ctx.beginPath();
      ctx.moveTo(size / 2 + 15, 16);
      ctx.lineTo(size / 2 + 22, 10);
      ctx.lineTo(size / 2 + 20, 20);
      ctx.fill();
    },
  },
  {
    key: 'abyss_necromancer',
    biomeKey: 'abyss',
    aliases: ["necromante","necromante_sombrio","necromancer","mago_mortos"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // Necromante Sombrio (Manto/Capuz Vermelho Sangue Rasgado, Tronco Cadavérico e Cajado de Crânio - Imagem 4)
      // 1. Aura de Almas e Névoa Espectral na Base
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(size / 2, size - 10, 18, 0, Math.PI * 2);
      ctx.fill();

      // Esqueletos Menores Invocados ao Redor da Base (Imagem 4)
      ctx.fillStyle = '#cbd5e1'; // Crânios subordinados
      ctx.beginPath();
      ctx.arc(size / 2 - 16, size - 8, 4, 0, Math.PI * 2);
      ctx.arc(size / 2 + 16, size - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a'; // Olhos ocos dos esqueletos
      ctx.fillRect(size / 2 - 17, size - 9, 1.5, 1.5);
      ctx.fillRect(size / 2 - 14, size - 9, 1.5, 1.5);
      ctx.fillRect(size / 2 + 15, size - 9, 1.5, 1.5);
      ctx.fillRect(size / 2 + 18, size - 9, 1.5, 1.5);

      // 2. Manto / Túnica Rasgada em Vermelho Sangue (Imagem 4)
      ctx.fillStyle = '#991b1b'; // Vermelho sangue profundo
      ctx.beginPath();
      ctx.moveTo(size / 2 - 10, 18);
      ctx.lineTo(size / 2 + 12, 18);
      ctx.lineTo(size / 2 + 18, size - 6);
      ctx.lineTo(size / 2 - 18, size - 6);
      ctx.fill();

      // Cinto com Correntes de Ferro e Pequenos Crânios Troféu (Imagem 4)
      ctx.fillStyle = '#475569';
      ctx.fillRect(size / 2 - 10, 28, 20, 2);
      ctx.fillStyle = '#f8fafc'; // Crânio no cinto
      ctx.beginPath();
      ctx.arc(size / 2 + 8, 32, 3, 0, Math.PI * 2);
      ctx.fill();

      // 3. Tronco e Peitoral Cadavérico Pálido sem Camisa (Imagem 4)
      ctx.fillStyle = '#e2e8f0'; // Pele branca cadavérica de morto-vivo
      ctx.fillRect(size / 2 - 7, 12, 14, 16);
      // Costelas e músculos definidos em cinza
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(size / 2 - 5, 16, 10, 1.5);
      ctx.fillRect(size / 2 - 5, 20, 10, 1.5);
      ctx.fillRect(size / 2 - 4, 24, 8, 1.5);

      // 4. Braço Direito Erguido aos Céus em Invocação das Sombras (Imagem 4)
      ctx.fillStyle = '#991b1b'; // Manga vermelha do manto
      ctx.fillRect(size / 2 - 16, 8, 8, 6);
      ctx.fillStyle = '#e2e8f0'; // Braço pálido levantado
      ctx.fillRect(size / 2 - 20, -2, 5, 10);
      // Mão em garra aberta apontando para o alto
      ctx.fillStyle = '#18181b'; // Garras negras
      ctx.fillRect(size / 2 - 22, -6, 2, 4);
      ctx.fillRect(size / 2 - 19, -7, 2, 5);
      ctx.fillRect(size / 2 - 16, -6, 2, 4);

      // 5. CAJADO DOS MORTOS COM OSSO NEGRO E CRÂNIO NA MÃO ESQUERDA (Imagem 4)
      ctx.fillStyle = '#09090b'; // Haste do cajado de osso negro
      ctx.fillRect(size / 2 + 15, -4, 3, size + 2);
      // Garras retorcidas no topo do cajado
      ctx.beginPath();
      ctx.moveTo(size / 2 + 14, -4);
      ctx.lineTo(size / 2 + 10, -10);
      ctx.lineTo(size / 2 + 20, -10);
      ctx.lineTo(size / 2 + 18, -4);
      ctx.fill();
      ctx.fillStyle = '#ec4899'; // Gema mágica magenta no cajado
      ctx.fillRect(size / 2 + 14, -8, 3, 3);

      // 6. Capuz Vermelho Sangue e Rosto Cadavérico Inclinado para Cima (Imagem 4)
      ctx.fillStyle = '#b91c1c'; // Capuz vermelho
      ctx.beginPath();
      ctx.arc(size / 2, 6, 9, Math.PI, 0);
      ctx.fillRect(size / 2 - 9, 6, 18, 6);
      ctx.fill();

      // Rosto esbranquiçado erguido em transe sob o capuz
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(size / 2 - 5, 4, 10, 7);
      ctx.fillStyle = '#0f172a'; // Cavidades sombrias dos olhos
      ctx.fillRect(size / 2 - 4, 5, 3, 2);
      ctx.fillRect(size / 2 + 1, 5, 3, 2);
    },
  },
  {
    key: 'abyss_boss_avenger',
    biomeKey: 'abyss',
    aliases: ["vingador","vingador_de_chifres","vingador_chifres","boss_vingador"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // Vingador de Chifres / Vindicator (O Lendário Vilão de Caverna do Dragão - 64px Boss - Imagem 3)
      // 1. Base Rochosa Vulcânica sob o Manto
      ctx.fillStyle = '#78350f'; // Rocha vulcânica pontiaguda
      ctx.beginPath();
      ctx.moveTo(size / 2 - 26, size - 4);
      ctx.lineTo(size / 2 - 18, size - 14);
      ctx.lineTo(size / 2 - 6, size - 6);
      ctx.lineTo(size / 2 + 8, size - 12);
      ctx.lineTo(size / 2 + 20, size - 4);
      ctx.lineTo(size / 2 + 26, size);
      ctx.lineTo(size / 2 - 26, size);
      ctx.fill();

      // 2. ASAS GIGANTES DE DEMÔNIO ERGUIDAS NAS COSTAS (Nervuras Vermelhas e Membrana Negra - Imagem 3)
      // Asa Esquerda Alta
      ctx.fillStyle = '#09090b'; // Membrana negra
      ctx.beginPath();
      ctx.moveTo(size / 2 - 8, 18);
      ctx.lineTo(size / 2 - 28, -6);
      ctx.lineTo(size / 2 - 30, 26);
      ctx.lineTo(size / 2 - 14, 30);
      ctx.fill();
      // Nervuras e bordas em vermelho vibrante
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(size / 2 - 8, 18);
      ctx.lineTo(size / 2 - 28, -6);
      ctx.lineTo(size / 2 - 30, 26);
      ctx.stroke();

      // Asa Direita Alta
      ctx.fillStyle = '#09090b'; // Membrana negra
      ctx.beginPath();
      ctx.moveTo(size / 2 + 8, 18);
      ctx.lineTo(size / 2 + 28, -6);
      ctx.lineTo(size / 2 + 30, 26);
      ctx.lineTo(size / 2 + 14, 30);
      ctx.fill();
      // Nervuras e bordas em vermelho vibrante
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(size / 2 + 8, 18);
      ctx.lineTo(size / 2 + 28, -6);
      ctx.lineTo(size / 2 + 30, 26);
      ctx.stroke();

      // 3. TÚNICA LONGA CINZA CHUMBO FLUIDA (Imagem 3)
      ctx.fillStyle = '#475569'; // Cinza chumbo elegante
      ctx.beginPath();
      ctx.moveTo(size / 2 - 12, 20);
      ctx.lineTo(size / 2 + 12, 20);
      ctx.lineTo(size / 2 + 22, size - 6);
      ctx.lineTo(size / 2 - 22, size - 6);
      ctx.fill();
      // Dobras e sombras verticais na túnica
      ctx.fillStyle = '#334155';
      ctx.fillRect(size / 2 - 10, 24, 4, size - 32);
      ctx.fillRect(size / 2 + 6, 24, 4, size - 32);

      // 4. Peitoral Estilizado e Ombreiras em Vermelho Carmim e Preto (Imagem 3)
      ctx.fillStyle = '#09090b'; // Ombreiras negras
      ctx.fillRect(size / 2 - 16, 12, 32, 8);

      // Placa Peitoral Angular Vermelho Carmim (Imagem 3)
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(size / 2, 28);
      ctx.lineTo(size / 2 - 12, 14);
      ctx.lineTo(size / 2 + 12, 14);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(size / 2, 26);
      ctx.lineTo(size / 2 - 8, 16);
      ctx.lineTo(size / 2 + 8, 16);
      ctx.fill();

      // 5. ORBE DE FEIXE MÁGICO ROSA / MAGENTA NA MÃO ESQUERDA ESTENDIDA (Imagem 3)
      ctx.fillStyle = '#09090b'; // Braço esquerdo
      ctx.fillRect(size / 2 + 14, 16, 10, 5);
      // Orbe de energia mágica em rosa/magenta néon
      ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.beginPath();
      ctx.arc(size / 2 + 26, 18, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ec4899'; // Núcleo rosa vivo
      ctx.beginPath();
      ctx.arc(size / 2 + 26, 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8'; // Centro luminoso
      ctx.fillRect(size / 2 + 25, 17, 2, 2);

      // 6. CABEÇA DO VINGADOR: CAPUZ VERMELHO, ROSTO AZULADO/CINZA E CHIFRE ÚNICO CURVADO (Imagem 3)
      // Capuz Vermelho Carmim
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(size / 2, 8, 9, Math.PI, 0);
      ctx.fillRect(size / 2 - 9, 8, 18, 8);
      ctx.fill();

      // Rosto azulado/cinza ameaçador
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(size / 2 - 5, 6, 10, 8);
      ctx.fillStyle = '#ef4444'; // Olhos vermelhos faiscantes
      ctx.fillRect(size / 2 - 4, 8, 2, 2);
      ctx.fillRect(size / 2 + 2, 8, 2, 2);
      ctx.fillStyle = '#09090b'; // Expressão sombria
      ctx.fillRect(size / 2 - 3, 12, 6, 1.5);

      // 7. O LENDÁRIO CHIFRE ÚNICO CURVADO (Imagem 3)
      ctx.fillStyle = '#dc2626'; // Chifre vermelho escarlate
      ctx.beginPath();
      ctx.moveTo(size / 2 - 2, 2);
      ctx.quadraticCurveTo(size / 2 - 12, -8, size / 2 - 16, -14);
      ctx.quadraticCurveTo(size / 2 - 6, -10, size / 2 + 2, 1);
      ctx.fill();
    },
  }
];