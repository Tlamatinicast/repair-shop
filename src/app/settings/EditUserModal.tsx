'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { User } from './UserList';

type Props = {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
};

export function EditUserModal({ user, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    password: '',
  });

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body: any = { name: form.name, email: form.email, role: form.role, active: form.active };
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const updated = await res.json();
      onSaved(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-sm font-semibold text-[#ccc]">Editar usuario</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              className="input"
              placeholder="Nombre"
            />
          </div>
          <div>
            <label className="label">Correo electrónico *</label>
            <input
              value={form.email}
              onChange={e => set('email', e.target.value)}
              type="email"
              required
              className="input"
              placeholder="correo@taller.com"
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="select">
              <option value="TECHNICIAN">Técnico</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              value={form.active ? 'true' : 'false'}
              onChange={e => set('active', e.target.value === 'true')}
              className="select"
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Nueva contraseña <span className="text-[#444]">(dejar vacío para no cambiar)</span></label>
            <input
              value={form.password}
              onChange={e => set('password', e.target.value)}
              type="password"
              minLength={6}
              className="input"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && <p className="col-span-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              <Save size={13} />
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
