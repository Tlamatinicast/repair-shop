import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate, formatCurrency } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { ArrowLeft, User, FileText, Package } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getBusinessSettings } from '@/lib/businessSettings';
import { QuoteActions } from './QuoteActions';

export const dynamic = 'force-dynamic';

const QUOTE_STATUSES: Record<string, { label: string; color: string }> = {
  DRAFT:    { label: 'Borrador',   color: 'text-[#666] bg-[#1a1a1a] border-[#2a2a2a]' },
  SENT:     { label: 'Enviada',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  ACCEPTED: { label: 'Aceptada',   color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  REJECTED: { label: 'Rechazada',  color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  EXPIRED:  { label: 'Vencida',    color: 'text-[#555] bg-[#111] border-[#222]' },
};

const fmt = (n: number) => formatCurrency(n);

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const [quote, session, biz] = await Promise.all([
    prisma.quote.findUnique({
      where: { id: Number(params.id) },
      include: { customer: true, items: true },
    }),
    getSession(),
    getBusinessSettings(),
  ]);

  if (!quote) notFound();

  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date() && quote.status === 'SENT';
  const effectiveStatus = isExpired ? 'EXPIRED' : quote.status;
  const st = QUOTE_STATUSES[effectiveStatus] ?? QUOTE_STATUSES['DRAFT'];

  const displayName = quote.customer?.name ?? quote.customerName ?? 'Sin cliente';
  const displayPhone = quote.customer?.phone ?? quote.customerPhone ?? '';

  const canEdit = quote.status === 'DRAFT';
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/quotes" className="btn-ghost"><ArrowLeft size={15} /></Link>
          <div className="flex-1">
            <p className="section-title mb-0.5">Cotización</p>
            <div className="flex items-center gap-3">
              <h1 className="page-title font-mono">{quote.quoteNumber}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${st.color}`}>{st.label}</span>
            </div>
          </div>
          {canEdit && (
            <Link href={`/quotes/${quote.id}/edit`} className="btn-secondary">Editar</Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Main */}
          <div className="lg:col-span-2 space-y-5">

            {/* Customer */}
            <div className="card p-5">
              <SectionHeader icon={<User size={14} />} title="Cliente" />
              <div className="mt-4 space-y-1">
                {quote.customer ? (
                  <Link href={`/customers/${quote.customerId}`} className="text-sm font-medium text-amber-500 hover:text-amber-400">
                    {displayName}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-[#ccc]">{displayName || '—'}</p>
                )}
                {displayPhone && <p className="text-sm text-[#888] font-mono">{displayPhone}</p>}
              </div>
            </div>

            {/* Items */}
            <div className="card p-5">
              <SectionHeader icon={<Package size={14} />} title="Conceptos" />
              <div className="mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      <th className="text-left pb-2 text-[10px] uppercase tracking-wide text-[#555] font-normal">Descripción</th>
                      <th className="text-center pb-2 text-[10px] uppercase tracking-wide text-[#555] font-normal w-12">Cant.</th>
                      <th className="text-right pb-2 text-[10px] uppercase tracking-wide text-[#555] font-normal w-24">P. Unit.</th>
                      <th className="text-right pb-2 text-[10px] uppercase tracking-wide text-[#555] font-normal w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111]">
                    {quote.items.map(item => (
                      <tr key={item.id} className="py-2">
                        <td className="py-2.5 pr-4">
                          <p className="text-[#ccc]">{item.description}</p>
                          <div className="flex gap-2 mt-0.5">
                            {item.hasIva && <span className="text-[10px] text-blue-400 font-mono">+IVA {fmt(item.ivaAmount)}</span>}
                            {item.onDemand && <span className="text-[10px] text-amber-500/60">Bajo pedido</span>}
                          </div>
                        </td>
                        <td className="py-2.5 text-center text-[#666]">{item.quantity}</td>
                        <td className="py-2.5 text-right font-mono text-[#888]">{fmt(item.unitPrice)}</td>
                        <td className="py-2.5 text-right font-mono font-semibold text-[#ccc]">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-4 border-t border-[#1a1a1a] pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-[#666]">
                    <span>Subtotal</span><span className="font-mono">{fmt(quote.subtotal)}</span>
                  </div>
                  {quote.ivaAmount > 0 && (
                    <div className="flex justify-between text-xs text-[#555]">
                      <span>IVA (16%)</span><span className="font-mono">{fmt(quote.ivaAmount)}</span>
                    </div>
                  )}
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-400/70">
                      <span>Descuento</span><span className="font-mono">− {fmt(quote.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-amber-400 pt-1 border-t border-[#1a1a1a]">
                    <span>Total</span><span className="font-mono">{fmt(quote.total)}</span>
                  </div>
                  {quote.deposit > 0 && (
                    <div className="flex justify-between text-xs text-[#555]">
                      <span>Anticipo solicitado</span><span className="font-mono">{fmt(quote.deposit)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Terms */}
            {quote.terms && (
              <div className="card p-5">
                <SectionHeader icon={<FileText size={14} />} title="Términos y condiciones" />
                <p className="mt-4 text-xs text-[#666] leading-relaxed whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Dates */}
            <div className="card p-5 space-y-2">
              <p className="section-title mb-3">Fechas</p>
              <div className="flex justify-between text-xs">
                <span className="text-[#555]">Creada</span>
                <span className="font-mono text-[#888]">{formatDate(quote.createdAt)}</span>
              </div>
              {quote.validUntil && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#555]">Válida hasta</span>
                  <span className={`font-mono ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                    {formatDate(quote.validUntil)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <QuoteActions
              quoteId={quote.id}
              status={quote.status}
              isAdmin={isAdmin}
              customerId={quote.customerId}
              customerName={displayName}
              customerPhone={displayPhone}
              quoteNumber={quote.quoteNumber}
              total={quote.total}
              validUntil={quote.validUntil?.toISOString() ?? null}
              biz={biz}
              quote={{
                quoteNumber: quote.quoteNumber,
                status: quote.status,
                customerName: displayName,
                customerPhone: displayPhone,
                subtotal: quote.subtotal,
                discount: quote.discount,
                ivaAmount: quote.ivaAmount,
                total: quote.total,
                deposit: quote.deposit,
                notes: quote.notes ?? undefined,
                terms: quote.terms ?? undefined,
                validUntil: quote.validUntil?.toISOString() ?? undefined,
                createdAt: quote.createdAt.toISOString(),
                items: quote.items.map(i => ({
                  description: i.description,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                  hasIva: i.hasIva,
                  onDemand: i.onDemand,
                  ivaAmount: i.ivaAmount,
                  subtotal: i.subtotal,
                  total: i.total,
                })),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a1a]">
      <span className="text-amber-500">{icon}</span>
      <h2 className="text-sm font-semibold text-[#ccc]">{title}</h2>
    </div>
  );
}
