import { useEffect, useRef } from 'react';
import { CampBuildingRegistry } from '../../game/camp/CampBuildingRegistry';
import { getBuildingVisualProfile } from '../../game/camp/CampLayoutRegistry';

interface BuildingScenePreviewProps {
  buildingKey: string;
  level?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const previewDimensions = {
  sm: { cssW: 44, cssH: 38, width: 88, height: 76 },
  md: { cssW: 64, cssH: 54, width: 128, height: 108 },
  lg: { cssW: 88, cssH: 72, width: 176, height: 144 },
};

/**
 * Miniatura do mesmo Canvas renderer usado na vila. Isso elimina a divergência
 * entre o ícone do card e a construção que o jogador realmente posiciona.
 */
export function BuildingScenePreview({ buildingKey, level = 1, size = 'sm', className = '' }: BuildingScenePreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dims = previewDimensions[size];

  useEffect(() => {
    const canvas = ref.current;
    const renderer = CampBuildingRegistry.get(buildingKey);
    if (!canvas || !renderer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const visual = getBuildingVisualProfile(buildingKey);
    const availableW = canvas.width - 12;
    const availableH = canvas.height - 12;
    const sceneW = Math.max(1, visual.silhouetteWidth * visual.sceneScale);
    const sceneH = Math.max(1, visual.silhouetteHeight * visual.sceneScale);
    const fit = Math.min(1.25, availableW / sceneW, availableH / sceneH);
    const scale = visual.sceneScale * fit;

    renderer(ctx, {
      ctx,
      level,
      targetLevel: level,
      discovered: true,
      isUnderConstruction: false,
      constructionProgress: 0,
      x: canvas.width / 2,
      y: canvas.height - 7,
      scale,
      time: 700,
      footprint: {
        width: Math.round(visual.silhouetteWidth * scale),
        height: Math.round(visual.silhouetteHeight * scale),
      },
    });
  }, [buildingKey, level, dims.height, dims.width]);

  return (
    <canvas
      ref={ref}
      width={dims.width}
      height={dims.height}
      className={`block pixel-art ${className}`}
      style={{ width: dims.cssW, height: dims.cssH, imageRendering: 'pixelated' }}
      aria-label={`Visual da construção ${buildingKey}`}
    />
  );
}