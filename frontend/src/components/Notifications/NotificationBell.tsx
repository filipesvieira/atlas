import { Bell, Check, Trash2 } from 'lucide-react';
import type { ImportantNotification } from '../../types/notifications';

interface NotificationBellProps {
  notifications: ImportantNotification[];
  onMarkAllRead: () => void;
  onClear: () => void;
  onOpenNotification?: (notification: ImportantNotification) => void;
}

const timeLabel = (timestamp: string) => {
  if (!timestamp) return '';
  if (/^\d{2}:\d{2}:\d{2}$/.test(timestamp)) return timestamp;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export function NotificationBell({ notifications, onMarkAllRead, onClear, onOpenNotification }: NotificationBellProps) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <details className="relative">
      <summary
        className="pixel-btn pixel-btn-dark relative list-none px-2 py-1.5 text-xs"
        title="Notificações importantes"
        aria-label={`Notificações importantes${unreadCount ? `: ${unreadCount} não lidas` : ''}`}
      >
        <Bell size={15} strokeWidth={2.5} />
        {unreadCount > 0 && (
          <span className="pixel-alert-icon absolute -right-1 -top-1 min-w-4 rounded-full border border-slate-950 bg-rose-500 px-1 text-[9px] leading-4 text-white shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </summary>

      <div className="absolute right-0 top-11 z-[70] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border-2 border-amber-600/50 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 py-2">
          <div>
            <h2 className="font-pixel-heading text-xs text-amber-300">Notificações</h2>
            <p className="text-[10px] text-slate-500">Acontecimentos importantes</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMarkAllRead} className="pixel-btn pixel-btn-dark p-1.5 text-slate-300" title="Marcar como lidas" aria-label="Marcar todas como lidas">
              <Check size={13} />
            </button>
            <button onClick={onClear} className="pixel-btn pixel-btn-dark p-1.5 text-slate-300" title="Limpar notificações" aria-label="Limpar notificações">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-500">
              Nenhuma novidade por enquanto.
            </div>
          ) : notifications.map((notification) => (
            <button
              type="button"
              key={notification.id}
              onClick={() => onOpenNotification?.(notification)}
              disabled={!notification.action}
              className={`flex gap-2 rounded-lg border-b border-slate-800/80 px-2.5 py-2.5 last:border-b-0 ${notification.read ? 'opacity-70' : 'bg-amber-950/20'}`}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-base">
                {notification.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="font-pixel-heading text-[10px] text-slate-200">{notification.title}</strong>
                  <time className="shrink-0 text-[9px] text-slate-600">{timeLabel(notification.timestamp)}</time>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{notification.message}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
