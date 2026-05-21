'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, X, AlertCircle } from 'lucide-react';

// ── Modal como componente separado ───────────────────────────────────────────
// Al montar este componente, el div#qr-reader-container YA existe en el DOM,
// así que Html5Qrcode puede inicializarse sin race condition.
function QrScannerModal({ onClose }: { onClose: () => void }) {
  const [error, setError]     = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef            = useRef<any>(null);
  const router                = useRouter();
  const CONTAINER_ID          = 'qr-reader-container';

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode(CONTAINER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded: string) => {
            if (!cancelled) handleDecoded(decoded, scanner);
          },
          () => { /* ignorar errores de frame individuales */ },
        );

        if (!cancelled) setScanning(true);
      } catch (e: any) {
        if (!cancelled) {
          // Mostrar el mensaje real para poder diagnosticar
          const msg = e?.message ?? e?.toString() ?? 'Error desconocido';
          setError(msg);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try { scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecoded = async (text: string, scanner: any) => {
    try { await scanner.stop(); } catch {}
    try { scanner.clear(); }      catch {}
    scannerRef.current = null;
    onClose();
    try {
      const url = new URL(text);
      router.push(url.pathname);
    } catch {
      if (text.startsWith('/')) router.push(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-title mb-0.5">Lector QR</p>
            <h2 className="text-white font-semibold text-lg">Escanear orden</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-[#111] border border-[#222]">
          <div id={CONTAINER_ID} className="w-full" />

          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
              <div className="text-center">
                <QrCode size={40} className="text-[#333] mx-auto mb-3" />
                <p className="text-[#555] text-sm">Iniciando cámara...</p>
              </div>
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-amber-400/60 rounded-xl" />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span className="break-all">{error}</span>
            </div>
            <p className="text-xs text-white/30 text-center">
              Si el error menciona permisos, ve a Ajustes → Safari → Cámara y permite el acceso.
            </p>
          </div>
        )}

        {!error && (
          <p className="text-center text-white/30 text-xs mt-4">
            Apunta al código QR de la etiqueta de la orden
          </p>
        )}
      </div>
    </div>
  );
}

// ── Botón principal ──────────────────────────────────────────────────────────
export function QrScannerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary"
        title="Escanear código QR"
      >
        <QrCode size={15} />
        <span className="hidden sm:inline">Escanear</span>
      </button>

      {/* Montar/desmontar el modal completo evita el race condition con Html5Qrcode */}
      {open && <QrScannerModal onClose={() => setOpen(false)} />}
    </>
  );
}
