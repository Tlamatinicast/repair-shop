'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Trash2, Loader2, Lock, LockOpen, CheckCircle,
  Clock, DollarSign, AlertTriangle, ExternalLink, ShoppingCart, Wrench,
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
  id: number;
  itemId: number | null;
  quantity: number;
  unitPrice: number;
  reserved: boolean;
  isService: boolean;
  serviceName: string | null;
  item: { name: string; sku: string } | null;
}

interface Sale {
  id: number; saleNumber: string; total: number;
  paymentMethod?: string; createdAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}

interface RepairPayment {
  id: number;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
}

interface Props {
  repairId: number;
  customerId: number;
  diagnosisFee: number;
  repairStatus: string;
  initialParts: Part[];
  initialSales: Sale[];
  initialAdvance: number;
  initialPaymentStatus: string;
  initialPayments: RepairPayment[];
  isAdmin: boolean;
}

const REOPEN_STATUSES: [string, string][] = [
  ['DIAGNOSING',    'Diagnóstico'],
  ['WAITING_PARTS', 'Esperando piezas'],
  ['IN_REPAIR',     'En reparación'],
  ['READY',         'Listo'],
];

const PAYMENT_METHODS = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' };
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
  OTHER: 'Otro', UNKNOWN: 'No especificado',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function RepairWorkspace({
  repairId, customerId, diagnosisFee, repairStatus,
  initialParts, initialSales, initialAdvance, initialPaymentStatus,
  initialPayments, isAdmin,
}: Props) {
  const router = useRouter();

  // ── Lock state ──
  const [isUnlocked, setIsUnlocked]       = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason]   = useState('');
  const [unlockStatus, setUnlockStatus]   = useState(
    repairStatus === 'CANCELLED' ? 'DIAGNOSING' : 'IN_REPAIR'
  );
  const [unlocking, setUnlocking]         = useState(false);
  const [unlockError, setUnlockError]     = useState('');

  const isTerminal = (repairStatus === 'DELIVERED' || repairStatus === 'CANCELLED') && !isUnlocked;

  // ── Shared state ──
  const [parts, setParts]     = useState<Part[]>(initialParts);
  const [sales, setSales]     = useState<Sale[]>(initialSales);
  const [advance, setAdvance] = useState(initialAdvance);
  const [payStatus, setPayStatus] = useState(initialPaymentStatus);
  const [payments, setPayments] = useState<RepairPayment[]>(initialPayments);

  // Derived totals
  const inventoryParts = parts.filter(p => !p.isService);
  const serviceParts   = parts.filter(p => p.isService);
  const inventoryTotal = inventoryParts.reduce((s, p) => s + p.unitPrice * p.quantity, 0);
  const serviceTotal   = serviceParts.reduce((s, p) => s + p.unitPrice * p.quantity, 0);
  const salesTotal     = sales.reduce((s, sale) => s + sale.total, 0); // solo informativo
  const total          = diagnosisFee + serviceTotal + inventoryTotal;
  const pending        = Math.max(0, total - advance);
  const isPaid         = payStatus === 'PAID';

  // ── Inventory parts state ──
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

  // ── Service parts state ──
  const [showAddService, setShowAddService]   = useState(false);
  const [serviceDesc, setServiceDesc]         = useState('');
  const [servicePrice, setServicePrice]       = useState('');
  const [addingService, setAddingService]     = useState(false);
  const [serviceError, setServiceError]       = useState('');

  // ── Payment state ──
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payAmount, setPayAmount]           = useState('');
  const [payMethod, setPayMethod]           = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [payNotes, setPayNotes]             = useState('');
  const [savingPay, setSavingPay]           = useState(false);
  const [payError, setPayError]             = useState('');

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

  // ── Inventory parts handlers ───────────────────────────────────────────────

  const selectItem = (item: InventoryItem) => {
    setSelected(item); setPrice(item.salePrice); setQty(1);
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
      setParts(prev => [...prev, part]);
      setSelected(null); setQty(1); setPrice(0); setReserved(false);
    } catch (err: any) { setPartError(err.message); }
    finally { setAddingPart(false); }
  };

  const handleDeletePart = async (partId: number) => {
    if (!confirm('¿Quitar esta pieza?')) return;
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

  // ── Service parts handlers ─────────────────────────────────────────────────

  const handleAddService = async () => {
    const amt = parseFloat(servicePrice);
    if (!serviceDesc.trim()) { setServiceError('Describe el servicio.'); return; }
    if (!Number.isFinite(amt) || amt < 0) { setServiceError('Precio inválido.'); return; }
    setAddingService(true); setServiceError('');
    try {
      const res = await fetch(`/api/repairs/${repairId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isService: true, serviceName: serviceDesc.trim(), unitPrice: amt }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const part = await res.json();
      setParts(prev => [...prev, part]);
      setServiceDesc(''); setServicePrice(''); setShowAddService(false);
    } catch (err: any) { setServiceError(err.message); }
    finally { setAddingService(false); }
  };

  // ── Payment handlers ──────────────────────────────────────────────────────

  const openAddPayment = (preset?: number) => {
    setPayAmount(preset && preset > 0 ? String(preset.toFixed(2)) : '');
    setPayMethod('CASH'); setPayNotes(''); setPayError('');
    setShowAddPayment(true);
  };

  const handleAddPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) { setPayError('Monto inválido.'); return; }
    setSavingPay(true); setPayError('');
    try {
      const res = await fetch(`/api/repairs/${repairId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, paymentMethod: payMethod, notes: payNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      setPayments(data.payments ?? []);
      setAdvance(data.advancePayment ?? 0);
      setPayStatus(data.paymentStatus ?? 'PENDING');
      setShowAddPayment(false);
    } catch (e: any) { setPayError(e.message ?? 'Error'); }
    finally { setSavingPay(false); }
  };

  const handleVoidPayment = async (paymentId: number) => {
    if (!confirm('¿Anular este pago? Se restará del total recibido.')) return;
    try {
      const res = await fetch(`/api/repairs/${repairId}/payments/${paymentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayments(data.payments ?? []);
      setAdvance(data.advancePayment ?? 0);
      setPayStatus(data.paymentStatus ?? 'PENDING');
    } catch (e: any) { alert(e.message ?? 'Error al anular'); }
  };

  // ── Unlock handler ────────────────────────────────────────────────────────

  const handleUnlock = async () => {
    if (!unlockReason.trim()) { setUnlockError('Indica el motivo del desbloqueo.'); return; }
    setUnlocking(true); setUnlockError('');
    try {
      const statusRes = await fetch(`/api/repairs/${repairId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: unlockStatus }),
      });
      if (!statusRes.ok) throw new Error('Error al cambiar el estado');

      const noteForm = new FormData();
      noteForm.append('content', `Orden reabierta. Motivo: ${unlockReason.trim()}`);
      noteForm.append('stage', unlockStatus);
      await fetch(`/api/repairs/${repairId}/notes`, { method: 'POST', body: noteForm });

      setIsUnlocked(true);
      setShowUnlockModal(false);
      router.refresh();
    } catch (e: any) {
      setUnlockError(e.message ?? 'Error al desbloquear');
    } finally {
      setUnlocking(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── BANNER DE ORDEN CERRADA ── */}
      {isTerminal && (
        <div className="card p-4 border-[#2a2a2a] bg-[#0d0d0d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
              <Lock size={15} className="text-[#555]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#aaa]">
                Orden {repairStatus === 'DELIVERED' ? 'entregada' : 'cancelada'}
              </p>
              <p className="text-xs text-[#555] leading-relaxed">
                Piezas y pagos bloqueados.{!isAdmin && ' Contacta al administrador para editar.'}
              </p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowUnlockModal(true)}
                className="btn-secondary text-xs flex-shrink-0 gap-1.5">
                <LockOpen size={12} /> Desbloquear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESUMEN Y PAGO ── */}
      <div className="card p-5">
        <p className="section-title mb-4">Resumen y pago</p>
        <div className="space-y-2">
          <SumRow label="Diagnóstico"  value={diagnosisFee} />
          {serviceTotal > 0 && <SumRow label="Mano de obra" value={serviceTotal} />}
          <SumRow label="Piezas"       value={inventoryTotal} />
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
          <SumRow label="Total recibido" value={advance} color="text-green-400" />
          {!isPaid && (
            <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[#1a1a1a]">
              <span className="text-[#888]">Saldo pendiente</span>
              <span className="font-mono text-amber-400">{formatCurrency(pending)}</span>
            </div>
          )}
        </div>

        {/* Lista de pagos */}
        {payments.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {payments.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-green-400">{formatCurrency(p.amount)}</span>
                    <span className="text-[10px] text-[#888] font-mono">{PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}</span>
                  </div>
                  <p className="text-[10px] text-[#555] font-mono">
                    {new Date(p.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {p.notes && ` · ${p.notes}`}
                  </p>
                </div>
                {isAdmin && !isTerminal && (
                  <button onClick={() => handleVoidPayment(p.id)} title="Anular pago" className="text-[#444] hover:text-red-400 transition-colors p-1">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {showAddPayment ? (
          <div className="space-y-2 border border-[#1e1e1e] rounded-xl p-3 bg-[#0d0d0d]">
            <div>
              <label className="label text-[9px]">Monto recibido (MXN)</label>
              <input type="number" min="0" step="0.01" value={payAmount}
                onChange={e => setPayAmount(e.target.value)} className="input text-sm" autoFocus placeholder="0.00" />
            </div>
            <div>
              <label className="label text-[9px]">Método de pago</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(PAYMENT_METHODS) as [keyof typeof PAYMENT_METHODS, string][]).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setPayMethod(k)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                      payMethod === k
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : 'bg-[#111] border-[#1e1e1e] text-[#666] hover:border-[#2a2a2a]'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label text-[9px]">Nota (opcional)</label>
              <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} className="input text-sm" placeholder="Referencia, # transacción..." />
            </div>
            {payError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                <AlertTriangle size={12} /> {payError}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAddPayment(false)} className="btn-ghost flex-1 justify-center text-xs">Cancelar</button>
              <button onClick={handleAddPayment} disabled={savingPay} className="btn-primary flex-1 justify-center text-xs disabled:opacity-50">
                {savingPay ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Registrar</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => openAddPayment()} disabled={isPaid || total === 0 || pending <= 0 || isTerminal}
              className="btn-secondary flex-1 justify-center text-xs disabled:opacity-40">
              <DollarSign size={12} /> Agregar pago
            </button>
            {!isPaid && pending > 0 && !isTerminal && (
              <button onClick={() => openAddPayment(pending)} disabled={total === 0}
                className="btn-primary flex-1 justify-center text-xs disabled:opacity-40"
                title={`Cobrar saldo restante: ${formatCurrency(pending)}`}>
                <CheckCircle size={12} /> Cobrar saldo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MANO DE OBRA ── */}
      <div className="card p-5">
        <p className="section-title mb-4">Mano de obra</p>

        {serviceParts.length > 0 && (
          <div className="space-y-2 mb-4">
            {serviceParts.map(part => (
              <div key={part.id} className="flex items-center gap-3 p-3 rounded-xl border bg-[#0f0f0f] border-[#1a1a1a]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Wrench size={10} className="text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-[#ddd] truncate">{part.serviceName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-sm text-amber-400">{formatCurrency(part.unitPrice)}</span>
                  {!isTerminal && (
                    <button onClick={() => handleDeletePart(part.id)} className="text-[#444] hover:text-red-400 transition-colors p-1">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between px-1 pt-1 border-t border-[#1a1a1a]">
              <span className="text-xs text-[#666]">Subtotal mano de obra</span>
              <span className="font-mono text-sm font-semibold text-amber-400">{formatCurrency(serviceTotal)}</span>
            </div>
          </div>
        )}

        {/* Agregar servicio */}
        {!isTerminal && showAddService ? (
          <div className="border border-dashed border-[#2a2a2a] rounded-xl p-4 bg-[#0d0d0d] space-y-3">
            <p className="text-xs font-semibold text-[#888]">Nuevo concepto de mano de obra</p>
            <div>
              <label className="label text-[9px]">Descripción</label>
              <input type="text" value={serviceDesc} onChange={e => setServiceDesc(e.target.value)}
                className="input text-sm" autoFocus placeholder="Ej. Reballing GPU, Cambio de pasta térmica..." />
            </div>
            <div>
              <label className="label text-[9px]">Precio (MXN)</label>
              <input type="number" min="0" step="0.01" value={servicePrice}
                onChange={e => setServicePrice(e.target.value)} className="input text-sm" placeholder="0.00" />
            </div>
            {serviceError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                <AlertTriangle size={12} /> {serviceError}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setShowAddService(false); setServiceDesc(''); setServicePrice(''); setServiceError(''); }}
                className="btn-ghost flex-1 justify-center text-xs">Cancelar</button>
              <button onClick={handleAddService} disabled={addingService} className="btn-primary flex-1 justify-center text-xs disabled:opacity-50">
                {addingService ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Agregar</>}
              </button>
            </div>
          </div>
        ) : !isTerminal ? (
          <button onClick={() => setShowAddService(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#2a2a2a] text-xs text-[#555] hover:text-amber-400 hover:border-amber-500/30 transition-colors">
            <Plus size={13} /> Agregar concepto de mano de obra
          </button>
        ) : null}
      </div>

      {/* ── PIEZAS UTILIZADAS ── */}
      <div className="card p-5">
        <p className="section-title mb-4">Piezas utilizadas</p>

        {inventoryParts.length > 0 && (
          <div className="space-y-2 mb-4">
            {inventoryParts.map(part => (
              <div key={part.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                part.reserved ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#0f0f0f] border-[#1a1a1a]'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {part.reserved
                      ? <Lock size={10} className="text-amber-400 flex-shrink-0" />
                      : <CheckCircle size={10} className="text-green-400 flex-shrink-0" />}
                    <p className="text-sm text-[#ddd] truncate">{part.item?.name}</p>
                  </div>
                  <p className="text-xs text-[#555] font-mono ml-4">
                    {part.quantity}x · {formatCurrency(part.unitPrice)} c/u
                    {part.reserved && <span className="ml-2 text-amber-400">· Reservada</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-sm text-amber-400">{formatCurrency(part.unitPrice * part.quantity)}</span>
                  {part.reserved && !isTerminal && (
                    <button onClick={() => handleConfirmReserved(part.id)}
                      className="text-xs text-green-400/70 hover:text-green-400 border border-green-400/20 hover:border-green-400/40 px-2 py-0.5 rounded-md transition-colors font-mono">
                      Usar
                    </button>
                  )}
                  {!isTerminal && (
                    <button onClick={() => handleDeletePart(part.id)} className="text-[#444] hover:text-red-400 transition-colors p-1">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between px-1 pt-1 border-t border-[#1a1a1a]">
              <span className="text-xs text-[#666]">Total en piezas</span>
              <span className="font-mono text-sm font-semibold text-amber-400">{formatCurrency(inventoryTotal)}</span>
            </div>
          </div>
        )}

        {/* Buscador de inventario */}
        {!isTerminal && <div className="border border-dashed border-[#2a2a2a] rounded-xl p-4 bg-[#0d0d0d] space-y-3">
          <p className="text-xs font-semibold text-[#888]">Agregar pieza de inventario</p>
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
                        <p className="text-xs font-mono text-amber-400">{formatCurrency(item.salePrice)}</p>
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
          {inventoryParts.length === 0 && !selected && (
            <p className="text-xs text-[#444] text-center py-2">Sin piezas de inventario registradas.</p>
          )}
        </div>}
      </div>

      {/* ── PRODUCTOS VENDIDOS (solo informativo) ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title mb-0">Productos vendidos</p>
          <span className="text-[10px] text-[#555] font-mono">solo informativo</span>
        </div>

        {sales.length > 0 ? (
          <div className="space-y-2 mb-4">
            {sales.map(sale => (
              <div key={sale.id} className="flex items-center gap-3 p-3 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-amber-500">{sale.saleNumber}</span>
                    {sale.paymentMethod && (
                      <span className="text-[10px] text-[#555] font-mono">{PAYMENT_METHODS[sale.paymentMethod as keyof typeof PAYMENT_METHODS] ?? sale.paymentMethod}</span>
                    )}
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
              <span className="text-xs text-[#666]">Total en productos (no suma a la orden)</span>
              <span className="font-mono text-sm text-[#888]">{formatCurrency(salesTotal)}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#444] text-center py-2 mb-4">Sin productos vendidos asociados.</p>
        )}

        <Link href={`/sales/new?customerId=${customerId}&repairId=${repairId}`} className="btn-secondary w-full justify-center">
          <ShoppingCart size={13} /> Registrar venta en POS
        </Link>
      </div>

      {/* ── MODAL DE DESBLOQUEO ── */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a1a]">
              <LockOpen size={14} className="text-amber-400" />
              <p className="text-sm font-semibold text-[#ddd]">Desbloquear orden</p>
            </div>

            <div>
              <label className="label text-[9px]">Cambiar estado a</label>
              <select value={unlockStatus} onChange={e => setUnlockStatus(e.target.value)} className="select">
                {REOPEN_STATUSES.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-[9px]">Motivo del desbloqueo *</label>
              <textarea
                value={unlockReason} onChange={e => setUnlockReason(e.target.value)}
                rows={3} autoFocus
                placeholder="Describe el motivo para reabrir esta orden..."
                className="input resize-none text-sm"
              />
            </div>

            {unlockError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                <AlertTriangle size={12} /> {unlockError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowUnlockModal(false); setUnlockReason(''); setUnlockError(''); }}
                className="btn-ghost flex-1 justify-center text-xs">
                Cancelar
              </button>
              <button onClick={handleUnlock} disabled={unlocking}
                className="btn-primary flex-1 justify-center text-xs disabled:opacity-50">
                {unlocking
                  ? <Loader2 size={12} className="animate-spin" />
                  : <><LockOpen size={12} /> Confirmar desbloqueo</>}
              </button>
            </div>
          </div>
        </div>
      )}
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
