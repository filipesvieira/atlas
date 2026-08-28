import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../../hooks/useGameSocket';

interface WorldChatPanelProps {
  selfCharacterId: string;
  messages: ChatMessage[];
  onlineCount: number;
  error?: string | null;
  onSend: (text: string) => void;
  onBlock: (characterId: string) => void;
  onReport: (messageId: string, reason?: string) => void;
  onInspect: (characterId: string) => void;
}

export function WorldChatPanel({ selfCharacterId, messages, onlineCount, error, onSend, onBlock, onReport, onInspect }: WorldChatPanelProps) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const previousCountRef = useRef(messages.length);
  useEffect(() => { const delta=Math.max(0,messages.length-previousCountRef.current); previousCountRef.current=messages.length; if(!open&&delta>0)setUnread(v=>v+delta); },[messages.length,open]);
  useEffect(() => { if(!open)return; setUnread(0); requestAnimationFrame(()=>{if(listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight;}); },[open,messages.length]);
  const visibleMessages=useMemo(()=>messages.slice(-80),[messages]);
  const submit=()=>{const value=text.trim();if(!value)return;onSend(value);setText('');};
  if(!open)return <button type="button" onClick={()=>setOpen(true)} className="fixed bottom-3 right-3 z-40 pixel-btn pixel-btn-dark px-3 py-2 text-xs shadow-2xl">🌎 Chat {unread>0?`(${Math.min(99,unread)})`:''}</button>;
  return <section className="fixed bottom-3 right-3 z-40 w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-lg border border-cyan-700/60 bg-slate-950/95 shadow-2xl backdrop-blur">
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2"><div><div className="font-pixel-heading text-[11px] text-cyan-300">🌎 Mundial</div><div className="mt-0.5 text-[10px] text-slate-500">{onlineCount.toLocaleString()} aventureiro(s) online</div></div><button onClick={()=>setOpen(false)} className="text-xs text-slate-400">—</button></header>
    <div ref={listRef} className="h-64 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed">
      {visibleMessages.length===0?<div className="py-8 text-center text-slate-600">A taverna está silenciosa demais...</div>:visibleMessages.map(message=>{const self=message.sender_id===selfCharacterId;return <div key={message.id} className="group mb-1.5 break-words"><button type="button" onClick={()=>onInspect(message.sender_id)} className={`mr-1 font-semibold ${self?'text-amber-300':'text-cyan-300'} hover:underline`}>{message.sender_name} <span className="text-[9px] text-slate-500">Lv.{message.sender_level}</span>:</button><span className="text-slate-300">{message.text}</span>{!self&&<span className="ml-2 hidden gap-1 group-hover:inline-flex"><button className="text-[9px] text-slate-500 hover:text-rose-300" onClick={()=>window.confirm(`Bloquear ${message.sender_name} no chat?`)&&onBlock(message.sender_id)}>bloquear</button><button className="text-[9px] text-slate-500 hover:text-amber-300" onClick={()=>window.confirm('Denunciar esta mensagem para moderação?')&&onReport(message.id)}>denunciar</button></span>}</div>;})}
    </div>
    {error&&<div className="border-t border-rose-900/50 bg-rose-950/40 px-3 py-1.5 text-[10px] text-rose-300">{error}</div>}
    <div className="flex gap-2 border-t border-slate-800 bg-slate-900/80 p-2"><input value={text} maxLength={200} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}}} placeholder="Fale com o reino..." className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"/><button onClick={submit} disabled={!text.trim()} className="pixel-btn pixel-btn-dark px-3 py-1 text-[10px] disabled:opacity-40">Enviar</button></div>
  </section>;
}
