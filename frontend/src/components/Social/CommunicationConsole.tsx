import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../../hooks/useGameSocket';

type BaseTabKey = 'logs' | 'world' | 'clan' | 'kingdom';

export interface PrivateConversationTab {
  id: string;
  label: string;
  messages: ChatMessage[];
}

interface CommunicationConsoleProps {
  selfCharacterId: string;
  logs: string[];
  worldMessages: ChatMessage[];
  onlineCount: number;
  error?: string | null;
  privateConversations?: PrivateConversationTab[];
  onClosePrivateConversation?: (conversationId: string) => void;
  onSendWorldMessage: (text: string) => void;
  onBlock: (characterId: string) => void;
  onReport: (messageId: string, reason?: string) => void;
  onInspect: (characterId: string) => void;
}

const baseTabs: Array<{ id: BaseTabKey; icon: string; label: string; available: boolean }> = [
  { id: 'logs', icon: '📜', label: 'Logs', available: true },
  { id: 'world', icon: '🌎', label: 'Global', available: true },
  { id: 'clan', icon: '🛡️', label: 'Clã', available: false },
  { id: 'kingdom', icon: '🏰', label: 'Reino', available: false },
];

// Mantém o console leve e previsível. O servidor restaura até 40 mensagens ao
// conectar; durante a sessão, o socket conserva no máximo 100 mensagens.
const WORLD_CHAT_WINDOW_SIZE = 100;

type ModerationIntent =
  | { kind: 'block'; characterId: string; characterName: string }
  | { kind: 'report'; messageId: string; characterName: string };

function formatChatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatChatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Horário indisponível';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Console de comunicação do mundo. A UI suporta abas privadas fecháveis já
 * agora, mas somente mostra canais que possuem contrato de transporte ativo.
 * Assim Clã/Reino/DM não aparentam ser chats funcionais antes do backend.
 */
export function CommunicationConsole({
  selfCharacterId,
  logs,
  worldMessages,
  onlineCount,
  error,
  privateConversations = [],
  onClosePrivateConversation,
  onSendWorldMessage,
  onBlock,
  onReport,
  onInspect,
}: CommunicationConsoleProps) {
  const [activeTab, setActiveTab] = useState<string>('logs');
  const [text, setText] = useState('');
  const [moderationIntent, setModerationIntent] = useState<ModerationIntent | null>(null);
  const worldListRef = useRef<HTMLDivElement | null>(null);
  const visibleWorldMessages = useMemo(() => worldMessages.slice(-WORLD_CHAT_WINDOW_SIZE), [worldMessages]);

  useEffect(() => {
    if (activeTab !== 'world') return;
    requestAnimationFrame(() => {
      if (worldListRef.current) worldListRef.current.scrollTop = worldListRef.current.scrollHeight;
    });
  }, [activeTab, worldMessages.length]);

  const submitWorldMessage = () => {
    const value = text.trim();
    if (!value) return;
    onSendWorldMessage(value);
    setText('');
  };

  const activePrivate = privateConversations.find((conversation) => conversation.id === activeTab);
  const activeBase = baseTabs.find((tab) => tab.id === activeTab);
  const channelPending = activeBase && !activeBase.available;

  return (
    <section className="pixel-card flex min-h-[190px] flex-col overflow-hidden rounded-xl p-0">
      <header className="flex min-h-10 items-end gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/80 px-2 pt-1.5">
        {baseTabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 rounded-t border px-2.5 py-1.5 font-pixel-heading text-[9px] transition-colors ${
                selected
                  ? 'border-cyan-500/80 bg-slate-900 text-cyan-200'
                  : 'border-transparent bg-slate-950/40 text-slate-500 hover:border-slate-700 hover:text-slate-300'
              }`}
              title={tab.available ? `Abrir ${tab.label}` : `${tab.label}: canal será liberado em uma etapa futura`}
            >
              {tab.icon} {tab.label}
              {!tab.available && <span className="ml-1 text-[7px] text-slate-600">EM BREVE</span>}
            </button>
          );
        })}
        {privateConversations.map((conversation) => {
          const selected = activeTab === conversation.id;
          return (
            <div
              key={conversation.id}
              className={`flex shrink-0 items-center gap-1 rounded-t border pl-2 py-1.5 pr-1 font-pixel-heading text-[9px] ${
                selected ? 'border-violet-400/80 bg-slate-900 text-violet-200' : 'border-transparent text-slate-500'
              }`}
            >
              <button type="button" onClick={() => setActiveTab(conversation.id)} title={`Conversa com ${conversation.label}`}>
                💬 {conversation.label}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClosePrivateConversation?.(conversation.id);
                  if (selected) setActiveTab('logs');
                }}
                className="px-1 text-slate-500 hover:text-rose-300"
                title="Fechar conversa"
                aria-label={`Fechar conversa com ${conversation.label}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </header>

      {activeTab === 'logs' && (
        <div className="h-40 overflow-y-auto bg-slate-950/75 px-3 py-2 font-pixel-terminal text-[10px] text-slate-400">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-slate-600">Nenhum evento registrado ainda.</p>
          ) : logs.map((log, index) => (
            <p key={`${log}-${index}`} className="border-b border-slate-900/70 py-1 leading-relaxed last:border-0">
              <span className="mr-1 text-amber-500/80">&gt;</span>{log}
            </p>
          ))}
        </div>
      )}

      {activeTab === 'world' && (
        <>
          <div ref={worldListRef} className="h-40 overflow-y-auto bg-slate-950/75 px-3 py-2 text-[11px] leading-relaxed">
            {visibleWorldMessages.length === 0 ? (
              <div className="py-8 text-center text-slate-600">A taverna está silenciosa demais...</div>
            ) : visibleWorldMessages.map((message) => {
              const self = message.sender_id === selfCharacterId;
              return (
                <div key={message.id} className="group mb-1.5 break-words">
                  <time
                    dateTime={message.created_at}
                    title={formatChatDateTime(message.created_at)}
                    className="mr-1 font-pixel-terminal text-[9px] text-slate-600"
                  >
                    [{formatChatTime(message.created_at)}]
                  </time>
                  <button type="button" onClick={() => onInspect(message.sender_id)} className={`mr-1 font-semibold ${self ? 'text-amber-300' : 'text-cyan-300'} hover:underline`}>
                    {message.sender_name} <span className="text-[9px] text-slate-500">Lv.{message.sender_level}</span>:
                  </button>
                  <span className="text-slate-300">{message.text}</span>
                  {!self && (
                    <span className="ml-2 hidden gap-1 group-hover:inline-flex">
                      <button className="text-[9px] text-slate-500 hover:text-rose-300" onClick={() => setModerationIntent({ kind: 'block', characterId: message.sender_id, characterName: message.sender_name })}>bloquear</button>
                      <button className="text-[9px] text-slate-500 hover:text-amber-300" onClick={() => setModerationIntent({ kind: 'report', messageId: message.id, characterName: message.sender_name })}>denunciar</button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {error && <div className="border-t border-rose-900/50 bg-rose-950/40 px-3 py-1 text-[9px] text-rose-300">{error}</div>}
          <div className="flex items-center gap-2 border-t border-slate-800 bg-slate-900/80 p-2">
            <span className="hidden shrink-0 font-pixel-heading text-[8px] text-cyan-300 sm:inline">🌎 {onlineCount.toLocaleString()} ON</span>
            <span
              className="hidden shrink-0 font-pixel-heading text-[7px] text-slate-500 md:inline"
              title="Ao entrar, o servidor restaura as últimas 40 mensagens. Durante a sessão, este console mantém até 100 mensagens; mensagens mais antigas ainda ficam registradas no servidor."
            >
              ÚLTIMAS {visibleWorldMessages.length}/{WORLD_CHAT_WINDOW_SIZE}
            </span>
            <input value={text} maxLength={200} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitWorldMessage();
              }
            }} placeholder="Fale com o reino..." className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500" />
            <button type="button" onClick={submitWorldMessage} disabled={!text.trim()} className="pixel-btn pixel-btn-dark px-3 py-1 text-[9px] disabled:opacity-40">ENVIAR</button>
          </div>
        </>
      )}

      {(channelPending || activePrivate) && (
        <div className="flex h-40 flex-col items-center justify-center bg-slate-950/75 px-4 text-center">
          <div className="font-pixel-heading text-[10px] text-violet-300">{activePrivate ? `💬 CONVERSA · ${activePrivate.label}` : '🔒 CANAL EM PREPARAÇÃO'}</div>
          <p className="mt-2 max-w-md text-[10px] leading-relaxed text-slate-500">
            {activePrivate
              ? 'Mensagens privadas aparecerão aqui quando o protocolo direto for liberado. A aba já pode ser fechada sem afetar os demais canais.'
              : 'Este espaço será ativado quando o respectivo sistema social existir no servidor. O chat global e os logs continuam disponíveis agora.'}
          </p>
        </div>
      )}

      {moderationIntent && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
            <div className="font-pixel-heading text-[11px] text-amber-300">
              {moderationIntent.kind === 'block' ? '🚫 Bloquear no chat' : '⚠️ Denunciar mensagem'}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              {moderationIntent.kind === 'block'
                ? `Bloquear ${moderationIntent.characterName}? As mensagens futuras deste personagem deixarão de aparecer para você.`
                : `Enviar a mensagem de ${moderationIntent.characterName} para a fila de moderação?`}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModerationIntent(null)} className="pixel-btn pixel-btn-dark py-2 text-[10px]">Cancelar</button>
              <button
                type="button"
                onClick={() => {
                  if (moderationIntent.kind === 'block') onBlock(moderationIntent.characterId);
                  else onReport(moderationIntent.messageId);
                  setModerationIntent(null);
                }}
                className="pixel-btn pixel-btn-crimson py-2 text-[10px]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}