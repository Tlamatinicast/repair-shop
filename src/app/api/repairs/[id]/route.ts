import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, apiRequireAdmin } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  const repair = await prisma.repair.findUnique({
    where: { id: Number(params.id) },
    include: { customer: true, parts: { include: { item: true } } },
  });
  if (!repair) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(repair);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const { status, deviceType, deviceBrand, deviceModel, serialNumber, password, issue, diagnosis, notes, diagnosisFee, totalCost, partsEta, warrantyType, warrantyVoided, warrantyVoidReason } = body;
    const data: Record<string, any> = {};

    const existingRepair = await prisma.repair.findUnique({ where: { id: Number(params.id) } });
    if (!existingRepair) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const isTerminal = existingRepair.status === 'DELIVERED' || existingRepair.status === 'CANCELLED';
    if (isTerminal && Object.keys(body).some(k => k !== 'status')) {
      return NextResponse.json({ error: 'No se puede editar una orden terminada o cancelada.' }, { status: 403 });
    }

    if (status       !== undefined) { data.status = status; if (status === 'DELIVERED') data.deliveredAt = new Date(); }
    if (deviceType   !== undefined) data.deviceType   = deviceType;
    if (deviceBrand  !== undefined) data.deviceBrand  = deviceBrand;
    if (deviceModel  !== undefined) data.deviceModel  = deviceModel;
    if (serialNumber !== undefined) data.serialNumber = serialNumber || null;
    if (password     !== undefined) data.password     = password || null;
    if (issue        !== undefined) data.issue        = issue;
    if (diagnosis    !== undefined) data.diagnosis    = diagnosis || null;
    if (notes        !== undefined) data.notes        = notes || null;
    if (diagnosisFee !== undefined) data.diagnosisFee = parseFloat(diagnosisFee);
    if (totalCost    !== undefined) data.totalCost    = parseFloat(totalCost);
    if (partsEta          !== undefined) data.partsEta          = partsEta ? new Date(partsEta) : null;
    if (warrantyType      !== undefined) data.warrantyType      = warrantyType;
    if (warrantyVoided    !== undefined) data.warrantyVoided    = warrantyVoided;
    if (warrantyVoidReason !== undefined) data.warrantyVoidReason = warrantyVoidReason ?? null;

    // If status changed, close current log and open new one
    const statusChanged = status !== undefined && status !== existingRepair.status;

    const repair = await prisma.$transaction(async (tx) => {
      if (statusChanged) {
        await tx.repairStatusLog.updateMany({
          where: { repairId: Number(params.id), endedAt: null },
          data: { endedAt: new Date() },
        });
        await tx.repairStatusLog.create({
          data: { repairId: Number(params.id), status },
        });
      }
      return tx.repair.update({ where: { id: Number(params.id) }, data });
    });

    return NextResponse.json(repair);
  } catch (err) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAdmin();
  if (error) return error;
  await prisma.repair.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
