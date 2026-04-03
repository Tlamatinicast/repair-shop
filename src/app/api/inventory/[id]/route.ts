import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: Number(params.id) } });
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, any> = {};
  const fields = ['name', 'sku', 'description', 'category', 'location'];
  const numbers = ['quantity', 'minQuantity', 'costPrice', 'salePrice'];
  fields.forEach(f => { if (body[f] !== undefined) data[f] = body[f] || null; });
  numbers.forEach(f => { if (body[f] !== undefined) data[f] = parseFloat(body[f]); });
  const item = await prisma.inventoryItem.update({ where: { id: Number(params.id) }, data });
  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.inventoryItem.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
