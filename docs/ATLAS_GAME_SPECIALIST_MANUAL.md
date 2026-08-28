# Manual do Especialista de Jogo — Reino do Avesso

Este manual é o guia de engenharia, arquitetura, design e boas práticas para o desenvolvimento e evolução contínua do **Reino do Avesso**. `Atlas` permanece como nome interno de pacotes e contratos legados. O estado verificável do projeto fica em [`DOCUMENTATION_STATUS.md`](DOCUMENTATION_STATUS.md).

---

## 🏛️ 1. Princípios de Engenharia & Pilares

### Pilar 1: Zero Regressão (Preservação de Código em Funcionamento)
- Qualquer refatoração ou adição deve ser estritamente **aditiva**.
- Nunca remova monstros, biomas, itens, rotas de WebSocket ou tabelas do banco de dados sem requisição explícita.
- Mantenha sempre a compatibilidade retroativa para não invalidar saves de personagens ou sessões de jogadores.

### Pilar 2: Backend Autoritativo & Anti-Cheat
- O cliente React é um terminal inteligente de visualização a 60 FPS com interpolação suave.
- Toda a matemática de combate, dano, acerto crítico, lifesteal, drop rates, ganho de XP/Ouro e progresso offline é processada exclusivamente no backend Go.
- Todas as rotinas que afetam estado persistente e economia (como `ClaimOfflineProgress`, `EquipItem`, `BulkSell`) devem rodar com isolamento transacional seguro e checagem de concorrência.

### Pilar 3: Estética, Criatividade e Game Feel
- **Dark Mode Moderno & Harmonioso**: Paleta de cores escuras refinadas (slate-950, slate-900, slate-800) com acentos temáticos em âmbar, esmeralda, céu, roxo e fogo.
- **Micro-Animações e Feedback Visual**:
  - Números flutuantes de dano e cura (floaters coloridos).
  - Barras clássicas de HP e Mana com gradientes e sombras internas.
  - Super Tooltips ricos mostrando atributos, passivas, requisitos de nível e efeitos especiais.
  - Chips e bordas com as cores determinísticas de raridade do jogo.

### Estado visual atual

- O renderer efetivo do jogo é HTML5 Canvas 2D com cache offscreen e
  interpolação. `pixi.js` permanece no `package.json`, mas não deve ser tratado
  como a arquitetura gráfica atual sem uma decisão específica de migração.
- O acampamento, a Floresta e a Vila do Shereque usam a base isométrica; as
  outras regiões ainda usam renderers legados até receberem geometria, terreno,
  colisão e validação equivalentes.

---

## 🛡️ 2. Guia de Implementação Rápida

### Como Adicionar um Novo Monstro
1. **Definição de Loot e Template**:
   Em `backend/pkg/game/loot.go`, adicione o perfil de drop em `MonsterLootProfileMap` contendo chances, tiers e limites de raridade.
2. **Registro na Expedição**:
   Em `backend/pkg/game/expeditions.go`, adicione o monstro na região correspondente com seus atributos base (`HP`, `Attack`, `Defense`, `Exp`, `Gold`, `State`).
3. **Renderer Visual Pixel Art**:
   No arquivo de tier correspondente em `frontend/src/game/renderers/monsters/tier*.ts`, desenhe a silhueta e detalhes do monstro usando o Canvas 2D.
4. **Registro no Frontend**:
   Registre o monstro em `frontend/src/game/registries/MonsterRegistry.ts`.

### Como Adicionar um Novo Equipamento
1. **Template de Item**:
   Em `backend/pkg/game/loot.go` (`lootTemplates`), registre o item com seus atributos (`Attack`, `Defense`, `Weight`, `Rarity`, `RequiredLevel`, bônus de stats e efeitos).
2. **Ícone e Estilização**:
   Se for um tipo de arma/slot existente, o `ItemIcon.tsx` renderiza automaticamente o SVG adequado.
   Se for um item especial, adicione a silhueta SVG correspondente em `ItemIcon.tsx`.

### Como Adicionar um Novo Bioma
1. **Renderer de Cenário**:
   Em `frontend/src/game/renderers/biomes/BiomeRenderers.ts`, crie a função de desenho com as camadas de fundo, céu, terreno e elementos decorativos.
2. **Registro de Bioma**:
   Em `frontend/src/game/registries/BiomeRegistry.ts`, mapeie a chave do bioma (`biome_key`).
3. **Associação no Backend**:
   Em `backend/pkg/game/expeditions.go`, associe `BiomeKey` à respectiva região de expedição.

---

## 🎨 3. Padrão Determinístico de Raridades

Utilize sempre o helper universal `getRarityStyle` para garantir que todas as telas exibam as cores exatas:

```typescript
export function getRarityStyle(rarity?: string) {
  switch (rarity) {
    case 'Incomum':  // Verde Esmeralda
      return { border: 'border-emerald-500/60 hover:border-emerald-400 bg-emerald-950/30', text: 'text-emerald-300' };
    case 'Raro':     // Azul Céu
      return { border: 'border-sky-500/60 hover:border-sky-400 bg-sky-950/30', text: 'text-sky-300' };
    case 'Épico':    // Roxo Mágico
      return { border: 'border-purple-500/60 hover:border-purple-400 bg-purple-950/30', text: 'text-purple-300' };
    case 'Lendário': // Laranja Dourado
      return { border: 'border-orange-500/60 hover:border-orange-400 bg-orange-950/30', text: 'text-orange-300' };
    case 'Mítico':   // Rosa / Carmesim
      return { border: 'border-rose-500/70 hover:border-rose-400 bg-rose-950/30', text: 'text-rose-300' };
    case 'Divino':   // Dourado Divino
      return { border: 'border-amber-400/80 hover:border-amber-300 bg-amber-950/40', text: 'text-amber-300' };
    case 'Comum':
    default:         // Cinza Ardósia
      return { border: 'border-slate-800 hover:border-slate-700 bg-slate-900/60', text: 'text-slate-300' };
  }
}
```

---

## 🔒 4. Concorrência e Transações Seguras no Backend Go

- **WebSocket Sessions**: Proteja o mapa `activeSessions` sempre com `sync.RWMutex` (`sessionsMu.Lock()` / `sessionsMu.RLock()`).
- **Claim Offline Idempotente**:
  ```go
  tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
  // Carrega personagem com SELECT ... FOR UPDATE
  // Calcula ganhos determinísticos com base no delta-time (máx 12h)
  // Persiste XP, múltiplos level-ups, ouro e drops
  // Commit
  ```
- **Controle de Conexões**: Garanta que sessões duplicadas do mesmo personagem fechem a conexão anterior graciosamente antes de aceitar a nova.

---

## 🚀 5. Checklist de Qualidade Contínua
- [ ] `npx tsc --noEmit` executado sem nenhum erro de tipo.
- [ ] `npm run build` gerando o bundle de produção sem quebras.
- [ ] Consistência garantida entre `loot.go`, `expeditions.go` e `registries`.
- [ ] `KNOWLEDGE_BASE.md` e `REFACTOR_CHANGELOG.md` devidamente atualizados.