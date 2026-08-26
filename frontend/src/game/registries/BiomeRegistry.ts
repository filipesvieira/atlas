import {
  getAbyssBackground,
  getCampBackground,
  getChapolinBackground,
  getEsgotosBackground,
  getForestArenaBackground,
  getFrozenBackground,
  getOrcRuinsBackground,
  getPlanaltoBackground,
  getRogartesBackground,
  getSherequeBackground,
  renderForestArenaDynamic,
  renderCampDynamic,
} from '../renderers/biomes/BiomeRenderers';
import { Registry } from './Registry';

export type BiomeRenderer = (width: number, height: number) => HTMLCanvasElement;
export type BiomeDynamicRenderer = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => void;

export interface BiomeDefinition {
  key: string;
  aliases?: readonly string[];
  render: BiomeRenderer;
  renderDynamic?: BiomeDynamicRenderer;
}

class GameBiomeRegistry extends Registry<BiomeDefinition> {
  public render(biomeKey: string, width: number, height: number): HTMLCanvasElement {
    const definition = this.get(biomeKey) ?? this.get('forest');
    if (!definition) throw new Error('BiomeRegistry: biome padrão forest não registrado');
    return definition.render(width, height);
  }

  public renderDynamic(biomeKey: string, ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    // O renderer estático usa floresta como fallback. A camada dinâmica precisa
    // seguir a mesma regra, senão uma região com alias desconhecido mostra o
    // mapa, mas perde água, fogueira e demais animações do bioma.
    const definition = this.get(biomeKey) ?? this.get('forest');
    definition?.renderDynamic?.(ctx, width, height, time);
  }
}

/**
 * Associação region/biome -> renderer. O loop do GameViewport não conhece
 * regiões concretas; novos biomas são conectados apenas neste registry.
 */
export const biomeRegistry = new GameBiomeRegistry().registerAll([
  { key: 'camp', aliases: ['campamento', 'acampamento'], render: getCampBackground, renderDynamic: renderCampDynamic },
  { key: 'forest', render: getForestArenaBackground, renderDynamic: renderForestArenaDynamic },
  { key: 'shereque', render: getSherequeBackground },
  { key: 'chapolin', render: getChapolinBackground },
  { key: 'orcruins', render: getOrcRuinsBackground },
  { key: 'esgotos', render: getEsgotosBackground },
  { key: 'planalto', aliases: ['brasilia', 'planalto_central'], render: getPlanaltoBackground },
  { key: 'rogartes', render: getRogartesBackground },
  { key: 'frozen', render: getFrozenBackground },
  { key: 'abyss', render: getAbyssBackground },
]);
