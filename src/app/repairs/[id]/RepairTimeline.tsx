'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Send, Trash2, Loader2, X, ImageIcon, Clock } from 'lucide-react';

const STAGES = {
  RECEIVED:   { label: 'Entrada',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  IN_REPAIR:  { label: 'En proceso', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  DELIVERED:  { label: 'Salida',     color: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

interface Note {
  id: number;
  content: string;
  stage: string;
  photoUrl?: string | null;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

export function RepairTimeline({
  repairId,
  initialNotes,
  userRole,
}: {
  repairId: number;
  initialNotes: Note[];
  userRole: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes]           = useState<Note[]>(initialNotes);
  const [content, setContent]       = useState('');
  const [stage, setStage]           = useState<keyof typeof STAGES>('IN_REPAIR');
  const [preview, setPreview]       = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [lightbox, setLightbox]     = useState<string | null>(null);

  const isAdmin = userRole === 'ADMIN';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setError('Escribe algo en la nota.'); return; }
    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('content', content.trim());
    formData.append('stage', stage);
    const file = fileInputRef.current?.files?.[0];
    if (file) formData.append('photo', file);

    try {
      const res = await fetch(`/api/repairs/${repairId}/notes`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const note = await res.json();
      setNotes(prev => [note, ...prev]);
      setContent('');
      clearPhoto();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      await fetch(`/api/repairs/${repairId}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      });
      setNotes(prev => prev.filter(n => n.id !== noteId));
      router.refresh();
    } catch {
      alert('Error al eliminar la nota.');
    }
  };

  const formatDateTime = (iso: string) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(iso));
  };

  return (
    <div className="space-y-5">

      {/* ── New note form ── */}
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Etapa</label>
            <select
              value={stage}
              onChange={e => setStage(e.target.value as keyof typeof STAGES)}
              className="select"
            >
              {Object.entries(STAGES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Nota</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
            placeholder="Describe el estado del equipo, avances, observaciones..."
            className="input resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
            }}
          />
        </div>

        {/* Photo preview */}
        {preview && (
          <div className="relative inline-block">
            <img src={preview} alt="preview" className="h-24 w-24 object-cover rounded-lg border border-[#2a2a2a]" />
            <button
              onClick={clearPhoto}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#111] border border-[#333] rounded-full flex items-center justify-center text-[#888] hover:text-red-400"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost px-3 py-2"
            title="Adjuntar foto"
          >
            <Camera size={15} />
            <span className="text-xs">{preview ? 'Cambiar foto' : 'Adjuntar foto'}</span>
          </button>
          <div className="flex-1" />
          <p className="text-[10px] text-[#444] font-mono hidden sm:block">Ctrl+Enter para enviar</p>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="btn-primary disabled:opacity-40"
          >
            {submitting
              ? <><Loader2 size={13} className="animate-spin" /> Guardando...</>
              : <><Send size={13} /> Agregar nota</>
            }
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="space-y-3">
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-[#444]">
            <Clock size={24} className="mb-2" />
            <p className="text-xs">Sin actividad registrada</p>
          </div>
        )}

        {notes.map((note, i) => {
          const stageInfo = STAGES[note.stage as keyof typeof STAGES] ?? STAGES.IN_REPAIR;
          const isLast = i === notes.length - 1;

          return (
            <div key={note.id} className="flex gap-3">
              {/* Timeline line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                {!isLast && <div className="w-px flex-1 bg-[#1e1e1e] mt-1" />}
              </div>

              {/* Note card */}
              <div className="flex-1 pb-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${stageInfo.color}`}>{stageInfo.label}</span>
                    <span className="text-xs font-medium text-[#ccc]">{note.authorName}</span>
                    <span className="text-[10px] text-[#444] font-mono">
                      {note.authorRole === 'ADMIN' ? '· Admin' : '· Técnico'}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-[#444] hover:text-red-400 transition-colors flex-shrink-0 p-1"
                      title="Eliminar nota"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 space-y-3">
                  <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{note.content}</p>

                  {note.photoUrl && (
                    <img
                      src={note.photoUrl}
                      alt="evidencia"
                      onClick={() => setLightbox(note.photoUrl!)}
                      className="w-full max-h-64 object-contain rounded-lg bg-[#0a0a0a] cursor-pointer hover:opacity-90 transition-opacity border border-[#1e1e1e]"
                    />
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-[#444] font-mono">
                    <Clock size={10} />
                    {formatDateTime(note.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox} alt="evidencia" className="w-full rounded-xl object-contain max-h-[85vh]" />
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-[#222] border border-[#333] rounded-full flex items-center justify-center text-[#ccc] hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
