'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

export function BusinessNameForm({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'businessName', value }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="label">Nombre del negocio</label>
        <input
          value={value}
          onChange={e => { setValue(e.target.value); setSuccess(false); }}
          required
          className="input"
          placeholder="Ej. TLAMATECH"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50 shrink-0">
        <Save size={13} />
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
      {success && <span className="text-xs text-green-400 self-end pb-2">Guardado</span>}
      {error   && <span className="text-xs text-red-400 self-end pb-2">{error}</span>}
    </form>
  );
}
