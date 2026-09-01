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
if (profileKeys.size !== 40) {
  errors.push(`Esperados 40 perfis temáticos de monstro, encontrados ${profileKeys.size}`);
}

// Verificar recursos referenciados nos perfis
for (const match of profileSource.matchAll(/ResourceKey:\s*"([^"]+)"/gm)) {
  const resKey = match[1];
  if (!resourceKeys.has(resKey)) {
    errors.push(`Perfil de monstro referencia recurso inexistente: ${resKey}`);
  }
}

// 3. Validar Construções e Custos
const buildingSource = read('backend/pkg/game/building_registry.go') + '\n' + read('backend/pkg/game/defense_building_registry.go');
const buildingKeys = new Set();
for (const match of buildingSource.matchAll(/"([^"]+)":\s*\{\s*Key:\s*"([^"]+)"/gm)) {
  buildingKeys.add(match[1]);
}
for (const match of buildingSource.matchAll(/\bKey:\s*"(wall|gate|watchtower|barracks|vault|infirmary|prison|engineer_workshop|war_room|resonator)"/gm)) {
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
const expectedRenderers = ['CampfireRenderer.ts', 'ArcaneSpringRenderer.ts', 'HutRenderer.ts', 'WarehouseRenderer.ts', 'WorkbenchRenderer.ts', 'KitchenRenderer.ts', 'AlchemyBenchRenderer.ts', 'DefenseBuildingRenderers.ts', 'FortificationPerimeterRenderer.ts'];

for (const expected of expectedRenderers) {
  if (!rendererFiles.includes(expected)) {
    errors.push(`Renderizador ausente no frontend: ${expected}`);
  }
}


const m5bBuildingKeys = ['wall','gate','watchtower','barracks','vault','infirmary','prison','engineer_workshop','war_room','resonator'];
for (const key of m5bBuildingKeys) {
  if (!buildingKeys.has(key)) errors.push(`Construção defensiva M5-B ausente: ${key}`);
}
const frontendRegistrySource = read('frontend/src/game/camp/CampBuildingRegistry.ts');
for (const key of m5bBuildingKeys) {
  if (!frontendRegistrySource.includes(`this.register('${key}'`)) errors.push(`Construção M5-B sem renderer registrado: ${key}`);
}
if (!read('frontend/src/game/camp/renderers/FortificationPerimeterRenderer.ts').includes("findBuilding(camp, 'wall')")) {
  errors.push('Muralha não está integrada ao renderer de perímetro');
}

// 5. Validar Layout dos Slots
const layoutSource = read('frontend/src/game/camp/CampLayoutRegistry.ts');
const isoGeometrySource = read('frontend/src/game/IsoWorldGeometry.ts');
const requiredSlots = ['center', 'north', 'west', 'east', 'south'];
for (const slot of requiredSlots) {
  if (!layoutSource.includes(`${slot}:`)) {
    errors.push(`Slot obrigatório ausente no CampLayoutRegistry: ${slot}`);
  }
}


// 6. Garantir que arena e assentamento tenham geometrias independentes e que
// o frontend consuma o contrato territorial autoritativo do backend.
const backendLayoutSource = read('backend/pkg/game/camp_layout.go');
const settlementSource = read('backend/pkg/game/settlement.go');
const gameCatalogSource = read('backend/pkg/game/game_catalog.go');
const settlementGeometry = isoGeometrySource.match(/SETTLEMENT_WORLD_GEOMETRY[\s\S]*?gridWidth:\s*(\d+),[\s\S]*?gridHeight:\s*(\d+),/);
const arenaGeometry = isoGeometrySource.match(/ISO_ARENA_GEOMETRY[\s\S]*?gridWidth:\s*(\d+),[\s\S]*?gridHeight:\s*(\d+),/);
const frontendWidth = Number(settlementGeometry?.[1] || 0);
const frontendHeight = Number(settlementGeometry?.[2] || 0);
const arenaWidth = Number(arenaGeometry?.[1] || 0);
const arenaHeight = Number(arenaGeometry?.[2] || 0);
const backendWidth = Number(backendLayoutSource.match(/CampGridWidth\s*=\s*(\d+)/)?.[1] || 0);
const backendHeight = Number(backendLayoutSource.match(/CampGridHeight\s*=\s*(\d+)/)?.[1] || 0);
const backendLayoutVersion = Number(backendLayoutSource.match(/CampLayoutVersion\s*=\s*(\d+)/)?.[1] || 0);
if (frontendWidth !== backendWidth || frontendHeight !== backendHeight) {
  errors.push(`Mundo fallback do assentamento divergente entre frontend (${frontendWidth}x${frontendHeight}) e backend (${backendWidth}x${backendHeight})`);
}
if (backendWidth !== 52 || backendHeight !== 38) {
  errors.push(`Layout V5 deveria usar mundo máximo 52x38; encontrado ${backendWidth}x${backendHeight}`);
}
if (arenaWidth !== 24 || arenaHeight !== 18) {
  errors.push(`Arena de combate deve permanecer 24x18; encontrado ${arenaWidth}x${arenaHeight}`);
}
if (backendLayoutVersion !== 5) {
  errors.push(`CampLayoutVersion deveria ser 5; encontrado ${backendLayoutVersion}`);
}
if (!gameCatalogSource.includes('SettlementTerritory') || !gameCatalogSource.includes('CurrentSettlementTerritoryContract()')) {
  errors.push('GameCatalog não expõe o contrato territorial autoritativo');
}
if (!layoutSource.includes('configureSettlementTerritoryContract') || layoutSource.includes('export const SettlementStageBounds')) {
  errors.push('Frontend ainda mantém bounds territoriais manuais em vez de consumir o contrato');
}

const expectedStageSizes = {
  camp: [24, 18],
  outpost: [28, 20],
  hamlet: [32, 22],
  village: [36, 24],
  city: [40, 28],
  kingdom: [52, 38],
};
for (const [stage, [width, height]] of Object.entries(expectedStageSizes)) {
  const pattern = new RegExp(`Key: SettlementStage${stage === 'camp' ? 'Camp' : stage[0].toUpperCase() + stage.slice(1)}[\\s\\S]*?TerritoryWidth: ${width}, TerritoryHeight: ${height}`);
  if (!pattern.test(settlementSource)) errors.push(`Dimensão territorial backend ausente/divergente para ${stage}: esperado ${width}x${height}`);
}

const summary = {
  registeredResources: resourceKeys.size,
  monsterProfiles: profileKeys.size,
  campBuildings: buildingKeys.size,
  renderedBuildings: rendererFiles.length,
  layoutSlots: requiredSlots.length,
  arenaGrid: `${arenaWidth}x${arenaHeight}`,
  settlementWorld: `${frontendWidth}x${frontendHeight}`,
  settlementStages: Object.keys(expectedStageSizes).length,
  layoutVersion: backendLayoutVersion,
  errors: errors.length,
};

console.log(JSON.stringify(summary, null, 2));

if (errors.length > 0) {
  errors.forEach((err) => console.error(`- ${err}`));
  process.exitCode = 1;
} else {
  console.log('Camp Content Audit OK: conteúdo, arena 24x18 e território V5 52x38 estão íntegros.');
}