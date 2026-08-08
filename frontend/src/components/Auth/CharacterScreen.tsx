import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

interface CharacterScreenProps {
  token: string;
  onSelectCharacter: (character: any) => void;
}

// ORIGINS removido (Classless System)

export function CharacterScreen({ token, onSelectCharacter }: CharacterScreenProps) {
  const [characters, setCharacters] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/characters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCharacters(data);
        if (data.length === 0) {
          setIsCreating(true);
        }
      }
    } catch (err) {
      setError('Erro ao carregar personagens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          origin: 'wanderer',
          vocation: 'Aprendiz',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar personagem');
      }

      onSelectCharacter(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
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
                <button className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg group-hover:bg-amber-400 transition">
                  Entrar no Mundo
                </button>
              </div>
            ))}

            <button
              onClick={() => setIsCreating(true)}
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
