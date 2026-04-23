import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MobileHeader } from '@/components/MobileHeader';
import { formatCurrency } from '@/lib/utils';
import {
  rangeForPreset, parseDateOrNull, formatDateMx, formatDateTimeMx, isoDateMx,
  buildSummary, PAYMENT_METHOD_LABEL, PAYMENT_METHODS_ORDER,
  type Preset, type CashTransaction,
} from '@/lib/cashClose';
import { CashCloseFilters } from './CashCloseFilters';
import { CashCountHelper } from './CashCountHelper';
import { Download, ShoppingCart, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

const VALID_PRESETS: Preset[] = ['today', 'yesterday', 'this-week', 'this-month'];

export default async function CashClosePage({
  searchParams,
}: {
  searchParams: { preset?: string; from?: string; to?: string };
}) {
  await requireAdmin();

  const customFrom = parseDateOrNull(searchParams.from);
  const customTo = parseDateOrNull(searchParams.to);
  const preset = (VALID_PRESETS as string[]).includes(searchParams.preset ?? '')
    ? (searchParams.preset as Preset)
    : (customFrom && customTo ? null : 'today');

  let from: Date, to: Date;
  if (preset) {
    ({ from, to } = rangeForPreset(preset));
  } else {
    from = customFrom!;
    to = customTo!;
  }

  const [salePayments, repairPayments] = await Promise.all([
    prisma.salePayment.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: { sale: { include: { customer: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.repairPayment.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: { repair: { include: { customer: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const txns: CashTransaction[] = [
    ...salePayments.map(p => ({
      id: `sale-${p.saleId}-pay-${p.id}`,
      source: 'SALE' as const,
      refNumber: p.sale.saleNumber,
      refId: p.saleId,
      customerName: p.sale.customer?.name ?? null,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
    ...repairPayments.map(p => ({
      id: `repair-${p.repairId}-pay-${p.id}`,
      source: 'REPAIR' as const,
      refNumber: p.repair.ticketNumber,
      refId: p.repairId,
      customerName: p.repair.customer?.name ?? null,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const summary = buildSummary(txns);

  const exportParams = new URLSearchParams();
  if (preset) exportParams.set('preset', preset);
  else { exportParams.set('from', isoDateMx(from)); exportParams.set('to', isoDateMx(new Date(to.getTime() - 1))); }
  const exportHref = `/api/cash-close/export?${exportParams.toString()}`;

  const periodLabel =
    preset === 'today'      ? `Hoy · ${formatDateMx(from)}` :
    preset === 'yesterday'  ? `Ayer · ${formatDateMx(from)}` :
    preset === 'this-week'  ? `Esta semana · ${formatDateMx(from)} – ${formatDateMx(new Date(to.getTime() - 1))}` :
    preset === 'this-month' ? `Este mes · ${formatDateMx(from)} – ${formatDateMx(new Date(to.getTime() - 1))}` :
                              `${formatDateMx(from)} – ${formatDateMx(new Date(to.getTime() - 1))}`;

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-5xl mx-auto animate-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-title mb-0.5">Finanzas</p>
            <h1 className="page-title">Corte de caja</h1>
          </div>
          <a href={exportHref} className="btn-secondary" title="Exportar el periodo a Excel">
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </a>
        </div>

        <CashCloseFilters
          activePreset={preset ?? null}
          activeFrom={preset ? null : isoDateMx(from)}
          activeTo={preset ? null : isoDateMx(new Date(to.getTime() - 1))}
        />

        <p className="text-xs text-[#666] font-mono mb-5">{periodLabel}</p>

        {/* Cards superiores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat label="Total recaudado" value={formatCurrency(summary.totalRevenue)} highlight />
          <Stat label={`Ventas POS (${summary.countSales})`} value={formatCurrency(summary.totalSales)} icon={<ShoppingCart size={11} />} />
          <Stat label={`Cobros reparaciones (${summary.countRepairs})`} value={formatCurrency(summary.totalRepairs)} icon={<Wrench size={11} />} />
          <Stat label="Transacciones" value={String(txns.length)} />
        </div>

        {/* Desglose por método */}
        <div className="card p-5 mb-5">
          <p className="section-title mb-4">Desglose por método de pago</p>
          <div className="space-y-2">
            {PAYMENT_METHODS_ORDER.map(m => {
              const amt = summary.byMethod[m] ?? 0;
              const pct = summary.totalRevenue > 0 ? Math.round((amt / summary.totalRevenue) * 100) : 0;
              if (amt === 0 && m !== 'CASH') return null;
              return (
                <div key={m}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#ccc]">{PAYMENT_METHOD_LABEL[m]}</span>
                    <span className="font-mono text-[#888]">{formatCurrency(amt)} <span className="text-[#555]">· {pct}%</span></span>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conciliación de efectivo */}
        <CashCountHelper expectedCash={summary.byMethod['CASH'] ?? 0} />

        {/* Lista de transacciones */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a]">
            <p className="section-title mb-0">Movimientos del periodo</p>
          </div>
          {txns.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#555]">Sin transacciones en el periodo seleccionado.</div>
          ) : (
            <ul className="divide-y divide-[#141414]">
              {txns.map(t => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#0f0f0f] transition-colors">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                    t.source === 'SALE' ? 'bg-blue-400/10 text-blue-400' : 'bg-violet-400/10 text-violet-400'
                  }`}>
                    {t.source === 'SALE' ? <ShoppingCart size={11} /> : <Wrench size={11} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-[#ddd] truncate">{t.customerName ?? 'Sin cliente'}</span>
                      <span className="text-[10px] font-mono text-[#666]">{t.refNumber}</span>
                    </div>
                    <p className="text-[10px] text-[#555] font-mono">
                      {formatDateTimeMx(t.createdAt)} · {PAYMENT_METHOD_LABEL[t.paymentMethod] ?? t.paymentMethod}
                      {t.notes && ` · ${t.notes}`}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-green-400 flex-shrink-0">{formatCurrency(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`card p-3 ${highlight ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
      <div className="flex items-center gap-1.5 text-[#666] mb-1">
        {icon}
        <span className="section-title text-current opacity-90">{label}</span>
      </div>
      <p className={`font-mono font-semibold text-lg ${highlight ? 'text-amber-400' : 'text-[#ddd]'}`}>{value}</p>
    </div>
  );
}
