import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VALID_METHODS = new Set(['CASH', 'CARD', 'TRANSFER', 'OTHER']);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;

  try {
    const { amount, paymentMethod, notes } = await req.json();
    const repairId = Number(params.id);

    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a cero' }, { status: 400 });
    }

    const method = VALID_METHODS.has(paymentMethod) ? paymentMethod : 'CASH';

    const repair = await prisma.repair.findUnique({ where: { id: repairId } });
    if (!repair) return NextResponse.json({ error: 'Reparación no encontrada' }, { status: 404 });

    const remaining = repair.totalCost - repair.advancePayment;
    if (repair.totalCost > 0 && remaining <= 0) {
      return NextResponse.json({ error: 'Esta reparación ya está liquidada' }, { status: 400 });
    }

    const applied = repair.totalCost > 0 ? Math.min(amt, remaining) : amt;
    const newPaid = repair.advancePayment + applied;
    const newStatus =
      repair.totalCost > 0 && newPaid >= repair.totalCost ? 'PAID'
      : newPaid > 0 ? 'PARTIAL'
      : 'PENDING';

    await prisma.$transaction(async (tx) => {
      await tx.repairPayment.create({
        data: { repairId, amount: applied, paymentMethod: method, notes: notes || null },
      });
      await tx.repair.update({
        where: { id: repairId },
        data: { advancePayment: newPaid, paymentStatus: newStatus },
      });
    });

    const updated = await prisma.repair.findUnique({
      where: { id: repairId },
      include: { payments: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar el pago' }, { status: 500 });
  }
}
