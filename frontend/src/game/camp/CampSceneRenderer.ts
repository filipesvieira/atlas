import type { CampState, SettlementResident } from '../../hooks/useGameSocket';
import { CampBuildingRegistry } from './CampBuildingRegistry';
import { CampLayoutSlots } from './CampLayoutRegistry';
import { BuildingRenderContext } from './types';
import { constructionOverlayRenderer } from './renderers/ConstructionOverlayRenderer';

export class CampSceneRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    camp: CampState | null,
    time: number,
    residents: SettlementResident[] = []
  ) {
    const slotsMap = camp?.buildings || {};
    const blueprintsMap = camp?.blueprints || {};

    // Ordena os slots por sortY para profundidade correta (construções do fundo desenhadas primeiro)
    const sortedSlots = Object.values(CampLayoutSlots).sort((a, b) => a.sortY - b.sortY);

    for (const slotCfg of sortedSlots) {
      const slotData = slotsMap[slotCfg.slotKey];
      const buildingKey = slotData?.building_key || slotCfg.buildingKey;

      // Verifica se a construção foi descoberta
      // Fogueira é sempre descoberta; outras dependem do blueprint ou de já terem sido construídas
      const isDiscovered =
        buildingKey === 'campfire' ||
        Boolean(blueprintsMap[buildingKey]) ||
        (slotData && slotData.level > 0);

      // Se a construção ainda não foi descoberta, não renderiza nada no slot (permanece terreno natural)
      if (!isDiscovered) continue;

      const renderer = CampBuildingRegistry.get(buildingKey);
      if (!renderer) continue;

      let isUnderConstruction = false;
      let constructionProgress = 0;
      let targetLevel = (slotData?.level || 0) + 1;

      if (slotData?.upgrade_target_level && slotData.upgrade_started_at && slotData.upgrade_ends_at) {
        const start = new Date(slotData.upgrade_started_at).getTime();
        const end = new Date(slotData.upgrade_ends_at).getTime();
        const now = Date.now();
        if (now < end) {
          isUnderConstruction = true;
          targetLevel = slotData.upgrade_target_level;
          const totalDuration = end - start;
          const elapsed = now - start;
          constructionProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        }
      }

      const footprint = {
        width: slotCfg.maxWidth,
        height: slotCfg.maxHeight,
      };

      const renderCtx: BuildingRenderContext = {
        ctx,
        level: slotData?.level || 0,
        targetLevel,
        discovered: true,
        isUnderConstruction,
        constructionProgress,
        x: slotCfg.anchorX,
        y: slotCfg.groundY,
        scale: slotCfg.baseScale || 1.0,
        time,
        footprint,
      };

      // 1. Desenha o nível atual da construção
      renderer(ctx, renderCtx);

      // 2. Se estiver em obra, desenha o overlay com andaime, martelo, poeira e progresso por cima
      if (isUnderConstruction) {
        constructionOverlayRenderer.render(ctx, {
          currentLevel: slotData?.level || 0,
          targetLevel,
          progress: constructionProgress,
          footprint,
          x: slotCfg.anchorX,
          groundY: slotCfg.groundY,
          time,
        });
      }
    }

    this.renderResidents(ctx, residents, time);
  }

  private renderResidents(ctx: CanvasRenderingContext2D, residents: SettlementResident[], time: number) {
    const visibleResidents = residents.filter((resident) => resident.status !== 'collecting').slice(0, 16);
    
    // Rotas de travessia de ponta a ponta do vilarejo
    const traversalRoutes = [
      { startX: 130, startY: 214, endX: 690, endY: 228 }, // Pescador (Cabanas Oeste <-> Rio Leste)
      { startX: 210, startY: 218, endX: 650, endY: 232 }, // Lenhador / Minerador (Centro <-> Floresta Leste)
      { startX: 150, startY: 208, endX: 580, endY: 194 }, // Cultivador (Alojamento Oeste <-> Hortas Leste)
      { startX: 120, startY: 212, endX: 620, endY: 220 }, // Ferreiro / Artesão (Oeste <-> Armazém Leste)
      { startX: 280, startY: 178, endX: 680, endY: 222 }, // Alquimista (Fonte Arcana <-> Laboratório Leste)
      { startX: 170, startY: 222, endX: 710, endY: 216 }, // Marceneiro / Construtor
      { startX: 140, startY: 210, endX: 600, endY: 230 }, // Coureiro / Provedor
      { startX: 230, startY: 216, endX: 730, endY: 225 }, // Carregador da Comunidade
    ];

    visibleResidents.forEach((resident, index) => {
      const route = traversalRoutes[index % traversalRoutes.length];
      const isCrafting = resident.status === 'crafting';

      // Ciclo completo de travessia de longo curso (ida, pausa de trabalho, volta, pausa de descanso)
      const totalCycle = 22000 + (index * 2600);
      const cycleProgress = ((time + index * 4200) % totalCycle) / totalCycle;

      let currentX: number;
      let currentY: number;
      let isWalking = false;
      let facing = 1;

      if (isCrafting) {
        currentX = 375 + (index % 3) * 20;
        currentY = 234;
        isWalking = false;
        facing = 1;
      } else if (cycleProgress < 0.42) {
        // 1. Caminhando ativamente de Oeste para Leste
        const t = cycleProgress / 0.42;
        currentX = route.startX + (route.endX - route.startX) * t;
        currentY = route.startY + (route.endY - route.startY) * t + Math.sin(t * Math.PI * 4) * 2;
        isWalking = true;
        facing = 1;
      } else if (cycleProgress < 0.50) {
        // 2. Parado no destino Leste executando atividade
        currentX = route.endX;
        currentY = route.endY;
        isWalking = false;
        facing = 1;
      } else if (cycleProgress < 0.92) {
        // 3. Caminhando ativamente de Leste de volta para Oeste
        const t = (cycleProgress - 0.50) / 0.42;
        currentX = route.endX + (route.startX - route.endX) * t;
        currentY = route.endY + (route.startY - route.endY) * t + Math.sin(t * Math.PI * 4) * 2;
        isWalking = true;
        facing = -1;
      } else {
        // 4. Parado no ponto de origem Oeste descansando/descarregando
        currentX = route.startX;
        currentY = route.startY;
        isWalking = false;
        facing = -1;
      }

      const bob = isCrafting
        ? Math.abs(Math.sin(time / 140)) * 2.5
        : isWalking
        ? Math.abs(Math.sin(time / 140)) * 2.0
        : Math.sin(time / 450 + index * 1.3) * 1.0;
      
      const skills = new Set(resident.skills.map((skill) => skill.skill_key));
      let role: 'fisher' | 'extractor' | 'cultivator' | 'craftsman' = 'cultivator';
      if (skills.has('fisher')) {
        role = 'fisher';
      } else if (skills.has('lumberjack') || skills.has('miner')) {
        role = 'extractor';
      } else if (skills.has('blacksmith') || skills.has('jeweler') || skills.has('alchemist') || skills.has('woodworker')) {
        role = 'craftsman';
      }

      this.renderResidentSprite(ctx, currentX, currentY - bob, role, isCrafting, isWalking, facing, time + index * 200, index);

      // Placa de Identificação com Nome (sempre desespelhada e legível)
      ctx.save();
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      const label = resident.name;
      const width = Math.max(52, ctx.measureText(label).width + 10);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
      ctx.fillRect(Math.round(currentX - width / 2), currentY - 50 - bob, Math.round(width), 12);
      ctx.strokeStyle = isCrafting ? '#f59e0b' : '#475569';
      ctx.strokeRect(Math.round(currentX - width / 2) + 0.5, currentY - 49.5 - bob, Math.round(width) - 1, 11);
      ctx.fillStyle = isCrafting ? '#fbbf24' : '#f1f5f9';
      ctx.fillText(label, currentX, currentY - 41 - bob);
      ctx.restore();
    });
  }

  private renderResidentSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    role: 'fisher' | 'extractor' | 'cultivator' | 'craftsman',
    crafting: boolean,
    walking: boolean,
    facing: number,
    time: number,
    seed: number
  ) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // 1. Sombra projetada no solo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Espelha no eixo X conforme a direção de caminhada
    if (facing === -1) {
      ctx.scale(-1, 1);
    }

    const blink = Math.sin(time / 1500 + seed * 3) > 0.96;
    const breathe = Math.sin(time / 450 + seed) * 0.8;
    const walkStep = walking ? Math.sin(time / 120) * 3 : 0;

    // Paletas de Tons de Pele e Cabelo baseadas no índice
    const skinTones = ['#fed7aa', '#fde68a', '#fbcfe8', '#fdba74'];
    const hairTones = ['#78350f', '#451a03', '#92400e', '#1c1917', '#b45309'];
    const skin = skinTones[seed % skinTones.length];
    const hair = hairTones[seed % hairTones.length];

    // 2. Botas e Pernas Humanóides com passos
    ctx.fillStyle = '#18181b'; // Solado
    ctx.fillRect(-7 - walkStep, 16, 5, 2);
    ctx.fillRect(2 + walkStep, 16, 5, 2);

    // Botas de Couro
    const bootColor = role === 'extractor' ? '#451a03' : role === 'fisher' ? '#1e293b' : '#78350f';
    ctx.fillStyle = bootColor;
    ctx.fillRect(-6 - walkStep, 10, 4, 6);
    ctx.fillRect(2 + walkStep, 10, 4, 6);

    // Calça com volume e dobra
    const pantsColor = role === 'fisher' ? '#1e3a8a' : role === 'extractor' ? '#1e293b' : role === 'craftsman' ? '#334155' : '#b45309';
    ctx.fillStyle = pantsColor;
    ctx.fillRect(-6 - walkStep * 0.5, 3, 4, 8);
    ctx.fillRect(2 + walkStep * 0.5, 3, 4, 8);
    ctx.fillRect(-6, 2, 12, 3); // Cintura

    // Cinto com fivela de latão
    ctx.fillStyle = '#292524';
    ctx.fillRect(-6, 1, 12, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-1.5, 1, 3, 2);

    // 3. Torso e Vestimentas (Y: -10 a 2)
    if (role === 'fisher') {
      // Camisa listrada azul e branca com colete corta-vento
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-6, -9 + breathe, 12, 10);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-6, -7 + breathe, 12, 2);
      ctx.fillRect(-6, -3 + breathe, 12, 2);
      // Colete azul marinho
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-7, -9 + breathe, 3, 10);
      ctx.fillRect(4, -9 + breathe, 3, 10);
    } else if (role === 'extractor') {
      // Camisa de flanela vermelha com suspensórios de couro
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6, -9 + breathe, 12, 10);
      ctx.fillStyle = '#991b1b'; // Xadrez
      ctx.fillRect(-6, -6 + breathe, 12, 2);
      ctx.fillRect(-2, -9 + breathe, 4, 10);
      // Suspensórios
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-5, -9 + breathe, 2, 10);
      ctx.fillRect(3, -9 + breathe, 2, 10);
    } else if (role === 'craftsman') {
      // Camisa de linho marfim com avental reforçado de ferreiro
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-6, -9 + breathe, 12, 10);
      // Avental de couro
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4, -6 + breathe, 8, 9);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-3, -9 + breathe, 1.5, 4);
      ctx.fillRect(1.5, -9 + breathe, 1.5, 4);
    } else {
      // Túnica verde de linho de cultivador com gola em V
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-6, -9 + breathe, 12, 10);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-6, -9 + breathe, 2, 10);
      ctx.fillRect(4, -9 + breathe, 2, 10);
      ctx.fillStyle = skin; // Gola aberta em V
      ctx.fillRect(-1.5, -9 + breathe, 3, 3);
    }

    // 4. Braços e Mãos (Humanóides)
    ctx.fillStyle = role === 'fisher' ? '#1d4ed8' : role === 'extractor' ? '#dc2626' : role === 'craftsman' ? '#fef3c7' : '#16a34a';
    ctx.fillRect(-8, -8 + breathe, 2.5, 7);
    ctx.fillRect(5.5, -8 + breathe, 2.5, 7);
    ctx.fillStyle = skin; // Mãos
    ctx.fillRect(-8, -1 + breathe, 2.5, 2.5);
    ctx.fillRect(5.5, -1 + breathe, 2.5, 2.5);

    // 5. Cabeça e Rosto Humanóide Completo (Y: -20 a -9)
    // Cabeça
    ctx.fillStyle = skin;
    ctx.fillRect(-4.5, -18 + breathe, 9, 9);
    // Nariz / Bochecha
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(-0.5, -13 + breathe, 1, 1.5);
    // Olhos Expressivos (com piscada)
    if (!blink) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-3, -15 + breathe, 1.5, 2);
      ctx.fillRect(1.5, -15 + breathe, 1.5, 2);
    } else {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-3, -14 + breathe, 2, 1);
      ctx.fillRect(1, -14 + breathe, 2, 1);
    }
    // Boca / Sorriso sutil
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-1.5, -11 + breathe, 3, 1);

    // 6. Cabelo ou Chapéu Típico por Profissão
    if (role === 'fisher') {
      // Chapéu de pescador amarelo-mostarda com aba
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-7, -19 + breathe, 14, 2.5);
      ctx.fillRect(-5, -23 + breathe, 10, 4.5);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-5, -20 + breathe, 10, 1.5);
    } else if (role === 'cultivator') {
      // Chapéu de palha de fazendeiro com fita verde
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-8, -19 + breathe, 16, 2.5);
      ctx.fillRect(-5, -23 + breathe, 10, 4.5);
      ctx.fillStyle = '#15803d'; // Fita verde
      ctx.fillRect(-5, -20 + breathe, 10, 1.5);
    } else if (role === 'extractor') {
      // Bandana de minerador / lenhador com cabelo volumoso
      ctx.fillStyle = hair;
      ctx.fillRect(-5.5, -21 + breathe, 11, 4);
      ctx.fillRect(-5.5, -18 + breathe, 2, 5);
      ctx.fillRect(3.5, -18 + breathe, 2, 5);
      ctx.fillStyle = '#dc2626'; // Bandana vermelha
      ctx.fillRect(-5, -18 + breathe, 10, 2);
    } else {
      // Cabelo ondulado clássico volumoso
      ctx.fillStyle = hair;
      ctx.fillRect(-5.5, -21 + breathe, 11, 5);
      ctx.fillRect(-5.5, -18 + breathe, 2, 6);
      ctx.fillRect(3.5, -18 + breathe, 2, 6);
    }

    // 7. Ferramentas e Equipamentos Profissionais
    if (role === 'fisher') {
      // Vara de pesca de bambu com linha curvada e balde
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(7, 0 + breathe);
      ctx.lineTo(16, -18 + breathe);
      ctx.stroke();
      // Linha de nylon transparente
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, -18 + breathe);
      ctx.quadraticCurveTo(20, -5 + breathe, 21, 12);
      ctx.stroke();
      // Balde de metal com água/peixe
      ctx.fillStyle = '#64748b';
      ctx.fillRect(17, 8, 7, 9);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(18, 8, 5, 2);
    } else if (role === 'extractor') {
      // Machado de lenhador / Picareta de minerador com animação de corte/trabalho
      const toolAngle = crafting ? Math.sin(time / 110) * 0.7 - 0.2 : Math.sin(time / 600) * 0.15 + 0.2;
      ctx.save();
      ctx.translate(7, 0 + breathe);
      ctx.rotate(toolAngle);
      // Cabo de madeira nobre
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1, -16, 2.5, 24);
      // Lâmina de aço temperado
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-7, -17, 9, 6);
      ctx.fillStyle = '#cbd5e1'; // Fio de corte brilhante
      ctx.fillRect(-7, -17, 2, 6);
      ctx.restore();
    } else if (role === 'craftsman') {
      // Martelo de forja ou pinça nas mãos
      const hammerAngle = crafting ? Math.sin(time / 100) * 0.8 : 0.2;
      ctx.save();
      ctx.translate(7, 0 + breathe);
      ctx.rotate(hammerAngle);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1, -10, 2, 16);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-4, -13, 8, 5);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-4, -13, 2, 5);
      ctx.restore();
    } else {
      // Cultivador: Cesta de vime com trigo/ervas ou foice de colheita
      ctx.fillStyle = '#b45309'; // Cesta de vime
      ctx.fillRect(7, 3 + breathe, 8, 8);
      ctx.fillStyle = '#fde047'; // Trigo colhido
      ctx.fillRect(8, 0 + breathe, 2, 4);
      ctx.fillRect(11, -1 + breathe, 2, 5);
      ctx.fillRect(13, 1 + breathe, 2, 3);
    }

    // 8. Efeito de Crafting Ativo (Faíscas e Martelo)
    if (crafting) {
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      const bounce = Math.abs(Math.sin(time / 110)) * 4;
      ctx.fillText('🔨', 0, -29 - bounce);
      // Faíscas douradas
      const sparkAlpha = Math.abs(Math.sin(time / 80));
      ctx.fillStyle = `rgba(251, 191, 36, ${sparkAlpha})`;
      ctx.fillRect(10 + Math.sin(time / 60) * 6, -10 - Math.cos(time / 60) * 6, 2, 2);
      ctx.fillRect(-8 + Math.cos(time / 70) * 5, -8 + Math.sin(time / 70) * 5, 1.5, 1.5);
    }

    ctx.restore();
  }
}

export const campSceneRenderer = new CampSceneRenderer();
