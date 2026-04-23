import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { apiRequireAdmin } from '@/lib/auth';
import { parseExcelRows, type ImportPreview } from '@/lib/inventoryImport';

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
  const defaultMinQuantity = Number(formData.get('defaultMinQuantity') ?? 2) || 2;
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

  const { parsed, errors, categoriesSeen } = parseExcelRows(rows);

  // Duplicados de SKU dentro del archivo
  const skuCount = new Map<string, number>();
  for (const r of parsed) skuCount.set(r.sku, (skuCount.get(r.sku) ?? 0) + 1);
  const duplicateSkusInFile = Array.from(skuCount.entries()).filter(([, c]) => c > 1).map(([s]) => s);

  // SKUs ya existentes en DB
  const skus = parsed.map(p => p.sku);
  const existing = skus.length
    ? await prisma.inventoryItem.findMany({ where: { sku: { in: skus } }, select: { sku: true } })
    : [];
  const existingSkusInDb = existing.map(e => e.sku);

  const preview: ImportPreview = {
    totalRows: rows.length,
    validRows: parsed,
    errors,
    duplicateSkusInFile,
    existingSkusInDb,
    categoriesSeen,
  };

  // Solo errores estructurales y duplicados dentro del archivo bloquean siempre.
  // SKUs existentes en DB solo bloquean en modo 'create' — en 'upsert' se actualizan.
  const blockingIssues =
    errors.length > 0 ||
    duplicateSkusInFile.length > 0 ||
    (mode === 'create' && existingSkusInDb.length > 0);

  if (dryRun || blockingIssues) {
    return NextResponse.json({
      ok: !blockingIssues,
      dryRun: true,
      mode,
      preview,
      ...(blockingIssues ? { error: 'Hay problemas que deben resolverse antes de importar' } : {}),
    });
  }

  // Escritura real
  try {
    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const r of parsed) {
        if (mode === 'upsert') {
          const existed = await tx.inventoryItem.findUnique({ where: { sku: r.sku }, select: { id: true } });
          await tx.inventoryItem.upsert({
            where: { sku: r.sku },
            create: {
              name: r.name,
              sku: r.sku,
              description: r.description,
              quantity: r.quantity,
              minQuantity: defaultMinQuantity,
              costPrice: r.cost,
              salePrice: r.price,
              category: r.category,
              location: null,
            },
            update: {
              name: r.name,
              description: r.description,
              quantity: r.quantity,
              costPrice: r.cost,
              salePrice: r.price,
              category: r.category,
            },
          });
          if (existed) updated++; else created++;
        } else {
          await tx.inventoryItem.create({
            data: {
              name: r.name,
              sku: r.sku,
              description: r.description,
              quantity: r.quantity,
              minQuantity: defaultMinQuantity,
              costPrice: r.cost,
              salePrice: r.price,
              category: r.category,
              location: null,
            },
          });
          created++;
        }
      }
      return { created, updated };
    });
    return NextResponse.json({ ok: true, dryRun: false, mode, ...result, preview });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Conflicto de SKU durante la escritura' }, { status: 409 });
    }
    return NextResponse.json({ error: `Error al importar: ${e?.message ?? 'desconocido'}` }, { status: 500 });
  }
}
