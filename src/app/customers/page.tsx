import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { MobileHeader } from '@/components/MobileHeader';
import { Plus, Phone, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const { q } = searchParams;

  const customers = await prisma.customer.findMany({
    where: q ? {
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ],
    } : {},
    include: { _count: { select: { repairs: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-5xl mx-auto animate-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-title mb-0.5">Gestión</p>
            <h1 className="page-title">Clientes</h1>
          </div>
          <Link href="/customers/new" className="btn-primary">
            <Plus size={15} />
            <span className="hidden sm:inline">Nuevo cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </div>

        <form className="mb-5">
          <input name="q" defaultValue={q} placeholder="Buscar por nombre, teléfono o correo..." className="input" />
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`} className="card-hover p-4 block">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 font-semibold text-sm flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-mono text-xs text-[#555] bg-[#161616] px-2 py-1 rounded-md">
                  {c._count.repairs} {c._count.repairs === 1 ? 'orden' : 'órdenes'}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-[#ddd] mb-2">{c.name}</h2>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-[#666]">
                  <Phone size={11} /> <span className="font-mono">{c.phone}</span>
                </div>
                {c.email && (
                  <div className="flex items-center gap-2 text-xs text-[#666]">
                    <Mail size={11} /> <span className="truncate">{c.email}</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[#444] font-mono mt-3">Desde {formatDate(c.createdAt)}</p>
            </Link>
          ))}
        </div>

        {customers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#555] text-sm mb-4">No se encontraron clientes.</p>
            <Link href="/customers/new" className="btn-primary inline-flex">
              <Plus size={14} /> Agregar cliente
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
