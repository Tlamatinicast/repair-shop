import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const parts = await prisma.repairPart.findMany({
    where: { repairId: Number(params.id) },
    include: { item: true },
  });
  return NextResponse.json(parts);
}

async function recalcRepairTotal(tx: any, repairId: number) {
  const repair = await tx.repair.findUnique({
    where: { id: repairId },
    include: {
      parts: true,
      sales: true,
    },
  });
  if (!repair) return;
  const partsTotal = repair.parts.reduce((s: number, p: any) => s + p.unitPrice * p.quantity, 0);
  const salesTotal = repair.sales.reduce((s: number, sale: any) => s + sale.total, 0);
  await tx.repair.update({
    where: { id: repairId },
    data: { totalCost: repair.laborCost + partsTotal + salesTotal },
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { itemId, quantity, unitPrice, reserved } = await req.json();
    const repairId = Number(params.id);

    const inv = await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } });
    if (!inv) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 });

    const available = inv.quantity - inv.reservedQty;
    if (available < quantity) {
      return NextResponse.json({
        error: `Stock insuficiente. Disponible: ${available} (${inv.reservedQty} reservadas)`,
      }, { status: 400 });
    }

    const part = await prisma.$transaction(async (tx) => {
      // 1. Create the part first
      const newPart = await tx.repairPart.create({
        data: { repairId, itemId: Number(itemId), quantity, unitPrice, reserved: !!reserved },
        include: { item: true },
      });

      // 2. Update inventory
      if (reserved) {
        await tx.inventoryItem.update({
          where: { id: Number(itemId) },
          data: { reservedQty: { increment: quantity } },
        });
      } else {
        await tx.inventoryItem.update({
          where: { id: Number(itemId) },
          data: { quantity: { decrement: quantity } },
        });
      }

      // 3. Recalc total AFTER part is created (so it's included)
      await recalcRepairTotal(tx, repairId);

      return newPart;
    });

    return NextResponse.json(part, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al agregar la pieza' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { partId } = await req.json();
    const repairId = Number(params.id);

    const part = await prisma.repairPart.findUnique({
      where: { id: Number(partId) },
    });
    if (!part) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // 1. Delete part first
      await tx.repairPart.delete({ where: { id: Number(partId) } });

      // 2. Restore stock or reservation
      if (part.reserved) {
        await tx.inventoryItem.update({
          where: { id: part.itemId },
          data: { reservedQty: { decrement: part.quantity } },
        });
      } else {
        await tx.inventoryItem.update({
          where: { id: part.itemId },
          data: { quantity: { increment: part.quantity } },
        });
      }

      // 3. Recalc total AFTER part is deleted (so it's excluded)
      await recalcRepairTotal(tx, repairId);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al eliminar la pieza' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { partId } = await req.json();
    const repairId = Number(params.id);

    const part = await prisma.repairPart.findUnique({ where: { id: Number(partId) } });
    if (!part || !part.reserved) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.repairPart.update({ where: { id: Number(partId) }, data: { reserved: false } });
      await tx.inventoryItem.update({
        where: { id: part.itemId },
        data: {
          reservedQty: { decrement: part.quantity },
          quantity:    { decrement: part.quantity },
        },
      });
      await recalcRepairTotal(tx, repairId);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error al confirmar la pieza' }, { status: 500 });
  }
}
