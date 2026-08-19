import { useState, useCallback, useEffect } from 'react';
import { AuthScreen } from './components/Auth/AuthScreen';
import { CharacterScreen } from './components/Auth/CharacterScreen';
import { DashboardGrid } from './components/Dashboard/DashboardGrid';
import { OfflineSummaryModal } from './components/Modal/OfflineSummaryModal';
import { GameTutorialModal } from './components/Modal/GameTutorialModal';
import { API_BASE_URL } from './config';

export function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('atlas_token'));
  const [account, setAccount] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('atlas_account') || 'null'); } catch { return null; }
  });
  const [character, setCharacter] = useState<any>(null);
  const [offlineData, setOfflineData] = useState<any | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [selectingCharacterId, setSelectingCharacterId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  // Abertura automática no primeiro acesso ao selecionar o personagem
  useEffect(() => {
    if (character) {
      const dontShow = localStorage.getItem('atlas_tutorial_dont_show_auto') === 'true';
      if (!dontShow) {
        const timer = setTimeout(() => setIsTutorialOpen(true), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [character?.id]);

  const handleAuthSuccess = (newToken: string, authenticatedAccount: any) => {
    setToken(newToken);
    setAccount(authenticatedAccount);
    localStorage.setItem('atlas_token', newToken);
    localStorage.setItem('atlas_account', JSON.stringify(authenticatedAccount || null));
  };

  const handleLogout = () => {
    setToken(null);
    setAccount(null);
    setCharacter(null);
    setSelectionError(null);
    localStorage.removeItem('atlas_token');
    localStorage.removeItem('atlas_account');
  };

  const handleSelectCharacter = async (char: any) => {
    if (!token || selectingCharacterId) return;

    // O Dashboard/WebSocket só é montado depois que o claim transacional termina.
    // Isso impede a sessão em memória de sobrescrever o snapshot recém-reconciliado.
    setSelectingCharacterId(char.id);
    setSelectionError(null);
    setOfflineData(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/expedition/claim?character_id=${char.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        console.warn('Token JWT expirado durante o claim offline. Realizando logout...');
        handleLogout();
        return;
      }

      if (!res.ok) {
        throw new Error(`Falha no claim offline (${res.status})`);
      }

      const claim = await res.json();
      if (!claim.character) {
        throw new Error('Resposta sem snapshot autoritativo do personagem');
      }
      setCharacter(claim.character);
      if (claim.report?.minutes_offline >= 3) {
        setOfflineData(claim.report);
      }
    } catch (e) {
      console.warn('Erro ao reconciliar progresso offline:', e);
      // Não abre o WebSocket sem consumir a janela offline. Entrar com um
      // snapshot antigo poderia fechar a janela e perder recompensas pendentes.
      setCharacter(null);
      setSelectionError('Não foi possível reconciliar a expedição. Tente selecionar o personagem novamente.');
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
          <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-2.5 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-lg shadow">
                A
              </div>
              <div>
                <h1 className="font-bold text-base text-amber-400 leading-none">PROJECT ATLAS</h1>
                <span className="text-[10px] text-slate-400">Standalone IDLE MMORPG</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-amber-400">{character.name}</span>
                <span className="text-slate-400">(Lv. {character.level})</span>
              </div>

              {account?.role === 'admin' && <span className="rounded border border-fuchsia-500/40 bg-fuchsia-950/40 px-2 py-1 text-[10px] font-black text-fuchsia-300">🧪 QA ADMIN</span>}

              {/* Botão de Ícone do Livro para o Guia do Jogo */}
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-slate-700 hover:border-amber-500/50 transition flex items-center justify-center text-sm shadow-sm"
                title="📖 Guia do Aventureiro & Manual do Jogo"
              >
                <span>📖</span>
              </button>

              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-300 border border-slate-700 transition"
              >
                Sair da Conta
              </button>
            </div>
          </header>

          {/* Main Dashboard */}
          <main className="flex-1">
            <DashboardGrid
              token={token}
              character={character}
              onCharacterUpdate={handleCharacterUpdate}
            />
          </main>

          {/* Modal do Guia do Jogo & Tutorial */}
          <GameTutorialModal
            isOpen={isTutorialOpen}
            onClose={() => setIsTutorialOpen(false)}
          />
        </>
      )}
    </div>
  );
}

export default App;
