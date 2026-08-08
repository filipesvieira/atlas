import type { MonsterVisualDefinition } from '../../registries/MonsterRegistry';
import { drawMonsterShadow } from './common';

export const tier3MonsterVisuals: MonsterVisualDefinition[] = [
  {
    key: 'rogartes_dementor',
    biomeKey: 'rogartes',
    aliases: ["dementador"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'rogartes_troll',
    biomeKey: 'rogartes',
    aliases: ["trasgo"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'rogartes_boss_darkmage',
    biomeKey: 'rogartes',
    aliases: ["voldemorte"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  }
];
