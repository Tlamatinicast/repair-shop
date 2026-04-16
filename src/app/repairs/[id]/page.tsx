import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate, REPAIR_STATUSES, type RepairStatus } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MobileHeader } from '@/components/MobileHeader';
import { ArrowLeft, User, Smartphone, Clock } from 'lucide-react';
import { UpdateStatusForm } from './UpdateStatusForm';
import { TicketButtons } from './TicketButtons';
import { RepairTimeline } from './RepairTimeline';
import { RepairWorkspace } from './RepairWorkspace';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function RepairDetailPage({ params }: { params: { id: string } }) {
  const [repair, session] = await Promise.all([
    prisma.repair.findUnique({
      where: { id: Number(params.id) },
      include: {
        customer: true,
        parts: { include: { item: true } },
        repairNotes: { orderBy: { createdAt: 'desc' } },
        sales: { include: { items: true }, orderBy: { createdAt: 'desc' } },
      },
    }),
    getSession(),
  ]);

  if (!repair) notFound();

  return (
    <div className="min-h-screen">
      <MobileHeader />
      <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/repairs" className="btn-ghost"><ArrowLeft size={15} /></Link>
          <div className="flex-1">
            <p className="section-title mb-0.5">Orden de trabajo</p>
            <div className="flex items-center gap-3">
              <h1 className="page-title font-mono">{repair.ticketNumber}</h1>
              <StatusBadge status={repair.status} />
            </div>
          </div>
          {repair.status !== 'DELIVERED' && repair.status !== 'CANCELLED' && (
            <Link href={`/repairs/${repair.id}/edit`} className="btn-secondary">
              Editar
            </Link>
          )}
          {(repair.status === 'DELIVERED' || repair.status === 'CANCELLED') && (
            <span className="btn-secondary opacity-40 cursor-not-allowed select-none" title="No se puede editar una orden terminada o cancelada">
              🔒 Bloqueado
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Device */}
            <div className="card p-5">
              <SectionHeader icon={<Smartphone size={14} />} title="Dispositivo" />
              <dl className="grid grid-cols-2 gap-3 mt-4">
                <Info label="Tipo"   value={repair.deviceType} />
                <Info label="Marca"  value={repair.deviceBrand} />
                <Info label="Modelo" value={repair.deviceModel} />
                {repair.serialNumber && <Info label="Serie"      value={repair.serialNumber} mono />}
                {repair.password     && <Info label="Contraseña" value={repair.password}     mono />}
              </dl>
            </div>

            {/* Issue & diagnosis */}
            <div className="card p-5">
              <SectionHeader icon={<Clock size={14} />} title="Diagnóstico y problema" />
              <div className="mt-4 space-y-4">
                <div>
                  <p className="label">Problema reportado</p>
                  <p className="text-sm text-[#ccc] leading-relaxed">{repair.issue}</p>
                </div>
                {repair.diagnosis && (
                  <div>
                    <p className="label">Diagnóstico técnico</p>
                    <p className="text-sm text-[#ccc] leading-relaxed">{repair.diagnosis}</p>
                  </div>
                )}
                {repair.notes && (
                  <div>
                    <p className="label">Notas internas</p>
                    <p className="text-sm text-[#888] leading-relaxed">{repair.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity timeline */}
            <div className="card p-5">
              <SectionHeader icon={<Clock size={14} />} title="Historial de actividad" />
              <div className="mt-4">
                <RepairTimeline
                  repairId={repair.id}
                  userRole={(session?.user as any)?.role ?? 'TECHNICIAN'}
                  initialNotes={repair.repairNotes.map(n => ({ ...n, createdAt: n.createdAt.toISOString() }))}
                />
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">

            {/* Customer */}
            <div className="card p-5">
              <SectionHeader icon={<User size={14} />} title="Cliente" />
              <div className="mt-4 space-y-2">
                <Link href={`/customers/${repair.customerId}`} className="text-sm font-medium text-amber-500 hover:text-amber-400">
                  {repair.customer.name}
                </Link>
                <p className="text-sm text-[#888] font-mono">{repair.customer.phone}</p>
                {repair.customer.email   && <p className="text-xs text-[#666]">{repair.customer.email}</p>}
                {repair.customer.address && <p className="text-xs text-[#666]">{repair.customer.address}</p>}
              </div>
            </div>

            {/* Workspace: parts + summary + payment + sales — all in one */}
            <RepairWorkspace
              repairId={repair.id}
              laborCost={repair.laborCost}
              customerId={repair.customerId}
              initialParts={repair.parts.map(p => ({
                id: p.id, itemId: p.itemId, quantity: p.quantity,
                unitPrice: p.unitPrice, reserved: p.reserved,
                item: { name: p.item.name, sku: p.item.sku },
              }))}
              initialSales={repair.sales.map(s => ({
                id: s.id, saleNumber: s.saleNumber, total: s.total,
                paymentMethod: s.paymentMethod, createdAt: s.createdAt.toISOString(),
                items: s.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
              }))}
              initialAdvance={repair.advancePayment}
              initialPaymentStatus={repair.paymentStatus}
            />

            {/* Tickets */}
            <div className="card p-5">
              <p className="section-title mb-4">Imprimir tickets</p>
              <TicketButtons repair={{
                ...repair,
                createdAt: repair.createdAt.toISOString(),
                customer: {
                  name: repair.customer.name,
                  phone: repair.customer.phone,
                  email: repair.customer.email,
                  address: repair.customer.address,
                },
              }} />
            </div>

            {/* Status */}
            <div className="card p-5">
              <p className="section-title mb-4">Cambiar estado</p>
              <UpdateStatusForm
                repairId={repair.id}
                currentStatus={repair.status as RepairStatus}
                paymentStatus={repair.paymentStatus}
              />
            </div>

            {/* History */}
            <div className="card p-5">
              <p className="section-title mb-4">Historial</p>
              <div className="space-y-2 text-xs text-[#666] font-mono">
                <p>Recibido: {formatDate(repair.createdAt)}</p>
                <p>Actualizado: {formatDate(repair.updatedAt)}</p>
                {repair.deliveredAt && <p className="text-green-500">Entregado: {formatDate(repair.deliveredAt)}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a1a]">
      <span className="text-amber-500">{icon}</span>
      <h2 className="text-sm font-semibold text-[#ccc]">{title}</h2>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className={`text-sm text-[#ccc] ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
