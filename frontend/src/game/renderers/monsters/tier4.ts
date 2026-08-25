import type { MonsterVisualDefinition } from '../../registries/MonsterRegistry';
import { drawMonsterShadow } from './common';

export const tier4MonsterVisuals: MonsterVisualDefinition[] = [
  {
    key: 'frozen_specter',
    biomeKey: 'frozen',
    aliases: ["espectro","lord_espectro"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'frozen_zombie',
    biomeKey: 'frozen',
    aliases: ["zumbi","rei_da_noite"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'frozen_golem',
    biomeKey: 'frozen',
    aliases: ["golem"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'frozen_chimera',
    biomeKey: 'frozen',
    aliases: ["quimera"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  },
  {
    key: 'frozen_boss_master',
    biomeKey: 'frozen',
    aliases: ["mestre_do_santuario","mestre_do_santuário","mestre"],
    render: (ctx, size) => {
      drawMonsterShadow(ctx, size);
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
    },
  }
];