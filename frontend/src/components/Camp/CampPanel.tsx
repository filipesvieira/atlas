import React, { useState } from 'react';
import { BuildingDefinition, ResourceDefinition } from '../../game/GameCatalog';
import { CampState, BuildingSlot, ResourceAmount, Item } from '../../hooks/useGameSocket';
import { BuildingCard } from './BuildingCard';
import { BuildingUpgradeModal } from './BuildingUpgradeModal';
import { SalvageModal } from './SalvageModal';

interface CampPanelProps {
  camp: CampState | null;
  buildingDefinitions: BuildingDefinition[];
  resourceDefinitions: ResourceDefinition[];
  resources: ResourceAmount[];
  backpack: Item[];
  characterGold: number;
  salvagePreview: { item: Item; yield: ResourceAmount[] } | null;
  onStartUpgrade: (slotKey: string, buildingKey: string) => void;
  onRequestSalvagePreview: (itemId: string) => void;
  onSalvageItem: (itemId: string) => void;
  onSalvageBatch?: (itemIds: string[], safeMode?: boolean) => void;
  onClearSalvagePreview: () => void;
}

export const CampPanel: React.FC<CampPanelProps> = ({
  camp,
  buildingDefinitions,
  resourceDefinitions,
  resources,
  backpack,
  characterGold,
  salvagePreview,
  onStartUpgrade,
  onRequestSalvagePreview,
  onSalvageItem,
  onSalvageBatch,
  onClearSalvagePreview,
}) => {
  const [selectedUpgrade, setSelectedUpgrade] = useState<{
    buildingDef: BuildingDefinition;
    slot: BuildingSlot;
  } | null>(null);

  const [isSalvageOpen, setIsSalvageOpen] = useState(false);

  const slotsMap = camp?.buildings || {};
  const findBuildingSlot = (buildingKey: string, legacySlot?: string) =>
    Object.values(slotsMap).find((slot) => slot.building_key === buildingKey) || (legacySlot ? slotsMap[legacySlot] : undefined);

  // Filtra construções descobertas (Fogueira é base, as demais exigem Blueprint ou nível > 0)
  const discoveredBuildings = buildingDefinitions.filter((bDef) => {
    if (bDef.key === 'campfire') return true;
    if (camp?.blueprints && camp.blueprints[bDef.key]) return true;
    const slot = findBuildingSlot(bDef.key, bDef.slot_type);
    if (slot && slot.level > 0) return true;
    return false;
  });

  // Verifica se a bancada está construída (Nv >= 1)
  const workbenchSlot = findBuildingSlot('workbench', 'south');
  const isSalvageUnlocked = Boolean(workbenchSlot && workbenchSlot.level >= 1);
  const workbenchLevel = workbenchSlot?.level || 0;

  // Calcula o bônus de eficiência da bancada
  let salvageEfficiency = 0;
  if (isSalvageUnlocked && workbenchSlot) {
    const wbDef = buildingDefinitions.find((b) => b.key === 'workbench');
    if (wbDef && workbenchSlot.level <= wbDef.levels.length) {
      const lvlDef = wbDef.levels[workbenchSlot.level - 1];
      const eff = lvlDef.effects.find(
        (e) => (e as any).key === 'salvage_efficiency_percent' || (e as any).Key === 'salvage_efficiency_percent'
      );
      if (eff) {
        salvageEfficiency = (eff as any).value || (eff as any).Value || 0;
      }
    }
  }

  const activeSlots = camp?.active_construction_slots || 0;
  const maxSlots = camp?.max_construction_slots || 1;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-3 font-sans">
      {/* Header do Painel com Indicador de Equipes de Obras */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🏕️</span>
          <h3 className="font-bold text-amber-400 text-xs tracking-wide uppercase">
            Construções & Acampamento
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de Equipes de Obras */}
          <div
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5 shadow-inner"
            title={
              activeSlots >= maxSlots
                ? 'Todas as equipes de obras estão ocupadas'
                : 'Equipe de obra disponível para construir'
            }
          >
            <span>👷 Obras:</span>
            <span
              className={
                activeSlots >= maxSlots
                  ? 'text-amber-400 font-bold'
                  : 'text-emerald-400 font-bold'
              }
            >
              {activeSlots}/{maxSlots}
            </span>
          </div>

          {/* Botão de Desmontagem na Bancada */}
          {isSalvageUnlocked && (
            <button
              onClick={() => setIsSalvageOpen(true)}
              className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>⚒️ Desmontar Itens (Bancada)</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid das Construções Descobertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {discoveredBuildings.map((bDef) => {
          const slot = findBuildingSlot(bDef.key, bDef.slot_type) || {
            slot_key: bDef.key,
            building_key: bDef.key,
            level: 0,
            tile_x: 0,
            tile_y: 0,
            rotation: 0,
            updated_at: new Date().toISOString(),
          };

          return (
            <BuildingCard
              key={bDef.key}
              buildingDef={bDef}
              slot={slot}
              onOpenUpgradeModal={(def, s) => setSelectedUpgrade({ buildingDef: def, slot: s })}
            />
          );
        })}
      </div>

      {/* Modal de Upgrade */}
      {selectedUpgrade && (
        <BuildingUpgradeModal
          isOpen={Boolean(selectedUpgrade)}
          onClose={() => setSelectedUpgrade(null)}
          buildingDef={selectedUpgrade.buildingDef}
          slot={selectedUpgrade.slot}
          allBuildings={slotsMap}
          allBuildingDefs={buildingDefinitions}
          characterGold={characterGold}
          resources={resources}
          definitions={resourceDefinitions}
          onConfirmUpgrade={onStartUpgrade}
        />
      )}

      {/* Modal de Desmontagem na Bancada com Lote e Modo Seguro */}
      <SalvageModal
        isOpen={isSalvageOpen}
        onClose={() => setIsSalvageOpen(false)}
        backpack={backpack}
        salvagePreview={salvagePreview}
        definitions={resourceDefinitions}
        workbenchLevel={workbenchLevel}
        efficiencyPercent={salvageEfficiency}
        storageUsed={camp?.storage_used || 0}
        storageCapacity={camp?.storage_capacity || 500}
        onRequestPreview={onRequestSalvagePreview}
        onSalvageItem={onSalvageItem}
        onSalvageBatch={onSalvageBatch}
        onClearPreview={onClearSalvagePreview}
      />
    </div>
  );
};