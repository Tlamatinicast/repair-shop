import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const notes = await prisma.repairNote.findMany({
    where: { repairId: Number(params.id) },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const formData = await req.formData();
    const content   = formData.get('content') as string;
    const stage     = (formData.get('stage') as string) || 'IN_REPAIR';
    const file      = formData.get('photo') as File | null;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'La nota no puede estar vacía' }, { status: 400 });
    }

    let photoUrl: string | null = null;

    if (file && file.size > 0) {
      // Validate
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: 'La imagen no puede superar 15MB' }, { status: 400 });
      }

      const bytes  = await file.arrayBuffer();
      let buffer   = Buffer.from(bytes);

      // Compress with sharp if available
      try {
        const sharp = (await import('sharp')).default;
        buffer = await sharp(buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75, progressive: true })
          .toBuffer();
      } catch { /* sharp not available */ }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'notes', params.id);
      if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

      const filename = `note-${Date.now()}.jpg`;
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/notes/${params.id}/${filename}`;
    }

    const note = await prisma.repairNote.create({
      data: {
        repairId:   Number(params.id),
        content:    content.trim(),
        stage,
        photoUrl,
        authorName: session.user?.name ?? 'Usuario',
        authorRole: (session.user as any)?.role ?? 'TECHNICIAN',
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al guardar la nota' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo el administrador puede eliminar notas' }, { status: 403 });
  }

  const { noteId } = await req.json();
  const note = await prisma.repairNote.findUnique({ where: { id: Number(noteId) } });
  if (!note) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  // Delete photo file if exists
  if (note.photoUrl) {
    try {
      const { unlink } = await import('fs/promises');
      await unlink(path.join(process.cwd(), 'public', note.photoUrl));
    } catch { /* file might not exist */ }
  }

  await prisma.repairNote.delete({ where: { id: Number(noteId) } });
  return NextResponse.json({ ok: true });
}
