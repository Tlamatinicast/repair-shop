'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

const CATEGORIES = [
  { value: 'RENT',        label: 'Renta' },
  { value: 'UTILITIES',   label: 'Servicios' },
  { value: 'SALARY',      label: 'Salarios / Sueldo propio' },
  { value: 'SUPPLIES',    label: 'Insumos' },
  { value: 'TRANSPORT',   label: 'Transporte' },
  { value: 'MARKETING',   label: 'Publicidad' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'OTHER',       label: 'Otro' },
];

const PAYMENT_METHODS = [
  { value: 'CASH',     label: 'Efectivo' },
  { value: 'CARD',     label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER',    label: 'Otro' },
];

export function NewTemplateForm() {
  const router = useRouter();
  const [description,   setDescription]   = useState('');
  const [category,      setCategory]      = useState('');
  const [expenseType,   setExpenseType]   = useState('FIXED');
  const [defaultAmount, setDefaultAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!description.trim() || !category) {
      setError('Descripción y categoría son obligatorias.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/expenses/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description:   description.trim(),
          category,
          expenseType,
          defaultAmount: defaultAmount ? parseFloat(defaultAmount) : 0,
          paymentMethod,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Error al guardar');
        return;
      }
      setDescription('');
      setCategory('');
      setExpenseType('FIXED');
      setDefaultAmount('');
      setPaymentMethod('CASH');
      router.refresh();
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-[#ccc]">Nueva plantilla</h2>

      <div>
        <label className="label">Descripción *</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="input"
          placeholder="Ej. Renta mensual, Sueldo propio..."
          required
        />
      </div>

      <div>
        <label className="label">Categoría *</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className="select" required>
          <option value="">Seleccionar...</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Tipo</label>
        <select value={expenseType} onChange={e => setExpenseType(e.target.value)} className="select">
          <option value="FIXED">Fijo</option>
          <option value="VARIABLE">Variable</option>
        </select>
      </div>

      <div>
        <label className="label">Monto por defecto</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={defaultAmount}
          onChange={e => setDefaultAmount(e.target.value)}
          className="input"
          placeholder="0.00 — dejar en 0 si es variable"
        />
      </div>

      <div>
        <label className="label">Método de pago</label>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="select">
          {PAYMENT_METHODS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
        {loading ? 'Guardando...' : <><Plus size={14} /> Crear plantilla</>}
      </button>
    </form>
  );
}
