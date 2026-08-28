import { useEffect, useState } from 'react';
import type { DuelChallenge, PvPMatchHistoryEntry, PvPMatchNotice, PvPMatchReplay, PvPMatchmakingStatus, PvPTacticalStrategy } from '../../hooks/useGameSocket';

interface Props {
  pendingDuelChallenges: DuelChallenge[];
  pvpMatchNotice: PvPMatchNotice | null;
  pvpArenaWaiting: boolean;
  matchmaking: PvPMatchmakingStatus;
  history: PvPMatchHistoryEntry[];
  replay: PvPMatchReplay | null;
  onRespondDuelChallenge:(id:string,accept:boolean)=>void;
  onConfirmPvPMatch:(id:string,strategy:PvPTacticalStrategy)=>void;
  onJoinQueue:(strategy:PvPTacticalStrategy)=>void;
  onLeaveQueue:()=>void;
  onRequestHistory:()=>void;
  onRequestReplay:(matchId:string)=>void;
  onClearReplay:()=>void;
}

const strategies:Array<[PvPTacticalStrategy,string,string]>=[['aggressive','🔥 Agressiva','Pressiona e aceita lutar mais perto.'],['balanced','⚖️ Equilibrada','Spacing e rotação neutros.'],['defensive','🛡️ Defensiva','Prioriza zona segura e sustain.']];

export function PlayerInteractionLayer(props:Props){
  const [strategy,setStrategy]=useState<PvPTacticalStrategy>('balanced');
  const [arenaHubOpen,setArenaHubOpen]=useState(false);
  const challenge=props.pendingDuelChallenges[0];
  useEffect(()=>{const s=props.pvpMatchNotice?.tactical_strategy;if(s==='aggressive'||s==='balanced'||s==='defensive')setStrategy(s);},[props.pvpMatchNotice?.id,props.pvpMatchNotice?.tactical_strategy]);
  useEffect(()=>{if(arenaHubOpen)props.onRequestHistory();},[arenaHubOpen]);
  return <>
    <button type="button" onClick={()=>setArenaHubOpen(true)} className="fixed right-3 top-20 z-40 pixel-btn pixel-btn-purple px-3 py-2 text-[10px] shadow-xl">⚔️ Arena{props.matchmaking.queued?' · buscando':''}</button>
    {challenge&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-xl border border-amber-500/70 bg-slate-950 p-5 shadow-2xl"><div className="font-pixel-heading text-sm text-amber-300">⚔️ Desafio de duelo</div><div className="mt-3 text-sm text-slate-200"><strong>{challenge.challenger.name}</strong> (Lv.{challenge.challenger.level}) desafiou você.</div><div className="mt-1 text-xs text-slate-500">Rating {challenge.challenger.rating}. Duelo amistoso: nenhum item, ouro ou recurso fica em risco.</div><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={()=>props.onRespondDuelChallenge(challenge.id,false)} className="pixel-btn pixel-btn-dark py-2 text-xs">Recusar</button><button onClick={()=>props.onRespondDuelChallenge(challenge.id,true)} className="pixel-btn pixel-btn-gold py-2 text-xs">Aceitar duelo</button></div></div></div>}
    {props.pvpMatchNotice?.status==='ready'&&!challenge&&<div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-xl border border-violet-500/70 bg-slate-950 p-5 shadow-2xl"><div className="font-pixel-heading text-sm text-violet-300">🏟️ Arena preparada</div><div className="mt-2 text-xs text-slate-400">O servidor selou os atributos desta partida. Escolha a estratégia antes de confirmar.</div><div className="mt-4 grid gap-2 sm:grid-cols-3">{strategies.map(([key,label,desc])=><button key={key} disabled={props.pvpArenaWaiting} onClick={()=>setStrategy(key)} className={`rounded-lg border p-3 text-left ${strategy===key?'border-violet-400 bg-violet-900/50':'border-slate-700 bg-slate-900/70'}`}><div className="text-[10px] text-slate-100">{label}</div><div className="mt-1 text-[9px] text-slate-500">{desc}</div></button>)}</div><button disabled={props.pvpArenaWaiting} onClick={()=>props.onConfirmPvPMatch(props.pvpMatchNotice!.id,strategy)} className="pixel-btn pixel-btn-purple mt-4 w-full py-2 text-xs disabled:opacity-50">{props.pvpArenaWaiting?'⏳ Aguardando oponente':'⚔️ Confirmar entrada'}</button></div></div>}
    {arenaHubOpen&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-violet-700/70 bg-slate-950 p-5 shadow-2xl"><div className="flex justify-between"><div><div className="font-pixel-heading text-sm text-violet-300">⚔️ Central da Arena</div><div className="mt-1 text-xs text-slate-500">Matchmaking por Rating + Combat Power</div></div><button onClick={()=>setArenaHubOpen(false)} className="text-slate-400">✕</button></div><div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3"><div className="text-xs text-slate-300">{props.matchmaking.queued?`Buscando adversário · Rating ${props.matchmaking.rating} · Poder ${props.matchmaking.combat_power}`:'Você não está na fila.'}</div><div className="mt-3 grid grid-cols-3 gap-2">{strategies.map(([key,label])=><button key={key} disabled={props.matchmaking.queued} onClick={()=>setStrategy(key)} className={`rounded border px-2 py-2 text-[9px] ${strategy===key?'border-violet-400 bg-violet-900/50':'border-slate-700'}`}>{label}</button>)}</div>{props.matchmaking.queued?<button onClick={props.onLeaveQueue} className="pixel-btn pixel-btn-dark mt-3 w-full py-2 text-xs">Sair da fila</button>:<button onClick={()=>props.onJoinQueue(strategy)} className="pixel-btn pixel-btn-purple mt-3 w-full py-2 text-xs">Buscar partida</button>}</div><div className="mt-5"><div className="font-pixel-heading text-[11px] text-amber-300">Histórico recente</div><div className="mt-2 space-y-2">{props.history.length===0?<div className="text-xs text-slate-600">Nenhuma partida concluída.</div>:props.history.map(h=><button key={h.match_id} onClick={()=>props.onRequestReplay(h.match_id)} className="flex w-full items-center justify-between rounded border border-slate-800 bg-slate-900/60 p-2 text-left text-[10px]"><span><strong className={h.result==='win'?'text-emerald-300':h.result==='loss'?'text-rose-300':'text-amber-300'}>{h.result==='win'?'Vitória':h.result==='loss'?'Derrota':'Empate'}</strong> vs {h.opponent_name}</span><span className="text-slate-500">{h.rating_delta>=0?'+':''}{h.rating_delta} · CP {h.combat_power}/{h.opponent_power}</span></button>)}</div></div></div></div>}
    {props.replay&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"><div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-xl border border-amber-600/60 bg-slate-950 p-4"><div className="flex justify-between"><div className="font-pixel-heading text-xs text-amber-300">📜 Replay resumido</div><button onClick={props.onClearReplay}>✕</button></div><div className="mt-3 space-y-1 font-mono text-[10px] text-slate-400">{props.replay.events.map(e=><div key={e.sequence} className="rounded bg-slate-900/60 px-2 py-1"><span className="text-slate-600">#{e.sequence}</span> <span className="text-cyan-300">{e.event_type}</span> {JSON.stringify(e.payload)}</div>)}</div></div></div>}
  </>;
}
