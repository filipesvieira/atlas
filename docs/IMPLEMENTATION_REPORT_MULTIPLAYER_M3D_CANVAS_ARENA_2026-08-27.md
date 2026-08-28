# Relatório de implementação — Multiplayer M3D: arena PvP no Canvas

Data: 2026-08-27

## Escopo entregue

- `PvPArenaViewport` é um canvas isométrico exclusivo para duelos, sobreposto ao `GameCanvas` somente enquanto a partida está `active` ou mostra seu resultado confirmado.
- A arena usa a grade canônica 24×18, com piso de runas, bordas de pedra violeta, céu noturno e tochas animadas, preservando a identidade pixel art do Reino do Avesso.
- Os dois atores são renderizados com avatares genéricos de guerreiro, arqueiro ou mago conforme o arquétipo público. Isso comunica o papel de combate sem revelar skin, equipamento, atributos ou buffs do adversário.
- Posições autoritativas são interpoladas entre os pulsos de 250 ms; ataques básicos recebem animação, flash de acerto e texto de dano. Nome, nível, HP e resultado são os únicos dados apresentados.
- O mundo PvE e sua sessão permanecem vivos abaixo do overlay. Depois do resultado, o botão **Voltar à expedição** remove apenas a camada visual PvP.

## Fronteiras de segurança

- O renderer recebe exclusivamente `PvPCombatSnapshot`, já sanitizado pelo backend.
- Não há comando de movimento, habilidade, cura ou ataque enviado pelo Canvas; o cliente não decide dano, cooldown, vitória ou derrota.
- A barra de zoom do mundo é desabilitada durante a exibição da arena para não sugerir que ela altera o campo de combate PvP.

## Limites preservados

- Os duelos continuam automáticos nesta versão.
- Ainda não há terreno bloqueante, controle manual, habilidades PvP, cura, efeitos de controle, matchmaking ou rating aplicado.
- O card do chat mundial continua exibindo a transmissão resumida como redundância de UX e para confirmar o resultado fora do Canvas.

## Próxima etapa: M3E

1. Definir comandos táticos e habilidades PvP versionadas no backend.
2. Adicionar efeitos visuais correspondentes somente após cada ação ser confirmada pelo servidor.
3. Projetar pausa/reconexão de arena `active` e política de desistência antes de introduzir ranking.

## Validação

```bash
cd frontend
npm run build

cd ../backend
go test -race ./...
```