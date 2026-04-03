'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';

interface CustomerData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export function CustomerActions({
  customerId,
  customerName,
  hasActiveRepairs,
  customer,
}: {
  customerId: number;
  customerName: string;
  hasActiveRepairs: boolean;
  customer: CustomerData;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CustomerData>(customer);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setEditing(false);
      router.refresh();
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (hasActiveRepairs) {
      setError('Este cliente tiene órdenes activas. Ciérralas antes de eliminar.');
      return;
    }
    if (!confirm(`¿Eliminar a ${customerName}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/customers');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-[#ccc]">Editar cliente</p>
          <button onClick={() => { setEditing(false); setError(''); setForm(customer); }} className="text-[#555] hover:text-[#999]">
            <X size={14} />
          </button>
        </div>
        <Field label="Nombre" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
        <Field label="Teléfono" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
        <Field label="Correo" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
        <Field label="Dirección" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
        <div>
          <label className="label">Notas</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="input resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center disabled:opacity-50">
          {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : <><Save size={13} /> Guardar cambios</>}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}
      <button onClick={() => { setEditing(true); setError(''); }} className="btn-secondary w-full justify-center">
        <Edit2 size={13} /> Editar cliente
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting || hasActiveRepairs}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          text-red-400/70 border-red-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
      >
        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        {deleting ? 'Eliminando...' : hasActiveRepairs ? 'Tiene órdenes activas' : 'Eliminar cliente'}
      </button>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="input" />
    </div>
  );
}
