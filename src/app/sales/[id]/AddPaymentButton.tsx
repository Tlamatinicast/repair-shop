'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PAYMENT_METHODS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
};

interface Props {
  saleId: number;
  remaining: number;
}

export function AddPaymentButton({ saleId, remaining }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Ingresa un monto válido.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/sales/${saleId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, paymentMethod: method, notes }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setOpen(false);
      setAmount('');
      setNotes('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full justify-center py-2 text-sm">
        <Plus size={13} /> Registrar abono
      </button>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
      <p className="text-xs font-semibold text-[#ccc]">Registrar abono</p>
      <p className="text-[11px] text-[#555] font-mono">Saldo pendiente: {formatCurrency(remaining)}</p>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Monto del abono"
        className="input"
      />
      <select value={method} onChange={e => setMethod(e.target.value)} className="select">
        {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <input
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notas (opcional)"
        className="input"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => { setOpen(false); setError(''); }} className="btn-secondary flex-1 justify-center py-1.5 text-xs">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 justify-center py-1.5 text-xs disabled:opacity-40">
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
