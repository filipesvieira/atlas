import { HeroRenderer } from './HeroRegistry';
import { getPeasantSprite, getWandererSprite, getKnightSprite, getArcherSprite, getMageSprite } from '../renderers/heroes/HeroRenderers';

export type SkinRarity = 'Comum' | 'Raro' | 'Épico' | 'Lendário' | 'Mítico';

export interface HeroSkin {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  rarity: SkinRarity;
  icon: string;
  attackStyle: 'melee' | 'arrow' | 'magic';
  unlockedByDefault: boolean;
  renderKey: string;
  render: HeroRenderer;
}

export const AVAILABLE_SKINS: HeroSkin[] = [
  {
    id: 'peasant',
    name: 'Camponês Aventureiro',
    subtitle: 'Traje Clássico de Aprendiz',
    description: 'Camisa rústica de linho marfim com colete escuro bordado a carmim, culote ocre e botas altas de couro. O traje tradicional de todo jovem herói em Atlas.',
    rarity: 'Comum',
    icon: '🌾',
    attackStyle: 'melee',
    unlockedByDefault: true,
    renderKey: 'hero_peasant',
    render: getPeasantSprite,
  },
  {
    id: 'wanderer',
    name: 'Andarilho Mochileiro',
    subtitle: 'Explorador Moderno',
    description: 'Equipado com jaqueta esportiva vermelha, calça jeans resistente e mochila cargueira com cantil e kit de sobrevivência.',
    rarity: 'Raro',
    icon: '🎒',
    attackStyle: 'melee',
    unlockedByDefault: true,
    renderKey: 'hero_wanderer',
    render: getWandererSprite,
  },
  {
    id: 'knight',
    name: 'Cavaleiro Templário',
    subtitle: 'Guardião da Luz Sagrada',
    description: 'Armadura pesada de placas de aço polido, elmo fechado, capa carmim com broche dourado e imponente escudo da cruz vermelha.',
    rarity: 'Épico',
    icon: '⚔️',
    attackStyle: 'melee',
    unlockedByDefault: true,
    renderKey: 'hero_knight',
    render: getKnightSprite,
  },
  {
    id: 'archer',
    name: 'Patrulheiro dos Bosques',
    subtitle: 'Mestre da Precisão Selvagem',
    description: 'Traje de couro flexível com capa camuflada verde-floresta, capuz de caça, aljava de flechas e arco longo recurvo.',
    rarity: 'Épico',
    icon: '🏹',
    attackStyle: 'arrow',
    unlockedByDefault: true,
    renderKey: 'hero_archer',
    render: getArcherSprite,
  },
  {
    id: 'mage',
    name: 'Arcanista Elemental',
    subtitle: 'Conjurador dos Mistérios',
    description: 'Manto azul-índigo com runas arcanas resplandecentes, ombreiras de cristal estelar e cajado com foco de vórtice cósmico.',
    rarity: 'Lendário',
    icon: '🔮',
    attackStyle: 'magic',
    unlockedByDefault: true,
    renderKey: 'hero_mage',
    render: getMageSprite,
  },
];

export class SkinRegistryService {
  private static activeSkinId: string = 'peasant';
  private static currentCharId: string = '';
  private static listeners: Set<(skinId: string) => void> = new Set();

  public static init(charId?: string) {
    if (charId) {
      this.currentCharId = charId;
    }
    if (typeof window !== 'undefined') {
      const storageKey = this.currentCharId ? `atlas_active_skin_${this.currentCharId}` : 'atlas_active_skin';
      const saved = localStorage.getItem(storageKey);
      if (saved && AVAILABLE_SKINS.some((s) => s.id === saved)) {
        this.activeSkinId = saved;
      } else {
        this.activeSkinId = 'peasant'; // Default para novos personagens: Camponês Aventureiro
      }
    }
  }

  public static setCharacterId(charId: string) {
    if (!charId || charId === this.currentCharId) return;
    this.currentCharId = charId;
    if (typeof window !== 'undefined') {
      const storageKey = `atlas_active_skin_${charId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved && AVAILABLE_SKINS.some((s) => s.id === saved)) {
        this.activeSkinId = saved;
      } else {
        this.activeSkinId = 'peasant'; // Sempre Camponês para qualquer personagem que não escolheu outra skin
      }
    } else {
      this.activeSkinId = 'peasant';
    }
    this.listeners.forEach((cb) => cb(this.activeSkinId));
  }

  public static getActiveSkinId(charId?: string): string {
    const targetId = charId || this.currentCharId;
    if (typeof window !== 'undefined' && targetId) {
      const saved = localStorage.getItem(`atlas_active_skin_${targetId}`);
      if (saved && AVAILABLE_SKINS.some((s) => s.id === saved)) {
        return saved;
      }
      return 'peasant';
    }
    return this.activeSkinId || 'peasant';
  }

  public static getActiveSkin(charId?: string): HeroSkin {
    const skinId = this.getActiveSkinId(charId);
    const skin = AVAILABLE_SKINS.find((s) => s.id === skinId);
    return skin || AVAILABLE_SKINS[0];
  }

  public static setActiveSkinId(skinId: string, charId?: string) {
    if (!AVAILABLE_SKINS.some((s) => s.id === skinId)) return;
    this.activeSkinId = skinId;
    const targetId = charId || this.currentCharId;
    if (typeof window !== 'undefined') {
      if (targetId) {
        localStorage.setItem(`atlas_active_skin_${targetId}`, skinId);
      }
      localStorage.setItem('atlas_active_skin', skinId);
    }
    this.listeners.forEach((cb) => cb(skinId));
  }

  public static subscribe(cb: (skinId: string) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public static getSkin(id: string): HeroSkin | undefined {
    return AVAILABLE_SKINS.find((s) => s.id === id);
  }

  public static getAllSkins(): HeroSkin[] {
    return AVAILABLE_SKINS;
  }
}

// Inicializa o serviço no carregamento do módulo
if (typeof window !== 'undefined') {
  SkinRegistryService.init();
}