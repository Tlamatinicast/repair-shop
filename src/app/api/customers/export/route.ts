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

export async function GET(_req: NextRequest) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
  });

  // Mismas columnas que el importador → round-trip.
  const rows = customers.map(c => ({
    Nombre: c.name,
    Teléfono: c.phone,
    Correo: c.email ?? '',
    Dirección: c.address ?? '',
    Notas: c.notes ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Nombre', 'Teléfono', 'Correo', 'Dirección', 'Notas'],
  });

  ws['!cols'] = [
    { wch: 28 }, { wch: 16 }, { wch: 28 }, { wch: 40 }, { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

  const buffer: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const body = new Uint8Array(buffer);

  const settings = await getBusinessSettings();
  const businessSlug = slug(settings.name) || 'tlamatech';
  const filename = `clientes-${businessSlug}-${todayISO()}.xlsx`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
