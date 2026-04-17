import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const sale = await prisma.sale.findUnique({
    where: { id: Number(params.id) },
    include: { customer: true, items: { include: { item: true } }, payments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!sale) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(sale);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo el administrador puede cancelar ventas' }, { status: 403 });
  }

  // Restore stock
  const sale = await prisma.sale.findUnique({
    where: { id: Number(params.id) },
    include: { items: true },
  });
  if (!sale) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      await tx.inventoryItem.update({
        where: { id: item.itemId },
        data: { quantity: { increment: item.quantity } },
      });
    }
    await tx.sale.delete({ where: { id: Number(params.id) } });
  });

  return NextResponse.json({ ok: true });
}
