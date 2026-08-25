import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';

interface AuthScreenProps {
  onSuccess: (token: string, account: any) => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    const path = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
    const endpoint = `${API_BASE_URL}${path}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data: any = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: 'Resposta inválida do servidor: ' + text.substring(0, 100) };
        }
      }

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('Este e-mail já possui cadastro! Clique na aba "Entrar na Conta" acima para fazer login.');
        }
        throw new Error(data.error || `Erro de conexão (${res.status})`);
      }

      onSuccess(data.token, data.account);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md pixel-card-gold rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-lg pixel-slot flex items-center justify-center font-pixel-heading text-amber-400 text-3xl shadow-lg mb-4 border-amber-500">
            A
          </div>
          <h1 className="font-pixel-heading text-xl text-amber-400">PROJECT ATLAS</h1>
          <p className="font-pixel-body text-xs text-slate-400 mt-1.5">Standalone IDLE MMORPG Assíncrono</p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg mb-6 bg-slate-950/80 border border-slate-800">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`py-2 text-xs rounded transition-all font-pixel-heading ${
              isLogin ? 'pixel-btn pixel-btn-gold text-slate-950 font-bold' : 'pixel-btn pixel-btn-dark text-slate-400'
            }`}
          >
            Entrar na Conta
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`py-2 text-xs rounded transition-all font-pixel-heading ${
              !isLogin ? 'pixel-btn pixel-btn-gold text-slate-950 font-bold' : 'pixel-btn pixel-btn-dark text-slate-400'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="pixel-alert-frame pixel-alert-critical mb-4 rounded-lg p-3 text-center text-rose-300 text-xs font-pixel-body">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-pixel-body">
          <div>
            <label className="block text-xs font-pixel-heading text-slate-400 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aventureiro@projectatlas.com"
              className="w-full bg-slate-950 border-2 border-slate-800 rounded px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-pixel-heading text-slate-400 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border-2 border-slate-800 rounded px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 pixel-btn pixel-btn-gold font-pixel-heading text-sm rounded mt-3 disabled:opacity-50"
          >
            {loading ? 'Conectando...' : isLogin ? 'Entrar no Jogo' : 'Criar Conta'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-500 font-pixel-body">
          Servidor Autoral Go • Conexão Segura JWT
        </div>
      </div>
    </div>
  );
}
