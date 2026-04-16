'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REPAIR_STATUSES, type RepairStatus } from '@/lib/utils';
import { Check, AlertTriangle } from 'lucide-react';

interface Props {
  repairId: number;
  currentStatus: RepairStatus;
  paymentStatus: string;
}

export function UpdateStatusForm({ repairId, currentStatus, paymentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Terminal states: no status change allowed once in these
  const isTerminal = currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED';

  const handleUpdate = async () => {
    setError('');

    // Validate: DELIVERED requires payment to be PAID
    if (status === 'DELIVERED' && paymentStatus !== 'PAID') {
      setError('No se puede marcar como Entregado: el servicio tiene saldo pendiente. Salda el pago primero.');
      return;
    }

    // Confirm terminal transitions
    if (status === 'DELIVERED') {
      const ok = confirm(
        '¿Confirmar entrega del equipo?\n\nEsto marcará la orden como ENTREGADA y ya no podrá editarse.'
      );
      if (!ok) return;
    }
    if (status === 'CANCELLED') {
      const ok = confirm(
        '¿Cancelar esta orden de servicio?\n\nEsta acción marcará la orden como CANCELADA y ya no podrá editarse.'
      );
      if (!ok) return;
    }

    setSaving(true);
    const res = await fetch(`/api/repairs/${repairId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Error al actualizar el estado.');
      setSaving(false);
      return;
    }

    router.refresh();
    setSaving(false);
  };

  if (isTerminal) {
    return (
      <div className="text-xs text-[#555] text-center py-2">
        La orden está <span className="text-amber-400 font-mono">{REPAIR_STATUSES[currentStatus]?.label}</span>.<br />
        El estado ya no puede modificarse.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <select
        className="select"
        value={status}
        onChange={(e) => { setStatus(e.target.value as RepairStatus); setError(''); }}
      >
        {Object.entries(REPAIR_STATUSES).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>

      {/* Warning when trying to deliver with pending payment */}
      {status === 'DELIVERED' && paymentStatus !== 'PAID' && (
        <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-2.5">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>El servicio tiene saldo pendiente. Salda el pago antes de entregarlo.</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2.5">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleUpdate}
        disabled={saving || status === currentStatus}
        className="btn-primary w-full justify-center disabled:opacity-40"
      >
        <Check size={14} />
        {saving ? 'Guardando...' : 'Actualizar estado'}
      </button>
    </div>
  );
}
