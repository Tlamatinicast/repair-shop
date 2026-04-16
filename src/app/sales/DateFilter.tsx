'use client';

import { useRouter } from 'next/navigation';

export function DateFilter({ date, today }: { date: string; today: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 mb-5">
      <label className="text-xs text-[#666] font-mono">Fecha:</label>
      <input
        type="date"
        defaultValue={date}
        className="input max-w-44"
        onChange={e => router.push(`/sales?date=${e.target.value}`)}
      />
      {date !== today && (
        <button
          onClick={() => router.push('/sales')}
          className="text-xs text-amber-500 hover:text-amber-400 font-mono"
        >
          Hoy
        </button>
      )}
    </div>
  );
}
