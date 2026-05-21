import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MobileHeader } from '@/components/MobileHeader';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  Wrench, ShoppingBag, Users, BarChart3,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ── Helpers de periodo ────────────────────────────────────────────────────────

type Period = 'this-month' | 'last-month' | 'last-3-months' | 'this-year';
const VALID_PERIODS: Period[] = ['this-month', 'last-month', 'last-3-months', 'this-year'];

function periodRange(period: Period): { from: Date; to: Date; label: string } {
  const now = new Date();
  const y   = now.getUTCFullYear();
  const m   = now.getUTCMonth(); // 0-based

  switch (period) {
    case 'this-month':
      return {
        from:  new Date(Date.UTC(y, m, 1)),
        to:    new Date(Date.UTC(y, m + 1, 1)),
        label: new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
                 .format(new Date(Date.UTC(y, m, 15))),
      };
    case 'last-month':
      return {
        from:  new Date(Date.UTC(y, m - 1, 1)),
        to:    new Date(Date.UTC(y, m, 1)),
        label: new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
                 .format(new Date(Date.UTC(y, m - 1, 15))),
      };
    case 'last-3-months': {
      return {
        from:  new Date(Date.UTC(y, m - 2, 1)),
        to:    new Date(Date.UTC(y, m + 1, 1)),
        label: 'Últimos 3 meses',
      };
    }
    case 'this-year':
      return {
        from:  new Date(Date.UTC(y, 0, 1)),
        to:    new Date(Date.UTC(y + 1, 0, 1)),
        label: `Año ${y}`,
      };
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  'this-month':    'Este mes',
  'last-month':    'Mes anterior',
  'last-3-months': '3 meses',
  'this-year':     'Este año',
};

const CATEGORY_LABELS: Record<string, string> = {
  RENT: 'Renta', UTILITIES: 'Servicios', SALARY: 'Salarios',
  SUPPLIES: 'Insumos', TRANSPORT: 'Transporte', MARKETING: 'Publicidad',
  MAINTENANCE: 'Mantenimiento', OTHER: 'Otro',
};

const PM_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
  OTHER: 'Otro', UNKNOWN: 'No especificado',
};

// ── Tendencia mensual (últimos 6 meses) ──────────────────────────────────────

async function monthlyTrend() {
  const now = new Date();
  const y   = now.getUTCFullYear();
  const m   = now.getUTCMonth();

  const months = Array.from({ length: 6 }, (_, i) => {
    const rawMonth = m - 5 + i;
    const yr = y + Math.floor(rawMonth / 12);
    const mo = ((rawMonth % 12) + 12) % 12;
    return {
      from:  new Date(Date.UTC(yr, mo, 1)),
      to:    new Date(Date.UTC(yr, mo + 1, 1)),
      label: new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: 'UTC' })
               .format(new Date(Date.UTC(yr, mo, 15))),
    };
  });

  const results = await Promise.all(
    months.map(async ({ from, to, label }) => {
      const [repPay, salePay, exp] = await Promise.all([
        prisma.repairPayment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: from, lt: to } } }),
        prisma.salePayment.aggregate(  { _sum: { amount: true }, where: { createdAt: { gte: from, lt: to } } }),
        prisma.expense.aggregate(      { _sum: { amount: true }, where: { date:      { gte: from, lt: to } } }),
      ]);
      return {
        label,
        income:  (repPay._sum.amount ?? 0) + (salePay._sum.amount ?? 0),
        expense: exp._sum.amount ?? 0,
      };
    }),
  );

  return results;
}

// ── Página principal ──────────────────────────────────────────────────────────

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  await requireAdmin();

  const period = (VALID_PERIODS as string[]).includes(searchParams.period ?? '')
    ? (searchParams.period as Period)
    : 'this-month';

  const { from, to, label } = periodRange(period);

  const [
    repairPayments,
    salePayments,
    expenses,
    repairsDelivered,
    repairsCreated,
    newCustomers,
    topDevices,
    trend,
  ] = await Promise.all([
    prisma.repairPayment.findMany({
      where:  { createdAt: { gte: from, lt: to } },
      select: { amount: true, paymentMethod: true },
    }),
    prisma.salePayment.findMany({
      where:  { createdAt: { gte: from, lt: to } },
      select: { amount: true, paymentMethod: true },
    }),
    prisma.expense.findMany({
      where:  { date: { gte: from, lt: to } },
      select: { amount: true, category: true },
    }),
    prisma.repair.count({ where: { status: 'DELIVERED', updatedAt: { gte: from, lt: to } } }),
    prisma.repair.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.customer.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.repair.groupBy({
      by: ['deviceType'], _count: true,
      orderBy: { _count: { deviceType: 'desc' } }, take: 5,
    }),
    monthlyTrend(),
  ]);

  // ── Totales ────────────────────────────────────────────────────────────────

  const totalRepairIncome = repairPayments.reduce((s, p) => s + p.amount, 0);
  const totalSaleIncome   = salePayments.reduce((s, p) => s + p.amount, 0);
  const totalIncome       = totalRepairIncome + totalSaleIncome;
  const totalExpenses     = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit         = totalIncome - totalExpenses;
  const margin            = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Por método de pago
  const byPM: Record<string, number> = {};
  for (const p of [...repairPayments, ...salePayments]) {
    byPM[p.paymentMethod] = (byPM[p.paymentMethod] ?? 0) + p.amount;
  }
  const pmEntries = Object.entries(byPM).sort(([, a], [, b]) => b - a);
  const pmMax     = pmEntries[0]?.[1] ?? 1;

  // Por categoría de gasto
  const byCat: Record<string, number> = {};
  for (const e of expenses) byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  const catEntries = Object.entries(byCat).sort(([, a], [, b]) => b - a);
  const catMax     = catEntries[0]?.[1] ?? 1;

  // Dispositivos más reparados (todos los tiempos)
  const deviceMax = (topDevices[0]?._count as any)?.deviceType as number ?? 1;

  // Tendencia — escala
  const trendMax = Math.max(...trend.map(t => Math.max(t.income, t.expense)), 1);

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-5xl mx-auto animate-in">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="section-title mb-0.5">Análisis</p>
            <h1 className="page-title capitalize">{label}</h1>
          </div>
          <BarChart3 size={22} className="text-[#333] mt-1.5 flex-shrink-0" />
        </div>

        {/* Selector de periodo */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {VALID_PERIODS.map(p => (
            <Link
              key={p}
              href={`/reports?period=${p}`}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                p === period
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-[#0f0f0f] border-[#1e1e1e] text-[#666] hover:text-[#aaa]'
              }`}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Ingresos"     value={formatCurrency(totalIncome)}
            icon={<TrendingUp size={14} />}  accent="text-green-400"  bg="bg-green-400/5 border-green-400/10" />
          <SummaryCard label="Gastos"       value={formatCurrency(totalExpenses)}
            icon={<TrendingDown size={14} />} accent="text-red-400"    bg="bg-red-400/5 border-red-400/10" />
          <SummaryCard label="Utilidad"     value={formatCurrency(netProfit)}
            icon={<DollarSign size={14} />}
            accent={netProfit >= 0 ? 'text-amber-400' : 'text-red-400'}
            bg={netProfit >= 0 ? 'bg-amber-400/5 border-amber-400/10' : 'bg-red-400/5 border-red-400/10'} />
          <SummaryCard label="Margen"       value={`${margin.toFixed(1)}%`}
            icon={<Percent size={14} />}
            accent={margin >= 30 ? 'text-violet-400' : margin >= 0 ? 'text-amber-400' : 'text-red-400'}
            bg="bg-violet-400/5 border-violet-400/10" />
        </div>

        {/* Fila 2: Tendencia + operaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

          {/* Tendencia 6 meses */}
          <div className="lg:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] mb-5">Tendencia — últimos 6 meses</h2>
            <div className="flex items-end gap-2 h-36">
              {trend.map(({ label: ml, income, expense }) => {
                const inPct  = Math.max((income  / trendMax) * 100, income  > 0 ? 3 : 0);
                const expPct = Math.max((expense / trendMax) * 100, expense > 0 ? 3 : 0);
                return (
                  <div key={ml} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '100px' }}>
                      <div
                        className="flex-1 bg-green-500/25 border-t-2 border-green-500/50 rounded-t-sm"
                        style={{ height: `${inPct}%` }}
                        title={`Ingresos: ${formatCurrency(income)}`}
                      />
                      <div
                        className="flex-1 bg-red-500/25 border-t-2 border-red-500/40 rounded-t-sm"
                        style={{ height: `${expPct}%` }}
                        title={`Gastos: ${formatCurrency(expense)}`}
                      />
                    </div>
                    <span className="text-[9px] text-[#555] font-mono capitalize">{ml}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 justify-end">
              <Legend color="bg-green-500/40 border-green-500/60" label="Ingresos" />
              <Legend color="bg-red-500/40 border-red-500/50"   label="Gastos" />
            </div>
          </div>

          {/* Operaciones */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] mb-4">Operaciones</h2>
            <div className="space-y-3">
              <OpRow icon={<Wrench size={13} className="text-blue-400" />}
                label="Órdenes recibidas" value={String(repairsCreated)} />
              <OpRow icon={<Wrench size={13} className="text-green-400" />}
                label="Entregas" value={String(repairsDelivered)} />
              <div className="border-t border-[#1a1a1a] pt-3 mt-1 space-y-3">
                <OpRow icon={<ShoppingBag size={13} className="text-amber-400" />}
                  label="Cobros reparaciones" value={formatCurrency(totalRepairIncome)} mono />
                <OpRow icon={<ShoppingBag size={13} className="text-violet-400" />}
                  label="Cobros ventas POS" value={formatCurrency(totalSaleIncome)} mono />
              </div>
              <div className="border-t border-[#1a1a1a] pt-3 mt-1 space-y-3">
                <OpRow icon={<Users size={13} className="text-amber-400" />}
                  label="Clientes nuevos" value={String(newCustomers)} />
                {repairsDelivered > 0 && (
                  <OpRow icon={<DollarSign size={13} className="text-green-400" />}
                    label="Ticket promedio" value={formatCurrency(totalRepairIncome / repairsDelivered)} mono />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fila 3: Métodos + Categorías + Dispositivos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Ingresos por método de pago */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] mb-4">Cobros por método</h2>
            {pmEntries.length > 0 ? (
              <div className="space-y-3">
                {pmEntries.map(([pm, amt]) => (
                  <BarRow key={pm}
                    label={PM_LABELS[pm] ?? pm}
                    value={formatCurrency(amt)}
                    pct={(amt / pmMax) * 100}
                    barClass="bg-green-500/40" />
                ))}
              </div>
            ) : (
              <Empty text="Sin cobros en este periodo." />
            )}
          </div>

          {/* Gastos por categoría */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] mb-4">Gastos por categoría</h2>
            {catEntries.length > 0 ? (
              <div className="space-y-3">
                {catEntries.map(([cat, amt]) => (
                  <BarRow key={cat}
                    label={CATEGORY_LABELS[cat] ?? cat}
                    value={formatCurrency(amt)}
                    pct={(amt / catMax) * 100}
                    barClass="bg-red-500/40" />
                ))}
              </div>
            ) : (
              <Empty text="Sin gastos en este periodo." />
            )}
          </div>

          {/* Dispositivos más reparados (todos los tiempos) */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] mb-1">Dispositivos más reparados</h2>
            <p className="text-[10px] text-[#555] mb-4">Todos los tiempos</p>
            {topDevices.length > 0 ? (
              <div className="space-y-3">
                {topDevices.map(({ deviceType, _count }) => {
                  const cnt = (_count as any).deviceType as number;
                  return (
                    <BarRow key={deviceType}
                      label={deviceType}
                      value={String(cnt)}
                      pct={(cnt / deviceMax) * 100}
                      barClass="bg-amber-500/40" />
                  );
                })}
              </div>
            ) : (
              <Empty text="Sin datos." />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon, accent, bg }: {
  label: string; value: string; icon: React.ReactNode; accent: string; bg: string;
}) {
  return (
    <div className={`card border p-4 ${bg}`}>
      <div className={`flex items-center gap-1.5 mb-2 ${accent}`}>
        {icon}
        <span className="section-title text-current opacity-70 truncate">{label}</span>
      </div>
      <p className={`font-mono font-semibold text-lg leading-tight ${accent}`}>{value}</p>
    </div>
  );
}

function OpRow({ icon, label, value, mono }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0">{icon}</span>
        <span className="text-xs text-[#777] truncate">{label}</span>
      </div>
      <span className={`text-xs text-[#ccc] flex-shrink-0 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function BarRow({ label, value, pct, barClass }: {
  label: string; value: string; pct: number; barClass: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-[#888] truncate pr-2">{label}</span>
        <span className="font-mono text-xs text-[#ccc] flex-shrink-0">{value}</span>
      </div>
      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-2 border rounded-sm ${color}`} />
      <span className="text-[10px] text-[#666]">{label}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-[#555] text-center py-6">{text}</p>;
}
