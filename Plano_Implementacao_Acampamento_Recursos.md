# Plano de Implementação — Acampamento, Recursos e Construções

## 1. Objetivo

Transformar o acampamento em uma segunda camada de progressão do jogo, conectada diretamente às expedições:

```text
Expedição → recursos e equipamentos → construção/melhoria → recuperação e preparação → nova expedição
```

O acampamento deve oferecer progresso visível, decisões de uso de recursos e melhorias úteis para o comportamento idle, preservando o backend Go como fonte autoritativa e a arquitetura modular já existente.

## 2. Decisões de design

1. Recursos não substituem equipamentos: são duas rolagens independentes.
2. Todo recurso e construção possui uma chave estável; nomes são somente apresentação.
3. Custos, níveis e efeitos vêm de registries declarativos, não de `switch` ou `if/else` espalhados.
4. O primeiro corte usa slots fixos de construção. Posicionamento livre fica para uma fase futura.
5. Construções melhoram principalmente o acampamento e a automação idle, evitando inflar o poder em combate precocemente.
6. Construções concluídas por tempo são reconciliadas ao carregar a sessão; não é necessário manter um worker global.
7. Recursos também são concedidos pela simulação offline, com as mesmas tabelas canônicas.
8. Toda mutação econômica é validada e persistida no servidor.

## 3. Escopo do MVP

### Incluído

- sete recursos;
- recursos especiais de boss;
- rolagem independente de equipamentos;
- inventário persistente de recursos;
- cinco construções com três níveis;
- quatro ou cinco slots fixos no acampamento;
- custos e tempos declarativos;
- efeitos reais sobre recuperação no acampamento;
- desmontagem de equipamentos na Bancada;
- visual evolutivo das construções no Canvas;
- integração com retorno automático à expedição;
- obtenção de recursos na simulação offline;
- catálogo público de recursos e construções;
- auditoria e testes de integridade.

### Fora do MVP

- decoração com posicionamento livre;
- NPCs permanentes;
- cozinha e receitas completas;
- alquimia;
- mercado ou troca de recursos;
- guild camp;
- múltiplas filas de construção;
- aceleração de tempo com moeda premium.

Esses recursos futuros deverão usar os mesmos registries e o mesmo estado persistido, sem exigir redesenho do domínio.

## 4. Catálogo inicial de recursos

| Chave | Nome | Categoria | Origem principal | Uso |
|---|---|---|---|---|
| `wood` | Madeira | comum | Forest, Shereque, Chapolin | Fogueira, Cabana, Bancada |
| `stone` | Pedra | comum | Forest, ruínas e criaturas pesadas | Fogueira, Fonte, Armazém |
| `fiber` | Fibra | comum | aranhas, plantas e criaturas naturais | Cabana e Bancada |
| `iron` | Ferro | incomum | Orcruins, Esgotos e Planalto | melhorias intermediárias |
| `arcane_essence` | Essência Arcana | rara | magos, espectros e Rogartes | Fonte Arcana e níveis mágicos |
| `glacial_crystal` | Cristal Glacial | épica | Frozen | níveis avançados |
| `abyssal_ember` | Brasa Abissal | lendária | Abyss | melhorias finais futuras |

Bosses também podem entregar troféus com chave própria, por exemplo:

- `trophy_forest_bear`;
- `trophy_shereque_fiona`;
- `trophy_chapolin_alma`;
- `trophy_orcruins_skeleton`;
- `trophy_esgotos_destroyer`;
- `trophy_planalto_xandaum`;
- `trophy_rogartes_darkmage`;
- `trophy_frozen_master`;
- `trophy_abyss_final`.

Troféus são materiais permanentes ou consumíveis de melhoria, mas nunca entram na rolagem de equipamento.

## 5. Distribuição por região

| Tier | Regiões atuais | Recursos esperados |
|---:|---|---|
| 1 | Forest, Shereque, Chapolin | madeira, pedra, fibra |
| 2 | Orcruins, Esgotos, Planalto | madeira, pedra, fibra, ferro |
| 3 | Rogartes | ferro, essência arcana |
| 4 | Frozen | essência arcana, cristal glacial |
| 5 | Abyss | essência arcana, cristal glacial, brasa abissal |

Cada monstro recebe um perfil explícito. Não inferir recurso pelo nome do monstro ou da região.

## 6. Modelo de domínio — Recursos

### `ResourceDefinition`

```go
type ResourceDefinition struct {
    Key         string
    Name        string
    Icon        string
    Rarity      string
    Description string
    MaxStack    int64
}
```

### `ResourceDropDefinition`

```go
type ResourceDropDefinition struct {
    ResourceKey string
    Chance      float64
    MinQuantity int64
    MaxQuantity int64
}
```

### `MonsterResourceProfile`

```go
type MonsterResourceProfile struct {
    Drops           []ResourceDropDefinition
    GuaranteedDrops []ResourceDropDefinition
}
```

Criar um `ResourceRegistry` e um `MonsterResourceProfileRegistry`. Os registries validam na inicialização:

- chaves duplicadas;
- chances fora de `0..1`;
- quantidade mínima maior que máxima;
- recurso inexistente referenciado por monstro;
- perfil órfão sem monstro correspondente;
- boss sem troféu quando o design exigir troféu garantido.

## 7. Recompensa de combate

O resultado da morte de um monstro passa a ser representado por um objeto composto:

```go
type CombatReward struct {
    Equipment    *Item
    Resources    []ResourceAmount
    Gold         int64
    Experience   int64
    BossTrophies []ResourceAmount
}
```

Fluxo obrigatório:

1. calcular XP e ouro;
2. executar a rolagem de equipamento existente;
3. executar a rolagem independente de recursos;
4. aplicar limite do armazém;
5. persistir recursos e personagem de forma consistente;
6. enviar o evento ao frontend;
7. registrar no log equipamento e recursos separadamente.

Uma falha na rolagem de recurso não pode cancelar equipamento, XP ou ouro já calculados. Uma falha de persistência, porém, não deve informar ao cliente uma recompensa que não foi salva.

## 8. Persistência PostgreSQL

Criar uma nova migration, seguindo a numeração atual do projeto.

### `character_resources`

```sql
CREATE TABLE character_resources (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    resource_key VARCHAR(80) NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (character_id, resource_key)
);
```

### `character_camps`

```sql
CREATE TABLE character_camps (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    layout_version INT NOT NULL DEFAULT 1,
    state_revision BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `character_camp_buildings`

```sql
CREATE TABLE character_camp_buildings (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    slot_key VARCHAR(40) NOT NULL,
    building_key VARCHAR(80) NOT NULL,
    level INT NOT NULL DEFAULT 0 CHECK (level >= 0),
    upgrade_target_level INT,
    upgrade_started_at TIMESTAMPTZ,
    upgrade_ends_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (character_id, slot_key),
    UNIQUE (character_id, building_key)
);
```

### Regras transacionais

- custo da construção é debitado na mesma transação que inicia o upgrade;
- usar `SELECT ... FOR UPDATE` ao iniciar construção/desmontagem;
- impedir saldo negativo;
- impedir dois upgrades simultâneos no MVP;
- usar `state_revision` para evitar cliques duplicados e mensagens WebSocket repetidas;
- concluir upgrades comparando `upgrade_ends_at` com o horário do servidor.

## 9. Registry de construções

Criar `BuildingRegistry` como fonte única de níveis, custos, tempos, efeitos e apresentação pública.

```go
type BuildingDefinition struct {
    Key         string
    Name        string
    Icon        string
    Description string
    SlotType    string
    Levels      []BuildingLevelDefinition
}

type BuildingLevelDefinition struct {
    Level            int
    Costs            []ResourceAmount
    BuildDuration    time.Duration
    Effects          []BuildingEffect
    RequiredTrophies []ResourceAmount
}
```

Efeitos devem possuir chave e valor, por exemplo:

```text
camp_hp_regen_percent = 25
camp_mana_regen_percent = 30
camp_all_regen_percent = 10
resource_storage = 300
salvage_efficiency_percent = 20
```

O motor soma efeitos por chave através de um `CampBonusCalculator`; ele não consulta nomes de construções.

## 10. Construções do MVP

Os valores abaixo são uma baseline e devem ser calibrados pelo audit de economia.

### Fogueira — `campfire`

| Nível | Custo sugerido | Tempo | Efeito |
|---:|---|---:|---|
| 1 | 30 madeira, 10 pedra | 10 s | +25% regen de HP no acampamento |
| 2 | 80 madeira, 50 pedra, 20 fibra | 2 min | +50% regen de HP |
| 3 | 150 madeira, 100 pedra, 30 ferro, troféu Tier 2 | 10 min | +85% regen de HP |

### Fonte Arcana — `arcane_spring`

| Nível | Custo sugerido | Tempo | Efeito |
|---:|---|---:|---|
| 1 | 30 pedra, 15 essência | 30 s | +25% regen de mana |
| 2 | 80 pedra, 50 essência | 4 min | +55% regen de mana |
| 3 | 140 pedra, 100 essência, 10 cristal | 15 min | +100% regen de mana |

### Cabana — `adventurer_hut`

| Nível | Custo sugerido | Tempo | Efeito |
|---:|---|---:|---|
| 1 | 50 madeira, 25 fibra | 30 s | +10% regen de HP e mana |
| 2 | 120 madeira, 60 fibra, 30 pedra | 5 min | +20% regen geral |
| 3 | 250 madeira, 100 fibra, 50 ferro | 20 min | +35% regen geral |

### Armazém — `warehouse`

| Nível | Custo sugerido | Tempo | Capacidade total sugerida |
|---:|---|---:|---:|
| 0 | — | — | 200 unidades |
| 1 | 60 madeira, 30 pedra | 30 s | 500 |
| 2 | 140 madeira, 80 pedra, 30 ferro | 5 min | 1.200 |
| 3 | 250 madeira, 150 pedra, 80 ferro | 20 min | 3.000 |

No MVP, a capacidade pode ser global para simplificar. Recursos acima do limite não são persistidos e geram aviso explícito. Não converter overflow em ouro neste corte, evitando uma fonte econômica não auditada.

### Bancada — `workbench`

| Nível | Custo sugerido | Tempo | Efeito |
|---:|---|---:|---|
| 1 | 50 madeira, 20 pedra, 15 ferro | 1 min | libera desmontagem |
| 2 | 120 madeira, 60 pedra, 50 ferro | 8 min | +15% rendimento |
| 3 | 220 madeira, 100 pedra, 100 ferro, 30 essência | 25 min | +30% rendimento |

## 11. Desmontagem de equipamentos

A Bancada converte itens em recursos, mas sem criar ciclo infinito de valor.

Regras:

1. equipamento equipado não pode ser desmontado;
2. skill books e troféus não podem ser desmontados no MVP;
3. desmontagem é irreversível e exige confirmação;
4. rendimento usa `Tier`, raridade e slot; não usa somente `ValueGold`;
5. o servidor calcula e informa o preview antes da confirmação;
6. confirmar novamente usa ID e revisão para evitar desmontagem duplicada;
7. equipamento starter pode ser bloqueado ou render apenas uma quantidade simbólica.

Exemplo de fórmula inicial:

```text
base = 2 + (tier × 2)
raridade = comum 1.0, incomum 1.2, raro 1.6, épico 2.2, lendário 3.0
eficiência = 1 + bônusDaBancada
quantidade = floor(base × raridade × eficiência)
```

O tipo de item define a composição:

- armas e armaduras pesadas → ferro e pedra;
- arcos, bolsas e roupas → madeira e fibra;
- varinhas, orbes e itens mágicos → essência;
- itens Frozen/Abyss podem gerar uma quantidade pequena do recurso regional.

## 12. Recuperação no acampamento

Centralizar o cálculo em `CampBonusCalculator`.

```text
HPRegenFinal = HPRegenBase × (1 + Fogueira + Cabana)
MPRegenFinal = MPRegenBase × (1 + FonteArcana + Cabana)
```

Os percentuais são somados antes da multiplicação. Usar acumuladores fracionários por segundo para que o comportamento não dependa do intervalo atual do ticker.

Regras:

- efeitos valem somente enquanto o personagem está no acampamento;
- pausa manual nunca dispara retorno automático;
- retorno por derrota continua respeitando `AutoResumeExpedition`;
- upgrade concluído durante a recuperação passa a valer assim que for reconciliado;
- HP e mana nunca ultrapassam os máximos derivados do personagem;
- construção não regenera instantaneamente HP ou mana.

## 13. Integração com retorno automático

Reutilizar o fluxo atual de:

- `AutoResumeExpedition`;
- `RecoveringFromDefeat`;
- `AutoResumePending`.

Novo comportamento:

1. personagem é derrotado;
2. volta ao acampamento;
3. construções aceleram a recuperação;
4. quando HP e mana atingem 100%, o fluxo atual retorna à expedição;
5. se o toggle for desligado, o retorno pendente é cancelado;
6. se a expedição foi pausada manualmente, não há retorno automático.

Uma futura `expedition_table` poderá permitir limites configuráveis, mas o MVP preserva a exigência atual de recuperação completa.

## 14. Simulação offline

Recursos precisam fazer parte da simulação offline para não criar diferença estrutural entre jogo aberto e fechado.

Regras:

- usar o mesmo `MonsterResourceProfileRegistry`;
- usar o RNG determinístico já utilizado pelo relatório offline;
- incluir recursos no identificador lógico do relatório/claim;
- persistir recursos na mesma transação do claim offline;
- respeitar capacidade do Armazém;
- informar quantidade coletada e overflow;
- garantir idempotência: o mesmo relatório não pode conceder recursos duas vezes;
- troféus somente são concedidos se a simulação efetivamente concluir a onda do boss.

Adicionar ao relatório:

```go
ResourcesFound    []ResourceAmount
ResourcesOverflow []ResourceAmount
BossTrophies      []ResourceAmount
```

## 15. Catálogo público

Estender `GameCatalog` com:

```json
{
  "resources": [],
  "camp_buildings": [],
  "camp_layout": []
}
```

O catálogo deve expor:

- nomes, ícones e descrições;
- custos por nível;
- duração;
- efeitos para tooltip;
- nível máximo;
- tipo de slot;
- posições visuais permitidas.

Não expor funções internas, tabelas secretas de chance ou informações que facilitem manipulação do cliente.

Atualizar `GameCatalogVersion`.

## 16. Protocolo WebSocket

### Novas ações do cliente

```text
START_BUILDING_UPGRADE
SALVAGE_PREVIEW
SALVAGE_ITEM
```

Payload de upgrade:

```json
{
  "action": "START_BUILDING_UPGRADE",
  "building_key": "campfire",
  "slot_key": "center",
  "expected_revision": 12
}
```

### Novos eventos do servidor

```text
RESOURCE_DROP
CAMP_UPDATE
BUILDING_UPGRADE_STARTED
BUILDING_UPGRADE_COMPLETED
SALVAGE_PREVIEW
SALVAGE_COMPLETED
CAMP_ERROR
```

Os snapshots relevantes devem incluir:

```json
{
  "resources": [],
  "camp": {
    "revision": 13,
    "storage_used": 120,
    "storage_capacity": 500,
    "buildings": []
  }
}
```

O frontend nunca presume que o upgrade ocorreu antes de receber confirmação do servidor.

## 17. Frontend do acampamento

### Componentes React

Criar:

```text
frontend/src/components/Camp/
├── CampPanel.tsx
├── ResourceBar.tsx
├── BuildingCard.tsx
├── BuildingUpgradeModal.tsx
├── ConstructionProgress.tsx
└── SalvageModal.tsx
```

Responsabilidades:

- mostrar recursos e capacidade;
- selecionar construção;
- exibir custos disponíveis/faltantes;
- iniciar upgrade;
- mostrar horário/tempo restante;
- exibir efeitos do próximo nível;
- confirmar desmontagem;
- apresentar erros autoritativos do backend.

Usar React para botões e modais. O Canvas fica responsável pela cena visual, não por formulários ou lógica econômica.

## 18. Renderização Canvas modular

Criar:

```text
frontend/src/game/camp/
├── CampBuildingRegistry.ts
├── CampLayoutRegistry.ts
├── CampSceneRenderer.ts
├── types.ts
└── renderers/
    ├── CampfireRenderer.ts
    ├── ArcaneSpringRenderer.ts
    ├── HutRenderer.ts
    ├── WarehouseRenderer.ts
    └── WorkbenchRenderer.ts
```

Cada renderer recebe:

```text
buildingKey, level, constructionProgress, x, y, scale
```

Requisitos visuais:

- nível 0: terreno vazio ou fundação;
- construção em andamento: andaime, poeira e progresso;
- nível 1–3: silhuetas perceptivelmente diferentes;
- Fogueira: chama e fumaça crescentes;
- Fonte: partículas arcanas e brilho;
- Cabana: estrutura, telhado e iluminação;
- Armazém: caixas, barris e expansão física;
- Bancada: ferramentas, bigorna e faíscas;
- preservar nuvens, céu dinâmico, fogueira e partículas do acampamento atual;
- animações baseadas em tempo/delta, não em quantidade fixa por frame.

O `GameViewport` apenas entrega o snapshot do acampamento ao `CampSceneRenderer` quando a expedição não está ativa.

## 19. Arquivos de backend

### Novos

```text
backend/pkg/game/resources.go
backend/pkg/game/resource_registry.go
backend/pkg/game/resource_profiles.go
backend/pkg/game/camp.go
backend/pkg/game/building_registry.go
backend/pkg/game/camp_bonus_calculator.go
backend/pkg/game/salvage.go
backend/pkg/game/resources_test.go
backend/pkg/game/camp_test.go
backend/internal/db/camp.go
backend/migrations/000002_camp_system.sql
```

### Modificados

```text
backend/pkg/game/engine.go
backend/pkg/game/game_catalog.go
backend/pkg/game/content_registry.go
backend/pkg/game/loot_test.go
backend/cmd/server/ws.go
backend/cmd/balanceaudit/main.go
backend/pkg/game/offline.go (ou arquivo equivalente da simulação atual)
```

`engine.go` deve apenas orquestrar morte, recompensa e recuperação. Regras de recursos, construções e desmontagem permanecem nos módulos próprios.

## 20. Arquivos de frontend

### Novos

```text
frontend/src/components/Camp/*
frontend/src/game/camp/*
```

### Modificados

```text
frontend/src/components/Viewport/GameViewport.ts
frontend/src/components/Viewport/GameCanvas.tsx
frontend/src/components/Dashboard/DashboardGrid.tsx
frontend/src/game/GameCatalog.ts
frontend/src/hooks/useGameCatalog.ts
frontend/src/hooks/useGameSocket.ts
```

Centralizar os novos DTOs de recurso/acampamento para não duplicar interfaces entre componentes.

## 21. Auditoria de conteúdo

Estender `tools/audit-content.mjs` ou criar `tools/audit-camp-content.mjs` para validar:

- todo recurso de perfil existe;
- todo monstro possui perfil quando exigido;
- recursos respeitam o Tier da região;
- bosses possuem troféu válido;
- custos de construção referenciam recursos existentes;
- níveis são sequenciais;
- nenhuma construção tem duas definições para o mesmo nível;
- efeitos possuem chaves conhecidas;
- todos os `building_key` do backend possuem renderer no frontend;
- slots do layout existem e aceitam o tipo da construção.

## 22. Estratégia de implementação cirúrgica

### Etapa 0 — Baseline

- executar todos os testes atuais;
- registrar saída do `balanceaudit`;
- validar build do frontend;
- registrar comportamento atual de recuperação e auto resume.

### Etapa 1 — Vertical slice da Fogueira

- migration;
- `ResourceRegistry` com madeira e pedra;
- perfil de recursos somente para Forest;
- persistência de recursos;
- `BuildingRegistry` somente com Fogueira;
- upgrade nível 1;
- efeito real de HP regen;
- evento WebSocket;
- recurso e Fogueira visíveis no frontend.

Essa etapa comprova o fluxo completo sem introduzir todo o conteúdo de uma vez.

### Etapa 2 — Generalização dos recursos

- adicionar os sete recursos;
- cadastrar todos os perfis de monstros;
- adicionar troféus de boss;
- integrar relatório offline;
- adicionar capacidade e overflow.

### Etapa 3 — Construções restantes

- Fonte Arcana;
- Cabana;
- Armazém;
- Bancada;
- efeitos no `CampBonusCalculator`;
- timers e reconciliação.

### Etapa 4 — Desmontagem

- preview autoritativo;
- transação de desmontagem;
- confirmação na UI;
- auditoria de rendimento por Tier/raridade.

### Etapa 5 — Visual completo

- renderers por nível;
- estado em construção;
- partículas;
- slots e seleção;
- refinamento do céu/cenário;
- verificação a 60 FPS.

### Etapa 6 — Balanceamento e documentação

- executar simulações de coleta;
- medir tempo para cada upgrade;
- garantir que recursos raros não bloqueiam o início;
- atualizar documentação arquitetural e changelog;
- executar checklist final.

## 23. Testes obrigatórios

### Backend

1. equipamento e recurso podem cair juntos;
2. falhar rolagem de equipamento não impede recurso;
3. quantidade sempre respeita mínimo/máximo;
4. boss entrega troféu somente após morte válida;
5. recurso inexistente faz registry falhar no teste;
6. upgrade sem saldo é rejeitado;
7. custo é debitado exatamente uma vez;
8. dois pedidos concorrentes não iniciam dois upgrades;
9. nível máximo não pode ser ultrapassado;
10. construção conclui corretamente após reconexão;
11. Fogueira afeta somente regen de HP no acampamento;
12. Fonte afeta somente regen de mana no acampamento;
13. Cabana afeta ambos;
14. pausa manual não aciona auto resume;
15. derrota + recuperação completa mantém auto resume atual;
16. relatório offline é determinístico e idempotente;
17. overflow respeita Armazém;
18. desmontagem não aceita item equipado ou inexistente;
19. starter item não gera exploração de recursos;
20. catálogo referencia apenas chaves válidas.

### Frontend

1. recursos atualizam sem recarregar a página;
2. custo insuficiente aparece antes e depois da validação do servidor;
3. clique duplo não duplica construção;
4. progresso usa horário do servidor;
5. reconexão recupera construção em andamento;
6. todos os níveis possuem representação visual;
7. Canvas permanece fluido;
8. modal de desmontagem exibe exatamente o preview do backend;
9. acampamento continua funcional com estado legado sem construções.

## 24. Comandos de verificação

```bash
cd backend
go test ./...
go run ./cmd/balanceaudit

cd ../frontend
npx tsc --noEmit
npm run build

cd ..
node tools/audit-content.mjs
node tools/audit-camp-content.mjs
```

## 25. Critérios de aceite do MVP

- personagens existentes entram com acampamento válido sem migração manual;
- equipamentos continuam caindo com as mesmas probabilidades anteriores;
- recursos aparecem separadamente no log e na UI;
- recursos persistem após desconectar/reconectar;
- recursos offline não podem ser reivindicados duas vezes;
- as cinco construções podem chegar ao nível 3;
- custos e tempos vêm exclusivamente do `BuildingRegistry`;
- nenhum cálculo econômico relevante ocorre somente no frontend;
- construções alteram a recuperação conforme descrição;
- auto resume continua funcionando após derrota;
- pausa manual continua segura;
- desmontagem é transacional e irreversível somente após confirmação;
- bosses entregam troféus configurados;
- cada construção possui visual diferente por nível;
- conteúdo novo passa nas auditorias;
- `go test ./...`, TypeScript e build finalizam sem erros;
- documentação de arquitetura e changelog são atualizados.

## 26. Evoluções posteriores

Depois de estabilizar o MVP:

1. Mesa de Expedições com limiares configuráveis de HP/mana;
2. Cozinha e refeições para a próxima expedição;
3. Alquimia e consumíveis;
4. Boneco de treinamento para maestria limitada;
5. NPCs desbloqueados por construções;
6. plantas raras de construção;
7. troféus visuais de bosses;
8. decoração e reposicionamento livre;
9. contratos do acampamento;
10. acampamento compartilhado de guilda.

Cada evolução deve entrar como novo conteúdo registrado, sem adicionar cadeias de regras ao `engine.go` ou ao `GameViewport`.
