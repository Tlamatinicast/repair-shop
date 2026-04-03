'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al crear el cliente');
      const { id } = await res.json();
      router.push(`/customers/${id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="btn-ghost"><ArrowLeft size={15} /></Link>
        <div>
          <p className="section-title mb-0.5">Clientes</p>
          <h1 className="page-title">Nuevo cliente</h1>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <Field label="Nombre completo *" name="name" required />
        <Field label="Teléfono *" name="phone" required />
        <Field label="Correo electrónico" name="email" type="email" />
        <Field label="Dirección" name="address" />
        <div>
          <label className="label">Notas</label>
          <textarea name="notes" rows={3} className="input resize-none" placeholder="Observaciones del cliente..." />
        </div>
        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/customers" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            <Save size={14} /> {loading ? 'Guardando...' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text', required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} required={required} className="input" />
    </div>
  );
}
