import type { BuildingDefinition } from '../../game/GameCatalog';
import type { CampState, SettlementScoutingState, SettlementState, TerritorialMapSnapshot } from '../../hooks/useGameSocket';
import { TerritorialMapPanel } from './TerritorialMapPanel';
import { formatBuildingEffect } from '../../game/camp/BuildingDefensePresentation';
import type { KingdomCommandSection } from '../../game/camp/BuildingInteractionRegistry';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  section: KingdomCommandSection;
  camp: CampState | null;
  settlement: SettlementState | null;
  buildingDefinitions: BuildingDefinition[];
  onUpdateStrategy?: (strategy: 'balanced' | 'aggressive' | 'defensive') => void;
  territorialMap?: TerritorialMapSnapshot | null;
  territorialMapLoading?: boolean;
  territorialMapError?: string | null;
  scouting?: SettlementScoutingState | null;
  scoutingLoading?: boolean;
  scoutingError?: string | null;
  onRequestTerritorialMap?: (radius?: number) => void;
  onRequestScouting?: () => void;
  onStartScouting?: (targetSettlementID: string) => void;
}

const labels: Record<KingdomCommandSection, string> = {
  overview: 'Visão Geral', fortifications: 'Fortificações', garrison: 'Guarnição', protection: 'Proteção Econômica',
  recovery: 'Enfermaria & Recuperação', captives: 'Cárcere', engineering: 'Engenharia', intelligence: 'Inteligência', arcane: 'Defesa Arcana',
};

const sectionBuildings: Record<KingdomCommandSection, string[]> = {
  overview: ['war_room', 'wall', 'gate', 'barracks', 'watchtower', 'vault', 'infirmary', 'engineer_workshop', 'resonator'],
  fortifications: ['wall', 'gate'], garrison: ['barracks'], protection: ['vault'], recovery: ['infirmary'], captives: ['prison'],
  engineering: ['engineer_workshop'], intelligence: ['watchtower'], arcane: ['resonator'],
};

function stageLabel(stage?: string) {
  return ({ camp: 'Acampamento', outpost: 'Posto', hamlet: 'Vilarejo', village: 'Vila', city: 'Cidade', kingdom: 'Reino' } as Record<string, string>)[stage || ''] || stage || '—';
}

function readinessLabel(key?: string) {
  return ({ exposed: 'Exposto', forming: 'Em formação', prepared: 'Preparado', fortified: 'Fortificado' } as Record<string, string>)[key || ''] || 'Em formação';
}

export function KingdomCommandCenterModal({ isOpen, onClose, section, camp, settlement, buildingDefinitions, onUpdateStrategy, territorialMap, territorialMapLoading, territorialMapError, scouting, scoutingLoading, scoutingError, onRequestTerritorialMap, onRequestScouting, onStartScouting }: Props) {
  if (!isOpen) return null;
  const slots = Object.values(camp?.buildings || {});
  const keys = new Set(sectionBuildings[section]);
  const buildings = buildingDefinitions.filter((definition) => keys.has(definition.key));
  const defense = settlement?.defense;
  const readiness = defense?.readiness ?? 0;

  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-amber-500/45 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 bg-slate-900/90 p-4">
          <div>
            <div className="font-pixel-heading text-xs text-amber-300">🗺️ Centro de Comando do Reino</div>
            <div className="mt-1 text-[10px] text-slate-400">{labels[section]} · {stageLabel(settlement?.stage_key)}</div>
          </div>
          <button type="button" onClick={onClose} className="pixel-btn pixel-btn-crimson px-2 py-1 text-[10px]">✕</button>
        </div>

        <div className="max-h-[76vh] space-y-4 overflow-y-auto p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-700/45 bg-amber-950/20 p-3">
              <div className="text-[8px] uppercase tracking-wider text-amber-500">Defense Power</div>
              <div className="mt-1 font-pixel-heading text-lg text-amber-200">{(defense?.defense_power || 0).toLocaleString()}</div>
              <div className="mt-1 text-[9px] text-slate-500">Soma transparente de fortificações, guarnição, vigilância, suporte e defesa arcana.</div>
            </div>
            <div className="rounded-xl border border-emerald-700/45 bg-emerald-950/20 p-3">
              <div className="flex items-center justify-between text-[8px] uppercase tracking-wider text-emerald-400"><span>Prontidão</span><span>{readiness}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-emerald-500" style={{ width: `${readiness}%` }} /></div>
              <div className="mt-2 font-pixel-heading text-[10px] text-emerald-200">{readinessLabel(defense?.readiness_key)}</div>
            </div>
            <div className="rounded-xl border border-cyan-700/45 bg-cyan-950/20 p-3">
              <div className="text-[8px] uppercase tracking-wider text-cyan-400">Snapshot defensivo</div>
              <div className="mt-1 font-pixel-heading text-[10px] text-cyan-100">{defense?.snapshot_ready ? `V${defense.snapshot_version || 1} sincronizado` : 'Aguardando sincronização'}</div>
              <div className="mt-1 text-[9px] text-slate-500">Atualizado automaticamente quando construções, layout ou estratégia mudam.</div>
            </div>
          </div>

          <section className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-pixel-heading text-[10px] text-slate-200">Estratégia defensiva</div>
                <div className="mt-1 text-[9px] text-slate-500">Escolha um perfil simples; não há microgerenciamento de cada guarda.</div>
              </div>
              <div className="flex gap-1">
                {(['balanced','aggressive','defensive'] as const).map((strategy) => (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => onUpdateStrategy?.(strategy)}
                    className={`rounded border px-2 py-1 font-pixel-heading text-[8px] ${defense?.strategy === strategy ? 'border-amber-400 bg-amber-950/40 text-amber-200' : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200'}`}
                  >
                    {strategy === 'balanced' ? '⚖️ Equilibrada' : strategy === 'aggressive' ? '⚔️ Agressiva' : '🛡️ Defensiva'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {section === 'overview' && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/45 p-3">
              <div className="font-pixel-heading text-[10px] text-amber-200">De onde vem sua defesa</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(defense?.components || []).map((component) => (
                  <div key={component.key} className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                    <div className="text-[9px] text-slate-300">{component.icon} {component.name}</div>
                    <div className="mt-1 font-pixel-heading text-[12px] text-cyan-200">{component.score.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === 'overview' && (
            <TerritorialMapPanel
              map={territorialMap || null}
              ownLocation={settlement?.world}
              loading={territorialMapLoading}
              error={territorialMapError}
              scouting={scouting}
              scoutingLoading={scoutingLoading}
              scoutingError={scoutingError}
              onRefresh={onRequestTerritorialMap}
              onRefreshScouting={onRequestScouting}
              onStartScouting={onStartScouting}
            />
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-2 text-[9px] text-slate-300">⚔️ Guarnição: <strong>{defense?.garrison?.active_guards || 0}/{defense?.garrison?.capacity || 0}</strong> guardas automáticos · +{defense?.garrison?.training_percent || 0}% treinamento</div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-2 text-[9px] text-slate-300">🌿 Enfermaria: +{defense?.recovery?.defender_recovery_percent || 0}% recuperação · -{defense?.recovery?.injury_reduction_percent || 0}% risco futuro</div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-2 text-[9px] text-slate-300">⚙️ Engenharia: +{defense?.engineering?.repair_percent || 0}% reparos · {defense?.engineering?.trap_slots || 0} armadilha(s)</div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-2 text-[9px] text-slate-300">🔐 Proteção: {defense?.protection?.storage_percent || 0}% Armazém · {defense?.protection?.treasury_percent || 0}% Tesouraria</div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-2 text-[9px] text-slate-300">💠 Barreira: {defense?.arcane?.shield_percent || 0}% escudo · {defense?.arcane?.stability_percent || 0}% estabilidade</div>
            <div className="rounded-lg border border-rose-900/50 bg-rose-950/15 p-2 text-[9px] text-rose-200">🚫 Raids continuam desligadas. M6 adiciona scouting; M7 ativa invasões.</div>
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
                      <span key={effect.key} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[9px] text-emerald-200">{formatBuildingEffect(effect.key, effect.value)}</span>
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
