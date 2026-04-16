'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Loader2, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function PaymentStatus({
  repairId,
  totalCost,
  initialAdvance,
  initialStatus,
}: {
  repairId: number;
  totalCost: number;
  initialAdvance: number;
  initialStatus: string;
}) {
  const router = useRouter();
  const [advance, setAdvance]   = useState(initialAdvance);
  const [status, setStatus]     = useState(initialStatus);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [inputVal, setInputVal] = useState(String(initialAdvance));

  const pending = Math.max(0, totalCost - advance);
  const isPaid  = status === 'PAID';

  const handleSave = async () => {
    setSaving(true);
    const newAdvance = parseFloat(inputVal) || 0;
    const newStatus  = newAdvance >= totalCost ? 'PAID' : 'PENDING';
    try {
      await fetch(`/api/repairs/${repairId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advancePayment: newAdvance, paymentStatus: newStatus }),
      });
      setAdvance(newAdvance);
      setStatus(newStatus);
      setEditing(false);
      router.refresh();
    } catch {
      alert('Error al guardar el pago.');
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    setSaving(true);
    try {
      await fetch(`/api/repairs/${repairId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advancePayment: totalCost, paymentStatus: 'PAID' }),
      });
      setAdvance(totalCost);
      setStatus('PAID');
      router.refresh();
    } catch {
      alert('Error al marcar como pagado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className={`flex items-center gap-2 p-3 rounded-xl border ${
        isPaid
          ? 'bg-green-400/5 border-green-400/20'
          : 'bg-amber-400/5 border-amber-400/20'
      }`}>
        {isPaid
          ? <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
          : <Clock size={14} className="text-amber-400 flex-shrink-0" />
        }
        <div className="flex-1">
          <p className={`text-xs font-semibold ${isPaid ? 'text-green-400' : 'text-amber-400'}`}>
            {isPaid ? 'Pagado' : 'Pendiente de pago'}
          </p>
          {!isPaid && (
            <p className="text-[10px] text-[#555] font-mono">
              Resta: {formatCurrency(pending)}
            </p>
          )}
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="space-y-1.5 px-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#666]">Total orden</span>
          <span className="font-mono text-[#ccc]">{formatCurrency(totalCost)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#666]">Anticipo recibido</span>
          <span className="font-mono text-green-400">{formatCurrency(advance)}</span>
        </div>
        {!isPaid && (
          <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[#1a1a1a]">
            <span className="text-[#888]">Saldo pendiente</span>
            <span className="font-mono text-amber-400">{formatCurrency(pending)}</span>
          </div>
        )}
      </div>

      {/* Edit advance */}
      {editing ? (
        <div className="space-y-2">
          <div>
            <label className="label text-[9px]">Anticipo recibido (MXN)</label>
            <input
              type="number" min="0" step="0.01"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="input"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-ghost flex-1 justify-center text-xs">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center text-xs disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => { setEditing(true); setInputVal(String(advance)); }}
            className="btn-secondary flex-1 justify-center text-xs"
          >
            <DollarSign size={12} /> Registrar anticipo
          </button>
          {!isPaid && (
            <button
              onClick={markPaid}
              disabled={saving || totalCost === 0}
              className="btn-primary flex-1 justify-center text-xs disabled:opacity-40"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Pagado</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
