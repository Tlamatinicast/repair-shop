import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { REPAIR_STATUSES, formatCurrency, formatDate, type RepairStatus } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MobileHeader } from '@/components/MobileHeader';
import { Plus, TrendingUp, Clock, CheckCircle, DollarSign, ArrowRight } from 'lucide-react';
import { QrScannerButton } from '@/components/QrScannerButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [
    totalRepairs,
    activeRepairs,
    readyRepairs,
    recentRepairs,
    lowStock,
  ] = await Promise.all([
    prisma.repair.count(),
    prisma.repair.count({ where: { status: { in: ['RECEIVED', 'DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR'] } } }),
    prisma.repair.count({ where: { status: 'READY' } }),
    prisma.repair.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    }),
    prisma.inventoryItem.findMany({
      where: { quantity: { lte: prisma.inventoryItem.fields.minQuantity } },
      take: 3,
    }).catch(() => []),
  ]);

  const revenue = await prisma.repair.aggregate({
    _sum: { totalCost: true },
    where: { status: 'DELIVERED' },
  });

  const statusCounts = await prisma.repair.groupBy({
    by: ['status'],
    _count: true,
  });

  const statusMap: Record<string, number> = {};
  statusCounts.forEach(s => { statusMap[s.status] = s._count; });

  return (
    <div className="min-h-screen">
    <MobileHeader />
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-title mb-1">Panel de control</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <QrScannerButton />
          <Link href="/repairs/new" className="btn-primary">
            <Plus size={15} />
            Nueva orden
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Reparaciones activas"
          value={activeRepairs}
          icon={<Clock size={16} />}
          accent="text-blue-400"
          bg="bg-blue-400/5 border-blue-400/10"
        />
        <StatCard
          label="Listas para entregar"
          value={readyRepairs}
          icon={<CheckCircle size={16} />}
          accent="text-green-400"
          bg="bg-green-400/5 border-green-400/10"
        />
        <StatCard
          label="Total órdenes"
          value={totalRepairs}
          icon={<TrendingUp size={16} />}
          accent="text-amber-400"
          bg="bg-amber-400/5 border-amber-400/10"
        />
        <StatCard
          label="Ingresos totales"
          value={formatCurrency(revenue._sum.totalCost ?? 0)}
          icon={<DollarSign size={16} />}
          accent="text-violet-400"
          bg="bg-violet-400/5 border-violet-400/10"
          small
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent repairs */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#ccc]">Órdenes recientes</h2>
            <Link href="/repairs" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentRepairs.map((r) => (
              <Link
                key={r.id}
                href={`/repairs/${r.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#161616] transition-colors group"
              >
                <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xs font-mono text-[#666] flex-shrink-0">
                  {r.deviceType.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#ddd] truncate">
                    {r.deviceBrand} {r.deviceModel}
                  </p>
                  <p className="text-xs text-[#666] truncate">{r.customer.name} · {formatDate(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={r.status} />
                  <span className="font-mono text-xs text-[#444] group-hover:text-[#666]">{r.ticketNumber}</span>
                </div>
              </Link>
            ))}
            {recentRepairs.length === 0 && (
              <p className="text-sm text-[#555] text-center py-8">No hay órdenes todavía.</p>
            )}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[#ccc] mb-4">Estado del taller</h2>
            <div className="space-y-2.5">
              {Object.entries(REPAIR_STATUSES).map(([key, { label, color }]) => {
                const count = statusMap[key] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className={`badge ${color}`}>{label}</span>
                    <span className="font-mono text-sm text-[#888]">{count}</span>
                  </div>
                );
              })}
              {Object.values(statusMap).every(v => v === 0) && (
                <p className="text-xs text-[#555]">Sin datos</p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#ccc]">Acciones rápidas</h2>
            </div>
            <div className="space-y-2">
              <Link href="/repairs/new" className="btn-secondary w-full justify-start">
                <Plus size={14} /> Nueva reparación
              </Link>
              <Link href="/customers" className="btn-secondary w-full justify-start">
                <Plus size={14} /> Nuevo cliente
              </Link>
              <Link href="/inventory" className="btn-secondary w-full justify-start">
                <Plus size={14} /> Agregar al inventario
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function StatCard({
  label, value, icon, accent, bg, small = false,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  accent: string; bg: string; small?: boolean;
}) {
  return (
    <div className={`card border p-4 ${bg}`}>
      <div className={`flex items-center gap-2 mb-3 ${accent}`}>
        {icon}
        <span className="section-title text-current opacity-70">{label}</span>
      </div>
      <p className={`font-mono font-semibold ${accent} ${small ? 'text-xl' : 'text-3xl'}`}>
        {value}
      </p>
    </div>
  );
}
