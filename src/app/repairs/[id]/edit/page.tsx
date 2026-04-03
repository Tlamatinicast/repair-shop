'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { DEVICE_TYPES, REPAIR_STATUSES } from '@/lib/utils';

export default function EditRepairPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [repair, setRepair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/repairs/${id}`)
      .then(r => r.json())
      .then(data => { setRepair(data); setLoading(false); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(`/api/repairs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al guardar');
      router.push(`/repairs/${id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta orden? Esta acción no se puede deshacer.')) return;
    await fetch(`/api/repairs/${id}`, { method: 'DELETE' });
    router.push('/repairs');
    router.refresh();
  };

  if (loading) return <div className="p-6 text-[#555] text-sm">Cargando...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/repairs/${id}`} className="btn-ghost"><ArrowLeft size={15} /></Link>
        <div>
          <p className="section-title mb-0.5">Editar</p>
          <h1 className="page-title font-mono">{repair?.ticketNumber}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#ccc] pb-3 border-b border-[#1a1a1a]">Dispositivo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select name="deviceType" className="select" defaultValue={repair.deviceType}>
                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="Marca" name="deviceBrand" defaultValue={repair.deviceBrand} />
            <Field label="Modelo" name="deviceModel" defaultValue={repair.deviceModel} />
            <Field label="No. Serie" name="serialNumber" defaultValue={repair.serialNumber ?? ''} />
            <Field label="Contraseña" name="password" defaultValue={repair.password ?? ''} />
            <div>
              <label className="label">Estado</label>
              <select name="status" className="select" defaultValue={repair.status}>
                {Object.entries(REPAIR_STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#ccc] pb-3 border-b border-[#1a1a1a]">Problema y diagnóstico</h2>
          <div>
            <label className="label">Problema reportado</label>
            <textarea name="issue" rows={3} defaultValue={repair.issue} className="input resize-none" />
          </div>
          <div>
            <label className="label">Diagnóstico técnico</label>
            <textarea name="diagnosis" rows={3} defaultValue={repair.diagnosis ?? ''} className="input resize-none" />
          </div>
          <div>
            <label className="label">Notas internas</label>
            <textarea name="notes" rows={2} defaultValue={repair.notes ?? ''} className="input resize-none" />
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#ccc] pb-3 border-b border-[#1a1a1a]">Costos</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mano de obra (MXN)" name="laborCost" type="number" defaultValue={String(repair.laborCost)} />
            <Field label="Total (MXN)" name="totalCost" type="number" defaultValue={String(repair.totalCost)} />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">{error}</div>
        )}

        <div className="flex justify-between items-center pt-2">
          <button type="button" onClick={handleDelete} className="flex items-center gap-2 text-sm text-red-500/70 hover:text-red-400 transition-colors">
            <Trash2 size={14} /> Eliminar orden
          </button>
          <div className="flex gap-3">
            <Link href={`/repairs/${id}`} className="btn-secondary">Cancelar</Link>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text', defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} className="input" />
    </div>
  );
}
