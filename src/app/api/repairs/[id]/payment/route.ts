import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Mantenido para retrocompatibilidad; ya solo acepta cambios de paymentStatus.
// La edición de monto se hace vía POST /payments (alta) o DELETE /payments/[id] (anulación).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const { paymentStatus } = await req.json();
    if (!paymentStatus) {
      return NextResponse.json({ error: 'paymentStatus requerido' }, { status: 400 });
    }
    const repair = await prisma.repair.update({
      where: { id: Number(params.id) },
      data: { paymentStatus },
    });
    return NextResponse.json(repair);
  } catch (err) {
    return NextResponse.json({ error: 'Error al actualizar el pago' }, { status: 500 });
  }
}
