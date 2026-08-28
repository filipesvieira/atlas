# ESPECIFICAÇÃO DE REFATORAÇÃO: COMBATE VISUAL, PROGRESSÃO DINÂMICA E SISTEMAS DE LOOT

> **Status (2026-08-27):** especificação histórica. O combate e a renderização
> já evoluíram além deste plano; confira os contratos atuais em
> [`DOCUMENTATION_STATUS.md`](DOCUMENTATION_STATUS.md) e
> [`ARENA_TERRAIN_SYSTEM.md`](ARENA_TERRAIN_SYSTEM.md).

> ⚠️ REGRAS INVIOLÁVEIS DE EXECUÇÃO:
> 1. PRESERVAÇÃO DE CÓDIGO: Não remova ou altere as rotas de Auth, modelos de banco ou estruturas de Go/React existentes. Trabalhe de forma estritamente incremental.
> 2. ESTABILIDADE DO MVP: O loop de simulação offline e os dados de conta e personagem já funcionantes DEVEM continuar intactos.

---

### FASE 1: REAJUSTE DA ARENA VISUAL (PIXIJS V8) & MOVIMENTAÇÃO SUAVE

#### 1.1 Escalonamento e Proporção de Sprites
- Reduzir o tamanho de renderização dos sprites no PixiJS em ~30% a 40% (ex: de 64x64/48x48 para escala real 32x32 em canvas 640x480).
- Objetivo: Aumentar a sensação visual de espaço na arena, permitindo a presença simultânea de múltiplos monstros (ex: 2 a 4 monstros na tela).

#### 1.2 Interpolação de Movimento (Fim do Teleporte)
- Substituir a alteração instantânea de coordenadas `(x, y)` por interpolação de movimento suave (Lerp / Ticker) no `GameViewport.ts`.
- Lógica de combate visual:
  1. O aventureiro caminha suavemente até o monstro alvo (ou o monstro caminha até o aventureiro).
  2. Ao atingir a distância de alcance da arma (1 piso para Melee, 4-5 pisos para Arcos/Magias), a animação de ataque é disparada.
  3. Adicionar animação de recuo suave ou patrulha quando não houver alvos engajados.

---

### FASE 2: SISTEMA DE DIVERSIDADE DE MONSTROS E MULTI-ENCONTROS

#### 2.1 Suporte a Múltiplos Inimigos
- Atualizar a estrutura de estado do cliente/backend para permitir arrays de monstros ativos na caçada atual (ex: `active_monsters: [Lobo1, Lobo2, Aranha]`).
- Atualizar a renderização no PixiJS para desenhar múltiplos sprites de monstros distribuídos na arena sem sobreposição.

---

### FASE 3: PROGRESSÃO CLASSELESS (MAESTRIAS POR USO) & LIVROS DE HABILIDADE

#### 3.1 Remoção do Engessamento de Classe
- O personagem não fica preso aos atributos fixos da vocação.
- Criar a estrutura de **Maestrias de Armas** no banco/estado:
  - `sword_mastery`, `axe_mastery`, `shield_mastery`, `distance_mastery`, `magic_mastery`.
- Lógica de Incremento: A cada ataque realizado ou recebido no backend em Go:
  - Atacar com Espada -> Incrementa XP de `sword_mastery`.
  - Bloquear com Escudo -> Incrementa XP de `shield_mastery`.
  - Atacar com Arco/Besta -> Incrementa XP de `distance_mastery`.

#### 3.2 Livros de Habilidade (Skill Books)
- Criar o tipo de item `skill_book` na tabela de itens procedurais.
- Ao usar um `skill_book` no inventário, o personagem aprende uma habilidade ativa ou passiva (ex: *Golpe Giratório, Bola de Fogo, Cura Rápida*).

---

### FASE 4: INTEGRAÇÃO DA MANA & SISTEMA DE CONSUMÍVEIS (AMMO E BAGS)

#### 4.1 Uso Prático da Mana
- Habilidades aprendidas via Livros de Habilidade e ataques especiais consomem **Mana**.
- Adicionar lógica no backend Go: Se `Mana_Atual >= Custo_Habilidade`, executa a habilidade e consome a Mana.
- Regeneração passiva de Mana por tick no servidor e através de Poções de Mana.

#### 4.2 Slot e Lógica de Munição (Ammo)
- Adicionar o slot `ammo` na estrutura JSONB de equipamentos (`equipment: { ammo: Item }`).
- Requisito de Uso: Armas do tipo `distance` (Arcos/Bestas) exigem munição compatível equipada para realizar ataques.
- A munição adiciona modificadores ao ataque (ex: *Flecha de Fogo* concede +10 de Dano de Fogo).

#### 4.3 Slot e Lógica de Mochila (Bags)
- Adicionar o slot `backpack` na estrutura de equipamentos.
- A qualidade/raridade da Mochila equipada define a capacidade máxima de slots do inventário (ex: *Saco de Pano: 10 slots*, *Mochila de Couro Reforçada: 24 slots*).
- Impacto na Caça Idle: Quando a mochila enche durante a expedição, novos itens comuns são descartados ou convertidos automaticamente em ouro.