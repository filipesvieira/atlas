import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

type PvPAdminTelemetry = {
  captured_at: string;
  queue: { casual_queued: number; ranked_queued: number };
  matches: { ready: number; active: number; completed_last_24h: number; ranked_last_24h: number; forfeits_last_24h: number; disconnects_last_24h: number; average_duration_seconds: number };
  integrity: { open_flags: number; critical_flags: number };
  recent_matches: Array<{ id: string; participants: string; status: string; ranked: boolean; completion_reason: string; duration_seconds: number; disconnects: number; forfeit_requested: boolean; winner_name?: string }>;
};

type PvPAdminMatchDetail = {
  id: string;
  status: string;
  origin: string;
  ranked: boolean;
  completion_reason: string;
  winner_name?: string;
  duration_seconds: number;
  participants: Array<{
    character_id: string;
    name: string;
    archetype: string;
    strategy: string;
    combat_power: number;
    is_winner: boolean;
    metrics: {
      damage_dealt: number; damage_taken: number; healing_done: number;
      basic_attacks: number; skills_used: number; critical_hits: number;
      movement_ticks: number; chase_ticks: number; kite_ticks: number;
      first_contact_tick?: number; damage_before_contact: number;
    };
  }>;
  skills: Array<{ character_id: string; name: string; skill_key: string; casts: number }>;
  events: Array<{ sequence: number; kind: string; source_name?: string; target_name?: string; skill_key?: string; amount?: number; critical?: boolean; healing?: boolean; tick?: number; created_at: string }>;
};

interface Props { isOpen: boolean; token: string; onClose: () => void; }

const statusLabel = (status: string) => ({ ready: 'Preparação', active: 'Em combate', completed: 'Concluída', cancelled: 'Cancelada' }[status] || status);

// Painel de operação local: inspirado em dashboards de observabilidade, mas
// aplicado ao vocabulário e à identidade pixelada do Reino do Avesso.
export function PvPObservabilityModal({ isOpen, token, onClose }: Props) {
  const [data, setData] = useState<PvPAdminTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<PvPAdminMatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/pvp-telemetry`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Falha ao carregar telemetria PvP');
      setData(body);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar telemetria PvP');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (matchID: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/pvp-telemetry/${matchID}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Falha ao carregar a auditoria da partida');
      setDetail(body);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar a auditoria da partida');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [isOpen, token]);

  if (!isOpen) return null;
  const metrics = data ? [
    ['⚔️ Combates ativos', data.matches.active, 'text-emerald-300'],
    ['⏳ Em preparação', data.matches.ready, 'text-amber-300'],
    ['🏆 Ranqueadas 24h', data.matches.ranked_last_24h, 'text-violet-300'],
    ['📦 Fila casual/ranked', `${data.queue.casual_queued} / ${data.queue.ranked_queued}`, 'text-cyan-300'],
    ['⌛ Duração média', `${data.matches.average_duration_seconds}s`, 'text-slate-200'],
    ['🔌 Desconexões 24h', data.matches.disconnects_last_24h, data.matches.disconnects_last_24h > 0 ? 'text-rose-300' : 'text-emerald-300'],
    ['🏳️ Forfeits 24h', data.matches.forfeits_last_24h, data.matches.forfeits_last_24h > 0 ? 'text-amber-300' : 'text-emerald-300'],
    ['🚨 Flags abertas', data.integrity.open_flags, data.integrity.open_flags > 0 ? 'text-rose-300' : 'text-emerald-300'],
  ] : [];

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Observabilidade PvP">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border-2 border-fuchsia-600/70 bg-slate-950 p-4 shadow-[0_0_36px_rgba(217,70,239,0.25)] sm:p-5">
        <header className="flex items-start justify-between gap-4 border-b border-fuchsia-900/70 pb-3">
          <div><h2 className="font-pixel-heading text-sm text-fuchsia-200">📡 Observatório PvP · QA</h2><p className="mt-1 text-[10px] text-slate-400">Leitura autoritativa do servidor · atualização automática a cada 5 segundos.</p></div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => void load()} className="pixel-btn pixel-btn-dark px-2 py-1 text-[9px]" disabled={loading}>↻ Atualizar</button><button type="button" onClick={onClose} className="pixel-btn pixel-btn-crimson px-2 py-1 text-[9px]">✕ Fechar</button></div>
        </header>
        {error && <div className="pixel-alert-frame pixel-alert-critical mt-4 rounded p-3 text-xs text-rose-200">⚠️ {error}</div>}
        {!data && !error && <div className="py-14 text-center font-pixel-heading text-xs text-slate-500">Lendo sinais da arena…</div>}
        {data && <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{metrics.map(([label, value, color]) => <div key={String(label)} className="rounded border border-slate-700 bg-slate-900/65 p-2.5"><div className="text-[9px] text-slate-500">{label}</div><div className={`mt-1 font-pixel-heading text-sm ${color}`}>{String(value)}</div></div>)}</div>
          <section className={`mt-4 rounded border p-3 ${data.integrity.critical_flags > 0 ? 'pixel-alert-frame pixel-alert-critical border-rose-500/70 bg-rose-950/25' : 'border-emerald-800/60 bg-emerald-950/10'}`}><div className="font-pixel-heading text-[10px] text-slate-200">🛡️ Integridade competitiva</div><p className="mt-1 text-[10px] text-slate-400">{data.integrity.open_flags === 0 ? 'Nenhum sinal de integridade pendente na temporada atual.' : `${data.integrity.open_flags} sinal(is) aguardam análise; ${data.integrity.critical_flags} com severidade alta.`}</p></section>
          <section className="mt-4 overflow-hidden rounded border border-slate-700 bg-slate-900/35"><div className="border-b border-slate-800 px-3 py-2"><h3 className="font-pixel-heading text-[10px] text-cyan-300">📜 Últimas partidas</h3><p className="mt-1 text-[9px] text-slate-500">Clique em uma linha para abrir a auditoria e o replay de eventos.</p></div>{data.recent_matches.length === 0 ? <div className="px-3 py-8 text-center text-[10px] text-slate-500">Ainda não há partidas registradas.</div> : <div className="divide-y divide-slate-800">{data.recent_matches.map((match) => <button key={match.id} type="button" onClick={() => void loadDetail(match.id)} className="grid w-full gap-1 px-3 py-2 text-left text-[10px] transition hover:bg-fuchsia-950/25 sm:grid-cols-[1.5fr_auto_auto_auto] sm:items-center sm:gap-3"><div><span className="text-slate-200">{match.participants}</span><span className="ml-2 text-slate-600">{match.ranked ? 'Ranqueada' : 'Casual'}</span>{match.winner_name && <span className="ml-2 text-amber-300">🏆 {match.winner_name}</span>}</div><span className={match.status === 'active' ? 'text-emerald-300' : 'text-slate-400'}>{statusLabel(match.status)}</span><span className="text-slate-500">{match.duration_seconds}s · {match.disconnects} descon.</span><span className={match.forfeit_requested ? 'text-amber-300' : 'text-slate-600'}>{match.forfeit_requested ? 'Forfeit solicitado' : match.completion_reason}</span></button>)}</div>}</section>
          {(detailLoading || detail) && <MatchDetail detail={detail} loading={detailLoading} onClose={() => setDetail(null)} />}
        </>}
      </section>
    </div>
  );
}

function MatchDetail({ detail, loading, onClose }: { detail: PvPAdminMatchDetail | null; loading: boolean; onClose: () => void }) {
  if (loading) return <div className="mt-4 rounded border border-cyan-700/60 bg-cyan-950/15 p-5 text-center font-pixel-heading text-[10px] text-cyan-200">Consultando replay autoritativo…</div>;
  if (!detail) return null;
  const metricCards = (metrics: PvPAdminMatchDetail['participants'][number]['metrics']) => [
    ['Dano', metrics.damage_dealt], ['Recebido', metrics.damage_taken], ['Cura', metrics.healing_done], ['Skills', metrics.skills_used], ['Básicos', metrics.basic_attacks], ['Críticos', metrics.critical_hits], ['Movimento', metrics.movement_ticks], ['Persegue', metrics.chase_ticks], ['Fuga', metrics.kite_ticks], ['Dano antes do contato', metrics.damage_before_contact],
  ];
  return <section className="mt-4 rounded-lg border-2 border-cyan-500/60 bg-slate-950 p-3 shadow-[0_0_20px_rgba(34,211,238,0.12)]"><div className="flex items-start justify-between gap-3"><div><h3 className="font-pixel-heading text-[11px] text-cyan-200">🔎 Auditoria da batalha</h3><p className="mt-1 text-[9px] text-slate-500">{detail.ranked ? 'Ranqueada' : 'Casual'} · {detail.duration_seconds}s · {detail.completion_reason}</p></div><button type="button" onClick={onClose} className="text-slate-500 hover:text-white">×</button></div><div className="mt-3 rounded border border-amber-700/50 bg-amber-950/20 px-3 py-2 text-[10px] text-amber-100">{detail.winner_name ? <>🏆 Vencedor: <strong>{detail.winner_name}</strong></> : '⚖️ Partida sem vencedor: empate, cancelamento ou resultado ainda em processamento.'}</div><div className="mt-3 grid gap-2 lg:grid-cols-2">{detail.participants.map((participant) => <div key={participant.character_id} className={`rounded border p-3 ${participant.is_winner ? 'border-amber-500/70 bg-amber-950/15' : 'border-slate-700 bg-slate-900/45'}`}><div className="flex items-center justify-between"><span className="font-pixel-heading text-[10px] text-slate-100">{participant.is_winner && '🏆 '}{participant.name}</span><span className="text-[9px] text-slate-500">{participant.archetype} · {participant.strategy}</span></div><div className="mt-1 text-[9px] text-slate-500">Poder de combate {participant.combat_power}</div><div className="mt-3 grid grid-cols-2 gap-1">{metricCards(participant.metrics).map(([label, value]) => <div key={String(label)} className="flex justify-between rounded bg-slate-950/70 px-2 py-1 text-[9px]"><span className="text-slate-500">{label}</span><span className="text-cyan-200">{value}</span></div>)}</div></div>)}</div><div className="mt-3 grid gap-3 lg:grid-cols-2"><div className="rounded border border-slate-700 bg-slate-900/35 p-3"><h4 className="font-pixel-heading text-[10px] text-violet-200">✨ Skills lançadas</h4>{detail.skills.length === 0 ? <p className="mt-2 text-[9px] text-slate-500">Nenhuma skill registrada nesta partida.</p> : <div className="mt-2 space-y-1">{detail.skills.map((skill) => <div key={`${skill.character_id}:${skill.skill_key}`} className="flex justify-between text-[9px]"><span className="text-slate-300">{skill.name} · {skill.skill_key}</span><span className="text-violet-300">{skill.casts}x</span></div>)}</div>}</div><div className="rounded border border-slate-700 bg-slate-900/35 p-3"><h4 className="font-pixel-heading text-[10px] text-cyan-200">📼 Replay de eventos</h4><p className="mt-1 text-[9px] text-slate-500">Últimos 80 eventos persistidos; posições por tick ainda não são arquivadas.</p><div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">{detail.events.map((event) => <div key={event.sequence} className="border-b border-slate-800 pb-1 text-[9px] text-slate-400"><span className="text-slate-600">#{event.sequence} t{event.tick || '-'}</span> <span className="text-cyan-200">{event.kind}</span>{event.source_name && <> · {event.source_name}</>}{event.skill_key && <> · <span className="text-violet-300">{event.skill_key}</span></>}{event.amount ? <> · {event.healing ? '+' : '-'}{event.amount}</> : null}{event.critical && <span className="ml-1 text-amber-300">CRIT</span>}</div>)}</div></div></div></section>;
}
