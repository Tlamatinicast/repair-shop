import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Compress image using sharp if available, otherwise save as-is
async function compressImage(buffer: Buffer, filename: string): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer();
  } catch {
    // sharp not available or unsupported format, return original
    return buffer;
  }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const photos = await prisma.repairPhoto.findMany({
    where: { repairId: Number(params.id) },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(photos);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const stage = (formData.get('stage') as string) || 'RECEIVED';
    const caption = (formData.get('caption') as string) || null;

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    // Validate size (max 15MB original)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 15MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Compress
    const compressed = await compressImage(buffer, file.name);

    // Save to public/uploads/repairs/{repairId}/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'repairs', params.id);
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const ext = 'jpg';
    const filename = `${stage}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, compressed);

    const url = `/uploads/repairs/${params.id}/${filename}`;

    const photo = await prisma.repairPhoto.create({
      data: { repairId: Number(params.id), url, stage, caption },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { photoId } = await req.json();
    const photo = await prisma.repairPhoto.findUnique({ where: { id: Number(photoId) } });
    if (!photo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    // Delete file from disk
    try {
      const { unlink } = await import('fs/promises');
      const filepath = path.join(process.cwd(), 'public', photo.url);
      await unlink(filepath);
    } catch { /* file might not exist */ }

    await prisma.repairPhoto.delete({ where: { id: Number(photoId) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
