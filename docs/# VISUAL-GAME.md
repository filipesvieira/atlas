Fiz uma auditoria profunda no código atual do repositório (`GameViewport.ts`, `engine.go`, `ws.go`, `loot.go`) e no problema de exibição capturado na imagem.

Abaixo está o **diagnóstico técnico**, a **solução nativa de Pixel Art** (sem depender de arquivos externos) e o **Plano de Implementação Completo** pronto para ser colado diretamente no **Google Antigravity**.

---

## 🔍 1. Diagnóstico do Código Atual & Pontos de Melhoria

### 🔴 Problema 1: Nomes e HP Cortados nas Bordas (`GameViewport.ts`)



* **Causa Raiz**: O nome do monstro (ex: "Troll das Cavernas") e a barra de vida são alinhados ao centro do sprite do monstro. Quando o monstro renasce próximo à borda direita do Canvas ($x = 380\text{px}$ a $450\text{px}$ em uma tela de $500\text{px}$), o texto renderizado para a direita ultrapassa a largura da arena e é cortado.


* **Solução**: Aplicar a trava matemática de borda (*Text Clamping*):

$$\text{ClampedX} = \max(60, \min(\text{LarguraCanvas} - 60, \text{SpriteX}))$$



### 🔴 Problema 2: Batalha Estática por Círculos/Quadrados (`GameViewport.ts` & `engine.go`)



* **Causa Raiz**: Atualmente, o frontend renderiza formas geométricas estáticas (`Graphics().circle()` e `Graphics().rect()`). Além disso, o backend não envia coordenadas de grade ($X, Y$) ou estados de inteligência artificial (`CHASE`, `ATTACK`, `KITE`, `FLEE`).


* **Solução**:
1. Transformar a arena em um **Grid Isométrico/Top-Down de $15 \times 8$ Tiles ($32 \times 32\text{px}$)**.
2. Adicionar máquina de estados nos monstros em Go: Inimigos Melee caminham tile a tile até encostar no jogador; Mago/Arqueiro mantêm distância ($3$ a $4$ tiles); Inimigos com menos de $20\%$ de vida entram no estado `"FLEE"`, viram de costas e correm em direção oposta.
3. Aplicar interpolação suave (Lerp a 60 FPS) no PixiJS para eliminar o teleporte:



$$\text{X}_{\text{atual}} = \text{X}_{\text{atual}} + (\text{X}_{\text{alvo}} - \text{X}_{\text{atual}}) \times 0.12$$





---

## 🎨 2. Solução Autônoma de Pixel Art Nativa (`SpriteGenerator.ts`)

Para eliminar o risco de imagens quebradas ou necessidade de downloads externos, o próprio frontend gerará os sprites de $32 \times 32\text{px}$ programaticamente na memória via Canvas HTML5 e os entregará como `PIXI.Texture`.

---

# 📜 MASTER BLUEPRINT PARA O GOOGLE ANTIGRAVITY

> **Instruções para o Antigravity:** Copie e cole todo o bloco delimitado abaixo no seu agente de codificação. Ele contém todas as diretrizes técnicas, a classe geradora de Pixel Art nativa, a IA de movimentação por grade e as correções visuais sem cortes.

```markdown
# MASTER IMPLEMENTATION BLUEPRINT: REFORMULAÇÃO VISUAL, MOVIMENTAÇÃO TÁTICA E PIXEL ART NATIVA

> ⚠️ REGRAS INVIOLÁVEIS DE EXECUÇÃO:
> 1. PRESERVAÇÃO DE CÓDIGO: Não remova rotas de API, tabelas do banco PostgreSQL ou estruturas de WebSocket existentes. Realize apenas alterações incrementais.
> 2. ZERO ASSETS EXTERNOS: Todos os sprites de personagens, monstros, projéteis e biomas devem ser gerados dinamicamente via matrizes de Pixel Art (HTML5 Canvas -> DataURL -> PixiJS Texture) no frontend em `SpriteGenerator.ts`.
> 3. AUTORIDADE DO SERVIDOR: Todas as posições de grade (GridX, GridY) e estados táticos são calculados no backend em Go.

---

## 🎨 FASE 1: GERADOR NATIVO DE PIXEL ART 32x32px (`frontend/src/game/SpriteGenerator.ts`)

Criar o arquivo `frontend/src/game/SpriteGenerator.ts` que desenha os sprites em um `<canvas>` de $32 \times 32\text{px}$ e os converte para `PIXI.Texture` em tempo de execução:

```typescript
import { Texture } from 'pixi.js';

export class SpriteGenerator {
  private static renderDataURL(pixels: string[], palette: Record<string, string>): string {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    for (let y = 0; y < 32; y++) {
      const row = pixels[y] || '';
      for (let x = 0; x < 32; x++) {
        const char = row[x] || ' ';
        if (char !== ' ' && palette[char]) {
          ctx.fillStyle = palette[char];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return canvas.toDataURL();
  }

  // 1. Texture do Aventureiro (Guerreiro)
  public static createHeroTexture(): Texture {
    const palette = { 'K': '#1e293b', 'S': '#94a3b8', 'G': '#fbbf24', 'F': '#fde047', 'B': '#78350f' };
    const pixels = [
      "          GGGGGG            ",
      "         GGFFFFGG           ",
      "         GFFFFFFG           ",
      "          GFFFFG            ",
      "          SSSSSS            ",
      "         SSSSSSSS           ",
      "        SSSSSSSSSS          ",
      "       SSSSSSSSSSSS         ",
      "       SSSS SSSS S          ",
      "       BBBB BBBB B          "
    ];
    const img = new Image();
    img.src = this.renderDataURL(pixels, palette);
    return Texture.from(img);
  }

  // 2. Texture do Goblin (Verde)
  public static createGoblinTexture(): Texture {
    const palette = { 'G': '#22c55e', 'D': '#15803d', 'B': '#78350f', 'E': '#ef4444' };
    const pixels = [
      "          GGGGGG            ",
      "         GGEEGEEG           ",
      "         GGGGGGGG           ",
      "          GGDGGG            ",
      "          BBBBBB            ",
      "         BBBBBBBB           ",
      "          DD  DD            "
    ];
    const img = new Image();
    img.src = this.renderDataURL(pixels, palette);
    return Texture.from(img);
  }

  // 3. Texture do Orc Guerreiro (Verde Escuro)
  public static createOrcTexture(): Texture {
    const palette = { 'O': '#166534', 'M': '#475569', 'B': '#451a03', 'R': '#dc2626' };
    const pixels = [
      "          MMMMMM            ",
      "         MMRRRRMM           ",
      "         OORORROO           ",
      "          OOOOOO            ",
      "          BBBBBB            ",
      "         OOOOOOOO           ",
      "          OO  OO            "
    ];
    const img = new Image();
    img.src = this.renderDataURL(pixels, palette);
    return Texture.from(img);
  }

  // 4. Texture do Esqueleto Guardião
  public static createSkeletonTexture(): Texture {
    const palette = { 'W': '#e2e8f0', 'G': '#64748b', 'R': '#ef4444' };
    const pixels = [
      "          WWWWWW            ",
      "         WWRWWRWW           ",
      "          WWWWWW            ",
      "           GGGG             ",
      "          WWWWWW            ",
      "         WWWWWWWW           ",
      "          WW  WW            "
    ];
    const img = new Image();
    img.src = this.renderDataURL(pixels, palette);
    return Texture.from(img);
  }

  // 5. Texture do Dragão Vermelho
  public static createDragonTexture(): Texture {
    const palette = { 'R': '#dc2626', 'D': '#991b1b', 'Y': '#f59e0b', 'E': '#fef08a' };
    const pixels = [
      "       RRR        RRR       ",
      "      RRRRR      RRRRR      ",
      "      RRRRRRRRRRRRRRRR      ",
      "       RRRREERREERRRR       ",
      "        RRRRYYYYRRRR        ",
      "         RRRRRRRRRR         ",
      "          DDDDDDDD          "
    ];
    const img = new Image();
    img.src = this.renderDataURL(pixels, palette);
    return Texture.from(img);
  }

  // 6. Tiles de Fundo dos Biomas (32x32px)
  public static createGrassTileTexture(): Texture {
    const palette = { 'G': '#15803d', 'D': '#166534', 'L': '#22c55e' };
    const pixels = Array(32).fill("GGGGGDGGGGGGGLGGGGGGGDGGGGGGGLGG");
    const img = new Image();
    img.src = this.renderDataURL(pixels, palette);
    return Texture.from(img);
  }

  public static createRockTileTexture(): Texture {
    const palette = { 'R': '#334155', 'D': '#1e293b', 'L': '#475569' };
    const pixels = Array(32).fill("RRRRRDRRRRRRRLRRRRRRRDRRRRRRRLRR");
    const img = new Image();
    img.src = this.renderDataURL(pixels, palette);
    return Texture.from(img);
  }
}

```

---

## ⚔️ FASE 2: POSICIONAMENTO EM GRADE E IA TÁTICA NO GO (`backend/pkg/game/`)

### 2.1 Coordenadas e Estados na Struct `Monster` (`engine.go`)

Adicionar suporte ao Grid $15 \times 8$ Tiles ($32 \times 32\text{px}$) e estados de inteligência tática:

```go
type AttackType string

const (
    AttackTypeMelee  AttackType = "melee"
    AttackTypeRanged AttackType = "ranged"
)

type Monster struct {
    ID          string     `json:"id"`
    Name        string     `json:"name"`
    Level       int        `json:"level"`
    Health      int        `json:"health"`
    MaxHealth   int        `json:"max_health"`
    Attack      int        `json:"attack"`
    AttackType  AttackType `json:"attack_type"`
    GridX       int        `json:"grid_x"`
    GridY       int        `json:"grid_y"`
    State       string     `json:"state"` // "CHASE", "ATTACK", "KITE", "FLEE"
}

```

### 2.2 Lógica de Movimentação por Tick (`processTick()`)

* **Aventureiro**: Fixado em `GridX = 2`, `GridY = 4`.
* **Monstros Melee**:
* Iniciam em `GridX = 14`.
* A cada tick, avançam 1 tile à esquerda (`GridX--`) até atingirem `GridX = 3` (ao lado do jogador) e passam para o estado `"ATTACK"`.


* **Monstros Ranged**:
* Avançam até `GridX = 10` e mantêm distância ("Kiting"), disparando projéteis.


* **Estado de Fuga (FLEE)**:
* Quando `Monster.Health < Monster.MaxHealth * 0.20`, o Estado muda para `"FLEE"` e a criatura move-se de volta para a direita (`GridX++` até `GridX = 14`).



---

## 🎨 FASE 3: ARENA VISUAL, TRAVA DE TEXTO E LERP 60FPS (`frontend/src/components/Viewport/GameViewport.ts`)

### 3.1 Renderização de Fundo por Tilemap

* Preencher a arena de $500 \times 260\text{px}$ renderizando uma malha de $15 \times 8$ tiles com a textura do bioma ativo (`SpriteGenerator.createGrassTileTexture()` ou `createRockTileTexture()`).

### 3.2 Trava de Segurança para Nomes e HP (Text Clamping)

Para evitar que nomes longos (ex: "Troll das Cavernas") estourem os limites do Canvas de $500\text{px}$:

```typescript
private updateEntityUI(sprite: PIXI.Sprite, nameText: PIXI.Text, hpBarContainer: PIXI.Container) {
  // Limita a posição X da placa de nome entre 60px e 440px
  const clampedX = Math.max(60, Math.min(440, sprite.x));

  nameText.x = clampedX;
  nameText.y = sprite.y - 28;

  hpBarContainer.x = clampedX - 20; // Centraliza a barra de 40px
  hpBarContainer.y = sprite.y - 14;
}

```

### 3.3 Placa de Nome Estilo Tibia

* Desenhar um retângulo semi-transparente preto (`color: 0x000000, alpha: 0.6`) atrás do texto `Nome (Lv. X)`.
* Adicionar barra de HP colorida de $40\text{px}$ de largura:
* **Verde**: $\text{HP} > 50\%$
* **Amarela**: $20\% \le \text{HP} \le 50\%$
* **Vermelha**: $\text{HP} < 20\%$



### 3.4 Interpolação de Movimento Suave (Lerp 60 FPS)

No Ticker do PixiJS, interpolar as coordenadas visuais das sprites em direção às coordenadas de grade enviadas pelo servidor Go:

```typescript
// No Ticker do PixiJS
const targetPixelX = monster.grid_x * 32;
const targetPixelY = monster.grid_y * 32;

monsterSprite.x += (targetPixelX - monsterSprite.x) * 0.12;
monsterSprite.y += (targetPixelY - monsterSprite.y) * 0.12;

```

---

## 🚀 FASE 4: PLANO DE EXECUÇÃO SEQUENCIAL

1. **Etapa 1 (Pixel Art Nativa):** Criar o arquivo `SpriteGenerator.ts` com as matrizes de $32 \times 32\text{px}$ para herói, monstros, biomas e projéteis.
2. **Etapa 2 (Backend Go & Grid):** Adicionar `GridX`, `GridY`, `AttackType` e `State` na struct `Monster` em `engine.go` e atualizar a movimentação no `processTick()`.
3. **Etapa 3 (Viewport & Clamping):** Refatorar `GameViewport.ts` para renderizar o fundo de tiles, aplicar o movimento Lerp e implementar a trava de texto (`ClampedX`) com placas de nome estilizadas.

```

```