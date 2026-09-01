export const DefenseBuildingKeys = new Set([
  'wall',
  'gate',
  'watchtower',
  'barracks',
  'vault',
  'infirmary',
  'prison',
  'engineer_workshop',
  'war_room',
  'resonator',
]);

export function isDefenseBuilding(buildingKey: string) {
  return DefenseBuildingKeys.has(buildingKey);
}

export function formatBuildingEffect(key: string, val: number) {
  switch (key) {
    case 'camp_hp_regen_percent': return `+${val}% Regen HP no Acampamento`;
    case 'camp_mana_regen_percent': return `+${val}% Regen Mana no Acampamento`;
    case 'camp_all_regen_percent': return `+${val}% Regen HP/MP no Acampamento`;
    case 'resource_storage': return `Armazém aumentado para ${val.toLocaleString()} unidades`;
    case 'salvage_unlock': return 'Reciclagem liberada na Bancada';
    case 'salvage_efficiency_percent': return `+${val}% Rendimento de materiais`;
    case 'salvage_batch_size': return `Lote: até ${val} itens por vez`;
    case 'salvage_success_chance': return `+${val}% Taxa de Sucesso no Desmonte`;
    case 'salvage_safe_mode': return 'Modo Seguro de Desmonte Liberado';
    case 'wall_integrity': return `${val.toLocaleString()} Integridade da Muralha`;
    case 'wall_damage_reduction_percent': return `+${val}% Resistência estrutural da Muralha`;
    case 'watchtower_detection_percent': return `+${val}% Detecção de ameaças`;
    case 'watchtower_warning_seconds': return `+${val}s de alerta antecipado`;
    case 'gate_integrity': return `${val.toLocaleString()} Integridade do Portão`;
    case 'gate_breach_resistance_percent': return `+${val}% Resistência a ruptura`;
    case 'barracks_guard_capacity': return `Capacidade para ${val} guardas`;
    case 'barracks_training_percent': return `+${val}% Eficiência de treinamento`;
    case 'raid_storage_protection_percent': return `+${val}% Proteção futura do Armazém`;
    case 'raid_treasury_protection_percent': return `+${val}% Proteção futura da Tesouraria`;
    case 'defender_recovery_percent': return `+${val}% Recuperação de defensores`;
    case 'resident_injury_reduction_percent': return `-${val}% Risco de ferimentos em moradores`;
    case 'prison_capacity': return `Capacidade futura: ${val} cativo${val === 1 ? '' : 's'}`;
    case 'prison_hold_percent': return `+${val}% Segurança de contenção`;
    case 'fortification_repair_percent': return `+${val}% Eficiência de reparos`;
    case 'defense_trap_slots': return `${val} slot${val === 1 ? '' : 's'} de armadilha defensiva`;
    case 'war_room_command_percent': return `+${val}% Coordenação defensiva`;
    case 'scouting_coordination_percent': return `+${val}% Coordenação de scouting`;
    case 'resonator_shield_percent': return `+${val}% Escudo territorial futuro`;
    case 'resonator_stability_percent': return `+${val}% Estabilidade arcana`;
    default: return `${key}: +${val}`;
  }
}
