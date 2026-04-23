'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, CheckCircle2, AlertTriangle } from 'lucide-react';

type PreviewRow = {
  rowNumber: number;
  category: string;
  name: string;
  sku: string;
  cost: number;
  price: number;
  quantity: number;
};

type RowError = {
  rowNumber: number;
  field: string;
  message: string;
};

type Preview = {
  totalRows: number;
  validRows: PreviewRow[];
  errors: RowError[];
  duplicateSkusInFile: string[];
  existingSkusInDb: string[];
  categoriesSeen: Record<string, number>;
};

type ApiResult = {
  ok: boolean;
  dryRun: boolean;
  preview?: Preview;
  imported?: number;
  error?: string;
};

export function InventoryImportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setErrorMsg(null);
    setImportedCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit(dryRun: boolean) {
    if (!file) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('dryRun', String(dryRun));
      const res = await fetch('/api/inventory/import', { method: 'POST', body: fd });
      const data: ApiResult = await res.json();
      if (!res.ok && !data.preview) {
        setErrorMsg(data.error ?? `Error ${res.status}`);
        return;
      }
      if (data.preview) setPreview(data.preview);
      if (data.error) setErrorMsg(data.error);
      if (!dryRun && data.ok) {
        setImportedCount(data.imported ?? 0);
        router.refresh();
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  const blocking = !!preview && (preview.errors.length > 0 || preview.duplicateSkusInFile.length > 0 || preview.existingSkusInDb.length > 0);
  const canConfirm = !!preview && !blocking && importedCount === null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary"
        title="Importar inventario desde Excel"
      >
        <Upload size={14} />
        <span className="hidden sm:inline">Importar Excel</span>
        <span className="sm:hidden">Importar</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="card w-full md:max-w-2xl p-5 md:p-6 my-0 md:my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="section-title mb-0.5">Inventario</p>
                <h2 className="text-lg font-semibold text-[#ddd]">Importar desde Excel</h2>
              </div>
              <button onClick={close} className="text-[#555] hover:text-[#aaa]" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {importedCount === null && (
              <>
                <div className="mb-4">
                  <label className="label">Archivo .xlsx</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setErrorMsg(null); }}
                    className="input"
                  />
                  <p className="text-xs text-[#555] mt-1.5">
                    Columnas esperadas: Category, Name, Description, Cost, Price, Quantity, SKU.
                  </p>
                </div>

                {!preview && (
                  <div className="flex gap-2 justify-end">
                    <button onClick={close} className="btn-ghost" disabled={loading}>Cancelar</button>
                    <button
                      onClick={() => submit(true)}
                      className="btn-primary"
                      disabled={!file || loading}
                    >
                      {loading ? 'Analizando...' : 'Vista previa'}
                    </button>
                  </div>
                )}
              </>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3 text-sm text-red-400">
                <AlertTriangle size={14} />
                {errorMsg}
              </div>
            )}

            {preview && importedCount === null && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Stat label="Filas" value={preview.totalRows} />
                  <Stat label="Válidas" value={preview.validRows.length} />
                  <Stat label="Errores" value={preview.errors.length} warning={preview.errors.length > 0} />
                  <Stat label="SKU conflicto" value={preview.duplicateSkusInFile.length + preview.existingSkusInDb.length} warning={preview.duplicateSkusInFile.length + preview.existingSkusInDb.length > 0} />
                </div>

                {preview.errors.length > 0 && (
                  <Section title={`Errores por fila (${preview.errors.length})`}>
                    <ul className="text-xs text-red-400 space-y-1 max-h-40 overflow-y-auto font-mono">
                      {preview.errors.slice(0, 50).map((e, i) => (
                        <li key={i}>fila {e.rowNumber} · {e.field}: {e.message}</li>
                      ))}
                      {preview.errors.length > 50 && <li className="text-[#555]">... y {preview.errors.length - 50} más</li>}
                    </ul>
                  </Section>
                )}

                {preview.duplicateSkusInFile.length > 0 && (
                  <Section title={`SKUs duplicados en el archivo (${preview.duplicateSkusInFile.length})`}>
                    <p className="text-xs text-amber-400 font-mono">{preview.duplicateSkusInFile.join(', ')}</p>
                  </Section>
                )}

                {preview.existingSkusInDb.length > 0 && (
                  <Section title={`SKUs que ya existen en la DB (${preview.existingSkusInDb.length})`}>
                    <p className="text-xs text-amber-400 font-mono">{preview.existingSkusInDb.join(', ')}</p>
                  </Section>
                )}

                <Section title={`Categorías detectadas (${Object.keys(preview.categoriesSeen).length})`}>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(preview.categoriesSeen).map(([cat, n]) => (
                      <span key={cat} className="text-xs text-[#888] bg-[#1a1a1a] border border-[#252525] px-2 py-0.5 rounded-md font-mono">
                        {cat} <span className="text-[#555]">· {n}</span>
                      </span>
                    ))}
                  </div>
                </Section>

                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={reset} className="btn-ghost" disabled={loading}>Elegir otro archivo</button>
                  <button
                    onClick={() => submit(false)}
                    className="btn-primary"
                    disabled={!canConfirm || loading}
                    title={blocking ? 'Resuelve los problemas antes de importar' : undefined}
                  >
                    {loading ? 'Importando...' : `Confirmar importación (${preview.validRows.length})`}
                  </button>
                </div>
              </div>
            )}

            {importedCount !== null && (
              <div className="text-center py-6">
                <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                <p className="text-[#ddd] mb-1">Importación completa</p>
                <p className="text-sm text-[#888] mb-5">{importedCount} artículo{importedCount !== 1 ? 's' : ''} agregado{importedCount !== 1 ? 's' : ''} al inventario.</p>
                <button onClick={close} className="btn-primary">Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, warning }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className={`card p-3 text-center ${warning ? 'border-amber-500/30' : ''}`}>
      <p className={`text-xl font-mono ${warning ? 'text-amber-400' : 'text-[#ddd]'}`}>{value}</p>
      <p className="section-title mt-0.5">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#1a1a1a] pt-3">
      <p className="section-title mb-2">{title}</p>
      {children}
    </div>
  );
}
