import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

interface CharacterScreenProps {
  token: string;
  isAdmin?: boolean;
  onSelectCharacter: (character: any) => void;
  onLogout: () => void;
}

export function CharacterScreen({ token, isAdmin = false, onSelectCharacter, onLogout }: CharacterScreenProps) {
  const [characters, setCharacters] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, [token]);

  const fetchCharacters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/characters`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        // Sessão expirada ou token inválido: limpa o storage e retorna ao login
        console.warn('Token JWT expirado ou inválido ao buscar personagens. Realizando logout...');
        onLogout();
        return;
      }

      const data = await res.json();
      if (res.ok) {
        const charList = Array.isArray(data) ? data : [];
        setCharacters(charList);
        if (charList.length === 0) {
          setIsCreating(true);
        } else {
          setIsCreating(false);
        }
      } else {
        setError(data.error || 'Erro ao carregar personagens');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão ao carregar personagens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          origin: 'wanderer',
          vocation: 'Aprendiz',
        }),
      });

      if (res.status === 401 || res.status === 403) {
        console.warn('Token JWT expirado ou inválido ao criar personagem. Realizando logout...');
        onLogout();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar personagem');
      }

      if (isAdmin) {
        setName('');
        setIsCreating(false);
        setNotice('🧪 Personagem criado. Aplique o preset de QA antes de entrar no mundo.');
        await fetchCharacters();
      } else {
        onSelectCharacter(data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const prepareTestCharacter = async (character: any) => {
    if (!isAdmin || preparingId) return;
    setPreparingId(character.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/test-preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ character_id: character.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao aplicar preset de QA');
      setNotice(`🧪 ${character.name} preparado: ${data.resources_granted} recursos, ${data.recipes_unlocked} receitas e profissões Nv. ${data.profession_level}.`);
      await fetchCharacters();
    } catch (err: any) {
      setError(err?.message || 'Erro ao preparar personagem de testes');
    } finally {
      setPreparingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        {/* Top bar com logout */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-base shadow">
              A
            </div>
            <span className="font-bold text-sm text-amber-400">PROJECT ATLAS</span>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs border border-slate-800 transition"
          >
            ← Trocar de Conta
          </button>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-amber-400">
            {isCreating ? 'Crie seu Aventureiro' : 'Selecione seu Personagem'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Project Atlas — Crie sua jornada (Sistema Classless)
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-mono text-center">
            ⚠️ {error}
          </div>
        )}
        {notice && <div className="mb-6 rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/35 p-3 text-center text-xs text-fuchsia-200">{notice}</div>}

        {loading ? (
          <div className="text-center text-slate-400 text-sm py-12">Carregando personagens...</div>
        ) : !isCreating && characters.length > 0 ? (
          <div className="space-y-4">
            {characters.map((char) => (
              <div
                key={char.id}
                onClick={() => onSelectCharacter(char)}
                className="p-5 bg-slate-950 border border-slate-800 hover:border-amber-500 rounded-xl cursor-pointer transition-all flex justify-between items-center group shadow-md"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-amber-400 group-hover:text-amber-300">
                      {char.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono">
                      Lv. {char.level}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 capitalize">
                    Origem: <span className="text-slate-200">{char.origin || 'Wanderer'}</span> • {char.vocation}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {isAdmin && <button onClick={(event) => { event.stopPropagation(); prepareTestCharacter(char); }} disabled={preparingId === char.id} className="rounded-lg border border-fuchsia-500/50 bg-fuchsia-950/50 px-3 py-2 text-[10px] font-black text-fuchsia-200 transition hover:bg-fuchsia-900/60 disabled:opacity-40">{preparingId === char.id ? 'Preparando…' : '🧪 Preparar QA'}</button>}
                  <button className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg group-hover:bg-amber-400 transition">Entrar no Mundo</button>
                </div>
              </div>
            ))}

            <button
              onClick={() => { setIsCreating(true); setName(''); }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition mt-4"
            >
              + Criar Novo Aventureiro
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateCharacter} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Nome do Aventureiro
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Valerius"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-2">
              {characters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Voltar
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg"
              >
                Confirmar & Iniciar Aventura
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
