'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, Search, X, AlertCircle, Loader2, Lock } from 'lucide-react';

const IVA = 0.16;
const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  priceInput: string;
  enterWithIva: boolean;
  hasIva: boolean;
  onDemand: boolean;
}

interface Customer { id: number; name: string; phone: string; }

function makeItem(data?: any): QuoteItem {
  return {
    id: Math.random().toString(36).slice(2),
    description: data?.description ?? '',
    quantity: data?.quantity ?? 1,
    unitPrice: data?.unitPrice ?? 0,
    priceInput: data?.unitPrice ? String(data.unitPrice) : '',
    enterWithIva: false,
    hasIva: data?.hasIva ?? false,
    onDemand: data?.onDemand ?? false,
  };
}

function calcItem(item: QuoteItem) {
  const subtotal = item.unitPrice * item.quantity;
  const iva = item.hasIva ? subtotal * IVA : 0;
  return { subtotal, iva, total: subtotal + iva };
}

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [useExisting, setUseExisting] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then(r => r.json())
      .then(data => {
        setQuote(data);
        if (data.customerId && data.customer) {
          setUseExisting(true);
          setCustomer({ id: data.customerId, name: data.customer.name, phone: data.customer.phone });
        } else {
          setManualName(data.customerName ?? '');
          setManualPhone(data.customerPhone ?? '');
        }
        setItems((data.items ?? []).map((it: any) => makeItem(it)));
        setDiscount(data.discount ?? 0);
        setDeposit(data.deposit ?? 0);
        setValidUntil(data.validUntil ? data.validUntil.slice(0, 10) : '');
        setNotes(data.notes ?? '');
        setTerms(data.terms ?? '');
        setLoading(false);
      });
  }, [id]);

  const searchCustomers = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) setSearchResults(await res.json());
    } finally { setSearching(false); }
  };

  const updateItem = (itemId: string, patch: Partial<QuoteItem>) => {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const updated = { ...it, ...patch };
      if ('priceInput' in patch || 'enterWithIva' in patch) {
        const raw = parseFloat(('priceInput' in patch ? patch.priceInput : it.priceInput) ?? '') || 0;
        const withIva = 'enterWithIva' in patch ? patch.enterWithIva : it.enterWithIva;
        updated.unitPrice = withIva ? raw / (1 + IVA) : raw;
      }
      return updated;
    }));
  };

  const subtotal = items.reduce((s, it) => s + calcItem(it).subtotal, 0);
  const ivaTotal = items.reduce((s, it) => s + calcItem(it).iva, 0);
  const discountAmt = Math.min(discount, subtotal);
  const total = subtotal - discountAmt + ivaTotal;

  const handleSubmit = async () => {
    if (useExisting && !customer) { setError('Selecciona un cliente.'); return; }
    if (!useExisting && !manualName.trim()) { setError('Ingresa el nombre del cliente.'); return; }
    if (items.some(it => !it.description.trim())) { setError('Todos los conceptos deben tener descripción.'); return; }
    if (items.length === 0) { setError('Agrega al menos un concepto.'); return; }

    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: useExisting ? customer?.id : null,
          customerName: useExisting ? '' : manualName,
          customerPhone: useExisting ? '' : manualPhone,
          items: items.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            hasIva: it.hasIva,
            onDemand: it.onDemand,
          })),
          discount: discountAmt,
          deposit,
          notes: notes || null,
          terms: terms || null,
          validUntil: validUntil || null,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      router.push(`/quotes/${id}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-[#555] text-sm">Cargando...</div>;

  if (quote?.status !== 'DRAFT') {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-in">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/quotes/${id}`} className="btn-ghost"><ArrowLeft size={15} /></Link>
          <h1 className="page-title font-mono">{quote?.quoteNumber}</h1>
        </div>
        <div className="card p-8 flex flex-col items-center gap-4 text-center">
          <Lock size={32} className="text-[#444]" />
          <div>
            <p className="text-sm font-semibold text-[#ccc] mb-1">Cotización no editable</p>
            <p className="text-xs text-[#555]">Solo se pueden editar cotizaciones en estado <span className="text-amber-400 font-mono">Borrador</span>.</p>
          </div>
          <Link href={`/quotes/${id}`} className="btn-secondary text-sm">Volver</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/quotes/${id}`} className="btn-ghost"><ArrowLeft size={15} /></Link>
        <div>
          <p className="section-title mb-0.5">Cotizaciones</p>
          <h1 className="page-title font-mono">{quote?.quoteNumber}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Customer */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] pb-3 border-b border-[#1a1a1a] mb-4">Cliente</h2>
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setUseExisting(true)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${useExisting ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'text-[#666] border-[#222] hover:text-[#ccc]'}`}>
                Buscar cliente
              </button>
              <button type="button" onClick={() => { setUseExisting(false); setCustomer(null); }}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${!useExisting ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'text-[#666] border-[#222] hover:text-[#ccc]'}`}>
                Sin cuenta
              </button>
            </div>
            {useExisting ? (
              customer ? (
                <div className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-[#1e1e1e]">
                  <div>
                    <p className="text-sm font-medium text-[#ccc]">{customer.name}</p>
                    <p className="text-xs text-[#666] font-mono">{customer.phone}</p>
                  </div>
                  <button onClick={() => { setCustomer(null); setCustomerSearch(''); }} className="text-[#444] hover:text-red-400"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
                    <input value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); searchCustomers(e.target.value); }}
                      placeholder="Nombre o teléfono..." className="input pl-9" />
                  </div>
                  {(searchResults.length > 0 || searching) && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[#111] border border-[#222] rounded-lg overflow-hidden shadow-xl">
                      {searching && <p className="text-xs text-[#555] p-3">Buscando...</p>}
                      {searchResults.map(c => (
                        <button key={c.id} type="button" onClick={() => { setCustomer(c); setSearchResults([]); setCustomerSearch(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#1a1a1a] transition-colors">
                          <p className="text-sm text-[#ccc]">{c.name}</p>
                          <p className="text-xs text-[#555] font-mono">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Nombre *</label><input value={manualName} onChange={e => setManualName(e.target.value)} className="input" /></div>
                <div><label className="label">Teléfono</label><input value={manualPhone} onChange={e => setManualPhone(e.target.value)} className="input" /></div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] pb-3 border-b border-[#1a1a1a] mb-4">Conceptos</h2>
            <div className="space-y-3">
              {items.map((item, idx) => {
                const { iva, total: tot } = calcItem(item);
                return (
                  <div key={item.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-[#444] font-mono mt-2.5 w-5 flex-shrink-0">{idx + 1}</span>
                      <div className="flex-1">
                        <input value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })}
                          placeholder="Descripción del concepto..." className="input text-sm" />
                      </div>
                      <button onClick={() => setItems(prev => prev.filter(it => it.id !== item.id))}
                        className="text-[#333] hover:text-red-400 mt-2 flex-shrink-0"><Trash2 size={13} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pl-7">
                      <div>
                        <label className="label">Cantidad</label>
                        <input type="number" min="1" value={item.quantity}
                          onChange={e => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })} className="input text-sm" />
                      </div>
                      <div>
                        <label className="label">Precio {item.enterWithIva ? 'c/IVA' : 's/IVA'}</label>
                        <input type="number" min="0" step="0.01" value={item.priceInput}
                          onChange={e => updateItem(item.id, { priceInput: e.target.value })} className="input text-sm" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="label">Importe</label>
                        <p className="input text-sm text-amber-400 font-mono bg-transparent cursor-default">{fmt(tot)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-7">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={item.hasIva}
                          onChange={e => updateItem(item.id, { hasIva: e.target.checked })} className="w-3.5 h-3.5 accent-amber-500" />
                        <span className="text-xs text-[#666]">IVA 16%{item.hasIva ? ` (+${fmt(iva)})` : ''}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={item.enterWithIva}
                          onChange={e => updateItem(item.id, { enterWithIva: e.target.checked, priceInput: '' })} className="w-3.5 h-3.5 accent-amber-500" />
                        <span className="text-xs text-[#555]">Ingresar precio con IVA</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={item.onDemand}
                          onChange={e => updateItem(item.id, { onDemand: e.target.checked })} className="w-3.5 h-3.5 accent-amber-500" />
                        <span className="text-xs text-[#555]">Bajo pedido</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setItems(prev => [...prev, makeItem()])}
              className="mt-4 w-full border border-dashed border-[#222] rounded-lg py-2.5 text-sm text-[#555] hover:text-[#ccc] hover:border-[#333] transition-colors flex items-center justify-center gap-2">
              <Plus size={13} /> Agregar concepto
            </button>
          </div>

          {/* Notes & Terms */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#ccc] pb-3 border-b border-[#1a1a1a]">Notas y condiciones</h2>
            <div>
              <label className="label">Notas internas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input resize-none" />
            </div>
            <div>
              <label className="label">Términos y condiciones</label>
              <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4} className="input resize-none text-sm" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] pb-3 border-b border-[#1a1a1a] mb-4">Resumen</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#666]"><span>Subtotal</span><span className="font-mono">{fmt(subtotal)}</span></div>
              {ivaTotal > 0 && <div className="flex justify-between text-[#555] text-xs"><span>IVA (16%)</span><span className="font-mono">{fmt(ivaTotal)}</span></div>}
              <div className="flex items-center gap-2">
                <span className="text-[#666] flex-shrink-0">Descuento</span>
                <input type="number" min="0" step="0.01" value={discount || ''}
                  onChange={e => setDiscount(Math.max(0, Number(e.target.value)))} placeholder="0"
                  className="input text-xs text-right py-1 ml-auto w-24" />
              </div>
              {discountAmt > 0 && <div className="flex justify-between text-xs text-red-400"><span>− Descuento</span><span className="font-mono">− {fmt(discountAmt)}</span></div>}
              <div className="border-t border-[#1a1a1a] pt-2 flex justify-between font-semibold text-amber-400">
                <span>Total</span><span className="font-mono text-base">{fmt(total)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#ccc] pb-3 border-b border-[#1a1a1a]">Opciones</h2>
            <div>
              <label className="label">Válida hasta</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Anticipo solicitado (MXN)</label>
              <input type="number" min="0" step="0.01" value={deposit || ''}
                onChange={e => setDeposit(Math.max(0, Number(e.target.value)))} placeholder="0" className="input" />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full justify-center disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar cambios</>}
          </button>
          <Link href={`/quotes/${id}`} className="btn-secondary w-full justify-center">Cancelar</Link>
        </div>
      </div>
    </div>
  );
}
