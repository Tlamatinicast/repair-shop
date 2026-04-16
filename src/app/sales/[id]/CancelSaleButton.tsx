'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, Loader2 } from 'lucide-react';

export function CancelSaleButton({ saleId, saleNumber }: { saleId: number; saleNumber: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm(`¿Cancelar la venta ${saleNumber}? El stock se restaurará automáticamente.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
      router.push('/sales');
      router.refresh();
    } catch {
      alert('Error al cancelar la venta.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all
        disabled:opacity-40 text-red-400/70 border-red-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
      {loading ? 'Cancelando...' : 'Cancelar venta'}
    </button>
  );
}
