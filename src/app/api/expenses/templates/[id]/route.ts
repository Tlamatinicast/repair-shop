import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const allowed = ['description', 'category', 'expenseType', 'defaultAmount', 'paymentMethod', 'active'];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = key === 'defaultAmount' ? parseFloat(body[key]) : body[key];
      }
    }

    const template = await prisma.expenseTemplate.update({
      where: { id: Number(params.id) },
      data,
    });

    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  try {
    await prisma.expenseTemplate.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
}
