# Sistema de Terreno, Colisão e Identidade das Arenas

## Objetivo

As expedições do **Reino do Avesso** não devem ser apenas fundos diferentes para
o mesmo combate. Cada fase poderá ter uma geografia própria, objetos sólidos e
terrenos que alteram movimentação, decisões de combate e rotas de fuga.

Esta base existe para sustentar:

- árvores, casas, pedras, placas e construções sólidas;
- água que reduz velocidade;
- lama com penalidade de deslocamento mais forte;
- fogo, veneno e outros terrenos de dano/status;
- obstáculos exclusivos de uma região;
- caminhos preferenciais para IA e navegação;
- teletransportes, portais e conexões entre áreas;
- arenas maiores e com mais monstros sem degradar a consulta de colisão.

## Autoridade e responsabilidades

O backend é a autoridade sobre posição e terreno. O frontend desenha, ordena
por profundidade e interpola a caminhada, mas não decide se um tile pode ser
ocupado.

```text
Definição legível da região
        ↓ startup
Grade de flags compilada e validada
        ↓ compartilhada
Movimento / spawn / fuga / pathfinding
        ↓ snapshot
Frontend interpola e renderiza profundidade
```

Essa separação evita divergência entre controle manual, IA, simulação offline e
clientes modificados.

## Formato de criação e formato de execução

O mapa continua sendo criado com retângulos legíveis, por exemplo uma cabana
`5x4` ou uma fogueira `2x2`. No startup, esses retângulos são compilados em um
vetor plano:

```go
cell := grid.cells[y*grid.Width+x]
```

O formato de autoria permanece fácil de revisar; a execução consulta a célula
diretamente em `O(1)`. A grade é imutável e compartilhada entre todas as sessões
da região, portanto não existe uma cópia por jogador.

Antes dessa mudança, cada consulta percorria linearmente todos os obstáculos.
Durante um pathfinding, esse custo era repetido para cada vizinho visitado. Com
a grade, o custo não cresce quando a fase passa de 10 para 500 objetos.

## Flags de terreno

As flags são combináveis no mesmo tile:

| Flag | Intenção | Estado atual |
|---|---|---|
| `ArenaTileSolid` | Impede ocupação | Ativo |
| `ArenaTileWater` | Reduz velocidade ou exige regra própria | Contrato preparado |
| `ArenaTileMud` | Penalidade maior de deslocamento | Contrato preparado |
| `ArenaTileFire` | Dano periódico/queimadura | Contrato preparado |
| `ArenaTilePoison` | Dano ou status de veneno | Contrato preparado |
| `ArenaTilePreferredPath` | Menor custo para pathfinding | Contrato preparado |
| `ArenaTilePortal` | Transição/teleporte controlado | Contrato preparado |

Somente `Solid` altera a jogabilidade nesta entrega. As demais flags não devem
ser anunciadas ao jogador até que seus efeitos, feedback visual e testes sejam
implementados.

## Dimensões regionais

Cada definição de terreno possui `Width` e `Height`. Floresta e Shereque ainda
usam `24x18`; regiões sem definição própria recebem uma grade livre `24x18`
como fallback retrocompatível.

Movimento manual, perseguição, fuga, separação, spawn, busca de caminho e
snapshot já consultam as dimensões regionais. Para publicar uma arena realmente
maior, o renderer correspondente também deve declarar a mesma geometria e a
câmera deve enquadrá-la corretamente.

## Colisão física e profundidade visual

Colisão e profundidade resolvem problemas diferentes:

- o footprint físico representa tronco, base, parede ou volume ocupado;
- a profundidade usa o ponto de contato com o chão para decidir quem aparece na
  frente;
- copas e telhados podem cobrir um ator que esteja atrás sem tornar todos os
  pixels do sprite sólidos;
- o cliente não deve deduzir colisão pelo tamanho da imagem.

Ao cadastrar um objeto alto, é obrigatório registrar tanto o footprint no
backend quanto sua entrada de profundidade no renderer da região.

## Diretrizes de level design

- Agrupamentos de 2–3 árvores criam corredores naturais mais legíveis que uma
  distribuição totalmente aleatória.
- Rotas principais devem manter pelo menos dois tiles úteis quando houver
  vários monstros, reduzindo congestionamento e becos sem saída.
- Toda arena precisa preservar posições válidas de spawn e ao menos uma rota
  de aproximação/fuga para cada canto utilizado.
- Água e lama devem criar decisões, não apenas alongar artificialmente a luta.
- Fogo e veneno precisam de telegraph pixelado, feedback de dano e regra clara
  para IA antes de serem ativados.
- Caminhos preferenciais devem reduzir custo de navegação, não obrigar o ator a
  ignorar ameaças próximas.
- Portais devem ser autoritativos, ter destino explícito e impedir loops de
  teleporte no mesmo tick.

## Extensão planejada do pathfinding

O próximo estágio pode substituir “livre/bloqueado” por custo de travessia:

```text
grama = 10
caminho preferencial = 7
água = 16
lama = 22
fogo/veneno = custo alto conforme resistência e estado
sólido = não atravessável
```

Assim monstros e heróis podem escolher entre um trajeto curto e perigoso ou um
caminho mais longo e seguro. O efeito de velocidade e dano continua sendo
calculado separadamente pelo engine autoritativo.

## Arquivos canônicos

- `backend/pkg/game/arena_terrain.go`: flags, definições, compilação e grade.
- `backend/pkg/game/arena_collision.go`: ocupação, pathfinding e normalização.
- `backend/pkg/game/arena.go`: movimento, dimensões e snapshot.
- `backend/pkg/game/arena_terrain_test.go`: contrato da grade e mapas atuais.
- `frontend/src/game/IsoWorldGeometry.ts`: projeção visual da malha.
- `frontend/src/game/registries/BiomeRegistry.ts`: geometria e renderers por bioma.
- `frontend/src/components/Viewport/GameViewport.ts`: interpolação e profundidade.

## Checklist para uma nova fase

1. Declarar largura, altura e tiles/retângulos no backend.
2. Garantir que nenhum retângulo ultrapasse os limites; o startup falha se a
   definição for inválida.
3. Criar o renderer com a mesma geometria.
4. Registrar objetos altos na fila de profundidade.
5. Validar spawn, perseguição, kite, fuga e controle manual.
6. Testar corredores com a maior quantidade esperada de monstros.
7. Ativar flags especiais apenas junto de seus efeitos e feedback visual.