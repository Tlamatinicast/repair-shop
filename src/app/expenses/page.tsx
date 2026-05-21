import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MobileHeader } from '@/components/MobileHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Plus, TrendingDown, FileText, Wrench, Receipt } from 'lucide-react';
import { ExpenseActions } from './ExpenseActions';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  RENT:        'Renta',
  UTILITIES:   'Servicios',
  SALARY:      'Salarios',
  SUPPLIES:    'Insumos',
  TRANSPORT:   'Transporte',
  MARKETING:   'Publicidad',
  MAINTENANCE: 'Mantenimiento',
  OTHER:       'Otro',
};

const TYPE_STYLES: Record<string, string> = {
  FIXED:    'bg-blue-500/10 text-blue-400',
  VARIABLE: 'bg-amber-500/10 text-amber-400',
};

function monthParam(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const session = await requireAuth();
  const isAdmin = session.user.role === 'ADMIN';

  const monthStr = searchParams.month ?? monthParam(0);
  const [year, mon] = monthStr.split('-').map(Number);
  const from = new Date(year, mon - 1, 1);
  const to   = new Date(year, mon, 1);

  const expenses = await prisma.expense.findMany({
    where:   { date: { gte: from, lt: to } },
    include: { template: { select: { description: true } } },
    orderBy: { date: 'desc' },
  });

  const totalFixed    = expenses.filter(e => e.expenseType === 'FIXED').reduce((s, e) => s + e.amount, 0);
  const totalVariable = expenses.filter(e => e.expenseType === 'VARIABLE').reduce((s, e) => s + e.amount, 0);
  const totalAll      = totalFixed + totalVariable;

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }

  const prevMonth = new Date(year, mon - 2, 1);
  const prevStr   = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const nextMonth = new Date(year, mon, 1);
  const nextStr   = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  const nowStr    = monthParam(0);
  const isCurrentMonth = monthStr === nowStr;

  const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(from);

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-5xl mx-auto animate-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="section-title mb-0.5">Control de gastos</p>
            <h1 className="page-title capitalize">{monthLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/expenses/templates" className="btn-ghost text-xs">
                <FileText size={13} /> Plantillas
              </Link>
            )}
            <Link href="/expenses/new" className="btn-primary">
              <Plus size={14} /> Nuevo gasto
            </Link>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/expenses?month=${prevStr}`} className="btn-ghost text-xs">← Anterior</Link>
          {!isCurrentMonth && (
            <Link href={`/expenses?month=${nowStr}`} className="btn-ghost text-xs">Hoy</Link>
          )}
          <Link href={`/expenses?month=${nextStr}`} className="btn-ghost text-xs">Siguiente →</Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Total del mes"    value={totalAll}      accent="text-red-400"    bg="bg-red-400/5 border-red-400/10" />
          <SummaryCard label="Gastos fijos"     value={totalFixed}    accent="text-blue-400"   bg="bg-blue-400/5 border-blue-400/10" />
          <SummaryCard label="Gastos variables" value={totalVariable} accent="text-amber-400"  bg="bg-amber-400/5 border-amber-400/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Expense list */}
          <div className="lg:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] mb-4">
              Gastos — {expenses.length} registro{expenses.length !== 1 ? 's' : ''}
            </h2>
            {expenses.length > 0 ? (
              <div className="space-y-2">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a]">
                    <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                      <TrendingDown size={14} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#ddd] truncate">{e.description}</p>
                      <p className="text-xs text-[#666]">
                        {CATEGORY_LABELS[e.category] ?? e.category} · {formatDate(e.date)}
                        {e.notes && <span className="ml-1">· {e.notes}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${TYPE_STYLES[e.expenseType] ?? TYPE_STYLES.FIXED}`}>
                        {e.expenseType === 'FIXED' ? 'Fijo' : 'Variable'}
                      </span>
                      <span className="font-mono text-sm text-red-400 font-semibold">
                        -{formatCurrency(e.amount)}
                      </span>
                      {isAdmin && <ExpenseActions expenseId={e.id} />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt size={32} className="text-[#333] mx-auto mb-3" />
                <p className="text-sm text-[#555]">Sin gastos este mes.</p>
                <Link href="/expenses/new" className="text-xs text-amber-500 hover:text-amber-400 mt-2 inline-block">
                  Registrar primer gasto →
                </Link>
              </div>
            )}
          </div>

          {/* By category */}
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[#ccc] mb-4">Por categoría</h2>
              {Object.keys(byCategory).length > 0 ? (
                <div className="space-y-2.5">
                  {Object.entries(byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-xs text-[#888]">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <span className="font-mono text-xs text-[#ccc]">{formatCurrency(amt)}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-[#555]">Sin datos</p>
              )}
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[#ccc] mb-3">Acciones rápidas</h2>
              <div className="space-y-2">
                <Link href="/expenses/new" className="btn-secondary w-full justify-start">
                  <Plus size={14} /> Registrar gasto
                </Link>
                {isAdmin && (
                  <Link href="/expenses/templates" className="btn-secondary w-full justify-start">
                    <Wrench size={14} /> Gestionar plantillas
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent, bg }: { label: string; value: number; accent: string; bg: string }) {
  return (
    <div className={`card border p-4 ${bg}`}>
      <p className={`section-title mb-2 ${accent} opacity-70`}>{label}</p>
      <p className={`font-mono text-2xl font-semibold ${accent}`}>{formatCurrency(value)}</p>
    </div>
  );
}
