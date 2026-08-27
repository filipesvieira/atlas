import { drawPixelHammer } from './PixelHammerRenderer';
import { drawIsoFootprint } from './IsoBuildingPrimitives';
import { BuildingFootprint } from '../types';

export interface ConstructionOverlayOptions {
  currentLevel: number;
  targetLevel?: number;
  progress: number;
  footprint: BuildingFootprint;
  x: number;
  groundY: number;
  time: number;
}

export class ConstructionOverlayRenderer {
  public render(ctx: CanvasRenderingContext2D, opts: ConstructionOverlayOptions) {
    const { currentLevel, targetLevel = currentLevel + 1, progress, footprint, x, groundY, time } = opts;
    const baseWidth = Math.max(30, footprint.width);
    const baseDepth = Math.max(18, Math.round(footprint.height * 0.38));
    const scaffoldHeight = Math.max(30, Math.round(footprint.height * 0.78));
    const topY = groundY - scaffoldHeight;

    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.translate(x, groundY);

    // Piso, postes e travessas seguem o losango da construção, mantendo o
    // andaime coerente com a mesma perspectiva usada pelos prédios prontos.
    drawIsoFootprint(ctx, baseWidth, baseDepth, 'rgba(120,53,15,0.25)', '#f59e0b');
    const west = { x: -baseWidth / 2, y: 0 };
    const east = { x: baseWidth / 2, y: 0 };
    const north = { x: 0, y: -baseDepth / 4 };
    const south = { x: 0, y: baseDepth / 4 };
    const topWest = { x: west.x, y: -scaffoldHeight };
    const topEast = { x: east.x, y: -scaffoldHeight };
    const topNorth = { x: north.x, y: north.y - scaffoldHeight };
    const topSouth = { x: south.x, y: south.y - scaffoldHeight };

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    [west, east, north, south].forEach((post) => {
      ctx.beginPath();
      ctx.moveTo(post.x, post.y);
      ctx.lineTo(post.x === 0 ? post.x : post.x, post.y - scaffoldHeight);
      ctx.stroke();
    });
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    [
      [topWest, topNorth], [topNorth, topEast], [topEast, topSouth], [topSouth, topWest],
      [west, north], [north, east], [east, south], [south, west],
      [topWest, south], [topEast, south],
    ].forEach(([from, to]) => {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });
    ctx.restore();

    // Fagulhas / poeira de obra no volume da construção.
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 4; i++) {
      const particleProgress = (time * 0.0015 + i * 0.4) % 1;
      const px = x - baseWidth * 0.32 + ((i * 37 + Math.floor(time * 0.01)) % Math.max(1, Math.floor(baseWidth * 0.64)));
      const py = groundY - scaffoldHeight * 0.2 - particleProgress * (scaffoldHeight * 0.6);
      const alpha = Math.sin(particleProgress * Math.PI);
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.8})`;
      ctx.fillRect(px, py, 2, 2);
    }

    drawPixelHammer(ctx, x + baseWidth / 2 + 5, topY - 8, time);

    const barW = Math.max(50, Math.min(100, baseWidth * 0.72));
    const barX = x - barW / 2;
    const barY = topY - 24;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 7);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, 5);

    const fillW = (barW * Math.min(100, Math.max(0, progress))) / 100;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, fillW, 5);

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