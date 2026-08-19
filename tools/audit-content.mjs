import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const expeditionSource = read('backend/pkg/game/expeditions.go');
const lootSource = read('backend/pkg/game/loot.go');

const templates = new Map();
for (const match of lootSource.matchAll(/^\s*\{(?:Key:\s*"[^"]+",\s*)?Name:\s*"([^"]+)".*?RequiredLevel:\s*(\d+),\s*Tier:\s*(\d+).*?\},$/gm)) {
  templates.set(match[1], { requiredLevel: Number(match[2]), tier: Number(match[3]) });
}

const profiles = new Map();
const profilePattern = /^\s*"([^"]+)":\s*\{Items: \[\]string\{([^}]*)\}, DropChance: ([\d.]+), MinRarity: "([^"]+)", MaxRarity: "([^"]+)"\},$/gm;
for (const match of lootSource.matchAll(profilePattern)) {
  profiles.set(match[1], {
    items: [...match[2].matchAll(/"([^"]+)"/g)].map((item) => item[1]),
    dropChance: Number(match[3]),
    minRarity: match[4],
    maxRarity: match[5],
  });
}

const visualKeys = new Set();
const monsterRendererDir = path.join(root, 'frontend/src/game/renderers/monsters');
for (const filename of fs.readdirSync(monsterRendererDir).filter((name) => /^tier\d+\.ts$/.test(name))) {
  const source = fs.readFileSync(path.join(monsterRendererDir, filename), 'utf8');
  for (const match of source.matchAll(/\bkey: '([^']+)'/g)) visualKeys.add(match[1]);
}

const regionMapStart = expeditionSource.indexOf('var ExpeditionRegions =');
const regionMapEnd = expeditionSource.indexOf('\n}\n\n// GetRandomMonsterForRegion', regionMapStart);
const regionMap = expeditionSource.slice(regionMapStart, regionMapEnd + 2);
const regions = [];
const regionStarts = [...regionMap.matchAll(/\n\t"([^"]+)": \{\n/g)].map((match) => ({
  id: match[1],
  start: match.index + match[0].length,
  markerStart: match.index,
}));
for (let regionIndex = 0; regionIndex < regionStarts.length; regionIndex += 1) {
  const current = regionStarts[regionIndex];
  const next = regionStarts[regionIndex + 1];
  const id = current.id;
  const body = regionMap.slice(current.start, next?.markerStart ?? regionMap.length);
  const numberField = (name) => Number(body.match(new RegExp(`\\n\\t\\t${name}:\\s+(\\d+)`))?.[1] || 0);
  const dropsBody = body.match(/DropsPreview:\s+\[\]string\{([^}]*)\}/)?.[1] || '';
  const dropsPreview = [...dropsBody.matchAll(/"([^"]+)"/g)].map((item) => item[1]);
  const monsters = [...body.matchAll(/\{Key: "([^"]+)", VisualKey: "([^"]+)"([^\n}]*)Level: (\d+)/g)].map((monster) => ({
    key: monster[1],
    visualKey: monster[2],
    isBoss: monster[3].includes('IsBoss: true'),
    level: Number(monster[4]),
  }));
  regions.push({
    id,
    tier: numberField('Tier'),
    minLevel: numberField('MinLevel'),
    maxLevel: numberField('MaxLevel'),
    maxStages: numberField('MaxStages'),
    dropsPreview,
    monsters,
  });
}

const rarityRank = new Map([['Comum', 0], ['Incomum', 1], ['Raro', 2], ['Épico', 3], ['Lendário', 4]]);
const errors = [];
let monsterCount = 0;

for (const region of regions) {
  const obtainable = new Set();
  if (region.maxStages < 1) errors.push(`${region.id}: MaxStages inválido (${region.maxStages})`);
  for (const monster of region.monsters) {
    monsterCount += 1;
    if (monster.level < region.minLevel || monster.level > region.maxLevel) {
      errors.push(`${region.id}/${monster.key}: Lv ${monster.level} fora de ${region.minLevel}-${region.maxLevel}`);
    }
    if (!visualKeys.has(monster.visualKey)) {
      errors.push(`${region.id}/${monster.key}: visual_key ${monster.visualKey} sem renderer`);
    }
    const profile = profiles.get(monster.key);
    if (!profile) {
      errors.push(`${region.id}/${monster.key}: sem MonsterLootProfile`);
      continue;
    }
    if (monster.isBoss && (rarityRank.get(profile.minRarity) ?? -1) < rarityRank.get('Raro')) {
      errors.push(`${region.id}/${monster.key}: boss com raridade mínima ${profile.minRarity}`);
    }
    for (const itemName of profile.items) {
      obtainable.add(itemName);
      const template = templates.get(itemName);
      if (!template) {
        errors.push(`${region.id}/${monster.key}: item inexistente ${itemName}`);
        continue;
      }
      if (template.tier > region.tier) {
        errors.push(`${region.id}/${monster.key}: ${itemName} Tier ${template.tier} > região Tier ${region.tier}`);
      }
      if (template.requiredLevel > region.maxLevel) {
        errors.push(`${region.id}/${monster.key}: ${itemName} requer Lv ${template.requiredLevel} > ${region.maxLevel}`);
      }
    }
  }
  for (const preview of region.dropsPreview) {
    if (!obtainable.has(preview)) errors.push(`${region.id}: preview ${preview} não é obtível na região`);
  }
}

for (const key of profiles.keys()) {
  if (!regions.some((region) => region.monsters.some((monster) => monster.key === key))) {
    errors.push(`perfil de loot órfão: ${key}`);
  }
}

const summary = {
  regions: regions.length,
  monstersAndBosses: monsterCount,
  lootProfiles: profiles.size,
  itemTemplates: templates.size,
  equipmentDropPolicy: 'common_monsters=materials_only; bosses=rare_direct_drop',
  monsterVisuals: visualKeys.size,
  errors: errors.length,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length > 0) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Content audit OK: níveis, loot, previews e visual_keys estão consistentes.');
}
