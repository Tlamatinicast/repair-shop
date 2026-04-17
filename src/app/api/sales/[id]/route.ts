import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, apiRequireAdmin } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  const sale = await prisma.sale.findUnique({
    where: { id: Number(params.id) },
    include: { customer: true, items: { include: { item: true } }, payments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!sale) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(sale);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

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
