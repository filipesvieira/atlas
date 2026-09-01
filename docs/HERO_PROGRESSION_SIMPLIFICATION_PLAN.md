# Hero Progression Simplification Plan — Maestrias no lugar de Atributos Primários

**Status:** **S1 implementada em 2026-09-01**; colunas legadas preservadas temporariamente apenas para compatibilidade/rollback.  
**Objetivo:** reduzir decisões artificiais e deixar a especialização do herói acontecer pelo que ele usa: arma, equipamento, skills e maestrias.

## 1. Problema atual

O herói possui STR/DEX/INT/VIT, pontos não distribuídos e Maestrias. Na prática existem duas camadas que tentam responder à mesma pergunta: “em que tipo de combate este personagem é bom?”.

Hoje os atributos estão profundamente acoplados ao balanceamento:
- STR escala ataque corpo a corpo e capacidade;
- DEX escala distância, crítico e cadência;
- INT escala magia, mana, regen e cura/dano de skills;
- VIT escala HP, defesa e recuperação offline;
- level-up concede pontos manuais;
- equipamentos também carregam bônus STR/DEX/INT;
- PvP/Combat Power e simuladores QA consomem esses valores.

Remover apenas a UI criaria pontos invisíveis acumulando e manteria a complexidade no backend. Por isso a simplificação será uma migração completa e própria.

## 2. Decisão canônica

O alvo é remover a **distribuição manual de Atributos Primários** e fazer a progressão principal vir de:

```text
Nível
  +
Maestrias por uso
  +
Equipamentos
  +
Skills / efeitos
  =
Identidade do herói
```

O jogador troca de espada para arco e passa a desenvolver Distância naturalmente; não precisa também lembrar de colocar pontos em DEX.

## 3. O que substitui cada atributo

| Hoje | Responsabilidade futura |
|---|---|
| STR → dano melee | ataque base da arma + Sword/Axe/Club Mastery + bônus explícitos do item |
| STR → capacidade | mochila + nível + melhorias territoriais; nunca mais build de combate para carregar itens |
| DEX → dano ranged | arma/munição + Distance Mastery |
| DEX → crítico | arma/equipamento/skills + curva moderada de Distance Mastery quando aplicável |
| DEX → attack speed | perfil da arma + mastery + bônus explícito `attack_speed` |
| INT → magic damage | poder mágico do item + Magic Mastery + skills |
| INT → mana/regen | nível + equipamento + Fonte Arcana/consumíveis |
| VIT → HP | nível + HP explícito de equipamento |
| VIT → defesa | armadura/escudo + defesa explícita |
| VIT → recovery offline | HP/defesa/nível + sistemas do assentamento |

Equipamento deixa de dizer “+3 STR” quando o efeito real desejado é “mais dano físico”. O catálogo futuro deve preferir modificadores semânticos.

## 4. Migração segura

A alteração foi executada na fase própria **S1 — Simplificação da Progressão do Herói**, depois da M5-C e antes da M5-D.

Passos:
1. congelar baseline de PvE/PvP atual;
2. criar fórmulas sem STR/DEX/INT/VIT;
3. converter templates de itens para bônus explícitos;
4. remover ganho de `UnspentPoints` no level-up;
5. remover comando `ALLOCATE_STAT`;
6. migrar personagens antigos sem perda brusca de poder relativo;
7. retirar painéis/tutoriais/notificações de distribuição;
8. recalibrar starter kits, PvE e PvP;
9. somente depois remover/legar colunas antigas.

As colunas podem permanecer por uma versão de compatibilidade, mas devem deixar de participar de cálculo antes de serem eliminadas fisicamente.

## 5. Compatibilidade dos personagens existentes

Não converteremos “100 STR” literalmente em “100 níveis de Sword Mastery”; isso favoreceria injustamente uma única arma e permitiria exploits de respec.

Estratégia recomendada:
- recalcular todos os personagens pelo mesmo modelo novo;
- preservar nível, maestrias reais, equipamentos e skills;
- usar uma compensação temporária versionada apenas se os testes mostrarem queda excessiva de poder em saves antigos;
- nunca obrigar o jogador a redistribuir pontos novamente.

## 6. Gates obrigatórios da S1

- `go test -race ./pkg/game`;
- matriz PvP CP-normalizada de 100+ seeds dentro do gate ~60/40;
- starter loadouts diagnósticos;
- TTK PvE por tier/região;
- offline simulation / recovery;
- peso/capacidade e mochila;
- auditor de itens sem bônus primários órfãos;
- QA de personagens antigos migrados.

## 7. Roadmap

```text
✅ M5-C  Defesa e feedback territorial
✅ S1    Simplificação da Progressão do Herói
🟡 M5-D  Mapa Territorial / World Grid
⬜ M6    Scouting
⬜ M7    Raid Reino vs Reino
```

A S1 acontece antes do RvR competitivo para não calibrarmos raids em cima de um sistema de atributos que pretendemos remover logo depois.

## 8. Resultado da implementação S1

Entregue em 2026-09-01:
- STR/DEX/INT/VIT deixam de participar das fórmulas de gameplay;
- level-up não concede novos pontos manuais;
- `ALLOCATE_STAT` deixa de ser ação válida;
- itens usam bônus semânticos de poder corpo a corpo, distância e magia;
- itens antigos são normalizados na leitura para o contrato semântico novo;
- criação de personagem usa `CurrentHeroProgressionVersion`;
- presets administrativos deixam de popular atributos/pontos legados;
- colunas antigas permanecem por uma janela de compatibilidade e não devem ser usadas por regras novas.

Gates executados no pacote de trabalho: `go test ./pkg/game`, `go test -race ./pkg/game`, auditorias de conteúdo/economia/recursos e balance gate PvP CP-normalizado. O build integral continua dependente das dependências omitidas no Repomix (`go.sum`/`node_modules`).
