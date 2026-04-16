'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Send, Trash2, Loader2, X,
  Clock, ChevronDown, ChevronUp, ImageIcon, Plus,
} from 'lucide-react';

const STAGES = {
  RECEIVED:  { label: 'Entrada',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  IN_REPAIR: { label: 'En proceso', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  DELIVERED: { label: 'Salida',     color: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

const MAX_PHOTOS = 15;

interface Note {
  id: number;
  content: string;
  stage: string;
  photoUrl?: string | null;    // legacy
  photoUrls?: string | null;   // JSON array (new)
  _photos?: string[];          // resolved immediately after POST
  authorName: string;
  authorRole: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePhotos(note: Note): string[] {
  if (note._photos) return note._photos;
  try {
    const parsed = JSON.parse(note.photoUrls ?? '[]');
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* ignore */ }
  return note.photoUrl ? [note.photoUrl] : [];
}

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(iso));

// ── Photo picker used in both the timeline form and the new-repair form ───────

export interface PhotoPickerHandle {
  files: File[];
  previews: string[];
}

function PhotoPicker({
  files, setFiles, previews, setPreviews,
}: {
  files: File[];
  setFiles: (f: File[]) => void;
  previews: string[];
  setPreviews: (p: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles = Array.from(incoming).slice(0, MAX_PHOTOS - files.length);
    const readers  = newFiles.map(f => new Promise<string>(res => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(urls => {
      setFiles([...files, ...newFiles]);
      setPreviews([...previews, ...urls]);
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (i: number) => {
    setFiles(files.filter((_, idx) => idx !== i));
    setPreviews(previews.filter((_, idx) => idx !== i));
  };

  const remaining = MAX_PHOTOS - files.length;

  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative w-16 h-16 flex-shrink-0">
              <img src={src} className="w-full h-full object-cover rounded-lg border border-[#2a2a2a]" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#111] border border-[#333] rounded-full flex items-center justify-center text-[#888] hover:text-red-400"
              >
                <X size={9} />
              </button>
            </div>
          ))}

          {/* Add more button */}
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-16 h-16 rounded-lg border border-dashed border-[#2a2a2a] flex flex-col items-center justify-center text-[#555] hover:text-amber-400 hover:border-amber-500/30 transition-colors flex-shrink-0"
            >
              <Plus size={14} />
              <span className="text-[9px] mt-0.5">{remaining}</span>
            </button>
          )}
        </div>
      )}

      {/* Initial add button */}
      {previews.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 text-xs text-[#666] hover:text-amber-400 transition-colors py-1"
        >
          <Camera size={14} /> Adjuntar fotos
          <span className="text-[10px] text-[#3a3a3a]">(máx. {MAX_PHOTOS})</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => addFiles(e.target.files)}
      />
    </div>
  );
}

// ── Single collapsible note entry ─────────────────────────────────────────────

function NoteEntry({
  note, isLast, isAdmin, onDelete,
}: {
  note: Note; isLast: boolean; isAdmin: boolean; onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const stageInfo = STAGES[note.stage as keyof typeof STAGES] ?? STAGES.IN_REPAIR;
  const photos    = resolvePhotos(note);
  const preview   = note.content.length > 80
    ? note.content.slice(0, 80).trimEnd() + '…'
    : note.content;

  return (
    <div className="flex gap-3">
      {/* Spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-amber-500 mt-2.5 flex-shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-[#1e1e1e] mt-1 min-h-[1.5rem]" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-3">
        {/* Collapsed header */}
        <button
          onClick={() => setExpanded(p => !p)}
          className="w-full text-left bg-[#111] border border-[#1a1a1a] rounded-xl px-3 py-2.5 hover:border-[#2a2a2a] transition-colors"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${stageInfo.color} flex-shrink-0`}>{stageInfo.label}</span>
            <span className="text-xs font-medium text-[#ccc]">{note.authorName}</span>
            <span className="text-[10px] text-[#444] font-mono">
              {note.authorRole === 'ADMIN' ? '· Admin' : '· Técnico'}
            </span>
            {photos.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500/70 font-mono ml-auto">
                <ImageIcon size={10} /> {photos.length}
              </span>
            )}
            <span className="text-[#444] ml-auto flex-shrink-0">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-[#555] mt-1 leading-relaxed line-clamp-1">{preview}</p>
          )}
          <div className="flex items-center gap-1 text-[10px] text-[#3a3a3a] font-mono mt-1">
            <Clock size={9} /> {fmt(note.createdAt)}
          </div>
        </button>

        {/* Expanded body */}
        {expanded && (
          <div className="mt-1 bg-[#0d0d0d] border border-[#1a1a1a] border-t-0 rounded-b-xl px-3 py-3 space-y-3">
            <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{note.content}</p>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`foto ${i + 1}`}
                    onClick={() => setLightbox(url)}
                    className="w-full aspect-square object-cover rounded-lg bg-[#0a0a0a] cursor-pointer hover:opacity-80 transition-opacity border border-[#1e1e1e]"
                  />
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="flex justify-end pt-1 border-t border-[#1a1a1a]">
                <button
                  onClick={e => { e.stopPropagation(); onDelete(note.id); }}
                  className="flex items-center gap-1.5 text-xs text-[#444] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} /> Eliminar nota
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox} className="w-full rounded-xl object-contain max-h-[85vh]" />
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

// ── Note form (shown when user clicks "+ Nueva nota") ─────────────────────────

function NoteForm({
  repairId,
  onCreated,
  onCancel,
}: {
  repairId: number;
  onCreated: (note: Note) => void;
  onCancel: () => void;
}) {
  const [content, setContent]   = useState('');
  const [stage, setStage]       = useState<keyof typeof STAGES>('IN_REPAIR');
  const [files, setFiles]       = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) { setError('Escribe algo en la nota.'); return; }
    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('content', content.trim());
    formData.append('stage', stage);
    files.forEach((f, i) => formData.append(`photo_${i}`, f));

    try {
      const res = await fetch(`/api/repairs/${repairId}/notes`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const note = await res.json();
      onCreated(note);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#aaa]">Nueva nota</p>
        <button onClick={onCancel} className="text-[#555] hover:text-[#999] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div>
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

      <div>
        <label className="label">Nota</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          placeholder="Describe el estado del equipo, avances, observaciones..."
          className="input resize-none"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
        />
      </div>

      <PhotoPicker
        files={files} setFiles={setFiles}
        previews={previews} setPreviews={setPreviews}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] text-[#444] font-mono hidden sm:block">Ctrl+Enter para enviar</p>
        <div className="flex gap-2 ml-auto">
          <button onClick={onCancel} className="btn-ghost text-xs px-3 py-1.5">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="btn-primary text-xs disabled:opacity-40"
          >
            {submitting
              ? <><Loader2 size={12} className="animate-spin" /> Guardando...</>
              : <><Send size={12} /> Agregar nota</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RepairTimeline({
  repairId,
  initialNotes,
  userRole,
}: {
  repairId: number;
  initialNotes: Note[];
  userRole: string;
}) {
  const router   = useRouter();
  const [notes, setNotes]       = useState<Note[]>(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const isAdmin = userRole === 'ADMIN';

  const handleCreated = (note: Note) => {
    setNotes(prev => [note, ...prev]);
    setShowForm(false);
    router.refresh();
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
    } catch { alert('Error al eliminar la nota.'); }
  };

  return (
    <div className="space-y-4">

      {/* ── Add note button / form ── */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="btn-secondary w-full justify-center text-sm"
        >
          <Plus size={14} /> Nueva nota
        </button>
      ) : (
        <NoteForm
          repairId={repairId}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Timeline entries ── */}
      <div className="space-y-1">
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-[#444]">
            <Clock size={24} className="mb-2" />
            <p className="text-xs">Sin actividad registrada</p>
          </div>
        )}
        {notes.map((note, i) => (
          <NoteEntry
            key={note.id}
            note={note}
            isLast={i === notes.length - 1}
            isAdmin={isAdmin}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ── Export PhotoPicker for use in the new-repair form ─────────────────────────
export { PhotoPicker };
