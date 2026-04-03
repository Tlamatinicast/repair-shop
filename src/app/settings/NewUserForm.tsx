'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';

export function NewUserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const user = await res.json();
      setSuccess(`Usuario "${user.name}" creado correctamente.`);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">Nombre completo *</label>
        <input name="name" required className="input" placeholder="Ej. Juan Técnico" />
      </div>
      <div>
        <label className="label">Correo electrónico *</label>
        <input name="email" type="email" required className="input" placeholder="tecnico@taller.com" />
      </div>
      <div>
        <label className="label">Contraseña *</label>
        <input name="password" type="password" required minLength={6} className="input" placeholder="Mínimo 6 caracteres" />
      </div>
      <div>
        <label className="label">Rol</label>
        <select name="role" className="select">
          <option value="TECHNICIAN">Técnico</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      {error   && <p className="col-span-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}
      {success && <p className="col-span-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3">{success}</p>}

      <div className="col-span-2 flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          <UserPlus size={14} />
          {loading ? 'Creando...' : 'Crear usuario'}
        </button>
      </div>
    </form>
  );
}
