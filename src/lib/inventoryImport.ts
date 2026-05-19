// Normalización de categorías aprobada para el importador de inventario.
// Mapea los valores tal como vienen en el Excel original a la forma canónica
// que vive en INVENTORY_CATEGORIES (src/lib/utils.ts).
export const CATEGORY_NORMALIZATION: Record<string, string> = {
  'BATERIAS': 'Baterías',
  'BOTONES': 'Botones',
  'Centro de  carga': 'Centro de Carga',
  'Centro de carga': 'Centro de Carga',
  'Condensadores electroliticos': 'Condensadores Electrolíticos',
  'DIODO(S)': 'Diodos',
  'DISPLAYPORT RETIMER IC': 'DisplayPort Retimer IC',
  'DRMosfet': 'DRMosfet',
  'EC/KBC/SUPER IO': 'EC/KBC/Super IO',
  'HACK IC': 'Hack IC',
  'IC Almacenamiento': 'IC Almacenamiento',
  'IC Audio': 'IC Audio',
  'IC Carga': 'IC Carga',
  'IC Controlador': 'IC Controlador',
  'IC Regulador': 'IC Regulador',
  'IC Switch': 'IC Switch',
  'IC USB': 'IC USB',
  'IC WIFI/LAN': 'IC WiFi/LAN',
  'Joystick': 'Joystick',
  'Mosfet': 'Mosfet',
  'PMIC': 'PMIC',
  'PUERTO USB': 'Puerto USB',
  'Placa buck converter': 'Placa Buck Converter',
  'Puerto HDMI': 'Puerto HDMI',
  'VRAM': 'VRAM',
};

export function normalizeCategory(raw: string): string {
  const trimmed = String(raw ?? '').trim().replace(/\s+/g, ' ');
  return CATEGORY_NORMALIZATION[trimmed] ?? trimmed;
}

export const REQUIRED_COLUMNS = ['Category', 'Name', 'Cost', 'Price', 'Quantity', 'SKU'] as const;

const VALID_TYPES = ['PARTS', 'PRODUCTS', 'TOOLS'] as const;

export interface ParsedRow {
  rowNumber: number;
  category: string;
  name: string;
  description: string | null;
  cost: number;
  price: number;
  quantity: number;
  sku: string;
  itemType: string;
  location: string | null;
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
  duplicateSkusInFile: string[];
  existingSkusInDb: string[];
  categoriesSeen: Record<string, number>;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

export function parseExcelRows(rows: Record<string, unknown>[]): { parsed: ParsedRow[]; errors: RowError[]; categoriesSeen: Record<string, number> } {
  const parsed: ParsedRow[] = [];
  const errors: RowError[] = [];
  const categoriesSeen: Record<string, number> = {};

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // header is row 1

    const rawCategory = row['Category'];
    const rawName = row['Name'];
    const rawDesc = row['Description'];
    const rawCost = row['Cost'];
    const rawPrice = row['Price'];
    const rawQty = row['Quantity'];
    const rawSku = row['SKU'];
    const rawType = row['Type'];
    const rawLocation = row['Location'];

    const category = String(rawCategory ?? '').trim();
    const name = String(rawName ?? '').trim();
    const sku = String(rawSku ?? '').trim();
    const description = rawDesc == null ? null : String(rawDesc).trim() || null;
    const rawTypeStr = String(rawType ?? '').trim().toUpperCase();
    const itemType = (VALID_TYPES as readonly string[]).includes(rawTypeStr) ? rawTypeStr : 'PARTS';
    const location = rawLocation == null ? null : String(rawLocation).trim() || null;

    const cost = toNumber(rawCost);
    const price = toNumber(rawPrice);
    const quantity = toNumber(rawQty);

    const rowErrors: RowError[] = [];
    if (!category) rowErrors.push({ rowNumber, field: 'Category', message: 'Categoría vacía' });
    if (!name) rowErrors.push({ rowNumber, field: 'Name', message: 'Nombre vacío' });
    if (!sku) rowErrors.push({ rowNumber, field: 'SKU', message: 'SKU vacío' });
    if (cost === null) rowErrors.push({ rowNumber, field: 'Cost', message: 'Costo inválido', raw: rawCost });
    if (price === null) rowErrors.push({ rowNumber, field: 'Price', message: 'Precio inválido', raw: rawPrice });
    if (quantity === null) rowErrors.push({ rowNumber, field: 'Quantity', message: 'Cantidad inválida', raw: rawQty });

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    const normalizedCategory = normalizeCategory(category);
    categoriesSeen[normalizedCategory] = (categoriesSeen[normalizedCategory] ?? 0) + 1;

    parsed.push({
      rowNumber,
      category: normalizedCategory,
      name,
      description,
      cost: cost!,
      price: price!,
      quantity: Math.trunc(quantity!),
      sku,
      itemType,
      location,
    });
  });

  return { parsed, errors, categoriesSeen };
}
