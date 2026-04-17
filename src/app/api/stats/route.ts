import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';

export async function GET() {
  const { error } = await apiRequireAuth();
  if (error) return error;

  const [activeRepairs, readyRepairs, totalRepairs, revenue, lowStock] = await Promise.all([
    prisma.repair.count({ where: { status: { in: ['RECEIVED', 'DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR'] } } }),
    prisma.repair.count({ where: { status: 'READY' } }),
    prisma.repair.count(),
    prisma.repair.aggregate({ _sum: { totalCost: true }, where: { status: 'DELIVERED' } }),
    prisma.inventoryItem.count({ where: { quantity: { lte: 1 } } }),
  ]);

  return NextResponse.json({
    activeRepairs, readyRepairs, totalRepairs,
    revenue: revenue._sum.totalCost ?? 0,
    lowStock,
  });
}
