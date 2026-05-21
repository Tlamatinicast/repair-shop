'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, X } from 'lucide-react';

export function DateFilter({ dateFilter, today }: { dateFilter: string | null; today: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="flex items-center gap-2 text-[#555]">
        <CalendarDays size={14} />
        <label className="text-xs text-[#666] font-mono">Filtrar por día:</label>
      </div>
      <input
        type="date"
        value={dateFilter ?? ''}
        className="input max-w-44"
        onChange={e => {
          if (e.target.value) router.push(`/sales?date=${e.target.value}`);
          else router.push('/sales');
        }}
      />
      {dateFilter && (
        <button
          onClick={() => router.push('/sales')}
          className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-mono transition-colors"
          title="Quitar filtro"
        >
          <X size={12} /> Todas
        </button>
      )}
    </div>
  );
}
