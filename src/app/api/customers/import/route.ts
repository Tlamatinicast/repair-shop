import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { apiRequireAdmin } from '@/lib/auth';
import { parseExcelRows, type ImportPreview } from '@/lib/customerImport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido: se esperaba multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  const dryRun = String(formData.get('dryRun') ?? 'true') !== 'false';
  const mode = String(formData.get('mode') ?? 'create') === 'upsert' ? 'upsert' : 'create';

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Archivo requerido en el campo "file"' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Archivo demasiado grande (máx ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 400 });
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (e: any) {
    return NextResponse.json({ error: `No se pudo leer el Excel: ${e?.message ?? 'desconocido'}` }, { status: 400 });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: 'El archivo no contiene hojas' }, { status: 400 });
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const { parsed, errors } = parseExcelRows(rows);

  // Duplicados de teléfono dentro del archivo
  const phoneCount = new Map<string, number>();
  for (const r of parsed) phoneCount.set(r.phone, (phoneCount.get(r.phone) ?? 0) + 1);
  const duplicatePhonesInFile = Array.from(phoneCount.entries()).filter(([, c]) => c > 1).map(([p]) => p);

  // Teléfonos ya existentes en DB
  const phones = parsed.map(p => p.phone);
  const existing = phones.length
    ? await prisma.customer.findMany({ where: { phone: { in: phones } }, select: { phone: true } })
    : [];
  const existingPhonesInDb = Array.from(new Set(existing.map(e => e.phone)));

  const preview: ImportPreview = {
    totalRows: rows.length,
    validRows: parsed,
    errors,
    duplicatePhonesInFile,
    existingPhonesInDb,
  };

  // Errores estructurales y duplicados dentro del archivo siempre bloquean.
  // Teléfonos existentes en DB solo bloquean en modo 'create'.
  const blockingIssues =
    errors.length > 0 ||
    duplicatePhonesInFile.length > 0 ||
    (mode === 'create' && existingPhonesInDb.length > 0);

  if (dryRun || blockingIssues) {
    return NextResponse.json({
      ok: !blockingIssues,
      dryRun: true,
      mode,
      preview,
      ...(blockingIssues ? { error: 'Hay problemas que deben resolverse antes de importar' } : {}),
    });
  }

  // Escritura real. `phone` no es @unique en el schema, así que el upsert es manual:
  // findFirst por teléfono dentro de la transacción, luego update o create.
  try {
    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const r of parsed) {
        if (mode === 'upsert') {
          const existed = await tx.customer.findFirst({ where: { phone: r.phone }, select: { id: true } });
          if (existed) {
            await tx.customer.update({
              where: { id: existed.id },
              data: {
                name: r.name,
                email: r.email,
                address: r.address,
                notes: r.notes,
              },
            });
            updated++;
          } else {
            await tx.customer.create({
              data: {
                name: r.name,
                phone: r.phone,
                email: r.email,
                address: r.address,
                notes: r.notes,
              },
            });
            created++;
          }
        } else {
          await tx.customer.create({
            data: {
              name: r.name,
              phone: r.phone,
              email: r.email,
              address: r.address,
              notes: r.notes,
            },
          });
          created++;
        }
      }
      return { created, updated };
    });
    return NextResponse.json({ ok: true, dryRun: false, mode, ...result, preview });
  } catch (e: any) {
    return NextResponse.json({ error: `Error al importar: ${e?.message ?? 'desconocido'}` }, { status: 500 });
  }
}
