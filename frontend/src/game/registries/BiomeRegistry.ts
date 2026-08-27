import {
  getAbyssBackground,
  getCampBackground,
  getChapolinBackground,
  getEsgotosBackground,
  getForestArenaBackground,
  getForestDepthObjects,
  getFrozenBackground,
  getOrcRuinsBackground,
  getPlanaltoBackground,
  getRogartesBackground,
  getSherequeArenaBackground,
  renderSherequeDynamic,
  getSherequeDepthObjects,
  renderForestArenaDynamic,
  renderCampDynamic,
} from '../renderers/biomes/BiomeRenderers';
import { ISO_ARENA_GEOMETRY, IsoWorldGeometry } from '../IsoWorldGeometry';
import { Registry } from './Registry';

export type BiomeRenderer = (width: number, height: number, geometry?: IsoWorldGeometry) => HTMLCanvasElement;
export type BiomeDynamicRenderer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  geometry?: IsoWorldGeometry,
) => void;
export interface BiomeDepthObject {
  depth: number;
  render: () => void;
}
export type BiomeDepthRenderer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  geometry?: IsoWorldGeometry,
) => BiomeDepthObject[];

export interface BiomeDefinition {
  key: string;
  aliases?: readonly string[];
  render: BiomeRenderer;
  renderDynamic?: BiomeDynamicRenderer;
  renderDepthObjects?: BiomeDepthRenderer;
  /** Presente apenas nos biomas que usam a malha isométrica do mundo. */
  isoGeometry?: IsoWorldGeometry;
}

class GameBiomeRegistry extends Registry<BiomeDefinition> {
  public getDefinition(biomeKey: string): BiomeDefinition | undefined {
    return this.get(biomeKey);
  }

  public getIsoGeometry(biomeKey: string): IsoWorldGeometry | undefined {
    return this.get(biomeKey)?.isoGeometry;
  }

  public render(biomeKey: string, width: number, height: number): HTMLCanvasElement {
    const definition = this.get(biomeKey) ?? this.get('forest');
    if (!definition) throw new Error('BiomeRegistry: biome padrão forest não registrado');
    return definition.render(width, height, definition.isoGeometry);
  }

  public renderDynamic(
    biomeKey: string,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ): void {
    // O renderer estático usa floresta como fallback. A camada dinâmica precisa
    // seguir a mesma regra, senão uma região com alias desconhecido mostra o
    // mapa, mas perde água, fogueira e demais animações do bioma.
    const definition = this.get(biomeKey) ?? this.get('forest');
    definition?.renderDynamic?.(ctx, width, height, time, definition.isoGeometry);
  }

  public getDepthObjects(
    biomeKey: string,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ): BiomeDepthObject[] {
    const definition = this.get(biomeKey) ?? this.get('forest');
    return definition?.renderDepthObjects?.(ctx, width, height, time, definition.isoGeometry) || [];
  }
}

/**
 * Associação region/biome -> renderer. O loop do GameViewport não conhece
 * regiões concretas; novos biomas são conectados apenas neste registry.
 */
export const biomeRegistry = new GameBiomeRegistry().registerAll([
  { key: 'camp', aliases: ['campamento', 'acampamento'], render: getCampBackground, renderDynamic: renderCampDynamic, isoGeometry: ISO_ARENA_GEOMETRY },
  { key: 'forest', render: getForestArenaBackground, renderDynamic: renderForestArenaDynamic, renderDepthObjects: getForestDepthObjects, isoGeometry: ISO_ARENA_GEOMETRY },
  { key: 'shereque', render: getSherequeArenaBackground, renderDynamic: renderSherequeDynamic, renderDepthObjects: getSherequeDepthObjects, isoGeometry: ISO_ARENA_GEOMETRY },
  { key: 'chapolin', render: getChapolinBackground },
  { key: 'orcruins', render: getOrcRuinsBackground },
  { key: 'esgotos', render: getEsgotosBackground },
  { key: 'planalto', aliases: ['brasilia', 'planalto_central'], render: getPlanaltoBackground },
  { key: 'rogartes', render: getRogartesBackground },
  { key: 'frozen', render: getFrozenBackground },
  { key: 'abyss', render: getAbyssBackground },
]);