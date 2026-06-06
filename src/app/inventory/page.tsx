import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { InventoryCategorySelect } from '@/components/InventoryCategorySelect';
import { getSession } from '@/lib/auth';
import { Plus, AlertTriangle, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const { q, category } = searchParams;
  const session = await getSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const items = await prisma.inventoryItem.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(q ? {
        OR: [
          { name:        { contains: q, mode: 'insensitive' } },
          { sku:         { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { name: 'asc' },
  });

  const lowStockCount = items.filter(i => i.quantity <= i.minQuantity).length;

  const exportParams = new URLSearchParams();
  if (q) exportParams.set('q', q);
  if (category) exportParams.set('category', category);
  const exportHref = `/api/inventory/export${exportParams.toString() ? `?${exportParams}` : ''}`;

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-5xl mx-auto animate-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-title mb-0.5">Almacén</p>
            <h1 className="page-title">Inventario</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <a href={exportHref} className="btn-secondary" title="Exportar vista actual a Excel (respeta filtros)">
                <Download size={14} />
                <span className="hidden sm:inline">Exportar vista</span>
              </a>
            )}
            <Link href="/inventory/new" className="btn-primary">
              <Plus size={15} />
              <span className="hidden sm:inline">Agregar pieza</span>
              <span className="sm:hidden">Agregar</span>
            </Link>
          </div>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4 text-sm text-amber-400">
            <AlertTriangle size={14} />
            {lowStockCount} {lowStockCount === 1 ? 'artículo tiene' : 'artículos tienen'} stock bajo.
          </div>
        )}

        <form className="flex flex-col md:flex-row gap-2 mb-5">
          <input name="q" defaultValue={q} placeholder="Buscar por nombre, SKU o descripción..." className="input md:flex-1" />
          <div className="md:w-64">
            <InventoryCategorySelect defaultValue={category} />
          </div>
        </form>

        {/* Desktop table */}
        <div className="card overflow-hidden hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {['SKU', 'Nombre', 'Categoría', 'Stock', 'P. Costo', 'P. Venta', 'Ubicación', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 section-title text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {items.map((item) => {
                const isLow = item.quantity <= item.minQuantity;
                return (
                  <tr key={item.id} className="hover:bg-[#131313] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#666]">{item.sku}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#ddd] font-medium">{item.name}</p>
                      {item.description && <p className="text-xs text-[#555] truncate max-w-48">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#888] bg-[#1a1a1a] border border-[#252525] px-2 py-0.5 rounded-md font-mono">{item.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isLow && <AlertTriangle size={11} className="text-amber-500" />}
                        <span className={`font-mono text-sm font-medium ${isLow ? 'text-amber-400' : 'text-[#ccc]'}`}>{item.quantity}</span>
                        <span className="text-xs text-[#555]">/ mín. {item.minQuantity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-[#888]">{formatCurrency(item.costPrice)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-green-400">{formatCurrency(item.salePrice)}</td>
                    <td className="px-4 py-3 text-xs text-[#555]">{item.location ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${item.id}/edit`} className="text-xs text-[#555] hover:text-amber-400 font-mono transition-colors">editar</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 && <EmptyState />}
          {items.length > 0 && (
            <div className="px-4 py-3 border-t border-[#1a1a1a]">
              <p className="text-xs text-[#555] font-mono">{items.length} artículo{items.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {items.map((item) => {
            const isLow = item.quantity <= item.minQuantity;
            return (
              <Link key={item.id} href={`/inventory/${item.id}/edit`} className="card-hover p-4 block">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-[#ddd] truncate">{item.name}</p>
                    <p className="text-xs text-[#555] font-mono mt-0.5">{item.sku}</p>
                  </div>
                  <span className="text-xs text-[#888] bg-[#1a1a1a] border border-[#252525] px-2 py-0.5 rounded-md font-mono flex-shrink-0">{item.category}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a1a]">
                  <div className="flex items-center gap-1.5">
                    {isLow && <AlertTriangle size={11} className="text-amber-500" />}
                    <span className={`font-mono text-sm font-medium ${isLow ? 'text-amber-400' : 'text-[#ccc]'}`}>{item.quantity}</span>
                    <span className="text-xs text-[#555]">en stock</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-green-400">{formatCurrency(item.salePrice)}</p>
                    <p className="text-[10px] text-[#555]">costo: {formatCurrency(item.costPrice)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
          {items.length === 0 && <EmptyState />}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="text-[#555] text-sm mb-4">No hay artículos.</p>
      <Link href="/inventory/new" className="btn-primary inline-flex"><Plus size={14} /> Agregar pieza</Link>
    </div>
  );
}
