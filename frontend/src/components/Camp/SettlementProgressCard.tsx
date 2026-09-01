import type { SettlementState } from '../../hooks/useGameSocket';

const buildingLabels: Record<string, string> = {
  campfire: 'Fogueira', adventurer_hut: 'Cabana', warehouse: 'Armazém', workbench: 'Bancada',
  wall: 'Muralha', watchtower: 'Torre de Vigia', gate: 'Portão', barracks: 'Quartel', vault: 'Cofre', war_room: 'Sala de Guerra',
};

interface Props {
  settlement: SettlementState | null;
  onOpen: () => void;
}

export function SettlementProgressCard({ settlement, onOpen }: Props) {
  const progress = settlement?.stage_progress;
  if (!settlement || !progress) return null;
  const current = progress.current;
  const next = progress.next;
  const percent = next ? Math.max(0, Math.min(100, progress.completion_percent ?? 0)) : 100;
  const unmet = (progress.requirements || []).filter((requirement) => !requirement.met).slice(0, 2);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-amber-700/45 bg-gradient-to-br from-slate-950 via-slate-950 to-amber-950/20 p-2.5 text-left shadow-lg transition hover:border-amber-500/70"
      title="Abrir progresso completo do assentamento"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-pixel-heading text-[10px] text-amber-300">{current.icon} {current.name}</div>
          <div className="mt-1 text-[9px] leading-relaxed text-slate-400">{current.summary}</div>
        </div>
        <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-pixel-heading text-[8px] text-cyan-200">
          {current.territory_width}×{current.territory_height}
        </span>
      </div>

      {next ? (
        <>
          <div className="mt-2 flex items-center justify-between text-[9px]">
            <span className="text-slate-500">Próxima evolução</span>
            <span className="font-pixel-heading text-emerald-300">{next.icon} {next.name}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-amber-500 transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[8px] text-slate-500">
            <span>{progress.completed_requirements ?? 0}/{progress.total_requirements ?? progress.requirements.length} requisitos</span>
            <span>{percent}%</span>
          </div>
          {progress.ready ? (
            <div className="mt-2 rounded border border-emerald-700/60 bg-emerald-950/25 px-2 py-1 text-[9px] text-emerald-200">✓ Requisitos completos. A promoção será conciliada automaticamente.</div>
          ) : unmet.length > 0 ? (
            <div className="mt-2 space-y-0.5 text-[8px] text-slate-500">
              {unmet.map((requirement) => (
                <div key={`${requirement.kind}:${requirement.key}`}>• {requirement.kind === 'building' ? buildingLabels[requirement.key] || requirement.key : requirement.kind === 'population' ? 'População' : 'Prosperidade'}: {requirement.current}/{requirement.required}</div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-2 rounded border border-amber-600/50 bg-amber-950/25 px-2 py-1 text-[9px] text-amber-200">👑 Hierarquia máxima alcançada: Reino.</div>
      )}
    </button>
  );
}
