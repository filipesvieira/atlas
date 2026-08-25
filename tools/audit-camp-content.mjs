import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const errors = [];

// 1. Validar Recursos e Troféus
const resourceSource = read('backend/pkg/game/resource_registry.go') + '\n' + read('backend/pkg/game/economy_resources.go');
const resourceKeys = new Set();
for (const match of resourceSource.matchAll(/"([^"]+)":\s*\{\s*Key:\s*"([^"]+)"/gm)) {
  resourceKeys.add(match[1]);
}
for (const match of resourceSource.matchAll(/\{Key:\s*"([^"]+)"/gm)) {
  resourceKeys.add(match[1]);
}

// 2. Validar Perfis de Recursos dos Monstros
const profileSource = read('backend/pkg/game/resource_profiles.go') + '\n' + read('backend/pkg/game/economy_monster_profiles.go');
const profileKeys = new Set();
for (const match of profileSource.matchAll(/"([^"]+)":\s*\{\s*(?:GuaranteedDrops|Drops)/gm)) {
  profileKeys.add(match[1]);
}
for (const match of profileSource.matchAll(/"([a-z0-9_]+)":\s*"part_[a-z0-9_]+"/gm)) {
  profileKeys.add(match[1]);
}
if (profileKeys.size !== 39) {
  errors.push(`Esperados 39 perfis temáticos de monstro, encontrados ${profileKeys.size}`);
}

// Verificar recursos referenciados nos perfis
for (const match of profileSource.matchAll(/ResourceKey:\s*"([^"]+)"/gm)) {
  const resKey = match[1];
  if (!resourceKeys.has(resKey)) {
    errors.push(`Perfil de monstro referencia recurso inexistente: ${resKey}`);
  }
}

// 3. Validar Construções e Custos
const buildingSource = read('backend/pkg/game/building_registry.go');
const buildingKeys = new Set();
for (const match of buildingSource.matchAll(/"([^"]+)":\s*\{\s*Key:\s*"([^"]+)"/gm)) {
  buildingKeys.add(match[1]);
}

// Verificar recursos e troféus em custos de construção
for (const match of buildingSource.matchAll(/Key:\s*"([^"]+)",\s*Quantity:/gm)) {
  const costKey = match[1];
  if (!resourceKeys.has(costKey)) {
    errors.push(`Construção referencia custo/troféu inexistente: ${costKey}`);
  }
}

// 4. Validar Renderizadores Visuais no Frontend
const rendererDir = path.join(root, 'frontend/src/game/camp/renderers');
const rendererFiles = fs.readdirSync(rendererDir);
const expectedRenderers = ['CampfireRenderer.ts', 'ArcaneSpringRenderer.ts', 'HutRenderer.ts', 'WarehouseRenderer.ts', 'WorkbenchRenderer.ts', 'KitchenRenderer.ts'];

for (const expected of expectedRenderers) {
  if (!rendererFiles.includes(expected)) {
    errors.push(`Renderizador ausente no frontend: ${expected}`);
  }
}

// 5. Validar Layout dos Slots
const layoutSource = read('frontend/src/game/camp/CampLayoutRegistry.ts');
const requiredSlots = ['center', 'north', 'west', 'east', 'south'];
for (const slot of requiredSlots) {
  if (!layoutSource.includes(`${slot}:`)) {
    errors.push(`Slot obrigatório ausente no CampLayoutRegistry: ${slot}`);
  }
}


// 6. Garantir que frontend e backend concordem com o terreno V3.
const backendLayoutSource = read('backend/pkg/game/camp_layout.go');
const frontendWidth = Number(layoutSource.match(/CAMP_GRID_WIDTH\s*=\s*(\d+)/)?.[1] || 0);
const frontendHeight = Number(layoutSource.match(/CAMP_GRID_HEIGHT\s*=\s*(\d+)/)?.[1] || 0);
const backendWidth = Number(backendLayoutSource.match(/CampGridWidth\s*=\s*(\d+)/)?.[1] || 0);
const backendHeight = Number(backendLayoutSource.match(/CampGridHeight\s*=\s*(\d+)/)?.[1] || 0);
const backendLayoutVersion = Number(backendLayoutSource.match(/CampLayoutVersion\s*=\s*(\d+)/)?.[1] || 0);
if (frontendWidth !== backendWidth || frontendHeight !== backendHeight) {
  errors.push(`Grid divergente entre frontend (${frontendWidth}x${frontendHeight}) e backend (${backendWidth}x${backendHeight})`);
}
if (frontendWidth !== 24 || frontendHeight !== 18) {
  errors.push(`Layout V3 deveria usar 24x18 tiles; encontrado ${frontendWidth}x${frontendHeight}`);
}
if (backendLayoutVersion !== 3) {
  errors.push(`CampLayoutVersion deveria ser 3; encontrado ${backendLayoutVersion}`);
}

const summary = {
  registeredResources: resourceKeys.size,
  monsterProfiles: profileKeys.size,
  campBuildings: buildingKeys.size,
  renderedBuildings: rendererFiles.length,
  layoutSlots: requiredSlots.length,
  isometricGrid: `${frontendWidth}x${frontendHeight}`,
  layoutVersion: backendLayoutVersion,
  errors: errors.length,
};

console.log(JSON.stringify(summary, null, 2));

if (errors.length > 0) {
  errors.forEach((err) => console.error(`- ${err}`));
  process.exitCode = 1;
} else {
  console.log('Camp Content Audit OK: Recursos, monstros, custos, renderizadores e slots estão 100% íntegros.');
}