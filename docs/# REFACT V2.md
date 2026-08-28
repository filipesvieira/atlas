> **Status (2026-08-27):** plano histórico. As fórmulas e a arquitetura deste
> arquivo não substituem o código atual; use [`KNOWLEDGE_BASE.md`](KNOWLEDGE_BASE.md)
> e [`DOCUMENTATION_STATUS.md`](DOCUMENTATION_STATUS.md) para o estado vigente.

Compreendo perfeitamente a frustração. Um plano de refatoração para sistemas de RPG profundos requer uma análise matemática e estrutural rigorosa, e a resposta anterior foi superficial diante da complexidade do que você construiu.

Abaixo, apresento primeiro o **Diagnóstico e Análise** (o *porquê* das mudanças, conforme solicitado) e, na sequência, o **Master Blueprint** detalhado e extenso, pronto para ser injetado no Antigravity.

---

### 🧐 1. Diagnóstico e Análise Arquitetural

#### Análise de Dano e Atributos (O Problema do Mago Nível 15)

O salto de dano absurdo de `9` para `147` ao equipar um cajado ocorre devido a um erro de design na fórmula atual em `engine.go`.

* **Como está hoje:** O ataque base sem arma cai no `default` do switch, calculando `(STR * 1.5)`. Se o Mago tem STR 5, o ataque é 7.5. Ao equipar um Cajado, a engine detecta `WeaponTypeWand` e calcula `(INT * 2.0) + WeaponAtk`. Com INT 47, isso vira `94 + 12 = 106`. Em seguida, a postura ofensiva multiplica o total final por `1.35x`, resultando em ~143.


* **O Problema:** Somar atributos diretamente ao dano da arma e depois aplicar multiplicadores globais quebra o "Late Game". Um mago nível 100 com INT 500 causaria danos astronômicos mesmo usando uma varinha de nível 1. Além disso, o ataque físico e mágico estão condensados em uma única variável `totalAtk`, o que permite que um guerreiro cause alto dano mágico.


* **A Solução Matemática:** Separar `PhysicalAttack` e `MagicAttack`. A arma fornece o dano base estrito, e os atributos (STR/DEX/INT) fornecem a *escala percentual*.
* Fórmula Padrão: `Dano Final = DanoBaseArma * (1 + (Atributo / 100))`.



#### Regras de Armas e Escudos (1H vs 2H)

* **Como está hoje:** Em `engine.go`, a função `EquipItem` possui uma regra *hardcoded* que desequipa o escudo automaticamente se a arma for `bow` ou `wand`.


* **O Problema:** Magos clássicos frequentemente usam *Wands* (1 Mão) + *Spellbooks/Orbs/Shields*.
* **A Solução:** Criar a propriedade `Hands: 1 | 2` nos templates de itens. Apenas `Bow`, `Crossbow` e `Staff` (Cajado de Duas Mãos) devem forçar o desequipar do OffHand. Varinhas (`Wand`) devem permitir escudos.



#### Gerenciamento de Inventário, Tooltips e UI

* **Como está hoje:** O inventário é um modal isolado (`TibiaBackpackModal.tsx`), escondendo os status em tempo real. Os itens na mochila mostram apenas Atk/Def e Peso. O descarte é 1 a 1 via WebSocket.


* **A Solução:** Unificar o layout. O `DashboardGrid.tsx` exibirá a mochila e os equipamentos lado a lado. Será introduzido um modo de "Seleção Múltipla" no React, enviando uma lista de IDs para uma nova rota WebSocket `BULK_SELL` ou `BULK_DISCARD` em `ws.go`. As tooltips buscarão todas as propriedades (Lifesteal, Mana Regen, Crit, etc.) mapeadas em `ItemIcon.tsx`.



#### Economia, Drop Rates e Hierarquia

* **Como está hoje:** O `GenerateLootForMonster` rola raridades de forma muito generosa (Lendários com roll > 0.85, ou seja, 15% de chance).


* **A Solução:** Ajustar a curva de drop rate para o padrão do mercado de jogos de "Grind": Lendário (0.1%), Épico (3%), Raro (15%), Incomum (30%). O valor em ouro será derivado do Tier da arma + Multiplicador de Raridade.

#### Morte, Ondas Progressivas e o Bioma do Acampamento

* **Como está hoje:** A morte apenas interrompe a expedição, e as ondas spawnam sempre `2` ou `3` monstros baseados na região.


* **A Solução:** Ao zerar o HP, `CurrentStage` é resetado para `1` em `engine.go`. A função de spawn usará `count := s.CurrentStage`, escalando a dificuldade (Fase 1 = 1 mob; Fase 4 = 4 mobs). No `PixelArtRenderer.ts`, um novo bioma `camp_safezone` será criado com fogueiras, partículas de fogo e estrelas animadas por ticks.



---

### 📜 MASTER IMPLEMENTATION BLUEPRINT (Para o Antigravity)

Copie e cole o bloco abaixo no agente para iniciar a implementação estrutural e cirúrgica do planejamento acima.

```markdown
# MASTER IMPLEMENTATION BLUEPRINT: OVERHAUL DE CORE RPG, BALANCEAMENTO E UI UNIFICADA

> ⚠️ REGRAS DE EXECUÇÃO: Você deve implementar as alterações abaixo modificando os arquivos estritamente de forma incremental. Não quebre a estrutura de WebSocket ou de banco de dados existente. Adicione novos campos mantendo retrocompatibilidade.

---

## ⚙️ FASE 1: REBALANCEAMENTO MATEMÁTICO E REGRAS DE 1H/2H (BACKEND GO)

### 1.1 Separação de Dano Físico/Mágico e Propriedade 'Hands' (`backend/pkg/game/loot.go`)
1. Atualize a struct `Item` e `LootTemplate` para incluir novos atributos e separar o ataque:
   ```go
   type Item struct {
       // ... código existente ...
       PhysicalAttack int     `json:"physical_attack"`
       MagicAttack    int     `json:"magic_attack"`
       Hands          int     `json:"hands"` // 1 ou 2
       ValueGold      int64   `json:"value_gold"`
       // ... código existente (manter CritChance, Lifesteal, etc) ...
   }

```

2. Nos `lootTemplates`, defina `Hands: 2` para Arcos (`WeaponTypeBow`) e Cajados de duas mãos. Varinhas (`WeaponTypeWand`) devem ter `Hands: 1`.
3. **Drop Rates Drásticos:** Na função `GenerateLootForMonster`, altere a probabilidade de raridade:
* Lendário: `rarityRoll > 0.999` (0.1% chance)
* Épico: `rarityRoll > 0.97` (3% chance)
* Raro: `rarityRoll > 0.82` (15% chance)
* O `ValueGold` deve ser calculado como `(BaseAtk + BaseDef) * (Tier * 10) * MultiplicadorRaridade`.



### 1.2 Regras de Equipamento Estritas (`backend/pkg/game/engine.go` -> `EquipItem`)

* Remover a verificação baseada apenas no nome/wType para o slot `offhand`.
* Nova regra:
* Se tentar equipar `mainhand` e `targetItem.Hands == 2`, remova o item atual do `offhand` (se existir) para a mochila.
* Se tentar equipar `offhand` e o item atual no `mainhand` tiver `Hands == 2`, remova o `mainhand` para a mochila.



### 1.3 Fórmulas de Escala de Dano RPG Padrão (`backend/pkg/game/engine.go` -> `CalculateStats` e `processTick`)

1. Refatore `CalculateStats()` para calcular independentemente `TotalPhysicalAtk` e `TotalMagicAtk`.
* **Guerreiro (Sword/Axe/Club):** `Dano Base = Arma.PhysicalAttack * (1.0 + (float64(STR) / 100.0))`
* **Arqueiro (Bow):** `Dano Base = (Arma.PhysicalAttack + Ammo.PhysicalAttack) * (1.0 + (float64(DEX) / 100.0))`
* **Mago (Wand/Staff):** `Dano Base = Arma.MagicAttack * (1.0 + (float64(INT) / 100.0))`


2. No `processTick()`, o dano causado (`playerAtk`) deve rolar a variância de $\pm 10\%$ sobre a base aplicável à arma, multiplicada pelo acerto crítico.
3. Aplique a cura recebida pelo `Lifesteal` (somatório dos itens) baseado no dano causado naquele tick.

---

## 🌊 FASE 2: MORTE PUNITIVA E ONDAS ESCALONADAS (`backend/pkg/game/engine.go`)

### 2.1 Punição de Morte

No `processTick()`, dentro do bloco `if s.Character.Health <= 0`:

* Adicione o reset de progressão: `s.CurrentStage = 1`, `s.IsBossStage = false`.
* O log text deve avisar: *"Você foi gravemente ferido e resgatado para o acampamento. A expedição foi reiniciada."*

### 2.2 Escalonamento de Monstros por Estágio

Substituir o `count := 2` estático na geração de hordas:

* Estágios normais: `count := s.CurrentStage` (Fase 1 = 1 monstro, Fase 4 = 4 monstros simultâneos).
* Fase do Boss (`s.IsBossStage = true`): Fazer spawn de `bossMob` + `2 Monstros normais` da mesma região como guarda-costas.

---

## ⛺ FASE 3: O ACAMPAMENTO ANIMADO (PIXIJS) (`frontend/src/game/PixelArtRenderer.ts`)

1. Crie o bioma `getCampBackground(w, h)`:
* Fundo em gradiente noturno escuro (`#0f172a` a `#020617`).
* Um grid de terreno simples e uma **fogueira central** no tile `GridX=7, GridY=4`.
* Adicione lógica no PixiJS para ler o estado `is_active == false` via WebSocket. Quando inativo, posicionar o herói sentado perto da fogueira.


2. Efeito Animado de Estrelas: No `GameViewport.ts`, ao receber `is_active === false`, instanciar pequenas partículas brancas (`alpha` pulsante) no topo do canvas simulando vagalumes ou estrelas.

---

## 🖥️ FASE 4: UI UNIFICADA, TOOLTIPS E BULK SELL (REACT)

### 4.1 Unificação do Layout (`frontend/src/components/Dashboard/DashboardGrid.tsx`)

* Eliminar o uso do `TibiaBackpackModal.tsx`.
* Remodelar o `DashboardGrid` para que a coluna da esquerda contenha **Equipamentos + Mochila lado a lado** ou empilhados, garantindo que o jogador veja seus atributos mudando em tempo real ao equipar um item.

### 4.2 Super Tooltips (`frontend/src/components/Inventory/ItemIcon.tsx` ou componente dedicado)

* Expandir o evento `onHover` (title ou componente de Portal) para todos os itens.
* Exibir formatado: Nome (Cor da Raridade), Tipo e Mãos, Atk Físico, Atk Mágico, Defesa, Valor de Venda (Gold).
* Listar afixos de forma elegante: `🩸 +2% Roubo de Vida`, `✨ +1 Reg. Mana/s`.

### 4.3 Seleção Múltipla e Venda em Lote

1. No painel da Mochila unificado, adicionar um botão de estado: **[Selecionar Vários]**.
2. Quando ativo, clicar nos itens adiciona seus IDs a um array `selectedItems`.
3. Adicionar botões: **[Vender Selecionados]** e **[Descartar Selecionados]**.
4. Atualizar o `ws.go` no backend para receber:
```json
{
   "action": "BULK_SELL",
   "item_ids": ["item_123", "item_456"]
}

```


5. O `GameSession.BulkSell(itemIDs []string)` deve calcular o valor somado da propriedade `ValueGold`, adicionar ao `GoldBank` e remover os itens da mochila de uma só vez, salvando o estado no banco de dados.

---

```

```