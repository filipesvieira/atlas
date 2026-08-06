# MASTER IMPLEMENTATION BLUEPRINT: CORE RPG BALANCE, EQUIPMENT RULES & UI OVERHAUL

> ⚠️ REGRAS DE EXECUÇÃO CIRÚRGICA:
> Este plano aborda refatorações cruciais na engine de jogo (Go) e na Interface (React). Altere APENAS os trechos lógicos mencionados, garantindo que o servidor de WebSockets e o banco de dados permaneçam estáveis.

---

## ⚙️ FASE 1: REBALANCEAMENTO MATEMÁTICO E REGRAS DE 1H/2H (`backend/pkg/game/`)

### 1.1 Separação de Dano Físico e Mágico (`loot.go`)
1. Na `struct Item`, substitua `Attack int` por:
   - `PhysicalAttack int`
   - `MagicAttack int`
2. Adicione o campo `Hands int` (1 ou 2) aos itens e `LootTemplate`.
   - `Sword`, `Axe`, `Wand`: `Hands: 1`
   - `Greatsword`, `Staff`, `Bow`: `Hands: 2`
3. Atualize os templates e a função `GenerateProceduralLoot()` para refletir essas mudanças (Afixos mágicos sobem `MagicAttack`, afixos bárbaros sobem `PhysicalAttack`).

### 1.2 Regra Estrita de Equipamento (Two-Handed) (`engine.go` - `EquipItem`)
1. Ao equipar na `MainHand`:
   - Se `Item.Hands == 2`, desequipe automaticamente o que estiver no `OffHand`.
2. Ao equipar no `OffHand` (Escudos/Orbes):
   - Se o `MainHand` atual possuir `Hands == 2`, desequipe automaticamente a arma de duas mãos para a mochila.
   - *Nota:* Isso corrige a falha onde o Mago não podia usar Varinha (1H) + Orbe/Escudo.

### 1.3 Nova Fórmula de Dano Escalável (`engine.go` - `CalculateStats`)
Substitua as multiplicações brutas pelo padrão RPG moderno (Base * Modificador):
- **Dano Físico Base:** `MainHand.PhysicalAttack + Ammo.PhysicalAttack`
- **Dano Mágico Base:** `MainHand.MagicAttack`
- **Fórmulas Finais (antes da postura):**
  - Melee: `Dano Físico Base * (1.0 + (STR / 100.0))`
  - Ranged: `Dano Físico Base * (1.0 + (DEX / 100.0))`
  - Magia: `Dano Mágico Base * (1.0 + (INT / 100.0))`

---

## 🌊 FASE 2: PROGRESSÃO DE ONDAS, MORTE E ACAMPAMENTO (`backend/pkg/game/engine.go`)

### 2.1 Punição de Morte (Reset de Estágio)
Na função `processTick()`, no bloco de Morte (`Health <= 0`):
- Adicione: `s.CurrentStage = 1` e `s.IsBossStage = false`.
- Log: *"Você foi derrotado e arrastado de volta ao acampamento. A expedição foi reiniciada."*

### 2.2 Escalonamento Dinâmico de Inimigos (Progressive Waves)
Ao gerar a horda para um novo estágio (se não for boss):
- `count := s.CurrentStage` (Estágio 1 = 1 mob, Estágio 4 = 4 mobs).
- Para o Boss (Estágio 5), faça o spawn do Boss `+ 2 Minions` (monstros normais da região).

---

## 🖥️ FASE 3: UNIFICAÇÃO DA UI E SUPER TOOLTIPS (FRONTEND)

### 3.1 Unificação do Inventário (`DashboardGrid.tsx` e componentes filhos)
- Remova o comportamento de Modal (`TibiaBackpackModal.tsx`).
- O layout do painel esquerdo deve ser dividido verticalmente ou exibir a Mochila (Grid de Slots) **logo abaixo** dos Equipamentos do Personagem na mesma tela. O jogador precisa ver seu status, equipamentos e loot tudo ao mesmo tempo.

### 3.2 Tooltips Avançadas (Diablo/WoW Style) (`ItemIcon.tsx` ou componente de Hover)
Ao passar o mouse sobre QUALQUER item (equipado ou na mochila), renderizar uma caixa de informações flutuante (Tooltip) detalhada:
```text
[Nome do Item] (Raridade em Cor)
Tipo: Arma de 1 Mão / Cajado (2 Mãos)
-------------------------
⚔️ Ataque Físico: 0
🔮 Ataque Mágico: 45
🛡️ Defesa: 2
-------------------------
Afixos Especiais:
🩸 Roubo de Vida: +2%
✨ Reg. Mana: +1/tick
🎯 Chance Crítica: +5%
-------------------------
Peso: 18.5 oz