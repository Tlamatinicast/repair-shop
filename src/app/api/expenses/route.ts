import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await apiRequireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const month  = searchParams.get('month');   // e.g. "2026-05"
  const cat    = searchParams.get('category');
  const type   = searchParams.get('type');    // FIXED | VARIABLE

  const where: Record<string, unknown> = {};

  if (month) {
    const [y, m] = month.split('-').map(Number);
    const from = new Date(y, m - 1, 1);
    const to   = new Date(y, m, 1);           // exclusive upper bound
    where.date = { gte: from, lt: to };
  }
  if (cat)  where.category    = cat;
  if (type) where.expenseType = type;

  const expenses = await prisma.expense.findMany({
    where,
    include: { template: { select: { description: true } } },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const { error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { description, amount, category, expenseType, paymentMethod, notes, date, templateId } = body;

    if (!description || amount == null || !category || !date) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount:        parseFloat(amount),
        category,
        expenseType:   expenseType   ?? 'FIXED',
        paymentMethod: paymentMethod ?? 'CASH',
        notes:         notes         ?? null,
        date:          new Date(date),
        templateId:    templateId    ? Number(templateId) : null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
