import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, Package, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const [
    revenue,
    totalCustomers,
    totalItems,
    topDevices,
  ] = await Promise.all([
    prisma.repair.aggregate({ _sum: { totalCost: true }, where: { status: 'DELIVERED' } }),
    prisma.customer.count(),
    prisma.inventoryItem.count(),
    prisma.repair.groupBy({ by: ['deviceType'], _count: true, orderBy: { _count: { deviceType: 'desc' } }, take: 5 }),
  ]);

  const avgRepair = await prisma.repair.aggregate({ _avg: { totalCost: true }, where: { status: 'DELIVERED', totalCost: { gt: 0 } } });

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in">
      <div className="mb-8">
        <p className="section-title mb-1">Análisis</p>
        <h1 className="page-title">Reportes</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <ReportStat icon={<TrendingUp size={14} />} label="Ingresos totales" value={formatCurrency(revenue._sum.totalCost ?? 0)} color="text-green-400" />
        <ReportStat icon={<BarChart3 size={14} />} label="Ticket promedio" value={formatCurrency(avgRepair._avg.totalCost ?? 0)} color="text-blue-400" />
        <ReportStat icon={<Users size={14} />} label="Total clientes" value={String(totalCustomers)} color="text-amber-400" />
        <ReportStat icon={<Package size={14} />} label="Artículos en inventario" value={String(totalItems)} color="text-violet-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[#ccc] mb-4">Dispositivos más reparados</h2>
          <div className="space-y-3">
            {topDevices.map(({ deviceType, _count }) => {
              const max = topDevices[0]._count.deviceType;
              const pct = Math.round((_count.deviceType / max) * 100);
              return (
                <div key={deviceType}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#ccc]">{deviceType}</span>
                    <span className="font-mono text-[#666]">{_count.deviceType}</span>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {topDevices.length === 0 && <p className="text-sm text-[#555]">Sin datos disponibles.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[#ccc] mb-4">Próximamente</h2>
          <div className="space-y-2 text-sm text-[#555]">
            {['Ingresos por mes', 'Reparaciones por técnico', 'Tiempos promedio de reparación', 'Piezas más usadas', 'Exportar a CSV/PDF'].map(item => (
              <div key={item} className="flex items-center gap-2 p-2 rounded-lg border border-[#1a1a1a] bg-[#0e0e0e]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#333]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`card p-4 border bg-${color.replace('text-', '')}/5 border-${color.replace('text-', '')}/10`}>
      <div className={`flex items-center gap-2 mb-2 ${color}`}>{icon}<span className="section-title text-current opacity-70">{label}</span></div>
      <p className={`font-mono font-semibold text-xl ${color}`}>{value}</p>
    </div>
  );
}
