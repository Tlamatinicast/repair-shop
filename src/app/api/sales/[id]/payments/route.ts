import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const { amount, paymentMethod, notes } = await req.json();
    const saleId = Number(params.id);

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a cero' }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

    const remaining = sale.total - sale.amountPaid;
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Esta venta ya está liquidada' }, { status: 400 });
    }

    const applied     = Math.min(amt, remaining);
    const newPaid     = sale.amountPaid + applied;
    const newStatus   = newPaid >= sale.total ? 'PAID' : 'PARTIAL';

    await prisma.$transaction(async (tx) => {
      await tx.salePayment.create({
        data: { saleId, amount: applied, paymentMethod: paymentMethod || 'CASH', notes: notes || null },
      });
      await tx.sale.update({
        where: { id: saleId },
        data: { amountPaid: newPaid, paymentStatus: newStatus },
      });
    });

    const updated = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al registrar el pago' }, { status: 500 });
  }
}
