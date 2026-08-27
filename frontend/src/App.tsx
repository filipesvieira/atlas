import { useState, useCallback, useEffect } from 'react';
import { AuthScreen } from './components/Auth/AuthScreen';
import { CharacterScreen } from './components/Auth/CharacterScreen';
import { DashboardGrid } from './components/Dashboard/DashboardGrid';
import { OfflineSummaryModal } from './components/Modal/OfflineSummaryModal';
import { GameTutorialModal } from './components/Modal/GameTutorialModal';
import { NotificationBell } from './components/Notifications/NotificationBell';
import { PrologueOverlay } from './components/Prologue/PrologueOverlay';
import { PROLOGUE_VERSION } from './components/Prologue/PrologueData';
import type { ImportantNotification } from './types/notifications';
import { API_BASE_URL, CLIENT_CONFIG_ERROR } from './config';

const AUTH_TOKEN_KEY = 'atlas_token';
const AUTH_ACCOUNT_KEY = 'atlas_account';
const PROLOGUE_STORAGE_PREFIX = 'reino_do_avesso_prologue';

const prologueStorageKey = (characterId: string) => `${PROLOGUE_STORAGE_PREFIX}:v${PROLOGUE_VERSION}:${characterId}`;

function readStoredToken(): string | null {
  try {
    const stored = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!stored) return null;

    // Evita iniciar a aplicação com um JWT já expirado. A API continua sendo
    // a autoridade final, mas isso elimina uma tela de personagem inutilizável
    // após um rebuild que ocorreu enquanto o usuário estava offline.
    const payload = stored.split('.')[1];
    const claims = payload ? JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) : null;
    if (claims?.exp && claims.exp * 1000 <= Date.now()) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_ACCOUNT_KEY);
      return null;
    }
    return stored;
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_ACCOUNT_KEY);
    return null;
  }
}

function readStoredAccount(): any {
  try {
    const raw = localStorage.getItem(AUTH_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(AUTH_ACCOUNT_KEY);
    return null;
  }
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ACCOUNT_KEY);
}

export function App() {
  if (CLIENT_CONFIG_ERROR) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
        <section className="max-w-xl rounded-xl border border-rose-500/50 bg-rose-950/20 p-6 shadow-2xl">
          <h1 className="font-pixel-heading text-rose-300">Configuração do servidor ausente</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{CLIENT_CONFIG_ERROR}</p>
        </section>
      </main>
    );
  }
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [account, setAccount] = useState<any>(() => readStoredAccount());
  const [character, setCharacter] = useState<any>(null);
  const [offlineData, setOfflineData] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<ImportantNotification[]>([]);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isPrologueOpen, setIsPrologueOpen] = useState(false);
  const [selectingCharacterId, setSelectingCharacterId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const pushNotification = useCallback((notification: ImportantNotification) => {
    setNotifications((previous) => {
      if (previous.some((item) => item.id === notification.id)) return previous;
      return [{ ...notification, read: false }, ...previous].slice(0, 40);
    });
  }, []);

  // Abertura automática no primeiro acesso ao selecionar o personagem
  useEffect(() => {
    if (character && !isPrologueOpen) {
      const dontShow = localStorage.getItem('atlas_tutorial_dont_show_auto') === 'true';
      if (!dontShow) {
        const timer = setTimeout(() => setIsTutorialOpen(true), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [character?.id, isPrologueOpen]);

  // A primeira versão usa uma flag por personagem e por versão no navegador.
  // O formato já permite migrar a mesma decisão para o perfil persistido no backend.
  useEffect(() => {
    if (!character?.id) {
      setIsPrologueOpen(false);
      return;
    }
    try {
      setIsPrologueOpen(localStorage.getItem(prologueStorageKey(character.id)) !== 'seen');
    } catch {
      // Se o navegador bloquear storage, o prólogo ainda pode ser fechado nesta sessão.
      setIsPrologueOpen(true);
    }
  }, [character?.id]);

  const finishPrologue = useCallback(() => {
    if (character?.id) {
      try {
        localStorage.setItem(prologueStorageKey(character.id), 'seen');
      } catch {
        // Persistência local indisponível: mantém a navegação funcional nesta sessão.
      }
    }
    setIsPrologueOpen(false);
  }, [character?.id]);

  const handleAuthSuccess = (newToken: string, authenticatedAccount: any) => {
    setToken(newToken);
    setAccount(authenticatedAccount);
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    localStorage.setItem(AUTH_ACCOUNT_KEY, JSON.stringify(authenticatedAccount || null));
  };

  const handleLogout = () => {
    setToken(null);
    setAccount(null);
    setCharacter(null);
    setNotifications([]);
    setSelectionError(null);
    clearStoredAuth();
  };

  const handleSelectCharacter = async (char: any) => {
    if (!token || selectingCharacterId) return;

    // O Dashboard/WebSocket só é montado depois que o claim transacional termina.
    // Isso impede a sessão em memória de sobrescrever o snapshot recém-reconciliado.
    setSelectingCharacterId(char.id);
    setSelectionError(null);
    setOfflineData(null);
    try {
      let res: Response | null = null;
      let responseData: any = {};
      for (let attempt = 0; attempt < 3; attempt += 1) {
        res = await fetch(`${API_BASE_URL}/api/v1/expedition/claim?character_id=${char.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        const responseText = await res.text();
        responseData = {};
        if (responseText) {
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = {};
          }
        }

        // Durante refresh/rebuild o WebSocket anterior pode levar alguns
        // instantes para liberar o personagem. O claim não altera nada quando
        // retorna 409, portanto repetir é seguro e evita erro falso de login.
        if (res.status !== 409 || attempt === 2) break;
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }

      if (!res) {
        throw new Error('Não foi possível iniciar a sessão do personagem');
      }

      if (res.status === 401 || res.status === 403) {
        console.warn('Token JWT expirado durante o claim offline. Realizando logout...');
        handleLogout();
        return;
      }

      if (!res.ok) {
        throw new Error(responseData.error || `Falha no claim offline (${res.status})`);
      }

      const claim = responseData;
      if (!claim.character) {
        throw new Error('Resposta sem snapshot autoritativo do personagem');
      }
      setCharacter(claim.character);
      if (claim.report?.minutes_offline >= 3) {
        setOfflineData(claim.report);
        const report = claim.report;
        const levelMessage = report.level_after > report.level_before
          ? ` Nível ${report.level_before} → ${report.level_after}.`
          : '';
        pushNotification({
          id: `offline:${report.report_id}`,
          category: report.defeated ? 'warning' : 'reward',
          icon: report.defeated ? '❤️' : '🌙',
          title: 'Expedição offline reconciliada',
          message: report.defeated
            ? `O herói voltou ao acampamento após ser derrotado. +${report.xp_gained || 0} XP e +${report.gold_gained || 0} ouro.${levelMessage}`
            : `A expedição rendeu +${report.xp_gained || 0} XP, +${report.gold_gained || 0} ouro e ${report.kills || 0} abate(s).${levelMessage}`,
          timestamp: report.period_end || new Date().toISOString(),
          read: false,
        });
      }
    } catch (e) {
      console.warn('Erro ao reconciliar progresso offline:', e);
      // Não abre o WebSocket sem consumir a janela offline. Entrar com um
      // snapshot antigo poderia fechar a janela e perder recompensas pendentes.
      setCharacter(null);
      setSelectionError(e instanceof Error ? e.message : 'Não foi possível reconciliar a expedição. Tente selecionar o personagem novamente.');
    } finally {
      setSelectingCharacterId(null);
    }
  };

  const handleCharacterUpdate = useCallback((updatedChar: any) => {
    if (updatedChar) {
      // XP, ouro, HP, região e fase também são autoritativos; não apenas nome/nível.
	  setCharacter((prev: any) => {
		const previousRevision = prev?.state_revision ?? 0;
		const incomingRevision = updatedChar?.state_revision ?? previousRevision;
		return incomingRevision < previousRevision ? prev : { ...prev, ...updatedChar };
	  });
    }
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {selectingCharacterId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
          <div className="rounded-xl border border-amber-500/40 bg-slate-900 px-5 py-4 text-sm text-amber-300 shadow-2xl">
            Reconciliando a expedição offline…
          </div>
        </div>
      )}
      {!token ? (
        <AuthScreen onSuccess={handleAuthSuccess} />
      ) : !character ? (
        <>
          {selectionError && (
            <div className="mx-auto mt-4 w-full max-w-xl rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-center text-sm text-rose-200">
              {selectionError}
            </div>
          )}
          <CharacterScreen token={token} isAdmin={account?.role === 'admin'} onSelectCharacter={handleSelectCharacter} onLogout={handleLogout} />
        </>
      ) : (
        <>
          <OfflineSummaryModal data={offlineData} onClose={() => setOfflineData(null)} />

          {/* Header Superior com Nível em Tempo Real */}
          <header className="border-b-2 border-amber-600/40 bg-slate-950/95 sticky top-0 z-40 px-6 py-2.5 flex justify-between items-center shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded pixel-slot flex items-center justify-center font-pixel-heading text-amber-400 text-base shadow border-amber-500">
                A
              </div>
              <div>
                <h1 className="font-pixel-heading text-sm text-amber-400 leading-none">REINO DO AVESSO</h1>
                <span className="text-[9px] text-slate-400 font-pixel-body">MMORPG Pixel de Sobrevivência</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-pixel-body">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded pixel-slot text-slate-200 border-amber-600/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-pixel-heading text-amber-300 text-[11px]">{character.name}</span>
                <span className="text-slate-400 text-[10px]">(Lv. {character.level})</span>
              </div>

              {account?.role === 'admin' && <span className="rounded border border-fuchsia-500/60 bg-fuchsia-950/80 px-2 py-0.5 text-[9px] font-pixel-heading text-fuchsia-300">QA ADMIN</span>}

              <NotificationBell
                notifications={notifications}
                onMarkAllRead={markNotificationsRead}
                onClear={clearNotifications}
              />

              {/* Botão de Ícone do Livro para o Guia do Jogo */}
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="pixel-btn pixel-btn-dark px-2.5 py-1 text-xs"
                title="📖 Guia do Aventureiro & Manual do Jogo"
              >
                <span>📖 Guia</span>
              </button>

              <button
                onClick={() => setIsPrologueOpen(true)}
                className="pixel-btn pixel-btn-dark px-2.5 py-1 text-xs"
                title="📜 Ver a história de Reino do Avesso"
              >
                <span>📜 História</span>
              </button>

              <button
                onClick={handleLogout}
                className="pixel-btn pixel-btn-crimson px-3 py-1 text-xs"
              >
                Sair
              </button>
            </div>
          </header>

          {/* Main Dashboard */}
          <main className="flex-1">
            <DashboardGrid
              token={token}
              character={character}
              onCharacterUpdate={handleCharacterUpdate}
              onImportantNotification={pushNotification}
            />
          </main>

          {/* Modal do Guia do Jogo & Tutorial */}
          <GameTutorialModal
            isOpen={isTutorialOpen}
            onClose={() => setIsTutorialOpen(false)}
          />
          <PrologueOverlay isOpen={isPrologueOpen} onFinish={finishPrologue} />
        </>
      )}
    </div>
  );
}

export default App;