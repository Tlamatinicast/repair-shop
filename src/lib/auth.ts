import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'ADMIN') redirect('/');
  return session;
}

export function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

// API route guards — return NextResponse instead of redirecting
export async function apiRequireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }), session: null };
  return { error: null, session };
}

export async function apiRequireAdmin() {
  const { error, session } = await apiRequireAuth();
  if (error) return { error, session: null };
  if ((session!.user as any).role !== 'ADMIN') return { error: NextResponse.json({ error: 'Se requiere rol de administrador' }, { status: 403 }), session: null };
  return { error: null, session };
}
