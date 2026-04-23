'use client';

import { INVENTORY_CATEGORIES } from '@/lib/utils';

export function InventoryCategorySelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select
      name="category"
      defaultValue={defaultValue ?? ''}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="select"
    >
      <option value="">Todas las categorías</option>
      {INVENTORY_CATEGORIES.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}
