'use client';

import { useState } from 'react';
import { Shield, ShieldOff, ShieldAlert, Loader2 } from 'lucide-react';

type WarrantyType = 'NONE' | 'DAYS_30' | 'DAYS_60';

interface Props {
  repairId: number;
  repairStatus: string;
  warrantyType: WarrantyType;
  warrantyVoided: boolean;
  deliveredAt: string | null;
  userRole: string;
  authorName: string;
}

function calcWarrantyStatus(warrantyType: WarrantyType, warrantyVoided: boolean, deliveredAt: string | null) {
  if (warrantyType === 'NONE') return { label: 'Sin garantía', color: 'text-[#666]', days: null };
  if (warrantyVoided) return { label: 'Anulada — equipo alterado', color: 'text-red-500', days: null };
  if (!deliveredAt) return { label: 'Inicia al entregar', color: 'text-amber-500', days: null };

  const totalDays = warrantyType === 'DAYS_30' ? 30 : 60;
  const start = new Date(deliveredAt);
  const expiry = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
  const today = new Date();
  const remaining = Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (remaining > 0) {
    return {
      label: `Vigente — ${remaining} día${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}`,
      color: 'text-green-400',
      days: remaining,
      expiry,
      totalDays,
    };
  }
  return { label: 'Vencida', color: 'text-red-400', days: 0, expiry, totalDays };
}

export function WarrantyCard({ repairId, repairStatus, warrantyType: initialType, warrantyVoided: initialVoided, deliveredAt, userRole, authorName }: Props) {
  const [warrantyType, setWarrantyType] = useState<WarrantyType>(initialType);
  const [warrantyVoided, setWarrantyVoided] = useState(initialVoided);
  const [saving, setSaving] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = calcWarrantyStatus(warrantyType, warrantyVoided, deliveredAt);
  const isDelivered = repairStatus === 'DELIVERED';
  const canVoid = isDelivered && !warrantyVoided && status.days !== null && (status.days as number) > 0;
  const canClaim = canVoid;

  const saveWarrantyType = async (newType: WarrantyType) => {
    setWarrantyType(newType);
    setSaving(true);
    await fetch(`/api/repairs/${repairId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warrantyType: newType }),
    });
    setSaving(false);
  };

  const registerReturn = async () => {
    if (!status.days || status.days <= 0) return;
    setSubmitting(true);
    const totalDays = warrantyType === 'DAYS_30' ? 30 : 60;
    const dayUsed = totalDays - (status.days as number);
    const content = `↩ Regreso en garantía — Día ${dayUsed} de ${totalDays} (quedan ${status.days} días).${returnNote.trim() ? ' ' + returnNote.trim() : ''}`;

    const fd = new FormData();
    fd.append('content', content);
    fd.append('stage', 'WARRANTY');
    await fetch(`/api/repairs/${repairId}/notes`, { method: 'POST', body: fd });

    await fetch(`/api/repairs/${repairId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_REPAIR' }),
    });

    setShowReturnForm(false);
    setReturnNote('');
    setSubmitting(false);
    window.location.reload();
  };

  const voidWarranty = async () => {
    if (!confirm('¿Confirmar que el equipo fue alterado y anular la garantía?')) return;
    setSubmitting(true);

    await fetch(`/api/repairs/${repairId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warrantyVoided: true, warrantyVoidReason: 'TAMPERED' }),
    });

    const fd = new FormData();
    fd.append('content', '⚠ Garantía anulada — equipo alterado. Se requiere nueva orden de trabajo.');
    fd.append('stage', 'WARRANTY');
    await fetch(`/api/repairs/${repairId}/notes`, { method: 'POST', body: fd });

    setWarrantyVoided(true);
    setSubmitting(false);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a1a] mb-4">
        <Shield size={14} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-[#ccc]">Garantía</h2>
        {saving && <Loader2 size={12} className="animate-spin text-[#555] ml-auto" />}
      </div>

      {/* Selector de tipo */}
      <div className="mb-4">
        <p className="label mb-1.5">Tipo de garantía</p>
        <div className="flex gap-2">
          {(['NONE', 'DAYS_30', 'DAYS_60'] as WarrantyType[]).map((t) => {
            const labels = { NONE: 'No aplica', DAYS_30: '30 días', DAYS_60: '60 días' };
            return (
              <button
                key={t}
                onClick={() => saveWarrantyType(t)}
                disabled={saving}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                  warrantyType === t
                    ? 'bg-amber-500 border-amber-500 text-black'
                    : 'border-[#333] text-[#888] hover:border-[#555] hover:text-[#ccc]'
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Estado de garantía */}
      {warrantyType !== 'NONE' && (
        <div className="mb-4 space-y-1">
          <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
          {(status as any).expiry && (
            <p className="text-xs text-[#555]">
              Vence: {(status as any).expiry.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {/* Acciones de garantía */}
      {canClaim && !showReturnForm && (
        <button
          onClick={() => setShowReturnForm(true)}
          className="btn-secondary w-full justify-center text-xs mb-2"
        >
          <Shield size={12} /> Registrar regreso en garantía
        </button>
      )}

      {showReturnForm && (
        <div className="space-y-2 mb-2">
          <textarea
            value={returnNote}
            onChange={e => setReturnNote(e.target.value)}
            placeholder="Descripción del problema reportado (opcional)"
            className="input w-full text-sm resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={registerReturn} disabled={submitting} className="btn-primary flex-1 justify-center text-xs disabled:opacity-50">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar regreso'}
            </button>
            <button onClick={() => setShowReturnForm(false)} className="btn-ghost text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {canVoid && (
        <button
          onClick={voidWarranty}
          disabled={submitting}
          className="w-full justify-center text-xs px-3 py-1.5 rounded border border-red-900 text-red-500 hover:bg-red-950 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <ShieldOff size={12} /> Rechazar — equipo alterado
        </button>
      )}

      {warrantyVoided && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <ShieldAlert size={12} />
          <span>Garantía anulada — crear nueva orden</span>
        </div>
      )}
    </div>
  );
}
