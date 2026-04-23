'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Banknote } from 'lucide-react';

export function CashCountHelper({ expectedCash }: { expectedCash: number }) {
  const [counted, setCounted] = useState('');
  const countedNum = parseFloat(counted);
  const hasInput = counted !== '' && Number.isFinite(countedNum);
  const diff = hasInput ? countedNum - expectedCash : 0;

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Banknote size={14} className="text-amber-500" />
        <p className="section-title mb-0">Conciliación de efectivo</p>
      </div>
      <p className="text-xs text-[#666] mb-4 leading-relaxed">
        Captura cuánto efectivo tienes físicamente en caja. Solo es informativo — no se guarda nada.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label text-[9px]">Sistema (efectivo registrado)</label>
          <p className="font-mono text-base text-[#ddd] py-2">{formatCurrency(expectedCash)}</p>
        </div>
        <div>
          <label className="label text-[9px]">Conteo físico (MXN)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={counted}
            onChange={e => setCounted(e.target.value)}
            placeholder="0.00"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="label text-[9px]">Diferencia</label>
          <p className={`font-mono text-base py-2 ${
            !hasInput ? 'text-[#444]' :
            Math.abs(diff) < 0.01 ? 'text-green-400' :
            diff > 0 ? 'text-blue-400' : 'text-red-400'
          }`}>
            {hasInput ? (diff >= 0 ? '+' : '') + formatCurrency(diff) : '—'}
          </p>
        </div>
      </div>
      {hasInput && Math.abs(diff) >= 0.01 && (
        <p className={`text-xs mt-2 ${diff > 0 ? 'text-blue-400' : 'text-red-400'}`}>
          {diff > 0
            ? `Sobran ${formatCurrency(diff)} — revisa si hay un cobro sin registrar.`
            : `Faltan ${formatCurrency(Math.abs(diff))} — verifica los pagos recibidos.`}
        </p>
      )}
    </div>
  );
}
