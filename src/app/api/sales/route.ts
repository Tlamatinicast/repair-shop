import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const date     = searchParams.get('date');
  const repairId = searchParams.get('repairId');

  const where = {
    ...(repairId ? { repairId: Number(repairId) } : {}),
    ...(date ? {
      createdAt: {
        gte: new Date(`${date}T00:00:00`),
        lte: new Date(`${date}T23:59:59`),
      },
    } : {}),
  };

  const sales = await prisma.sale.findMany({
    where,
    include: { customer: true, repair: true, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const { customerId, repairId, items, discount, paymentMethod, notes, initialPayment } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'La venta debe tener al menos un producto' }, { status: 400 });
    }

    const initialAmt = parseFloat(initialPayment) || 0;
    if (initialAmt <= 0) {
      return NextResponse.json({ error: 'Se requiere al menos un pago inicial' }, { status: 400 });
    }

    // Validate stock
    for (const item of items) {
      const inv = await prisma.inventoryItem.findUnique({ where: { id: item.itemId } });
      if (!inv) return NextResponse.json({ error: `Producto no encontrado: ${item.name}` }, { status: 400 });
      if (inv.quantity < item.quantity) {
        return NextResponse.json({ error: `Stock insuficiente para: ${inv.name} (disponible: ${inv.quantity})` }, { status: 400 });
      }
    }

    const subtotal    = items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0);
    const discountAmt = parseFloat(discount) || 0;
    const total       = subtotal - discountAmt;
    const amountPaid  = Math.min(initialAmt, total);
    const paymentStatus = amountPaid >= total ? 'PAID' : 'PARTIAL';

    const count      = await prisma.sale.count();
    const saleNumber = `VT-${String(count + 1).padStart(4, '0')}`;

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          customerId:    customerId ? Number(customerId) : null,
          repairId:      repairId   ? Number(repairId)   : null,
          subtotal,
          discount:      discountAmt,
          total,
          amountPaid,
          paymentStatus,
          notes:         notes || null,
          items: {
            create: items.map((i: any) => ({
              itemId:    i.itemId,
              name:      i.name,
              quantity:  i.quantity,
              unitPrice: i.unitPrice,
              subtotal:  i.unitPrice * i.quantity,
            })),
          },
          payments: {
            create: {
              amount:        amountPaid,
              paymentMethod: paymentMethod || 'CASH',
            },
          },
        },
        include: { customer: true, repair: true, items: { include: { item: true } }, payments: true },
      });

      // Discount stock
      for (const i of items) {
        await tx.inventoryItem.update({
          where: { id: i.itemId },
          data: { quantity: { decrement: i.quantity } },
        });
      }

      // Las ventas ligadas a una reparación (repairId) NO afectan su `totalCost`.
      // Cada venta es independiente: se cobra por su cuenta en el POS y tiene
      // su propio ticket. La relación queda solo para referencia/historial.

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al procesar la venta' }, { status: 500 });
  }
}
