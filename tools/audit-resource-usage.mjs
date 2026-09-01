import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const resourcesSource = read('backend/pkg/game/resource_registry.go') + '\n' + read('backend/pkg/game/economy_resources.go');
const recipes = read('backend/pkg/game/recipe_registry.go');
const buildings = read('backend/pkg/game/building_registry.go') + '\n' + read('backend/pkg/game/defense_building_registry.go');
const buffs = read('backend/pkg/game/buffs.go');
const crafting = read('backend/pkg/game/crafting.go');
const gathering = read('backend/pkg/game/gathering_registry.go');
const profiles = read('backend/pkg/game/resource_profiles.go') + '\n' + read('backend/pkg/game/economy_monster_profiles.go');
const salvage = read('backend/pkg/game/salvage.go');

const keys = [...resourcesSource.matchAll(/\{Key:\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
const unique = [...new Set(keys)];
const intentionallyFuture = new Set([]);
const sourceText = `${gathering}\n${profiles}\n${salvage}\n${recipes}`;
const sinkText = `${recipes}\n${buildings}\n${buffs}\n${crafting}`;
const missingSource = [];
const missingSink = [];
for (const key of unique) {
  // SourceKind in the registry documents a legitimate external source; recipes
  // additionally cover processed outputs. This audit is a tripwire, not a parser.
  const def = resourcesSource.slice(Math.max(0, resourcesSource.indexOf(`Key: "${key}"`) - 20), resourcesSource.indexOf(`Key: "${key}"`) + 600);
  const hasDeclaredSource = /SourceKind:\s*"[^"]+"/.test(def) || sourceText.includes(`OutputResourceKey: "${key}"`);
  if (!hasDeclaredSource) missingSource.push(key);
  // Partes de monstro entram dinamicamente nas receitas de equipamento por
  // monsterPartForTemplate; o audit-economy valida essa cobertura separadamente.
  const dynamicMonsterPart = key.startsWith('part_') && profiles.includes(`"${key}"`);
  const hasSink = sinkText.includes(`Key: "${key}"`) || sinkText.includes(`"${key}"`) || dynamicMonsterPart;
  if (!hasSink && !intentionallyFuture.has(key)) missingSink.push(key);
}
const errors = [];
if (missingSource.length) errors.push(`recursos sem origem declarada: ${missingSource.join(', ')}`);
if (missingSink.length) errors.push(`recursos sem uso/sink: ${missingSink.join(', ')}`);
console.log(JSON.stringify({ registeredResources: unique.length, intentionallyFuture: [...intentionallyFuture], missingSource, missingSink, errors: errors.length }, null, 2));
if (errors.length) { errors.forEach((e) => console.error('- ' + e)); process.exit(1); }
console.log('Resource usage audit OK: recursos possuem origem e sink, salvo conteúdo explicitamente reservado para o futuro.');