import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const { advancePayment, paymentStatus } = await req.json();

    const repair = await prisma.repair.update({
      where: { id: Number(params.id) },
      data: {
        ...(advancePayment !== undefined ? { advancePayment: parseFloat(advancePayment) } : {}),
        ...(paymentStatus  !== undefined ? { paymentStatus }                             : {}),
      },
    });

    return NextResponse.json(repair);
  } catch (err) {
    return NextResponse.json({ error: 'Error al actualizar el pago' }, { status: 500 });
  }
}
