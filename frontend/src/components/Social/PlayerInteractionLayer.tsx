import { useEffect, useMemo, useState } from 'react';
import type {
  DuelChallenge,
  PvPLadderEntry,
  PvPMatchHistoryEntry,
  PvPMatchNotice,
  PvPMatchReplay,
  PvPMatchmakingStatus,
  PvPCombatSnapshot,
  PvPSeasonStatus,
  PvPTacticalStrategy,
} from '../../hooks/useGameSocket';

interface Props {
  pendingDuelChallenges: DuelChallenge[];
  pvpMatchNotice: PvPMatchNotice | null;
  pvpArenaWaiting: boolean;
  matchmaking: PvPMatchmakingStatus;
  season: PvPSeasonStatus | null;
  ladder: PvPLadderEntry[];
  history: PvPMatchHistoryEntry[];
  replay: PvPMatchReplay | null;
  onRespondDuelChallenge: (id: string, accept: boolean) => void;
  onConfirmPvPMatch: (id: string, strategy: PvPTacticalStrategy) => void;
  onJoinQueue: (strategy: PvPTacticalStrategy) => void;
  onLeaveQueue: () => void;
  onJoinRanked: (strategy: PvPTacticalStrategy) => void;
  onLeaveRanked: () => void;
  onRequestSeason: () => void;
  onRequestLadder: () => void;
  onClaimSeasonRewards: () => void;
  onRequestHistory: () => void;
  onRequestReplay: (matchId: string) => void;
  onClearReplay: () => void;
  arenaRequest?: number;
  pvpCombat?: PvPCombatSnapshot | null;
}

type ArenaTab = 'casual' | 'ranked' | 'history';

const strategies: Array<[PvPTacticalStrategy, string, string]> = [
  ['aggressive', '🔥 Agressiva', 'Pressiona e aceita lutar mais perto.'],
  ['balanced', '⚖️ Equilibrada', 'Spacing e rotação neutros.'],
  ['defensive', '🛡️ Defensiva', 'Prioriza zona segura e sustain.'],
];

function formatRemaining(until?: string): string {
  if (!until) return '—';
  const ms = new Date(until).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 'encerrando';
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return days > 0 ? `${days}d ${hours}h` : `${Math.max(1, hours)}h`;
}

function StrategySelector({
  strategy,
  disabled,
  onChange,
  compact = false,
}: {
  strategy: PvPTacticalStrategy;
  disabled?: boolean;
  onChange: (strategy: PvPTacticalStrategy) => void;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {strategies.map(([key, label, description]) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(key)}
          className={`rounded-lg border text-left transition-colors disabled:opacity-50 ${compact ? 'px-2 py-2' : 'p-3'} ${
            strategy === key
              ? 'border-violet-400 bg-violet-900/50'
              : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'
          }`}
        >
          <div className="text-[10px] text-slate-100">{label}</div>
          {!compact && <div className="mt-1 text-[9px] leading-relaxed text-slate-500">{description}</div>}
        </button>
      ))}
    </div>
  );
}

export function PlayerInteractionLayer(props: Props) {
  const [strategy, setStrategy] = useState<PvPTacticalStrategy>('balanced');
  const [arenaHubOpen, setArenaHubOpen] = useState(false);
  const [arenaTab, setArenaTab] = useState<ArenaTab>('ranked');
  const challenge = props.pendingDuelChallenges[0];
  const extraChallenges = Math.max(0, props.pendingDuelChallenges.length - 1);
  const queuedCasual = props.matchmaking.queued && props.matchmaking.queue_mode !== 'ranked';
  const queuedRanked = props.matchmaking.queued && props.matchmaking.queue_mode === 'ranked';

  useEffect(() => {
    const saved = props.pvpMatchNotice?.tactical_strategy;
    if (saved === 'aggressive' || saved === 'balanced' || saved === 'defensive') setStrategy(saved);
  }, [props.pvpMatchNotice?.id, props.pvpMatchNotice?.tactical_strategy]);

  useEffect(() => {
    if (!arenaHubOpen) return;
    props.onRequestHistory();
    props.onRequestSeason();
    props.onRequestLadder();
  }, [arenaHubOpen]);

  useEffect(() => {
    if (props.arenaRequest && props.arenaRequest > 0) setArenaHubOpen(true);
  }, [props.arenaRequest]);

  // A Central da Arena é somente a preparação da partida. Assim que o
  // servidor confirma o combate, ela não deve bloquear a visualização do duelo.
  useEffect(() => {
    if (props.pvpCombat?.status === 'active') setArenaHubOpen(false);
  }, [props.pvpCombat?.match_id, props.pvpCombat?.status]);

  const rankedProfile = props.season?.profile;
  const pendingRewards = props.season?.pending_rewards ?? [];
  const seasonLabel = props.season ? `${props.season.season.name} · ${formatRemaining(props.season.season.ends_at)}` : 'Carregando temporada...';
  const placementProgress = rankedProfile ? Math.min(5, rankedProfile.placements_played) : 0;
  const ladderRows = useMemo(() => props.ladder.slice(0, 50), [props.ladder]);

  return (
    <>
      {challenge && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-amber-500/70 bg-slate-950 p-5 shadow-2xl">
            <div className="font-pixel-heading text-sm text-amber-300">⚔️ Desafio de duelo</div>
            <div className="mt-3 text-sm text-slate-200">
              <strong>{challenge.challenger.name}</strong> (Lv.{challenge.challenger.level}) desafiou você.
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Rating {challenge.challenger.rating}. Duelo amistoso: nenhum item, ouro ou recurso fica em risco.
            </div>
            {extraChallenges > 0 && (
              <div className="mt-2 text-[10px] text-amber-200/70">+{extraChallenges} convite(s) aguardando atrás deste.</div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => props.onRespondDuelChallenge(challenge.id, false)} className="pixel-btn pixel-btn-dark py-2 text-xs">Recusar</button>
              <button type="button" onClick={() => props.onRespondDuelChallenge(challenge.id, true)} className="pixel-btn pixel-btn-gold py-2 text-xs">Aceitar duelo</button>
            </div>
          </div>
        </div>
      )}

      {props.pvpMatchNotice?.status === 'ready' && !challenge && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-xl border bg-slate-950 p-5 shadow-2xl ${props.pvpMatchNotice.ranked ? 'border-amber-400/80' : 'border-violet-500/70'}`}>
            <div className={`font-pixel-heading text-sm ${props.pvpMatchNotice.ranked ? 'text-amber-300' : 'text-violet-300'}`}>
              {props.pvpMatchNotice.ranked ? '🏆 Partida ranqueada encontrada' : '🏟️ Arena preparada'}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              O servidor selou os atributos desta partida. Escolha a estratégia antes de confirmar.
            </div>
            {props.pvpMatchNotice.ranked && (
              <div className="mt-2 rounded border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-[10px] text-amber-200/80">
                Esta partida afeta rating sazonal e honra. Repetições contra o mesmo oponente possuem retorno decrescente.
              </div>
            )}
            <div className="mt-4"><StrategySelector strategy={strategy} disabled={props.pvpArenaWaiting} onChange={setStrategy} /></div>
            <button
              type="button"
              disabled={props.pvpArenaWaiting}
              onClick={() => props.onConfirmPvPMatch(props.pvpMatchNotice!.id, strategy)}
              className={`${props.pvpMatchNotice.ranked ? 'pixel-btn pixel-btn-gold' : 'pixel-btn pixel-btn-purple'} mt-4 w-full py-2 text-xs disabled:opacity-50`}
            >
              {props.pvpArenaWaiting ? '⏳ Aguardando oponente' : '⚔️ Confirmar entrada'}
            </button>
          </div>
        </div>
      )}

      {arenaHubOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-violet-700/70 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-pixel-heading text-sm text-violet-300">⚔️ Central da Arena</div>
                <div className="mt-1 text-xs text-slate-500">Casual, Ranqueada e histórico em um único lugar.</div>
              </div>
              <button type="button" onClick={() => setArenaHubOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="mt-4 flex gap-2 border-b border-slate-800">
              {([['casual', 'Casual'], ['ranked', '🏆 Ranqueada'], ['history', 'Histórico']] as Array<[ArenaTab, string]>).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setArenaTab(key)}
                  className={`border-b-2 px-3 py-2 font-pixel-heading text-[9px] ${arenaTab === key ? 'border-violet-400 text-violet-200' : 'border-transparent text-slate-500'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {arenaTab === 'casual' && (
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <div className="font-pixel-heading text-[11px] text-cyan-300">Arena casual</div>
                <div className="mt-1 text-[10px] text-slate-500">Matchmaking por MMR geral + Combat Power. Não altera a temporada ranqueada.</div>
                <div className="mt-3 text-xs text-slate-300">
                  {queuedCasual ? `Buscando adversário · Rating ${props.matchmaking.rating} · Poder ${props.matchmaking.combat_power}` : 'Você não está na fila casual.'}
                </div>
                <div className="mt-3"><StrategySelector strategy={strategy} disabled={props.matchmaking.queued} onChange={setStrategy} compact /></div>
                {queuedCasual ? (
                  <button type="button" onClick={props.onLeaveQueue} className="pixel-btn pixel-btn-dark mt-3 w-full py-2 text-xs">Sair da fila</button>
                ) : (
                  <button type="button" disabled={props.matchmaking.queued} onClick={() => props.onJoinQueue(strategy)} className="pixel-btn pixel-btn-purple mt-3 w-full py-2 text-xs disabled:opacity-40">Buscar partida casual</button>
                )}
              </div>
            )}

            {arenaTab === 'ranked' && (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-amber-700/50 bg-amber-950/15 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-pixel-heading text-[11px] text-amber-300">{seasonLabel}</div>
                      <div className="mt-1 text-[10px] text-slate-500">Apenas matchmaking ranqueado conta para esta classificação.</div>
                    </div>
                    {rankedProfile && (
                      <div className="text-right">
                        <div className="font-pixel-heading text-[11px] text-amber-100">{rankedProfile.tier.icon} {rankedProfile.tier.name}</div>
                        <div className="mt-1 text-[10px] text-slate-400">Rating {rankedProfile.rating} · Honra {rankedProfile.honor}</div>
                      </div>
                    )}
                  </div>
                  {rankedProfile && rankedProfile.placements_played < 5 && (
                    <div className="mt-3 rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] text-slate-400">
                      Posicionamento: {placementProgress}/5 partidas. Seu tier aparece na ladder após concluir os placements.
                    </div>
                  )}
                  <div className="mt-3 text-xs text-slate-300">
                    {queuedRanked ? `Na fila ranqueada · Rating ${props.matchmaking.rating} · Poder ${props.matchmaking.combat_power}` : 'Você não está na fila ranqueada.'}
                  </div>
                  <div className="mt-3"><StrategySelector strategy={strategy} disabled={props.matchmaking.queued} onChange={setStrategy} compact /></div>
                  {queuedRanked ? (
                    <button type="button" onClick={props.onLeaveRanked} className="pixel-btn pixel-btn-dark mt-3 w-full py-2 text-xs">Sair da fila ranqueada</button>
                  ) : (
                    <button type="button" disabled={props.matchmaking.queued} onClick={() => props.onJoinRanked(strategy)} className="pixel-btn pixel-btn-gold mt-3 w-full py-2 text-xs disabled:opacity-40">🏆 Buscar partida ranqueada</button>
                  )}
                </div>

                {pendingRewards.length > 0 && (
                  <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/20 p-4">
                    <div className="font-pixel-heading text-[10px] text-emerald-300">🎁 Recompensas de temporada</div>
                    <div className="mt-1 text-[10px] text-slate-400">{pendingRewards.length} pacote(s) aguardando resgate.</div>
                    <button type="button" onClick={props.onClaimSeasonRewards} className="pixel-btn pixel-btn-emerald mt-3 w-full py-2 text-[10px]">Resgatar recompensas</button>
                  </div>
                )}

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-pixel-heading text-[10px] text-amber-300">🏆 Top da temporada</div>
                    <button type="button" onClick={props.onRequestLadder} className="text-[9px] text-cyan-300 hover:underline">Atualizar</button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {ladderRows.length === 0 ? (
                      <div className="py-4 text-center text-[10px] leading-relaxed text-slate-500">
                        {rankedProfile && rankedProfile.placements_played < 5
                          ? `Seu posicionamento está em ${placementProgress}/5. A ladder só exibe quem concluiu 5 partidas ranqueadas.`
                          : 'A ladder ainda não possui jogadores posicionados. Duelos e partidas casuais não contam para a temporada.'}
                      </div>
                    ) : ladderRows.map((entry) => (
                      <div key={entry.character_id} className="grid grid-cols-[36px_1fr_auto] items-center gap-2 rounded bg-slate-950/60 px-2 py-1.5 text-[10px]">
                        <span className="font-pixel-heading text-amber-300">#{entry.rank}</span>
                        <span className="text-slate-300">{entry.tier.icon} {entry.name} <span className="text-slate-600">Lv.{entry.level}</span></span>
                        <span className="text-slate-500">{entry.rating} · H {entry.honor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {arenaTab === 'history' && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="font-pixel-heading text-[11px] text-amber-300">Histórico recente</div>
                  <button type="button" onClick={props.onRequestHistory} className="text-[9px] text-cyan-300 hover:underline">Atualizar</button>
                </div>
                <div className="mt-2 space-y-2">
                  {props.history.length === 0 ? (
                    <div className="text-xs text-slate-600">Nenhuma partida concluída.</div>
                  ) : props.history.map((entry) => (
                    <button key={entry.match_id} type="button" onClick={() => props.onRequestReplay(entry.match_id)} className="flex w-full items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/60 p-2 text-left text-[10px] hover:border-slate-600">
                      <span>
                        <strong className={entry.result === 'win' ? 'text-emerald-300' : entry.result === 'loss' ? 'text-rose-300' : 'text-amber-300'}>
                          {entry.result === 'win' ? 'Vitória' : entry.result === 'loss' ? 'Derrota' : 'Empate'}
                        </strong>{' '}
                        vs {entry.opponent_name}
                        {entry.origin === 'ranked_matchmaking' && <span className="ml-2 text-amber-400">RANQUEADA</span>}
                      </span>
                      <span className="shrink-0 text-right text-slate-500">
                        <span>{entry.rating_delta >= 0 ? '+' : ''}{entry.rating_delta} · CP {entry.combat_power}/{entry.opponent_power}</span>
                        {entry.ranked && <span className="block text-[9px] text-amber-500/80">H +{entry.honor_awarded ?? 0}{(entry.repeat_multiplier ?? 1) < 1 ? ` · retorno ${Math.round((entry.repeat_multiplier ?? 1) * 100)}%` : ''}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {props.replay && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-xl border border-amber-600/60 bg-slate-950 p-4">
            <div className="flex justify-between">
              <div className="font-pixel-heading text-xs text-amber-300">📜 Replay resumido</div>
              <button type="button" onClick={props.onClearReplay}>✕</button>
            </div>
            <div className="mt-3 space-y-1 font-mono text-[10px] text-slate-400">
              {props.replay.events.map((event) => (
                <div key={event.sequence} className="rounded bg-slate-900/60 px-2 py-1">
                  <span className="text-slate-600">#{event.sequence}</span>{' '}
                  <span className="text-cyan-300">{event.event_type}</span>{' '}
                  {JSON.stringify(event.payload)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
