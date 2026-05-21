import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MobileHeader } from '@/components/MobileHeader';
import { ArrowLeft, Phone, Mail, MapPin, Plus, FileText } from 'lucide-react';
import { CustomerActions } from './CustomerActions';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(params.id) },
    include: {
      repairs: { orderBy: { createdAt: 'desc' } },
      quotes:  { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!customer) notFound();

  const totalSpent = customer.repairs
    .filter(r => r.status === 'DELIVERED')
    .reduce((s, r) => s + r.totalCost, 0);

  const activeStatuses = ['RECEIVED', 'DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR', 'READY'];
  const hasActiveRepairs = customer.repairs.some(r => activeStatuses.includes(r.status));

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/customers" className="btn-ghost"><ArrowLeft size={15} /></Link>
          <div>
            <p className="section-title mb-0.5">Clientes</p>
            <h1 className="page-title">{customer.name}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            {/* Info card */}
            <div className="card p-5">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-2xl font-bold text-amber-500 mb-4">
                {customer.name.charAt(0)}
              </div>
              <h2 className="text-base font-semibold text-[#ddd] mb-3">{customer.name}</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <Phone size={12} className="text-amber-500 flex-shrink-0" />
                  <span className="font-mono">{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-[#888]">
                    <Mail size={12} className="text-amber-500 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm text-[#888]">
                    <MapPin size={12} className="text-amber-500 flex-shrink-0" />
                    <span>{customer.address}</span>
                  </div>
                )}
              </div>
              {customer.notes && (
                <p className="mt-3 text-xs text-[#666] bg-[#161616] rounded-lg p-2.5">{customer.notes}</p>
              )}
            </div>

            {/* Stats */}
            <div className="card p-5 space-y-3">
              <p className="section-title">Estadísticas</p>
              <Stat label="Total órdenes" value={String(customer.repairs.length)} />
              <Stat label="Gastado total" value={formatCurrency(totalSpent)} mono />
              <Stat label="Cliente desde" value={formatDate(customer.createdAt)} />
            </div>

            {/* Actions */}
            <Link href={`/repairs/new?customerId=${customer.id}`} className="btn-primary w-full justify-center">
              <Plus size={14} /> Nueva reparación
            </Link>

            <CustomerActions
              customerId={customer.id}
              customerName={customer.name}
              hasActiveRepairs={hasActiveRepairs}
              customer={{
                name: customer.name,
                phone: customer.phone,
                email: customer.email ?? '',
                address: customer.address ?? '',
                notes: customer.notes ?? '',
              }}
            />
          </div>

          {/* Repair history */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[#ccc] mb-4">Historial de reparaciones</h2>
              {customer.repairs.length > 0 ? (
                <div className="space-y-2">
                  {customer.repairs.map((r) => (
                    <Link key={r.id} href={`/repairs/${r.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#161616] transition-colors group">
                      <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xs font-mono text-[#666] flex-shrink-0">
                        {r.deviceType.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#ddd]">{r.deviceBrand} {r.deviceModel}</p>
                        <p className="text-xs text-[#666] truncate">{r.issue}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={r.status} />
                        <span className="font-mono text-xs text-[#444]">{formatDate(r.createdAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#555] text-center py-10">Sin órdenes todavía.</p>
              )}
            </div>

            {/* Quotes */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#ccc]">Cotizaciones</h2>
                <Link href={`/quotes/new?customerId=${customer.id}`} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                  <Plus size={11} /> Nueva
                </Link>
              </div>
              {customer.quotes.length > 0 ? (
                <div className="space-y-2">
                  {customer.quotes.map((q) => {
                    const isExpired = q.status === 'SENT' && q.validUntil && new Date(q.validUntil) < new Date();
                    const status    = isExpired ? 'EXPIRED' : q.status;
                    const STATUS_STYLES: Record<string, string> = {
                      DRAFT:    'bg-[#1e1e1e] text-[#888]',
                      SENT:     'bg-blue-500/10 text-blue-400',
                      ACCEPTED: 'bg-green-500/10 text-green-400',
                      REJECTED: 'bg-red-500/10 text-red-400',
                      EXPIRED:  'bg-orange-500/10 text-orange-400',
                    };
                    const STATUS_LABELS: Record<string, string> = {
                      DRAFT: 'Borrador', SENT: 'Enviada', ACCEPTED: 'Aceptada',
                      REJECTED: 'Rechazada', EXPIRED: 'Vencida',
                    };
                    return (
                      <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#161616] transition-colors group">
                        <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={14} className="text-[#555]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#ddd] font-mono">{q.quoteNumber}</p>
                          <p className="text-xs text-[#666]">{formatCurrency(q.total)} · {formatDate(q.createdAt)}</p>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT}`}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#555] text-center py-8">Sin cotizaciones todavía.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[#666]">{label}</span>
      <span className={`text-sm text-[#ccc] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
