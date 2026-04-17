import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export async function GET() {
  const { error } = await apiRequireAuth();
  if (error) return error;
  const repairs = await prisma.repair.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(repairs);
}

export async function POST(req: NextRequest) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const {
      customerId, customerName, customerPhone, customerEmail, customerAddress,
      deviceType, deviceBrand, deviceModel, serialNumber, password,
      issue, notes, status, laborCost, queueDate, dueDate, isDefinedService,
    } = body;

    if (!deviceType || !deviceBrand || !deviceModel || !issue) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    if (!queueDate) {
      return NextResponse.json({ error: 'La fecha de entrada a cola es requerida' }, { status: 400 });
    }

    // Find, use, or create customer
    let customer;
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: Number(customerId) } });
      if (!customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 400 });
    } else {
      if (!customerName || !customerPhone) {
        return NextResponse.json({ error: 'Nombre y teléfono del cliente son requeridos' }, { status: 400 });
      }
      customer = await prisma.customer.findFirst({ where: { phone: customerPhone } });
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
    }

    // Create repair first, then assign ticketNumber based on actual DB id
    // (avoids collisions when orders have been deleted)
    const initialStatus = status || 'RECEIVED';

    const repair = await prisma.$transaction(async (tx) => {
      const newRepair = await tx.repair.create({
        data: {
          ticketNumber:     `TK-TEMP-${Date.now()}`,
          customerId:       customer.id,
          deviceType,
          deviceBrand,
          deviceModel,
          serialNumber:     serialNumber || null,
          password:         password || null,
          issue,
          notes:            notes || null,
          status:           initialStatus,
          laborCost:        parseFloat(laborCost as string) || 0,
          totalCost:        parseFloat(laborCost as string) || 0,
          queueDate:        new Date(queueDate),
          dueDate:          (isDefinedService === 'true' || isDefinedService === true) && dueDate ? new Date(dueDate) : null,
          isDefinedService: isDefinedService === 'true' || isDefinedService === true,
        },
      });

      const updated = await tx.repair.update({
        where: { id: newRepair.id },
        data: { ticketNumber: `TK-${String(newRepair.id).padStart(4, '0')}` },
      });

      // Create first status log
      await tx.repairStatusLog.create({
        data: { repairId: updated.id, status: initialStatus },
      });

      return updated;
    });

    return NextResponse.json(repair, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
