import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ── Upload directory ───────────────────────────────────────────────────────────
// To use a NAS or external storage in the future, set UPLOAD_BASE_DIR in your
// .env file to the mount point (e.g. Z:\tlamatech or /mnt/nas/tlamatech).
// You will also need a custom file-serving route if files are outside /public.
// For now, files are served as static assets from /public/uploads.
const UPLOAD_BASE = process.env.UPLOAD_BASE_DIR ?? path.join(process.cwd(), 'public');

const MAX_PHOTOS  = 15;
const MAX_SIZE_MB = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function compressAndSave(file: File, dir: string, name: string): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`La imagen "${file.name}" supera ${MAX_SIZE_MB} MB`);
  }

  const bytes  = await file.arrayBuffer();
  let   buffer = Buffer.from(bytes);

  try {
    const sharp = (await import('sharp')).default;
    buffer = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      // WebP: ~25-35% smaller than JPEG at equivalent quality
      .webp({ quality: 72, effort: 4 })
      .toBuffer();
  } catch { /* sharp not available, store original */ }

  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const filename = `${name}-${Date.now()}.webp`;
  await writeFile(path.join(dir, filename), buffer);
  return filename;
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

    // Save & compress all photos
    const uploadDir = path.join(UPLOAD_BASE, 'uploads', 'notes', params.id);
    const savedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const filename = await compressAndSave(files[i], uploadDir, `note-${i}`);
      savedUrls.push(`/uploads/notes/${params.id}/${filename}`);
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

  // Delete all associated photo files
  const urls = getPhotoUrls(note);
  for (const url of urls) {
    try {
      await unlink(path.join(UPLOAD_BASE, url));
    } catch { /* file might not exist */ }
  }

  await prisma.repairNote.delete({ where: { id: Number(noteId) } });
  return NextResponse.json({ ok: true });
}
