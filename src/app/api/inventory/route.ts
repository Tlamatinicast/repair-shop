import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  const type = req.nextUrl.searchParams.get('type');
  const items = await prisma.inventoryItem.findMany({
    where: type ? { itemType: type } : undefined,
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const { name, sku, description, quantity, minQuantity, costPrice, salePrice, category, itemType, location } = await req.json();
    if (!name || !sku || !category || !itemType) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    const item = await prisma.inventoryItem.create({
      data: {
        name, sku,
        description: description || null,
        quantity:    parseInt(quantity)    || 0,
        minQuantity: parseInt(minQuantity) || 1,
        costPrice:   parseFloat(costPrice) || 0,
        salePrice:   parseFloat(salePrice) || 0,
        category,
        itemType,
        location: location || null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'El SKU ya existe' }, { status: 400 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
