'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { MobileHeader } from '@/components/MobileHeader';

const CATEGORIES = [
  { value: 'RENT',        label: 'Renta' },
  { value: 'UTILITIES',   label: 'Servicios (luz, agua, internet)' },
  { value: 'SALARY',      label: 'Salarios / Sueldo propio' },
  { value: 'SUPPLIES',    label: 'Insumos y materiales' },
  { value: 'TRANSPORT',   label: 'Transporte' },
  { value: 'MARKETING',   label: 'Publicidad y marketing' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'OTHER',       label: 'Otro' },
];

const PAYMENT_METHODS = [
  { value: 'CASH',     label: 'Efectivo' },
  { value: 'CARD',     label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER',    label: 'Otro' },
];

interface Template {
  id: number;
  description: string;
  category: string;
  expenseType: string;
  defaultAmount: number;
  paymentMethod: string;
  active: boolean;
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function NewExpensePage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [category, setCategory]       = useState('');
  const [expenseType, setExpenseType] = useState('FIXED');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes]             = useState('');
  const [date, setDate]               = useState(todayLocal());
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    fetch('/api/expenses/templates')
      .then(r => r.json())
      .then((data: Template[]) => setTemplates(data.filter(t => t.active !== false)))
      .catch(() => {});
  }, []);

  // When a template is selected, pre-fill fields
  const handleTemplate = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find(t => t.id === Number(id));
    if (!t) return;
    setDescription(t.description);
    setCategory(t.category);
    setExpenseType(t.expenseType);
    setPaymentMethod(t.paymentMethod);
    if (t.defaultAmount > 0) setAmount(String(t.defaultAmount));
    else setAmount('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!description.trim() || !amount || !category || !date) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount:      parseFloat(amount),
          category,
          expenseType,
          paymentMethod,
          notes:       notes.trim() || null,
          date:        new Date(date + 'T12:00:00').toISOString(),
          templateId:  templateId ? Number(templateId) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Error al guardar');
        return;
      }
      router.push('/expenses');
      router.refresh();
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const activeTemplates = templates.filter(t => t.active !== false);

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-xl mx-auto animate-in">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/expenses" className="btn-ghost"><ArrowLeft size={15} /></Link>
          <div>
            <p className="section-title mb-0.5">Control de gastos</p>
            <h1 className="page-title">Nuevo gasto</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-5 space-y-4">

          {/* Template selector */}
          {activeTemplates.length > 0 && (
            <div>
              <label className="label">Cargar desde plantilla</label>
              <select
                value={templateId}
                onChange={e => handleTemplate(e.target.value)}
                className="select"
              >
                <option value="">— Sin plantilla —</option>
                {activeTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="label">Descripción *</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input"
              placeholder="Ej. Renta de local, Pago de luz..."
              required
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label">Categoría *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="select"
              required
            >
              <option value="">Seleccionar...</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Type + Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select value={expenseType} onChange={e => setExpenseType(e.target.value)} className="select">
                <option value="FIXED">Fijo</option>
                <option value="VARIABLE">Variable</option>
              </select>
            </div>
            <div>
              <label className="label">Método de pago</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="select">
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input"
              placeholder="Opcional — período, proveedor, etc."
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Link href="/expenses" className="btn-ghost flex-1 justify-center">Cancelar</Link>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Guardando...' : <><Plus size={14} /> Guardar gasto</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
