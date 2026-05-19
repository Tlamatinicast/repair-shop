import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { apiRequireAdmin } from '@/lib/auth';
import { getBusinessSettings } from '@/lib/businessSettings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function slug(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: NextRequest) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || undefined;
  const category = searchParams.get('category')?.trim() || undefined;

  const items = await prisma.inventoryItem.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {}),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // Mismas columnas que el importador → round-trip
  const rows = items.map(i => ({
    Type:        i.itemType,
    Category:    i.category,
    Name:        i.name,
    Description: i.description ?? '',
    Cost:        i.costPrice,
    Price:       i.salePrice,
    Quantity:    i.quantity,
    SKU:         i.sku,
    Location:    i.location ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Type', 'Category', 'Name', 'Description', 'Cost', 'Price', 'Quantity', 'SKU', 'Location'],
  });

  // Anchos cómodos
  ws['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 50 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  const buffer: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const body = new Uint8Array(buffer);

  const settings = await getBusinessSettings();
  const businessSlug = slug(settings.name) || 'tlamatech';
  const filename = `inventario-${businessSlug}-${todayISO()}.xlsx`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
