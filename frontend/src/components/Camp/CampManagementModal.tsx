import React, { useState, useEffect } from 'react';
import { BuildingDefinition, ResourceDefinition } from '../../game/GameCatalog';
import { CampState, BuildingSlot, ResourceAmount, Item } from '../../hooks/useGameSocket';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';
import { BuildingCard } from './BuildingCard';
import { BuildingUpgradeModal } from './BuildingUpgradeModal';
import { SalvageModal } from './SalvageModal';

export interface CampManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const CampManagementModal: React.FC<CampManagementModalProps> = ({
  isOpen,
  onClose,
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

  // Fechar com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedUpgrade) {
          setSelectedUpgrade(null);
        } else if (isSalvageOpen) {
          setIsSalvageOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedUpgrade, isSalvageOpen, onClose]);

  if (!isOpen) return null;

  const slotsMap = camp?.buildings || {};
  const findBuildingSlot = (buildingKey: string, legacySlot?: string) =>
    Object.values(slotsMap).find((slot) => slot.building_key === buildingKey) || (legacySlot ? slotsMap[legacySlot] : undefined);

  // Construções básicas da alpha usam default_unlocked; blueprints continuam
  // habilitando apenas conteúdo especial futuro.
  const discoveredBuildings = buildingDefinitions.filter((bDef) => {
    if (bDef.default_unlocked || bDef.key === 'campfire') return true;
    if (camp?.blueprints && camp.blueprints[bDef.key]) return true;
    const slot = findBuildingSlot(bDef.key, bDef.slot_type);
    if (slot && slot.level > 0) return true;
    return false;
  });

  // Verifica se a bancada está construída (Nv >= 1)
  const workbenchSlot = findBuildingSlot('workbench', 'south');
  const isSalvageUnlocked = Boolean(workbenchSlot && workbenchSlot.level >= 1);
  const workbenchLevel = workbenchSlot?.level || 0;

  // Calcula o bônus de eficiência da bancada com segurança total
  let salvageEfficiency = 0;
  if (isSalvageUnlocked && workbenchSlot && workbenchSlot.level > 0) {
    const wbDef = buildingDefinitions.find((b) => b.key === 'workbench');
    if (wbDef && Array.isArray(wbDef.levels) && workbenchSlot.level <= wbDef.levels.length) {
      const lvlDef = wbDef.levels[workbenchSlot.level - 1];
      if (lvlDef && Array.isArray(lvlDef.effects)) {
        const eff = lvlDef.effects.find(
          (e) => (e as any).key === 'salvage_efficiency_percent' || (e as any).Key === 'salvage_efficiency_percent'
        );
        if (eff) {
          salvageEfficiency = (eff as any).value || (eff as any).Value || 0;
        }
      }
    }
  }

  const activeSlots = camp?.active_construction_slots || 0;
  const maxSlots = camp?.max_construction_slots || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="pixel-card-gold rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-pixel-body">
        {/* Header do Modal */}
        <div className="pixel-card-header pixel-card-header-gold p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 pixel-slot rounded flex items-center justify-center bg-slate-900 border-amber-500/40">
              <PixelItemSprite name="projeto" size="md" />
            </div>
            <div>
              <h2 className="text-sm font-pixel-heading text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span>Gestão do Acampamento</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Aprimore as estruturas do seu refúgio para acelerar regeneração, capacidade e desmontes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Badge de Equipes de Obras */}
            <div
              className="px-3 py-1 rounded pixel-slot text-xs font-pixel-body font-bold bg-slate-950 text-slate-200 flex items-center gap-1.5"
              title={
                activeSlots >= maxSlots
                  ? 'Todas as equipes de obras estão ocupadas no momento'
                  : 'Equipe de obra disponível para iniciar construções'
              }
            >
              <span>Obras:</span>
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
                className="pixel-btn pixel-btn-purple px-3 py-1.5 text-xs font-pixel-heading flex items-center gap-1.5"
              >
                <span>⚒️ Bancada de Desmonte</span>
              </button>
            )}

            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-xs"
              title="Fechar (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo do Modal com as Construções Descobertas */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 px-3 py-2 text-[11px] leading-relaxed text-sky-100">
            🗺️ <strong>Layout livre:</strong> no cenário do acampamento, arraste uma construção descoberta para escolher sua posição. O projeto já ocupa terreno no nível 0, então você pode decidir o local <strong>antes de iniciar a obra</strong> e reorganizá-lo novamente depois de pronto. Obras em andamento ficam travadas até concluir.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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

          {discoveredBuildings.length < buildingDefinitions.length && (
            <div className="p-3 pixel-slot rounded-xl flex items-center gap-3 text-xs text-slate-400 bg-slate-950/80">
              <span className="text-lg">📜</span>
              <span>
                <strong className="text-amber-300">Novos Projetos:</strong> Derrote os chefões das expedições para encontrar Manuais de Construção e desbloquear mais estruturas para o seu acampamento!
              </span>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
          <span>Ouro da Conta: <strong className="text-amber-400 font-pixel-heading font-bold">{(characterGold || 0).toLocaleString()} Gold</strong></span>
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-dark px-4 py-1.5 text-xs font-pixel-heading"
          >
            Voltar ao Jogo
          </button>
        </div>
      </div>

      {/* Modal de Upgrade de Estrutura */}
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