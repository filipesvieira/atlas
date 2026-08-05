import { Texture, Sprite } from 'pixi.js';

/**
 * SpriteGenerator — Gerador Nativo de Pixel Art 32×32px
 *
 * Gera todos os sprites e tiles do jogo programaticamente via
 * HTML5 Canvas → DataURL → PIXI.Texture.
 * Zero assets externos — tudo renderizado na memória em tempo de execução.
 */
export class SpriteGenerator {
  /**
   * Renderiza uma matriz de pixels em uma DataURL PNG 32×32.
   * Cada char do array mapeia para uma cor da paleta.
   * Espaços (' ') são tratados como transparentes.
   */
  private static renderDataURL(pixels: string[], palette: Record<string, string>): string {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 32, 32);

    for (let y = 0; y < pixels.length && y < 32; y++) {
      const row = pixels[y] || '';
      for (let x = 0; x < 32; x++) {
        const char = row[x] || ' ';
        if (char !== ' ' && palette[char]) {
          ctx.fillStyle = palette[char];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return canvas.toDataURL('image/png');
  }

  /** Converte DataURL para PIXI.Texture (sem cache duplicado) */
  private static toTexture(pixels: string[], palette: Record<string, string>): Texture {
    const dataURL = this.renderDataURL(pixels, palette);
    const img = new Image();
    img.src = dataURL;
    return Texture.from(img);
  }

  // ─────────────────────────────────────────────
  // SPRITES DE PERSONAGEM
  // ─────────────────────────────────────────────

  /** Herói Aventureiro — Capacete dourado + Armadura prateada + Botas marrons */
  public static createHeroTexture(): Texture {
    const palette: Record<string, string> = {
      K: '#1e293b', // contorno escuro
      S: '#94a3b8', // prata da armadura
      G: '#fbbf24', // dourado do capacete
      F: '#fde68a', // dourado claro (rosto)
      B: '#78350f', // marrom das botas
      R: '#f87171', // detalhes vermelhos do manto
    };
    const pixels = [
      '              KKGGGGGKK      ',
      '            KGGGFFFFGGK      ',
      '            KGFFFFFFFFGK     ',
      '             KGFFFFFFGK      ',
      '           KKSSSSSSSSSSKK    ',
      '          KSSSSSSSSSSSSSSK   ',
      '         KSSSSKKKRRRKKKSSSK  ',
      '         KSSS KKRRRKK SSSK   ',
      '         BBBBBKK   KKBBBBB   ',
      '          BBB           BBB  ',
    ];
    return this.toTexture(pixels, palette);
  }

  /** Goblin Salteador — Pele verde vibrante + Olhos vermelhos ameaçadores */
  public static createGoblinTexture(): Texture {
    const palette: Record<string, string> = {
      G: '#4ade80', // pele verde clara
      D: '#16a34a', // pele verde escura (sombras)
      B: '#92400e', // couro/roupa
      E: '#ef4444', // olhos vermelhos
      K: '#1e293b', // contorno
      Y: '#facc15', // dentes amarelos
    };
    const pixels = [
      '            KKDDDDDKK        ',
      '           KGGGDDDGGK        ',
      '           KGEGEDGGK         ',
      '           KGGYGYGK          ',
      '            KDGGGDK          ',
      '           KBBBBBBK          ',
      '          KBBBB BBBK         ',
      '          KGGG   GGGK        ',
      '           KK     KK         ',
    ];
    return this.toTexture(pixels, palette);
  }

  /** Orc Guerreiro — Capacete metálico + Pele esverdeada + Tronco musculoso */
  public static createOrcTexture(): Texture {
    const palette: Record<string, string> = {
      O: '#15803d', // pele verde orc
      M: '#475569', // metal do capacete
      R: '#dc2626', // detalhes vermelhos (olhos, feridas)
      B: '#451a03', // marrom escuro (couro)
      K: '#1e293b', // contorno
      L: '#64748b', // metal claro
    };
    const pixels = [
      '           KMMMMMMMK         ',
      '          KMMMMRMMMMK        ',
      '          KMOORORMMK         ',
      '          KMOORKOOMK         ',
      '           KOOOOOORK         ',
      '          KBBOOOOOBBK        ',
      '         KBBBOOOOOBBBK       ',
      '         KOOG       GOOK     ',
      '          KK         KK      ',
    ];
    return this.toTexture(pixels, palette);
  }

  /** Esqueleto Guardião — Ossos brancos + Olhos vazados rubros */
  public static createSkeletonTexture(): Texture {
    const palette: Record<string, string> = {
      W: '#e2e8f0', // ossos brancos
      C: '#94a3b8', // ossos cinzas (sombra)
      R: '#ef4444', // olhos vermelhos
      K: '#1e293b', // contorno / cavidade dos olhos
      Y: '#fef9c3', // brilho dos ossos
    };
    const pixels = [
      '            KWWWWWWK         ',
      '           KWWKRRKWWK        ',
      '           KWWWWWWWWK        ',
      '            KWWKWWWK         ',
      '          KKCCWWWWWCCKK      ',
      '         KCWWWWWWWWWWWCK     ',
      '          KWW       WWK      ',
      '          KWW       WWK      ',
      '           KK       KK       ',
    ];
    return this.toTexture(pixels, palette);
  }

  /** Dragão / Demônio Ancestral — Corpo carmim + Asas negras + Olhos âmbar */
  public static createDragonTexture(): Texture {
    const palette: Record<string, string> = {
      R: '#dc2626', // corpo vermelho
      D: '#991b1b', // corpo carmim escuro
      Y: '#f59e0b', // olhos âmbar
      E: '#fef08a', // brilho dos olhos
      K: '#1e293b', // contorno / asas
      N: '#450a0a', // escamas negras
    };
    const pixels = [
      '    KKK               KKK    ',
      '   KRKRK             KRKRK   ',
      '   KRRRRRRRRRRRRRRRRRRRRK    ',
      '    KRRRREYRREYRRRRRRRK      ',
      '     KRRRRYYYYRRRRRRK        ',
      '      KRRRNNNRRRRRK          ',
      '     KRDDDDDDDDDDK           ',
      '      KDDDDDDDDDK            ',
      '        KDDDDDK              ',
    ];
    return this.toTexture(pixels, palette);
  }

  /** Lobo Selvagem — Pelagem cinza + Olhos âmbar + Garra */
  public static createWolfTexture(): Texture {
    const palette: Record<string, string> = {
      W: '#94a3b8', // pelagem cinza
      D: '#475569', // pelagem escura
      Y: '#f59e0b', // olhos âmbar
      K: '#1e293b', // contorno
      T: '#f8fafc', // peito branco
    };
    const pixels = [
      '          KWWWWWWWK          ',
      '         KWWWYWYWWWK         ',
      '         KWWWWWWWWK          ',
      '          KWWWWWWK           ',
      '         KDDWWWWDDK          ',
      '        KDDDTTTTDDDK         ',
      '        KWWW    WWWK         ',
      '        KDW      WDK         ',
      '         KK      KK          ',
    ];
    return this.toTexture(pixels, palette);
  }

  /** Golem de Gelo — Cristais azuis + Massa rochosa branco-azulada */
  public static createGolemTexture(): Texture {
    const palette: Record<string, string> = {
      I: '#bae6fd', // gelo azul claro
      B: '#0ea5e9', // azul intenso
      D: '#0c4a6e', // azul muito escuro
      W: '#f0f9ff', // branco gelo
      K: '#1e293b', // contorno
    };
    const pixels = [
      '           KWWWWWWK          ',
      '          KWIIIIIIWK         ',
      '          KWBBBBBBWK         ',
      '          KWIBIBIBWK         ',
      '          KWWWWWWWWK         ',
      '         KDDWWWWWWDDK        ',
      '        KDDDDWWWWDDDDK       ',
      '         KDD       DDK       ',
      '          KK       KK        ',
    ];
    return this.toTexture(pixels, palette);
  }

  // ─────────────────────────────────────────────
  // TILES DE FUNDO DOS BIOMAS (32×32px)
  // ─────────────────────────────────────────────

  /** Tile de Grama (Bioma Floresta) */
  public static createGrassTileTexture(): Texture {
    const palette: Record<string, string> = {
      G: '#166534', // grama escura base
      L: '#15803d', // grama média
      H: '#22c55e', // grama clara (destaque)
      D: '#14532d', // sombra profunda
    };
    // Padrão geométrico: variação de tons de verde com detalhes sutis
    const row = (a: string, b: string, c: string, d: string) =>
      (a + b + c + d).repeat(8);
    const pixels = [
      row('G', 'L', 'G', 'G'),
      row('L', 'G', 'L', 'G'),
      row('G', 'G', 'H', 'G'),
      row('G', 'L', 'G', 'G'),
      row('L', 'D', 'L', 'G'),
      row('G', 'G', 'G', 'L'),
      row('H', 'G', 'L', 'G'),
      row('G', 'L', 'G', 'G'),
      row('G', 'G', 'G', 'H'),
      row('L', 'G', 'L', 'G'),
      row('G', 'H', 'G', 'G'),
      row('G', 'G', 'L', 'G'),
      row('G', 'L', 'G', 'D'),
      row('H', 'G', 'G', 'G'),
      row('G', 'G', 'H', 'L'),
      row('G', 'L', 'G', 'G'),
    ];
    return this.toTexture(pixels, palette);
  }

  /** Tile de Pedra/Rocha (Biomas: Ruínas, Abismo) */
  public static createRockTileTexture(): Texture {
    const palette: Record<string, string> = {
      R: '#334155', // ardósia base
      D: '#1e293b', // ardósia escura
      L: '#475569', // ardósia clara
      K: '#0f172a', // rachaduras
    };
    const row = (a: string, b: string, c: string, d: string) =>
      (a + b + c + d).repeat(8);
    const pixels = [
      row('R', 'L', 'R', 'R'),
      row('L', 'R', 'D', 'R'),
      row('R', 'R', 'K', 'R'),
      row('R', 'D', 'R', 'L'),
      row('D', 'R', 'R', 'R'),
      row('R', 'L', 'D', 'R'),
      row('L', 'R', 'R', 'D'),
      row('R', 'R', 'L', 'R'),
      row('R', 'D', 'R', 'R'),
      row('L', 'R', 'R', 'L'),
      row('R', 'R', 'D', 'R'),
      row('R', 'K', 'R', 'R'),
      row('D', 'R', 'R', 'D'),
      row('R', 'L', 'R', 'R'),
      row('R', 'R', 'L', 'R'),
      row('L', 'D', 'R', 'R'),
    ];
    return this.toTexture(pixels, palette);
  }

  /** Tile de Gelo (Bioma Picos Congelados) */
  public static createIceTileTexture(): Texture {
    const palette: Record<string, string> = {
      I: '#e0f2fe', // gelo claro
      B: '#bae6fd', // gelo azulado
      D: '#7dd3fc', // gelo médio
      K: '#0c4a6e', // rachadura
    };
    const row = (a: string, b: string, c: string, d: string) =>
      (a + b + c + d).repeat(8);
    const pixels = [
      row('I', 'B', 'I', 'I'),
      row('B', 'I', 'I', 'B'),
      row('I', 'I', 'D', 'I'),
      row('I', 'B', 'I', 'I'),
      row('B', 'I', 'B', 'I'),
      row('I', 'D', 'I', 'B'),
      row('I', 'I', 'K', 'I'),
      row('B', 'I', 'I', 'I'),
      row('I', 'I', 'B', 'D'),
      row('I', 'B', 'I', 'I'),
      row('D', 'I', 'I', 'B'),
      row('I', 'I', 'B', 'I'),
      row('B', 'I', 'I', 'I'),
      row('I', 'D', 'B', 'I'),
      row('I', 'I', 'I', 'B'),
      row('B', 'I', 'I', 'I'),
    ];
    return this.toTexture(pixels, palette);
  }

  /** Tile de Lava (Bioma Abismo Cinderino) */
  public static createLavaTileTexture(): Texture {
    const palette: Record<string, string> = {
      R: '#7f1d1d', // pedra de lava escura
      O: '#ea580c', // laranja vivo
      Y: '#fbbf24', // amarelo quente
      K: '#450a0a', // borda de rachadura
    };
    const row = (a: string, b: string, c: string, d: string) =>
      (a + b + c + d).repeat(8);
    const pixels = [
      row('R', 'R', 'O', 'R'),
      row('R', 'O', 'R', 'R'),
      row('O', 'R', 'R', 'Y'),
      row('R', 'R', 'O', 'R'),
      row('K', 'R', 'R', 'R'),
      row('R', 'O', 'K', 'R'),
      row('R', 'R', 'R', 'O'),
      row('O', 'R', 'R', 'R'),
      row('R', 'Y', 'R', 'R'),
      row('R', 'R', 'O', 'K'),
      row('O', 'R', 'R', 'R'),
      row('R', 'R', 'Y', 'R'),
      row('R', 'K', 'R', 'R'),
      row('R', 'O', 'R', 'R'),
      row('Y', 'R', 'R', 'O'),
      row('R', 'R', 'R', 'R'),
    ];
    return this.toTexture(pixels, palette);
  }

  // ─────────────────────────────────────────────
  // HELPERS DE SELEÇÃO POR BIOMA E POR MONSTRO
  // ─────────────────────────────────────────────

  /** Retorna a textura de tile correta para o bioma ativo */
  public static getTileForRegion(regionId: string): Texture {
    switch (regionId) {
      case 'orcruins':
        return this.createRockTileTexture();
      case 'frozen':
        return this.createIceTileTexture();
      case 'abyss':
        return this.createLavaTileTexture();
      case 'forest':
      default:
        return this.createGrassTileTexture();
    }
  }

  /** Retorna a textura de sprite para o monstro pelo nome ou tipo de ataque */
  public static getMonsterTexture(name: string, _attackType?: string): Texture {
    const n = name.toLowerCase();
    if (n.includes('goblin') || n.includes('aranha') || n.includes('salteador')) {
      return this.createGoblinTexture();
    }
    if (n.includes('orc') || n.includes('berserker')) {
      return this.createOrcTexture();
    }
    if (n.includes('esqueleto') || n.includes('guardião') || n.includes('espectro')) {
      return this.createSkeletonTexture();
    }
    if (n.includes('dragão') || n.includes('demônio') || n.includes('lorde das chamas') || n.includes('cinderino') || n.includes('quimera')) {
      return this.createDragonTexture();
    }
    if (n.includes('lobo') || n.includes('wolf')) {
      return this.createWolfTexture();
    }
    if (n.includes('golem') || n.includes('frost')) {
      return this.createGolemTexture();
    }
    // Fallback: goblin genérico
    return this.createGoblinTexture();
  }

  /** Cria um Sprite PixiJS pronto para ser adicionado ao stage */
  public static createMonsterSprite(name: string, attackType?: string): Sprite {
    const texture = this.getMonsterTexture(name, attackType);
    const sprite = new Sprite(texture);
    sprite.width = 32;
    sprite.height = 32;
    sprite.anchor.set(0.5);
    return sprite;
  }

  /** Cria um Sprite de Herói PixiJS */
  public static createHeroSprite(): Sprite {
    const texture = this.createHeroTexture();
    const sprite = new Sprite(texture);
    sprite.width = 32;
    sprite.height = 32;
    sprite.anchor.set(0.5);
    return sprite;
  }

  /** Cria um tile de fundo (16×16 para compor 32×32 na tela) */
  public static createTileSprite(regionId: string): Sprite {
    const texture = this.getTileForRegion(regionId);
    const sprite = new Sprite(texture);
    sprite.width = 32;
    sprite.height = 32;
    return sprite;
  }
}
