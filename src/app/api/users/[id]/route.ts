import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return { session: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }
  return { session, error: null };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  try {
    const { name, email, role, active, password } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y correo son requeridos' }, { status: 400 });
    }

    const data: any = { name, email, role, active };
    if (password && password.length >= 6) {
      data.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'Este correo ya está registrado' }, { status: 400 });
    if (err.code === 'P2025') return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const currentUserId = (session!.user as any).id;
  if (id === currentUserId) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
