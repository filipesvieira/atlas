import type { MonsterVisualDefinition } from '../../registries/MonsterRegistry';
import { drawMonsterShadow } from './common';

export const tier2MonsterVisuals: MonsterVisualDefinition[] = [
  {
    key: 'orcruins_orc',
    biomeKey: 'orcruins',
    aliases: ["orc"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'orcruins_orc_mage',
    biomeKey: 'orcruins',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'orcruins_skeleton',
    biomeKey: 'orcruins',
    aliases: ["esqueleto"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'orcruins_orc_archer',
    biomeKey: 'orcruins',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'orcruins_berserker',
    biomeKey: 'orcruins',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'orcruins_boss_skeleton',
    biomeKey: 'orcruins',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'esgotos_ninja',
    biomeKey: 'esgotos',
    aliases: ["ninja"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'esgotos_rat',
    biomeKey: 'esgotos',
    aliases: ["rato"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'esgotos_boss_destroyer',
    biomeKey: 'esgotos',
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'planalto_militante',
    biomeKey: 'planalto',
    aliases: ['militante', 'militante_13', 'militante_do_treze'],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // 1. Pernas com Bermuda Escura e Tênis
      ctx.fillStyle = '#1e293b'; // Bermuda jeans/escura
      ctx.fillRect(size / 2 - 10, 28, 8, 10);
      ctx.fillRect(size / 2 + 2, 28, 8, 10);
      ctx.fillStyle = '#f8fafc'; // Tênis claro
      ctx.fillRect(size / 2 - 11, 38, 9, 6);
      ctx.fillRect(size / 2 + 2, 38, 9, 6);

      // 2. Tronco com Camiseta Vermelha Vibrante
      ctx.fillStyle = '#dc2626'; // Vermelho intenso
      ctx.fillRect(size / 2 - 13, 14, 26, 16);

      // Estrela Branca no Peito
      ctx.fillStyle = '#ffffff';
      const starX = size / 2 - 2;
      const starY = 21;
      ctx.beginPath();
      ctx.moveTo(starX, starY - 5);
      ctx.lineTo(starX + 2, starY - 1);
      ctx.lineTo(starX + 6, starY);
      ctx.lineTo(starX + 3, starY + 3);
      ctx.lineTo(starX + 4, starY + 7);
      ctx.lineTo(starX, starY + 4);
      ctx.lineTo(starX - 4, starY + 7);
      ctx.lineTo(starX - 3, starY + 3);
      ctx.lineTo(starX - 6, starY);
      ctx.lineTo(starX - 2, starY - 1);
      ctx.closePath();
      ctx.fill();

      // Letras "PT" dentro da estrela
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 5px sans-serif';
      ctx.fillText('PT', starX - 3, starY + 2);

      // 3. Braço Direito Fazendo o "Joinha / L" (Polegar erguido como na foto)
      ctx.fillStyle = '#e2a97e'; // Tom de pele
      ctx.fillRect(size / 2 + 13, 16, 7, 7);
      // Mão com polegar pra cima
      ctx.fillRect(size / 2 + 18, 12, 4, 8);
      ctx.fillRect(size / 2 + 16, 15, 6, 6);

      // Braço Esquerdo relaxed
      ctx.fillStyle = '#e2a97e';
      ctx.fillRect(size / 2 - 17, 16, 5, 12);

      // 4. Cabeça, Rosto e Cabelo Curto
      ctx.fillStyle = '#e2a97e';
      ctx.beginPath();
      ctx.arc(size / 2, 10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Cabelo preto curto
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(size / 2, 8, 8, Math.PI, Math.PI * 2);
      ctx.fill();

      // Sorriso simpático e olhos
      ctx.fillStyle = '#451a03';
      ctx.fillRect(size / 2 - 4, 8, 2, 2);
      ctx.fillRect(size / 2 + 2, 8, 2, 2);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(size / 2, 12, 3, 0, Math.PI);
      ctx.stroke();
    },
  },
  {
    key: 'planalto_patriota',
    biomeKey: 'planalto',
    aliases: ['patriota', 'patriota_caminhao', 'patriota_do_caminhao'],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // 1. Pernas com Calça Jeans e Tênis
      ctx.fillStyle = '#1d4ed8'; // Jeans azul
      ctx.fillRect(size / 2 - 9, 28, 7, 10);
      ctx.fillRect(size / 2 + 2, 28, 7, 10);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(size / 2 - 10, 38, 8, 6);
      ctx.fillRect(size / 2 + 2, 38, 8, 6);

      // 2. Tronco Enrolado na Grande Bandeira do Brasil (Verde e Amarela)
      ctx.fillStyle = '#16a34a'; // Verde bandeira
      ctx.fillRect(size / 2 - 15, 14, 30, 16);

      // Losango Amarelo Ouro no Tronco
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(size / 2, 15);
      ctx.lineTo(size / 2 + 11, 22);
      ctx.lineTo(size / 2, 29);
      ctx.lineTo(size / 2 - 11, 22);
      ctx.closePath();
      ctx.fill();

      // Círculo Azul da Bandeira com Faixa Branca
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(size / 2, 22, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(size / 2 - 4, 21, 8, 1.5);

      // Capa da Bandeira esvoaçando nas costas
      ctx.fillStyle = '#15803d';
      ctx.fillRect(size / 2 - 18, 16, 4, 18);
      ctx.fillRect(size / 2 + 14, 16, 4, 18);

      // 3. Cabeça com Pintura Facial Verde e Amarela (Como na foto 3)
      ctx.fillStyle = '#fcd34d'; // Tom de pele clara
      ctx.beginPath();
      ctx.arc(size / 2, 9, 8, 0, Math.PI * 2);
      ctx.fill();

      // Pintura facial temática na bochecha (Verde e Amarela)
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(size / 2 - 5, 8, 4, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(size / 2 - 5, 11, 4, 3);

      // Cabelo castanho comprido ondulado
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(size / 2, 6, 8, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(size / 2 - 8, 7, 3, 14); // Mechas caindo
      ctx.fillRect(size / 2 + 5, 7, 3, 14);

      // Sorriso radiante e olhos
      ctx.fillStyle = '#451a03';
      ctx.fillRect(size / 2 - 3, 7, 2, 2);
      ctx.fillRect(size / 2 + 2, 7, 2, 2);
      ctx.strokeStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(size / 2, 11, 3, 0, Math.PI);
      ctx.stroke();
    },
  },
  {
    key: 'planalto_pulica',
    biomeKey: 'planalto',
    aliases: ['pulica', 'policia', 'policia_choque'],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // 1. Pernas com Calça Tática Preta e Coldre de Perna
      ctx.fillStyle = '#0f172a'; // Calça preta tática
      ctx.fillRect(size / 2 - 11, 28, 9, 11);
      ctx.fillRect(size / 2 + 2, 28, 9, 11);

      // Tiras de retenção e Coldre tático modular
      ctx.fillStyle = '#334155';
      ctx.fillRect(size / 2 + 8, 30, 4, 6);
      ctx.fillStyle = '#020617';
      ctx.fillRect(size / 2 + 9, 31, 3, 5);

      // Coturnos pretos reforçados
      ctx.fillStyle = '#020617';
      ctx.fillRect(size / 2 - 12, 38, 10, 6);
      ctx.fillRect(size / 2 + 2, 38, 10, 6);

      // 2. Tronco com Farda Preta e Colete Balístico Pesado
      ctx.fillStyle = '#1e1b4b'; // Farda azul marinho/preta
      ctx.fillRect(size / 2 - 14, 14, 28, 16);

      // Colete Balístico Tático Modular com Bolsos
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(size / 2 - 12, 13, 24, 16);

      // Bolsos modulares e presilhas
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(size / 2 - 10, 18, 8, 6);
      ctx.fillRect(size / 2 + 2, 18, 8, 6);
      ctx.fillRect(size / 2 - 6, 24, 12, 4);

      // Tarjeta de identificação e brasão prateado
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(size / 2 - 9, 15, 6, 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(size / 2 + 3, 15, 5, 2);

      // Óculos escuros pendurados no peito
      ctx.fillStyle = '#020617';
      ctx.fillRect(size / 2 - 3, 17, 6, 3);

      // 3. Braços Fortes com Insígnia e Luvas Táticas
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(size / 2 - 17, 14, 5, 12);
      ctx.fillRect(size / 2 + 12, 14, 5, 12);
      // Bandeira tática na manga
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(size / 2 - 17, 17, 4, 3);

      // Cassetete de contenção na mão
      ctx.fillStyle = '#020617';
      ctx.fillRect(size / 2 - 19, 24, 3, 14);

      // 4. Cabeça com Feições Imponentes e Boina Preta Tática Inclinada
      ctx.fillStyle = '#b45309'; // Tom de pele bronzeado/forte
      ctx.beginPath();
      ctx.arc(size / 2, 9, 8, 0, Math.PI * 2);
      ctx.fill();

      // Semblante sério
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(size / 2 - 4, 8, 3, 2);
      ctx.fillRect(size / 2 + 1, 8, 3, 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 - 3, 12, 6, 1.5);

      // Boina Preta Militar estilosa e inclinada para a direita
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(size / 2 + 1, 4, 10, 4.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Caimento da boina na lateral
      ctx.fillRect(size / 2 - 8, 4, 4, 6);

      // Insígnia prateada brilhante na boina
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(size / 2 - 5, 3, 3, 3);
    },
  },
  {
    key: 'planalto_boss_xandaum',
    biomeKey: 'planalto',
    aliases: ['xandaum', 'xandao', 'soberano_toga', 'boss_xandaum'],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
      // 1. Aura Jurídica Mística de Suprema Autoridade (Brilho Âmbar e Violeta)
      const auraGrad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, 32);
      auraGrad.addColorStop(0, 'rgba(217, 119, 6, 0.2)');
      auraGrad.addColorStop(0.7, 'rgba(147, 51, 234, 0.15)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 32, 0, Math.PI * 2);
      ctx.fill();

      // 2. GRANDE TOGA PRETA MAGISTRAL ESVOAÇANTE COM CAPA E OMBREIRAS (Foto 5)
      ctx.fillStyle = '#020617'; // Toga preta profunda
      ctx.beginPath();
      // Ombreiras estruturadas da toga
      ctx.moveTo(size / 2 - 16, 12);
      ctx.lineTo(size / 2 - 24, size - 2); // Asa esquerda da toga
      ctx.lineTo(size / 2 - 12, size - 2);
      ctx.lineTo(size / 2 - 8, 26);
      ctx.lineTo(size / 2 + 8, 26);
      ctx.lineTo(size / 2 + 12, size - 2);
      ctx.lineTo(size / 2 + 24, size - 2); // Asa direita da toga
      ctx.lineTo(size / 2 + 16, 12);
      ctx.closePath();
      ctx.fill();

      // Dobras e forro da toga esvoaçante
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(size / 2 - 22, 22, 6, 20);
      ctx.fillRect(size / 2 + 16, 22, 6, 20);

      // 3. TERNO FORMAL, CAMISA BRANCA E GRAVATA TEXTURIZADA POR BAIXO
      ctx.fillStyle = '#0f172a'; // Paletó do terno
      ctx.fillRect(size / 2 - 9, 14, 18, 18);

      // Camisa social branca impecável
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 4, 14);
      ctx.lineTo(size / 2, 22);
      ctx.lineTo(size / 2 + 4, 14);
      ctx.fill();

      // Gravata texturizada cinza chumbo
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 1.5, 15);
      ctx.lineTo(size / 2 + 1.5, 15);
      ctx.lineTo(size / 2 + 2, 25);
      ctx.lineTo(size / 2, 28);
      ctx.lineTo(size / 2 - 2, 25);
      ctx.closePath();
      ctx.fill();

      // Cordão de credencial no peito
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1;
      ctx.strokeRect(size / 2 - 3, 20, 6, 6);

      // Calça social preta e sapatos de verniz brilhantes
      ctx.fillStyle = '#020617';
      ctx.fillRect(size / 2 - 8, 30, 6, 12);
      ctx.fillRect(size / 2 + 2, 30, 6, 12);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(size / 2 - 9, 41, 7, 4);
      ctx.fillRect(size / 2 + 2, 41, 7, 4);

      // 4. MÃO COM RELÓGIO DOURADO E A SUPREMA CANETA DA JUSTIÇA
      // Mão esquerda com relógio dourado de luxo
      ctx.fillStyle = '#fcd34d';
      ctx.fillRect(size / 2 + 10, 24, 4, 5);
      ctx.fillStyle = '#eab308'; // Relógio de ouro
      ctx.fillRect(size / 2 + 10, 23, 4, 2);

      // Mão direita segurando a lendária Caneta Notificadora
      ctx.fillStyle = '#fcd34d';
      ctx.fillRect(size / 2 - 13, 24, 4, 5);
      // Caneta dourada com ponta de despacho azul brilhante
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(size / 2 - 16, 20, 3, 10);
      ctx.fillStyle = '#38bdf8'; // Tinta mágica luminosa
      ctx.fillRect(size / 2 - 16, 19, 3, 2);

      // 5. CABEÇA CARECA IMPONENTE E SEMBLANTE DETERMINADO (Foto 5)
      ctx.fillStyle = '#fcd34d'; // Tom de pele
      ctx.beginPath();
      ctx.arc(size / 2, 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Brilho característico na careca reluzente
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(size / 2 - 2, 5, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Olhar firme, sobrancelhas e semblante de autoridade máxima
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(size / 2 - 5, 7, 3, 2); // Sobrancelha direita
      ctx.fillRect(size / 2 + 2, 7, 3, 2); // Sobrancelha esquerda
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(size / 2 - 4, 9, 2, 2); // Olho
      ctx.fillRect(size / 2 + 2, 9, 2, 2);
      // Expressão austera
      ctx.fillStyle = '#78350f';
      ctx.fillRect(size / 2 - 3, 12, 6, 1.5);
    },
  },
];

