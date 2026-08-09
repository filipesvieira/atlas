import { getArcherSprite, getKnightSprite, getMageSprite, getWandererSprite } from '../renderers/heroes/HeroRenderers';
import { Registry } from './Registry';

export type HeroRenderer = (size: number) => HTMLCanvasElement;

export interface HeroVisualDefinition {
  key: string;
  aliases?: readonly string[];
  attackStyle: 'melee' | 'arrow' | 'magic';
  render: HeroRenderer;
}

class GameHeroRegistry extends Registry<HeroVisualDefinition> {
  public render(vocationOrKey: string, size = 48): HTMLCanvasElement {
    const definition = this.get(vocationOrKey) ?? this.get('hero_wanderer') ?? this.get('hero_knight');
    if (!definition) throw new Error('HeroRegistry: hero padrão não registrado');
    return definition.render(size);
  }

  public getAttackStyle(vocationOrKey: string): HeroVisualDefinition['attackStyle'] {
    return (this.get(vocationOrKey) ?? this.get('hero_wanderer') ?? this.get('hero_knight'))?.attackStyle ?? 'melee';
  }
}

/**
 * Vocações antigas e novas registradas declarativamente.
 * Quando o herói está desarmado, ele assume o visual de Andarilho / Caminhante Civil.
 */
export const heroRegistry = new GameHeroRegistry().registerAll([
  {
    key: 'hero_wanderer',
    aliases: ['andarilho', 'caminhante', 'civil', 'wanderer', 'aprendiz', 'none', 'unarmed', 'desarmado', 'novice'],
    attackStyle: 'melee',
    render: getWandererSprite,
  },
  {
    key: 'hero_knight',
    aliases: ['guerreiro', 'guerreira', 'knight', 'melee', 'sword', 'axe', 'club'],
    attackStyle: 'melee',
    render: getKnightSprite,
  },
  {
    key: 'hero_archer',
    aliases: ['arqueiro', 'arqueira', 'hunter', 'paladin', 'distance', 'bow'],
    attackStyle: 'arrow',
    render: getArcherSprite,
  },
  {
    key: 'hero_mage',
    aliases: ['mago', 'maga', 'mage', 'sorcerer', 'druid', 'apprentice', 'acolyte', 'magic', 'wand'],
    attackStyle: 'magic',
    render: getMageSprite,
  },
]);
