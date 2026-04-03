import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const repair = await prisma.repair.findUnique({
    where: { id: Number(params.id) },
    include: { customer: true, parts: { include: { item: true } } },
  });
  if (!repair) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(repair);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, deviceType, deviceBrand, deviceModel, serialNumber, password, issue, diagnosis, notes, laborCost, totalCost } = body;
    const data: Record<string, any> = {};
    if (status       !== undefined) { data.status = status; if (status === 'DELIVERED') data.deliveredAt = new Date(); }
    if (deviceType   !== undefined) data.deviceType   = deviceType;
    if (deviceBrand  !== undefined) data.deviceBrand  = deviceBrand;
    if (deviceModel  !== undefined) data.deviceModel  = deviceModel;
    if (serialNumber !== undefined) data.serialNumber = serialNumber || null;
    if (password     !== undefined) data.password     = password || null;
    if (issue        !== undefined) data.issue        = issue;
    if (diagnosis    !== undefined) data.diagnosis    = diagnosis || null;
    if (notes        !== undefined) data.notes        = notes || null;
    if (laborCost    !== undefined) data.laborCost    = parseFloat(laborCost);
    if (totalCost    !== undefined) data.totalCost    = parseFloat(totalCost);
    const repair = await prisma.repair.update({ where: { id: Number(params.id) }, data });
    return NextResponse.json(repair);
  } catch (err) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo el administrador puede eliminar órdenes' }, { status: 403 });
  }
  await prisma.repair.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
