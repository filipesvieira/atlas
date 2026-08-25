# Relatório de Implementação — Tauri, Layout Isométrico Livre e Identidade Visual V1

Data: 2026-08-20

## Objetivo desta rodada

Esta entrega inicia a migração do Atlas de uma tela de acampamento com cinco posições rígidas para um assentamento espacialmente personalizável. O princípio adotado é que cada jogador deve poder construir uma vila visualmente diferente, sem transferir autoridade econômica ou de colisão para o cliente.

Também foi iniciada a revisão da identidade visual de recursos/equipamentos e o hardening necessário para o frontend deixar de ser um site servido no mesmo host e passar a ser um cliente Tauri conectado a um backend remoto.

## Layout isométrico livre

- Grid autoritativo: 16x12 tiles.
- Construções persistem `tile_x`, `tile_y` e `rotation`.
- Os cinco prédios existentes são migrados para coordenadas equivalentes; seus níveis, timers, blueprints e custos não são alterados.
- `slot_key` permanece no schema para retrocompatibilidade, mas o fluxo novo não o interpreta como coordenada física.
- Projetos descobertos existem no terreno no nível 0. O jogador pode movê-los antes de iniciar a primeira construção.
- Construções prontas também podem ser movidas.
- Construções em obra ficam bloqueadas para movimentação até a conclusão.
- Novos tipos de prédio podem ganhar uma instância estável sem criar novos pontos cardeais hardcoded.
- Ao aprender um blueprint futuro que ainda não possua instância, o servidor encontra a primeira área livre e cria a fundação. O jogador então escolhe o local definitivo por drag-and-drop antes da obra.

### Drag-and-drop

O cliente executa apenas a prévia. Ao soltar a construção envia `MOVE_CAMP_BUILDING` com posição, rotação persistida e revisão esperada do acampamento. O backend valida:

1. conta/personagem;
2. existência e descoberta da construção;
3. ausência de obra em andamento;
4. `state_revision` para impedir sobrescrita de layout concorrente;
5. limites do terreno;
6. footprint;
7. colisão com outras construções descobertas/construídas.

Somente após o commit o cliente recebe `CAMP_LAYOUT_UPDATED`.

A rotação já é persistida no modelo, mas o controle visual de girar ficou deliberadamente fora desta primeira UI: os sprites atuais ainda não possuem quatro faces isométricas reais. Expor uma rotação 2D simples criaria uma representação incorreta.

## Renderização do assentamento

A cena de acampamento agora possui projeção isométrica por tile e as posições dos prédios vêm do save. Rotas dos moradores foram convertidas para o mesmo sistema de coordenadas, eliminando trajetórias que ultrapassavam a arena anterior.

Esta é uma primeira camada isométrica. O próximo refinamento visual deve unificar prédios, moradores, vegetação e props em uma única fila de depth sorting para oclusão perfeita.

## Identidade visual de equipamentos

O renderer de equipamento tinha quatro flags de raridade fixadas em `false`; isso foi corrigido. Além disso, o título agora é normalizado para identificar materiais e temas.

Materiais diferenciados nesta rodada:

- madeira;
- couro;
- tecido/linho;
- osso;
- pedra;
- cobre;
- bronze;
- prata;
- ferro;
- ouro/celestial;
- gelo/cristal;
- fogo;
- sombra;
- arcano;
- veneno/esmeralda.

O Broquel de Madeira recebeu uma silhueta própria: escudo redondo, tábuas verticais, aro escuro e umbo metálico. A raridade adiciona acabamento, mas não transforma o material base em metal.

## Identidade visual de recursos

Foi criado `PixelResourceRegistry.tsx`, separado do renderer de equipamento. Ele resolve visual por `resource_key` e título e possui famílias específicas para recursos de coleta, processados, troféus e partes de monstros.

O renderer já é usado em:

- barra de recursos;
- depósito;
- descarte;
- custos de construção;
- ingredientes de crafting;
- materiais de desmontagem.

## Tauri / cliente desktop

- O cliente empacotado não usa mais `window.location.hostname` para decidir onde está o backend.
- Builds de produção devem fornecer `VITE_API_BASE_URL` e `VITE_WS_BASE_URL`.
- O workflow recebe essas URLs por GitHub Actions Variables.
- O cliente exibe um erro explícito de configuração se um executável Tauri for gerado sem endpoint.
- Google Fonts e Tailwind CDN foram removidos do HTML; Tailwind continua pelo pipeline local já presente no projeto.
- CSP deixa de ser `null`.
- A allowlist de desenvolvimento aceita as origens Tauri locais, mantendo validação exata.

## Segurança de estado

Foi corrigido o cenário em que uma falha de leitura do Baú de Achados produzia `[]` em memória e essa lista vazia podia ser salva no logout. O servidor agora falha fechado e não cria a sessão se o estado persistente crítico do baú não puder ser lido.

## Validação executada

Passaram nesta rodada:

- `node tools/audit-content.mjs` — 0 erros;
- `node tools/audit-camp-content.mjs` — 0 erros;
- `node tools/audit-economy.mjs` — 0 erros;
- `go test ./pkg/game` — passou, incluindo testes novos de colisão, limites, fundações descobertas e ids de instância;
- transpile sintático dos arquivos TypeScript/TSX alterados — 0 erros de sintaxe;
- `git diff --check` — passou;
- `tauri.conf.json` — JSON válido.

## Limitações de validação do ambiente recebido

O pacote não contém `go.sum`, `frontend/package-lock.json` nem `frontend/src-tauri/Cargo.lock`. O ambiente desta execução também não possui acesso de rede para baixar módulos que faltam, e Rust não está instalado. Por isso não foi possível homologar `go test ./...`, `npm run build` e `tauri build` completos nesta máquina.

O workflow foi ajustado para não depender de um `package-lock.json` inexistente. Em uma máquina/CI com rede, a próxima ação recomendada é gerar e versionar os três lockfiles após um build limpo.

## Próxima rodada recomendada

1. introduzir a Cozinha de Campanha como primeira construção criada já no modelo livre;
2. adicionar profissão Cozinheiro, receitas de peixe/carne/farinha/ervas e buffs persistentes por tempo real;
3. unificar depth sorting de moradores e prédios;
4. produzir variantes direcionais/rotacionais dos prédios;
5. adicionar expansão desbloqueável do terreno conforme estágio do assentamento;
6. configurar updater e handshake `client_version/protocol_version/min_supported_client` antes da distribuição pública.