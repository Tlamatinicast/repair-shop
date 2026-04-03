'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { INVENTORY_CATEGORIES, formatCurrency } from '@/lib/utils';

export default function InventoryItemPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/inventory/${params.id}`)
      .then(r => r.json())
      .then(data => { setItem(data); setLoading(false); });
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch(`/api/inventory/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const updated = await res.json();
      setItem(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este artículo del inventario?')) return;
    await fetch(`/api/inventory/${params.id}`, { method: 'DELETE' });
    router.push('/inventory');
  };

  if (loading) return <div className="p-6 text-[#555]">Cargando...</div>;
  if (!item || item.error) return <div className="p-6 text-red-400">Artículo no encontrado</div>;

  const margin = item.salePrice > 0
    ? (((item.salePrice - item.costPrice) / item.salePrice) * 100).toFixed(1)
    : '0';
  const isLowStock = item.quantity <= item.minQuantity;

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="btn-ghost"><ArrowLeft size={15} /></Link>
        <div className="flex-1">
          <p className="section-title mb-0.5">Inventario</p>
          <div className="flex items-center gap-2">
            <h1 className="page-title">{item.name}</h1>
            {isLowStock && (
              <span className="badge text-amber-400 bg-amber-400/10 border-amber-400/20 flex items-center gap-1">
                <AlertTriangle size={10} /> Stock bajo
              </span>
            )}
          </div>
        </div>
        <button onClick={handleDelete} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-400/5">
          <Trash2 size={14} /> Eliminar
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 border border-[#1e1e1e]">
          <p className="section-title mb-2">Stock actual</p>
          <p className={`font-mono text-2xl font-semibold ${isLowStock ? 'text-amber-400' : 'text-green-400'}`}>
            {item.quantity}
          </p>
          <p className="text-xs text-[#555] mt-1">Mín: {item.minQuantity}</p>
        </div>
        <div className="card p-4 border border-[#1e1e1e]">
          <p className="section-title mb-2">Precio venta</p>
          <p className="font-mono text-2xl font-semibold text-amber-400">{formatCurrency(item.salePrice)}</p>
          <p className="text-xs text-[#555] mt-1">Costo: {formatCurrency(item.costPrice)}</p>
        </div>
        <div className="card p-4 border border-[#1e1e1e]">
          <p className="section-title mb-2">Margen</p>
          <p className="font-mono text-2xl font-semibold text-violet-400">{margin}%</p>
          <p className="text-xs text-[#555] mt-1">Ganancia por unidad</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="card p-5">
          <SectionTitle icon={<Package size={14} />} title="Información del artículo" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2">
              <label className="label">Nombre *</label>
              <input name="name" defaultValue={item.name} className="input" required />
            </div>
            <div>
              <label className="label">SKU *</label>
              <input name="sku" defaultValue={item.sku} className="input font-mono" required />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select name="category" defaultValue={item.category} className="select">
                {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ubicación en taller</label>
              <input name="location" defaultValue={item.location ?? ''} placeholder="Ej. Cajón A1" className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Descripción</label>
              <textarea name="description" defaultValue={item.description ?? ''} rows={2}
                className="input resize-none" placeholder="Descripción opcional..." />
            </div>
          </div>
        </div>

        {/* Stock & pricing */}
        <div className="card p-5">
          <SectionTitle icon={<TrendingUp size={14} />} title="Stock y precios" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">Cantidad en stock</label>
              <input name="quantity" type="number" min="0" defaultValue={item.quantity} className="input" />
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input name="minQuantity" type="number" min="0" defaultValue={item.minQuantity} className="input" />
            </div>
            <div>
              <label className="label">Precio de costo (MXN)</label>
              <input name="costPrice" type="number" step="0.01" min="0" defaultValue={item.costPrice} className="input" />
            </div>
            <div>
              <label className="label">Precio de venta (MXN)</label>
              <input name="salePrice" type="number" step="0.01" min="0" defaultValue={item.salePrice} className="input" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/inventory" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            <Save size={14} /> {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a1a]">
      <span className="text-amber-500">{icon}</span>
      <h2 className="text-sm font-semibold text-[#ccc]">{title}</h2>
    </div>
  );
}
