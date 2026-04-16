import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { ArrowLeft, ShoppingBag, ExternalLink } from 'lucide-react';
import { SaleReceiptButton } from './SaleReceiptButton';
import { CancelSaleButton } from './CancelSaleButton';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
};

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const [sale, session] = await Promise.all([
    prisma.sale.findUnique({
      where: { id: Number(params.id) },
      include: { customer: true, repair: true, items: { include: { item: true } } },
    }),
    getSession(),
  ]);

  if (!sale) notFound();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

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
                <Row label="Método" value={PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod} />
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
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card p-4 space-y-2">
              <p className="section-title mb-3">Acciones</p>
              <SaleReceiptButton sale={{
                ...sale,
                createdAt: sale.createdAt.toISOString(),
                customer: sale.customer ? { name: sale.customer.name, phone: sale.customer.phone } : null,
                items: sale.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: i.subtotal })),
              }} />
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
