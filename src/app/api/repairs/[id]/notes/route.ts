import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

const MAX_PHOTOS  = 15;
const MAX_SIZE_MB = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function compressAndUpload(file: File, folder: string): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`La imagen "${file.name}" supera ${MAX_SIZE_MB} MB`);
  }
  const bytes  = await file.arrayBuffer();
  let   buffer = Buffer.from(bytes);
  try {
    const sharp = (await import('sharp')).default;
    buffer = Buffer.from(await sharp(buffer as Buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer());
  } catch { /* sharp not available, upload original */ }
  return uploadImage(buffer, folder);
}

function getPhotoUrls(note: any): string[] {
  // New notes use photoUrls (JSON array); legacy notes use photoUrl (single string)
  try {
    const parsed = JSON.parse(note.photoUrls ?? '[]');
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* ignore */ }
  return note.photoUrl ? [note.photoUrl] : [];
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const notes = await prisma.repairNote.findMany({
    where: { repairId: Number(params.id) },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notes);
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const formData = await req.formData();
    const content  = formData.get('content') as string;
    const stage    = (formData.get('stage') as string) || 'IN_REPAIR';

    if (!content?.trim()) {
      return NextResponse.json({ error: 'La nota no puede estar vacía' }, { status: 400 });
    }

    // Collect up to MAX_PHOTOS files (sent as photo_0, photo_1, …)
    const files: File[] = [];
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const f = formData.get(`photo_${i}`) as File | null;
      if (f && f.size > 0) files.push(f);
    }
    // Also accept legacy single 'photo' field
    const legacyFile = formData.get('photo') as File | null;
    if (legacyFile && legacyFile.size > 0 && files.length === 0) files.push(legacyFile);

    if (files.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `Máximo ${MAX_PHOTOS} fotos por nota` }, { status: 400 });
    }

    // Compress & upload all photos to Cloudinary
    const savedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = await compressAndUpload(files[i], `notes/${params.id}`);
      savedUrls.push(url);
    }

    const note = await prisma.repairNote.create({
      data: {
        repairId:   Number(params.id),
        content:    content.trim(),
        stage,
        photoUrl:   null,                        // legacy field — unused for new notes
        photoUrls:  JSON.stringify(savedUrls),   // store as JSON array
        authorName: session.user?.name ?? 'Usuario',
        authorRole: (session.user as any)?.role ?? 'TECHNICIAN',
      },
    });

    // Attach resolved photos array to response for immediate UI update
    return NextResponse.json({ ...note, _photos: savedUrls }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? 'Error al guardar la nota' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo el administrador puede eliminar notas' }, { status: 403 });
  }

  const { noteId } = await req.json();
  const note = await prisma.repairNote.findUnique({ where: { id: Number(noteId) } });
  if (!note) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  // Delete all associated photos from Cloudinary
  const urls = getPhotoUrls(note);
  for (const url of urls) {
    await deleteImage(url);
  }

  await prisma.repairNote.delete({ where: { id: Number(noteId) } });
  return NextResponse.json({ ok: true });
}
