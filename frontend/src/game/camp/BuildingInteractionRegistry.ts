export type BuildingInteractionAction =
  | { kind: 'depot' }
  | { kind: 'camp'; section?: 'buildings' | 'salvage' }
  | { kind: 'economy'; tab: 'work' | 'treasury' | 'ambitions' | 'kitchen' | 'alchemy' | 'crafting' | 'residents' }
  | { kind: 'kingdom'; section: KingdomCommandSection }
  | { kind: 'info' };

export type KingdomCommandSection =
  | 'overview'
  | 'fortifications'
  | 'garrison'
  | 'protection'
  | 'recovery'
  | 'captives'
  | 'engineering'
  | 'intelligence'
  | 'arcane';

const actions: Record<string, BuildingInteractionAction> = {
  campfire: { kind: 'camp', section: 'buildings' },
  adventurer_hut: { kind: 'camp', section: 'buildings' },
  arcane_spring: { kind: 'camp', section: 'buildings' },
  warehouse: { kind: 'depot' },
  workbench: { kind: 'camp', section: 'salvage' },
  kitchen: { kind: 'economy', tab: 'kitchen' },
  alchemy_bench: { kind: 'economy', tab: 'alchemy' },

  wall: { kind: 'kingdom', section: 'fortifications' },
  gate: { kind: 'kingdom', section: 'fortifications' },
  watchtower: { kind: 'kingdom', section: 'intelligence' },
  barracks: { kind: 'kingdom', section: 'garrison' },
  vault: { kind: 'kingdom', section: 'protection' },
  infirmary: { kind: 'kingdom', section: 'recovery' },
  prison: { kind: 'kingdom', section: 'captives' },
  engineer_workshop: { kind: 'kingdom', section: 'engineering' },
  war_room: { kind: 'kingdom', section: 'overview' },
  resonator: { kind: 'kingdom', section: 'arcane' },
};

export function getBuildingInteraction(buildingKey: string): BuildingInteractionAction {
  return actions[buildingKey] || { kind: 'info' };
}

export function buildingInteractionHint(buildingKey: string) {
  const action = getBuildingInteraction(buildingKey);
  switch (action.kind) {
    case 'depot': return 'Clique: abrir Depósito';
    case 'camp': return action.section === 'salvage' ? 'Clique: abrir Bancada de Desmonte' : 'Clique: abrir gestão da construção';
    case 'economy': return `Clique: abrir ${action.tab === 'kitchen' ? 'Cozinha' : action.tab === 'alchemy' ? 'Alquimia' : 'Assentamento'}`;
    case 'kingdom': return 'Clique: abrir Centro de Comando do Reino';
    default: return 'Clique: ver informações';
  }
}
