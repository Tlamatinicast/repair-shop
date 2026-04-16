'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Smartphone, Wrench, Camera, Plus, X, FileText } from 'lucide-react';
import Link from 'next/link';
import { DEVICE_TYPES, REPAIR_STATUSES } from '@/lib/utils';

const MAX_PHOTOS = 15;

export default function NewRepairPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Initial note state
  const [noteContent, setNoteContent]   = useState('');
  const [noteFiles, setNoteFiles]       = useState<File[]>([]);
  const [notePreviews, setNotePreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Photo picker helpers ───────────────────────────────────────────────────

  const addPhotos = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList).slice(0, MAX_PHOTOS - noteFiles.length);
    const readers  = incoming.map(f => new Promise<string>(res => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(urls => {
      setNoteFiles(prev => [...prev, ...incoming]);
      setNotePreviews(prev => [...prev, ...urls]);
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (i: number) => {
    setNoteFiles(prev => prev.filter((_, idx) => idx !== i));
    setNotePreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Form submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      // 1. Create the repair
      const repairRes = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!repairRes.ok) {
        const err = await repairRes.json();
        throw new Error(err.error || 'Error al crear la orden');
      }
      const { id } = await repairRes.json();

      // 2. If there's an initial note (content or photos), create it
      if (noteContent.trim() || noteFiles.length > 0) {
        const noteForm = new FormData();
        noteForm.append('content', noteContent.trim() || 'Nota de recepción');
        noteForm.append('stage', 'RECEIVED');
        noteFiles.forEach((f, i) => noteForm.append(`photo_${i}`, f));

        await fetch(`/api/repairs/${id}/notes`, {
          method: 'POST',
          body: noteForm,
        });
        // Note creation errors are non-blocking — repair was already created
      }

      router.push(`/repairs/${id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const remaining = MAX_PHOTOS - noteFiles.length;

  return (
    <div className="p-6 max-w-3xl mx-auto animate-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/repairs" className="btn-ghost">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <p className="section-title mb-0.5">Reparaciones</p>
          <h1 className="page-title">Nueva orden de trabajo</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Customer ── */}
        <Section icon={<User size={14} />} title="Información del cliente">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo *" name="customerName" placeholder="Ej. Carlos Mendoza" required />
            <Field label="Teléfono *" name="customerPhone" placeholder="999 123 4567" required />
            <Field label="Correo electrónico" name="customerEmail" type="email" placeholder="correo@ejemplo.com" />
            <Field label="Dirección" name="customerAddress" placeholder="Colonia, ciudad" />
          </div>
        </Section>

        {/* ── Device ── */}
        <Section icon={<Smartphone size={14} />} title="Información del dispositivo">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de dispositivo *</label>
              <select name="deviceType" className="select" required>
                <option value="">Seleccionar...</option>
                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="Marca *" name="deviceBrand" placeholder="Ej. Apple, Dell, Sony" required />
            <Field label="Modelo *" name="deviceModel" placeholder="Ej. MacBook Pro 13 2020" required />
            <Field label="Número de serie" name="serialNumber" placeholder="Ej. C02XF3HVJGHJ" />
            <Field label="Contraseña / PIN del equipo" name="password" placeholder="Solo si aplica" />
          </div>
        </Section>

        {/* ── Issue ── */}
        <Section icon={<Wrench size={14} />} title="Descripción del problema">
          <div className="space-y-4">
            <div>
              <label className="label">Problema reportado *</label>
              <textarea
                name="issue"
                required
                rows={3}
                placeholder="Describe el problema que reporta el cliente..."
                className="input resize-none"
              />
            </div>
            <div>
              <label className="label">Notas internas</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Notas para el técnico, observaciones físicas, etc."
                className="input resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Estado inicial</label>
                <select name="status" className="select" defaultValue="RECEIVED">
                  {Object.entries(REPAIR_STATUSES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Costo estimado (MXN)</label>
                <input name="laborCost" type="number" step="0.01" min="0" placeholder="0.00" className="input" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Initial note (optional) ── */}
        <Section icon={<FileText size={14} />} title="Nota de recepción (opcional)">
          <div className="space-y-3">
            <p className="text-xs text-[#555]">
              Agrega una nota y fotos del equipo al momento de recibirlo. Se registrará como entrada en el historial.
            </p>
            <div>
              <label className="label">Observaciones de recepción</label>
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                rows={2}
                placeholder="Ej. Equipo con pantalla rota, sin cargador, con golpe en esquina inferior..."
                className="input resize-none"
              />
            </div>

            {/* Photo thumbnails */}
            {notePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notePreviews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 flex-shrink-0">
                    <img src={src} className="w-full h-full object-cover rounded-lg border border-[#2a2a2a]" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#111] border border-[#333] rounded-full flex items-center justify-center text-[#888] hover:text-red-400"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border border-dashed border-[#2a2a2a] flex flex-col items-center justify-center text-[#555] hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                  >
                    <Plus size={14} />
                    <span className="text-[9px] mt-0.5">{remaining}</span>
                  </button>
                )}
              </div>
            )}

            {notePreviews.length === 0 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-[#666] hover:text-amber-400 transition-colors py-1"
              >
                <Camera size={14} /> Adjuntar fotos de recepción
                <span className="text-[10px] text-[#3a3a3a]">(máx. {MAX_PHOTOS})</span>
              </button>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => addPhotos(e.target.files)}
            />
          </div>
        </Section>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/repairs" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            <Save size={14} />
            {loading ? 'Guardando...' : 'Crear orden'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1a1a1a]">
        <span className="text-amber-500">{icon}</span>
        <h2 className="text-sm font-semibold text-[#ccc]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, name, type = 'text', placeholder, required }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} placeholder={placeholder} required={required} className="input" />
    </div>
  );
}
