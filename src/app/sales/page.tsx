import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { DateFilter } from './DateFilter';
import { Plus, ShoppingBag, TrendingUp, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAYMENT_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  CASH:     { label: 'Efectivo',      icon: <Banknote size={12} /> },
  CARD:     { label: 'Tarjeta',       icon: <CreditCard size={12} /> },
  TRANSFER: { label: 'Transferencia', icon: <ArrowLeftRight size={12} /> },
};

export default async function SalesPage({ searchParams }: { searchParams: { date?: string } }) {
  const today = new Date().toISOString().split('T')[0];
  const date  = searchParams.date ?? today;

  const start = new Date(`${date}T00:00:00`);
  const end   = new Date(`${date}T23:59:59`);

  const [sales, stats, byMethod] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { customer: true, items: true, payments: { orderBy: { createdAt: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sale.aggregate({
      _sum: { total: true, discount: true },
      _count: true,
      where: { createdAt: { gte: start, lte: end } },
    }),
    prisma.salePayment.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: true,
      where: { createdAt: { gte: start, lte: end } },
    }),
  ]);

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

        {/* Date filter */}
        <DateFilter date={date} today={today} />

        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Ventas del día" value={String(stats._count)} icon={<ShoppingBag size={14} />} color="text-blue-400" bg="bg-blue-400/5 border-blue-400/10" />
          <StatCard label="Ingresos" value={formatCurrency(stats._sum.total ?? 0)} icon={<TrendingUp size={14} />} color="text-green-400" bg="bg-green-400/5 border-green-400/10" small />
          <StatCard label="Descuentos" value={formatCurrency(stats._sum.discount ?? 0)} icon={<TrendingUp size={14} />} color="text-amber-400" bg="bg-amber-400/5 border-amber-400/10" small />
          {byMethod.map(m => (
            <div key={m.paymentMethod} className="card p-3 border bg-violet-400/5 border-violet-400/10">
              <div className="flex items-center gap-1.5 text-violet-400 mb-1">
                {PAYMENT_LABELS[m.paymentMethod]?.icon}
                <span className="section-title text-current opacity-70 text-[9px]">{PAYMENT_LABELS[m.paymentMethod]?.label ?? m.paymentMethod}</span>
              </div>
              <p className="font-mono text-sm font-semibold text-violet-400">{formatCurrency(m._sum.amount ?? 0)}</p>
            </div>
          ))}
        </div>

        {/* Sales list */}
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {['Folio', 'Cliente', 'Productos', 'Método', 'Total', 'Hora', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 section-title text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-[#131313] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/sales/${s.id}`} className="font-mono text-xs text-amber-500 hover:text-amber-400">{s.saleNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#ccc]">{s.customer?.name ?? <span className="text-[#444]">Sin cliente</span>}</td>
                  <td className="px-4 py-3 text-sm text-[#888]">{s.items.length} producto{s.items.length !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3">
                    <span className="badge text-violet-400 bg-violet-400/10 border-violet-400/20">
                      {PAYMENT_LABELS[(s as any).payments?.[0]?.paymentMethod]?.label ?? 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-amber-400 font-medium">{formatCurrency(s.total)}</td>
                  <td className="px-4 py-3 text-xs text-[#555] font-mono">
                    {new Date(s.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/sales/${s.id}`} className="text-xs text-[#555] hover:text-amber-400 font-mono transition-colors">ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
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
                  <p className="text-xs text-[#555]">{s.items.length} producto{s.items.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm font-bold text-amber-400">{formatCurrency(s.total)}</p>
                  <p className="text-[10px] text-[#555] font-mono">
                    {new Date(s.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {sales.length === 0 && (
            <div className="text-center py-16">
              <ShoppingBag size={28} className="text-[#333] mx-auto mb-3" />
              <p className="text-[#555] text-sm mb-4">Sin ventas este día.</p>
              <Link href="/sales/new" className="btn-primary inline-flex"><Plus size={14} /> Registrar venta</Link>
            </div>
          )}

          {sales.length > 0 && (
            <div className="px-4 py-3 border-t border-[#1a1a1a] flex justify-between items-center">
              <p className="text-xs text-[#555] font-mono">{sales.length} venta{sales.length !== 1 ? 's' : ''}</p>
              <p className="text-xs font-mono font-semibold text-amber-400">{formatCurrency(stats._sum.total ?? 0)} total</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg, small }: {
  label: string; value: string; icon: React.ReactNode; color: string; bg: string; small?: boolean;
}) {
  return (
    <div className={`card p-3 border ${bg}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <span className="section-title text-current opacity-70 text-[9px]">{label}</span>
      </div>
      <p className={`font-mono font-semibold ${color} ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
