'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REPAIR_STATUSES, type RepairStatus } from '@/lib/utils';
import { Check } from 'lucide-react';

export function UpdateStatusForm({ repairId, currentStatus }: { repairId: number; currentStatus: RepairStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    setSaving(true);
    await fetch(`/api/repairs/${repairId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <select
        className="select"
        value={status}
        onChange={(e) => setStatus(e.target.value as RepairStatus)}
      >
        {Object.entries(REPAIR_STATUSES).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
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
