import type { BuildingDefinition } from '../../game/GameCatalog';
import type { CampState, SettlementState } from '../../hooks/useGameSocket';
import { formatBuildingEffect } from '../../game/camp/BuildingDefensePresentation';
import type { KingdomCommandSection } from '../../game/camp/BuildingInteractionRegistry';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  section: KingdomCommandSection;
  camp: CampState | null;
  settlement: SettlementState | null;
  buildingDefinitions: BuildingDefinition[];
}

const labels: Record<KingdomCommandSection, string> = {
  overview: 'Visão Geral',
  fortifications: 'Fortificações',
  garrison: 'Guarnição',
  protection: 'Proteção Econômica',
  recovery: 'Enfermaria & Recuperação',
  captives: 'Cárcere',
  engineering: 'Engenharia',
  intelligence: 'Inteligência',
  arcane: 'Defesa Arcana',
};

const sectionBuildings: Record<KingdomCommandSection, string[]> = {
  overview: ['war_room', 'wall', 'gate', 'barracks', 'watchtower', 'vault', 'infirmary', 'engineer_workshop', 'resonator'],
  fortifications: ['wall', 'gate'],
  garrison: ['barracks'],
  protection: ['vault'],
  recovery: ['infirmary'],
  captives: ['prison'],
  engineering: ['engineer_workshop'],
  intelligence: ['watchtower'],
  arcane: ['resonator'],
};

function stageLabel(stage?: string) {
  return ({ camp: 'Acampamento', outpost: 'Posto', hamlet: 'Vilarejo', village: 'Vila', city: 'Cidade', kingdom: 'Reino' } as Record<string, string>)[stage || ''] || stage || '—';
}

export function KingdomCommandCenterModal({ isOpen, onClose, section, camp, settlement, buildingDefinitions }: Props) {
  if (!isOpen) return null;
  const slots = Object.values(camp?.buildings || {});
  const keys = new Set(sectionBuildings[section]);
  const buildings = buildingDefinitions.filter((definition) => keys.has(definition.key));

  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-amber-500/45 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 bg-slate-900/90 p-4">
          <div>
            <div className="font-pixel-heading text-xs text-amber-300">🗺️ Centro de Comando do Reino</div>
            <div className="mt-1 text-[10px] text-slate-400">{labels[section]} · {stageLabel(settlement?.stage_key)}</div>
          </div>
          <button type="button" onClick={onClose} className="pixel-btn pixel-btn-crimson px-2 py-1 text-[10px]">✕</button>
        </div>

        <div className="max-h-[72vh] space-y-3 overflow-y-auto p-4">
          <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/15 p-3 text-[10px] leading-relaxed text-cyan-100">
            A M5-B.1 centraliza a navegação das estruturas do Reino. <strong>A M5-C</strong> transformará estes dados em Defense Power, prontidão, guarnição, reparos, ferimentos e snapshot defensivo. Scouting continua na M6 e raids reais na M7.
          </div>

          {buildings.map((definition) => {
            const slot = slots.find((candidate) => candidate.building_key === definition.key);
            const level = slot?.level || 0;
            const levelDef = level > 0 ? definition.levels[level - 1] : undefined;
            return (
              <article key={definition.key} className="rounded-xl border border-slate-800 bg-slate-900/65 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-pixel-heading text-[10px] text-amber-200">{definition.icon} {definition.name}</div>
                  <div className="text-[9px] text-slate-400">Nv. {level}/{definition.max_level}</div>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{definition.description}</p>
                {levelDef?.effects?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {levelDef.effects.map((effect) => (
                      <span key={effect.key} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[9px] text-emerald-200">
                        {formatBuildingEffect(effect.key, effect.value)}
                      </span>
                    ))}
                  </div>
                ) : <div className="mt-2 text-[9px] text-slate-600">Ainda não construída.</div>}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
