import {
  HeroRenderOptions,
  renderHeroSkin,
  getArcherSprite,
  getKnightSprite,
  getMageSprite,
  getPeasantSprite,
  getWandererSprite,
} from '../renderers/heroes/HeroRenderers';
import { Registry } from './Registry';

export type HeroRenderer = (size: number) => HTMLCanvasElement;
export type DynamicHeroRenderer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts?: HeroRenderOptions
) => void;

export interface HeroVisualDefinition {
  key: string;
  aliases?: readonly string[];
  attackStyle: 'melee' | 'arrow' | 'magic';
  render: HeroRenderer;
  renderDynamic?: DynamicHeroRenderer;
}

class GameHeroRegistry extends Registry<HeroVisualDefinition> {
  public render(vocationOrKey: string, size = 48): HTMLCanvasElement {
    const definition = this.get(vocationOrKey) ?? this.get('hero_peasant') ?? this.get('hero_knight');
    if (!definition) throw new Error('HeroRegistry: hero padrão não registrado');
    return definition.render(size);
  }

  public renderDynamic(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    vocationOrKey: string,
    options: HeroRenderOptions = {}
  ): void {
    const definition = this.get(vocationOrKey) ?? this.get('hero_peasant') ?? this.get('hero_knight');
    const visualKey = definition ? definition.key : vocationOrKey;
    renderHeroSkin(ctx, x, y, visualKey, options);
  }

  public getAttackStyle(vocationOrKey: string): HeroVisualDefinition['attackStyle'] {
    return (this.get(vocationOrKey) ?? this.get('hero_peasant') ?? this.get('hero_knight'))?.attackStyle ?? 'melee';
  }
}

/**
 * Vocações e Skins registradas declarativamente.
 * O visual padrão do Aprendiz / Novo Jogador é o Camponês Aventureiro Clássico.
 */
export const heroRegistry = new GameHeroRegistry().registerAll([
  {
    key: 'hero_peasant',
    aliases: ['campones', 'camponesa', 'peasant', 'aprendiz', 'none', 'unarmed', 'desarmado', 'novice', 'default'],
    attackStyle: 'melee',
    render: getPeasantSprite,
  },
  {
    key: 'hero_wanderer',
    aliases: ['andarilho', 'caminhante', 'civil', 'wanderer', 'mochileiro', 'modern_wanderer'],
    attackStyle: 'melee',
    render: getWandererSprite,
  },
  {
    key: 'hero_knight',
    aliases: ['guerreiro', 'guerreira', 'knight', 'melee', 'sword', 'axe', 'club', 'cavaleiro', 'templario'],
    attackStyle: 'melee',
    render: getKnightSprite,
  },
  {
    key: 'hero_archer',
    aliases: ['arqueiro', 'arqueira', 'hunter', 'paladin', 'distance', 'bow', 'patrulheiro'],
    attackStyle: 'arrow',
    render: getArcherSprite,
  },
  {
    key: 'hero_mage',
    aliases: ['mago', 'maga', 'mage', 'sorcerer', 'druid', 'apprentice', 'acolyte', 'magic', 'wand', 'arcanista'],
    attackStyle: 'magic',
    render: getMageSprite,
  },
]);