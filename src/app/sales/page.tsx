import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { DateFilter } from './DateFilter';
import { Plus, ShoppingBag, TrendingUp, CreditCard, Banknote, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

const PAYMENT_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  CASH:     { label: 'Efectivo',      icon: <Banknote size={12} /> },
  CARD:     { label: 'Tarjeta',       icon: <CreditCard size={12} /> },
  TRANSFER: { label: 'Transferencia', icon: <ArrowLeftRight size={12} /> },
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: { date?: string; page?: string };
}) {
  const today     = new Date().toISOString().split('T')[0];
  const dateFilter = searchParams.date ?? null;          // null = sin filtro
  const page      = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const skip      = (page - 1) * PAGE_SIZE;

  // ── Rango de fecha cuando hay filtro ────────────────────────────────────────
  const dateWhere = dateFilter
    ? { createdAt: { gte: new Date(`${dateFilter}T00:00:00`), lte: new Date(`${dateFilter}T23:59:59`) } }
    : {};

  // ── Rango del mes actual para stats cuando no hay filtro ────────────────────
  const now    = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const mEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const statsWhere = dateFilter
    ? { createdAt: { gte: new Date(`${dateFilter}T00:00:00`), lte: new Date(`${dateFilter}T23:59:59`) } }
    : { createdAt: { gte: mStart, lte: mEnd } };

  const [sales, total, stats, byMethod] = await Promise.all([
    // Lista paginada
    prisma.sale.findMany({
      where:   dateWhere,
      include: { customer: true, items: true, payments: { orderBy: { createdAt: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    // Total de registros para la paginación
    prisma.sale.count({ where: dateWhere }),
    // Stats (día o mes actual)
    prisma.sale.aggregate({
      _sum:   { total: true, discount: true },
      _count: true,
      where:  statsWhere,
    }),
    // Métodos de pago (día o mes actual)
    prisma.salePayment.groupBy({
      by:    ['paymentMethod'],
      _sum:  { amount: true },
      _count: true,
      where: { createdAt: statsWhere.createdAt },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const statsLabel = dateFilter ? `del ${dateFilter}` : 'este mes';

  // Helper para construir href de paginación conservando filtro de fecha
  const pageHref = (p: number) =>
    dateFilter ? `/sales?date=${dateFilter}&page=${p}` : `/sales?page=${p}`;

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-5xl mx-auto animate-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="section-title mb-0.5">Módulo de ventas</p>
            <h1 className="page-title">Ventas</h1>
          </div>
          <Link href="/sales/new" className="btn-primary">
            <Plus size={15} />
            <span className="hidden sm:inline">Nueva venta</span>
            <span className="sm:hidden">Nueva</span>
          </Link>
        </div>

        {/* Filtro de fecha */}
        <DateFilter dateFilter={dateFilter} today={today} />

        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label={`Ventas ${statsLabel}`}
            value={String(stats._count)}
            icon={<ShoppingBag size={14} />}
            color="text-blue-400"
            bg="bg-blue-400/5 border-blue-400/10"
          />
          <StatCard
            label={`Ingresos ${statsLabel}`}
            value={formatCurrency(stats._sum.total ?? 0)}
            icon={<TrendingUp size={14} />}
            color="text-green-400"
            bg="bg-green-400/5 border-green-400/10"
            small
          />
          <StatCard
            label={`Descuentos ${statsLabel}`}
            value={formatCurrency(stats._sum.discount ?? 0)}
            icon={<TrendingUp size={14} />}
            color="text-amber-400"
            bg="bg-amber-400/5 border-amber-400/10"
            small
          />
          {byMethod[0] && (
            <div className="card p-3 border bg-violet-400/5 border-violet-400/10">
              <div className="flex items-center gap-1.5 text-violet-400 mb-1">
                {PAYMENT_LABELS[byMethod[0].paymentMethod]?.icon}
                <span className="section-title text-current opacity-70 text-[9px]">
                  {PAYMENT_LABELS[byMethod[0].paymentMethod]?.label ?? byMethod[0].paymentMethod}
                </span>
              </div>
              <p className="font-mono text-sm font-semibold text-violet-400">
                {formatCurrency(byMethod[0]._sum.amount ?? 0)}
              </p>
            </div>
          )}
        </div>

        {/* Lista de ventas */}
        <div className="card overflow-hidden">

          {/* Encabezado de la lista */}
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <p className="text-xs text-[#666] font-mono">
              {dateFilter
                ? `${sales.length} venta${sales.length !== 1 ? 's' : ''} el ${dateFilter}`
                : `${total} venta${total !== 1 ? 's' : ''} en total · página ${page} de ${Math.max(totalPages, 1)}`}
            </p>
            {!dateFilter && total > 0 && (
              <p className="text-[10px] text-[#444] font-mono">25 por página</p>
            )}
          </div>

          {/* Tabla desktop */}
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {['Folio', 'Cliente', 'Productos', 'Método', 'Total', 'Fecha', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 section-title text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-[#131313] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/sales/${s.id}`} className="font-mono text-xs text-amber-500 hover:text-amber-400">
                      {s.saleNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#ccc]">
                    {s.customer?.name ?? <span className="text-[#444]">Sin cliente</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#888]">
                    {s.items.length} producto{s.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge text-violet-400 bg-violet-400/10 border-violet-400/20">
                      {PAYMENT_LABELS[(s as any).payments?.[0]?.paymentMethod]?.label ?? 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-amber-400 font-medium">
                    {formatCurrency(s.total)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#555] font-mono">
                    {dateFilter ? formatTime(s.createdAt) : formatDate(s.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/sales/${s.id}`} className="text-xs text-[#555] hover:text-amber-400 font-mono transition-colors">ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cards mobile */}
          <div className="md:hidden divide-y divide-[#141414]">
            {sales.map(s => (
              <Link key={s.id} href={`/sales/${s.id}`} className="flex items-center gap-3 p-4 hover:bg-[#131313] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-amber-500">{s.saleNumber}</span>
                    <span className="badge text-violet-400 bg-violet-400/10 border-violet-400/20 text-[9px]">
                      {PAYMENT_LABELS[(s as any).payments?.[0]?.paymentMethod]?.label ?? 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-[#ccc]">{s.customer?.name ?? 'Sin cliente'}</p>
                  <p className="text-xs text-[#555]">
                    {s.items.length} producto{s.items.length !== 1 ? 's' : ''} · {dateFilter ? formatTime(s.createdAt) : formatDate(s.createdAt)}
                  </p>
                </div>
                <p className="font-mono text-sm font-bold text-amber-400 flex-shrink-0">
                  {formatCurrency(s.total)}
                </p>
              </Link>
            ))}
          </div>

          {/* Estado vacío */}
          {sales.length === 0 && (
            <div className="text-center py-16">
              <ShoppingBag size={28} className="text-[#333] mx-auto mb-3" />
              <p className="text-[#555] text-sm mb-4">
                {dateFilter ? `Sin ventas el ${dateFilter}.` : 'Sin ventas registradas.'}
              </p>
              <Link href="/sales/new" className="btn-primary inline-flex">
                <Plus size={14} /> Registrar venta
              </Link>
            </div>
          )}

          {/* Paginación */}
          {!dateFilter && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center justify-between gap-2">
              <Link
                href={pageHref(page - 1)}
                className={`btn-ghost text-xs flex items-center gap-1 ${page <= 1 ? 'opacity-30 pointer-events-none' : ''}`}
              >
                <ChevronLeft size={13} /> Anterior
              </Link>

              {/* Números de página — máximo 5 visibles */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '…')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="text-xs text-[#444] px-1">…</span>
                    ) : (
                      <Link
                        key={p}
                        href={pageHref(p as number)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-mono transition-colors ${
                          p === page
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'text-[#666] hover:text-[#ccc] hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  )}
              </div>

              <Link
                href={pageHref(page + 1)}
                className={`btn-ghost text-xs flex items-center gap-1 ${page >= totalPages ? 'opacity-30 pointer-events-none' : ''}`}
              >
                Siguiente <ChevronRight size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg, small }: {
  label: string; value: string; icon: React.ReactNode;
  color: string; bg: string; small?: boolean;
}) {
  return (
    <div className={`card p-3 border ${bg}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <span className="section-title text-current opacity-70 text-[9px] truncate">{label}</span>
      </div>
      <p className={`font-mono font-semibold ${color} ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
