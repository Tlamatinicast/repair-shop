'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { INVENTORY_CATEGORIES } from '@/lib/utils';

export default function NewInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al crear el artículo');
      router.push('/inventory');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="btn-ghost"><ArrowLeft size={15} /></Link>
        <div>
          <p className="section-title mb-0.5">Inventario</p>
          <h1 className="page-title">Nueva pieza</h1>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre *" name="name" required className="col-span-2" />
          <Field label="SKU *" name="sku" required placeholder="Ej. SCR-MBP13" />
          <div>
            <label className="label">Tipo *</label>
            <select name="itemType" className="select" required>
              <option value="">Seleccionar...</option>
              <option value="PARTS">Refacción (uso interno)</option>
              <option value="PRODUCTS">Producto (venta mostrador)</option>
              <option value="TOOLS">Herramienta</option>
            </select>
          </div>
          <div>
            <label className="label">Categoría *</label>
            <select name="category" className="select" required>
              <option value="">Seleccionar...</option>
              {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Stock inicial" name="quantity" type="number" defaultValue="0" />
          <Field label="Stock mínimo" name="minQuantity" type="number" defaultValue="1" />
          <Field label="Precio de costo (MXN)" name="costPrice" type="number" step="0.01" defaultValue="0" />
          <Field label="Precio de venta (MXN)" name="salePrice" type="number" step="0.01" defaultValue="0" />
          <Field label="Ubicación física" name="location" placeholder="Ej. Cajón A1" className="col-span-2" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea name="description" rows={2} className="input resize-none" />
        </div>
        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/inventory" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            <Save size={14} /> {loading ? 'Guardando...' : 'Guardar pieza'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text', required, placeholder, defaultValue, className = '', step }: {
  label: string; name: string; type?: string; required?: boolean;
  placeholder?: string; defaultValue?: string; className?: string; step?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} step={step} className="input" />
    </div>
  );
}
