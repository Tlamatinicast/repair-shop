import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, apiRequireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await apiRequireAuth();
  if (error) return error;

  const templates = await prisma.expenseTemplate.findMany({
    orderBy: [{ active: 'desc' }, { description: 'asc' }],
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { description, category, expenseType, defaultAmount, paymentMethod } = body;

    if (!description || !category) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const template = await prisma.expenseTemplate.create({
      data: {
        description,
        category,
        expenseType:   expenseType   ?? 'FIXED',
        defaultAmount: defaultAmount ? parseFloat(defaultAmount) : 0,
        paymentMethod: paymentMethod ?? 'CASH',
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
