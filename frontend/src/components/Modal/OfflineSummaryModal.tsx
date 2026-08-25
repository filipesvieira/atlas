import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';
import { getBagSlotBonus } from '../../game/bagCapacity';

interface OfflineItem {
  id: string;
  name: string;
  rarity: string;
  slot_type?: string;
  item_power?: number;
  value_gold?: number;
}

interface OfflineSummaryData {
  report_id: string;
  period_start: string;
  period_end: string;
  minutes_offline: number;
  region_name: string;
  stage: number;
  final_stage: number;
  is_boss_stage_after: boolean;
  waves_completed: number;
  bosses_defeated: number;
  bosses_rewarded?: number;
  expeditions_completed: number;
  regions_unlocked?: string[];
  kills: number;
  efficiency: number;
  xp_gained: number;
  gold_gained: number;
  converted_gold?: number;
  drops_auto_converted?: number;
  level_before: number;
  level_after: number;
  health_after?: number;
  defeated?: boolean;
  stopped_reason?: string;
  items_found: OfflineItem[];
  items_pending?: OfflineItem[];
  items_converted?: OfflineItem[];
}

interface OfflineSummaryModalProps {
  data: OfflineSummaryData | null;
  onClose: () => void;
}

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleString('pt-BR') : '—';

export function OfflineSummaryModal({ data, onClose }: OfflineSummaryModalProps) {
  if (!data || data.minutes_offline < 3) return null;

  const efficiency = Math.round((data.efficiency ?? 0) * 100);
  const leveledUp = data.level_after > data.level_before;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl pixel-card-gold rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded pixel-slot bg-slate-900 border-amber-500/50 flex items-center justify-center mx-auto mb-2">
            <PixelItemSprite name="projeto" size="md" />
          </div>
          <h3 className="text-base sm:text-lg font-pixel-heading text-amber-400">Relatório de Expedição Offline</h3>
          <p className="text-xs text-slate-400 mt-1 font-pixel-body">
            Snapshot reconciliado da expedição em <strong className="text-amber-300">{data.region_name}</strong>.
          </p>
          <p className="text-[10px] text-slate-600 font-pixel-terminal mt-1">{data.report_id}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pixel-slot rounded-xl p-4 text-xs font-pixel-body mb-4 bg-slate-950/80">
          <div><span className="text-slate-500">Início:</span> <span className="text-slate-300">{formatDate(data.period_start)}</span></div>
          <div><span className="text-slate-500">Fim:</span> <span className="text-slate-300">{formatDate(data.period_end)}</span></div>
          <div><span className="text-slate-500">Tempo:</span> <span className="text-amber-400 font-bold">{data.minutes_offline} min</span></div>
          <div><span className="text-slate-500">Fase:</span> <span className="text-slate-300">{data.stage}/5 → {data.final_stage}/5{data.is_boss_stage_after ? ' (Boss)' : ''}</span></div>
          <div><span className="text-slate-500">Ondas concluídas:</span> <span className="text-slate-300">{data.waves_completed}</span></div>
          <div><span className="text-slate-500">Abates:</span> <span className="text-rose-300 font-bold">{data.kills}</span></div>
          <div><span className="text-slate-500">Chefes derrotados:</span> <span className="text-purple-300 font-bold">{data.bosses_defeated}</span></div>
          <div><span className="text-slate-500">Chefes premiados:</span> <span className="text-amber-300 font-bold">{data.bosses_rewarded ?? data.bosses_defeated}</span></div>
          <div><span className="text-slate-500">Expedições completas:</span> <span className="text-amber-300 font-bold">{data.expeditions_completed}</span></div>
          <div><span className="text-slate-500">Eficiência:</span> <span className="text-cyan-300 font-bold">{efficiency}%</span></div>
        </div>

        <div className="pixel-slot rounded-xl p-4 space-y-2 text-xs font-pixel-body mb-4 bg-slate-950/80">
          <div className="flex justify-between border-b border-slate-800 pb-1.5"><span className="text-slate-400">XP acumulada</span><span className="text-emerald-400 font-bold">+{data.xp_gained}</span></div>
          <div className="flex justify-between border-b border-slate-800 pb-1.5"><span className="text-slate-400">Ouro total</span><span className="text-amber-300 font-bold">+{data.gold_gained}</span></div>
          {(data.converted_gold ?? 0) > 0 && <div className="flex justify-between border-b border-slate-800 pb-1.5"><span className="text-slate-400">Conversão por limite</span><span className="text-amber-200">+{data.converted_gold}</span></div>}
          <div className="flex justify-between"><span className="text-slate-400">Nível</span><span className={leveledUp ? 'text-purple-300 font-bold font-pixel-heading' : 'text-slate-300'}>{data.level_before} → {data.level_after}</span></div>
        </div>

        {(data.regions_unlocked?.length ?? 0) > 0 && (
          <div className="pixel-alert-frame pixel-alert-success mb-4 rounded-lg p-3 text-xs text-emerald-200 font-pixel-body">
            Novas regiões desbloqueadas: <strong>{data.regions_unlocked!.join(', ')}</strong>.
          </div>
        )}

        {data.defeated ? (
          <div className="pixel-alert-frame pixel-alert-critical mb-4 rounded-lg p-3 text-xs text-rose-100 font-pixel-body">
            ☠️ O herói foi derrotado durante a simulação. A onda incompleta não concedeu recompensas, a expedição voltou para a fase 1 e o herói retornou ao acampamento com {data.health_after ?? 0} HP.
          </div>
        ) : data.stopped_reason ? (
          <div className="pixel-alert-frame pixel-alert-warning mb-4 rounded-lg p-3 text-xs text-rose-200 font-pixel-body">
            A eficiência foi limitada por: <strong>{data.stopped_reason.replace(/_/g, ' ')}</strong>.
          </div>
        ) : null}

        {data.items_found?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-pixel-heading text-slate-400 mb-2 uppercase">Itens guardados ({data.items_found.length})</h4>
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {data.items_found.map((item) => (
                <div key={item.id} className="p-2 pixel-slot rounded flex justify-between items-center text-xs font-pixel-body">
                  <div className="flex items-center gap-2">
                    <PixelItemSprite name={item.name} rarity={item.rarity} size="sm" />
                    <span className="font-semibold text-amber-300">{item.name}</span>
                  </div>
                  <span className="text-slate-400">
                    {item.rarity}{item.item_power ? ` • Poder ${item.item_power}` : ''}
                    {item.slot_type === 'bag' ? ` • 🎒 +${getBagSlotBonus(item.rarity)} slots` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data.items_pending?.length ?? 0) > 0 && (
          <div className="pixel-alert-frame pixel-alert-warning mb-4 rounded p-3 text-xs text-amber-200 font-pixel-body">
            📦 {data.items_pending!.length} item(ns) protegido(s) foram enviados à carga segura. Resgate-os na Oficina depois de liberar espaço na mochila.
          </div>
        )}

        {(data.items_converted?.length ?? 0) > 0 && (
          <p className="mb-2 text-xs text-slate-400 font-pixel-body">
            {data.items_converted!.length} item(ns) excedentes foram convertidos automaticamente em ouro por falta de peso ou slots.
          </p>
        )}
        {(data.drops_auto_converted ?? 0) > 0 && (
          <p className="mb-4 text-xs text-slate-400 font-pixel-body">
            {data.drops_auto_converted} drop(s) além do limite do relatório foram convertidos em ouro, sem perda de recompensa.
          </p>
        )}

        <button onClick={onClose} className="w-full py-3 pixel-btn pixel-btn-gold font-pixel-heading text-xs rounded">
          {data.defeated ? 'Voltar ao Acampamento' : 'Continuar Expedição'}
        </button>
      </div>
    </div>
  );
}
