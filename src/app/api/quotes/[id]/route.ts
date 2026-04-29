import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const IVA = 0.16;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const quote = await prisma.quote.findUnique({
    where: { id: Number(params.id) },
    include: { items: true, customer: true },
  });

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(quote);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id = Number(params.id);

  // Status-only update
  if (body.status && Object.keys(body).length === 1) {
    const updated = await prisma.quote.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json(updated);
  }

  // Full update (edit)
  const { customerId, customerName = '', customerPhone = '', items = [], discount = 0, deposit = 0, notes, terms, validUntil, status } = body;

  let subtotal = 0;
  let ivaAmount = 0;
  const processedItems = items.map((it: any) => {
    const sub = Number(it.unitPrice) * Number(it.quantity);
    const iva = it.hasIva ? sub * IVA : 0;
    subtotal += sub;
    ivaAmount += iva;
    return {
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      hasIva: Boolean(it.hasIva),
      onDemand: Boolean(it.onDemand),
      ivaAmount: iva,
      subtotal: sub,
      total: sub + iva,
    };
  });

  const discountAmt = Math.min(Number(discount), subtotal);
  const total = subtotal - discountAmt + ivaAmount;

  const quote = await prisma.quote.update({
    where: { id },
    data: {
      customerId: customerId ? Number(customerId) : null,
      customerName: customerId ? '' : customerName,
      customerPhone: customerId ? '' : customerPhone,
      subtotal,
      discount: discountAmt,
      ivaAmount,
      total,
      deposit: Number(deposit),
      notes: notes || null,
      terms: terms || null,
      validUntil: validUntil ? new Date(validUntil) : null,
      status: status ?? undefined,
      items: {
        deleteMany: {},
        create: processedItems,
      },
    },
    include: { items: true, customer: true },
  });

  return NextResponse.json(quote);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.quote.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
