'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Minus, Trash2, ShoppingBag, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

const PAYMENT_METHODS = {
  CASH:     'Efectivo',
  CARD:     'Tarjeta',
  TRANSFER: 'Transferencia',
};

interface Product {
  id: number;
  name: string;
  sku: string;
  salePrice: number;
  quantity: number;
}

interface CartItem {
  itemId:    number;
  name:      string;
  unitPrice: number;
  quantity:  number;
  stock:     number;
}

interface Sale {
  id: number;
  saleNumber: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}

export function RepairSales({
  repairId,
  customerId,
  initialSales,
}: {
  repairId: number;
  customerId: number;
  initialSales: Sale[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [sales, setSales]         = useState<Sale[]>(initialSales);
  const [products, setProducts]   = useState<Product[]>([]);
  const [search, setSearch]       = useState('');
  const [filtered, setFiltered]   = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<keyof typeof PAYMENT_METHODS>('CASH');
  const [discount, setDiscount]   = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [showForm, setShowForm]   = useState(false);

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(setProducts);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered([]); return; }
    const q = search.toLowerCase();
    setFiltered(
      products
        .filter(p => p.quantity > 0 &&
          (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
        )
        .slice(0, 6)
    );
  }, [search, products]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.itemId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map(i => i.itemId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: product.id, name: product.name, unitPrice: product.salePrice, quantity: 1, stock: product.quantity }];
    });
    setSearch('');
    setFiltered([]);
  };

  const updateQty = (itemId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.itemId !== itemId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0 || newQty > i.stock) return i;
      return { ...i, quantity: newQty };
    }));
  };

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total    = Math.max(0, subtotal - discount);

  const handleSubmit = async () => {
    if (cart.length === 0) { setError('Agrega al menos un producto.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          repairId,
          items: cart.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
          discount,
          paymentMethod,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const sale = await res.json();
      setSales(prev => [sale, ...prev]);
      setCart([]);
      setDiscount(0);
      setShowForm(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);

  return (
    <div className="space-y-4">

      {/* Sales linked to this repair */}
      {sales.length > 0 && (
        <div className="space-y-2">
          {sales.map(sale => (
            <div key={sale.id} className="flex items-center gap-3 p-3 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-amber-500">{sale.saleNumber}</span>
                  <span className="text-[10px] text-[#555] font-mono">
                    {PAYMENT_METHODS[sale.paymentMethod as keyof typeof PAYMENT_METHODS]}
                  </span>
                </div>
                <p className="text-xs text-[#666] truncate">
                  {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-sm font-semibold text-amber-400">{formatCurrency(sale.total)}</span>
                <Link href={`/sales/${sale.id}`} className="text-[#444] hover:text-amber-400 transition-colors">
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center px-1 pt-1 border-t border-[#1a1a1a]">
            <span className="text-xs text-[#666]">Total en productos</span>
            <span className="font-mono text-sm font-semibold text-amber-400">{formatCurrency(totalSales)}</span>
          </div>
        </div>
      )}

      {/* Toggle form */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-secondary w-full justify-center">
          <ShoppingBag size={13} /> Vender producto a este cliente
        </button>
      ) : (
        <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0d0d0d] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#ccc]">Agregar venta a esta orden</p>
            <button onClick={() => { setShowForm(false); setCart([]); setError(''); }} className="text-[#555] hover:text-[#999] text-xs">Cancelar</button>
          </div>

          {/* Product search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 150)}
              placeholder="Buscar producto..."
              className="input pl-9 text-sm"
            />
            {showSearch && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden z-30 shadow-xl">
                {filtered.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => addToCart(p)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1a1a1a] text-left"
                  >
                    <div>
                      <p className="text-sm text-[#ddd]">{p.name}</p>
                      <p className="text-xs text-[#555] font-mono">{p.sku}</p>
                    </div>
                    <span className="font-mono text-xs text-amber-400 flex-shrink-0 ml-2">{formatCurrency(p.salePrice)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="space-y-1.5">
              {cart.map(item => (
                <div key={item.itemId} className="flex items-center gap-2 p-2 bg-[#111] rounded-lg">
                  <p className="text-xs text-[#ccc] flex-1 truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => updateQty(item.itemId, -1)} className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center text-[#888] hover:text-white">
                      <Minus size={9} />
                    </button>
                    <span className="font-mono text-xs text-[#ddd] w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.itemId, 1)} disabled={item.quantity >= item.stock} className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center text-[#888] hover:text-white disabled:opacity-30">
                      <Plus size={9} />
                    </button>
                  </div>
                  <span className="font-mono text-xs text-amber-400 w-16 text-right flex-shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
                  <button onClick={() => setCart(prev => prev.filter(i => i.itemId !== item.itemId))} className="text-[#444] hover:text-red-400 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Payment + discount */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[9px]">Método de pago</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="select text-xs">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-[9px]">Descuento (MXN)</label>
              <input type="number" min="0" step="0.01" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0.00" className="input text-xs" />
            </div>
          </div>

          {/* Total */}
          {cart.length > 0 && (
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-[#666]">Total a cobrar</span>
              <span className="font-mono text-sm font-bold text-amber-400">{formatCurrency(total)}</span>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || cart.length === 0}
            className="btn-primary w-full justify-center disabled:opacity-40 text-sm"
          >
            {submitting
              ? <><Loader2 size={13} className="animate-spin" /> Procesando...</>
              : <><ShoppingBag size={13} /> Registrar venta · {formatCurrency(total)}</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
