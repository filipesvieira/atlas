# Refatoração modular — changelog

## Adicionado

- Registries genéricos de frontend (`Registry`, `BiomeRegistry`,
  `MonsterRegistry`, `HeroRegistry`).
- Renderers separados por domínio e tier.
- `MonsterContentRegistry` e `ItemTemplateRegistry` no backend.
- Catálogo declarativo de starter packs.
- Endpoint público `GET /api/v1/game/catalog`.
- `biome_key` nas expedições e `active_biome` no realtime.
- Testes de consistência entre loot, tier, nível, preview e starter templates.
- Configuração central de URLs HTTP/WebSocket.
- **UX/UI de Equipamentos & Mochila**:
  - Padronização de cores e estilos de raridade unificada (`getRarityStyle`) cobrindo `Comum`, `Incomum`, `Raro`, `Épico`, `Lendário`, `Mítico`, `Divino`.
  - Tooltips ricos nos equipamentos da tela principal com badges de bônus (+STR, +DEX, +INT, +HP, +MP, +Ouro, Lifesteal, Regen MP, Crítico), slot label e requisitos de nível dinâmicos (`✅/🔒 Requer Nível X`).
  - Barra avançada de filtros no "Conteúdo da Mochila":
    - Filtro por Tipo de Equipamento (Armas ⚔️, Escudos 🛡️, Elmos 🪖, Armaduras 🥋, Calças 👖, Botas 🥾, Acessórios 📿, Mochilas 🎒, Munições 🏹).
    - Filtro por Raridade com chips coloridos temáticos.
    - Campo de busca instantânea por nome do item com botão de limpeza rápida.
    - Contadores dinâmicos de itens por categoria e mensagem de estado vazio amigável com reset de filtros.
    - Integração de seleção em lote inteligente com os itens filtrados.

## Removido / substituído

- `WORLD_REGIONS` duplicado no React.
- Switch gigante de monstros em `PixelArtRenderer`.
- Cadeia de background e inferência região-por-nome em `GameViewport`.
- Inferência de loot por substring do nome do monstro.
- Inferência de skill book/skill pelo nome do item.
- Kits iniciais hardcoded em `ChooseStarterPack` e no modal.
- `SpriteGenerator.ts` legado sem consumidores.
- Assunções do engine de que toda expedição possui exatamente cinco fases.
- **Botão `Descartar Selecionados`** no inventário/mochila, centralizando o fluxo econômico na venda de itens (`Vender Selecionados` e `Vender Tudo`).

