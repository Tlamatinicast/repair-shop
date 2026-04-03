import { REPAIR_STATUSES, type RepairStatus } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const s = REPAIR_STATUSES[status as RepairStatus] ?? { label: status, color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' };
  return (
    <span className={`badge ${s.color}`}>
      {s.label}
    </span>
  );
}
