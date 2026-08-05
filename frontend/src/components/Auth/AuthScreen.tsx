import React, { useState } from 'react';

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
    const endpoint = `http://localhost:8080${path}`;

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
          throw new Error('Este e-mail já possui cadastro no banco de dados! Clique na aba "Entrar na Conta" acima para fazer login.');
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

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-2xl shadow-lg mb-4 border border-amber-300/40">
            A
          </div>
          <h1 className="text-2xl font-black tracking-wide text-amber-400">PROJECT ATLAS</h1>
          <p className="text-xs text-slate-400 mt-1">Standalone IDLE MMORPG Assíncrono</p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              isLogin ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entrar na Conta
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              !isLogin ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-mono text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aventureiro@projectatlas.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Processando...' : isLogin ? 'Entrar no Jogo' : 'Criar Conta Grátis'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          Servidor Autoral Go • Conexão Segura JWT
        </div>
      </div>
    </div>
  );
}
