'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, EyeOff, Eye } from 'lucide-react';

export function TemplateActions({ templateId, active }: { templateId: number; active: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    setLoading(true);
    try {
      await fetch(`/api/expenses/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!confirm('¿Eliminar esta plantilla? Los gastos registrados no se borrarán.')) return;
    setLoading(true);
    try {
      await fetch(`/api/expenses/templates/${templateId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={toggle}
        disabled={loading}
        className="text-[#444] hover:text-amber-400 transition-colors p-1.5 disabled:opacity-40"
        title={active ? 'Desactivar' : 'Activar'}
      >
        {active ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button
        onClick={remove}
        disabled={loading}
        className="text-[#444] hover:text-red-400 transition-colors p-1.5 disabled:opacity-40"
        title="Eliminar plantilla"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
