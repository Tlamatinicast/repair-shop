import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(params.id) },
    include: { repairs: { orderBy: { createdAt: 'desc' } } },
  });
  if (!customer) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const customer = await prisma.customer.update({
    where: { id: Number(params.id) },
    data: body,
  });
  return NextResponse.json(customer);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const activeStatuses = ['RECEIVED', 'DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR', 'READY'];

  const activeRepairs = await prisma.repair.count({
    where: {
      customerId: Number(params.id),
      status: { in: activeStatuses },
    },
  });

  if (activeRepairs > 0) {
    return NextResponse.json({
      error: `Este cliente tiene ${activeRepairs} orden${activeRepairs > 1 ? 'es' : ''} activa${activeRepairs > 1 ? 's' : ''}. Ciérralas antes de eliminar el cliente.`,
    }, { status: 400 });
  }

  await prisma.customer.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
