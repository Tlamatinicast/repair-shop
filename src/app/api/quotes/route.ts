import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const IVA = 0.16;

function calcItem(unitPrice: number, quantity: number, hasIva: boolean) {
  const subtotal = unitPrice * quantity;
  const ivaAmount = hasIva ? subtotal * IVA : 0;
  return { subtotal, ivaAmount, total: subtotal + ivaAmount };
}

async function nextQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quote.count();
  return `COT-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const q = searchParams.get('q') ?? '';

  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { quoteNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const quotes = await prisma.quote.findMany({
    where,
    include: { customer: { select: { name: true, phone: true } }, items: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    customerId,
    customerName = '',
    customerPhone = '',
    items = [],
    discount = 0,
    deposit = 0,
    notes,
    terms,
    validUntil,
  } = body;

  const quoteNumber = await nextQuoteNumber();

  let subtotal = 0;
  let ivaAmount = 0;
  const processedItems = items.map((it: any) => {
    const calc = calcItem(Number(it.unitPrice), Number(it.quantity), Boolean(it.hasIva));
    subtotal += calc.subtotal;
    ivaAmount += calc.ivaAmount;
    return {
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      hasIva: Boolean(it.hasIva),
      onDemand: Boolean(it.onDemand),
      ivaAmount: calc.ivaAmount,
      subtotal: calc.subtotal,
      total: calc.total,
    };
  });

  const discountAmt = Math.min(Number(discount), subtotal);
  const total = subtotal - discountAmt + ivaAmount;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      status: 'DRAFT',
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
      items: { create: processedItems },
    },
    include: { items: true, customer: true },
  });

  return NextResponse.json(quote, { status: 201 });
}
