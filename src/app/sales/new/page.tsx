'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Loader2, Tag, UserPlus } from 'lucide-react';
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
  category: string;
}

interface CartItem {
  itemId:    number;
  name:      string;
  sku:       string;
  unitPrice: number;
  quantity:  number;
  stock:     number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get('customerId');
  const presetRepairId   = searchParams.get('repairId');

  // Products
  const [products, setProducts]   = useState<Product[]>([]);
  const [search, setSearch]       = useState('');
  const [filtered, setFiltered]   = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cart
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [discount, setDiscount]   = useState(0);
  const [notes, setNotes]         = useState('');

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomers, setShowCustomers] = useState(false);
  const [customerTab, setCustomerTab] = useState<'search' | 'new'>('search');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState('');

  // Repair link
  const [repairSearch, setRepairSearch]       = useState('');
  const [repairs, setRepairs]                 = useState<any[]>([]);
  const [selectedRepair, setSelectedRepair]   = useState<any | null>(null);
  const [showRepairs, setShowRepairs]         = useState(false);

  // Payment
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [paymentMethod, setPaymentMethod] = useState<keyof typeof PAYMENT_METHODS>('CASH');
  const [advanceAmount, setAdvanceAmount] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(setProducts);
    fetch('/api/customers').then(r => r.json()).then((data: Customer[]) => {
      setCustomers(data);
      if (presetCustomerId) {
        const match = data.find(c => c.id === Number(presetCustomerId));
        if (match) setSelectedCustomer(match);
      }
    });
    fetch('/api/repairs').then(r => r.json()).then((data: any[]) => {
      setRepairs(data);
      if (presetRepairId) {
        const match = data.find(r => r.id === Number(presetRepairId));
        if (match) setSelectedRepair(match);
      }
    });
  }, [presetCustomerId, presetRepairId]);

  useEffect(() => {
    if (!search.trim()) { setFiltered([]); return; }
    const q = search.toLowerCase();
    setFiltered(
      products
        .filter(p => p.quantity > 0 &&
          (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
        )
        .slice(0, 8)
    );
  }, [search, products]);

  const filteredRepairs = repairSearch
    ? repairs.filter(r =>
        r.ticketNumber.toLowerCase().includes(repairSearch.toLowerCase()) ||
        r.customer?.name?.toLowerCase().includes(repairSearch.toLowerCase()) ||
        `${r.deviceBrand} ${r.deviceModel}`.toLowerCase().includes(repairSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      ).slice(0, 5)
    : [];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.itemId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map(i => i.itemId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        itemId: product.id, name: product.name, sku: product.sku,
        unitPrice: product.salePrice, quantity: 1, stock: product.quantity,
      }];
    });
    setSearch('');
    setFiltered([]);
  };

  const updateQty = (itemId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.itemId !== itemId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return i;
      if (newQty > i.stock) return i;
      return { ...i, quantity: newQty };
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(i => i.itemId !== itemId));
  };

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total    = Math.max(0, subtotal - discount);

  const handleSubmit = async () => {
    if (cart.length === 0) { setError('Agrega al menos un producto.'); return; }
    const initialPayment = paymentType === 'FULL' ? total : parseFloat(advanceAmount);
    if (!initialPayment || initialPayment <= 0) {
      setError('Ingresa el monto del anticipo.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId:     selectedCustomer?.id ?? (selectedRepair?.customerId ?? null),
          repairId:       selectedRepair?.id ?? null,
          items:          cart.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
          discount,
          paymentMethod,
          notes,
          initialPayment,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const sale = await res.json();
      router.push(`/sales/${sale.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setCustomerError('Nombre y teléfono son requeridos.');
      return;
    }
    setCreatingCustomer(true);
    setCustomerError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim(), email: newCustomerEmail.trim() || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const created = await res.json();
      setSelectedCustomer({ id: created.id, name: created.name, phone: created.phone });
      setCustomers(prev => [...prev, { id: created.id, name: created.name, phone: created.phone }]);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setCustomerTab('search');
    } catch (err: any) {
      setCustomerError(err.message);
    } finally {
      setCreatingCustomer(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-title mb-0.5">Ventas</p>
          <h1 className="page-title">Nueva venta</h1>
        </div>
        <Link href="/sales" className="btn-secondary">Cancelar</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Left: product search ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Product search */}
          <div className="card p-4">
            <p className="section-title mb-3">Buscar producto</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                placeholder="Nombre, SKU o categoría..."
                className="input pl-9"
                autoComplete="off"
              />
              {showSearch && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden z-30 shadow-2xl">
                  {filtered.map(p => (
                    <button
                      key={p.id}
                      onMouseDown={() => addToCart(p)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#ddd]">{p.name}</p>
                        <p className="text-xs text-[#555] font-mono">{p.sku} · {p.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-mono text-amber-400">{formatCurrency(p.salePrice)}</p>
                        <p className="text-xs text-[#555]">{p.quantity} en stock</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick category grid */}
            {cart.length === 0 && search === '' && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {products.filter(p => p.quantity > 0).slice(0, 6).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="text-left p-3 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                  >
                    <p className="text-xs font-medium text-[#ccc] truncate">{p.name}</p>
                    <p className="text-xs font-mono text-amber-400 mt-1">{formatCurrency(p.salePrice)}</p>
                    <p className="text-[10px] text-[#555] mt-0.5">{p.quantity} disponibles</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart items */}
          {cart.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                <ShoppingCart size={14} className="text-amber-500" />
                <span className="text-sm font-semibold text-[#ccc]">Carrito</span>
                <span className="font-mono text-xs text-[#555] ml-1">({cart.length} producto{cart.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="divide-y divide-[#141414]">
                {cart.map(item => (
                  <div key={item.itemId} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#ddd] truncate">{item.name}</p>
                      <p className="text-xs font-mono text-[#555]">{formatCurrency(item.unitPrice)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => updateQty(item.itemId, -1)} className="w-6 h-6 rounded-md bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center text-[#888] hover:text-white transition-colors">
                        <Minus size={10} />
                      </button>
                      <span className="font-mono text-sm text-[#ddd] w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.itemId, 1)} disabled={item.quantity >= item.stock} className="w-6 h-6 rounded-md bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center text-[#888] hover:text-white transition-colors disabled:opacity-30">
                        <Plus size={10} />
                      </button>
                    </div>
                    <div className="w-20 text-right flex-shrink-0">
                      <p className="font-mono text-sm text-amber-400">{formatCurrency(item.unitPrice * item.quantity)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.itemId)} className="text-[#444] hover:text-red-400 transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: summary & checkout ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Repair link (optional) */}
          <div className="card p-4">
            <p className="section-title mb-3">Vincular a orden (opcional)</p>
            {selectedRepair ? (
              <div className="flex items-center gap-3 p-3 bg-[#0f0f0f] rounded-lg border border-amber-500/20">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-amber-500">{selectedRepair.ticketNumber}</p>
                  <p className="text-sm text-[#ddd] truncate">{selectedRepair.deviceBrand} {selectedRepair.deviceModel}</p>
                  <p className="text-xs text-[#555]">{selectedRepair.customer?.name}</p>
                </div>
                <button onClick={() => setSelectedRepair(null)} className="text-[#444] hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input
                  value={repairSearch}
                  onChange={e => { setRepairSearch(e.target.value); setShowRepairs(true); }}
                  onFocus={() => setShowRepairs(true)}
                  onBlur={() => setTimeout(() => setShowRepairs(false), 150)}
                  placeholder="Buscar por ticket, cliente..."
                  className="input pl-9"
                />
                {showRepairs && filteredRepairs.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden z-30 shadow-xl">
                    {filteredRepairs.map((r: any) => (
                      <button
                        key={r.id}
                        onMouseDown={() => { setSelectedRepair(r); setRepairSearch(''); setShowRepairs(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a1a] text-left"
                      >
                        <div>
                          <p className="text-xs font-mono text-amber-500">{r.ticketNumber}</p>
                          <p className="text-sm text-[#ddd]">{r.deviceBrand} {r.deviceModel}</p>
                          <p className="text-xs text-[#555]">{r.customer?.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer (optional) */}
          <div className="card p-4">
            <p className="section-title mb-3">Cliente (opcional)</p>

            {selectedCustomer ? (
              <div className="flex items-center gap-3 p-3 bg-[#0f0f0f] rounded-lg border border-[#1e1e1e]">
                <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 font-bold text-sm flex-shrink-0">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#ddd] truncate">{selectedCustomer.name}</p>
                  <p className="text-xs text-[#555] font-mono">{selectedCustomer.phone}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-[#444] hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-1 mb-3 bg-[#0a0a0a] rounded-lg p-1">
                  <button
                    onClick={() => { setCustomerTab('search'); setCustomerError(''); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${customerTab === 'search' ? 'bg-[#1a1a1a] text-amber-400' : 'text-[#555] hover:text-[#888]'}`}
                  >
                    <User size={11} /> Buscar
                  </button>
                  <button
                    onClick={() => { setCustomerTab('new'); setCustomerError(''); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${customerTab === 'new' ? 'bg-[#1a1a1a] text-amber-400' : 'text-[#555] hover:text-[#888]'}`}
                  >
                    <UserPlus size={11} /> Nuevo
                  </button>
                </div>

                {customerTab === 'search' ? (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                    <input
                      value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); setShowCustomers(true); }}
                      onFocus={() => setShowCustomers(true)}
                      onBlur={() => setTimeout(() => setShowCustomers(false), 150)}
                      placeholder="Buscar por nombre o teléfono..."
                      className="input pl-9"
                    />
                    {showCustomers && filteredCustomers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden z-30 shadow-xl">
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomers(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a1a] text-left"
                          >
                            <div className="w-6 h-6 bg-amber-500/20 rounded-md flex items-center justify-center text-amber-500 text-xs font-bold flex-shrink-0">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm text-[#ddd]">{c.name}</p>
                              <p className="text-xs text-[#555] font-mono">{c.phone}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={newCustomerName}
                      onChange={e => setNewCustomerName(e.target.value)}
                      placeholder="Nombre completo *"
                      className="input"
                    />
                    <input
                      value={newCustomerPhone}
                      onChange={e => setNewCustomerPhone(e.target.value)}
                      placeholder="Teléfono *"
                      className="input"
                      type="tel"
                    />
                    <input
                      value={newCustomerEmail}
                      onChange={e => setNewCustomerEmail(e.target.value)}
                      placeholder="Correo electrónico (opcional)"
                      className="input"
                      type="email"
                    />
                    {customerError && (
                      <p className="text-xs text-red-400">{customerError}</p>
                    )}
                    <button
                      onClick={handleCreateCustomer}
                      disabled={creatingCustomer}
                      className="btn-primary w-full justify-center py-2 text-sm disabled:opacity-40"
                    >
                      {creatingCustomer
                        ? <><Loader2 size={13} className="animate-spin" /> Guardando...</>
                        : <><UserPlus size={13} /> Crear y seleccionar</>
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment */}
          <div className="card p-4 space-y-3">
            <p className="section-title mb-1">Pago</p>

            {/* Toggle pago total / anticipo */}
            <div className="flex gap-1 bg-[#0a0a0a] rounded-lg p-1">
              <button
                onClick={() => setPaymentType('FULL')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${paymentType === 'FULL' ? 'bg-[#1a1a1a] text-amber-400' : 'text-[#555] hover:text-[#888]'}`}
              >
                Pago total
              </button>
              <button
                onClick={() => setPaymentType('PARTIAL')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${paymentType === 'PARTIAL' ? 'bg-[#1a1a1a] text-amber-400' : 'text-[#555] hover:text-[#888]'}`}
              >
                Anticipo
              </button>
            </div>

            {paymentType === 'PARTIAL' && (
              <div>
                <label className="label">Monto del anticipo (MXN)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={advanceAmount}
                  onChange={e => setAdvanceAmount(e.target.value)}
                  placeholder="0.00"
                  className="input"
                />
                {total > 0 && parseFloat(advanceAmount) > 0 && (
                  <p className="text-xs text-[#555] mt-1 font-mono">
                    Saldo restante: {formatCurrency(Math.max(0, total - (parseFloat(advanceAmount) || 0)))}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="label">Método de pago</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="select">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Descuento (MXN)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount || ''}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="input"
              />
            </div>
            <div>
              <label className="label">Notas de la venta</label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones..."
                className="input"
              />
            </div>
          </div>

          {/* Total summary */}
          <div className="card p-4 space-y-2">
            <p className="section-title mb-2">Resumen</p>
            <div className="flex justify-between text-sm">
              <span className="text-[#888]">Subtotal</span>
              <span className="font-mono text-[#ccc]">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400 flex items-center gap-1"><Tag size={11} /> Descuento</span>
                <span className="font-mono text-green-400">- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-[#1a1a1a]">
              <span className="font-semibold text-[#ddd]">Total</span>
              <span className="font-mono text-xl font-bold text-amber-400">{formatCurrency(total)}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || cart.length === 0}
            className="btn-primary w-full justify-center py-3 text-base disabled:opacity-40"
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Procesando...</>
              : <><ShoppingCart size={16} /> Finalizar venta · {formatCurrency(total)}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
