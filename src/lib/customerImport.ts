// Parser del importador de Clientes. Encabezados en español porque el Excel
// de clientes lo toca gente menos técnica que el de inventario.
// Llave natural para upsert: `phone` (requerido en el modelo Customer).

export const REQUIRED_COLUMNS = ['Nombre', 'Teléfono'] as const;

export interface ParsedRow {
  rowNumber: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface RowError {
  rowNumber: number;
  field: string;
  message: string;
  raw?: unknown;
}

export interface ImportPreview {
  totalRows: number;
  validRows: ParsedRow[];
  errors: RowError[];
  duplicatePhonesInFile: string[];
  existingPhonesInDb: string[];
}

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function optional(v: unknown): string | null {
  const s = str(v);
  return s ? s : null;
}

// Normaliza el teléfono quitando espacios internos múltiples, pero conserva
// el formato original (incluyendo + y guiones) para respetar lo que el usuario capturó.
function normalizePhone(raw: unknown): string {
  return str(raw).replace(/\s+/g, ' ');
}

export function parseExcelRows(rows: Record<string, unknown>[]): {
  parsed: ParsedRow[];
  errors: RowError[];
} {
  const parsed: ParsedRow[] = [];
  const errors: RowError[] = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // header es fila 1

    const name = str(row['Nombre']);
    const phone = normalizePhone(row['Teléfono']);
    const email = optional(row['Correo']);
    const address = optional(row['Dirección']);
    const notes = optional(row['Notas']);

    const rowErrors: RowError[] = [];
    if (!name) rowErrors.push({ rowNumber, field: 'Nombre', message: 'Nombre vacío' });
    if (!phone) rowErrors.push({ rowNumber, field: 'Teléfono', message: 'Teléfono vacío' });

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    parsed.push({ rowNumber, name, phone, email, address, notes });
  });

  return { parsed, errors };
}
