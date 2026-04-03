'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Upload, X, Loader2, ImageIcon } from 'lucide-react';

const STAGES = {
  RECEIVED:   { label: 'Entrada',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  IN_REPAIR:  { label: 'Proceso',   color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  DELIVERED:  { label: 'Salida',    color: 'text-green-400 bg-green-400/10 border-green-400/20' },
};

interface Photo {
  id: number;
  url: string;
  stage: string;
  caption?: string | null;
  createdAt: string;
}

export function PhotoGallery({
  repairId,
  initialPhotos,
}: {
  repairId: number;
  initialPhotos: Photo[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<keyof typeof STAGES>('RECEIVED');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('stage', selectedStage);
    if (caption) formData.append('caption', caption);

    try {
      const res = await fetch(`/api/repairs/${repairId}/photos`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const photo = await res.json();
      setPhotos(prev => [...prev, photo]);
      setPreview(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await fetch(`/api/repairs/${repairId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id }),
      });
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      router.refresh();
    } catch {
      alert('Error al eliminar la foto');
    }
  };

  const photosByStage = Object.keys(STAGES).reduce((acc, stage) => {
    acc[stage] = photos.filter(p => p.stage === stage);
    return acc;
  }, {} as Record<string, Photo[]>);

  return (
    <div className="space-y-5">
      {/* Upload area */}
      <div className="border border-dashed border-[#2a2a2a] rounded-xl p-4 bg-[#0d0d0d]">
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="flex-1">
            <label className="label">Etapa</label>
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value as keyof typeof STAGES)}
              className="select"
            >
              {Object.entries(STAGES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="label">Descripción (opcional)</label>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Ej. Pantalla rota al recibir"
              className="input"
            />
          </div>
        </div>

        {/* File picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded-lg bg-[#111]" />
            <button
              onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border border-[#1e1e1e] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
          >
            <Camera size={22} className="text-[#444]" />
            <span className="text-xs text-[#555]">Tomar foto o seleccionar imagen</span>
          </button>
        )}

        {preview && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost text-xs flex-1 justify-center"
            >
              Cambiar foto
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {uploading ? <><Loader2 size={13} className="animate-spin" /> Subiendo...</> : <><Upload size={13} /> Subir foto</>}
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Gallery by stage */}
      {Object.entries(STAGES).map(([stage, { label, color }]) => {
        const stagePhotos = photosByStage[stage] || [];
        if (stagePhotos.length === 0) return null;
        return (
          <div key={stage}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${color}`}>{label}</span>
              <span className="text-xs text-[#555] font-mono">{stagePhotos.length} foto{stagePhotos.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {stagePhotos.map(photo => (
                <div key={photo.id} className="relative group aspect-square">
                  <img
                    src={photo.url}
                    alt={photo.caption || label}
                    className="w-full h-full object-cover rounded-lg bg-[#111] cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightbox(photo)}
                  />
                  <button
                    onClick={() => handleDelete(photo)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full items-center justify-center text-white hover:bg-red-500/80 transition-colors hidden group-hover:flex"
                  >
                    <X size={10} />
                  </button>
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-lg px-1.5 py-1">
                      <p className="text-[9px] text-white truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-[#444]">
          <ImageIcon size={28} className="mb-2" />
          <p className="text-xs">Sin fotos todavía</p>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || ''} className="w-full rounded-xl object-contain max-h-[80vh]" />
            {lightbox.caption && (
              <p className="text-sm text-[#ccc] text-center mt-3">{lightbox.caption}</p>
            )}
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
