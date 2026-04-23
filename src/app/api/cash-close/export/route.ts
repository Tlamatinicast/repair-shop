import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { apiRequireAdmin } from '@/lib/auth';
import { getBusinessSettings } from '@/lib/businessSettings';
import {
  rangeForPreset, parseDateOrNull, isoDateMx, formatDateTimeMx,
  buildSummary, PAYMENT_METHOD_LABEL, PAYMENT_METHODS_ORDER,
  type Preset, type CashTransaction,
} from '@/lib/cashClose';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_PRESETS: Preset[] = ['today', 'yesterday', 'this-week', 'this-month'];

function slug(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(req: NextRequest) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const presetParam = searchParams.get('preset');
  const customFrom = parseDateOrNull(searchParams.get('from'));
  const customTo = parseDateOrNull(searchParams.get('to'));
  const preset = (VALID_PRESETS as string[]).includes(presetParam ?? '')
    ? (presetParam as Preset)
    : (customFrom && customTo ? null : 'today');

  let from: Date, to: Date;
  if (preset) {
    ({ from, to } = rangeForPreset(preset));
  } else {
    from = customFrom!;
    // Si vino como YYYY-MM-DD inclusive, sumamos un día para hacerlo exclusivo
    to = new Date(customTo!.getTime() + 86_400_000);
  }

  const [salePayments, repairPayments] = await Promise.all([
    prisma.salePayment.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: { sale: { include: { customer: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.repairPayment.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: { repair: { include: { customer: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const txns: CashTransaction[] = [
    ...salePayments.map(p => ({
      id: `sale-${p.saleId}-pay-${p.id}`,
      source: 'SALE' as const,
      refNumber: p.sale.saleNumber,
      refId: p.saleId,
      customerName: p.sale.customer?.name ?? null,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
    ...repairPayments.map(p => ({
      id: `repair-${p.repairId}-pay-${p.id}`,
      source: 'REPAIR' as const,
      refNumber: p.repair.ticketNumber,
      refId: p.repairId,
      customerName: p.repair.customer?.name ?? null,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const summary = buildSummary(txns);

  // Hoja resumen
  const summaryRows: (string | number)[][] = [
    ['Corte de caja'],
    [`Periodo: ${isoDateMx(from)} a ${isoDateMx(new Date(to.getTime() - 1))}`],
    [],
    ['Total recaudado', summary.totalRevenue],
    ['Ventas POS', summary.totalSales],
    ['Cobros reparaciones', summary.totalRepairs],
    [`Total transacciones`, txns.length],
    [],
    ['Desglose por método'],
    ...PAYMENT_METHODS_ORDER
      .filter(m => (summary.byMethod[m] ?? 0) > 0)
      .map(m => [PAYMENT_METHOD_LABEL[m], summary.byMethod[m]] as [string, number]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 16 }];

  // Hoja de movimientos
  const movRows = txns.map(t => ({
    Fecha: formatDateTimeMx(t.createdAt),
    Tipo: t.source === 'SALE' ? 'Venta' : 'Reparación',
    Folio: t.refNumber,
    Cliente: t.customerName ?? '',
    Método: PAYMENT_METHOD_LABEL[t.paymentMethod] ?? t.paymentMethod,
    Monto: t.amount,
    Notas: t.notes ?? '',
  }));
  const wsMov = XLSX.utils.json_to_sheet(movRows, {
    header: ['Fecha', 'Tipo', 'Folio', 'Cliente', 'Método', 'Monto', 'Notas'],
  });
  wsMov['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 26 },
    { wch: 16 }, { wch: 12 }, { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
  XLSX.utils.book_append_sheet(wb, wsMov, 'Movimientos');

  const buffer: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const body = new Uint8Array(buffer);

  const settings = await getBusinessSettings();
  const businessSlug = slug(settings.name) || 'tlamatech';
  const fromStr = isoDateMx(from);
  const toStr = isoDateMx(new Date(to.getTime() - 1));
  const filename = fromStr === toStr
    ? `corte-${businessSlug}-${fromStr}.xlsx`
    : `corte-${businessSlug}-${fromStr}-a-${toStr}.xlsx`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
