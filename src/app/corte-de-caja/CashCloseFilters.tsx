'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PRESETS: { key: string; label: string }[] = [
  { key: 'today',      label: 'Hoy' },
  { key: 'yesterday',  label: 'Ayer' },
  { key: 'this-week',  label: 'Esta semana' },
  { key: 'this-month', label: 'Este mes' },
];

export function CashCloseFilters({
  activePreset, activeFrom, activeTo,
}: {
  activePreset: string | null;
  activeFrom: string | null;
  activeTo: string | null;
}) {
  const router = useRouter();
  const [showCustom, setShowCustom] = useState(!activePreset);
  const [from, setFrom] = useState(activeFrom ?? '');
  const [to, setTo] = useState(activeTo ?? '');

  const goPreset = (preset: string) => {
    router.push(`/corte-de-caja?preset=${preset}`);
    setShowCustom(false);
  };

  const goCustom = () => {
    if (!from || !to) return;
    router.push(`/corte-de-caja?from=${from}&to=${to}`);
  };

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2 mb-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => goPreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              activePreset === p.key
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'text-[#666] border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-[#aaa]'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(s => !s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            !activePreset || showCustom
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'text-[#666] border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-[#aaa]'
          }`}
        >
          Rango...
        </button>
      </div>

      {showCustom && (
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end p-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl">
          <div className="md:flex-1">
            <label className="label text-[9px]">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input text-xs" />
          </div>
          <div className="md:flex-1">
            <label className="label text-[9px]">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input text-xs" />
          </div>
          <button onClick={goCustom} disabled={!from || !to} className="btn-primary text-xs disabled:opacity-40">
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
