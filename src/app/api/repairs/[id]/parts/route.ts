import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  const parts = await prisma.repairPart.findMany({
    where: { repairId: Number(params.id) },
    include: { item: true },
  });
  return NextResponse.json(parts);
}

async function recalcRepairTotal(tx: any, repairId: number) {
  const repair = await tx.repair.findUnique({
    where: { id: repairId },
    include: { parts: true },
  });
  if (!repair) return;
  const partsTotal = repair.parts.reduce((s: number, p: any) => s + p.unitPrice * p.quantity, 0);
  await tx.repair.update({
    where: { id: repairId },
    data: { totalCost: repair.diagnosisFee + partsTotal },
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const { itemId, quantity, unitPrice, reserved, isService, serviceName } = await req.json();
    const repairId = Number(params.id);

    // ── Línea de servicio (mano de obra, sin inventario) ──────────────────
    if (isService) {
      if (!serviceName?.trim()) {
        return NextResponse.json({ error: 'El servicio necesita una descripción' }, { status: 400 });
      }
      const part = await prisma.$transaction(async (tx) => {
        const newPart = await tx.repairPart.create({
          data: { repairId, isService: true, serviceName: serviceName.trim(), quantity: 1, unitPrice: parseFloat(unitPrice) || 0, reserved: false },
          include: { item: true },
        });
        await recalcRepairTotal(tx, repairId);
        return newPart;
      });
      return NextResponse.json(part, { status: 201 });
    }

    // ── Pieza de inventario ────────────────────────────────────────────────
    const inv = await prisma.inventoryItem.findUnique({ where: { id: Number(itemId) } });
    if (!inv) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 });

    const available = inv.quantity - inv.reservedQty;
    if (available < quantity) {
      return NextResponse.json({
        error: `Stock insuficiente. Disponible: ${available} (${inv.reservedQty} reservadas)`,
      }, { status: 400 });
    }

    const part = await prisma.$transaction(async (tx) => {
      const newPart = await tx.repairPart.create({
        data: { repairId, itemId: Number(itemId), quantity, unitPrice, reserved: !!reserved },
        include: { item: true },
      });

      if (reserved) {
        await tx.inventoryItem.update({ where: { id: Number(itemId) }, data: { reservedQty: { increment: quantity } } });
      } else {
        await tx.inventoryItem.update({ where: { id: Number(itemId) }, data: { quantity: { decrement: quantity } } });
      }

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
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const { partId } = await req.json();
    const repairId = Number(params.id);

    const part = await prisma.repairPart.findUnique({
      where: { id: Number(partId) },
    });
    if (!part) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.repairPart.delete({ where: { id: Number(partId) } });

      // Solo restaurar stock en piezas de inventario
      if (!part.isService && part.itemId) {
        if (part.reserved) {
          await tx.inventoryItem.update({ where: { id: part.itemId }, data: { reservedQty: { decrement: part.quantity } } });
        } else {
          await tx.inventoryItem.update({ where: { id: part.itemId }, data: { quantity: { increment: part.quantity } } });
        }
      }

      await recalcRepairTotal(tx, repairId);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al eliminar la pieza' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const { partId } = await req.json();
    const repairId = Number(params.id);

    const part = await prisma.repairPart.findUnique({ where: { id: Number(partId) } });
    if (!part || !part.reserved || part.isService) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.repairPart.update({ where: { id: Number(partId) }, data: { reserved: false } });
      await tx.inventoryItem.update({
        where: { id: part.itemId! },
        data: { reservedQty: { decrement: part.quantity }, quantity: { decrement: part.quantity } },
      });
      await recalcRepairTotal(tx, repairId);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error al confirmar la pieza' }, { status: 500 });
  }
}
