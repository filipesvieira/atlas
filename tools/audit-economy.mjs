import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const professions = read('backend/pkg/game/profession_registry.go');
const gathering = read('backend/pkg/game/gathering_registry.go');
const recipes = read('backend/pkg/game/recipe_registry.go');
const policy = read('backend/pkg/game/economy_policy.go');
const loot = read('backend/pkg/game/loot.go');
const economyResources = read('backend/pkg/game/economy_resources.go');
const baseResources = read('backend/pkg/game/resource_registry.go');
const profiles = read('backend/pkg/game/economy_monster_profiles.go');
const profileRuntime = read('backend/pkg/game/resource_profiles.go');
const database = read('backend/internal/db/db.go');
const economyDatabase = read('backend/internal/db/economy.go');
const settlementDatabase = read('backend/internal/db/settlement.go');
const migrationNames = [
  '000006_progression_professions_crafting',
  '000007_economy_hardening',
  '000008_legacy_schema_consolidation',
  '000009_static_catalog_tables',
  '000010_compendium_region_key_hardening',
  '000011_pending_item_no_loss',
  '000012_classless_onboarding',
  '000013_settlement_residents_desires',
];
const migration = migrationNames
  .map((name) => read(`backend/migrations/${name}.sql`))
  .join('\n');

const professionKeys = [...professions.matchAll(/^\s*"([a-z_]+)":\s*\{Key:/gm)].map((m) => m[1]);
const gatheringKeys = [...gathering.matchAll(/^\s*"([a-z_]+)":\s*\{Key:/gm)].map((m) => m[1]);
const monsterParts = [...profiles.matchAll(/"([a-z0-9_]+)":\s*"part_/g)].map((m) => m[1]);
const monsterPartKeys = [...new Set([...profiles.matchAll(/"[a-z0-9_]+":\s*"(part_[a-z0-9_]+)"/g)].map((m) => m[1]))];
const rawResources = [...(economyResources + baseResources).matchAll(/Key:\s*"([a-z0-9_]+)"[^}]+?Category:\s*ResourceCategoryProfessionRaw/g)].map((m) => m[1]);

assert(professionKeys.length === 6, `esperadas 6 profissões; encontradas ${professionKeys.length}`);
assert(gatheringKeys.length === 6, `esperadas 6 expedições de coleta; encontradas ${gatheringKeys.length}`);
assert(monsterParts.length === 39, `esperados 39 mapeamentos temáticos de monstros; encontrados ${monsterParts.length}`);
assert(!/(ResourceKey:\s*"(?:wood|stone|fiber|iron)")/.test(profileRuntime), 'catálogo runtime ainda contém matéria-prima profissional hardcoded para monstros');
for (const partKey of monsterPartKeys) assert(recipes.includes(`"${partKey}"`), `material temático sem receita substituta: ${partKey}`);
assert(rawResources.length >= 15, `taxonomia profissional incompleta: ${rawResources.length} recursos brutos`);
assert(recipes.includes('for _, template := range ItemRegistry.List()'), 'receitas de equipamento não cobrem dinamicamente o ItemRegistry');
assert(recipes.includes('equipamento genérico %s ficou sem receita equivalente'), 'validador de cobertura de receitas ausente');
assert(policy.includes('ATLAS_CRAFTING_FIRST_LOOT') && policy.includes('CommonEquipmentDropMultiplier: commonMultiplier'), 'feature flag de transição do loot ausente');
assert(/CommonEquipmentDropMultiplier:\s+commonMultiplier/.test(policy) && /floatEnv\("ATLAS_COMMON_EQUIPMENT_DROP_MULTIPLIER", 0\)/.test(policy), 'estado final não remove drop genérico comum por padrão');

const legacyMigrationBody = loot.slice(loot.indexOf('func RebalanceExistingItem'), loot.indexOf('func GenerateLootForMonsterWithRand'));
assert(!legacyMigrationBody.includes('GenerateItemFromTemplate'), 'itens legados ainda são rerrolados na carga');
assert(legacyMigrationBody.includes('ItemSourceLegacyDrop'), 'origem legacy_drop não é aplicada');
assert(database.includes('COALESCE(target.state_revision,0)=$24') && database.includes('COALESCE(state_revision,0)=$24'), 'persistência do personagem não exige revisão otimista esperada');
assert(!database.includes('// Migrations dinâmicas'), 'InitDB ainda contém migrations dinâmicas fora do runner');
assert(database.includes('SELECT equipment, backpack, revision') && migration.includes('pending_resource_claim_requests'), 'revisão separada de inventário ou claims pendentes ausente');
assert(migration.includes('ADD COLUMN IF NOT EXISTS revision BIGINT') && migration.includes('state_revision'), 'consolidação de revisões otimistas ausente');
assert(migration.includes('CREATE TABLE IF NOT EXISTS base_items') && migration.includes('CREATE TABLE IF NOT EXISTS base_monsters'), 'catálogos estáticos legados ausentes');
assert(migration.includes('first_region_key') && migration.includes('PRIMARY KEY(character_id, item_template_key, first_region_key)'), 'compêndio regional não foi endurecido');
assert(migration.includes('ALTER COLUMN transaction_id DROP NOT NULL') && migration.includes('pending_items_character_item_uidx'), 'fila geral de item protegido sem perda ausente');
assert(migration.includes("starter_pack_key = 'classless_all'") && migration.includes('ALTER COLUMN starter_pack_claimed SET DEFAULT TRUE'), 'onboarding classless não foi migrado');
assert(economyDatabase.includes('$3::text') && economyDatabase.includes('resource_key=$3::text'), 'query de desbloqueio ainda arrisca inferência conflitante do parâmetro de troféu');
assert(economyDatabase.includes('ActiveGatherings') && economyDatabase.includes('resident_id'), 'coleta ainda não suporta múltiplos trabalhadores do assentamento');
assert(settlementDatabase.includes('AdvanceHeroDesires') && settlementDatabase.includes('hero_desire_reserve'), 'scheduler ou reserva transacional de Ambições ausente');
assert(settlementDatabase.includes('settlement_armory') && settlementDatabase.includes('SentToArmory: true'), 'produção automática não está protegida no Arsenal');
assert(migration.includes('recipe_snapshot JSONB') && settlementDatabase.includes('recipeSnapshot'), 'Ambições não congelam a receita para sobreviver a atualizações de catálogo');

for (const table of [
  'character_professions', 'character_activities', 'character_pending_gathering_rewards',
  'character_recipe_unlocks', 'crafting_transactions', 'character_resource_ledger',
  'pending_crafted_items', 'character_session_leases', 'character_pending_resource_rewards',
  'progression_migration_issues', 'settlements', 'settlement_residents',
  'settlement_resident_skills', 'hero_desires', 'hero_desire_resource_reservations',
  'settlement_armory',
]) assert(migration.includes(table), `migração não contém ${table}`);

const report = {
  professions: professionKeys.length,
  gatheringExpeditions: gatheringKeys.length,
  professionRawResources: rawResources.length,
  thematicMonsterMappings: monsterParts.length,
  thematicPartsUsedByRecipes: monsterPartKeys.length,
  craftingCoverage: 'dynamic ItemRegistry + startup validator',
  legacyItemPolicy: 'source-only; no reroll',
  progressionConcurrency: 'expected revision + distributed lease',
  fullStoragePolicy: 'pending claim; no loss',
  settlementAutomation: 'resident workers + reserved desires + protected armory',
  errors,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
console.log('Economy audit OK: progressão, profissões, coleta, crafting, rollout e overflow estão cobertos.');
