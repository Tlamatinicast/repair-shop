import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { ArrowLeft, ShoppingBag, ExternalLink, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { SaleReceiptButton } from './SaleReceiptButton';
import { CancelSaleButton } from './CancelSaleButton';
import { AddPaymentButton } from './AddPaymentButton';
import { getSession } from '@/lib/auth';
import { getBusinessSettings } from '@/lib/businessSettings';

export const dynamic = 'force-dynamic';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
};

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const [sale, session, biz] = await Promise.all([
    prisma.sale.findUnique({
      where: { id: Number(params.id) },
      include: { customer: true, repair: true, items: { include: { item: true } }, payments: { orderBy: { createdAt: 'asc' } } },
    }),
    getSession(),
    getBusinessSettings(),
  ]);

  if (!sale) notFound();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const remaining = sale.total - sale.amountPaid;
  const statusLabel: Record<string, string> = { PAID: 'Liquidado', PARTIAL: 'Anticipo', PENDING: 'Pendiente' };
  const statusColor: Record<string, string> = {
    PAID:    'text-green-400 bg-green-400/10 border-green-400/20',
    PARTIAL: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    PENDING: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-3xl mx-auto animate-in">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/sales" className="btn-ghost"><ArrowLeft size={15} /></Link>
          <div>
            <p className="section-title mb-0.5">Ventas</p>
            <h1 className="page-title font-mono">{sale.saleNumber}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-4">

            {/* Items */}
            <div className="card p-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a1a] mb-4">
                <ShoppingBag size={14} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-[#ccc]">Productos vendidos</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    {['Producto', 'Cant.', 'P. Unit.', 'Subtotal'].map(h => (
                      <th key={h} className="pb-2 section-title text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151515]">
                  {sale.items.map(item => (
                    <tr key={item.id}>
                      <td className="py-2 text-sm text-[#ccc]">{item.name}</td>
                      <td className="py-2 text-sm font-mono text-[#888]">{item.quantity}</td>
                      <td className="py-2 text-sm font-mono text-[#888]">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 text-sm font-mono text-amber-400">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {sale.notes && (
              <div className="card p-4">
                <p className="label mb-1">Notas</p>
                <p className="text-sm text-[#888]">{sale.notes}</p>
              </div>
            )}

            {/* Payment history */}
            <div className="card p-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a1a] mb-4">
                <CreditCard size={14} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-[#ccc]">Historial de pagos</h2>
              </div>
              {(sale as any).payments?.length > 0 ? (
                <div className="space-y-3">
                  {(sale as any).payments.map((p: any, i: number) => (
                    <div key={p.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 size={11} className="text-green-400" />
                        </div>
                        {i < (sale as any).payments.length - 1 && (
                          <div className="w-px flex-1 bg-[#1a1a1a] my-1" style={{ minHeight: 12 }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-mono text-sm text-green-400">{formatCurrency(p.amount)}</span>
                          <span className="text-[10px] text-[#444] font-mono">
                            {PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#555] mt-0.5">
                          {formatDate(p.createdAt)} · {new Date(p.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {p.notes && <p className="text-xs text-[#666] mt-0.5 italic">{p.notes}</p>}
                      </div>
                    </div>
                  ))}
                  {remaining > 0 && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                        <Clock size={11} className="text-[#555]" />
                      </div>
                      <p className="text-xs text-[#555] font-mono">Saldo pendiente: {formatCurrency(remaining)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#555]">Sin registros de pago.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="card p-5">
              <p className="section-title mb-4">Resumen</p>
              <div className="space-y-2">
                <Row label="Folio" value={sale.saleNumber} mono />
                <Row label="Fecha" value={formatDate(sale.createdAt)} />
                <Row label="Hora" value={new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} mono />
                {(sale as any).payments?.[0] && (
                  <Row label="Método inicial" value={PAYMENT_LABELS[(sale as any).payments[0].paymentMethod] ?? (sale as any).payments[0].paymentMethod} />
                )}
                {sale.customer && <Row label="Cliente" value={sale.customer.name} />}
                {sale.repair && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#666]">Orden vinculada</span>
                    <Link href={`/repairs/${sale.repair.id}`} className="font-mono text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                      {sale.repair.ticketNumber} <ExternalLink size={10} />
                    </Link>
                  </div>
                )}
                <div className="pt-2 mt-2 border-t border-[#1a1a1a] space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#888]">Subtotal</span>
                    <span className="font-mono text-[#ccc]">{formatCurrency(sale.subtotal)}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Descuento</span>
                      <span className="font-mono text-green-400">- {formatCurrency(sale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold text-[#ddd]">Total</span>
                    <span className="font-mono text-lg font-bold text-amber-400">{formatCurrency(sale.total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#888]">Pagado</span>
                    <span className="font-mono text-sm text-green-400">{formatCurrency(sale.amountPaid)}</span>
                  </div>
                  {remaining > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#888]">Saldo</span>
                      <span className="font-mono text-sm text-red-400">{formatCurrency(remaining)}</span>
                    </div>
                  )}
                  <div className="flex justify-end pt-1">
                    <span className={`badge ${statusColor[sale.paymentStatus] ?? statusColor.PENDING}`}>
                      {statusLabel[sale.paymentStatus] ?? sale.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card p-4 space-y-2">
              <p className="section-title mb-3">Acciones</p>
              <SaleReceiptButton
                bizName={biz.name}
                sale={{
                  saleNumber: sale.saleNumber,
                  createdAt: sale.createdAt.toISOString(),
                  subtotal: sale.subtotal,
                  discount: sale.discount,
                  total: sale.total,
                  paymentMethod: (sale as any).payments?.[0]?.paymentMethod ?? null,
                  notes: sale.notes,
                  customer: sale.customer ? { name: sale.customer.name, phone: sale.customer.phone } : null,
                  items: sale.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: i.subtotal })),
                }}
              />
              {remaining > 0 && (
                <AddPaymentButton saleId={sale.id} remaining={remaining} />
              )}
              {isAdmin && <CancelSaleButton saleId={sale.id} saleNumber={sale.saleNumber} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[#666]">{label}</span>
      <span className={`text-sm text-[#ccc] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
