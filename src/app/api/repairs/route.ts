import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const repairs = await prisma.repair.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(repairs);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName, customerPhone, customerEmail, customerAddress,
      deviceType, deviceBrand, deviceModel, serialNumber, password,
      issue, notes, status, laborCost,
    } = body;

    if (!customerName || !customerPhone || !deviceType || !deviceBrand || !deviceModel || !issue) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { phone: customerPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail || null,
          address: customerAddress || null,
        },
      });
    }

    // Create repair first, then assign ticketNumber based on actual DB id
    // (avoids collisions when orders have been deleted)
    const repair = await prisma.$transaction(async (tx) => {
      const newRepair = await tx.repair.create({
        data: {
          ticketNumber: `TK-TEMP-${Date.now()}`,
          customerId: customer.id,
          deviceType,
          deviceBrand,
          deviceModel,
          serialNumber: serialNumber || null,
          password: password || null,
          issue,
          notes: notes || null,
          status: status || 'RECEIVED',
          laborCost: parseFloat(laborCost as string) || 0,
          totalCost: parseFloat(laborCost as string) || 0,
        },
      });
      return tx.repair.update({
        where: { id: newRepair.id },
        data: { ticketNumber: `TK-${String(newRepair.id).padStart(4, '0')}` },
      });
    });

    return NextResponse.json(repair, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
