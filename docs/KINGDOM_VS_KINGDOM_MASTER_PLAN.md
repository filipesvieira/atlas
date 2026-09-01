# Reino do Avesso — Kingdom vs Kingdom Master Plan

**Status:** documento canônico atualizado após S1 e durante o fechamento da M5-D.  
**M5-C:** Defense Power, Readiness, guarnição automática, estratégia e snapshot defensivo concluídos.  
**Próxima fase de produto:** fechar o gate integral da M5-D; depois M6 — Scouting.  
**Scouting:** M6.  
**Raid real:** M7.

## 1. Princípios

O Reino vs Reino deve gerar consequência sem destruir semanas de progresso.

- prédios nunca perdem nível por derrota;
- moradores nunca morrem permanentemente por raid;
- equipamento do herói e GoldBank pessoal nunca são saqueáveis;
- dano estrutural é temporário e reparável;
- ferimentos são temporários e tratáveis;
- tesouraria/estoque territorial possuem teto de perda e proteção por Cofre;
- toda resolução de raid usa snapshot defensivo autoritativo e versionado;
- scouting revela estimativas, não snapshots privados completos;
- defesa funciona mesmo com o defensor offline;
- raids permanecem desabilitadas até a M7.

## 2. Loop macro

```text
1. Inteligência (M6)
      ↓
2. Preparação (M7)
      ↓
3. Cerco
      ↓
4. Combate interno
      ↓
5. Objetivo / Extração
      ↓
6. Recuperação
```

### Inteligência
O atacante envia scouting e recebe estimativas como Defense Power, nível provável de muralha, força da guarnição, presença de Ressonador e proteção econômica. Torre de Vigia e Sala de Guerra aumentam detecção/contraespionagem.

### Preparação
O atacante escolhe objetivo e composição de ataque. Primeira versão da M7 deve priorizar:
- saque limitado de Armazém;
- saque limitado de Tesouraria;
- sabotagem temporária de estrutura.

Captura temporária pode entrar depois da primeira iteração da M7.

### Cerco
A ofensiva enfrenta Barreira Arcana, Muralha, Portão, armadilhas e estruturas de vigilância. O objetivo é abrir breach, não reduzir níveis de construção.

### Combate interno
Após breach, a guarnição entra no cálculo. Quartel, treinamento, distribuição de guardas e bônus de comando da Sala de Guerra passam a importar.

### Objetivo / Extração
O atacante precisa alcançar o objetivo escolhido. O Cofre reduz a parcela exposta. Existe teto global de saque por raid.

### Recuperação
Depois da luta:
- Engenheiro cria fila de reparos;
- Enfermaria trata feridos;
- estruturas recuperam integridade;
- Reino recebe shield pós-raid por janela definida;
- um novo snapshot defensivo é gerado quando o estado volta a ser elegível.

## 3. Função das construções

### Muralha
**Papel:** primeira linha física do cerco.  
**M5-C:** integridade, mitigação estrutural, contribuição para Defense Power.  
**M7:** recebe dano de cerco e define dificuldade de breach.

### Portão Fortificado
**Papel:** entrada principal e ponto de ruptura.  
**M5-C:** integridade e resistência a breach.  
**M7:** pode ser o caminho mais rápido, porém mais defendido.

### Torre de Vigia
**Papel:** inteligência e alerta.  
**M5-C:** contribuição de vigilância/readiness.  
**M6:** detecção de scouts, warning e contraespionagem.  
**M7:** melhora informação defensiva antes do ataque.

### Quartel
**Papel:** guarnição.  
**M5-C:** capacidade 4/8/12 conforme nível; a população preenche a guarnição automaticamente, preservando uma reserva civil. Não existe microgestão obrigatória de guardas.  
**M7:** guardas participam do combate interno.

### Cofre do Reino
**Papel:** proteção econômica territorial.  
**M5-C:** calcula porcentagem protegida de Armazém/Tesouraria.  
**M7:** somente a parcela exposta pode entrar no teto de saque. GoldBank pessoal permanece intocável.

### Enfermaria
**Papel:** consequência recuperável de conflito.  
**M5-C:** reduz chance/severidade de ferimentos e tempo de recuperação.  
**Modelo:** `Healthy → Wounded → Recovering → Healthy`.

### Cárcere
**Papel:** captura temporária, nunca remoção permanente.  
**M5-C:** apenas readiness/capacidade e UI explicativa.  
**M7+:** pode sustentar mecânica de cativos temporários se o playtest justificar.

### Oficina do Engenheiro
**Papel:** manutenção militar.  
**M5-C:** eficiência de reparos e capacidade de armadilhas são calculadas automaticamente; fila/dano real só é materializado quando M7 introduzir consequências de raid.  
**M7:** repara dano pós-raid e prepara defesas.

### Sala de Guerra
**Papel:** hub central do Reino vs Reino.  
**M5-C:** Defense Power, Readiness, Guarnição, Fortificações, estratégia defensiva e snapshot.  
**M6:** Inteligência/Scouting.  
**M7:** atacar, histórico de raids, relatórios e replays resumidos.

### Ressonador Arcano
**Papel:** defesa mágica territorial.  
**M5-C:** gera componente de Shield/estabilidade e Defense Power.  
**M7:** barreira é consumida antes da integridade da Muralha/Portão.

## 4. Defense Power — M5-C

Defense Power não deve ser um número opaco. O painel deve decompor:

```text
Defense Power
├── Fortificação
├── Guarnição
├── Vigilância
├── Proteção Econômica
├── Suporte/Recuperação
└── Arcano
```

Readiness é separado de Defense Power. Um Reino forte, mas com reparos pendentes/feridos/guarnição incompleta, pode ter alto potencial e baixa prontidão.

## 5. Snapshot defensivo

O snapshot congela apenas o necessário para resolução de defesa:
- versão do layout;
- estágio/território;
- níveis e integridade das estruturas relevantes;
- guarnição automática derivada de população/capacidade;
- estratégia defensiva;
- Defense Power decomposto;
- buffs territoriais aplicáveis;
- proteção econômica e limites;
- readiness;
- versão das regras.

Mover/melhorar estrutura invalida o snapshot ativo. M5-C é responsável por regenerá-lo quando o Reino estiver consistente.

## 6. Estratégias defensivas iniciais

A M5-C usa apenas três escolhas de alto nível:
- **Equilibrada:** distribuição neutra;
- **Agressiva:** prioriza guarnição e vigilância;
- **Defensiva:** prioriza fortificações e suporte.

Não existe configuração por guarda ou por tile. Esse nível de simplicidade é deliberado. Futuras estratégias só devem ser adicionadas se mudarem decisões reais sem virar microgestão.

## 7. UX das construções

Padrão canônico a partir da M5-B.1:
- **hover:** tooltip de propósito, nível e efeitos;
- **click:** abre a função correspondente;
- **drag >= 6px:** move construção posicionável;
- Muralha/Portão são clicáveis, mas não arrastáveis;
- Sala de Guerra abre o Centro de Comando;
- demais prédios defensivos deep-linkam para a seção relevante do mesmo Centro.

Produção existente também usa deep-links:
- Cozinha → aba Cozinha;
- Alquimia → aba Alquimia;
- Armazém → Depósito;
- Bancada → Gestão/Desmonte.

## 8. Território V5

Contrato canônico:

| Estágio | Território |
|---|---:|
| Acampamento | 24×18 |
| Posto | 28×20 |
| Vilarejo | 32×22 |
| Vila | 36×24 |
| Cidade | 40×28 |
| Reino | 52×38 |

Cidade = 1.120 tiles. Reino = 1.976 tiles: **+76,4%**.

O backend fornece `SettlementTerritoryContract` via GameCatalog. Frontend calcula bounds centralizados a partir desse contrato.


## 9. Mapa Territorial e coordenadas

A M5-D atribui a cada assentamento uma coordenada fixa `(x,y)` em um mundo/shard. A Sala de Guerra abre o **Mapa Territorial**, separado do mapa PvE.

Regras congeladas:
- coordenadas únicas e backend-authoritative;
- distância influencia tempo/logística, nunca multiplica diretamente Attack/Defense Power;
- nome/coordenada podem ser públicos, detalhes defensivos exigem M6;
- sem realocação de Reino na primeira versão;
- proteção de novato e pós-raid permanece obrigatória.

Contrato completo: `WORLD_COORDINATE_MAP_MASTER_PLAN.md`.

## 10. Roadmap congelado

```text
✅ M5-A     Progressão territorial
✅ M5-A.1   Territory V4
✅ CFF-A    Combat Feel Presentation
✅ M5-B     Fortificações
✅ M5-B.1   Territory V5 + Usability + RvR Spec
✅ M5-C     Defense Power / Readiness / Snapshot + feedback de promoção
✅ S1       Simplificação da Progressão do Herói
🟡 M5-D     World Grid / Mapa Territorial
⬜ M6       Scouting
⬜ M7       Raid Reino vs Reino
⬜ CFF-B
⬜ CFF-C
⬜ Refinamento final
```