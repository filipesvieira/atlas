Fiz uma análise detalhada e cirúrgica do código-fonte e das especificações do **Project Atlas** (`engine.go`, `loot.go`, `offline.go`, `db.go`, `ws.go` e documentações).

O jogo já possui uma base limpa em Go e React, mas do ponto de vista de **Game Design, Balanceamento Matemático e Retenção do Jogador (Dopamina)**, existem falhas e lacunas estruturais que tornam a progressão previsível e limitada.

Abaixo está o diagnóstico cirúrgico de **tudo o que precisa ser ajustado e evoluído no jogo**, com as fórmulas matemáticas e padrões adotados na indústria de RPGs (Tibia, Diablo, Path of Exile, Melvor Idle).

---

## 1. Diagnóstico e Cirurgia de Cálculos & Combate (`engine.go`)

### 🔴 Problemas Identificados no Código Atual:

1. **Dano Físico sem Escala de Variância**: O dano atual é `totalAtk + rand.Intn(8)`. Adicionar de $0$ a $7$ de dano fixo é irrelevante quando o jogador tem $200$ de ataque.
2. **Mitigação de Defesa Quebrada**: O cálculo `rawAtk - (totalDef / 2)` é uma subtração plana. Isso faz com que monstros fracos causem $2$ de dano (mínimo hardcoded) e monstros fortes pulverizem o jogador se a defesa não for astronômica.
3. **Ausência de Atributos Primários**: O Nível do personagem só concede $+25\text{ HP}$ e $+15\text{ MP}$. O ataque e a defesa base continuam em $10$ para sempre. O nível parece desconectado da força real do personagem.
4. **Combate sem Velocidade de Ataque (Attack Speed)**: O tick do jogo é fixo em $750\text{ms}$. Um adaga leve e um machado de duas mãos atacam no mesmo ritmo.

---

### 🟢 Solução e Rebalanceamento Proposto:

#### A) Atributos Primários e Pontos de Nível (Level Up Points)

Ao subir de nível, o jogador recebe **3 Pontos de Atributo** para distribuir livremente no painel:

* **Força ($\text{STR}$)**: $+1.5\text{ Dano Melee}$, $+15\text{ oz de Capacidade (Cap)}$.
* **Destreza ($\text{DEX}$)**: $+1.5\text{ Dano Distância}$, $+0.25\%\text{ Chance de Crítico}$, $+0.1\%\text{ Esquiva}$.
* **Inteligência ($\text{INT}$)**: $+2.0\text{ Dano Mágico}$, $+12\text{ Max Mana}$, $+0.2\text{ Reg. Mana/tick}$.
* **Vitalidade ($\text{VIT}$)**: $+25\text{ Max HP}$, $+0.3\text{ Reg. HP/tick}$, $+0.5\text{ Defesa Fís.}$.

#### B) Nova Fórmula de Dano com Variância Percentual

Em vez de somar um valor aleatório fixo, a variância deve ser percentual ($\pm 15\%$ sobre o dano total), ajustada pelo multiplicador de acerto crítico:

$$\text{Dano Mínimo} = \text{Ataque Total} \times 0.85$$

$$\text{Dano Máximo} = \text{Ataque Total} \times 1.15$$

$$\text{Dano Base} = \text{Random}(\text{Dano Mínimo}, \text{Dano Máximo})$$

$$\text{Se Crítico (Roll} \le \text{ChanceCritico)} \implies \text{Dano Final} = \text{Dano Base} \times 1.50$$

#### C) Mitigação de Dano Por Curva Assintótica (Padrão RPGs Modernos)

Para evitar que a defesa fique inútil ou totalmente imune, substitua a subtração simples pela fórmula de redução percentual curva:

$$\text{Redução de Dano (\%)} = \frac{\text{Defesa Total}}{\text{Defesa Total} + (20 \times \text{Nível do Monstro})}$$

$$\text{Dano Sofrido} = \text{Ataque do Monstro} \times (1 - \text{Redução de Dano})$$

> **Resultado**: A defesa nunca chega a $100\%$ de mitigação (evitando imortalidade), mas cada ponto de defesa investido reduz uma porcentagem real do dano recebido.

---

## 2. Rebalanceamento de Experiência, Maestrias e Skills

### 🔴 Problemas Identificados no Código Atual:

1. **Desequilíbrio Grave na Maestria Mágica**: A magia `fireball` concede $+25$ tentativas de maestria mágica de uma só vez (igual ao custo de mana), enquanto o machado ou espada concede apenas $+1$ tentativa por ataque. A maestria mágica evolui $25$ vezes mais rápido!
2. **Fórmula de Maestria com Retorno Estagnado**: $\text{MasteryLevel} = 10 + \lfloor \text{tries}^{0.35} \times 3 \rfloor$. Essa fórmula faz com que o ganho de níveis de maestria fique excessivamente lento após o nível 40.

---

### 🟢 Solução e Rebalanceamento Proposto:

#### A) Unificação do Ganho de Maestrias (Try System)

Toda ação (seja um ataque de machado, disparo de flecha, bloqueio de escudo ou feitiço lançado) deve conceder **$1$ tentativa (Try)** para a respectiva maestria.

* *Se a magia gastar muita mana*: Concede tentativas equivalentes a $\lfloor \frac{\text{Mana Gasta}}{10} \rfloor$. Lançar `fireball` ($25\text{ MP}$) deve conceder $2.5 \rightarrow 2$ tentativas de maestria, não 25.

#### B) Nova Curva Exponencial de Maestria

Substitua a fórmula atual por um sistema de experiência de maestria escalonado:

$$\text{Tries Necessários para Nível } N = \lfloor 10 \times (N)^{2.1} \rfloor$$

| Nível de Maestria | Tentativas Totais Acumuladas | Esforço Estimado no Idle |
| --- | --- | --- |
| **Nível 10** | ~1.250 hits | ~15 minutos |
| **Nível 30** | ~12.500 hits | ~2.5 horas |
| **Nível 50** | ~120.000 hits | ~1 dia |
| **Nível 100** | ~1.500.000 hits | ~12 dias |

---

## 3. Simulação Offline Realista (`offline.go`)

### 🔴 Problema Crítico no MVP:

Atualmente, o progresso offline calcula a experiência como:


$$\text{XP Ganha} = \text{Minutos Offline} \times 150 \times \text{Nível do Personagem}$$


Isso ignora completamente a região onde o jogador estava, se ele tinha defesa suficiente para sobreviver aos monstros, ou se o inventário encheu!

---

### 🟢 Solução: Algoritmo de Expedição Offline Baseado na Região Ativa

Ao reconectar, o servidor em Go deve executar a seguinte simulação matemática baseada na **Região Selecionada**:

```text
1. Obter Estatísticas da Região Ativa (Média de HP, Ataque e XP dos Monstros da Região).
2. Calcular Eficiência do Jogador:
   - Dano Médio por Segundo (DPS) do Jogador vs HP do Monstro = Tempo por Abate.
   - Taxa de Sobrevivência = Defesa do Jogador vs Ataque do Monstro.
3. Se (Defesa do Jogador < Requisito Mínimo da Região):
   - Reduzir Eficiência em 50% (Simula uso massivo de poções e mortes temporárias).
4. Kills Totais = (Tempo Offline em Segundos) / (Tempo Médio por Abate + 2s de busca).
5. XP Total = Kills Totais x XP Médio da Região.
6. Gold Total = Kills Totais x Gold Médio da Região.
7. Rolls de Loot = Kills Totais x Chance de Drop da Região.

```

---

## 4. Capacidade, Inventário e Economia de Loot (`loot.go` & `engine.go`)

### 🔴 Problemas Identificados:

1. **Loot Perdido por Peso**: Quando o peso total excede a capacidade ($\text{Cap}$), o item é simplesmente destruído com a mensagem `"⚠️ LOOT PERDIDO"`. Isso frustra o jogador offline.
2. **Atributos de Loot Limitados**: Os itens procedurais geram apenas Ataque e Defesa. Faltam atributos que criem variação de *builds* (ex: Lifesteal, Mana Regen, Critical Chance, Attack Speed).

---

### 🟢 Solução e Melhorias na Tabela de Afixos:

#### A) Sistema de Auto-Convert/Auto-Sell ao Exceder Capacidade

Em vez de perder o item, adicione a opção no painel:

* **"Converter itens excedentes em Ouro automaticamente ($50\%$ do valor base)"**.
* **"Auto-Descartar itens de raridade Comum quando a Mochila atingir $90\%$ do limite"**.

#### B) Tabela Expandida de Afixos Procedurais de Loot (Prefixos e Sufixos)

Ao gerar loot procedural em `loot.go`, inclua atributos secundários armazenados no objeto do item:

```go
type ItemAffix struct {
    Name          string
    CritChance    float64 // ex: +3.5% Crit
    Lifesteal     float64 // ex: +2.0% Lifesteal
    ManaRegen     int     // ex: +1 MP/tick
    AttackSpeed   float64 // ex: +5% Vel. Ataque
}

```

* **Prefixos de Dopamina**:
* *Puro*: $+5\%\text{ Vel. Ataque}$
* *Assassino*: $+8\%\text{ Chance de Crítico}$
* *Vampírico*: $+4\%\text{ Roubo de Vida}$
* *Místico*: $+2\text{ Reg. Mana/tick}$
* *Titanium*: $+15\%\text{ Defesa Total}$



---

## 🎯 Resumo das Melhorias para o Repositório

| Módulo | Arquivo no Projeto | Melhoria Solicitada | Impacto no Jogo |
| --- | --- | --- | --- |
| **Atributos** | `db.go` / `engine.go` | Adicionar STR, DEX, INT, VIT e pontos de distribuição por nível. | Dá controle de build e identidade ao jogador. |
| **Combate** | `engine.go` | Implementar fórmula de mitigação assintótica de defesa e variância percentual de dano. | Elimina combates truncados; defesa passa a valer a pena. |
| **Maestria** | `engine.go` | Corrigir ganho de maestria mágica (igualar aos hits físicos). | Equilibra o avanço entre Guerreiros, Arqueiros e Magos. |
| **Offline** | `offline.go` | Simulação baseada na Região Ativa, DPS e taxa de abates reais. | Elimina exploit de XP fácil e torna o progresso offline justo. |
| **Inventário** | `engine.go` / `loot.go` | Auto-venda/Auto-descarte quando o peso/cap estourar + Afixos de Crit/Lifesteal. | Sensação constante de recompensa sem perda frustrante de loot. |

---