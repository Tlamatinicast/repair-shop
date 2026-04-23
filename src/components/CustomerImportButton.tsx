'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, CheckCircle2, AlertTriangle } from 'lucide-react';

type PreviewRow = {
  rowNumber: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
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
  duplicatePhonesInFile: string[];
  existingPhonesInDb: string[];
};

type ApiResult = {
  ok: boolean;
  dryRun: boolean;
  mode?: 'create' | 'upsert';
  preview?: Preview;
  created?: number;
  updated?: number;
  error?: string;
};

export function CustomerImportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const [mode, setMode] = useState<'create' | 'upsert'>('create');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setErrorMsg(null);
    setResult(null);
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
      fd.append('mode', mode);
      const res = await fetch('/api/customers/import', { method: 'POST', body: fd });
      const data: ApiResult = await res.json();
      if (!res.ok && !data.preview) {
        setErrorMsg(data.error ?? `Error ${res.status}`);
        return;
      }
      if (data.preview) setPreview(data.preview);
      if (data.error) setErrorMsg(data.error);
      if (!dryRun && data.ok) {
        setResult({ created: data.created ?? 0, updated: data.updated ?? 0 });
        router.refresh();
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  const existingBlocks = mode === 'create' && !!preview && preview.existingPhonesInDb.length > 0;
  const blocking = !!preview && (preview.errors.length > 0 || preview.duplicatePhonesInFile.length > 0 || existingBlocks);
  const canConfirm = !!preview && !blocking && result === null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary"
        title="Importar clientes desde Excel"
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
                <p className="section-title mb-0.5">Clientes</p>
                <h2 className="text-lg font-semibold text-[#ddd]">Importar desde Excel</h2>
              </div>
              <button onClick={close} className="text-[#555] hover:text-[#aaa]" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {result === null && (
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
                    Columnas esperadas: Nombre, Teléfono, Correo, Dirección, Notas.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="label">Modo</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="radio" name="import-mode" checked={mode === 'create'} onChange={() => { setMode('create'); setPreview(null); }} className="mt-1" />
                      <div className="text-sm">
                        <p className="text-[#ddd]">Crear nuevos</p>
                        <p className="text-xs text-[#666]">Falla si algún teléfono ya existe en la base. Recomendado para alta inicial.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="radio" name="import-mode" checked={mode === 'upsert'} onChange={() => { setMode('upsert'); setPreview(null); }} className="mt-1" />
                      <div className="text-sm">
                        <p className="text-[#ddd]">Restaurar / actualizar</p>
                        <p className="text-xs text-[#666]">Los clientes cuyo teléfono ya existe se actualizan con los valores del Excel; los nuevos se crean. Útil para restaurar un backup.</p>
                      </div>
                    </label>
                  </div>
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

            {preview && result === null && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Stat label="Filas" value={preview.totalRows} />
                  <Stat label="Válidas" value={preview.validRows.length} />
                  <Stat label="Errores" value={preview.errors.length} warning={preview.errors.length > 0} />
                  <Stat
                    label={mode === 'upsert' ? 'A actualizar' : 'Teléfono conflicto'}
                    value={mode === 'upsert' ? preview.existingPhonesInDb.length : preview.duplicatePhonesInFile.length + preview.existingPhonesInDb.length}
                    warning={mode === 'create' && (preview.duplicatePhonesInFile.length + preview.existingPhonesInDb.length) > 0}
                  />
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

                {preview.duplicatePhonesInFile.length > 0 && (
                  <Section title={`Teléfonos duplicados en el archivo (${preview.duplicatePhonesInFile.length})`}>
                    <p className="text-xs text-amber-400 font-mono">{preview.duplicatePhonesInFile.join(', ')}</p>
                  </Section>
                )}

                {preview.existingPhonesInDb.length > 0 && (
                  <Section title={`Teléfonos que ya existen en la DB (${preview.existingPhonesInDb.length})`}>
                    <p className={`text-xs font-mono ${mode === 'upsert' ? 'text-[#888]' : 'text-amber-400'}`}>
                      {mode === 'upsert' ? 'Estos se actualizarán con los valores del Excel.' : 'En modo "Crear nuevos" estos bloquean la importación. Cambia a modo "Restaurar / actualizar" para sobrescribirlos.'}
                    </p>
                    <p className="text-xs text-[#666] font-mono mt-1">{preview.existingPhonesInDb.join(', ')}</p>
                  </Section>
                )}

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

            {result !== null && (
              <div className="text-center py-6">
                <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                <p className="text-[#ddd] mb-1">Importación completa</p>
                <p className="text-sm text-[#888] mb-5">
                  {result.created > 0 && <>{result.created} creado{result.created !== 1 ? 's' : ''}</>}
                  {result.created > 0 && result.updated > 0 && ' · '}
                  {result.updated > 0 && <>{result.updated} actualizado{result.updated !== 1 ? 's' : ''}</>}
                </p>
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
