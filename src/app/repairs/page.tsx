import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { REPAIR_STATUSES, formatCurrency, formatDate, type RepairStatus } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MobileHeader } from '@/components/MobileHeader';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const { status, q } = searchParams;

  const repairs = await prisma.repair.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? {
        OR: [
          { ticketNumber: { contains: q } },
          { deviceBrand: { contains: q } },
          { deviceModel: { contains: q } },
          { customer: { name: { contains: q } } },
        ],
      } : {}),
    },
    include: { customer: true },
    orderBy: { id: 'desc' },
  });

  return (
    <div className="min-h-screen">
      <MobileHeader />

      <div className="p-4 md:p-6 max-w-6xl mx-auto animate-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-title mb-0.5">Gestión</p>
            <h1 className="page-title">Reparaciones</h1>
          </div>
          <Link href="/repairs/new" className="btn-primary">
            <Plus size={15} />
            <span className="hidden sm:inline">Nueva orden</span>
            <span className="sm:hidden">Nueva</span>
          </Link>
        </div>

        {/* Search */}
        <form className="mb-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar cliente, dispositivo, ticket..."
            className="input"
          />
        </form>

        {/* Status filters — horizontal scroll on mobile */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
          <FilterLink href="/repairs" active={!status} label="Todas" />
          {Object.entries(REPAIR_STATUSES).map(([key, { label }]) => (
            <FilterLink key={key} href={`/repairs?status=${key}`} active={status === key} label={label} />
          ))}
        </div>

        {/* Desktop table */}
        <div className="card overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {['Ticket', 'Cliente', 'Dispositivo', 'Problema', 'Costo', 'Estado', 'Pago', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-4 py-3 section-title text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {repairs.map((r) => (
                  <tr key={r.id} className="group hover:bg-[#131313] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/repairs/${r.id}`} className="font-mono text-xs text-amber-500 hover:text-amber-400">
                        {r.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#ccc]">{r.customer.name}</p>
                      <p className="text-xs text-[#555]">{r.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#ccc]">{r.deviceBrand} {r.deviceModel}</p>
                      <p className="text-xs text-[#555]">{r.deviceType}</p>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="text-sm text-[#999] truncate">{r.issue}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-[#ccc]">
                      {r.totalCost > 0 ? formatCurrency(r.totalCost) : <span className="text-[#444]">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3"><PaymentBadge status={r.paymentStatus} /></td>
                    <td className="px-4 py-3 text-xs text-[#666] font-mono">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {repairs.length === 0 && <EmptyState />}
          {repairs.length > 0 && (
            <div className="px-4 py-3 border-t border-[#1a1a1a]">
              <p className="text-xs text-[#555] font-mono">{repairs.length} orden{repairs.length !== 1 ? 'es' : ''}</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {repairs.map((r) => (
            <Link key={r.id} href={`/repairs/${r.id}`} className="card-hover p-4 block">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-mono text-xs text-amber-500">{r.ticketNumber}</span>
                  <p className="text-sm font-medium text-[#ddd] mt-0.5">{r.deviceBrand} {r.deviceModel}</p>
                  <p className="text-xs text-[#666]">{r.deviceType}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={r.status} />
                  <PaymentBadge status={r.paymentStatus} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a1a]">
                <div>
                  <p className="text-xs font-medium text-[#ccc]">{r.customer.name}</p>
                  <p className="text-xs text-[#555] font-mono">{r.customer.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-medium text-amber-400">
                    {r.totalCost > 0 ? formatCurrency(r.totalCost) : '—'}
                  </p>
                  <p className="text-[10px] text-[#555] font-mono">{formatDate(r.createdAt)}</p>
                </div>
              </div>
            </Link>
          ))}
          {repairs.length === 0 && <EmptyState />}
        </div>
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PAID:    { label: 'Liquidado', cls: 'text-green-400 bg-green-400/10 border-green-400/20' },
    PARTIAL: { label: 'Anticipo',  cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    PENDING: { label: 'Pendiente', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  };
  const { label, cls } = map[status] ?? map.PENDING;
  return <span className={`badge ${cls}`}>{label}</span>;
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-xs transition-all font-mono whitespace-nowrap flex-shrink-0 ${
        active
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          : 'text-[#666] hover:text-[#aaa] border border-[#1e1e1e] hover:border-[#2a2a2a]'
      }`}
    >
      {label}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="text-[#555] text-sm mb-4">No se encontraron órdenes.</p>
      <Link href="/repairs/new" className="btn-primary inline-flex">
        <Plus size={14} /> Crear primera orden
      </Link>
    </div>
  );
}
