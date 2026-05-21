import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MobileHeader } from '@/components/MobileHeader';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { TemplateActions } from './TemplateActions';
import { NewTemplateForm } from './NewTemplateForm';

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

export default async function ExpenseTemplatesPage() {
  await requireAdmin();

  const templates = await prisma.expenseTemplate.findMany({
    orderBy: [{ active: 'desc' }, { description: 'asc' }],
    include: { _count: { select: { expenses: true } } },
  });

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-3xl mx-auto animate-in">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/expenses" className="btn-ghost"><ArrowLeft size={15} /></Link>
          <div>
            <p className="section-title mb-0.5">Control de gastos</p>
            <h1 className="page-title">Plantillas de gastos</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Template list */}
          <div className="lg:col-span-3 card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] mb-4">
              Plantillas — {templates.length}
            </h2>
            {templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${t.active ? 'bg-[#0f0f0f] border-[#1a1a1a]' : 'bg-[#0a0a0a] border-[#141414] opacity-50'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#ddd] truncate">{t.description}</p>
                      <p className="text-xs text-[#666]">
                        {CATEGORY_LABELS[t.category] ?? t.category}
                        {t.defaultAmount > 0 && ` · $${t.defaultAmount.toFixed(2)}`}
                        {` · ${t._count.expenses} uso${t._count.expenses !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${t.expenseType === 'FIXED' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {t.expenseType === 'FIXED' ? 'Fijo' : 'Variable'}
                      </span>
                      <TemplateActions templateId={t.id} active={t.active} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#555] text-center py-10">
                Sin plantillas todavía. Crea una para agilizar el registro de gastos recurrentes.
              </p>
            )}
          </div>

          {/* New template form */}
          <div className="lg:col-span-2">
            <NewTemplateForm />
          </div>
        </div>
      </div>
    </div>
  );
}
