# Code Review do Refatoramento Atlas MMORPG V5

**Snapshot revisado:** `repomix-output(8).xml`  
**Data da revisão:** 11/08/2026  
**Escopo:** arquitetura modular, segurança, progressão, loot/compêndio, venda automática, inventário, overflow, acampamento, persistência, WebSocket, frontend e testes.

## 1. Veredito executivo

O refatoramento foi **parcialmente bem-sucedido**, mas **ainda não está pronto para produção**.

As mudanças visuais e de catálogo foram as partes mais bem executadas: níveis fixos dos monstros, registries de biomas/monstros, separação dos renderizadores e auditorias de conteúdo estão coerentes. Segurança de configuração, autorização administrativa e lifecycle do progresso offline também melhoraram.

Por outro lado, várias funcionalidades descritas como concluídas no changelog existem apenas como estrutura ou implementação parcial. Os maiores riscos estão em:

- duplicação ilimitada de starter packs;
- equipamento em slots arbitrários controlados pelo cliente;
- venda automática diferente do que a interface promete, especialmente offline;
- perda ou divergência de itens/ouro por mutações não atômicas e erros ignorados;
- desbloqueio por chefe ainda contornável;
- protocolo WebSocket V2 parcialmente adotado e ainda sujeito a perda de eventos;
- `TemplateKey`, state machine e calculadores compartilhados criados, mas não integrados de ponta a ponta;
- migrações duplicadas dentro de `InitDB` com todos os erros descartados.

**Recomendação:** não fazer deploy do snapshot sem corrigir os itens P0 e P1 deste relatório e executar a suíte Go completa com banco PostgreSQL real.

## 2. Validações executadas

| Verificação | Resultado |
|---|---:|
| `npm run build` (`tsc` + Vite) | ✅ Passou |
| `node tools/audit-content.mjs` | ✅ 9 regiões, 39 monstros/bosses, 39 perfis, 92 templates, 39 visuais, 0 erros |
| `node tools/audit-camp-content.mjs` | ✅ 16 recursos, 39 perfis, 5 construções, 7 renderizações, 0 erros |
| `npm audit --omit=dev` | ✅ 0 vulnerabilidades conhecidas em dependências de produção |
| `go test ./...` | ⚠️ Não executado: runtime Go indisponível no ambiente de revisão |
| `go test -race ./...` | ⚠️ Não executado |
| Testes de integração PostgreSQL | ❌ Não existem no snapshot |
| Pipeline CI | ❌ Não encontrado |
| Testes automatizados do frontend | ❌ Não há script de testes; apenas compilação |

O frontend compilado e as auditorias declarativas passando são bons sinais, mas não validam transações, concorrência, WebSocket, economia ou migrações.

## 3. O que foi implementado corretamente

### 3.1. Níveis de monstros por expedição

O problema original de escalar o monstro pelo nível do personagem foi corrigido. `GetRandomMonsterForRegion` agora devolve os atributos fixos do template da região (`backend/pkg/game/expeditions.go:304-322`).

Isso impede, por exemplo, monstros nível 19 em uma região configurada para níveis menores. Os testes `TestExpeditionMonsterLevelBounds`, `TestGetRandomMonsterForRegionRegressionCases` e `TestBuildOfflineWaveRespectsFixedLevels` cobrem a regressão, e a auditoria de conteúdo confirmou que os 39 monstros/bosses estão dentro das faixas declaradas.

### 3.2. Modularização visual

- `PixelArtRenderer.ts` foi reduzido a uma fachada de 44 linhas.
- `BiomeRenderers.ts` foi reduzido a 14 linhas e os cenários foram separados por tema.
- Os 39 `visual_key` do backend possuem renderer correspondente no frontend.
- `GameViewport` consulta `BiomeRegistry`, `MonsterRegistry` e `HeroRegistry`, em vez de manter grandes cadeias por nome.
- O registry genérico rejeita chave e alias duplicados no frontend.

Essa parte está alinhada ao objetivo de adicionar conteúdo sem modificar o loop principal.

### 3.3. Balanceamento de crítico

`CalculateDerivedStats` implementa a curva de DEX com rendimento decrescente e hard cap de 50% (`backend/pkg/game/stats.go`). Há testes para DEX 392 e valores extremos.

### 3.4. Segurança operacional básica

Foram implementados:

- segredo JWT por ambiente com exigência mínima em `production`/`staging`;
- allowlist de CORS/Origin;
- `AdminMiddleware` validando `role == admin`;
- health checks separados em live/readiness;
- JWT com expiração, issuer e audience na emissão.

Esses controles são avanços reais, embora ainda precisem do hardening listado adiante.

### 3.5. Claim offline e lifecycle de sessão

O claim offline utiliza `SERIALIZABLE`, `FOR UPDATE`, `report_key` determinístico e lock de lifecycle por personagem. A desconexão aguarda o ticker parar antes de capturar o snapshot. Esse desenho reduz a principal janela de duplicação online/offline.

### 3.6. Acampamento e recursos

Os snapshots de recursos positivos, capacidade, revisão, descarte transacional, blueprints, pré-requisitos de construção e filas de obra estão mais coesos. As auditorias de acampamento passaram sem referências quebradas.

## 4. Achados prioritários

### P0-01 — Starter pack pode ser resgatado infinitamente

**Evidência:** `backend/pkg/game/engine.go:2117-2180` e ação pública `CHOOSE_STARTER_PACK` em `backend/cmd/server/command_router.go`.

Não existe `starter_pack_claimed`, verificação de personagem recém-criado, idempotency key nem bloqueio depois da primeira seleção. Cada comando:

1. move armas atualmente equipadas para a mochila;
2. gera novas instâncias do starter pack;
3. adiciona também os itens de mochila do pack;
4. permite vender os itens acumulados.

Um cliente modificado pode repetir o comando e criar itens/ouro sem limite.

**Correção:** persistir `starter_pack_claimed_at` ou `starter_pack_key` no personagem; realizar a concessão uma única vez em transação com inventário; rejeitar nova tentativa; adicionar teste de idempotência e teste concorrente.

### P0-02 — Cliente escolhe qualquer slot de equipamento

**Evidência:** `backend/pkg/game/engine.go:1141-1335`.

O servidor localiza o item por ID, mas não compara `GetItemSlotType(&targetItem)` com o `slot` solicitado pelo cliente. Assim, um cliente pode enviar uma espada para `head`, uma mochila para `ring` ou qualquer combinação. Como os atributos de todos os slots são somados, isso permite builds inválidas e exploração de stats.

Há dois efeitos adicionais:

- se `slot` for desconhecido, o item é removido da mochila antes do `switch` e não é colocado em lugar algum (`1263-1322`), causando perda;
- ao equipar munição sem arma principal, o código apenas registra log e continua (`1239-1261`).

**Correção:** resolver o slot exclusivamente pelo item no backend; aceitar do cliente no máximo uma intenção; validar uma matriz de compatibilidade; rejeitar antes de remover o item; tornar a operação inventário + vocação atômica; testar todos os slots inválidos.

### P0-03 — Venda automática não respeita o comportamento configurado

**Evidência:** `backend/pkg/game/autosell.go:94-233`, `backend/pkg/game/engine.go:973-1016`, `backend/pkg/game/offline.go:335-350`.

Problemas confirmados:

- `SellSlotTypes` nunca é consultado;
- `KeepFirstDiscoveredCopy` nunca é consultado;
- `ItemKindQuest` não está na proteção rígida;
- itens são agrupados e protegidos por `Name`, não por `TemplateKey`;
- a “melhor cópia” é escolhida por preço e ataque, ignorando `ItemPower`, defesa, magia e passivos;
- a ordem final da mochila depende da iteração de `map`, que é não determinística em Go;
- o engine só chama a avaliação quando o item novo já não cabe ou a mochila já atingiu o máximo. Um gatilho de 75% não dispara em 75%; a própria interface promete que disparará;
- o item recebido não entra na ocupação projetada usada na avaliação;
- `OfflineEnabled` não é usado no simulador nem no claim offline. Após 50 drops, o offline converte tudo a 50%, independentemente das regras do jogador;
- o frontend exibe opção “Atuar Offline”, embora ela não tenha efeito;
- a UI não oferece filtros por slot, proteção individual por template nem controle de “primeira cópia”, apesar desses campos existirem no contrato.

**Correção:** criar um único `InventoryAcquisitionService` para online/offline. Ele deve receber inventário atual + item entrante + política validada + descobertas e devolver uma mutação determinística. Usar `TemplateKey`, manter ordem estável e aplicar exatamente a mesma política no claim offline.

### P0-04 — Itens protegidos ainda podem ser destruídos/convertidos

**Evidência:** `backend/pkg/game/engine.go:997-1015`.

Se a mochila e o baú de 20 itens estiverem cheios, até item classificado como protegido cai no `else` de conversão emergencial a 50%. Isso contradiz a mensagem da interface: “Seus itens protegidos nunca são destruídos”.

**Correção:** nunca converter silenciosamente item protegido. Alternativas seguras: overflow expansível/paginado, caixa postal persistente, pausar aquisição/expedição ou registrar pendência resgatável. A política precisa ser explícita e coberta por teste.

### P0-05 — Mutações econômicas confirmam sucesso mesmo quando o banco falha

**Evidência:** `backend/pkg/game/engine.go:976-1015`, `1477-1534`, `1684-1769`.

Em vários fluxos o estado em memória é alterado antes da persistência, o erro é ignorado e o cliente recebe sucesso:

- auto-venda ignora erro de `SaveCharAndInvFunc`;
- depois da auto-venda, o item entrante é salvo em outra operação;
- overflow é persistido separadamente do inventário/ouro;
- resgate de overflow salva mochila e baú em duas chamadas independentes;
- `BulkSell` registra o erro, mas mantém o estado mutado e emite sucesso;
- configurações de auto-venda são aplicadas em memória mesmo se o banco rejeitar;
- descoberta é gravada em goroutine fire-and-forget.

Isso pode produzir duplicação, perda ou rollback aparente após reconectar.

**Correção:** uma mutação econômica deve ser uma transação única no banco, com rollback do estado em memória em caso de falha. Para eventos, usar outbox persistente ou snapshot posterior ao commit. Nunca emitir sucesso antes do commit.

## 5. Achados de alta severidade

### P1-01 — Desbloqueio por chefe continua contornável

**Evidência:**

- `EnsureUnlockedRegionsForLevel` adiciona toda região cujo `MinLevel <= level` (`backend/pkg/game/engine.go:1573-1599`);
- `CheckRegionAvailability` aceita a própria região **ou apenas a região pré-requisito** presente em `unlockedRegions` (`backend/pkg/game/expeditions.go:56-89`);
- o frontend usa `isLevelMet || isUnlockedByBoss`, quando deveria usar `&&` para regiões encadeadas (`frontend/src/components/Expedition/ExpeditionSelectionModal.tsx:117-120`).

Na prática, subir de nível já coloca a região alvo em `UnlockedRegions`, neutralizando a derrota do chefe. Os testes atuais codificam a semântica errada, considerando possuir `forest` suficiente para entrar em `orcruins`.

**Correção:** `UnlockedRegions` deve representar regiões efetivamente liberadas. Regiões encadeadas exigem `level >= minLevel && unlockedRegions contém region.ID`. Somente a vitória do boss adiciona a região filha. O frontend apenas apresenta a decisão retornada pelo catálogo/servidor.

### P1-02 — WebSocket V2 não foi adotado de ponta a ponta

**Evidência:** `backend/pkg/game/ws_envelope.go`, `backend/pkg/game/engine.go:1878-1906`, `backend/cmd/server/command_router.go:130-326`, `frontend/src/hooks/useGameSocket.ts:290-301`.

- `WsEnvelope` e `ClientMessageV2` existem, mas o transporte real continua usando `CombatMessage` e `ClientAction` planos;
- handlers de acampamento, recursos, salvage e blueprints escrevem diretamente em `SendChannel`, sem `seq`, `protocol_version`, categoria ou backpressure;
- eventos críticos enviados por `broadcastMessage` ainda são descartados após 300 ms se o buffer continuar cheio, apesar do comentário “NUNCA descartar”;
- vários sends diretos acontecem segurando `Session.Mu` e podem bloquear toda a sessão se o canal lotar;
- o frontend solicita resync em qualquer salto, inclusive quando eventos efêmeros foram descartados intencionalmente, criando risco de tempestade de `REQUEST_STATE_SYNC`;
- mensagens diretas deixam campos `bool/int` no zero. Como `is_active` não é opcional e o frontend sempre executa `setIsExpeditionActive(msg.is_active)`, uma resposta de construção/salvage pode marcar a expedição como inativa e zerar campos visuais até o próximo tick;
- o loop WebSocket grava `UpdateCharacterState` para toda mensagem que contém personagem, podendo gerar escrita no banco a cada 750 ms por sessão.

**Correção:** escolher um contrato único. Todo evento deve passar por um dispatcher/outbox; críticos não podem depender de buffer volátil; state snapshots podem coalescer; efêmeros devem usar uma sequência separada ou não participar da detecção de gap. Campos parciais precisam ser ponteiros/`omitempty` ou payloads tipados por evento.

### P1-03 — `TemplateKey` ainda é o nome visível do item

**Evidência:** `backend/pkg/game/item_registry.go:15-22`, `backend/pkg/game/loot.go:110+`, `backend/pkg/game/loot.go:385-393`.

Os 92 templates não declaram `Key`. O registry cria a chave fazendo lowercase do `Name`. Compêndio, auto-venda, backfill e proteção continuam indexando `item.Name`. Renomear “Espada do Aprendiz” quebra descoberta, proteção e agrupamento, exatamente o acoplamento que a refatoração pretendia eliminar.

Além disso, duplicatas de key no registry Go são sobrescritas silenciosamente.

**Correção:** tornar `Key` obrigatório e imutável (`apprentice_sword` etc.), migrar saves/descobertas com aliases legados e impedir startup quando houver key duplicada. Perfis de loot e `DropsPreview` também devem referenciar chaves, com nome resolvido só na borda de apresentação.

### P1-04 — Compêndio não atualiza em tempo real de forma confiável

**Evidência:** `backend/pkg/game/engine.go:955-966`, `backend/internal/db/db.go:802-855`, `frontend/src/hooks/useGameSocket.ts:322-324`.

- a sessão atualiza o mapa local por nome e inicia uma goroutine de banco cujo erro é descartado;
- não existe evento dedicado `LOOT_DISCOVERED`/`DISCOVERY_EVENT` com a chave descoberta;
- `discovered_loot` só é enviado no welcome ou em state snapshot;
- portanto, o card do compêndio pode permanecer oculto até resync/reconexão;
- `RecordLootDiscovery` incrementa `times_found`, mas nunca atualiza `highest_rarity`;
- o backfill usa `Name`, não `TemplateKey`;
- contagens globais/tier no frontend não deduplicam um mesmo drop listado em várias regiões.

**Correção:** incluir a descoberta na mesma transação da aquisição, emitir delta após commit, atualizar maior raridade por ranking canônico e calcular o catálogo por chaves únicas.

### P1-05 — State machine e progressão compartilhada são fachadas não integradas

**Evidência:** `backend/pkg/game/expedition_state_machine.go`, `backend/pkg/game/reward_calculator.go` e ausência de consumidores no engine.

`CanTransition` é usado apenas em teste. O `GameSession` continua com a combinação de flags `IsExpeditionActive`, `RecoveringFromDefeat`, `AutoResumePending`, `IsBossStage`, `CurrentStage` e slices, sem campo `ExpeditionState` nem transições validadas.

`ApplyExperienceGain` também é usado apenas em teste. O engine e o claim offline mantêm loops próprios. Há divergência objetiva:

- `ApplyExperienceGain` subtrai o XP necessário após cada nível;
- engine online, simulador e claim apenas incrementam o nível sem subtrair XP (`engine.go:1100-1106`, `offline.go:355-358`, `db.go:678+`).

Isso torna o comportamento real diferente do calculador considerado “canônico” e dos comentários de paridade.

**Correção:** integrar state machine e `ApplyExperienceGain` no fluxo real ou removê-los até o corte correto. Criar testes de paridade que executem casos de uso online/offline, não apenas funções isoladas.

### P1-06 — Risco de bloqueio e snapshot inconsistente no salvage

**Evidência:** `backend/internal/db/camp.go:250-267` e `365-381`.

As funções de salvage abrem transação, fazem `SELECT ... FOR UPDATE` em `character_camps` e, ainda dentro dela, chamam `GetCharacterCamp` usando o `DB` global. Essa função abre consultas fora da transação e executa `EnsureCharacterCamp` com `INSERT ... ON CONFLICT` na mesma entidade.

O desenho quebra o snapshot serializável e pode bloquear esperando o próprio lock, dependendo do plano/conflito do PostgreSQL. Não há timeout de contexto para encerrar a operação.

**Correção:** criar `GetCharacterCampTx(tx, charID, forUpdate)` e manter todas as leituras/escritas do caso de uso na mesma conexão/transação. Propagar `context.Context` com deadline.

### P1-07 — Migrações não são a fonte única do schema

**Evidência:** `backend/internal/db/db.go:105-235`.

Mesmo com arquivos `backend/migrations/000003...` e `000004...`, `InitDB` continua executando dezenas de `ALTER/CREATE/DROP`, todos com `_, _ = DB.Exec`. Qualquer falha é descartada e o servidor pode iniciar com schema parcial.

O `Ping` apenas registra aviso e `InitDB` retorna sucesso; logo o fail-fast de `main.go` não funciona como descrito. Em seguida, `LoadCache` usa `log.Fatalf`, misturando políticas.

Também permanecem `base_items`, `base_monsters`, cache e bootstrap legados concorrendo com os registries Go, apesar de o caminho atual de combate usar o catálogo canônico.

**Correção:** usar um runner versionado de migrations como única fonte; retornar erro de `Ping`/migration; remover DDL de `InitDB`; retirar o conteúdo DB legado depois de comprovar ausência de consumidores.

### P1-08 — Configurações de auto-venda não são validadas nem versionadas corretamente

**Evidência:** `backend/pkg/game/engine.go:1684-1712` e `backend/internal/db/db.go:888-916`.

O servidor aceita o struct enviado pelo cliente sem validar faixas, raridades, slots ou template keys. Aplica em memória antes do banco e ignora erro. O banco incrementa sua revisão, mas a sessão continua com a revisão antiga; `ExpectedRevision` não é usado.

**Correção:** DTO de comando separado; `ValidateAutoSellSettings`; allowlists; limite de itens protegidos; `UPDATE ... WHERE revision = expected RETURNING revision`; só atualizar sessão após commit; retornar conflito 409/evento equivalente.

### P1-09 — Overflow não é transacional nem concorrente-safe

**Evidência:** `backend/pkg/game/engine.go:1715-1769`, `backend/internal/db/db.go:919+`.

O baú inteiro é um array JSON. Resgate altera mochila e baú em operações separadas. `AddOverflowChestItem` faz read-modify-write sem lock/revisão. Duas mutações podem perder itens ou exceder a capacidade. `max_slots` existe na tabela, mas o engine usa `20` hardcoded.

**Correção:** modelar itens do overflow em linhas com `item_instance_id`, posição/status e constraint de unicidade; mover item entre overflow e inventário na mesma transação; usar revisão/lock e capacidade lida do estado autoritativo.

## 6. Segurança e operação

### P1-10 — JWT e autenticação ainda precisam de hardening

**Evidência:** `backend/cmd/server/main.go:301-365`, `backend/cmd/server/ws.go:162-177`.

- o parser aceita qualquer algoritmo HMAC, não apenas HS256;
- `Issuer` e `Audience` são emitidos, mas não validados contra valores esperados;
- JWT do WebSocket vai na query string, que costuma aparecer em access logs/proxies;
- não há rate limit em login/cadastro;
- não há tamanho máximo de body, email, senha, nome, arrays de IDs ou listas protegidas;
- email não é normalizado;
- criação aceita vocação/origem arbitrárias;
- `generateJWT` tem erro ignorado no cadastro;
- o servidor usa `http.ListenAndServe` sem timeouts explícitos, graceful shutdown ou limites de cabeçalho.

**Correção:** `jwt.WithValidMethods(["HS256"])`, `WithIssuer`, `WithAudience`; ticket curto e one-time para WebSocket; rate limit; `http.MaxBytesReader`; validação de DTOs; `http.Server` com timeouts e shutdown.

### P2-01 — Allowlist de Origin pode ser configurada de forma insegura

`IsOriginAllowed` usa prefixo textual para entradas terminadas em `*` (`backend/internal/config/config.go:65-80`). Uma configuração como `https://trusted.example*` também aceita `https://trusted.example.evil`. Origin vazia é aceita em `staging`.

Usar parsing de URL, esquema/host/porta exatos e wildcard apenas em subdomínio com fronteira de ponto. Produção e staging devem falhar fechados.

### P2-02 — Telemetria ainda é fictícia

`HandleAdminTelemetry` retorna RAM, uptime, DB e Redis hardcoded (`backend/cmd/server/main.go:286-298`). Isso pode mascarar incidentes. Remover campos não medidos ou coletar métricas reais; não declarar Redis conectado se o projeto nem o verifica.

## 7. Manutenção e modularidade

### P2-03 — Monólitos centrais não foram reduzidos

Comparação com o snapshot anterior:

| Arquivo | Antes | Depois | Resultado |
|---|---:|---:|---|
| `engine.go` | 1.963 | 2.182 | ❌ Cresceu 219 linhas |
| `db.go` | 694 | 965 | ❌ Cresceu 271 linhas |
| `ws.go` | 610 | 434 | ✅ Roteamento extraído |
| `command_router.go` | 0 | 353 | ⚠️ Transporte separado, mas ainda chama domínio/DB diretamente |
| `useGameSocket.ts` | 549 | 667 | ❌ Cresceu 118 linhas |
| `TibiaBackpackModal.tsx` | 799 | 793 | ⚠️ Quase inalterado |
| `BiomeRenderers.ts` | 1.261 | 14 | ✅ Decomposição efetiva |

O refactor modular funcionou no rendering de biomas e parcialmente no WebSocket, mas não no motor, persistência, socket hook ou inventário. Novas features continuam ampliando os mesmos arquivos.

**Próximo corte recomendado:** `CombatService`, `InventoryService`, `ProgressionService`, `LootAcquisitionService`, `AutoSellPolicy`, `ExpeditionService`, repositories transacionais e reducers/event handlers no frontend.

### P2-04 — Registry e auditoria de conteúdo não validam tudo o que afirmam

`ValidateIntegrity` não detecta, entre outros:

- keys duplicadas de itens/monstros antes de o map sobrescrevê-las;
- ciclos de unlock com duas ou mais regiões;
- `Order` duplicado — atualmente `planalto` e `rogartes` usam ordem 6;
- boss sem loot/resource profile completo;
- `VisualKey` inexistente no registry do frontend;
- níveis/tier/requisitos inválidos de template;
- catálogo completo do compêndio versus apenas `DropsPreview`.

Os scripts Node compensam parte disso por regex, mas parsing de Go por regex é frágil. Preferir um manifesto serializável gerado pelo backend ou testes Go sobre o registry final, mais um teste de contrato frontend.

### P2-05 — Persistência global e erros descartados permanecem disseminados

`var DB *sql.DB`, callbacks de persistência dentro de `GameSession`, `context.Background()` sem timeout, `json.Marshal/Unmarshal` ignorados e dezenas de `_ = Save...` dificultam testes e falhas previsíveis. `CreateCharacter` cria personagem e inventário sem transação e ignora o insert do inventário (`backend/internal/db/db.go:275-310`).

Introduzir repositories injetáveis por caso de uso, contextos, erros tipados e transações coordenadas.

### P2-06 — Documentação declara garantias que o código não entrega

O changelog afirma:

- validação estrita de HS256;
- zero loss para eventos econômicos;
- state machine eliminando flags inconsistentes;
- fórmulas de level-up 100% unificadas;
- keys imutáveis sem inferência por nome;
- auto-venda integrada online/offline;
- itens protegidos nunca destruídos;
- `go test -race ./...` aprovado.

O código contradiz cada uma dessas afirmações, e outro documento reconhece que Go não pôde ser executado. Isso reduz a confiabilidade da entrega e pode induzir merge/deploy indevido.

**Correção:** changelog deve relatar apenas verificações realmente executadas. Manter checklist com evidência de comando/CI e status “parcial” para integrações ainda pendentes.

## 8. Plano cirúrgico de correção

### Gate 0 — Bloquear exploração e perda de dados

1. Tornar starter pack one-shot e transacional.
2. Validar slot real do item no backend; rejeitar slot desconhecido e munição sem arma adequada.
3. Desabilitar temporariamente `OfflineEnabled` na UI ou implementar a política offline real.
4. Impedir conversão de qualquer item protegido.
5. Fazer auto-venda, aquisição e overflow uma transação única.
6. Só alterar memória/emitir sucesso após commit.

### Gate 1 — Corrigir progressão e identidade

1. Corrigir semântica de `UnlockedRegions` e operador do frontend.
2. Migrar itens/descobertas/proteções para `TemplateKey` explícito.
3. Integrar `ApplyExperienceGain` em online e offline.
4. Integrar a state machine ou remover a alegação até a migração real.
5. Emitir `DISCOVERY_EVENT` após commit.

### Gate 2 — Confiabilidade de transporte e banco

1. Unificar todos os sends no dispatcher WebSocket.
2. Separar eventos críticos persistentes de estado/efeitos efêmeros.
3. Remover gravação de personagem por frame; persistir somente em mutações/checkpoints.
4. Implementar `GetCharacterCampTx` e contextos com timeout.
5. Adotar migrations versionadas e remover DDL dinâmico.
6. Criar ledger/outbox/idempotency para economia e comandos críticos.

### Gate 3 — Manutenção e qualidade

1. Separar `engine.go`, `db.go` e `useGameSocket.ts` por domínio.
2. Adicionar validação runtime do contrato WebSocket no frontend.
3. Criar testes PostgreSQL com containers para starter, equip, auto-sell, overflow, salvage, construção e claim offline.
4. Adicionar CI com `gofmt`, `go vet`, `go test`, `go test -race`, auditorias, `tsc`, build e testes frontend.
5. Corrigir documentação e retirar declarações não verificadas.

## 9. Critérios mínimos antes do deploy

- [ ] starter pack não pode ser obtido duas vezes, inclusive com requests concorrentes;
- [ ] nenhum item equipa em slot incompatível ou desaparece com slot inválido;
- [ ] auto-venda dispara no percentual configurado e produz o mesmo resultado online/offline;
- [ ] item protegido nunca é convertido sem consentimento;
- [ ] falha de banco não altera memória nem retorna sucesso;
- [ ] progressão exige nível **e** vitória do boss quando configurado;
- [ ] compêndio atualiza imediatamente e persiste por `TemplateKey`;
- [ ] overflow/inventário/ouro são atualizados numa única transação;
- [ ] todos os eventos econômicos possuem entrega recuperável/snapshot pós-commit;
- [ ] `go test ./...`, `go test -race ./...`, auditorias e build frontend passam em CI;
- [ ] migrations são aplicadas em banco vazio e em cópia anonimizada de banco legado;
- [ ] documentação reflete exatamente o que foi validado.

## 10. Conclusão

A entrega tem uma **boa fundação visual e declarativa**, e a correção dos níveis de monstros parece sólida. Porém, a refatoração arquitetural central ainda está pela metade: novos tipos e arquivos foram adicionados, mas vários fluxos antigos continuam sendo o caminho real.

O maior risco não é estilo de código; é integridade econômica. Hoje um cliente modificado consegue abusar de starter packs e slots, enquanto falhas de persistência podem perder ou duplicar itens. Corrigidos os Gates 0 e 1, o projeto passa a ter uma base muito mais segura para continuar modularizando sem quebrar o jogo.