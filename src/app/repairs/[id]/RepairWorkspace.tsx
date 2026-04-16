'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Minus, Trash2, Loader2, Lock, CheckCircle,
  Clock, DollarSign, AlertTriangle, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: number; name: string; sku: string;
  costPrice: number; salePrice: number;
  quantity: number; reservedQty: number; category: string;
}

interface Part {
  id: number; itemId: number; quantity: number;
  unitPrice: number; reserved: boolean;
  item: { name: string; sku: string };
}

interface Sale {
  id: number; saleNumber: string; total: number;
  paymentMethod: string; createdAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}

interface Props {
  repairId: number;
  customerId: number;
  laborCost: number;
  initialParts: Part[];
  initialSales: Sale[];
  initialAdvance: number;
  initialPaymentStatus: string;
}

const PAYMENT_METHODS = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' };

// ─── Main Component ───────────────────────────────────────────────────────────

export function RepairWorkspace({
  repairId, customerId, laborCost,
  initialParts, initialSales, initialAdvance, initialPaymentStatus,
}: Props) {
  const router = useRouter();

  // ── Shared state ──
  const [parts, setParts]     = useState<Part[]>(initialParts);
  const [sales, setSales]     = useState<Sale[]>(initialSales);
  const [advance, setAdvance] = useState(initialAdvance);
  const [payStatus, setPayStatus] = useState(initialPaymentStatus);

  // Derived totals — always computed from current state
  const partsTotal = parts.reduce((s, p) => s + p.unitPrice * p.quantity, 0);
  const salesTotal = sales.reduce((s, sale) => s + sale.total, 0);
  const total      = laborCost + partsTotal + salesTotal;
  const pending    = Math.max(0, total - advance);
  const isPaid     = payStatus === 'PAID';

  // ── Parts state ──
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch]       = useState('');
  const [filtered, setFiltered]   = useState<InventoryItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selected, setSelected]   = useState<InventoryItem | null>(null);
  const [qty, setQty]             = useState(1);
  const [price, setPrice]         = useState(0);
  const [reserved, setReserved]   = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [partError, setPartError] = useState('');

  // ── Sales state ──
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleCart, setSaleCart]         = useState<any[]>([]);
  const [saleSearch, setSaleSearch]     = useState('');
  const [saleFiltered, setSaleFiltered] = useState<InventoryItem[]>([]);
  const [showSaleSearch, setShowSaleSearch] = useState(false);
  const [salePayMethod, setSalePayMethod]   = useState('CASH');
  const [saleDiscount, setSaleDiscount]     = useState(0);
  const [addingSale, setAddingSale]         = useState(false);
  const [saleError, setSaleError]           = useState('');

  // ── Payment state ──
  const [editingPayment, setEditingPayment] = useState(false);
  const [payInputVal, setPayInputVal]       = useState(String(initialAdvance));
  const [savingPay, setSavingPay]           = useState(false);

  // Load inventory once
  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(setInventory);
  }, []);

  // Parts search filter
  useEffect(() => {
    if (!search.trim()) { setFiltered([]); return; }
    const q = search.toLowerCase();
    setFiltered(inventory.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)).slice(0, 6));
  }, [search, inventory]);

  // Sale search filter
  useEffect(() => {
    if (!saleSearch.trim()) { setSaleFiltered([]); return; }
    const q = saleSearch.toLowerCase();
    setSaleFiltered(inventory.filter(i => i.quantity > 0 && (i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))).slice(0, 6));
  }, [saleSearch, inventory]);

  // ── Parts handlers ────────────────────────────────────────────────────────

  const selectItem = (item: InventoryItem) => {
    setSelected(item); setPrice(item.costPrice); setQty(1);
    setSearch(''); setFiltered([]);
  };

  const handleAddPart = async () => {
    if (!selected) return;
    setAddingPart(true); setPartError('');
    try {
      const res = await fetch(`/api/repairs/${repairId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selected.id, quantity: qty, unitPrice: price, reserved }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const part = await res.json();
      // Update local state immediately
      setParts(prev => [...prev, part]);
      setSelected(null); setQty(1); setPrice(0); setReserved(false);
    } catch (err: any) { setPartError(err.message); }
    finally { setAddingPart(false); }
  };

  const handleDeletePart = async (partId: number) => {
    if (!confirm('¿Quitar esta pieza?')) return;
    // Optimistic update
    const prev = parts;
    setParts(p => p.filter(x => x.id !== partId));
    try {
      const res = await fetch(`/api/repairs/${repairId}/parts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId }),
      });
      if (!res.ok) throw new Error();
    } catch { setParts(prev); alert('Error al eliminar.'); }
  };

  const handleConfirmReserved = async (partId: number) => {
    if (!confirm('¿Confirmar uso? Se descontará del stock.')) return;
    try {
      const res = await fetch(`/api/repairs/${repairId}/parts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId }),
      });
      if (!res.ok) throw new Error();
      setParts(prev => prev.map(p => p.id === partId ? { ...p, reserved: false } : p));
    } catch { alert('Error al confirmar.'); }
  };

  // ── Sales handlers ────────────────────────────────────────────────────────

  const addToSaleCart = (item: InventoryItem) => {
    setSaleCart(prev => {
      const ex = prev.find(i => i.itemId === item.id);
      if (ex) return ex.quantity >= item.quantity ? prev : prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { itemId: item.id, name: item.name, unitPrice: item.salePrice, quantity: 1, stock: item.quantity }];
    });
    setSaleSearch(''); setSaleFiltered([]);
  };

  const handleAddSale = async () => {
    if (saleCart.length === 0) { setSaleError('Agrega al menos un producto.'); return; }
    setAddingSale(true); setSaleError('');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId, repairId,
          items: saleCart.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
          discount: saleDiscount,
          paymentMethod: salePayMethod,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const sale = await res.json();
      setSales(prev => [sale, ...prev]);
      setSaleCart([]); setSaleDiscount(0); setShowSaleForm(false);
    } catch (err: any) { setSaleError(err.message); }
    finally { setAddingSale(false); }
  };

  // ── Payment handlers ──────────────────────────────────────────────────────

  const handleSavePayment = async () => {
    setSavingPay(true);
    const newAdvance = parseFloat(payInputVal) || 0;
    const newStatus  = newAdvance >= total ? 'PAID' : 'PENDING';
    try {
      await fetch(`/api/repairs/${repairId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advancePayment: newAdvance, paymentStatus: newStatus }),
      });
      setAdvance(newAdvance); setPayStatus(newStatus); setEditingPayment(false);
    } catch { alert('Error al guardar.'); }
    finally { setSavingPay(false); }
  };

  const handleMarkPaid = async () => {
    setSavingPay(true);
    try {
      await fetch(`/api/repairs/${repairId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advancePayment: total, paymentStatus: 'PAID' }),
      });
      setAdvance(total); setPayStatus('PAID');
    } catch { alert('Error.'); }
    finally { setSavingPay(false); }
  };

  const saleCartTotal = saleCart.reduce((s, i) => s + i.unitPrice * i.quantity, 0) - saleDiscount;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── RESUMEN Y PAGO ── */}
      <div className="card p-5">
        <p className="section-title mb-4">Resumen y pago</p>
        <div className="space-y-2">
          <SumRow label="Mano de obra"       value={laborCost}   />
          <SumRow label="Piezas"             value={partsTotal}  />
          {salesTotal > 0 && <SumRow label="Productos vendidos" value={salesTotal} />}
          <div className="flex justify-between items-center pt-2 border-t border-[#1e1e1e]">
            <span className="text-sm font-semibold text-[#ddd]">Total</span>
            <span className="font-mono text-base font-semibold text-amber-400">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="border-t border-[#1e1e1e] my-4" />

        {/* Payment status badge */}
        <div className={`flex items-center gap-2 p-3 rounded-xl border mb-3 ${
          isPaid ? 'bg-green-400/5 border-green-400/20' : 'bg-amber-400/5 border-amber-400/20'
        }`}>
          {isPaid ? <CheckCircle size={14} className="text-green-400" /> : <Clock size={14} className="text-amber-400" />}
          <div className="flex-1">
            <p className={`text-xs font-semibold ${isPaid ? 'text-green-400' : 'text-amber-400'}`}>
              {isPaid ? 'Pagado' : 'Pendiente de pago'}
            </p>
            {!isPaid && <p className="text-[10px] text-[#555] font-mono">Resta: {formatCurrency(pending)}</p>}
          </div>
        </div>

        <div className="space-y-1.5 px-1 mb-3">
          <SumRow label="Anticipo recibido" value={advance} color="text-green-400" />
          {!isPaid && (
            <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[#1a1a1a]">
              <span className="text-[#888]">Saldo pendiente</span>
              <span className="font-mono text-amber-400">{formatCurrency(pending)}</span>
            </div>
          )}
        </div>

        {editingPayment ? (
          <div className="space-y-2">
            <div>
              <label className="label text-[9px]">Anticipo recibido (MXN)</label>
              <input type="number" min="0" step="0.01" value={payInputVal}
                onChange={e => setPayInputVal(e.target.value)} className="input" autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingPayment(false)} className="btn-ghost flex-1 justify-center text-xs">Cancelar</button>
              <button onClick={handleSavePayment} disabled={savingPay} className="btn-primary flex-1 justify-center text-xs disabled:opacity-50">
                {savingPay ? <Loader2 size={12} className="animate-spin" /> : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setEditingPayment(true); setPayInputVal(String(advance)); }}
              className="btn-secondary flex-1 justify-center text-xs">
              <DollarSign size={12} /> Anticipo
            </button>
            {!isPaid && (
              <button onClick={handleMarkPaid} disabled={savingPay || total === 0}
                className="btn-primary flex-1 justify-center text-xs disabled:opacity-40">
                {savingPay ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Pagado</>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── PIEZAS UTILIZADAS ── */}
      <div className="card p-5">
        <p className="section-title mb-4">Piezas utilizadas</p>

        {parts.length > 0 && (
          <div className="space-y-2 mb-4">
            {parts.map(part => (
              <div key={part.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                part.reserved ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#0f0f0f] border-[#1a1a1a]'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {part.reserved
                      ? <Lock size={10} className="text-amber-400 flex-shrink-0" />
                      : <CheckCircle size={10} className="text-green-400 flex-shrink-0" />}
                    <p className="text-sm text-[#ddd] truncate">{part.item.name}</p>
                  </div>
                  <p className="text-xs text-[#555] font-mono ml-4">
                    {part.quantity}x · {formatCurrency(part.unitPrice)} c/u
                    {part.reserved && <span className="ml-2 text-amber-400">· Reservada</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-sm text-amber-400">{formatCurrency(part.unitPrice * part.quantity)}</span>
                  {part.reserved && (
                    <button onClick={() => handleConfirmReserved(part.id)}
                      className="text-xs text-green-400/70 hover:text-green-400 border border-green-400/20 hover:border-green-400/40 px-2 py-0.5 rounded-md transition-colors font-mono">
                      Usar
                    </button>
                  )}
                  <button onClick={() => handleDeletePart(part.id)} className="text-[#444] hover:text-red-400 transition-colors p-1">
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

        {/* Add part */}
        <div className="border border-dashed border-[#2a2a2a] rounded-xl p-4 bg-[#0d0d0d] space-y-3">
          <p className="text-xs font-semibold text-[#888]">Agregar pieza</p>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setShowSearch(true)} onBlur={() => setTimeout(() => setShowSearch(false), 150)}
              placeholder="Buscar en inventario..." className="input pl-9 text-sm" />
            {showSearch && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden z-30 shadow-xl">
                {filtered.map(item => {
                  const available = item.quantity - item.reservedQty;
                  return (
                    <button key={item.id} onMouseDown={() => selectItem(item)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1a1a1a] text-left">
                      <div>
                        <p className="text-sm text-[#ddd]">{item.name}</p>
                        <p className="text-xs text-[#555] font-mono">{item.sku}</p>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="text-xs font-mono text-amber-400">{formatCurrency(item.costPrice)}</p>
                        <p className={`text-[10px] font-mono ${available <= 0 ? 'text-red-400' : 'text-[#555]'}`}>
                          {available} disp.
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
                  <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="input text-sm" />
                </div>
                <div>
                  <label className="label text-[9px]">Precio unitario (MXN)</label>
                  <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} className="input text-sm" />
                </div>
              </div>
              <div onClick={() => setReserved(!reserved)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  reserved ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-[#111] border-[#1e1e1e] text-[#666] hover:border-[#2a2a2a]'
                }`}>
                <Lock size={14} className="flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Reservar pieza</p>
                  <p className="text-[10px] opacity-70">
                    {reserved ? 'Se aparta sin descontar hasta confirmar uso' : 'Se descuenta del stock inmediatamente'}
                  </p>
                </div>
                <div className={`ml-auto w-8 h-4 rounded-full transition-all flex-shrink-0 ${reserved ? 'bg-amber-500' : 'bg-[#333]'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all ${reserved ? 'ml-4' : 'ml-0.5'}`} />
                </div>
              </div>
              {partError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  <AlertTriangle size={12} /> {partError}
                </div>
              )}
              <button onClick={handleAddPart} disabled={addingPart} className="btn-primary w-full justify-center disabled:opacity-50">
                {addingPart
                  ? <><Loader2 size={13} className="animate-spin" /> Guardando...</>
                  : reserved
                    ? <><Lock size={13} /> Reservar · {formatCurrency(price * qty)}</>
                    : <><Plus size={13} /> Usar pieza · {formatCurrency(price * qty)}</>
                }
              </button>
            </div>
          )}
          {parts.length === 0 && !selected && (
            <p className="text-xs text-[#444] text-center py-2">Sin piezas registradas.</p>
          )}
        </div>
      </div>

      {/* ── PRODUCTOS VENDIDOS ── */}
      <div className="card p-5">
        <p className="section-title mb-4">Productos vendidos</p>
        {sales.length > 0 && (
          <div className="space-y-2 mb-4">
            {sales.map(sale => (
              <div key={sale.id} className="flex items-center gap-3 p-3 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-amber-500">{sale.saleNumber}</span>
                    <span className="text-[10px] text-[#555] font-mono">{PAYMENT_METHODS[sale.paymentMethod as keyof typeof PAYMENT_METHODS] ?? sale.paymentMethod}</span>
                  </div>
                  <p className="text-xs text-[#666] truncate">{sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-sm font-semibold text-amber-400">{formatCurrency(sale.total)}</span>
                  <Link href={`/sales/${sale.id}`} className="text-[#444] hover:text-amber-400 transition-colors">
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            ))}
            <div className="flex justify-between px-1 pt-1 border-t border-[#1a1a1a]">
              <span className="text-xs text-[#666]">Total en productos</span>
              <span className="font-mono text-sm font-semibold text-amber-400">{formatCurrency(salesTotal)}</span>
            </div>
          </div>
        )}

        {!showSaleForm ? (
          <button onClick={() => setShowSaleForm(true)} className="btn-secondary w-full justify-center">
            <Plus size={13} /> Vender producto a este cliente
          </button>
        ) : (
          <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0d0d0d] space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#ccc]">Agregar venta</p>
              <button onClick={() => { setShowSaleForm(false); setSaleCart([]); setSaleError(''); }} className="text-[#555] hover:text-[#999] text-xs">Cancelar</button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input value={saleSearch} onChange={e => setSaleSearch(e.target.value)}
                onFocus={() => setShowSaleSearch(true)} onBlur={() => setTimeout(() => setShowSaleSearch(false), 150)}
                placeholder="Buscar producto..." className="input pl-9 text-sm" />
              {showSaleSearch && saleFiltered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden z-30 shadow-xl">
                  {saleFiltered.map(p => (
                    <button key={p.id} onMouseDown={() => addToSaleCart(p)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1a1a1a] text-left">
                      <div>
                        <p className="text-sm text-[#ddd]">{p.name}</p>
                        <p className="text-xs text-[#555] font-mono">{p.sku}</p>
                      </div>
                      <span className="font-mono text-xs text-amber-400 ml-2 flex-shrink-0">{formatCurrency(p.salePrice)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {saleCart.length > 0 && (
              <div className="space-y-1.5">
                {saleCart.map(item => (
                  <div key={item.itemId} className="flex items-center gap-2 p-2 bg-[#111] rounded-lg">
                    <p className="text-xs text-[#ccc] flex-1 truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => setSaleCart(prev => prev.map(i => i.itemId === item.itemId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                        className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center text-[#888] hover:text-white">
                        <Minus size={9} />
                      </button>
                      <span className="font-mono text-xs text-[#ddd] w-4 text-center">{item.quantity}</span>
                      <button onClick={() => setSaleCart(prev => prev.map(i => i.itemId === item.itemId && i.quantity < i.stock ? { ...i, quantity: i.quantity + 1 } : i))}
                        className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center text-[#888] hover:text-white">
                        <Plus size={9} />
                      </button>
                    </div>
                    <span className="font-mono text-xs text-amber-400 w-16 text-right flex-shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    <button onClick={() => setSaleCart(prev => prev.filter(i => i.itemId !== item.itemId))} className="text-[#444] hover:text-red-400 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-[9px]">Método de pago</label>
                <select value={salePayMethod} onChange={e => setSalePayMethod(e.target.value)} className="select text-xs">
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-[9px]">Descuento (MXN)</label>
                <input type="number" min="0" step="0.01" value={saleDiscount || ''} onChange={e => setSaleDiscount(parseFloat(e.target.value) || 0)} placeholder="0.00" className="input text-xs" />
              </div>
            </div>
            {saleCart.length > 0 && (
              <div className="flex justify-between px-1">
                <span className="text-xs text-[#666]">Total a cobrar</span>
                <span className="font-mono text-sm font-bold text-amber-400">{formatCurrency(saleCartTotal)}</span>
              </div>
            )}
            {saleError && <p className="text-xs text-red-400">{saleError}</p>}
            <button onClick={handleAddSale} disabled={addingSale || saleCart.length === 0}
              className="btn-primary w-full justify-center disabled:opacity-40 text-sm">
              {addingSale ? <><Loader2 size={13} className="animate-spin" /> Procesando...</> : <><Plus size={13} /> Registrar venta · {formatCurrency(saleCartTotal)}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SumRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[#888]">{label}</span>
      <span className={`font-mono text-sm ${color ?? 'text-[#ccc]'}`}>{formatCurrency(value)}</span>
    </div>
  );
}
