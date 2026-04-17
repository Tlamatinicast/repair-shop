import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

const MAX_SIZE_MB = 15;

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  const photos = await prisma.repairPhoto.findMany({
    where: { repairId: Number(params.id) },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(photos);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const formData = await req.formData();
    const file    = formData.get('file') as File;
    const stage   = (formData.get('stage') as string) || 'RECEIVED';
    const caption = (formData.get('caption') as string) || null;

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return NextResponse.json({ error: `La imagen no puede superar ${MAX_SIZE_MB}MB` }, { status: 400 });

    const bytes  = await file.arrayBuffer();
    let   buffer = Buffer.from(bytes);

    try {
      const sharp = (await import('sharp')).default;
      buffer = Buffer.from(await sharp(buffer as Buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer());
    } catch { /* sharp unavailable */ }

    const url = await uploadImage(buffer, `repairs/${params.id}`);

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
  const { error } = await apiRequireAuth();
  if (error) return error;
  try {
    const { photoId } = await req.json();
    const photo = await prisma.repairPhoto.findUnique({ where: { id: Number(photoId) } });
    if (!photo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    await deleteImage(photo.url);
    await prisma.repairPhoto.delete({ where: { id: Number(photoId) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
