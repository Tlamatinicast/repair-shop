'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { INVENTORY_CATEGORIES } from '@/lib/utils';

export default function EditInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/inventory/${id}`)
      .then(r => r.json())
      .then(data => { setItem(data); setLoading(false); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al guardar');
      router.push('/inventory');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este artículo del inventario?')) return;
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    router.push('/inventory');
  };

  if (loading) return <div className="p-6 text-[#555] text-sm">Cargando...</div>;

  return (
    <div className="p-6 max-w-xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="btn-ghost"><ArrowLeft size={15} /></Link>
        <div>
          <p className="section-title mb-0.5">Inventario</p>
          <h1 className="page-title">Editar artículo</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre *" name="name" defaultValue={item.name} required className="col-span-2" />
          <Field label="SKU" name="sku" defaultValue={item.sku} />
          <div>
            <label className="label">Tipo *</label>
            <select name="itemType" className="select" defaultValue={item.itemType ?? 'PARTS'} required>
              <option value="PARTS">Refacción (uso interno)</option>
              <option value="PRODUCTS">Producto (venta mostrador)</option>
              <option value="TOOLS">Herramienta</option>
            </select>
          </div>
          <div>
            <label className="label">Categoría</label>
            <select name="category" className="select" defaultValue={item.category}>
              {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Stock actual" name="quantity" type="number" defaultValue={String(item.quantity)} />
          <Field label="Stock mínimo" name="minQuantity" type="number" defaultValue={String(item.minQuantity)} />
          <Field label="Precio costo (MXN)" name="costPrice" type="number" step="0.01" defaultValue={String(item.costPrice)} />
          <Field label="Precio venta (MXN)" name="salePrice" type="number" step="0.01" defaultValue={String(item.salePrice)} />
          <Field label="Ubicación" name="location" defaultValue={item.location ?? ''} className="col-span-2" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea name="description" rows={2} defaultValue={item.description ?? ''} className="input resize-none" />
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

        <div className="flex justify-between items-center pt-2">
          <button type="button" onClick={handleDelete} className="flex items-center gap-2 text-sm text-red-500/70 hover:text-red-400 transition-colors">
            <Trash2 size={14} /> Eliminar
          </button>
          <div className="flex gap-3">
            <Link href="/inventory" className="btn-secondary">Cancelar</Link>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text', defaultValue, required, step, placeholder, className = '' }: {
  label: string; name: string; type?: string; defaultValue?: string;
  required?: boolean; step?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} required={required}
        step={step} placeholder={placeholder} className="input" />
    </div>
  );
}
