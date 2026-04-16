'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, Loader2, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  salePrice: number;
  costPrice: number;
  quantity: number;
  reservedQty: number;
  category: string;
}

interface Part {
  id: number;
  itemId: number;
  quantity: number;
  unitPrice: number;
  reserved: boolean;
  item: { name: string; sku: string };
}

export function RepairParts({
  repairId,
  initialParts,
}: {
  repairId: number;
  initialParts: Part[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [parts, setParts]         = useState<Part[]>(initialParts);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch]       = useState('');
  const [filtered, setFiltered]   = useState<InventoryItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selected, setSelected]   = useState<InventoryItem | null>(null);
  const [qty, setQty]             = useState(1);
  const [price, setPrice]         = useState(0);
  const [reserved, setReserved]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(setInventory);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered([]); return; }
    const q = search.toLowerCase();
    setFiltered(
      inventory.filter(i =>
        i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      ).slice(0, 6)
    );
  }, [search, inventory]);

  const selectItem = (item: InventoryItem) => {
    setSelected(item);
    setPrice(item.costPrice);
    setQty(1);
    setSearch('');
    setFiltered([]);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/repairs/${repairId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selected.id, quantity: qty, unitPrice: price, reserved }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const part = await res.json();
      setParts(prev => [...prev, part]);
      setSelected(null);
      setQty(1);
      setPrice(0);
      setReserved(false);
      // Refresh to update cost summary in sidebar
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (partId: number) => {
    if (!confirm('¿Quitar esta pieza de la orden?')) return;
    // Optimistically remove from UI first
    setParts(prev => prev.filter(p => p.id !== partId));
    try {
      const res = await fetch(`/api/repairs/${repairId}/parts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId }),
      });
      if (!res.ok) throw new Error('Error');
      router.refresh();
    } catch {
      // Restore if failed
      router.refresh();
    }
  };

  const handleConfirmReserved = async (partId: number) => {
    if (!confirm('¿Confirmar uso de esta pieza? Se descontará del stock.')) return;
    try {
      const res = await fetch(`/api/repairs/${repairId}/parts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId }),
      });
      if (!res.ok) throw new Error('Error');
      setParts(prev => prev.map(p => p.id === partId ? { ...p, reserved: false } : p));
      router.refresh();
    } catch {
      alert('Error al confirmar la pieza.');
    }
  };

  const partsTotal = parts.reduce((s, p) => s + p.unitPrice * p.quantity, 0);

  return (
    <div className="space-y-4 mt-4">
      {/* Existing parts */}
      {parts.length > 0 && (
        <div className="space-y-2">
          {parts.map(part => (
            <div key={part.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
              part.reserved
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-[#0f0f0f] border-[#1a1a1a]'
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {part.reserved
                    ? <Lock size={10} className="text-amber-400 flex-shrink-0" />
                    : <CheckCircle size={10} className="text-green-400 flex-shrink-0" />
                  }
                  <p className="text-sm text-[#ddd] truncate">{part.item.name}</p>
                </div>
                <p className="text-xs text-[#555] font-mono ml-4">
                  {part.quantity}x · {formatCurrency(part.unitPrice)} c/u
                  {part.reserved && <span className="ml-2 text-amber-400">· Reservada</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-sm text-amber-400">
                  {formatCurrency(part.unitPrice * part.quantity)}
                </span>
                {part.reserved && (
                  <button
                    onClick={() => handleConfirmReserved(part.id)}
                    className="text-xs text-green-400/70 hover:text-green-400 border border-green-400/20 hover:border-green-400/40 px-2 py-0.5 rounded-md transition-colors font-mono"
                    title="Confirmar uso"
                  >
                    Usar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(part.id)}
                  className="text-[#444] hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-1 pt-1 border-t border-[#1a1a1a]">
            <span className="text-xs text-[#666]">Total en piezas</span>
            <span className="font-mono text-sm font-semibold text-amber-400">{formatCurrency(partsTotal)}</span>
          </div>
        </div>
      )}

      {/* Add part form */}
      <div className="border border-dashed border-[#2a2a2a] rounded-xl p-4 bg-[#0d0d0d] space-y-3">
        <p className="text-xs font-semibold text-[#888]">Agregar pieza</p>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 150)}
            placeholder="Buscar pieza en inventario..."
            className="input pl-9 text-sm"
          />
          {showSearch && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden z-30 shadow-xl">
              {filtered.map(item => {
                const available = item.quantity - item.reservedQty;
                return (
                  <button
                    key={item.id}
                    onMouseDown={() => selectItem(item)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1a1a1a] text-left"
                  >
                    <div>
                      <p className="text-sm text-[#ddd]">{item.name}</p>
                      <p className="text-xs text-[#555] font-mono">{item.sku}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-mono text-amber-400">{formatCurrency(item.costPrice)}</p>
                      <p className={`text-[10px] font-mono ${available <= 0 ? 'text-red-400' : 'text-[#555]'}`}>
                        {available} disp.{item.reservedQty > 0 ? ` (${item.reservedQty} res.)` : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected item config */}
        {selected && (
          <div className="space-y-3 pt-2 border-t border-[#1e1e1e]">
            <div className="flex items-center gap-2 p-2.5 bg-[#111] rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#ddd] truncate">{selected.name}</p>
                <p className="text-xs text-[#555] font-mono">{selected.sku}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#444] hover:text-red-400 text-xs">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[9px]">Cantidad</label>
                <input
                  type="number" min="1" value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-[9px]">Precio unitario (MXN)</label>
                <input
                  type="number" min="0" step="0.01" value={price}
                  onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                  className="input text-sm"
                />
              </div>
            </div>

            {/* Reserve toggle */}
            <div
              onClick={() => setReserved(!reserved)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                reserved
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-[#111] border-[#1e1e1e] text-[#666] hover:border-[#2a2a2a]'
              }`}
            >
              <Lock size={14} className="flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">Reservar pieza</p>
                <p className="text-[10px] opacity-70">
                  {reserved
                    ? 'Se aparta del stock sin descontar hasta confirmar uso'
                    : 'Se descuenta del stock inmediatamente al agregar'
                  }
                </p>
              </div>
              <div className={`ml-auto w-8 h-4 rounded-full transition-all flex-shrink-0 ${reserved ? 'bg-amber-500' : 'bg-[#333]'}`}>
                <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all ${reserved ? 'ml-4' : 'ml-0.5'}`} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <button
              onClick={handleAdd}
              disabled={saving}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {saving
                ? <><Loader2 size={13} className="animate-spin" /> Guardando...</>
                : reserved
                  ? <><Lock size={13} /> Reservar pieza · {formatCurrency(price * qty)}</>
                  : <><Plus size={13} /> Usar pieza · {formatCurrency(price * qty)}</>
              }
            </button>
          </div>
        )}

        {parts.length === 0 && !selected && (
          <p className="text-xs text-[#444] text-center py-2">Sin piezas registradas. Busca para agregar.</p>
        )}
      </div>
    </div>
  );
}
