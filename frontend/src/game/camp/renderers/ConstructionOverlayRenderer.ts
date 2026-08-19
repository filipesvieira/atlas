import { drawPixelHammer } from './PixelHammerRenderer';
import { BuildingFootprint } from '../types';

export interface ConstructionOverlayOptions {
  currentLevel: number;
  targetLevel?: number;
  progress: number; // 0 a 100
  footprint: BuildingFootprint;
  x: number;
  groundY: number;
  time: number;
}

export class ConstructionOverlayRenderer {
  public render(ctx: CanvasRenderingContext2D, opts: ConstructionOverlayOptions) {
    const { currentLevel, targetLevel = currentLevel + 1, progress, footprint, x, groundY, time } = opts;

    const halfW = Math.max(24, footprint.width / 2);
    const height = Math.max(30, footprint.height);
    const topY = groundY - height;

    ctx.save();

    // 1. Andaimes laterais de madeira (Scaffolding)
    const scaffoldLeft = x - halfW - 4;
    const scaffoldRight = x + halfW + 4;

    ctx.fillStyle = '#78350f';
    // Postes verticais
    ctx.fillRect(scaffoldLeft, topY - 10, 4, height + 10);
    ctx.fillRect(scaffoldRight - 4, topY - 10, 4, height + 10);

    // Vigas horizontais
    const beamCount = Math.max(2, Math.floor(height / 25));
    ctx.fillStyle = '#92400e';
    for (let i = 0; i <= beamCount; i++) {
      const by = topY + (height / beamCount) * i;
      ctx.fillRect(scaffoldLeft, by - 2, (scaffoldRight - scaffoldLeft), 3);
    }

    // Travessas diagonais do andaime
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaffoldLeft, topY);
    ctx.lineTo(scaffoldRight, groundY);
    ctx.moveTo(scaffoldRight, topY);
    ctx.lineTo(scaffoldLeft, groundY);
    ctx.stroke();

    // 2. Fagulhas / Poeira de construção animada
    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 4; i++) {
      const pTime = (time * 0.0015 + i * 0.4) % 1;
      const px = x - halfW * 0.6 + ((i * 37 + Math.floor(time * 0.01)) % Math.max(1, Math.floor(halfW * 1.2)));
      const py = groundY - height * 0.2 - pTime * (height * 0.6);
      const alpha = Math.sin(pTime * Math.PI);
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.8})`;
      ctx.fillRect(px, py, 2, 2);
    }

    // 3. Martelo animado no topo direito da construção
    const hammerX = scaffoldRight - 2;
    const hammerY = topY - 8;
    drawPixelHammer(ctx, hammerX, hammerY, time);

    // 4. Barra de Progresso e Badge de Nível Flutuante
    const barW = Math.max(50, Math.min(100, halfW * 1.6));
    const barX = x - barW / 2;
    const barY = topY - 24;

    // Fundo da barra
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 7);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, 5);

    // Progresso preenchido
    const fillW = (barW * Math.min(100, Math.max(0, progress))) / 100;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, fillW, 5);

    // Badge Nv. Atual -> Nv. Alvo
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const label = `Nv. ${currentLevel} ➔ Nv. ${targetLevel}`;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x - 28, barY - 10, 56, 9);

    ctx.fillStyle = '#fef08a';
    ctx.fillText(label, x, barY - 5);

    ctx.restore();
  }
}

export const constructionOverlayRenderer = new ConstructionOverlayRenderer();
