'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function LoginForm({ businessName }: { businessName: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = e.currentTarget;
    const email    = (form.elements.namedItem('email')    as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      // El rate-limiter lanza un mensaje que empieza con "Demasiados intentos".
      setError(
        result.error.startsWith('Demasiados')
          ? result.error
          : 'Correo o contraseña incorrectos.'
      );
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] bg-grid flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#111] border border-[#222] flex items-center justify-center mb-4 shadow-2xl shadow-black/50">
            <Image src="/logo.png" alt={businessName} width={80} height={80} className="object-contain" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-widest" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
            {businessName}
          </h1>
          <p className="text-sm text-[#555] mt-1">Sistema de Gestión</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Correo electrónico</label>
            <input name="email" type="email" required autoComplete="email" placeholder="admin@taller.com" className="input" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#999] transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 disabled:opacity-50">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Entrando...</> : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-xs text-[#333] mt-6 font-mono">
          {businessName} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
