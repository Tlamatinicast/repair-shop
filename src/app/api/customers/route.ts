import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const customers = await prisma.customer.findMany({
    include: { _count: { select: { repairs: true } } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, address, notes } = await req.json();
    if (!name || !phone) return NextResponse.json({ error: 'Nombre y teléfono son requeridos' }, { status: 400 });
    const customer = await prisma.customer.create({
      data: { name, phone, email: email || null, address: address || null, notes: notes || null },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
