import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; paymentId: string } }) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  try {
    const repairId = Number(params.id);
    const paymentId = Number(params.paymentId);

    const payment = await prisma.repairPayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.repairId !== repairId) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    const repair = await prisma.repair.findUnique({ where: { id: repairId } });
    if (!repair) return NextResponse.json({ error: 'Reparación no encontrada' }, { status: 404 });

    const newPaid = Math.max(0, repair.advancePayment - payment.amount);
    const newStatus =
      repair.totalCost > 0 && newPaid >= repair.totalCost ? 'PAID'
      : newPaid > 0 ? 'PARTIAL'
      : 'PENDING';

    await prisma.$transaction(async (tx) => {
      await tx.repairPayment.delete({ where: { id: paymentId } });
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
    return NextResponse.json({ error: 'Error al anular el pago' }, { status: 500 });
  }
}
