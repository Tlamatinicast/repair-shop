'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, Clock, DollarSign, Loader2 } from 'lucide-react';

interface Props {
  repairId: number;
  laborCost: number;
  initialAdvance: number;
  initialPaymentStatus: string;
}

export function CostSummary({ repairId, laborCost, initialAdvance, initialPaymentStatus }: Props) {
  const router = useRouter();
  const [partsTotal, setPartsTotal] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [advance, setAdvance]       = useState(initialAdvance);
  const [payStatus, setPayStatus]   = useState(initialPaymentStatus);
  const [editing, setEditing]       = useState(false);
  const [inputVal, setInputVal]     = useState(String(initialAdvance));
  const [saving, setSaving]         = useState(false);

  const fetchTotals = async () => {
    try {
      const [partsRes, salesRes] = await Promise.all([
        fetch(`/api/repairs/${repairId}/parts`),
        fetch(`/api/sales?repairId=${repairId}`),
      ]);
      const parts: any[] = partsRes.ok ? await partsRes.json() : [];
      const sales: any[] = salesRes.ok ? await salesRes.json() : [];
      setPartsTotal(parts.reduce((s, p) => s + p.unitPrice * p.quantity, 0));
      setSalesTotal(sales.reduce((s, sale) => s + sale.total, 0));
    } catch { /* keep previous */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotals();
    const interval = setInterval(fetchTotals, 3000);
    return () => clearInterval(interval);
  }, [repairId]);

  const total   = laborCost + partsTotal + salesTotal;
  const pending = Math.max(0, total - advance);
  const isPaid  = payStatus === 'PAID';

  const handleSave = async () => {
    setSaving(true);
    const newAdvance = parseFloat(inputVal) || 0;
    const newStatus  = newAdvance >= total ? 'PAID' : 'PENDING';
    try {
      await fetch(`/api/repairs/${repairId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advancePayment: newAdvance, paymentStatus: newStatus }),
      });
      setAdvance(newAdvance);
      setPayStatus(newStatus);
      setEditing(false);
      router.refresh();
    } catch { alert('Error al guardar.'); }
    finally { setSaving(false); }
  };

  const markPaid = async () => {
    setSaving(true);
    try {
      await fetch(`/api/repairs/${repairId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advancePayment: total, paymentStatus: 'PAID' }),
      });
      setAdvance(total);
      setPayStatus('PAID');
      router.refresh();
    } catch { alert('Error al marcar como pagado.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">

      {/* Cost breakdown */}
      <div className="space-y-2">
        <Row label="Mano de obra" value={formatCurrency(laborCost)} />
        <Row label="Piezas" value={formatCurrency(partsTotal)} />
        {salesTotal > 0 && <Row label="Productos vendidos" value={formatCurrency(salesTotal)} />}
        <div className="flex justify-between items-center pt-2 border-t border-[#1e1e1e]">
          <span className="text-sm font-semibold text-[#ddd]">Total</span>
          <span className={`font-mono text-base font-semibold text-amber-400 transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}>
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#1e1e1e]" />

      {/* Payment status */}
      <div className={`flex items-center gap-2 p-3 rounded-xl border ${
        isPaid ? 'bg-green-400/5 border-green-400/20' : 'bg-amber-400/5 border-amber-400/20'
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
            <p className="text-[10px] text-[#555] font-mono">Resta: {formatCurrency(pending)}</p>
          )}
        </div>
      </div>

      {/* Payment rows */}
      <div className="space-y-1.5 px-1">
        <Row label="Anticipo recibido" value={formatCurrency(advance)} highlight="text-green-400" />
        {!isPaid && (
          <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[#1a1a1a]">
            <span className="text-[#888]">Saldo pendiente</span>
            <span className="font-mono text-amber-400">{formatCurrency(pending)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
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
            <DollarSign size={12} /> Anticipo
          </button>
          {!isPaid && (
            <button
              onClick={markPaid}
              disabled={saving || total === 0}
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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[#888]">{label}</span>
      <span className={`font-mono text-sm ${highlight ?? 'text-[#ccc]'}`}>{value}</span>
    </div>
  );
}
