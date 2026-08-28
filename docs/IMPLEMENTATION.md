> **Status (2026-08-27):** blueprint histórico de implementação. Não é um
> retrato fiel do runtime atual: o renderer efetivo é Canvas 2D e o catálogo,
> migrations e registries atuais estão em [`DOCUMENTATION_STATUS.md`](DOCUMENTATION_STATUS.md).

Compreendido perfeitamente! Para que o **Google Antigravity** tenha acesso a todo o contexto do jogo em um **único documento mestre**, consolidei a especificação completa de Game Design do seu arquivo (`PROJECT_ATLAS_FULL_DESIGN.md`) com a **nova arquitetura tecnológica autoral** (Go + PostgreSQL + Redis + React 19 + PixiJS v8 + `@dnd-kit`).

As referências antigas de OpenTibia/Canary na arquitetura técnica (Seções 24 e 30) foram **atualizadas** para refletir a nova stack leve, autoral e otimizada para o servidor de 2 GB de RAM.

Você pode copiar o documento mestre abaixo na íntegra e colá-lo diretamente no Antigravity:

---

```markdown
# MASTER IMPLEMENTATION BLUEPRINT: PROJECT ATLAS (STANDALONE IDLE MMORPG)

> Este documento consolida todas as diretrizes de Game Design, Regras do Jogo, Arquitetura Técnica em Go/React/PixiJS e Códigos de Referência para o Google Antigravity.

---

## 📌 00. DIRETRIZES E REGRAS INVIOLÁVEIS PARA O AGENTE (ANTIGRAVITY)

Ao atuar no desenvolvimento deste projeto, você deve obedecer estritamente aos seguintes princípios operacionais:

1. **Princípio da Não-Exclusão:** Sob nenhuma circunstância remova funções, variáveis, tipos, comentários ou blocos de lógica existentes no repositório, a menos que seja explicitamente solicitado via prompt com as palavras "deletar", "remover" ou "substituir X por Y".
2. **Edição Incremental:** Ao sugerir ou implementar novas funcionalidades, forneça apenas os trechos alterados ou novos arquivos. Se gerar o arquivo completo, garanta que todas as linhas originais não modificadas permaneçam 100% idênticas.
3. **Preservação de Blocos de Código:** Se encontrar comentários como `// Manter` ou `// ... código existente ...`, nunca toque naquelas seções.
4. **Conservadorismo Técnico:** Priorize a estabilidade da aplicação. Antes de fazer alterações profundas na estrutura do banco ou contratos de API, analise as dependências afetadas.
5. **Independência de Software (100% Autoral):** Este projeto **NÃO UTILIZA** nenhuma biblioteca ou ecossistema do OpenTibia / Canary / C++ / Lua.
6. **Stack Local Estrita:**
   - **Backend:** Go 1.22+ (REST API, WebSockets, Engine Offline)
   - **Banco de Dados:** PostgreSQL 16 (Persistência) + Redis 7 (Cache de Sessão/Ticks)
   - **Frontend UI:** React 19 + Tailwind CSS + `@dnd-kit` (Dashboard Drag and Drop)
   - **Canvas Gráfico:** PixiJS v8 (Renderizador WebGL 2D para Sprites 32x32)

---

## 📊 01. ORÇAMENTO DE MEMÓRIA & INFRAESTRUTURA (VPS 2 GB RAM)

A infraestrutura foi projetada para rodar com altíssima eficiência em um servidor modesto:

| Componente | Consumo Estável de RAM | Função no Sistema |
| :--- | :--- | :--- |
| **Linux OS + Docker Engine** | ~250 MB | Sistema operacional e gerenciador de containers. |
| **PostgreSQL 16** *(Tuned)* | ~300 MB | Banco de dados relacional principal. |
| **Redis 7** | ~50 MB | Armazenamento de tokens JWT e filas de execução. |
| **Go Backend (Binary)** | **~25 MB** | API REST, Servidor WebSocket e cálculo offline em Go. |
| **Buffer de Segurança** | ~1.375 MB | Margem para picos de uso de CPU e cache do SO. |

---

## 📄 02. VISÃO DO PROJETO & PILARES DE GAME DESIGN

### Visão Geral
* **Propósito:** Redefinir o gênero Idle RPG combinando a profundidade de MMORPGs tradicionais com a acessibilidade da jogabilidade assíncrona.
* **Core Fantasy:** Criar a história de vida de um aventureiro lendário. Estatísticas existem apenas para dar suporte às histórias.
* **Ciclo Emocional:** Curiosidade → Observação → Decisão → Aventura → Descoberta → Progresso → Antecipação.

### Pilares Fundamentais
1. **Aventura Antes da Eficiência:** Foco na experiência e na narrativa gerada, não apenas na otimização estrita de números.
2. **Decisões Criam Progresso:** Boa preparação deve superar a sorte aleatória.
3. **Exploração É Progressão:** Desbloqueio de regiões, ruínas e segredos é tão valioso quanto ganhar níveis.
4. **Preparação Vence Batalhas:** As escolhas mais importantes acontecem antes do combate começar.
5. **Respeito ao Tempo do Jogador:** Progressão offline contínua e determinística. Sem obrigatoriedade de logins diários punitivos.
6. **Toda Build É Válida:** Diversidade horizontal onde diferentes combinações se destacam em cenários distintos.
7. **O Mundo É Vivo:** Reinos mudam, facções competem e o ambiente evolui independentemente do jogador.

---

## 🔄 03. GAME LOOP & SISTEMA DE PERSONAGEM

### Macro Loop de Jogabilidade
```text
Observe (Analisar retorno e relatórios)
   ↓
Plan (Decidir próximo objetivo/região)
   ↓
Prepare (Equipamentos, suprimentos, postura)
   ↓
Expedition (Envio do aventureiro em tempo real/offline)
   ↓
Resolve (Processamento determinístico de resultados)
   ↓
Progress (Experiência, loot, conhecimento, reputação)
   ↓
Repeat

```

### O Aventureiro e Classes Emergentes

* **Relação Guia/Heroi:** O jogador é o estrategista/mentor. O aventureiro executa as ações de forma autônoma.
* **Sem Classes Fixas:** O personagem não escolhe uma classe inicial engessada. A identidade emerge do uso de armas, escolas de magia (Fogo, Gelo, Morte, Natureza, etc.), profissões e pontos de maestria.
* **Origens Iniciais:** Wanderer, Apprentice, Hunter, Squire, Acolyte.

---

## 🗄️ 04. ESQUEMA DE BANCO DE DADOS (POSTGRESQL 16)

```sql
-- Extensão para geração de UUIDs nativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Contas de Usuários
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'tutor', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Personagens
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(50) UNIQUE NOT NULL,
    vocation VARCHAR(20) NOT NULL CHECK (vocation IN ('knight', 'paladin', 'sorcerer', 'druid')),
    level INT DEFAULT 1,
    experience BIGINT DEFAULT 0,
    health INT DEFAULT 150,
    max_health INT DEFAULT 150,
    mana INT DEFAULT 50,
    max_mana INT DEFAULT 50,
    gold_bank BIGINT DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_logout TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventário e Equipamentos (JSONB para suportar atributos procedurais flexíveis)
CREATE TABLE character_inventories (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    equipment JSONB DEFAULT '{"head": null, "chest": null, "legs": null, "boots": null, "mainhand": null, "offhand": null}'::jsonb,
    backpack JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Histórico e Relatórios de Expedições Offline
CREATE TABLE expedition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    minutes_offline INT NOT NULL,
    xp_gained BIGINT NOT NULL,
    gold_gained BIGINT NOT NULL,
    items_found JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

---

## 💻 05. BACKEND EM GO & SIMULAÇÃO OFFLINE

### 5.1 Servidor HTTP/REST (`main.go`)

```go
package main

import (
	"log"
	"net/http"
	"time"

	"[github.com/go-chi/chi/v5](https://github.com/go-chi/chi/v5)"
	"[github.com/go-chi/chi/v5/middleware](https://github.com/go-chi/chi/v5/middleware)"
)

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// Autenticação
	r.Post("/api/v1/auth/register", HandleRegister)
	r.Post("/api/v1/auth/login", HandleLogin)

	// Rotas Protegidas do Jogador
	r.Group(func(r chi.Router) {
		r.Use(AuthMiddleware)
		r.Get("/api/v1/characters", HandleGetCharacters)
		r.Post("/api/v1/expedition/start", HandleStartExpedition)
		r.Post("/api/v1/expedition/claim", HandleClaimOfflineProgress)
		
		// Painel de Administração
		r.Get("/api/v1/admin/telemetry", AdminMiddleware(HandleAdminTelemetry))
	})

	log.Println("Project Atlas Backend em Go ativo na porta :8080 [Consumo ~20MB RAM]")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("Erro no servidor: %v", err)
	}
}

func HandleRegister(w http.ResponseWriter, r *http.Request) {}
func HandleLogin(w http.ResponseWriter, r *http.Request) {}
func HandleGetCharacters(w http.ResponseWriter, r *http.Request) {}
func HandleStartExpedition(w http.ResponseWriter, r *http.Request) {}
func HandleClaimOfflineProgress(w http.ResponseWriter, r *http.Request) {}
func HandleAdminTelemetry(w http.ResponseWriter, r *http.Request) {}
func AuthMiddleware(next http.Handler) http.Handler { return next }
func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc { return next }

```

### 5.2 Gerador de Loot Procedural (`pkg/game/loot.go`)

```go
package game

import (
	"fmt"
	"math/rand"
	"time"
)

type Item struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Attack        int    `json:"attack"`
	Defense       int    `json:"defense"`
	Rarity        string `json:"rarity"`
	SpecialEffect string `json:"special_effect"`
}

var prefixes = []struct {
	Name string; Mod float64; Effect string
}{
	{"Amaldiçoado", 1.4, "Perde 1% HP/s"},
	{"Incandescente", 1.2, "Dano de Fogo +15%"},
	{"Vampírico", 0.95, "Roubo de Vida +5%"},
	{"Divino", 1.3, "Cura 2% ao atingir"},
	{"Instável", 1.5, "Dano oscila entre 50% e 200%"},
}

var baseItems = []struct {
	Name string; Atk int; Def int
}{
	{"Espada de Aço", 18, 6},
	{"Machado de Guerra", 24, 2},
	{"Arco Longo", 20, 0},
	{"Cajado Rúnico", 10, 14},
}

func GenerateProceduralLoot() Item {
	rand.Seed(time.Now().UnixNano())
	
	base := baseItems[rand.Intn(len(baseItems))]
	pref := prefixes[rand.Intn(len(prefixes))]

	finalAtk := int(float64(base.Atk) * pref.Mod)
	rarity := "Comum"
	if pref.Mod >= 1.3 {
		rarity = "Lendário"
	} else if pref.Mod >= 1.15 {
		rarity = "Raro"
	}

	return Item{
		ID:            fmt.Sprintf("item_%d", rand.Intn(100000)),
		Name:          fmt.Sprintf("%s %s", base.Name, pref.Name),
		Attack:        finalAtk,
		Defense:       base.Def,
		Rarity:        rarity,
		SpecialEffect: pref.Effect,
	}
}

```

### 5.3 Simulação Delta-Time Offline (`pkg/game/offline.go`)

```go
package game

import (
	"time"
)

type OfflineResult struct {
	MinutesOffline int    `json:"minutes_offline"`
	XPGained       int64  `json:"xp_gained"`
	GoldGained     int64  `json:"gold_gained"`
	ItemsFound     []Item `json:"items_found"`
}

func CalculateOfflineProgress(lastLogout time.Time, playerLevel int) OfflineResult {
	now := time.Now()
	duration := now.Sub(lastLogout)
	minutes := int(duration.Minutes())

	// Limite máximo de 12 horas de cálculo offline
	if minutes > 720 {
		minutes = 720
	}

	if minutes < 5 {
		return OfflineResult{}
	}

	xpGained := int64(minutes * 150 * playerLevel)
	goldGained := int64(minutes * 20)

	var items []Item
	rolls := minutes / 30
	for i := 0; i < rolls; i++ {
		items = append(items, GenerateProceduralLoot())
	}

	return OfflineResult{
		MinutesOffline: minutes,
		XPGained:       xpGained,
		GoldGained:     goldGained,
		ItemsFound:     items,
	}
}

```

---

## 🎛️ 06. FRONTEND UI & DASHBOARD DRAG-AND-DROP (REACT 19 + @DND-KIT)

```tsx
import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WidgetProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function SortableWidget({ id, title, children }: WidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 mb-4">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing bg-slate-950 p-2 rounded-lg mb-3 flex justify-between items-center border border-slate-800">
        <span className="font-semibold text-amber-400 text-sm">{title}</span>
        <span className="text-xs text-slate-600">⠿ Mover Widget</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function DashboardGrid() {
  const [items, setItems] = useState(['character_status', 'expedition_controls', 'telemetry', 'combat_logs']);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.indexOf(active.id);
        const newIndex = prevItems.indexOf(over.id);
        return arrayMove(prevItems, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext collisionDetection="{closestCenter}" onDragEnd="{handleDragEnd}" sensors="{sensors}">
      <SortableContext items="{items}" strategy="{rectSortingStrategy}">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-950 min-h-screen">
          {items.map((id) => {
            if (id === 'character_status') return (
              <SortableWidget id="{id}" key="{id}" title="Status do Personagem">
                <div className="space-y-2 text-sm">
                  <p>HP: <span className="text-emerald-400">150 / 150</span></p>
                  <p>Mana: <span className="text-sky-400">50 / 50</span></p>
                  <p>Nível: <span className="text-amber-400">25</span></p>
                </div>
              </SortableWidget>
            );
            if (id === 'expedition_controls') return (
              <SortableWidget id="{id}" key="{id}" title="Controle de Expedição Idle">
                <button className="w-full py-2 bg-amber-600 hover:bg-amber-500 font-bold rounded text-slate-950 transition">
                  Iniciar Expedição
                </button>
              </SortableWidget>
            );
            if (id === 'telemetry') return (
              <SortableWidget id="{id}" key="{id}" title="Telemetria do Servidor (Admin)">
                <div className="text-xs space-y-1 font-mono text-slate-400">
                  <p>RAM Utilizada: 22.4 MB</p>
                  <p>Uptime: 142 horas</p>
                  <p>Conexões Ativas: 1240 CCU</p>
                </div>
              </SortableWidget>
            );
            if (id === 'logs') return (
              <SortableWidget id="{id}" key="{id}" title="Log de Combate">
                <div className="h-24 overflow-y-auto text-xs font-mono text-slate-400 space-y-1">
                  <p> Você causou 142 de dano no Orc.</p>
                  <p> Você recebeu o item: Machado Incandescente!</p>
                </div>
              </SortableWidget>
            );
            return null;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

```

---

## 🎨 07. CANVAS VISUAL DO JOGO (PIXIJS V8)

```typescript
import { Application, Sprite, Assets, Text } from 'pixi.js';

export class GameViewport {
  private app: Application;

  constructor() {
    this.app = new Application();
  }

  async init(container: HTMLDivElement) {
    await this.app.init({
      width: 640,
      height: 480,
      backgroundColor: 0x020617, // Slate-950
      resolution: window.devicePixelRatio || 1,
    });

    container.appendChild(this.app.canvas);
    await this.loadAssets();
    this.setupScene();
  }

  private async loadAssets() {
    await Assets.load([
      { alias: 'hero', src: '/assets/sprites/hero.png' },
      { alias: 'monster', src: '/assets/sprites/monster.png' }
    ]);
  }

  private setupScene() {
    const playerSprite = Sprite.from('hero');
    playerSprite.x = 320;
    playerSprite.y = 240;
    playerSprite.anchor.set(0.5);

    this.app.stage.addChild(playerSprite);

    this.triggerFloatingDamage("-185 SD", 320, 200, 0xef4444);
  }

  public triggerFloatingDamage(textValue: string, x: number, y: number, color: number) {
    const damageText = new Text({
      text: textValue,
      style: {
        fontFamily: 'monospace',
        fontSize: 16,
        fill: color,
        stroke: { color: 0x000000, width: 3 }
      }
    });
    damageText.x = x;
    damageText.y = y;

    this.app.stage.addChild(damageText);

    let frameCounter = 0;
    const ticker = this.app.ticker.add(() => {
      damageText.y -= 0.6;
      damageText.alpha -= 0.02;
      frameCounter++;

      if (damageText.alpha <= 0 || frameCounter > 60) {
        this.app.stage.removeChild(damageText);
        this.app.ticker.remove(ticker);
      }
    });
  }
}

```

---

## 🗺️ 08. ROADMAP DE DESENVOLVIMENTO INCREMENTAL

### Milestone 0 — Bootstrap da Infraestrutura Nao-OpenTibia

* [ ] Configurar `docker-compose.yml` com PostgreSQL 16, Redis 7 e Go Backend.
* [ ] Criar migrations SQL para tabelas `accounts`, `characters`, `character_inventories` e `expedition_logs`.
* [ ] Validar consumo total de memória inicial do servidor (< 500 MB RAM).

### Milestone 1 — Autenticação & Engine do Jogador

* [ ] Desenvolver handlers Go para Registro e Login (JWT em Cookies HTTPOnly).
* [ ] Criar estrutura base do React 19 com Tailwind CSS.
* [ ] Implementar a tela de login/cadastro e o seletor de personagens.

### Milestone 2 — Sistema Idle & Loot Procedural

* [ ] Criar pacote `pkg/game/loot.go` para geração aleatória de itens procedurais.
* [ ] Criar pacote `pkg/game/offline.go` para simulação determinística de progresso offline por delta-time.
* [ ] Desenvolver modal de "Resumo da Expedição Offline" ao reconectar.

### Milestone 3 — Interface Drag-and-Drop & Viewport PixiJS

* [ ] Desenvolver o componente `DashboardGrid` usando `@dnd-kit` para arrastar widgets de status, logs e administração.
* [ ] Integrar o Canvas 2D em PixiJS v8 para exibir sprites de 32x32 e texto flutuante de dano.
* [ ] Conectar os eventos do backend em Go via WebSocket/REST com o frontend.

```

```