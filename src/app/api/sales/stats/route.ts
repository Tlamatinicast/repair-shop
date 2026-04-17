import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { error } = await apiRequireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const date  = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
  const start = new Date(`${date}T00:00:00`);
  const end   = new Date(`${date}T23:59:59`);

  const [sales, totals, byMethod] = await Promise.all([
    prisma.sale.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.sale.aggregate({
      _sum: { total: true, discount: true },
      where: { createdAt: { gte: start, lte: end } },
    }),
    prisma.salePayment.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: true,
      where: { createdAt: { gte: start, lte: end } },
    }),
  ]);

  return NextResponse.json({
    date,
    totalSales:    sales,
    totalRevenue:  totals._sum.total    ?? 0,
    totalDiscount: totals._sum.discount ?? 0,
    byMethod,
  });
}
