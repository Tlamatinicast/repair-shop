// Helpers de fechas y agregación para el módulo Corte de caja.
// Todos los cálculos se hacen en zona horaria America/Mexico_City (UTC-6 sin DST).

const MX_OFFSET_MINS = 6 * 60;

export type Preset = 'today' | 'yesterday' | 'this-week' | 'this-month';

function shiftToMx(d: Date): Date {
  return new Date(d.getTime() - MX_OFFSET_MINS * 60_000);
}

function shiftFromMx(d: Date): Date {
  return new Date(d.getTime() + MX_OFFSET_MINS * 60_000);
}

function startOfDayMx(now: Date): Date {
  const mx = shiftToMx(now);
  const midnightMx = new Date(Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth(), mx.getUTCDate(), 0, 0, 0));
  return shiftFromMx(midnightMx);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function rangeForPreset(preset: Preset, now: Date = new Date()): { from: Date; to: Date } {
  const todayStart = startOfDayMx(now);
  switch (preset) {
    case 'today':
      return { from: todayStart, to: addDays(todayStart, 1) };
    case 'yesterday':
      return { from: addDays(todayStart, -1), to: todayStart };
    case 'this-week': {
      // Semana inicia lunes en MX
      const mx = shiftToMx(todayStart);
      const dow = mx.getUTCDay(); // 0=dom, 1=lun ... 6=sab
      const daysSinceMonday = (dow + 6) % 7;
      const weekStart = addDays(todayStart, -daysSinceMonday);
      return { from: weekStart, to: addDays(weekStart, 7) };
    }
    case 'this-month': {
      const mx = shiftToMx(todayStart);
      const monthStartMx = new Date(Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth(), 1));
      const monthEndMx = new Date(Date.UTC(mx.getUTCFullYear(), mx.getUTCMonth() + 1, 1));
      return { from: shiftFromMx(monthStartMx), to: shiftFromMx(monthEndMx) };
    }
  }
}

export function parseDateOrNull(s: string | undefined | null): Date | null {
  if (!s) return null;
  // Acepta YYYY-MM-DD (lo interpreta como medianoche MX) o ISO completo
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const [, y, mo, d] = m;
    const mxMidnight = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0));
    return shiftFromMx(mxMidnight);
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t) : null;
}

export function formatDateMx(d: Date): string {
  return d.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTimeMx(d: Date): string {
  return d.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function isoDateMx(d: Date): string {
  // YYYY-MM-DD en zona MX
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
  UNKNOWN: 'No especificado',
};

export const PAYMENT_METHODS_ORDER = ['CASH', 'CARD', 'TRANSFER', 'OTHER', 'UNKNOWN'] as const;

export type CashTransaction = {
  id: string;          // 'sale-123-pay-45' o 'repair-7-pay-12'
  source: 'SALE' | 'REPAIR';
  refNumber: string;   // saleNumber o ticketNumber
  refId: number;
  customerName: string | null;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: Date;
};

export type CashSummary = {
  totalSales: number;        // suma de SalePayments
  totalRepairs: number;      // suma de RepairPayments
  totalRevenue: number;      // suma total
  byMethod: Record<string, number>;
  countSales: number;
  countRepairs: number;
};

export function buildSummary(txns: CashTransaction[]): CashSummary {
  const summary: CashSummary = {
    totalSales: 0, totalRepairs: 0, totalRevenue: 0,
    byMethod: {}, countSales: 0, countRepairs: 0,
  };
  for (const t of txns) {
    summary.totalRevenue += t.amount;
    summary.byMethod[t.paymentMethod] = (summary.byMethod[t.paymentMethod] ?? 0) + t.amount;
    if (t.source === 'SALE') { summary.totalSales += t.amount; summary.countSales++; }
    else { summary.totalRepairs += t.amount; summary.countRepairs++; }
  }
  return summary;
}
