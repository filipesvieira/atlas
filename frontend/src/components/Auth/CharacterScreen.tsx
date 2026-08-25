import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

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
        console.warn('Token JWT expirado ao buscar personagens. Realizando logout...');
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
        console.warn('Token JWT expirado ao criar personagem. Realizando logout...');
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
      <div className="w-full max-w-2xl pixel-card-gold rounded-2xl p-8 shadow-2xl relative">
        {/* Top bar com logout */}
        <div className="flex justify-between items-center mb-6 border-b border-amber-600/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded pixel-slot flex items-center justify-center font-pixel-heading text-amber-400 text-base shadow border-amber-500">
              A
            </div>
            <span className="font-pixel-heading text-sm text-amber-400">PROJECT ATLAS</span>
          </div>
          <button
            onClick={onLogout}
            className="pixel-btn pixel-btn-crimson px-3 py-1 text-xs"
          >
            ← Trocar de Conta
          </button>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-pixel-heading text-amber-400">
            {isCreating ? 'Crie seu Aventureiro' : 'Selecione seu Personagem'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-pixel-body">
            Project Atlas — Crie sua jornada (Sistema Classless)
          </p>
        </div>

        {error && (
          <div className="pixel-alert-frame pixel-alert-critical mb-6 rounded-lg p-3 text-center text-rose-300 text-xs font-pixel-body">
            ⚠️ {error}
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-lg border-2 border-fuchsia-500/60 bg-fuchsia-950/60 p-3 text-center text-xs font-pixel-body text-fuchsia-200">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 text-sm py-12 font-pixel-heading">Carregando personagens...</div>
        ) : !isCreating && characters.length > 0 ? (
          <div className="space-y-4">
            {characters.map((char) => (
              <div
                key={char.id}
                onClick={() => { if (!char.progression_blocked) onSelectCharacter(char); }}
                className={`p-4 pixel-slot rounded-xl transition-all flex justify-between items-center group shadow-md ${char.progression_blocked ? 'pixel-alert-frame pixel-alert-critical opacity-80' : 'cursor-pointer hover:border-amber-400'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 pixel-slot rounded flex items-center justify-center bg-slate-900 border-amber-500/40">
                    <PixelItemSprite slotType="chest" size="sm" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-heading text-base text-amber-400 group-hover:text-amber-300">
                        {char.name}
                      </span>
                      <span className="px-2 py-0.5 rounded font-pixel-heading bg-slate-900 text-amber-300 text-[10px] border border-amber-600/40">
                        Lv. {char.level}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize font-pixel-body">
                      Origem: <span className="text-slate-200">{char.origin || 'Wanderer'}</span> • {char.vocation}
                    </div>
                    {char.progression_blocked && (
                      <div className="mt-1 text-[10px] text-rose-300">
                        ⚠️ Progressão legada requer revisão antes de entrar
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {isAdmin && !char.progression_blocked && (
                    <button
                      onClick={(event) => { event.stopPropagation(); prepareTestCharacter(char); }}
                      disabled={preparingId === char.id}
                      className="pixel-btn pixel-btn-purple px-3 py-1.5 text-xs font-pixel-body"
                    >
                      {preparingId === char.id ? 'Preparando…' : '🧪 Preparar QA'}
                    </button>
                  )}
                  {!char.progression_blocked && (
                    <button className="pixel-btn pixel-btn-gold px-4 py-1.5 text-xs font-pixel-heading">
                      Entrar no Mundo
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={() => { setIsCreating(true); setName(''); }}
              className="w-full py-3 pixel-btn pixel-btn-dark font-pixel-heading text-xs rounded mt-4"
            >
              + Criar Novo Aventureiro
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateCharacter} className="space-y-6 font-pixel-body">
            <div>
              <label className="block text-xs font-pixel-heading text-slate-400 mb-1">
                Nome do Aventureiro
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Valerius"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-2">
              {characters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="w-1/3 py-3 pixel-btn pixel-btn-dark font-pixel-heading text-xs rounded"
                >
                  Voltar
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-3 pixel-btn pixel-btn-gold font-pixel-heading text-xs rounded"
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
