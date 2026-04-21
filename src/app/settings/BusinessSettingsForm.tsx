'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import type { BusinessSettings } from '@/lib/businessSettings';

export function BusinessSettingsForm({ current }: { current: BusinessSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...current });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof BusinessSettings, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await Promise.all([
        fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'businessName',   value: form.name }) }),
        fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'businessPhone',  value: form.phone }) }),
        fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'businessDomain', value: form.domain }) }),
      ]);
      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Nombre del negocio</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} required className="input" placeholder="Ej. TLAMATECH" />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="999 190 4814" />
        </div>
        <div>
          <label className="label">Página / Facebook</label>
          <input value={form.domain} onChange={e => set('domain', e.target.value)} className="input" placeholder="facebook.com/tu-negocio" />
        </div>
      </div>

      {error   && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}
      {success && <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3">Cambios guardados correctamente.</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          <Save size={13} />
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
