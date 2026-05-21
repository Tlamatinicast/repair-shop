'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function ExpenseActions({ expenseId }: { expenseId: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este gasto?')) return;
    setLoading(true);
    try {
      await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-[#444] hover:text-red-400 transition-colors p-1 disabled:opacity-40"
      title="Eliminar gasto"
    >
      <Trash2 size={13} />
    </button>
  );
}
