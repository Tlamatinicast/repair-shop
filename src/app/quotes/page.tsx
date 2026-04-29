import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MobileHeader } from '@/components/MobileHeader';
import { Plus, FileText, ChevronRight } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const QUOTE_STATUSES: Record<string, { label: string; color: string }> = {
  DRAFT:    { label: 'Borrador',  color: 'text-[#666] bg-[#1a1a1a] border-[#2a2a2a]' },
  SENT:     { label: 'Enviada',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  ACCEPTED: { label: 'Aceptada', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  REJECTED: { label: 'Rechazada', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  EXPIRED:  { label: 'Vencida',  color: 'text-[#555] bg-[#111] border-[#222]' },
};

export default async function QuotesPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const status = searchParams.status ?? '';
  const q = searchParams.q ?? '';

  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { quoteNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [quotes, counts] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.quote.groupBy({ by: ['status'], _count: true }),
  ]);

  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count]));
  const total = counts.reduce((s, c) => s + c._count, 0);

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in">

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="section-title mb-0.5">Módulo</p>
            <h1 className="page-title">Cotizaciones</h1>
          </div>
          <Link href="/quotes/new" className="btn-primary">
            <Plus size={14} /> Nueva cotización
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Total', value: total, href: '/quotes' },
            { label: 'Borradores', value: countMap['DRAFT'] ?? 0, href: '/quotes?status=DRAFT' },
            { label: 'Enviadas', value: countMap['SENT'] ?? 0, href: '/quotes?status=SENT' },
            { label: 'Aceptadas', value: countMap['ACCEPTED'] ?? 0, href: '/quotes?status=ACCEPTED' },
            { label: 'Rechazadas', value: (countMap['REJECTED'] ?? 0) + (countMap['EXPIRED'] ?? 0), href: '/quotes?status=REJECTED' },
          ].map(stat => (
            <Link key={stat.label} href={stat.href}
              className="card p-4 text-center hover:border-amber-500/20 transition-colors">
              <p className="text-xl font-bold text-[#eee] font-mono">{stat.value}</p>
              <p className="text-xs text-[#555] mt-0.5">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Filters */}
        <form method="get" className="flex gap-3 mb-5">
          <input
            name="q" defaultValue={q} placeholder="Buscar por folio o cliente..."
            className="input flex-1"
          />
          <select name="status" defaultValue={status} className="select w-40">
            <option value="">Todos los estados</option>
            {Object.entries(QUOTE_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondary">Filtrar</button>
        </form>

        {/* List */}
        <div className="space-y-2">
          {quotes.length === 0 && (
            <div className="card p-8 text-center">
              <FileText size={32} className="text-[#333] mx-auto mb-3" />
              <p className="text-sm text-[#555]">No hay cotizaciones{q || status ? ' con esos filtros' : ''}.</p>
            </div>
          )}
          {quotes.map(quote => {
            const st = QUOTE_STATUSES[quote.status] ?? QUOTE_STATUSES['DRAFT'];
            const displayName = quote.customer?.name ?? quote.customerName ?? 'Sin cliente';
            const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date() && quote.status === 'SENT';
            return (
              <Link key={quote.id} href={`/quotes/${quote.id}`}
                className="card p-4 flex items-center gap-4 hover:border-amber-500/20 transition-colors">
                <FileText size={16} className="text-[#444] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-mono font-medium text-[#ccc]">{quote.quoteNumber}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${isExpired ? QUOTE_STATUSES['EXPIRED'].color : st.color}`}>
                      {isExpired ? 'Vencida' : st.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#666] truncate">{displayName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono font-semibold text-amber-400">{formatCurrency(quote.total)}</p>
                  <p className="text-[10px] text-[#555]">{formatDate(quote.createdAt)}</p>
                </div>
                <ChevronRight size={14} className="text-[#444]" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
